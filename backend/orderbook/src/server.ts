/**
 * EVM Orderbook Server - Hono Framework with ERC-3643 Compliance
 * Implements Uniswap V3 limit order book with identity verification and compliance enforcement
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { randomUUID } from 'crypto';
import { createPublicClient, http, parseAbi, type Address } from 'viem';
import { hardhat, anvil, sepolia, baseSepolia, optimismSepolia } from 'viem/chains';

// ============================================================================
// EVM CLIENT CONFIGURATION - Viem/Wagmi Patterns
// ============================================================================

const publicClient = createPublicClient({
  chain: anvil,
  transport: http(import.meta.env.VITE_EVM_RPC_URL || 'http://127.0.0.1:8545'),
});

export const supportedChains = [hardhat, anvil, sepolia, baseSepolia, optimismSepolia] as const;

// ============================================================================
// ERC-3643 COMPLIANCE INTERFACES
// ============================================================================

const erc3643Abi = parseAbi([
  'function isVerified(address) external view returns (bool)',
  'function identity(address) external view returns (address)',
  'function canTransfer(address from, address to, uint256 amount) external view returns (bool)',
  'function hasClaim(address,uint256) external view returns (bool)'
]);

// ============================================================================
// ENHANCED ORDER TYPES - Uniswap V3 + ERC-3643 Integration
// ============================================================================

type ERC3643Order = {
  id: string;
  maker: Address;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: string;
  amountOut: string;
  price: string; // Limit order price (tokenOut per tokenIn)
  orderType: 'market' | 'limit';
  expiry: number;
  salt: number;
  signature: string;
  // ERC-3643 compliance fields
  identityRegistry: Address;
  compliance: Address;
  // Uniswap V3 settlement fields
  poolAddress: Address;
  tickLower: number;
  tickUpper: number;
  fee: number;
  // Metadata
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
  status: 'pending' | 'executed' | 'failed';
};

// ============================================================================
// ORDERBOOK STORAGE - In-memory for demo, replace with database for production
// ============================================================================

const orderBook = new Map<string, ERC3643Order>();
const orderMatches = new Map<string, OrderMatch>();

// ============================================================================
// ERC-3643 COMPLIANCE FUNCTIONS
// ============================================================================

/**
 * Validate ERC-3643 identity verification for order placement
 */
async function validateIdentityCompliance(userAddress: Address, identityRegistry: Address): Promise<boolean> {
  try {
    const isVerified = await publicClient.readContract({
      address: identityRegistry,
      abi: erc3643Abi,
      functionName: 'isVerified',
      args: [userAddress]
    });

    return isVerified as boolean;
  } catch (error) {
    console.error(`Identity validation failed for ${userAddress}:`, error);
    return false;
  }
}

/**
 * Validate transfer compliance for order execution
 */
async function validateTransferCompliance(
  from: Address,
  to: Address,
  amount: bigint,
  complianceAddress: Address
): Promise<boolean> {
  try {
    const canTransfer = await publicClient.readContract({
      address: complianceAddress,
      abi: erc3643Abi,
      functionName: 'canTransfer',
      args: [from, to, amount]
    });

    return canTransfer as boolean;
  } catch (error) {
    console.error(`Transfer compliance check failed:`, error);
    return false;
  }
}

/**
 * Check if user has required accreditation claims
 */
async function checkAccreditationClaims(
  userAddress: Address,
  identityRegistry: Address,
  requiredTopics: number[] = [1, 2] // KYC and Accreditation
): Promise<boolean> {
  try {
    for (const topic of requiredTopics) {
      const hasClaim = await publicClient.readContract({
        address: identityRegistry,
        abi: erc3643Abi,
        functionName: 'hasClaim',
        args: [userAddress, BigInt(topic)]
      });

      if (hasClaim as boolean) {
        return true; // User has at least one required claim
      }
    }
    return false;
  } catch (error) {
    console.error(`Claim verification failed for ${userAddress}:`, error);
    return false;
  }
}

// ============================================================================
// UNISWAP V3 ORDER VALIDATION
// ============================================================================

/**
 * Validate order parameters against Uniswap V3 pool
 */
