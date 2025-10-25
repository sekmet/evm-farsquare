/**
 * Environment configuration for the Better Auth backend
 * Validates required environment variables and provides secure defaults
 */

import { config } from "dotenv";

// Load environment variables from .env file
config();

/**
 * Environment configuration with validation
 */
export const env = {
  // Better Auth Configuration
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,

  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL,

  // Ethereum Configuration (for SIWE)
  ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL || "https://cloudflare-eth.com",
  SIWE_DOMAIN: process.env.SIWE_DOMAIN,

  // Optional: Additional allowed CORS origins (comma-separated)
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:5173",

  // EVM Blockchain Contracts and APIs
  EVM_RPC_URL: process.env.EVM_RPC_URL || "http://127.0.0.1:8545",
  WALLET_PRIVATE_KEY: process.env.WALLET_PRIVATE_KEY,
  ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY,
  INFURA_API_KEY: process.env.INFURA_API_KEY,
  ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
  OPTIMISM_SEPOLIA_RPC_URL: process.env.OPTIMISM_SEPOLIA_RPC_URL,
  BASE_SEPOLIA_RPC_URL: process.env.BASE_SEPOLIA_RPC_URL,
  SEPOLIA_RPC_URL: process.env.SEPOLIA_RPC_URL,

  // Node Environment
  NODE_ENV: process.env.NODE_ENV || "development",
};

/**
 * Validates that all required environment variables are present
 */
export function validateEnvironment(): void {
  const requiredVars = [
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "DATABASE_URL",
    "SIWE_DOMAIN",
    "EVM_RPC_URL",
    "WALLET_PRIVATE_KEY",
    "ETHERSCAN_API_KEY",
    "INFURA_API_KEY",
    "ALCHEMY_API_KEY",
    "OPTIMISM_SEPOLIA_RPC_URL",
    "BASE_SEPOLIA_RPC_URL",
    "SEPOLIA_RPC_URL",
  ];

  const missingVars = requiredVars.filter(varName => !env[varName as keyof typeof env]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}\n` +
      "Please check your .env file and ensure all required variables are set."
    );
  }

  // Validate BETTER_AUTH_SECRET length for security
  if (env.BETTER_AUTH_SECRET && env.BETTER_AUTH_SECRET.length < 32) {
    console.warn(
      "Warning: BETTER_AUTH_SECRET should be at least 32 characters long for security."
    );
  }
}

/**
 * Generates a secure random secret for development
 */
export async function generateSecureSecret(): Promise<string> {
  const crypto = await import('crypto');
  return crypto.randomBytes(32).toString('hex');
}

// Validate environment on module load
validateEnvironment();
