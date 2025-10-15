import { getDatabasePool } from './database';
import { createId } from '@paralleldrive/cuid2';

/**
 * Authentication Metrics Collection
 */

export interface AuthMetric {
  id: string;
  metricType: string;
  metricName: string;
  value: number;
  tags?: Record<string, any>;
  timestamp: Date;
  createdAt: Date;
}

export interface AuthSuccessRate {
  success: number;
  total: number;
  rate: number;
}

export interface FailurePattern {
  reason: string;
  count: number;
  percentage: number;
}

export interface LatencyStats {
  average: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
}

export interface SessionTrend {
  date: string;
  count: number;
  rate: number;
}

export interface AuthMetricsDashboard {
  successRate: AuthSuccessRate;
  activeSessions: number;
  siweLatency: LatencyStats;
  failurePatterns: FailurePattern[];
  sessionTrends: SessionTrend[];
  lastUpdated: Date;
}

export interface RealtimeMetrics {
  timestamp: Date;
  activeUsers: number;
  authAttemptsPerSecond: number;
  errorRate: number;
}

/**
 * Record authentication success
 */
export async function recordAuthSuccess(
  userId: string,
  method: 'email' | 'siwe' | 'password' | 'oauth'
): Promise<void> {
  try {
    const db = getDatabasePool();

    await db
      .insertInto('auth_metrics')
      .values({
        id: createId(),
        metricType: 'auth_success',
        metricName: method,
        value: 1,
        tags: { userId },
        timestamp: new Date(),
        createdAt: new Date(),
      })
      .execute();
  } catch (error) {
    // If auth_metrics table doesn't exist yet, silently skip recording
    if (error instanceof Error && error.message.includes('relation "auth_metrics" does not exist')) {
      return;
    }
    console.error('Error recording auth success:', error);
  }
}

/**
 * Record authentication failure
 */
export async function recordAuthFailure(userId: string | null, method: string, reason: string): Promise<void> {
  try {
    const db = getDatabasePool();

    await db
      .insertInto('auth_metrics')
      .values({
        id: createId(),
        metricType: 'auth_failure',
        metricName: method,
        value: 1,
        tags: { userId, reason },
        timestamp: new Date(),
        createdAt: new Date(),
      })
      .execute();
  } catch (error) {
    // If auth_metrics table doesn't exist yet, silently skip recording
    if (error instanceof Error && error.message.includes('relation "auth_metrics" does not exist')) {
      return;
    }
    console.error('Error recording auth failure:', error);
  }
}

/**
 * Measure SIWE verification latency
 */
export async function measureSIWEVerification(startTime: number, endTime: number, success: boolean): Promise<void> {
  try {
    const db = getDatabasePool();
    const latency = endTime - startTime;

    await db
      .insertInto('auth_metrics')
      .values({
        id: createId(),
        metricType: 'siwe_verification',
        metricName: success ? 'success' : 'failure',
        value: latency,
        timestamp: new Date(),
        createdAt: new Date(),
      })
      .execute();
  } catch (error) {
    // If auth_metrics table doesn't exist yet, silently skip recording
    if (error instanceof Error && error.message.includes('relation "auth_metrics" does not exist')) {
      return;
    }
    console.error('Error recording SIWE verification latency:', error);
  }
}

/**
 * Record session creation
 */
export async function recordSessionCreation(userId: string, sessionType: string): Promise<void> {
  try {
    const db = getDatabasePool();

    await db
      .insertInto('auth_metrics')
      .values({
        id: createId(),
        metricType: 'session_created',
        metricName: sessionType,
        value: 1,
        tags: { userId },
        timestamp: new Date(),
        createdAt: new Date(),
      })
      .execute();
  } catch (error) {
    // If auth_metrics table doesn't exist yet, silently skip recording
    if (error instanceof Error && error.message.includes('relation "auth_metrics" does not exist')) {
      return;
    }
    console.error('Error recording session creation:', error);
  }
}

/**
 * Get active session count
 */
export async function getActiveSessionCount(): Promise<number> {
  try {
    const db = getDatabasePool();

    const result = await db
      .selectFrom('session')
      .where('expiresAt', '>', new Date())
      .select(({ fn }) => [fn.count('id').as('count')])
      .executeTakeFirst();

    return Number(result?.count || 0);
  } catch (error) {
    console.error('Error getting active session count:', error);
    return 0;
  }
}

