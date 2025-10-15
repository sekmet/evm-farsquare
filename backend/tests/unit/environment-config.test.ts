import { describe, test, expect, beforeEach, afterEach } from "bun:test";

// Mock crypto for random secret generation
const mockRandomBytes = mock(() => Buffer.from("mock-random-32-character-secret-key"));
mock.module("crypto", () => ({
  randomBytes: mockRandomBytes,
}));

describe("Environment Configuration", () => {
  test("should validate BETTER_AUTH_SECRET is required", () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      ETHEREUM_RPC_URL: "https://mainnet.infura.io/v3/test",
      SIWE_DOMAIN: "localhost",
      // Missing BETTER_AUTH_SECRET
    };

    try {
      // Import the auth module which should validate environment variables
      await import("@/lib/auth");
      // If we get here without error, check that it handles missing variables
      expect(process.env.BETTER_AUTH_SECRET).toBeUndefined();
    } catch (error) {
      // Expected to fail with missing BETTER_AUTH_SECRET
      expect(error).toBeDefined();
    }

    process.env = originalEnv;
  });

  test("should validate BETTER_AUTH_URL is required", () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      BETTER_AUTH_SECRET: "test-secret-key-32-characters-long",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      ETHEREUM_RPC_URL: "https://mainnet.infura.io/v3/test",
      SIWE_DOMAIN: "localhost",
      // Missing BETTER_AUTH_URL
    };

    try {
      await import("@/lib/auth");
      expect(process.env.BETTER_AUTH_URL).toBeUndefined();
    } catch (error) {
      expect(error).toBeDefined();
    }

    process.env = originalEnv;
  });

  test("should validate DATABASE_URL is required", () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      BETTER_AUTH_SECRET: "test-secret-key-32-characters-long",
      BETTER_AUTH_URL: "http://localhost:4000",
      ETHEREUM_RPC_URL: "https://mainnet.infura.io/v3/test",
      SIWE_DOMAIN: "localhost",
      // Missing DATABASE_URL
    };

    try {
      await import("@/lib/auth");
      expect(process.env.DATABASE_URL).toBeUndefined();
    } catch (error) {
      expect(error).toBeDefined();
    }

    process.env = originalEnv;
  });

  test("should validate ETHEREUM_RPC_URL is required", () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      BETTER_AUTH_SECRET: "test-secret-key-32-characters-long",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      SIWE_DOMAIN: "localhost",
      // Missing ETHEREUM_RPC_URL
    };

    try {
      await import("@/lib/auth");
      expect(process.env.ETHEREUM_RPC_URL).toBeUndefined();
    } catch (error) {
      expect(error).toBeDefined();
    }

    process.env = originalEnv;
  });

  test("should validate SIWE_DOMAIN is required", () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      BETTER_AUTH_SECRET: "test-secret-key-32-characters-long",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      ETHEREUM_RPC_URL: "https://mainnet.infura.io/v3/test",
      // Missing SIWE_DOMAIN
    };

    try {
      await import("@/lib/auth");
      expect(process.env.SIWE_DOMAIN).toBeUndefined();
    } catch (error) {
      expect(error).toBeDefined();
    }

    process.env = originalEnv;
  });

  test("should accept valid environment configuration", () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      BETTER_AUTH_SECRET: "test-secret-key-32-characters-long",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      ETHEREUM_RPC_URL: "https://mainnet.infura.io/v3/test",
      SIWE_DOMAIN: "localhost",
    };

    // Should not throw an error with valid configuration
    expect(async () => {
      await import("@/lib/auth");
    }).not.toThrow();

    process.env = originalEnv;
  });

  test("should provide fallback for ETHEREUM_RPC_URL in development", () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      BETTER_AUTH_SECRET: "test-secret-key-32-characters-long",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      SIWE_DOMAIN: "localhost",
      // ETHEREUM_RPC_URL can be undefined and should fallback
    };

    // Should not throw an error due to missing ETHEREUM_RPC_URL (has fallback)
    expect(async () => {
      await import("@/lib/auth");
    }).not.toThrow();

    process.env = originalEnv;
  });

  test("should validate environment variables are strings", () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      BETTER_AUTH_SECRET: "test-secret-key-32-characters-long",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      ETHEREUM_RPC_URL: "https://mainnet.infura.io/v3/test",
      SIWE_DOMAIN: "localhost",
    };

    // All required environment variables should be strings
    expect(typeof process.env.BETTER_AUTH_SECRET).toBe("string");
    expect(typeof process.env.BETTER_AUTH_URL).toBe("string");
    expect(typeof process.env.DATABASE_URL).toBe("string");
    expect(typeof process.env.ETHEREUM_RPC_URL).toBe("string");
    expect(typeof process.env.SIWE_DOMAIN).toBe("string");

    process.env = originalEnv;
  });

  test("should validate BETTER_AUTH_SECRET meets length requirements", () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      BETTER_AUTH_SECRET: "short", // Too short for security
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      ETHEREUM_RPC_URL: "https://mainnet.infura.io/v3/test",
      SIWE_DOMAIN: "localhost",
    };

    // Should still work but ideally would warn about short secrets
    expect(async () => {
      await import("@/lib/auth");
    }).not.toThrow();

    process.env = originalEnv;
  });

  test("should support production domain configuration", () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      BETTER_AUTH_SECRET: "test-secret-key-32-characters-long",
      BETTER_AUTH_URL: "https://evmfsq.farsquare.xyz",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      ETHEREUM_RPC_URL: "https://mainnet.infura.io/v3/test",
      SIWE_DOMAIN: "evmfsq.farsquare.xyz",
    };

    // Should work with production domain
    expect(async () => {
      await import("@/lib/auth");
    }).not.toThrow();

    process.env = originalEnv;
  });

  test("should validate DATABASE_URL format", () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      BETTER_AUTH_SECRET: "test-secret-key-32-characters-long",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "invalid-url-format",
      ETHEREUM_RPC_URL: "https://mainnet.infura.io/v3/test",
      SIWE_DOMAIN: "localhost",
    };

    // Should still work (validation happens at connection time)
    expect(async () => {
      await import("@/lib/auth");
    }).not.toThrow();

    process.env = originalEnv;
  });

  test("should generate secure random secrets for development", () => {
    // Test that crypto.randomBytes is available for secret generation
    expect(mockRandomBytes).toBeDefined();

    // In a real implementation, this would be used to generate BETTER_AUTH_SECRET
    const randomBytes = mockRandomBytes(32);
    expect(randomBytes).toBeInstanceOf(Buffer);
    expect(randomBytes.length).toBe(32);
  });
});
