# Database Migration Guide

## Overview

This document provides comprehensive guidance for working with database migrations in the Contextwise PMS authentication system. The migration system is built on Kysely with robust error handling, testing infrastructure, and rollback capabilities.

## Migration Architecture

### Core Components

- **Migration Files**: Located in `src/migrations/` with timestamp-based naming
- **Migration Runner**: `src/lib/migrations/runner.ts` with enhanced error handling
- **Migration Config**: `src/lib/migrations/config.ts` with Kysely setup
- **Testing Infrastructure**: `src/test/utils.ts` for isolated testing
- **Validation**: `src/lib/migrations/validate.ts` for schema integrity

### File Structure

```
src/
├── migrations/                    # Migration files
│   ├── 20241201120000_better_auth_core.ts
│   ├── 20241201120001_siwe_wallet_addresses.ts
│   └── 20241201120002_demo_data.ts
├── lib/
│   ├── migrations/
│   │   ├── config.ts              # Migration configuration
│   │   ├── runner.ts              # Enhanced migration runner
│   │   └── validate.ts            # Schema validation
│   └── database.ts                # Database connection
└── test/
    └── utils.ts                   # Test database utilities
```

## Migration Naming Conventions

### File Naming

All migration files follow the pattern: `YYYYMMDDHHMMSS_description.ts`

**Examples:**
- `20241201120000_better_auth_core.ts`
- `20241201120001_siwe_wallet_addresses.ts`
- `20241201120002_demo_data.ts`

### Rules

1. **Timestamp First**: 14-digit timestamp (YYYYMMDDHHMMSS)
2. **Descriptive Name**: Snake_case description of changes
3. **TypeScript Files**: `.ts` extension for type safety
4. **Sequential Order**: Timestamps must be unique and sequential

## Migration Patterns

### Creating Tables

```typescript
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('users')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('name', 'varchar(255)')
    .addColumn('emailVerified', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('createdAt', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updatedAt', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('users').execute();
}
```

### Adding Columns

```typescript
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .addColumn('phoneNumber', 'varchar(20)')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .dropColumn('phoneNumber')
    .execute();
}
```

### Creating Indexes

```typescript
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createIndex('idx_users_email')
    .on('users')
    .column('email')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('idx_users_email').execute();
}
```

### Foreign Key Constraints

```typescript
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('accounts')
    .addForeignKeyConstraint(
      'fk_accounts_user_id',
      ['userId'],
      'users',
      ['id'],
      (cb) => cb.onDelete('cascade')
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('accounts')
    .dropConstraint('fk_accounts_user_id')
    .execute();
}
```

## Running Migrations

### Basic Commands

```bash
# Run all pending migrations
bun run db:migrate

# Rollback last migration
bun run db:rollback

# Check migration status
bun run db:status
```

### Advanced Usage

```bash
# Run migrations with timeout protection
MIGRATION_TIMEOUT=300000 bun run db:migrate

# Use specific database URL
DATABASE_URL="postgresql://user:pass@host:5432/db" bun run db:migrate
```

## Rollback Procedures

### Safe Rollback

1. **Check Current Status**
   ```bash
   bun run db:status
   ```

2. **Verify Data Safety**
   - Ensure no critical data will be lost
   - Check foreign key constraints
   - Review dependent systems

3. **Perform Rollback**
   ```bash
   bun run db:rollback
   ```

4. **Validate State**
   ```bash
   bun run db:status
   bun run validate-db
   ```

### Emergency Rollback

If a migration fails mid-execution:

1. **Stop Application**
2. **Manual Database Inspection**
3. **Selective Rollback** (if needed)
4. **Restore from Backup** (last resort)

## Testing Patterns

### Unit Testing

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createTestDb, cleanupTestDb } from '../../test/utils';
import { up, down } from '../20241201120000_better_auth_core';

describe('Better Auth Core Migration', () => {
  let testDb: any;

  beforeEach(async () => {
    testDb = await createTestDb();
  });

  afterEach(async () => {
    await cleanupTestDb(testDb);
    await testDb.destroy();
  });

  test('should create user table', async () => {
    await up(testDb);

    const tables = await testDb.introspection.getTables();
    const tableNames = tables.map(t => t.name);

    expect(tableNames).toContain('user');
  });

  test('should rollback user table', async () => {
    await up(testDb);
    await down(testDb);

    const tables = await testDb.introspection.getTables();
    const tableNames = tables.map(t => t.name);

    expect(tableNames).not.toContain('user');
  });
});
```

### Integration Testing

```typescript
import { describe, test, beforeEach, afterEach } from 'bun:test';
import { migrator } from '../config';
import { createTestDb, cleanupTestDb } from '../../test/utils';

