import { compare } from 'bcryptjs';

/**
 * Demo credentials configuration for testing and demonstration purposes
 */
export const DEMO_CREDENTIALS = {
  email: 'demo@farsquare.xyz',
  password: 'demo123',
  hashedPassword: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LEsBpEw5jKsYXpQG', // bcrypt hash of 'demo123'
  description: 'Demo account for testing and demonstration purposes'
} as const;

/**
 * Validates demo credentials format
 */
export function validateDemoCredentials(email: string, password: string): boolean {
  return email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password;
}

/**
 * Validates demo password against stored hash
 */
export async function validateDemoPassword(password: string): Promise<boolean> {
  try {
    return await compare(password, DEMO_CREDENTIALS.hashedPassword);
  } catch (error) {
    console.error('Demo password validation failed:', error);
    return false;
  }
}

/**
 * Gets demo credentials for display/documentation purposes
 */
export function getDemoCredentials() {
  return {
    email: DEMO_CREDENTIALS.email,
    password: DEMO_CREDENTIALS.password,
    description: DEMO_CREDENTIALS.description,
  };
}

/**
 * Checks if provided credentials match demo credentials
 */
export function isDemoCredentials(email: string, password: string): boolean {
  return email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password;
}

/**
 * Gets demo user information (safe for display)
 */
export function getDemoUserInfo() {
  return {
    email: DEMO_CREDENTIALS.email,
    name: 'Demo User',
    description: DEMO_CREDENTIALS.description,
  };
}
