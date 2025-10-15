/**
 * Rate limiting implementation for authentication endpoints
 */

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

export const RATE_LIMITS = {
  LOGIN: {
    windowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '5'),
  },
  SIGNUP: {
    windowMs: parseInt(process.env.RATE_LIMIT_SIGNUP_WINDOW_MS || '3600000'), // 1 hour
    maxRequests: parseInt(process.env.RATE_LIMIT_SIGNUP_MAX || '3'),
  },
  GENERAL: {
    windowMs: parseInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS || '60000'), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_GENERAL_MAX || '10'),
  },
  SIWE: {
    windowMs: parseInt(process.env.RATE_LIMIT_SIWE_WINDOW_MS || '300000'), // 5 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_SIWE_MAX || '3'),
  },
};

/**
 * Get client IP address from request
 */
function getClientIP(c: any): string {
  // Check various headers for IP address
  const forwardedFor = c.req.header('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = c.req.header('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = c.req.header('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to a default for testing
  return '127.0.0.1';
}

/**
 * Check if request should be rate limited
 */
function checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; resetTime: number; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // First request or window expired
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, resetTime, remaining: config.maxRequests - 1 };
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    return { allowed: false, resetTime: entry.resetTime, remaining: 0 };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);
  return { allowed: true, resetTime: entry.resetTime, remaining: config.maxRequests - entry.count };
}

/**
 * Clean up expired entries periodically
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up expired entries every 5 minutes
setInterval(cleanupExpiredEntries, 300000);

/**
 * Create rate limiting middleware
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (c: any, next: () => Promise<void>) => {
    const clientIP = getClientIP(c);
    const key = `${clientIP}`;

    const { allowed, resetTime, remaining } = checkRateLimit(key, config);

    // Set rate limit headers
    c.header('X-RateLimit-Limit', config.maxRequests.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());

    if (!allowed) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      c.header('Retry-After', retryAfter.toString());

      return c.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        },
      });
    }

    await next();
  };
}

/**
 * Apply rate limiting to authentication endpoints
 */
export function applyRateLimiting(app: any): void {
  // Rate limit login attempts (stricter limits)
  app.use('/api/auth/signin', createRateLimitMiddleware(RATE_LIMITS.LOGIN));

  // Rate limit signup attempts
  app.use('/api/auth/signup', createRateLimitMiddleware(RATE_LIMITS.SIGNUP));

  // Rate limit SIWE operations
  app.use('/api/auth/siwe/*', createRateLimitMiddleware(RATE_LIMITS.SIWE));

  // General rate limiting for other auth endpoints
  app.use('/api/auth/*', createRateLimitMiddleware(RATE_LIMITS.GENERAL));
}

/**
 * Create endpoint-specific rate limiting middleware
 */
export function createEndpointRateLimit(endpoint: keyof typeof RATE_LIMITS) {
  return createRateLimitMiddleware(RATE_LIMITS[endpoint]);
}

/**
 * Get current rate limit status for an IP
 */
export function getRateLimitStatus(ip: string, config: RateLimitConfig): { remaining: number; resetTime: number; total: number } {
  const entry = rateLimitStore.get(ip);
  const now = Date.now();

  if (!entry || now > entry.resetTime) {
    return { remaining: config.maxRequests, resetTime: now + config.windowMs, total: config.maxRequests };
  }

  return {
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime,
    total: config.maxRequests
  };
}

/**
 * Reset rate limit for a specific IP
 */
export function resetRateLimit(ip: string): void {
  rateLimitStore.delete(ip);
}

/**
 * Get rate limiting statistics
 */
export function getRateLimitStats(): { totalKeys: number; cleanupInterval: number } {
  return {
    totalKeys: rateLimitStore.size,
    cleanupInterval: 300000, // 5 minutes
  };
}
