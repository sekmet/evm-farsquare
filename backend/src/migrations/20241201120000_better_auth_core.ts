import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // User table
  await db.schema
    .createTable('user')
    .addColumn('id', 'varchar(255)', (col) => col.primaryKey())
    .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('name', 'varchar(255)')
    .addColumn('image', 'text')
    .addColumn('emailVerified', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('createdAt', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updatedAt', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // Session table
  await db.schema
    .createTable('session')
    .addColumn('id', 'varchar(255)', (col) => col.primaryKey())
    .addColumn('userId', 'varchar(255)', (col) => col.references('user.id').onDelete('cascade').notNull())
    .addColumn('token', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('expiresAt', 'timestamp', (col) => col.notNull())
    .addColumn('createdAt', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('ipAddress', 'varchar(45)') // IPv6 support
    .addColumn('userAgent', 'text')
    .execute();

  // Account table (for OAuth/social providers)
  await db.schema
    .createTable('account')
    .addColumn('id', 'varchar(255)', (col) => col.primaryKey())
    .addColumn('userId', 'varchar(255)', (col) => col.references('user.id').onDelete('cascade').notNull())
    .addColumn('accountId', 'varchar(255)', (col) => col.notNull())
    .addColumn('providerId', 'varchar(255)', (col) => col.notNull())
    .addColumn('accessToken', 'text')
    .addColumn('refreshToken', 'text')
    .addColumn('accessTokenExpiresAt', 'timestamp')
    .addColumn('refreshTokenExpiresAt', 'timestamp')
    .addColumn('scope', 'text')
    .addColumn('idToken', 'text')
    .addColumn('password', 'text') // For email/password auth
    .addColumn('createdAt', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updatedAt', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // Verification table (for email verification, password reset, etc.)
  await db.schema
    .createTable('verification')
    .addColumn('id', 'varchar(255)', (col) => col.primaryKey())
    .addColumn('identifier', 'varchar(255)', (col) => col.notNull())
    .addColumn('value', 'text', (col) => col.notNull())
    .addColumn('expiresAt', 'timestamp', (col) => col.notNull())
    .addColumn('createdAt', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // Indexes for performance
  await db.schema
    .createIndex('session_user_id_index')
    .on('session')
    .column('userId')
    .execute();

  await db.schema
    .createIndex('account_user_id_index')
    .on('account')
    .column('userId')
    .execute();

  await db.schema
    .createIndex('verification_identifier_index')
    .on('verification')
    .column('identifier')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('verification').execute();
  await db.schema.dropTable('account').execute();
  await db.schema.dropTable('session').execute();
  await db.schema.dropTable('user').execute();
}
