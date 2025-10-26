/**
 * ERC-3643 Property Token Factory Service
 * Updated to use TREXDeployerService for complete deployment
 * Follows DeployCompleteTREXv1.s.sol patterns exactly
 */

import { ERC3643ContractsService } from "./contracts";
import { TREXDeployerService, type TREXDeploymentResult, type TokenDeploymentParams, type InvestorData } from './trex-deployer';
import type { EVMNetwork } from "./contracts";
import type { Address, Hex } from "viem";
import type { Pool } from "pg";
import { parseEther } from 'viem';

export interface PropertyTokenDeploymentRequest {
  propertyId: string;
  userId: string;
  ownerAddress: `0x${string}`;
  tokenData: TokenDeploymentData;
}

export interface TokenDeploymentData {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  instrumentType: string;
  baseCurrency: string;
  countryRestrictions: string[];
  maxBalance: number;
  maxHolders: number;
  timeRestrictions: boolean;
  claimTopics: number[];
  trustedIssuers: string[];
  complianceModules: string[];
  propertyId: string;
}

export interface PropertyTokenDeployment {
  propertyId: string;
  tokenAddress: Address;
  identityRegistry: Address;
  compliance: Address;
  status: "pending" | "deployed" | "failed";
  txHash?: Hex;
  deployedAt?: Date;
  deployerAddress?: Address;
  network: EVMNetwork;
  error?: string;
}

/**
 * Property Token Factory Service
 * Orchestrates complete ERC-3643 T-REX deployment using TREXDeployerService
 */
export class PropertyTokenFactoryService {
  private contractsService: ERC3643ContractsService;
  private deployerService: TREXDeployerService;
  private pool: Pool;
  private network: EVMNetwork;

  constructor(contractsService: ERC3643ContractsService, pool: Pool) {
    this.contractsService = contractsService;
    this.pool = pool;
    this.deployerService = new TREXDeployerService(contractsService, pool);
    this.network = contractsService.getNetwork();
  }

  /**
   * Create factory service for specific network
   */
  static createForNetwork(network: EVMNetwork, rpcUrl?: string, privateKey?: Hex): PropertyTokenFactoryService {
    // Initialize contracts service
    const contractsService = new ERC3643ContractsService(network, rpcUrl, privateKey);

    // Initialize database connection pool
    const pool = new (require('pg')).Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });

    return new PropertyTokenFactoryService(contractsService, pool);
  }

  /**
   * Get current network
   */
  getNetwork(): EVMNetwork {
    return this.network;
  }

  /**
   * Deploy a complete property token suite
   * Follows DeployCompleteTREXv1.s.sol deployment sequence exactly
   */
  async deployPropertyToken(
    request: PropertyTokenDeploymentRequest
  ): Promise<{ success: boolean; data?: TREXDeploymentResult; error?: string }> {
    try {
      console.log(`[PropertyTokenFactory:${this.network}] Starting deployment for property ${request.propertyId}`);
      console.log(`  Token: ${request.tokenData.name} (${request.tokenData.symbol})`);
      console.log(`  Owner: ${request.ownerAddress}`);

      // Convert country codes from strings to numbers
      const countryRestrictions = request.tokenData.countryRestrictions.map(code => {
        // If it's already a number, use it
        if (typeof code === 'number') return code;
        // Otherwise parse it
        return parseInt(code, 10);
      });

      // Prepare deployment parameters following DeployCompleteTREXv1.s.sol
      const tokenParams: TokenDeploymentParams = {
        name: request.tokenData.name,
        symbol: request.tokenData.symbol,
        decimals: request.tokenData.decimals || 18,
        totalSupply: request.tokenData.totalSupply,
        owner: request.ownerAddress,
        countryRestrictions,
        maxBalance: parseEther(request.tokenData.maxBalance.toString()),
        maxHolders: request.tokenData.maxHolders || 1000,
      };

      // Optional: Prepare investors if provided
      const investors: InvestorData[] | undefined = undefined; // Can be populated from request if needed

      // Execute complete T-REX deployment
      const deploymentResult = await this.deployerService.deployCompleteTREXSuite(
        tokenParams,
        investors
      );

      if (!deploymentResult.success) {
        console.error(`[PropertyTokenFactory:${this.network}] Deployment failed:`, deploymentResult.error);
        
        // Store failed deployment
        await this.storePropertyDeployment({
          propertyId: request.propertyId,
          tokenAddress: '0x0000000000000000000000000000000000000000' as Address,
          identityRegistry: '0x0000000000000000000000000000000000000000' as Address,
          compliance: '0x0000000000000000000000000000000000000000' as Address,
          status: 'failed',
          network: this.network,
          error: deploymentResult.error,
        });

        return deploymentResult;
      }

      console.log(`[PropertyTokenFactory:${this.network}] Deployment successful!`);
      console.log(`  Token: ${deploymentResult.data!.tokenAddress}`);
      console.log(`  Gas Used: ${deploymentResult.data!.totalGasUsed}`);

      // Store deployment in database using deployer service
      await this.deployerService.storeDeploymentData(request.propertyId, deploymentResult.data!, tokenParams);

      /* Store successful deployment
      await this.storePropertyDeployment({
        propertyId: request.propertyId,
        tokenAddress: deploymentResult.data!.tokenAddress,
        identityRegistry: deploymentResult.data!.identityRegistryAddress,
        compliance: deploymentResult.data!.complianceAddress,
        status: 'deployed',
        txHash: deploymentResult.data!.transactionHashes[0],
        deployedAt: deploymentResult.data!.deploymentTimestamp,
        deployerAddress: request.ownerAddress,
        network: this.network,
      });*/

      return deploymentResult;
    } catch (error) {
      const errorMessage = `Failed to deploy property token: ${error instanceof Error ? error.message : "Unknown error"}`;
      console.error(`[PropertyTokenFactory:${this.network}] ${errorMessage}`);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Store property deployment record in database
   */
  private async storePropertyDeployment(deployment: PropertyTokenDeployment): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Insert or update property_tokens tracking table
      await client.query(
        `INSERT INTO public.property_tokens 
          (property_id, token_address, identity_registry, compliance, 
           status, tx_hash, deployed_at, deployer_address, network, error)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *;
        `,
        [
          deployment.propertyId,
          deployment.tokenAddress,
          deployment.identityRegistry,
          deployment.compliance,
          deployment.status,
          deployment.txHash || null,
          deployment.deployedAt || null,
          deployment.deployerAddress || null,
          deployment.network,
          deployment.error || 'false'
        ]
      );

/*
        ON CONFLICT (property_id) 
        DO UPDATE SET
          token_address = EXCLUDED.token_address,
          identity_registry = EXCLUDED.identity_registry,
          compliance = EXCLUDED.compliance,
          status = EXCLUDED.status,
          tx_hash = EXCLUDED.tx_hash,
          deployed_at = EXCLUDED.deployed_at,
          deployer_address = EXCLUDED.deployer_address,
          network = EXCLUDED.network,
          error = EXCLUDED.error,
          created_at = NOW()
 */

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to store property deployment:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get deployment status for a property
   */
  async getDeploymentStatus(propertyId: string): Promise<{ success: boolean; data?: PropertyTokenDeployment; error?: string }> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM public.property_tokens WHERE property_id = $1`,
        [propertyId]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Deployment not found'
        };
      }

      return {
        success: true,
        data: result.rows[0]
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get deployment status: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
