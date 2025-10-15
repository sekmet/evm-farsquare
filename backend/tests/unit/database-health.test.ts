import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";

// Mock database connection
const mockConnect = mock(() => ({
  query: mock(() => Promise.resolve()),
  release: mock(() => undefined),
}));

const mockPool = {
  connect: mockConnect,
  on: mock(() => undefined),
};

const mockCreateDatabasePool = mock(() => mockPool);
const mockTestDatabaseConnection = mock(() => Promise.resolve(true));

mock.module("../database", () => ({
  createDatabasePool: mockCreateDatabasePool,
  testDatabaseConnection: mockTestDatabaseConnection,
}));

describe("Database Health Checks", () => {
  beforeEach(() => {
    // Reset all mocks
    mockConnect.mockClear();
    mockCreateDatabasePool.mockClear();
    mockTestDatabaseConnection.mockClear();
  });

  test("should export checkDatabaseHealth function", async () => {
    const { checkDatabaseHealth } = await import("@/lib/health");

    expect(typeof checkDatabaseHealth).toBe("function");
  });

  test("should perform database connectivity check", async () => {
    mockTestDatabaseConnection.mockResolvedValue(true);

    const { checkDatabaseHealth } = await import("@/lib/health");

    const result = await checkDatabaseHealth();

    expect(mockTestDatabaseConnection).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  test("should return false when database is unreachable", async () => {
    mockTestDatabaseConnection.mockResolvedValue(false);

    const { checkDatabaseHealth } = await import("@/lib/health");

    const result = await checkDatabaseHealth();

    expect(mockTestDatabaseConnection).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  test("should export getHealthStatus function", async () => {
    const { getHealthStatus } = await import("@/lib/health");

    expect(typeof getHealthStatus).toBe("function");
  });

  test("should return comprehensive health status", async () => {
    mockTestDatabaseConnection.mockResolvedValue(true);

    const { getHealthStatus } = await import("@/lib/health");

    const status = await getHealthStatus();

    expect(status).toHaveProperty('database');
    expect(status).toHaveProperty('timestamp');
    expect(status).toHaveProperty('uptime');
    expect(status.database).toBe(true);
    expect(typeof status.timestamp).toBe('number');
    expect(typeof status.uptime).toBe('number');
  });

  test("should include uptime in health status", async () => {
    mockTestDatabaseConnection.mockResolvedValue(true);

    const { getHealthStatus } = await import("@/lib/health");

    const status = await getHealthStatus();

    expect(status.uptime).toBeGreaterThan(0);
    expect(typeof status.uptime).toBe('number');
  });

  test("should include timestamp in health status", async () => {
    const beforeTime = Date.now();
    mockTestDatabaseConnection.mockResolvedValue(true);

    const { getHealthStatus } = await import("@/lib/health");

    const status = await getHealthStatus();
    const afterTime = Date.now();

    expect(status.timestamp).toBeGreaterThanOrEqual(beforeTime);
    expect(status.timestamp).toBeLessThanOrEqual(afterTime);
  });

  test("should handle database health check errors gracefully", async () => {
    mockTestDatabaseConnection.mockResolvedValue(false);

    const { getHealthStatus } = await import("@/lib/health");

    const status = await getHealthStatus();

    expect(status.database).toBe(false);
    expect(status).toHaveProperty('timestamp');
    expect(status).toHaveProperty('uptime');
  });

  test("should export health check endpoint function", async () => {
    const utils = await import("@/lib/health");

    expect(utils).toHaveProperty('createHealthCheckHandler');
    expect(typeof utils.createHealthCheckHandler).toBe('function');
  });

  test("should create health check handler for Hono", async () => {
    const { createHealthCheckHandler } = await import("@/lib/health");

    const handler = createHealthCheckHandler();

    expect(typeof handler).toBe('function');

    // Mock Hono context
    const mockJson = mock(() => ({}));
    const mockContext = {
      json: mockJson,
    };

    mockTestDatabaseConnection.mockResolvedValue(true);

    await handler(mockContext as any);

    expect(mockJson).toHaveBeenCalled();
    expect(mockTestDatabaseConnection).toHaveBeenCalled();
  });

  test("should handle health check handler errors", async () => {
    const { createHealthCheckHandler } = await import("@/lib/health");

    const handler = createHealthCheckHandler();

    const mockJson = mock(() => ({}));
    const mockContext = {
      json: mockJson,
    };

    mockTestDatabaseConnection.mockResolvedValue(false);

    await handler(mockContext as any);

    expect(mockJson).toHaveBeenCalled();
    const calls = mockJson.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    if (calls.length > 0) {
      const responseData = calls[0][0] as { database: boolean };
      expect(responseData.database).toBe(false);
    }
  });
});
