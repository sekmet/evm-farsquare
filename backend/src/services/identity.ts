/**
 * EVM Identity Service
 *
 * Handles investor identity verification and OnchainID management for ERC3643 compliance
 * Uses Viem/Wagmi patterns for EVM blockchain interactions
 */

import type { Address, Hash } from 'viem'
import type { PublicClient, WalletClient } from 'viem'
import { encodeFunctionData, parseAbi } from 'viem'

/**
 * Identity information structure following ERC3643 patterns
 */
export interface IdentityInfo {
  /** Wallet address */
  userAddress: Address
  /** OnchainID identity contract address */
  identityAddress: Address
  /** Country code (ISO-3166) */
  countryCode: number
  /** Verification status based on claim validation */
  isVerified: boolean
  /** Associated claims */
  claims: Claim[]
}

/**
 * Claim structure for identity verification
 */
export interface Claim {
  /** Claim topic ID */
  topic: bigint
  /** Claim data */
  data: string
  /** Trusted issuer address */
  issuer?: Address
}

/**
 * ERC3643 Identity Service
 * Manages identity registration and verification using Viem clients
 */
export class IdentityService {
  private readonly identityRegistryAbi = parseAbi([
    // Read functions
    'function contains(address _userAddress) external view returns (bool)',
    'function identity(address _userAddress) external view returns (address)',
    'function investorCountry(address _userAddress) external view returns (uint16)',
    'function isVerified(address _userAddress) external view returns (bool)',

    // Write functions
    'function registerIdentity(address _userAddress, address _identity, uint16 _country) external',
    'function batchRegisterIdentity(address[] _userAddresses, address[] _identities, uint16[] _countries) external',
    'function updateIdentity(address _userAddress, address _identity) external',
    'function updateCountry(address _userAddress, uint16 _country) external',
    'function batchUpdateCountry(address[] _userAddresses, uint16[] _countries) external',
    'function deleteIdentity(address _userAddress) external',
    'function recoverIdentity(address _oldWallet, address _newWallet) external',

    // Agent management
    'function addAgent(address _agent) external',
    'function removeAgent(address _agent) external',
    'function isAgent(address _address) external view returns (bool)',
  ])

  constructor(
    private publicClient: PublicClient,
    private walletClient: WalletClient,
    private identityRegistryAddress: Address
  ) {}

  /**
   * Register investor identity following ERC3643 patterns
   */
  async registerIdentity(
    investorAddress: Address,
    onchainIDAddress: Address,
    countryCode: number,
    account: Address
  ): Promise<{ success: boolean; txHash?: Hash; error?: string }> {
    try {
      // Prepare transaction data
      const data = encodeFunctionData({
        abi: this.identityRegistryAbi,
        functionName: 'registerIdentity',
        args: [investorAddress, onchainIDAddress, countryCode],
      })

      // Simulate transaction first
      const { request } = await this.publicClient.simulateContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: 'registerIdentity',
        args: [investorAddress, onchainIDAddress, countryCode],
        account,
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
        error: `Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Check if investor identity is verified
   */
  async isVerified(investorAddress: Address): Promise<{ success: boolean; isVerified?: boolean; error?: string }> {
    try {
      const isVerified = await this.publicClient.readContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: 'isVerified',
        args: [investorAddress],
      })

      return { success: true, isVerified: isVerified as boolean }
    } catch (error) {
      return {
        success: false,
        error: `Verification check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Get identity information for an address
   */
  async getIdentityInfo(investorAddress: Address): Promise<{ success: boolean; identity?: IdentityInfo; error?: string }> {
    try {
      const [identityAddress, countryCode, isVerified] = await Promise.all([
        this.publicClient.readContract({
          address: this.identityRegistryAddress,
          abi: this.identityRegistryAbi,
          functionName: 'identity',
          args: [investorAddress],
        }),
        this.publicClient.readContract({
          address: this.identityRegistryAddress,
          abi: this.identityRegistryAbi,
          functionName: 'investorCountry',
          args: [investorAddress],
        }),
        this.publicClient.readContract({
          address: this.identityRegistryAddress,
          abi: this.identityRegistryAbi,
          functionName: 'isVerified',
          args: [investorAddress],
        }),
      ])

      const identity: IdentityInfo = {
        userAddress: investorAddress,
        identityAddress: identityAddress as Address,
        countryCode: countryCode as number,
        isVerified: isVerified as boolean,
        claims: [], // Claims would need separate contract interaction
      }

      return { success: true, identity }
    } catch (error) {
      return {
        success: false,
        error: `Identity lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Update investor country code
   */
  async updateCountry(
    investorAddress: Address,
    countryCode: number,
    account: Address
  ): Promise<{ success: boolean; txHash?: Hash; error?: string }> {
    try {
      // Simulate first
      const { request } = await this.publicClient.simulateContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: 'updateCountry',
        args: [investorAddress, countryCode],
        account,
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
   * Remove investor identity
   */
  async removeIdentity(
    investorAddress: Address,
    account: Address
  ): Promise<{ success: boolean; txHash?: Hash; error?: string }> {
    try {
      // Simulate first
      const { request } = await this.publicClient.simulateContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: 'deleteIdentity',
        args: [investorAddress],
        account,
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
        error: `Identity removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Batch register identities for multiple investors
   */
  async batchRegister(
    identities: Array<{
      userAddress: Address
      identityAddress: Address
      countryCode: number
    }>,
    account: Address
  ): Promise<{ success: boolean; txHash?: Hash; error?: string }> {
    try {
      const userAddresses = identities.map(i => i.userAddress)
      const identityAddresses = identities.map(i => i.identityAddress)
      const countryCodes = identities.map(i => i.countryCode)

      // Simulate first
      const { request } = await this.publicClient.simulateContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: 'batchRegisterIdentity',
        args: [userAddresses, identityAddresses, countryCodes],
        account,
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
        error: `Batch registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Check if address is registered
   */
  async contains(investorAddress: Address): Promise<{ success: boolean; registered?: boolean; error?: string }> {
    try {
      const registered = await this.publicClient.readContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: 'contains',
        args: [investorAddress],
      })

      return { success: true, registered: registered as boolean }
    } catch (error) {
      return {
        success: false,
        error: `Registration check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Add an agent to the identity registry
   */
  async addAgent(
    agentAddress: Address,
    account: Address
  ): Promise<{ success: boolean; txHash?: Hash; error?: string }> {
    try {
      // Simulate first
      const { request } = await this.publicClient.simulateContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: 'addAgent',
        args: [agentAddress],
        account,
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
    account: Address
  ): Promise<{ success: boolean; txHash?: Hash; error?: string }> {
    try {
      // Simulate first
      const { request } = await this.publicClient.simulateContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: 'removeAgent',
        args: [agentAddress],
        account,
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
  async isAgent(agentAddress: Address): Promise<{ success: boolean; isAgent?: boolean; error?: string }> {
    try {
      const isAgent = await this.publicClient.readContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: 'isAgent',
        args: [agentAddress],
      })

      return { success: true, isAgent: isAgent as boolean }
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
    account: Address
  ): Promise<{ success: boolean; txHash?: Hash; error?: string }> {
    try {
      // Simulate first
      const { request } = await this.publicClient.simulateContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: 'recoverIdentity',
        args: [oldWallet, newWallet],
        account,
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
}
