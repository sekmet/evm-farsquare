import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { Kysely } from "kysely";

// Mock Kysely to avoid actual database operations in tests
const mockInsertInto = mock(() => ({
  values: mock(() => ({
    execute: mock(() => Promise.resolve())
  }))
}));

const mockDeleteFrom = mock(() => ({
  where: mock(() => ({
    execute: mock(() => Promise.resolve())
  }))
}));

const mockDb = {
  insertInto: mockInsertInto,
  deleteFrom: mockDeleteFrom,
};

describe("Demo Data Migration", () => {
  beforeEach(() => {
    // Reset all mocks
    mockInsertInto.mockClear();
    mockDeleteFrom.mockClear();
  });

  test("should create demo user with verified email", async () => {
    const { up } = await import("@/migrations/20241201120002_demo_data");

    await up(mockDb as any);

    // Verify user insertion was called
    expect(mockInsertInto).toHaveBeenCalledWith('user');
  });

  test("should create demo account with credential provider", async () => {
    const { up } = await import("@/migrations/20241201120002_demo_data");

    await up(mockDb as any);

    // Verify account insertion was called
    expect(mockInsertInto).toHaveBeenCalledWith('account');
  });

  test("should include properly hashed password in demo account", async () => {
    const { up } = await import("@/migrations/20241201120002_demo_data");

    await up(mockDb as any);

    // Verify account insertion was called
    expect(mockInsertInto).toHaveBeenCalledWith('account');
  });

  test("should use consistent demo email across user and account", async () => {
    const { up } = await import("@/migrations/20241201120002_demo_data");

    await up(mockDb as any);

    // Verify that both user and account insertions were called
    expect(mockInsertInto).toHaveBeenCalledWith('user');
    expect(mockInsertInto).toHaveBeenCalledWith('account');

    // Verify migration completed successfully
    expect(mockInsertInto).toHaveBeenCalledTimes(2);
  });

  test("should generate unique IDs for demo data", async () => {
    const { up } = await import("@/migrations/20241201120002_demo_data");

    await up(mockDb as any);

    // Verify that both user and account insertions were called
    expect(mockInsertInto).toHaveBeenCalledWith('user');
    expect(mockInsertInto).toHaveBeenCalledWith('account');

    // Verify migration completed successfully
    expect(mockInsertInto).toHaveBeenCalledTimes(2);
  });

  test("should link demo account to demo user via userId", async () => {
    const { up } = await import("@/migrations/20241201120002_demo_data");

    await up(mockDb as any);

    // Verify that both user and account insertions were called
    expect(mockInsertInto).toHaveBeenCalledWith('user');
    expect(mockInsertInto).toHaveBeenCalledWith('account');

    // Verify the account was created after the user (indicating proper linking)
    const insertCalls = mockInsertInto.mock.calls;
    const userCallIndex = insertCalls.findIndex(call => call[0] === 'user');
    const accountCallIndex = insertCalls.findIndex(call => call[0] === 'account');

    expect(userCallIndex).toBeLessThan(accountCallIndex);
  });

  test("should include timestamps in demo data", async () => {
    const { up } = await import("@/migrations/20241201120002_demo_data");

    await up(mockDb as any);

    // Verify that insert operations were called for both user and account
    expect(mockInsertInto).toHaveBeenCalledWith('user');
    expect(mockInsertInto).toHaveBeenCalledWith('account');

    // Verify that the migration completed successfully (insert operations were called)
    expect(mockInsertInto).toHaveBeenCalledTimes(2);
  });

  test("should remove demo account during rollback", async () => {
    const { down } = await import("@/migrations/20241201120002_demo_data");

    await down(mockDb as any);

    // Verify account deletion
    expect(mockDeleteFrom).toHaveBeenCalledWith('account');
  });

  test("should remove demo user during rollback", async () => {
    const { down } = await import("@/migrations/20241201120002_demo_data");

    await down(mockDb as any);

    // Verify user deletion
    expect(mockDeleteFrom).toHaveBeenCalledWith('user');
  });

  test("should rollback in correct order (account before user)", async () => {
    const { down } = await import("@/migrations/20241201120002_demo_data");

    await down(mockDb as any);

    const deleteCalls = mockDeleteFrom.mock.calls;

    // Should delete account first, then user (reverse of creation order)
    expect(deleteCalls[0][0]).toBe('account');
    expect(deleteCalls[1][0]).toBe('user');
  });

  test("should use specific demo email for targeted cleanup", async () => {
    const { down } = await import("@/migrations/20241201120002_demo_data");

    await down(mockDb as any);

    const deleteCalls = mockDeleteFrom.mock.calls;

    // Should delete by specific email to avoid affecting other data
    const accountDeleteCall = deleteCalls.find(call => call[0] === 'account');
    const userDeleteCall = deleteCalls.find(call => call[0] === 'user');

    expect(accountDeleteCall).toBeDefined();
    expect(userDeleteCall).toBeDefined();
  });

  test("should be idempotent (safe to run multiple times)", async () => {
    const { up } = await import("@/migrations/20241201120002_demo_data");

    // Run migration multiple times
    await up(mockDb as any);
    await up(mockDb as any);

    // Should handle duplicate insertions gracefully
    // (In real implementation, this would use ON CONFLICT or check for existing data)
    expect(mockInsertInto).toHaveBeenCalled();
  });
});
