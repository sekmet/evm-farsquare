import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@/contexts/wallet-context";
import { useCreateIdentity, useIdentityVerification } from "@/hooks/use-identity-contract";
import { Address } from "viem";
import { CountryCode, CountryCodes } from "@/lib/contracts/identity-types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface IdentityData {
  claims: Record<string, string>;
}

interface IdentityResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface IdentityCreationData {
  claims: Record<string, string>;
  userId: string;
  countryCode: CountryCode;
}

/**
 * Register identity with backend after on-chain creation
 * Backend will coordinate with Identity Registry contract (requires agent privileges)
 */
const registerIdentityWithBackend = async (
  sessionId: string,
  userId: string,
  walletAddress: string,
  identityAddress: string,
  countryCode: CountryCode
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/onboarding/identity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId,
      userId,
      walletAddress,
      identityAddress,
      countryCode,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to register identity' }));
    throw new Error(error.error || 'Failed to register identity');
  }

  const result: IdentityResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to register identity');
  }
};

const completeIdentityStep = async (sessionId: string, data?: any): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/onboarding/step`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId,
      step: 'identity',
      data: {
        completedAt: new Date().toISOString(),
        ...data,
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to complete identity step');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to complete identity step');
  }
};

const getSession = async (sessionId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/onboarding/session/${sessionId}`);
  
  if (!response.ok) {
    throw new Error('Failed to get session');
  }

  const result = await response.json();
  if (!result.success || !result.data) {
    throw new Error('Session not found');
  }

  return result.data;
};

/**
 * EVM/ERC-3643 Identity Setup Hook
 * 
 * Orchestrates the identity creation flow:
 * 1. Create OnchainID identity contract via IdentityFactory
 * 2. Register identity in IdentityRegistry (via backend agent)
 * 3. Record identity data in backend database
 */
export function useIdentitySetup(sessionId: string) {
  const navigate = useNavigate();
  const { state } = useWallet();
  const [identity, setIdentity] = useState<any>(null);

  // ERC-3643 contract hooks
  const {
    createIdentity: createIdentityOnChain,
    hash: createTxHash,
    isPending: isCreating,
    isConfirming,
    isSuccess: isCreated,
    error: createError,
  } = useCreateIdentity();

  // Check existing identity verification status
  const verificationStatus = useIdentityVerification(
    state.address as Address | undefined
  );

  // Fetch session data to get userId
  const { data: sessionData } = useQuery({
    queryKey: ['onboarding-session', sessionId],
    queryFn: () => getSession(sessionId),
    enabled: !!sessionId,
  });

  // Monitor identity creation transaction
  useEffect(() => {
    if (isCreated && createTxHash) {
      console.log('Identity created on-chain:', createTxHash);
      // In production, parse transaction receipt to get identity address from event
    }
  }, [isCreated, createTxHash]);

  /**
   * Complete identity creation mutation
   * Coordinates on-chain and off-chain operations
   */
  const createIdentity = useMutation({
    mutationFn: async (identityData: IdentityCreationData) => {
      const walletAddress = state.address;
      if (!walletAddress) {
        throw new Error("Wallet not connected");
      }

      // Step 1: Create OnchainID identity contract
      console.log('Creating OnchainID identity for:', walletAddress);
      await createIdentityOnChain(walletAddress as Address);

      // Step 2: Wait for transaction confirmation
      // In production, you would:
      // - Wait for transaction receipt
      // - Parse IdentityCreated event to get identity contract address
      // - Use that address for backend registration
      
      // For now, using a placeholder since we need the actual identity address
      const identityAddress = '0x0000000000000000000000000000000000000000' as Address;

      // Step 3: Register with backend (backend will call IdentityRegistry.registerIdentity)
      await registerIdentityWithBackend(
        sessionId,
        identityData.userId,
        walletAddress,
        identityAddress,
        identityData.countryCode
      );

      // Step 4: Mark identity step as complete
      await completeIdentityStep(sessionId, {
        claims: identityData.claims,
        identityAddress,
        countryCode: identityData.countryCode,
      });

      return {
        address: walletAddress,
        identityAddress,
        verified: false, // Will be verified after registry registration
        txHash: createTxHash,
      };
    },
    onSuccess: (result) => {
      setIdentity(result);
      navigate(`/onboarding/qualification/${sessionId}`);
    },
    onError: (error) => {
      console.error('Identity creation failed:', error);
    },
  });

  return {
    createIdentity,
    identity,
    verificationStatus,
    isConnected: state.isConnected,
    walletAddress: state.address,
    userId: sessionData?.userId,
    sessionData: sessionData,
    isCreating: isCreating || isConfirming,
    createError,
  };
}
