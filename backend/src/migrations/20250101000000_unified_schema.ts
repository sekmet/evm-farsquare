import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // ============================================================================
  // FarSquare Backend Database Schema - Unified Migration
  // TimescaleDB-optimized schema for real estate tokenization platform
  // ============================================================================

  // ============================================================================
  // SCHEMAS
  // ============================================================================

  await sql`CREATE SCHEMA IF NOT EXISTS public`.execute(db)

  // ============================================================================
  // ENUM TYPES
  // ============================================================================

  await sql`CREATE TYPE insight_category AS ENUM ('market', 'risk', 'opportunity', 'portfolio')`.execute(db)
  await sql`CREATE TYPE sentiment_impact AS ENUM ('positive', 'negative', 'neutral')`.execute(db)
  await sql`CREATE TYPE risk_level_enum AS ENUM ('low', 'medium', 'high')`.execute(db)
  await sql`CREATE TYPE market_trend_enum AS ENUM ('bullish', 'bearish', 'neutral')`.execute(db)

  // ============================================================================
  // INDEXER SCHEMA - Blockchain event tracking
  // ============================================================================

  // Chain events table (hypertable for time-series optimization)
  await db.schema
    .createTable('public.chain_events').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('block_height', 'bigint', (col) => col.notNull())
    .addColumn('tx_id', 'text', (col) => col.notNull())
    .addColumn('event_index', 'integer', (col) => col.notNull())
    .addColumn('contract', 'text', (col) => col.notNull())
    .addColumn('event_type', 'text', (col) => col.notNull())
    .addColumn('payload', 'jsonb', (col) => col.defaultTo('{}').notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .execute()

  // Convert to hypertable for time-series optimization
  await sql`SELECT create_hypertable('public.chain_events', 'created_at', if_not_exists => TRUE, chunk_time_interval => INTERVAL '1 day')`
  .execute(db).then( async () => {
    // Add constraints after hypertable creation
    await sql`ALTER TABLE public.chain_events ADD CONSTRAINT unique_event UNIQUE (tx_id, event_index, created_at)`.execute(db)
    await sql`ALTER TABLE public.chain_events ADD PRIMARY KEY (id, created_at)`.execute(db)
  }).catch((error) => {
    console.error('Error creating hypertable:', error)
  });

  // Indexes for common queries
  await db.schema
    .createIndex('idx_chain_events_block_height').ifNotExists()
    .on('public.chain_events')
    .column('block_height')
    .execute()
  await db.schema
    .createIndex('idx_chain_events_contract').ifNotExists()
    .on('public.chain_events')
    .column('contract')
    .execute()
  await db.schema
    .createIndex('idx_chain_events_event_type').ifNotExists()
    .on('public.chain_events')
    .columns(['event_type', 'created_at'])
    .execute()
  await db.schema
    .createIndex('idx_chain_events_payload_gin').ifNotExists()
    .on('public.chain_events')
    .using('gin')
    .column('payload')
    .execute()
  await db.schema
    .createIndex('idx_chain_events_tx_event').ifNotExists()
    .on('public.chain_events')
    .columns(['tx_id', 'event_index'])
    .execute()

  // Indexer state tracking
  await db.schema
    .createTable('public.indexer_state').ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('last_processed_block', 'bigint', (col) => col.defaultTo(0).notNull())
    .addColumn('last_processed_tx_id', 'text')
    .addColumn('last_processed_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`))
    .addColumn('status', 'text', (col) => col.defaultTo('running').notNull().check(sql`status IN ('running', 'paused', 'error')`))
    .addColumn('error_message', 'text')
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`))
    .execute()

  // Insert initial state
  await sql`INSERT INTO public.indexer_state (last_processed_block, status) VALUES (0, 'running') ON CONFLICT DO NOTHING`.execute(db)

  // ============================================================================
  // KYC SCHEMA - Identity verification and attestations
  // ============================================================================

  // Permissions registry (on-chain permission tracking)
  await db.schema
    .createTable('public.permissions').ifNotExists()
    .addColumn('principal', 'text', (col) => col.primaryKey())
    .addColumn('can_hold', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('roles', sql`TEXT[]`, (col) => col.defaultTo('{}').notNull())
    .addColumn('valid_until', 'bigint', (col) => col.notNull())
    .addColumn('attestation_hash', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .execute()

  await db.schema
    .createIndex('idx_permissions_valid_until').ifNotExists()
    .on('public.permissions')
    .column('valid_until')
    .execute()
  await db.schema
    .createIndex('idx_permissions_can_hold').ifNotExists()
    .on('public.permissions')
    .column('can_hold')
    .where('can_hold', '=', true)
    .execute()

  // KYC attestations (off-chain verifiable credentials storage)
  await db.schema
    .createTable('public.attestations').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('wallet_address', 'text', (col) => col.notNull())
    .addColumn('kyc_level', 'text', (col) => col.notNull().check(sql`kyc_level IN ('basic', 'standard', 'advanced')`))
    .addColumn('attestation_hash', 'text', (col) => col.notNull().unique())
    .addColumn('credential_data', 'jsonb', (col) => col.notNull())
    .addColumn('proof', 'text', (col) => col.notNull())
    .addColumn('issuer', 'text', (col) => col.notNull())
    .addColumn('issued_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .addColumn('revoked', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('revoked_at', 'timestamptz')
    .addColumn('revocation_reason', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .execute()

  await db.schema
    .createIndex('idx_attestations_wallet').ifNotExists()
    .on('public.attestations')
    .column('wallet_address')
    .execute()

  await sql`CREATE INDEX IF NOT EXISTS idx_attestations_expires ON public.attestations(expires_at) WHERE NOT revoked`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_attestations_active ON public.attestations(wallet_address, expires_at) WHERE NOT revoked`.execute(db)

  // ============================================================================
  // PROPERTIES SCHEMA - Property listings and marketplace
  // ============================================================================

  // Properties table (tokenized real estate)
  await db.schema
    .createTable('public.properties').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('contract_address', 'text', (col) => col.notNull().unique())
    .addColumn('token_symbol', 'text', (col) => col.notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text', (col) => col.notNull())
    .addColumn('location', 'text', (col) => col.notNull())
    .addColumn('property_type', 'text', (col) => col.notNull().check(sql`property_type IN ('residential', 'commercial', 'mixed')`))
    .addColumn('total_tokens', 'bigint', (col) => col.notNull().check(sql`total_tokens > 0`))
    .addColumn('available_tokens', 'bigint', (col) => col.notNull().check(sql`available_tokens >= 0`))
    .addColumn('token_price', sql`decimal(18,6)`, (col) => col.notNull().check(sql`token_price > 0`))
    .addColumn('total_value', sql`decimal(18,6)`, (col) => col.notNull().check(sql`total_value > 0`))
    .addColumn('annual_yield', sql`decimal(5,2)`, (col) => col.notNull().check(sql`annual_yield >= 0`))
    .addColumn('minimum_investment', sql`decimal(18,6)`, (col) => col.notNull().check(sql`minimum_investment > 0`))
    .addColumn('risk_level', 'text', (col) => col.notNull().check(sql`risk_level IN ('low', 'medium', 'high')`))
    .addColumn('features', sql`TEXT[]`, (col) => col.defaultTo('{}').notNull())
    .addColumn('images', sql`TEXT[]`, (col) => col.defaultTo('{}').notNull())
    .addColumn('funding_progress', 'integer', (col) => col.defaultTo(0).notNull().check(sql`funding_progress >= 0 AND funding_progress <= 100`))
    .addColumn('created_by', 'text', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.defaultTo('active').notNull().check(sql`status IN ('active', 'funded', 'cancelled', 'archived')`))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addCheckConstraint('valid_available_tokens', sql`available_tokens <= total_tokens`)
    .execute()

  // Property analytics time series (for AI modeling)
  await db.schema
    .createTable('public.property_analytics').ifNotExists()
    .addColumn('property_id', 'uuid', (col) => col.notNull().references('properties.id').onDelete('cascade'))
    .addColumn('date', 'date', (col) => col.notNull())
    .addColumn('price', sql`decimal(18,6)`, (col) => col.notNull())
    .addColumn('volume', 'bigint', (col) => col.defaultTo(0).notNull())
    .addColumn('investors_count', 'integer', (col) => col.defaultTo(0).notNull())
    .addColumn('funding_percentage', sql`decimal(5,2)`, (col) => col.defaultTo(0).notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addPrimaryKeyConstraint('property_analytics_pkey', ['property_id', 'date'])
    .execute()

  // Convert to hypertable for time-series queries
  await sql`SELECT create_hypertable('public.property_analytics', 'date', if_not_exists => TRUE, chunk_time_interval => INTERVAL '1 day')`.execute(db)

  // Marketplace listings (secondary market)
  await db.schema
    .createTable('public.marketplace_listings').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('property_id', 'uuid', (col) => col.notNull().references('properties.id'))
    .addColumn('seller_address', 'text', (col) => col.notNull())
    .addColumn('listing_price', sql`decimal(18,6)`, (col) => col.notNull().check(sql`listing_price > 0`))
    .addColumn('token_quantity', 'bigint', (col) => col.notNull().check(sql`token_quantity > 0`))
    .addColumn('available_quantity', 'bigint', (col) => col.notNull().check(sql`available_quantity > 0`))
    .addColumn('status', 'text', (col) => col.defaultTo('active').notNull().check(sql`status IN ('active', 'sold', 'cancelled', 'expired')`))
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addCheckConstraint('valid_available_quantity', sql`available_quantity <= token_quantity`)
    .execute()

  // User portfolios (property token holdings)
  await db.schema
    .createTable('public.user_portfolios').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('wallet_address', 'text', (col) => col.notNull())
    .addColumn('property_id', 'uuid', (col) => col.notNull().references('properties.id'))
    .addColumn('token_quantity', 'bigint', (col) => col.notNull().check(sql`token_quantity > 0`))
    .addColumn('average_purchase_price', sql`decimal(18,6)`, (col) => col.notNull())
    .addColumn('total_investment', sql`decimal(18,6)`, (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addUniqueConstraint('user_portfolios_wallet_property_key', ['wallet_address', 'property_id'])
    .execute()

  // Property images (uploaded files)
  await db.schema
    .createTable('public.property_images').ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('property_id', 'uuid', (col) => col.notNull().references('properties.id').onDelete('cascade'))
    .addColumn('file_name', 'text', (col) => col.notNull())
    .addColumn('original_name', 'text', (col) => col.notNull())
    .addColumn('mime_type', 'text', (col) => col.notNull())
    .addColumn('size', 'bigint', (col) => col.notNull())
    .addColumn('url', 'text', (col) => col.notNull())
    .addColumn('uploaded_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .execute()

  // Indexes for performance
  await db.schema
    .createIndex('idx_properties_status').ifNotExists()
    .on('public.properties')
    .column('status')
    .execute()
  await db.schema
    .createIndex('idx_properties_type').ifNotExists()
    .on('public.properties')
    .column('property_type')
    .execute()
  await db.schema
    .createIndex('idx_properties_risk').ifNotExists()
    .on('public.properties')
    .column('risk_level')
    .execute()
  await db.schema
    .createIndex('idx_properties_funding').ifNotExists()
    .on('public.properties')
    .column('funding_progress')
    .execute()
  await db.schema
    .createIndex('idx_properties_price').ifNotExists()
    .on('public.properties')
    .column('token_price')
    .execute()

  await db.schema
    .createIndex('idx_marketplace_listings_property').ifNotExists()
    .on('public.marketplace_listings')
    .column('property_id')
    .execute()
  await db.schema
    .createIndex('idx_marketplace_listings_seller').ifNotExists()
    .on('public.marketplace_listings')
    .column('seller_address')
    .execute()
  await db.schema
    .createIndex('idx_marketplace_listings_status').ifNotExists()
    .on('public.marketplace_listings')
    .column('status')
    .execute()

  await sql`CREATE INDEX IF NOT EXISTS idx_marketplace_listings_expires ON public.marketplace_listings(expires_at) WHERE status = 'active'`.execute(db)

  await db.schema
    .createIndex('idx_user_portfolios_wallet').ifNotExists()
    .on('public.user_portfolios')
    .column('wallet_address')
    .execute()
  await db.schema
    .createIndex('idx_user_portfolios_property').ifNotExists()
    .on('public.user_portfolios')
    .column('property_id')
    .execute()

  await db.schema
    .createIndex('idx_property_images_property').ifNotExists()
    .on('public.property_images')
    .column('property_id')
    .execute()
  await db.schema
    .createIndex('idx_property_images_uploaded').ifNotExists()
    .on('public.property_images')
    .column('uploaded_at')
    .execute()

  await db.schema
    .createIndex('idx_property_analytics_property').ifNotExists()
    .on('public.property_analytics')
    .column('property_id')
    .execute()

  // ============================================================================
  // TRADING SCHEMA - Order matching and settlement
  // ============================================================================

  // Orders table
  await db.schema
    .createTable('public.orders').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('wallet_address', 'text', (col) => col.notNull())
    .addColumn('property_id', 'text', (col) => col.notNull())
    .addColumn('side', 'text', (col) => col.notNull().check(sql`side IN ('buy', 'sell')`))
    .addColumn('price_per_share', sql`decimal(18,6)`, (col) => col.notNull().check(sql`price_per_share > 0`))
    .addColumn('quantity', 'bigint', (col) => col.notNull().check(sql`quantity > 0`))
    .addColumn('remaining', 'bigint', (col) => col.notNull().check(sql`remaining >= 0`))
    .addColumn('nonce', 'bigint', (col) => col.notNull())
    .addColumn('expiry', 'bigint', (col) => col.notNull())
    .addColumn('signature', 'text', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.defaultTo('open').notNull().check(sql`status IN ('open', 'matched', 'settled', 'cancelled', 'expired')`))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addUniqueConstraint('unique_wallet_nonce', ['wallet_address', 'nonce'])
    .addCheckConstraint('valid_remaining', sql`remaining <= quantity`)
    .execute()

  // Indexes for order matching and queries
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_property_side_price ON public.orders(property_id, side, price_per_share DESC, created_at ASC) WHERE status = 'open'`.execute(db)
  await db.schema
    .createIndex('idx_orders_wallet').ifNotExists()
    .on('public.orders')
    .column('wallet_address')
    .execute()
  await db.schema
    .createIndex('idx_orders_status').ifNotExists()
    .on('public.orders')
    .column('status')
    .execute()
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_expiry ON public.orders(expiry) WHERE status = 'open'`.execute(db)

  // Matches table
  await db.schema
    .createTable('public.matches').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('buy_order_id', 'uuid', (col) => col.notNull().references('public.orders.id'))
    .addColumn('sell_order_id', 'uuid', (col) => col.notNull().references('public.orders.id'))
    .addColumn('property_id', 'text', (col) => col.notNull())
    .addColumn('price', sql`decimal(18,6)`, (col) => col.notNull())
    .addColumn('quantity', 'bigint', (col) => col.notNull())
    .addColumn('matched_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('status', 'text', (col) => col.defaultTo('pending').notNull().check(sql`status IN ('pending', 'settling', 'settled', 'failed')`))
    .addColumn('settlement_tx_id', 'text')
    .addColumn('settlement_block_height', 'bigint')
    .addColumn('settled_at', 'timestamptz')
    .addColumn('error_message', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .execute()

  await db.schema
    .createIndex('idx_matches_buy_order').ifNotExists()
    .on('public.matches')
    .column('buy_order_id')
    .execute()
  await db.schema
    .createIndex('idx_matches_sell_order').ifNotExists()
    .on('public.matches')
    .column('sell_order_id')
    .execute()
  await db.schema
    .createIndex('idx_matches_status').ifNotExists()
    .on('public.matches')
    .column('status')
    .execute()
  await db.schema
    .createIndex('idx_matches_property').ifNotExists()
    .on('public.matches')
    .column('property_id')
    .execute()

  // Settlements table
  await db.schema
    .createTable('public.settlements').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('match_id', 'uuid', (col) => col.notNull().references('public.matches.id'))
    .addColumn('tx_id', 'text', (col) => col.notNull().unique())
    .addColumn('block_height', 'bigint', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull().check(sql`status IN ('pending', 'confirmed', 'failed')`))
    .addColumn('receipt', 'jsonb')
    .addColumn('gas_used', 'bigint')
    .addColumn('error_message', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .execute()

  await db.schema
    .createIndex('idx_settlements_match').ifNotExists()
    .on('public.settlements')
    .column('match_id')
    .execute()
  await db.schema
    .createIndex('idx_settlements_tx').ifNotExists()
    .on('public.settlements')
    .column('tx_id')
    .execute()
  await db.schema
    .createIndex('idx_settlements_status').ifNotExists()
    .on('public.settlements')
    .column('status')
    .execute()

  // Property rent time series (for AI modeling)
  await db.schema
    .createTable('public.property_rents').ifNotExists()
    .addColumn('property_id', 'text', (col) => col.notNull())
    .addColumn('month', 'date', (col) => col.notNull())
    .addColumn('rent_amount', sql`decimal(18,6)`, (col) => col.notNull().check(sql`rent_amount >= 0`))
    .addColumn('occupancy_rate', sql`decimal(5,2)`, (col) => col.check(sql`occupancy_rate >= 0 AND occupancy_rate <= 100`))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addPrimaryKeyConstraint('property_rents_pkey', ['property_id', 'month'])
    .execute()

  // Convert to hypertable for time-series queries
  await sql`SELECT create_hypertable('public.property_rents', 'month', if_not_exists => TRUE, chunk_time_interval => INTERVAL '1 month')`.execute(db)

  await db.schema
    .createIndex('idx_property_rents_property').ifNotExists()
    .on('public.property_rents')
    .column('property_id')
    .execute()

  // ============================================================================
  // USERS SCHEMA - User profiles and onboarding
  // ============================================================================

  // Users/Profiles table
  await db.schema
    .createTable('public.profiles').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('user_id', 'text', (col) => col.notNull().references('public.user.id').onDelete('cascade'))
    .addColumn('evm_address', 'text', (col) => col.notNull().unique())
    .addColumn('email', 'text', (col) => col.unique())
    .addColumn('user_type', 'text', (col) => col.notNull().check(sql`user_type IN ('individual', 'entity')`))
    .addColumn('jurisdiction', 'text', (col) => col.notNull())
    .addColumn('onboarding_status', 'text', (col) => col.defaultTo('not_started').notNull().check(sql`onboarding_status IN ('not_started', 'in_progress', 'completed', 'rejected')`))
    .addColumn('onboarding_current_step', 'text', (col) => col.check(sql`onboarding_current_step IN ('start', 'kyc', 'identity', 'qualification', 'esign', 'complete')`))
    .addColumn('onboarding_progress', 'integer', (col) => col.defaultTo(0).check(sql`onboarding_progress >= 0 AND onboarding_progress <= 100`))
    .addColumn('onboarding_started_at', 'timestamptz')
    .addColumn('onboarding_completed_at', 'timestamptz')
    .addColumn('onboarding_session_id', 'text')
    .addColumn('kyc_status', 'text', (col) => col.defaultTo('pending').check(sql`kyc_status IN ('pending', 'approved', 'rejected', 'expired')`))
    .addColumn('kyc_verified_at', 'timestamptz')
    .addColumn('kyc_expires_at', 'timestamptz')
    .addColumn('onchain_identity_address', 'text')
    .addColumn('identity_verified', 'boolean', (col) => col.defaultTo(false))
    .addColumn('identity_country_code', 'integer')
    .addColumn('qualification_status', 'text', (col) => col.defaultTo('pending').check(sql`qualification_status IN ('pending', 'approved', 'rejected')`))
    .addColumn('qualified_at', 'timestamptz')
    .addColumn('accredited_investor', 'boolean', (col) => col.defaultTo(false))
    .addColumn('full_name', 'text')
    .addColumn('date_of_birth', 'date')
    .addColumn('phone_number', 'text')
    .addColumn('address_line1', 'text')
    .addColumn('address_line2', 'text')
    .addColumn('city', 'text')
    .addColumn('state_province', 'text')
    .addColumn('postal_code', 'text')
    .addColumn('country', 'text')
    .addColumn('entity_name', 'text')
    .addColumn('entity_type', 'text')
    .addColumn('entity_registration_number', 'text')
    .addColumn('entity_country', 'text')
    .addColumn('privacy_consent', 'boolean', (col) => col.defaultTo(false))
    .addColumn('terms_consent', 'boolean', (col) => col.defaultTo(false))
    .addColumn('data_processing_consent', 'boolean', (col) => col.defaultTo(false))
    .addColumn('esign_completed', 'boolean', (col) => col.defaultTo(false))
    .addColumn('esign_completed_at', 'timestamptz')
    .addColumn('account_status', 'text', (col) => col.defaultTo('active').notNull().check(sql`account_status IN ('active', 'suspended', 'closed')`))
    .addColumn('suspension_reason', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('last_login_at', 'timestamptz')
    .addCheckConstraint('valid_onboarding_dates', sql`onboarding_started_at IS NULL OR onboarding_completed_at IS NULL OR onboarding_completed_at >= onboarding_started_at`)
    .addCheckConstraint('entity_data_required', sql`user_type != 'entity' OR (entity_name IS NOT NULL AND entity_type IS NOT NULL)`)
    .execute()

  // Onboarding sessions table
  await db.schema
    .createTable('public.onboarding_sessions').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('session_id', 'text', (col) => col.notNull().unique())
    .addColumn('user_id', 'text', (col) => col.notNull().references('public.user.id').onDelete('cascade'))
    .addColumn('user_type', 'text', (col) => col.notNull().check(sql`user_type IN ('individual', 'entity')`))
    .addColumn('jurisdiction', 'text', (col) => col.notNull())
    .addColumn('current_step', 'text', (col) => col.defaultTo('start').notNull().check(sql`current_step IN ('start', 'kyc', 'identity', 'qualification', 'esign', 'complete')`))
    .addColumn('status', 'text', (col) => col.defaultTo('active').notNull().check(sql`status IN ('active', 'completed', 'abandoned', 'expired', 'approved', 'rejected', 'pending', 'in_progress')`))
    .addColumn('progress', 'integer', (col) => col.defaultTo(0).check(sql`progress >= 0 AND progress <= 100`))
    .addColumn('start_completed', 'boolean', (col) => col.defaultTo(false))
    .addColumn('start_completed_at', 'timestamptz')
    .addColumn('kyc_completed', 'boolean', (col) => col.defaultTo(false))
    .addColumn('kyc_completed_at', 'timestamptz')
    .addColumn('identity_completed', 'boolean', (col) => col.defaultTo(false))
    .addColumn('identity_completed_at', 'timestamptz')
    .addColumn('qualification_completed', 'boolean', (col) => col.defaultTo(false))
    .addColumn('qualification_completed_at', 'timestamptz')
    .addColumn('esign_completed', 'boolean', (col) => col.defaultTo(false))
    .addColumn('esign_completed_at', 'timestamptz')
    .addColumn('session_data', 'jsonb', (col) => col.defaultTo('{}'))
    .addColumn('approved_by', 'text')
    .addColumn('rejected_by', 'text')
    .addColumn('rejection_reason', 'text')
    .addColumn('email', 'text')
    .addColumn('kyc_status', 'text', (col) => col.defaultTo('pending').check(sql`kyc_status IN ('pending', 'in_review', 'approved', 'rejected')`))
    .addColumn('identity_verified', 'boolean', (col) => col.defaultTo(false))
    .addColumn('user_jurisdiction', 'text')
    .addColumn('started_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('completed_at', 'timestamptz')
    .addColumn('expires_at', 'timestamptz', (col) => col.defaultTo(sql`NOW() + INTERVAL '7 days'`).notNull())
    .addColumn('last_activity_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .execute()

  // KYC documents table
  await db.schema
    .createTable('public.kyc_documents').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('user_id', 'text', (col) => col.notNull().references('public.user.id').onDelete('cascade'))
    .addColumn('session_id', 'uuid', (col) => col.references('public.onboarding_sessions.id').onDelete('set null'))
    .addColumn('document_type', 'text', (col) => col.notNull().check(sql`document_type IN ('id_front', 'id_back', 'passport', 'proof_of_address', 'selfie', 'other')`))
    .addColumn('file_name', 'text', (col) => col.notNull())
    .addColumn('file_path', 'text', (col) => col.notNull())
    .addColumn('file_size', 'bigint', (col) => col.notNull())
    .addColumn('mime_type', 'text', (col) => col.notNull())
    .addColumn('file_url', 'text')
    .addColumn('verification_status', 'text', (col) => col.defaultTo('pending').notNull().check(sql`verification_status IN ('pending', 'processing', 'approved', 'rejected')`))
    .addColumn('verified_at', 'timestamptz')
    .addColumn('verified_by', 'text')
    .addColumn('rejection_reason', 'text')
    .addColumn('extracted_data', 'jsonb')
    .addColumn('uploaded_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .execute()

  // Property ownership table (for property owners/managers)
  await db.schema
    .createTable('public.property_ownership').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('user_id', 'text', (col) => col.notNull().references('public.user.id').onDelete('cascade'))
    .addColumn('property_id', 'uuid', (col) => col.notNull().references('properties.id').onDelete('cascade'))
    .addColumn('ownership_type', 'text', (col) => col.notNull().check(sql`ownership_type IN ('owner', 'co_owner', 'manager')`))
    .addColumn('ownership_percentage', sql`decimal(5,2)`, (col) => col.check(sql`ownership_percentage > 0 AND ownership_percentage <= 100`))
    .addColumn('can_edit', 'boolean', (col) => col.defaultTo(false))
    .addColumn('can_mint_tokens', 'boolean', (col) => col.defaultTo(false))
    .addColumn('can_manage_documents', 'boolean', (col) => col.defaultTo(false))
    .addColumn('can_communicate_investors', 'boolean', (col) => col.defaultTo(false))
    .addColumn('status', 'text', (col) => col.defaultTo('active').notNull().check(sql`status IN ('active', 'inactive', 'revoked')`))
    .addColumn('granted_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('revoked_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addUniqueConstraint('property_ownership_user_property_key', ['user_id', 'property_id'])
    .execute()

  // Indexes for performance
  await db.schema
    .createIndex('idx_profiles_evm_address').ifNotExists()
    .on('public.profiles')
    .column('evm_address')
    .execute()
  await db.schema
    .createIndex('idx_profiles_email').ifNotExists()
    .on('public.profiles')
    .column('email')
    .execute()
  await db.schema
    .createIndex('idx_profiles_onboarding_status').ifNotExists()
    .on('public.profiles')
    .column('onboarding_status')
    .execute()
  await db.schema
    .createIndex('idx_profiles_kyc_status').ifNotExists()
    .on('public.profiles')
    .column('kyc_status')
    .execute()
  await db.schema
    .createIndex('idx_profiles_account_status').ifNotExists()
    .on('public.profiles')
    .column('account_status')
    .execute()

  await db.schema
    .createIndex('idx_onboarding_sessions_session_id').ifNotExists()
    .on('public.onboarding_sessions')
    .column('session_id')
    .execute()
  await db.schema
    .createIndex('idx_onboarding_sessions_user').ifNotExists()
    .on('public.onboarding_sessions')
    .column('user_id')
    .execute()
  await db.schema
    .createIndex('idx_onboarding_sessions_status').ifNotExists()
    .on('public.onboarding_sessions')
    .column('status')
    .execute()

  await sql`CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_expires ON public.onboarding_sessions(expires_at) WHERE status = 'active'`.execute(db)

  await db.schema
    .createIndex('idx_kyc_documents_user').ifNotExists()
    .on('public.kyc_documents')
    .column('user_id')
    .execute()
  await db.schema
    .createIndex('idx_kyc_documents_session').ifNotExists()
    .on('public.kyc_documents')
    .column('session_id')
    .execute()
  await db.schema
    .createIndex('idx_kyc_documents_status').ifNotExists()
    .on('public.kyc_documents')
    .column('verification_status')
    .execute()

  await db.schema
    .createIndex('idx_property_ownership_user').ifNotExists()
    .on('public.property_ownership')
    .column('user_id')
    .execute()
  await db.schema
    .createIndex('idx_property_ownership_property').ifNotExists()
    .on('public.property_ownership')
    .column('property_id')
    .execute()
  await db.schema
    .createIndex('idx_property_ownership_status').ifNotExists()
    .on('public.property_ownership')
    .column('status')
    .execute()

  // ============================================================================
  // TREX SCHEMA - ERC-3643 compliant token ecosystem
  // ============================================================================

  // TREX token deployments
  await db.schema
    .createTable('public.tokens').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('contract_address', 'text', (col) => col.notNull().unique())
    .addColumn('name', 'varchar(32)', (col) => col.notNull())
    .addColumn('symbol', 'varchar(32)', (col) => col.notNull())
    .addColumn('decimals', 'integer', (col) => col.defaultTo(6).check(sql`decimals >= 0 AND decimals <= 18`))
    .addColumn('total_supply', 'bigint', (col) => col.defaultTo(0))
    .addColumn('circulating_supply', 'bigint', (col) => col.defaultTo(0))
    .addColumn('identity_registry_contract', 'text')
    .addColumn('compliance_contract', 'text')
    .addColumn('paused', 'boolean', (col) => col.defaultTo(false))
    .addColumn('owner_address', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('deployed_at', 'timestamptz')
    .addColumn('deployed_tx_hash', 'text')
    .execute()

  // TREX factory deployments
  await db.schema
    .createTable('public.suites').ifNotExists()
    .addColumn('salt', 'varchar(64)', (col) => col.primaryKey())
    .addColumn('token_id', 'uuid', (col) => col.references('public.tokens.id'))
    .addColumn('identity_factory_contract', 'text')
    .addColumn('authority_contract', 'text')
    .addColumn('identity_registry_contract', 'text')
    .addColumn('identity_storage_contract', 'text')
    .addColumn('claim_topics_registry_contract', 'text')
    .addColumn('trusted_issuers_registry_contract', 'text')
    .addColumn('compliance_contract', 'text')
    .addColumn('time_restriction_module_contract', 'text')
    .addColumn('country_restriction_module_contract', 'text')
    .addColumn('max_balance_module_contract', 'text')
    .addColumn('max_holders_module_contract', 'text')
    .addColumn('deployed_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('deployed_by', 'text', (col) => col.notNull())
    .addColumn('deployed_tx_hash', 'text')
    .addColumn('token_name', 'varchar(32)')
    .addColumn('token_symbol', 'varchar(32)')
    .addColumn('initial_supply', 'bigint')
    .execute()

  // Identity registrations
  await db.schema
    .createTable('public.identities').ifNotExists()
    .addColumn('user_address', 'text', (col) => col.primaryKey())
    .addColumn('identity_contract', 'text', (col) => col.notNull())
    .addColumn('country_code', 'integer', (col) => col.check(sql`country_code >= 0 AND country_code <= 999`))
    .addColumn('verified', 'boolean', (col) => col.defaultTo(false))
    .addColumn('registered_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('registered_by', 'text')
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('verification_status', 'varchar(50)', (col) => col.defaultTo('pending'))
    .addColumn('last_verified_at', 'timestamptz')
    .execute()

  // ONCHAINID claims storage
  await db.schema
    .createTable('public.claims').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('identity_address', 'text', (col) => col.notNull().references('public.identities.user_address'))
    .addColumn('claim_id', 'varchar(66)', (col) => col.notNull())
    .addColumn('topic', 'integer', (col) => col.notNull())
    .addColumn('scheme', 'integer', (col) => col.notNull())
    .addColumn('issuer_address', 'text', (col) => col.notNull())
    .addColumn('signature', 'text', (col) => col.notNull())
    .addColumn('data', 'text')
    .addColumn('uri', 'text')
    .addColumn('issued_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('expires_at', 'timestamptz')
    .addColumn('revoked', 'boolean', (col) => col.defaultTo(false))
    .addColumn('revoked_at', 'timestamptz')
    .addColumn('verified', 'boolean', (col) => col.defaultTo(false))
    .addColumn('verified_at', 'timestamptz')
    .execute()

  // Claim topics registry
  await db.schema
    .createTable('public.claim_topics').ifNotExists()
    .addColumn('topic_id', 'integer', (col) => col.primaryKey())
    .addColumn('name', 'varchar(100)', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('required', 'boolean', (col) => col.defaultTo(true))
    .addColumn('added_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('added_by', 'text')
    .execute()

  // Trusted issuers registry
  await db.schema
    .createTable('public.trusted_issuers').ifNotExists()
    .addColumn('issuer_address', 'text', (col) => col.primaryKey())
    .addColumn('name', 'varchar(100)')
    .addColumn('description', 'text')
    .addColumn('website', 'text')
    .addColumn('trusted', 'boolean', (col) => col.defaultTo(true))
    .addColumn('trusted_since', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('untrusted_at', 'timestamptz')
    .addColumn('claim_topics', sql`INTEGER[]`, (col) => col.defaultTo('{}'))
    .addColumn('added_by', 'text')
    .addColumn('added_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .execute()

  // Compliance modules registry
  await db.schema
    .createTable('public.compliance_modules').ifNotExists()
    .addColumn('module_address', 'text', (col) => col.primaryKey())
    .addColumn('name', 'varchar(64)', (col) => col.notNull())
    .addColumn('version', 'varchar(16)', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('active', 'boolean', (col) => col.defaultTo(true))
    .addColumn('added_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('execution_order', 'integer')
    .addColumn('compliance_contract', 'text')
    .execute()

  // Transfer history for compliance tracking
  await db.schema
    .createTable('public.transfer_history').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('token_contract', 'text', (col) => col.notNull())
    .addColumn('from_address', 'text', (col) => col.notNull())
    .addColumn('to_address', 'text', (col) => col.notNull())
    .addColumn('amount', 'bigint', (col) => col.notNull())
    .addColumn('tx_hash', 'text')
    .addColumn('block_height', 'bigint')
    .addColumn('timestamp', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('modules_checked', sql`TEXT[]`, (col) => col.defaultTo('{}'))
    .addColumn('compliance_passed', 'boolean', (col) => col.defaultTo(true))
    .addColumn('compliance_reasons', sql`TEXT[]`, (col) => col.defaultTo('{}'))
    .execute()

  // Agent permissions
  await db.schema
    .createTable('public.agents').ifNotExists()
    .addColumn('token_contract', 'text', (col) => col.notNull())
    .addColumn('agent_address', 'text', (col) => col.notNull())
    .addColumn('role', 'varchar(50)', (col) => col.notNull())
    .addColumn('active', 'boolean', (col) => col.defaultTo(true))
    .addColumn('granted_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('granted_by', 'text')
    .addColumn('revoked_at', 'timestamptz')
    .addColumn('can_mint', 'boolean', (col) => col.defaultTo(false))
    .addColumn('can_burn', 'boolean', (col) => col.defaultTo(false))
    .addColumn('can_freeze', 'boolean', (col) => col.defaultTo(false))
    .addColumn('can_transfer', 'boolean', (col) => col.defaultTo(false))
    .addColumn('can_recover', 'boolean', (col) => col.defaultTo(false))
    .addPrimaryKeyConstraint('agents_pkey', ['token_contract', 'agent_address', 'role'])
    .execute()

  // Frozen accounts
  await db.schema
    .createTable('public.frozen_accounts').ifNotExists()
    .addColumn('token_contract', 'text', (col) => col.notNull())
    .addColumn('account_address', 'text', (col) => col.notNull())
    .addColumn('frozen', 'boolean', (col) => col.defaultTo(true))
    .addColumn('frozen_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('frozen_by', 'text')
    .addColumn('reason', 'text')
    .addColumn('recovery_deadline', 'timestamptz')
    .addColumn('recovered', 'boolean', (col) => col.defaultTo(false))
    .addColumn('recovered_at', 'timestamptz')
    .addPrimaryKeyConstraint('frozen_accounts_pkey', ['token_contract', 'account_address'])
    .execute()

  // Partial token freezing
  await db.schema
    .createTable('public.frozen_tokens').ifNotExists()
    .addColumn('token_contract', 'text', (col) => col.notNull())
    .addColumn('account_address', 'text', (col) => col.notNull())
    .addColumn('frozen_amount', 'bigint', (col) => col.defaultTo(0).notNull())
    .addColumn('frozen_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('frozen_by', 'text')
    .addColumn('reason', 'text')
    .addPrimaryKeyConstraint('frozen_tokens_pkey', ['token_contract', 'account_address'])
    .execute()

  // Transfer limits
  await db.schema
    .createTable('public.transfer_limits').ifNotExists()
    .addColumn('token_contract', 'text', (col) => col.notNull())
    .addColumn('user_address', 'text', (col) => col.notNull())
    .addColumn('daily_limit', 'bigint', (col) => col.defaultTo(1000000).notNull())
    .addColumn('used_today', 'bigint', (col) => col.defaultTo(0))
    .addColumn('last_reset', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('set_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('set_by', 'text')
    .addPrimaryKeyConstraint('transfer_limits_pkey', ['token_contract', 'user_address'])
    .execute()

  // Link TREX tokens to properties
  await db.schema
    .createTable('public.property_tokens').ifNotExists()
    .addColumn('property_id', 'uuid', (col) => col.references('properties.id'))
    .addColumn('token_address', 'text', (col) => col.references('public.tokens.contract_address'))
    .addColumn('identity_registry', 'text', (col) => col.notNull())
    .addColumn('compliance', 'text', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull())
    .addColumn('tx_hash', 'text', (col) => col.notNull())
    .addColumn('deployed_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('deployer_address', 'text', (col) => col.notNull())
    .addColumn('network', 'text', (col) => col.notNull())
    .addColumn('error', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addPrimaryKeyConstraint('property_tokens_pkey', ['property_id', 'token_address'])
    .execute()

  // Comprehensive audit log
  await db.schema
    .createTable('public.audit_log').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('event_type', 'varchar(100)', (col) => col.notNull())
    .addColumn('contract_address', 'text')
    .addColumn('user_address', 'text')
    .addColumn('event_data', 'jsonb')
    .addColumn('metadata', 'jsonb')
    .addColumn('event_timestamp', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('block_height', 'bigint')
    .addColumn('tx_hash', 'text')
    .execute()

  // ============================================================================
  // INSIGHTS SCHEMA - AI insights and analytics
  // ============================================================================

  // AI-generated insights with metadata
  await db.schema
    .createTable('public.insights').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('insight_type', sql`insight_category`, (col) => col.notNull())
    .addColumn('title', 'text', (col) => col.notNull())
    .addColumn('description', 'text', (col) => col.notNull())
    .addColumn('confidence_score', sql`decimal(3,2)`, (col) => col.notNull().check(sql`confidence_score >= 0 AND confidence_score <= 1`))
    .addColumn('impact', sql`sentiment_impact`, (col) => col.notNull())
    .addColumn('category', sql`insight_category`, (col) => col.notNull())
    .addColumn('model_version', 'varchar(50)', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('expires_at', 'timestamptz')
    .addColumn('metadata', 'jsonb')
    .execute()

  // Property recommendations with scoring
  await db.schema
    .createTable('public.property_recommendations').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('property_id', 'uuid', (col) => col.references('properties.id').onDelete('cascade'))
    .addColumn('user_id', 'text', (col) => col.notNull().references('public.user.id').onDelete('cascade'))
    .addColumn('score', sql`decimal(3,2)`, (col) => col.notNull().check(sql`score >= 0 AND score <= 1`))
    .addColumn('reason', 'text', (col) => col.notNull())
    .addColumn('expected_roi', sql`decimal(5,2)`)
    .addColumn('risk_level', sql`risk_level_enum`)
    .addColumn('investment_amount', sql`decimal(12,2)`)
    .addColumn('time_horizon', 'varchar(50)')
    .addColumn('expected_returns', sql`decimal(12,2)`)
    .addColumn('risk_factors', sql`TEXT[]`, (col) => col.defaultTo('{}'))
    .addColumn('opportunities', sql`TEXT[]`, (col) => col.defaultTo('{}'))
    .addColumn('model_version', 'varchar(50)', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addColumn('expires_at', 'timestamptz')
    .execute()

  // Market data aggregations
  await db.schema
    .createTable('public.market_analytics').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('timeframe', 'varchar(10)', (col) => col.notNull())
    .addColumn('market_cap', sql`decimal(15,2)`)
    .addColumn('total_properties', 'integer')
    .addColumn('avg_yield', sql`decimal(5,2)`)
    .addColumn('market_trend', sql`market_trend_enum`)
    .addColumn('volatility_index', sql`decimal(5,2)`)
    .addColumn('investor_sentiment', sql`decimal(5,2)`)
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .execute()

  // Portfolio analysis results
  await db.schema
    .createTable('public.portfolio_analytics').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('user_id', 'text', (col) => col.notNull().references('public.user.id').onDelete('cascade'))
    .addColumn('diversification_score', 'integer', (col) => col.check(sql`diversification_score >= 0 AND diversification_score <= 100`))
    .addColumn('risk_exposure', sql`risk_level_enum`)
    .addColumn('expected_returns', sql`decimal(5,2)`)
    .addColumn('recommendations', 'jsonb')
    .addColumn('model_version', 'varchar(50)', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .execute()

  // Store model versions and performance metrics
  await db.schema
    .createTable('public.model_metadata').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('model_name', 'varchar(100)', (col) => col.notNull())
    .addColumn('version', 'varchar(50)', (col) => col.notNull())
    .addColumn('model_type', 'varchar(50)', (col) => col.notNull())
    .addColumn('accuracy', sql`decimal(5,4)`)
    .addColumn('precision', sql`decimal(5,4)`)
    .addColumn('recall', sql`decimal(5,4)`)
    .addColumn('f1_score', sql`decimal(5,4)`)
    .addColumn('rmse', sql`decimal(10,6)`)
    .addColumn('mae', sql`decimal(10,6)`)
    .addColumn('training_data_hash', 'varchar(64)')
    .addColumn('feature_schema', 'jsonb')
    .addColumn('hyperparameters', 'jsonb')
    .addColumn('training_duration', 'integer')
    .addColumn('deployed_at', 'timestamptz')
    .addColumn('deployed_by', 'text')
    .addColumn('is_active', 'boolean', (col) => col.defaultTo(false))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addUniqueConstraint('model_metadata_model_name_version_key', ['model_name', 'version'])
    .execute()

  // Store computed features for ML models
  await db.schema
    .createTable('public.feature_store').ifNotExists()
    .addColumn('entity_id', 'text', (col) => col.notNull())
    .addColumn('entity_type', 'varchar(50)', (col) => col.notNull())
    .addColumn('feature_name', 'varchar(100)', (col) => col.notNull())
    .addColumn('feature_value', 'jsonb', (col) => col.notNull())
    .addColumn('computed_at', 'timestamptz', (col) => col.notNull())
    .addColumn('as_of_date', 'date', (col) => col.notNull())
    .addColumn('model_version', 'varchar(50)')
    .addPrimaryKeyConstraint('feature_store_pkey', ['entity_id', 'entity_type', 'feature_name', 'as_of_date'])
    .execute()

  // Store prediction history for model evaluation and confidence calibration
  await db.schema
    .createTable('public.prediction_history').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('model_name', 'varchar(100)', (col) => col.notNull())
    .addColumn('model_version', 'varchar(50)', (col) => col.notNull())
    .addColumn('entity_id', 'text', (col) => col.notNull())
    .addColumn('entity_type', 'varchar(50)', (col) => col.notNull())
    .addColumn('prediction', 'jsonb', (col) => col.notNull())
    .addColumn('confidence', sql`decimal(3,2)`)
    .addColumn('actual_outcome', 'jsonb')
    .addColumn('outcome_date', 'date')
    .addColumn('input_features', 'jsonb')
    .addColumn('prediction_context', 'jsonb')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .execute()

  // Store confidence calibration data
  await db.schema
    .createTable('public.confidence_calibration').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn('model_name', 'varchar(100)', (col) => col.notNull())
    .addColumn('model_version', 'varchar(50)', (col) => col.notNull())
    .addColumn('calibration_date', 'date', (col) => col.notNull())
    .addColumn('expected_calibration_error', sql`decimal(5,4)`)
    .addColumn('brier_score', sql`decimal(5,4)`)
    .addColumn('calibration_curve', 'jsonb')
    .addColumn('confidence_bins', 'jsonb')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
    .addUniqueConstraint('confidence_calibration_model_name_model_version_calibration_date_key', ['model_name', 'model_version', 'calibration_date'])
    .execute()

  // ============================================================================
  // INDEXES
  // ============================================================================

  // Insights indexes
  await db.schema
    .createIndex('idx_insights_type_category').ifNotExists()
    .on('public.insights')
    .columns(['insight_type', 'category'])
    .execute()
  await db.schema
    .createIndex('idx_insights_confidence').ifNotExists()
    .on('public.insights')
    .column('confidence_score')
    .execute()
  await db.schema
    .createIndex('idx_insights_created_at').ifNotExists()
    .on('public.insights')
    .column('created_at')
    .execute()

  await sql`CREATE INDEX IF NOT EXISTS idx_insights_expires_at ON public.insights (expires_at) WHERE expires_at IS NOT NULL`.execute(db)

  await db.schema
    .createIndex('idx_recommendations_user_property').ifNotExists()
    .on('public.property_recommendations')
    .columns(['user_id', 'property_id'])
    .execute()
  await db.schema
    .createIndex('idx_recommendations_score').ifNotExists()
    .on('public.property_recommendations')
    .column('score')
    .execute()
  await db.schema
    .createIndex('idx_recommendations_risk').ifNotExists()
    .on('public.property_recommendations')
    .column('risk_level')
    .execute()
  await db.schema
    .createIndex('idx_recommendations_created_at').ifNotExists()
    .on('public.property_recommendations')
    .column('created_at')
    .execute()
  await sql`CREATE INDEX IF NOT EXISTS idx_recommendations_expires_at ON public.property_recommendations (expires_at) WHERE expires_at IS NOT NULL`.execute(db)

  await db.schema
    .createIndex('idx_market_analytics_timeframe').ifNotExists()
    .on('public.market_analytics')
    .column('timeframe')
    .execute()
  await db.schema
    .createIndex('idx_market_analytics_created_at').ifNotExists()
    .on('public.market_analytics')
    .column('created_at')
    .execute()
  await db.schema
    .createIndex('idx_market_analytics_trend').ifNotExists()
    .on('public.market_analytics')
    .column('market_trend')
    .execute()

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_market_analytics_timeframe_date ON public.market_analytics (timeframe, ((created_at AT TIME ZONE 'UTC')::date))`.execute(db)

  await db.schema
    .createIndex('idx_portfolio_analytics_user').ifNotExists()
    .on('public.portfolio_analytics')
    .column('user_id')
    .execute()
  await db.schema
    .createIndex('idx_portfolio_analytics_diversification').ifNotExists()
    .on('public.portfolio_analytics')
    .column('diversification_score')
    .execute()
  await db.schema
    .createIndex('idx_portfolio_analytics_created_at').ifNotExists()
    .on('public.portfolio_analytics')
    .column('created_at')
    .execute()

  await sql`CREATE INDEX IF NOT EXISTS idx_model_metadata_active ON public.model_metadata (model_name, is_active) WHERE is_active = TRUE`.execute(db)
  await db.schema
    .createIndex('idx_model_metadata_type').ifNotExists()
    .on('public.model_metadata')
    .column('model_type')
    .execute()
  await db.schema
    .createIndex('idx_model_metadata_deployed_at').ifNotExists()
    .on('public.model_metadata')
    .column('deployed_at')
    .execute()

  await db.schema
    .createIndex('idx_feature_store_entity').ifNotExists()
    .on('public.feature_store')
    .columns(['entity_id', 'entity_type'])
    .execute()
  await db.schema
    .createIndex('idx_feature_store_feature').ifNotExists()
    .on('public.feature_store')
    .column('feature_name')
    .execute()
  await db.schema
    .createIndex('idx_feature_store_date').ifNotExists()
    .on('public.feature_store')
    .column('as_of_date')
    .execute()
  await db.schema
    .createIndex('idx_feature_store_computed').ifNotExists()
    .on('public.feature_store')
    .column('computed_at')
    .execute()

  await db.schema
    .createIndex('idx_prediction_history_model').ifNotExists()
    .on('public.prediction_history')
    .columns(['model_name', 'model_version'])
    .execute()
  await db.schema
    .createIndex('idx_prediction_history_entity').ifNotExists()
    .on('public.prediction_history')
    .columns(['entity_id', 'entity_type'])
    .execute()
  await db.schema
    .createIndex('idx_prediction_history_created_at').ifNotExists()
    .on('public.prediction_history')
    .column('created_at')
    .execute()
  await sql`CREATE INDEX IF NOT EXISTS idx_prediction_history_outcome ON public.prediction_history (outcome_date) WHERE outcome_date IS NOT NULL`.execute(db)

  await db.schema
    .createIndex('idx_confidence_calibration_model').ifNotExists()
    .on('public.confidence_calibration')
    .columns(['model_name', 'model_version'])
    .execute()
  await db.schema
    .createIndex('idx_confidence_calibration_date').ifNotExists()
    .on('public.confidence_calibration')
    .column('calibration_date')
    .execute()

  // TREX indexes
  await sql`CREATE INDEX CONCURRENTLY idx_transfer_history_composite ON public.transfer_history (token_contract, from_address, timestamp DESC)`.execute(db)
  await sql`CREATE INDEX CONCURRENTLY idx_audit_log_composite ON public.audit_log (event_type, contract_address, event_timestamp DESC)`.execute(db)
  
  await db.schema
    .createIndex('idx_claims_composite').ifNotExists()
    .on('public.claims')
    .columns(['identity_address', 'topic', 'verified'])
    .execute()

  // Admin indexes
  await db.schema
    .createIndex('idx_onboarding_sessions_approved_by').ifNotExists()
    .on('public.onboarding_sessions')
    .column('approved_by')
    .execute()
  await db.schema
    .createIndex('idx_onboarding_sessions_rejected_by').ifNotExists()
    .on('public.onboarding_sessions')
    .column('rejected_by')
    .execute()
  await db.schema
    .createIndex('idx_onboarding_sessions_kyc_status').ifNotExists()
    .on('public.onboarding_sessions')
    .column('kyc_status')
    .execute()

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  await sql`CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql`.execute(db)

  await sql`CREATE OR REPLACE FUNCTION public.calculate_onboarding_progress(session_id UUID) RETURNS INTEGER AS $$ DECLARE completed_steps INTEGER := 0; total_steps INTEGER := 5; BEGIN SELECT (CASE WHEN start_completed THEN 1 ELSE 0 END) + (CASE WHEN kyc_completed THEN 1 ELSE 0 END) + (CASE WHEN identity_completed THEN 1 ELSE 0 END) + (CASE WHEN qualification_completed THEN 1 ELSE 0 END) + (CASE WHEN esign_completed THEN 1 ELSE 0 END) INTO completed_steps FROM public.onboarding_sessions WHERE id = session_id; RETURN (completed_steps::DECIMAL / total_steps * 100)::INTEGER; END; $$ LANGUAGE plpgsql`.execute(db)

  await sql`CREATE OR REPLACE FUNCTION public.update_onboarding_status() RETURNS TRIGGER AS $$ BEGIN NEW.progress := public.calculate_onboarding_progress(NEW.id); IF NOT NEW.start_completed THEN NEW.current_step := 'start'; ELSIF NOT NEW.kyc_completed THEN NEW.current_step := 'kyc'; ELSIF NOT NEW.identity_completed THEN NEW.current_step := 'identity'; ELSIF NOT NEW.qualification_completed THEN NEW.current_step := 'qualification'; ELSIF NOT NEW.esign_completed THEN NEW.current_step := 'esign'; ELSE NEW.current_step := 'complete'; NEW.status := 'completed'; NEW.completed_at := NOW(); END IF; NEW.last_activity_at := NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql`.execute(db)

  await sql`CREATE OR REPLACE FUNCTION public.reset_daily_limits() RETURNS VOID AS $$ BEGIN UPDATE public.transfer_limits SET used_today = 0, last_reset = NOW() WHERE last_reset < CURRENT_DATE; END; $$ LANGUAGE plpgsql`.execute(db)

  await sql`CREATE OR REPLACE FUNCTION public.is_identity_verified(user_addr VARCHAR(255)) RETURNS BOOLEAN AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM public.identities WHERE user_address = user_addr AND verified = TRUE AND verification_status = 'verified'); END; $$ LANGUAGE plpgsql`.execute(db)

  await sql`CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql`.execute(db)

  await sql`CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql`.execute(db)

  // ============================================================================
  // TRIGGERS
  // ============================================================================

  await sql`CREATE TRIGGER update_kyc_permissions_updated_at BEFORE UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`.execute(db)
  await sql`CREATE TRIGGER update_trading_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`.execute(db)
  await sql`CREATE TRIGGER update_trading_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`.execute(db)
  await sql`CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`.execute(db)
  await sql`CREATE TRIGGER update_marketplace_listings_updated_at BEFORE UPDATE ON public.marketplace_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`.execute(db)
  await sql`CREATE TRIGGER update_user_portfolios_updated_at BEFORE UPDATE ON public.user_portfolios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`.execute(db)
  await sql`CREATE TRIGGER update_users_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`.execute(db)
  await sql`CREATE TRIGGER update_onboarding_sessions_updated_at BEFORE UPDATE ON public.onboarding_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`.execute(db)
  await sql`CREATE TRIGGER update_kyc_documents_updated_at BEFORE UPDATE ON public.kyc_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`.execute(db)
  await sql`CREATE TRIGGER update_property_ownership_updated_at BEFORE UPDATE ON public.property_ownership FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`.execute(db)

  await sql`CREATE TRIGGER auto_update_onboarding_status BEFORE UPDATE ON public.onboarding_sessions FOR EACH ROW WHEN (OLD.start_completed IS DISTINCT FROM NEW.start_completed OR OLD.kyc_completed IS DISTINCT FROM NEW.kyc_completed OR OLD.identity_completed IS DISTINCT FROM NEW.identity_completed OR OLD.qualification_completed IS DISTINCT FROM NEW.qualification_completed OR OLD.esign_completed IS DISTINCT FROM NEW.esign_completed) EXECUTE FUNCTION public.update_onboarding_status()`.execute(db)

  await sql`CREATE TRIGGER update_tokens_updated_at BEFORE UPDATE ON public.tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`.execute(db)
  await sql`CREATE TRIGGER update_identities_updated_at BEFORE UPDATE ON public.identities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`.execute(db)

  // ============================================================================
  // VIEWS
  // ============================================================================

  await sql`CREATE OR REPLACE VIEW public.active_orders AS SELECT o.*, CASE WHEN o.expiry < EXTRACT(EPOCH FROM NOW())::BIGINT THEN TRUE ELSE FALSE END AS is_expired FROM public.orders o WHERE o.status = 'open' AND o.remaining > 0`.execute(db)

  await sql`CREATE OR REPLACE VIEW public.orderbook_depth AS SELECT property_id, side, price_per_share, SUM(remaining) AS total_quantity, COUNT(*) AS order_count FROM public.active_orders WHERE NOT is_expired GROUP BY property_id, side, price_per_share ORDER BY property_id, side, CASE WHEN side = 'buy' THEN -price_per_share ELSE price_per_share END`.execute(db)

  await sql`CREATE OR REPLACE VIEW public.settlement_stats AS SELECT DATE_TRUNC('day', s.created_at) AS date, COUNT(*) AS total_settlements, COUNT(*) FILTER (WHERE s.status = 'confirmed') AS successful, COUNT(*) FILTER (WHERE s.status = 'failed') AS failed, SUM(s.gas_used) AS total_gas_used, AVG(s.gas_used) AS avg_gas_used FROM public.settlements s GROUP BY DATE_TRUNC('day', s.created_at) ORDER BY date DESC`.execute(db)

  await sql`CREATE OR REPLACE VIEW public.active_properties AS SELECT p.*, COALESCE(SUM(pa.volume) FILTER (WHERE pa.date >= CURRENT_DATE - INTERVAL '7 days'), 0) AS weekly_volume, COALESCE(AVG(pa.price) FILTER (WHERE pa.date >= CURRENT_DATE - INTERVAL '7 days'), p.token_price) AS avg_price_7d, COALESCE(MAX(pa.investors_count) FILTER (WHERE pa.date >= CURRENT_DATE - INTERVAL '7 days'), 0) AS max_investors_7d FROM public.properties p LEFT JOIN public.property_analytics pa ON p.id = pa.property_id WHERE p.status = 'active' AND p.available_tokens > 0 GROUP BY p.id, p.contract_address, p.token_symbol, p.name, p.description, p.location, p.property_type, p.total_tokens, p.available_tokens, p.token_price, p.total_value, p.annual_yield, p.risk_level, p.features, p.images, p.funding_progress, p.minimum_investment, p.status, p.created_at, p.updated_at`.execute(db)

  await sql`CREATE OR REPLACE VIEW public.active_marketplace_listings AS SELECT ml.*, p.name, p.location, p.property_type, p.annual_yield, p.risk_level, p.images[1] as primary_image FROM public.marketplace_listings ml JOIN public.properties p ON ml.property_id = p.id WHERE ml.status = 'active' AND ml.expires_at > NOW() AND ml.available_quantity > 0`.execute(db)

  // ============================================================================
  // INITIAL DATA SEEDING
  // ============================================================================

  await sql`INSERT INTO public.claim_topics (topic_id, name, description, required) VALUES (1, 'KYC', 'Know Your Customer verification', TRUE), (2, 'AML', 'Anti-Money Laundering check', TRUE), (3, 'Accreditation', 'Investor accreditation status', TRUE), (7, 'Country', 'Country of residence', TRUE), (101, 'Age', 'Age verification (18+)', TRUE), (102, 'Tax', 'Tax residency status', FALSE), (103, 'Professional', 'Professional investor status', FALSE)`.execute(db)

  await sql`INSERT INTO public.trusted_issuers (issuer_address, name, description, claim_topics) VALUES ('kyc-provider', 'Primary KYC Provider', 'Main KYC verification service', ARRAY[1, 2, 7]), ('aml-provider', 'AML Compliance Provider', 'Anti-money laundering verification', ARRAY[2]), ('accreditation-provider', 'Accreditation Authority', 'Investor accreditation verification', ARRAY[3])`.execute(db)

  await sql`INSERT INTO public.model_metadata (model_name, version, model_type, is_active, deployed_at) VALUES ('market_growth_ensemble', 'v1.0.0', 'growth', true, NOW()), ('risk_assessment_model', 'v1.0.0', 'risk', true, NOW()), ('portfolio_health_scorer', 'v1.0.0', 'portfolio', true, NOW()), ('opportunity_ranker', 'v1.0.0', 'opportunity', true, NOW()) ON CONFLICT (model_name, version) DO NOTHING`.execute(db)

  // ============================================================================
  // PERMISSIONS
  // ============================================================================

  await sql`GRANT ALL ON SCHEMA public TO evm_fsq_user`.execute(db)
  await sql`GRANT SELECT ON public.active_properties TO evm_fsq_user`.execute(db)
  await sql`GRANT SELECT ON public.active_marketplace_listings TO evm_fsq_user`.execute(db)
  await sql`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO evm_fsq_user`.execute(db)
  await sql`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO evm_fsq_user`.execute(db)

  // ============================================================================
  // COMPLETION LOG
  // ============================================================================

  await sql`DO $$ 
  BEGIN RAISE NOTICE '============================================================'; 
  RAISE NOTICE 'FarSquare unified database schema created successfully'; 
  RAISE NOTICE 'Schemas: indexer, kyc, trading, properties, users, trex, insights'; 
  RAISE NOTICE 'Hypertables: chain_events, property_rents, property_analytics'; 
  RAISE NOTICE '============================================================'; 
  END $$`.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  //await db.schema.dropSchema('public').ifExists().cascade().execute()
}
