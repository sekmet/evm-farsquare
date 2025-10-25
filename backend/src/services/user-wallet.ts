/**
 * User Wallet Service
 * Provides wallet balance and transaction information across multiple EVM networks
 * Supports ERC-3643 compliant token balances and transaction history
 */

import {
  createPublicClient,
  http,
  formatEther
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
import {
  HypersyncClient,
  LogField,
  TransactionField,
  BlockField,
  JoinMode
} from '@envio-dev/hypersync-client';
import type {
  FieldSelection,
  TransactionSelection
} from '@envio-dev/hypersync-client';

import type {
  Address,
  Hex,
  PublicClient,
  Chain
} from 'viem'
import type { Pool } from "pg";
import type { DbResult } from "./database";
import type { EVMNetwork as BaseEVMNetwork } from "./contracts";
import { env } from "../lib/env";

// Local EVMNetwork type that includes 'sepolia' for wallet operations
export type EVMNetwork = BaseEVMNetwork | 'sepolia';

// Supported networks for wallet operations
export const WALLET_SUPPORTED_NETWORKS: EVMNetwork[] = [
  'optimism-sepolia', // Optimism Sepolia
  'base-sepolia',          // Base Sepolia
  'sepolia'          // Sepolia
];

// ERC20 Token configurations per network
export const ERC20_TOKENS: Record<EVMNetwork, Array<{
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
}>> = {
  'sepolia': [
    {
      address: env.USDC_SEPOLIA_ADDRESS as Address,
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6
    },
    {
      address: env.PYUSD_SEPOLIA_ADDRESS as Address,
      symbol: 'PYUSD',
      name: 'PayPal USD',
      decimals: 6
    },
    {
      address: env.EURC_SEPOLIA_ADDRESS as Address,
      symbol: 'EURC',
      name: 'Euro Coin',
      decimals: 6
    }
  ],
  'base-sepolia': [
    {
      address: env.USDC_BASE_SEPOLIA_ADDRESS as Address,
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6
    },
    {
      address: env.EURC_BASE_SEPOLIA_ADDRESS as Address,
      symbol: 'EURC',
      name: 'Euro Coin',
      decimals: 6
    }
  ],
  'optimism-sepolia': [
    // Add optimism-sepolia specific tokens if needed
  ],
  // Include other networks with empty arrays for completeness
  mainnet: [],
  base: [],
  polygon: [],
  'polygon-amoy': [],
  optimism: [],
  arbitrum: [],
  'arbitrum-sepolia': [],
  devnet: []
};

// Network configurations with RPC URLs from environment
export const WALLET_CHAIN_CONFIGS: Record<EVMNetwork, { chain: Chain; rpcUrl: string }> = {
  'optimism-sepolia': {
    chain: optimismSepolia,
    rpcUrl: env.OPTIMISM_SEPOLIA_RPC_URL as string
  },
  'base-sepolia': {
    chain: baseSepolia,
    rpcUrl: env.BASE_SEPOLIA_RPC_URL as string
  },
  'sepolia': {
    chain: sepolia,
    rpcUrl: env.SEPOLIA_RPC_URL as string
  },
  // Add other networks for completeness but not used for wallet operations
  mainnet: { chain: mainnet, rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io' },
  base: { chain: base, rpcUrl: process.env.BASE_RPC_URL || 'https://base.org' },
  'polygon': { chain: polygon, rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com' },
  'polygon-amoy': { chain: polygonMumbai, rpcUrl: process.env.POLYGON_MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com' },
  'optimism': { chain: optimism, rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io' },
  'arbitrum': { chain: arbitrum, rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc' },
  'arbitrum-sepolia': { chain: arbitrumSepolia, rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc' },
  devnet: { chain: baseSepolia, rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org' }
};

// HyperSync URL mappings for supported networks
export const HYPERSYNC_NETWORK_URLS: Record<EVMNetwork, string> = {
  'optimism-sepolia': 'http://optimism-sepolia.hypersync.xyz',
  'base-sepolia': 'http://base-sepolia.hypersync.xyz',
  'sepolia': 'http://sepolia.hypersync.xyz',
  // Fallback URLs for other networks (not used for wallet operations)
  mainnet: 'http://eth.hypersync.xyz',
  'base': 'http://base.hypersync.xyz',
  'polygon': 'http://polygon.hypersync.xyz',
  'polygon-amoy': 'http://polygon-amoy.hypersync.xyz',
  'optimism': 'http://optimism.hypersync.xyz',
  'arbitrum': 'http://arbitrum.hypersync.xyz',
  'arbitrum-sepolia': 'http://arbitrum-sepolia.hypersync.xyz',
  devnet: 'http://127.0.0.1:8545'
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
  type: 'legacy' | 'eip1559' | 'eip2930' | 'eip4844' | 'eip7702';
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
    nonce: tx.nonce?.toString() || '0', // Also serialize nonce as string
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
  private hypersyncClients: Map<EVMNetwork, any>; // HyperSync client type

  constructor(pool: Pool) {
    this.pool = pool;
    this.networkClients = new Map();
    this.hypersyncClients = new Map();

    // Initialize clients for supported networks
    this.initializeNetworkClients();
    this.initializeHypersyncClients();
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
   * Initialize HyperSync clients for all supported networks
   */
  private initializeHypersyncClients(): void {
    for (const network of WALLET_SUPPORTED_NETWORKS) {
      const hypersyncUrl = HYPERSYNC_NETWORK_URLS[network];
      if (hypersyncUrl) {
        try {
          const client = HypersyncClient.new({
            url: hypersyncUrl,
            // bearerToken: process.env.HYPERSYNC_BEARER_TOKEN, // Add if using API tokens
          });
          this.hypersyncClients.set(network, client);
        } catch (error) {
          console.error(`Failed to initialize HyperSync client for ${network}:`, error);
        }
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
   * Get HyperSync client for specific network
   */
  private getHypersyncClient(network: EVMNetwork): any | null {
    return this.hypersyncClients.get(network) || null;
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
   * Format token balance according to token decimals
   */
  private formatTokenBalance(balance: bigint, decimals: number): string {
    const balanceString = balance.toString();
    const integerPart = balanceString.slice(0, -decimals) || '0';
    const fractionalPart = balanceString.slice(-decimals).padStart(decimals, '0');
    
    // Remove trailing zeros from fractional part
    const trimmedFractional = fractionalPart.replace(/0+$/, '');
    
    if (trimmedFractional) {
      return `${integerPart}.${trimmedFractional}`;
    }
    
    return integerPart;
  }
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
   * Get recent transactions for address on network using HyperSync
   */
  private async getNetworkTransactions(
    address: Address,
    network: EVMNetwork,
    limit: number = 10
  ): Promise<TransactionInfo[]> {
    const hypersyncClient = this.getHypersyncClient(network);
    if (!hypersyncClient) {
      console.warn(`HyperSync client not available for ${network}, falling back to manual scanning`);
      return this.getNetworkTransactionsFallback(address, network, limit);
    }

    try {
      // Create field selection for transaction data
      const fieldSelection = {
        block: [BlockField.Number, BlockField.Timestamp, BlockField.Hash],
        log: [LogField.Address, LogField.Topic0, LogField.Topic1, LogField.Topic2, LogField.Topic3, LogField.Data],
        transaction: [
          TransactionField.Hash,
          TransactionField.BlockNumber,
          TransactionField.TransactionIndex,
          TransactionField.From,
          TransactionField.To,
          TransactionField.Value,
          TransactionField.GasPrice,
          TransactionField.Gas,
          TransactionField.GasUsed,
          TransactionField.Status,
          TransactionField.Input,
          TransactionField.Nonce,
          TransactionField.Kind, // Transaction type (0=legacy, 1=EIP-2930, 2=EIP-1559, 3=EIP-4844, 4=EIP-7702)
          TransactionField.MaxFeePerGas,
          TransactionField.MaxPriorityFeePerGas,
        ],
      };

      // Create transaction selection for transactions involving the address
      const transactionSelection = [
        { from: [address] },
        { to: [address] }
      ];

      // Create query - get recent transactions (last 1000 blocks for testnets)
      const query = {
        transactions: transactionSelection,
        fieldSelection,
        fromBlock: 0, // Start from genesis for comprehensive search
        maxNumTransactions: limit,
        joinMode: JoinMode.JoinAll, // Join transactions with their logs
      };

      console.log(`Querying HyperSync for ${address} on ${network}`);

      // Execute query
      const result = await hypersyncClient.get(query);

      if (!result.data?.transactions) {
        console.log(`No transactions found for ${address} on ${network}`);
        return [];
      }

      // Convert HyperSync format to our TransactionInfo format
      const transactions: TransactionInfo[] = result.data.transactions.map((tx: any) => {
        // Group logs by transaction
        const transactionLogs = result.data.logs?.filter((log: any) => 
          log.transactionHash === tx.hash
        ) || [];

        return {
          hash: tx.hash as Hex,
          blockNumber: BigInt(tx.blockNumber || 0),
          blockHash: tx.blockHash || '0x',
          transactionIndex: tx.transactionIndex || 0,
          from: tx.from as Address,
          to: tx.to as Address || null,
          value: BigInt(tx.value || 0),
          gasPrice: BigInt(tx.gasPrice || 0),
          gasLimit: BigInt(tx.gas || 21000),
          gasUsed: tx.gasUsed ? BigInt(tx.gasUsed) : undefined,
          status: tx.status === 1 ? 'success' : tx.status === 0 ? 'failed' : 'pending',
          timestamp: tx.blockTimestamp ? new Date(Number(tx.blockTimestamp) * 1000) : undefined,
          network,
          logs: transactionLogs.map((log: any) => ({
            address: log.address,
            topics: log.topics || [],
            data: log.data || '0x'
          })),
          input: tx.input || '0x',
          nonce: tx.nonce || 0,
          type: tx.type === 0 ? 'legacy' : tx.type === 2 ? 'eip1559' : tx.type === 1 ? 'eip2930' : 'legacy',
          maxFeePerGas: tx.maxFeePerGas ? BigInt(tx.maxFeePerGas) : undefined,
          maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? BigInt(tx.maxPriorityFeePerGas) : undefined,
        } as TransactionInfo;
      });

      console.log(`Found ${transactions.length} transactions for ${address} on ${network}`);
      return transactions;

    } catch (error) {
      console.error(`Failed to get transactions via HyperSync for ${address} on ${network}:`, error);
      // Fallback to manual scanning
      return this.getNetworkTransactionsFallback(address, network, limit);
    }
  }

  /**
   * Fallback method using manual block scanning (original implementation)
   */
  private async getNetworkTransactionsFallback(
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
                gasLimit: tx.gas || 21000n, // Default to standard ETH transfer gas limit
                gasUsed: receipt.gasUsed,
                status: receipt.status === 'success' ? 'success' : 'failed',
                timestamp: new Date(Number(block.timestamp) * 1000),
                network,
                logs: receipt.logs?.map(log => ({
                  address: log.address,
                  topics: log.topics,
                  data: log.data
                })) || [],
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

      // Get ERC20 token balances for each supported network
      for (const network of WALLET_SUPPORTED_NETWORKS) {
        const networkTokens = ERC20_TOKENS[network] || [];
        if (networkTokens.length === 0) continue;

        for (const token of networkTokens) {
          try {
            const tokenBalance = await this.getERC20Balance(token.address, address, network);
            if (tokenBalance > 0n) {
              // Format balance according to token decimals
              const formattedBalance = this.formatTokenBalance(tokenBalance, token.decimals);

              balances.push({
                address: token.address,
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals,
                balance: tokenBalance,
                formattedBalance,
                network,
                isNative: false,
              });
            }
          } catch (error) {
            console.error(`Failed to get ${token.symbol} balance for ${network}:`, error);
          }
        }
      }

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

      // At this point, we know transactionsResult.success is true, so data exists
      const transactionsData = transactionsResult.data!;

      // Calculate summary
      const summary: WalletSummary = {
        address,
        totalBalanceUSD: 0, // Would need price oracle integration
        networks: WALLET_SUPPORTED_NETWORKS,
        lastActivity: transactionsData && transactionsData.length > 0 ?
          transactionsData[0]?.timestamp || null : null,
        totalTransactions: transactionsData ? transactionsData.length : 0,
      };

      const walletInfo: WalletInfo = {
        address,
        summary,
        balances: balancesResult.data,
        recentTransactions: transactionsData,
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
