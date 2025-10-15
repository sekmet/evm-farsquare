/**
 * Migration performance monitoring and metrics collection
 */

export interface MigrationPerformanceResult {
  migrationName: string;
  duration: number;
  result?: any;
  error?: Error;
  timestamp: number;
}

export interface PerformanceMetrics {
  totalMigrations: number;
  successfulMigrations: number;
  failedMigrations: number;
  averageExecutionTime: number;
  lastMigrationTime?: number;
}

export interface DatabasePerformanceMetrics {
  connectionCount: number;
  queryCount: number;
  averageQueryTime: number;
  slowQueries: QueryPerformanceResult[];
}

export interface QueryPerformanceResult {
  query: string;
  duration: number;
  timestamp: number;
}

export interface PerformanceThresholds {
  maxExecutionTime: number;
  maxQueryTime: number;
  minSuccessRate: number;
}

export interface MigrationDashboard {
  overview: PerformanceMetrics;
  recentMigrations: MigrationPerformanceResult[];
  performanceMetrics: DatabasePerformanceMetrics;
  alerts: PerformanceAlert[];
}

export interface PerformanceAlert {
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
}

export interface PerformanceRecommendation {
  issue: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

// Global state for performance tracking
let performanceMetrics: PerformanceMetrics = {
  totalMigrations: 0,
  successfulMigrations: 0,
  failedMigrations: 0,
  averageExecutionTime: 0,
  lastMigrationTime: undefined,
};

let performanceThresholds: PerformanceThresholds = {
  maxExecutionTime: 30000, // 30 seconds
  maxQueryTime: 5000,     // 5 seconds
  minSuccessRate: 90,     // 90%
};

let migrationHistory: MigrationPerformanceResult[] = [];
let queryHistory: QueryPerformanceResult[] = [];

/**
 * Tracks the performance of a migration operation
 */
export async function trackMigrationPerformance<T>(
  migrationName: string,
  operation: () => Promise<T>
): Promise<MigrationPerformanceResult> {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    const performanceResult: MigrationPerformanceResult = {
      migrationName,
      duration,
      result,
      timestamp: startTime,
    };

    // Update metrics
    updateMetrics(performanceResult, true);
    migrationHistory.push(performanceResult);

    return performanceResult;
  } catch (error) {
    const duration = Date.now() - startTime;

    const performanceResult: MigrationPerformanceResult = {
      migrationName,
      duration,
      error: error as Error,
      timestamp: startTime,
    };

    // Update metrics
    updateMetrics(performanceResult, false);
    migrationHistory.push(performanceResult);

    throw error;
  }
}

/**
 * Updates global performance metrics
 */
function updateMetrics(result: MigrationPerformanceResult, success: boolean): void {
  performanceMetrics.totalMigrations++;

  if (success) {
    performanceMetrics.successfulMigrations++;
  } else {
    performanceMetrics.failedMigrations++;
  }

  // Update average execution time
  const totalTime = (performanceMetrics.averageExecutionTime * (performanceMetrics.totalMigrations - 1)) + result.duration;
  performanceMetrics.averageExecutionTime = totalTime / performanceMetrics.totalMigrations;

  performanceMetrics.lastMigrationTime = result.timestamp;
}

/**
 * Collects comprehensive migration metrics
 */
export async function collectMigrationMetrics(): Promise<PerformanceMetrics> {
  return { ...performanceMetrics };
}

/**
 * Monitors database performance metrics
 */
export async function monitorDatabasePerformance(): Promise<DatabasePerformanceMetrics> {
  // In a real implementation, this would query database system tables
  // For now, return mock data
  return {
    connectionCount: 1, // Mock value
    queryCount: queryHistory.length,
    averageQueryTime: queryHistory.length > 0
      ? queryHistory.reduce((sum, q) => sum + q.duration, 0) / queryHistory.length
      : 0,
    slowQueries: queryHistory.filter(q => q.duration > 1000), // Queries > 1 second
  };
}

/**
 * Calculates migration success rate
 */
export async function getMigrationSuccessRate(): Promise<number> {
  if (performanceMetrics.totalMigrations === 0) {
    return 100;
  }

  return (performanceMetrics.successfulMigrations / performanceMetrics.totalMigrations) * 100;
}

/**
 * Sets performance alerting thresholds
 */
export function setPerformanceThresholds(thresholds: Partial<PerformanceThresholds>): void {
  performanceThresholds = { ...performanceThresholds, ...thresholds };
}

/**
 * Checks if current performance meets thresholds
 */
export async function checkPerformanceThresholds(): Promise<boolean> {
  const successRate = await getMigrationSuccessRate();
  const metrics = await monitorDatabasePerformance();

  return (
    performanceMetrics.averageExecutionTime <= performanceThresholds.maxExecutionTime &&
    metrics.averageQueryTime <= performanceThresholds.maxQueryTime &&
    successRate >= performanceThresholds.minSuccessRate
  );
}

/**
 * Runs migrations with performance monitoring
 */
