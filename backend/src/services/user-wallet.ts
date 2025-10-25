/**
 * User Wallet Service
 * Provides wallet balance and transaction information across multiple EVM networks
 * Supports ERC-3643 compliant token balances and transaction history
 */

import {
  createPublicClient,
  http,
  type Address,
  type Hex,
  type PublicClient,
  type Chain,
  formatEther,
  formatUnits
} from 'viem'
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
import type { Pool } from "pg";
import type { DbResult } from "./database";
import type { EVMNetwork as BaseEVMNetwork } from "./contracts";

// Local EVMNetwork type that includes 'sepolia' for wallet operations
export type EVMNetwork = BaseEVMNetwork | 'sepolia';

// Supported networks for wallet operations
export const WALLET_SUPPORTED_NETWORKS: EVMNetwork[] = [
  'optimism-testnet', // Optimism Sepolia
  'testnet',          // Base Sepolia
  'sepolia'          // Sepolia
];

// Network configurations with RPC URLs from environment
export const WALLET_CHAIN_CONFIGS: Record<EVMNetwork, { chain: Chain; rpcUrl: string }> = {
  'optimism-testnet': {
    chain: optimismSepolia,
    rpcUrl: process.env.OPTIMISM_SEPOLIA_RPC_URL || 'https://sepolia.optimism.io'
  },
  'testnet': {
    chain: baseSepolia,
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
  },
  'sepolia': {
    chain: sepolia,
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io'
  },
  // Add other networks for completeness but not used for wallet operations
  mainnet: { chain: mainnet, rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io' },
  'polygon': { chain: polygon, rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com' },
  'polygon-testnet': { chain: polygonMumbai, rpcUrl: process.env.POLYGON_MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com' },
  'optimism': { chain: optimism, rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io' },
  'arbitrum': { chain: arbitrum, rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc' },
  'arbitrum-testnet': { chain: arbitrumSepolia, rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc' },
  devnet: { chain: baseSepolia, rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org' }
};

// ERC20 ABI for balance queries
const erc20Abi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  }
] as const

// ============================================================
// TYPES & INTERFACES
// ============================================================

/**
 * Token balance information
 */
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

/**
 * Transaction information
 */
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
  type: 'legacy' | 'eip1559' | 'eip2930';
}

/**
 * Wallet summary information
 */
export interface WalletSummary {
  address: Address;
  totalBalanceUSD: number; // Would need price oracle integration
  networks: EVMNetwork[];
  lastActivity: Date | null;
  totalTransactions: number;
}

/**
 * Complete wallet information
 */
export interface WalletInfo {
  address: Address;
  summary: WalletSummary;
  balances: TokenBalance[];
  recentTransactions: TransactionInfo[];
  supportedNetworks: EVMNetwork[];
}

/**
 * Network-specific client
 */
interface NetworkClient {
  network: EVMNetwork;
  client: PublicClient;
}

// ============================================================
// SERIALIZATION UTILITIES
// ============================================================

/**
 * Serialize TokenBalance for JSON response (convert BigInt to string)
 */
function serializeTokenBalance(balance: TokenBalance): any {
  return {
    ...balance,
    balance: balance.balance.toString(),
  };
}

/**
 * Serialize TransactionInfo for JSON response (convert BigInt to string)
 */
function serializeTransactionInfo(tx: TransactionInfo): any {
  return {
    ...tx,
    blockNumber: tx.blockNumber?.toString() || '0',
    value: tx.value?.toString() || '0',
    gasPrice: tx.gasPrice?.toString() || '0',
    gasLimit: tx.gasLimit?.toString() || '0',
    ...(tx.gasUsed && { gasUsed: tx.gasUsed.toString() }),
    ...(tx.maxFeePerGas && { maxFeePerGas: tx.maxFeePerGas.toString() }),
    ...(tx.maxPriorityFeePerGas && { maxPriorityFeePerGas: tx.maxPriorityFeePerGas.toString() }),
  };
}

/**
 * Serialize WalletInfo for JSON response (convert all BigInt values to strings)
 */
function serializeWalletInfo(walletInfo: WalletInfo): any {
  return {
    ...walletInfo,
    balances: walletInfo.balances.map(serializeTokenBalance),
    recentTransactions: walletInfo.recentTransactions.map(serializeTransactionInfo),
  };
}

/**
 * User Wallet Service
 * Provides comprehensive wallet balance and transaction information across EVM networks
 */
export class UserWalletService {
  private pool: Pool;
  private networkClients: Map<EVMNetwork, PublicClient>;

  constructor(pool: Pool) {
    this.pool = pool;
    this.networkClients = new Map();

    // Initialize clients for supported networks
    this.initializeNetworkClients();
  }

  /**
   * Initialize public clients for all supported networks
   */
  private initializeNetworkClients(): void {
    for (const network of WALLET_SUPPORTED_NETWORKS) {
      const config = WALLET_CHAIN_CONFIGS[network];
      if (config) {
        const client = createPublicClient({
          chain: config.chain,
          transport: http(config.rpcUrl),
        });
        this.networkClients.set(network, client);
      }
    }
  }

  /**
   * Get public client for specific network
   */
  private getNetworkClient(network: EVMNetwork): PublicClient | null {
    return this.networkClients.get(network) || null;
  }

  /**
   * Get native token balance for address on specific network
   */
  private async getNativeBalance(address: Address, network: EVMNetwork): Promise<bigint> {
    const client = this.getNetworkClient(network);
    if (!client) {
      throw new Error(`Network client not available for ${network}`);
    }

    try {
      return await client.getBalance({ address });
    } catch (error) {
      console.error(`Failed to get native balance for ${address} on ${network}:`, error);
      return 0n;
    }
  }

  /**
   * Get ERC20 token balance for address
   */
  private async getERC20Balance(
    tokenAddress: Address,
    ownerAddress: Address,
    network: EVMNetwork
  ): Promise<bigint> {
    const client = this.getNetworkClient(network);
    if (!client) {
      throw new Error(`Network client not available for ${network}`);
    }

    try {
      const balance = await client.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [ownerAddress],
      });

      return balance as bigint;
    } catch (error) {
      console.error(`Failed to get ERC20 balance for ${tokenAddress} on ${network}:`, error);
      return 0n;
    }
  }

  /**
   * Get ERC20 token metadata
   */
  private async getERC20Metadata(tokenAddress: Address, network: EVMNetwork): Promise<{
    symbol: string;
    name: string;
    decimals: number;
  }> {
    const client = this.getNetworkClient(network);
    if (!client) {
      throw new Error(`Network client not available for ${network}`);
    }

    try {
      const [symbol, name, decimals] = await Promise.all([
        client.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'symbol',
        }),
        client.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'name',
        }),
        client.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'decimals',
        }),
      ]);

      return {
        symbol: symbol as string,
        name: name as string,
        decimals: decimals as number,
      };
    } catch (error) {
      console.error(`Failed to get ERC20 metadata for ${tokenAddress} on ${network}:`, error);
      return {
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        decimals: 18,
      };
    }
  }

  /**
   * Get recent transactions for address on network
   * Scans recent blocks for transactions involving the address (testnet/demo implementation)
   */
  private async getNetworkTransactions(
    address: Address,
    network: EVMNetwork,
    limit: number = 10
  ): Promise<TransactionInfo[]> {
    const client = this.getNetworkClient(network);
    if (!client) {
      throw new Error(`Network client not available for ${network}`);
    }

    try {
      const transactions: TransactionInfo[] = [];

      // Get the latest block number
      const latestBlock = await client.getBlockNumber();

      // For testnets, scan the last 100 blocks (configurable)
      // This is a simplified approach for demo purposes
      const blocksToScan = 100;
      const startBlock = latestBlock - BigInt(blocksToScan);

      // Scan recent blocks for transactions involving the address
      for (let blockNumber = latestBlock; blockNumber >= startBlock && transactions.length < limit; blockNumber--) {
        try {
          // Get block with transactions
          const block = await client.getBlock({
            blockNumber,
            includeTransactions: true
          });

          // Filter transactions involving our address
          const relevantTxs = block.transactions.filter((tx: any) =>
            tx.from?.toLowerCase() === address.toLowerCase() ||
            tx.to?.toLowerCase() === address.toLowerCase()
          );

          // Convert to our TransactionInfo format
          for (const tx of relevantTxs) {
            if (transactions.length >= limit) break;

            try {
              // Get transaction receipt for gas used and status
              const receipt = await client.getTransactionReceipt({ hash: tx.hash });

              const transactionInfo: TransactionInfo = {
                hash: tx.hash,
                blockNumber: tx.blockNumber || blockNumber,
                blockHash: tx.blockHash || block.hash,
                transactionIndex: tx.transactionIndex || 0,
                from: tx.from as Address,
                to: tx.to as Address || null,
                value: tx.value || 0n,
                gasPrice: tx.gasPrice || 0n,
                gasLimit: tx.gasLimit || 21000n, // Default to standard ETH transfer gas limit
                gasUsed: receipt.gasUsed,
                status: receipt.status === 'success' ? 'success' : 'failed',
                timestamp: new Date(Number(block.timestamp) * 1000),
                network,
                nonce: tx.nonce || 0,
                input: tx.input || '0x',
                type: tx.type || 'legacy',
                ...(tx.maxFeePerGas && { maxFeePerGas: tx.maxFeePerGas }),
                ...(tx.maxPriorityFeePerGas && { maxPriorityFeePerGas: tx.maxPriorityFeePerGas }),
              };

              transactions.push(transactionInfo);
            } catch (txError) {
              console.error(`Failed to process transaction ${tx.hash}:`, txError);
              // Continue with other transactions
            }
          }
        } catch (blockError) {
          console.error(`Failed to get block ${blockNumber}:`, blockError);
          // Continue with other blocks
        }
      }

      return transactions;
    } catch (error) {
      console.error(`Failed to get recent transactions for ${address} on ${network}:`, error);
      return [];
    }
  }

  /**
   * Get token balances for all supported networks
   */
  async getWalletBalances(address: Address): Promise<DbResult<TokenBalance[]>> {
    try {
      const balances: TokenBalance[] = [];

      // Get native token balances for each supported network
      for (const network of WALLET_SUPPORTED_NETWORKS) {
        try {
          const nativeBalance = await this.getNativeBalance(address, network);
          const config = WALLET_CHAIN_CONFIGS[network];

          if (nativeBalance > 0n) {
            balances.push({
              address: '0x0000000000000000000000000000000000000000' as Address, // Native token
              symbol: config.chain.nativeCurrency.symbol,
              name: config.chain.nativeCurrency.name,
              decimals: config.chain.nativeCurrency.decimals,
              balance: nativeBalance,
              formattedBalance: formatEther(nativeBalance),
              network,
              isNative: true,
            });
          }
        } catch (error) {
          console.error(`Failed to get native balance for ${network}:`, error);
        }
      }

      // TODO: Add ERC20 token balance scanning
      // This would require indexing token transfers or using a token list
      // For now, we'll focus on native balances

      return { success: true, data: balances };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to get wallet balances: ${errorMessage}`,
      };
    }
  }

  /**
   * Get recent transactions across all supported networks
   */
  async getRecentTransactions(address: Address, limit: number = 20): Promise<DbResult<TransactionInfo[]>> {
    try {
      const allTransactions: TransactionInfo[] = [];

      // Get transactions from each supported network
      for (const network of WALLET_SUPPORTED_NETWORKS) {
        try {
          const networkTransactions = await this.getNetworkTransactions(address, network, limit / WALLET_SUPPORTED_NETWORKS.length);
          allTransactions.push(...networkTransactions);
        } catch (error) {
          console.error(`Failed to get transactions for ${network}:`, error);
        }
      }

      // Sort by timestamp (most recent first) and limit
      allTransactions.sort((a, b) => {
        const aTime = a.timestamp?.getTime() || 0;
        const bTime = b.timestamp?.getTime() || 0;
        return bTime - aTime;
      });

      return { success: true, data: allTransactions.slice(0, limit) };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to get recent transactions: ${errorMessage}`,
      };
    }
  }

  /**
   * Get complete wallet information
   */
  async getWalletInfo(address: Address): Promise<DbResult<WalletInfo>> {
    try {
      // Get balances and transactions in parallel
      const [balancesResult, transactionsResult] = await Promise.all([
        this.getWalletBalances(address),
        this.getRecentTransactions(address, 10)
      ]);

      if (!balancesResult.success) {
        return balancesResult as any;
      }

      if (!transactionsResult.success) {
        return transactionsResult as any;
      }

      // Calculate summary
      const summary: WalletSummary = {
        address,
        totalBalanceUSD: 0, // Would need price oracle integration
        networks: WALLET_SUPPORTED_NETWORKS,
        lastActivity: transactionsResult.data && transactionsResult.data.length > 0 ?
          transactionsResult.data[0].timestamp || null : null,
        totalTransactions: transactionsResult.data ? transactionsResult.data.length : 0,
      };

      const walletInfo: WalletInfo = {
        address,
        summary,
        balances: balancesResult.data,
        recentTransactions: transactionsResult.data,
        supportedNetworks: WALLET_SUPPORTED_NETWORKS,
      };

      return { success: true, data: walletInfo };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to get wallet info: ${errorMessage}`,
      };
    }
  }

  /**
   * Check if address has any activity on supported networks
   */
  async hasWalletActivity(address: Address): Promise<DbResult<boolean>> {
    try {
      const balancesResult = await this.getWalletBalances(address);

      if (!balancesResult.success) {
        return balancesResult as any;
      }

      // Check if any network has a non-zero balance
      const hasActivity = balancesResult.data.some(balance => balance.balance > 0n);

      return { success: true, data: hasActivity };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to check wallet activity: ${errorMessage}`,
      };
    }
  }

  /**
   * Get wallet balances with BigInt values serialized to strings
   */
  async getWalletBalancesSerialized(address: Address): Promise<DbResult<any[]>> {
    const result = await this.getWalletBalances(address);
    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: result.data.map(serializeTokenBalance),
    };
  }

  /**
   * Get recent transactions with BigInt values serialized to strings
   */
  async getRecentTransactionsSerialized(address: Address, limit: number = 20): Promise<DbResult<any[]>> {
    const result = await this.getRecentTransactions(address, limit);
    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: result.data.map(serializeTransactionInfo),
    };
  }

  /**
   * Get complete wallet information with BigInt values serialized to strings
   */
  async getWalletInfoSerialized(address: Address): Promise<DbResult<any>> {
    const result = await this.getWalletInfo(address);
    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: serializeWalletInfo(result.data),
    };
  }

  /**
   * Get supported networks for wallet operations
   */
  getSupportedNetworks(): EVMNetwork[] {
    return [...WALLET_SUPPORTED_NETWORKS];
  }
}
