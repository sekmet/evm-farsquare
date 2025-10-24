/**
 * Onboarding Service
 * Handles user onboarding, KYC, and verification processes
 */

import type { Pool } from "pg";
import type { DbResult } from "./database";

export interface OnboardingSession {
  id: string;
  sessionId: string;
  userId: string;
  userType: 'individual' | 'entity';
  jurisdiction: string;
  currentStep: 'start' | 'kyc' | 'identity' | 'qualification' | 'esign' | 'complete';
  status: 'active' | 'completed' | 'abandoned' | 'expired';
  progress: number;
  sessionData?: Record<string, any>;
  startCompleted: boolean;
  kycCompleted: boolean;
  identityCompleted: boolean;
  qualificationCompleted: boolean;
  esignCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  userId: string;
  evmAddress: string;
  email: string | null;
  userType: 'individual' | 'entity';
  jurisdiction: string;
  onboardingStatus: 'not_started' | 'in_progress' | 'completed' | 'rejected';
  onboardingCurrentStep: string | null;
  onboardingProgress: number;
  kycStatus: 'pending' | 'approved' | 'rejected' | 'expired';
  identityVerified: boolean;
  qualificationStatus: 'pending' | 'approved' | 'rejected';
  accountStatus: 'active' | 'suspended' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingStartData {
  userId: string;
  address: string;
  userType: 'individual' | 'entity';
  jurisdiction: string;
  email?: string;
  privacyConsent: boolean;
  termsConsent: boolean;
  dataProcessingConsent: boolean;
}

export interface KYCDocumentUpload {
  userId: string;
  sessionId?: string;
  documentType: 'id_front' | 'id_back' | 'passport' | 'proof_of_address' | 'selfie' | 'other';
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

export interface StepCompletionData {
  sessionId: string;
  step: 'start' | 'kyc' | 'identity' | 'qualification' | 'esign';
  data?: Record<string, any>;
}

/**
 * Service for managing user onboarding
 */
export class OnboardingService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Start onboarding process
   */
  async startOnboarding(data: OnboardingStartData): Promise<DbResult<{ sessionId: string; userId: string }>> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if user profile exists
      let profileCheckQuery = `
        SELECT user_id AS id, onboarding_status FROM public.profiles
        WHERE evm_address = $1
      `;
      let profileCheck = await client.query(profileCheckQuery, [data.address]);

      console.log(profileCheck.rows.length)

      if (profileCheck.rows.length === 0) {
        profileCheckQuery = `
          SELECT u.id AS id, w.address AS evm_address FROM public.user AS u 
          INNER JOIN public."walletAddress" AS w
          ON w."userId" = u.id AND w.address = $1;
        `;
        profileCheck = await client.query(profileCheckQuery, [data.address]);
        console.log(profileCheck.rows.length, data)
      }

      let userId: string;

      userId = profileCheck.rows[0].id;

      if (profileCheck.rows.length > 0) {
        // Update existing profile
      
        const updateProfileQuery = `
          UPDATE public.profiles
          SET 
            user_id = $1,
            user_type = $2,
            jurisdiction = $3,
            email = COALESCE($4, email),
            privacy_consent = $5,
            terms_consent = $6,
            data_processing_consent = $7,
            onboarding_status = 'in_progress',
            onboarding_current_step = 'start',
            onboarding_started_at = NOW(),
            updated_at = NOW()
          WHERE user_id = $8
        `;
        
        await client.query(updateProfileQuery, [
          userId,
          data.userType,
          data.jurisdiction,
          data.email,
          data.privacyConsent,
          data.termsConsent,
          data.dataProcessingConsent,
          userId
        ]);
      } else {
        // Create new profile
        const createProfileQuery = `
          INSERT INTO public.profiles (
            user_id, evm_address, user_type, jurisdiction, email,
            privacy_consent, terms_consent, data_processing_consent,
            onboarding_status, onboarding_current_step, onboarding_progress,
            onboarding_started_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'in_progress', 'start', 0, NOW())
          RETURNING id
        `;

        const profileResult = await client.query(createProfileQuery, [
          userId,
          data.address,
          data.userType,
          data.jurisdiction,
          data.email,
          data.privacyConsent,
          data.termsConsent,
          data.dataProcessingConsent
        ]);

        userId = profileResult.rows[0].user_id;
      }

