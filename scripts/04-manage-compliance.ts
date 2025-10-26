/**
 * Hardhat 3.x Script: Manage Compliance
 * Add/remove compliance modules and update restrictions
 * 
 * Usage: bun hardhat run scripts/04-manage-compliance.ts --network localhost
 */

import hre from "hardhat";
import { parseEther } from "viem";

// Configuration
const COMPLIANCE_ADDRESS = process.env.COMPLIANCE_ADDRESS as `0x${string}` || "0x..." as `0x${string}`;
const COUNTRY_MODULE = process.env.COUNTRY_MODULE as `0x${string}` || "0x..." as `0x${string}`;
const MAX_BALANCE_MODULE = process.env.MAX_BALANCE_MODULE as `0x${string}` || "0x..." as `0x${string}`;

async function main() {
  console.log("🛡️  Compliance Management Script");
  console.log("=================================\n");

  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  
  console.log(`Deployer: ${deployer.account.address}\n`);

  // Get contracts
  const compliance = await hre.viem.getContractAt("ModularCompliance", COMPLIANCE_ADDRESS);
  const countryModule = await hre.viem.getContractAt("CountryRestrictionsModule", COUNTRY_MODULE);
  const maxBalanceModule = await hre.viem.getContractAt("MaxBalanceModule", MAX_BALANCE_MODULE);

  // ============================================================
  // COUNTRY RESTRICTIONS MANAGEMENT
  // ============================================================
  console.log("📍 Country Restrictions");
  console.log("=======================\n");

  // Whitelist countries
  const countriesToWhitelist = [
    { code: 276, name: "Germany" },
    { code: 250, name: "France" }
  ];

  for (const country of countriesToWhitelist) {
    console.log(`Whitelisting ${country.name} (${country.code})...`);
    const hash = await countryModule.write.whitelistCountry([country.code]);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  ✅ Whitelisted! TX: ${hash}\n`);
  }

  // Check if country is whitelisted
  const isWhitelisted = await countryModule.read.isCountryWhitelisted([840]);
  console.log(`USA (840) whitelisted: ${isWhitelisted}\n`);

  // Remove country from whitelist
  console.log("Removing UK from whitelist...");
  const removeHash = await countryModule.write.removeCountryFromWhitelist([826]);
  await publicClient.waitForTransactionReceipt({ hash: removeHash });
  console.log(`  ✅ Removed! TX: ${removeHash}\n`);

  // ============================================================
  // MAX BALANCE MANAGEMENT
  // ============================================================
  console.log("💰 Max Balance Configuration");
  console.log("============================\n");

  // Update max balance
  const newMaxBalance = parseEther("200000");
  console.log(`Setting max balance to ${newMaxBalance}...`);
  const setMaxHash = await maxBalanceModule.write.setMaxBalance([newMaxBalance]);
  await publicClient.waitForTransactionReceipt({ hash: setMaxHash });
  console.log(`  ✅ Updated! TX: ${setMaxHash}\n`);

  // Get current max balance
  const currentMaxBalance = await maxBalanceModule.read.getMaxBalance();
  console.log(`Current max balance: ${currentMaxBalance}\n`);

  // ============================================================
  // MODULE MANAGEMENT
  // ============================================================
  console.log("🔧 Module Management");
  console.log("====================\n");

  // Get active modules
  const modules = await compliance.read.getModules();
  console.log("Active modules:");
  for (const module of modules) {
    console.log(`  - ${module}`);
  }
  console.log();

  // Check if module is bound
  const isBound = await compliance.read.isModuleBound([COUNTRY_MODULE]);
  console.log(`Country module bound: ${isBound}\n`);

  console.log("✅ Compliance management complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