/**
 * Get authentication success rate
 */
export async function getAuthSuccessRate(hours: number = 24): Promise<number> {
  try {
    const db = getDatabasePool();
    const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [successResult, totalResult] = await Promise.all([
      db
        .selectFrom('auth_metrics')
        .where('metricType', '=', 'auth_success')
        .where('timestamp', '>=', cutoffDate)
        .select(({ fn }) => [fn.sum('value').as('total')])
        .executeTakeFirst(),
      db
        .selectFrom('auth_metrics')
        .where('metricType', 'in', ['auth_success', 'auth_failure'])
        .where('timestamp', '>=', cutoffDate)
        .select(({ fn }) => [fn.sum('value').as('total')])
        .executeTakeFirst(),
    ]);

    const success = Number(successResult?.total || 0);
    const total = Number(totalResult?.total || 0);

    return total > 0 ? (success / total) * 100 : 0;
  } catch (error) {
    console.error('Error getting auth success rate:', error);
    return 0;
  }
}

/**
 * Get authentication failure patterns
 */
export async function getAuthFailurePatterns(hours: number = 24): Promise<FailurePattern[]> {
  try {
    const db = getDatabasePool();
    const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    const results = await db
      .selectFrom('auth_metrics')
      .where('metricType', '=', 'auth_failure')
      .where('timestamp', '>=', cutoffDate)
      .select(['tags', ({ fn }) => [fn.sum('value').as('count')]])
      .groupBy('tags')
      .execute();

    const totalFailures = results.reduce((sum, result) => sum + Number(result.count), 0);

    return results.map(result => {
      const tags = result.tags as any;
      const count = Number(result.count);
      return {
        reason: tags?.reason || 'unknown',
        count,
        percentage: totalFailures > 0 ? (count / totalFailures) * 100 : 0,
      };
    });
  } catch (error) {
    console.error('Error getting auth failure patterns:', error);
    return [];
  }
}

/**
 * Get SIWE verification latency statistics
 */
