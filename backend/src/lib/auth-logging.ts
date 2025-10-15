import { createHash } from 'crypto';

/**
 * Authentication event logging system
 */

export interface AuthEvent {
  type: AuthEventType;
  timestamp?: Date;
  userId?: string;
  email?: string;
  walletAddress?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  reason?: string;
  attemptCount?: number;
  context?: Record<string, any>;
  [key: string]: any;
}

export type AuthEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'SESSION_CREATED'
  | 'SESSION_DESTROYED'
  | 'SIWE_VERIFY_SUCCESS'
  | 'SIWE_VERIFY_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'EMAIL_VERIFIED'
  | 'PROFILE_UPDATED';

export const AUTH_EVENT_TYPES = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS' as const,
  LOGIN_FAILED: 'LOGIN_FAILED' as const,
  LOGOUT: 'LOGOUT' as const,
  SESSION_CREATED: 'SESSION_CREATED' as const,
  SESSION_DESTROYED: 'SESSION_DESTROYED' as const,
  SIWE_VERIFY_SUCCESS: 'SIWE_VERIFY_SUCCESS' as const,
  SIWE_VERIFY_FAILED: 'SIWE_VERIFY_FAILED' as const,
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED' as const,
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED' as const,
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED' as const,
  ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED' as const,
  EMAIL_VERIFIED: 'EMAIL_VERIFIED' as const,
  PROFILE_UPDATED: 'PROFILE_UPDATED' as const,
} as const;

/**
 * Log an authentication event
 */
export function logAuthEvent(event: AuthEvent): void {
  const timestamp = event.timestamp || new Date();
  const logData = {
    timestamp: timestamp.toISOString(),
    eventType: event.type,
    userId: event.userId,
    email: event.email ? maskEmail(event.email) : undefined,
    walletAddress: event.walletAddress,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    sessionId: event.sessionId,
    reason: event.reason,
    attemptCount: event.attemptCount,
    context: event.context,
  };

  const logMessage = JSON.stringify(logData);
  const logLevel = getLogLevel(event.type);

  switch (logLevel) {
    case 'ERROR':
      console.error(logMessage);
      break;
    case 'WARN':
      console.warn(logMessage);
      break;
    case 'INFO':
    default:
      console.log(logMessage);
      break;
  }
}

/**
 * Mask email address for privacy
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.***';

  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2
    ? local[0] + '*'.repeat(Math.max(1, local.length - 2)) + local[local.length - 1]
    : '*'.repeat(local.length);

  const domainParts = domain.split('.');
  const maskedDomain = domainParts.length > 1
    ? domainParts[0][0] + '*'.repeat(Math.max(1, domainParts[0].length - 2)) +
      (domainParts[0].length > 1 ? domainParts[0][domainParts[0].length - 1] : '') +
      '.' + domainParts.slice(1).join('.')
    : domain;

  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Hash sensitive values for logging
 */
export function hashValue(value: string): string {
  return createHash('md5').update(value).digest('hex');
}

/**
 * Determine log level based on event type
 */
function getLogLevel(eventType: AuthEventType): 'INFO' | 'WARN' | 'ERROR' {
  switch (eventType) {
    case AUTH_EVENT_TYPES.LOGIN_FAILED:
    case AUTH_EVENT_TYPES.SIWE_VERIFY_FAILED:
    case AUTH_EVENT_TYPES.RATE_LIMIT_EXCEEDED:
    case AUTH_EVENT_TYPES.ACCOUNT_LOCKED:
      return 'WARN';

    case AUTH_EVENT_TYPES.PASSWORD_RESET_REQUESTED:
      return 'INFO';

    default:
      return 'INFO';
  }
}

/**
 * Create authentication event helpers
 */
