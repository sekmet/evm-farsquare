import { describe, test, expect, beforeAll } from "bun:test";
import { generateKeyPair, exportJWK } from "jose";
import { createAttestation, verifyAttestation } from "./attestation";
import type { JWK } from "jose";

describe("Attestation Generator", () => {
  let privateKey: CryptoKey;
  let publicKey: CryptoKey;
  let privateJWK: JWK;
  let publicJWK: JWK;

  beforeAll(async () => {
    // Generate ES256 keypair for tests with extractable keys
    const keypair = await generateKeyPair("ES256", { extractable: true });
    privateKey = keypair.privateKey;
    publicKey = keypair.publicKey;
    
    privateJWK = await exportJWK(privateKey);
    publicJWK = await exportJWK(publicKey);
  });

  describe("createAttestation", () => {
    test("should create attestation with default parameters", async () => {
      const result = await createAttestation(
        { wallet: "SP2TEST123" },
        privateKey
      );

      expect(result).toHaveProperty("credential");
      expect(result).toHaveProperty("proof");
      expect(result).toHaveProperty("attestationHash");
    });

    test("should generate valid credential structure", async () => {
      const result = await createAttestation(
        { wallet: "SP2TEST123", level: "standard" },
        privateKey
      );

      const { credential } = result;
      
      expect(credential["@context"]).toContain("https://www.w3.org/2018/credentials/v1");
      expect(credential.type).toContain("VerifiableCredential");
      expect(credential.type).toContain("KYC-Attestation");
      expect(credential.issuer).toBe("did:web:realstate:issuer");
      expect(credential.credentialSubject.id).toBe("did:evm:SP2TEST123");
      expect(credential.credentialSubject.kyc.level).toBe("standard");
    });

    test("should generate 64-character attestation hash (SHA256)", async () => {
      const result = await createAttestation(
        { wallet: "SP2TEST123" },
        privateKey
      );

      expect(result.attestationHash).toHaveLength(64);
      expect(result.attestationHash).toMatch(/^[0-9a-f]{64}$/);
    });

    test("should accept custom KYC level", async () => {
      const result = await createAttestation(
        { wallet: "SP2TEST123", level: "premium" },
        privateKey
      );

      expect(result.credential.credentialSubject.kyc.level).toBe("premium");
    });

    test("should accept custom validity days", async () => {
      const result = await createAttestation(
        { wallet: "SP2TEST123", validityDays: 180 },
        privateKey
      );

      const issuanceDate = new Date(result.credential.issuanceDate);
      const expirationDate = new Date(result.credential.expirationDate);
      const diffDays = Math.floor((expirationDate.getTime() - issuanceDate.getTime()) / (1000 * 3600 * 24));

      expect(diffDays).toBeCloseTo(180, 0);
    });

    test("should accept JWK as signing key", async () => {
      const result = await createAttestation(
        { wallet: "SP2TEST123" },
        privateJWK
      );

      expect(result.proof).toBeDefined();
      expect(result.attestationHash).toHaveLength(64);
    });

    test("should generate unique IDs for each attestation", async () => {
      const result1 = await createAttestation({ wallet: "SP2TEST123" }, privateKey);
      const result2 = await createAttestation({ wallet: "SP2TEST123" }, privateKey);

      expect(result1.credential.id).not.toBe(result2.credential.id);
      expect(result1.attestationHash).not.toBe(result2.attestationHash);
    });

    test("should include valid timestamps", async () => {
      const before = Date.now();
      const result = await createAttestation({ wallet: "SP2TEST123" }, privateKey);
      const after = Date.now();

      const issuanceTime = new Date(result.credential.issuanceDate).getTime();
      
      expect(issuanceTime).toBeGreaterThanOrEqual(before);
      expect(issuanceTime).toBeLessThanOrEqual(after);
    });
  });

  describe("verifyAttestation", () => {
    test("should verify valid attestation proof", async () => {
      const { proof } = await createAttestation(
        { wallet: "SP2TEST123" },
        privateKey
      );

      const isValid = await verifyAttestation(proof, publicKey);
      expect(isValid).toBe(true);
    });

    test("should reject invalid proof", async () => {
      const invalidProof = "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.invalid.signature";
      
      const isValid = await verifyAttestation(invalidProof, publicKey);
      expect(isValid).toBe(false);
    });

    test("should verify with JWK public key", async () => {
      const { proof } = await createAttestation(
        { wallet: "SP2TEST123" },
        privateKey
      );

      const isValid = await verifyAttestation(proof, publicJWK);
      expect(isValid).toBe(true);
    });

    test("should reject proof signed with different key", async () => {
      const wrongKeypair = await generateKeyPair("ES256");
      const { proof } = await createAttestation(
        { wallet: "SP2TEST123" },
        wrongKeypair.privateKey
      );

      const isValid = await verifyAttestation(proof, publicKey);
      expect(isValid).toBe(false);
    });
  });
});
