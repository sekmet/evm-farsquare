# EVM FarSquare Backend - ERC-3643 Compliant Tokenization Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-fbf0df)](https://bun.sh/)
[![ERC-3643](https://img.shields.io/badge/ERC--3643-Level%203-green.svg)](https://erc3643.org/)
[![Viem](https://img.shields.io/badge/Viem-2.0+-blue.svg)](https://viem.sh/)

A **production-ready ERC-3643 Level 3 compliant backend system** for tokenized real estate and securities trading, built with **Bun**, **Hono**, and **Viem**. Features **comprehensive property tokenization**, **automated compliance validation**, **Uniswap V3 orderbook settlement**, and **enterprise-grade infrastructure** for regulated financial markets.

---

## 🏗️ **System Architecture**

### **Core Components Overview**

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React/Vue Frontend] --> B[Better Auth]
    end

    subgraph "API Gateway"
        B --> C[Hono API Server]
        C --> D[CORS & Security Middleware]
        C --> E[Rate Limiting]
    end

    subgraph "Business Logic Layer"
        C --> F[Property Management Service]
        C --> G[Token Factory Service]
        C --> H[Identity & Compliance Service]
        C --> I[Marketplace Service]
        C --> J[AI Insights Service]
    end

    subgraph "Blockchain Integration"
        F --> K[ERC-3643 TREX Contracts]
        G --> K
        H --> L[Identity Registry]
        H --> M[Compliance Modules]
        I --> N[Uniswap V3 Pools]
    end

    subgraph "Data Layer"
        K --> O[TimescaleDB]
        L --> O
        M --> O
        N --> O
        P[Event Indexer] --> O
        Q[Monitoring Service] --> R[Redis Cache]
    end

    subgraph "Infrastructure"
        O --> S[Docker Compose]
        R --> S
        T[RabbitMQ] --> S
        U[Background Jobs] --> T
    end
```

### **Key Features**

- **🔐 ERC-3643 Level 3 Compliance**: Complete tokenized securities framework with identity verification, transfer restrictions, and regulatory compliance
- **🏠 Property Tokenization**: Full lifecycle management for real estate tokenization using TREX contracts
- **📊 Automated Orderbook**: Uniswap V3 integrated settlement with price-time priority matching
- **🤖 AI-Powered Insights**: Machine learning models for market analysis and investment recommendations
- **🌐 Multi-Chain Support**: Mainnet, Base, Polygon, Optimism, and testnet deployments
- **⚡ High-Performance**: Bun runtime with optimized Viem blockchain interactions
- **🛡️ Enterprise Security**: Comprehensive authentication, encryption, and audit trails
- **📈 Real-Time Analytics**: Market data, portfolio tracking, and performance monitoring

---

## 🚀 **Quick Start**

### **Prerequisites**

- **Bun** >= 1.0.0 ([Installation Guide](https://bun.sh/docs/installation))
- **Node.js** >= 18.0.0 (for compatibility)
- **Docker & Docker Compose** (for infrastructure)
- **PostgreSQL** >= 16 (with TimescaleDB extension)

### **Installation**

```bash
# Clone and navigate to backend directory
cd backend

# Install dependencies
bun install

# Start infrastructure (PostgreSQL, Redis, RabbitMQ)
docker-compose up -d

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration (see Environment Setup below)

# Run database migrations
bun run db:migrate

# Start development server
bun run dev

# Start orderbook keeper (in another terminal)
cd orderbook && bun run dev
```

### **Environment Configuration**

Create a `.env` file based on `.env.example`:

```bash
# Better Auth Configuration
BETTER_AUTH_SECRET=your-32-character-random-secret-here
BETTER_AUTH_URL=http://localhost:3000

# Database Configuration
DATABASE_URL=postgresql://evm_fsq_user:evm_fsq_password@localhost:5433/evm_fsq_db

# Ethereum Configuration (for SIWE - Sign-In with Ethereum)
ETHEREUM_RPC_URL=https://cloudflare-eth.com
SIWE_DOMAIN=localhost:3000

# EVM Blockchain Configuration
EVM_RPC_URL=http://127.0.0.1:8545
EVM_NETWORK=polygon-testnet
WALLET_PRIVATE_KEY=your-private-key-without-0x-prefix

# ERC-3643 Contract Addresses (for target network)
TREX_FACTORY_ADDRESS=0x...
IDENTITY_REGISTRY_ADDRESS=0x...
COMPLIANCE_ADDRESS=0x...
SETTLEMENT_CONTRACT_ADDRESS=0x...

# External API Keys
ETHERSCAN_API_KEY=your-etherscan-api-key
INFURA_API_KEY=your-infura-api-key
ALCHEMY_API_KEY=your-alchemy-api-key

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=evm_fsq_password

# RabbitMQ Configuration
RABBITMQ_URL=amqp://evm_fsq_user:evm_fsq_password@localhost:5672/

# Optional: CORS and Security
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### **Database Setup**

```bash
# Create database and run migrations
bun run db:migrate

# Create a new migration
bun run db:create create_users_table

# Check migration status
bun run db:status
```

---

## 📋 **API Documentation**

### **Base URLs**
- **Main API**: `http://localhost:3000`
- **Orderbook API**: `http://localhost:3001`

### **Authentication Endpoints**

#### **POST /api/auth/sign-in**
Authenticate user with Ethereum wallet (SIWE).

```bash
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "message": "farsquare.xyz wants you to sign in with your Ethereum account...",
    "signature": "0x...",
    "address": "0x..."
  }'
```

#### **GET /api/auth/session**
Get current user session information.

### **User Management**

#### **POST /api/users**
Create a new user profile.

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "evmAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "walletType": "metamask"
  }'
```

#### **GET /api/users/by-address/:evmAddress**
Get user profile by EVM address.

### **Property Management**

#### **GET /api/properties**
List all properties with optional filtering.

```bash
# Get all properties
curl http://localhost:3000/api/properties

# Search properties
curl "http://localhost:3000/api/properties/search?q=office&type=commercial"

# Filter by risk level
curl "http://localhost:3000/api/properties/risk/low"
```

#### **GET /api/properties/:id**
Get detailed property information.

#### **POST /api/properties**
Create new property listing (property owners only).

```bash
curl -X POST http://localhost:3000/api/properties \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Downtown Office Building",
    "description": "Prime commercial real estate in city center",
    "propertyType": "commercial",
    "location": "New York, NY",
    "price": 5000000,
    "yield": 0.08,
    "riskLevel": "medium"
  }'
```

#### **PUT /api/properties/:id**
Update property details (owner only).

#### **POST /api/properties/:id/documents**
Upload property documents (legal, financial, etc.).

#### **POST /api/properties/:id/tokens/mint**
Mint additional property tokens (owner only).

```bash
curl -X POST http://localhost:3000/api/properties/123e4567-e89b-12d3-a456-426614174000/tokens/mint \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "recipientAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
  }'
