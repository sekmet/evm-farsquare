import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";

// Mock Hono and middleware
const mockHono = mock(() => ({
  use: mock(),
  on: mock(),
}));

mock.module("hono", () => ({
  Hono: mockHono,
}));

describe("Rate Limiting Implementation", () => {
  beforeEach(() => {
    // Reset all mocks
    mockHono.mockClear();
  });

  test("should create rate limiting middleware", async () => {
    const { createRateLimitMiddleware } = await import("@/lib/rate-limiting");

    expect(typeof createRateLimitMiddleware).toBe('function');

    const middleware = createRateLimitMiddleware({
      windowMs: 60000,
      maxRequests: 5,
    });

    expect(typeof middleware).toBe('function');
  });

  test("should apply rate limiting to authentication endpoints", async () => {
    const { applyRateLimiting } = await import("@/lib/rate-limiting");

    expect(typeof applyRateLimiting).toBe('function');

    const mockApp = { use: mock() };
    applyRateLimiting(mockApp as any);

    expect(mockApp.use).toHaveBeenCalled();
  });

  test("should configure different limits for different endpoints", async () => {
    const { RATE_LIMITS } = await import("@/lib/rate-limiting");

    expect(RATE_LIMITS).toBeDefined();
    expect(RATE_LIMITS.LOGIN).toBeDefined();
    expect(RATE_LIMITS.SIGNUP).toBeDefined();
    expect(RATE_LIMITS.GENERAL).toBeDefined();

    // Login should have stricter limits than general endpoints
    expect(RATE_LIMITS.LOGIN.maxRequests).toBeLessThanOrEqual(RATE_LIMITS.GENERAL.maxRequests);
  });

  test("should handle rate limit exceeded", async () => {
    const { createRateLimitMiddleware } = await import("@/lib/rate-limiting");

    const middleware = createRateLimitMiddleware({
      windowMs: 1000,
      maxRequests: 1,
    });

    // Mock request/response objects
    const mockContext = {
      req: {
        header: mock(() => '127.0.0.1'),
      },
      json: mock(),
      status: mock(() => mockContext),
    };

    // First request should pass
    await middleware(mockContext as any, mock(() => {}));
    expect(mockContext.json).not.toHaveBeenCalled();

    // Second request should be rate limited
    await middleware(mockContext as any, mock(() => {}));
    expect(mockContext.status).toHaveBeenCalledWith(429);
    expect(mockContext.json).toHaveBeenCalled();
  });

  test("should use IP-based rate limiting", async () => {
    const { createRateLimitMiddleware } = await import("@/lib/rate-limiting");

    const middleware = createRateLimitMiddleware({
      windowMs: 1000,
      maxRequests: 1,
    });

    const mockContext1 = {
      req: { header: mock(() => '192.168.1.1') },
      json: mock(),
      status: mock(() => mockContext1),
    };

    const mockContext2 = {
      req: { header: mock(() => '192.168.1.2') },
      json: mock(),
      status: mock(() => mockContext2),
    };

    // Both IPs should be able to make requests independently
    await middleware(mockContext1 as any, mock(() => {}));
    await middleware(mockContext2 as any, mock(() => {}));

    expect(mockContext1.json).not.toHaveBeenCalled();
    expect(mockContext2.json).not.toHaveBeenCalled();
  });

  test("should configure limits via environment variables", async () => {
    // Test that rate limits can be configured via environment
    const originalEnv = process.env;
    process.env.RATE_LIMIT_LOGIN_MAX = '10';
    process.env.RATE_LIMIT_WINDOW_MS = '300000';

    // Reload module to pick up env changes
    delete require.cache[require.resolve('@/lib/rate-limiting')];
    const { RATE_LIMITS } = await import("@/lib/rate-limiting");

    expect(RATE_LIMITS.LOGIN.maxRequests).toBe(10);

    // Restore environment
    process.env = originalEnv;
  });

  test("should provide proper error responses for rate limits", async () => {
    const { createRateLimitMiddleware } = await import("@/lib/rate-limiting");

    const middleware = createRateLimitMiddleware({
      windowMs: 1000,
      maxRequests: 1,
    });

    const mockContext = {
      req: { header: mock(() => '127.0.0.1') },
      json: mock(),
      status: mock(() => mockContext),
      header: mock(() => mockContext),
    };

    // Exceed rate limit
    await middleware(mockContext as any, mock(() => {}));
    await middleware(mockContext as any, mock(() => {}));

    expect(mockContext.status).toHaveBeenCalledWith(429);
    expect(mockContext.json).toHaveBeenCalledWith({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    });
  });

  test("should reset rate limit after window expires", async () => {
    const { createRateLimitMiddleware } = await import("@/lib/rate-limiting");

    const middleware = createRateLimitMiddleware({
      windowMs: 100, // Very short window for testing
      maxRequests: 1,
    });

    const mockContext = {
      req: { header: mock(() => '127.0.0.1') },
      json: mock(),
      status: mock(() => mockContext),
    };

    // First request
    await middleware(mockContext as any, mock(() => {}));
    expect(mockContext.json).not.toHaveBeenCalled();

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 150));

    // Second request should work again
    await middleware(mockContext as any, mock(() => {}));
    expect(mockContext.json).not.toHaveBeenCalled();
  });

  test("should include retry-after header", async () => {
    const { createRateLimitMiddleware } = await import("@/lib/rate-limiting");

    const middleware = createRateLimitMiddleware({
      windowMs: 60000, // 1 minute
      maxRequests: 1,
    });

    const mockContext = {
      req: { header: mock(() => '127.0.0.1') },
      json: mock(),
      status: mock(() => mockContext),
      header: mock(() => mockContext),
    };

    // Exceed rate limit
    await middleware(mockContext as any, mock(() => {}));
    await middleware(mockContext as any, mock(() => {}));

    expect(mockContext.header).toHaveBeenCalledWith('Retry-After', expect.any(String));
  });

  test("should handle missing IP address gracefully", async () => {
    const { createRateLimitMiddleware } = await import("@/lib/rate-limiting");

    const middleware = createRateLimitMiddleware({
      windowMs: 1000,
      maxRequests: 1,
    });

    const mockContext = {
      req: { header: mock(() => undefined) }, // No IP
      json: mock(),
      status: mock(() => mockContext),
    };

    // Should still work with fallback IP
    await middleware(mockContext as any, mock(() => {}));
    expect(mockContext.json).not.toHaveBeenCalled();
  });
});
