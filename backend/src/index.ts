import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth";
import { auth } from "./lib/auth";
import { securityHeadersMiddleware, httpsEnforcementMiddleware } from "./lib/security-headers";

import { DatabaseService, type DatabaseConfig } from "./services/database";
import { PropertiesService } from "./services/properties";
import { PropertyManagementService } from "./services/properties-management";
import { OnboardingService } from "./services/onboarding";
import { ERC3643ContractsService, type EVMNetwork } from "./services/contracts";
import { TrexContractsService } from "./services/trex-contracts";
import { PropertyTokenFactoryService } from "./services/property-token-factory-updated";
import { IdentityRegistryService } from "./services/identity-registry";
import { SettlementService } from "./services/settlement";

import { UploadImageService } from "./services/upload-image";
import { UploadDocsService } from "./services/upload-docs";

import { PriceService } from "./services/price-service";
import { MarketStatsService } from "./services/market-stats";
import { SystemAdminService } from "./services/system-admin";
import { AIInsightsService } from "./services/ai-insights";

import { IdentityService } from "./services/identity";
import { ComplianceService } from "./services/compliance";
import { MonitoringService, monitoringService } from "./services/monitoring";
import { UserProfileService } from "./services/user-profile";
import { UserWalletService } from "./services/user-wallet";
import { createWalletClient, http, encodeFunctionData, type WalletClient, type Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base, mainnet } from 'viem/chains'

// Import contract integration endpoints
import { registerContractIntegrationEndpoints } from "./routes/contract-integration";

// Define context variables type
interface ContextVariables {
  user: any | null;
  session: any | null;
}


// Helper function to safely convert string to Address type
function toAddress(value: string | undefined): Address {
  if (!value || !value.startsWith('0x')) {
    return "0x0000000000000000000000000000000000000000" as Address;
  }
  return value as Address;
}

// Initialize Viem wallet client for EVM operations
let walletClient: WalletClient | null = null;
try {
  // Get chain based on environment
  const chain = process.env.EVM_NETWORK === 'mainnet' ? mainnet : base;

  // Use private key if available, otherwise create client without account for read-only operations
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  if (privateKey) {
    const account = privateKeyToAccount(`0x${privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey}` as `0x${string}`);
    walletClient = createWalletClient({
      account,
      chain,
      transport: http()
    });
  } else {
    // Create wallet client without account for read-only operations
    walletClient = createWalletClient({
      chain,
      transport: http()
    });
    console.warn("No WALLET_PRIVATE_KEY provided - wallet operations will be limited");
  }
} catch (error) {
  console.warn("Failed to initialize Viem wallet client:", error);
  console.warn("Using mock wallet client for development");
}


// Initialize database and services
let databaseService: DatabaseService | null = null;
let propertiesService: PropertiesService | null = null;
let propertyManagementService: PropertyManagementService | null = null;
let onboardingService: OnboardingService | null = null;
let contractsService: ERC3643ContractsService | null = null;
let trexContractsService: TrexContractsService | null = null;
let propertyTokenFactoryService: PropertyTokenFactoryService | null = null;
let identityRegistryService: IdentityRegistryService | null = null;
let settlementService: SettlementService | null = null;
let uploadImageService: UploadImageService | null = null;
let uploadDocsService: UploadDocsService | null = null;
let priceService: PriceService | null = null;
let marketStatsService: MarketStatsService | null = null;
let systemAdminService: SystemAdminService | null = null;
let aiInsightsService: AIInsightsService | null = null;
let identityService: IdentityService | null = null;
let complianceService: ComplianceService | null = null;
let userProfileService: UserProfileService | null = null;
let userWalletService: UserWalletService | null = null;

try {
  // Get database configuration from environment
  const databaseConfig: DatabaseConfig = {
    connectionString: process.env.DATABASE_URL || 'postgresql://evm_fsq_user:evm_fsq_password@localhost:5433/evm_fsq_db',
    max: parseInt(process.env.PG_POOL_MAX || '10'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  databaseService = new DatabaseService(databaseConfig);
  propertiesService = new PropertiesService(databaseService.getPool());
  propertyManagementService = new PropertyManagementService(databaseService.getPool());
  onboardingService = new OnboardingService(databaseService.getPool());
  
  // Initialize price service for real-time price updates
  priceService = new PriceService(databaseService.getPool());
  
  // Initialize market stats service
  marketStatsService = new MarketStatsService(databaseService.getPool());
  
  // Initialize system admin service
  systemAdminService = new SystemAdminService(databaseService);

  // Initialize AI insights service
  aiInsightsService = new AIInsightsService(databaseService.getPool());

  // Initialize contracts service for EVM networks
  contractsService = new ERC3643ContractsService(
    (process.env.EVM_NETWORK as EVMNetwork) || 'devnet'
  );

  // Initialize identity service (after contractsService)
  identityService = new IdentityService(
    contractsService['publicClient'],
    contractsService['walletClient']!,
    toAddress(process.env.IDENTITY_REGISTRY_ADDRESS)
  );

  // Initialize compliance service (after contractsService)
  complianceService = new ComplianceService(
    contractsService['publicClient'],
    contractsService['walletClient']!,
    toAddress(process.env.COMPLIANCE_ADDRESS)
  );

  // Initialize user profile service
  userProfileService = new UserProfileService(databaseService.getPool());

  // Initialize user wallet service
  userWalletService = new UserWalletService(databaseService.getPool());

  // Initialize TREX contracts service
  trexContractsService = new TrexContractsService(contractsService!);

  // Initialize property token factory service
  propertyTokenFactoryService = new PropertyTokenFactoryService(
    contractsService!,
    databaseService.getPool(),
    //toAddress(process.env.TREX_FACTORY_ADDRESS)
  );

  // Initialize identity registry service
  identityRegistryService = new IdentityRegistryService(
    contractsService['publicClient'],
    contractsService['walletClient']!,
    databaseService.getPool(),
    toAddress(process.env.IDENTITY_REGISTRY_ADDRESS),
    toAddress(process.env.ONCHAIN_ID_ADDRESS)
  );

  // Initialize settlement service
  settlementService = new SettlementService(
    contractsService['publicClient'],
    contractsService['walletClient']!,
    databaseService.getPool(),
    toAddress(process.env.SETTLEMENT_CONTRACT_ADDRESS)
  );

  
  // Initialize upload services
  uploadImageService = new UploadImageService(databaseService.getPool());
  uploadDocsService = new UploadDocsService(databaseService.getPool());
  
  console.log("🔋Database and services initialized successfully");
} catch (error) {
  console.error("Failed to initialize database services:", error);
}

const app = new Hono<{ Variables: ContextVariables }>();

// CORS configuration for frontend integration
app.use(
  "*",
  cors({
    origin: (origin) => {
      // Allow localhost on any port for development
      if (origin?.startsWith('http://localhost:')) return origin;
      // Allow the staging domain
      if (origin === 'https://dev.farsquare.xyz') return origin;
      // Allow requests with no origin (like mobile apps or curl requests)
      // Allow the production domain
      if (origin === 'https://farsquare.xyz') return origin;
      //...(process.env.ALLOWED_ORIGINS?.split(',') || []), // Additional origins from env
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return origin;
      return null;
    },
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    allowMethods: ["POST", "GET", "OPTIONS", "PUT", "DELETE"],
    credentials: true,
    maxAge: 86400, // 24 hours
  })
);

// HTTPS enforcement middleware (applied before other middleware)
app.use("/*", httpsEnforcementMiddleware);

// Additional security headers for all endpoints
app.use("/*", securityHeadersMiddleware);

// Additional security headers for auth endpoints (enhanced)
app.use("/api/auth/*", async (c, next) => {
  // Enhanced security for auth endpoints - additional checks can be added here
  await next();
});


// Mount auth routes
app.route("/", authRoutes);

// Session middleware (optional, for protected routes)
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    return next();
  }

  c.set("user", session.user);
  c.set("session", session.session);
  return next();
});

// Protected route example
app.get("/api/protected", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return c.json({ message: "Protected data", user });
});

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============================================================================
// USER API ENDPOINTS
// ============================================================================

