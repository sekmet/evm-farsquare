/**
 * ERC-3643 Identity Contract Hook
 * 
 * Provides functions for interacting with Identity Factory and Registry contracts
 * Following Viem/Wagmi patterns for EVM contract interactions
 */

import { useMemo } from 'react'
import { 
  useReadContract, 
  useWriteContract, 
  useWaitForTransactionReceipt,
  usePublicClient,
  useWalletClient 
} from 'wagmi'
import { Address, Hex, keccak256, toHex, encodePacked } from 'viem'
import { identityFactoryAbi } from '@/lib/contracts/identity-factory-abi'
import { identityRegistryAbi } from '@/lib/contracts/identity-registry-abi'
import { CountryCode, IdentityVerificationStatus } from '@/lib/contracts/identity-types'

/**
 * Contract addresses - should be loaded from environment or config
 */
const IDENTITY_FACTORY_ADDRESS = (import.meta.env.VITE_IDENTITY_FACTORY_ADDRESS || 
  '0x0000000000000000000000000000000000000000') as Address
const IDENTITY_REGISTRY_ADDRESS = (import.meta.env.VITE_IDENTITY_REGISTRY_ADDRESS || 
  '0x0000000000000000000000000000000000000000') as Address

/**
 * Hook for creating OnchainID identity
 */
export function useCreateIdentity() {
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  /**
   * Create identity with deterministic salt
   */
  const createIdentity = async (ownerAddress: Address) => {
    // Generate salt from address and timestamp for uniqueness
    const salt = keccak256(
      encodePacked(['address', 'uint256'], [ownerAddress, BigInt(Date.now())])
    )

    return writeContract({
      address: IDENTITY_FACTORY_ADDRESS,
      abi: identityFactoryAbi,
      functionName: 'createIdentity',
      args: [ownerAddress, salt],
    })
  }

  return {
    createIdentity,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

/**
 * Hook for checking identity verification status
 */
export function useIdentityVerification(userAddress?: Address) {
  // Check if identity exists
  const { data: exists } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: identityRegistryAbi,
    functionName: 'contains',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  })

  // Check if identity is verified
  const { data: isVerified } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: identityRegistryAbi,
    functionName: 'isVerified',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && exists === true,
    },
  })

  // Get identity address
  const { data: identityAddress } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: identityRegistryAbi,
    functionName: 'identity',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && exists === true,
    },
  })

  // Get country code
  const { data: countryCode } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: identityRegistryAbi,
    functionName: 'investorCountry',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && exists === true,
    },
  })

  const verificationStatus: IdentityVerificationStatus = useMemo(() => ({
    exists: exists === true,
    isVerified: isVerified === true,
    identityAddress: (identityAddress as Address) || null,
    countryCode: (countryCode as CountryCode) || null,
  }), [exists, isVerified, identityAddress, countryCode])

  return verificationStatus
}

/**
 * Hook for registering identity in registry
 * Note: This requires agent or owner privileges on the registry contract
 */
export function useRegisterIdentity() {
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  /**
   * Register an identity in the registry
   */
  const registerIdentity = async (
    userAddress: Address,
    identityAddress: Address,
    countryCode: CountryCode
  ) => {
    return writeContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: identityRegistryAbi,
      functionName: 'registerIdentity',
      args: [userAddress, identityAddress, countryCode],
    })
  }

  return {
    registerIdentity,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

/**
 * Hook for predicting identity address before creation
 */
export function usePredictIdentityAddress(ownerAddress?: Address) {
  const salt = useMemo(() => {
    if (!ownerAddress) return undefined
    return keccak256(
      encodePacked(['address', 'uint256'], [ownerAddress, BigInt(Date.now())])
    )
  }, [ownerAddress])

  const { data: predictedAddress } = useReadContract({
    address: IDENTITY_FACTORY_ADDRESS,
    abi: identityFactoryAbi,
    functionName: 'predictIdentityAddress',
    args: ownerAddress && salt ? [ownerAddress, salt] : undefined,
    query: {
      enabled: !!ownerAddress && !!salt,
    },
  })

  return predictedAddress as Address | undefined
}

/**
 * Combined hook for full identity creation and registration flow
 */
export function useIdentityFlow() {
  const { createIdentity: createIdentityTx, ...createState } = useCreateIdentity()
  const { registerIdentity: registerIdentityTx, ...registerState } = useRegisterIdentity()

  /**
   * Complete identity flow: create + register
   */
  const createAndRegisterIdentity = async (
    ownerAddress: Address,
    countryCode: CountryCode
  ) => {
    try {
      // Step 1: Create identity
      await createIdentityTx(ownerAddress)
      
      // Step 2: Wait for transaction confirmation
      // The identity address will be emitted in the IdentityCreated event
      // In production, you'd parse the event to get the identity address
      
      // Step 3: Register identity (requires backend/agent privileges)
      // This would typically be called by a backend service
      // await registerIdentityTx(ownerAddress, identityAddress, countryCode)
      
      return { success: true }
    } catch (error) {
      console.error('Identity flow error:', error)
      return { success: false, error }
    }
  }

  return {
    createAndRegisterIdentity,
    createState,
    registerState,
  }
}

/**
 * Export contract addresses for use in other components
 */
export const IDENTITY_CONTRACT_ADDRESSES = {
  factory: IDENTITY_FACTORY_ADDRESS,
  registry: IDENTITY_REGISTRY_ADDRESS,
} as const
