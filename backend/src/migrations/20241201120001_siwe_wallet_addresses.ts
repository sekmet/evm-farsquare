import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('walletAddress')
    .addColumn('id', 'varchar(255)', (col) => col.primaryKey())
    .addColumn('userId', 'varchar(255)', (col) => col.references('user.id').onDelete('cascade').notNull())
    .addColumn('address', 'varchar(42)', (col) => col.notNull()) // Ethereum address format
    .addColumn('chainId', 'integer', (col) => col.notNull())
    .addColumn('isPrimary', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('createdAt', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // Indexes
  await db.schema
    .createIndex('wallet_address_user_id_index')
    .on('walletAddress')
    .column('userId')
    .execute();

  await db.schema
    .createIndex('wallet_address_address_index')
    .on('walletAddress')
    .column('address')
    .execute();

  await db.schema
    .createIndex('wallet_address_primary_index')
    .on('walletAddress')
    .columns(['userId', 'isPrimary'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('walletAddress').execute();
}
