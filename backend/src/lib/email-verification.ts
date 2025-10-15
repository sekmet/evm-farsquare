import { randomBytes, createHash } from 'crypto';
import { getDatabasePool } from './database';
import { createId } from '@paralleldrive/cuid2';

/**
 * Email verification system
 */

export interface VerificationToken {
  token: string;
  hashedToken: string;
  expiresAt: Date;
}

export interface EmailVerificationResult {
  success: boolean;
  email: string;
  message: string;
  verified?: boolean;
}

export interface VerificationStatus {
  isVerified: boolean;
  hasPendingVerification: boolean;
  expiresAt?: Date;
}

/**
 * Generate a secure email verification token
 */
export function generateEmailVerificationToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Generate a secure token using crypto.randomBytes (alias for backward compatibility)
 */
export function generateSecureToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Hash verification token for secure storage
 */
export function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Create verification link for email
 */
export function createVerificationLink(token: string): string {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${baseUrl}/verify-email?token=${token}`;
}

/**
 * Store verification token in database
 */
export async function storeVerificationToken(email: string, token: string): Promise<void> {
  const hashedToken = hashVerificationToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // First, clean up any existing verification tokens for this email
  await cleanupVerificationToken(email);

  // Store new verification token
  await getDatabasePool()
    .insertInto('verification')
    .values({
      id: createId(),
      identifier: email,
      value: hashedToken,
      expiresAt,
    })
    .execute();
}

/**
 * Validate verification token
 */
export async function validateVerificationToken(email: string, token: string): Promise<boolean> {
  try {
    const hashedToken = hashVerificationToken(token);

    const verification = await getDatabasePool()
      .selectFrom('verification')
      .where('identifier', '=', email)
      .where('value', '=', hashedToken)
      .where('expiresAt', '>', new Date())
      .executeTakeFirst();

    return !!verification;
  } catch (error) {
    console.error('Error validating verification token:', error);
    return false;
  }
}

/**
 * Clean up verification token after use
 */
export async function cleanupVerificationToken(email: string): Promise<void> {
  try {
    await getDatabasePool()
      .deleteFrom('verification')
      .where('identifier', '=', email)
      .execute();
  } catch (error) {
    console.error('Error cleaning up verification token:', error);
  }
}

/**
 * Check if verification token is expired
 */
export function isVerificationTokenExpired(token: { expiresAt: Date }): boolean {
  return new Date() > token.expiresAt;
}

/**
 * Create email verification process
 */
export async function createEmailVerification(email: string): Promise<{
  token: string;
  verificationLink: string;
  email: string;
  expiresAt: Date;
}> {
  const token = generateEmailVerificationToken();
  const verificationLink = createVerificationLink(token);

  await storeVerificationToken(email, token);

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  return {
    token,
    verificationLink,
    email,
    expiresAt,
  };
}

/**
 * Verify email using token
 */
export async function verifyEmailToken(email: string, token: string): Promise<EmailVerificationResult> {
  try {
    const isValid = await validateVerificationToken(email, token);

    if (!isValid) {
      return {
        success: false,
        email,
        message: 'Invalid or expired verification token',
      };
    }

    // Mark email as verified in user table
    await getDatabasePool()
      .updateTable('user')
      .set({ emailVerified: true, updatedAt: new Date() })
      .where('email', '=', email)
      .execute();

    // Clean up the verification token
    await cleanupVerificationToken(email);

    return {
      success: true,
      email,
      message: 'Email verified successfully',
      verified: true,
    };
  } catch (error) {
    console.error('Error verifying email token:', error);
    return {
      success: false,
      email,
      message: 'An error occurred during verification',
    };
  }
}

/**
 * Get verification status for email
 */
export async function getVerificationStatus(email: string): Promise<VerificationStatus> {
  try {
    // Check if email is already verified
    const user = await getDatabasePool()
      .selectFrom('user')
      .where('email', '=', email)
      .select('emailVerified')
      .executeTakeFirst();

    if (user?.emailVerified) {
      return {
        isVerified: true,
        hasPendingVerification: false,
      };
    }

    // Check for pending verification
    const verification = await getDatabasePool()
      .selectFrom('verification')
      .where('identifier', '=', email)
      .where('expiresAt', '>', new Date())
      .executeTakeFirst();

    return {
      isVerified: false,
      hasPendingVerification: !!verification,
      expiresAt: verification?.expiresAt,
    };
  } catch (error) {
    console.error('Error getting verification status:', error);
    return {
      isVerified: false,
      hasPendingVerification: false,
    };
  }
}

/**
 * Clean up expired verification tokens (maintenance function)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const result = await getDatabasePool()
      .deleteFrom('verification')
      .where('expiresAt', '<=', new Date())
      .execute();

    return result.numDeletedRows || 0;
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    return 0;
  }
}

/**
 * Resend verification email (generate new token)
 */
export async function resendVerificationEmail(email: string): Promise<{
  token: string;
  verificationLink: string;
  email: string;
} | null> {
  try {
    // Check if email is already verified
    const user = await getDatabasePool()
      .selectFrom('user')
      .where('email', '=', email)
      .select('emailVerified')
      .executeTakeFirst();

    if (user?.emailVerified) {
      return null; // Already verified
    }

    // Create new verification
    const result = await createEmailVerification(email);
    return {
      token: result.token,
      verificationLink: result.verificationLink,
      email: result.email,
    };
  } catch (error) {
    console.error('Error resending verification email:', error);
    return null;
  }
}

/**
 * Validate email format (basic validation)
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get verification token expiry time
 */
export function getVerificationTokenExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
}

/**
 * Check if email requires verification
 */
export async function emailRequiresVerification(email: string): Promise<boolean> {
  try {
    const user = await getDatabasePool()
      .selectFrom('user')
      .where('email', '=', email)
      .select('emailVerified')
      .executeTakeFirst();

    return !user?.emailVerified;
  } catch (error) {
    console.error('Error checking if email requires verification:', error);
    return true; // Default to requiring verification on error
  }
}
