import { SignJWT, importJWK, type JWK, type KeyLike } from "jose";
import { sha256Hex } from "./hash";
import type { VerifiableCredential, AttestationResult, AttestationParams } from "./types";

/**
 * Generate cryptographically secure UUID v4
 * @returns UUID string
 */
function cryptoRandomUUID(): string {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c: any) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  );
}

/**
 * Create a Verifiable Credential with JWS proof for KYC attestation
 * 
 * @param params - Attestation parameters (wallet, level, validity)
 * @param signingKey - JWK or CryptoKey for signing
 * @returns Attestation result with credential, proof, and hash
 * 
 * @example
 * ```typescript
 * import { generateKeyPair } from "jose";
 * const { privateKey } = await generateKeyPair("ES256K");
 * const attestation = await createAttestation(
 *   { wallet: "SP2ABC...", level: "standard" },
 *   privateKey
 * );
 * ```
 */
export async function createAttestation(
  params: AttestationParams,
  signingKey: JWK | KeyLike
): Promise<AttestationResult> {
  const { wallet, level = "standard", validityDays = 365 } = params;

  const issuanceDate = new Date().toISOString();
  const expiryDate = new Date(Date.now() + validityDays * 24 * 3600 * 1000).toISOString();

  // Create W3C Verifiable Credential
  const credential: VerifiableCredential = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    id: `urn:uuid:${cryptoRandomUUID()}`,
    type: ["VerifiableCredential", "KYC-Attestation"],
    issuer: "did:web:realstate:issuer",
    issuanceDate,
    expirationDate: expiryDate,
    credentialSubject: {
      id: `did:evm:${wallet}`,
      kyc: { level },
    },
  };

  // Convert JWK to KeyLike if needed
  let key: KeyLike;
  if (typeof signingKey === "object" && "kty" in signingKey) {
    // It's a JWK
    key = await importJWK(signingKey as JWK, "ES256");
  } else {
    key = signingKey as KeyLike;
  }

  // Sign credential with JWS (JSON Web Signature)
  const jwt = await new SignJWT({ vc: credential })
    .setProtectedHeader({ alg: "ES256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000 + validityDays * 24 * 3600))
    .sign(key);

  // Compute attestation hash (only this goes on-chain)
  const attestationHash = sha256Hex(JSON.stringify({ credential, proof: jwt }));

  return { credential, proof: jwt, attestationHash };
}

/**
 * Verify an attestation proof (JWS token)
 * 
 * @param proof - JWS token to verify
 * @param publicKey - Public key for verification
 * @returns True if valid
 */
export async function verifyAttestation(proof: string, publicKey: JWK | KeyLike): Promise<boolean> {
  try {
    const { jwtVerify } = await import("jose");
    let key: KeyLike;
    
    if (typeof publicKey === "object" && "kty" in publicKey) {
      key = await importJWK(publicKey as JWK, "ES256");
    } else {
      key = publicKey as KeyLike;
    }

    await jwtVerify(proof, key);
    return true;
  } catch (error) {
    return false;
  }
}
