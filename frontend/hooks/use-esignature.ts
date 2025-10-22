import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface Document {
  id: string;
  title: string;
  description: string;
  url: string;
  status: 'pending' | 'reviewing' | 'signed';
  signedAt?: string;
  signatureHash?: string;
}

interface SignatureData {
  type: 'drawn' | 'typed';
  data: string; // Base64 for drawn, text for typed
  timestamp: string;
  ipAddress?: string;
}

// Static documents for e-signature (in production, fetch from backend or document service)
const fetchSignatureDocuments = async (sessionId: string): Promise<Document[]> => {
  // For MVP, return static documents
  // In production, this would fetch from document management service
  return [
    {
      id: 'investment-agreement',
      title: 'Investment Agreement',
      description: 'Legal agreement for tokenized property investment',
      url: '/documents/investment-agreement.pdf',
      status: 'pending'
    },
    {
      id: 'risk-disclosure',
      title: 'Risk Disclosure Statement',
      description: 'Important risk information for tokenized investments',
      url: '/documents/risk-disclosure.pdf',
      status: 'pending'
    },
    {
      id: 'account-agreement',
      title: 'Account Agreement',
      description: 'Terms and conditions for your investment account',
      url: '/documents/account-agreement.pdf',
      status: 'pending'
    }
  ];
};

const submitSignature = async (documentId: string, signature: SignatureData, sessionId: string) => {
  // Store signature data
  // In production, this would integrate with DocuSign or similar
  return {
    documentId,
    signature,
    timestamp: new Date().toISOString(),
    sessionId,
  };
};

const completeESignStep = async (sessionId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/onboarding/step`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId,
      step: 'esign',
      data: {
        completedAt: new Date().toISOString(),
        documentsSigned: true,
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to complete e-sign step');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to complete e-sign step');
  }
};

export function useESignature(sessionId: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['esign-documents', sessionId],
    queryFn: () => fetchSignatureDocuments(sessionId),
  });

  const signDocument = useMutation({
    mutationFn: async ({ documentId, signature }: { documentId: string; signature: SignatureData }) => {
      // Submit signature
      const result = await submitSignature(documentId, signature, sessionId);
      
      // In production: Record signature hash on blockchain for immutability
      // This would integrate with FarSquare EVM contracts
      
      return result;
    },
    onSuccess: () => {
      // Update document status in cache
      queryClient.invalidateQueries({ queryKey: ['esign-documents'] });
    },
  });

  const completeSigning = useMutation({
    mutationFn: async () => {
      // Mark e-sign step as complete in backend
      await completeESignStep(sessionId);
    },
    onSuccess: () => {
      navigate(`/onboarding/complete/${sessionId}`);
    },
  });

  return { documents, signDocument, completeSigning, isLoading };
}
