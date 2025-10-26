/**
 * T-REX Deployment Service
 * Complete implementation of ERC-3643 T-REX deployment following DeployCompleteTREXv1.s.sol
 * 
 * This service handles the sequential deployment of all TREX ecosystem contracts:
 * Phase 1: Infrastructure (Authority, Storage, Factory)
 * Phase 2: Registries (ClaimTopics, TrustedIssuers, IdentityRegistry)
 * Phase 3: Compliance System (ModularCompliance + 4 Modules)
 * Phase 4: Token Deployment
 * Phase 5: Module Configuration
 * Phase 6: Investor Onboarding
 */

import type { Address, Hex } from 'viem';
import { encodePacked, keccak256, parseEther } from 'viem';
import { ERC3643ContractsService } from './contracts';
import { getContractBytecode, getContractABI } from '../lib/contract-bytecode';
import type { Pool } from 'pg';

/**
 * Complete deployment result containing all contract addresses
 */
export interface TREXDeploymentResult {
  // Phase 1: Infrastructure
  authorityAddress: Address;
  identityStorageAddress: Address;
  identityFactoryAddress: Address;
  
  // Phase 2: Registries
  claimTopicsRegistryAddress: Address;
  trustedIssuersRegistryAddress: Address;
  identityRegistryAddress: Address;
  
  // Phase 3: Compliance
  complianceAddress: Address;
  timeRestrictionsModuleAddress: Address;
  countryRestrictionsModuleAddress: Address;
  maxBalanceModuleAddress: Address;
  maxHoldersModuleAddress: Address;
  
  // Phase 4: Token
  tokenAddress: Address;
  
  // Metadata
  deploymentTimestamp: Date;
  totalGasUsed: bigint;
  transactionHashes: Hex[];
}

/**
 * Token deployment parameters matching interface from property-token-factory
 */
export interface TokenDeploymentParams {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  owner: Address;
  countryRestrictions: number[]; // ISO 3166-1 numeric codes
  maxBalance: bigint;
  maxHolders: number;
}

/**
 * Investor data for onboarding
 */
export interface InvestorData {
  address: Address;
  countryCode: number;
  amount: bigint;
}

/**
 * T-REX Deployer Service
 * Orchestrates complete ERC-3643 deployment following Solidity script patterns
 */
export class TREXDeployerService {
  private contractsService: ERC3643ContractsService;
  private pool: Pool;

  constructor(contractsService: ERC3643ContractsService, pool: Pool) {
    this.contractsService = contractsService;
    this.pool = pool;
  }

