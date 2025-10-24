/**
 * EVM Identity Registry Service
 *
 * Handles on-chain identity registration and verification with ERC-3643 compliance
 * Uses Viem/Wagmi patterns for EVM blockchain interactions
 */

import type { Address, Hash, Hex } from 'viem'
import type { PublicClient, WalletClient } from 'viem'
import { encodeFunctionData, parseAbi } from 'viem'
import type { Pool } from 'pg'

/**
 * ERC-3643 Identity Registration structure
 */
export interface IdentityRegistration {
  /** Wallet address */
  userAddress: Address
  /** OnchainID identity contract address */
  identityContract: Address
  /** Country code (ISO 3166-1 numeric) */
  country: number
  /** KYC attestation hash */
  kycAttestationHash?: string
  /** Registration timestamp */
  registeredAt?: Date
  /** Verification level */
  verificationLevel: "basic" | "intermediate" | "advanced"
}

/**
 * ERC-3643 Claim structure for ONCHAINID
 */
export interface ClaimData {
  /** Claim topic ID */
  topic: bigint
  /** Claim scheme */
  scheme: bigint
  /** Trusted issuer address */
  issuer: Address
  /** Claim signature (bytes) */
  signature: Hex
  /** Claim data (bytes) */
  data: Hex
  /** Claim URI */
  uri: string
}

/**
 * Complete identity details structure
 */
export interface IdentityDetails {
  /** Verification status based on claim validation */
  isVerified: boolean
  /** OnchainID contract address */
  identityContract: Address | null
  /** Country code */
  country: number | null
  /** Associated claims */
  claims: ClaimData[]
  /** Registration timestamp */
  registrationDate: Date | null
}

/**
 * Batch registration parameters
 */
export interface BatchRegistrationParams {
  /** Array of identities to register */
  users: Array<{
    address: Address
    identityContract: Address
    country: number
  }>
  /** Registrar account address */
  registrarAddress: Address
}

/**
 * ERC-3643 Identity Registry Service
 * Manages identity registration, verification, and claims using Viem clients
 */
export class IdentityRegistryService {
  private readonly identityRegistryAbi = parseAbi([
    // Identity management
    'function registerIdentity(address _userAddress, address _identity, uint16 _country) external',
    'function batchRegisterIdentity(address[] _userAddresses, address[] _identities, uint16[] _countries) external',
    'function updateIdentity(address _userAddress, address _identity) external',
    'function updateCountry(address _userAddress, uint16 _country) external',
    'function deleteIdentity(address _userAddress) external',

    // Recovery
    'function recoverIdentity(address _oldWallet, address _newWallet) external',

    // Queries
    'function contains(address _userAddress) external view returns (bool)',
    'function identity(address _userAddress) external view returns (address)',
    'function investorCountry(address _userAddress) external view returns (uint16)',
    'function isVerified(address _userAddress) external view returns (bool)',

    // Agent management
    'function addAgent(address _agent) external',
    'function removeAgent(address _agent) external',
    'function isAgent(address _address) external view returns (bool)',
  ])

  private readonly onchainIdAbi = parseAbi([
    // Claim management
    'function addClaim(uint256 _topic, uint256 _scheme, address _issuer, bytes calldata _signature, bytes calldata _data, string calldata _uri) external',
    'function getClaim(bytes32 _claimId) external view returns (uint256 topic, uint256 scheme, address issuer, bytes memory signature, bytes memory data, string memory uri)',
    'function getClaimIdsByTopic(uint256 _topic) external view returns (bytes32[])',
  ])

  constructor(
    private publicClient: PublicClient,
    private walletClient: WalletClient,
    private pool: Pool,
    private identityRegistryAddress: Address,
    private onchainIdAddress?: Address
  ) {}

  /**
   * Register a new identity for a user following ERC3643 patterns
   */
  async registerIdentity(
    registration: IdentityRegistration,
    registrarAddress: Address
  ): Promise<{ success: boolean; txHash?: Hash; error?: string }> {
    try {
      // Simulate transaction first
      const { request } = await this.publicClient.simulateContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: 'registerIdentity',
        args: [registration.userAddress, registration.identityContract, registration.country],
        account: registrarAddress,
      })

