/**
 * Hardhat 3.x Script: Mint Tokens
 * Mints ERC-3643 tokens to compliant investors
 * 
 * Usage: bun hardhat run scripts/02-mint-tokens.ts --network localhost
 */

import hre from "hardhat";
import { parseEther } from "viem";

const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS as `0x${string}` || "0x089f3d84f06ea5386fcbe3f0395d32d78d4a7d6b" as `0x${string}`;

async function main() {
  console.log("🪙 Mint Tokens Script");
  console.log("====================\n");

  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  
  console.log(`Deployer: ${deployer.account.address}`);
  console.log(`Token: ${TOKEN_ADDRESS}\n`);

  // Get token contract
  const token = await hre.viem.getContractAt("TREXToken", TOKEN_ADDRESS);

  // Investors to mint to
  const recipients = [
    {
      address: "0x87c90d095278a4df26418808c4F90c093b6070Dd" as `0x${string}`,
      amount: parseEther("100")
    },
    {
      address: "0x27b5852Ba0660371513DDC8A279Cb40581E6F045" as `0x${string}`,
      amount: parseEther("50")
    }
  ];

  for (const recipient of recipients) {
    console.log(`Minting ${recipient.amount} to ${recipient.address}...`);
    
    const hash = await token.write.mint([recipient.address, recipient.amount]);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    console.log(`  ✅ Minted! Gas used: ${receipt.gasUsed}`);
    console.log(`  📝 TX: ${hash}\n`);

    // Check new balance
    const balance = await token.read.balanceOf([recipient.address]);
    console.log(`  📊 New balance: ${balance}\n`);
  }

  console.log("✅ Minting complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