describe('Migration Integration', () => {
  let testDb: any;

  beforeEach(async () => {
    testDb = await createTestDb();
    (migrator as any).db = testDb;
  });

  afterEach(async () => {
    if (testDb) {
      await cleanupTestDb(testDb);
      await testDb.destroy();
    }
  });

  test('should run all migrations successfully', async () => {
    const result = await migrator.migrateToLatest();

    expect(result.error).toBeUndefined();
    expect(result.results!.length).toBeGreaterThan(0);
  });
});
```

## Error Handling

### Error Classification

The system classifies migration errors into categories:

- **CONNECTION_ERROR**: Database connectivity issues
- **SCHEMA_ERROR**: Schema conflicts (e.g., already exists)
- **DEPENDENCY_ERROR**: Foreign key or dependency issues
- **TIMEOUT_ERROR**: Migration operation timeouts
- **UNKNOWN_ERROR**: Unclassified errors

### Recovery Actions

Each error type includes specific recovery suggestions:

```typescript
// Connection Error Recovery
- Check database server is running
- Verify connection string in environment variables
- Ensure database user has proper permissions
- Check network connectivity

// Schema Conflict Recovery
- Check if migrations have been run previously
- Verify database schema state
- Consider running rollback if needed
- Check for concurrent migration processes
```

## Troubleshooting Guide

### Common Issues

#### Migration Already Executed

```
Error: Migration "20241201120000_better_auth_core" has already been executed
```

**Solution:**
- Check migration status: `bun run db:status`
- Skip already executed migrations
- Consider rollback if needed

#### Foreign Key Constraint Violation

```
Error: Foreign key constraint violation
```

**Solution:**
- Check data dependencies
- Ensure parent records exist
- Verify constraint definitions
- Consider data migration order

#### Connection Timeout

```
Error: Migration timeout
```

**Solution:**
- Increase timeout: `MIGRATION_TIMEOUT=600000 bun run db:migrate`
- Check database performance
- Verify network connectivity
- Consider breaking large migrations

### Debug Mode

Enable detailed logging:

```bash
DEBUG=migration bun run db:migrate
```

## Best Practices

### Migration Design

1. **Idempotent Operations**: Migrations should be safe to run multiple times
2. **Small Changes**: Break large changes into smaller, focused migrations
3. **Rollback Support**: Every migration must have a reliable rollback
4. **Data Safety**: Never delete data without explicit confirmation
5. **Testing**: Test both up and down migrations thoroughly

### Development Workflow

1. **Create Migration**: Use timestamp-based naming
2. **Write Tests**: Both unit and integration tests
3. **Test Locally**: Run migrations on development database
4. **Review**: Code review migration changes
5. **Deploy**: Run migrations in staging first
6. **Monitor**: Watch for issues in production

### Performance Considerations

1. **Batch Operations**: Use batch inserts/updates for large datasets
2. **Index Strategy**: Add indexes before bulk operations
3. **Lock Management**: Minimize exclusive locks
4. **Timeout Handling**: Set appropriate timeouts for operations
5. **Progress Monitoring**: Log progress for long-running migrations

## Examples

### Complete Migration with Testing

```typescript
// 20241201120003_add_user_roles.ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add role column to users table
  await db.schema
    .alterTable('user')
    .addColumn('role', 'varchar(50)', (col) =>
      col.notNull().defaultTo('user')
    )
    .execute();

  // Create index for performance
  await db.schema
    .createIndex('idx_users_role')
    .on('user')
    .column('role')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Remove index first
  await db.schema.dropIndex('idx_users_role').execute();

  // Remove column
  await db.schema
    .alterTable('user')
    .dropColumn('role')
    .execute();
}
```

## Monitoring and Maintenance

### Health Checks

The system includes automatic health checks:

```typescript
import { checkDatabaseHealth, getHealthStatus } from './health';

// Basic connectivity check
const isHealthy = await checkDatabaseHealth();

// Comprehensive status
const status = await getHealthStatus();
// { database: true, timestamp: 1234567890, uptime: 3600 }
```

### Schema Validation

Regular schema validation ensures integrity:

```bash
# Validate schema after migrations
bun run validate-db

# Validate with health check
curl http://localhost:4000/health
```

## Migration Lifecycle

1. **Planning**: Define migration requirements and dependencies
2. **Creation**: Write migration with proper up/down functions
3. **Testing**: Create comprehensive unit and integration tests
4. **Review**: Code review and validation
5. **Deployment**: Run in staging environment first
6. **Monitoring**: Monitor for issues in production
7. **Maintenance**: Regular schema validation and cleanup

This documentation ensures consistent, reliable database migrations across the development lifecycle.
