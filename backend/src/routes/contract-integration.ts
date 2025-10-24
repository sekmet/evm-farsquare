/**
 * Contract Integration API Endpoints
 * Endpoints for Property Token Factory, Identity Registry, and Settlement
 * ERC-3643 compliant with strict EVM address validation
 */

import type { Hono } from "hono";
import type { PropertyTokenFactoryService } from "../services/property-token-factory";
import type { IdentityRegistryService } from "../services/identity-registry";
import type { SettlementService } from "../services/settlement";
import type { TrexContractsService } from "../services/trex-contracts";
import type { Address, Hash } from "viem";

// ============================================================
// VALIDATION FUNCTIONS - ERC-3643 Compliance
// ============================================================

/**
 * Validate Ethereum address format (0x + 40 hex characters)
 */
function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate UUID format for salt parameters
 */
function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

/**
 * Validate ERC-3643 deployment parameters
 */
function validateDeploymentParams(params: any): { valid: boolean; error?: string } {
  // Validate salt (UUID format)
  if (!params.salt || !isValidUUID(params.salt)) {
    return { valid: false, error: 'Invalid salt format: must be a valid UUID' };
  }

  // Validate token name
  if (!params.name || typeof params.name !== 'string' || params.name.trim().length === 0) {
    return { valid: false, error: 'Token name is required and must be non-empty' };
  }

  // Validate token symbol
  if (!params.symbol || typeof params.symbol !== 'string' || params.symbol.trim().length === 0) {
    return { valid: false, error: 'Token symbol is required and must be non-empty' };
  }

  // Validate initial supply
  if (!params.initialSupply || isNaN(Number(params.initialSupply)) || Number(params.initialSupply) <= 0) {
    return { valid: false, error: 'Initial supply must be a positive number' };
  }

  // Validate claim topics array
  if (!Array.isArray(params.claimTopics) || params.claimTopics.length === 0) {
    return { valid: false, error: 'At least one claim topic is required' };
  }

  // Validate trusted issuers array
  if (!Array.isArray(params.trustedIssuers) || params.trustedIssuers.length === 0) {
    return { valid: false, error: 'At least one trusted issuer is required' };
  }

  // Validate all addresses
  const allAddresses = [...params.trustedIssuers, ...params.complianceModules, params.deployerAddress].filter(Boolean);
  for (const address of allAddresses) {
    if (!isValidEvmAddress(address)) {
      return { valid: false, error: `Invalid Ethereum address: ${address}` };
    }
  }

  return { valid: true };
}

/**
 * Validate ERC-3643 identity registration parameters
 */
function validateIdentityRegistrationParams(params: any): { valid: boolean; error?: string } {
  // Validate user address
  if (!params.userAddress || !isValidEvmAddress(params.userAddress)) {
    return { valid: false, error: 'Invalid user address format' };
  }

  // Validate identity contract address
  if (!params.identityContract || !isValidEvmAddress(params.identityContract)) {
    return { valid: false, error: 'Invalid identity contract address format' };
  }

  // Validate country code (ISO 3166-1 numeric)
  if (typeof params.country !== 'number' || params.country < 0 || params.country > 999) {
    return { valid: false, error: 'Invalid country code' };
  }

  // Validate registrar address
  if (!params.registrarAddress || !isValidEvmAddress(params.registrarAddress)) {
    return { valid: false, error: 'Invalid registrar address format' };
  }

  return { valid: true };
}

