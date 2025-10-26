/**
 * Property Management Service
 * Handles property creation, updates, and ownership management
 * Integrated with ERC-3643 T-REX Token Factory for tokenization
 */

import type { Pool } from "pg";
import type { DbResult } from "./database";
import { PropertyTokenFactoryService, type PropertyTokenDeploymentRequest, type TokenDeploymentData } from "./property-token-factory-updated";
import { ERC3643ContractsService, type EVMNetwork } from "./contracts";
import type { Address, Hex } from "viem";
import { parseEther } from "viem";

export interface PropertyCreateData {
  contractAddress: string;
  tokenSymbol: string;
  name: string;
  description: string;
  location: string;
  propertyType: 'residential' | 'commercial' | 'industrial' | 'land';
  totalTokens: bigint;
  availableTokens: bigint;
  tokenPrice: string;
  totalValue: string;
  annualYield: string;
  riskLevel: 'low' | 'medium' | 'high';
  features: string[];
  images: string[];
  fundingProgress: number;
  minimumInvestment: string;
  ownerAddress: string;
  createdBy: string;
}

export interface PropertyUpdateData {
  name?: string;
  description?: string;
  tokenPrice?: string;
  annualYield?: string;
  features?: string[];
  images?: string[];
  status?: 'active' | 'funded' | 'cancelled' | 'archived';
}

export interface PropertyOwnership {
  userId: string;
  propertyId: string;
  ownershipType: 'owner' | 'co_owner' | 'manager';
  ownershipPercentage?: number;
  canEdit: boolean;
  canMintTokens: boolean;
  canManageDocuments: boolean;
  canCommunicateInvestors: boolean;
}

/**
 * Extended property creation data with optional token deployment
 */
export interface PropertyCreateWithTokenData extends PropertyCreateData {
  tokenData?: TokenDeploymentData;
  deployToken?: boolean;
  network?: EVMNetwork;
}

/**
 * Service for managing property operations
 */
export class PropertyManagementService {
  private pool: Pool;
  private tokenFactoryServices: Map<EVMNetwork, PropertyTokenFactoryService>;

  constructor(pool: Pool) {
    this.pool = pool;
    this.tokenFactoryServices = new Map();
  }

  /**
   * Get or create PropertyTokenFactoryService for network
   */
  private getTokenFactoryService(network: EVMNetwork): PropertyTokenFactoryService {
    if (!this.tokenFactoryServices.has(network)) {
      const rpcUrl = process.env[`${network.toUpperCase()}_RPC_URL`];
      const privateKey = process.env.WALLET_PRIVATE_KEY as Hex | undefined;
      
      if (!privateKey) {
        throw new Error('WALLET_PRIVATE_KEY not configured');
      }
      
      const service = PropertyTokenFactoryService.createForNetwork(network, rpcUrl, privateKey);
      this.tokenFactoryServices.set(network, service);
    }
    
    return this.tokenFactoryServices.get(network)!;
  }

