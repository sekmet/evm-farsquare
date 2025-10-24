/**
 * TREX Database Service
 * PostgreSQL operations for TREX token ecosystem
 */

import type { Pool, QueryResult } from "pg";
import type { DbResult } from "./database";

export interface TrexToken {
  id: string;
  contractAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  circulatingSupply: bigint;
  identityRegistryContract: string | null;
  complianceContract: string | null;
  paused: boolean;
  ownerAddress: string;
  createdAt: Date;
  updatedAt: Date;
  deployedAt: Date | null;
  deployedTxHash: string | null;
}

export interface TrexSuite {
  salt: string;
  tokenId: string;
  identityRegistryContract: string;
  complianceContract: string;
  identityStorageContract: string;
  claimTopicsRegistryContract: string;
  trustedIssuersRegistryContract: string;
  deployedAt: Date;
  deployedBy: string;
  deployedTxHash: string | null;
  tokenName: string;
  tokenSymbol: string;
  initialSupply: bigint;
}

export interface TrexIdentity {
  userAddress: string;
  identityContract: string;
  countryCode: number;
  verified: boolean;
  registeredAt: Date;
  registeredBy: string | null;
  updatedAt: Date;
  verificationStatus: string;
  lastVerifiedAt: Date | null;
}

export interface TrexClaim {
  id: string;
  identityAddress: string;
  claimId: string;
  topic: number;
  scheme: number;
  issuerAddress: string;
  signature: string;
  data: string | null;
  uri: string | null;
  issuedAt: Date;
  expiresAt: Date | null;
  revoked: boolean;
  revokedAt: Date | null;
  verified: boolean;
  verifiedAt: Date | null;
}

export interface TrexAgent {
  tokenContract: string;
  agentAddress: string;
  role: string;
  active: boolean;
  grantedAt: Date;
  grantedBy: string | null;
  revokedAt: Date | null;
  canMint: boolean;
  canBurn: boolean;
  canFreeze: boolean;
  canTransfer: boolean;
  canRecover: boolean;
}

export interface TrexTransferHistory {
  id: string;
  tokenContract: string;
  fromAddress: string;
  toAddress: string;
  amount: bigint;
  txHash: string | null;
  blockHeight: bigint | null;
  timestamp: Date;
  modulesChecked: string[];
  compliancePassed: boolean;
  complianceReasons: string[];
}

/**
 * Service for TREX database operations
 */