export function registerContractIntegrationEndpoints(
  app: Hono,
  services: {
    propertyTokenFactory: PropertyTokenFactoryService | null;
    identityRegistry: IdentityRegistryService | null;
    settlement: SettlementService | null;
    trexContracts: TrexContractsService | null;
  }
) {
  // ============================================================
  // Property Token Factory Endpoints
  // ============================================================

  /**
   * Deploy a complete property token suite using ERC-3643 factory
   * POST /api/factory/deploy-suite
   */
  app.post("/api/factory/deploy-suite", async (c) => {
    try {
      const params = await c.req.json();

      // Validate parameters per ERC-3643 requirements
      const validation = validateDeploymentParams(params);
      if (!validation.valid) {
        return c.json({ success: false, error: validation.error }, 400);
      }

      if (!services.propertyTokenFactory) {
        return c.json({ error: "Property token factory service not initialized" }, 500);
      }

      // Deploy using ERC-3643 TREX factory pattern
      const result = await services.propertyTokenFactory.deployPropertyTokenSuite(
        {
          salt: params.salt,
          name: params.name.trim(),
          symbol: params.symbol.trim(),
          initialSupply: BigInt(params.initialSupply),
          claimTopics: params.claimTopics,
          trustedIssuers: params.trustedIssuers,
          complianceModules: params.complianceModules || [],
        },
        params.deployerAddress as Address
      );

      if (!result.success) {
        return c.json({ success: false, error: result.error }, 400);
      }

      return c.json({ success: true, data: result.data });
    } catch (error) {
      console.error("Deploy suite error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to deploy token suite",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  });

  /**
   * Get deployed token address by salt
   * GET /api/factory/token-address/:salt
   */
  app.get("/api/factory/token-address/:salt", async (c) => {
    try {
      const salt = c.req.param("salt");

      if (!services.propertyTokenFactory) {
        return c.json({ error: "Property token factory service not initialized" }, 500);
      }

      const result = await services.propertyTokenFactory.getTokenAddress(salt);

      if (!result.success) {
        return c.json({ success: false, error: result.error }, 400);
      }

      return c.json({ success: true, data: result.data });
    } catch (error) {
      console.error("Get token address error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to get token address",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  });

  /**
   * Get property deployment info
   * GET /api/factory/deployment/:propertyId
   */
  app.get("/api/factory/deployment/:propertyId", async (c) => {
    try {
      const propertyId = c.req.param("propertyId");

      if (!services.propertyTokenFactory) {
        return c.json({ error: "Property token factory service not initialized" }, 500);
      }

      const deployment = await services.propertyTokenFactory.getPropertyDeployment(propertyId);

      if (!deployment) {
        return c.json({ error: "Deployment not found" }, 404);
      }

      return c.json({ success: true, data: deployment });
    } catch (error) {
      console.error("Get deployment error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to get deployment info",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  });

  // ============================================================
  // Identity Registry Endpoints
  // ============================================================

  /**
   * Register a new identity using ERC-3643 ONCHAINID methods
   * POST /api/identity/register
   */
  app.post("/api/identity/register", async (c) => {
    try {
      const params = await c.req.json();

      // Validate parameters per ERC-3643 identity requirements
      const validation = validateIdentityRegistrationParams(params);
      if (!validation.valid) {
        return c.json({ success: false, error: validation.error }, 400);
      }

      if (!services.identityRegistry) {
        return c.json({ error: "Identity registry service not initialized" }, 500);
      }

      // Register identity using ERC-3643 ONCHAINID pattern
      const result = await services.identityRegistry.registerIdentity(
        {
          userAddress: params.userAddress as Address,
          identityContract: params.identityContract as Address,
          country: params.country,
          verificationLevel: params.verificationLevel || "basic",
        },
        params.registrarAddress as Address
      );

      if (!result.success) {
        return c.json({ success: false, error: result.error }, 400);
      }

      return c.json({ success: true, data: result });
    } catch (error) {
      console.error("Register identity error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to register identity",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  });

  /**
   * Batch register identities
   * POST /api/identity/batch-register
   */
  app.post("/api/identity/batch-register", async (c) => {
    try {
      const { users, registrarAddress } = await c.req.json();

      if (!services.identityRegistry) {
        return c.json({ error: "Identity registry service not initialized" }, 500);
      }

      const result = await services.identityRegistry.batchRegisterIdentities({
        users,
        registrarAddress,
      });

      if (!result.success) {
        return c.json({ success: false, error: result.error }, 400);
      }

      return c.json({ success: true, data: { registered: result.txHash } });
    } catch (error) {
      console.error("Batch register error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to batch register identities",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  });

  /**
   * Check if user is verified using ERC-3643 isVerified method
   * GET /api/identity/verified/:address
   */
  app.get("/api/identity/verified/:address", async (c) => {
    try {
      const address = c.req.param("address");

      // Validate EVM address format
      if (!isValidEvmAddress(address)) {
        return c.json({ success: false, error: "Invalid Ethereum address format" }, 400);
      }

      if (!services.identityRegistry) {
        return c.json({ error: "Identity registry service not initialized" }, 500);
      }

      // Check verification status using ERC-3643 isVerified
      const result = await services.identityRegistry.isVerified(address as Address);

      if (!result.success) {
        return c.json({ success: false, error: result.error }, 400);
      }

      return c.json({ success: true, data: { verified: result.data } });
    } catch (error) {
      console.error("Check verified error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to check verification status",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  });

  /**
   * Get complete identity details using ERC-3643 identity methods
   * GET /api/identity/details/:address
   */
  app.get("/api/identity/details/:address", async (c) => {
    try {
      const address = c.req.param("address");

      // Validate EVM address format
      if (!isValidEvmAddress(address)) {
        return c.json({ success: false, error: "Invalid Ethereum address format" }, 400);
      }

      if (!services.identityRegistry) {
        return c.json({ error: "Identity registry service not initialized" }, 500);
      }

      // Get complete identity details using ERC-3643 methods
      const result = await services.identityRegistry.getIdentityDetails(address as Address);

      if (!result.success) {
        return c.json({ success: false, error: result.error }, 400);
      }

      return c.json({ success: true, data: result.data });
    } catch (error) {
      console.error("Get identity details error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to get identity details",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  });

  /**
   * Link KYC attestation to identity
   * POST /api/identity/link-kyc
   */
  app.post("/api/identity/link-kyc", async (c) => {
    try {
      const { userAddress, attestationHash, kycLevel } = await c.req.json();

      if (!services.identityRegistry) {
        return c.json({ error: "Identity registry service not initialized" }, 500);
      }

      const result = await services.identityRegistry.linkKycAttestation(userAddress, attestationHash, kycLevel);

      return c.json({ success: result, data: { linked: result } });
    } catch (error) {
      console.error("Link KYC error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to link KYC attestation",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  });

  /**
   * Add claim to identity
   * POST /api/identity/add-claim
   */
  app.post("/api/identity/add-claim", async (c) => {
    try {
      const { identityContract, claim, issuerAddress } = await c.req.json();

      if (!services.identityRegistry) {
        return c.json({ error: "Identity registry service not initialized" }, 500);
      }

      const result = await services.identityRegistry.addClaim(identityContract, claim, issuerAddress);

      if (!result.success) {
        return c.json({ success: false, error: result.error }, 400);
      }

      return c.json({ success: true, data: { claimId: result.txHash } });
    } catch (error) {
      console.error("Add claim error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to add claim",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  });

  // ============================================================
  // Settlement Endpoints
  // ============================================================

  /**
   * Settle matched buy/sell orders
   * POST /api/settlement/settle-pair
   */
  app.post("/api/settlement/settle-pair", async (c) => {
    try {
      const { buyOrder, sellOrder, buyer, seller } = await c.req.json();

      if (!services.settlement) {
        return c.json({ error: "Settlement service not initialized" }, 500);
      }

      // Convert string amounts to BigInt
      const params = {
        buyOrder: {
          ...buyOrder,
          propertyAmount: BigInt(buyOrder.propertyAmount),
          stablecoinAmount: BigInt(buyOrder.stablecoinAmount),
        },
        sellOrder: {
          ...sellOrder,
          propertyAmount: BigInt(sellOrder.propertyAmount),
          stablecoinAmount: BigInt(sellOrder.stablecoinAmount),
        },
        buyer,
        seller,
      };

      const result = await services.settlement.settlePair(params);

      if (!result.success) {
        return c.json({ success: false, error: result.error }, 400);
      }

      if (!result.data) {
        return c.json({ success: false, error: "Settlement data not available" }, 500);
      }

      return c.json({
        success: true,
        data: {
          ...result.data,
          propertyAmount: result.data.propertyAmount.toString(),
          stablecoinAmount: result.data.stablecoinAmount.toString(),
        },
      });
    } catch (error) {
      console.error("Settle pair error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to settle orders",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  });

  app.post("/api/settlement/settle-simple", async (c) => {
    try {
      const { buyer, seller, propertyToken, stablecoinToken, propertyAmount, stablecoinAmount, account } = await c.req.json();

      if (!services.settlement) {
        return c.json({ error: "Settlement service not initialized" }, 500);
      }

      const result = await services.settlement.settleSimple(
        buyer,
        seller,
        propertyToken,
        stablecoinToken,
        BigInt(propertyAmount),
        BigInt(stablecoinAmount),
        account
      );

      if (!result.success) {
        return c.json({ success: false, error: result.error }, 400);
      }

      if (!result.data) {
        return c.json({ success: false, error: "Settlement data not available" }, 500);
      }

      return c.json({
        success: true,
        data: {
          ...result.data,
          propertyAmount: result.data.propertyAmount.toString(),
          stablecoinAmount: result.data.stablecoinAmount.toString(),
        },
      });
    } catch (error) {
      console.error("Simple settlement error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to settle",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  });

  app.get("/api/settlement/:txId", async (c) => {
    try {
      const txId = c.req.param("txId");

      if (!services.settlement) {
        return c.json({ error: "Settlement service not initialized" }, 500);
      }

      const settlement = await services.settlement.getSettlement(txId as Hash);

      if (!settlement) {
        return c.json({ error: "Settlement not found" }, 404);
      }

      return c.json({
        success: true,
        data: {
          ...settlement,
          propertyAmount: settlement.propertyAmount.toString(),
          stablecoinAmount: settlement.stablecoinAmount.toString(),
        },
      });
    } catch (error) {
      console.error("Get settlement error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to get settlement",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  });

  /**
   * Get user's settlement history
   * GET /api/settlement/user/:address
   */
  app.get("/api/settlement/user/:address", async (c) => {
    try {
      const address = c.req.param("address");

      // Validate EVM address format
      if (!isValidEvmAddress(address)) {
        return c.json({ success: false, error: "Invalid Ethereum address format" }, 400);
      }

      if (!services.settlement) {
        return c.json({ error: "Settlement service not initialized" }, 500);
      }

      const settlements = await services.settlement.getUserSettlements(address as Address);

      return c.json({
        success: true,
        data: settlements.map((s) => ({
          ...s,
          propertyAmount: s.propertyAmount.toString(),
          stablecoinAmount: s.stablecoinAmount.toString(),
        })),
      });
    } catch (error) {
      console.error("Get user settlements error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to get user settlements",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  });

  // ============================================================
  // TREX Contract Endpoints
  // ============================================================

  /**
   * Get token information using ERC-3643 contract methods
   * GET /api/trex/token-info/:tokenContract
   */
  app.get("/api/trex/token-info/:tokenContract", async (c) => {
    try {
      const tokenContract = c.req.param("tokenContract");

      // Validate EVM address format
      if (!isValidEvmAddress(tokenContract)) {
        return c.json({ success: false, error: "Invalid Ethereum address format" }, 400);
      }

      if (!services.trexContracts) {
        return c.json({ error: "TREX contracts service not initialized" }, 500);
      }

      // Get token info using ERC-3643 methods only
      const result = await services.trexContracts.getTokenInfo(tokenContract as Address);

      if (!result.success) {
        return c.json({ success: false, error: result.error }, 400);
      }

      if (!result.data) {
        return c.json({ success: false, error: "Token data not available" }, 500);
      }

      return c.json({
        success: true,
        data: {
          ...result.data,
          totalSupply: result.data.totalSupply.toString(),
        },
      });
    } catch (error) {
      console.error("Get token info error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to get token info",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  });

  /**
   * Check transfer eligibility using ERC-3643 compliance.canTransfer method
   * POST /api/trex/can-transfer
   */
  app.post("/api/trex/can-transfer", async (c) => {
    try {
      const { from, to, amount, complianceContract } = await c.req.json();

      // Validate all EVM addresses
      const addressesToValidate = [from, to, complianceContract].filter(Boolean);
      for (const address of addressesToValidate) {
        if (!isValidEvmAddress(address)) {
          return c.json({ success: false, error: `Invalid Ethereum address: ${address}` }, 400);
        }
      }

      // Validate amount
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        return c.json({ success: false, error: "Invalid transfer amount" }, 400);
      }

      if (!services.trexContracts) {
        return c.json({ error: "TREX contracts service not initialized" }, 500);
      }

      // Check transfer eligibility using ERC-3643 compliance.canTransfer
      const result = await services.trexContracts.canTransfer(
        from as Address,
        to as Address,
        BigInt(amount),
        complianceContract as Address
      );

      if (!result.success) {
        return c.json({ success: false, error: result.error }, 400);
      }

      return c.json({ success: true, data: result.data });
    } catch (error) {
      console.error("Can transfer check error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to check transfer eligibility",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  });
}
