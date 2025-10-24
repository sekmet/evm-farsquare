/**
 * Type definitions for KYC attestation system
 */

export interface VerifiableCredential {
  "@context": string[];
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate: string;
  credentialSubject: {
    id: string;
    kyc: {
      level: string;
    };
  };
}

export interface AttestationResult {
  credential: VerifiableCredential;
  proof: string; // JWS token
  attestationHash: string; // SHA256 hash
}

export interface AttestationParams {
  wallet: string;
  level?: string;
  validityDays?: number;
}

export interface KYCSubmission {
  kycId: string;
  wallet: string;
  fileName: string;
  uploadUrl: string;
  timestamp: number;
}

export interface ProviderCallback {
  kycId: string;
  wallet: string;
  kycLevel: string;
  verified: boolean;
}
