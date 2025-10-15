import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";

// Mock console for testing logging
const mockConsoleLog = mock(() => {});
const mockConsoleError = mock(() => {});
const mockConsoleWarn = mock(() => {});

mock.module("console", () => ({
  log: mockConsoleLog,
  error: mockConsoleError,
  warn: mockConsoleWarn,
}));

describe("Authentication Logging", () => {
  beforeEach(() => {
    // Reset all mocks
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    mockConsoleWarn.mockClear();
  });

  test("should log successful login events", async () => {
    const { logAuthEvent } = await import("@/lib/auth-logging");

    const event = {
      type: 'LOGIN_SUCCESS',
      userId: 'user123',
      email: 'user@example.com',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    logAuthEvent(event);

    expect(mockConsoleLog).toHaveBeenCalled();
    const loggedMessage = mockConsoleLog.mock.calls[0][0];
    expect(loggedMessage).toContain('LOGIN_SUCCESS');
    expect(loggedMessage).toContain('user123');
    // Email should be hashed or masked for privacy
    expect(loggedMessage).not.toContain('user@example.com');
  });

  test("should log failed login attempts", async () => {
    const { logAuthEvent } = await import("@/lib/auth-logging");

    const event = {
      type: 'LOGIN_FAILED',
      email: 'user@example.com',
      reason: 'INVALID_CREDENTIALS',
      ipAddress: '192.168.1.1',
      attemptCount: 1,
    };

    logAuthEvent(event);

    expect(mockConsoleWarn).toHaveBeenCalled();
    const loggedMessage = mockConsoleWarn.mock.calls[0][0];
    expect(loggedMessage).toContain('LOGIN_FAILED');
    expect(loggedMessage).toContain('INVALID_CREDENTIALS');
  });

  test("should log SIWE authentication events", async () => {
    const { logAuthEvent } = await import("@/lib/auth-logging");

    const event = {
      type: 'SIWE_VERIFY_SUCCESS',
      walletAddress: '0x1234567890123456789012345678901234567890',
      domain: 'example.com',
      ipAddress: '192.168.1.1',
    };

    logAuthEvent(event);

    expect(mockConsoleLog).toHaveBeenCalled();
    const loggedMessage = mockConsoleLog.mock.calls[0][0];
    expect(loggedMessage).toContain('SIWE_VERIFY_SUCCESS');
    expect(loggedMessage).toContain('0x1234567890123456789012345678901234567890');
  });

  test("should log session events", async () => {
    const { logAuthEvent } = await import("@/lib/auth-logging");

    const event = {
      type: 'SESSION_CREATED',
      sessionId: 'session123',
      userId: 'user123',
      expiresAt: new Date(Date.now() + 3600000),
    };

    logAuthEvent(event);

    expect(mockConsoleLog).toHaveBeenCalled();
    const loggedMessage = mockConsoleLog.mock.calls[0][0];
    expect(loggedMessage).toContain('SESSION_CREATED');
    expect(loggedMessage).toContain('session123');
  });

  test("should log security events", async () => {
    const { logAuthEvent } = await import("@/lib/auth-logging");

    const event = {
      type: 'RATE_LIMIT_EXCEEDED',
      ipAddress: '192.168.1.1',
      endpoint: '/api/auth/signin',
      userAgent: 'Mozilla/5.0',
    };

    logAuthEvent(event);

    expect(mockConsoleWarn).toHaveBeenCalled();
    const loggedMessage = mockConsoleWarn.mock.calls[0][0];
    expect(loggedMessage).toContain('RATE_LIMIT_EXCEEDED');
    expect(loggedMessage).toContain('/api/auth/signin');
  });

  test("should protect PII data in logs", async () => {
    const { logAuthEvent, maskEmail, hashValue } = await import("@/lib/auth-logging");

    // Test email masking
    const maskedEmail = maskEmail('user@example.com');
    expect(maskedEmail).toBe('u***@e***.com');

    // Test value hashing
    const hashedValue = hashValue('sensitive-data');
    expect(hashedValue).toMatch(/^[a-f0-9]{32}$/); // MD5 hash format

    const event = {
      type: 'LOGIN_SUCCESS',
      userId: 'user123',
      email: 'user@example.com',
      ipAddress: '192.168.1.1',
    };

    logAuthEvent(event);

    const loggedMessage = mockConsoleLog.mock.calls[0][0];
    expect(loggedMessage).toContain('u***@e***.com'); // Masked email
    expect(loggedMessage).not.toContain('user@example.com'); // Original email not present
  });

  test("should use structured log format", async () => {
    const { logAuthEvent } = await import("@/lib/auth-logging");

    const event = {
      type: 'LOGIN_SUCCESS',
      userId: 'user123',
      timestamp: new Date('2024-01-01T12:00:00Z'),
    };

    logAuthEvent(event);

    const loggedMessage = mockConsoleLog.mock.calls[0][0];
    expect(loggedMessage).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
    expect(loggedMessage).toContain('LOGIN_SUCCESS');
  });

  test("should handle different log levels", async () => {
    const { logAuthEvent } = await import("@/lib/auth-logging");

    // Success events should use console.log
    logAuthEvent({ type: 'LOGIN_SUCCESS', userId: 'user123' });
    expect(mockConsoleLog).toHaveBeenCalled();

    // Warning events should use console.warn
    logAuthEvent({ type: 'LOGIN_FAILED', reason: 'INVALID_CREDENTIALS' });
    expect(mockConsoleWarn).toHaveBeenCalled();

    // Error events should use console.error
    logAuthEvent({ type: 'AUTH_ERROR', error: 'Database connection failed' });
    expect(mockConsoleError).toHaveBeenCalled();
  });

  test("should include context information", async () => {
    const { logAuthEvent } = await import("@/lib/auth-logging");

    const event = {
      type: 'LOGIN_SUCCESS',
      userId: 'user123',
      context: {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        referrer: 'https://example.com/login',
      },
    };

    logAuthEvent(event);

    const loggedMessage = mockConsoleLog.mock.calls[0][0];
    expect(loggedMessage).toContain('192.168.1.1');
    expect(loggedMessage).toContain('Mozilla/5.0');
  });

  test("should handle unknown event types gracefully", async () => {
    const { logAuthEvent } = await import("@/lib/auth-logging");

    const event = {
      type: 'UNKNOWN_EVENT' as any,
      userId: 'user123',
    };

    logAuthEvent(event);

    expect(mockConsoleLog).toHaveBeenCalled();
    const loggedMessage = mockConsoleLog.mock.calls[0][0];
    expect(loggedMessage).toContain('UNKNOWN_EVENT');
  });

  test("should export logging utilities", async () => {
    const authLogging = await import("@/lib/auth-logging");

    expect(authLogging).toHaveProperty('logAuthEvent');
    expect(authLogging).toHaveProperty('maskEmail');
    expect(authLogging).toHaveProperty('hashValue');
    expect(authLogging).toHaveProperty('AUTH_EVENT_TYPES');

    expect(typeof authLogging.logAuthEvent).toBe('function');
    expect(typeof authLogging.maskEmail).toBe('function');
    expect(typeof authLogging.hashValue).toBe('function');
  });

  test("should define auth event types", async () => {
    const { AUTH_EVENT_TYPES } = await import("@/lib/auth-logging");

    expect(AUTH_EVENT_TYPES).toHaveProperty('LOGIN_SUCCESS');
    expect(AUTH_EVENT_TYPES).toHaveProperty('LOGIN_FAILED');
    expect(AUTH_EVENT_TYPES).toHaveProperty('LOGOUT');
    expect(AUTH_EVENT_TYPES).toHaveProperty('SESSION_CREATED');
    expect(AUTH_EVENT_TYPES).toHaveProperty('SESSION_DESTROYED');
    expect(AUTH_EVENT_TYPES).toHaveProperty('SIWE_VERIFY_SUCCESS');
    expect(AUTH_EVENT_TYPES).toHaveProperty('SIWE_VERIFY_FAILED');
    expect(AUTH_EVENT_TYPES).toHaveProperty('RATE_LIMIT_EXCEEDED');
    expect(AUTH_EVENT_TYPES).toHaveProperty('PASSWORD_RESET_REQUESTED');
    expect(AUTH_EVENT_TYPES).toHaveProperty('ACCOUNT_LOCKED');
  });
});
