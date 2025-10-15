import { testDatabaseConnection } from './database';

export interface HealthStatus {
  database: boolean;
  timestamp: number;
  uptime: number;
}

/**
 * Performs a basic database connectivity health check
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    return await testDatabaseConnection();
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Returns comprehensive health status information
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  const database = await checkDatabaseHealth();

  return {
    database,
    timestamp: Date.now(),
    uptime: process.uptime(),
  };
}

/**
 * Creates a Hono-compatible health check handler
 */
export function createHealthCheckHandler() {
  return async (c: any) => {
    const status = await getHealthStatus();

    // Return 200 if database is healthy, 503 if not
    const statusCode = status.database ? 200 : 503;

    return c.json(status, statusCode);
  };
}
