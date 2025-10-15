import { randomBytes, createHash } from 'crypto';
import { getDatabasePool } from './database';
import { createId } from '@paralleldrive/cuid2';

/**
 * Multi-Factor Authentication Foundation
 */

export interface MFASetup {
  id: string;
  userId: string;
  type: MFAType;
  secret?: string;
  backupCodes?: string[];
  verified: boolean;
  enabled: boolean;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MFAVerificationResult {
  success: boolean;
  verified?: boolean;
  error?: string;
}

export interface MFAStatus {
  enabled: boolean;
  type?: MFAType;
  verified?: boolean;
  lastUsed?: Date;
}

export type MFAType = 'TOTP' | 'SMS' | 'EMAIL' | 'HARDWARE_TOKEN';

export const MFA_TYPES = {
  TOTP: 'TOTP' as const,
  SMS: 'SMS' as const,
  EMAIL: 'EMAIL' as const,
  HARDWARE_TOKEN: 'HARDWARE_TOKEN' as const,
} as const;

/**
 * Generate a secure TOTP secret (base32 encoded)
 */
export function generateTOTPSecret(): string {
  const buffer = randomBytes(20); // 160 bits for TOTP
  // Convert to base32 manually since Node.js crypto doesn't have toString('base32')
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  let bits = 0;
  let value = 0;

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      result += base32Chars[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += base32Chars[(value << (5 - bits)) & 31];
  }

  return result;
}

/**
 * Generate QR code URL for TOTP setup
 */
export function generateTOTPQRCodeURL(secret: string, accountName: string, issuerName: string = 'Contextwise PMS'): string {
  const encodedIssuer = encodeURIComponent(issuerName);
  const encodedAccount = encodeURIComponent(accountName);
  const parameters = `secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;

  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?${parameters}`;
}

/**
 * Validate TOTP code (simplified implementation - in production use speakeasy)
 */
export async function validateTOTPCode(secret: string, code: string): Promise<boolean> {
  // This is a simplified implementation
  // In production, use a proper TOTP library like speakeasy
  if (!secret || !code || code.length !== 6) {
    return false;
  }

  // Basic validation - in real implementation, this would verify the time-based code
  const isNumeric = /^\d{6}$/.test(code);
  return isNumeric && secret.length > 10;
}

/**
 * Generate backup codes for MFA
 */
export async function generateBackupCodes(userId: string, count: number = 10): Promise<string[]> {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    const code = randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }

  // In production, these would be hashed and stored securely
  // For now, we'll store them as-is for simplicity
  await updateBackupCodes(userId, codes);

  return codes;
}

/**
 * Validate backup code
 */
export async function validateBackupCode(userId: string, code: string): Promise<boolean> {
  try {
    const db = getDatabasePool();

    const mfa = await db
      .selectFrom('mfa')
      .where('userId', '=', userId)
      .where('enabled', '=', true)
      .executeTakeFirst();

    if (!mfa || !mfa.backupCodes) {
      return false;
    }

    const codes = mfa.backupCodes as string[];
    const codeIndex = codes.indexOf(code.toUpperCase());

    if (codeIndex === -1) {
      return false;
    }

    // Remove used code
    codes.splice(codeIndex, 1);
    await updateBackupCodes(userId, codes);

    // Update last used timestamp
    await updateMFALastUsed(userId);

    return true;
  } catch (error) {
    console.error('Error validating backup code:', error);
    return false;
  }
}

/**
 * Create MFA setup for user
 */
