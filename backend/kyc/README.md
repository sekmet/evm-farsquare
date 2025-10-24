# FarSquare KYC Attestation Server

## Overview

Privacy-preserving KYC (Know Your Customer) attestation service using W3C Verifiable Credentials and JWS signing.

**Key Features**:
- ✅ Client-side document hashing (no PII in requests)
- ✅ W3C Verifiable Credential generation
- ✅ ES256 JWS proof signing
- ✅ Attestation hash for on-chain verification
- ✅ Secure storage (file-based/S3)
- ✅ Hono-based REST API

---

## Quick Start

```bash
# Install dependencies
bun install

# Run tests
bun test

# Start development server
bun run dev

# Start production server
bun run start
```

---

## API Endpoints

### Health Check
```bash
GET /health
Response: {"status":"ok","timestamp":1697...}
```

### Submit KYC Request
```bash
POST /kyc/submit
Body: {
  "wallet": "SP2ABC...",
  "fileName": "passport.pdf"
}
Response: {
  "kycId": "kyc-1697...",
  "uploadUrl": "http://localhost:4000/mock-upload/...",
  "message": "Upload URL generated"
}
```

### Provider Callback (Verification Result)
```bash
POST /kyc/provider-callback
Body: {
  "kycId": "kyc-1697...",
  "wallet": "SP2ABC...",
  "kycLevel": "standard"
}
Response: {
  "success": true,
  "attestationHash": "a1b2c3...",
  "credential": { ... },
  "proof": "eyJhbGc..."
}
```

### Get Attestation
```bash
GET /kyc/attestation/:hash
Response: {
  "attestationHash": "a1b2c3...",
  "credential": { ... },
  "proof": "eyJhbGc..."
}
```

---

## Testing

```bash
# Run all tests (18 tests)
bun test

# Coverage:
# - Hash utility: 6 tests
# - Attestation generator: 12 tests
```

---

## Architecture

```
Client → Hash Document → Submit KYC → Upload to S3
                                    ↓
                          Provider Verification
                                    ↓
                   Generate VC + JWS Proof
                                    ↓
                      Compute Attestation Hash
                                    ↓
                    Store VC (encrypted) + Hash
                                    ↓
                   Return Hash (for on-chain)
```

---

## Environment Variables

See `.env.example` for full configuration.

**Development**:
```bash
PORT=4001
NODE_ENV=development
STORAGE_PATH=./data/credentials
```

**Production**:
```bash
PORT=4001
NODE_ENV=production
AWS_REGION=us-east-1
AWS_S3_BUCKET=kyc-credentials
AWS_KMS_KEY_ID=alias/kyc-signing-key
KYC_PROVIDER_API_KEY=...
```

---

## Security

- ✅ No PII sent in API requests (client-side hashing)
- ✅ Only attestation hash stored on-chain
- ✅ Credentials encrypted at rest (S3)
- ✅ JWS signatures for proof
- ✅ KMS for key management (production)

---

## File Structure

```
kyc/
├── src/
│   ├── types.ts           # TypeScript type definitions
│   ├── hash.ts            # SHA256 hashing utility
│   ├── attestation.ts     # VC generation + JWS signing
│   ├── storage.ts         # Credential storage
│   └── server.ts          # Hono REST API
├── tests/
│   ├── hash.test.ts       # Hash tests (6)
│   └── attestation.test.ts # Attestation tests (12)
├── data/
│   └── credentials/       # Stored attestations (gitignored)
├── package.json
├── .env.example
└── README.md
```

---

## Production Deployment

See main deployment guide for full instructions.

**Quick deployment**:
```bash
# 1. Configure environment
cp .env.example .env
nano .env

# 2. Run tests
bun test

# 3. Start with PM2
pm2 start src/server.ts --name kyc-server --interpreter bun

# 4. Verify
curl http://localhost:4001/health
```

---

## License

Proprietary
