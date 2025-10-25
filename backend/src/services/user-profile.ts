/**
 * User Profile Service
 * Handles user profile data retrieval for ERC-3643 compliant user profiles
 * Provides comprehensive user information including identity, compliance, and qualification data
 */

import type { Pool } from "pg";
import type { DbResult } from "./database";

// User profile data structure matching database schema and frontend expectations
export interface UserProfileData {
  // Basic profile information
  id: string;
  user_id: string;
  evm_address: string;
  email: string | null;
  user_type: 'individual' | 'entity';
  jurisdiction: string;

  // Onboarding status
  onboarding_status: 'not_started' | 'in_progress' | 'completed' | 'rejected';
  onboarding_current_step: string | null;
  onboarding_progress: number;
  onboarding_started_at: Date | null;
  onboarding_completed_at: Date | null;

  // KYC and verification
  kyc_status: 'pending' | 'approved' | 'rejected' | 'expired';
  kyc_verified_at: Date | null;
  kyc_expires_at: Date | null;

  // Identity verification
  identity_verified: boolean;
  identity_country_code: number | null;
  onchain_identity_address: string | null;

  // Qualification
  qualification_status: 'pending' | 'approved' | 'rejected';
  qualified_at: Date | null;
  accredited_investor: boolean;

  // Personal information (for individuals)
  full_name: string | null;
  date_of_birth: Date | null;
  phone_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;

  // Entity information (for entities)
  entity_name: string | null;
  entity_type: string | null;
  entity_registration_number: string | null;
  entity_country: string | null;

  // Consents and legal
  privacy_consent: boolean;
  terms_consent: boolean;
  data_processing_consent: boolean;
  esign_completed: boolean;
  esign_completed_at: Date | null;