  /**
   * Deploy complete T-REX suite following DeployCompleteTREXv1.s.sol sequence
   */
  async deployCompleteTREXSuite(
    tokenParams: TokenDeploymentParams,
    investors?: InvestorData[]
  ): Promise<{ success: boolean; data?: TREXDeploymentResult; error?: string }> {
    const txHashes: Hex[] = [];
    let totalGasUsed = 0n;

    try {
      console.log('🚀 Starting Complete T-REX Deployment');
      console.log('================================================');

      // ============================================================
      // PHASE 1: INFRASTRUCTURE DEPLOYMENT
      // ============================================================
      console.log('\n📦 PHASE 1: Infrastructure Deployment');
      
      // 1.1: Deploy Implementation Authority
      console.log('  1.1: Deploying ImplementationAuthority...');
      const authorityResult = await this.deployContract('ImplementationAuthority', []);
      if (!authorityResult.success) return { success: false, error: authorityResult.error };
      const authorityAddress = authorityResult.data!.address;
      txHashes.push(authorityResult.data!.txHash);
      totalGasUsed += authorityResult.data!.gasUsed;
      console.log(`    ✅ Authority: ${authorityAddress}`);

      // 1.2: Deploy Identity Registry Storage
      console.log('  1.2: Deploying IdentityRegistryStorage...');
      const storageResult = await this.deployContract('IdentityRegistryStorage', []);
      if (!storageResult.success) return { success: false, error: storageResult.error };
      const storageAddress = storageResult.data!.address;
      txHashes.push(storageResult.data!.txHash);
      totalGasUsed += storageResult.data!.gasUsed;
      console.log(`    ✅ Storage: ${storageAddress}`);

      // 1.3: Deploy Identity Factory
      console.log('  1.3: Deploying IdentityFactory...');
      const factoryResult = await this.deployContract('IdentityFactory', []);
      if (!factoryResult.success) return { success: false, error: factoryResult.error };
      const factoryAddress = factoryResult.data!.address;
      txHashes.push(factoryResult.data!.txHash);
      totalGasUsed += factoryResult.data!.gasUsed;
      console.log(`    ✅ Factory: ${factoryAddress}`);

      // ============================================================
      // PHASE 2: REGISTRY DEPLOYMENT
      // ============================================================
      console.log('\n📋 PHASE 2: Registry Deployment');

      // 2.1: Deploy ClaimTopicsRegistry
      console.log('  2.1: Deploying ClaimTopicsRegistry...');
      const claimTopicsResult = await this.deployContract('ClaimTopicsRegistry', []);
      if (!claimTopicsResult.success) return { success: false, error: claimTopicsResult.error };
      const claimTopicsAddress = claimTopicsResult.data!.address;
      txHashes.push(claimTopicsResult.data!.txHash);
      totalGasUsed += claimTopicsResult.data!.gasUsed;
      console.log(`    ✅ ClaimTopics: ${claimTopicsAddress}`);

      // 2.2: Deploy TrustedIssuersRegistry
      console.log('  2.2: Deploying TrustedIssuersRegistry...');
      const trustedIssuersResult = await this.deployContract('TrustedIssuersRegistry', []);
      if (!trustedIssuersResult.success) return { success: false, error: trustedIssuersResult.error };
      const trustedIssuersAddress = trustedIssuersResult.data!.address;
      txHashes.push(trustedIssuersResult.data!.txHash);
      totalGasUsed += trustedIssuersResult.data!.gasUsed;
      console.log(`    ✅ TrustedIssuers: ${trustedIssuersAddress}`);

      // 2.3: Deploy IdentityRegistry (with constructor args)
      console.log('  2.3: Deploying IdentityRegistry...');
      const identityRegistryResult = await this.deployContract('IdentityRegistry', [
        trustedIssuersAddress,
        claimTopicsAddress,
        storageAddress
      ]);
      if (!identityRegistryResult.success) return { success: false, error: identityRegistryResult.error };
      const identityRegistryAddress = identityRegistryResult.data!.address;
      txHashes.push(identityRegistryResult.data!.txHash);
      totalGasUsed += identityRegistryResult.data!.gasUsed;
      console.log(`    ✅ IdentityRegistry: ${identityRegistryAddress}`);

      // 2.4: Bind IdentityRegistry to Storage
      console.log('  2.4: Binding IdentityRegistry to Storage...');
      const bindStorageResult = await this.writeToContract(
        storageAddress,
        'IdentityRegistryStorage',
        'bindIdentityRegistry',
        [identityRegistryAddress]
      );
      if (!bindStorageResult.success) {
        return { success: false, error: `Failed to bind storage: ${bindStorageResult.error}` };
      }
      txHashes.push(bindStorageResult.data!.txHash);
      totalGasUsed += bindStorageResult.data!.gasUsed;
      console.log('    ✅ IdentityRegistry bound successfully');

      // ============================================================
      // PHASE 3: COMPLIANCE SYSTEM DEPLOYMENT
      // ============================================================
      console.log('\n🛡️  PHASE 3: Compliance System Deployment');

      // 3.1: Deploy ModularCompliance
      console.log('  3.1: Deploying ModularCompliance...');
      const complianceResult = await this.deployContract('ModularCompliance', []);
      if (!complianceResult.success) return { success: false, error: complianceResult.error };
      const complianceAddress = complianceResult.data!.address;
      txHashes.push(complianceResult.data!.txHash);
      totalGasUsed += complianceResult.data!.gasUsed;
      console.log(`    ✅ Compliance: ${complianceAddress}`);

      // 3.2: Deploy TimeRestrictionsModule
      console.log('  3.2: Deploying TimeRestrictionsModule...');
      const timeModuleResult = await this.deployContract('TimeRestrictionsModule', []);
      if (!timeModuleResult.success) return { success: false, error: timeModuleResult.error };
      const timeModuleAddress = timeModuleResult.data!.address;
      txHashes.push(timeModuleResult.data!.txHash);
      totalGasUsed += timeModuleResult.data!.gasUsed;
      console.log(`    ✅ TimeModule: ${timeModuleAddress}`);

      // 3.3: Deploy CountryRestrictionsModule (with compliance address)
      console.log('  3.3: Deploying CountryRestrictionsModule...');
      const countryModuleResult = await this.deployContract('CountryRestrictionsModule', [complianceAddress]);
      if (!countryModuleResult.success) return { success: false, error: countryModuleResult.error };
      const countryModuleAddress = countryModuleResult.data!.address;
      txHashes.push(countryModuleResult.data!.txHash);
      totalGasUsed += countryModuleResult.data!.gasUsed;
      console.log(`    ✅ CountryModule: ${countryModuleAddress}`);

      // 3.4: Deploy MaxBalanceModule (with compliance address)
      console.log('  3.4: Deploying MaxBalanceModule...');
      const maxBalanceModuleResult = await this.deployContract('MaxBalanceModule', [complianceAddress]);
      if (!maxBalanceModuleResult.success) return { success: false, error: maxBalanceModuleResult.error };
      const maxBalanceModuleAddress = maxBalanceModuleResult.data!.address;
      txHashes.push(maxBalanceModuleResult.data!.txHash);
      totalGasUsed += maxBalanceModuleResult.data!.gasUsed;
      console.log(`    ✅ MaxBalanceModule: ${maxBalanceModuleAddress}`);

      // 3.5: Deploy MaxHoldersModule (with compliance address)
      console.log('  3.5: Deploying MaxHoldersModule...');
      const maxHoldersModuleResult = await this.deployContract('MaxHoldersModule', [complianceAddress]);
      if (!maxHoldersModuleResult.success) return { success: false, error: maxHoldersModuleResult.error };
      const maxHoldersModuleAddress = maxHoldersModuleResult.data!.address;
      txHashes.push(maxHoldersModuleResult.data!.txHash);
      totalGasUsed += maxHoldersModuleResult.data!.gasUsed;
      console.log(`    ✅ MaxHoldersModule: ${maxHoldersModuleAddress}`);

      // 3.6: Bind TimeRestrictions Module to Compliance
      console.log('  3.6: Binding TimeRestrictions Module...');
      const bindTimeResult = await this.writeToContract(
        timeModuleAddress,
        'TimeRestrictionsModule',
        'bindCompliance',
        [complianceAddress]
      );
      if (!bindTimeResult.success) {
        return { success: false, error: `Failed to bind TimeRestrictions: ${bindTimeResult.error}` };
      }
      txHashes.push(bindTimeResult.data!.txHash);
      totalGasUsed += bindTimeResult.data!.gasUsed;
      console.log('    ✅ TimeRestrictions bound successfully');

      // ============================================================
      // PHASE 4: TOKEN DEPLOYMENT
      // ============================================================
      console.log('\n🪙  PHASE 4: Token Deployment');

      console.log(`  4.1: Deploying ${tokenParams.name} (${tokenParams.symbol})...`);
      const tokenResult = await this.deployContract('TREXToken', [
        tokenParams.name,
        tokenParams.symbol,
        tokenParams.decimals,
        identityRegistryAddress,
        complianceAddress,
        tokenParams.owner
      ]);
      if (!tokenResult.success) return { success: false, error: tokenResult.error };
      const tokenAddress = tokenResult.data!.address;
      txHashes.push(tokenResult.data!.txHash);
      totalGasUsed += tokenResult.data!.gasUsed;
      console.log(`    ✅ Token: ${tokenAddress}`);
      console.log(`    Name: ${tokenParams.name}`);
      console.log(`    Symbol: ${tokenParams.symbol}`);
      console.log(`    Decimals: ${tokenParams.decimals}`);
      console.log(`    Owner: ${tokenParams.owner}`);

      // ============================================================
      // PHASE 5: MODULE CONFIGURATION
      // ============================================================
      console.log('\n⚙️  PHASE 5: Module Configuration');

      // 5.1: Configure MaxBalance Module
      console.log('  5.1: Configuring MaxBalance Module...');
      const bindMaxBalanceResult = await this.writeToContract(
        maxBalanceModuleAddress,
        'MaxBalanceModule',
        'bindToken',
        [tokenAddress]
      );
      if (!bindMaxBalanceResult.success) {
        return { success: false, error: `Failed to bind MaxBalance token: ${bindMaxBalanceResult.error}` };
      }
      txHashes.push(bindMaxBalanceResult.data!.txHash);
      totalGasUsed += bindMaxBalanceResult.data!.gasUsed;

      const setMaxBalanceResult = await this.writeToContract(
        maxBalanceModuleAddress,
        'MaxBalanceModule',
        'setMaxBalance',
        [tokenParams.maxBalance]
      );
      if (!setMaxBalanceResult.success) {
        return { success: false, error: `Failed to set max balance: ${setMaxBalanceResult.error}` };
      }
      txHashes.push(setMaxBalanceResult.data!.txHash);
      totalGasUsed += setMaxBalanceResult.data!.gasUsed;
      console.log(`    ✅ MaxBalance set to ${tokenParams.maxBalance.toString()}`);

      // 5.2: Configure Country Restrictions Module
      console.log('  5.2: Configuring Country Restrictions...');
      for (const countryCode of tokenParams.countryRestrictions) {
        const whitelistResult = await this.writeToContract(
          countryModuleAddress,
          'CountryRestrictionsModule',
          'whitelistCountry',
          [countryCode]
        );
        if (!whitelistResult.success) {
          return { success: false, error: `Failed to whitelist country ${countryCode}: ${whitelistResult.error}` };
        }
        txHashes.push(whitelistResult.data!.txHash);
        totalGasUsed += whitelistResult.data!.gasUsed;
        console.log(`    ✅ Whitelisted country: ${countryCode}`);
      }

      const bindCountryResult = await this.writeToContract(
        countryModuleAddress,
        'CountryRestrictionsModule',
        'bindToken',
        [tokenAddress]
      );
      if (!bindCountryResult.success) {
        return { success: false, error: `Failed to bind Country token: ${bindCountryResult.error}` };
      }
      txHashes.push(bindCountryResult.data!.txHash);
      totalGasUsed += bindCountryResult.data!.gasUsed;
      console.log('    ✅ CountryRestrictions bound successfully');

      // 5.3: Configure MaxHolders Module
      console.log('  5.3: Configuring MaxHolders Module...');
      const bindMaxHoldersResult = await this.writeToContract(
        maxHoldersModuleAddress,
        'MaxHoldersModule',
        'bindToken',
        [tokenAddress]
      );
      if (!bindMaxHoldersResult.success) {
        return { success: false, error: `Failed to bind MaxHolders token: ${bindMaxHoldersResult.error}` };
      }
      txHashes.push(bindMaxHoldersResult.data!.txHash);
      totalGasUsed += bindMaxHoldersResult.data!.gasUsed;

      const setHolderLimitResult = await this.writeToContract(
        maxHoldersModuleAddress,
        'MaxHoldersModule',
        'setHolderLimit',
        [tokenParams.maxHolders]
      );
      if (!setHolderLimitResult.success) {
        return { success: false, error: `Failed to set holder limit: ${setHolderLimitResult.error}` };
      }
      txHashes.push(setHolderLimitResult.data!.txHash);
      totalGasUsed += setHolderLimitResult.data!.gasUsed;
      console.log(`    ✅ MaxHolders set to ${tokenParams.maxHolders}`);

      // 5.4: Bind Token to Compliance (CRITICAL: Must happen before adding modules)
      console.log('  5.4: Binding Token to Compliance...');
      const bindTokenResult = await this.writeToContract(
        complianceAddress,
        'ModularCompliance',
        'bindToken',
        [tokenAddress]
      );
      if (!bindTokenResult.success) {
        return { success: false, error: `Failed to bind token to compliance: ${bindTokenResult.error}` };
      }
      txHashes.push(bindTokenResult.data!.txHash);
      totalGasUsed += bindTokenResult.data!.gasUsed;
      console.log('    ✅ Token bound to compliance');

      // 5.5: Add Modules to Compliance
      console.log('  5.5: Adding Modules to Compliance...');
      const modulesToAdd = [
        timeModuleAddress,
        countryModuleAddress,
        maxBalanceModuleAddress,
        maxHoldersModuleAddress
      ];

      for (const moduleAddress of modulesToAdd) {
        const addModuleResult = await this.writeToContract(
          complianceAddress,
          'ModularCompliance',
          'addModule',
          [moduleAddress]
        );
        if (!addModuleResult.success) {
          return { success: false, error: `Failed to add module ${moduleAddress}: ${addModuleResult.error}` };
        }
        txHashes.push(addModuleResult.data!.txHash);
        totalGasUsed += addModuleResult.data!.gasUsed;
      }
      console.log('    ✅ All modules added successfully');

      // ============================================================
      // PHASE 6: INVESTOR ONBOARDING (Optional)
      // ============================================================
      if (investors && investors.length > 0) {
        console.log('\n👥 PHASE 6: Investor Onboarding');
        console.log(`  Onboarding ${investors.length} investors...`);

        for (let i = 0; i < investors.length; i++) {
          const investor = investors[i];
          if (!investor) continue;
          
          console.log(`  6.${i + 1}: Processing ${investor.address}...`);

          // 6.1: Create Identity
          const salt = keccak256(
            encodePacked(
              ['address', 'uint256', 'uint256'],
              [investor.address, BigInt(Date.now()), BigInt(i)]
            )
          );

          const createIdentityResult = await this.writeToContract(
            factoryAddress,
            'IdentityFactory',
            'createIdentity',
            [investor.address, salt]
          );
          if (!createIdentityResult.success) {
            console.warn(`    ⚠️  Failed to create identity for ${investor.address}: ${createIdentityResult.error}`);
            continue;
          }
          txHashes.push(createIdentityResult.data!.txHash);
          totalGasUsed += createIdentityResult.data!.gasUsed;

          // Extract identity address from logs
          // IdentityCreated event: (address indexed identity, address indexed owner, bytes32 indexed salt)
          // topics[0] = event signature, topics[1] = identity, topics[2] = owner, topics[3] = salt
          const receipt = createIdentityResult.data!.receipt;
          const identityFactoryAbi = getContractABI('IdentityFactory');
          
          // Find the IdentityCreated event
          const identityCreatedLog = receipt?.logs.find((log: any) => {
            // Event signature for IdentityCreated(address,address,bytes32)
            const eventSig = '0x' + keccak256(
              encodePacked(['string'], ['IdentityCreated(address,address,bytes32)'])
            ).slice(2);
            return log.topics[0] === eventSig;
          });
          
          if (!identityCreatedLog) {
            console.warn(`    ⚠️  Failed to find IdentityCreated event for ${investor.address}`);
            continue;
          }
          
          // Identity address is in topics[1] (first indexed parameter)
          const investorIdentityAddress = ('0x' + identityCreatedLog.topics[1].slice(26)) as Address;

          // 6.2: Register Identity
          const registerResult = await this.writeToContract(
            identityRegistryAddress,
            'IdentityRegistry',
            'registerIdentity',
            [investor.address, investorIdentityAddress, investor.countryCode]
          );
          if (!registerResult.success) {
            console.warn(`    ⚠️  Failed to register identity: ${registerResult.error}`);
            continue;
          }
          txHashes.push(registerResult.data!.txHash);
          totalGasUsed += registerResult.data!.gasUsed;

          // 6.3: Mint Tokens
          const mintResult = await this.writeToContract(
            tokenAddress,
            'TREXToken',
            'mint',
            [investor.address, investor.amount]
          );
          if (!mintResult.success) {
            console.warn(`    ⚠️  Failed to mint tokens: ${mintResult.error}`);
            continue;
          }
          txHashes.push(mintResult.data!.txHash);
          totalGasUsed += mintResult.data!.gasUsed;

          console.log(`    ✅ Onboarded: ${investor.address} with ${investor.amount.toString()} tokens`);
        }

        console.log(`  ✅ Batch investor onboarding complete: ${investors.length} investors`);
      }

      // ============================================================
      // DEPLOYMENT COMPLETE
      // ============================================================
      console.log('\n================================================');
      console.log('✅ T-REX Deployment Complete!');
      console.log(`Total Gas Used: ${totalGasUsed.toString()}`);
      console.log(`Total Transactions: ${txHashes.length}`);
      console.log('================================================\n');

      return {
        success: true,
        data: {
          authorityAddress,
          identityStorageAddress: storageAddress,
          identityFactoryAddress: factoryAddress,
          claimTopicsRegistryAddress: claimTopicsAddress,
          trustedIssuersRegistryAddress: trustedIssuersAddress,
          identityRegistryAddress,
          complianceAddress,
          timeRestrictionsModuleAddress: timeModuleAddress,
          countryRestrictionsModuleAddress: countryModuleAddress,
          maxBalanceModuleAddress,
          maxHoldersModuleAddress,
          tokenAddress,
          deploymentTimestamp: new Date(),
          totalGasUsed,
          transactionHashes: txHashes
        }
      };

    } catch (error) {
      console.error('❌ Deployment failed:', error);
      return {
        success: false,
        error: `Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Write to a deployed contract with explicit ABI
   */
  private async writeToContract(
    contractAddress: Address,
    contractName: string,
    functionName: string,
    args: any[]
  ): Promise<{ success: boolean; data?: { txHash: Hex; gasUsed: bigint; receipt: any }; error?: string }> {
    try {
      const abi = getContractABI(contractName);
      const walletClient = (this.contractsService as any).walletClient;
      const publicClient = (this.contractsService as any).publicClient;
      
      if (!walletClient) {
        return { success: false, error: 'Wallet client not initialized' };
      }

      // Write to contract
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi,
        functionName,
        args,
      });

      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'reverted') {
        return { success: false, error: 'Transaction reverted' };
      }

      return {
        success: true,
        data: {
          txHash: hash,
          gasUsed: receipt.gasUsed,
          receipt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Contract write failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Deploy a single contract using Viem patterns
   * Implements: prepare → estimate gas → deploy → wait pattern
   */
  private async deployContract(
    contractName: string,
    constructorArgs: any[]
  ): Promise<{ success: boolean; data?: { address: Address; txHash: Hex; gasUsed: bigint }; error?: string }> {
    try {
      const bytecode = getContractBytecode(contractName);
      const abi = getContractABI(contractName);

      // Get wallet client from contracts service
      const walletClient = (this.contractsService as any).walletClient;
      const publicClient = (this.contractsService as any).publicClient;
      
      if (!walletClient) {
        return { success: false, error: 'Wallet client not initialized' };
      }

      // Deploy contract using Viem's deployContract
      const hash = await walletClient.deployContract({
        abi,
        bytecode,
        args: constructorArgs,
      });

      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'reverted') {
        return { success: false, error: 'Contract deployment reverted' };
      }

      if (!receipt.contractAddress) {
        return { success: false, error: 'No contract address in receipt' };
      }

      return {
        success: true,
        data: {
          address: receipt.contractAddress,
          txHash: hash,
          gasUsed: receipt.gasUsed
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Contract deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Store deployment data in database
   */
  async storeDeploymentData(
    propertyId: string | null,
    deployment: TREXDeploymentResult,
    tokenParams?: TokenDeploymentParams
  ): Promise<{ success: boolean; error?: string }> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Insert token record with complete data
      const tokenInsert = await client.query(
        `INSERT INTO public.tokens (
          contract_address, name, symbol, decimals, total_supply,
          identity_registry_contract, compliance_contract, owner_address,
          deployed_tx_hash, deployed_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id`,
        [
          deployment.tokenAddress,
          tokenParams?.name || 'Farsquare Token',
          tokenParams?.symbol || 'FSQ',
          tokenParams?.decimals || 18,
          tokenParams?.totalSupply || 0, // total_supply - will be updated as tokens are minted
          deployment.identityRegistryAddress,
          deployment.complianceAddress,
          tokenParams?.owner || '',
          String(deployment.transactionHashes[0]),
          deployment.deploymentTimestamp,
          deployment.deploymentTimestamp
        ]
      );

      const tokenId = tokenInsert.rows[0].id;

      // Insert suite record (generate salt from deployment timestamp)
      const saltHash = keccak256(
        encodePacked(
          ['address', 'uint256'],
          [deployment.tokenAddress, BigInt(deployment.deploymentTimestamp.getTime())]
        )
      );
      // Truncate to fit varchar(64) - take first 64 chars
      const salt = saltHash.slice(0, 64);
      
      await client.query(
        `INSERT INTO public.suites (
          salt, token_id, authority_contract, identity_factory_contract,
          identity_registry_contract, identity_storage_contract,
          claim_topics_registry_contract, trusted_issuers_registry_contract,
          compliance_contract, time_restriction_module_contract,
          country_restriction_module_contract, max_balance_module_contract,
          max_holders_module_contract, deployed_at, deployed_by, deployed_tx_hash,
          token_name, token_symbol, initial_supply
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [
          salt,
          tokenId,
          deployment.authorityAddress,
          deployment.identityFactoryAddress,
          deployment.identityRegistryAddress,
          deployment.identityStorageAddress,
          deployment.claimTopicsRegistryAddress,
          deployment.trustedIssuersRegistryAddress,
          deployment.complianceAddress,
          deployment.timeRestrictionsModuleAddress,
          deployment.countryRestrictionsModuleAddress,
          deployment.maxBalanceModuleAddress,
          deployment.maxHoldersModuleAddress,
          deployment.deploymentTimestamp,
          tokenParams?.owner || '',
          String(deployment.transactionHashes[0]),
          tokenParams?.name || 'Unknown Token',
          tokenParams?.symbol || 'TKN',
          0 // initial_supply
        ]
      );

      // Link to property if propertyId provided
      if (propertyId) {
        await client.query(
          `INSERT INTO public.property_tokens 
          (property_id, token_address, identity_registry, compliance, 
           status, tx_hash, deployed_at, deployer_address, network, error)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *`,
        [
          propertyId,
          deployment.tokenAddress,
          deployment.identityFactoryAddress,
          deployment.complianceAddress,
          'deployed',
          String(deployment.transactionHashes[0]),
          deployment.deploymentTimestamp,
          tokenParams?.owner || '',
          'devnet', //deployment.network || 'devnet',
          'false' //deployment.error || 'false'
        ]
        );
      }

      await client.query('COMMIT');
      
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: `Database storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    } finally {
      client.release();
    }
  }
}
