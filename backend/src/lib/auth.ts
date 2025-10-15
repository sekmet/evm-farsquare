import { betterAuth } from "better-auth";
import { siwe } from "better-auth/plugins";
import { getPool } from "./database";
import { verifyMessage, createPublicClient, http } from "viem";
import { base } from "viem/chains";

// Validate required environment variables
function validateEnvironment() {
  if (!process.env.BETTER_AUTH_URL) {
    throw new Error('BETTER_AUTH_URL environment variable is required');
  }
  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error('BETTER_AUTH_SECRET environment variable is required');
  }
}

// Base Better Auth configuration
export const createBaseAuth = () => {
  validateEnvironment();
  return betterAuth({
    database: getPool(), // Use raw Pool instance for Better Auth
    baseURL: process.env.BETTER_AUTH_URL!,
    secret: process.env.BETTER_AUTH_SECRET!,
    trustedOrigins: (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : []).concat(["http://localhost:5173"]), // Include frontend origins
    emailAndPassword: {
      enabled: true,
    },
  });
};

// Create Ethereum client for ENS lookups
const ethereumClient = createPublicClient({
  chain: base,
  transport: http(process.env.ETHEREUM_RPC_URL || "https://cloudflare-eth.com"),
});

// SIWE plugin configuration
const siwePlugin = siwe({
  domain: process.env.SIWE_DOMAIN!,
  emailDomainName: "farsquare.xyz",
  anonymous: false,
  getNonce: async () => {
    const crypto = await import('crypto');
    return crypto.randomBytes(32).toString('hex');
  },
  verifyMessage: async ({ message, signature, address }) => {
    try {
      const isValid = await verifyMessage({
        address: address as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
      return isValid;
    } catch (error) {
      console.error("SIWE verification failed:", error);
      return false;
    }
  },
  ensLookup: async ({ walletAddress }) => {
    try {
      const ensName = await ethereumClient.getEnsName({
        address: walletAddress as `0x${string}`,
      });

      const ensAvatar = ensName
        ? await ethereumClient.getEnsAvatar({ name: ensName })
        : null;

      return {
        name: ensName || walletAddress,
        avatar: ensAvatar || "",
      };
    } catch {
      return {
        name: walletAddress,
        avatar: "",
      };
    }
  },
});

// Full Better Auth instance with SIWE plugin
export const auth = (() => {
  validateEnvironment();
  return betterAuth({
    database: getPool(), // Use raw Pool instance for Better Auth
    baseURL: process.env.BETTER_AUTH_URL!,
    secret: process.env.BETTER_AUTH_SECRET!,
    trustedOrigins: (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : []).concat(["http://localhost:5173"]), // Include frontend origin
    emailAndPassword: {
      enabled: true,
    },
    plugins: [siwePlugin],
  });
})();