async function validateUniswapV3Order(order: Partial<ERC3643Order>): Promise<boolean> {
  try {
    if (!order.poolAddress || !order.tokenIn || !order.tokenOut) {
      return false;
    }

    // Validate pool exists and tokens match
    const uniswapV3Abi = parseAbi([
      'function token0() external view returns (address)',
      'function token1() external view returns (address)',
      'function fee() external view returns (uint24)'
    ]);

    const [token0, token1] = await Promise.all([
      publicClient.readContract({
        address: order.poolAddress,
        abi: uniswapV3Abi,
        functionName: 'token0'
      }),
      publicClient.readContract({
        address: order.poolAddress,
        abi: uniswapV3Abi,
        functionName: 'token1'
      })
    ]);

    // Ensure tokens are correctly ordered (Uniswap V3 convention)
    const tokenPair = [order.tokenIn, order.tokenOut].sort();
    const expectedPair = [token0, token1];

    return tokenPair[0] === expectedPair[0] && tokenPair[1] === expectedPair[1];
  } catch (error) {
    console.error(`Uniswap V3 validation failed:`, error);
    return false;
  }
}

// ============================================================================
// HONO SERVER CONFIGURATION
// ============================================================================

const app = new Hono();

// Middleware stack
app.use('*', cors());
app.use('*', logger());

// Request logging middleware
app.use('*', async (c, next) => {
  console.log(`${c.req.method} ${c.req.path}`);
  await next();
});

// ============================================================================
// API ROUTES - Enhanced with ERC-3643 Compliance
// ============================================================================

/**
 * POST /api/orders - Create new limit order with ERC-3643 compliance
 */