      // Send transaction
      const hash = await this.walletClient.writeContract(request)

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'success') {
        // Store registration in database
        await this.storeIdentityRegistration(registration)
        return { success: true, txHash: hash }
      } else {
        return { success: false, error: 'Transaction reverted' }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to register identity: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Batch register multiple identities efficiently
   */
  async batchRegisterIdentities(params: BatchRegistrationParams): Promise<{ success: boolean; txHash?: Hash; error?: string }> {
    try {
      const userAddresses = params.users.map(u => u.address)
      const identityContracts = params.users.map(u => u.identityContract)
      const countries = params.users.map(u => u.country)

      // Simulate transaction first
      const { request } = await this.publicClient.simulateContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: 'batchRegisterIdentity',
        args: [userAddresses, identityContracts, countries],
        account: params.registrarAddress,
      })

      // Send transaction
      const hash = await this.walletClient.writeContract(request)

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'success') {
        // Store registrations in database
        for (const user of params.users) {
          await this.storeIdentityRegistration({
            userAddress: user.address,
            identityContract: user.identityContract,
            country: user.country,
            verificationLevel: 'basic',
          })
        }
        return { success: true, txHash: hash }
      } else {
        return { success: false, error: 'Transaction reverted' }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to batch register identities: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Check if user is verified
   */
  async isVerified(userAddress: Address): Promise<{ success: boolean; data?: boolean; error?: string }> {
    try {
      const isVerified = await this.publicClient.readContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: 'isVerified',
        args: [userAddress],
      })

      return { success: true, data: isVerified as boolean }
    } catch (error) {
      return {
        success: false,
        error: `Verification check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Get identity contract for user
   */
  async getIdentity(userAddress: Address): Promise<{ success: boolean; data?: Address; error?: string }> {
    try {
      const identityAddress = await this.publicClient.readContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: 'identity',
        args: [userAddress],
      })

      return { success: true, data: identityAddress as Address }
    } catch (error) {
      return {
        success: false,
        error: `Identity lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Get user's country code
   */
  async getCountry(userAddress: Address): Promise<{ success: boolean; data?: number; error?: string }> {
    try {
      const country = await this.publicClient.readContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: 'investorCountry',
        args: [userAddress],
      })

      return { success: true, data: country as number }
    } catch (error) {
      return {
        success: false,
        error: `Country lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Get complete identity details
   */
  async getIdentityDetails(userAddress: Address): Promise<{ success: boolean; data?: IdentityDetails; error?: string }> {
    try {
      const [isVerifiedResult, identityResult, countryResult] = await Promise.all([
        this.isVerified(userAddress),
        this.getIdentity(userAddress),
        this.getCountry(userAddress),
      ])

      // Get claims from database (on-chain claims would require additional contract calls)
      const claims = await this.getUserClaims(userAddress)

      const details: IdentityDetails = {
        isVerified: isVerifiedResult.success ? (isVerifiedResult.data as boolean) : false,
        identityContract: identityResult.success ? (identityResult.data as Address) : null,
        country: countryResult.success ? (countryResult.data as number) : null,
        claims,
        registrationDate: null, // Would be fetched from blockchain events or database
      }

      return { success: true, data: details }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get identity details: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Update user's identity contract
   */
  async updateIdentity(
    userAddress: Address,
    newIdentityContract: Address,
    adminAddress: Address
  ): Promise<{ success: boolean; txHash?: Hash; error?: string }> {
    try {
      // Simulate first
      const { request } = await this.publicClient.simulateContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: 'updateIdentity',
        args: [userAddress, newIdentityContract],
        account: adminAddress,
      })

      // Send transaction
      const hash = await this.walletClient.writeContract(request)

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'success') {
        return { success: true, txHash: hash }
      } else {
        return { success: false, error: 'Transaction reverted' }
      }
    } catch (error) {
      return {
        success: false,
        error: `Identity update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Update user's country
   */
  async updateCountry(
    userAddress: Address,
    newCountry: number,
    adminAddress: Address
  ): Promise<{ success: boolean; txHash?: Hash; error?: string }> {
    try {
      // Simulate first
      const { request } = await this.publicClient.simulateContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: 'updateCountry',
        args: [userAddress, newCountry],
        account: adminAddress,
      })

      // Send transaction
      const hash = await this.walletClient.writeContract(request)

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'success') {
        return { success: true, txHash: hash }
      } else {
        return { success: false, error: 'Transaction reverted' }
      }
    } catch (error) {
      return {
        success: false,
        error: `Country update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Remove identity from registry
   */
  async removeIdentity(userAddress: Address, adminAddress: Address): Promise<{ success: boolean; txHash?: Hash; error?: string }> {
    try {
      // Simulate first
      const { request } = await this.publicClient.simulateContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: 'deleteIdentity',
        args: [userAddress],
        account: adminAddress,
      })

      // Send transaction
      const hash = await this.walletClient.writeContract(request)

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'success') {
        // Remove from database
        await this.removeIdentityRegistration(userAddress)
        return { success: true, txHash: hash }
      } else {
        return { success: false, error: 'Transaction reverted' }
      }
    } catch (error) {
      return {
        success: false,
        error: `Identity removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Add claim to ONCHAINID following ERC3643 patterns
   */
  async addClaim(
    identityContract: Address,
    claim: ClaimData,
    issuerAddress: Address
  ): Promise<{ success: boolean; txHash?: Hash; error?: string }> {
    try {
      // Simulate first
      const { request } = await this.publicClient.simulateContract({
        address: identityContract,
        abi: this.onchainIdAbi,
        functionName: 'addClaim',
        args: [claim.topic, claim.scheme, claim.issuer, claim.signature, claim.data, claim.uri],
        account: issuerAddress,
      })

      // Send transaction
      const hash = await this.walletClient.writeContract(request)

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'success') {
        // Store claim in database
        await this.storeClaim(identityContract, claim)
        return { success: true, txHash: hash }
      } else {
        return { success: false, error: 'Transaction reverted' }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to add claim: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Get claim from ONCHAINID
   */
  async getClaim(identityContract: Address, claimId: Hex): Promise<{ success: boolean; data?: ClaimData; error?: string }> {
    try {
      const claimData = await this.publicClient.readContract({
        address: identityContract,
        abi: this.onchainIdAbi,
        functionName: 'getClaim',
        args: [claimId],
      })

      const [topic, scheme, issuer, signature, data, uri] = claimData as [bigint, bigint, Address, Hex, Hex, string]

      return {
        success: true,
        data: {
          topic,
          scheme,
          issuer,
          signature,
          data,
          uri,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: `Claim retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Link KYC attestation to identity
   */
  async linkKycAttestation(
    userAddress: Address,
    attestationHash: string,
    kycLevel: string
  ): Promise<boolean> {
    const query = `
      UPDATE public.registrations
      SET kyc_attestation_hash = $2, kyc_level = $3, updated_at = NOW()
      WHERE user_address = $1
    `

    try {
      await this.pool.query(query, [userAddress, attestationHash, kycLevel])
      return true
    } catch (error) {
      console.error('Failed to link KYC attestation:', error)
      return false
    }
  }

  /**
   * Add an agent to the identity registry
   */
  async addAgent(
    agentAddress: Address,
    adminAddress: Address
  ): Promise<{ success: boolean; txHash?: Hash; error?: string }> {
    try {
      // Simulate first
      const { request } = await this.publicClient.simulateContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: 'addAgent',
        args: [agentAddress],
        account: adminAddress,
      })

      // Send transaction
      const hash = await this.walletClient.writeContract(request)

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'success') {
        return { success: true, txHash: hash }
      } else {
        return { success: false, error: 'Transaction reverted' }
      }
    } catch (error) {
      return {
        success: false,
        error: `Agent addition failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Remove an agent from the identity registry
   */
  async removeAgent(
    agentAddress: Address,
    adminAddress: Address
  ): Promise<{ success: boolean; txHash?: Hash; error?: string }> {
    try {
      // Simulate first
      const { request } = await this.publicClient.simulateContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: 'removeAgent',
        args: [agentAddress],
        account: adminAddress,
      })

      // Send transaction
      const hash = await this.walletClient.writeContract(request)

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'success') {
        return { success: true, txHash: hash }
      } else {
        return { success: false, error: 'Transaction reverted' }
      }
    } catch (error) {
      return {
        success: false,
        error: `Agent removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Check if address is an agent
   */
  async isAgent(agentAddress: Address): Promise<{ success: boolean; data?: boolean; error?: string }> {
    try {
      const isAgent = await this.publicClient.readContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: 'isAgent',
        args: [agentAddress],
      })

      return { success: true, data: isAgent as boolean }
    } catch (error) {
      return {
        success: false,
        error: `Agent check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Recover identity to a new wallet address
   */
  async recoverIdentity(
    oldWallet: Address,
    newWallet: Address,
    adminAddress: Address
  ): Promise<{ success: boolean; txHash?: Hash; error?: string }> {
    try {
      // Simulate first
      const { request } = await this.publicClient.simulateContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: 'recoverIdentity',
        args: [oldWallet, newWallet],
        account: adminAddress,
      })

      // Send transaction
      const hash = await this.walletClient.writeContract(request)

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'success') {
        return { success: true, txHash: hash }
      } else {
        return { success: false, error: 'Transaction reverted' }
      }
    } catch (error) {
      return {
        success: false,
        error: `Identity recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  // ============================================================
  // Database Operations
  // ============================================================

  private async storeIdentityRegistration(registration: IdentityRegistration): Promise<void> {
    const query = `
      INSERT INTO public.registrations (user_address, identity_contract, country, verification_level, registered_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_address)
      DO UPDATE SET
        identity_contract = EXCLUDED.identity_contract,
        country = EXCLUDED.country,
        verification_level = EXCLUDED.verification_level,
        updated_at = NOW()
    `

    await this.pool.query(query, [
      registration.userAddress,
      registration.identityContract,
      registration.country,
      registration.verificationLevel,
    ])
  }

  private async removeIdentityRegistration(userAddress: Address): Promise<void> {
    const query = `
      DELETE FROM public.registrations
      WHERE user_address = $1
    `

    await this.pool.query(query, [userAddress])
  }

  private async storeClaim(identityContract: Address, claim: ClaimData): Promise<void> {
    const query = `
      INSERT INTO public.claims (identity_contract, topic, scheme, issuer, signature, data, uri, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `

    await this.pool.query(query, [
      identityContract,
      claim.topic.toString(), // Convert bigint to string for database
      claim.scheme.toString(), // Convert bigint to string for database
      claim.issuer,
      claim.signature,
      claim.data,
      claim.uri,
    ])
  }

  private async getUserClaims(userAddress: Address): Promise<ClaimData[]> {
    const query = `
      SELECT c.*
      FROM public.claims c
      JOIN public.registrations r ON c.identity_contract = r.identity_contract
      WHERE r.user_address = $1
      ORDER BY c.created_at DESC
    `

    try {
      const result = await this.pool.query(query, [userAddress])
      return result.rows.map((row) => ({
        topic: BigInt(row.topic), // Convert string back to bigint
        scheme: BigInt(row.scheme), // Convert string back to bigint
        issuer: row.issuer as Address,
        signature: row.signature as Hex,
        data: row.data as Hex,
        uri: row.uri,
      }))
    } catch (error) {
      console.error('Failed to get user claims:', error)
      return []
    }
  }

  /**
   * Get identity registration from database
   */
  async getIdentityRegistration(userAddress: Address): Promise<IdentityRegistration | null> {
    const query = `
      SELECT * FROM public.registrations
      WHERE user_address = $1
    `

    try {
      const result = await this.pool.query(query, [userAddress])
      if (result.rows.length === 0) return null

      const row = result.rows[0]
      return {
        userAddress: row.user_address,
        identityContract: row.identity_contract,
        country: row.country,
        kycAttestationHash: row.kyc_attestation_hash,
        registeredAt: row.registered_at,
        verificationLevel: row.verification_level,
      }
    } catch (error) {
      console.error('Failed to get identity registration:', error)
      return null
    }
  }
}
