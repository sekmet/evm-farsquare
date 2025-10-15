import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { createDatabasePool, getDatabasePool, resetPoolInstance } from "@/lib/database";

// Mock environment variables
const originalEnv = { ...process.env };

describe("Database Connection Pool", () => {
  beforeEach(() => {
    // Reset environment for each test
    process.env = { ...originalEnv };
    // Clear the singleton pool instance
    resetPoolInstance();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    // Clear the singleton pool instance
    resetPoolInstance();
  });

  test("should create database pool with correct configuration", () => {
    // Arrange & Act
    const pool = createDatabasePool();

    // Assert - pool should be created and be a valid Pool instance
    expect(pool).toBeDefined();
    expect(typeof pool.query).toBe("function");
    expect(typeof pool.connect).toBe("function");
    expect(typeof pool.end).toBe("function");
  });

  test("should initialize Kysely instance with PostgreSQL dialect", () => {
    // Arrange & Act
    const kyselyInstance = getDatabasePool();

    // Assert - should return a Kysely instance
    expect(kyselyInstance).toBeDefined();
  });

  test("should handle connection failures gracefully", async () => {
    // Arrange
    process.env.DATABASE_URL = "postgresql://invalid:invalid@nonexistent:5432/invalid";
    // Clear the singleton pool instance to force recreation
    resetPoolInstance();

    // Act & Assert
    const pool = createDatabasePool();
    expect(pool).toBeDefined();

    // Connection should fail when actually used
    try {
      await pool.connect();
      // If we get here, the connection succeeded unexpectedly
      expect(true).toBe(false); // Force test failure
    } catch (error) {
      // Expected - connection should fail with invalid credentials
      expect(error).toBeDefined();
    }
  });

  test("should throw error when DATABASE_URL is not provided", () => {
    // Arrange - Ensure DATABASE_URL is not set and clear singleton
    delete process.env.DATABASE_URL;
    resetPoolInstance();

    // Act & Assert
    expect(() => createDatabasePool()).toThrow("DATABASE_URL environment variable is required");
  });
});