export async function createMFASetup(userId: string, type: MFAType): Promise<MFASetup> {
  try {
    const db = getDatabasePool();

    // Check if user already has this MFA type
    const existing = await db
      .selectFrom('mfa')
      .where('userId', '=', userId)
      .where('type', '=', type)
      .executeTakeFirst();

    if (existing) {
      throw new Error(`MFA type ${type} already exists for user`);
    }

    let secret: string | undefined;
    let backupCodes: string[] | undefined;

    // Generate appropriate secrets based on type
    switch (type) {
      case MFA_TYPES.TOTP:
        secret = generateTOTPSecret();
        backupCodes = await generateBackupCodes(userId);
        break;
      case MFA_TYPES.SMS:
      case MFA_TYPES.EMAIL:
        // For SMS/Email, we'll store configuration data in secret
        secret = JSON.stringify({ configured: false });
        break;
      case MFA_TYPES.HARDWARE_TOKEN:
        // Hardware tokens would have their own setup process
        secret = JSON.stringify({ pending: true });
        break;
    }

    const id = createId();
    const now = new Date();

    await db
      .insertInto('mfa')
      .values({
        id,
        userId,
        type,
        secret,
        backupCodes,
        verified: false,
        enabled: false,
        createdAt: now,
        updatedAt: now,
      })
      .execute();

    return {
      id,
      userId,
      type,
      secret,
      backupCodes,
      verified: false,
      enabled: false,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    console.error('Error creating MFA setup:', error);
    throw error;
  }
}

/**
 * Verify MFA setup
 */
export async function verifyMFASetup(setupId: string, verificationCode: string): Promise<MFAVerificationResult> {
  try {
    const db = getDatabasePool();

    const setup = await db
      .selectFrom('mfa')
      .where('id', '=', setupId)
      .executeTakeFirst();

    if (!setup) {
      return { success: false, error: 'MFA setup not found' };
    }

    let isValid = false;

    // Verify based on MFA type
    switch (setup.type) {
      case MFA_TYPES.TOTP:
        isValid = await validateTOTPCode(setup.secret!, verificationCode);
        break;
      case MFA_TYPES.SMS:
      case MFA_TYPES.EMAIL:
        // For SMS/Email, verification code would be checked against sent code
        isValid = verificationCode.length === 6 && /^\d{6}$/.test(verificationCode);
        break;
      case MFA_TYPES.HARDWARE_TOKEN:
        // Hardware token verification would be different
        isValid = true; // Placeholder
        break;
      default:
        return { success: false, error: 'Unsupported MFA type' };
    }

    if (!isValid) {
      return { success: false, error: 'Invalid verification code' };
    }

    // Mark as verified and enabled
    await db
      .updateTable('mfa')
      .set({
        verified: true,
        enabled: true,
        updatedAt: new Date(),
      })
      .where('id', '=', setupId)
      .execute();

    return { success: true, verified: true };
  } catch (error) {
    console.error('Error verifying MFA setup:', error);
    return { success: false, error: 'Verification failed' };
  }
}

/**
 * Get MFA setup for user
 */
export async function getMFAForUser(userId: string, type?: MFAType): Promise<MFASetup | null> {
  try {
    const db = getDatabasePool();

    let query = db
      .selectFrom('mfa')
      .where('userId', '=', userId);

    if (type) {
      query = query.where('type', '=', type);
    }

    const setup = await query.executeTakeFirst();

    if (!setup) {
      return null;
    }

    return {
      id: setup.id,
      userId: setup.userId,
      type: setup.type as MFAType,
      secret: setup.secret || undefined,
      backupCodes: setup.backupCodes as string[] | undefined,
      verified: setup.verified,
      enabled: setup.enabled,
      lastUsed: setup.lastUsed || undefined,
      createdAt: setup.createdAt,
      updatedAt: setup.updatedAt,
    };
  } catch (error) {
    console.error('Error getting MFA for user:', error);
    return null;
  }
}

/**
 * Disable MFA for user
 */
export async function disableMFAForUser(userId: string, type?: MFAType): Promise<void> {
  try {
    const db = getDatabasePool();

    let query = db
      .deleteFrom('mfa')
      .where('userId', '=', userId);

    if (type) {
      query = query.where('type', '=', type);
    }

    await query.execute();
  } catch (error) {
    console.error('Error disabling MFA for user:', error);
    throw error;
  }
}

/**
 * Get MFA status for user
 */
export async function getMFAStatus(userId: string): Promise<MFAStatus> {
  try {
    const db = getDatabasePool();

    const mfa = await db
      .selectFrom('mfa')
      .where('userId', '=', userId)
      .where('enabled', '=', true)
      .executeTakeFirst();

    if (!mfa) {
      return { enabled: false };
    }

    return {
      enabled: true,
      type: mfa.type as MFAType,
      verified: mfa.verified,
      lastUsed: mfa.lastUsed || undefined,
    };
  } catch (error) {
    console.error('Error getting MFA status:', error);
    return { enabled: false };
  }
}

/**
 * Check if MFA setup is expired
 */
export function isMFASetupExpired(setup: { createdAt: Date }, maxAgeHours: number = 24): boolean {
  const now = new Date();
  const createdAt = new Date(setup.createdAt);
  const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  return ageHours > maxAgeHours;
}

/**
 * Update backup codes
 */
async function updateBackupCodes(userId: string, codes: string[]): Promise<void> {
  try {
    const db = getDatabasePool();

    await db
      .updateTable('mfa')
      .set({
        backupCodes: codes,
        updatedAt: new Date(),
      })
      .where('userId', '=', userId)
      .execute();
  } catch (error) {
    console.error('Error updating backup codes:', error);
  }
}

/**
 * Update MFA last used timestamp
 */
async function updateMFALastUsed(userId: string): Promise<void> {
  try {
    const db = getDatabasePool();

    await db
      .updateTable('mfa')
      .set({
        lastUsed: new Date(),
        updatedAt: new Date(),
      })
      .where('userId', '=', userId)
      .execute();
  } catch (error) {
    console.error('Error updating MFA last used:', error);
  }
}

/**
 * Clean up expired MFA setups
 */
export async function cleanupExpiredMFASetups(maxAgeHours: number = 24): Promise<number> {
  try {
    const db = getDatabasePool();
    const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    const result = await db
      .deleteFrom('mfa')
      .where('verified', '=', false)
      .where('createdAt', '<', cutoffDate)
      .execute();

    return result.numDeletedRows || 0;
  } catch (error) {
    console.error('Error cleaning up expired MFA setups:', error);
    return 0;
  }
}
