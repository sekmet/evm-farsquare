#!/usr/bin/env bun

/**
 * Standalone T-REX Deployment Script (Using Viem Directly)
 * This uses the same proven patterns as backend/src/services/trex-deployer.ts
 * 
 * Usage: bun run scripts/deploy-trex-standalone.ts
 */

import { parseEther } from 'viem';
import { ERC3643ContractsService } from '../backend/src/services/contracts.js';
import { TREXDeployerService } from '../backend/src/services/trex-deployer.js';
import type { TokenDeploymentParams } from '../backend/src/services/trex-deployer.js';
import { Pool } from 'pg';

// Configuration
const ANVIL_RPC = 'http://127.0.0.1:8545';
const PRIVATE_KEY = '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6' as `0x${string}`;

async function main() {
  console.log('🚀 Standalone T-REX Deployment Script');
  console.log('=====================================\n');

  // Initialize services
  const contractsService = new ERC3643ContractsService('devnet', ANVIL_RPC, PRIVATE_KEY);
  
  // Initialize database pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost/evm_fsq_test',
    max: 10,
  });

  const deployer = new TREXDeployerService(contractsService, pool);

  // Get deployer address
  const deployerAddress = contractsService['account']?.address;
  if (!deployerAddress) {
    throw new Error('Failed to get deployer address');
  }

  console.log(`Deployer: ${deployerAddress}`);
  console.log(`Network: Anvil (localhost:8545)\n`);

  // Token configuration
  const tokenParams: TokenDeploymentParams = {
    name: 'Standalone Property Token',
    symbol: 'SPT',
    decimals: 18,
    owner: deployerAddress,
    countryRestrictions: [840, 826, 756], // USA, UK, Switzerland
    maxBalance: parseEther('100000'),
    maxHolders: 1000,
  };

  // Optional investors
  const investors = [
    {
      address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as `0x${string}`,
      countryCode: 840,
      amount: parseEther('1000'),
    },
    {
      address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' as `0x${string}`,
      countryCode: 826,
      amount: parseEther('2000'),
    },
    {
      address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906' as `0x${string}`,
      countryCode: 756,
      amount: parseEther('3000'),
    },
  ];

  console.log('📦 Starting Complete T-REX Deployment...\n');
  
  const startTime = Date.now();
  const result = await deployer.deployCompleteTREXSuite(tokenParams, investors);
  const duration = (Date.now() - startTime) / 1000;

  if (!result.success || !result.data) {
    console.error('\n❌ Deployment Failed!');
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }

  console.log('\n✅ Deployment Successful!');
  console.log('=======================\n');
  console.log(`⏱️  Duration: ${duration.toFixed(2)}s`);
  console.log(`⛽ Total Gas: ${result.data.totalGasUsed.toString()}`);
  console.log(`📝 Transactions: ${result.data.transactionHashes.length}\n`);

  console.log('📜 Deployed Contracts:');
  console.log('=====================');
  console.log(`Token:              ${result.data.tokenAddress}`);
  console.log(`Identity Registry:  ${result.data.identityRegistryAddress}`);
  console.log(`Compliance:         ${result.data.complianceAddress}`);
  console.log(`Authority:          ${result.data.authorityAddress}`);
  console.log(`Identity Storage:   ${result.data.identityStorageAddress}`);
  console.log(`Identity Factory:   ${result.data.identityFactoryAddress}`);
  console.log(`\nModules:`);
  console.log(`  Time Restrictions:    ${result.data.timeRestrictionsModuleAddress}`);
  console.log(`  Country Restrictions: ${result.data.countryRestrictionsModuleAddress}`);
  console.log(`  Max Balance:          ${result.data.maxBalanceModuleAddress}`);
  console.log(`  Max Holders:          ${result.data.maxHoldersModuleAddress}`);

  console.log('\n✅ Script Complete!');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