```

### **Portfolio Management**

#### **GET /api/portfolio/:evmAddress**
Get user's investment portfolio.

```bash
curl http://localhost:3000/api/portfolio/0x742d35Cc6634C0532925a3b844Bc454e4438f44e
```

### **Marketplace & Trading**

#### **GET /api/marketplace/listings**
Get active marketplace listings.

#### **GET /api/marketplace/listings/:id**
Get specific listing details.

#### **POST /api/marketplace/listings/:id/buy**
Purchase property tokens from marketplace.

### **Wallet Operations**

#### **POST /api/wallets**
Initialize EVM wallet for user.

#### **GET /api/wallets**
List user's wallets.

#### **POST /api/sign**
Sign messages/transactions using configured wallet.

### **ERC-3643 Compliance**

#### **GET /api/properties/:id/compliance/:userId**
Check compliance status for property investment.

#### **POST /api/contracts/build-call**
Build contract interaction payloads for ERC-3643 operations.

### **Orderbook API** (`http://localhost:3001`)

#### **POST /api/orders**
Create limit order with compliance validation.

```bash
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "maker": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "tokenIn": "0xA0b86a33E6441e88C5F2712B4Eb2b9c7C0dC4d79",
    "tokenOut": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    "amountIn": "1000000000000000000",
    "amountOut": "500000000000000000",
    "price": "0.5",
    "poolAddress": "0x1234567890123456789012345678901234567890",
    "identityRegistry": "0xabcdef1234567890abcdef1234567890abcdef12",
    "compliance": "0x1234567890123456789012345678901234567890"
  }'
```

