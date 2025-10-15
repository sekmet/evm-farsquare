import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";

// Mock Better Auth
const mockBetterAuth = mock(() => ({
  handler: mock(() => new Response("auth handler response")),
  api: {
    getSession: mock(() => Promise.resolve(null)),
  },
}));

// Mock database
const mockGetDatabasePool = mock(() => ({ /* mock pool */ }));

mock.module("better-auth", () => ({
  betterAuth: mockBetterAuth,
}));

mock.module("../database", () => ({
  getDatabasePool: mockGetDatabasePool,
}));

describe("Authentication Error Handling", () => {
  beforeEach(() => {
    // Reset all mocks
    mockBetterAuth.mockClear();
    mockGetDatabasePool.mockClear();
  });

  test("should handle invalid credentials errors", async () => {
    const { handleAuthError, AUTH_ERRORS } = await import("@/lib/auth-errors");

    const error = new Error("Invalid email or password");
    const result = handleAuthError(error);

    expect(result).toEqual({
      code: AUTH_ERRORS.INVALID_CREDENTIALS,
      message: "Invalid email or password",
      statusCode: 401,
      userMessage: "The email or password you entered is incorrect. Please try again.",
      context: undefined,
      timestamp: expect.any(Number),
    });
  });

  test("should handle SIWE verification failures", async () => {
    const { handleAuthError, AUTH_ERRORS } = await import("@/lib/auth-errors");

    const error = new Error("SIWE verification failed");
    const result = handleAuthError(error);

    expect(result).toEqual({
      code: AUTH_ERRORS.SIWE_VERIFICATION_FAILED,
      message: "SIWE verification failed",
      statusCode: 401,
      userMessage: "Wallet verification failed. Please try signing the message again.",
      context: undefined,
      timestamp: expect.any(Number),
    });
  });

  test("should handle network errors", async () => {
    const { handleAuthError, AUTH_ERRORS } = await import("@/lib/auth-errors");

    const error = new Error("Network request failed");
    const result = handleAuthError(error);

    expect(result).toEqual({
      code: AUTH_ERRORS.NETWORK_ERROR,
      message: "Network request failed",
      statusCode: 503,
      userMessage: "Network connection failed. Please check your internet connection and try again.",
      context: undefined,
      timestamp: expect.any(Number),
    });
  });

  test("should handle database connection errors", async () => {
    const { handleAuthError, AUTH_ERRORS } = await import("@/lib/auth-errors");

    const error = new Error("Database connection failed");
    const result = handleAuthError(error);

    expect(result).toEqual({
      code: AUTH_ERRORS.DATABASE_ERROR,
      message: "Database connection failed",
      statusCode: 503,
      userMessage: "Service temporarily unavailable. Please try again later.",
      context: undefined,
      timestamp: expect.any(Number),
    });
  });

  test("should handle unknown errors", async () => {
    const { handleAuthError, AUTH_ERRORS } = await import("@/lib/auth-errors");

    const error = new Error("Some unknown error");
    const result = handleAuthError(error);

    expect(result).toEqual({
      code: AUTH_ERRORS.UNKNOWN_ERROR,
      message: "Some unknown error",
      statusCode: 500,
      userMessage: "An unexpected error occurred. Please try again.",
      context: undefined,
      timestamp: expect.any(Number),
    });
  });

  test("should provide proper HTTP status codes", async () => {
    const { AUTH_ERRORS } = await import("@/lib/auth-errors");

    expect(AUTH_ERRORS.INVALID_CREDENTIALS).toBe("INVALID_CREDENTIALS");
    expect(AUTH_ERRORS.SIWE_VERIFICATION_FAILED).toBe("SIWE_VERIFICATION_FAILED");
    expect(AUTH_ERRORS.NETWORK_ERROR).toBe("NETWORK_ERROR");
    expect(AUTH_ERRORS.DATABASE_ERROR).toBe("DATABASE_ERROR");
    expect(AUTH_ERRORS.UNKNOWN_ERROR).toBe("UNKNOWN_ERROR");
  });

  test("should export error handling utilities", async () => {
    const authErrors = await import("@/lib/auth-errors");

    expect(authErrors).toHaveProperty('handleAuthError');
    expect(authErrors).toHaveProperty('AUTH_ERRORS');
    expect(authErrors).toHaveProperty('createAuthErrorResponse');
    expect(typeof authErrors.handleAuthError).toBe('function');
    expect(typeof authErrors.createAuthErrorResponse).toBe('function');
  });

  test("should create auth error response", async () => {
    const { createAuthErrorResponse } = await import("@/lib/auth-errors");

    const error = {
      code: "INVALID_CREDENTIALS",
      message: "Invalid credentials",
      statusCode: 401,
      userMessage: "Invalid email or password",
    };

    const response = createAuthErrorResponse(error);
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(401);
  });

  test("should handle malformed errors gracefully", async () => {
    const { handleAuthError } = await import("@/lib/auth-errors");

    const result = handleAuthError(null as any);

    expect(result).toEqual({
      code: "UNKNOWN_ERROR",
      message: "Unknown error",
      statusCode: 500,
      userMessage: "An unexpected error occurred. Please try again.",
      context: undefined,
      timestamp: expect.any(Number),
    });
  });

  test("should provide detailed error information for debugging", async () => {
    const { handleAuthError } = await import("@/lib/auth-errors");

    const error = new Error("Test error");
    // Add stack trace
    error.stack = "Error: Test error\n    at testFunction (/path/to/file.js:10:5)";

    const result = handleAuthError(error);

    expect(result).toHaveProperty('code');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('statusCode');
    expect(result).toHaveProperty('userMessage');
  });

  test("should categorize errors by type", async () => {
    const { handleAuthError } = await import("@/lib/auth-errors");

    // Test various error messages and their categorization
    const testCases = [
      { input: "invalid password", expectedCode: "INVALID_CREDENTIALS" },
      { input: "SIWE signature invalid", expectedCode: "SIWE_VERIFICATION_FAILED" },
      { input: "connection timeout", expectedCode: "NETWORK_ERROR" },
      { input: "database unavailable", expectedCode: "DATABASE_ERROR" },
    ];

    for (const testCase of testCases) {
      const error = new Error(testCase.input);
      const result = handleAuthError(error);
      expect(result.code).toBe(testCase.expectedCode);
    }
  });

  test("should include error context when available", async () => {
    const { handleAuthError } = await import("@/lib/auth-errors");

    const error = new Error("Authentication failed");
    const result = handleAuthError(error, { userId: "123", action: "login" });

    expect(result).toHaveProperty('context');
    expect(result.context).toEqual({ userId: "123", action: "login" });
  });

  test("should handle rate limiting errors", async () => {
    const { handleAuthError, AUTH_ERRORS } = await import("@/lib/auth-errors");

    const error = new Error("Too many requests");
    const result = handleAuthError(error);

    expect(result.code).toBe(AUTH_ERRORS.RATE_LIMITED);
    expect(result.statusCode).toBe(429);
  });
});
