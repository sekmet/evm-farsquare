/**
 * Hardhat 3.x Script: Query Token Information
 * Read token data, balances, compliance status
 * 
 * Usage: bun hardhat run scripts/05-query-token-info.ts --network localhost
 */

import hre from "hardhat";

const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS as `0x${string}` || "0x..." as `0x${string}`;
const COMPLIANCE_ADDRESS = process.env.COMPLIANCE_ADDRESS as `0x${string}` || "0x..." as `0x${string}`;
const IDENTITY_REGISTRY = process.env.IDENTITY_REGISTRY as `0x${string}` || "0x..." as `0x${string}`;

async function main() {
  console.log("📊 Token Information Query");
  console.log("==========================\n");

  const [deployer] = await hre.viem.getWalletClients();
  console.log(`Querying as: ${deployer.account.address}\n`);

  // Get contracts
  const token = await hre.viem.getContractAt("TREXToken", TOKEN_ADDRESS);
  const compliance = await hre.viem.getContractAt("ModularCompliance", COMPLIANCE_ADDRESS);
  const identityRegistry = await hre.viem.getContractAt("IdentityRegistry", IDENTITY_REGISTRY);

  // ============================================================
  // TOKEN INFORMATION
  // ============================================================
  console.log("🪙 Token Details");
  console.log("================\n");

  const name = await token.read.name();
  const symbol = await token.read.symbol();
  const decimals = await token.read.decimals();
  const totalSupply = await token.read.totalSupply();
  const owner = await token.read.owner();
  const paused = await token.read.paused();

  console.log(`Name: ${name}`);
  console.log(`Symbol: ${symbol}`);
  console.log(`Decimals: ${decimals}`);
  console.log(`Total Supply: ${totalSupply}`);
  console.log(`Owner: ${owner}`);
  console.log(`Paused: ${paused}\n`);

  // ============================================================
  // COMPLIANCE INFORMATION
  // ============================================================
  console.log("🛡️  Compliance Status");
  console.log("====================\n");

  const modules = await compliance.read.getModules();
  console.log(`Active Modules (${modules.length}):`);
  for (const module of modules) {
    console.log(`  - ${module}`);
  }
  console.log();

  // ============================================================
  // INVESTOR INFORMATION
  // ============================================================
  console.log("👥 Investor Information");
  console.log("=======================\n");

  const investors = [
    "0x87c90d095278a4df26418808c4F90c093b6070Dd" as `0x${string}`,
    "0x27b5852Ba0660371513DDC8A279Cb40581E6F045" as `0x${string}`,
    "0x96ee61bD724CE6592A5E507B20F6FA7eb9Cdd0b0" as `0x${string}`
  ];

  for (const investor of investors) {
    console.log(`Investor: ${investor}`);
    
    // Get balance
    const balance = await token.read.balanceOf([investor]);
    console.log(`  Balance: ${balance}`);
    
    // Check if verified
    const isVerified = await identityRegistry.read.isVerified([investor]);
    console.log(`  Verified: ${isVerified}`);
    
    // Get identity
    const identity = await identityRegistry.read.identity([investor]);
    console.log(`  Identity: ${identity}`);
    
    // Check if investor can transfer
    const canTransfer = await token.read.canTransfer([investor, deployer.account.address, balance]);
    console.log(`  Can Transfer: ${canTransfer}\n`);
  }

  // ============================================================
  // TRANSFER COMPLIANCE CHECK
  // ============================================================
  console.log("✅ Transfer Compliance Check");
  console.log("============================\n");

  const from = investors[0];
  const to = investors[1];
  const amount = BigInt("1000000000000000000"); // 1 token

  if (!from || !to) {
    console.log("Investors not defined");
    return;
  }

  console.log(`From: ${from}`);
  console.log(`To: ${to}`);
  console.log(`Amount: ${amount}\n`);

  const canTransfer = await token.read.canTransfer([from, to, amount]);
  console.log(`Transfer Allowed: ${canTransfer}`);

  if (!canTransfer) {
    console.log("\n⚠️  Transfer would fail compliance checks");
  }

  console.log("\n✅ Query complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