      // Create onboarding session
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const createSessionQuery = `
        INSERT INTO public.onboarding_sessions (
          session_id, user_id, user_type, jurisdiction,
          current_step, status, progress,
          start_completed, start_completed_at
        )
        VALUES ($1, $2, $3, $4, 'kyc', 'active', 20, true, NOW())
        RETURNING id
      `;

      await client.query(createSessionQuery, [
        sessionId,
        userId,
        data.userType,
        data.jurisdiction
      ]);

      await client.query('COMMIT');

      return {
        success: true,
        data: { sessionId, userId }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: `Failed to start onboarding: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get onboarding status for a user
   */
  async getOnboardingStatus(evmAddress: string): Promise<DbResult<UserProfile | null>> {
    try {
      const query = `
        SELECT 
          id, user_id, evm_address, email, user_type, jurisdiction,
          onboarding_status, onboarding_current_step, onboarding_progress,
          kyc_status, identity_verified, qualification_status,
          account_status, created_at, updated_at
        FROM public.profiles
        WHERE evm_address = $1
      `;

      const result = await this.pool.query(query, [evmAddress]);

      if (result.rows.length === 0) {
        return { success: true, data: null };
      }

      const row = result.rows[0];
      return {
        success: true,
        data: {
          id: row.id,
          userId: row.user_id,
          evmAddress: row.evm_address,
          email: row.email,
          userType: row.user_type,
          jurisdiction: row.jurisdiction,
          onboardingStatus: row.onboarding_status,
          onboardingCurrentStep: row.onboarding_current_step,
          onboardingProgress: row.onboarding_progress,
          kycStatus: row.kyc_status,
          identityVerified: row.identity_verified,
          qualificationStatus: row.qualification_status,
          accountStatus: row.account_status,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get onboarding status: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Get onboarding session
   */
  async getSession(sessionId: string): Promise<DbResult<OnboardingSession | null>> {
    try {
      const query = `
        SELECT 
          id, session_id, user_id, user_type, jurisdiction,
          current_step, status, progress, session_data,
          start_completed, kyc_completed, identity_completed,
          qualification_completed, esign_completed,
          created_at, updated_at
        FROM public.onboarding_sessions
        WHERE session_id = $1
      `;

      const result = await this.pool.query(query, [sessionId]);

      if (result.rows.length === 0) {
        return { success: true, data: null };
      }

      const row = result.rows[0];
      return {
        success: true,
        data: {
          id: row.id,
          sessionId: row.session_id,
          userId: row.user_id,
          userType: row.user_type,
          jurisdiction: row.jurisdiction,
          currentStep: row.current_step,
          status: row.status,
          progress: row.progress,
          sessionData: row.session_data,
          startCompleted: row.start_completed,
          kycCompleted: row.kyc_completed,
          identityCompleted: row.identity_completed,
          qualificationCompleted: row.qualification_completed,
          esignCompleted: row.esign_completed,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get session: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Complete onboarding step
   */
  async completeStep(data: StepCompletionData): Promise<DbResult<void>> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get session
      const sessionQuery = `
        SELECT user_id, user_type, ${data.step}_completed
        FROM public.onboarding_sessions
        WHERE session_id = $1 AND status = 'active'
      `;

      const sessionResult = await client.query(sessionQuery, [data.sessionId]);

      if (sessionResult.rows.length === 0) {
        throw new Error('Session not found or already completed');
      }

      const { user_id, user_type } = sessionResult.rows[0];

      // Determine next step based on user type and completed step
      let nextStep: string | null = null;
      if (user_type === 'individual') {
        if (data.step === 'kyc') nextStep = 'identity';
        else if (data.step === 'identity') nextStep = 'qualification';
        else if (data.step === 'qualification') nextStep = 'esign';
      } else if (user_type === 'entity') {
        if (data.step === 'identity') nextStep = 'qualification';
        else if (data.step === 'qualification') nextStep = 'esign';
      }

      // Update session step completion and current step
      let updateSessionQuery: string;
      const queryParams: any[] = [
        JSON.stringify({ [data.step]: data.data || {} }),
        data.sessionId
      ];

      if (nextStep) {
        updateSessionQuery = `
          UPDATE public.onboarding_sessions
          SET 
            ${data.step}_completed = true,
            ${data.step}_completed_at = NOW(),
            session_data = session_data || $1::jsonb,
            current_step = $3,
            updated_at = NOW()
          WHERE session_id = $2
        `;
        queryParams.push(nextStep);
      } else {
        updateSessionQuery = `
          UPDATE public.onboarding_sessions
          SET 
            ${data.step}_completed = true,
            ${data.step}_completed_at = NOW(),
            session_data = session_data || $1::jsonb,
            updated_at = NOW()
          WHERE session_id = $2
        `;
      }

      await client.query(updateSessionQuery, queryParams);

      // Update user profile based on step
      if (data.step === 'kyc') {
        await client.query(`
          UPDATE public.profiles
          SET kyc_status = 'approved', kyc_verified_at = NOW(), updated_at = NOW()
          WHERE id = $1
        `, [user_id]);
      } else if (data.step === 'identity') {
        await client.query(`
          UPDATE public.profiles
          SET identity_verified = true, updated_at = NOW()
          WHERE id = $1
        `, [user_id]);
      } else if (data.step === 'qualification') {
        await client.query(`
          UPDATE public.profiles
          SET qualification_status = 'approved', qualified_at = NOW(), updated_at = NOW()
          WHERE id = $1
        `, [user_id]);
      } else if (data.step === 'esign') {
        await client.query(`
          UPDATE public.profiles
          SET esign_completed = true, esign_completed_at = NOW(), updated_at = NOW()
          WHERE id = $1
        `, [user_id]);
      }

      // Check if all steps completed
      const checkCompletion = `
        SELECT 
          start_completed, kyc_completed, identity_completed,
          qualification_completed, esign_completed
        FROM public.onboarding_sessions
        WHERE session_id = $1
      `;

      const completionResult = await client.query(checkCompletion, [data.sessionId]);
      const completion = completionResult.rows[0];

      if (completion.start_completed && completion.kyc_completed && 
          completion.identity_completed && completion.qualification_completed && 
          completion.esign_completed) {
        // Mark onboarding as complete
        await client.query(`
          UPDATE public.profiles
          SET 
            onboarding_status = 'completed',
            onboarding_current_step = 'complete',
            onboarding_progress = 100,
            onboarding_completed_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
        `, [user_id]);

        await client.query(`
          UPDATE public.onboarding_sessions
          SET status = 'completed', completed_at = NOW(), updated_at = NOW()
          WHERE session_id = $1
        `, [data.sessionId]);
      }

      await client.query('COMMIT');

      return { success: true, data: undefined };
    } catch (error) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: `Failed to complete step: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    } finally {
      client.release();
    }
  }

