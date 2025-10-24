import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { generateKeyPair, exportJWK } from "jose";
import { createAttestation } from "./attestation";
import { storeAttestation, getAttestation, initStorage } from "./storage";
import type { JWK } from "jose";

// Identity registry integration (optional - requires backend services)
interface IdentityRegistryClient {
  registerIdentity: (userAddress: string, attestationHash: string, kycLevel: string) => Promise<boolean>;
  linkKycAttestation: (userAddress: string, attestationHash: string, kycLevel: string) => Promise<boolean>;
}

let identityRegistryClient: IdentityRegistryClient | null = null;

// Initialize identity registry client if backend URL is provided
if (process.env.BACKEND_API_URL) {
  identityRegistryClient = {
    registerIdentity: async (userAddress: string, attestationHash: string, kycLevel: string) => {
      try {
        const response = await fetch(`${process.env.BACKEND_API_URL}/api/identity/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userAddress, attestationHash, kycLevel }),
        });
        return response.ok;
      } catch (error) {
        console.error("Failed to register identity:", error);
        return false;
      }
    },
    linkKycAttestation: async (userAddress: string, attestationHash: string, kycLevel: string) => {
      try {
        const response = await fetch(`${process.env.BACKEND_API_URL}/api/identity/link-kyc`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userAddress, attestationHash, kycLevel }),
        });
        return response.ok;
      } catch (error) {
        console.error("Failed to link KYC attestation:", error);
        return false;
      }
    },
  };
}

const app = new Hono();

// Middleware
app.use("/*", cors());
app.use("/*", logger());

// In-memory storage for testing (replace with database in production)
const submissions = new Map<string, {
  kycId: string;
  wallet: string;
  fileName: string;
  uploadUrl: string;
  timestamp: number;
}>();

// Mock signing key (replace with KMS in production)
let signingKey: JWK;

/**
 * Initialize server and signing key
 */
async function initServer() {
  await initStorage();
  
  // Generate signing key for attestations
  const keypair = await generateKeyPair("ES256", { extractable: true });
  signingKey = await exportJWK(keypair.privateKey);
  
  console.log("✅ KYC Server initialized");
  console.log("📁 Storage directory ready");
  console.log("🔑 Signing key generated");
}

/**
 * Health check endpoint
 */
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: Date.now() });
});

/**
 * Submit KYC request - generates presigned URL for upload
 * POST /kyc/submit
 * Body: { wallet: string, fileName: string }
 */
app.post("/kyc/submit", async (c) => {
  try {
    const { wallet, fileName } = await c.req.json();
    
    if (!wallet || !fileName) {
      return c.json({ error: "Missing wallet or fileName" }, 400);
    }
    
    const kycId = `kyc-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const uploadUrl = `http://localhost:4000/mock-upload/${wallet}/${Date.now()}/${fileName}`;
    
    // Store submission
    submissions.set(kycId, {
      kycId,
      wallet,
      fileName,
      uploadUrl,
      timestamp: Date.now(),
    });
    
    return c.json({
      kycId,
      uploadUrl,
      message: "Upload URL generated. Use this to upload your KYC document.",
    });
  } catch (error) {
    console.error("Error in /kyc/submit:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Provider callback - processes KYC verification result
 * POST /kyc/provider-callback
 * Body: { kycId: string, wallet: string, kycLevel: string }
 */
app.post("/kyc/provider-callback", async (c) => {
  try {
    const { kycId, wallet, kycLevel } = await c.req.json();
    
    if (!kycId || !wallet || !kycLevel) {
      return c.json({ error: "Missing required fields" }, 400);
    }
    
    // Verify submission exists
    const submission = submissions.get(kycId);
    if (!submission) {
      return c.json({ error: "KYC submission not found" }, 404);
    }
    
    // Create attestation with W3C Verifiable Credential
    const attestation = await createAttestation(
      { wallet, level: kycLevel, validityDays: 365 },
      signingKey
    );
    
    // Store attestation securely
    await storeAttestation(attestation.attestationHash, attestation);
    
    console.log(`✅ Attestation created for ${wallet}: ${attestation.attestationHash}`);
    
    // Link attestation with on-chain identity (if backend is available)
    if (identityRegistryClient) {
      const linked = await identityRegistryClient.linkKycAttestation(
        wallet,
        attestation.attestationHash,
        kycLevel
      );
      
      if (linked) {
        console.log(`✅ KYC attestation linked to on-chain identity for ${wallet}`);
      } else {
        console.warn(`⚠️  Failed to link KYC attestation to on-chain identity for ${wallet}`);
      }
    }
    
    return c.json({
      success: true,
      kycId,
      wallet,
      attestationHash: attestation.attestationHash,
      credential: attestation.credential,
      proof: attestation.proof,
      message: "KYC attestation generated successfully",
    });
  } catch (error) {
    console.error("Error in /kyc/provider-callback:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Get attestation by hash
 * GET /kyc/attestation/:hash
 */
app.get("/kyc/attestation/:hash", async (c) => {
  try {
    const hash = c.req.param("hash");
    
    if (!hash || hash.length !== 64) {
      return c.json({ error: "Invalid attestation hash" }, 400);
    }
    
    const attestation = await getAttestation(hash);
    
    if (!attestation) {
      return c.json({ error: "Attestation not found" }, 404);
    }
    
    return c.json({
      attestationHash: hash,
      ...attestation,
    });
  } catch (error) {
    console.error("Error in /kyc/attestation/:hash:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * List all submissions (admin endpoint - secure in production)
 * GET /kyc/submissions
 */
app.get("/kyc/submissions", (c) => {
  const allSubmissions = Array.from(submissions.values());
  return c.json({
    count: allSubmissions.length,
    submissions: allSubmissions,
  });
});

// Start server
const PORT = process.env.PORT || 4001;

initServer().then(() => {
  console.log(`🚀 Farsquare KYC Server listening on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`📤 Submit KYC: POST http://localhost:${PORT}/kyc/submit`);
  console.log(`🔄 Provider callback: POST http://localhost:${PORT}/kyc/provider-callback`);
  console.log(`📥 Get attestation: GET http://localhost:${PORT}/kyc/attestation/:hash`);
});

export default {
  port: PORT,
  fetch: app.fetch,
};
