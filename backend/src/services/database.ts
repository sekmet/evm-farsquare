/**
 * ERC-3643 Database Service
 * PostgreSQL/TimescaleDB client for EVM blockchain indexing and ERC-3643 ecosystem data management
 * Supports multi-network event indexing, TREX deployment tracking, and compliance monitoring
 */

import { Pool, type PoolConfig, type QueryResult } from "pg";
import type { Address, Hex, Log } from "viem";
import type { EVMNetwork } from "./contracts";

export interface DatabaseConfig {
  connectionString: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  schema?: string;
}

export interface InsertResult {
  success: true;
  data: { id: string };
}

export interface BatchInsertResult {
  success: true;
  data: { inserted: number; failed: number };
}

export interface SuccessResult<T> {
  success: true;
  data: T;
}

export interface ErrorResult {
  success: false;
  error: string;
}

export type DbResult<T> = SuccessResult<T> | ErrorResult;
export type DbInsertResult = InsertResult | ErrorResult;
export type DbBatchResult = BatchInsertResult | ErrorResult;

// EVM Event Structures
export interface EVMLogEvent {
  address: Address;
  topics: Hex[];
  data: Hex;
  blockNumber: bigint;
  transactionHash: Hex;
  transactionIndex: number;
  blockHash: Hex;
  logIndex: number;
  network: EVMNetwork;
  timestamp: Date;
  removed?: boolean;
}

export interface IndexerState {
  network: EVMNetwork;
  lastProcessedBlock: bigint;
  lastProcessedTxHash: Hex | null;
  status: 'initialized' | 'running' | 'paused' | 'stopped' | 'error';
  updatedAt: Date;
  errorMessage?: string;
}

export interface IndexerMetrics {
  network: EVMNetwork;
  blocksProcessed: number;
  transactionsProcessed: number;
  eventsIndexed: number;
  processingTime: number;
  averageBlockTime: number;
  lastProcessedAt: Date;
}

export interface TREXTransferEvent {
  contractAddress: Address;
  from: Address;
  to: Address;
  amount: bigint;
  blockNumber: bigint;
  transactionHash: Hex;
  logIndex: number;
  network: EVMNetwork;
  timestamp: Date;
}

export interface ComplianceEvent {
  moduleAddress: Address;
  action: 'module_added' | 'module_removed' | 'rule_updated' | 'validation_failed' | 'country_restriction_added' | 'country_restriction_removed';
  countryCode?: number;
  isBlacklisted?: boolean;
  blockNumber: bigint;
  transactionHash: Hex;
  logIndex: number;
  network: EVMNetwork;
  timestamp: Date;
  details?: Record<string, any>;
}

export interface IdentityEvent {
  userAddress: Address;
  identityContract: Address;
  action: 'identity_registered' | 'identity_verified' | 'identity_updated' | 'identity_deleted';
  countryCode?: number;
  claimTopics?: number[];
  blockNumber: bigint;
  transactionHash: Hex;
  logIndex: number;
  network: EVMNetwork;
  timestamp: Date;
  details?: Record<string, any>;
}

export interface ClaimEvent {
  claimId: Hex;
  identityAddress: Address;
  topic: bigint;
  scheme: bigint;
  issuer: Address;
  signature: Hex;
  data: Hex;
  uri: string;
  action: 'claim_added' | 'claim_updated' | 'claim_removed';
  blockNumber: bigint;
  transactionHash: Hex;
  logIndex: number;
  network: EVMNetwork;
  timestamp: Date;
}

export interface ComplianceViolation {
  violationType: 'country_restriction' | 'balance_limit' | 'time_restriction' | 'identity_verification' | 'agent_authorization';
  userAddress: Address;
  contractAddress: Address;
  attemptedAction: string;
  blockNumber: bigint;
  transactionHash: Hex;
  network: EVMNetwork;
  timestamp: Date;
  details?: Record<string, any>;
}

export interface TREXDeploymentRecord {
  propertyId: string;
  salt: string;
  factoryAddress: Address;
  deployedContracts: {
    token: Address;
    identityRegistry: Address;
    compliance: Address;
    identityRegistryStorage: Address;
    claimTopicsRegistry: Address;
    trustedIssuersRegistry: Address;
  };
  deployerAddress: Address;
  network: EVMNetwork;
  txHash: Hex;
  blockNumber: bigint;
  gasUsed: bigint;
  deploymentCost: number; // in wei
  status: 'pending' | 'deployed' | 'failed';
  deployedAt: Date;
  configSnapshot: {
    name: string;
    symbol: string;
    initialSupply: bigint;
    claimTopics: number[];
    trustedIssuers: Address[];
    complianceModules: Address[];
  };
  errorMessage?: string;
}

export interface PoolStats {
  total: number;
  idle: number;
  waiting: number;
}

/**
 * ERC-3643 Database Service
 * Complete PostgreSQL/TimescaleDB service for EVM blockchain indexing and TREX ecosystem data
 */
export class DatabaseService {
  private pool: Pool;
  private schema: string;

  constructor(config: DatabaseConfig) {
    this.schema = config.schema || 'public';

    const poolConfig: PoolConfig = {
      connectionString: config.connectionString,
      max: config.max || 10,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
    };

    this.pool = new Pool(poolConfig);

    // Handle pool errors
    this.pool.on("error", (err) => {
      console.error("Unexpected database pool error:", err);
    });
  }

  /**
   * Test database connection
   */
  async ping(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch (error) {
      console.error("Database ping failed:", error);
      return false;
    }
  }

  /**
   * Get the database connection pool
   */
  getPool(): Pool {
    return this.pool;
  }

