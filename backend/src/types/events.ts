/**
 * EVM Event Types for FarSquare
 * Viem and Wagmi compatible event definitions for EVM blockchain event processing
 * Following ERC3643 security token patterns and Viem/Wagmi integration guidelines
 */

import type { Address, Hash, Hex, Log, TransactionReceipt } from 'viem'
import type { Chain } from 'viem/chains'

/**
 * Supported EVM chains configuration
 * Following Viem/Wagmi multi-chain patterns
 */
export type SupportedChainId = 1 | 8453 | 295 // mainnet, base, hedera

/**
 * Canonical event structure for EVM blockchain events
 * Viem-compatible format used throughout the indexer pipeline
 */
export interface CanonicalEvent {
  /** Block number where event occurred */
  blockNumber: number
  /** Transaction hash */
  transactionHash: Hash
  /** Event log index within transaction */
  logIndex: number
  /** Contract address that emitted the event */
  address: Address
  /** Event signature/name */
  eventName: string
  /** Event arguments */
  args: Record<string, any>
  /** Chain ID where event occurred */
  chainId: SupportedChainId
  /** Block timestamp */
  timestamp: number
}

/**
 * Viem-compatible transaction structure
 * Following Viem transaction patterns for wallet and public client operations
 */
export interface EVMTransaction {
  /** Transaction hash */
  hash: Hash
  /** Block number */
  blockNumber: number
  /** Transaction status */
  status: 'pending' | 'confirmed' | 'failed'
  /** Sender address */
  from: Address
  /** Recipient address (null for contract creation) */
  to: Address | null
  /** Transaction value in wei */
  value: bigint
  /** Gas price (legacy) or max fee per gas (EIP-1559) */
  gasPrice?: bigint
  /** Max fee per gas (EIP-1559) */
  maxFeePerGas?: bigint
  /** Max priority fee per gas (EIP-1559) */
  maxPriorityFeePerGas?: bigint
  /** Gas limit */
  gas: bigint
  /** Gas used (after confirmation) */
  gasUsed?: bigint
  /** Transaction data/payload */
  input: Hex
  /** Nonce */
  nonce: number
  /** Chain ID */
  chainId: SupportedChainId
  /** Logs emitted by transaction */
  logs?: Log[]
  /** Transaction receipt (after confirmation) */
  receipt?: TransactionReceipt
}

/**
 * ERC3643 Security Token Events
 * Following ERC3643 standard event patterns for permissioned tokens
 */
export interface ERC3643Event extends CanonicalEvent {
  /** Token contract address */
  tokenAddress: Address
  /** Event specific to ERC3643 compliance */
  eventType: ERC3643EventType
}

export type ERC3643EventType =
  | 'Transfer'
  | 'Approval'
  | 'IdentityRegistryAdded'
  | 'ComplianceAdded'
  | 'AddressFrozen'
  | 'AddressUnfrozen'
  | 'TokensFrozen'
  | 'TokensUnfrozen'
  | 'RecoverySuccess'
  | 'UpdatedTokenInformation'
  | 'AgentAdded'
  | 'AgentRemoved'

/**
 * ERC3643 Transfer Event
 * Compliance-checked token transfers
 */
export interface ERC3643TransferEvent extends ERC3643Event {
  eventType: 'Transfer'
  args: {
    from: Address
    to: Address
    value: bigint
  }
  /** Compliance check result */
  compliancePassed: boolean
  /** Identity verification status */
  fromVerified: boolean
  toVerified: boolean
}

/**
 * ERC3643 Freeze Events
 * Address and token freezing for compliance
 */
export interface ERC3643FreezeEvent extends ERC3643Event {
  eventType: 'AddressFrozen' | 'AddressUnfrozen' | 'TokensFrozen' | 'TokensUnfrozen'
  args: {
    userAddress: Address
    amount?: bigint
    isFrozen: boolean
  }
  /** Agent who performed the freeze action */
  agent: Address
}

/**
 * ERC3643 Recovery Event
 * Lost wallet recovery mechanism
 */
export interface ERC3643RecoveryEvent extends ERC3643Event {
  eventType: 'RecoverySuccess'
  args: {
    lostWallet: Address
    newWallet: Address
    investorOnchainID: Address
  }
}

/**
 * Viem-compatible event log structure
 * Following Viem Log type patterns
 */
export interface ViemEventLog extends Log {
  /** Chain ID for multi-chain support */
  chainId: SupportedChainId
  /** Parsed event name */
  eventName?: string
  /** Parsed event arguments */
  args?: Record<string, any>
}

/**
 * Transaction monitoring events
 * For tracking transaction lifecycle in Viem/Wagmi patterns
 */
export interface TransactionEvent {
  /** Unique transaction ID */
  id: string
  /** Transaction hash */
  hash: Hash
  /** Chain ID */
  chainId: SupportedChainId
  /** Transaction status */
  status: 'pending' | 'confirmed' | 'failed' | 'replaced'
  /** Confirmation count */
  confirmations: number
  /** Timestamp of last update */
  timestamp: number
  /** Error message if failed */
  error?: string
  /** Replacement transaction hash if replaced */
  replacedBy?: Hash
}

