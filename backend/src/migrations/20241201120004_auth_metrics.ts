import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Authentication metrics table
  await db.schema
    .createTable('auth_metrics')
    .addColumn('id', 'varchar(255)', (col) => col.primaryKey())
    .addColumn('metric_type', 'varchar(50)', (col) => col.notNull()) // auth_success, auth_failure, siwe_verification, session_created, custom
    .addColumn('metric_name', 'varchar(100)', (col) => col.notNull())
    .addColumn('value', 'decimal(10,2)', (col) => col.notNull())
    .addColumn('tags', 'json') // Additional dimensions like user_id, method, reason, etc.
    .addColumn('timestamp', 'timestamp', (col) => col.defaultTo('now()').notNull())
    .addColumn('createdAt', 'timestamp', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Indexes for performance
  await db.schema
    .createIndex('auth_metrics_type_timestamp_index')
    .on('auth_metrics')
    .columns(['metric_type', 'timestamp'])
    .execute();

  await db.schema
    .createIndex('auth_metrics_name_timestamp_index')
    .on('auth_metrics')
    .columns(['metric_name', 'timestamp'])
    .execute();

  await db.schema
    .createIndex('auth_metrics_timestamp_index')
    .on('auth_metrics')
    .column('timestamp')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('auth_metrics').execute();
}
