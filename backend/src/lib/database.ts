import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";
import type { Database } from "../types/database";

/**
 * Singleton pool instance to prevent multiple connection pools
 */
let poolInstance: Pool | null = null;

/**
 * Reset the singleton pool instance (for testing)
 * This allows tests to reset the pool state between test runs
 */
export function resetPoolInstance(): void {
  poolInstance = null;
}

/**
 * Creates a PostgreSQL connection pool with proper configuration
 * for production and development environments.
 * Uses singleton pattern to prevent multiple pools.
 */
export function createDatabasePool(): Pool {
  if (poolInstance) {
    return poolInstance;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const isProduction = process.env.NODE_ENV === "production";

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of connections
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
  });

  // Error handling for connection failures
  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
  });

  poolInstance = pool;
  return pool;
}

/**
 * Get the raw PostgreSQL pool instance
 * This is required for Better Auth integration
 */
export function getPool(): Pool {
  return createDatabasePool();
}

/**
 * Creates a Kysely instance with PostgreSQL dialect for type-safe queries.
 * This provides the foundation for all database operations in the authentication system.
 */
export function getDatabasePool(): Kysely<Database> {
  const pool = createDatabasePool();

  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool,
    }),
  });
}

/**
 * Test database connection health
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const pool = createDatabasePool();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Close all database connections
 */
export async function closeDatabaseConnections(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}

// Export pool for Better Auth compatibility (raw Pool instance)
export const pool = getPool();
