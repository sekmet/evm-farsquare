import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";

// Mock Better Auth
const mockBetterAuth = mock(() => ({
  handler: mock(() => new Response("auth handler response")),
  api: {
    getSession: mock(() => Promise.resolve({
      session: { id: 'session-123', userId: 'user-123', expiresAt: new Date(Date.now() + 3600000) },
      user: { id: 'user-123', email: 'test@example.com' }
    })),
  },
}));

mock.module("better-auth", () => ({
  betterAuth: mockBetterAuth,
}));

describe("Authentication Middleware", () => {
  beforeEach(() => {
    // Reset all mocks
    mockBetterAuth.mockClear();
  });

  test("should validate session and inject user context", async () => {
    const { createAuthMiddleware } = await import("@/lib/auth-middleware");

    const middleware = createAuthMiddleware();

    // Mock Hono context
    const mockContext = {
      req: { raw: { headers: new Headers({ cookie: 'session=valid-session' }) } },
      set: mock(),
      get: mock(),
    };

    const next = mock(() => Promise.resolve());

    await middleware(mockContext as any, next);

    expect(mockContext.set).toHaveBeenCalledWith('user', { id: 'user-123', email: 'test@example.com' });
    expect(mockContext.set).toHaveBeenCalledWith('session', { id: 'session-123', userId: 'user-123', expiresAt: expect.any(Date) });
    expect(next).toHaveBeenCalled();
  });

  test("should handle missing session gracefully", async () => {
    const { createAuthMiddleware } = await import("@/lib/auth-middleware");

    // Mock session to return null
    mockBetterAuth.mockReturnValue({
      handler: mock(() => new Response("auth handler response")),
      api: {
        getSession: mock(() => Promise.resolve(null)),
      },
    });

    const middleware = createAuthMiddleware();

    const mockContext = {
      req: { raw: { headers: new Headers() } },
      set: mock(),
      get: mock(),
    };

    const next = mock(() => Promise.resolve());

    await middleware(mockContext as any, next);

    expect(mockContext.set).toHaveBeenCalledWith('user', null);
    expect(mockContext.set).toHaveBeenCalledWith('session', null);
    expect(next).toHaveBeenCalled();
  });

  test("should create protected route middleware", async () => {
    const { createProtectedRouteMiddleware } = await import("@/lib/auth-middleware");

    const middleware = createProtectedRouteMiddleware();

    const mockContext = {
      req: { raw: { headers: new Headers({ cookie: 'session=valid-session' }) } },
      set: mock(),
      get: mock(() => ({ id: 'user-123', email: 'test@example.com' })),
      json: mock(),
      status: mock(() => mockContext),
    };

    const next = mock(() => Promise.resolve());

    await middleware(mockContext as any, next);

    expect(next).toHaveBeenCalled();
    expect(mockContext.json).not.toHaveBeenCalled();
  });

  test("should reject unauthorized access to protected routes", async () => {
    const { createProtectedRouteMiddleware } = await import("@/lib/auth-middleware");

    // Mock session to return null
    mockBetterAuth.mockReturnValue({
      handler: mock(() => new Response("auth handler response")),
      api: {
        getSession: mock(() => Promise.resolve(null)),
      },
    });

    const middleware = createProtectedRouteMiddleware();

    const mockContext = {
      req: { raw: { headers: new Headers() } },
      set: mock(),
      get: mock(() => null),
      json: mock(),
      status: mock(() => mockContext),
    };

    const next = mock(() => Promise.resolve());

    await middleware(mockContext as any, next);

    expect(mockContext.status).toHaveBeenCalledWith(401);
    expect(mockContext.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  test("should handle session validation errors", async () => {
    const { createAuthMiddleware } = await import("@/lib/auth-middleware");

    // Mock session to throw error
    mockBetterAuth.mockReturnValue({
      handler: mock(() => new Response("auth handler response")),
      api: {
        getSession: mock(() => Promise.reject(new Error('Session validation failed'))),
      },
    });

    const middleware = createAuthMiddleware();

    const mockContext = {
      req: { raw: { headers: new Headers() } },
      set: mock(),
      get: mock(),
    };

    const next = mock(() => Promise.resolve());

    await middleware(mockContext as any, next);

    expect(mockContext.set).toHaveBeenCalledWith('user', null);
    expect(mockContext.set).toHaveBeenCalledWith('session', null);
    expect(next).toHaveBeenCalled();
  });

  test("should support role-based access control", async () => {
    const { createRoleBasedMiddleware } = await import("@/lib/auth-middleware");

    const middleware = createRoleBasedMiddleware(['admin', 'user']);

    const mockContext = {
      req: { raw: { headers: new Headers({ cookie: 'session=valid-session' }) } },
      set: mock(),
      get: mock(() => ({ id: 'user-123', email: 'test@example.com', role: 'admin' })),
      json: mock(),
      status: mock(() => mockContext),
    };

    const next = mock(() => Promise.resolve());

    await middleware(mockContext as any, next);

    expect(next).toHaveBeenCalled();
  });

  test("should reject insufficient role permissions", async () => {
    const { createRoleBasedMiddleware } = await import("@/lib/auth-middleware");

    const middleware = createRoleBasedMiddleware(['admin']);

    const mockContext = {
      req: { raw: { headers: new Headers({ cookie: 'session=valid-session' }) } },
      set: mock(),
      get: mock(() => ({ id: 'user-123', email: 'test@example.com', role: 'user' })),
      json: mock(),
      status: mock(() => mockContext),
    };

    const next = mock(() => Promise.resolve());

    await middleware(mockContext as any, next);

    expect(mockContext.status).toHaveBeenCalledWith(403);
    expect(mockContext.json).toHaveBeenCalledWith({ error: "Insufficient permissions" });
  });

  test("should handle token refresh scenarios", async () => {
    const { createAuthMiddleware } = await import("@/lib/auth-middleware");

    const middleware = createAuthMiddleware();

    // Mock session with expired token that gets refreshed
    let callCount = 0;
    mockBetterAuth.mockReturnValue({
      handler: mock(() => new Response("auth handler response")),
      api: {
        getSession: mock(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              session: { id: 'session-123', userId: 'user-123', expiresAt: new Date(Date.now() - 1000) },
              user: { id: 'user-123', email: 'test@example.com' }
            });
          }
          return Promise.resolve({
            session: { id: 'session-456', userId: 'user-123', expiresAt: new Date(Date.now() + 3600000) },
            user: { id: 'user-123', email: 'test@example.com' }
          });
        }),
      },
    });

    const mockContext = {
      req: { raw: { headers: new Headers({ cookie: 'session=expired-session' }) } },
      set: mock(),
      get: mock(),
    };

    const next = mock(() => Promise.resolve());

    await middleware(mockContext as any, next);

    expect(mockContext.set).toHaveBeenCalledWith('session', { id: 'session-456', userId: 'user-123', expiresAt: expect.any(Date) });
  });

  test("should export middleware creation functions", async () => {
    const authMiddleware = await import("@/lib/auth-middleware");

    expect(authMiddleware).toHaveProperty('createAuthMiddleware');
    expect(authMiddleware).toHaveProperty('createProtectedRouteMiddleware');
    expect(authMiddleware).toHaveProperty('createRoleBasedMiddleware');

    expect(typeof authMiddleware.createAuthMiddleware).toBe('function');
    expect(typeof authMiddleware.createProtectedRouteMiddleware).toBe('function');
    expect(typeof authMiddleware.createRoleBasedMiddleware).toBe('function');
  });

  test("should handle concurrent requests properly", async () => {
    const { createAuthMiddleware } = await import("@/lib/auth-middleware");

    const middleware = createAuthMiddleware();

    const contexts = [
      {
        req: { raw: { headers: new Headers({ cookie: 'session=user1' }) } },
        set: mock(),
        get: mock(),
      },
      {
        req: { raw: { headers: new Headers({ cookie: 'session=user2' }) } },
        set: mock(),
        get: mock(),
      },
    ];

    const next = mock(() => Promise.resolve());

    await Promise.all([
      middleware(contexts[0] as any, next),
      middleware(contexts[1] as any, next),
    ]);

    expect(contexts[0].set).toHaveBeenCalled();
    expect(contexts[1].set).toHaveBeenCalled();
  });
});
