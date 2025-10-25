/**
 * ERC-3643 Property Token Factory Service
 * Handles deployment of complete ERC-3643 compliant property token ecosystems
 * across multiple EVM networks using Viem/Wagmi patterns.
 *
 * System Thinking Level 2: This service orchestrates the complete TREX ecosystem deployment
 * across multiple EVM networks, ensuring compliance with ERC-3643 specifications
 * while implementing proper transaction lifecycle management per Viem/Wagmi patterns.
 */

import { ERC3643ContractsService } from "./contracts";
import type { EVMNetwork } from "./contracts";
import type { Address, Hex } from "viem";
import type { Pool } from "pg";

export interface PropertyTokenSuiteParams {
  salt: string; // Unique identifier for deployment (UUID format)
  name: string;
  symbol: string;
  initialSupply: bigint;
  claimTopics: number[]; // Required claim topics (e.g., [1, 2, 3] for KYC, accreditation, etc.)
  trustedIssuers: Address[]; // List of trusted issuer addresses
  complianceModules: Address[]; // List of compliance module addresses
}

export interface DeployedTokenSuite {
  salt: string;
  tokenAddress: Address;
  identityRegistryAddress: Address;
  complianceAddress: Address;
  claimTopicsRegistryAddress: Address;
  trustedIssuersRegistryAddress: Address;
  identityRegistryStorageAddress: Address;
  deployedAt: Date;
  deployerAddress: Address;
  network: EVMNetwork;
  txHash: Hex;
  gasUsed: bigint;
}

export interface PropertyTokenDeployment {
  propertyId: string;
  tokenAddress: Address;
  identityRegistry: Address;
  compliance: Address;
  permissionRegistry: Address;
  settlementContract: Address;
  status: "pending" | "deployed" | "failed";
  txHash?: Hex;
  deployedAt?: Date;
  deployerAddress?: Address;
  network: EVMNetwork;
  error?: string;
}

export interface DeploymentCostEstimate {
  gasEstimate: bigint;
  gasPrice: bigint;
  totalCost: bigint;
  breakdown: {
    tokenDeployment: bigint;
    identitySetup: bigint;
    complianceSetup: bigint;
    registrySetup: bigint;
  };
}

/**
 * ERC-3643 Property Token Factory Service
 * Complete service for deploying and managing TREX property token ecosystems across EVM networks
 */
export class PropertyTokenFactoryService {
  private contractsService: ERC3643ContractsService;
  private pool: Pool;
  private factoryAddress: Address;
  private network: EVMNetwork;

  constructor(contractsService: ERC3643ContractsService, pool: Pool, factoryAddress: Address) {
    this.contractsService = contractsService;
    this.pool = pool;
    this.factoryAddress = factoryAddress;
    this.network = contractsService.getNetwork();
  }

  /**
   * Create factory service for specific network using Viem/Wagmi patterns
   * Follows ERC-3643 specification for multi-network deployment
   */
  static createForNetwork(network: EVMNetwork): PropertyTokenFactoryService {
    // Initialize contracts service with proper Viem client configuration
    const contractsService = new ERC3643ContractsService(network);

    // Network-specific TREX factory addresses (must be ERC-3643 compliant)
    const factoryAddresses: Record<EVMNetwork, Address> = {
      mainnet: process.env.MAINNET_TREX_FACTORY_ADDRESS as Address || '0x0000000000000000000000000000000000000000' as Address,
      sepolia: process.env.SEPOLIA_TREX_FACTORY_ADDRESS as Address || '0x0000000000000000000000000000000000000000' as Address,
      base: process.env.BASE_TREX_FACTORY_ADDRESS as Address || '0x0000000000000000000000000000000000000000' as Address,
      'base-sepolia': process.env.BASE_SEPOLIA_TREX_FACTORY_ADDRESS as Address || '0x0000000000000000000000000000000000000000' as Address,
      devnet: process.env.DEVNET_TREX_FACTORY_ADDRESS as Address || '0x0000000000000000000000000000000000000000' as Address,
      polygon: process.env.POLYGON_TREX_FACTORY_ADDRESS as Address || '0x0000000000000000000000000000000000000000' as Address,
      'polygon-amoy': process.env.POLYGON_AMOY_TREX_FACTORY_ADDRESS as Address || '0x0000000000000000000000000000000000000000' as Address,
      optimism: process.env.OPTIMISM_TREX_FACTORY_ADDRESS as Address || '0x0000000000000000000000000000000000000000' as Address,
      'optimism-sepolia': process.env.OPTIMISM_SEPOLIA_TREX_FACTORY_ADDRESS as Address || '0x0000000000000000000000000000000000000000' as Address,
      arbitrum: process.env.ARBITRUM_TREX_FACTORY_ADDRESS as Address || '0x0000000000000000000000000000000000000000' as Address,
      'arbitrum-sepolia': process.env.ARBITRUM_SEPOLIA_TREX_FACTORY_ADDRESS as Address || '0x0000000000000000000000000000000000000000' as Address
    };

    // Validate factory address exists for network
    const factoryAddress = factoryAddresses[network];
    if (!factoryAddress || factoryAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`TREX factory address not configured for network: ${network}. Please set ${network.toUpperCase()}_TREX_FACTORY_ADDRESS environment variable.`);
    }

