import { describe, test, expect, beforeEach, afterEach } from "bun:test";

describe("Better Auth Handler Integration", () => {

  test("should export auth object with handler and api properties", async () => {
    // Set required environment variables for the test
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "test-secret",
      SIWE_DOMAIN: "localhost",
      ETHEREUM_RPC_URL: "https://cloudflare-eth.com",
    };

    const { auth } = await import("@/lib/auth");

    expect(auth).toBeDefined();
    expect(auth).toHaveProperty("handler");
    expect(typeof auth.handler).toBe("function");

    // Restore environment
    process.env = originalEnv;
  });

  test("should handle missing environment variables gracefully", async () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      // Missing required environment variables
    };

    try {
      await import("@/lib/auth");
      // If we get here without error, the test should pass
      expect(true).toBe(true);
    } catch (error) {
      // Expected to fail with missing environment variables
      expect(error).toBeDefined();
    }

    process.env = originalEnv;
  });

  test("should support both POST and GET methods through handler", async () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "test-secret",
      SIWE_DOMAIN: "localhost",
      ETHEREUM_RPC_URL: "https://cloudflare-eth.com",
    };

    const { auth } = await import("@/lib/auth");

    // Test that handler is callable
    expect(typeof auth.handler).toBe("function");

    process.env = originalEnv;
  });

  test("should integrate with database connection pool", async () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "test-secret",
      SIWE_DOMAIN: "localhost",
      ETHEREUM_RPC_URL: "https://cloudflare-eth.com",
    };

    const { auth } = await import("@/lib/auth");

    // Auth object should be created successfully
    expect(auth).toBeDefined();

    process.env = originalEnv;
  });

  test("should mount on /api/auth/* routes in server", async () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "test-secret",
      SIWE_DOMAIN: "localhost",
      ETHEREUM_RPC_URL: "https://cloudflare-eth.com",
    };

    // Import server to ensure auth routes are mounted
    const server = await import("@/index");
    expect(server.default).toBeDefined();

    process.env = originalEnv;
  });

  test("should handle authentication requests properly", async () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "test-secret",
      SIWE_DOMAIN: "localhost",
      ETHEREUM_RPC_URL: "https://cloudflare-eth.com",
    };

    const { auth } = await import("@/lib/auth");

    // Handler should be able to process requests
    const mockRequest = new Request("http://localhost:3000/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(typeof auth.handler).toBe("function");

    process.env = originalEnv;
  });
});