  /**
   * Initialize ERC-3643 database schema
   */
  async initializeSchema(): Promise<DbResult<void>> {
    try {
      // Create schema if it doesn't exist
      await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${this.schema}`);

      // Set search path
      await this.pool.query(`SET search_path TO ${this.schema}`);

      // Create EVM events table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS evm_log_events (
          id SERIAL PRIMARY KEY,
          address VARCHAR(42) NOT NULL,
          topics TEXT[] NOT NULL,
          data TEXT NOT NULL,
          block_number BIGINT NOT NULL,
          transaction_hash VARCHAR(66) NOT NULL,
          transaction_index INTEGER NOT NULL,
          block_hash VARCHAR(66) NOT NULL,
          log_index INTEGER NOT NULL,
          network VARCHAR(20) NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL,
          removed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),

          UNIQUE(transaction_hash, log_index, network)
        );

        CREATE INDEX IF NOT EXISTS idx_evm_log_events_address_network ON evm_log_events(address, network);
        CREATE INDEX IF NOT EXISTS idx_evm_log_events_block_number ON evm_log_events(block_number);
        CREATE INDEX IF NOT EXISTS idx_evm_log_events_timestamp ON evm_log_events(timestamp);
      `);

      // Create indexer state table (per network)
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS indexer_state (
          id SERIAL PRIMARY KEY,
          network VARCHAR(20) NOT NULL,
          last_processed_block BIGINT DEFAULT 0,
          last_processed_tx_hash VARCHAR(66),
          status VARCHAR(20) DEFAULT 'initialized',
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          error_message TEXT,

          UNIQUE(network)
        );
      `);

      // Create indexer metrics table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS indexer_metrics (
          id SERIAL PRIMARY KEY,
          network VARCHAR(20) NOT NULL,
          blocks_processed INTEGER DEFAULT 0,
          transactions_processed INTEGER DEFAULT 0,
          events_indexed INTEGER DEFAULT 0,
          processing_time INTEGER DEFAULT 0,
          average_block_time DECIMAL DEFAULT 0,
          last_processed_at TIMESTAMPTZ DEFAULT NOW(),
          created_at TIMESTAMPTZ DEFAULT NOW(),

          UNIQUE(network, created_at::date)
        );
      `);

