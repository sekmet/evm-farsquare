#!/usr/bin/env bun

/**
 * Mint Tokens Script
 * Mints ERC-3643 tokens to verified investors
 * 
 * Usage: cd backend && TOKEN_ADDRESS=0x... INVESTOR_ADDRESS=0x... AMOUNT=1000 bun run src/scripts/mint-tokens.ts
 */

import { parseEther, createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import { readFileSync } from 'fs';
import { join } from 'path';

const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const PRIVATE_KEY = (process.env.DEPLOYER_PRIVATE_KEY || '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6') as `0x${string}`;
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS as `0x${string}`;
const INVESTOR_ADDRESS = process.env.INVESTOR_ADDRESS as `0x${string}`;
const AMOUNT = process.env.AMOUNT || '1000';

// Load TREXToken ABI
const artifactPath = join(process.cwd(), '../artifacts/contracts/erc3643/token/TREXToken.sol/TREXToken.json');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf-8'));
const TREX_TOKEN_ABI = artifact.abi;

async function main() {
  if (!TOKEN_ADDRESS || !INVESTOR_ADDRESS) {
    console.error('❌ Missing required environment variables');
    console.error('Usage: TOKEN_ADDRESS=0x... INVESTOR_ADDRESS=0x... AMOUNT=1000 bun run src/scripts/mint-tokens.ts');
    process.exit(1);
  }

  console.log('🪙 Mint Tokens Script');
  console.log('=====================\n');

  const account = privateKeyToAccount(PRIVATE_KEY);
  
  const walletClient = createWalletClient({
    account,
    chain: foundry,
    transport: http(RPC_URL),
  });

  const publicClient = createPublicClient({
    chain: foundry,
    transport: http(RPC_URL),
  });

  console.log(`Token: ${TOKEN_ADDRESS}`);
  console.log(`Investor: ${INVESTOR_ADDRESS}`);
  console.log(`Amount: ${AMOUNT} tokens\n`);

  const amount = parseEther(AMOUNT);

  console.log('📝 Minting tokens...');
  const hash = await walletClient.writeContract({
    address: TOKEN_ADDRESS,
    abi: TREX_TOKEN_ABI,
    functionName: 'mint',
    args: [INVESTOR_ADDRESS, amount],
  });

  console.log(`Transaction: ${hash}`);
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`✅ Minted in block ${receipt.blockNumber}`);
  console.log(`Gas used: ${receipt.gasUsed.toString()}\n`);

  // Check balance
  const balance = await publicClient.readContract({
    address: TOKEN_ADDRESS,
    abi: TREX_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [INVESTOR_ADDRESS],
  }) as bigint;

  console.log(`New balance: ${balance.toString()} wei (${Number(balance) / 1e18} tokens)`);
  console.log('\n✅ Complete!');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