export async function runMigrationsWithMonitoring(): Promise<{
  success: boolean;
  duration: number;
  metrics: PerformanceMetrics;
  migrations: MigrationPerformanceResult[];
  error?: Error;
}> {
  const startTime = Date.now();

  try {
    // Import and run migrations
    const { runMigrations } = await import('./migrations/runner');
    await runMigrations();

    const duration = Date.now() - startTime;
    const metrics = await collectMigrationMetrics();

    return {
      success: true,
      duration,
      metrics,
      migrations: [...migrationHistory],
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const metrics = await collectMigrationMetrics();

    return {
      success: false,
      duration,
      metrics,
      migrations: [...migrationHistory],
      error: error as Error,
    };
  }
}

/**
 * Logs performance metrics to console
 */
export async function logPerformanceMetrics(): Promise<void> {
  const metrics = await collectMigrationMetrics();
  const dbMetrics = await monitorDatabasePerformance();
  const successRate = await getMigrationSuccessRate();

  console.log('\n📊 Migration Performance Metrics:');
  console.log(`Total Migrations: ${metrics.totalMigrations}`);
  console.log(`Successful: ${metrics.successfulMigrations}`);
  console.log(`Failed: ${metrics.failedMigrations}`);
  console.log(`Success Rate: ${successRate.toFixed(2)}%`);
  console.log(`Average Execution Time: ${metrics.averageExecutionTime.toFixed(2)}ms`);
  console.log(`Database Connections: ${dbMetrics.connectionCount}`);
  console.log(`Total Queries: ${dbMetrics.queryCount}`);
  console.log(`Average Query Time: ${dbMetrics.averageQueryTime.toFixed(2)}ms`);
  console.log(`Slow Queries (>1s): ${dbMetrics.slowQueries.length}`);
}

/**
 * Detects performance degradation
 */
export async function detectPerformanceDegradation(): Promise<{
  isDegraded: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  const successRate = await getMigrationSuccessRate();
  const dbMetrics = await monitorDatabasePerformance();

  if (performanceMetrics.averageExecutionTime > performanceThresholds.maxExecutionTime) {
    issues.push(`Average migration execution time (${performanceMetrics.averageExecutionTime.toFixed(2)}ms) exceeds threshold (${performanceThresholds.maxExecutionTime}ms)`);
  }

  if (successRate < performanceThresholds.minSuccessRate) {
    issues.push(`Migration success rate (${successRate.toFixed(2)}%) below threshold (${performanceThresholds.minSuccessRate}%)`);
  }

  if (dbMetrics.averageQueryTime > performanceThresholds.maxQueryTime) {
    issues.push(`Average query time (${dbMetrics.averageQueryTime.toFixed(2)}ms) exceeds threshold (${performanceThresholds.maxQueryTime}ms)`);
  }

  if (dbMetrics.slowQueries.length > 5) {
    issues.push(`High number of slow queries detected (${dbMetrics.slowQueries.length})`);
  }

  return {
    isDegraded: issues.length > 0,
    issues,
  };
}

/**
 * Provides performance recommendations
 */
export async function getPerformanceRecommendations(): Promise<PerformanceRecommendation[]> {
  const recommendations: PerformanceRecommendation[] = [];
  const degradation = await detectPerformanceDegradation();

  if (degradation.isDegraded) {
    if (performanceMetrics.averageExecutionTime > performanceThresholds.maxExecutionTime) {
      recommendations.push({
        issue: 'Slow migration execution',
        recommendation: 'Consider breaking large migrations into smaller, focused operations',
        priority: 'high',
      });
    }

    if (await getMigrationSuccessRate() < performanceThresholds.minSuccessRate) {
      recommendations.push({
        issue: 'Low migration success rate',
        recommendation: 'Review and fix failing migrations, ensure proper error handling',
        priority: 'high',
      });
    }

    const dbMetrics = await monitorDatabasePerformance();
    if (dbMetrics.slowQueries.length > 5) {
      recommendations.push({
        issue: 'Slow database queries',
        recommendation: 'Add appropriate indexes and optimize query performance',
        priority: 'medium',
      });
    }
  }

  return recommendations;
}

/**
 * Measures individual query performance
 */
export async function measureQueryPerformance(query: string, params: any[] = []): Promise<QueryPerformanceResult> {
  const startTime = Date.now();

  try {
    // In a real implementation, this would execute the query
    // For now, simulate execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

    const duration = Date.now() - startTime;
    const result: QueryPerformanceResult = {
      query,
      duration,
      timestamp: startTime,
    };

    queryHistory.push(result);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const result: QueryPerformanceResult = {
      query,
      duration,
      timestamp: startTime,
    };

    queryHistory.push(result);
    throw error;
  }
}

/**
 * Gets slow queries above threshold
 */
export async function getSlowQueries(thresholdMs: number = 1000): Promise<QueryPerformanceResult[]> {
  return queryHistory.filter(query => query.duration > thresholdMs);
}

/**
 * Provides comprehensive migration performance dashboard
 */
export async function getMigrationDashboard(): Promise<MigrationDashboard> {
  const overview = await collectMigrationMetrics();
  const performanceMetrics = await monitorDatabasePerformance();
  const degradation = await detectPerformanceDegradation();

  // Get recent migrations (last 10)
  const recentMigrations = migrationHistory
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  // Generate alerts based on performance issues
  const alerts: PerformanceAlert[] = [];

  if (degradation.isDegraded) {
    alerts.push({
      type: 'warning',
      message: 'Performance degradation detected',
      timestamp: Date.now(),
    });
  }

  if (await getMigrationSuccessRate() < performanceThresholds.minSuccessRate) {
    alerts.push({
      type: 'error',
      message: 'Migration success rate below threshold',
      timestamp: Date.now(),
    });
  }

  return {
    overview,
    recentMigrations,
    performanceMetrics,
    alerts,
  };
}