  /**
   * Create a new property listing
   */
  async createProperty(data: PropertyCreateData): Promise<DbResult<{ id: string }>> {
    const client = await this.pool.connect();
    console.log({data})
    try {
      await client.query('BEGIN');

      // Insert property
      const propertyQuery = `
        INSERT INTO public.properties (
          contract_address, token_symbol, name, description, location,
          property_type, total_tokens, available_tokens, token_price,
          total_value, annual_yield, risk_level, features, images,
          funding_progress, minimum_investment, created_by, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'active')
        RETURNING id
      `;

      const propertyValues = [
        data.contractAddress || '0x0000000000000000000000000000000000000000',
        data.tokenSymbol || 'TFSQ',
        data.name || 'FarSquare Property Token',
        data.description || 'FarSquare Property Token',
        data.location,
        data.propertyType,
        data.totalTokens && data.totalTokens.toString() || '1',
        data.availableTokens && data.availableTokens.toString() || '1',
        data.tokenPrice || '1',
        data.totalValue,
        data.annualYield,
        data.riskLevel,
        data.features,
        data.images,
        data.fundingProgress,
        data.minimumInvestment,
        data.createdBy,
      ];

      const propertyResult = await client.query(propertyQuery, propertyValues);
      const propertyId = propertyResult.rows[0].id;

      // Get user ID from evm address
      const userQuery = `
        SELECT user_id FROM public.profiles WHERE evm_address = $1
      `;
      const userResult = await client.query(userQuery, [data.ownerAddress]);

      if (userResult.rows.length > 0) {
        // Create property ownership record
        const ownershipQuery = `
          INSERT INTO public.property_ownership (
            user_id, property_id, ownership_type, ownership_percentage,
            can_edit, can_mint_tokens, can_manage_documents, can_communicate_investors
          )
          VALUES ($1, $2, 'owner', 100, true, true, true, true)
        `;
        await client.query(ownershipQuery, [userResult.rows[0].user_id, propertyId]);
      }

      await client.query('COMMIT');

      return {
        success: true,
        data: { id: propertyId },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: `Failed to create property: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Create property with automatic T-REX token deployment
   */
  async createPropertyWithToken(
    data: PropertyCreateWithTokenData
  ): Promise<DbResult<{ id: string; tokenAddress?: Address; deployment?: any }>> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Step 1: Create property record
      const propertyQuery = `
        INSERT INTO public.properties (
          contract_address, token_symbol, name, description, location,
          property_type, total_tokens, available_tokens, token_price,
          total_value, annual_yield, risk_level, features, images,
          funding_progress, minimum_investment, created_by, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'active')
        RETURNING id
      `;

      const propertyValues = [
        '0x0000000000000000000000000000000000000000', // Placeholder, updated after token deployment
        data.tokenData?.symbol || data.tokenSymbol || 'PROP',
        data.name,
        data.description,
        data.location,
        data.propertyType,
        data.totalTokens?.toString() || '1000000',
        data.availableTokens?.toString() || '1000000',
        data.tokenPrice || '1',
        data.totalValue,
        data.annualYield,
        data.riskLevel,
        data.features,
        data.images,
        data.fundingProgress || 0,
        data.minimumInvestment,
        data.createdBy,
      ];

      const propertyResult = await client.query(propertyQuery, propertyValues);
      const propertyId = propertyResult.rows[0].id;

      // Step 2: Create ownership record
      const userQuery = `SELECT user_id FROM public.profiles WHERE evm_address = $1`;
      const userResult = await client.query(userQuery, [data.ownerAddress]);

      if (userResult.rows.length > 0) {
        const ownershipQuery = `
          INSERT INTO public.property_ownership (
            user_id, property_id, ownership_type, ownership_percentage,
            can_edit, can_mint_tokens, can_manage_documents, can_communicate_investors
          )
          VALUES ($1, $2, 'owner', 100, true, true, true, true)
        `;
        await client.query(ownershipQuery, [userResult.rows[0].user_id, propertyId]);
      }

      await client.query('COMMIT');

      // Step 3: Deploy token if requested
      if (data.deployToken && data.tokenData && data.network) {
        console.log(`[PropertyManagement] Deploying token for property ${propertyId}`);
        
        try {
          const tokenFactoryService = this.getTokenFactoryService(data.network);
          
          const tokenRequest: PropertyTokenDeploymentRequest = {
            propertyId,
            userId: data.createdBy,
            ownerAddress: data.ownerAddress as `0x${string}`,
            tokenData: {
              ...data.tokenData,
              propertyId,
            }
          };

          const deploymentResult = await tokenFactoryService.deployPropertyToken(tokenRequest);

          if (deploymentResult.success && deploymentResult.data) {
            // Update property with token address
            const updateQuery = `
              UPDATE public.properties
              SET contract_address = $1, token_symbol = $2, updated_at = NOW()
              WHERE id = $3
            `;
            await this.pool.query(updateQuery, [
              deploymentResult.data.tokenAddress,
              data.tokenData.symbol,
              propertyId
            ]);

            return {
              success: true,
              data: {
                id: propertyId,
                tokenAddress: deploymentResult.data.tokenAddress,
                deployment: deploymentResult.data
              }
            };
          } else {
            console.warn(`[PropertyManagement] Token deployment failed: ${deploymentResult.error}`);
            return {
              success: true,
              data: {
                id: propertyId,
                tokenAddress: undefined,
                deployment: { error: deploymentResult.error }
              }
            };
          }
        } catch (tokenError) {
          console.error(`[PropertyManagement] Token deployment error:`, tokenError);
          return {
            success: true,
            data: {
              id: propertyId,
              tokenAddress: undefined,
              deployment: { 
                error: tokenError instanceof Error ? tokenError.message : 'Unknown token deployment error' 
              }
            }
          };
        }
      }

      return {
        success: true,
        data: { id: propertyId },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: `Failed to create property: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Deploy T-REX token for existing property
   */
  async deployTokenForProperty(
    propertyId: string,
    userId: string,
    tokenData: TokenDeploymentData,
    ownerAddress: `0x${string}`,
    network: EVMNetwork
  ): Promise<DbResult<{ tokenAddress: Address; deployment: any }>> {
    try {
      // Check permission
      const permissionCheck = await this.checkPropertyPermission(propertyId, userId, 'mint');
      if (!permissionCheck.success || !permissionCheck.data) {
        return {
          success: false,
          error: "Unauthorized: You don't have permission to deploy token for this property"
        };
      }

      // Check if token already deployed
      const propertyQuery = `SELECT contract_address FROM public.properties WHERE id = $1`;
      const propertyResult = await this.pool.query(propertyQuery, [propertyId]);
      
      if (propertyResult.rows.length === 0) {
        return {
          success: false,
          error: "Property not found"
        };
      }

      const existingAddress = propertyResult.rows[0].contract_address;
      if (existingAddress && existingAddress !== '0x0000000000000000000000000000000000000000') {
        return {
          success: false,
          error: "Token already deployed for this property"
        };
      }

      // Deploy token
      console.log(`[PropertyManagement] Deploying token for existing property ${propertyId}`);
      
      const tokenFactoryService = this.getTokenFactoryService(network);
      
      const tokenRequest: PropertyTokenDeploymentRequest = {
        propertyId,
        userId,
        ownerAddress,
        tokenData: {
          ...tokenData,
          propertyId,
        }
      };

      const deploymentResult = await tokenFactoryService.deployPropertyToken(tokenRequest);

      if (!deploymentResult.success || !deploymentResult.data) {
        return {
          success: false,
          error: deploymentResult.error || 'Token deployment failed'
        };
      }

      // Update property with token address
      const updateQuery = `
        UPDATE public.properties
        SET contract_address = $1, token_symbol = $2, updated_at = NOW()
        WHERE id = $3
      `;
      await this.pool.query(updateQuery, [
        deploymentResult.data.tokenAddress,
        tokenData.symbol,
        propertyId
      ]);

      return {
        success: true,
        data: {
          tokenAddress: deploymentResult.data.tokenAddress,
          deployment: JSON.stringify(deploymentResult.data, null, 2)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to deploy token: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Mint property tokens to investors
   */
  async mintPropertyTokens(
    propertyId: string,
    userId: string,
    recipients: Array<{ address: `0x${string}`; amount: string }>
  ): Promise<DbResult<{ txHashes: string[]; totalMinted: bigint }>> {
    try {
      // Check permission
      const permissionCheck = await this.checkPropertyPermission(propertyId, userId, 'mint');
      if (!permissionCheck.success || !permissionCheck.data) {
        return {
          success: false,
          error: "Unauthorized: You don't have permission to mint tokens for this property"
        };
      }

      // Get property and token info
      const propertyQuery = `
        SELECT p.contract_address, pt.token_contract, t.name, t.symbol
        FROM public.properties p
        LEFT JOIN public.property_tokens pt ON p.id = pt.property_id
        LEFT JOIN public.tokens t ON pt.token_contract = t.contract_address
        WHERE p.id = $1
      `;
      const propertyResult = await this.pool.query(propertyQuery, [propertyId]);
      
      if (propertyResult.rows.length === 0) {
        return {
          success: false,
          error: "Property not found"
        };
      }

      const tokenAddress = propertyResult.rows[0].contract_address || propertyResult.rows[0].token_contract;
      if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
        return {
          success: false,
          error: "Token not deployed for this property"
        };
      }

      // TODO: Implement actual minting logic using ERC3643ContractsService
      // For now, return placeholder
      console.log(`[PropertyManagement] Would mint tokens from ${tokenAddress} to ${recipients.length} recipients`);

      return {
        success: true,
        data: {
          txHashes: [],
          totalMinted: 0n
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to mint tokens: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Update property details
   */
  async updateProperty(propertyId: string, userId: string, data: PropertyUpdateData): Promise<DbResult<void>> {
    const client = await this.pool.connect();

    try {
      // Check ownership/permissions
      const permissionQuery = `
        SELECT can_edit FROM public.property_ownership
        WHERE property_id = $1 AND user_id = $2 AND status = 'active'
      `;
      const permissionResult = await client.query(permissionQuery, [propertyId, userId]);

      if (permissionResult.rows.length === 0 || !permissionResult.rows[0].can_edit) {
        return {
          success: false,
          error: "Unauthorized: You don't have permission to edit this property",
        };
      }

      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(data.name);
      }
      if (data.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(data.description);
      }
      if (data.tokenPrice !== undefined) {
        updates.push(`token_price = $${paramCount++}`);
        values.push(data.tokenPrice);
      }
      if (data.annualYield !== undefined) {
        updates.push(`annual_yield = $${paramCount++}`);
        values.push(data.annualYield);
      }
      if (data.features !== undefined) {
        updates.push(`features = $${paramCount++}`);
        values.push(data.features);
      }
      if (data.images !== undefined) {
        updates.push(`images = $${paramCount++}`);
        values.push(data.images);
      }
      if (data.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(data.status);
      }

      if (updates.length === 0) {
        return { success: true, data: undefined };
      }

      values.push(propertyId);
      const updateQuery = `
        UPDATE public.properties
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
      `;

      await client.query(updateQuery, values);

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update property: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get properties owned by user
   */
  async getOwnedProperties(userId: string): Promise<DbResult<any[]>> {
    try {
      const query = `
        SELECT 
          p.*,
          po.ownership_type,
          po.ownership_percentage,
          po.can_edit,
          po.can_mint_tokens,
          po.can_manage_documents,
          po.can_communicate_investors
        FROM public.properties p
        INNER JOIN public.property_ownership po ON p.id = po.property_id
        WHERE po.user_id = $1 AND po.status = 'active'
        ORDER BY p.created_at DESC
      `;

      const result = await this.pool.query(query, [userId]);

      return {
        success: true,
        data: result.rows.map(row => ({
          id: row.id,
          contractAddress: row.contract_address,
          tokenSymbol: row.token_symbol,
          name: row.name,
          description: row.description,
          location: row.location,
          propertyType: row.property_type,
          totalTokens: row.total_tokens,
          availableTokens: row.available_tokens,
          tokenPrice: row.token_price,
          totalValue: row.total_value,
          annualYield: row.annual_yield,
          riskLevel: row.risk_level,
          features: row.features,
          images: row.images,
          fundingProgress: row.funding_progress,
          minimumInvestment: row.minimum_investment,
          status: row.status,
          ownership: {
            type: row.ownership_type,
            percentage: row.ownership_percentage,
            canEdit: row.can_edit,
            canMintTokens: row.can_mint_tokens,
            canManageDocuments: row.can_manage_documents,
            canCommunicateInvestors: row.can_communicate_investors,
          },
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get owned properties: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Grant property ownership/management access
   */
  async grantPropertyAccess(
    propertyId: string,
    grantedBy: string,
    grantedTo: string,
    ownership: Omit<PropertyOwnership, 'userId' | 'propertyId'>
  ): Promise<DbResult<void>> {
    const client = await this.pool.connect();

    try {
      // Verify granter has ownership
      const ownerQuery = `
        SELECT id FROM public.property_ownership
        WHERE property_id = $1 AND user_id = $2 
          AND ownership_type IN ('owner', 'co_owner') 
          AND status = 'active'
      `;
      const ownerResult = await client.query(ownerQuery, [propertyId, grantedBy]);

      if (ownerResult.rows.length === 0) {
        return {
          success: false,
          error: "Unauthorized: Only property owners can grant access",
        };
      }

      // Insert or update ownership
      const query = `
        INSERT INTO public.property_ownership (
          user_id, property_id, ownership_type, ownership_percentage,
          can_edit, can_mint_tokens, can_manage_documents, can_communicate_investors
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id, property_id) 
        DO UPDATE SET
          ownership_type = EXCLUDED.ownership_type,
          ownership_percentage = EXCLUDED.ownership_percentage,
          can_edit = EXCLUDED.can_edit,
          can_mint_tokens = EXCLUDED.can_mint_tokens,
          can_manage_documents = EXCLUDED.can_manage_documents,
          can_communicate_investors = EXCLUDED.can_communicate_investors,
          status = 'active',
          updated_at = NOW()
      `;

      await client.query(query, [
        grantedTo,
        propertyId,
        ownership.ownershipType,
        ownership.ownershipPercentage || null,
        ownership.canEdit,
        ownership.canMintTokens,
        ownership.canManageDocuments,
        ownership.canCommunicateInvestors,
      ]);

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: `Failed to grant property access: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Revoke property access
   */
  async revokePropertyAccess(propertyId: string, revokedBy: string, revokedFrom: string): Promise<DbResult<void>> {
    const client = await this.pool.connect();

    try {
      // Verify revoker has ownership
      const ownerQuery = `
        SELECT id FROM public.property_ownership
        WHERE property_id = $1 AND user_id = $2 
          AND ownership_type IN ('owner', 'co_owner') 
          AND status = 'active'
      `;
      const ownerResult = await client.query(ownerQuery, [propertyId, revokedBy]);

      if (ownerResult.rows.length === 0) {
        return {
          success: false,
          error: "Unauthorized: Only property owners can revoke access",
        };
      }

      // Cannot revoke primary owner
      const targetQuery = `
        SELECT ownership_type FROM public.property_ownership
        WHERE property_id = $1 AND user_id = $2 AND status = 'active'
      `;
      const targetResult = await client.query(targetQuery, [propertyId, revokedFrom]);

      if (targetResult.rows.length > 0 && targetResult.rows[0].ownership_type === 'owner') {
        return {
          success: false,
          error: "Cannot revoke access from primary owner",
        };
      }

      // Revoke access
      const revokeQuery = `
        UPDATE public.property_ownership
        SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
        WHERE property_id = $1 AND user_id = $2
      `;
      await client.query(revokeQuery, [propertyId, revokedFrom]);

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: `Failed to revoke property access: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Check if user can perform action on property
   */
  async checkPropertyPermission(
    propertyId: string,
    userId: string,
    permission: 'edit' | 'mint' | 'documents' | 'communicate'
  ): Promise<DbResult<boolean>> {
    try {
      const permissionColumn = {
        edit: 'can_edit',
        mint: 'can_mint_tokens',
        documents: 'can_manage_documents',
        communicate: 'can_communicate_investors',
      }[permission];

      const query = `
        SELECT ${permissionColumn} as has_permission
        FROM public.property_ownership
        WHERE property_id = $1 AND user_id = $2 AND status = 'active'
      `;

      const result = await this.pool.query(query, [propertyId, userId]);

      return {
        success: true,
        data: result.rows.length > 0 && result.rows[0].has_permission,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to check permission: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }
}
