#!/usr/bin/env bun
import { migrator } from './config';
import { closeDatabaseConnections } from '../database';

/**
 * Migration error types for better error classification
 * Using const object instead of enum per coding standards
 */
export const MigrationErrorType = {
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  SCHEMA_ERROR: 'SCHEMA_ERROR',
  DEPENDENCY_ERROR: 'DEPENDENCY_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type MigrationErrorType = typeof MigrationErrorType[keyof typeof MigrationErrorType];

/**
 * Enhanced migration error with classification and recovery suggestions
 */
export class MigrationError extends Error {
  public readonly type: MigrationErrorType;
  public readonly recoverySuggestions: string[];
  public readonly originalError: Error;

  constructor(
    message: string,
    type: MigrationErrorType,
    originalError: Error,
    recoverySuggestions: string[] = []
  ) {
    super(message);
    this.name = 'MigrationError';
    this.type = type;
    this.originalError = originalError;
    this.recoverySuggestions = recoverySuggestions;
  }
}

/**
 * Run database migrations to the latest version with enhanced error handling
 */
export async function runMigrations(): Promise<void> {
  console.log('🔄 Running database migrations...');

  try {
    const { error, results } = await migrator.migrateToLatest();

    // Log detailed results
    results?.forEach((result) => {
      if (result.status === 'Success') {
        console.log(`✅ Migration "${result.migrationName}" executed successfully`);
      } else if (result.status === 'Error') {
        console.error(`❌ Migration "${result.migrationName}" failed`);
        logMigrationError(result.migrationName, 'Migration execution error');
      }
    });

    if (error) {
      const migrationError = classifyMigrationError(error as Error);
      console.error('💥 Migration failed:', migrationError.message);
      console.error('💡 Recovery suggestions:');
      migrationError.recoverySuggestions.forEach(suggestion => {
        console.error(`   - ${suggestion}`);
      });
      throw migrationError;
    }

    console.log('🎉 All migrations completed successfully');
  } catch (error) {
    await handleMigrationFailure(error as Error);
  } finally {
    await closeDatabaseConnections();
  }
}

/**
 * Rollback the last executed migration with enhanced error handling
 */
export async function rollbackMigration(): Promise<void> {
  console.log('⬇️ Rolling back last migration...');

  try {
    const { error, results } = await migrator.migrateDown();

    results?.forEach((result) => {
      if (result.status === 'Success') {
        console.log(`✅ Migration "${result.migrationName}" rolled back successfully`);
      } else if (result.status === 'Error') {
        console.error(`❌ Migration "${result.migrationName}" rollback failed`);
        logMigrationError(result.migrationName, 'Migration rollback error', true);
      }
    });

    if (error) {
      const migrationError = classifyMigrationError(error as Error);
      console.error('💥 Rollback failed:', migrationError.message);
      throw migrationError;
    }

    console.log('✅ Rollback completed');
  } catch (error) {
    await handleMigrationFailure(error as Error, true);
  } finally {
    await closeDatabaseConnections();
  }
}

/**
 * Check migration status and validate migration state
 */
export async function checkMigrationStatus(): Promise<void> {
  try {
    const migrations = await migrator.getMigrations();
    console.log('\n📋 Migration Status:');

    if (migrations.length === 0) {
      console.log('ℹ️  No migrations found');
      return;
    }

    migrations.forEach((migration) => {
      const status = migration.executedAt ? '✅' : '⏳';
      const timestamp = migration.executedAt
        ? migration.executedAt.toISOString()
        : 'Not executed';
      console.log(`${status} ${migration.name} (${timestamp})`);
    });

    // Validate migration order
    await validateMigrationOrder([...migrations]);
  } catch (error) {
    console.error('❌ Failed to check migration status:', error);
    throw error;
  }
}

/**
 * Classify migration errors and provide recovery suggestions
 */
function classifyMigrationError(error: Error): MigrationError {
  const message = error.message.toLowerCase();

  if (message.includes('connection') || message.includes('connect')) {
    return new MigrationError(
      'Database connection failed',
      MigrationErrorType.CONNECTION_ERROR,
      error,
      [
        'Check database server is running',
        'Verify connection string in environment variables',
        'Ensure database user has proper permissions',
        'Check network connectivity to database server'
      ]
    );
  }

  if (message.includes('already exists') || message.includes('duplicate')) {
    return new MigrationError(
      'Schema conflict detected',
      MigrationErrorType.SCHEMA_ERROR,
      error,
      [
        'Check if migrations have been run previously',
        'Verify database schema state',
        'Consider running rollback if needed',
        'Check for concurrent migration processes'
      ]
    );
  }

  if (message.includes('timeout') || message.includes('timed out')) {
    return new MigrationError(
      'Migration operation timed out',
      MigrationErrorType.TIMEOUT_ERROR,
      error,
      [
        'Check database performance',
        'Consider breaking large migrations into smaller ones',
        'Verify database server resources',
        'Check for long-running transactions blocking migration'
      ]
    );
  }

  if (message.includes('foreign key') || message.includes('constraint')) {
    return new MigrationError(
      'Migration dependency conflict',
      MigrationErrorType.DEPENDENCY_ERROR,
      error,
      [
        'Check migration order and dependencies',
        'Ensure prerequisite migrations have run',
        'Verify data consistency before migration',
        'Consider running rollback to clean state'
      ]
    );
  }

  return new MigrationError(
    'Unknown migration error',
    MigrationErrorType.UNKNOWN_ERROR,
    error,
    [
      'Check application logs for more details',
      'Verify database and application configuration',
      'Consider manual intervention if needed',
      'Contact system administrator for assistance'
    ]
  );
}

/**
 * Handle migration failures with appropriate recovery actions
 */
async function handleMigrationFailure(error: Error, isRollback = false): Promise<void> {
  const operation = isRollback ? 'rollback' : 'migration';

  if (error instanceof MigrationError) {
    console.error(`💥 ${operation.charAt(0).toUpperCase() + operation.slice(1)} failed:`, error.message);
    console.error('💡 Suggested recovery actions:');
    error.recoverySuggestions.forEach((suggestion, index) => {
      console.error(`   ${index + 1}. ${suggestion}`);
    });
  } else {
    console.error(`💥 Unexpected ${operation} error:`, error);
  }

  // Don't exit process automatically - let caller decide
  throw error;
}

/**
 * Log migration errors with context for debugging
 */
function logMigrationError(migrationName: string, error: any, isRollback = false): void {
  const operation = isRollback ? 'rollback' : 'execution';
  const timestamp = new Date().toISOString();

  console.error(`[${timestamp}] Migration ${operation} failed:`);
  console.error(`  Migration: ${migrationName}`);
  console.error(`  Error: ${error?.message || error}`);
  console.error(`  Stack: ${error?.stack || 'No stack trace available'}`);
}

/**
 * Validate that migrations were executed in correct order
 */
async function validateMigrationOrder(migrations: any[]): Promise<void> {
  const executedMigrations = migrations.filter(m => m.executedAt);

  if (executedMigrations.length === 0) {
    return; // No migrations executed yet
  }

  // Check if migrations are in chronological order
  const sortedByExecution = [...executedMigrations].sort(
    (a, b) => new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime()
  );

  const chronologicalOrder = executedMigrations.every(
    (migration, index) => migration.name === sortedByExecution[index].name
  );

  if (!chronologicalOrder) {
    console.warn('⚠️  Warning: Migrations may not be in optimal execution order');
    console.warn('   This could indicate manual intervention or concurrent processes');
  }
}

/**
 * Run migrations with timeout protection
 */
export async function runMigrationsWithTimeout(timeoutMs = 300000): Promise<void> {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Migration timeout')), timeoutMs);
  });

  try {
    await Promise.race([runMigrations(), timeoutPromise]);
  } catch (error) {
    if (error instanceof Error && error.message === 'Migration timeout') {
      throw new MigrationError(
        'Migration operation timed out',
        MigrationErrorType.TIMEOUT_ERROR,
        error,
        [
          'Consider breaking large migrations into smaller operations',
          'Check database performance and server resources',
          'Verify no long-running transactions are blocking migration'
        ]
      );
    }
    throw error;
  }
}

/**
 * Legacy function for backward compatibility
 */
async function migrateToLatest(): Promise<void> {
  return runMigrations();
}

/**
 * Legacy function for backward compatibility
 */
async function migrateDown(): Promise<void> {
  return rollbackMigration();
}

/**
 * Legacy function for backward compatibility
 */
async function showStatus(): Promise<void> {
  return checkMigrationStatus();
}

/**
 * Main function to handle CLI commands with enhanced error handling
 */
export async function runMigrationCommand(): Promise<void> {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'up':
        await runMigrations();
        break;
      case 'down':
        await rollbackMigration();
        break;
      case 'status':
        await checkMigrationStatus();
        break;
      default:
        console.log('Usage: migrate [up|down|status]');
        console.log('  up     - Run all pending migrations');
        console.log('  down   - Rollback the last executed migration');
        console.log('  status - Show current migration status');
        process.exit(1);
    }
  } catch (error) {
    // Error already handled in individual functions
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.main) {
  runMigrationCommand().catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}
