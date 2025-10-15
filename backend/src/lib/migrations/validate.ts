import { getDatabasePool } from '../database';

export async function validateSchema(): Promise<void> {
  console.log('🔍 Validating database schema...');

  const db = getDatabasePool();

  // Check required tables exist
  const requiredTables = ['user', 'session', 'account', 'verification', 'walletAddress'];
  const existingTables = await db.introspection.getTables();
  const tableNames = existingTables.map(t => t.name);

  for (const table of requiredTables) {
    if (!tableNames.includes(table)) {
      throw new Error(`Missing required table: ${table}`);
    }
  }

  // Validate table schemas
  for (const table of existingTables) {
    if (requiredTables.includes(table.name)) {
      await validateTableSchema(table);
    }
  }

  console.log('✅ Schema validation passed');
}

export async function validateTableSchema(table: any): Promise<void> {
  // Basic table schema validation
  // This can be extended to check column types, constraints, indexes, etc.

  if (!table.name) {
    throw new Error('Table must have a name');
  }

  // Check that table has columns
  if (!table.columns || !Array.isArray(table.columns)) {
    throw new Error(`Table ${table.name} must have columns defined`);
  }

  // Basic column validation
  for (const column of table.columns) {
    if (!column.name) {
      throw new Error(`Column in table ${table.name} must have a name`);
    }

    if (!column.dataType) {
      throw new Error(`Column ${column.name} in table ${table.name} must have a data type`);
    }
  }

  console.log(`✅ Table ${table.name} schema validated`);
}
