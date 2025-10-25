/**
 * ERC-3643 EVM Price Service
 * Integrated pricing service supporting Uniswap V3 price discovery and EVM networks
 * Follows ERC-3643 implementation patterns and Viem/Wagmi guides
 */

import { Pool } from 'pg';
import {
  createPublicClient,
  http,
  type PublicClient,
  type Address,
  type Chain
} from 'viem';
import {
  mainnet,
  base,
  polygon,
  optimism,
  baseSepolia,
  sepolia,
  polygonMumbai,
  optimismSepolia
} from 'viem/chains';

// Import existing price caching functions
import {
  fetchETHPrice,
  fetchPYUSDPrice,
  fetchPAXGOLDPrice,
  fetchOptimismPrice,
  fetchUSDCPrice,
  fetchEURCPrice,
  clearPriceCache,
  getCacheStatus
} from './price-caching';

// ERC-3643 Token ABI (IERC3643 interface)
const erc3643Abi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  }
] as const;

// Uniswap V3 Pool ABI for price discovery
const uniswapV3PoolAbi = [
  {
    name: 'slot0',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' }
    ],
  },
  {
    name: 'token0',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'token1',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  }
] as const;

// EVM Network configuration following Viem patterns
export type EVMNetwork = 'mainnet' | 'base' | 'polygon' | 'optimism' | 'sepolia' | 'base-sepolia' | 'polygon-mumbai' | 'optimism-sepolia';

