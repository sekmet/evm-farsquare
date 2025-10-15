/**
 * Hedera HTS PoC using Hedera JS SDK
 *
 * Steps:
 * 1) Create an HTS token with KYC key
 * 2) Associate accounts, grant KYC to an account
 * 3) Mint tokens and transfer
 *
 * You need HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY in .env for running this PoC on Hedera testnet
 *
 * NOTE: This script is a PoC and does not handle network error retries, operator keys management, or production security.
 */

import dotenv from "dotenv";
dotenv.config();
import {
  Client,
  PrivateKey,
  AccountCreateTransaction,
  Hbar,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TokenAssociateTransaction,
  TransferTransaction,
  AccountBalanceQuery,
  TokenGrantKycTransaction
} from "@hashgraph/sdk";

async function main() {
  if (!process.env.HEDERA_ACCOUNT_ID || !process.env.HEDERA_PRIVATE_KEY) {
    throw new Error("Set HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY in .env");
  }

  const operatorId = process.env.HEDERA_ACCOUNT_ID;
  const operatorKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY);
  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);

  // Create a treasury account to be issuer
  const treasuryKey = PrivateKey.generate();
  const newAccountTx = await new AccountCreateTransaction()
    .setKey(treasuryKey.publicKey)
    .setInitialBalance(new Hbar(10))
    .execute(client);
  const newAccountReceipt = await newAccountTx.getReceipt(client);
  const treasuryId = newAccountReceipt.accountId;
  console.log("Treasury account:", treasuryId.toString());

  // Create HTS token with KYC key set to operator's key for demo
  const tokenCreateTx = await new TokenCreateTransaction()
    .setTokenName("HTS-RE-TOKEN")
    .setTokenSymbol("HTSRET")
    .setTreasuryAccountId(treasuryId)
    .setKycKey(operatorKey.publicKey) // set KYC key so issuer can grant/revoke
    .setInitialSupply(0)
    .setMaxTransactionFee(new Hbar(2))
    .setTokenType(TokenType.FungibleCommon)
    .setSupplyType(TokenSupplyType.Finite)
    .setDecimals(8)
    .execute(client);

  const tokenCreateReceipt = await tokenCreateTx.getReceipt(client);
  const tokenId = tokenCreateReceipt.tokenId;
  console.log("Created HTS token:", tokenId.toString());

  // Mint tokens to treasury
  const mintTx = await new TokenMintTransaction()
    .setTokenId(tokenId)
    .setAmount(1000 * 10 ** 8)
    .execute(client);
  const mintReceipt = await mintTx.getReceipt(client);
  console.log("Minted tokens:", mintReceipt.status.toString());

  // For a user account demo, create a user and associate token
  const userKey = PrivateKey.generate();
  const userAccountTx = await new AccountCreateTransaction()
    .setKey(userKey.publicKey)
    .setInitialBalance(new Hbar(5))
    .execute(client);
  const userReceipt = await userAccountTx.getReceipt(client);
  const userId = userReceipt.accountId;
  console.log("Created user:", userId.toString());

  // Associate token to user
  const assocTx = await new TokenAssociateTransaction()
    .setAccountId(userId)
    .setTokenIds([tokenId])
    .freezeWith(client);
  const signedAssoc = await assocTx.sign(userKey);
  const assocSubmit = await signedAssoc.execute(client);
  await assocSubmit.getReceipt(client);
  console.log("Associated token to user");

  // Grant KYC to user (by issuer/operator)
  const grantKycTx = await new TokenGrantKycTransaction()
    .setAccountId(userId)
    .setTokenId(tokenId)
    .execute(client);
  await grantKycTx.getReceipt(client);
  console.log("Granted KYC to user");

  // Transfer from treasury to user
  const transferTx = await new TransferTransaction()
    .addTokenTransfer(tokenId, treasuryId, -(100 * 10 ** 8))
    .addTokenTransfer(tokenId, userId, (100 * 10 ** 8))
    .execute(client);
  await transferTx.getReceipt(client);
  console.log("Transferred 100 tokens to user");

  // Query balance
  const balance = await new AccountBalanceQuery().setAccountId(userId).execute(client);
  console.log("User balances:", balance.tokens.toString());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});