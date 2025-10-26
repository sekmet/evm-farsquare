#!/usr/bin/env bun

/**
 * Query Token Information Script
 * Retrieves comprehensive information about an ERC-3643 token
 * 
 * Usage: cd backend && TOKEN_ADDRESS=0x... bun run src/scripts/query-token.ts
 */

import { createPublicClient, http, formatEther } from 'viem';
import { foundry } from 'viem/chains';
import { readFileSync } from 'fs';
import { join } from 'path';

const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS as `0x${string}`;
const INVESTOR_ADDRESS = process.env.INVESTOR_ADDRESS as `0x${string}` | undefined;

// Load ABIs
const tokenArtifact = JSON.parse(readFileSync(join(process.cwd(), '../artifacts/contracts/erc3643/token/TREXToken.sol/TREXToken.json'), 'utf-8'));
const TREX_TOKEN_ABI = tokenArtifact.abi;

async function main() {
  if (!TOKEN_ADDRESS) {
    console.error('❌ Missing TOKEN_ADDRESS');
    console.error('Usage: TOKEN_ADDRESS=0x... bun run src/scripts/query-token.ts');
    process.exit(1);
  }

  console.log('🔍 Token Query Script');
  console.log('=====================\n');

  const publicClient = createPublicClient({
    chain: foundry,
    transport: http(RPC_URL),
  });

  console.log(`Token: ${TOKEN_ADDRESS}\n`);

  // Basic info
  const [name, symbol, decimals, totalSupply] = await Promise.all([
    publicClient.readContract({ address: TOKEN_ADDRESS, abi: TREX_TOKEN_ABI, functionName: 'name' }),
    publicClient.readContract({ address: TOKEN_ADDRESS, abi: TREX_TOKEN_ABI, functionName: 'symbol' }),
    publicClient.readContract({ address: TOKEN_ADDRESS, abi: TREX_TOKEN_ABI, functionName: 'decimals' }),
    publicClient.readContract({ address: TOKEN_ADDRESS, abi: TREX_TOKEN_ABI, functionName: 'totalSupply' }),
  ]);

  console.log('📊 Token Information');
  console.log('===================');
  console.log(`Name:        ${name}`);
  console.log(`Symbol:      ${symbol}`);
  console.log(`Decimals:    ${decimals}`);
  console.log(`Total Supply: ${formatEther(totalSupply as bigint)} tokens\n`);

  // Contract addresses
  const [identityRegistry, compliance, owner] = await Promise.all([
    publicClient.readContract({ address: TOKEN_ADDRESS, abi: TREX_TOKEN_ABI, functionName: 'identityRegistry' }),
    publicClient.readContract({ address: TOKEN_ADDRESS, abi: TREX_TOKEN_ABI, functionName: 'compliance' }),
    publicClient.readContract({ address: TOKEN_ADDRESS, abi: TREX_TOKEN_ABI, functionName: 'owner' }),
  ]);

  console.log('📜 Contract Addresses');
  console.log('====================');
  console.log(`Identity Registry: ${identityRegistry}`);
  console.log(`Compliance:        ${compliance}`);
  console.log(`Owner:             ${owner}\n`);

  // Investor-specific info
  if (INVESTOR_ADDRESS) {
    const balance = await publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi: TREX_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [INVESTOR_ADDRESS],
    }) as bigint;

    console.log('👤 Investor Information');
    console.log('======================');
    console.log(`Address: ${INVESTOR_ADDRESS}`);
    console.log(`Balance: ${formatEther(balance)} tokens\n`);
  }

  console.log('✅ Query Complete!');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
