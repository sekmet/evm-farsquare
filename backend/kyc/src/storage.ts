import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AttestationResult } from "./types";

/**
 * Simple file-based storage service for KYC credentials
 * In production, use S3/encrypted storage
 */

const STORAGE_DIR = join(process.cwd(), "data", "credentials");

/**
 * Initialize storage directory
 */
export async function initStorage(): Promise<void> {
  try {
    await mkdir(STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to initialize storage:", error);
    throw error;
  }
}

/**
 * Store attestation credential securely
 * @param attestationHash - Hash identifier for the attestation
 * @param attestation - Complete attestation result
 */
export async function storeAttestation(
  attestationHash: string,
  attestation: AttestationResult
): Promise<void> {
  const filePath = join(STORAGE_DIR, `${attestationHash}.json`);
  
  try {
    await writeFile(filePath, JSON.stringify(attestation, null, 2), "utf-8");
  } catch (error) {
    console.error(`Failed to store attestation ${attestationHash}:`, error);
    throw error;
  }
}

/**
 * Retrieve attestation by hash
 * @param attestationHash - Hash identifier for the attestation
 * @returns Attestation result or null if not found
 */
export async function getAttestation(
  attestationHash: string
): Promise<AttestationResult | null> {
  const filePath = join(STORAGE_DIR, `${attestationHash}.json`);
  
  try {
    const data = await readFile(filePath, "utf-8");
    return JSON.parse(data) as AttestationResult;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    console.error(`Failed to retrieve attestation ${attestationHash}:`, error);
    throw error;
  }
}

/**
 * Check if attestation exists
 * @param attestationHash - Hash identifier for the attestation
 * @returns True if exists
 */
export async function attestationExists(attestationHash: string): Promise<boolean> {
  const attestation = await getAttestation(attestationHash);
  return attestation !== null;
}