#### **GET /api/orders**
List orders with filtering.

#### **GET /api/orders/pending**
Get pending orders for matching.

#### **DELETE /api/orders/:id**
Cancel order (maker only).

#### **GET /api/matches**
List order matches.

### **AI Insights**

#### **GET /api/insights/market-analysis**
Get AI-powered market analysis.

#### **GET /api/insights/portfolio/:address**
Get portfolio recommendations.

#### **GET /api/insights/risk-assessment/:propertyId**
Property risk assessment.

### **System Administration**

#### **GET /api/admin/metrics**
System metrics and monitoring.

#### **GET /api/admin/contracts**
Deployed contract information.

#### **POST /api/admin/contracts/deploy**
Deploy new TREX token suite.

---

## 🏛️ **ERC-3643 Compliance Framework**

### **Level 3 Implementation Features**

- **Identity Verification**: On-chain identity registry with claim validation
- **Transfer Restrictions**: Compliance modules for geographic and investor accreditation rules
- **Audit Trail**: Complete transaction history with regulatory reporting
- **KYC Integration**: Identity verification through trusted issuers
- **Jurisdiction Compliance**: Country-specific restrictions and requirements

### **TREX Contract Suite**

```mermaid
graph LR
    A[TREX Factory] --> B[Token Contract]
    A --> C[Identity Registry]
    A --> D[Compliance Contract]
    A --> E[Identity Storage]

    B --> F[Transfer Logic]
    C --> G[Identity Claims]
    D --> H[Compliance Rules]
    E --> I[Identity Data]

    F --> J[Compliance Check]
    G --> J
    H --> J
```

### **Supported Compliance Modules**

- **Country Restrictions**: Geographic trading restrictions
- **Time Restrictions**: Trading window limitations
- **Maximum Balance**: Per-investor holding limits
- **Maximum Holders**: Total investor caps
- **Custom Rules**: Flexible compliance logic

---

## 🔧 **Development**

### **Project Structure**

```
backend/
├── src/
│   ├── index.ts              # Main Hono server
│   ├── lib/
│   │   ├── auth.ts          # Better Auth configuration
│   │   ├── security-headers.ts # Security middleware
│   │   └── migrations/      # Database migrations
│   ├── routes/
│   │   ├── auth.ts          # Authentication routes
│   │   └── contract-integration.ts # Contract interactions
│   ├── services/            # Business logic services
│   │   ├── database.ts      # PostgreSQL client
│   │   ├── properties.ts    # Property management
│   │   ├── contracts.ts     # ERC-3643 integration
│   │   ├── identity.ts      # Identity management
│   │   ├── compliance.ts    # Compliance validation
│   │   ├── property-token-factory.ts # Token deployment
│   │   ├── settlement.ts    # Trade settlement
│   │   ├── ai-insights.ts   # AI analysis
│   │   ├── monitoring.ts    # System monitoring
│   │   └── upload-*.ts      # File handling
│   └── types/               # TypeScript definitions
├── orderbook/               # Decentralized orderbook
│   ├── src/
│   │   ├── server.ts        # Orderbook API
│   │   └── keeper.ts        # Order matching engine
│   └── README.md
├── kyc/                     # KYC microservice
├── tests/                   # Test suites
├── docker-compose.yml       # Infrastructure
├── package.json
└── README.md
```

### **Running Tests**

```bash
# Run all tests
bun test

# Run specific test file
bun test src/services/properties.test.ts

# Run with coverage
bun test --coverage

# Run integration tests
bun test tests/integration/
```

### **Database Operations**

```bash
# Create migration
bun run db:create add_user_preferences

# Run migrations
bun run db:migrate

# Rollback last migration
bun run db:rollback

# Check status
bun run db:status
```

### **Code Quality**

```bash
# Lint code
bun run lint

# Format code
bun run format

# Type check
bun run typecheck
```

---

## 🌐 **Multi-Chain Deployment**

### **Supported Networks**

