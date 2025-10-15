# Authentication API Documentation

## Overview

The Contextwise PMS Authentication API provides comprehensive authentication services supporting both traditional email/password authentication and modern Ethereum wallet authentication via Sign-In with Ethereum (SIWE). The API is built on Better Auth and includes enterprise-grade security features, multi-factor authentication, and extensive monitoring capabilities.

## Table of Contents

- [Authentication Endpoints](#authentication-endpoints)
- [Email/Password Authentication](#emailpassword-authentication)
- [SIWE Authentication](#siwe-authentication)
- [Session Management](#session-management)
- [Multi-Factor Authentication](#multi-factor-authentication)
- [Protected Routes](#protected-routes)
- [Error Codes](#error-codes)
- [Security Considerations](#security-considerations)
- [Integration Examples](#integration-examples)
- [API Reference](#api-reference)

## Authentication Endpoints

All authentication endpoints are prefixed with `/api/auth/` and are handled by Better Auth. The API supports both JSON and form-encoded requests.

### Base URL
```
https://api.contextwise.com/api/auth
```

### Supported Methods
- **Email/Password**: Traditional username/password authentication
- **SIWE**: Ethereum wallet authentication using ERC-4361 standard
- **Session Management**: JWT-based session handling
- **MFA**: TOTP, SMS, and Email-based multi-factor authentication

## Email/Password Authentication

### POST /api/auth/sign-in

Sign in with email and password credentials.

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

#### Response (Success - 200)

```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "image": null,
    "emailVerified": true,
    "createdAt": "2024-01-01T10:00:00Z",
    "updatedAt": "2024-01-01T10:00:00Z"
  },
  "session": {
    "id": "session-456",
    "userId": "user-123",
    "token": "jwt-token-here",
    "expiresAt": "2024-01-02T10:00:00Z",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

#### Response (Error - 401)

```json
{
  "error": "Invalid email or password",
  "code": "INVALID_CREDENTIALS"
}
```

### POST /api/auth/sign-up

Create a new user account with email and password.

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "newuser@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

#### Response (Success - 201)

```json
{
  "user": {
    "id": "user-789",
    "email": "newuser@example.com",
    "name": "John Doe",
    "emailVerified": false,
    "createdAt": "2024-01-01T10:00:00Z"
  }
}
```

#### Response (Error - 409)

```json
{
  "error": "Email already exists",
  "code": "EMAIL_ALREADY_EXISTS"
}
```

### POST /api/auth/sign-out

Sign out the current user and invalidate their session.

#### Request

**Headers:**
```
Authorization: Bearer <session-token>
```

#### Response (Success - 200)

```json
{
  "success": true
}
```

## SIWE Authentication

Sign-In with Ethereum (SIWE) enables passwordless authentication using Ethereum wallets.

### GET /api/auth/siwe/nonce

Generate a cryptographically secure nonce for SIWE message signing.

#### Response (Success - 200)

```json
{
  "nonce": "abc123def456ghi789"
}
```

### POST /api/auth/siwe/verify

Verify SIWE signature and authenticate the user.

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "message": "contextwise.com wants you to sign in with your Ethereum account:\n0x1234567890abcdef...\n\nSign-In With Ethereum\n\nURI: https://contextwise.com\nVersion: 1\nChain ID: 1\nNonce: abc123def456ghi789\nIssued At: 2024-01-01T10:00:00Z\nExpiration Time: 2024-01-01T11:00:00Z",
  "signature": "0xabcdef1234567890...",
  "address": "0x1234567890abcdef1234567890abcdef12345678"
}
```

#### Response (Success - 200)

```json
{
  "user": {
    "id": "user-321",
    "email": null,
    "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "name": "vitalik.eth",
    "image": null,
    "emailVerified": false,
    "createdAt": "2024-01-01T10:00:00Z"
  },
  "session": {
    "id": "session-654",
    "userId": "user-321",
    "token": "jwt-token-here",
    "expiresAt": "2024-01-02T10:00:00Z"
  }
}
```

#### Response (Error - 401)

```json
{
  "error": "SIWE verification failed",
  "code": "SIWE_VERIFICATION_FAILED"
}
```

## Session Management

### GET /api/auth/session

Get current session information.

#### Request

**Headers:**
```
Authorization: Bearer <session-token>
```

#### Response (Success - 200)

```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "session": {
    "id": "session-456",
    "expiresAt": "2024-01-02T10:00:00Z"
  }
}
```

#### Response (Error - 401)

```json
{
  "error": "No valid session found",
  "code": "NO_SESSION"
}
```

## Multi-Factor Authentication

### POST /api/auth/mfa/setup

Initialize MFA setup for a user.

#### Request

**Headers:**
```
Authorization: Bearer <session-token>
Content-Type: application/json
```

**Body:**
```json
{
  "type": "TOTP"
}
```

#### Response (Success - 200)

```json
{
  "mfaSetup": {
    "id": "mfa-123",
    "type": "TOTP",
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCodeUrl": "otpauth://totp/...",
    "backupCodes": ["12345678", "87654321", ...]
  }
}
```

### POST /api/auth/mfa/verify

Verify and enable MFA for the user.

#### Request

**Headers:**
```
Authorization: Bearer <session-token>
Content-Type: application/json
```

**Body:**
```json
{
  "setupId": "mfa-123",
  "code": "123456"
}
```

#### Response (Success - 200)

```json
{
  "success": true,
  "message": "MFA enabled successfully"
}
```

### POST /api/auth/mfa/authenticate

Authenticate using MFA code.

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "mfaToken": "temp-session-token",
  "code": "123456"
}
```

#### Response (Success - 200)

```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com"
  },
  "session": {
    "id": "session-456",
    "token": "final-jwt-token"
  }
}
```

## Protected Routes

### GET /api/protected

Example protected route that requires authentication.

#### Request

**Headers:**
```
Authorization: Bearer <session-token>
```

#### Response (Success - 200)

```json
{
  "message": "Protected data",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "timestamp": "2024-01-01T10:00:00Z"
}
```

#### Response (Error - 401)

```json
{
  "error": "Unauthorized"
}
```

## Error Codes

### Authentication Errors

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_CREDENTIALS` | Email or password is incorrect | 401 |
| `USER_NOT_FOUND` | User account does not exist | 404 |
| `EMAIL_ALREADY_EXISTS` | Email address is already registered | 409 |
| `ACCOUNT_DISABLED` | User account has been disabled | 403 |
| `TOO_MANY_ATTEMPTS` | Rate limit exceeded for login attempts | 429 |

### SIWE Errors

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `SIWE_VERIFICATION_FAILED` | Ethereum signature verification failed | 401 |
| `INVALID_NONCE` | Nonce has expired or is invalid | 401 |
| `UNSUPPORTED_CHAIN` | Ethereum chain is not supported | 400 |
| `MESSAGE_EXPIRED` | SIWE message has expired | 401 |

### MFA Errors

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `MFA_REQUIRED` | Multi-factor authentication is required | 401 |
| `MFA_INVALID` | Provided MFA code is invalid | 401 |
| `MFA_EXPIRED` | MFA code has expired | 401 |
| `MFA_SETUP_REQUIRED` | MFA setup must be completed first | 403 |
| `BACKUP_CODE_USED` | Backup code has already been used | 401 |

### Session Errors

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `NO_SESSION` | No valid session found | 401 |
| `SESSION_EXPIRED` | Session has expired | 401 |
| `SESSION_INVALID` | Session token is invalid | 401 |
| `CONCURRENT_SESSION_LIMIT` | Maximum concurrent sessions exceeded | 403 |

### General Errors

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `NETWORK_ERROR` | Network connectivity issue | 503 |
| `INTERNAL_ERROR` | Internal server error | 500 |
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `RATE_LIMITED` | Too many requests | 429 |

## Security Considerations

### HTTPS Enforcement

All authentication endpoints **must** be accessed over HTTPS in production environments. The API automatically redirects HTTP requests to HTTPS when `NODE_ENV=production`.

### Rate Limiting

Authentication endpoints are protected by comprehensive rate limiting:

- **Sign-in attempts**: 5 attempts per minute per IP
- **Sign-up attempts**: 3 attempts per hour per IP
- **SIWE verification**: 10 attempts per minute per IP
- **MFA verification**: 3 attempts per minute per user

### Session Security

- **JWT Tokens**: Cryptographically signed with HS256
- **Expiration**: Sessions expire after 24 hours of inactivity
- **Secure Storage**: Never store tokens in localStorage; use httpOnly cookies
- **Token Rotation**: New tokens issued on each authentication

### Password Security

- **Minimum Requirements**: 8 characters, mixed case, numbers, special characters
- **Hashing**: bcrypt with 12 rounds
- **Breach Checking**: Integration with HaveIBeenPwned API
- **Password Reset**: Secure token-based password reset flow

### MFA Security

- **TOTP**: Time-based one-time passwords using RFC 6238
- **Backup Codes**: 10 single-use backup codes per user
- **Hardware Tokens**: Support for FIDO2/WebAuthn
- **Rate Limiting**: MFA attempts are heavily rate limited

### SIWE Security

- **Message Validation**: Strict adherence to ERC-4361 specification
- **Domain Verification**: Only accepts messages for configured domains
- **Chain Validation**: Supports mainnet and test networks
- **Replay Protection**: Nonce-based replay attack prevention

### Headers Security

All responses include comprehensive security headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; script-src 'none'; object-src 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Data Protection

- **PII Handling**: Personally identifiable information is encrypted at rest
- **Audit Logging**: All authentication events are logged with PII redaction
- **Data Retention**: Failed authentication attempts retained for 30 days
- **GDPR Compliance**: Right to erasure and data portability support

## Integration Examples

### JavaScript/TypeScript Client

```typescript
import { createAuthClient } from 'better-auth/client';

const authClient = createAuthClient({
  baseURL: 'https://api.contextwise.com',
  fetchOptions: {
    credentials: 'include', // Important for cookies
  },
});

// Email/Password Sign In
async function signIn(email: string, password: string) {
  try {
    const result = await authClient.signIn.email({
      email,
      password,
    });

    if (result.error) {
      console.error('Sign in failed:', result.error);
      return;
    }

    console.log('Signed in successfully:', result.data);
    // Store session info securely
    localStorage.setItem('user', JSON.stringify(result.data.user));
  } catch (error) {
    console.error('Sign in error:', error);
  }
}

// SIWE Sign In
async function signInWithEthereum() {
  try {
    // Get nonce
    const nonceResult = await authClient.signIn.siwe.getNonce();
    if (nonceResult.error) throw nonceResult.error;

    // Create SIWE message
    const message = createSIWEMessage({
      domain: window.location.host,
      address: await getUserAddress(),
      statement: 'Sign in to Contextwise PMS',
      uri: window.location.origin,
      version: '1',
      chainId: 1,
      nonce: nonceResult.data,
    });

    // Sign message with wallet
    const signature = await signMessage(message);

    // Verify and sign in
    const result = await authClient.signIn.siwe.verify({
      message,
      signature,
    });

    if (result.error) {
      console.error('SIWE sign in failed:', result.error);
      return;
    }

    console.log('Signed in with Ethereum:', result.data);
  } catch (error) {
    console.error('SIWE sign in error:', error);
  }
}

// Sign Out
async function signOut() {
  try {
    const result = await authClient.signOut();
    if (result.error) {
      console.error('Sign out failed:', result.error);
      return;
    }

    // Clear local session data
    localStorage.removeItem('user');
    console.log('Signed out successfully');
  } catch (error) {
    console.error('Sign out error:', error);
  }
}
```

### React Integration

```tsx
import { createAuthClient } from 'better-auth/react';

const authClient = createAuthClient({
  baseURL: 'https://api.contextwise.com',
});

function App() {
  return (
    <AuthProvider client={authClient}>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, signIn, signOut, isPending } = useAuth();

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <div>
        <h1>Contextwise PMS</h1>
        <button
          onClick={() => signIn.social({ provider: 'ethereum' })}
          disabled={isPending}
        >
          Sign in with Ethereum
        </button>
        <EmailSignInForm />
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome, {user.name || user.email}!</h1>
      <button onClick={signOut}>Sign Out</button>
      <Dashboard />
    </div>
  );
}

function EmailSignInForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn.email({ email, password });
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit">Sign In</button>
    </form>
  );
}
```

### Vue.js Integration

```vue
<template>
  <div>
    <div v-if="!user">
      <button @click="signInWithEthereum" :disabled="isPending">
        Sign in with Ethereum
      </button>
      <form @submit.prevent="handleEmailSignIn">
        <input v-model="email" type="email" placeholder="Email" required />
        <input v-model="password" type="password" placeholder="Password" required />
        <button type="submit" :disabled="isPending">Sign In</button>
      </form>
    </div>
    <div v-else>
      <h1>Welcome, {{ user.name || user.email }}!</h1>
      <button @click="signOut">Sign Out</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuth } from 'better-auth/vue';

const { user, signIn, signOut, isPending } = useAuth();
const email = ref('');
const password = ref('');

const handleEmailSignIn = async () => {
  try {
    await signIn.email({ email: email.value, password: password.value });
  } catch (error) {
    console.error('Sign in failed:', error);
  }
};

const signInWithEthereum = async () => {
  try {
    await signIn.social({ provider: 'ethereum' });
  } catch (error) {
    console.error('Ethereum sign in failed:', error);
  }
};
</script>
```

### Server-Side Integration (Node.js/Express)

```typescript
import express from 'express';
import { createAuthClient } from 'better-auth/client';

const app = express();
const authClient = createAuthClient({
  baseURL: process.env.API_BASE_URL,
});

// Middleware to verify authentication
app.use('/api', async (req, res, next) => {
  try {
    const session = await authClient.getSession({
      headers: req.headers,
    });

    if (!session.data) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = session.data.user;
    req.session = session.data.session;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
});

// Protected route
app.get('/api/profile', (req, res) => {
  res.json({
    user: req.user,
    profile: {
      // User profile data
    },
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## API Reference

### Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/sign-in` | 5 requests | 1 minute |
| `/api/auth/sign-up` | 3 requests | 1 hour |
| `/api/auth/siwe/*` | 10 requests | 1 minute |
| `/api/auth/mfa/*` | 3 requests | 1 minute |

### Response Format

All API responses follow a consistent format:

**Success Response:**
```json
{
  "data": { /* response data */ },
  "message": "Optional success message"
}
```

**Error Response:**
```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_ERROR_CODE",
  "details": { /* optional additional error details */ }
}
```

### Webhooks

The API supports webhooks for authentication events:

- `user.created`: Fired when a new user account is created
- `user.signed_in`: Fired when a user successfully signs in
- `user.signed_out`: Fired when a user signs out
- `mfa.enabled`: Fired when MFA is enabled for a user
- `session.expired`: Fired when a session expires

### SDKs and Libraries

Official SDKs are available for:
- **JavaScript/TypeScript**: `better-auth` npm package
- **React**: `@better-auth/react` npm package
- **Vue**: `@better-auth/vue` npm package
- **Svelte**: `@better-auth/svelte` npm package

### Support

For API support, please contact:
- **Email**: api-support@contextwise.com
- **Documentation**: https://docs.contextwise.com
- **Status Page**: https://status.contextwise.com

### Versioning

The API follows semantic versioning:
- **v1.0.0**: Initial release with email/password and SIWE authentication
- **v1.1.0**: Added MFA support
- **v1.2.0**: Added session management improvements

API endpoints are backward compatible within major versions.
