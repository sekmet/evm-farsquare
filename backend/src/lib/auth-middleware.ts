import { auth } from './auth';

/**
 * Authentication middleware for Hono applications
 */

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  [key: string]: any;
}

interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  [key: string]: any;
}

interface AuthContext {
  user: User | null;
  session: Session | null;
}

/**
 * Create authentication middleware that validates sessions and injects user context
 */
export function createAuthMiddleware() {
  return async (c: any, next: () => Promise<void>) => {
    try {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });

      if (!session) {
        c.set("user", null);
        c.set("session", null);
        return next();
      }

      c.set("user", session.user);
      c.set("session", session.session);
      return next();
    } catch (error) {
      // Log error but don't fail the request
      console.error("Session validation error:", error);
      c.set("user", null);
      c.set("session", null);
      return next();
    }
  };
}

/**
 * Create middleware for protected routes that require authentication
 */
export function createProtectedRouteMiddleware() {
  return async (c: any, next: () => Promise<void>) => {
    const user = c.get("user");

    if (!user) {
      return c.status(401).json({ error: "Unauthorized" });
    }

    return next();
  };
}

/**
 * Create role-based access control middleware
 */
export function createRoleBasedMiddleware(allowedRoles: string[]) {
  return async (c: any, next: () => Promise<void>) => {
    const user = c.get("user") as User | null;

    if (!user) {
      return c.status(401).json({ error: "Unauthorized" });
    }

    if (!user.role || !allowedRoles.includes(user.role)) {
      return c.status(403).json({ error: "Insufficient permissions" });
    }

    return next();
  };
}

/**
 * Create middleware for optional authentication (doesn't fail if not authenticated)
 */
export function createOptionalAuthMiddleware() {
  return async (c: any, next: () => Promise<void>) => {
    try {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });

      if (session) {
        c.set("user", session.user);
        c.set("session", session.session);
      } else {
        c.set("user", null);
        c.set("session", null);
      }
    } catch (error) {
      console.error("Optional auth validation error:", error);
      c.set("user", null);
      c.set("session", null);
    }

    return next();
  };
}

/**
 * Create middleware for API key authentication
 */
export function createApiKeyMiddleware(validApiKeys: string[]) {
  return async (c: any, next: () => Promise<void>) => {
    const apiKey = c.req.header("X-API-Key") || c.req.header("Authorization")?.replace("Bearer ", "");

    if (!apiKey || !validApiKeys.includes(apiKey)) {
      return c.status(401).json({ error: "Invalid API key" });
    }

    c.set("apiKey", apiKey);
    return next();
  };
}

/**
 * Create middleware that combines authentication methods
 */
export function createCombinedAuthMiddleware(options: {
  requireAuth?: boolean;
  allowedRoles?: string[];
  apiKeys?: string[];
}) {
  const middlewares: Array<(c: any, next: () => Promise<void>) => Promise<void>> = [];

  // Add API key middleware if configured
  if (options.apiKeys && options.apiKeys.length > 0) {
    middlewares.push(createApiKeyMiddleware(options.apiKeys));
  }

  // Add session validation
  middlewares.push(createAuthMiddleware());

  // Add role-based access control if required
  if (options.requireAuth !== false) {
    middlewares.push(createProtectedRouteMiddleware());
  }

  if (options.allowedRoles && options.allowedRoles.length > 0) {
    middlewares.push(createRoleBasedMiddleware(options.allowedRoles));
  }

  return async (c: any, next: () => Promise<void>) => {
    for (const middleware of middlewares) {
      await middleware(c, async () => {});
    }
    return next();
  };
}

/**
 * Create middleware for token refresh handling
 */
export function createTokenRefreshMiddleware() {
  return async (c: any, next: () => Promise<void>) => {
    const session = c.get("session") as Session | null;

    if (session) {
      const now = new Date();
      const expiresAt = new Date(session.expiresAt);
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();

      // If session expires within 5 minutes, set refresh flag
      if (timeUntilExpiry < 5 * 60 * 1000) {
        c.set("needsRefresh", true);
      }
    }

    await next();

    // Add refresh token to response headers if needed
    if (c.get("needsRefresh")) {
      // In a real implementation, this would generate a new token
      c.header("X-Refresh-Token", "needed");
    }
  };
}

/**
 * Create middleware for logging authentication events
 */
export function createAuthLoggingMiddleware() {
  return async (c: any, next: () => Promise<void>) => {
    const startTime = Date.now();
    const user = c.get("user");
    const path = c.req.path;
    const method = c.req.method;

    await next();

    const duration = Date.now() - startTime;
    const status = c.res?.status || 200;

    // Log authentication-related requests
    if (path.startsWith('/api/auth/') || user) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        type: 'AUTH_REQUEST',
        method,
        path,
        status,
        duration: `${duration}ms`,
        userId: user?.id || null,
      }));
    }
  };
}

/**
 * Helper function to get current user from context
 */
export function getCurrentUser(c: any): User | null {
  return c.get("user");
}

/**
 * Helper function to get current session from context
 */
export function getCurrentSession(c: any): Session | null {
  return c.get("session");
}

/**
 * Helper function to check if user has specific role
 */
export function hasRole(user: User | null, role: string): boolean {
  return user?.role === role;
}

/**
 * Helper function to check if user has any of the specified roles
 */
export function hasAnyRole(user: User | null, roles: string[]): boolean {
  return user?.role ? roles.includes(user.role) : false;
}

/**
 * Helper function to require authentication in route handlers
 */
export function requireAuth(c: any): User {
  const user = getCurrentUser(c);
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}

/**
 * Helper function to require specific role in route handlers
 */
export function requireRole(c: any, role: string): User {
  const user = requireAuth(c);
  if (!hasRole(user, role)) {
    throw new Error(`Role '${role}' required`);
  }
  return user;
}

/**
 * Create middleware composition utility
 */
export function composeMiddleware(...middlewares: Array<(c: any, next: () => Promise<void>) => Promise<void>>) {
  return async (c: any, next: () => Promise<void>) => {
    const dispatch = async (i: number): Promise<void> => {
      if (i === middlewares.length) {
        return next();
      }
      return middlewares[i](c, () => dispatch(i + 1));
    };
    return dispatch(0);
  };
}

/**
 * Pre-configured middleware combinations for common use cases
 */
export const AuthMiddleware = {
  // Basic session validation
  session: createAuthMiddleware(),

  // Require authentication
  protected: composeMiddleware(
    createAuthMiddleware(),
    createProtectedRouteMiddleware()
  ),

  // Admin-only access
  admin: composeMiddleware(
    createAuthMiddleware(),
    createProtectedRouteMiddleware(),
    createRoleBasedMiddleware(['admin'])
  ),

  // User or admin access
  userOrAdmin: composeMiddleware(
    createAuthMiddleware(),
    createProtectedRouteMiddleware(),
    createRoleBasedMiddleware(['user', 'admin'])
  ),

  // API with optional auth
  optional: createOptionalAuthMiddleware(),

  // API with logging
  withLogging: composeMiddleware(
    createAuthMiddleware(),
    createAuthLoggingMiddleware()
  ),

  // API with token refresh
  withRefresh: composeMiddleware(
    createAuthMiddleware(),
    createTokenRefreshMiddleware()
  ),
};
