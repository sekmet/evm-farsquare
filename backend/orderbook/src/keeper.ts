/**
 * EVM Orderbook Keeper - Automated Order Matching with ERC-3643 Compliance
 * Implements price-time priority matching and settlement through Uniswap V3 pools
 */
import { createPublicClient, createWalletClient, http, parseAbi, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hardhat, anvil, sepolia, baseSepolia, optimismSepolia } from 'viem/chains';

// ============================================================================
// CONFIGURATION - Environment Variables
// ============================================================================

const EVM_RPC_URL = process.env.VITE_EVM_RPC_URL || 'http://127.0.0.1:8545';
const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY || '';
const ORDERBOOK_API_URL = process.env.ORDERBOOK_API_URL || 'http://localhost:3001';

// Keeper configuration
const MATCHING_INTERVAL = parseInt(process.env.MATCHING_INTERVAL || '30000'); // 30 seconds
const MAX_MATCHES_PER_RUN = parseInt(process.env.MAX_MATCHES_PER_RUN || '10');
const MIN_ORDER_SIZE = process.env.MIN_ORDER_SIZE || '1000000000000000000'; // 1 token in wei

// ============================================================================
// VIEM CLIENTS CONFIGURATION
// ============================================================================

const publicClient = createPublicClient({
  chain: anvil,
  transport: http(EVM_RPC_URL),
});

const supportedChains = [hardhat, anvil, sepolia, baseSepolia, optimismSepolia] as const;

// Wallet client for keeper operations (only if private key provided)
let walletClient: any = null;
let keeperAddress: Address | null = null;

if (KEEPER_PRIVATE_KEY) {
  const account = privateKeyToAccount(KEEPER_PRIVATE_KEY as `0x${string}`);
  walletClient = createWalletClient({
    chain: anvil,
    transport: http(EVM_RPC_URL),
    account
  });
  keeperAddress = account.address;
}

// ============================================================================
// CONTRACT ABIS - ERC-3643 + Uniswap V3 Integration
// ============================================================================

const erc3643Abi = parseAbi([
  'function canTransfer(address from, address to, uint256 amount) external view returns (bool)',
  'function transferred(address from, address to, uint256 amount) external',
  'function isVerified(address) external view returns (bool)',
  'function hasClaim(address,uint256) external view returns (bool)'
]);

const uniswapV3PoolAbi = parseAbi([
  'function swap(address recipient, bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96, bytes data) external returns (int256 amount0, int256 amount1)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function fee() external view returns (uint24)',
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)'
]);

// ============================================================================
// ORDER TYPES - Enhanced for EVM Operations
// ============================================================================

type ERC3643Order = {
  id: string;
  maker: Address;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: string;
  amountOut: string;
  price: string;
  orderType: 'market' | 'limit';
  expiry: number;
  salt: number;
  signature: string;
  identityRegistry: Address;
  compliance: Address;
  poolAddress: Address;
  tickLower: number;
  tickUpper: number;
  fee: number;
  createdAt: number;
  status: 'pending' | 'partial' | 'filled' | 'cancelled' | 'expired';
  filledAmount: string;
};

type OrderMatch = {
  id: string;
  makerOrder: ERC3643Order;
  takerOrder: ERC3643Order;
  executionAmount: string;
  executionPrice: string;
  poolAddress: Address;
  zeroForOne: boolean;
  sqrtPriceLimitX96: string;
  status: 'pending' | 'executed' | 'failed';
  txHash?: string;
  error?: string;
};

// ============================================================================
// ERC-3643 COMPLIANCE VALIDATION
// ============================================================================

/**
 * Validate ERC-3643 transfer compliance for order execution
 */