    // Initialize database connection pool
    const pool = new (require('pg')).Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });

    return new PropertyTokenFactoryService(contractsService, pool, factoryAddress);
  }

  /**
   * Get current network
   */
  getNetwork(): EVMNetwork {
    return this.network;
  }

  /**
   * Validate deployment parameters
   */
  validateDeploymentParams(params: PropertyTokenSuiteParams): void {
    if (!params.salt || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.salt)) {
      throw new Error('Invalid salt format: must be a valid UUID');
    }

    if (!params.name || params.name.trim().length === 0) {
      throw new Error('Token name is required');
    }

    if (!params.symbol || params.symbol.trim().length === 0) {
      throw new Error('Token symbol is required');
    }

    if (params.initialSupply <= 0n) {
      throw new Error('Initial supply must be greater than 0');
    }

    if (!params.claimTopics || params.claimTopics.length === 0) {
      throw new Error('At least one claim topic is required');
    }

    if (!params.trustedIssuers || params.trustedIssuers.length === 0) {
      throw new Error('At least one trusted issuer is required');
    }

    // Validate addresses
    const allAddresses = [...params.trustedIssuers, ...params.complianceModules];
    for (const address of allAddresses) {
      if (!this.isValidAddress(address)) {
        throw new Error(`Invalid Ethereum address: ${address}`);
      }
    }
  }

  /**
   * Check if address is valid Ethereum address
   */
  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Estimate deployment cost using Viem simulation patterns
   * Follows prepare → simulate → estimate gas pattern per Viem/Wagmi guide
   */
  async estimateDeploymentCost(params: PropertyTokenSuiteParams): Promise<{ success: boolean; data?: DeploymentCostEstimate; error?: string }> {
    try {
      // Validate parameters first
      this.validateDeploymentParams(params);

      // Prepare deployment transaction parameters per ERC-3643 spec
      const deployerAddress = '0x0000000000000000000000000000000000000000' as Address; // Dummy for estimation
      const txRequest = {
        address: this.factoryAddress,
        functionName: 'deployTREXSuite',
        args: [
          params.salt,
          params.name,
          params.symbol,
          18, // decimals (ERC-3643 standard)
          params.initialSupply,
          params.claimTopics,
          params.trustedIssuers,
          params.complianceModules
        ]
      };

      // Step 1: Simulate the transaction to validate parameters and get gas estimate
      const simulationResult = await this.contractsService.simulateContract({
        address: txRequest.address,
        functionName: txRequest.functionName,
        args: txRequest.args
      });

      if (!simulationResult.success) {
        return {
          success: false,
          error: `Simulation failed: ${simulationResult.error}`
        };
      }

      // Step 2: Get gas estimate from simulation result
      const gasEstimate = simulationResult.data.gasUsed || 500000n; // Fallback estimate

      // Step 3: Get current gas price from network
      const gasPriceResult = await this.contractsService.readContract<bigint>({
        address: '0x0000000000000000000000000000000000000000' as Address, // Use dummy for gas price read
        functionName: 'getGasPrice'
      });

      let gasPrice = 20000000000n; // Default 20 gwei fallback
      if (gasPriceResult.success) {
        gasPrice = gasPriceResult.data;
      }

      // Calculate total cost
      const totalCost = gasEstimate * gasPrice;

      // Breakdown by component (estimated ratios based on ERC-3643 deployment patterns)
      const breakdown = {
        tokenDeployment: (totalCost * 40n) / 100n,    // 40% - Token contract
        identitySetup: (totalCost * 25n) / 100n,      // 25% - Identity registry setup
        complianceSetup: (totalCost * 20n) / 100n,    // 20% - Compliance modules
        registrySetup: (totalCost * 15n) / 100n       // 15% - Claim topics & issuers
      };

      return {
        success: true,
        data: {
          gasEstimate,
          gasPrice,
          totalCost,
          breakdown
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Cost estimation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }


  /**
   * Deploy a complete property token suite via factory using Viem/Wagmi patterns
   * Follows ERC-3643 specification for TREX ecosystem deployment
   * Implements transaction lifecycle: prepare → simulate → estimate gas → sign → broadcast → wait
   */
  async deployPropertyTokenSuite(
    params: PropertyTokenSuiteParams,
    deployerAddress: Address
  ): Promise<{ success: boolean; data?: DeployedTokenSuite; error?: string }> {
    try {
      // Step 1: Validate parameters per ERC-3643 requirements
      this.validateDeploymentParams(params);

      console.log(`[TREX Factory:${this.network}] Starting ERC-3643 deployment for property ${params.salt}`);
      console.log(`  Name: ${params.name}`);
      console.log(`  Symbol: ${params.symbol}`);
      console.log(`  Initial Supply: ${params.initialSupply}`);
      console.log(`  Claim Topics: ${params.claimTopics.join(', ')}`);
      console.log(`  Trusted Issuers: ${params.trustedIssuers.length}`);
      console.log(`  Compliance Modules: ${params.complianceModules.length}`);

      // Step 2: Prepare deployment transaction per ERC-3643 spec
      const txRequest = {
        address: this.factoryAddress,
        functionName: 'deployTREXSuite' as const,
        args: [
          params.salt,
          params.name,
          params.symbol,
          18, // decimals (ERC-3643 standard)
          params.initialSupply,
          params.claimTopics,
          params.trustedIssuers,
          params.complianceModules
        ]
      };

      // Step 3: Simulate transaction to validate parameters and catch reverts early
      console.log(`[TREX Factory:${this.network}] Simulating deployment transaction...`);
      const simulationResult = await this.contractsService.simulateContract(txRequest);

      if (!simulationResult.success) {
        const errorMessage = `Simulation failed: ${simulationResult.error}`;
        console.error(`[TREX Factory:${this.network}] ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      console.log(`[TREX Factory:${this.network}] Simulation successful`);

      // Step 4: Estimate gas for the transaction
      console.log(`[TREX Factory:${this.network}] Estimating gas...`);
      const gasEstimateResult = await this.contractsService.estimateGas(txRequest);

      if (!gasEstimateResult.success) {
        const errorMessage = `Gas estimation failed: ${gasEstimateResult.error}`;
        console.error(`[TREX Factory:${this.network}] ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      const gasLimit = gasEstimateResult.data;
      console.log(`[TREX Factory:${this.network}] Estimated gas: ${gasLimit}`);

      // Step 5: Execute the deployment transaction (sign + broadcast + wait)
      console.log(`[TREX Factory:${this.network}] Executing deployment transaction...`);

      const writeRequest = {
        ...txRequest,
        gasLimit
      };

      const txResult = await this.contractsService.writeContract(writeRequest);

      if (!txResult.success) {
        const errorMessage = txResult.error || 'Transaction submission failed';
        console.error(`[TREX Factory:${this.network}] Transaction submission failed: ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      console.log(`[TREX Factory:${this.network}] Transaction submitted: ${txResult.data.txHash}`);
      console.log(`[TREX Factory:${this.network}] Waiting for confirmation...`);

      // Step 6: Wait for transaction confirmation
      const confirmationResult = await this.contractsService.waitForTransaction(txResult.data.txHash);
      if (!confirmationResult.success) {
        const errorMessage = confirmationResult.error || 'Transaction confirmation failed';
        console.error(`[TREX Factory:${this.network}] Confirmation failed: ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      console.log(`[TREX Factory:${this.network}] Transaction confirmed successfully!`);
      console.log(`[TREX Factory:${this.network}] Retrieving deployed contract addresses...`);

      // Step 7: Query deployed contract addresses using ERC-3643 factory methods
      const addressesResult = await this.getDeployedContractAddresses(params.salt);
      if (!addressesResult.success) {
        return {
          success: false,
          error: `Failed to retrieve deployed contract addresses: ${addressesResult.error}`
        };
      }

      console.log(`[TREX Factory:${this.network}] Deployment completed successfully:`);
      console.log(`  Token: ${addressesResult.data!.token}`);
      console.log(`  Identity Registry: ${addressesResult.data!.identityRegistry}`);
      console.log(`  Compliance: ${addressesResult.data!.compliance}`);
      console.log(`  Gas Used: ${confirmationResult.data.gasUsed}`);

      // Step 8: Store deployment record in database
      const deployment: DeployedTokenSuite = {
        salt: params.salt,
        tokenAddress: addressesResult.data!.token,
        identityRegistryAddress: addressesResult.data!.identityRegistry,
        complianceAddress: addressesResult.data!.compliance,
        claimTopicsRegistryAddress: addressesResult.data!.claimTopicsRegistry,
        trustedIssuersRegistryAddress: addressesResult.data!.trustedIssuersRegistry,
        identityRegistryStorageAddress: addressesResult.data!.identityRegistryStorage,
        deployedAt: new Date(),
        deployerAddress,
        network: this.network,
        txHash: txResult.data.txHash,
        gasUsed: confirmationResult.data.gasUsed || 0n
      };

      // Store in database for tracking
      await this.storePropertyDeployment({
        propertyId: params.salt,
        tokenAddress: deployment.tokenAddress,
        identityRegistry: deployment.identityRegistryAddress,
        compliance: deployment.complianceAddress,
        permissionRegistry: deployment.claimTopicsRegistryAddress,
        settlementContract: deployment.trustedIssuersRegistryAddress,
        status: 'deployed',
        txHash: deployment.txHash,
        deployedAt: deployment.deployedAt,
        deployerAddress: deployment.deployerAddress,
        network: this.network
      });

      return {
        success: true,
        data: deployment
      };
    } catch (error) {
      const errorMessage = `Failed to deploy TREX suite: ${error instanceof Error ? error.message : "Unknown error"}`;
      console.error(`[TREX Factory:${this.network}] ${errorMessage}`);

      // Store failed deployment for tracking
      await this.storePropertyDeployment({
        propertyId: params.salt,
        tokenAddress: '0x' as Address,
        identityRegistry: '0x' as Address,
        compliance: '0x' as Address,
        permissionRegistry: '0x' as Address,
        settlementContract: '0x' as Address,
        status: 'failed',
        network: this.network,
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get deployed token address by salt using ERC-3643 factory method
   */
  async getTokenAddress(salt: string): Promise<{ success: boolean; data?: Address; error?: string }> {
    try {
      const result = await this.contractsService.readContract<Address>({
        address: this.factoryAddress,
        functionName: 'getToken',
        args: [salt]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to get token address: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Get deployed identity registry address by salt using ERC-3643 factory method
   */
  async getIdentityRegistryAddress(salt: string): Promise<{ success: boolean; data?: Address; error?: string }> {
    try {
      const result = await this.contractsService.readContract<Address>({
        address: this.factoryAddress,
        functionName: 'getIdentityRegistry',
        args: [salt]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to get identity registry address: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Get deployed compliance contract address by salt using ERC-3643 factory method
   */
  async getComplianceAddress(salt: string): Promise<{ success: boolean; data?: Address; error?: string }> {
    try {
      const result = await this.contractsService.readContract<Address>({
        address: this.factoryAddress,
        functionName: 'getCompliance',
        args: [salt]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to get compliance address: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Get deployed identity storage address by salt using ERC-3643 factory method
   */
  async getIdentityStorageAddress(salt: string): Promise<{ success: boolean; data?: Address; error?: string }> {
    try {
      const result = await this.contractsService.readContract<Address>({
        address: this.factoryAddress,
        functionName: 'getIdentityRegistryStorage',
        args: [salt]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to get identity storage address: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Get deployed claim topics registry address by salt using ERC-3643 factory method
   */
  async getClaimTopicsRegistryAddress(salt: string): Promise<{ success: boolean; data?: Address; error?: string }> {
    try {
      const result = await this.contractsService.readContract<Address>({
        address: this.factoryAddress,
        functionName: 'getClaimTopicsRegistry',
        args: [salt]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to get claim topics registry address: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Get deployed trusted issuers registry address by salt using ERC-3643 factory method
   */
  async getTrustedIssuersRegistryAddress(salt: string): Promise<{ success: boolean; data?: Address; error?: string }> {
    try {
      const result = await this.contractsService.readContract<Address>({
        address: this.factoryAddress,
        functionName: 'getTrustedIssuersRegistry',
        args: [salt]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to get trusted issuers registry address: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Get all deployed contract addresses for a salt
   */
  async getDeployedContractAddresses(salt: string): Promise<{
    success: boolean;
    data?: {
      token: Address;
      identityRegistry: Address;
      compliance: Address;
      identityRegistryStorage: Address;
      claimTopicsRegistry: Address;
      trustedIssuersRegistry: Address;
    };
    error?: string
  }> {
    try {
      const [
        tokenResult,
        identityRegistryResult,
        complianceResult,
        identityStorageResult,
        claimTopicsResult,
        trustedIssuersResult
      ] = await Promise.all([
        this.getTokenAddress(salt),
        this.getIdentityRegistryAddress(salt),
        this.getComplianceAddress(salt),
        this.getIdentityStorageAddress(salt),
        this.getClaimTopicsRegistryAddress(salt),
        this.getTrustedIssuersRegistryAddress(salt)
      ]);

      // Check if all queries succeeded
      if (!tokenResult.success || !identityRegistryResult.success || !complianceResult.success ||
          !identityStorageResult.success || !claimTopicsResult.success || !trustedIssuersResult.success) {
        return {
          success: false,
          error: 'Failed to retrieve some contract addresses'
        };
      }

      return {
        success: true,
        data: {
          token: tokenResult.data!,
          identityRegistry: identityRegistryResult.data!,
          compliance: complianceResult.data!,
          identityRegistryStorage: identityStorageResult.data!,
          claimTopicsRegistry: claimTopicsResult.data!,
          trustedIssuersRegistry: trustedIssuersResult.data!
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to retrieve contract addresses: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Set contract implementations in factory (admin function) using ERC-3643 patterns
   * Follows Viem/Wagmi transaction lifecycle for admin operations
   */
  async setImplementations(
    implementations: {
      onchainId: Address;
      identityRegistry: Address;
      identityRegistryStorage: Address;
      modularCompliance: Address;
      propertyToken: Address;
    },
    adminAddress: Address
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Prepare set implementations transaction per ERC-3643 spec
      const txRequest = {
        address: this.factoryAddress,
        functionName: 'setImplementations' as const,
        args: [
          implementations.onchainId,
          implementations.identityRegistry,
          implementations.identityRegistryStorage,
          implementations.modularCompliance,
          implementations.propertyToken
        ]
      };

      // Simulate transaction to validate parameters
      console.log(`[TREX Factory:${this.network}] Simulating setImplementations transaction...`);
      const simulationResult = await this.contractsService.simulateContract(txRequest);

      if (!simulationResult.success) {
        const errorMessage = `Simulation failed: ${simulationResult.error}`;
        console.error(`[TREX Factory:${this.network}] ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      console.log(`[TREX Factory:${this.network}] Simulation successful`);

      // Estimate gas for the transaction
      console.log(`[TREX Factory:${this.network}] Estimating gas...`);
      const gasEstimateResult = await this.contractsService.estimateGas(txRequest);

      if (!gasEstimateResult.success) {
        const errorMessage = `Gas estimation failed: ${gasEstimateResult.error}`;
        console.error(`[TREX Factory:${this.network}] ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      const gasLimit = gasEstimateResult.data;
      console.log(`[TREX Factory:${this.network}] Estimated gas: ${gasLimit}`);

      // Execute the transaction
      console.log(`[TREX Factory:${this.network}] Executing setImplementations transaction...`);

      const writeRequest = {
        ...txRequest,
        gasLimit
      };

      const txResult = await this.contractsService.writeContract(writeRequest);

      if (!txResult.success) {
        const errorMessage = txResult.error || 'Transaction submission failed';
        console.error(`[TREX Factory:${this.network}] Transaction submission failed: ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      console.log(`[TREX Factory:${this.network}] Transaction submitted: ${txResult.data.txHash}`);

      // Wait for transaction confirmation
      const confirmationResult = await this.contractsService.waitForTransaction(txResult.data.txHash);
      if (!confirmationResult.success) {
        const errorMessage = confirmationResult.error || 'Transaction confirmation failed';
        console.error(`[TREX Factory:${this.network}] Confirmation failed: ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      console.log(`[TREX Factory:${this.network}] Transaction confirmed successfully`);

      return {
        success: true,
        data: {
          txHash: txResult.data.txHash,
          gasUsed: confirmationResult.data.gasUsed,
          blockNumber: confirmationResult.data.blockNumber
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to set implementations: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Get current implementations from factory using ERC-3643 getter methods
   */
  async getImplementations(): Promise<{
    success: boolean;
    data?: {
      onchainId: Address;
      identityRegistry: Address;
      identityRegistryStorage: Address;
      modularCompliance: Address;
      propertyToken: Address;
    };
    error?: string
  }> {
    try {
      // Get implementation addresses using ERC-3643 factory getter methods
      const [
        onchainIdResult,
        identityRegistryResult,
        identityStorageResult,
        complianceResult,
        tokenResult
      ] = await Promise.all([
        this.contractsService.readContract<Address>({
          address: this.factoryAddress,
          functionName: 'getOnchainID'
        }),
        this.contractsService.readContract<Address>({
          address: this.factoryAddress,
          functionName: 'getIdentityRegistry'
        }),
        this.contractsService.readContract<Address>({
          address: this.factoryAddress,
          functionName: 'getIdentityRegistryStorage'
        }),
        this.contractsService.readContract<Address>({
          address: this.factoryAddress,
          functionName: 'getCompliance'
        }),
        this.contractsService.readContract<Address>({
          address: this.factoryAddress,
          functionName: 'getToken'
        })
      ]);

      if (!onchainIdResult.success || !identityRegistryResult.success || !identityStorageResult.success ||
          !complianceResult.success || !tokenResult.success) {
        return {
          success: false,
          error: 'Failed to retrieve implementation addresses'
        };
      }

      return {
        success: true,
        data: {
          onchainId: onchainIdResult.data,
          identityRegistry: identityRegistryResult.data,
          identityRegistryStorage: identityStorageResult.data,
          modularCompliance: complianceResult.data,
          propertyToken: tokenResult.data
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get implementations: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Validate implementation contracts
   */
  async validateImplementations(implementations: {
    onchainId: Address;
    identityRegistry: Address;
    identityRegistryStorage: Address;
    modularCompliance: Address;
    propertyToken: Address;
  }): Promise<{
    success: boolean;
    data?: {
      allValid: boolean;
      validationResults: Record<string, boolean>;
      errors: string[];
    };
    error?: string
  }> {
    try {
      const validationResults: Record<string, boolean> = {};
      const errors: string[] = [];

      // Check if contracts have code (basic validation)
      const addresses = Object.values(implementations);
      const implementationKeys = Object.keys(implementations);
      const validationPromises = addresses.map(async (address, index) => {
        const key = implementationKeys[index];
        if (!key) return false;

        try {
          const codeResult = await this.contractsService.readContract<string>({
            address: '0x0000000000000000000000000000000000000000' as Address, // Use dummy for code check
            functionName: 'getCode',
            args: [address]
          });

          const isValid = codeResult.success && typeof codeResult.data === 'string' && codeResult.data.length > 2; // '0x' is empty
          validationResults[key] = isValid;

          if (!isValid) {
            errors.push(`${key} contract not deployed or invalid`);
          }

          return isValid;
        } catch {
          validationResults[key] = false;
          errors.push(`${key} validation failed`);
          return false;
        }
      });

      await Promise.all(validationPromises);

      const allValid = Object.values(validationResults).every(valid => valid);

      return {
        success: true,
        data: {
          allValid,
          validationResults,
          errors
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Implementation validation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  // ============================================================
  // DATABASE OPERATIONS
  // ============================================================

  /**
   * Store property deployment in database
   */
  async storePropertyDeployment(deployment: PropertyTokenDeployment): Promise<boolean> {
    const query = `
      INSERT INTO properties.token_deployments
      (property_id, token_contract, identity_registry, compliance_contract, permission_registry, settlement_contract, status, tx_hash, network, deployed_at, deployer_address, error)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (property_id)
      DO UPDATE SET
        token_contract = EXCLUDED.token_contract,
        identity_registry = EXCLUDED.identity_registry,
        compliance_contract = EXCLUDED.compliance_contract,
        status = EXCLUDED.status,
        tx_hash = EXCLUDED.tx_hash,
        deployed_at = EXCLUDED.deployed_at,
        deployer_address = EXCLUDED.deployer_address,
        error = EXCLUDED.error,
        updated_at = NOW()
      RETURNING *
    `;

    try {
      await this.pool.query(query, [
        deployment.propertyId,
        deployment.tokenAddress,
        deployment.identityRegistry,
        deployment.compliance,
        deployment.permissionRegistry,
        deployment.settlementContract,
        deployment.status,
        deployment.txHash,
        deployment.network,
        deployment.deployedAt,
        deployment.deployerAddress,
        deployment.error,
      ]);
      return true;
    } catch (error) {
      console.error("Failed to store property deployment:", error);
      return false;
    }
  }

  /**
   * Get property deployment info from database
   */
  async getPropertyDeployment(propertyId: string): Promise<PropertyTokenDeployment | null> {
    const query = `
      SELECT * FROM properties.token_deployments
      WHERE property_id = $1
    `;

    try {
      const result = await this.pool.query(query, [propertyId]);
      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        propertyId: row.property_id,
        tokenAddress: row.token_contract,
        identityRegistry: row.identity_registry,
        compliance: row.compliance_contract,
        permissionRegistry: row.permission_registry,
        settlementContract: row.settlement_contract,
        status: row.status,
        txHash: row.tx_hash,
        deployedAt: row.deployed_at,
        deployerAddress: row.deployer_address,
        network: row.network,
        error: row.error,
      };
    } catch (error) {
      console.error("Failed to get property deployment:", error);
      return null;
    }
  }

  /**
   * Update deployment status
   */
  async updateDeploymentStatus(
    propertyId: string,
    status: PropertyTokenDeployment['status'],
    txHash?: Hex,
    error?: string
  ): Promise<boolean> {
    const query = `
      UPDATE properties.token_deployments
      SET status = $2, tx_hash = $3, error = $4, updated_at = NOW()
      WHERE property_id = $1
    `;

    try {
      await this.pool.query(query, [propertyId, status, txHash, error]);
      return true;
    } catch (err) {
      console.error("Failed to update deployment status:", err);
      return false;
    }
  }

  /**
   * Link property to deployed contracts
   */
  async linkPropertyToContracts(
    propertyId: string,
    tokenAddress: Address,
    identityRegistry: Address,
    complianceAddress: Address
  ): Promise<boolean> {
    const query = `
      UPDATE properties.properties
      SET
        contract_address = $2,
        identity_registry = $3,
        compliance_contract = $4,
        updated_at = NOW()
      WHERE id = $1
    `;

    try {
      await this.pool.query(query, [propertyId, tokenAddress, identityRegistry, complianceAddress]);
      return true;
    } catch (error) {
      console.error("Failed to link property to contracts:", error);
      return false;
    }
  }

  /**
   * Update property contract addresses
   */
  async updatePropertyContractAddresses(
    propertyId: string,
    addresses: {
      tokenAddress: Address;
      identityRegistry: Address;
      complianceAddress: Address;
    }
  ): Promise<boolean> {
    const query = `
      UPDATE properties.properties
      SET
        contract_address = $2,
        identity_registry = $3,
        compliance_contract = $4,
        updated_at = NOW()
      WHERE id = $1
    `;

    try {
      await this.pool.query(query, [
        propertyId,
        addresses.tokenAddress,
        addresses.identityRegistry,
        addresses.complianceAddress
      ]);
      return true;
    } catch (error) {
      console.error("Failed to update property contract addresses:", error);
      return false;
    }
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Get factory contract address
   */
  getFactoryAddress(): Address {
    return this.factoryAddress;
  }

  /**
   * Check if factory is operational
   */
  async isOperational(): Promise<boolean> {
    try {
      // Check if factory contract has code
      const codeResult = await this.contractsService.readContract<string>({
        address: '0x0000000000000000000000000000000000000000' as Address,
        functionName: 'getCode',
        args: [this.factoryAddress]
      });

      return codeResult.success && typeof codeResult.data === 'string' && codeResult.data.length > 2;
    } catch {
      return false;
    }
  }

  /**
   * Get deployment statistics
   */
  async getDeploymentStats(): Promise<{
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    recentDeployments: PropertyTokenDeployment[];
  }> {
    const query = `
      SELECT status, COUNT(*) as count
      FROM properties.token_deployments
      GROUP BY status
    `;

    const recentQuery = `
      SELECT * FROM properties.token_deployments
      ORDER BY deployed_at DESC
      LIMIT 10
    `;

    try {
      const [statsResult, recentResult] = await Promise.all([
        this.pool.query(query),
        this.pool.query(recentQuery)
      ]);

      const stats = statsResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {} as Record<string, number>);

      return {
        totalDeployments: statsResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
        successfulDeployments: stats.deployed || 0,
        failedDeployments: stats.failed || 0,
        recentDeployments: recentResult.rows.map(row => ({
          propertyId: row.property_id,
          tokenAddress: row.token_contract,
          identityRegistry: row.identity_registry,
          compliance: row.compliance_contract,
          permissionRegistry: row.permission_registry,
          settlementContract: row.settlement_contract,
          status: row.status,
          txHash: row.tx_hash,
          deployedAt: row.deployed_at,
          deployerAddress: row.deployer_address,
          network: row.network,
          error: row.error,
        }))
      };
    } catch (error) {
      console.error("Failed to get deployment stats:", error);
      return {
        totalDeployments: 0,
        successfulDeployments: 0,
        failedDeployments: 0,
        recentDeployments: []
      };
    }
  }
}

// Backward compatibility: Export old interface names
export const getContractAddresses = () => ({
  PROPERTY_TOKEN_FACTORY: process.env.TESTNET_TREX_FACTORY_ADDRESS || "",
  PERMISSION_REGISTRY: process.env.PERMISSION_REGISTRY || "",
  SETTLEMENT: process.env.SETTLEMENT_CONTRACT || "",
  BASIC_COMPLIANCE_MODULE: process.env.BASIC_COMPLIANCE_MODULE_CONTRACT || "",
  IDENTITY_REGISTRY: process.env.IDENTITY_REGISTRY_CONTRACT || "",
  IDENTITY_REGISTRY_STORAGE: process.env.IDENTITY_REGISTRY_STORAGE || "",
  MODULAR_COMPLIANCE: process.env.MODULAR_COMPLIANCE_CONTRACT || "",
  ONCHAINID: process.env.ONCHAINID_CONTRACT || "",
  PROPERTY_TOKEN: process.env.PROPERTY_TOKEN || "",
} as const);

// Backward compatibility
export const TESTNET_CONTRACTS = getContractAddresses();