app.post('/api/orders', async (c) => {
  try {
    const orderData = await c.req.json<Partial<ERC3643Order>>();

    // Validate required fields
    if (!orderData.maker || !orderData.tokenIn || !orderData.tokenOut ||
        !orderData.amountIn || !orderData.amountOut || !orderData.identityRegistry ||
        !orderData.compliance || !orderData.poolAddress) {
      return c.json({ error: 'Missing required order fields' }, 400);
    }

    // Validate ERC-3643 identity compliance
    const identityValid = await validateIdentityCompliance(
      orderData.maker as Address,
      orderData.identityRegistry as Address
    );

    if (!identityValid) {
      return c.json({ error: 'Identity verification failed - user not verified in registry' }, 403);
    }

    // Check accreditation claims for privileged operations
    const hasRequiredClaims = await checkAccreditationClaims(
      orderData.maker as Address,
      orderData.identityRegistry as Address
    );

    if (!hasRequiredClaims) {
      return c.json({ error: 'Insufficient accreditation claims for order placement' }, 403);
    }

    // Validate Uniswap V3 pool compatibility
    const poolValid = await validateUniswapV3Order(orderData);
    if (!poolValid) {
      return c.json({ error: 'Invalid Uniswap V3 pool configuration' }, 400);
    }

    // Create order
    const orderId = randomUUID();
    const order: ERC3643Order = {
      id: orderId,
      maker: orderData.maker as Address,
      tokenIn: orderData.tokenIn as Address,
      tokenOut: orderData.tokenOut as Address,
      amountIn: orderData.amountIn,
      amountOut: orderData.amountOut,
      price: orderData.price || '0',
      orderType: orderData.orderType || 'limit',
      expiry: orderData.expiry || Math.floor(Date.now() / 1000) + 3600, // 1 hour default
      salt: orderData.salt || Math.floor(Math.random() * 1000000),
      signature: orderData.signature || '',
      identityRegistry: orderData.identityRegistry as Address,
      compliance: orderData.compliance as Address,
      poolAddress: orderData.poolAddress as Address,
      tickLower: orderData.tickLower || -887272,
      tickUpper: orderData.tickUpper || 887272,
      fee: orderData.fee || 3000,
      createdAt: Date.now(),
      status: 'pending',
      filledAmount: '0'
    };

    orderBook.set(orderId, order);

    console.log(`Order created: ${orderId} by ${order.maker}`);

    return c.json({
      orderId,
      status: 'Order created successfully',
      order: {
        id: orderId,
        maker: order.maker,
        tokenIn: order.tokenIn,
        tokenOut: order.tokenOut,
        amountIn: order.amountIn,
        amountOut: order.amountOut,
        price: order.price,
        status: order.status
      }
    });

  } catch (error) {
    console.error('Order creation failed:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/orders - Retrieve orders with filtering
 */
app.get('/api/orders', async (c) => {
  try {
    const status = c.req.query('status');
    const maker = c.req.query('maker');
    const tokenIn = c.req.query('tokenIn');
    const tokenOut = c.req.query('tokenOut');

    let orders = Array.from(orderBook.values());

    // Apply filters
    if (status) {
      orders = orders.filter(order => order.status === status);
    }
    if (maker) {
      orders = orders.filter(order => order.maker.toLowerCase() === maker.toLowerCase());
    }
    if (tokenIn) {
      orders = orders.filter(order => order.tokenIn.toLowerCase() === tokenIn.toLowerCase());
    }
    if (tokenOut) {
      orders = orders.filter(order => order.tokenOut.toLowerCase() === tokenOut.toLowerCase());
    }

    // Return simplified order data
    const simplifiedOrders = orders.map(order => ({
      id: order.id,
      maker: order.maker,
      tokenIn: order.tokenIn,
      tokenOut: order.tokenOut,
      amountIn: order.amountIn,
      amountOut: order.amountOut,
      price: order.price,
      orderType: order.orderType,
      status: order.status,
      filledAmount: order.filledAmount,
      createdAt: order.createdAt
    }));

    return c.json({
      orders: simplifiedOrders,
      total: simplifiedOrders.length
    });

  } catch (error) {
    console.error('Order retrieval failed:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/orders/:id - Retrieve specific order
 */
app.get('/api/orders/:id', async (c) => {
  try {
    const orderId = c.req.param('id');
    const order = orderBook.get(orderId);

    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }

    return c.json({ order });

  } catch (error) {
    console.error('Order retrieval failed:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * DELETE /api/orders/:id - Cancel order (with compliance check)
 */
app.delete('/api/orders/:id', async (c) => {
  try {
    const orderId = c.req.param('id');
    const order = orderBook.get(orderId);

    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }

    // Check if request comes from order maker (simplified - in production use signatures)
    const requestMaker = c.req.header('x-wallet-address');
    if (!requestMaker || requestMaker.toLowerCase() !== order.maker.toLowerCase()) {
      return c.json({ error: 'Unauthorized - only order maker can cancel' }, 403);
    }

    // Validate identity compliance for cancellation
    const identityValid = await validateIdentityCompliance(
      order.maker,
      order.identityRegistry
    );

    if (!identityValid) {
      return c.json({ error: 'Identity verification failed for cancellation' }, 403);
    }

    // Update order status
    order.status = 'cancelled';
    orderBook.set(orderId, order);

    console.log(`Order cancelled: ${orderId}`);

    return c.json({ message: 'Order cancelled successfully' });

  } catch (error) {
    console.error('Order cancellation failed:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/orders/pending - Get pending orders for matching
 */
app.get('/api/orders/pending', async (c) => {
  try {
    const pendingOrders = Array.from(orderBook.values())
      .filter(order => order.status === 'pending' && order.expiry > Math.floor(Date.now() / 1000));

    return c.json({
      orders: pendingOrders,
      total: pendingOrders.length
    });

  } catch (error) {
    console.error('Pending orders retrieval failed:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/matches - Get order matches
 */
app.get('/api/matches', async (c) => {
  try {
    const matches = Array.from(orderMatches.values());

    return c.json({
      matches,
      total: matches.length
    });

  } catch (error) {
    console.error('Matches retrieval failed:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

app.get('/health', async (c) => {
  try {
    // Check EVM connectivity
    const blockNumber = await publicClient.getBlockNumber();

    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      blockchain: {
        connected: true,
        blockNumber: blockNumber.toString(),
        chainId: anvil.id
      },
      orderbook: {
        totalOrders: orderBook.size,
        pendingOrders: Array.from(orderBook.values()).filter(o => o.status === 'pending').length,
        totalMatches: orderMatches.size
      }
    });

  } catch (error) {
    console.error('Health check failed:', error);
    return c.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: (error as Error).message
    }, 503);
  }
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const port = parseInt(process.env.PORT || '3001');

console.log('🚀 Starting EVM Orderbook Server with ERC-3643 Compliance...');
console.log(`📡 Chain: ${anvil.name} (ID: ${anvil.id})`);
console.log(`🔗 RPC: ${process.env.VITE_EVM_RPC_URL || 'http://127.0.0.1:8545'}`);
console.log(`📊 Port: ${port}`);

export default {
  port,
  fetch: app.fetch,
};