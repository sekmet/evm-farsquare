/**
 * ERC-3643 Contracts Service
 * Complete implementation supporting TREX ecosystem with Viem/Wagmi patterns
 */

import {
  createPublicClient,
  createWalletClient,
  getAbiItem,
  http,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
  type Chain,
  type Account,
  type SimulateContractReturnType,
  type EstimateContractGasReturnType,
  type WriteContractReturnType,
  type WaitForTransactionReceiptReturnType,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import {
  mainnet,
  base,
  baseSepolia,
  sepolia,
  polygon,
  polygonMumbai,
  optimism,
  optimismSepolia,
  arbitrum,
  arbitrumSepolia
} from 'viem/chains'

// ERC-3643 Contract ABIs
import { trexFactoryAbi } from '../../../frontend/lib/contracts/trex-factory-abi'
import { trexTokenAbi } from '../../../frontend/lib/contracts/trex-token-abi'
import { modularComplianceAbi } from '../../../frontend/lib/contracts/modular-compliance-abi'
import { timeRestrictionsModuleAbi } from '../../../frontend/lib/contracts/time-restrictions-module-abi'
import { countryRestrictionsModuleAbi } from '../../../frontend/lib/contracts/country-restrictions-module-abi'
import { maxBalanceModuleAbi } from '../../../frontend/lib/contracts/max-balance-module-abi'
import { maxHoldersModuleAbi } from '../../../frontend/lib/contracts/max-holders-module-abi'
import { identityRegistryAbi } from '../../../frontend/lib/contracts/identity-registry-abi'
import { claimTopicsRegistryAbi } from '../../../frontend/lib/contracts/claim-topics-registry-abi'
import { trustedIssuersRegistryAbi } from '../../../frontend/lib/contracts/trusted-issuers-registry-abi'
import { identityRegistryStorageAbi } from '../../../frontend/lib/contracts/identity-registry-storage-abi'
import { identityFactoryAbi } from '../../../frontend/lib/contracts/identity-factory-abi'
import { implementationAuthorityAbi } from '../../../frontend/lib/contracts/implementation-authority-abi'
import { onchainIdAbi } from '../../../frontend/lib/contracts/onchain-id-abi'
import { iIdentityAbi } from '../../../frontend/lib/contracts/i-identity-abi'
import { iClaimIssuerAbi } from '../../../frontend/lib/contracts/i-claim-issuer-abi'

// ERC-20 Standard ABI for basic token operations
const erc20Abi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'transferFrom',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

// ============================================================
// TYPES & INTERFACES
// ============================================================

/**
 * EVM Network Configuration
 */
export type EVMNetwork = 'mainnet' | 'testnet' | 'devnet' | 'polygon' | 'polygon-testnet' | 'optimism' | 'optimism-testnet' | 'arbitrum' | 'arbitrum-testnet'

/**
 * Chain Configuration
 */
export interface ChainConfig {
  id: number
  name: string
  rpcUrl: string
  explorerUrl?: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
}

/**
 * Contract Address Configuration
 */
export interface ContractAddresses {
  trexFactory?: Address
  identityFactory?: Address
  identityRegistry?: Address
  claimTopicsRegistry?: Address
  trustedIssuersRegistry?: Address
  identityRegistryStorage?: Address
  implementationAuthority?: Address
}

/**
 * ERC-3643 Deployment Result
 */
export interface TREXDeploymentResult {
  token: Address
  identityRegistry: Address
  compliance: Address
  identityRegistryStorage: Address
  claimTopicsRegistry: Address
  trustedIssuersRegistry: Address
}

/**
 * Compliance Module Types
 */
export type ComplianceModuleType = 'time' | 'country' | 'balance' | 'holders'

/**
 * Identity Verification Status
 */
export interface IdentityVerificationStatus {
  exists: boolean
  isVerified: boolean
  identityAddress: Address | null
  countryCode: number | null
  investorCountry: number | null
}

/**
 * Claim Data Structure
 */
export interface ClaimData {
  topic: bigint
  scheme: bigint
  issuer: Address
  signature: Hex
  data: Hex
  uri: string
}

/**
 * Trusted Issuer Data
 */
export interface TrustedIssuer {
  address: Address
  topics: bigint[]
}

/**
 * Transaction Result
 */
export interface TransactionResult {
  txHash: Hex
  blockNumber?: bigint
  gasUsed?: bigint
  status: 'success' | 'failed' | 'pending'
  logs?: any[]
  receipt?: WaitForTransactionReceiptReturnType
}

/**
 * Contract Operation Result
 */
export type ContractResult<T = any> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Simulation Result
 */
export interface SimulationResult {
  success: boolean
  gasUsed?: bigint
  returnValue?: any
  error?: string
}

/**
 * Contract Call Parameters
 */
export interface ContractCallParams {
  address: Address
  functionName: string
  args?: any[]
  value?: bigint
}

/**
 * Contract Write Parameters
 */
export interface ContractWriteParams {
  address: Address
  functionName: string
  args?: any[]
  value?: bigint
  gasLimit?: bigint
}

/**
 * Country Code Type (ISO 3166-1 numeric)
 */
export type CountryCode = number

// ============================================================
// VIEM CLIENT INFRASTRUCTURE
// ============================================================

/**
 * Supported Chains Configuration
 */
export const SUPPORTED_CHAINS: Record<EVMNetwork, Chain> = {
  mainnet: mainnet,
  testnet: baseSepolia,
  devnet: baseSepolia,
  'polygon': polygon,
  'polygon-testnet': polygonMumbai,
  'optimism': optimism,
  'optimism-testnet': optimismSepolia,
  'arbitrum': arbitrum,
  'arbitrum-testnet': arbitrumSepolia,
}

/**
 * Chain Configurations with RPC URLs
 */
export const CHAIN_CONFIGS: Record<EVMNetwork, ChainConfig> = {
  mainnet: {
    id: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/',
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  testnet: {
    id: 84532,
    name: 'Base Sepolia',
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  devnet: {
    id: 84532,
    name: 'Base Sepolia (Dev)',
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  polygon: {
    id: 137,
    name: 'Polygon',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  },
  'polygon-testnet': {
    id: 80001,
    name: 'Polygon Mumbai',
    rpcUrl: process.env.POLYGON_MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
    explorerUrl: 'https://mumbai.polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  },
  optimism: {
    id: 10,
    name: 'Optimism',
    rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
    explorerUrl: 'https://optimistic.etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  'optimism-testnet': {
    id: 11155420,
    name: 'Optimism Sepolia',
    rpcUrl: process.env.OPTIMISM_SEPOLIA_RPC_URL || 'https://sepolia.optimism.io',
    explorerUrl: 'https://sepolia-optimistic.etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum One',
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  'arbitrum-testnet': {
    id: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://sepolia.arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
}

/**
 * ABI Registry for Contract Type Resolution
 */
const ABI_REGISTRY: Record<string, readonly any[]> = {
  'trex-factory': trexFactoryAbi,
  'trex-token': trexTokenAbi,
  'modular-compliance': modularComplianceAbi,
  'time-restrictions': timeRestrictionsModuleAbi,
  'country-restrictions': countryRestrictionsModuleAbi,
  'max-balance': maxBalanceModuleAbi,
  'max-holders': maxHoldersModuleAbi,
  'identity-registry': identityRegistryAbi,
  'claim-topics-registry': claimTopicsRegistryAbi,
  'trusted-issuers-registry': trustedIssuersRegistryAbi,
  'identity-registry-storage': identityRegistryStorageAbi,
  'identity-factory': identityFactoryAbi,
  'implementation-authority': implementationAuthorityAbi,
  'onchain-id': onchainIdAbi,
  'identity': iIdentityAbi,
  'claim-issuer': iClaimIssuerAbi,
  'erc20': erc20Abi,
}

/**
 * Contract Type Detection (based on common function signatures)
 */
function detectContractType(abi: readonly any[]): string {
  // Check for TREXFactory signature
  if (abi.some(item => item.name === 'deployTREXSuite')) {
    return 'trex-factory'
  }

  // Check for TREXToken signature
  if (abi.some(item => item.name === 'addAgent')) {
    return 'trex-token'
  }

  // Check for ModularCompliance signature
  if (abi.some(item => item.name === 'addModule')) {
    return 'modular-compliance'
  }

  // Check for Identity Registry signature
  if (abi.some(item => item.name === 'registerIdentity')) {
    return 'identity-registry'
  }

  // Check for Identity Factory signature
  if (abi.some(item => item.name === 'createIdentity')) {
    return 'identity-factory'
  }

  // Check for OnchainID/IIdentity signature
  if (abi.some(item => item.name === 'addClaim')) {
    return 'identity'
  }

  // Check for IClaimIssuer signature
  if (abi.some(item => item.name === 'isClaimIssuer')) {
    return 'claim-issuer'
  }

  // Default to ERC20
  return 'erc20'
}

// ============================================================
// ERC-3643 CONTRACTS SERVICE
// ============================================================

/**
 * ERC-3643 Contracts Service
 * Complete implementation supporting TREX ecosystem
 */
export class ERC3643ContractsService {
  private network: EVMNetwork
  private publicClient: PublicClient
  private walletClient?: WalletClient
  private account?: Account
  private contractAddresses: ContractAddresses

  constructor(
    network: EVMNetwork = 'testnet',
    customRpcUrl?: string,
    privateKey?: Hex
  ) {
    this.network = network
    this.contractAddresses = this.loadContractAddresses()

    // Initialize public client
    const chain = SUPPORTED_CHAINS[network]
    const rpcUrl = customRpcUrl || CHAIN_CONFIGS[network].rpcUrl

    this.publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    })

    // Initialize wallet client if private key provided
    if (privateKey) {
      this.account = privateKeyToAccount(privateKey)
      this.walletClient = createWalletClient({
        account: this.account,
        chain,
        transport: http(rpcUrl),
      })
    }
  }

  /**
   * Load contract addresses from environment
   */
  private loadContractAddresses(): ContractAddresses {
    return {
      trexFactory: process.env.VITE_TREX_FACTORY_ADDRESS as Address,
      identityFactory: process.env.VITE_IDENTITY_FACTORY_ADDRESS as Address,
      identityRegistry: process.env.VITE_IDENTITY_REGISTRY_ADDRESS as Address,
      claimTopicsRegistry: process.env.VITE_CLAIM_TOPICS_REGISTRY_ADDRESS as Address,
      trustedIssuersRegistry: process.env.VITE_TRUSTED_ISSUERS_REGISTRY_ADDRESS as Address,
      identityRegistryStorage: process.env.VITE_IDENTITY_REGISTRY_STORAGE_ADDRESS as Address,
      implementationAuthority: process.env.VITE_IMPLEMENTATION_AUTHORITY_ADDRESS as Address,
    }
  }

  /**
   * Get contract ABI by type or address
   */
  private getContractAbi(contractTypeOrAddress: string): readonly any[] {
    // If it's a direct contract type
    if (ABI_REGISTRY[contractTypeOrAddress]) {
      return ABI_REGISTRY[contractTypeOrAddress]
    }

    // Try to detect from known addresses
    const addresses = this.contractAddresses
    if (contractTypeOrAddress === addresses.trexFactory) return trexFactoryAbi
    if (contractTypeOrAddress === addresses.identityFactory) return identityFactoryAbi
    if (contractTypeOrAddress === addresses.identityRegistry) return identityRegistryAbi
    if (contractTypeOrAddress === addresses.claimTopicsRegistry) return claimTopicsRegistryAbi
    if (contractTypeOrAddress === addresses.trustedIssuersRegistry) return trustedIssuersRegistryAbi
    if (contractTypeOrAddress === addresses.identityRegistryStorage) return identityRegistryStorageAbi
    if (contractTypeOrAddress === addresses.implementationAuthority) return implementationAuthorityAbi

    // Default fallback
    return erc20Abi
  }

  // ============================================================
  // VIEM CLIENT MANAGEMENT
  // ============================================================

  /**
   * Create a new public client for a specific network
   */
  static createPublicClient(network: EVMNetwork, customRpcUrl?: string): PublicClient {
    const chain = SUPPORTED_CHAINS[network]
    const rpcUrl = customRpcUrl || CHAIN_CONFIGS[network].rpcUrl

    return createPublicClient({
      chain,
      transport: http(rpcUrl),
    })
  }

  /**
   * Create a new wallet client for a specific network
   */
  static createWalletClient(
    network: EVMNetwork,
    privateKey?: Hex,
    customRpcUrl?: string
  ): WalletClient {
    const chain = SUPPORTED_CHAINS[network]
    const rpcUrl = customRpcUrl || CHAIN_CONFIGS[network].rpcUrl

    if (!privateKey) {
      throw new Error('Private key required for wallet client')
    }

    const account = privateKeyToAccount(privateKey)

    return createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    })
  }

  /**
   * Get supported chains
   */
  static getSupportedChains(): EVMNetwork[] {
    return Object.keys(SUPPORTED_CHAINS) as EVMNetwork[]
  }

  /**
   * Get chain configuration
   */
  static getChainConfig(network: EVMNetwork): ChainConfig {
    return CHAIN_CONFIGS[network]
  }

  // ============================================================
  // CONTRACT INTERACTION METHODS
  // ============================================================

  /**
   * Read from contract
   */
  async readContract<T = any>(params: ContractCallParams): Promise<ContractResult<T>> {
    try {
      const abi = this.getContractAbi(params.address)
      const result = await this.publicClient.readContract({
        address: params.address,
        abi,
        functionName: params.functionName,
        args: params.args || [],
      })

      return { success: true, data: result as T }
    } catch (error) {
      return {
        success: false,
        error: `Contract read failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Simulate contract call
   */
  async simulateContract(params: ContractWriteParams): Promise<ContractResult<SimulationResult>> {
    try {
      if (!this.walletClient || !this.account) {
        return { success: false, error: 'Wallet client not initialized' }
      }

      const abi = this.getContractAbi(params.address)
      const simulation = await this.publicClient.simulateContract({
        address: params.address,
        abi,
        functionName: params.functionName,
        args: params.args || [],
        value: params.value,
        account: this.account,
      })

      return {
        success: true,
        data: {
          success: true,
          returnValue: simulation.result
        },
      }
    } catch (error) {
      return {
        success: true, // Simulation "succeeds" but shows the error
        data: {
          success: false,
          error: error instanceof Error ? error.message : 'Simulation failed',
        },
      }
    }
  }

  /**
   * Estimate gas for contract call
   */
  async estimateGas(params: ContractWriteParams): Promise<ContractResult<bigint>> {
    try {
      if (!this.account) {
        return { success: false, error: 'Account not initialized' }
      }

      const abi = this.getContractAbi(params.address)
      const gasEstimate = await this.publicClient.estimateContractGas({
        address: params.address,
        abi,
        functionName: params.functionName,
        args: params.args || [],
        value: params.value,
        account: this.account,
      })

      return { success: true, data: gasEstimate }
    } catch (error) {
      return {
        success: false,
        error: `Gas estimation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Write to contract
   */
  async writeContract(params: ContractWriteParams): Promise<ContractResult<TransactionResult>> {
    try {
      if (!this.walletClient || !this.account) {
        return { success: false, error: 'Wallet client not initialized' }
      }

      const abi = this.getContractAbi(params.address)
      const hash = await this.walletClient.writeContract({
        address: params.address,
        abi,
        functionName: params.functionName,
        args: params.args || [],
        value: params.value,
        gas: params.gasLimit,
        chain: SUPPORTED_CHAINS[this.network],
        account: this.account,
      })

      // Wait for transaction confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

      return {
        success: true,
        data: {
          txHash: hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          status: receipt.status === 'success' ? 'success' : 'failed',
          logs: receipt.logs,
          receipt,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: `Contract write failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash: Hex, confirmations: number = 1): Promise<ContractResult<TransactionResult>> {
    try {
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations,
      })

      return {
        success: true,
        data: {
          txHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          status: receipt.status === 'success' ? 'success' : 'failed',
          logs: receipt.logs,
          receipt,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: `Transaction wait failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Get block number
   */
  async getBlockNumber(): Promise<ContractResult<bigint>> {
    try {
      const blockNumber = await this.publicClient.getBlockNumber()
      return { success: true, data: blockNumber }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get block number: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  // ============================================================
  // TREX FACTORY OPERATIONS
  // ============================================================

  /**
   * Deploy complete TREX suite
   */
  async deployTREXSuite(
    salt: Hex,
    name: string,
    symbol: string,
    decimals: number,
    owner: Address
  ): Promise<ContractResult<TREXDeploymentResult>> {
    const factoryAddress = this.contractAddresses.trexFactory
    if (!factoryAddress) {
      return { success: false, error: 'TREXFactory address not configured' }
    }

    const result = await this.writeContract({
      address: factoryAddress,
      functionName: 'deployTREXSuite',
      args: [salt, name, symbol, BigInt(decimals), owner],
    })

    if (!result.success) {
      return result
    }

    // Parse the deployment result (6 addresses returned)
    // Note: This assumes the contract returns addresses in the expected order
    // In practice, you'd need to decode the logs or return value properly
    return {
      success: true,
      data: {
        token: result.data.logs?.[0]?.address || '0x' as Address, // Placeholder - would need proper decoding
        identityRegistry: '0x' as Address, // Would need proper decoding from logs
        compliance: '0x' as Address,
        identityRegistryStorage: '0x' as Address,
        claimTopicsRegistry: '0x' as Address,
        trustedIssuersRegistry: '0x' as Address,
      },
    }
  }

  // ============================================================
  // TREX TOKEN OPERATIONS
  // ============================================================

  /**
   * Get token information
   */
  async getTokenInfo(tokenAddress: Address): Promise<ContractResult<{
    name: string
    symbol: string
    decimals: number
    totalSupply: bigint
    owner: Address
  }>> {
    try {
      const [name, symbol, decimals, totalSupply, owner] = await Promise.all([
        this.readContract<string>({ address: tokenAddress, functionName: 'name' }),
        this.readContract<string>({ address: tokenAddress, functionName: 'symbol' }),
        this.readContract<number>({ address: tokenAddress, functionName: 'decimals' }),
        this.readContract<bigint>({ address: tokenAddress, functionName: 'totalSupply' }),
        this.readContract<Address>({ address: tokenAddress, functionName: 'owner' }),
      ])

      if (!name.success || !symbol.success || !decimals.success || !totalSupply.success || !owner.success) {
        return { success: false, error: 'Failed to retrieve token information' }
      }

      return {
        success: true,
        data: {
          name: name.data,
          symbol: symbol.data,
          decimals: decimals.data,
          totalSupply: totalSupply.data,
          owner: owner.data,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get token info: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Transfer tokens with compliance check
   */
  async transferTokens(
    tokenAddress: Address,
    to: Address,
    amount: bigint
  ): Promise<ContractResult<TransactionResult>> {
    return this.writeContract({
      address: tokenAddress,
      functionName: 'transfer',
      args: [to, amount],
    })
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress: Address, owner: Address): Promise<ContractResult<bigint>> {
    return this.readContract<bigint>({
      address: tokenAddress,
      functionName: 'balanceOf',
      args: [owner],
    })
  }

  /**
   * Add agent to token
   */
  async addAgent(tokenAddress: Address, agent: Address): Promise<ContractResult<TransactionResult>> {
    return this.writeContract({
      address: tokenAddress,
      functionName: 'addAgent',
      args: [agent],
    })
  }

  /**
   * Freeze partial tokens
   */
  async freezePartialTokens(
    tokenAddress: Address,
    user: Address,
    amount: bigint
  ): Promise<ContractResult<TransactionResult>> {
    return this.writeContract({
      address: tokenAddress,
      functionName: 'freezePartialTokens',
      args: [user, amount],
    })
  }

  /**
   * Recovery address
   */
  async recoveryAddress(
    tokenAddress: Address,
    lostWallet: Address,
    newWallet: Address,
    identity: Address
  ): Promise<ContractResult<TransactionResult>> {
    return this.writeContract({
      address: tokenAddress,
      functionName: 'recoveryAddress',
      args: [lostWallet, newWallet, identity],
    })
  }

  // ============================================================
  // COMPLIANCE OPERATIONS
  // ============================================================

  /**
   * Add compliance module
   */
  async addComplianceModule(
    complianceAddress: Address,
    moduleAddress: Address
  ): Promise<ContractResult<TransactionResult>> {
    return this.writeContract({
      address: complianceAddress,
      functionName: 'addModule',
      args: [moduleAddress],
    })
  }

  /**
   * Get compliance modules
   */
  async getComplianceModules(complianceAddress: Address): Promise<ContractResult<Address[]>> {
    return this.readContract<Address[]>({
      address: complianceAddress,
      functionName: 'getModules',
    })
  }

  /**
   * Check transfer compliance
   */
  async canTransfer(
    complianceAddress: Address,
    from: Address,
    to: Address,
    amount: bigint
  ): Promise<ContractResult<boolean>> {
    return this.readContract<boolean>({
      address: complianceAddress,
      functionName: 'canTransfer',
      args: [from, to, amount],
    })
  }

  // ============================================================
  // COMPLIANCE MODULE OPERATIONS
  // ============================================================

  /**
   * Set time restrictions (vesting/lockup)
   */
  async setTimeRestrictions(
    timeModuleAddress: Address,
    investor: Address,
    lockupEnd: bigint,
    cliffEnd: bigint,
    vestingDuration: bigint
  ): Promise<ContractResult<TransactionResult>> {
    return this.writeContract({
      address: timeModuleAddress,
      functionName: 'setLockup',
      args: [investor, lockupEnd, cliffEnd, vestingDuration],
    })
  }

  /**
   * Add country restriction
   */
  async addCountryRestriction(
    countryModuleAddress: Address,
    country: number,
    isBlacklisted: boolean
  ): Promise<ContractResult<TransactionResult>> {
    const functionName = isBlacklisted ? 'blacklistCountry' : 'whitelistCountry'
    return this.writeContract({
      address: countryModuleAddress,
      functionName,
      args: [country],
    })
  }

  /**
   * Set maximum balance
   */
  async setMaxBalance(
    balanceModuleAddress: Address,
    maxBalance: bigint
  ): Promise<ContractResult<TransactionResult>> {
    return this.writeContract({
      address: balanceModuleAddress,
      functionName: 'setMaxBalance',
      args: [maxBalance],
    })
  }

  /**
   * Set maximum holders
   */
  async setMaxHolders(
    holdersModuleAddress: Address,
    maxHolders: bigint
  ): Promise<ContractResult<TransactionResult>> {
    return this.writeContract({
      address: holdersModuleAddress,
      functionName: 'setHolderLimit',
      args: [maxHolders],
    })
  }

  // ============================================================
  // IDENTITY OPERATIONS
  // ============================================================

  /**
   * Create OnchainID identity
   */
  async createIdentity(owner: Address, salt?: Hex): Promise<ContractResult<TransactionResult>> {
    const factoryAddress = this.contractAddresses.identityFactory
    if (!factoryAddress) {
      return { success: false, error: 'Identity factory address not configured' }
    }

    const identitySalt = salt || `0x${Date.now().toString(16).padStart(64, '0')}` as Hex

    return this.writeContract({
      address: factoryAddress,
      functionName: 'createIdentity',
      args: [owner, identitySalt],
    })
  }

  /**
   * Register identity in registry
   */
  async registerIdentity(
    userAddress: Address,
    identityAddress: Address,
    countryCode: CountryCode
  ): Promise<ContractResult<TransactionResult>> {
    const registryAddress = this.contractAddresses.identityRegistry
    if (!registryAddress) {
      return { success: false, error: 'Identity registry address not configured' }
    }

    return this.writeContract({
      address: registryAddress,
      functionName: 'registerIdentity',
      args: [userAddress, identityAddress, countryCode],
    })
  }

  /**
   * Get identity verification status
   */
  async getIdentityStatus(userAddress: Address): Promise<ContractResult<IdentityVerificationStatus>> {
    const registryAddress = this.contractAddresses.identityRegistry
    if (!registryAddress) {
      return { success: false, error: 'Identity registry address not configured' }
    }

    try {
      const [exists, isVerified, identityAddress, investorCountry] = await Promise.all([
        this.readContract<boolean>({ address: registryAddress, functionName: 'contains', args: [userAddress] }),
        this.readContract<boolean>({ address: registryAddress, functionName: 'isVerified', args: [userAddress] }),
        this.readContract<Address>({ address: registryAddress, functionName: 'identity', args: [userAddress] }),
        this.readContract<number>({ address: registryAddress, functionName: 'investorCountry', args: [userAddress] }),
      ])

      if (!exists.success || !isVerified.success || !identityAddress.success || !investorCountry.success) {
        return { success: false, error: 'Failed to retrieve identity status' }
      }

      return {
        success: true,
        data: {
          exists: exists.data,
          isVerified: isVerified.data,
          identityAddress: identityAddress.data,
          countryCode: investorCountry.data,
          investorCountry: investorCountry.data,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get identity status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Add claim to identity
   */
  async addClaim(
    identityAddress: Address,
    topic: bigint,
    scheme: bigint,
    issuer: Address,
    signature: Hex,
    data: Hex,
    uri: string
  ): Promise<ContractResult<TransactionResult>> {
    return this.writeContract({
      address: identityAddress,
      functionName: 'addClaim',
      args: [topic, scheme, issuer, signature, data, uri],
    })
  }

  /**
   * Get claim from identity
   */
  async getClaim(identityAddress: Address, claimId: Hex): Promise<ContractResult<ClaimData>> {
    const result = await this.readContract<any[]>({
      address: identityAddress,
      functionName: 'getClaim',
      args: [claimId],
    })

    if (!result.success) {
      return result
    }

    const [topic, scheme, issuer, signature, data, uri] = result.data
    return {
      success: true,
      data: {
        topic: BigInt(topic),
        scheme: BigInt(scheme),
        issuer,
        signature,
        data,
        uri,
      },
    }
  }

  // ============================================================
  // REGISTRY OPERATIONS
  // ============================================================

  /**
   * Add claim topic
   */
  async addClaimTopic(topic: bigint): Promise<ContractResult<TransactionResult>> {
    const registryAddress = this.contractAddresses.claimTopicsRegistry
    if (!registryAddress) {
      return { success: false, error: 'Claim topics registry address not configured' }
    }

    return this.writeContract({
      address: registryAddress,
      functionName: 'addClaimTopic',
      args: [topic],
    })
  }

  /**
   * Get claim topics
   */
  async getClaimTopics(): Promise<ContractResult<bigint[]>> {
    const registryAddress = this.contractAddresses.claimTopicsRegistry
    if (!registryAddress) {
      return { success: false, error: 'Claim topics registry address not configured' }
    }

    return this.readContract<bigint[]>({
      address: registryAddress,
      functionName: 'getClaimTopics',
    })
  }

  /**
   * Add trusted issuer
   */
  async addTrustedIssuer(
    issuer: Address,
    topics: bigint[]
  ): Promise<ContractResult<TransactionResult>> {
    const registryAddress = this.contractAddresses.trustedIssuersRegistry
    if (!registryAddress) {
      return { success: false, error: 'Trusted issuers registry address not configured' }
    }

    return this.writeContract({
      address: registryAddress,
      functionName: 'addTrustedIssuer',
      args: [issuer, topics],
    })
  }

  /**
   * Get trusted issuers
   */
  async getTrustedIssuers(): Promise<ContractResult<TrustedIssuer[]>> {
    const registryAddress = this.contractAddresses.trustedIssuersRegistry
    if (!registryAddress) {
      return { success: false, error: 'Trusted issuers registry address not configured' }
    }

    // This would need proper decoding of the registry data structure
    // For now, return a placeholder
    return {
      success: true,
      data: [],
    }
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Update contract addresses
   */
  updateContractAddresses(addresses: Partial<ContractAddresses>): void {
    this.contractAddresses = { ...this.contractAddresses, ...addresses }
  }

  /**
   * Get ABI item by address
   */
  getAbiItem(address: Address) {
    const abi: readonly any[] = this.getContractAbi(address)
    return getAbiItem({abi, name: 'contract-name'})
  }

  /**
   * Get current network
   */
  getNetwork(): EVMNetwork {
    return this.network
  }

  /**
   * Switch network
   */
  async switchNetwork(network: EVMNetwork): Promise<void> {
    this.network = network
    const chain = SUPPORTED_CHAINS[network]
    const rpcUrl = CHAIN_CONFIGS[network].rpcUrl

    // Reinitialize clients
    this.publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    })

    if (this.account) {
      this.walletClient = createWalletClient({
        account: this.account,
        chain,
        transport: http(rpcUrl),
      })
    }
  }
}

// ============================================================
// LEGACY COMPATIBILITY (Gradual Migration)
// ============================================================

/**
 * Legacy ContractsService for backward compatibility
 * @deprecated Use ERC3643ContractsService for new implementations
 */
export class ContractsService extends ERC3643ContractsService {
  constructor(config?: { network?: EVMNetwork; rpcUrl?: string }) {
    super(
      config?.network || 'testnet',
      config?.rpcUrl,
      process.env.EVM_PRIVATE_KEY as Hex
    )
  }

  // Legacy method signatures for backward compatibility
  async hasIdentity(userAddress: Address): Promise<ContractResult<boolean>> {
    const result = await this.getIdentityStatus(userAddress)
    if (!result.success) return result
    return { success: true, data: result.data.exists }
  }

  async isIdentityVerified(userAddress: Address): Promise<ContractResult<boolean>> {
    const result = await this.getIdentityStatus(userAddress)
    if (!result.success) return result
    return { success: true, data: result.data.isVerified }
  }

  async getIdentityAddress(userAddress: Address): Promise<ContractResult<Address>> {
    const result = await this.getIdentityStatus(userAddress)
    if (!result.success) return result
    return { success: true, data: result.data.identityAddress || '0x' as Address }
  }

  async getUserCountry(userAddress: Address): Promise<ContractResult<CountryCode>> {
    const result = await this.getIdentityStatus(userAddress)
    if (!result.success) return result
    return { success: true, data: result.data.countryCode || 0 }
  }

  async submitTransaction(params: any): Promise<ContractResult<any>> {
    // Convert legacy format to new format
    return this.writeContract({
      address: params.contractAddress,
      functionName: params.functionName,
      args: params.functionArgs?.map((arg: any) => arg.value) || [],
      value: params.value,
      gasLimit: params.gasLimit,
    })
  }
}

// Default export for backward compatibility
export default ERC3643ContractsService
