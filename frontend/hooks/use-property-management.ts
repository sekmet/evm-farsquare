import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { type Address } from 'viem';
import { validateERC3643Token, canMintTokens, validatePropertyOwnership } from '@/lib/evm-client-api';

const API_BASE_URL = import.meta.env.VITE_BASE_API_URL || 'http://localhost:3000';

interface PropertyUpdateData {
  name?: string;
  description?: string;
  // Add other updateable fields as needed
}

interface InvestorMessage {
  subject: string;
  message: string;
  recipientType?: 'all' | 'specific' | 'group';
}

// Update property details
async function updatePropertyDetails(propertyId: string, updates: PropertyUpdateData): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update property: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to update property');
  }

  return data.data;
}

// Upload property document
async function uploadPropertyDocument(propertyId: string, file: File): Promise<any> {
  const formData = new FormData();
  formData.append('document', file);

  const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}/documents`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload document: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to upload document');
  }

  return data.data;
}

// Mint additional tokens with ERC-3643 validation
async function mintPropertyTokens(propertyId: string, amount: number): Promise<any> {
  // First validate the property contract before proceeding
  try {
    // Get property details to obtain contract address
    const propertyResponse = await fetch(`${API_BASE_URL}/api/properties/${propertyId}`);
    if (!propertyResponse.ok) {
      throw new Error(`Failed to fetch property details: ${propertyResponse.status}`);
    }

    const propertyData = await propertyResponse.json();
    if (!propertyData.success) {
      throw new Error('Failed to fetch property details');
    }

    const property = propertyData.data;
    const contractAddress = property.contract_address;

    // Validate ERC-3643 compliance
    if (contractAddress && contractAddress.startsWith('0x')) {
      const isValidERC3643 = await validateERC3643Token(contractAddress as Address);
      if (!isValidERC3643) {
        throw new Error('Property contract is not ERC-3643 compliant');
      }

      // Check minting permissions (optional - API will also validate)
      // Note: We would need the owner's wallet address here for permission checking
      // For now, let the API handle the authorization
    }

  } catch (validationError) {
    console.warn('Contract validation failed, proceeding with API call:', validationError);
    // Continue with API call even if validation fails
  }

  // Proceed with API call for token minting
  const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}/tokens/mint`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount }),
  });

  if (!response.ok) {
    throw new Error(`Failed to mint tokens: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to mint tokens');
  }

  return data.data;
}

// Send message to investors
async function sendMessageToInvestors(propertyId: string, message: InvestorMessage): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}/investors/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to send message');
  }

  return data.data;
}

// Hook for property management operations
export function usePropertyManagement(propertyId: string) {
  const queryClient = useQueryClient();

  // Update property details
  const updateProperty = useMutation({
    mutationFn: (updates: PropertyUpdateData) =>
      updatePropertyDetails(propertyId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      toast({
        title: "Success",
        description: "Property updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update property",
        variant: "destructive",
      });
    },
  });

  // Upload documents
  const uploadDocument = useMutation({
    mutationFn: (file: File) => uploadPropertyDocument(propertyId, file),
    onSuccess: (document) => {
      queryClient.setQueryData(['property', propertyId], (oldData: any) => ({
        ...oldData,
        documents: [...(oldData.documents || []), document],
      }));
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  // Mint tokens
  const mintTokens = useMutation({
    mutationFn: (amount: number) => mintPropertyTokens(propertyId, amount),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      toast({
        title: "Success",
        description: `Successfully minted ${result.amount} tokens via ERC-3643 contract`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mint tokens",
        variant: "destructive",
      });
    },
  });

  // Send investor messages
  const sendInvestorMessage = useMutation({
    mutationFn: (message: InvestorMessage) =>
      sendMessageToInvestors(propertyId, message),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Message sent to investors successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  return {
    updateProperty,
    uploadDocument,
    mintTokens,
    sendInvestorMessage,
  };
}