export class TrexDatabaseService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // ============================================================
  // Token Operations
  // ============================================================

  /**
   * Insert a new TREX token
   */
  async insertToken(token: Omit<TrexToken, "id" | "createdAt" | "updatedAt">): Promise<DbResult<{ id: string }>> {
    try {
      const query = `
        INSERT INTO public.tokens (
          contract_address, name, symbol, decimals, total_supply, circulating_supply,
          identity_registry_contract, compliance_contract, paused, owner_address,
          deployed_at, deployed_tx_hash
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `;

      const values = [
        token.contractAddress,
        token.name,
        token.symbol,
        token.decimals,
        token.totalSupply.toString(),
        token.circulatingSupply.toString(),
        token.identityRegistryContract,
        token.complianceContract,
        token.paused,
        token.ownerAddress,
        token.deployedAt,
        token.deployedTxHash,
      ];

      const result: QueryResult = await this.pool.query(query, values);

      return {
        success: true,
        data: { id: result.rows[0].id },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to insert token: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Get token by contract address
   */
  async getTokenByAddress(contractAddress: string): Promise<DbResult<TrexToken>> {
    try {
      const query = `
        SELECT *
        FROM public.tokens
        WHERE contract_address = $1
      `;

      const result: QueryResult = await this.pool.query(query, [contractAddress]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: "Token not found",
        };
      }

      const row = result.rows[0];
      return {
        success: true,
        data: {
          id: row.id,
          contractAddress: row.contract_address,
          name: row.name,
          symbol: row.symbol,
          decimals: row.decimals,
          totalSupply: BigInt(row.total_supply),
          circulatingSupply: BigInt(row.circulating_supply),
          identityRegistryContract: row.identity_registry_contract,
          complianceContract: row.compliance_contract,
          paused: row.paused,
          ownerAddress: row.owner_address,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          deployedAt: row.deployed_at,
          deployedTxHash: row.deployed_tx_hash,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get token: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Update token supply
   */
  async updateTokenSupply(contractAddress: string, totalSupply: bigint, circulatingSupply: bigint): Promise<DbResult<void>> {
    try {
      const query = `
        UPDATE public.tokens
        SET total_supply = $1, circulating_supply = $2, updated_at = NOW()
        WHERE contract_address = $3
      `;

      await this.pool.query(query, [totalSupply.toString(), circulatingSupply.toString(), contractAddress]);

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update token supply: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  // ============================================================
  // Identity Operations
  // ============================================================

  /**
   * Insert or update identity
   */
  async upsertIdentity(identity: Omit<TrexIdentity, "registeredAt" | "updatedAt">): Promise<DbResult<void>> {
    try {
      const query = `
        INSERT INTO public.identities (
          user_address, identity_contract, country_code, verified,
          registered_by, verification_status, last_verified_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_address) DO UPDATE SET
          identity_contract = EXCLUDED.identity_contract,
          country_code = EXCLUDED.country_code,
          verified = EXCLUDED.verified,
          verification_status = EXCLUDED.verification_status,
          last_verified_at = EXCLUDED.last_verified_at,
          updated_at = NOW()
      `;

      const values = [
        identity.userAddress,
        identity.identityContract,
        identity.countryCode,
        identity.verified,
        identity.registeredBy,
        identity.verificationStatus,
        identity.lastVerifiedAt,
      ];

      await this.pool.query(query, values);

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: `Failed to upsert identity: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Get identity by user address
   */
  async getIdentityByAddress(userAddress: string): Promise<DbResult<TrexIdentity>> {
    try {
      const query = `
        SELECT *
        FROM public.identities
        WHERE user_address = $1
      `;

      const result: QueryResult = await this.pool.query(query, [userAddress]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: "Identity not found",
        };
      }

      const row = result.rows[0];
      return {
        success: true,
        data: {
          userAddress: row.user_address,
          identityContract: row.identity_contract,
          countryCode: row.country_code,
          verified: row.verified,
          registeredAt: row.registered_at,
          registeredBy: row.registered_by,
          updatedAt: row.updated_at,
          verificationStatus: row.verification_status,
          lastVerifiedAt: row.last_verified_at,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get identity: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  // ============================================================
  // Claim Operations
  // ============================================================

  /**
   * Insert a claim
   */
  async insertClaim(claim: Omit<TrexClaim, "id" | "issuedAt">): Promise<DbResult<{ id: string }>> {
    try {
      const query = `
        INSERT INTO public.claims (
          identity_address, claim_id, topic, scheme, issuer_address,
          signature, data, uri, expires_at, revoked, revoked_at,
          verified, verified_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
      `;

      const values = [
        claim.identityAddress,
        claim.claimId,
        claim.topic,
        claim.scheme,
        claim.issuerAddress,
        claim.signature,
        claim.data,
        claim.uri,
        claim.expiresAt,
        claim.revoked,
        claim.revokedAt,
        claim.verified,
        claim.verifiedAt,
      ];

      const result: QueryResult = await this.pool.query(query, values);

      return {
        success: true,
        data: { id: result.rows[0].id },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to insert claim: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Get claims by identity address
   */
  async getClaimsByIdentity(identityAddress: string): Promise<DbResult<TrexClaim[]>> {
    try {
      const query = `
        SELECT *
        FROM public.claims
        WHERE identity_address = $1
        ORDER BY issued_at DESC
      `;

      const result: QueryResult = await this.pool.query(query, [identityAddress]);

      const claims: TrexClaim[] = result.rows.map((row) => ({
        id: row.id,
        identityAddress: row.identity_address,
        claimId: row.claim_id,
        topic: row.topic,
        scheme: row.scheme,
        issuerAddress: row.issuer_address,
        signature: row.signature,
        data: row.data,
        uri: row.uri,
        issuedAt: row.issued_at,
        expiresAt: row.expires_at,
        revoked: row.revoked,
        revokedAt: row.revoked_at,
        verified: row.verified,
        verifiedAt: row.verified_at,
      }));

      return {
        success: true,
        data: claims,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get claims: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  // ============================================================
  // Agent Operations
  // ============================================================

  /**
   * Insert or update agent
   */
  async upsertAgent(agent: Omit<TrexAgent, "grantedAt" | "revokedAt">): Promise<DbResult<void>> {
    try {
      const query = `
        INSERT INTO public.agents (
          token_contract, agent_address, role, active, granted_by,
          can_mint, can_burn, can_freeze, can_transfer, can_recover
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (token_contract, agent_address, role) DO UPDATE SET
          active = EXCLUDED.active,
          can_mint = EXCLUDED.can_mint,
          can_burn = EXCLUDED.can_burn,
          can_freeze = EXCLUDED.can_freeze,
          can_transfer = EXCLUDED.can_transfer,
          can_recover = EXCLUDED.can_recover
      `;

      const values = [
        agent.tokenContract,
        agent.agentAddress,
        agent.role,
        agent.active,
        agent.grantedBy,
        agent.canMint,
        agent.canBurn,
        agent.canFreeze,
        agent.canTransfer,
        agent.canRecover,
      ];

      await this.pool.query(query, values);

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: `Failed to upsert agent: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Get agents by token contract
   */
  async getAgentsByToken(tokenContract: string): Promise<DbResult<TrexAgent[]>> {
    try {
      const query = `
        SELECT *
        FROM public.agents
        WHERE token_contract = $1 AND active = true
        ORDER BY granted_at DESC
      `;

      const result: QueryResult = await this.pool.query(query, [tokenContract]);

      const agents: TrexAgent[] = result.rows.map((row) => ({
        tokenContract: row.token_contract,
        agentAddress: row.agent_address,
        role: row.role,
        active: row.active,
        grantedAt: row.granted_at,
        grantedBy: row.granted_by,
        revokedAt: row.revoked_at,
        canMint: row.can_mint,
        canBurn: row.can_burn,
        canFreeze: row.can_freeze,
        canTransfer: row.can_transfer,
        canRecover: row.can_recover,
      }));

      return {
        success: true,
        data: agents,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get agents: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  // ============================================================
  // Transfer History Operations
  // ============================================================

  /**
   * Insert transfer history
   */
  async insertTransferHistory(transfer: Omit<TrexTransferHistory, "id" | "timestamp">): Promise<DbResult<{ id: string }>> {
    try {
      const query = `
        INSERT INTO public.transfer_history (
          token_contract, from_address, to_address, amount, tx_hash,
          block_height, modules_checked, compliance_passed, compliance_reasons
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;

      const values = [
        transfer.tokenContract,
        transfer.fromAddress,
        transfer.toAddress,
        transfer.amount.toString(),
        transfer.txHash,
        transfer.blockHeight?.toString(),
        transfer.modulesChecked,
        transfer.compliancePassed,
        transfer.complianceReasons,
      ];

      const result: QueryResult = await this.pool.query(query, values);

      return {
        success: true,
        data: { id: result.rows[0].id },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to insert transfer history: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Get transfer history by token
   */
  async getTransferHistoryByToken(tokenContract: string, limit: number = 100): Promise<DbResult<TrexTransferHistory[]>> {
    try {
      const query = `
        SELECT *
        FROM public.transfer_history
        WHERE token_contract = $1
        ORDER BY timestamp DESC
        LIMIT $2
      `;

      const result: QueryResult = await this.pool.query(query, [tokenContract, limit]);

      const transfers: TrexTransferHistory[] = result.rows.map((row) => ({
        id: row.id,
        tokenContract: row.token_contract,
        fromAddress: row.from_address,
        toAddress: row.to_address,
        amount: BigInt(row.amount),
        txHash: row.tx_hash,
        blockHeight: row.block_height ? BigInt(row.block_height) : null,
        timestamp: row.timestamp,
        modulesChecked: row.modules_checked,
        compliancePassed: row.compliance_passed,
        complianceReasons: row.compliance_reasons,
      }));

      return {
        success: true,
        data: transfers,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get transfer history: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  // ============================================================
  // Audit Log Operations
  // ============================================================

  /**
   * Insert audit log entry
   */
  async insertAuditLog(
    eventType: string,
    contractAddress: string | null,
    userAddress: string | null,
    eventData: any,
    metadata: any = {},
    blockHeight: bigint | null = null,
    txHash: string | null = null
  ): Promise<DbResult<{ id: string }>> {
    try {
      const query = `
        INSERT INTO public.audit_log (
          event_type, contract_address, user_address, event_data,
          metadata, block_height, tx_hash
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;

      const values = [
        eventType,
        contractAddress,
        userAddress,
        JSON.stringify(eventData),
        JSON.stringify(metadata),
        blockHeight?.toString(),
        txHash,
      ];

      const result: QueryResult = await this.pool.query(query, values);

      return {
        success: true,
        data: { id: result.rows[0].id },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to insert audit log: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }
}
