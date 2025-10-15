import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Multi-Factor Authentication table
  await db.schema
    .createTable('mfa')
    .addColumn('id', 'varchar(255)', (col) => col.primaryKey())
    .addColumn('userId', 'varchar(255)', (col) => col.references('user.id').onDelete('cascade').notNull())
    .addColumn('type', 'varchar(50)', (col) => col.notNull()) // TOTP, SMS, EMAIL, HARDWARE_TOKEN
    .addColumn('secret', 'text') // For TOTP secrets or other sensitive data
    .addColumn('backupCodes', 'json') // Array of backup codes (hashed)
    .addColumn('verified', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('enabled', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('lastUsed', 'timestamp')
    .addColumn('createdAt', 'timestamp', (col) => col.defaultTo('now()').notNull())
    .addColumn('updatedAt', 'timestamp', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Indexes for performance
  await db.schema
    .createIndex('mfa_user_id_index')
    .on('mfa')
    .column('userId')
    .execute();

  await db.schema
    .createIndex('mfa_type_index')
    .on('mfa')
    .column('type')
    .execute();

  await db.schema
    .createIndex('mfa_user_type_unique')
    .on('mfa')
    .columns(['userId', 'type'])
    .unique()
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('mfa').execute();
}