export async function getSIWELatencyStats(hours: number = 24): Promise<LatencyStats> {
  try {
    const db = getDatabasePool();
    const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    const results = await db
      .selectFrom('auth_metrics')
      .where('metricType', '=', 'siwe_verification')
      .where('timestamp', '>=', cutoffDate)
      .select('value')
      .execute();

    if (results.length === 0) {
      return { average: 0, median: 0, p95: 0, p99: 0, min: 0, max: 0 };
    }

    const latencies = results.map(r => Number(r.value)).sort((a, b) => a - b);

    const average = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    const median = latencies[Math.floor(latencies.length / 2)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const min = latencies[0];
    const max = latencies[latencies.length - 1];

    return { average, median, p95, p99, min, max };
  } catch (error) {
    console.error('Error getting SIWE latency stats:', error);
    return { average: 0, median: 0, p95: 0, p99: 0, min: 0, max: 0 };
  }
}

/**
 * Get session creation trends
 */
export async function getSessionCreationTrends(days: number = 7): Promise<SessionTrend[]> {
  try {
    const db = getDatabasePool();
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const results = await db
      .selectFrom('auth_metrics')
      .where('metricType', '=', 'session_created')
      .where('timestamp', '>=', cutoffDate)
      .select([
        ({ fn }) => [fn.date('timestamp').as('date')],
        ({ fn }) => [fn.sum('value').as('count')],
      ])
      .groupBy(({ fn }) => [fn.date('timestamp')])
      .orderBy('date')
      .execute();

    return results.map(result => ({
      date: result.date as string,
      count: Number(result.count),
      rate: Number(result.count) / 24, // sessions per hour
    }));
  } catch (error) {
    console.error('Error getting session creation trends:', error);
    return [];
  }
}

/**
 * Get comprehensive authentication metrics dashboard
 */
export async function getAuthMetricsDashboard(): Promise<AuthMetricsDashboard> {
  try {
    const [successRate, activeSessions, siweLatency, failurePatterns, sessionTrends] = await Promise.all([
      getAuthSuccessRate(),
      getActiveSessionCount(),
      getSIWELatencyStats(),
      getAuthFailurePatterns(),
      getSessionCreationTrends(),
    ]);

    const totalAttempts = await getTotalAuthAttempts(24);
    const successCount = Math.round((successRate.rate / 100) * totalAttempts.total);

    return {
      successRate: {
        success: successCount,
        total: totalAttempts.total,
        rate: successRate,
      },
      activeSessions,
      siweLatency,
      failurePatterns,
      sessionTrends,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error('Error getting auth metrics dashboard:', error);
    return {
      successRate: { success: 0, total: 0, rate: 0 },
      activeSessions: 0,
      siweLatency: { average: 0, median: 0, p95: 0, p99: 0, min: 0, max: 0 },
      failurePatterns: [],
      sessionTrends: [],
      lastUpdated: new Date(),
    };
  }
}

/**
 * Timing wrapper for operations
 */
export async function withMetricsTiming<T>(
  operationName: string,
  operation: () => Promise<T>,
  tags?: Record<string, any>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await operation();
    const endTime = Date.now();

    // Record timing metric
    await recordCustomMetric(`${operationName}_duration_ms`, endTime - startTime, {
      success: 'true',
      ...tags,
    });

    return result;
  } catch (error) {
    const endTime = Date.now();

    // Record failed timing metric
    await recordCustomMetric(`${operationName}_duration_ms`, endTime - startTime, {
      success: 'false',
      error: (error as Error).message,
      ...tags,
    });

    throw error;
  }
}

/**
 * Export metrics in Prometheus format
 */
export async function exportMetricsPrometheus(): Promise<string> {
  try {
    const metrics = await getPrometheusMetrics();
    return formatPrometheusMetrics(metrics);
  } catch (error) {
    console.error('Error exporting Prometheus metrics:', error);
    return '# Error exporting metrics';
  }
}

/**
 * Clean up old metrics data
 */
export async function cleanupOldMetrics(daysOld: number = 30): Promise<number> {
  try {
    const db = getDatabasePool();
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await db
      .deleteFrom('auth_metrics')
      .where('timestamp', '<', cutoffDate)
      .execute();

    return result.numDeletedRows || 0;
  } catch (error) {
    console.error('Error cleaning up old metrics:', error);
    return 0;
  }
}

/**
 * Validate metrics data integrity
 */
export async function validateMetricsIntegrity(): Promise<boolean> {
  try {
    const db = getDatabasePool();

    // Check for any null or invalid values
    const invalidMetrics = await db
      .selectFrom('auth_metrics')
      .where(({ eb }) => eb('value', 'is', null).or('value', '<', 0))
      .select(({ fn }) => [fn.count('id').as('count')])
      .executeTakeFirst();

    return Number(invalidMetrics?.count || 0) === 0;
  } catch (error) {
    // If auth_metrics table doesn't exist yet, return true (no data to validate)
    if (error instanceof Error && error.message.includes('relation "auth_metrics" does not exist')) {
      return true;
    }
    console.error('Error validating metrics integrity:', error);
    return false;
  }
}

/**
 * Get real-time metrics updates
 */
export async function getRealtimeMetrics(): Promise<RealtimeMetrics> {
  try {
    const [activeUsers, recentAttempts, recentErrors] = await Promise.all([
      getActiveSessionCount(),
      getRecentAuthAttempts(60), // Last minute
      getRecentAuthErrors(60), // Last minute
    ]);

    return {
      timestamp: new Date(),
      activeUsers,
      authAttemptsPerSecond: recentAttempts / 60,
      errorRate: recentAttempts > 0 ? (recentErrors / recentAttempts) * 100 : 0,
    };
  } catch (error) {
    console.error('Error getting realtime metrics:', error);
    return {
      timestamp: new Date(),
      activeUsers: 0,
      authAttemptsPerSecond: 0,
      errorRate: 0,
    };
  }
}

/**
 * Record custom metric
 */
export async function recordCustomMetric(
  metricName: string,
  value: number,
  tags?: Record<string, any>
): Promise<void> {
  try {
    const db = getDatabasePool();

    await db
      .insertInto('auth_metrics')
      .values({
        id: createId(),
        metricType: 'custom',
        metricName,
        value,
        tags,
        timestamp: new Date(),
        createdAt: new Date(),
      })
      .execute();
  } catch (error) {
    // If auth_metrics table doesn't exist yet, silently skip recording
    if (error instanceof Error && error.message.includes('relation "auth_metrics" does not exist')) {
      return;
    }
    console.error('Error recording custom metric:', error);
  }
}

// Helper functions

async function getTotalAuthAttempts(hours: number): Promise<{ total: number }> {
  try {
    const db = getDatabasePool();
    const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    const result = await db
      .selectFrom('auth_metrics')
      .where('metricType', 'in', ['auth_success', 'auth_failure'])
      .where('timestamp', '>=', cutoffDate)
      .select(({ fn }) => [fn.sum('value').as('total')])
      .executeTakeFirst();

    return { total: Number(result?.total || 0) };
  } catch (error) {
    // If auth_metrics table doesn't exist yet, return 0
    if (error instanceof Error && error.message.includes('relation "auth_metrics" does not exist')) {
      return { total: 0 };
    }
    console.error('Error getting total auth attempts:', error);
    return { total: 0 };
  }
}

async function getRecentAuthAttempts(seconds: number): Promise<number> {
  try {
    const db = getDatabasePool();
    const cutoffDate = new Date(Date.now() - seconds * 1000);

    const result = await db
      .selectFrom('auth_metrics')
      .where('metricType', 'in', ['auth_success', 'auth_failure'])
      .where('timestamp', '>=', cutoffDate)
      .select(({ fn }) => [fn.sum('value').as('total')])
      .executeTakeFirst();

    return Number(result?.total || 0);
  } catch (error) {
    return 0;
  }
}

async function getRecentAuthErrors(seconds: number): Promise<number> {
  try {
    const db = getDatabasePool();
    const cutoffDate = new Date(Date.now() - seconds * 1000);

    const result = await db
      .selectFrom('auth_metrics')
      .where('metricType', '=', 'auth_failure')
      .where('timestamp', '>=', cutoffDate)
      .select(({ fn }) => [fn.sum('value').as('total')])
      .executeTakeFirst();

    return Number(result?.total || 0);
  } catch (error) {
    return 0;
  }
}

async function getPrometheusMetrics(): Promise<Array<{
  name: string;
  help: string;
  type: string;
  metrics: Array<{ value: number; labels?: Record<string, string> }>;
}>> {
  try {
    const db = getDatabasePool();
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours

    const metrics = await db
      .selectFrom('auth_metrics')
      .where('timestamp', '>=', cutoffDate)
      .select(['metricName', 'value', 'tags'])
      .execute();

    // Group by metric name
    const groupedMetrics = new Map<string, Array<{ value: number; labels?: Record<string, string> }>>();

    for (const metric of metrics) {
      if (!groupedMetrics.has(metric.metricName)) {
        groupedMetrics.set(metric.metricName, []);
      }

      groupedMetrics.get(metric.metricName)!.push({
        value: Number(metric.value),
        labels: metric.tags as Record<string, string>,
      });
    }

    return Array.from(groupedMetrics.entries()).map(([name, metrics]) => ({
      name,
      help: `Authentication metric: ${name}`,
      type: 'counter',
      metrics,
    }));
  } catch (error) {
    console.error('Error getting Prometheus metrics:', error);
    return [];
  }
}

function formatPrometheusMetrics(metrics: Array<{
  name: string;
  help: string;
  type: string;
  metrics: Array<{ value: number; labels?: Record<string, string> }>;
}>): string {
  let output = '';

  for (const metric of metrics) {
    output += `# HELP ${metric.name} ${metric.help}\n`;
    output += `# TYPE ${metric.name} ${metric.type}\n`;

    for (const m of metric.metrics) {
      let line = `${metric.name}`;

      if (m.labels) {
        const labelStrings = Object.entries(m.labels)
          .map(([key, value]) => `${key}="${value}"`)
          .join(',');
        line += `{${labelStrings}}`;
      }

      line += ` ${m.value}\n`;
      output += line;
    }

    output += '\n';
  }

  return output;
}
