/**
 * ERC-3643 Identity Types
 * 
 * TypeScript types for identity-related data structures
 */

import { Address, Hex } from 'viem'

/**
 * Country codes for jurisdiction mapping (ISO 3166-1 numeric)
 */
export const CountryCodes = {
  USA: 840,
  UK: 826,
  EU: 276, // Germany as EU representative
  CANADA: 124,
  AUSTRALIA: 36,
  SINGAPORE: 702,
  SWITZERLAND: 756,
} as const

export type CountryCode = (typeof CountryCodes)[keyof typeof CountryCodes]

/**
 * Identity claim types
 */
export interface IdentityClaim {
  topic: number
  scheme: number
  issuer: Address
  signature: Hex
  data: Hex
  uri: string
}

/**
 * Identity registration data
 */
export interface IdentityRegistrationData {
  userAddress: Address
  identityAddress: Address
  countryCode: CountryCode
  isVerified: boolean
}

/**
 * Identity creation result
 */
export interface IdentityCreationResult {
  identityAddress: Address
  transactionHash: Hex
  blockNumber: bigint
}

/**
 * Claim topics for KYC/AML verification
 */
export enum ClaimTopic {
  KYC = 1,
  AML = 2,
  ACCREDITATION = 3,
  JURISDICTION = 4,
}

/**
 * Identity verification status
 */
export interface IdentityVerificationStatus {
  exists: boolean
  isVerified: boolean
  identityAddress: Address | null
  countryCode: CountryCode | null
}

/**
 * Contract addresses for identity system
 */
export interface IdentityContractAddresses {
  identityFactory: Address
  identityRegistry: Address
  claimTopicsRegistry: Address
  trustedIssuersRegistry: Address
}
