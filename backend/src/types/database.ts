/**
 * Database type definitions for the Better Auth authentication system.
 * These interfaces define the structure of all database tables used in the authentication flow.
 */

export interface Database {
  user: UserTable;
  session: SessionTable;
  account: AccountTable;
  verification: VerificationTable;
  walletAddress: WalletAddressTable;
  authMetrics: AuthMetricsTable;
  // Add custom tables as needed
}

export interface UserTable {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionTable {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface AccountTable {
  id: string;
  userId: string;
  accountId: string;
  providerId: string;
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  scope: string | null;
  idToken: string | null;
  password: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationTable {
  id: string;
  identifier: string;
  value: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface WalletAddressTable {
  id: string;
  userId: string;
  address: string;
  chainId: number;
  isPrimary: boolean;
  createdAt: Date;
}

export interface AuthMetricsTable {
  id: string;
  metricType: string;
  metricName: string;
  value: number;
  tags: Record<string, any> | null;
  timestamp: Date;
  createdAt: Date;
}
