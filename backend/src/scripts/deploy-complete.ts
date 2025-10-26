#!/usr/bin/env bun

/**
 * Complete T-REX Token Deployment Script
 * Deploys a complete ERC-3643 T-REX token suite to Anvil
 * 
 * Usage: cd backend && bun run src/scripts/deploy-complete.ts
 */

import { parseEther } from 'viem';
import { ERC3643ContractsService } from '../services/contracts.js';
import { TREXDeployerService } from '../services/trex-deployer.js';
import { Pool } from 'pg';

// Configuration from environment or defaults
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const PRIVATE_KEY = (process.env.DEPLOYER_PRIVATE_KEY || '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6') as `0x${string}`;
const DB_URL = process.env.DATABASE_URL || 'postgresql://localhost/evm_fsq_test';

// Token configuration
const TOKEN_NAME = process.env.TOKEN_NAME || 'Property Token';
const TOKEN_SYMBOL = process.env.TOKEN_SYMBOL || 'PROP';
const MAX_BALANCE = process.env.MAX_BALANCE || '100000';
const MAX_HOLDERS = parseInt(process.env.MAX_HOLDERS || '1000');

async function main() {
  console.log('🚀 Complete T-REX Token Deployment');
  console.log('===================================\n');

  // Initialize services
  const contractsService = new ERC3643ContractsService('devnet', RPC_URL, PRIVATE_KEY);
  const pool = new Pool({ connectionString: DB_URL, max: 10 });
  const deployerService = new TREXDeployerService(contractsService, pool);

  const deployerAddress = contractsService['account']?.address;
  if (!deployerAddress) {
    throw new Error('Failed to get deployer address');
  }

  console.log(`Network: ${RPC_URL}`);
  console.log(`Deployer: ${deployerAddress}\n`);

  // Token parameters
  const tokenParams = {
    name: TOKEN_NAME,
    symbol: TOKEN_SYMBOL,
    decimals: 18,
    owner: deployerAddress,
    countryRestrictions: [840, 826, 756], // USA, UK, Switzerland
    maxBalance: parseEther(MAX_BALANCE),
    maxHolders: MAX_HOLDERS,
  };

  // Optional test investors
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
  ];

  console.log('📦 Deploying...\n');
  const startTime = Date.now();
  
  const result = await deployerService.deployCompleteTREXSuite(tokenParams, investors);
  
  const duration = (Date.now() - startTime) / 1000;

  if (!result.success || !result.data) {
    console.error('\n❌ Deployment Failed');
    console.error(`Error: ${result.error}`);
    await pool.end();
    process.exit(1);
  }

  console.log('\n✅ Deployment Successful!');
  console.log('========================\n');
  console.log(`Duration: ${duration.toFixed(2)}s`);
  console.log(`Gas Used: ${result.data.totalGasUsed.toString()}`);
  console.log(`Transactions: ${result.data.transactionHashes.length}\n`);

  console.log('📜 Contract Addresses:');
  console.log('======================');
  console.log(`Token:             ${result.data.tokenAddress}`);
  console.log(`Identity Registry: ${result.data.identityRegistryAddress}`);
  console.log(`Compliance:        ${result.data.complianceAddress}`);
  console.log(`\nModules:`);
  console.log(`  Time:        ${result.data.timeRestrictionsModuleAddress}`);
  console.log(`  Country:     ${result.data.countryRestrictionsModuleAddress}`);
  console.log(`  MaxBalance:  ${result.data.maxBalanceModuleAddress}`);
  console.log(`  MaxHolders:  ${result.data.maxHoldersModuleAddress}\n`);

  console.log('💾 Save these addresses for subsequent operations!\n');
  
  await pool.end();
  console.log('✅ Complete!');
}

main().catch(async (error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
