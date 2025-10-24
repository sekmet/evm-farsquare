import { sha256 } from "@noble/hashes/sha256";

/**
 * Compute SHA256 hash of input data
 * @param input - Uint8Array or string to hash
 * @returns Hex-encoded hash string
 */
export function sha256Hex(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  return Buffer.from(sha256(bytes)).toString("hex");
}

/**
 * Compute SHA256 hash from File object (browser/Node.js compatible)
 * @param file - File object to hash
 * @returns Promise resolving to hex-encoded hash
 */
export async function sha256File(file: File | Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  return sha256Hex(bytes);
}
