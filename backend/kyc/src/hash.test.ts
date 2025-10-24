import { describe, test, expect } from "bun:test";
import { sha256Hex } from "./hash";

describe("Hash Utility", () => {
  describe("sha256Hex", () => {
    test("should hash string input correctly", () => {
      const input = "hello world";
      const hash = sha256Hex(input);
      
      // Known SHA256 hash of "hello world"
      expect(hash).toBe("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
    });

    test("should hash Uint8Array input correctly", () => {
      const input = new Uint8Array([104, 101, 108, 108, 111]); // "hello"
      const hash = sha256Hex(input);
      
      // Known SHA256 hash of "hello"
      expect(hash).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
    });

    test("should produce different hashes for different inputs", () => {
      const hash1 = sha256Hex("input1");
      const hash2 = sha256Hex("input2");
      
      expect(hash1).not.toBe(hash2);
    });

    test("should be deterministic", () => {
      const input = "test data";
      const hash1 = sha256Hex(input);
      const hash2 = sha256Hex(input);
      
      expect(hash1).toBe(hash2);
    });

    test("should handle empty string", () => {
      const hash = sha256Hex("");
      
      // Known SHA256 hash of empty string
      expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    });

    test("should handle large inputs", () => {
      const largeInput = "a".repeat(10000);
      const hash = sha256Hex(largeInput);
      
      expect(hash).toHaveLength(64); // SHA256 produces 64 hex characters
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});