  // Account management
  account_status: 'active' | 'suspended' | 'closed';
  suspension_reason: string | null;
  last_login_at: Date | null;

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

// Identity claims structure
export interface IdentityClaim {
  topic: number;
  scheme: number;
  issuer: string;
  data: string;
  uri: string;
  verified: boolean;
  issued_at: Date;
  expires_at: Date | null;
  verified_at: Date | null;
}

// Qualification criteria structure
export interface QualificationCriterion {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  comments: string | null;
  evidence: string[] | null;
  assessed_at: Date | null;
  assessed_by: string | null;
}

// Complete user profile response
export interface UserProfileResponse {
  profile: UserProfileData;
  claims: Record<string, IdentityClaim>;
  qualifications: QualificationCriterion[];
}

/**
 * Service for managing user profile data retrieval and formatting
 * Provides ERC-3643 compliant user profile information with identity claims and qualification data
 */
export class UserProfileService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get complete user profile information by EVM address
   */
  async getUserProfile(evmAddress: string): Promise<DbResult<UserProfileResponse | null>> {
    try {
      // Get basic profile information
      const profileQuery = `
        SELECT
          id, user_id, evm_address, email, user_type, jurisdiction,
          onboarding_status, onboarding_current_step, onboarding_progress,
          onboarding_started_at, onboarding_completed_at,
          kyc_status, kyc_verified_at, kyc_expires_at,
          identity_verified, identity_country_code, onchain_identity_address,
          qualification_status, qualified_at, accredited_investor,
          full_name, date_of_birth, phone_number,
          address_line1, address_line2, city, state_province, postal_code, country,
          entity_name, entity_type, entity_registration_number, entity_country,
          privacy_consent, terms_consent, data_processing_consent,
          esign_completed, esign_completed_at,
          account_status, suspension_reason, last_login_at,
          created_at, updated_at
        FROM public.profiles
        WHERE evm_address = $1
      `;

      const profileResult = await this.pool.query(profileQuery, [evmAddress]);

      if (profileResult.rows.length === 0) {
        return { success: true, data: null };
      }

      const profileRow = profileResult.rows[0];
      const profile = this.mapProfileRow(profileRow);

      // Get identity claims
      const claims = await this.getUserIdentityClaims(profile.user_id);

      // Get qualification criteria
      const qualifications = await this.getUserQualifications(profile.user_id);

      const response: UserProfileResponse = {
        profile,
        claims,
        qualifications
      };

      return { success: true, data: response };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get user profile: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Get user profile by user ID
   */
  async getUserProfileById(userId: string): Promise<DbResult<UserProfileResponse | null>> {
    try {
      // Get basic profile information
      const profileQuery = `
        SELECT
          id, user_id, evm_address, email, user_type, jurisdiction,
          onboarding_status, onboarding_current_step, onboarding_progress,
          onboarding_started_at, onboarding_completed_at,
          kyc_status, kyc_verified_at, kyc_expires_at,
          identity_verified, identity_country_code, onchain_identity_address,
          qualification_status, qualified_at, accredited_investor,
          full_name, date_of_birth, phone_number,
          address_line1, address_line2, city, state_province, postal_code, country,
          entity_name, entity_type, entity_registration_number, entity_country,
          privacy_consent, terms_consent, data_processing_consent,
          esign_completed, esign_completed_at,
          account_status, suspension_reason, last_login_at,
          created_at, updated_at
        FROM public.profiles
        WHERE user_id = $1
      `;

      const profileResult = await this.pool.query(profileQuery, [userId]);

      if (profileResult.rows.length === 0) {
        return { success: true, data: null };
      }

      const profileRow = profileResult.rows[0];
      const profile = this.mapProfileRow(profileRow);

      // Get identity claims
      const claims = await this.getUserIdentityClaims(profile.user_id);

      // Get qualification criteria
      const qualifications = await this.getUserQualifications(profile.user_id);

      const response: UserProfileResponse = {
        profile,
        claims,
        qualifications
      };

      return { success: true, data: response };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get user profile by ID: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Check if user profile exists by EVM address
   */
  async userProfileExists(evmAddress: string): Promise<DbResult<boolean>> {
    try {
      const query = `
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE evm_address = $1) as exists
      `;

      const result = await this.pool.query(query, [evmAddress]);
      return { success: true, data: result.rows[0].exists };
    } catch (error) {
      return {
        success: false,
        error: `Failed to check user profile existence: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Check if user profile exists by user ID
   */
  async userProfileExistsById(userId: string): Promise<DbResult<boolean>> {
    try {
      const query = `
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = $1) as exists
      `;

      const result = await this.pool.query(query, [userId]);
      return { success: true, data: result.rows[0].exists };
    } catch (error) {
      return {
        success: false,
        error: `Failed to check user profile existence: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Get user identity claims from ONCHAINID system
   */
  private async getUserIdentityClaims(userId: string): Promise<Record<string, IdentityClaim>> {
    try {
      const claimsQuery = `
        SELECT
          c.claim_id,
          c.topic,
          c.scheme,
          c.issuer_address as issuer,
          c.signature,
          c.data,
          c.uri,
          c.issued_at,
          c.expires_at,
          c.verified,
          c.verified_at
        FROM public.claims c
        INNER JOIN public.identities i ON c.identity_address = i.user_address
        INNER JOIN public.profiles p ON i.user_address = p.evm_address
        WHERE p.user_id = $1
        ORDER BY c.issued_at DESC
      `;

      const claimsResult = await this.pool.query(claimsQuery, [userId]);
      const claims: Record<string, IdentityClaim> = {};

      for (const row of claimsResult.rows) {
        // Map topic numbers to human-readable claim types
        const claimType = this.mapClaimTopic(row.topic);

        claims[claimType] = {
          topic: row.topic,
          scheme: row.scheme,
          issuer: row.issuer,
          data: row.data,
          uri: row.uri,
          verified: row.verified,
          issued_at: new Date(row.issued_at),
          expires_at: row.expires_at ? new Date(row.expires_at) : null,
          verified_at: row.verified_at ? new Date(row.verified_at) : null
        };
      }

      return claims;
    } catch (error) {
      console.error('Error fetching identity claims:', error);
      return {};
    }
  }

  /**
   * Get user qualification criteria and assessment results
   */
  private async getUserQualifications(userId: string): Promise<QualificationCriterion[]> {
    try {
      // For now, we'll create mock qualification criteria based on the profile status
      // In a real implementation, this would query a qualification_criteria table
      const qualifications: QualificationCriterion[] = [
        {
          id: 'kyc-verification',
          name: 'KYC Verification',
          description: 'Know Your Customer verification completed',
          status: 'pending',
          comments: null,
          evidence: null,
          assessed_at: null,
          assessed_by: null
        },
        {
          id: 'accredited-investor',
          name: 'Accredited Investor Status',
          description: 'Investor meets SEC accredited investor criteria',
          status: 'pending',
          comments: null,
          evidence: null,
          assessed_at: null,
          assessed_by: null
        },
        {
          id: 'identity-verification',
          name: 'Identity Verification',
          description: 'ONCHAINID identity verification completed',
          status: 'pending',
          comments: null,
          evidence: null,
          assessed_at: null,
          assessed_by: null
        },
        {
          id: 'jurisdiction-check',
          name: 'Jurisdiction Compliance',
          description: 'Investor jurisdiction eligibility verified',
          status: 'pending',
          comments: null,
          evidence: null,
          assessed_at: null,
          assessed_by: null
        }
      ];

      // Get profile to determine actual qualification status
      const profileQuery = `
        SELECT
          kyc_status, identity_verified, accredited_investor,
          qualification_status, qualified_at
        FROM public.profiles
        WHERE user_id = $1
      `;

      const profileResult = await this.pool.query(profileQuery, [userId]);

      if (profileResult.rows.length > 0) {
        const profile = profileResult.rows[0];

        // Update qualification statuses based on profile data
        qualifications.forEach(qual => {
          switch (qual.id) {
            case 'kyc-verification':
              qual.status = profile.kyc_status === 'approved' ? 'approved' :
                           profile.kyc_status === 'rejected' ? 'rejected' : 'pending';
              if (profile.kyc_status === 'approved') {
                qual.comments = 'KYC verification successfully completed';
                qual.evidence = ['Government ID', 'Proof of Address'];
              }
              break;

            case 'accredited-investor':
              qual.status = profile.accredited_investor ? 'approved' : 'pending';
              if (profile.accredited_investor) {
                qual.comments = 'Accredited investor status verified';
                qual.evidence = ['Financial Statements', 'Tax Returns'];
              }
              break;

            case 'identity-verification':
              qual.status = profile.identity_verified ? 'approved' : 'pending';
              if (profile.identity_verified) {
                qual.comments = 'ONCHAINID identity verification completed';
                qual.evidence = ['Identity Claims', 'Verification Proof'];
              }
              break;

            case 'jurisdiction-check':
              qual.status = profile.qualification_status === 'approved' ? 'approved' :
                           profile.qualification_status === 'rejected' ? 'rejected' : 'pending';
              if (profile.qualification_status === 'approved') {
                qual.comments = 'Jurisdiction compliance verified';
                qual.evidence = ['Jurisdiction Check', 'Regulatory Approval'];
              }
              break;
          }

          if (profile.qualified_at && qual.status === 'approved') {
            qual.assessed_at = new Date(profile.qualified_at);
            qual.assessed_by = 'Compliance System';
          }
        });
      }

      return qualifications;
    } catch (error) {
      console.error('Error fetching user qualifications:', error);
      return [];
    }
  }

  /**
   * Map claim topic numbers to human-readable names
   */
  private mapClaimTopic(topic: number): string {
    const topicMap: Record<number, string> = {
      1: 'KYC',
      2: 'Accreditation',
      3: 'AML',
      4: 'Jurisdiction',
      5: 'Tax Residency',
      6: 'Professional Qualification',
      7: 'Credit Score',
      1001: 'Email Verification',
      1002: 'Phone Verification',
      1003: 'Address Verification'
    };

    return topicMap[topic] || `Claim_${topic}`;
  }

  /**
   * Map database row to UserProfileData structure
   */
  private mapProfileRow(row: any): UserProfileData {
    return {
      id: row.id,
      user_id: row.user_id,
      evm_address: row.evm_address,
      email: row.email,
      user_type: row.user_type,
      jurisdiction: row.jurisdiction,
      onboarding_status: row.onboarding_status,
      onboarding_current_step: row.onboarding_current_step,
      onboarding_progress: row.onboarding_progress,
      onboarding_started_at: row.onboarding_started_at ? new Date(row.onboarding_started_at) : null,
      onboarding_completed_at: row.onboarding_completed_at ? new Date(row.onboarding_completed_at) : null,
      kyc_status: row.kyc_status,
      kyc_verified_at: row.kyc_verified_at ? new Date(row.kyc_verified_at) : null,
      kyc_expires_at: row.kyc_expires_at ? new Date(row.kyc_expires_at) : null,
      identity_verified: row.identity_verified,
      identity_country_code: row.identity_country_code,
      onchain_identity_address: row.onchain_identity_address,
      qualification_status: row.qualification_status,
      qualified_at: row.qualified_at ? new Date(row.qualified_at) : null,
      accredited_investor: row.accredited_investor,
      full_name: row.full_name,
      date_of_birth: row.date_of_birth ? new Date(row.date_of_birth) : null,
      phone_number: row.phone_number,
      address_line1: row.address_line1,
      address_line2: row.address_line2,
      city: row.city,
      state_province: row.state_province,
      postal_code: row.postal_code,
      country: row.country,
      entity_name: row.entity_name,
      entity_type: row.entity_type,
      entity_registration_number: row.entity_registration_number,
      entity_country: row.entity_country,
      privacy_consent: row.privacy_consent,
      terms_consent: row.terms_consent,
      data_processing_consent: row.data_processing_consent,
      esign_completed: row.esign_completed,
      esign_completed_at: row.esign_completed_at ? new Date(row.esign_completed_at) : null,
      account_status: row.account_status,
      suspension_reason: row.suspension_reason,
      last_login_at: row.last_login_at ? new Date(row.last_login_at) : null,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Update user profile information
   */
  async updateUserProfile(userId: string, updates: Partial<UserProfileData>): Promise<DbResult<UserProfileData>> {
    try {
      // Build dynamic upsert query
      const fields = Object.keys(updates).filter(key =>
        !['id', 'created_at'].includes(key) // Don't update these fields
      );

      if (fields.length === 0) {
        return {
          success: false,
          error: 'No valid fields to update'
        };
      }

      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      const conflictSetClause = fields.map(field => `${field} = EXCLUDED.${field}`).join(', ');
      const values = fields.map(field => (updates as any)[field]);
    
      console.log('Updating profile for user:', userId);
      const exists = await this.userProfileExistsById(userId);
      console.log('Profile exists:', exists);

      //const isConflictUpdate = conflictSetClause 
      //? `ON CONFLICT (user_id) DO UPDATE SET ${conflictSetClause}, updated_at = NOW()`
      //: 'DO NOTHING';

      const upsertQuery = exists && exists.success && exists.data ? `
        UPDATE public.profiles
        SET ${setClause}, updated_at = NOW()
        WHERE user_id = $1
        RETURNING *
      ` : `
        INSERT INTO public.profiles (user_id, ${fields.join(', ')})
        VALUES ($1, ${fields.map((_, index) => `$${index + 2}`).join(', ')})
        RETURNING *
      `;

      console.log('Upsert query:', upsertQuery);

      const result = await this.pool.query(upsertQuery, [userId, ...values]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Failed to upsert user profile'
        };
      }

      const updatedProfile = this.mapProfileRow(result.rows[0]);
      return { success: true, data: updatedProfile };
    } catch (error) {
      return {
        success: false,
        error: `Failed to upsert user profile: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

}
