import { Kysely } from 'kysely';
import { PostgresDialect } from '@kysely/postgres';
import { Pool } from 'pg';

/**
 * Creates a test database connection for migration testing
 * Sets up a clean database instance for isolated testing
 */
export async function createTestDb(): Promise<Kysely<any>> {
  // Create test database connection
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db',
  });

  const db = new Kysely({
    dialect: new PostgresDialect({ pool }),
  });

  // Clean up any existing tables before returning
  await cleanupTestDb(db);

  return db;
}

/**
 * Cleans up test database by dropping all tables in reverse dependency order
 * Ensures clean slate for each test run
 */
export async function cleanupTestDb(db: Kysely<any>): Promise<void> {
  // Drop all tables in reverse dependency order to avoid foreign key constraints
  const tables = ['walletAddress', 'verification', 'account', 'session', 'user'];

  for (const table of tables) {
    try {
      await db.schema.dropTable(table).ifExists().execute();
    } catch (error) {
      // Table might not exist or have dependencies, ignore for cleanup
      console.warn(`Warning: Could not drop table ${table}:`, error);
    }
  }
}