| Network | Chain ID | Status | Contracts |
|---------|----------|--------|-----------|
| Ethereum Mainnet | 1 | ✅ Production | Deployed |
| Base | 8453 | ✅ Production | Deployed |
| Polygon | 137 | ✅ Production | Deployed |
| Optimism | 10 | ✅ Production | Deployed |
| Sepolia (Testnet) | 11155111 | ✅ Testing | Deployed |
| Base Sepolia | 84532 | ✅ Testing | Deployed |
| Polygon Mumbai | 80001 | ✅ Testing | Deployed |
| Optimism Sepolia | 11155420 | ✅ Testing | Deployed |

### **Network Configuration**

```typescript
// src/services/contracts.ts
const networkConfigs: Record<EVMNetwork, ChainConfig> = {
  'mainnet': {
    id: 1,
    name: 'Ethereum',
    rpcUrl: process.env.ETHEREUM_RPC_URL!,
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  // ... other networks
};
```

---

## 🔒 **Security Features**

### **Authentication & Authorization**

- **Better Auth**: SIWE (Sign-In with Ethereum) integration
- **Session Management**: Secure session handling with Redis
- **Role-Based Access**: Property owner, investor, and admin roles
- **API Rate Limiting**: Request throttling and abuse prevention

### **Blockchain Security**

- **Contract Verification**: All contracts verified on block explorers
- **Access Control**: Only authorized addresses can perform sensitive operations
- **Input Validation**: Comprehensive parameter sanitization
- **Private Key Management**: Secure key storage and rotation

### **Data Protection**

- **Encryption**: Sensitive data encrypted at rest and in transit
- **Audit Logs**: Complete transaction and access logging
- **GDPR Compliance**: Data portability and right to erasure
- **Backup & Recovery**: Automated database backups

---

## 📊 **Monitoring & Analytics**

### **System Monitoring**

- **Health Checks**: Automated endpoint monitoring
- **Performance Metrics**: Response times and throughput tracking
- **Error Tracking**: Comprehensive error logging and alerting
- **Blockchain Sync**: Real-time blockchain synchronization status

### **Business Analytics**

- **Portfolio Performance**: Real-time P&L and yield calculations
- **Market Data**: Token prices, volumes, and market indicators
- **Compliance Reporting**: Regulatory reporting and audit trails
- **AI Insights**: Predictive analytics and investment recommendations

---

## 🤝 **Contributing**

### **Development Workflow**

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### **Code Standards**

- **TypeScript**: Strict mode enabled, comprehensive type definitions
- **Testing**: TDD approach, minimum 80% coverage required
- **Documentation**: All public APIs documented with JSDoc
- **Security**: Regular security audits and dependency updates

### **Commit Convention**

```
type(scope): description

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Code style changes
- refactor: Code refactoring
- test: Testing
- chore: Maintenance
```

---

## 📄 **License**

This project is licensed under the **MIT License** - see the [LICENSE](../LICENSE) file for details.

---

## 🆘 **Support**

### **Documentation**
- [API Reference](./docs/api-reference.md)
- [ERC-3643 Guide](./docs/erc3643-guide.md)
- [Deployment Guide](./docs/deployment.md)
- [Troubleshooting](./docs/troubleshooting.md)

### **Community**
- **Discord**: [Join our community](https://discord.gg/farsquare)
- **GitHub Issues**: [Report bugs](https://github.com/farsquare/evm-backend/issues)
- **GitHub Discussions**: [Q&A](https://github.com/farsquare/evm-backend/discussions)

### **Professional Services**
- **Enterprise Support**: enterprise@farsquare.xyz
- **Integration Consulting**: integrations@farsquare.xyz
- **Security Audits**: security@farsquare.xyz

---

## 🚀 **Roadmap**

### **Q1 2025**
- [ ] Cross-chain bridge integration
- [ ] Advanced AI portfolio management
- [ ] Institutional investor onboarding
- [ ] Regulatory reporting automation

### **Q2 2025**
- [ ] DeFi yield optimization
- [ ] NFT fractionalization
- [ ] Multi-signature governance
- [ ] Advanced compliance modules

### **Q3 2025**
- [ ] Layer 2 scaling solutions
- [ ] Real-time market data feeds
- [ ] Mobile app API optimization
- [ ] Advanced risk analytics

---

**Built with ❤️ for the future of tokenized real estate and securities trading.**