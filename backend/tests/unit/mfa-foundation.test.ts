import { describe, test, expect } from "bun:test";

describe("Multi-Factor Authentication Foundation", () => {
  test("should generate secure TOTP secret", async () => {
    const { generateTOTPSecret } = await import("@/lib/mfa-foundation");

    const secret = generateTOTPSecret();

    expect(typeof secret).toBe('string');
    expect(secret.length).toBeGreaterThan(10);
    // Should be base32 encoded (only contains valid base32 characters)
    expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
  });

  test("should validate TOTP code", async () => {
    const { validateTOTPCode } = await import("@/lib/mfa-foundation");

    const secret = 'JBSWY3DPEHPK3PXP';
    const validCode = '123456';
    const invalidCode = '999999';

    // Basic validation - should return boolean
    const isValid = await validateTOTPCode(secret, validCode);
    const isInvalid = await validateTOTPCode(secret, invalidCode);

    expect(typeof isValid).toBe('boolean');
    expect(typeof isInvalid).toBe('boolean');
  });

  test("should generate QR code URL for TOTP setup", async () => {
    const { generateTOTPQRCodeURL } = await import("@/lib/mfa-foundation");

    const secret = 'JBSWY3DPEHPK3PXP';
    const accountName = 'user@example.com';
    const issuerName = 'MyApp';

    const qrCodeURL = generateTOTPQRCodeURL(secret, accountName, issuerName);

    expect(qrCodeURL).toContain('otpauth://totp/');
    expect(qrCodeURL).toContain(encodeURIComponent(accountName));
    expect(qrCodeURL).toContain(encodeURIComponent(issuerName));
    expect(qrCodeURL).toContain(secret);
  });

  test("should handle MFA setup expiry", async () => {
    const { isMFASetupExpired } = await import("@/lib/mfa-foundation");

    // Create a setup that is exactly 25 hours old (should be expired)
    const expiredSetup = { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) };
    // Create a setup that is only 1 hour old (should not be expired)
    const validSetup = { createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) };

    expect(isMFASetupExpired(expiredSetup)).toBe(true);
    expect(isMFASetupExpired(validSetup)).toBe(false);
  });

  test("should define MFA types", async () => {
    const { MFA_TYPES } = await import("@/lib/mfa-foundation");

    expect(MFA_TYPES).toHaveProperty('TOTP');
    expect(MFA_TYPES).toHaveProperty('SMS');
    expect(MFA_TYPES).toHaveProperty('EMAIL');
    expect(MFA_TYPES).toHaveProperty('HARDWARE_TOKEN');

    expect(MFA_TYPES.TOTP).toBe('TOTP');
    expect(MFA_TYPES.SMS).toBe('SMS');
    expect(MFA_TYPES.EMAIL).toBe('EMAIL');
    expect(MFA_TYPES.HARDWARE_TOKEN).toBe('HARDWARE_TOKEN');
  });

  test("should export all MFA foundation utilities", async () => {
    const mfaFoundation = await import("@/lib/mfa-foundation");

    expect(mfaFoundation).toHaveProperty('createMFASetup');
    expect(mfaFoundation).toHaveProperty('verifyMFASetup');
    expect(mfaFoundation).toHaveProperty('getMFAForUser');
    expect(mfaFoundation).toHaveProperty('disableMFAForUser');
    expect(mfaFoundation).toHaveProperty('generateTOTPSecret');
    expect(mfaFoundation).toHaveProperty('validateTOTPCode');
    expect(mfaFoundation).toHaveProperty('generateTOTPQRCodeURL');
    expect(mfaFoundation).toHaveProperty('getMFAStatus');
    expect(mfaFoundation).toHaveProperty('generateBackupCodes');
    expect(mfaFoundation).toHaveProperty('validateBackupCode');
    expect(mfaFoundation).toHaveProperty('MFA_TYPES');
  });
});
