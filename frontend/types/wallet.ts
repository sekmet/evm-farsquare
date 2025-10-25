import { type Address, type Hex, formatEther } from "viem";

// Wallet balance interface
export interface TokenBalance {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
  formattedBalance: string;
  network: EVMNetwork;
  isNative?: boolean;
}

// Transaction interface
export interface TransactionInfo {
  hash: Hex;
  blockNumber: bigint;
  blockHash: Hex;
  transactionIndex: number;
  from: Address;
  to: Address | null;
  value: bigint;
  gasPrice: bigint;
  gasLimit: bigint;
  gasUsed?: bigint;
  status?: 'success' | 'failed' | 'pending';
  timestamp?: Date;
  network: EVMNetwork;
  logs?: any[];
  input?: Hex;
  nonce: number;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  type: 'legacy' | 'eip1559' | 'eip2930' | 'eip4844' | 'eip7702';
}

// Wallet summary interface
export interface WalletSummary {
  address: Address;
  totalBalanceUSD: number;
  networks: EVMNetwork[];
  lastActivity: Date | null;
  totalTransactions: number;
}

// Complete wallet information
export interface WalletInfo {
  address: Address;
  summary: WalletSummary;
  balances: TokenBalance[];
  recentTransactions: TransactionInfo[];
  supportedNetworks: EVMNetwork[];
}

// Network type for wallet operations
export type EVMNetwork = 'optimism-testnet' | 'testnet' | 'sepolia';

// API response interfaces
export interface WalletBalancesResponse {
  success: boolean;
  data: TokenBalance[];
  error?: string;
}

export interface WalletTransactionsResponse {
  success: boolean;
  data: TransactionInfo[];
  error?: string;
}

export interface WalletInfoResponse {
  success: boolean;
  data: WalletInfo;
  error?: string;
}

export interface WalletActivityResponse {
  success: boolean;
  data: { hasActivity: boolean };
  error?: string;
}