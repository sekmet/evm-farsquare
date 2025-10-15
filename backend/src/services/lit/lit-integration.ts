/**
 * Example Lit Protocol integration (TypeScript)
 *
 * This sketch shows how a dApp can request a user to delegate a narrow signing capability to the app
 * via Lit keys, then have the app assemble and submit transactions on behalf of the user while respecting
 * the delegated scope. The user retains control and can revoke the delegation.
 *
 * Production: harden the flow, include transaction replay protection, EIP-712 order signatures, and auditing.
 */

import * as LitJsSdk from "@lit-protocol/lit-node-client-nodejs";
import { LIT_NETWORK } from "@lit-protocol/constants";
import { encryptString } from "@lit-protocol/encryption";

async function exampleLitFlow() {
  // 1) Connect to Lit nodes
    const client = new LitJsSdk.LitNodeClientNodeJs({
      alertWhenUnauthorized: false,
      litNetwork: LIT_NETWORK.NagaDev as any,
    });
    await client.connect();

  // 2) Create an auth signature (user signs a message with their wallet)
  //    For Node.js backend, auth signatures are handled differently or may not be needed
  //    Skipping checkAndSignAuthMessage as it's browser-specific
  const authSig = { sig: "mock-sig", address: "0x123" }; // Placeholder for backend auth

  // 3) Save a symmetric key or delegate a signing key with access control conditions
  //    Example: delegate for a specific smart contract address and limited time window
  const conditions = [
    {
      contractAddress: "0xYourRegulatedTokenOrPeripheryAddress",
      standardContractType: "ERC20",
      chain: "hedera",
      method: "transfer",
      parameters: [":userAddress", ":destination", ":amount"],
      returnValueTest: {
        comparator: ">=",
        value: "0"
      }
    }
  ];

  // Save the key and access control on Lit nodes
  const encryptedResult = await encryptString({
    dataToEncrypt: "delegation-metadata",
    accessControlConditions: conditions
  }, client);

  const { ciphertext, dataToEncryptHash } = encryptedResult;
  
  await (client as any).saveSigningCondition({
    authSig,
    conditions,
    symmetricKey: dataToEncryptHash, // Use correct property
    ttl: 60 * 60 // 1 hour delegated scope
  });

  // 4) App can now request Lit to sign delegated payloads within scope and submit transactions
  //    Always show the user what will be signed and allow revocation.
}

export { exampleLitFlow };