async function validateOrderCompliance(
  makerOrder: ERC3643Order,
  takerOrder: ERC3643Order,
  amount: bigint
): Promise<boolean> {
  try {
    // Validate maker can transfer tokens
    const makerCanTransfer = await publicClient.readContract({
      address: makerOrder.compliance,
      abi: erc3643Abi,
      functionName: 'canTransfer',
      args: [makerOrder.maker, takerOrder.maker, amount]
    });

    if (!makerCanTransfer) {
      console.warn(`Maker transfer not compliant: ${makerOrder.maker} -> ${takerOrder.maker}`);
      return false;
    }

    // Validate taker can receive tokens
    const takerCanReceive = await publicClient.readContract({
      address: takerOrder.compliance,
      abi: erc3643Abi,
      functionName: 'canTransfer',
      args: [takerOrder.maker, makerOrder.maker, amount]
    });

    if (!takerCanReceive) {
      console.warn(`Taker receive not compliant: ${takerOrder.maker} <- ${makerOrder.maker}`);
      return false;
    }

    // Validate both parties are verified identities
    const makerVerified = await publicClient.readContract({
      address: makerOrder.identityRegistry,
      abi: erc3643Abi,
      functionName: 'isVerified',
      args: [makerOrder.maker]
    });

    const takerVerified = await publicClient.readContract({
      address: takerOrder.identityRegistry,
      abi: erc3643Abi,
      functionName: 'isVerified',
      args: [takerOrder.maker]
    });

    if (!makerVerified || !takerVerified) {
      console.warn(`Identity verification failed: maker=${makerVerified}, taker=${takerVerified}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Compliance validation failed:', error);
    return false;
  }
}

/**
 * Execute ERC-3643 transfer notification after successful swap
 */
async function notifyComplianceTransfer(
  from: Address,
  to: Address,
  amount: bigint,
  complianceAddress: Address
): Promise<void> {
  try {
    if (!walletClient) {
      console.warn('No wallet client available for compliance notification');
      return;
    }

    await walletClient.writeContract({
      address: complianceAddress,
      abi: erc3643Abi,
      functionName: 'transferred',
      args: [from, to, amount]
    });

    console.log(`Compliance transfer notified: ${from} -> ${to} (${amount.toString()})`);
  } catch (error) {
    console.error('Failed to notify compliance transfer:', error);
    // Don't fail the entire match for notification errors
  }
}

// ============================================================================
// UNISWAP V3 ORDER EXECUTION
// ============================================================================

/**
 * Execute order match through Uniswap V3 pool swap
 */
async function executeUniswapV3Swap(match: OrderMatch): Promise<string> {
  if (!walletClient) {
    throw new Error('Keeper wallet not configured for swap execution');
  }

  try {
    // Prepare swap parameters
    const swapParams = {
      recipient: match.takerOrder.maker, // Tokens go to taker
      zeroForOne: match.zeroForOne,
      amountSpecified: BigInt(match.executionAmount),
      sqrtPriceLimitX96: BigInt(match.sqrtPriceLimitX96),
      data: '0x' // Additional callback data if needed
    };

    console.log(`Executing Uniswap V3 swap:`, {
      pool: match.poolAddress,
      zeroForOne: match.zeroForOne,
      amount: match.executionAmount,
      recipient: match.takerOrder.maker
    });

    // Execute the swap
    const txHash = await walletClient.writeContract({
      address: match.poolAddress,
      abi: uniswapV3PoolAbi,
      functionName: 'swap',
      args: [
        swapParams.recipient,
        swapParams.zeroForOne,
        swapParams.amountSpecified,
        swapParams.sqrtPriceLimitX96,
        swapParams.data
      ]
    });

    console.log(`Swap executed successfully: ${txHash}`);

    // Notify compliance modules of the transfer
    await notifyComplianceTransfer(
      match.makerOrder.maker,
      match.takerOrder.maker,
      BigInt(match.executionAmount),
      match.makerOrder.compliance
    );

    return txHash;
  } catch (error) {
    console.error('Uniswap V3 swap execution failed:', error);
    throw error;
  }
}

/**
 * Calculate optimal swap parameters for order execution
 */
async function calculateSwapParameters(
  makerOrder: ERC3643Order,
  takerOrder: ERC3643Order,
  executionAmount: string
): Promise<{ zeroForOne: boolean; sqrtPriceLimitX96: string }> {
  try {
    // Get current pool state
    const [token0, token1, slot0] = await Promise.all([
      publicClient.readContract({
        address: makerOrder.poolAddress,
        abi: uniswapV3PoolAbi,
        functionName: 'token0'
      }),
      publicClient.readContract({
        address: makerOrder.poolAddress,
        abi: uniswapV3PoolAbi,
        functionName: 'token1'
      }),
      publicClient.readContract({
        address: makerOrder.poolAddress,
        abi: uniswapV3PoolAbi,
        functionName: 'slot0'
      })
    ]);

    const [sqrtPriceX96] = slot0 as [bigint, number, number, number, number, number, boolean];

    // Determine swap direction (zeroForOne means token0 -> token1)
    const zeroForOne = makerOrder.tokenIn.toLowerCase() === (token0 as string).toLowerCase();

    // Calculate price limit (allow up to 5% slippage from current price)
    const currentPrice = Number(sqrtPriceX96) / (2 ** 96);
    const slippageTolerance = 0.05; // 5%
    const priceLimit = zeroForOne
      ? currentPrice * (1 + slippageTolerance)
      : currentPrice * (1 - slippageTolerance);

    const sqrtPriceLimitX96 = Math.floor(priceLimit * (2 ** 96)).toString();

    return {
      zeroForOne,
      sqrtPriceLimitX96
    };
  } catch (error) {
    console.error('Failed to calculate swap parameters:', error);
    throw error;
  }
}

// ============================================================================
// ORDER MATCHING ALGORITHM - Price-Time Priority
// ============================================================================

/**
 * Match orders using price-time priority algorithm
 */
async function matchOrdersByPriceTimePriority(pendingOrders: ERC3643Order[]): Promise<OrderMatch[]> {
  const matches: OrderMatch[] = [];
  const processedOrders = new Set<string>();

  // Separate buy and sell orders based on order type and token pairs
  // Buy orders: want to receive tokenOut by giving tokenIn
  // Sell orders: want to give tokenIn to receive tokenOut
  const buyOrders = pendingOrders.filter(order =>
    order.orderType === 'limit' &&
    order.tokenIn !== undefined &&
    order.tokenOut !== undefined
  );

  const sellOrders = pendingOrders.filter(order =>
    order.orderType === 'limit' &&
    order.tokenIn !== undefined &&
    order.tokenOut !== undefined
  );

  // Sort by price (best price first) then by time (oldest first)
  buyOrders.sort((a, b) => {
    const priceCompare = parseFloat(b.price) - parseFloat(a.price); // Higher price first for buys
    return priceCompare !== 0 ? priceCompare : a.createdAt - b.createdAt;
  });

  sellOrders.sort((a, b) => {
    const priceCompare = parseFloat(a.price) - parseFloat(b.price); // Lower price first for sells
    return priceCompare !== 0 ? priceCompare : a.createdAt - b.createdAt;
  });

  // Match orders
  for (const buyOrder of buyOrders) {
    if (processedOrders.has(buyOrder.id) || matches.length >= MAX_MATCHES_PER_RUN) break;

    for (const sellOrder of sellOrders) {
      if (processedOrders.has(sellOrder.id)) continue;

      // Check if orders can match (price compatibility, token pairs, etc.)
      if (canOrdersMatch(buyOrder, sellOrder)) {
        try {
          // Validate compliance before matching
          const executionAmount = calculateExecutionAmount(buyOrder, sellOrder);
          const complianceValid = await validateOrderCompliance(buyOrder, sellOrder, BigInt(executionAmount));

          if (complianceValid) {
            // Calculate swap parameters
            const swapParams = await calculateSwapParameters(buyOrder, sellOrder, executionAmount);

            const match: OrderMatch = {
              id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              makerOrder: sellOrder, // Sell order is the maker
              takerOrder: buyOrder,  // Buy order is the taker
              executionAmount,
              executionPrice: calculateExecutionPrice(buyOrder, sellOrder),
              poolAddress: buyOrder.poolAddress,
              ...swapParams,
              status: 'pending'
            };

            matches.push(match);
            processedOrders.add(buyOrder.id);
            processedOrders.add(sellOrder.id);
            break; // Move to next buy order
          }
        } catch (error) {
          console.error(`Failed to match orders ${buyOrder.id} and ${sellOrder.id}:`, error);
        }
      }
    }
  }

  return matches;
}

/**
 * Check if two orders can potentially match
 */
function canOrdersMatch(buyOrder: ERC3643Order, sellOrder: ERC3643Order): boolean {
  // Must be opposite sides of same token pair
  if (buyOrder.tokenIn !== sellOrder.tokenOut || buyOrder.tokenOut !== sellOrder.tokenIn) {
    return false;
  }

  // Price must be compatible (buy price >= sell price)
  if (parseFloat(buyOrder.price) < parseFloat(sellOrder.price)) {
    return false;
  }

  // Must use the same pool
  if (buyOrder.poolAddress.toLowerCase() !== sellOrder.poolAddress.toLowerCase()) {
    return false;
  }

  // Check minimum order size
  const buyAmount = BigInt(buyOrder.amountIn);
  const sellAmount = BigInt(sellOrder.amountIn);
  if (buyAmount < BigInt(MIN_ORDER_SIZE) || sellAmount < BigInt(MIN_ORDER_SIZE)) {
    return false;
  }

  return true;
}

/**
 * Calculate execution amount for matched orders
 */
function calculateExecutionAmount(buyOrder: ERC3643Order, sellOrder: ERC3643Order): string {
  const buyAmount = BigInt(buyOrder.amountIn);
  const sellAmount = BigInt(sellOrder.amountIn);

  // Execute the smaller of the two amounts
  const executionAmount = buyAmount < sellAmount ? buyAmount : sellAmount;

  return executionAmount.toString();
}

/**
 * Calculate execution price for matched orders
 */
function calculateExecutionPrice(buyOrder: ERC3643Order, sellOrder: ERC3643Order): string {
  // Use the midpoint between buy and sell prices as execution price
  const buyPrice = parseFloat(buyOrder.price);
  const sellPrice = parseFloat(sellOrder.price);
  const executionPrice = (buyPrice + sellPrice) / 2;

  return executionPrice.toString();
}

// ============================================================================
// ORDER LIFECYCLE MANAGEMENT
// ============================================================================

/**
 * Update order status after execution
 */
async function updateOrderStatus(orderId: string, status: string, txHash?: string, error?: string): Promise<void> {
  try {
    const updateData = {
      status,
      ...(txHash && { txHash }),
      ...(error && { error }),
      updatedAt: Date.now()
    };

    const response = await fetch(`${ORDERBOOK_API_URL}/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      console.error(`Failed to update order ${orderId} status: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error updating order ${orderId} status:`, error);
  }
}

/**
 * Main order matching and execution function
 */
async function executeOrderMatching(): Promise<void> {
  try {
    console.log('🔍 Fetching pending orders for matching...');

    // Fetch pending orders from orderbook API
    const response = await fetch(`${ORDERBOOK_API_URL}/api/orders/pending`);
    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.status}`);
    }

    const data = await response.json() as { orders?: ERC3643Order[] };
    const pendingOrders: ERC3643Order[] = data.orders || [];

    if (!pendingOrders || pendingOrders.length === 0) {
      console.log('📭 No pending orders to match');
      return;
    }

    console.log(`📊 Found ${pendingOrders.length} pending orders`);

    // Execute price-time priority matching
    const matches = await matchOrdersByPriceTimePriority(pendingOrders);

    if (matches.length === 0) {
      console.log('🤝 No compatible order matches found');
      return;
    }

    console.log(`🎯 Generated ${matches.length} order matches`);

    // Execute matches through Uniswap V3
    for (const match of matches) {
      try {
        console.log(`⚡ Executing match ${match.id}: ${match.executionAmount} tokens`);

        // Execute the swap
        const txHash = await executeUniswapV3Swap(match);

        // Update match status
        match.status = 'executed';
        match.txHash = txHash;

        // Update order statuses
        await updateOrderStatus(match.makerOrder.id, 'filled', txHash);
        await updateOrderStatus(match.takerOrder.id, 'filled', txHash);

        console.log(`✅ Match ${match.id} executed successfully: ${txHash}`);

      } catch (error) {
        console.error(`❌ Failed to execute match ${match.id}:`, error);

        // Update match status to failed
        match.status = 'failed';
        match.error = (error as Error).message;

        // Mark orders as failed (they can be retried)
        await updateOrderStatus(match.makerOrder.id, 'pending', undefined, (error as Error).message);
        await updateOrderStatus(match.takerOrder.id, 'pending', undefined, (error as Error).message);
      }
    }

  } catch (error) {
    console.error('💥 Order matching execution failed:', error);
  }
}

// ============================================================================
// KEEPER MAIN LOOP
// ============================================================================

async function main(): Promise<void> {
  console.log('🚀 Starting EVM Orderbook Keeper...');
  console.log(`📡 Chain: ${anvil.name} (ID: ${anvil.id})`);
  console.log(`🔗 RPC: ${EVM_RPC_URL}`);
  console.log(`📊 Orderbook API: ${ORDERBOOK_API_URL}`);
  console.log(`⏱️  Matching Interval: ${MATCHING_INTERVAL}ms`);
  console.log(`🎯 Max Matches per Run: ${MAX_MATCHES_PER_RUN}`);

  if (!keeperAddress) {
    console.warn('⚠️  Keeper wallet not configured - compliance notifications disabled');
  } else {
    console.log(`👤 Keeper Address: ${keeperAddress}`);
  }

  // Initial execution
  await executeOrderMatching();

  // Set up recurring execution
  setInterval(async () => {
    try {
      await executeOrderMatching();
    } catch (error) {
      console.error('💥 Keeper main loop error:', error);
    }
  }, MATCHING_INTERVAL);

  console.log('🔄 Keeper running - monitoring for order matches...');
}

// ============================================================================
// STARTUP
// ============================================================================

main().catch((error) => {
  console.error('💥 Keeper startup failed:', error);
  process.exit(1);
});