  /**
   * Upload KYC document
   */
  async uploadKYCDocument(data: KYCDocumentUpload): Promise<DbResult<{ id: string }>> {
    try {
      const query = `
        INSERT INTO public.kyc_documents (
          user_id, session_id, document_type, file_name,
          file_path, file_size, mime_type, verification_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
        RETURNING id
      `;

      const result = await this.pool.query(query, [
        data.userId,
        data.sessionId,
        data.documentType,
        data.fileName,
        data.filePath,
        data.fileSize,
        data.mimeType
      ]);

      return {
        success: true,
        data: { id: result.rows[0].id }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to upload KYC document: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Update user identity with onchain address
   */
  async updateOnchainIdentity(userId: string, identityAddress: string, countryCode?: number): Promise<DbResult<void>> {
    try {
      const query = `
        UPDATE public.profiles
        SET 
          onchain_identity_address = $1,
          identity_country_code = $2,
          identity_verified = true,
          updated_at = NOW()
        WHERE id = $3
      `;

      await this.pool.query(query, [identityAddress, countryCode, userId]);

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update onchain identity: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Check if user needs onboarding
   */
  async needsOnboarding(evmAddress: string): Promise<DbResult<boolean>> {
    try {
      const query = `
        SELECT onboarding_status FROM public.profiles
        WHERE evm_address = $1
      `;

      const result = await this.pool.query(query, [evmAddress]);

      if (result.rows.length === 0) {
        return { success: true, data: true }; // New user needs onboarding
      }

      const status = result.rows[0].onboarding_status;
      return { 
        success: true, 
        data: status !== 'completed' 
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to check onboarding requirement: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
}
