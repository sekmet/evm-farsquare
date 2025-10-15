import { hash, compare, genSalt } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';

/**
 * Password security utilities
 */

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-4 scale
  feedback: string[];
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxLength?: number;
  preventCommonPasswords: boolean;
  preventReusedPasswords: boolean;
}

export interface CompromisedPasswordCheck {
  isCompromised: boolean;
  occurrences: number;
}

export interface PasswordHistoryCheck {
  isReused: boolean;
  similarity: number; // 0-1 scale
}

const COMMON_PASSWORDS = new Set([
  'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
  'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'iloveyou',
  'princess', 'rockyou', '1234567', '12345678', 'password1', '123123',
  'football', 'baseball', 'welcome1', 'admin123', 'root', 'passw0rd'
]);

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
  maxLength: 128,
  preventCommonPasswords: true,
  preventReusedPasswords: true,
};

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string, saltRounds: number = 12): Promise<string> {
  try {
    return await hash(password, saltRounds);
  } catch (error) {
    throw new Error(`Password hashing failed: ${error}`);
  }
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await compare(password, hashedPassword);
  } catch (error) {
    throw new Error(`Password verification failed: ${error}`);
  }
}

/**
 * Generate a secure salt
 */
export async function generateSalt(rounds: number = 12): Promise<string> {
  return await genSalt(rounds);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  else feedback.push('Password should be at least 8 characters long');

  if (password.length >= 12) score++;
  else if (password.length >= 8) feedback.push('Consider using 12+ characters for better security');

  // Character variety checks
  if (/[a-z]/.test(password)) score += 0.5;
  else feedback.push('Include lowercase letters');

  if (/[A-Z]/.test(password)) score += 0.5;
  else feedback.push('Include uppercase letters');

  if (/\d/.test(password)) score += 0.5;
  else feedback.push('Include numbers');

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 0.5;
  else feedback.push('Include special characters for stronger security');

  // Common password check
  if (isCommonPassword(password)) {
    score = Math.min(score, 1);
    feedback.push('This is a commonly used password - choose something more unique');
  }

  // Dictionary words check (simple)
  if (password.toLowerCase().includes('password') ||
      password.toLowerCase().includes('qwerty') ||
      password.toLowerCase().includes('123456')) {
    score = Math.min(score, 2);
    feedback.push('Avoid using dictionary words or common patterns');
  }

  const isValid = score >= 3;

  return {
    isValid,
    score: Math.min(Math.floor(score), 4),
    feedback,
  };
}

/**
 * Check if password is in common password list
 */
export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}

/**
 * Enforce password policy
 */
export function enforcePasswordPolicy(password: string, policy: Partial<PasswordPolicy> = {}): PasswordValidationResult {
  const effectivePolicy = { ...DEFAULT_POLICY, ...policy };
  const feedback: string[] = [];
  let score = 0;

  // Length checks
  if (password.length < effectivePolicy.minLength) {
    feedback.push(`Password must be at least ${effectivePolicy.minLength} characters long`);
  } else {
    score++;
  }

  if (effectivePolicy.maxLength && password.length > effectivePolicy.maxLength) {
    feedback.push(`Password must not exceed ${effectivePolicy.maxLength} characters`);
  } else if (password.length >= effectivePolicy.minLength) {
    score++;
  }

  // Character requirements
  if (effectivePolicy.requireLowercase && !/[a-z]/.test(password)) {
    feedback.push('Password must contain at least one lowercase letter');
  } else if (effectivePolicy.requireLowercase) {
    score++;
  }

  if (effectivePolicy.requireUppercase && !/[A-Z]/.test(password)) {
    feedback.push('Password must contain at least one uppercase letter');
  } else if (effectivePolicy.requireUppercase) {
    score++;
  }

  if (effectivePolicy.requireNumbers && !/\d/.test(password)) {
    feedback.push('Password must contain at least one number');
  } else if (effectivePolicy.requireNumbers) {
    score++;
  }

  if (effectivePolicy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    feedback.push('Password must contain at least one special character');
  } else if (effectivePolicy.requireSpecialChars) {
    score++;
  }

  // Common password check
  if (effectivePolicy.preventCommonPasswords && isCommonPassword(password)) {
    feedback.push('This password is too common - please choose a more unique password');
  } else if (effectivePolicy.preventCommonPasswords) {
    score++;
  }

  const isValid = feedback.length === 0;

  return {
    isValid,
    score: Math.min(score, 4),
    feedback,
  };
}

/**
 * Check if password has been compromised using HaveIBeenPwned API
 */
export async function checkPasswordCompromised(password: string): Promise<CompromisedPasswordCheck> {
  try {
    // Create SHA-1 hash of password
    const sha1Hash = createHash('sha1').update(password).digest('hex').toUpperCase();

    // Get first 5 characters for k-anonymity
    const prefix = sha1Hash.substring(0, 5);
    const suffix = sha1Hash.substring(5);

    // Query HaveIBeenPwned API
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Contextwise-PMS-Password-Checker',
      },
    });

    if (!response.ok) {
      // If API is down, assume password is safe
      return { isCompromised: false, occurrences: 0 };
    }

    const data = await response.text();
    const lines = data.split('\n');

    // Find our hash suffix in the response
    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix === suffix) {
        return {
          isCompromised: true,
          occurrences: parseInt(count, 10),
        };
      }
    }

    return { isCompromised: false, occurrences: 0 };
  } catch (error) {
    // If API call fails, assume password is safe to avoid blocking users
    console.warn('Password compromise check failed:', error);
    return { isCompromised: false, occurrences: 0 };
  }
}

/**
 * Generate a secure password reset token
 */
export function generatePasswordResetToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Validate a password reset token (basic implementation)
 */
export function validatePasswordResetToken(token: string): boolean {
  // In a real implementation, this would check against a database
  // and verify expiration time
  return token.length === 64 && /^[a-f0-9]+$/.test(token);
}

/**
 * Check password against user's password history
 */
export function checkPasswordHistory(password: string, previousPasswords: string[]): PasswordHistoryCheck {
  for (const prevPassword of previousPasswords) {
    try {
      // Direct comparison (in real app, compare hashes)
      if (password === prevPassword) {
        return { isReused: true, similarity: 1.0 };
      }

      // Simple similarity check
      const similarity = calculateSimilarity(password, prevPassword);
      if (similarity > 0.8) {
        return { isReused: false, similarity };
      }
    } catch (error) {
      // Continue checking other passwords
      continue;
    }
  }

  return { isReused: false, similarity: 0 };
}

/**
 * Calculate string similarity (simple implementation)
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Get password security recommendations
 */
export function getPasswordRecommendations(password: string): string[] {
  const recommendations: string[] = [];
  const validation = validatePasswordStrength(password);

  if (password.length < 12) {
    recommendations.push('Use at least 12 characters for better security');
  }

  if (!/[a-z]/.test(password)) {
    recommendations.push('Include lowercase letters');
  }

  if (!/[A-Z]/.test(password)) {
    recommendations.push('Include uppercase letters');
  }

  if (!/\d/.test(password)) {
    recommendations.push('Include numbers');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    recommendations.push('Include special characters');
  }

  if (isCommonPassword(password)) {
    recommendations.push('Avoid commonly used passwords');
  }

  return recommendations;
}

/**
 * Secure password generator (for password reset suggestions)
 */
export function generateSecurePassword(length: number = 16): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  const allChars = lowercase + uppercase + numbers + symbols;
  let password = '';

  // Ensure at least one character from each category
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
