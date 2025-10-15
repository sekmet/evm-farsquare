import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";

// Mock bcrypt for password verification
const mockCompare = mock(() => Promise.resolve(true));

mock.module("bcryptjs", () => ({
  compare: mockCompare,
}));

describe("Demo Credentials Configuration", () => {
  beforeEach(() => {
    // Reset all mocks
    mockCompare.mockClear();
  });

  test("should have demo credentials configured", () => {
    const { DEMO_CREDENTIALS } = require("@/lib/demo-credentials");

    expect(DEMO_CREDENTIALS).toBeDefined();
    expect(DEMO_CREDENTIALS.email).toBe('demo@farsquare.xyz');
    expect(DEMO_CREDENTIALS.password).toBe('demo123');
    expect(DEMO_CREDENTIALS.hashedPassword).toBeDefined();
    expect(DEMO_CREDENTIALS.description).toContain('testing');
  });

  test("should validate demo credentials format", async () => {
    const { validateDemoCredentials } = await import("@/lib/demo-credentials");

    expect(validateDemoCredentials('demo@farsquare.xyz', 'demo123')).toBe(true);
    expect(validateDemoCredentials('wrong@email.com', 'demo123')).toBe(false);
    expect(validateDemoCredentials('demo@farsquare.xyz', 'wrongpass')).toBe(false);
  });

  test("should verify demo password hash", async () => {
    const { validateDemoPassword } = await import("@/lib/demo-credentials");

    const isValid = await validateDemoPassword('demo123');
    expect(isValid).toBe(true);
    expect(mockCompare).toHaveBeenCalledWith('demo123', expect.any(String));
  });

  test("should provide demo credentials for display", async () => {
    const { getDemoCredentials } = await import("@/lib/demo-credentials");

    const credentials = getDemoCredentials();
    expect(credentials).toEqual({
      email: 'demo@farsquare.xyz',
      password: 'demo123',
      description: 'Demo account for testing and demonstration purposes'
    });
  });

  test("should check if credentials are demo credentials", async () => {
    const { isDemoCredentials } = await import("@/lib/demo-credentials");

    expect(isDemoCredentials('demo@farsquare.xyz', 'demo123')).toBe(true);
    expect(isDemoCredentials('other@email.com', 'demo123')).toBe(false);
    expect(isDemoCredentials('demo@farsquare.xyz', 'otherpass')).toBe(false);
  });

  test("should provide demo user information", async () => {
    const { getDemoUserInfo } = await import("@/lib/demo-credentials");

    const userInfo = getDemoUserInfo();
    expect(userInfo).toEqual({
      email: 'demo@farsquare.xyz',
      name: 'Demo User',
      description: 'Demo account for testing and demonstration purposes'
    });
  });

  test("should validate demo email format", () => {
    const demoEmail = 'demo@farsquare.xyz';

    expect(demoEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(demoEmail).toContain('@farsquare.xyz');
  });

  test("should validate demo password strength", () => {
    const demoPassword = 'demo123';

    expect(demoPassword.length).toBeGreaterThanOrEqual(6);
    expect(demoPassword).toMatch(/^(?=.*[a-zA-Z])(?=.*\d)/); // Contains letters and numbers
  });

  test("should handle password validation errors gracefully", async () => {
    mockCompare.mockRejectedValueOnce(new Error('Hash validation failed'));

    const { validateDemoPassword } = await import("@/lib/demo-credentials");

    const isValid = await validateDemoPassword('demo123');
    expect(isValid).toBe(false);
  });
});