export const AuthLogger = {
  loginSuccess: (userId: string, email: string, context?: Record<string, any>) => {
    logAuthEvent({
      type: AUTH_EVENT_TYPES.LOGIN_SUCCESS,
      userId,
      email,
      ...context,
    });
  },

  loginFailed: (email: string, reason: string, attemptCount: number, context?: Record<string, any>) => {
    logAuthEvent({
      type: AUTH_EVENT_TYPES.LOGIN_FAILED,
      email,
      reason,
      attemptCount,
      ...context,
    });
  },

  logout: (userId: string, sessionId: string, context?: Record<string, any>) => {
    logAuthEvent({
      type: AUTH_EVENT_TYPES.LOGOUT,
      userId,
      sessionId,
      ...context,
    });
  },

  sessionCreated: (sessionId: string, userId: string, expiresAt: Date, context?: Record<string, any>) => {
    logAuthEvent({
      type: AUTH_EVENT_TYPES.SESSION_CREATED,
      sessionId,
      userId,
      expiresAt: expiresAt.toISOString(),
      ...context,
    });
  },

  sessionDestroyed: (sessionId: string, userId: string, reason?: string, context?: Record<string, any>) => {
    logAuthEvent({
      type: AUTH_EVENT_TYPES.SESSION_DESTROYED,
      sessionId,
      userId,
      reason,
      ...context,
    });
  },

  siweVerifySuccess: (walletAddress: string, domain: string, context?: Record<string, any>) => {
    logAuthEvent({
      type: AUTH_EVENT_TYPES.SIWE_VERIFY_SUCCESS,
      walletAddress,
      domain,
      ...context,
    });
  },

  siweVerifyFailed: (walletAddress: string, reason: string, context?: Record<string, any>) => {
    logAuthEvent({
      type: AUTH_EVENT_TYPES.SIWE_VERIFY_FAILED,
      walletAddress,
      reason,
      ...context,
    });
  },

  rateLimitExceeded: (ipAddress: string, endpoint: string, context?: Record<string, any>) => {
    logAuthEvent({
      type: AUTH_EVENT_TYPES.RATE_LIMIT_EXCEEDED,
      ipAddress,
      endpoint,
      ...context,
    });
  },

  passwordResetRequested: (email: string, context?: Record<string, any>) => {
    logAuthEvent({
      type: AUTH_EVENT_TYPES.PASSWORD_RESET_REQUESTED,
      email,
      ...context,
    });
  },

  accountLocked: (userId: string, reason: string, context?: Record<string, any>) => {
    logAuthEvent({
      type: AUTH_EVENT_TYPES.ACCOUNT_LOCKED,
      userId,
      reason,
      ...context,
    });
  },

  accountUnlocked: (userId: string, context?: Record<string, any>) => {
    logAuthEvent({
      type: AUTH_EVENT_TYPES.ACCOUNT_UNLOCKED,
      userId,
      ...context,
    });
  },

  emailVerified: (userId: string, email: string, context?: Record<string, any>) => {
    logAuthEvent({
      type: AUTH_EVENT_TYPES.EMAIL_VERIFIED,
      userId,
      email,
      ...context,
    });
  },

  profileUpdated: (userId: string, changes: Record<string, any>, context?: Record<string, any>) => {
    logAuthEvent({
      type: AUTH_EVENT_TYPES.PROFILE_UPDATED,
      userId,
      context: { ...context, changes },
    });
  },
};

/**
 * Middleware for logging authentication requests
 */
export function createAuthLoggingMiddleware() {
  return async (c: any, next: () => Promise<void>) => {
    const startTime = Date.now();
    const ipAddress = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
                     c.req.header('x-real-ip') ||
                     c.req.header('cf-connecting-ip') ||
                     'unknown';

    const userAgent = c.req.header('user-agent') || 'unknown';
    const method = c.req.method;
    const path = c.req.path;

    try {
      await next();

      const duration = Date.now() - startTime;
      const status = c.res?.status || 200;

      // Log successful auth requests (only auth endpoints)
      if (path.startsWith('/api/auth/')) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          type: 'AUTH_REQUEST',
          method,
          path,
          status,
          duration: `${duration}ms`,
          ipAddress,
          userAgent: userAgent.substring(0, 200), // Truncate long user agents
        }));
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log failed auth requests
      if (path.startsWith('/api/auth/')) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          type: 'AUTH_REQUEST_FAILED',
          method,
          path,
          duration: `${duration}ms`,
          ipAddress,
          userAgent: userAgent.substring(0, 200),
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }

      throw error;
    }
  };
}

/**
 * Initialize authentication logging for the application
 */
export function initializeAuthLogging(app: any): void {
  app.use('*', createAuthLoggingMiddleware());
}

/**
 * Export structured logging utilities
 */
export { logAuthEvent as default };
