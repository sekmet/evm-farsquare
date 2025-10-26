/**
 * Hardhat 3.x Script: Onboard Investor
 * Complete investor onboarding: create identity, register, and mint tokens
 * 
 * Usage: bun hardhat run scripts/03-onboard-investor.ts --network localhost
 */

import hre from "hardhat";
import { parseEther, keccak256, encodePacked } from "viem";

// Configuration
const IDENTITY_FACTORY = process.env.IDENTITY_FACTORY as `0x${string}` || "0x..." as `0x${string}`;
const IDENTITY_REGISTRY = process.env.IDENTITY_REGISTRY as `0x${string}` || "0x..." as `0x${string}`;
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS as `0x${string}` || "0x..." as `0x${string}`;

async function main() {
  console.log("👤 Investor Onboarding Script");
  console.log("==============================\n");

  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  
  console.log(`Deployer: ${deployer.account.address}\n`);

  // Get contracts
  const idFactory = await hre.viem.getContractAt("IdentityFactory", IDENTITY_FACTORY);
  const identityRegistry = await hre.viem.getContractAt("IdentityRegistry", IDENTITY_REGISTRY);
  const token = await hre.viem.getContractAt("TREXToken", TOKEN_ADDRESS);

  // Investor configuration
  const investor = {
    address: "0x87c90d095278a4df26418808c4F90c093b6070Dd" as `0x${string}`,
    countryCode: 840, // USA
    amount: parseEther("1000")
  };

  console.log(`Onboarding investor: ${investor.address}`);
  console.log(`Country: ${investor.countryCode}`);
  console.log(`Amount: ${investor.amount}\n`);

  // Step 1: Create identity
  console.log("Step 1: Creating identity...");
  const salt = keccak256(
    encodePacked(
      ['address', 'uint256'],
      [investor.address, BigInt(Date.now())]
    )
  );
  
  const createHash = await idFactory.write.createIdentity([investor.address, salt]);
  const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash });
  console.log(`  ✅ Identity created! TX: ${createHash}`);

  // Extract identity address from logs
  const identityCreatedLog = createReceipt.logs.find((log) => {
    const eventSig = keccak256(
      encodePacked(['string'], ['IdentityCreated(address,address,bytes32)'])
    );
    return log.topics[0] === eventSig;
  });

  if (!identityCreatedLog || !identityCreatedLog.topics[1]) {
    throw new Error("Failed to find identity address in logs");
  }

  const identityAddress = ('0x' + identityCreatedLog.topics[1].slice(26)) as `0x${string}`;
  console.log(`  📋 Identity address: ${identityAddress}\n`);

  // Step 2: Register identity
  console.log("Step 2: Registering identity...");
  const registerHash = await identityRegistry.write.registerIdentity([
    investor.address,
    identityAddress,
    investor.countryCode
  ]);
  await publicClient.waitForTransactionReceipt({ hash: registerHash });
  console.log(`  ✅ Identity registered! TX: ${registerHash}\n`);

  // Step 3: Mint tokens
  console.log("Step 3: Minting tokens...");
  const mintHash = await token.write.mint([investor.address, investor.amount]);
  await publicClient.waitForTransactionReceipt({ hash: mintHash });
  console.log(`  ✅ Tokens minted! TX: ${mintHash}\n`);

  // Verify
  const balance = await token.read.balanceOf([investor.address]);
  const identity = await identityRegistry.read.identity([investor.address]);
  const isVerified = await identityRegistry.read.isVerified([investor.address]);

  console.log("✅ Onboarding Complete!");
  console.log("=======================");
  console.log(`Identity: ${identity}`);
  console.log(`Verified: ${isVerified}`);
  console.log(`Balance: ${balance}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