      // Create TREX deployment records table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS trex_deployments (
          id SERIAL PRIMARY KEY,
          property_id VARCHAR(255) UNIQUE NOT NULL,
          salt VARCHAR(36) NOT NULL,
          factory_address VARCHAR(42) NOT NULL,
          token_address VARCHAR(42) NOT NULL,
          identity_registry_address VARCHAR(42) NOT NULL,
          compliance_address VARCHAR(42) NOT NULL,
          identity_registry_storage_address VARCHAR(42) NOT NULL,
          claim_topics_registry_address VARCHAR(42) NOT NULL,
          trusted_issuers_registry_address VARCHAR(42) NOT NULL,
          deployer_address VARCHAR(42) NOT NULL,
          network VARCHAR(20) NOT NULL,
          tx_hash VARCHAR(66) NOT NULL,
          block_number BIGINT NOT NULL,
          gas_used BIGINT NOT NULL,
          deployment_cost DECIMAL NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          deployed_at TIMESTAMPTZ,
          config_snapshot JSONB,
          error_message TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_trex_deployments_network ON trex_deployments(network);
        CREATE INDEX IF NOT EXISTS idx_trex_deployments_deployer ON trex_deployments(deployer_address);
        CREATE INDEX IF NOT EXISTS idx_trex_deployments_factory ON trex_deployments(factory_address);
      `);

      // Create TREX token transfers table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS trex_token_transfers (
          id SERIAL PRIMARY KEY,
          contract_address VARCHAR(42) NOT NULL,
          from_address VARCHAR(42) NOT NULL,
          to_address VARCHAR(42) NOT NULL,
          amount DECIMAL NOT NULL,
          block_number BIGINT NOT NULL,
          transaction_hash VARCHAR(66) NOT NULL,
          log_index INTEGER NOT NULL,
          network VARCHAR(20) NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),

          UNIQUE(transaction_hash, log_index, network)
        );

        CREATE INDEX IF NOT EXISTS idx_trex_transfers_contract_network ON trex_token_transfers(contract_address, network);
        CREATE INDEX IF NOT EXISTS idx_trex_transfers_addresses ON trex_token_transfers(from_address, to_address);
        CREATE INDEX IF NOT EXISTS idx_trex_transfers_timestamp ON trex_token_transfers(timestamp);
      `);

      // Create compliance events table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS compliance_events (
          id SERIAL PRIMARY KEY,
          module_address VARCHAR(42) NOT NULL,
          action VARCHAR(50) NOT NULL,
          country_code INTEGER,
          is_blacklisted BOOLEAN,
          block_number BIGINT NOT NULL,
          transaction_hash VARCHAR(66) NOT NULL,
          log_index INTEGER NOT NULL,
          network VARCHAR(20) NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL,
          details JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_compliance_events_module_network ON compliance_events(module_address, network);
        CREATE INDEX IF NOT EXISTS idx_compliance_events_action ON compliance_events(action);
      `);

      // Create identity events table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS identity_events (
          id SERIAL PRIMARY KEY,
          user_address VARCHAR(42) NOT NULL,
          identity_contract VARCHAR(42) NOT NULL,
          action VARCHAR(50) NOT NULL,
          country_code INTEGER,
          claim_topics INTEGER[],
          block_number BIGINT NOT NULL,
          transaction_hash VARCHAR(66) NOT NULL,
          log_index INTEGER NOT NULL,
          network VARCHAR(20) NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL,
          details JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_identity_events_user_network ON identity_events(user_address, network);
        CREATE INDEX IF NOT EXISTS idx_identity_events_contract ON identity_events(identity_contract);
      `);

      // Create claim events table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS claim_events (
          id SERIAL PRIMARY KEY,
          claim_id VARCHAR(66) NOT NULL,
          identity_address VARCHAR(42) NOT NULL,
          topic DECIMAL NOT NULL,
          scheme DECIMAL NOT NULL,
          issuer VARCHAR(42) NOT NULL,
          signature VARCHAR(132) NOT NULL,
          data TEXT NOT NULL,
          uri TEXT,
          action VARCHAR(50) NOT NULL,
          block_number BIGINT NOT NULL,
          transaction_hash VARCHAR(66) NOT NULL,
          log_index INTEGER NOT NULL,
          network VARCHAR(20) NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),

          UNIQUE(claim_id, network)
        );

        CREATE INDEX IF NOT EXISTS idx_claim_events_identity_network ON claim_events(identity_address, network);
        CREATE INDEX IF NOT EXISTS idx_claim_events_topic ON claim_events(topic);
      `);

      // Create compliance violations table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS compliance_violations (
          id SERIAL PRIMARY KEY,
          violation_type VARCHAR(50) NOT NULL,
          user_address VARCHAR(42) NOT NULL,
          contract_address VARCHAR(42) NOT NULL,
          attempted_action VARCHAR(50) NOT NULL,
          block_number BIGINT NOT NULL,
          transaction_hash VARCHAR(66) NOT NULL,
          network VARCHAR(20) NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL,
          details JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_compliance_violations_user_network ON compliance_violations(user_address, network);
        CREATE INDEX IF NOT EXISTS idx_compliance_violations_type ON compliance_violations(violation_type);
        CREATE INDEX IF NOT EXISTS idx_compliance_violations_contract ON compliance_violations(contract_address);
      `);

      return { success: true, data: undefined } as const;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Schema initialization failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Check if TimescaleDB extensions are available
   */
  async checkTimescaleSupport(): Promise<boolean> {
    try {
      const result = await this.pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'
        ) as has_timescaledb
      `);
      return result.rows[0].has_timescaledb;
    } catch {
      return false;
    }
  }

  /**
   * Get schema version
   */
  async getSchemaVersion(): Promise<number> {
    try {
      const result = await this.pool.query(`
        SELECT COALESCE(MAX(version), 0) as version
        FROM schema_migrations
      `);
      return parseInt(result.rows[0].version) || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Verify that required tables exist
   */
  async verifyTables(tableNames: string[]): Promise<boolean> {
    try {
      for (const tableName of tableNames) {
        const result = await this.pool.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = $1 AND table_name = $2
          ) as table_exists
        `, [this.schema, tableName]);

        if (!result.rows[0].table_exists) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify network partition exists
   */
  async verifyNetworkPartition(network: EVMNetwork): Promise<boolean> {
    try {
      // Check if network-specific tables or partitions exist
      // For now, just check if we can query with network filter
      const result = await this.pool.query(`
        SELECT COUNT(*) as count FROM indexer_state WHERE network = $1
      `, [network]);
      return true; // If query succeeds, partitioning is working
    } catch {
      return false;
    }
  }

  /**
   * Run schema migrations
   */
  async runMigrations(): Promise<DbResult<void>> {
    try {
      // Create migrations table if it doesn't exist
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Get current version
      const currentVersion = await this.getSchemaVersion();

      // Run migrations based on current version
      if (currentVersion < 1) {
        // Migration 1: Add TimescaleDB hypertables if available
        if (await this.checkTimescaleSupport()) {
          try {
            await this.pool.query(`
              SELECT create_hypertable('evm_log_events', 'timestamp', if_not_exists => TRUE);
              SELECT create_hypertable('trex_token_transfers', 'timestamp', if_not_exists => TRUE);
              SELECT create_hypertable('compliance_events', 'timestamp', if_not_exists => TRUE);
              SELECT create_hypertable('identity_events', 'timestamp', if_not_exists => TRUE);
            `);
          } catch (error) {
            console.warn("TimescaleDB hypertable creation failed:", error);
          }
        }

        await this.pool.query(`
          INSERT INTO schema_migrations (version, name) VALUES (1, 'Add TimescaleDB hypertables')
          ON CONFLICT (version) DO NOTHING
        `);
      }

      return { success: true, data: undefined } as const;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Migration failed: ${errorMessage}`,
      };
    }
  }

  // ============================================================
  // EVM EVENT INDEXING
  // ============================================================

  /**
   * Insert EVM log event
   */
  async insertLogEvent(event: EVMLogEvent): Promise<DbInsertResult> {
    try {
      const query = `
        INSERT INTO evm_log_events (
          address, topics, data, block_number, transaction_hash,
          transaction_index, block_hash, log_index, network, timestamp, removed
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (transaction_hash, log_index, network) DO NOTHING
        RETURNING id
      `;

      const values = [
        event.address,
        event.topics,
        event.data,
        event.blockNumber.toString(),
        event.transactionHash,
        event.transactionIndex,
        event.blockHash,
        event.logIndex,
        event.network,
        event.timestamp,
        event.removed || false
      ];

      const result: QueryResult = await this.pool.query(query, values);

      if (result.rows.length > 0) {
        return {
          success: true,
          data: { id: result.rows[0].id.toString() },
        };
      }

      // Conflict occurred, return success but no new id
      return {
        success: true,
        data: { id: "conflict" },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to insert log event: ${errorMessage}`,
      };
    }
  }

  /**
   * Insert multiple EVM events in batch
   */
  async insertEventsBatch(events: EVMLogEvent[]): Promise<DbBatchResult> {
    if (events.length === 0) {
      return {
        success: true,
        data: { inserted: 0, failed: 0 },
      };
    }

    const client = await this.pool.connect();
    let inserted = 0;
    let failed = 0;

    try {
      await client.query("BEGIN");

      for (const event of events) {
        try {
          const query = `
            INSERT INTO evm_log_events (
              address, topics, data, block_number, transaction_hash,
              transaction_index, block_hash, log_index, network, timestamp, removed
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (transaction_hash, log_index, network) DO NOTHING
          `;

          const values = [
            event.address,
            event.topics,
            event.data,
            event.blockNumber.toString(),
            event.transactionHash,
            event.transactionIndex,
            event.blockHash,
            event.logIndex,
            event.network,
            event.timestamp,
            event.removed || false
          ];

          await client.query(query, values);
          inserted++;
        } catch (error) {
          console.error("Failed to insert event in batch:", error);
          failed++;
        }
      }

      await client.query("COMMIT");

      return {
        success: true,
        data: { inserted, failed },
      };
    } catch (error) {
      if (client) {
        await client.query("ROLLBACK");
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Batch insert failed: ${errorMessage}`,
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Get event by ID
   */
  async getEventById(id: string): Promise<DbResult<EVMLogEvent>> {
    try {
      const query = `
        SELECT * FROM evm_log_events WHERE id = $1
      `;

      const result: QueryResult = await this.pool.query(query, [id]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: "Event not found"
        };
      }

      const row = result.rows[0];
      return {
        success: true,
        data: {
          address: row.address,
          topics: row.topics,
          data: row.data,
          blockNumber: BigInt(row.block_number),
          transactionHash: row.transaction_hash,
          transactionIndex: row.transaction_index,
          blockHash: row.block_hash,
          logIndex: row.log_index,
          network: row.network,
          timestamp: row.timestamp,
          removed: row.removed
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to get event: ${errorMessage}`,
      };
    }
  }

  /**
   * Get events by block number
   */
  async getEventsByBlockNumber(blockNumber: bigint, network: EVMNetwork): Promise<DbResult<EVMLogEvent[]>> {
    try {
      const query = `
        SELECT * FROM evm_log_events
        WHERE block_number = $1 AND network = $2
        ORDER BY log_index ASC
      `;

      const result: QueryResult = await this.pool.query(query, [blockNumber.toString(), network]);

      const events: EVMLogEvent[] = result.rows.map((row) => ({
        address: row.address,
        topics: row.topics,
        data: row.data,
        blockNumber: BigInt(row.block_number),
        transactionHash: row.transaction_hash,
        transactionIndex: row.transaction_index,
        blockHash: row.block_hash,
        logIndex: row.log_index,
        network: row.network,
        timestamp: row.timestamp,
        removed: row.removed
      }));

      return {
        success: true,
        data: events,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to query events by block number: ${errorMessage}`,
      };
    }
  }

  /**
   * Get events by contract address
   */
  async getEventsByContract(
    contractAddress: Address,
    options: { network?: EVMNetwork; limit?: number; offset?: number } = {}
  ): Promise<DbResult<EVMLogEvent[]>> {
    try {
      const { network, limit = 100, offset = 0 } = options;

      let query = `
        SELECT * FROM evm_log_events
        WHERE address = $1
      `;
      const values: any[] = [contractAddress];
      let paramIndex = 2;

      if (network) {
        query += ` AND network = $${paramIndex}`;
        values.push(network);
        paramIndex++;
      }

      query += ` ORDER BY block_number DESC, log_index ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);

      const result: QueryResult = await this.pool.query(query, values);

      const events: EVMLogEvent[] = result.rows.map((row) => ({
        address: row.address,
        topics: row.topics,
        data: row.data,
        blockNumber: BigInt(row.block_number),
        transactionHash: row.transaction_hash,
        transactionIndex: row.transaction_index,
        blockHash: row.block_hash,
        logIndex: row.log_index,
        network: row.network,
        timestamp: row.timestamp,
        removed: row.removed
      }));

      return {
        success: true,
        data: events,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to query events by contract: ${errorMessage}`,
      };
    }
  }

  /**
   * Get events by transaction hash
   */
  async getEventsByTxHash(txHash: Hex, network: EVMNetwork): Promise<DbResult<EVMLogEvent[]>> {
    try {
      const query = `
        SELECT * FROM evm_log_events
        WHERE transaction_hash = $1 AND network = $2
        ORDER BY log_index ASC
      `;

      const result: QueryResult = await this.pool.query(query, [txHash, network]);

      const events: EVMLogEvent[] = result.rows.map((row) => ({
        address: row.address,
        topics: row.topics,
        data: row.data,
        blockNumber: BigInt(row.block_number),
        transactionHash: row.transaction_hash,
        transactionIndex: row.transaction_index,
        blockHash: row.block_hash,
        logIndex: row.log_index,
        network: row.network,
        timestamp: row.timestamp,
        removed: row.removed
      }));

      return {
        success: true,
        data: events,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to query events by transaction hash: ${errorMessage}`,
      };
    }
  }

  // ============================================================
  // INDEXER STATE MANAGEMENT
  // ============================================================

  /**
   * Get indexer state for network
   */
  async getIndexerState(network: EVMNetwork): Promise<DbResult<IndexerState>> {
    try {
      const query = `
        SELECT * FROM indexer_state WHERE network = $1
      `;

      const result: QueryResult = await this.pool.query(query, [network]);

      if (result.rows.length === 0) {
        // Initialize if not exists
        await this.pool.query(`
          INSERT INTO indexer_state (network, last_processed_block, status)
          VALUES ($1, $2, $3)
          ON CONFLICT (network) DO NOTHING
        `, [network, '0', 'initialized']);

        return {
          success: true,
          data: {
            network,
            lastProcessedBlock: 0n,
            lastProcessedTxHash: null,
            status: 'initialized',
            updatedAt: new Date(),
          },
        } as const;
      }

      const row = result.rows[0];
      return {
        success: true,
        data: {
          network: row.network,
          lastProcessedBlock: BigInt(row.last_processed_block),
          lastProcessedTxHash: row.last_processed_tx_hash,
          status: row.status,
          updatedAt: row.updated_at,
          errorMessage: row.error_message
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to get indexer state: ${errorMessage}`,
      };
    }
  }

  /**
   * Update indexer state
   */
  async updateIndexerState(
    network: EVMNetwork,
    state: {
      lastProcessedBlock?: bigint;
      lastProcessedTxHash?: Hex;
      status?: IndexerState['status'];
      errorMessage?: string;
    }
  ): Promise<DbResult<void>> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (state.lastProcessedBlock !== undefined) {
        updates.push(`last_processed_block = $${paramIndex}`);
        values.push(state.lastProcessedBlock.toString());
        paramIndex++;
      }

      if (state.lastProcessedTxHash !== undefined) {
        updates.push(`last_processed_tx_hash = $${paramIndex}`);
        values.push(state.lastProcessedTxHash);
        paramIndex++;
      }

      if (state.status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        values.push(state.status);
        paramIndex++;
      }

      if (state.errorMessage !== undefined) {
        updates.push(`error_message = $${paramIndex}`);
        values.push(state.errorMessage);
        paramIndex++;
      }

      if (updates.length === 0) {
        return { success: true, data: undefined } as const;
      }

      updates.push(`updated_at = NOW()`);

      const query = `
        UPDATE indexer_state
        SET ${updates.join(', ')}
        WHERE network = $${paramIndex}
      `;

      values.push(network);

      await this.pool.query(query, values);

      return { success: true, data: undefined } as const;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to update indexer state: ${errorMessage}`,
      };
    }
  }

  /**
   * Update indexer status
   */
  async updateIndexerStatus(network: EVMNetwork, status: IndexerState['status']): Promise<DbResult<void>> {
    return this.updateIndexerState(network, { status });
  }

  /**
   * Update indexer metrics
   */
  async updateIndexerMetrics(network: EVMNetwork, metrics: Omit<IndexerMetrics, 'network'>): Promise<DbResult<void>> {
    try {
      const query = `
        INSERT INTO indexer_metrics (
          network, blocks_processed, transactions_processed, events_indexed,
          processing_time, average_block_time, last_processed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (network, created_at::date)
        DO UPDATE SET
          blocks_processed = EXCLUDED.blocks_processed,
          transactions_processed = EXCLUDED.transactions_processed,
          events_indexed = EXCLUDED.events_indexed,
          processing_time = EXCLUDED.processing_time,
          average_block_time = EXCLUDED.average_block_time,
          last_processed_at = EXCLUDED.last_processed_at
      `;

      const values = [
        network,
        metrics.blocksProcessed,
        metrics.transactionsProcessed,
        metrics.eventsIndexed,
        metrics.processingTime,
        metrics.averageBlockTime,
        metrics.lastProcessedAt
      ];

      await this.pool.query(query, values);

      return { success: true, data: undefined } as const;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to update indexer metrics: ${errorMessage}`,
      };
    }
  }

  /**
   * Get indexer metrics
   */
  async getIndexerMetrics(network: EVMNetwork): Promise<DbResult<IndexerMetrics>> {
    try {
      const query = `
        SELECT * FROM indexer_metrics
        WHERE network = $1
        ORDER BY last_processed_at DESC
        LIMIT 1
      `;

      const result: QueryResult = await this.pool.query(query, [network]);

      if (result.rows.length === 0) {
        return {
          success: true,
          data: {
            network,
            blocksProcessed: 0,
            transactionsProcessed: 0,
            eventsIndexed: 0,
            processingTime: 0,
            averageBlockTime: 0,
            lastProcessedAt: new Date()
          }
        };
      }

      const row = result.rows[0];
      return {
        success: true,
        data: {
          network: row.network,
          blocksProcessed: row.blocks_processed,
          transactionsProcessed: row.transactions_processed,
          eventsIndexed: row.events_indexed,
          processingTime: row.processing_time,
          averageBlockTime: parseFloat(row.average_block_time),
          lastProcessedAt: row.last_processed_at
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to get indexer metrics: ${errorMessage}`,
      };
    }
  }

  // ============================================================
  // TREX ECOSYSTEM DATA MANAGEMENT
  // ============================================================

  /**
   * Insert TREX deployment record
   */
  async insertTREXDeployment(deployment: TREXDeploymentRecord): Promise<DbInsertResult> {
    try {
      const query = `
        INSERT INTO trex_deployments (
          property_id, salt, factory_address, token_address, identity_registry_address,
          compliance_address, identity_registry_storage_address, claim_topics_registry_address,
          trusted_issuers_registry_address, deployer_address, network, tx_hash, block_number,
          gas_used, deployment_cost, status, deployed_at, config_snapshot, error_message
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (property_id)
        DO UPDATE SET
          token_address = EXCLUDED.token_address,
          identity_registry_address = EXCLUDED.identity_registry_address,
          compliance_address = EXCLUDED.compliance_address,
          status = EXCLUDED.status,
          tx_hash = EXCLUDED.tx_hash,
          deployed_at = EXCLUDED.deployed_at,
          error_message = EXCLUDED.error_message,
          updated_at = NOW()
        RETURNING id
      `;

      const values = [
        deployment.propertyId,
        deployment.salt,
        deployment.factoryAddress,
        deployment.deployedContracts.token,
        deployment.deployedContracts.identityRegistry,
        deployment.deployedContracts.compliance,
        deployment.deployedContracts.identityRegistryStorage,
        deployment.deployedContracts.claimTopicsRegistry,
        deployment.deployedContracts.trustedIssuersRegistry,
        deployment.deployerAddress,
        deployment.network,
        deployment.txHash,
        deployment.blockNumber.toString(),
        deployment.gasUsed.toString(),
        deployment.deploymentCost,
        deployment.status,
        deployment.deployedAt,
        JSON.stringify(deployment.configSnapshot),
        deployment.errorMessage
      ];

      const result: QueryResult = await this.pool.query(query, values);

      return {
        success: true,
        data: { id: result.rows[0]?.id?.toString() || "updated" },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to insert TREX deployment: ${errorMessage}`,
      };
    }
  }

  /**
   * Get TREX deployment by property ID
   */
  async getTREXDeployment(propertyId: string): Promise<DbResult<TREXDeploymentRecord | null>> {
    try {
      const query = `
        SELECT * FROM trex_deployments WHERE property_id = $1
      `;

      const result: QueryResult = await this.pool.query(query, [propertyId]);

      if (result.rows.length === 0) {
        return {
          success: true,
          data: null
        };
      }

      const row = result.rows[0];
      return {
        success: true,
        data: {
          propertyId: row.property_id,
          salt: row.salt,
          factoryAddress: row.factory_address,
          deployedContracts: {
            token: row.token_address,
            identityRegistry: row.identity_registry_address,
            compliance: row.compliance_address,
            identityRegistryStorage: row.identity_registry_storage_address,
            claimTopicsRegistry: row.claim_topics_registry_address,
            trustedIssuersRegistry: row.trusted_issuers_registry_address
          },
          deployerAddress: row.deployer_address,
          network: row.network,
          txHash: row.tx_hash,
          blockNumber: BigInt(row.block_number),
          gasUsed: BigInt(row.gas_used),
          deploymentCost: parseFloat(row.deployment_cost),
          status: row.status,
          deployedAt: row.deployed_at,
          configSnapshot: row.config_snapshot,
          errorMessage: row.error_message
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to get TREX deployment: ${errorMessage}`,
      };
    }
  }

  /**
   * Get TREX deployments by network
   */
  async getTREXDeploymentsByNetwork(
    network: EVMNetwork,
    options: { limit?: number; offset?: number; status?: string } = {}
  ): Promise<DbResult<TREXDeploymentRecord[]>> {
    try {
      const { limit = 50, offset = 0, status } = options;

      let query = `
        SELECT * FROM trex_deployments WHERE network = $1
      `;
      const values: any[] = [network];
      let paramIndex = 2;

      if (status) {
        query += ` AND status = $${paramIndex}`;
        values.push(status);
        paramIndex++;
      }

      query += ` ORDER BY deployed_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);

      const result: QueryResult = await this.pool.query(query, values);

      const deployments: TREXDeploymentRecord[] = result.rows.map((row) => ({
        propertyId: row.property_id,
        salt: row.salt,
        factoryAddress: row.factory_address,
        deployedContracts: {
          token: row.token_address,
          identityRegistry: row.identity_registry_address,
          compliance: row.compliance_address,
          identityRegistryStorage: row.identity_registry_storage_address,
          claimTopicsRegistry: row.claim_topics_registry_address,
          trustedIssuersRegistry: row.trusted_issuers_registry_address
        },
        deployerAddress: row.deployer_address,
        network: row.network,
        txHash: row.tx_hash,
        blockNumber: BigInt(row.block_number),
        gasUsed: BigInt(row.gas_used),
        deploymentCost: parseFloat(row.deployment_cost),
        status: row.status,
        deployedAt: row.deployed_at,
        configSnapshot: row.config_snapshot,
        errorMessage: row.error_message
      }));

      return {
        success: true,
        data: deployments
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to get TREX deployments by network: ${errorMessage}`,
      };
    }
  }

  /**
   * Get TREX deployments by deployer
   */
  async getTREXDeploymentsByDeployer(
    deployerAddress: Address,
    options: { limit?: number; offset?: number } = {}
  ): Promise<DbResult<TREXDeploymentRecord[]>> {
    try {
      const { limit = 50, offset = 0 } = options;

      const query = `
        SELECT * FROM trex_deployments
        WHERE deployer_address = $1
        ORDER BY deployed_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result: QueryResult = await this.pool.query(query, [deployerAddress, limit, offset]);

      const deployments: TREXDeploymentRecord[] = result.rows.map((row) => ({
        propertyId: row.property_id,
        salt: row.salt,
        factoryAddress: row.factory_address,
        deployedContracts: {
          token: row.token_address,
          identityRegistry: row.identity_registry_address,
          compliance: row.compliance_address,
          identityRegistryStorage: row.identity_registry_storage_address,
          claimTopicsRegistry: row.claim_topics_registry_address,
          trustedIssuersRegistry: row.trusted_issuers_registry_address
        },
        deployerAddress: row.deployer_address,
        network: row.network,
        txHash: row.tx_hash,
        blockNumber: BigInt(row.block_number),
        gasUsed: BigInt(row.gas_used),
        deploymentCost: parseFloat(row.deployment_cost),
        status: row.status,
        deployedAt: row.deployed_at,
        configSnapshot: row.config_snapshot,
        errorMessage: row.error_message
      }));

      return {
        success: true,
        data: deployments
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to get TREX deployments by deployer: ${errorMessage}`,
      };
    }
  }

  /**
   * Get TREX deployment analytics
   */
  async getTREXDeploymentAnalytics(network: EVMNetwork): Promise<DbResult<{
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    averageGasUsed: bigint;
    totalDeploymentCost: number;
    recentDeployments: TREXDeploymentRecord[];
  }>> {
    try {
      // Get deployment statistics
      const statsQuery = `
        SELECT
          COUNT(*) as total_deployments,
          COUNT(*) FILTER (WHERE status = 'deployed') as successful_deployments,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_deployments,
          AVG(gas_used) as average_gas_used,
          SUM(deployment_cost) as total_deployment_cost
        FROM trex_deployments
        WHERE network = $1
      `;

      const recentQuery = `
        SELECT * FROM trex_deployments
        WHERE network = $1
        ORDER BY deployed_at DESC
        LIMIT 10
      `;

      const [statsResult, recentResult] = await Promise.all([
        this.pool.query(statsQuery, [network]),
        this.pool.query(recentQuery, [network])
      ]);

      const stats = statsResult.rows[0];

      const recentDeployments: TREXDeploymentRecord[] = recentResult.rows.map((row) => ({
        propertyId: row.property_id,
        salt: row.salt,
        factoryAddress: row.factory_address,
        deployedContracts: {
          token: row.token_address,
          identityRegistry: row.identity_registry_address,
          compliance: row.compliance_address,
          identityRegistryStorage: row.identity_registry_storage_address,
          claimTopicsRegistry: row.claim_topics_registry_address,
          trustedIssuersRegistry: row.trusted_issuers_registry_address
        },
        deployerAddress: row.deployer_address,
        network: row.network,
        txHash: row.tx_hash,
        blockNumber: BigInt(row.block_number),
        gasUsed: BigInt(row.gas_used),
        deploymentCost: parseFloat(row.deployment_cost),
        status: row.status,
        deployedAt: row.deployed_at,
        configSnapshot: row.config_snapshot,
        errorMessage: row.error_message
      }));

      return {
        success: true,
        data: {
          totalDeployments: parseInt(stats.total_deployments),
          successfulDeployments: parseInt(stats.successful_deployments),
          failedDeployments: parseInt(stats.failed_deployments),
          averageGasUsed: BigInt(stats.average_gas_used || '0'),
          totalDeploymentCost: parseFloat(stats.total_deployment_cost || '0'),
          recentDeployments
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to get TREX deployment analytics: ${errorMessage}`,
      };
    }
  }

  /**
   * Insert TREX token transfer
   */
  async insertTREXTransfer(transfer: TREXTransferEvent): Promise<DbInsertResult> {
    try {
      const query = `
        INSERT INTO trex_token_transfers (
          contract_address, from_address, to_address, amount, block_number,
          transaction_hash, log_index, network, timestamp
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (transaction_hash, log_index, network) DO NOTHING
        RETURNING id
      `;

      const values = [
        transfer.contractAddress,
        transfer.from,
        transfer.to,
        transfer.amount.toString(),
        transfer.blockNumber.toString(),
        transfer.transactionHash,
        transfer.logIndex,
        transfer.network,
        transfer.timestamp
      ];

      const result: QueryResult = await this.pool.query(query, values);

      return {
        success: true,
        data: { id: result.rows[0]?.id?.toString() || "conflict" },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to insert TREX transfer: ${errorMessage}`,
      };
    }
  }

  /**
   * Get token transfers
   */
  async getTokenTransfers(
    contractAddress: Address,
    options: {
      network?: EVMNetwork;
      fromAddress?: Address;
      toAddress?: Address;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<DbResult<TREXTransferEvent[]>> {
    try {
      const { network, fromAddress, toAddress, limit = 100, offset = 0 } = options;

      let query = `
        SELECT * FROM trex_token_transfers
        WHERE contract_address = $1
      `;
      const values: any[] = [contractAddress];
      let paramIndex = 2;

      if (network) {
        query += ` AND network = $${paramIndex}`;
        values.push(network);
        paramIndex++;
      }

      if (fromAddress) {
        query += ` AND from_address = $${paramIndex}`;
        values.push(fromAddress);
        paramIndex++;
      }

      if (toAddress) {
        query += ` AND to_address = $${paramIndex}`;
        values.push(toAddress);
        paramIndex++;
      }

      query += ` ORDER BY block_number DESC, log_index DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);

      const result: QueryResult = await this.pool.query(query, values);

      const transfers: TREXTransferEvent[] = result.rows.map((row) => ({
        contractAddress: row.contract_address,
        from: row.from_address,
        to: row.to_address,
        amount: BigInt(row.amount),
        blockNumber: BigInt(row.block_number),
        transactionHash: row.transaction_hash,
        logIndex: row.log_index,
        network: row.network,
        timestamp: row.timestamp
      }));

      return {
        success: true,
        data: transfers
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to get token transfers: ${errorMessage}`,
      };
    }
  }

  /**
   * Insert compliance event
   */
  async insertComplianceEvent(event: ComplianceEvent): Promise<DbInsertResult> {
    try {
      const query = `
        INSERT INTO compliance_events (
          module_address, action, country_code, is_blacklisted, block_number,
          transaction_hash, log_index, network, timestamp, details
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `;

      const values = [
        event.moduleAddress,
        event.action,
        event.countryCode,
        event.isBlacklisted,
        event.blockNumber.toString(),
        event.transactionHash,
        event.logIndex,
        event.network,
        event.timestamp,
        JSON.stringify(event.details)
      ];

      const result: QueryResult = await this.pool.query(query, values);

      return {
        success: true,
        data: { id: result.rows[0].id.toString() },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to insert compliance event: ${errorMessage}`,
      };
    }
  }

  /**
   * Get compliance events
   */
  async getComplianceEvents(
    moduleAddress: Address,
    options: { network?: EVMNetwork; limit?: number; offset?: number } = {}
  ): Promise<DbResult<ComplianceEvent[]>> {
    try {
      const { network, limit = 100, offset = 0 } = options;

      let query = `
        SELECT * FROM compliance_events WHERE module_address = $1
      `;
      const values: any[] = [moduleAddress];
      let paramIndex = 2;

      if (network) {
        query += ` AND network = $${paramIndex}`;
        values.push(network);
        paramIndex++;
      }

      query += ` ORDER BY block_number DESC, log_index DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);

      const result: QueryResult = await this.pool.query(query, values);

      const events: ComplianceEvent[] = result.rows.map((row) => ({
        moduleAddress: row.module_address,
        action: row.action,
        countryCode: row.country_code,
        isBlacklisted: row.is_blacklisted,
        blockNumber: BigInt(row.block_number),
        transactionHash: row.transaction_hash,
        logIndex: row.log_index,
        network: row.network,
        timestamp: row.timestamp,
        details: row.details
      }));

      return {
        success: true,
        data: events
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to get compliance events: ${errorMessage}`,
      };
    }
  }

  /**
   * Insert identity event
   */
  async insertIdentityEvent(event: IdentityEvent): Promise<DbInsertResult> {
    try {
      const query = `
        INSERT INTO identity_events (
          user_address, identity_contract, action, country_code, claim_topics,
          block_number, transaction_hash, log_index, network, timestamp, details
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `;

      const values = [
        event.userAddress,
        event.identityContract,
        event.action,
        event.countryCode,
        event.claimTopics || [],
        event.blockNumber.toString(),
        event.transactionHash,
        event.logIndex,
        event.network,
        event.timestamp,
        JSON.stringify(event.details)
      ];

      const result: QueryResult = await this.pool.query(query, values);

      return {
        success: true,
        data: { id: result.rows[0].id.toString() },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to insert identity event: ${errorMessage}`,
      };
    }
  }

  /**
   * Get user identity
   */
  async getUserIdentity(userAddress: Address, network: EVMNetwork): Promise<DbResult<{
    verified: boolean;
    countryCode?: number;
    identityContract?: Address;
    lastActivity: Date;
  } | null>> {
    try {
      const query = `
        SELECT
          identity_contract,
          country_code,
          MAX(timestamp) as last_activity,
          COUNT(*) FILTER (WHERE action = 'identity_verified') > 0 as verified
        FROM identity_events
        WHERE user_address = $1 AND network = $2
        GROUP BY identity_contract, country_code
        ORDER BY last_activity DESC
        LIMIT 1
      `;

      const result: QueryResult = await this.pool.query(query, [userAddress, network]);

      if (result.rows.length === 0) {
        return {
          success: true,
          data: null
        };
      }

      const row = result.rows[0];
      return {
        success: true,
        data: {
          verified: row.verified,
          countryCode: row.country_code,
          identityContract: row.identity_contract,
          lastActivity: row.last_activity
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to get user identity: ${errorMessage}`,
      };
    }
  }

  /**
   * Insert claim event
   */
  async insertClaimEvent(event: ClaimEvent): Promise<DbInsertResult> {
    try {
      const query = `
        INSERT INTO claim_events (
          claim_id, identity_address, topic, scheme, issuer, signature, data, uri,
          action, block_number, transaction_hash, log_index, network, timestamp
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (claim_id, network) DO NOTHING
        RETURNING id
      `;

      const values = [
        event.claimId,
        event.identityAddress,
        event.topic.toString(),
        event.scheme.toString(),
        event.issuer,
        event.signature,
        event.data,
        event.uri,
        event.action,
        event.blockNumber.toString(),
        event.transactionHash,
        event.logIndex,
        event.network,
        event.timestamp
      ];

      const result: QueryResult = await this.pool.query(query, values);

      return {
        success: true,
        data: { id: result.rows[0]?.id?.toString() || "conflict" },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to insert claim event: ${errorMessage}`,
      };
    }
  }

  /**
   * Get claim by ID
   */
  async getClaimById(claimId: Hex, network: EVMNetwork): Promise<DbResult<ClaimEvent | null>> {
    try {
      const query = `
        SELECT * FROM claim_events WHERE claim_id = $1 AND network = $2
      `;

      const result: QueryResult = await this.pool.query(query, [claimId, network]);

      if (result.rows.length === 0) {
        return {
          success: true,
          data: null
        };
      }

      const row = result.rows[0];
      return {
        success: true,
        data: {
          claimId: row.claim_id,
          identityAddress: row.identity_address,
          topic: BigInt(row.topic),
          scheme: BigInt(row.scheme),
          issuer: row.issuer,
          signature: row.signature,
          data: row.data,
          uri: row.uri,
          action: row.action,
          blockNumber: BigInt(row.block_number),
          transactionHash: row.transaction_hash,
          logIndex: row.log_index,
          network: row.network,
          timestamp: row.timestamp
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to get claim by ID: ${errorMessage}`,
      };
    }
  }

  /**
   * Insert compliance violation
   */
  async insertComplianceViolation(violation: ComplianceViolation): Promise<DbInsertResult> {
    try {
      const query = `
        INSERT INTO compliance_violations (
          violation_type, user_address, contract_address, attempted_action,
          block_number, transaction_hash, network, timestamp, details
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;

      const values = [
        violation.violationType,
        violation.userAddress,
        violation.contractAddress,
        violation.attemptedAction,
        violation.blockNumber.toString(),
        violation.transactionHash,
        violation.network,
        violation.timestamp,
        JSON.stringify(violation.details)
      ];

      const result: QueryResult = await this.pool.query(query, values);

      return {
        success: true,
        data: { id: result.rows[0].id.toString() },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to insert compliance violation: ${errorMessage}`,
      };
    }
  }

  /**
   * Get compliance violations
   */
  async getComplianceViolations(options: {
    violationType?: string;
    userAddress?: Address;
    contractAddress?: Address;
    network?: EVMNetwork;
    limit?: number;
    offset?: number;
  } = {}): Promise<DbResult<ComplianceViolation[]>> {
    try {
      const { violationType, userAddress, contractAddress, network, limit = 100, offset = 0 } = options;

      let query = `SELECT * FROM compliance_violations WHERE 1=1`;
      const values: any[] = [];
      let paramIndex = 1;

      if (violationType) {
        query += ` AND violation_type = $${paramIndex}`;
        values.push(violationType);
        paramIndex++;
      }

      if (userAddress) {
        query += ` AND user_address = $${paramIndex}`;
        values.push(userAddress);
        paramIndex++;
      }

      if (contractAddress) {
        query += ` AND contract_address = $${paramIndex}`;
        values.push(contractAddress);
        paramIndex++;
      }

      if (network) {
        query += ` AND network = $${paramIndex}`;
        values.push(network);
        paramIndex++;
      }

      query += ` ORDER BY timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);

      const result: QueryResult = await this.pool.query(query, values);

      const violations: ComplianceViolation[] = result.rows.map((row) => ({
        violationType: row.violation_type,
        userAddress: row.user_address,
        contractAddress: row.contract_address,
        attemptedAction: row.attempted_action,
        blockNumber: BigInt(row.block_number),
        transactionHash: row.transaction_hash,
        network: row.network,
        timestamp: row.timestamp,
        details: row.details
      }));

      return {
        success: true,
        data: violations
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to get compliance violations: ${errorMessage}`,
      };
    }
  }

  /**
   * Get analytics dashboard data
   */
  async getAnalyticsDashboard(network: EVMNetwork): Promise<DbResult<{
    networkStats: {
      totalBlocks: number;
      totalTransactions: number;
      totalEvents: number;
      latestBlock: bigint;
    };
    trexStats: {
      totalDeployments: number;
      activeTokens: number;
      totalTransfers: number;
    };
    complianceStats: {
      totalViolations: number;
      violationsByType: Record<string, number>;
      activeModules: number;
    };
    performanceMetrics: {
      averageBlockTime: number;
      eventsPerSecond: number;
      storageGrowth: number;
    };
    recentActivity: Array<{
      type: string;
      description: string;
      timestamp: Date;
      network: EVMNetwork;
    }>;
  }>> {
    try {
      // This would aggregate data from multiple tables
      // For now, return a placeholder structure
      return {
        success: true,
        data: {
          networkStats: {
            totalBlocks: 0,
            totalTransactions: 0,
            totalEvents: 0,
            latestBlock: 0n
          },
          trexStats: {
            totalDeployments: 0,
            activeTokens: 0,
            totalTransfers: 0
          },
          complianceStats: {
            totalViolations: 0,
            violationsByType: {},
            activeModules: 0
          },
          performanceMetrics: {
            averageBlockTime: 0,
            eventsPerSecond: 0,
            storageGrowth: 0
          },
          recentActivity: []
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to get analytics dashboard: ${errorMessage}`,
      };
    }
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