/**
 * Contract interaction events
 * Following Viem contract read/write patterns
 */
export interface ContractEvent {
  /** Contract address */
  address: Address
  /** Chain ID */
  chainId: SupportedChainId
  /** Function name called */
  functionName: string
  /** Call arguments */
  args: any[]
  /** Transaction hash */
  transactionHash?: Hash
  /** Block number */
  blockNumber?: number
  /** Success status */
  success: boolean
  /** Return value for read operations */
  returnValue?: any
  /** Gas used */
  gasUsed?: bigint
  /** Error message if failed */
  error?: string
}

/**
 * Wallet connection events
 * Following Wagmi wallet connection patterns
 */
export interface WalletEvent {
  /** Wallet address */
  address: Address
  /** Chain ID */
  chainId: SupportedChainId
  /** Connection status */
  connected: boolean
  /** Wallet connector type */
  connector?: string
  /** Timestamp */
  timestamp: number
  /** Error if connection failed */
  error?: string
}

/**
 * Chain switching events
 * Following Wagmi multi-chain patterns
 */
export interface ChainEvent {
  /** Target chain ID */
  chainId: SupportedChainId
  /** Switch status */
  switched: boolean
  /** Previous chain ID */
  previousChainId?: SupportedChainId
  /** Timestamp */
  timestamp: number
  /** Error if switch failed */
  error?: string
}

/**
 * Event monitoring configuration
 * Following Viem/Wagmi event watching patterns
 */
export interface EventMonitorConfig {
  /** Contract addresses to monitor */
  addresses: Address[]
  /** Event signatures to watch */
  eventSignatures: Hex[]
  /** Chain IDs to monitor */
  chainIds: SupportedChainId[]
  /** Starting block number */
  fromBlock?: number
  /** Polling interval in ms */
  pollInterval?: number
  /** Batch size for processing */
  batchSize?: number
}

/**
 * Event processing result
 * Following Viem error handling patterns
 */
export type EventProcessingResult<T = any> =
  | { success: true; data: T; events: CanonicalEvent[] }
  | { success: false; error: string; partialData?: T }

/**
 * Multi-chain event aggregator
 * For processing events across multiple EVM chains
 */
export interface MultiChainEventAggregator {
  /** Chain-specific event processors */
  processors: Map<SupportedChainId, EventProcessor>
  /** Global event queue */
  eventQueue: CanonicalEvent[]
  /** Processing status */
  status: 'idle' | 'processing' | 'error'
  /** Last processed block per chain */
  lastBlocks: Map<SupportedChainId, number>
}

/**
 * Event processor interface
 * Following Viem contract event processing patterns
 */
export interface EventProcessor {
  /** Chain ID this processor handles */
  chainId: SupportedChainId
  /** Process a batch of events */
  processEvents(events: ViemEventLog[]): Promise<EventProcessingResult>
  /** Get events from a specific block range */
  getEvents(fromBlock: number, toBlock: number): Promise<ViemEventLog[]>
  /** Validate event data */
  validateEvent(event: ViemEventLog): boolean
}

/**
 * ERC3643 Compliance Events
 * For tracking compliance module interactions
 */
export interface ComplianceEvent extends CanonicalEvent {
  /** Compliance module address */
  complianceAddress: Address
  /** Compliance check result */
  passed: boolean
  /** Reason for failure */
  failureReason?: string
  /** Involved addresses */
  addresses: Address[]
  /** Transfer amount if applicable */
  amount?: bigint
}

/**
 * Identity Registry Events
 * Following ERC3643 identity management patterns
 */
export interface IdentityEvent extends CanonicalEvent {
  /** Identity registry address */
  registryAddress: Address
  /** User address */
  userAddress: Address
  /** Identity contract address */
  identityAddress: Address
  /** Country code */
  countryCode?: number
  /** Verification status */
  verified: boolean
}

/**
 * Event subscription configuration
 * Following Wagmi event watching patterns
 */
export interface EventSubscription {
  /** Unique subscription ID */
  id: string
  /** Contract address */
  address: Address
  /** Event signature */
  eventSignature: Hex
  /** Chain ID */
  chainId: SupportedChainId
  /** Callback function */
  callback: (event: CanonicalEvent) => void
  /** Subscription active status */
  active: boolean
  /** Error handler */
  onError?: (error: Error) => void
}

/**
 * Event parsing configuration
 * For decoding event logs following Viem patterns
 */
export interface EventParserConfig {
  /** ABI for event decoding */
  abi: any[]
  /** Event signature to name mapping */
  eventNames: Record<Hex, string>
  /** Custom parsing functions */
  customParsers?: Record<string, (log: Log) => any>
  /** Chain-specific parsing rules */
  chainRules?: Record<SupportedChainId, Partial<EventParserConfig>>
}

/**
 * Result type for event parsing operations
 * Following Viem error handling patterns
 */
export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }
