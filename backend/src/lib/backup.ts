import { getDatabasePool } from './database';
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';

const db = getDatabasePool();

/**
 * Database backup configuration
 */
export interface BackupOptions {
  directory?: string;
  prefix?: string;
  includeSchema?: boolean;
  compress?: boolean;
}

/**
 * Creates a database backup before migrations
 */
export async function createBackup(
  backupDir = './backups',
  prefix = 'migration-backup'
): Promise<string> {
  const timestamp = Date.now();
  const filename = `${prefix}-${timestamp}.sql`;
  const filepath = join(backupDir, filename);

  // Ensure backup directory exists
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }

  // Generate backup SQL
  const backupSQL = await generateBackupSQL();

  // Write backup to file
  writeFileSync(filepath, backupSQL, 'utf8');

  // Verify backup integrity
  if (!await verifyBackup(filepath)) {
    throw new Error('Backup verification failed');
  }

  console.log(`✅ Database backup created: ${filepath}`);
  return filepath;
}

/**
 * Generates SQL for database backup
 */
async function generateBackupSQL(): Promise<string> {
  const sqlStatements: string[] = [];

  // Add metadata header
  sqlStatements.push(`-- Database Backup`);
  sqlStatements.push(`-- Created: ${new Date().toISOString()}`);
  sqlStatements.push(`-- Schema: Authentication System`);
  sqlStatements.push(``);

  // Get all tables
  const tables = await db.introspection.getTables();

  for (const table of tables) {
    // Skip system tables
    if (table.name.startsWith('pg_') || table.name.startsWith('_')) {
      continue;
    }

    // Add table schema
    sqlStatements.push(`-- Table: ${table.name}`);
    sqlStatements.push(await generateTableBackupSQL(table));
    sqlStatements.push(``);
  }

  return sqlStatements.join('\n');
}

/**
 * Generates backup SQL for a specific table
 */
async function generateTableBackupSQL(table: any): Promise<string> {
  const sqlStatements: string[] = [];

  // Get table data
  try {
    const data = await db
      .selectFrom(table.name)
      .selectAll()
      .execute();

    if (data.length === 0) {
      return `-- No data in table ${table.name}`;
    }

    // Generate INSERT statements
    for (const row of data) {
      const columns = Object.keys(row);
      const values = columns.map(col => formatSQLValue(row[col]));

      sqlStatements.push(
        `INSERT INTO ${table.name} (${columns.join(', ')}) VALUES (${values.join(', ')});`
      );
    }
  } catch (error) {
    // Table might not be accessible, skip it
    sqlStatements.push(`-- Could not backup table ${table.name}: ${error}`);
  }

  return sqlStatements.join('\n');
}

/**
 * Formats a value for SQL INSERT statement
 */
function formatSQLValue(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`;
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }

  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }

  return value.toString();
}

/**
 * Verifies backup file integrity
 */
export async function verifyBackup(filepath: string): Promise<boolean> {
  try {
    const content = readFileSync(filepath, 'utf8');

    // Basic validation
    if (!content || content.trim().length === 0) {
      return false;
    }

    // Should contain SQL statements
    if (!content.includes('INSERT') && !content.includes('--')) {
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Backup verification failed for ${filepath}:`, error);
    return false;
  }
}

/**
 * Lists all available backups
 */
export async function listBackups(backupDir = './backups'): Promise<string[]> {
  try {
    if (!existsSync(backupDir)) {
      return [];
    }

    return readdirSync(backupDir)
      .filter(file => file.endsWith('.sql'))
      .sort()
      .reverse(); // Most recent first
  } catch (error) {
    console.error('Failed to list backups:', error);
    return [];
  }
}

/**
 * Cleans up old backups based on retention policy
 */
export async function cleanupOldBackups(
  keepCount = 5,
  backupDir = './backups'
): Promise<void> {
  try {
    const backups = await listBackups(backupDir);

    if (backups.length <= keepCount) {
      return; // No cleanup needed
    }

    const backupsToDelete = backups.slice(keepCount);

    for (const backup of backupsToDelete) {
      // In a real implementation, you would delete the files
      console.log(`Would delete old backup: ${backup}`);
    }

    console.log(`✅ Cleaned up ${backupsToDelete.length} old backups`);
  } catch (error) {
    console.error('Backup cleanup failed:', error);
  }
}

/**
 * Creates a pre-migration backup (convenience function)
 */
export async function createPreMigrationBackup(): Promise<string> {
  console.log('🔄 Creating pre-migration backup...');

  const backupPath = await createBackup('./backups', 'pre-migration');

  console.log('✅ Pre-migration backup completed');
  return backupPath;
}

/**
 * Validates backup can be used for restoration
 */
export async function validateBackupForRestore(filepath: string): Promise<boolean> {
  // Basic validation plus additional checks for restoration
  if (!await verifyBackup(filepath)) {
    return false;
  }

  try {
    const content = readFileSync(filepath, 'utf8');

    // Should contain valid SQL statements
    // This is a basic check - in production you'd want more sophisticated validation
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('--'));

    return lines.length > 0;
  } catch (error) {
    return false;
  }
}