const networkConfigs: Record<EVMNetwork, { chain: Chain; rpcUrl: string }> = {
  'mainnet': { chain: mainnet, rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://cloudflare-eth.com' },
  'base': { chain: base, rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org' },
  'polygon': { chain: polygon, rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com' },
  'optimism': { chain: optimism, rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io' },
  'sepolia': { chain: sepolia, rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org' },
  'base-sepolia': { chain: baseSepolia, rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org' },
  'polygon-mumbai': { chain: polygonMumbai, rpcUrl: process.env.POLYGON_MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com' },
  'optimism-sepolia': { chain: optimismSepolia, rpcUrl: process.env.OPTIMISM_SEPOLIA_RPC_URL || 'https://sepolia.optimism.io' },
};

// Client cache following Viem patterns
const clientCache = new Map<EVMNetwork, PublicClient>();

export interface PriceUpdate {
  propertyId: string;
  tokenPrice: number;
  ethPrice: number;
  pyusdPrice: number;
  paxgoldPrice: number;
  optimismPrice: number;
  usdcPrice: number;
  eurcPrice: number;
  priceChange24h: number;
  volume24h: number;
  lastUpdated: Date;
  network?: EVMNetwork;
  contractAddress?: Address;
  liquidity?: number;
}

export type Result<T, E = string> = { success: true; data: T } | { success: false; error: E };

// ERC-3643 compliant price service with EVM integration
export class PriceService {
  constructor(private pool: Pool) {}

  /**
   * Get public client for specified network following Viem patterns
   */
  private getPublicClient(network: EVMNetwork = 'mainnet'): PublicClient {
    if (!clientCache.has(network)) {
      const config = networkConfigs[network];
      if (!config) {
        throw new Error(`Unsupported network: ${network}`);
      }

      const client = createPublicClient({
        chain: config.chain,
        transport: http(config.rpcUrl),
        batch: {
          multicall: true, // Enable batching for performance
        },
      });

      clientCache.set(network, client);
    }

    return clientCache.get(network)!;
  }

  /**
   * Calculate price from Uniswap V3 sqrtPriceX96
   * Following Uniswap V3 mathematical formulas
   */
  private calculatePriceFromSqrtPriceX96(sqrtPriceX96: bigint, token0Decimals: number = 18, token1Decimals: number = 18): number {
    // sqrtPriceX96 represents sqrt(price) * 2^96
    // price = (sqrtPriceX96 / 2^96)^2
    const Q96 = 2n ** 96n;
    const price = Number(sqrtPriceX96 ** 2n) / Number(Q96 ** 2n);

    // Adjust for token decimals
    const decimalAdjustment = 10 ** (token0Decimals - token1Decimals);
    return price * decimalAdjustment;
  }

  /**
   * Get token price from Uniswap V3 pool
   * Follows ERC-3643 patterns for contract interactions
   */
  private async getUniswapV3Price(
    poolAddress: Address,
    network: EVMNetwork = 'mainnet'
  ): Promise<{ price: number; liquidity: number }> {
    const client = this.getPublicClient(network);

    try {
      // Get pool data in parallel for performance
      const [slot0, token0, token1] = await Promise.all([
        client.readContract({
          address: poolAddress,
          abi: uniswapV3PoolAbi,
          functionName: 'slot0',
        }),
        client.readContract({
          address: poolAddress,
          abi: uniswapV3PoolAbi,
          functionName: 'token0',
        }),
        client.readContract({
          address: poolAddress,
          abi: uniswapV3PoolAbi,
          functionName: 'token1',
        })
      ]);

      const [sqrtPriceX96, , , , , , unlocked] = slot0 as [bigint, number, number, number, number, number, boolean];

      if (!unlocked) {
        throw new Error('Pool is locked');
      }

      // Get token decimals for proper price calculation
      const [token0Decimals, token1Decimals] = await Promise.all([
        client.readContract({
          address: token0 as Address,
          abi: erc3643Abi,
          functionName: 'decimals',
        }).catch(() => 18), // fallback to 18 decimals
        client.readContract({
          address: token1 as Address,
          abi: erc3643Abi,
          functionName: 'decimals',
        }).catch(() => 18) // fallback to 18 decimals
      ]);

      const price = this.calculatePriceFromSqrtPriceX96(
        sqrtPriceX96,
        Number(token0Decimals),
        Number(token1Decimals)
      );

      // Estimate liquidity (simplified - in production would calculate properly)
      const liquidity = Math.random() * 1000000; // Placeholder - would calculate from pool state

      return { price, liquidity };

    } catch (error) {
      console.warn(`Failed to get Uniswap V3 price for pool ${poolAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get asset prices using cached price service
   */
  async getAssetPrices(): Promise<{
    ethPrice: number;
    pyusdPrice: number;
    paxgoldPrice: number;
    optimismPrice: number;
    usdcPrice: number;
    eurcPrice: number;
  }> {
    try {
      const [ethPrice, pyusdPrice, paxgoldPrice, optimismPrice, usdcPrice, eurcPrice] = await Promise.all([
        fetchETHPrice(),
        fetchPYUSDPrice(),
        fetchPAXGOLDPrice(),
        fetchOptimismPrice(),
        fetchUSDCPrice(),
        fetchEURCPrice()
      ]);

      return {
        ethPrice,
        pyusdPrice,
        paxgoldPrice,
        optimismPrice,
        usdcPrice,
        eurcPrice
      };
    } catch (error) {
      console.warn('Failed to get asset prices, using fallbacks:', error);
      return {
        ethPrice: 2500, // Fallback ETH price
        pyusdPrice: 1.0, // PYUSD is pegged to USD
        paxgoldPrice: 2200, // Fallback PAXG price
        optimismPrice: 2.5, // Fallback OP price
        usdcPrice: 1.0, // USDC is pegged to USD
        eurcPrice: 1.08 // Fallback EURC price (approx EUR/USD rate)
      };
    }
  }

  /**
   * Calculate 24h price change from database analytics
   */
  private async calculatePriceChange24h(propertyId: string): Promise<number> {
    try {
      const query = `
        SELECT
          current_price.price as current,
          previous_price.price as previous
        FROM public.property_analytics current_price
        JOIN public.property_analytics previous_price
          ON current_price.property_id = previous_price.property_id
          AND current_price.date = CURRENT_DATE
          AND previous_price.date = CURRENT_DATE - INTERVAL '1 day'
        WHERE current_price.property_id = $1
      `;

      const result = await this.pool.query(query, [propertyId]);

      if (result.rows.length === 0) {
        return 0; // No historical data
      }

      const { current, previous } = result.rows[0];
      if (previous === 0) return 0;

      return ((parseFloat(current) - parseFloat(previous)) / parseFloat(previous)) * 100;
    } catch (error) {
      console.warn(`Failed to calculate 24h price change for property ${propertyId}:`, error);
      return 0;
    }
  }

  /**
   * Calculate 24h trading volume from database
   */
  private async calculateVolume24h(propertyId: string): Promise<number> {
    try {
      const query = `
        SELECT COALESCE(SUM(volume), 0) as total_volume
        FROM public.property_analytics
        WHERE property_id = $1
          AND date >= CURRENT_DATE - INTERVAL '1 day'
      `;

      const result = await this.pool.query(query, [propertyId]);
      return parseFloat(result.rows[0].total_volume) || 0;
    } catch (error) {
      console.warn(`Failed to calculate 24h volume for property ${propertyId}:`, error);
      return 0;
    }
  }

  /**
   * Get all active property prices with EVM integration
   * Follows Viem patterns for efficient contract reads
   */
  async getAllPrices(): Promise<Result<PriceUpdate[]>> {
    try {
      // Get all active properties from database
      const query = `
        SELECT
          id as property_id,
          contract_address,
          token_price,
          updated_at as last_updated
        FROM public.properties
        WHERE status = 'active'
          AND contract_address IS NOT NULL
        ORDER BY updated_at DESC
      `;

      const result = await this.pool.query(query);
      const prices: PriceUpdate[] = [];

      // Process properties in batches for performance
      const batchSize = 5;
      for (let i = 0; i < result.rows.length; i += batchSize) {
        const batch = result.rows.slice(i, i + batchSize);

        const batchPromises = batch.map(async (row) => {
          try {
            const propertyId = row.property_id;
            const contractAddress = row.contract_address as Address;

            // Try to get real-time price from Uniswap V3 pool
            let tokenPrice = parseFloat(row.token_price);
            let liquidity = 0;

            try {
              // Assume mainnet for now - in production would determine network from contract
              const poolPrice = await this.getUniswapV3Price(contractAddress, 'mainnet');
              tokenPrice = poolPrice.price;
              liquidity = poolPrice.liquidity;
            } catch (error) {
              console.warn(`Using database price for property ${propertyId}:`, error);
              // Keep database price as fallback
            }

            // Get additional data
            const [assetPrices, priceChange24h, volume24h] = await Promise.all([
              this.getAssetPrices(),
              this.calculatePriceChange24h(propertyId),
              this.calculateVolume24h(propertyId)
            ]);

            return {
              propertyId,
              tokenPrice,
              ethPrice: assetPrices.ethPrice,
              pyusdPrice: assetPrices.pyusdPrice,
              paxgoldPrice: assetPrices.paxgoldPrice,
              usdcPrice: assetPrices.usdcPrice,
              eurcPrice: assetPrices.eurcPrice,
              priceChange24h,
              volume24h,
              lastUpdated: row.last_updated,
              contractAddress,
              network: 'mainnet', // Would be determined from contract in production
              liquidity
            } as PriceUpdate;

          } catch (error) {
            console.error(`Failed to get price for property ${row.property_id}:`, error);
            // Return database fallback
            return {
              propertyId: row.property_id,
              tokenPrice: parseFloat(row.token_price),
              ethPrice: 2500, // Fallback ETH price
              pyusdPrice: 1.0, // PYUSD pegged to USD
              paxgoldPrice: 2200, // Fallback PAXG price
              usdcPrice: 1.0, // USDC pegged to USD
              eurcPrice: 1.08, // EURC approx EUR/USD rate
              priceChange24h: 0,
              volume24h: 0,
              lastUpdated: row.last_updated,
              contractAddress: row.contract_address,
              network: 'mainnet'
            } as PriceUpdate;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        prices.push(...batchResults);
      }

      return { success: true, data: prices };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get specific property price with EVM integration
   * Uses Viem contract reads for real-time data
   */
  async getPropertyPrice(propertyId: string): Promise<Result<PriceUpdate | null>> {
    try {
      const query = `
        SELECT
          id as property_id,
          contract_address,
          token_price,
          updated_at as last_updated
        FROM public.properties
        WHERE id = $1 AND status = 'active'
      `;

      const result = await this.pool.query(query, [propertyId]);

      if (result.rows.length === 0) {
        return { success: true, data: null };
      }

      const row = result.rows[0];
      const contractAddress = row.contract_address as Address;

      let tokenPrice = parseFloat(row.token_price);
      let liquidity = 0;

      // Try to get real-time price from EVM network
      if (contractAddress) {
        try {
          const poolPrice = await this.getUniswapV3Price(contractAddress, 'mainnet');
          tokenPrice = poolPrice.price;
          liquidity = poolPrice.liquidity;
        } catch (error) {
          console.warn(`Using database price for property ${propertyId}:`, error);
        }
      }

      // Get additional price data
      const [assetPrices, priceChange24h, volume24h] = await Promise.all([
        this.getAssetPrices(),
        this.calculatePriceChange24h(propertyId),
        this.calculateVolume24h(propertyId)
      ]);

      const priceUpdate: PriceUpdate = {
        propertyId: row.property_id,
        tokenPrice,
        ethPrice: assetPrices.ethPrice,
        pyusdPrice: assetPrices.pyusdPrice,
        paxgoldPrice: assetPrices.paxgoldPrice,
        optimismPrice: assetPrices.optimismPrice,
        usdcPrice: assetPrices.usdcPrice,
        eurcPrice: assetPrices.eurcPrice,
        priceChange24h,
        volume24h,
        lastUpdated: row.last_updated,
        contractAddress,
        network: 'mainnet',
        liquidity
      };

      return { success: true, data: priceUpdate };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clear all price caches (useful for testing or forced refresh)
   */
  async clearCaches(): Promise<void> {
    clearPriceCache();
    clientCache.clear();
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus() {
    return {
      priceCache: getCacheStatus(),
      evmClients: Array.from(clientCache.keys())
    };
  }
}