// Create user profile
app.post("/api/users", async (c) => {
  try {
    const { evmAddress, walletType, publicKey } = await c.req.json();

    if (!evmAddress) {
      return c.json({ error: "evmAddress is required" }, 400);
    }

    if (!databaseService) {
      return c.json({ error: "Database service not initialized" }, 500);
    }

    // Check if user already exists
    const existingUser = await databaseService.getPool().query(
      "SELECT id FROM public.profiles WHERE evm_address = $1",
      [evmAddress]
    );

    if (existingUser.rows.length > 0) {
      return c.json({
        success: true,
        data: existingUser.rows[0],
        message: "User already exists"
      });
    }

    // Create new user profile
    const result = await databaseService.getPool().query(`
      INSERT INTO public.profiles (
        evm_address, wallet_type, public_key, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, evm_address, wallet_type, public_key, created_at
    `, [evmAddress, walletType || 'unknown', publicKey]);

    return c.json({
      success: true,
      data: result.rows[0],
      message: "User profile created successfully"
    });
  } catch (error) {
    console.error("Create user error:", error);
    return c.json({
      success: false,
      error: "Failed to create user profile",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get user profile by EVM address
app.get("/api/users/profile/:evmAddress", async (c) => {
  try {
    const evmAddress = c.req.param("evmAddress");

    if (!evmAddress) {
      return c.json({ error: "EVM address is required" }, 400);
    }

    if (!userProfileService) {
      return c.json({ error: "User profile service not initialized" }, 500);
    }

    const profileResult = await userProfileService.getUserProfile(evmAddress);

    if (!profileResult.success) {
      return c.json({
        success: false,
        error: profileResult.error,
      }, 404);
    }

    return c.json({
      success: true,
      data: profileResult.data,
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    return c.json({
      success: false,
      error: "Failed to get user profile",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get user profile by user ID
app.get("/api/users/profile/id/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");

    if (!userId) {
      return c.json({ error: "User ID is required" }, 400);
    }

    if (!userProfileService) {
      return c.json({ error: "User profile service not initialized" }, 500);
    }

    const profileResult = await userProfileService.getUserProfileById(userId);

    if (!profileResult.success) {
      return c.json({
        success: false,
        error: profileResult.error,
      }, 404);
    }

    return c.json({
      success: true,
      data: profileResult.data,
    });
  } catch (error) {
    console.error("Get user profile by ID error:", error);
    return c.json({
      success: false,
      error: "Failed to get user profile by ID",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Update user profile
app.put("/api/users/profile/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const updates = await c.req.json();

    if (!userId) {
      return c.json({ error: "User ID is required" }, 400);
    }

    if (!updates || Object.keys(updates).length === 0) {
      return c.json({ error: "Updates object is required" }, 400);
    }

    if (!userProfileService) {
      return c.json({ error: "User profile service not initialized" }, 500);
    }

    const updateResult = await userProfileService.updateUserProfile(userId, updates);

    if (!updateResult.success) {
      return c.json({
        success: false,
        error: updateResult.error,
      }, 400);
    }

    return c.json({
      success: true,
      data: updateResult.data,
      message: "User profile updated successfully"
    });
  } catch (error) {
    console.error("Update user profile error:", error);
    return c.json({
      success: false,
      error: "Failed to update user profile",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Check if user profile exists
app.get("/api/users/profile/exists/:evmAddress", async (c) => {
  try {
    const evmAddress = c.req.param("evmAddress");

    if (!evmAddress) {
      return c.json({ error: "EVM address is required" }, 400);
    }

    if (!userProfileService) {
      return c.json({ error: "User profile service not initialized" }, 500);
    }

    const existsResult = await userProfileService.userProfileExists(evmAddress);

    if (!existsResult.success) {
      return c.json({
        success: false,
        error: existsResult.error,
      }, 500);
    }

    return c.json({
      success: true,
      data: {
        exists: existsResult.data,
      },
    });
  } catch (error) {
    console.error("Check user profile exists error:", error);
    return c.json({
      success: false,
      error: "Failed to check user profile existence",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// ============================================================================
// WALLET API ENDPOINTS
// ============================================================================

// Wallet endpoints - EVM compatible using Viem
app.post("/api/wallets", async (c) => {
  try {
    const { walletName } = await c.req.json();

    if (!walletName) {
      return c.json({ error: "walletName is required" }, 400);
    }

    if (!walletClient) {
      return c.json({ error: "Wallet client not initialized" }, 500);
    }

    // For EVM, we create a wallet by generating an account from a private key
    // In production, this would typically be handled by a wallet provider or custodian
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) {
      return c.json({
        error: "No private key available for wallet creation",
        message: "Configure WALLET_PRIVATE_KEY environment variable"
      }, 500);
    }

    const account = privateKeyToAccount(`0x${privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey}` as `0x${string}`);

    return c.json({
      success: true,
      data: {
        walletId: walletName, // Use wallet name as ID for simplicity
        address: account.address,
        accounts: [{
          address: account.address,
          publicKey: account.publicKey,
        }],
      },
      message: "EVM wallet initialized successfully"
    });
  } catch (error) {
    console.error("Wallet creation error:", error);
    return c.json({
      success: false,
      error: "Failed to create wallet",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.get("/api/wallets/:walletId", async (c) => {
  try {
    const walletId = c.req.param("walletId");

    if (!walletClient) {
      return c.json({ error: "Wallet client not initialized" }, 500);
    }

    // For EVM, wallet information is derived from the configured account
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) {
      return c.json({
        error: "No private key available",
        message: "Configure WALLET_PRIVATE_KEY environment variable"
      }, 500);
    }

    const account = privateKeyToAccount(`0x${privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey}` as `0x${string}`);

    return c.json({
      success: true,
      data: {
        walletId,
        address: account.address,
        accounts: [{
          address: account.address,
          publicKey: account.publicKey,
        }],
        chain: process.env.EVM_NETWORK === 'mainnet' ? 'mainnet' : 'base',
      },
    });
  } catch (error) {
    console.error("Get wallet error:", error);
    return c.json({
      success: false,
      error: "Failed to get wallet",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.get("/api/wallets", async (c) => {
  try {
    if (!walletClient) {
      return c.json({ error: "Wallet client not initialized" }, 500);
    }

    // For EVM, we return the configured wallet
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) {
      return c.json({
        error: "No private key available",
        message: "Configure WALLET_PRIVATE_KEY environment variable"
      }, 500);
    }

    const account = privateKeyToAccount(`0x${privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey}` as `0x${string}`);

    return c.json({
      success: true,
      data: [{
        walletId: 'default-wallet',
        address: account.address,
        accounts: [{
          address: account.address,
          publicKey: account.publicKey,
        }],
        chain: process.env.EVM_NETWORK === 'mainnet' ? 'mainnet' : 'base',
        createdAt: new Date().toISOString(),
      }],
    });
  } catch (error) {
    console.error("List wallets error:", error);
    return c.json({
      success: false,
      error: "Failed to list wallets",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Sign transaction data using Viem patterns for EVM
app.post("/api/sign", async (c) => {
  try {
    const { payload, signWith } = await c.req.json();

    if (!payload || !signWith) {
      return c.json({ error: "payload and signWith are required" }, 400);
    }

    // Validate EVM address format
    if (!signWith.startsWith('0x') || signWith.length !== 42) {
      return c.json({ error: "signWith must be a valid EVM address" }, 400);
    }

    if (!walletClient) {
      return c.json({ error: "Wallet client not initialized" }, 500);
    }

    // For EVM signing, we use the wallet client to sign messages
    // Note: This assumes the signWith address matches our configured account
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) {
      return c.json({
        error: "No private key available for signing",
        message: "Configure WALLET_PRIVATE_KEY environment variable"
      }, 500);
    }

    const account = privateKeyToAccount(`0x${privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey}` as `0x${string}`);

    // Verify the signWith address matches our account
    if (account.address.toLowerCase() !== signWith.toLowerCase()) {
      return c.json({
        error: "Address mismatch",
        message: `Cannot sign with ${signWith}, configured account is ${account.address}`
      }, 400);
    }

    // Sign the message using Viem
    const signature = await account.signMessage({
      message: payload.startsWith('0x') ? { raw: payload as `0x${string}` } : payload
    });

    return c.json({
      success: true,
      data: {
        signature,
        address: account.address,
        signedAt: new Date().toISOString()
      },
    });
  } catch (error) {
    console.error("Signing error:", error);
    return c.json({
      success: false,
      error: "Failed to sign payload",
      details: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});

// ============================================================================
// USER WALLET API ENDPOINTS
// ============================================================================

// Get user wallet balances across all supported networks
app.get("/api/wallet/balances/:evmAddress", async (c) => {
  try {
    const evmAddress = c.req.param("evmAddress");

    if (!evmAddress) {
      return c.json({ error: "EVM address is required" }, 400);
    }

    if (!evmAddress.startsWith('0x') || evmAddress.length !== 42) {
      return c.json({ error: "Invalid EVM address format" }, 400);
    }

    if (!userWalletService) {
      return c.json({ error: "User wallet service not initialized" }, 500);
    }

    const balancesResult = await userWalletService.getWalletBalancesSerialized(evmAddress as Address);

    if (!balancesResult.success) {
      return c.json({
        success: false,
        error: balancesResult.error,
      }, 500);
    }

    return c.json({
      success: true,
      data: balancesResult.data,
    });
  } catch (error) {
    console.error("Get wallet balances error:", error);
    return c.json({
      success: false,
      error: "Failed to get wallet balances",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get user recent transactions across all supported networks
app.get("/api/wallet/transactions/:evmAddress", async (c) => {
  try {
    const evmAddress = c.req.param("evmAddress");
    const limit = parseInt(c.req.query("limit") || "20");

    if (!evmAddress) {
      return c.json({ error: "EVM address is required" }, 400);
    }

    if (!evmAddress.startsWith('0x') || evmAddress.length !== 42) {
      return c.json({ error: "Invalid EVM address format" }, 400);
    }

    if (limit < 1 || limit > 100) {
      return c.json({ error: "Limit must be between 1 and 100" }, 400);
    }

    if (!userWalletService) {
      return c.json({ error: "User wallet service not initialized" }, 500);
    }

    const transactionsResult = await userWalletService.getRecentTransactionsSerialized(evmAddress as Address, limit);

    if (!transactionsResult.success) {
      return c.json({
        success: false,
        error: transactionsResult.error,
      }, 500);
    }

    return c.json({
      success: true,
      data: transactionsResult.data,
    });
  } catch (error) {
    console.error("Get wallet transactions error:", error);
    return c.json({
      success: false,
      error: "Failed to get wallet transactions",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get complete wallet information
app.get("/api/wallet/:evmAddress", async (c) => {
  try {
    const evmAddress = c.req.param("evmAddress");

    if (!evmAddress) {
      return c.json({ error: "EVM address is required" }, 400);
    }

    if (!evmAddress.startsWith('0x') || evmAddress.length !== 42) {
      return c.json({ error: "Invalid EVM address format" }, 400);
    }

    if (!userWalletService) {
      return c.json({ error: "User wallet service not initialized" }, 500);
    }

    const walletResult = await userWalletService.getWalletInfoSerialized(evmAddress as Address);

    if (!walletResult.success) {
      return c.json({
        success: false,
        error: walletResult.error,
      }, 500);
    }

    return c.json({
      success: true,
      data: walletResult.data,
    });
  } catch (error) {
    console.error("Get wallet info error:", error);
    return c.json({
      success: false,
      error: "Failed to get wallet information",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Check if wallet has activity on supported networks
app.get("/api/wallet/activity/:evmAddress", async (c) => {
  try {
    const evmAddress = c.req.param("evmAddress");

    if (!evmAddress) {
      return c.json({ error: "EVM address is required" }, 400);
    }

    if (!evmAddress.startsWith('0x') || evmAddress.length !== 42) {
      return c.json({ error: "Invalid EVM address format" }, 400);
    }

    if (!userWalletService) {
      return c.json({ error: "User wallet service not initialized" }, 500);
    }

    const activityResult = await userWalletService.hasWalletActivity(evmAddress as Address);

    if (!activityResult.success) {
      return c.json({
        success: false,
        error: activityResult.error,
      }, 500);
    }

    return c.json({
      success: true,
      data: {
        hasActivity: activityResult.data,
      },
    });
  } catch (error) {
    console.error("Check wallet activity error:", error);
    return c.json({
      success: false,
      error: "Failed to check wallet activity",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get supported wallet networks
app.get("/api/wallet/networks", async (c) => {
  try {
    if (!userWalletService) {
      return c.json({ error: "User wallet service not initialized" }, 500);
    }

    const networks = userWalletService.getSupportedNetworks();

    return c.json({
      success: true,
      data: {
        networks,
        count: networks.length,
      },
    });
  } catch (error) {
    console.error("Get wallet networks error:", error);
    return c.json({
      success: false,
      error: "Failed to get supported networks",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get asset prices for USD calculations in frontend
app.get("/api/prices", async (c) => {
  try {
    if (!priceService) {
      return c.json({ error: "Price service not initialized" }, 500);
    }

    // Get asset prices from price service
    const assetPrices = await priceService.getAssetPrices();

    return c.json({
      success: true,
      data: assetPrices,
    });
  } catch (error) {
    console.error("Get asset prices error:", error);
    return c.json({
      success: false,
      error: "Failed to get asset prices",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Properties API endpoints
app.get("/api/properties", async (c) => {
  try {
    if (!propertiesService) {
      return c.json({ error: "Properties service not initialized" }, 500);
    }

    const properties = await propertiesService.getAllProperties();
    return c.json({
      success: true,
      data: properties,
    });
  } catch (error) {
    console.error("Get properties error:", error);
    return c.json({
      success: false,
      error: "Failed to get properties",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.get("/api/properties/search", async (c) => {
  try {
    const { q, type, price_min, price_max, yield_min, risk } = c.req.query();

    if (!propertiesService) {
      return c.json({ error: "Properties service not initialized" }, 500);
    }

    const filters = {
      search: q as string,
      propertyType: type as string,
      priceRange: price_min && price_max ? `${price_min}-${price_max}` : undefined,
      yieldRange: yield_min ? `min-${yield_min}` : undefined,
      riskLevel: risk as string,
    };

    const properties = await propertiesService.searchProperties(filters);

    return c.json({
      success: true,
      data: properties,
    });
  } catch (error) {
    console.error("Properties search error:", error);
    return c.json({
      success: false,
      error: "Failed to search properties",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.get("/api/properties/:id", async (c) => {
  try {
    const id = c.req.param("id");

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return c.json({ error: "Invalid property ID format" }, 400);
    }

    if (!propertiesService) {
      return c.json({ error: "Properties service not initialized" }, 500);
    }

    const property = await propertiesService.getPropertyById(id);

    if (!property) {
      return c.json({ error: "Property not found" }, 404);
    }

    return c.json({
      success: true,
      data: property,
    });
  } catch (error) {
    console.error("Get property error:", error);
    return c.json({
      success: false,
      error: "Failed to get property",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.get("/api/properties/type/:type", async (c) => {
  try {
    const type = c.req.param("type");

    if (!propertiesService) {
      return c.json({ error: "Properties service not initialized" }, 500);
    }

    const properties = await propertiesService.getPropertiesByType(type);
    return c.json({
      success: true,
      data: properties,
    });
  } catch (error) {
    console.error("Get properties by type error:", error);
    return c.json({
      success: false,
      error: "Failed to get properties by type",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.get("/api/properties/risk/:risk", async (c) => {
  try {
    const risk = c.req.param("risk");

    if (!propertiesService) {
      return c.json({ error: "Properties service not initialized" }, 500);
    }

    const properties = await propertiesService.getPropertiesByRisk(risk);
    return c.json({
      success: true,
      data: properties,
    });
  } catch (error) {
    console.error("Get properties by risk error:", error);
    return c.json({
      success: false,
      error: "Failed to get properties by risk",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.get("/api/marketplace/listings", async (c) => {
  try {
    if (!propertiesService) {
      return c.json({ error: "Properties service not initialized" }, 500);
    }

    const listings = await propertiesService.getMarketplaceListings();
    return c.json({
      success: true,
      data: listings,
    });
  } catch (error) {
    console.error("Get marketplace listings error:", error);
    return c.json({
      success: false,
      error: "Failed to get marketplace listings",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.get("/api/marketplace/listings/:id", async (c) => {
  try {
    const id = c.req.param("id");

    if (!propertiesService) {
      return c.json({ error: "Properties service not initialized" }, 500);
    }

    const listing = await propertiesService.getMarketplaceListingById(id);

    if (!listing) {
      return c.json({ error: "Marketplace listing not found" }, 404);
    }

    return c.json({
      success: true,
      data: listing,
    });
  } catch (error) {
    console.error("Get marketplace listing error:", error);
    return c.json({
      success: false,
      error: "Failed to get marketplace listing",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Portfolio API endpoint
app.get("/api/portfolio/:evmAddress", async (c) => {
  try {
    const evmAddress = c.req.param("evmAddress");

    if (!evmAddress) {
      return c.json({ error: "EVM address is required" }, 400);
    }

    if (!propertiesService) {
      return c.json({ error: "Properties service not initialized" }, 500);
    }

    // Get user's property holdings from the database
    const portfolio = await propertiesService.getUserPortfolio(evmAddress);

    return c.json({
      success: true,
      data: portfolio,
    });
  } catch (error) {
    console.error("Get portfolio error:", error);
    return c.json({
      success: false,
      error: "Failed to get portfolio",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Property compliance check
app.get("/api/properties/:id/compliance/:userId", async (c) => {
  try {
    const propertyId = c.req.param("id");
    const userId = c.req.param("userId");

    // Validate property ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(propertyId)) {
      return c.json({ error: "Invalid property ID format" }, 400);
    }

    if (!propertiesService) {
      return c.json({ error: "Properties service not initialized" }, 500);
    }

    const complianceStatus = await propertiesService.checkPropertyCompliance(propertyId, userId);

    return c.json({
      success: true,
      data: complianceStatus,
    });
  } catch (error) {
    console.error("Property compliance check error:", error);
    return c.json({
      success: false,
      error: "Failed to check compliance",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Property market data
app.get("/api/properties/:id/market", async (c) => {
  try {
    const propertyId = c.req.param("id");

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(propertyId)) {
      return c.json({ error: "Invalid property ID format" }, 400);
    }

    if (!propertiesService) {
      return c.json({ error: "Properties service not initialized" }, 500);
    }

    const marketData = await propertiesService.getPropertyMarketData(propertyId);

    return c.json({
      success: true,
      data: marketData,
    });
  } catch (error) {
    console.error("Property market data error:", error);
    return c.json({
      success: false,
      error: "Failed to get market data",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Property owner data
app.get("/api/properties/:id/owner", async (c) => {
  try {
    const propertyId = c.req.param("id");

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(propertyId)) {
      return c.json({ error: "Invalid property ID format" }, 400);
    }

    if (!propertiesService) {
      return c.json({ error: "Properties service not initialized" }, 500);
    }

    const ownerData = await propertiesService.getPropertyOwnerData(propertyId);

    return c.json({
      success: true,
      data: ownerData,
    });
  } catch (error) {
    console.error("Property owner data error:", error);
    return c.json({
      success: false,
      error: "Failed to get owner data",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Update property details (owner only)
app.put("/api/properties/:id", async (c) => {
  try {
    const propertyId = c.req.param("id");
    const updates = await c.req.json();

    // Validate property ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(propertyId)) {
      return c.json({ error: "Invalid property ID format" }, 400);
    }

    if (!propertiesService) {
      return c.json({ error: "Properties service not initialized" }, 500);
    }

    const result = await propertiesService.updatePropertyDetails(propertyId, updates);

    return c.json({
      success: true,
      data: result,
      message: "Property updated successfully"
    });
  } catch (error) {
    console.error("Update property details error:", error);
    return c.json({
      success: false,
      error: "Failed to update property",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Upload property documents (owner only)
app.post("/api/properties/:id/documents", async (c) => {
  try {
    const propertyId = c.req.param("id");

    // Validate property ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(propertyId)) {
      return c.json({ error: "Invalid property ID format" }, 400);
    }

    if (!propertiesService) {
      return c.json({ error: "Properties service not initialized" }, 500);
    }

    // Handle file upload
    const formData = await c.req.formData();
    const file = formData.get('document') as File;

    if (!file) {
      return c.json({ error: "No document file provided" }, 400);
    }

    const result = await propertiesService.uploadPropertyDocument(propertyId, file);

    return c.json({
      success: true,
      data: result,
      message: "Document uploaded successfully"
    });
  } catch (error) {
    console.error("Upload property document error:", error);
    return c.json({
      success: false,
      error: "Failed to upload document",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Mint additional tokens using ERC-3643 TREX contracts
app.post("/api/properties/:id/tokens/mint", async (c) => {
  try {
    const propertyId = c.req.param("id");
    const { amount, recipientAddress } = await c.req.json();

    // Validate property ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(propertyId)) {
      return c.json({ error: "Invalid property ID format" }, 400);
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return c.json({ error: "Valid amount is required" }, 400);
    }

    if (!recipientAddress || !recipientAddress.startsWith('0x')) {
      return c.json({ error: "Valid recipient EVM address is required" }, 400);
    }

    if (!propertiesService || !contractsService) {
      return c.json({ error: "Required services not initialized" }, 500);
    }

    // Get property token contract address from database
    const property = await propertiesService.getPropertyById(propertyId);
    if (!property) {
      return c.json({ error: "Property not found" }, 404);
    }

    const tokenAddress = property.contract_address as Address;

    // Use contractsService directly for minting (ERC-3643 tokens use standard mint function)
    const mintResult = await contractsService.writeContract({
      address: tokenAddress,
      functionName: 'mint',
      args: [recipientAddress as Address, BigInt(amount)]
    });

    if (!mintResult.success) {
      return c.json({
        success: false,
        error: mintResult.error
      }, 400);
    }

    return c.json({
      success: true,
      data: mintResult.data,
      message: `${amount} tokens minted successfully to ${recipientAddress}`
    });
  } catch (error) {
    console.error("Mint property tokens error:", error);
    return c.json({
      success: false,
      error: "Failed to mint tokens",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Send message to investors (owner only)
app.post("/api/properties/:id/investors/message", async (c) => {
  try {
    const propertyId = c.req.param("id");
    const { subject, message, recipientType } = await c.req.json();

    // Validate property ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(propertyId)) {
      return c.json({ error: "Invalid property ID format" }, 400);
    }

    if (!subject || !message) {
      return c.json({ error: "Subject and message are required" }, 400);
    }

    if (!propertiesService) {
      return c.json({ error: "Properties service not initialized" }, 500);
    }

    const result = await propertiesService.sendInvestorMessage(propertyId, {
      subject,
      message,
      recipientType: recipientType || 'all'
    });

    return c.json({
      success: true,
      data: result,
      message: "Message sent to investors successfully"
    });
  } catch (error) {
    console.error("Send investor message error:", error);
    return c.json({
      success: false,
      error: "Failed to send message",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Contract interaction endpoints

// Build contract call payload using Viem encoding for ERC-3643
app.post("/api/contracts/build-call", async (c) => {
  try {
    const { contractAddress, functionName, functionArgs, value } = await c.req.json();

    if (!contractAddress || !functionName) {
      return c.json({ error: "contractAddress and functionName are required" }, 400);
    }

    if (!contractsService) {
      return c.json({ error: "Contracts service not initialized" }, 500);
    }

    // Use Viem's encodeFunctionData directly
    const abi = contractsService.getAbiItem(contractAddress as Address);
    const encodedData = encodeFunctionData(abi as any);
      
    /*const encodedData = encodeFunctionData({
      abi,
      functionName,
      args: functionArgs || []
    });*/

    return c.json({
      success: true,
      data: {
        to: contractAddress,
        data: encodedData,
        value: value || "0x0"
      },
    });
  } catch (error) {
    console.error("Build contract call error:", error);
    return c.json({
      success: false,
      error: "Failed to build contract call",
      details: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});

// Read-only contract call using Viem for ERC-3643
app.post("/api/contracts/read-only", async (c) => {
  try {
    const { contractAddress, functionName, functionArgs } = await c.req.json();

    if (!contractAddress || !functionName) {
      return c.json({ error: "contractAddress and functionName are required" }, 400);
    }

    if (!contractsService) {
      return c.json({ error: "Contracts service not initialized" }, 500);
    }

    // Use Viem readContract for ERC-3643 read operations
    const result = await contractsService.readContract({
      address: contractAddress as Address,
      functionName,
      args: functionArgs || []
    });

    return c.json(result);
  } catch (error) {
    console.error("Read-only contract call error:", error);
    return c.json({
      success: false,
      error: "Failed to execute read-only call",
      details: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});

// Check agent permissions using ERC-3643 agent management
app.get("/api/contracts/permissions/:principal/:tokenAddress", async (c) => {
  try {
    const principal = c.req.param("principal");
    const tokenAddress = c.req.param("tokenAddress");

    if (!trexContractsService) {
      return c.json({ error: "TREX contracts service not initialized" }, 500);
    }

    // Use ERC-3643 isAgent method to check permissions
    const result = await trexContractsService.isAgent(
      principal as Address,
      tokenAddress as Address
    );

    return c.json(result);
  } catch (error) {
    console.error("Check agent permissions error:", error);
    return c.json({
      success: false,
      error: "Failed to check permissions",
      details: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});

// Get token balance using ERC-20 balanceOf for ERC-3643
app.get("/api/contracts/balance/:principal/:tokenContract", async (c) => {
  try {
    const principal = c.req.param("principal");
    const tokenContract = c.req.param("tokenContract");

    if (!contractsService) {
      return c.json({ error: "Contracts service not initialized" }, 500);
    }

    // Use ERC-20 balanceOf method (ERC-3643 tokens are ERC-20 compliant)
    const result = await contractsService.readContract<bigint>({
      address: tokenContract as Address,
      functionName: 'balanceOf',
      args: [principal as Address]
    });

    if (!result.success) {
      return c.json({
        success: false,
        error: result.error || "Failed to get token balance"
      }, 500);
    }

    return c.json({
      success: true,
      data: {
        balance: result.data?.toString() || "0",
        balanceBigInt: result.data || 0n,
      },
    });
  } catch (error) {
    console.error("Get token balance error:", error);
    return c.json({
      success: false,
      error: "Failed to get token balance",
      details: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});

// Order execution check - TODO: Implement for ERC-3643 settlement contracts
app.get("/api/contracts/order-executed/:orderHash/:settlementContract", async (c) => {
  try {
    const orderHash = c.req.param("orderHash");
    const settlementContract = c.req.param("settlementContract");

    // TODO: Implement order execution checking for ERC-3643 settlement contracts
    // This requires implementing settlement contract interaction patterns

    return c.json({
      success: false,
      error: "Order execution checking not yet implemented for ERC-3643",
      orderHash,
      settlementContract
    }, 501); // Not Implemented
  } catch (error) {
    console.error("Check order executed error:", error);
    return c.json({
      success: false,
      error: "Failed to check order execution",
      details: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});

// Create and sign order
app.post("/api/orders/sign", async (c) => {
  try {
    const { order, privateKey } = await c.req.json();

    if (!order || !privateKey) {
      return c.json({ error: "order and privateKey are required" }, 400);
    }

    // Validate order structure
    const requiredFields = ['chain', 'contract', 'propertyId', 'side', 'pricePerShare', 'quantity', 'wallet', 'nonce', 'expiry'];
    for (const field of requiredFields) {
      if (!(field in order)) {
        return c.json({ error: `Missing required field: ${field}` }, 400);
      }
    }

    // TODO: Implement order signing functionality
    // Temporary mock response
    return c.json({
      success: true,
      data: {
        order,
        signature: "mock_signature_" + Date.now(),
        signedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Sign order error:", error);
    return c.json({
      success: false,
      error: "Failed to sign order",
      details: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});

// Canonicalize order (for testing/verification)
app.post("/api/orders/canonicalize", async (c) => {
  try {
    const order = await c.req.json();

    // TODO: Implement order canonicalization functionality
    // Temporary mock response
    return c.json({
      success: true,
      data: {
        canonical: JSON.stringify(order),
        hash: "0x" + Buffer.from(JSON.stringify(order)).toString("hex").slice(0, 64),
      },
    });
  } catch (error) {
    console.error("Canonicalize order error:", error);
    return c.json({
      success: false,
      error: "Failed to canonicalize order",
      details: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});

// Contract source - Not applicable for EVM (use block explorers)
app.get("/api/contracts/source/:contractAddress/:contractName", async (c) => {
  try {
    const contractAddress = c.req.param("contractAddress");

    return c.json({
      success: false,
      error: "Contract source retrieval not supported for EVM networks",
      message: "Use block explorers like Etherscan for contract source code",
      contractAddress,
      network: contractsService?.getNetwork() || "unknown"
    }, 501); // Not Implemented
  } catch (error) {
    console.error("Get contract source error:", error);
    return c.json({
      success: false,
      error: "Failed to get contract source",
      details: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});

// Contract interface - Not applicable for EVM (use ABIs)
app.get("/api/contracts/interface/:contractAddress/:contractName", async (c) => {
  try {
    const contractAddress = c.req.param("contractAddress");

    return c.json({
      success: false,
      error: "Contract interface retrieval not supported for EVM networks",
      message: "Use contract ABIs for EVM contract interactions",
      contractAddress,
      network: contractsService?.getNetwork() || "unknown"
    }, 501); // Not Implemented
  } catch (error) {
    console.error("Get contract interface error:", error);
    return c.json({
      success: false,
      error: "Failed to get contract interface",
      details: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});

// Purchase property tokens using ERC-3643 TREX compliant transfers
app.post("/api/properties/purchase", async (c) => {
  try {
    const { propertyId, buyerAddress, quantity } = await c.req.json();

    if (!propertyId || !buyerAddress || !quantity) {
      return c.json({ error: "propertyId, buyerAddress, and quantity are required" }, 400);
    }

    if (!buyerAddress.startsWith('0x') || buyerAddress.length !== 42) {
      return c.json({ error: "buyerAddress must be a valid EVM address" }, 400);
    }

    if (!propertiesService || !trexContractsService) {
      return c.json({ error: "Required services not initialized" }, 500);
    }

    // Get property details from database
    const property = await propertiesService.getPropertyById(propertyId);
    if (!property) {
      return c.json({ error: "Property not found" }, 404);
    }

    // For EVM, we need to get the seller/issuer address from the property owner
    // This would typically come from a marketplace listing or property ownership
    const sellerAddress = property.owner_address || "0x0000000000000000000000000000000000000000";
    const tokenAddress = property.contract_address as Address;
    const transferAmount = BigInt(quantity);

    // Use TREX contracts service for compliant transfer
    const transferResult = await trexContractsService.transfer(
      sellerAddress as Address,
      buyerAddress as Address,
      transferAmount,
      tokenAddress
    );

    if (!transferResult.success) {
      return c.json({
        success: false,
        error: transferResult.error
      }, 400);
    }

    return c.json({
      success: true,
      data: transferResult.data,
      message: `${quantity} tokens purchased successfully`
    });
  } catch (error) {
    console.error("Purchase tokens error:", error);
    return c.json({
      success: false,
      error: "Failed to purchase tokens",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.post("/api/marketplace/listings", async (c) => {
  try {
    const { propertyId, sellerAddress, price, quantity } = await c.req.json();

    if (!propertyId || !sellerAddress || !price || !quantity) {
      return c.json({ error: "propertyId, sellerAddress, price, and quantity are required" }, 400);
    }

    if (!propertiesService) {
      return c.json({ error: "Properties service not initialized" }, 500);
    }

    const listingId = await propertiesService.createMarketplaceListing(propertyId, sellerAddress, price, quantity);

    return c.json({
      success: true,
      data: { listingId },
      message: "Marketplace listing created successfully"
    });
  } catch (error) {
    console.error("Create marketplace listing error:", error);
    return c.json({
      success: false,
      error: "Failed to create marketplace listing",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get token details endpoint - EVM implementation using ERC-3643 contracts
app.get("/api/tokens/:tokenId", async (c) => {
  try {
    const tokenId = c.req.param("tokenId");

    // For EVM, tokenId should be a contract address
    if (!tokenId.startsWith('0x') || tokenId.length !== 42) {
      return c.json({ error: "Invalid EVM contract address format" }, 400);
    }

    if (!contractsService) {
      return c.json({ error: "Contracts service not initialized" }, 500);
    }

    // Get token information using ERC-3643 contract methods
    const tokenInfo = await contractsService.getTokenInfo(tokenId as Address);

    if (!tokenInfo.success) {
      return c.json({
        success: false,
        error: tokenInfo.error || "Failed to retrieve token information"
      }, 404);
    }

    // Get additional compliance information
    const complianceResult = await contractsService.readContract<Address>({
      address: tokenId as Address,
      functionName: 'compliance'
    });

    // Get identity registry information
    const identityRegistryResult = await contractsService.readContract<Address>({
      address: tokenId as Address,
      functionName: 'identityRegistry'
    });

    return c.json({
      success: true,
      data: {
        id: tokenId,
        name: tokenInfo.data.name,
        symbol: tokenInfo.data.symbol,
        contractAddress: tokenId,
        totalSupply: tokenInfo.data.totalSupply,
        decimals: 18, // ERC-3643 tokens are typically 18 decimals
        issuer: tokenInfo.data.owner,
        complianceAddress: complianceResult.success ? complianceResult.data : null,
        identityRegistryAddress: identityRegistryResult.success ? identityRegistryResult.data : null,
        onchainIdAddress: null, // Would need to get from identity registry
        complianceStatus: 'compliant', // Would need proper compliance checking
        createdAt: new Date().toISOString(), // Would need to get from deployment data
        lastActivity: new Date().toISOString(), // Would need to track from events
        network: contractsService.getNetwork(),
        standard: 'ERC-3643'
      },
    });
  } catch (error) {
    console.error("Get token details error:", error);
    return c.json({
      success: false,
      error: "Failed to fetch token details",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get token holders endpoint - EVM implementation
app.get("/api/tokens/:tokenId/holders", async (c) => {
  try {
    const tokenId = c.req.param("tokenId");

    // For EVM, tokenId should be a contract address
    if (!tokenId.startsWith('0x') || tokenId.length !== 42) {
      return c.json({ error: "Invalid EVM contract address format" }, 400);
    }

    if (!contractsService) {
      return c.json({ error: "Contracts service not initialized" }, 500);
    }

    // In EVM, we can't easily enumerate all token holders
    // This would require indexing all Transfer events from the blockchain
    // For now, return a message indicating this functionality needs indexer
    return c.json({
      success: false,
      error: "Token holder enumeration requires blockchain indexer",
      message: "Use block explorer or indexer service to get token holders",
      contractAddress: tokenId,
      network: contractsService.getNetwork()
    }, 501); // Not Implemented

    // TODO: Implement when indexer is available
    // const holders = await indexerService.getTokenHolders(tokenId);
    // return c.json({ success: true, data: holders });

  } catch (error) {
    console.error("Get token holders error:", error);
    return c.json({
      success: false,
      error: "Failed to fetch token holders",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get token transactions endpoint - EVM implementation
app.get("/api/tokens/:tokenId/transactions", async (c) => {
  try {
    const tokenId = c.req.param("tokenId");

    // For EVM, tokenId should be a contract address
    if (!tokenId.startsWith('0x') || tokenId.length !== 42) {
      return c.json({ error: "Invalid EVM contract address format" }, 400);
    }

    if (!contractsService) {
      return c.json({ error: "Contracts service not initialized" }, 500);
    }

    // In EVM, we can't easily enumerate all token transactions without an indexer
    // This would require indexing all Transfer events from the blockchain
    // For now, return a message indicating this functionality needs indexer
    return c.json({
      success: false,
      error: "Token transaction history requires blockchain indexer",
      message: "Use block explorer or indexer service to get transaction history",
      contractAddress: tokenId,
      network: contractsService.getNetwork()
    }, 501); // Not Implemented

    // TODO: Implement when indexer is available
    // const transactions = await indexerService.getTokenTransactions(tokenId);
    // return c.json({ success: true, data: transactions });

  } catch (error) {
    console.error("Get token transactions error:", error);
    return c.json({
      success: false,
      error: "Failed to fetch token transactions",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get tokens list endpoint
app.get("/api/tokens", async (c) => {
  try {
    const { search, complianceStatus, issuer, sortBy, sortOrder } = c.req.query();

    // TODO: Implement actual database queries for tokens
    // For now, return mock data
    const mockTokens = [
      {
        id: 'token-1',
        name: 'Prime Office Complex Token',
        symbol: 'POC',
        contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.poc',
        totalSupply: 1000000,
        circulatingSupply: 750000,
        decimals: 6,
        issuer: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        complianceStatus: 'compliant',
        identityRegistryAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        complianceAddress: 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        createdAt: '2024-01-15T10:00:00Z',
        lastActivity: '2024-01-20T14:30:00Z',
      },
      {
        id: 'token-2',
        name: 'Green Energy Fund Token',
        symbol: 'GEF',
        contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.gef',
        totalSupply: 500000,
        circulatingSupply: 300000,
        decimals: 6,
        issuer: 'ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        complianceStatus: 'compliant',
        identityRegistryAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        complianceAddress: 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        createdAt: '2024-01-10T09:00:00Z',
        lastActivity: '2024-01-19T16:45:00Z',
      },
      {
        id: 'token-3',
        name: 'Real Estate Investment Token',
        symbol: 'REIT',
        contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.reit',
        totalSupply: 2000000,
        circulatingSupply: 1200000,
        decimals: 6,
        issuer: 'ST4PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        complianceStatus: 'pending',
        identityRegistryAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        complianceAddress: 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        createdAt: '2024-01-18T11:30:00Z',
        lastActivity: '2024-01-20T12:00:00Z',
      },
    ];

    // Apply filters
    let filteredTokens = [...mockTokens];

    if (search) {
      const searchLower = search.toLowerCase();
      filteredTokens = filteredTokens.filter(token =>
        token.name.toLowerCase().includes(searchLower) ||
        token.symbol.toLowerCase().includes(searchLower) ||
        token.contractAddress.toLowerCase().includes(searchLower)
      );
    }

    if (complianceStatus && complianceStatus !== 'all') {
      filteredTokens = filteredTokens.filter(token =>
        token.complianceStatus === complianceStatus
      );
    }

    if (issuer) {
      filteredTokens = filteredTokens.filter(token =>
        token.issuer.toLowerCase().includes(issuer.toLowerCase())
      );
    }

    // Apply sorting
    if (sortBy) {
      filteredTokens.sort((a, b) => {
        let aValue: any = a[sortBy as keyof typeof a];
        let bValue: any = b[sortBy as keyof typeof b];

        if (sortBy === 'createdAt' || sortBy === 'lastActivity') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        }
        return bValue > aValue ? 1 : -1;
      });
    }

    return c.json({
      success: true,
      data: filteredTokens,
      total: filteredTokens.length,
    });
  } catch (error) {
    console.error("Get tokens error:", error);
    return c.json({
      success: false,
      error: "Failed to fetch tokens",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// ============================================================================
// ONBOARDING API ENDPOINTS
// ============================================================================

// Start onboarding
app.post("/api/onboarding/start", async (c) => {
  try {
    const data = await c.req.json();

    if (!onboardingService) {
      return c.json({ error: "Onboarding service not initialized" }, 500);
    }

    const result = await onboardingService.startOnboarding(data);

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json(result, 201);
  } catch (error) {
    console.error("Start onboarding error:", error);
    return c.json({
      success: false,
      error: "Failed to start onboarding",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get onboarding status
app.get("/api/onboarding/status/:address", async (c) => {
  try {
    const address = c.req.param("address");

    if (!onboardingService) {
      return c.json({ error: "Onboarding service not initialized" }, 500);
    }

    const result = await onboardingService.getOnboardingStatus(address);

    if (!result.success) {
      return c.json(result, 400);
    }

    // If user has onboarding status, also get their active session info
    let sessionInfo = null;
    if (result.data && result.data.onboardingStatus === 'in_progress') {
      if (!databaseService) {
        return c.json({ error: "Database service not initialized" }, 500);
      }

      const pool = databaseService.getPool();

      const sessionQuery = `
        SELECT session_id, current_step, status
        FROM public.onboarding_sessions
        WHERE user_id = (SELECT id FROM public.profiles WHERE evm_address = $1)
        AND status IN ('pending', 'in_progress', 'active')
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const sessionResult = await pool.query(sessionQuery, [address]);
      if (sessionResult.rows.length > 0) {
        sessionInfo = {
          sessionId: sessionResult.rows[0].session_id,
          currentStep: sessionResult.rows[0].current_step,
          sessionStatus: sessionResult.rows[0].status
        };
      }
    }

    return c.json({
      success: true,
      data: result.data,
      session: sessionInfo
    });
  } catch (error) {
    console.error("Get onboarding status error:", error);
    return c.json({
      success: false,
      error: "Failed to get onboarding status",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get onboarding session
app.get("/api/onboarding/session/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");

    if (!onboardingService) {
      return c.json({ error: "Onboarding service not initialized" }, 500);
    }

    const result = await onboardingService.getSession(sessionId);

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json(result);
  } catch (error) {
    console.error("Get onboarding session error:", error);
    return c.json({
      success: false,
      error: "Failed to get onboarding session",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Complete onboarding step
app.put("/api/onboarding/step", async (c) => {
  try {
    const data = await c.req.json();

    if (!data.sessionId || !data.step) {
      return c.json({ error: "sessionId and step are required" }, 400);
    }

    if (!onboardingService) {
      return c.json({ error: "Onboarding service not initialized" }, 500);
    }

    const result = await onboardingService.completeStep(data);

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json(result);
  } catch (error) {
    console.error("Complete onboarding step error:", error);
    return c.json({
      success: false,
      error: "Failed to complete onboarding step",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Upload KYC document (NEW - using UploadDocsService)
app.post("/api/onboarding/kyc/upload", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('document') as File;
    const userId = formData.get('userId') as string;
    const sessionId = formData.get('sessionId') as string;
    const documentType = formData.get('documentType') as string;

    if (!file || !userId || !sessionId || !documentType) {
      return c.json({ error: "file, userId, sessionId, and documentType are required" }, 400);
    }

    if (!uploadDocsService) {
      return c.json({ error: "Upload docs service not initialized" }, 500);
    }

    const result = await uploadDocsService.uploadDocument({
      userId,
      sessionId,
      documentType,
      file
    });

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({
      success: true,
      data: {
        documentId: result.documentId,
        fileUrl: result.fileUrl,
        fileName: result.fileName
      }
    }, 201);
  } catch (error) {
    console.error("Upload KYC document error:", error);
    return c.json({
      success: false,
      error: "Failed to upload KYC document",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get session documents
app.get("/api/onboarding/kyc/documents/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");

    if (!uploadDocsService) {
      return c.json({ error: "Upload docs service not initialized" }, 500);
    }

    const documents = await uploadDocsService.getSessionDocuments(sessionId);

    return c.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error("Get session documents error:", error);
    return c.json({
      success: false,
      error: "Failed to get documents",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Check required documents
app.get("/api/onboarding/kyc/required/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");

    if (!uploadDocsService) {
      return c.json({ error: "Upload docs service not initialized" }, 500);
    }

    const status = await uploadDocsService.checkRequiredDocuments(sessionId);

    return c.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error("Check required documents error:", error);
    return c.json({
      success: false,
      error: "Failed to check required documents",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Delete document
app.delete("/api/onboarding/kyc/documents/:documentId", async (c) => {
  try {
    const documentId = c.req.param("documentId");
    const userId = c.req.header('X-User-Id') || c.req.query('userId');

    if (!userId) {
      return c.json({ error: "userId is required" }, 400);
    }

    if (!uploadDocsService) {
      return c.json({ error: "Upload docs service not initialized" }, 500);
    }

    const success = await uploadDocsService.deleteDocument(documentId, userId);

    if (!success) {
      return c.json({ error: "Document not found or access denied" }, 404);
    }

    return c.json({
      success: true,
      message: "Document deleted successfully"
    });
  } catch (error) {
    console.error("Delete document error:", error);
    return c.json({
      success: false,
      error: "Failed to delete document",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Update onchain identity
app.post("/api/onboarding/identity", async (c) => {
  try {
    const { userId, identityAddress, countryCode } = await c.req.json();

    if (!userId || !identityAddress) {
      return c.json({ error: "userId and identityAddress are required" }, 400);
    }

    if (!onboardingService) {
      return c.json({ error: "Onboarding service not initialized" }, 500);
    }

    const result = await onboardingService.updateOnchainIdentity(userId, identityAddress, countryCode);

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json(result);
  } catch (error) {
    console.error("Update onchain identity error:", error);
    return c.json({
      success: false,
      error: "Failed to update onchain identity",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Check user onboarding status (simple endpoint)
app.get("/api/users/onboarding-status/:address", async (c) => {
  try {
    const address = c.req.param("address");

    if (!onboardingService) {
      return c.json({ error: "Onboarding service not initialized" }, 500);
    }

    const result = await onboardingService.getOnboardingStatus(address);

    if (!result.success || !result.data) {
      return c.json({ 
        success: false, 
        onboarding_status: 'not_started' 
      });
    }

    return c.json({
      success: true,
      onboarding_status: result.data.onboardingStatus,
    });
  } catch (error) {
    console.error("Get user onboarding status error:", error);
    return c.json({
      success: false,
      error: "Failed to get onboarding status",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// ============================================================================
// PROPERTY MANAGEMENT API ENDPOINTS
// ============================================================================

// Create new property (with temp image migration)
app.post("/api/properties/manage/create", async (c) => {
  try {
    const data = await c.req.json();

    if (!propertyManagementService) {
      return c.json({ error: "Property management service not initialized" }, 500);
    }

    if (!uploadImageService) {
      return c.json({ error: "Upload image service not initialized" }, 500);
    }

    // Validate required fields
    if (!data.name || !data.description || !data.location || !data.owner_address) {
      return c.json({
        success: false,
        error: "Missing required fields: name, description, location, owner_address"
      }, 400);
    }

    // Create property data in the format expected by the service
    const propertyData = {
      contractAddress: data.contract_address || null,
      tokenSymbol: data.token_symbol || data.name.substring(0, 6).toUpperCase(),
      name: data.name,
      description: data.description,
      location: data.location,
      propertyType: data.property_type || 'residential',
      totalTokens: BigInt(data.total_tokens || 1000000),
      availableTokens: BigInt(data.available_tokens || data.total_tokens || 1000000),
      tokenPrice: data.token_price?.toString() || '1.00',
      totalValue: data.total_value?.toString() || (data.total_tokens * data.token_price)?.toString(),
      annualYield: data.annual_yield?.toString() || '6.5',
      riskLevel: data.risk_level || 'medium',
      features: data.features || [],
      images: data.images || [],
      fundingProgress: data.funding_progress || 0,
      minimumInvestment: data.minimum_investment?.toString() || '100',
      ownerAddress: data.owner_address,
      createdBy: data.owner_address,
    };

    // Create the property
    const result = await propertyManagementService.createProperty(propertyData);

    if (!result.success) {
      return c.json({
        success: false,
        error: result.error
      }, 400);
    }

    const propertyId = result.data!.id;

    // Handle temp image migration if tempImageIds are provided
    if (data.tempImageIds && Array.isArray(data.tempImageIds) && data.tempImageIds.length > 0) {
      console.log(`Migrating ${data.tempImageIds.length} temp images for property ${propertyId}`);
      const migrationResult = await uploadImageService.moveTemporaryImagesToProperty(
        data.tempImageIds,
        propertyId,
        data.owner_address
      );

      if (!migrationResult) {
        console.warn(`Failed to migrate temp images for property ${propertyId}, but property was created successfully`);
        // Don't fail the whole operation, just log the warning
      } else {
        console.log(`Successfully migrated ${data.tempImageIds.length} temp images for property ${propertyId}`);
      }
    }

    return c.json({
      success: true,
      data: {
        id: propertyId,
        message: "Property created successfully"
      }
    });

  } catch (error) {
    console.error("Create property error:", error);
    return c.json({
      success: false,
      error: "Failed to create property",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Update property
app.put("/api/properties/manage/:id", async (c) => {
  try {
    const propertyId = c.req.param("id");
    const { userId, ...updates } = await c.req.json();

    if (!userId) {
      return c.json({ error: "userId is required" }, 400);
    }

    if (!propertyManagementService) {
      return c.json({ error: "Property management service not initialized" }, 500);
    }

    const result = await propertyManagementService.updateProperty(propertyId, userId, updates);

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json(result);
  } catch (error) {
    console.error("Update property error:", error);
    return c.json({
      success: false,
      error: "Failed to update property",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get owned properties
app.get("/api/properties/manage/owned/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");

    if (!propertyManagementService) {
      return c.json({ error: "Property management service not initialized" }, 500);
    }

    const result = await propertyManagementService.getOwnedProperties(userId);

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json(result);
  } catch (error) {
    console.error("Get owned properties error:", error);
    return c.json({
      success: false,
      error: "Failed to get owned properties",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Grant property access
app.post("/api/properties/manage/:id/access/grant", async (c) => {
  try {
    const propertyId = c.req.param("id");
    const { grantedBy, grantedTo, ownership } = await c.req.json();

    if (!grantedBy || !grantedTo || !ownership) {
      return c.json({ error: "grantedBy, grantedTo, and ownership are required" }, 400);
    }

    if (!propertyManagementService) {
      return c.json({ error: "Property management service not initialized" }, 500);
    }

    const result = await propertyManagementService.grantPropertyAccess(propertyId, grantedBy, grantedTo, ownership);

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json(result);
  } catch (error) {
    console.error("Grant property access error:", error);
    return c.json({
      success: false,
      error: "Failed to grant property access",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Revoke property access
app.delete("/api/properties/manage/:id/access/:userId", async (c) => {
  try {
    const propertyId = c.req.param("id");
    const revokedFrom = c.req.param("userId");
    const { revokedBy } = await c.req.json();

    if (!revokedBy) {
      return c.json({ error: "revokedBy is required" }, 400);
    }

    if (!propertyManagementService) {
      return c.json({ error: "Property management service not initialized" }, 500);
    }

    const result = await propertyManagementService.revokePropertyAccess(propertyId, revokedBy, revokedFrom);

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json(result);
  } catch (error) {
    console.error("Revoke property access error:", error);
    return c.json({
      success: false,
      error: "Failed to revoke property access",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Check property permission
app.get("/api/properties/manage/:id/permission/:userId/:permission", async (c) => {
  try {
    const propertyId = c.req.param("id");
    const userId = c.req.param("userId");
    const permission = c.req.param("permission") as 'edit' | 'mint' | 'documents' | 'communicate';

    if (!propertyManagementService) {
      return c.json({ error: "Property management service not initialized" }, 500);
    }

    const result = await propertyManagementService.checkPropertyPermission(propertyId, userId, permission);

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json(result);
  } catch (error) {
    console.error("Check property permission error:", error);
    return c.json({
      success: false,
      error: "Failed to check property permission",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// ============================================================================
// PROPERTY-TOKEN INTEGRATION API ENDPOINTS
// ============================================================================

// Create property with automatic T-REX token deployment
app.post("/api/properties/create-with-token", async (c) => {
  try {
    const data = await c.req.json();

    if (!propertyManagementService) {
      return c.json({ error: "Property management service not initialized" }, 500);
    }

    // Validate required fields
    if (!data.property || !data.token || !data.ownerAddress || !data.network) {
      return c.json({
        success: false,
        error: "Missing required fields: property, token, ownerAddress, network"
      }, 400);
    }

    // Prepare property data with token deployment
    const propertyData = {
      contractAddress: '0x0000000000000000000000000000000000000000',
      tokenSymbol: data.token.symbol,
      name: data.property.name,
      description: data.property.description,
      location: data.property.location,
      propertyType: data.property.propertyType || 'residential',
      totalTokens: BigInt(data.token.totalSupply || 1000000),
      availableTokens: BigInt(data.token.totalSupply || 1000000),
      tokenPrice: data.property.tokenPrice?.toString() || '1.00',
      totalValue: data.property.totalValue?.toString() || '1000000',
      annualYield: data.property.annualYield?.toString() || '6.5',
      riskLevel: data.property.riskLevel || 'medium',
      features: data.property.features || [],
      images: data.property.images || [],
      fundingProgress: data.property.fundingProgress || 0,
      minimumInvestment: data.property.minimumInvestment?.toString() || '100',
      ownerAddress: data.ownerAddress,
      createdBy: data.ownerAddress,
      // Token deployment data
      tokenData: {
        name: data.token.name,
        symbol: data.token.symbol,
        decimals: data.token.decimals || 18,
        totalSupply: data.token.totalSupply || 1000000,
        instrumentType: data.token.instrumentType || 'equity',
        baseCurrency: data.token.baseCurrency || 'USD',
        countryRestrictions: data.token.countryRestrictions || [840],
        maxBalance: data.token.maxBalance || 100000,
        maxHolders: data.token.maxHolders || 500,
        timeRestrictions: data.token.timeRestrictions || false,
        claimTopics: data.token.claimTopics || [],
        trustedIssuers: data.token.trustedIssuers || [],
        complianceModules: data.token.complianceModules || [],
        propertyId: '' // Will be filled after property creation
      },
      deployToken: true,
      network: data.network as EVMNetwork
    };

    const result = await propertyManagementService.createPropertyWithToken(propertyData);

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error("Create property with token error:", error);
    return c.json({
      success: false,
      error: "Failed to create property with token",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Deploy token for existing property
app.post("/api/properties/:propertyId/deploy-token", async (c) => {
  try {
    const propertyId = c.req.param("propertyId");
    const data = await c.req.json();
    let evmNetwork = 'devnet';

    if (!propertyManagementService) {
      return c.json({ error: "Property management service not initialized" }, 500);
    }
    if (data.network) {
      //return c.json({ error: "Network is required" }, 400);
      evmNetwork = data.network;
    }

    // Validate required fields
    if (!data.tokenData || !data.ownerAddress || !data.userId) {
      return c.json({
        success: false,
        error: "Missing required fields: tokenData, ownerAddress, userId, network"
      }, 400);
    }

    const tokenData = {
      name: data.tokenData.name,
      symbol: data.tokenData.symbol,
      decimals: data.tokenData.decimals || 18,
      totalSupply: data.tokenData.totalSupply || 1000000,
      instrumentType: data.tokenData.instrumentType || 'equity',
      baseCurrency: data.tokenData.baseCurrency || 'USD',
      countryRestrictions: data.tokenData.countryRestrictions || [840],
      maxBalance: 100000, //data.tokenData.maxBalance || 100000,
      maxHolders: data.tokenData.maxHolders || 500,
      timeRestrictions: data.tokenData.timeRestrictions || false,
      claimTopics: data.tokenData.claimTopics || [],
      trustedIssuers: data.tokenData.trustedIssuers || [],
      complianceModules: data.tokenData.complianceModules || [],
      propertyId
    };

    const result = await propertyManagementService.deployTokenForProperty(
      propertyId,
      data.userId,
      tokenData,
      data.ownerAddress as `0x${string}`,
      evmNetwork as EVMNetwork
    );

    if (!result.success) {
      return c.json(result, 400);
    }

    console.log({result})
    return c.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error("Deploy token for property error:", error);
    return c.json({
      success: false,
      error: "Failed to deploy token for property",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Mint property tokens to investors
app.post("/api/properties/:propertyId/mint-tokens", async (c) => {
  try {
    const propertyId = c.req.param("propertyId");
    const data = await c.req.json();

    if (!propertyManagementService) {
      return c.json({ error: "Property management service not initialized" }, 500);
    }

    // Validate required fields
    if (!data.userId || !data.recipients || !Array.isArray(data.recipients)) {
      return c.json({
        success: false,
        error: "Missing required fields: userId, recipients (array)"
      }, 400);
    }

    const result = await propertyManagementService.mintPropertyTokens(
      propertyId,
      data.userId,
      data.recipients
    );

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error("Mint property tokens error:", error);
    return c.json({
      success: false,
      error: "Failed to mint property tokens",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get property token information
app.get("/api/properties/:propertyId/token-info", async (c) => {
  try {
    const propertyId = c.req.param("propertyId");

    if (!propertiesService) {
      return c.json({ error: "Properties service not initialized" }, 500);
    }

    // Get property data
    const propertyResult = await propertiesService.getPropertyById(propertyId);
    
    if (!propertyResult) {
      return c.json(propertyResult, 404);
    }

    // Get token data from property_tokens and tokens tables
    const tokenQuery = `
      SELECT 
        t.contract_address,
        t.name,
        t.symbol,
        t.decimals,
        t.total_supply,
        t.identity_registry_contract,
        t.compliance_contract,
        t.owner_address,
        s.token_name,
        s.token_symbol
      FROM public.property_tokens pt
      JOIN public.tokens t ON pt.token_contract = t.contract_address
      LEFT JOIN public.suites s ON t.id = s.token_id
      WHERE pt.property_id = $1
    `;
    
    const pool = (propertiesService as any).pool; // Access pool from service
    const tokenResult = await pool.query(tokenQuery, [propertyId]);

    if (tokenResult.rows.length === 0) {
      return c.json({
        success: true,
        data: {
          property: propertyResult,
          token: null,
          message: "No token deployed for this property"
        }
      });
    }

    const tokenData = tokenResult.rows[0];

    return c.json({
      success: true,
      data: {
        property: propertyResult,
        token: {
          address: tokenData.contract_address,
          name: tokenData.name,
          symbol: tokenData.symbol,
          decimals: tokenData.decimals,
          totalSupply: tokenData.total_supply,
          identityRegistry: tokenData.identity_registry_contract,
          compliance: tokenData.compliance_contract,
          ownerAddress: tokenData.owner_address
        }
      }
    });

  } catch (error) {
    console.error("Get property token info error:", error);
    return c.json({
      success: false,
      error: "Failed to get property token information",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Token issuance endpoint - EVM ERC-3643 implementation
app.post("/api/tokens/issue", async (c) => {
  try {
    const tokenData = await c.req.json();

    if (!tokenData.name || !tokenData.symbol || !tokenData.deployerAddress) {
      return c.json({
        success: false,
        error: "Missing required token data: name, symbol, deployerAddress"
      }, 400);
    }

    if (!tokenData.deployerAddress.startsWith('0x') || tokenData.deployerAddress.length !== 42) {
      return c.json({
        success: false,
        error: "deployerAddress must be a valid EVM address"
      }, 400);
    }

    if (!propertyTokenFactoryService) {
      return c.json({ error: "Property token factory service not initialized" }, 500);
    }

    // Use ERC-3643 factory to deploy TREX token suite
    const deploymentResult = await propertyTokenFactoryService.deployPropertyToken({
      propertyId: `temp_${Date.now()}`,
      userId: tokenData.deployerAddress,
      ownerAddress: tokenData.deployerAddress as `0x${string}`,
      tokenData: {
        name: tokenData.name,
        symbol: tokenData.symbol,
        decimals: 18,
        totalSupply: tokenData.initialSupply || 1000000,
        instrumentType: 'equity',
        baseCurrency: 'USD',
        countryRestrictions: ['840'], // US by default
        maxBalance: 1000000,
        maxHolders: 1000,
        timeRestrictions: false,
        claimTopics: [],
        trustedIssuers: [],
        complianceModules: [],
        propertyId: `temp_${Date.now()}`
      }
    });

    if (!deploymentResult.success) {
      return c.json({
        success: false,
        error: deploymentResult.error || "Token deployment failed"
      }, 400);
    }

    return c.json({
      success: true,
      data: {
        tokenId: deploymentResult.data?.tokenAddress || `token_${Date.now()}`,
        contractAddress: deploymentResult.data?.tokenAddress,
        transactionHash: deploymentResult.data?.transactionHashes?.[0],
        network: contractsService?.getNetwork(),
        standard: 'ERC-3643'
      },
      message: "ERC-3643 token deployed successfully to EVM network"
    });
  } catch (error) {
    console.error("Token issuance error:", error);
    return c.json({
      success: false,
      error: "Failed to deploy token",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Image upload endpoints
app.post("/api/properties/:id/images", async (c) => {
  try {
    const propertyId = c.req.param("id");

    // Validate property ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(propertyId)) {
      return c.json({ error: "Invalid property ID format" }, 400);
    }

    if (!uploadImageService) {
      return c.json({ error: "Upload service not initialized" }, 500);
    }

    // Handle file upload
    const formData = await c.req.formData();
    const file = formData.get('image') as File;
    const userAddress = formData.get('userAddress') as string;

    if (!file) {
      return c.json({ error: "No image file provided" }, 400);
    }

    if (!userAddress) {
      return c.json({ error: "User address is required" }, 400);
    }

    const result = await uploadImageService.uploadPropertyImage(propertyId, file, userAddress);

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json({
      success: true,
      data: result,
      message: "Image uploaded successfully"
    });
  } catch (error) {
    console.error("Upload property image error:", error);
    return c.json({
      success: false,
      error: "Failed to upload image",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.get("/api/properties/:id/images", async (c) => {
  try {
    const propertyId = c.req.param("id");

    // Validate property ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(propertyId)) {
      return c.json({ error: "Invalid property ID format" }, 400);
    }

    if (!uploadImageService) {
      return c.json({ error: "Upload service not initialized" }, 500);
    }

    const images = await uploadImageService.getPropertyImages(propertyId);

    return c.json({
      success: true,
      data: images,
    });
  } catch (error) {
    console.error("Get property images error:", error);
    return c.json({
      success: false,
      error: "Failed to get property images",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.delete("/api/properties/images/:imageId", async (c) => {
  try {
    const imageId = c.req.param("imageId");

    if (!uploadImageService) {
      return c.json({ error: "Upload service not initialized" }, 500);
    }

    // Get user address from header or query param
    const userAddress = c.req.header('X-User-Address') || c.req.query('userAddress');

    if (!userAddress) {
      return c.json({ error: "User address is required" }, 400);
    }

    const success = await uploadImageService.deleteImage(imageId, userAddress);

    if (!success) {
      return c.json({ error: "Image not found or access denied" }, 404);
    }

    return c.json({
      success: true,
      message: "Image deleted successfully"
    });
  } catch (error) {
    console.error("Delete image error:", error);
    return c.json({
      success: false,
      error: "Failed to delete image",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Serve temporary uploaded images (for property creation previews)
app.get("/tmp/property-images/:filename", async (c) => {
  try {
    const filename = c.req.param("filename");

    if (!filename) {
      return c.json({ error: "Filename is required" }, 400);
    }

    // Validate filename format (should start with temp- and have extension)
    if (!filename.startsWith('temp-') || !filename.includes('.')) {
      return c.json({ error: "Invalid filename format" }, 400);
    }

    const filePath = `/tmp/property-images/${filename}`;

    // Check if file exists
    try {
      await Bun.file(filePath).stat();
    } catch {
      return c.json({ error: "File not found" }, 404);
    }

    // Serve the file
    const file = Bun.file(filePath);
    const arrayBuffer = await file.arrayBuffer();

    // Determine content type based on file extension
    let contentType = 'application/octet-stream';
    if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (filename.toLowerCase().endsWith('.png')) {
      contentType = 'image/png';
    } else if (filename.toLowerCase().endsWith('.webp')) {
      contentType = 'image/webp';
    } else if (filename.toLowerCase().endsWith('.gif')) {
      contentType = 'image/gif';
    }

    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error("Serve temp image error:", error);
    return c.json({
      success: false,
      error: "Failed to serve image",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Upload property image (temporary storage)
app.post("/api/properties/images", async (c) => {
  try {
    // Check if this is a temporary upload (for property creation)
    const isTemp = c.req.query("temp") === "true";

    if (!uploadImageService) {
      return c.json({ error: "Upload service not initialized" }, 500);
    }

    // Handle file upload
    const formData = await c.req.formData();
    const file = formData.get('image') as File;
    const userAddress = formData.get('userAddress') as string;

    if (!file) {
      return c.json({ error: "No image file provided" }, 400);
    }

    if (!userAddress) {
      return c.json({ error: "User address is required" }, 400);
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return c.json({ error: "File size exceeds 5MB limit" }, 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Invalid file type. Only JPEG, PNG, and WebP images are allowed" }, 400);
    }

    if (isTemp) {
      // Upload to temporary storage (/tmp)
      const tempResult = await uploadImageService.uploadTemporaryImage(file, userAddress);

      if (!tempResult.success) {
        return c.json({ error: tempResult.error }, 400);
      }

      return c.json({
        success: true,
        data: {
          fileUrl: tempResult.fileUrl,
          tempId: tempResult.tempId,
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString()
        },
        message: "Image uploaded to temporary storage successfully"
      });
    } else {
      // Normal property image upload (requires propertyId)
      const propertyId = formData.get('propertyId') as string;

      if (!propertyId) {
        return c.json({ error: "Property ID is required for permanent uploads" }, 400);
      }

      // Validate property ID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(propertyId)) {
        return c.json({ error: "Invalid property ID format" }, 400);
      }

      const result = await uploadImageService.uploadPropertyImage(propertyId, file, userAddress);

      if (!result.success) {
        return c.json({ error: result.error }, 400);
      }

      return c.json({
        success: true,
        data: result,
        message: "Image uploaded successfully"
      });
    }
  } catch (error) {
    console.error("Upload property image error:", error);
    return c.json({
      success: false,
      error: "Failed to upload image",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Deploy property token
app.post("/api/properties/manage/:id/deploy", async (c) => {
  try {
    const propertyId = c.req.param("id");
    const { ownerAddress, tokenDetails } = await c.req.json();

    // Validate required inputs
    if (!propertyId || !ownerAddress || !tokenDetails) {
      return c.json({
        success: false,
        error: "Missing required parameters: propertyId, ownerAddress, tokenDetails"
      }, 400);
    }

    if (!tokenDetails.name || !tokenDetails.symbol) {
      return c.json({
        success: false,
        error: "Token name and symbol are required"
      }, 400);
    }

    if (!propertyTokenFactoryService) {
      return c.json({ error: "Property token factory service not initialized" }, 500);
    }

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Deployment timeout after 2 minutes")), 120000)
    );

    const deployPromise = propertyTokenFactoryService.deployPropertyToken({
      propertyId,
      userId: ownerAddress,
      ownerAddress: ownerAddress as `0x${string}`,
      tokenData: {
        name: tokenDetails.name,
        symbol: tokenDetails.symbol,
        decimals: 18,
        totalSupply: tokenDetails.initialSupply || 1000000,
        instrumentType: 'equity',
        baseCurrency: 'USD',
        countryRestrictions: ['840'],
        maxBalance: 1000000,
        maxHolders: 1000,
        timeRestrictions: false,
        claimTopics: [],
        trustedIssuers: [],
        complianceModules: [],
        propertyId
      }
    });

    interface DeployResult {
      success: boolean;
      data?: import('./services/trex-deployer').TREXDeploymentResult;
      error?: string;
    }

    const result: DeployResult = await Promise.race([deployPromise, timeoutPromise]) as DeployResult;

    if (!result || !result.success) {
      const error = result?.error || "Token deployment failed or timed out";
      console.error(`[DEPLOY:${contractsService!.getNetwork()}] ${error}`);
      return c.json({
        success: false,
        error
      }, 400);
    }

    return c.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error("Deploy property token error:", error);
    return c.json({
      success: false,
      error: "Failed to deploy token",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// ============================================================================
// ADMIN API ENDPOINTS
// ============================================================================

// Get admin dashboard stats
app.get("/api/admin/stats", async (c) => {
  try {
    if (!databaseService) {
      return c.json({ error: "Database service not initialized" }, 500);
    }

    const pool = databaseService.getPool();

    // Get total users count
    const usersResult = await pool.query(`
      SELECT COUNT(*) as total_users 
      FROM public.onboarding_sessions
    `);

    // Get pending onboarding count
    const pendingResult = await pool.query(`
      SELECT COUNT(*) as pending_onboarding 
      FROM public.onboarding_sessions 
      WHERE status = 'pending' OR status = 'in_progress'
    `);

    // Get total properties count
    const propertiesResult = await pool.query(`
      SELECT COUNT(*) as total_properties 
      FROM public.properties
    `);

    // Get total transactions count (assuming there's a transactions table)
    const transactionsResult = await pool.query(`
      SELECT COUNT(*) as total_transactions 
      FROM public.property_transactions
    `).catch(() => ({ rows: [{ total_transactions: 0 }] }));

    return c.json({
      success: true,
      data: {
        totalUsers: parseInt(usersResult.rows[0]?.total_users || '0'),
        pendingOnboarding: parseInt(pendingResult.rows[0]?.pending_onboarding || '0'),
        totalProperties: parseInt(propertiesResult.rows[0]?.total_properties || '0'),
        totalTransactions: parseInt(transactionsResult.rows[0]?.total_transactions || '0'),
      }
    });
  } catch (error) {
    console.error("Get admin stats error:", error);
    return c.json({
      success: false,
      error: "Failed to fetch admin stats",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get pending onboarding sessions
app.get("/api/admin/onboarding/pending", async (c) => {
  try {
    if (!databaseService) {
      return c.json({ error: "Database service not initialized" }, 500);
    }

    const pool = databaseService.getPool();

    // Get sessions that are pending or in progress
    const sessionsQuery = `
      SELECT
        os.id,
        os.session_id,
        os.user_id,
        os.user_type,
        os.jurisdiction,
        os.current_step as "currentStep",
        os.status,
        os.kyc_status as "kycStatus",
        os.progress,
        os.created_at as "createdAt",
        os.updated_at as "updatedAt",
        p.evm_address,
        p.email
      FROM public.onboarding_sessions os
      LEFT JOIN public.profiles p ON os.user_id = p.id
      WHERE os.status IN ('pending', 'in_progress', 'active')
      ORDER BY os.created_at DESC
      LIMIT 50
    `;

    const sessionsResult = await pool.query(sessionsQuery);

    // Get users with active onboarding status (in_progress) who don't have active sessions
    const activeUsersQuery = `
      SELECT
        NULL as id,
        NULL as session_id,
        p.id as user_id,
        p.user_type,
        p.jurisdiction,
        p.onboarding_current_step as "currentStep",
        'active' as status,
        p.kyc_status as "kycStatus",
        p.onboarding_progress as progress,
        p.created_at as "createdAt",
        p.updated_at as "updatedAt",
        p.evm_address,
        p.email
      FROM public.profiles p
      WHERE p.onboarding_status = 'in_progress'
      AND NOT EXISTS (
        SELECT 1 FROM public.onboarding_sessions os
        WHERE os.user_id = p.id AND os.status IN ('pending', 'in_progress', 'active')
      )
      ORDER BY p.created_at DESC
      LIMIT 50
    `;

    const activeUsersResult = await pool.query(activeUsersQuery);

    // Combine results, removing duplicates by user_id
    const combinedResults = [...sessionsResult.rows, ...activeUsersResult.rows];
    const uniqueResults = combinedResults.filter((item, index, self) =>
      index === self.findIndex(other => other.user_id === item.user_id)
    );

    return c.json({
      success: true,
      data: uniqueResults
    });
  } catch (error) {
    console.error("Get pending onboarding error:", error);
    return c.json({
      success: false,
      error: "Failed to fetch pending onboarding sessions",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Approve onboarding session
app.post("/api/admin/onboarding/:sessionId/approve", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const { adminAddress } = await c.req.json();

    if (!databaseService) {
      return c.json({ error: "Database service not initialized" }, 500);
    }

    const pool = databaseService.getPool();

    // Start transaction for atomic operation
    await pool.query('BEGIN');

    try {
      // Update onboarding session status
      const sessionResult = await pool.query(`
        UPDATE public.onboarding_sessions 
        SET status = 'approved', 
            updated_at = NOW(),
            approved_by = $1
        WHERE session_id = $2
        RETURNING user_id
      `, [adminAddress, sessionId]);

      if (sessionResult.rows.length === 0) {
        await pool.query('ROLLBACK');
        return c.json({
          success: false,
          error: "Onboarding session not found"
        }, 404);
      }

      const userId = sessionResult.rows[0].user_id;

      // Update user profile onboarding status to completed
      await pool.query(`
        UPDATE public.profiles 
        SET onboarding_status = 'completed',
            onboarding_progress = 100,
            onboarding_completed_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
      `, [userId]);

      // Commit transaction
      await pool.query('COMMIT');

      console.log(`Onboarding session ${sessionId} approved by ${adminAddress}`);

      return c.json({
        success: true,
        data: sessionResult.rows[0],
        message: "Onboarding session approved successfully"
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error("Approve onboarding error:", error);
    return c.json({
      success: false,
      error: "Failed to approve onboarding session",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Approve KYC for onboarding session
app.post("/api/admin/onboarding/:sessionId/approve-kyc", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const { adminAddress } = await c.req.json();

    if (!databaseService) {
      return c.json({ error: "Database service not initialized" }, 500);
    }

    const pool = databaseService.getPool();

    // Update onboarding session KYC status
    const result = await pool.query(`
      UPDATE public.onboarding_sessions 
      SET kyc_status = 'approved', 
          updated_at = NOW()
      WHERE session_id = $1
      RETURNING *
    `, [sessionId]);

    if (result.rows.length === 0) {
      return c.json({
        success: false,
        error: "Onboarding session not found"
      }, 404);
    }

    console.log(`KYC approved for session ${sessionId} by ${adminAddress}`);

    return c.json({
      success: true,
      data: result.rows[0],
      message: "KYC approved successfully"
    });
  } catch (error) {
    console.error("Approve KYC error:", error);
    return c.json({
      success: false,
      error: "Failed to approve KYC",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Reject onboarding session
app.post("/api/admin/onboarding/:sessionId/reject", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const { adminAddress, reason } = await c.req.json();

    if (!databaseService) {
      return c.json({ error: "Database service not initialized" }, 500);
    }

    const pool = databaseService.getPool();

    // Update onboarding session status
    const result = await pool.query(`
      UPDATE public.onboarding_sessions 
      SET status = 'rejected', 
          updated_at = NOW(),
          rejected_by = $1,
          rejection_reason = $2
      WHERE session_id = $3
      RETURNING *
    `, [adminAddress, reason || 'No reason provided', sessionId]);

    if (result.rows.length === 0) {
      return c.json({
        success: false,
        error: "Onboarding session not found"
      }, 404);
    }

    console.log(`Onboarding session ${sessionId} rejected by ${adminAddress}`);

    return c.json({
      success: true,
      data: result.rows[0],
      message: "Onboarding session rejected"
    });
  } catch (error) {
    console.error("Reject onboarding error:", error);
    return c.json({
      success: false,
      error: "Failed to reject onboarding session",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get all users
app.get("/api/admin/users", async (c) => {
  try {
    if (!databaseService) {
      return c.json({ error: "Database service not initialized" }, 500);
    }

    const pool = databaseService.getPool();

    const result = await pool.query(`
      SELECT 
        p.id as user_id,
        p.evm_address,
        p.email,
        os.user_type,
        os.status as onboarding_status,
        os.kyc_status,
        os.identity_verified,
        p.created_at,
        -- Identity fields
        p.jurisdiction,
        p.kyc_verified_at,
        p.kyc_expires_at,
        p.onchain_identity_address,
        p.identity_country_code,
        p.qualification_status,
        p.qualified_at,
        p.accredited_investor,
        p.full_name,
        p.date_of_birth,
        p.phone_number,
        p.address_line1,
        p.address_line2,
        p.city,
        p.state_province,
        p.postal_code,
        p.country,
        -- Entity fields
        p.entity_name,
        p.entity_type,
        p.entity_registration_number,
        p.entity_country,
        -- Consents and agreements
        p.privacy_consent,
        p.terms_consent,
        p.data_processing_consent,
        p.esign_completed,
        p.esign_completed_at,
        -- Onboarding fields
        p.onboarding_current_step,
        p.onboarding_progress,
        p.onboarding_started_at,
        p.onboarding_completed_at,
        p.onboarding_session_id
      FROM public.profiles p
      LEFT JOIN public.onboarding_sessions os ON p.id = os.user_id
      ORDER BY p.created_at DESC
      LIMIT 100
    `);

    return c.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error("Get users error:", error);
    return c.json({
      success: false,
      error: "Failed to fetch users",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get user documents
app.get("/api/admin/users/:userId/documents", async (c) => {
  try {
    const userId = c.req.param("userId");

    if (!databaseService) {
      return c.json({ error: "Database service not initialized" }, 500);
    }

    const pool = databaseService.getPool();

    const result = await pool.query(`
      SELECT 
        id,
        user_id as "userId",
        document_type as "documentType",
        verification_status as "status",
        uploaded_at as "uploadedAt",
        file_path as url
      FROM public.kyc_documents
      WHERE user_id = $1
      ORDER BY uploaded_at DESC
    `, [userId]);

    return c.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error("Get user documents error:", error);
    return c.json({
      success: false,
      error: "Failed to fetch user documents",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Update user KYC status
app.put("/api/admin/users/:address/kyc", async (c) => {
  try {
    const address = c.req.param("address");
    const { status } = await c.req.json();

    if (!databaseService) {
      return c.json({ error: "Database service not initialized" }, 500);
    }

    const pool = databaseService.getPool();

    const result = await pool.query(`
      UPDATE public.onboarding_sessions 
      SET kyc_status = $1,
          updated_at = NOW()
      WHERE user_id = (SELECT id FROM public.profiles WHERE evm_address = $2)
      RETURNING *
    `, [status, address]);

    if (result.rows.length === 0) {
      return c.json({
        success: false,
        error: "User not found"
      }, 404);
    }

    console.log(`KYC status updated to ${status} for ${address}`);

    return c.json({
      success: true,
      data: result.rows[0],
      message: "KYC status updated successfully"
    });
  } catch (error) {
    console.error("Update KYC status error:", error);
    return c.json({
      success: false,
      error: "Failed to update KYC status",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Verify user identity
app.post("/api/admin/users/:address/verify-identity", async (c) => {
  try {
    const address = c.req.param("address");

    if (!databaseService) {
      return c.json({ error: "Database service not initialized" }, 500);
    }

    const pool = databaseService.getPool();

    const result = await pool.query(`
      UPDATE public.onboarding_sessions 
      SET identity_verified = true,
          updated_at = NOW()
      WHERE user_id = (SELECT id FROM public.profiles WHERE evm_address = $1)
      RETURNING *
    `, [address]);

    if (result.rows.length === 0) {
      return c.json({
        success: false,
        error: "User not found"
      }, 404);
    }

    console.log(`Identity verified for ${address}`);

    return c.json({
      success: true,
      data: result.rows[0],
      message: "Identity verified successfully"
    });
  } catch (error) {
    console.error("Verify identity error:", error);
    return c.json({
      success: false,
      error: "Failed to verify identity",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Delete user and all related data
app.delete("/api/admin/users/:address", async (c) => {
  try {
    const address = c.req.param("address");

    if (!databaseService) {
      return c.json({ error: "Database service not initialized" }, 500);
    }

    const pool = databaseService.getPool();

    // Start transaction for atomic operation
    await pool.query('BEGIN');

    try {
      // Get user ID first
      const userResult = await pool.query(`
        SELECT id FROM public.profiles WHERE evm_address = $1
      `, [address]);

      if (userResult.rows.length === 0) {
        await pool.query('ROLLBACK');
        return c.json({
          success: false,
          error: "User not found"
        }, 404);
      }

      const userId = userResult.rows[0].id;

      // Delete in reverse dependency order to avoid FK constraint violations

      // 1. Delete trading orders (no FK to public.profiles but references wallet_address)
      await pool.query(`
        DELETE FROM public.orders WHERE wallet_address = $1
      `, [address]);

      // 2. Delete user portfolios (references public.properties via FK)
      await pool.query(`
        DELETE FROM public.user_portfolios WHERE wallet_address = $1
      `, [address]);

      // 3. Delete KYC attestations (references wallet_address)
      await pool.query(`
        DELETE FROM public.attestations WHERE wallet_address = $1
      `, [address]);

      // 4. Delete KYC permissions (references principal)
      await pool.query(`
        DELETE FROM public.permissions WHERE principal = $1
      `, [address]);

      // 5. Delete property ownership (cascade delete via FK to public.profiles)
      // This will be handled automatically by FK constraint

      // 6. Delete KYC documents (cascade delete via FK to public.profiles)
      // This will be handled automatically by FK constraint

      // 7. Delete onboarding sessions (cascade delete via FK to public.profiles)
      // This will be handled automatically by FK constraint

      // 8. Finally delete the user profile
      await pool.query(`
        DELETE FROM public.profiles WHERE id = $1
      `, [userId]);

      // Commit transaction
      await pool.query('COMMIT');

      console.log(`User ${address} and all related data deleted successfully`);

      return c.json({
        success: true,
        message: "User and all related data deleted successfully"
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error("Delete user error:", error);
    return c.json({
      success: false,
      error: "Failed to delete user",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// ============================================================================
// IDENTITY & COMPLIANCE API
// ============================================================================

// Check if user is verified
app.get("/api/identity/verified/:address", async (c) => {
  try {
    const address = c.req.param("address");

    if (!address.startsWith('0x') || address.length !== 42) {
      return c.json({ error: "Invalid EVM address format" }, 400);
    }
    
    if (!identityService) {
      return c.json({ error: "Identity service not initialized" }, 500);
    }

    const result = await identityService.isVerified(address as Address);
    return c.json(result);
  } catch (error) {
    console.error("Identity check error:", error);
    return c.json({
      success: false,
      error: "Failed to check identity verification"
    }, 500);
  }
});

// Check transfer compliance
app.post("/api/compliance/check-transfer", async (c) => {
  try {
    const { from, to, amount } = await c.req.json();
    
    if (!complianceService) {
      return c.json({ error: "Compliance service not initialized" }, 500);
    }

    const result = await complianceService.canTransfer(from, to, BigInt(amount));
    return c.json(result);
  } catch (error) {
    console.error("Compliance check error:", error);
    return c.json({
      allowed: false,
      reason: "Failed to check compliance"
    }, 500);
  }
});

// Get monitoring metrics
app.get("/api/monitoring/metrics", async (c) => {
  try {
    const metrics = monitoringService.getMetrics();
    // Convert bigint to string for JSON serialization
    const serializableMetrics = {
      ...metrics,
      totalTokensMinted: metrics.totalTokensMinted.toString(),
    };
    return c.json({ success: true, data: serializableMetrics });
  } catch (error) {
    console.error("Get monitoring metrics error:", error);
    return c.json({ success: false, error: "Failed to get monitoring metrics" }, 500);
  }
});

// Get recent events
app.get("/api/monitoring/events", (c) => {
  try {
    const count = parseInt(c.req.query("count") || "10");
    const events = monitoringService.getRecentEvents(count);
    return c.json({ success: true, data: events });
  } catch (error) {
    console.error("Monitoring events error:", error);
    return c.json({
      success: false,
      error: "Failed to get monitoring events"
    }, 500);
  }
});


// ============================================================================
// SYSTEM ADMIN API
// ============================================================================

// Get system status
app.get("/api/admin/system/status", async (c) => {
  try {
    if (!systemAdminService) {
      return c.json({ error: "System admin service not initialized" }, 500);
    }

    const result = await systemAdminService.getSystemStatus();

    if (!result.success) {
      return c.json(result, 500);
    }

    return c.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Get system status error:", error);
    return c.json({
      success: false,
      error: "Failed to get system status",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get system logs
app.get("/api/admin/system/logs", async (c) => {
  try {
    if (!systemAdminService) {
      return c.json({ error: "System admin service not initialized" }, 500);
    }

    const limit = parseInt(c.req.query('limit') || '100');
    const result = await systemAdminService.getSystemLogs(limit);

    if (!result.success) {
      return c.json(result, 500);
    }

    return c.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Get system logs error:", error);
    return c.json({
      success: false,
      error: "Failed to get system logs",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get rate limits
app.get("/api/admin/system/rate-limits", async (c) => {
  try {
    if (!systemAdminService) {
      return c.json({ error: "System admin service not initialized" }, 500);
    }

    const result = await systemAdminService.getRateLimits();

    if (!result.success) {
      return c.json(result, 500);
    }

    return c.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Get rate limits error:", error);
    return c.json({
      success: false,
      error: "Failed to get rate limits",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Update rate limits
app.put("/api/admin/system/rate-limits", async (c) => {
  try {
    if (!systemAdminService) {
      return c.json({ error: "System admin service not initialized" }, 500);
    }

    const settings = await c.req.json();
    const result = await systemAdminService.updateRateLimits(settings);

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json({
      success: true,
      message: "Rate limits updated successfully"
    });
  } catch (error) {
    console.error("Update rate limits error:", error);
    return c.json({
      success: false,
      error: "Failed to update rate limits",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get platform settings
app.get("/api/admin/system/settings", async (c) => {
  try {
    if (!systemAdminService) {
      return c.json({ error: "System admin service not initialized" }, 500);
    }

    const result = await systemAdminService.getPlatformSettings();

    if (!result.success) {
      return c.json(result, 500);
    }

    return c.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Get platform settings error:", error);
    return c.json({
      success: false,
      error: "Failed to get platform settings",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Update platform settings
app.put("/api/admin/system/settings", async (c) => {
  try {
    if (!systemAdminService) {
      return c.json({ error: "System admin service not initialized" }, 500);
    }

    const settings = await c.req.json();
    const result = await systemAdminService.updatePlatformSettings(settings);

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json({
      success: true,
      message: "Platform settings updated successfully"
    });
  } catch (error) {
    console.error("Update platform settings error:", error);
    return c.json({
      success: false,
      error: "Failed to update platform settings",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Backup database
app.post("/api/admin/system/backup", async (c) => {
  try {
    if (!systemAdminService) {
      return c.json({ error: "System admin service not initialized" }, 500);
    }

    const result = await systemAdminService.backupDatabase();

    if (!result.success) {
      return c.json(result, 500);
    }

    return c.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error("Backup database error:", error);
    return c.json({
      success: false,
      error: "Failed to backup database",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// ============================================================================
// MARKET STATS API
// ============================================================================

// Get market statistics
app.get("/api/market/stats", async (c) => {
  try {
    if (!marketStatsService) {
      return c.json({ error: "Market stats service not initialized" }, 500);
    }

    const result = await marketStatsService.getMarketStats();

    if (!result.success) {
      return c.json(result, 500);
    }

    return c.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Get market stats error:", error);
    return c.json({
      success: false,
      error: "Failed to fetch market stats",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// ============================================================================
// AI INSIGHTS API ENDPOINTS
// ============================================================================

// Get insights overview (all 4 insight cards + market data + portfolio analysis)
app.get("/api/v1/insights/overview", async (c) => {
  try {
    const userIdParam = c.req.query('user_id');
    const timeframe = c.req.query('timeframe') || '1M';

    if (!userIdParam) {
      return c.json({ error: "user_id parameter is required" }, 400);
    }

    if (!aiInsightsService) {
      return c.json({ error: "AI insights service not initialized" }, 500);
    }

    // For demo purposes, if user_id is not a UUID, try to find a user with a matching address
    let userId = userIdParam;

    // Check if userIdParam is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userIdParam)) {
      // Not a UUID - for demo purposes, try to find any user
      // In production, this should be handled by authentication middleware
      try {
        const userResult = await databaseService?.getPool().query(
          "SELECT id FROM public.profiles LIMIT 1"
        );

        if (userResult && userResult.rows.length > 0) {
          userId = userResult.rows[0].id;
        } else {
          return c.json({
            error: "No users found in database",
            details: "Please ensure users exist in the database before using insights"
          }, 404);
        }
      } catch (dbError) {
        console.error("Error looking up user:", dbError);
        return c.json({
          error: "Failed to lookup user",
          details: "Database error while resolving user ID"
        }, 500);
      }
    }

    const result = await aiInsightsService.getInsightsOverview(userId, timeframe as '1W' | '1M' | '3M' | '1Y');

    // Get data freshness information
    const freshness = await aiInsightsService.getDataFreshness();

    return c.json({
      success: true,
      data: result,
      meta: {
        processingTime: Date.now(), // Simplified - would need proper timing
        dataFreshness: freshness,
        confidence: 0.91 // Overall system confidence
      }
    });
  } catch (error) {
    console.error("Get insights overview error:", error);
    return c.json({
      success: false,
      error: "Failed to get insights overview",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get market intelligence (filtered insights)
app.get("/api/v1/market/intelligence", async (c) => {
  try {
    const timeframe = c.req.query('timeframe') || '1M';
    const categories = c.req.query('categories')?.split(',');

    if (!aiInsightsService) {
      return c.json({ error: "AI insights service not initialized" }, 500);
    }

    const insights = await aiInsightsService.getMarketIntelligence(categories);

    return c.json({
      success: true,
      data: insights,
      meta: {
        modelVersion: "v1.0.0",
        confidenceThreshold: 0.70,
        dataSources: ["market_data", "economic_indicators", "sentiment_analysis"],
        processingTime: Date.now()
      }
    });
  } catch (error) {
    console.error("Get market intelligence error:", error);
    return c.json({
      success: false,
      error: "Failed to get market intelligence",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get market analytics data
app.get("/api/v1/market/analytics", async (c) => {
  try {
    const timeframe = c.req.query('timeframe') || '1M';

    if (!aiInsightsService) {
      return c.json({ error: "AI insights service not initialized" }, 500);
    }

    const marketData = await aiInsightsService.getMarketAnalytics(timeframe as '1W' | '1M' | '3M' | '1Y');

    return c.json({
      success: true,
      data: marketData,
      meta: {
        calculationMethod: "real_time_aggregation",
        dataFreshness: 0, // Would calculate actual freshness
        confidence: 0.85
      }
    });
  } catch (error) {
    console.error("Get market analytics error:", error);
    return c.json({
      success: false,
      error: "Failed to get market analytics",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get portfolio analysis for user
app.get("/api/v1/portfolio/:userId/analysis", async (c) => {
  try {
    const userId = c.req.param("userId");
    const includeRecommendations = c.req.query('include_recommendations') === 'true';
    const depth = c.req.query('depth') || 'full';

    if (!aiInsightsService) {
      return c.json({ error: "AI insights service not initialized" }, 500);
    }

    const analysis = await aiInsightsService.getPortfolioAnalysis(userId);

    return c.json({
      success: true,
      data: analysis,
      meta: {
        portfolioValue: 0, // Would calculate from portfolio data
        lastTransaction: new Date().toISOString(),
        modelVersion: "v1.0.0",
        recommendationsCount: analysis.recommendations.length
      }
    });
  } catch (error) {
    console.error("Get portfolio analysis error:", error);
    return c.json({
      success: false,
      error: "Failed to get portfolio analysis",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get property recommendations for user
app.get("/api/v1/portfolio/:userId/recommendations", async (c) => {
  try {
    const userId = c.req.param("userId");
    const limit = parseInt(c.req.query('limit') || '10');
    const minScore = parseFloat(c.req.query('min_score') || '0.0');
    const riskPreference = c.req.query('risk_preference') as 'Low' | 'Medium' | 'High' | undefined;

    if (!aiInsightsService) {
      return c.json({ error: "AI insights service not initialized" }, 500);
    }

    const recommendations = await aiInsightsService.getPropertyRecommendations(
      userId,
      limit,
      minScore,
      riskPreference
    );

    return c.json({
      success: true,
      data: recommendations,
      meta: {
        totalAvailable: recommendations.length, // Simplified
        filteredByRisk: riskPreference ? recommendations.length : 0,
        averageScore: recommendations.reduce((sum, r) => sum + r.score, 0) / recommendations.length || 0,
        portfolioFit: 0.85 // Would calculate based on portfolio composition
      }
    });
  } catch (error) {
    console.error("Get property recommendations error:", error);
    return c.json({
      success: false,
      error: "Failed to get property recommendations",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Refresh insights (force update)
app.post("/api/v1/insights/refresh", async (c) => {
  try {
    const { user_id, force_full_refresh, priority } = await c.req.json();

    if (!user_id) {
      return c.json({ error: "user_id is required" }, 400);
    }

    if (!aiInsightsService) {
      return c.json({ error: "AI insights service not initialized" }, 500);
    }

    const result = await aiInsightsService.refreshInsights(
      user_id,
      force_full_refresh || false,
      priority || 'normal'
    );

    return c.json(result);
  } catch (error) {
    console.error("Refresh insights error:", error);
    return c.json({
      success: false,
      error: "Failed to refresh insights",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// WebSocket endpoint for real-time insights updates
app.get("/ws/insights", async (c) => {
  // WebSocket upgrade for real-time insights
  const upgradeHeader = c.req.header("Upgrade");
  if (upgradeHeader !== "websocket") {
    return c.json({ error: "Expected WebSocket upgrade" }, 400);
  }

  // This would be handled by the WebSocket server setup
  // For now, return placeholder
  return c.json({ message: "WebSocket endpoint for real-time insights" });
});

// Register contract integration endpoints
registerContractIntegrationEndpoints(app as any, {
  propertyTokenFactory: propertyTokenFactoryService,
  identityRegistry: identityRegistryService,
  settlement: settlementService,
  trexContracts: trexContractsService,
});


export default {
  port: 3000,
  fetch: app.fetch,
};

// ============================================================================
// WEBSOCKET SERVER
// ============================================================================

// Start WebSocket server for real-time prices
const wsServer = Bun.serve({
  port: 3002, // Different port for WebSocket
  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/prices") {
      const upgraded = server.upgrade(req, { data: { url: req.url } } as any);
      if (!upgraded) {
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return;
    }

    if (url.pathname.startsWith("/property/") && url.pathname.endsWith("/price")) {
      const upgraded = server.upgrade(req, { data: { url: req.url } } as any);
      if (!upgraded) {
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return;
    }

    return new Response("Not found", { status: 404 });
  },
  websocket: {
    open(ws) {
      // Access request data properly for Bun WebSocket
      const wsData = ws.data as { url: string } | undefined;
      if (!wsData || !wsData.url) {
        console.error("WebSocket request data not available");
        ws.close(1011, "Invalid request");
        return;
      }

      const url = new URL(wsData.url);
      console.log(`Client connected to ${url.pathname}`);

      try {
        if (url.pathname === "/prices") {
          // Handle all prices WebSocket
          if (priceService) {
            priceService.getAllPrices().then(result => {
              if (result.success && result.data) {
                ws.send(JSON.stringify(result.data));
              } else {
                console.error("Failed to get initial prices");
                // Don't close connection on initial data failure
              }
            }).catch(error => {
              console.error("Error getting initial prices:", error);
              // Don't close connection on initial data failure
            });
          }

          // Set up periodic updates
          const interval = setInterval(async () => {
            try {
              if (priceService) {
                const result = await priceService.getAllPrices();
                if (result.success && result.data) {
                  ws.send(JSON.stringify(result.data));
                }
                // Note: We don't send error messages on periodic updates to avoid spam
              }
            } catch (error) {
              console.error("Error in price update:", error);
              // Don't close connection on periodic update errors
            }
          }, 30000);

          (ws as any).priceInterval = interval;
        } else if (url.pathname.startsWith("/property/")) {
          // Handle property-specific WebSocket
          const propertyId = url.pathname.split('/')[2];
          if (!propertyId) {
            console.error("Invalid property ID in WebSocket URL");
            ws.close(1002, "Invalid property ID");
            return;
          }

          if (priceService) {
            priceService.getPropertyPrice(propertyId).then(result => {
              if (result.success) {
                if (result.data) {
                  ws.send(JSON.stringify(result.data));
                } else {
                  // Property not found or no price data available
                  console.log(`No price data available for property ${propertyId}`);
                  // Don't close connection, just don't send data
                }
              } else {
                console.error("Failed to get initial property price");
                // Don't close connection on initial data failure
              }
            }).catch(error => {
              console.error("Error getting initial property price:", error);
              // Don't close connection on initial data failure
            });
          }

          // Set up periodic updates
          const interval = setInterval(async () => {
            try {
              if (priceService) {
                const result = await priceService.getPropertyPrice(propertyId);
                if (result.success && result.data) {
                  ws.send(JSON.stringify(result.data));
                }
                // Note: We don't send error messages on periodic updates to avoid spam
              }
            } catch (error) {
              console.error("Error in property price update:", error);
              // Don't close connection on periodic update errors
            }
          }, 30000);

          (ws as any).propertyInterval = interval;
        }
      } catch (error) {
        console.error("Error in WebSocket open:", error);
        ws.close(1011, "Internal server error");
      }

      // Set up ping/pong keep-alive
      const pingInterval = setInterval(() => {
        try {
          // Send ping frame to keep connection alive
          ws.ping();
        } catch (error) {
          console.error("Error sending ping:", error);
          clearInterval(pingInterval);
        }
      }, 30000); // Ping every 30 seconds

      (ws as any).pingInterval = pingInterval;
    },

    pong(ws) {
      // Client responded to ping, connection is alive
      console.log("Received pong from client");
    },

    message(ws, message) {
      // Handle client messages if needed
      try {
        const data = JSON.parse(message.toString());
        console.log("Received message from client:", data);
        // Could handle client requests here if needed
      } catch (error) {
        console.error("Error parsing client message:", error);
      }
    },

    close(ws) {
      console.log("Client disconnected from WebSocket");
      // Clean up all intervals
      if ((ws as any).priceInterval) {
        clearInterval((ws as any).priceInterval);
      }
      if ((ws as any).propertyInterval) {
        clearInterval((ws as any).propertyInterval);
      }
      if ((ws as any).pingInterval) {
        clearInterval((ws as any).pingInterval);
      }
    },
  },
});


console.log(`🚀 Farsquare API Server listening on port ${'3000'}`);
console.log(`❤️  Health check: http://localhost:${'3000'}/health`);
console.log(`📡 WebSocket server started on ws://localhost:${wsServer.port}`);
//console.log(`📤 Submit KYC: POST http://localhost:${PORT}/kyc/submit`);
//console.log(`🔄 Provider callback: POST http://localhost:${PORT}/kyc/provider-callback`);
//console.log(`📥 Get attestation: GET http://localhost:${PORT}/kyc/attestation/:hash`);

