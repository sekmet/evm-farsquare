/**
 * Hardhat 3.x Script: Complete T-REX ERC-3643 Token Deployment
 * Deploys all 12 contracts following DeployCompleteTREXv1.s.sol sequence
 * 
 * Usage: bun hardhat run scripts/01-deploy-complete-trex.ts --network localhost
 */

import hre from "hardhat";
import { parseEther, encodePacked, keccak256 } from "viem";

interface TokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  owner: `0x${string}`;
  countryRestrictions: number[];
  maxBalance: bigint;
  maxHolders: number;
}

interface InvestorConfig {
  address: `0x${string}`;
  countryCode: number;
  amount: bigint;
}

async function main() {
  console.log("🚀 T-REX Complete Deployment Script");
  console.log("====================================\n");

  // Connect to network using Hardhat 3.x pattern
  const networkConnection = await hre.network.connect();
  const [deployer] = await networkConnection.viem.getWalletClients();
  const publicClient = await networkConnection.viem.getPublicClient();
  console.log(`Deployer: ${deployer.account.address}`);
  console.log(`Network: localhost\n`);

  // ============================================================
  // CONFIGURATION
  // ============================================================
  
  const tokenConfig: TokenConfig = {
    name: "Prop Property Token",
    symbol: "PPT",
    decimals: 18,
    owner: deployer.account.address,
    countryRestrictions: [840, 826, 756], // USA, UK, Switzerland
    maxBalance: parseEther("100000"),
    maxHolders: 100
  };

  const investors: InvestorConfig[] = [
    {
      address: "0x87c90d095278a4df26418808c4F90c093b6070Dd",
      countryCode: 840,
      amount: parseEther("100")
    },
    {
      address: "0x27b5852Ba0660371513DDC8A279Cb40581E6F045",
      countryCode: 826,
      amount: parseEther("69")
    },
    {
      address: "0x96ee61bD724CE6592A5E507B20F6FA7eb9Cdd0b0",
      countryCode: 756,
      amount: parseEther("963")
    }
  ];

  const writeTxHashes: `0x${string}`[] = [];
  let totalGasUsed = 0n;
  let deploymentCount = 0;

  // ============================================================
  // PHASE 1: INFRASTRUCTURE DEPLOYMENT
  // ============================================================
  console.log("📦 PHASE 1: Infrastructure Deployment\n");

  console.log("  1.1: Deploying ImplementationAuthority...");
  const authority = await networkConnection.viem.deployContract("ImplementationAuthority", []);
  deploymentCount++;
  console.log(`    ✅ Authority: ${authority.address}`);

  console.log("  1.2: Deploying IdentityRegistryStorage...");
  const idStorage = await networkConnection.viem.deployContract("IdentityRegistryStorage", []);
  deploymentCount++;
  console.log(`    ✅ Storage: ${idStorage.address}`);

  console.log("  1.3: Deploying IdentityFactory...");
  const idFactory = await networkConnection.viem.deployContract("IdentityFactory", []);
  deploymentCount++;
  console.log(`    ✅ Factory: ${idFactory.address}`);

  // ============================================================
  // PHASE 2: REGISTRY DEPLOYMENT
  // ============================================================
  console.log("\n📋 PHASE 2: Registry Deployment\n");

  console.log("  2.1: Deploying ClaimTopicsRegistry...");
  const claimTopicsRegistry = await networkConnection.viem.deployContract("ClaimTopicsRegistry", []);
  deploymentCount++;
  console.log(`    ✅ ClaimTopics: ${claimTopicsRegistry.address}`);

  console.log("  2.2: Deploying TrustedIssuersRegistry...");
  const trustedIssuersRegistry = await networkConnection.viem.deployContract("TrustedIssuersRegistry", []);
  deploymentCount++;
  console.log(`    ✅ TrustedIssuers: ${trustedIssuersRegistry.address}`);

  console.log("  2.3: Deploying IdentityRegistry...");
  const identityRegistry = await networkConnection.viem.deployContract("IdentityRegistry", [
    trustedIssuersRegistry.address,
    claimTopicsRegistry.address,
    idStorage.address
  ]);
  deploymentCount++;
  console.log(`    ✅ IdentityRegistry: ${identityRegistry.address}`);

  console.log("  2.4: Binding IdentityRegistry to Storage...");
  const bindHash = await idStorage.write.bindIdentityRegistry([identityRegistry.address]);
  writeTxHashes.push(bindHash);
  const bindReceipt = await publicClient.waitForTransactionReceipt({ hash: bindHash });
  totalGasUsed += bindReceipt.gasUsed;
  console.log("    ✅ IdentityRegistry bound successfully");

  // ============================================================
  // PHASE 3: COMPLIANCE SYSTEM DEPLOYMENT
  // ============================================================
  console.log("\n🛡️  PHASE 3: Compliance System Deployment\n");

  console.log("  3.1: Deploying ModularCompliance...");
  const compliance = await networkConnection.viem.deployContract("ModularCompliance", []);
  deploymentCount++;
  console.log(`    ✅ Compliance: ${compliance.address}`);

  console.log("  3.2: Deploying TimeRestrictionsModule...");
  const timeModule = await networkConnection.viem.deployContract("TimeRestrictionsModule", []);
  deploymentCount++;
  console.log(`    ✅ TimeModule: ${timeModule.address}`);

  console.log("  3.3: Deploying CountryRestrictionsModule...");
  const countryModule = await networkConnection.viem.deployContract("CountryRestrictionsModule", [compliance.address]);
  deploymentCount++;
  console.log(`    ✅ CountryModule: ${countryModule.address}`);

  console.log("  3.4: Deploying MaxBalanceModule...");
  const maxBalanceModule = await networkConnection.viem.deployContract("MaxBalanceModule", [compliance.address]);
  deploymentCount++;
  console.log(`    ✅ MaxBalanceModule: ${maxBalanceModule.address}`);

  console.log("  3.5: Deploying MaxHoldersModule...");
  const maxHoldersModule = await networkConnection.viem.deployContract("MaxHoldersModule", [compliance.address]);
  deploymentCount++;
  console.log(`    ✅ MaxHoldersModule: ${maxHoldersModule.address}`);

  console.log("  3.6: Binding TimeRestrictions Module...");
  const bindTimeHash = await timeModule.write.bindCompliance([compliance.address]);
  writeTxHashes.push(bindTimeHash);
  const bindTimeReceipt = await publicClient.waitForTransactionReceipt({ hash: bindTimeHash });
  totalGasUsed += bindTimeReceipt.gasUsed;
  console.log("    ✅ TimeRestrictions bound successfully");

  // ============================================================
  // PHASE 4: TOKEN DEPLOYMENT
  // ============================================================
  console.log("\n🪙  PHASE 4: Token Deployment\n");

  console.log(`  4.1: Deploying ${tokenConfig.name} (${tokenConfig.symbol})...`);
  const token = await networkConnection.viem.deployContract("TREXToken", [
    tokenConfig.name,
    tokenConfig.symbol,
    tokenConfig.decimals,
    identityRegistry.address,
    compliance.address,
    tokenConfig.owner
  ]);
  deploymentCount++;
  console.log(`    ✅ Token: ${token.address}`);

  // ============================================================
  // PHASE 5: MODULE CONFIGURATION
  // ============================================================
  console.log("\n⚙️  PHASE 5: Module Configuration\n");

  console.log("  5.1: Configuring MaxBalance Module...");
  const bindMaxBalHash = await maxBalanceModule.write.bindToken([token.address]);
  writeTxHashes.push(bindMaxBalHash);
  await publicClient.waitForTransactionReceipt({ hash: bindMaxBalHash });
  const setMaxBalHash = await maxBalanceModule.write.setMaxBalance([tokenConfig.maxBalance]);
  writeTxHashes.push(setMaxBalHash);
  const maxBalReceipt = await publicClient.waitForTransactionReceipt({ hash: setMaxBalHash });
  totalGasUsed += maxBalReceipt.gasUsed;
  console.log(`    ✅ MaxBalance set to ${tokenConfig.maxBalance}`);

  console.log("  5.2: Configuring Country Restrictions...");
  for (const countryCode of tokenConfig.countryRestrictions) {
    const whitelistHash = await countryModule.write.whitelistCountry([countryCode]);
    writeTxHashes.push(whitelistHash);
    await publicClient.waitForTransactionReceipt({ hash: whitelistHash });
    console.log(`    ✅ Whitelisted country: ${countryCode}`);
  }
  const bindCountryHash = await countryModule.write.bindToken([token.address]);
  writeTxHashes.push(bindCountryHash);
  const countryReceipt = await publicClient.waitForTransactionReceipt({ hash: bindCountryHash });
  totalGasUsed += countryReceipt.gasUsed;
  console.log("    ✅ CountryRestrictions bound successfully");

  console.log("  5.3: Configuring MaxHolders Module...");
  const bindMaxHoldHash = await maxHoldersModule.write.bindToken([token.address]);
  writeTxHashes.push(bindMaxHoldHash);
  await publicClient.waitForTransactionReceipt({ hash: bindMaxHoldHash });
  const setMaxHoldHash = await maxHoldersModule.write.setHolderLimit([tokenConfig.maxHolders]);
  writeTxHashes.push(setMaxHoldHash);
  const maxHoldReceipt = await publicClient.waitForTransactionReceipt({ hash: setMaxHoldHash });
  totalGasUsed += maxHoldReceipt.gasUsed;
  console.log(`    ✅ MaxHolders set to ${tokenConfig.maxHolders}`);

  console.log("  5.4: Binding Token to Compliance...");
  const bindTokenHash = await compliance.write.bindToken([token.address]);
  writeTxHashes.push(bindTokenHash);
  await publicClient.waitForTransactionReceipt({ hash: bindTokenHash });
  console.log("    ✅ Token bound to compliance");

  console.log("  5.5: Adding Modules to Compliance...");
  await compliance.write.addModule([timeModule.address]);
  await compliance.write.addModule([countryModule.address]);
  await compliance.write.addModule([maxBalanceModule.address]);
  await compliance.write.addModule([maxHoldersModule.address]);
  console.log("    ✅ All modules added successfully");

  // ============================================================
  // PHASE 6: INVESTOR ONBOARDING
  // ============================================================
  console.log("\n👥 PHASE 6: Investor Onboarding\n");

  for (let i = 0; i < investors.length; i++) {
    const investor = investors[i];
    if (!investor) continue;

    console.log(`  6.${i + 1}: Processing ${investor.address}...`);

    // Create identity
    const salt = `0x${Date.now().toString(16).padStart(64, '0')}` as `0x${string}`;
    const createIdHash = await idFactory.write.createIdentity([investor.address, salt]);
    writeTxHashes.push(createIdHash);

    // Register identity
    const receipt = await publicClient.waitForTransactionReceipt({ hash: createIdHash });
    const identityAddress = receipt.logs[0]?.topics[1];
    if (!identityAddress) {
      console.error(`    ❌ Failed to get identity address for ${investor.address}`);
      continue;
    }

    const registerHash = await identityRegistry.write.registerIdentity([
      investor.address,
      identityAddress as `0x${string}`,
      investor.countryCode
    ]);
    writeTxHashes.push(registerHash);
    await publicClient.waitForTransactionReceipt({ hash: registerHash });

    // Mint tokens
    const mintHash = await token.write.mint([investor.address, investor.amount]);
    writeTxHashes.push(mintHash);
    const mintReceipt = await publicClient.waitForTransactionReceipt({ hash: mintHash });
    totalGasUsed += mintReceipt.gasUsed;

    console.log(`    ✅ Onboarded: ${investor.address} with ${investor.amount} tokens`);
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log("\n" + "=".repeat(50));
  console.log("✅ T-REX Deployment Complete!");
  console.log(`Deployments: ${deploymentCount} contracts`);
  console.log(`Write Transactions: ${writeTxHashes.length}`);
  console.log(`Total Gas Used (tracked): ${totalGasUsed}`);
  console.log("=".repeat(50) + "\n");

  console.log("📜 Contract Addresses:");
  console.log(`  Token: ${token.address}`);
  console.log(`  Identity Registry: ${identityRegistry.address}`);
  console.log(`  Compliance: ${compliance.address}`);
  console.log(`  Authority: ${authority.address}`);
  console.log(`  Identity Storage: ${idStorage.address}`);
  console.log(`  Identity Factory: ${idFactory.address}`);
  console.log("\n  Modules:");
  console.log(`    - Time: ${timeModule.address}`);
  console.log(`    - Country: ${countryModule.address}`);
  console.log(`    - MaxBalance: ${maxBalanceModule.address}`);
  console.log(`    - MaxHolders: ${maxHoldersModule.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
