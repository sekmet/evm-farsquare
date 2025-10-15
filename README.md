# FarSquare: Tokenized Property Trading Platform

A comprehensive platform for buying, selling, and trading tokenized real estate assets on EVM networks, enhanced with AI-driven market intelligence and compliance frameworks. Built using principles for robust, scalable architecture.

## Overview

FarSquare implements a **holistic ecosystem** for Real World Asset (RWA) tokenization, combining:

- **Permissioned Token Standards**: ERC-3643 compliant tokens with built-in compliance
- **Hybrid Trading Engine**: Off-chain order matching with on-chain atomic settlement
- **AI-Powered Intelligence**: Market trend analysis, investment recommendations, and risk scoring
- **Regulatory Compliance**: KYC/AML integration with auditable on-chain attestations
- **Fractional Ownership**: Property tokenization with automated income distribution

## Core Features

### 🏛️ Permissioned Token Standard (ERC-3643)

Implement on-chain permission flags and transfer hooks for verified principals only, mirroring ERC-3643/T-REX standards used widely for RWAs.

### 🏠 Fractionalization + Income Distribution

Mint fractional tokens per property with automated payout scheduling for rental revenue through on-chain payouts or batched fiat settlement.

### ⚖️ Hybrid Marketplace

Off-chain order matching for optimal UX combined with atomic on-chain settlement for security and finality.

### 💧 Liquidity Pools (Optional)

Pool fractions and mint LP tokens to enhance secondary market liquidity, inspired by Centrifuge/Tinlake models.

### 🔒 KYC/Compliance Gateway

Off-chain PII storage with on-chain attestations and signed snapshots for auditors, maintaining privacy while ensuring regulatory compliance.

### 🤖 AI Investment Intelligence

Index on-chain events and off-chain property data to train models for time-series forecasting, risk scoring, anomaly detection, and portfolio optimization.

### 🖼️ Embeddable White-Label Widgets

Enable broker/partner sites to embed property cards and investment widgets for seamless integration.

### 🗳️ Governance Module

Snapshot voting for property-level decisions (sales, repairs, budget approvals) recorded on-chain.

## Architecture Overview

### Systems Thinking Level 2 Framework

We approach the platform as an **interconnected network** of components with emergent properties:

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Analytics  │◄──►│  Trading Engine │◄──►│  Token Layer    │
│   (Intelligence)│    │  (Settlement)   │    │  (Ownership)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Data Oracles  │    │  Compliance     │    │   Governance    │
│   (External)    │    │   Engine        │    │   (Community)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Positive Feedback Loops:**

- AI insights → Better trading decisions → Enhanced liquidity → Improved AI training data

**Balancing Feedback Loops:**

- Compliance validation → Risk mitigation → Sustained trust → Regulatory adherence

### ERC-3643 Integration

Leveraging the **T-REX (Token for Regulated EXchanges)** standard for permissioned tokens:

**Key Benefits:**

- $28B+ in tokenized assets already deployed using ERC-3643
- Native regulatory compliance (SEC/EU MiCA compatible)
- Reduced settlement times from weeks to minutes

## Technical Stack

### Blockchain Infrastructure

- **Hedera**: Primary deployment network with 10,000+ TPS, 3s finality, USD-priced fees
- **EVM Compatibility**: Full Ethereum Virtual Machine support for seamless integration

### Core Components

- **Contracts**: Solidity smart contracts with ERC-3643 compliance registry and periphery adapters
- **Backend**: APIs, **Lit Protocol** integration for programmable signing, off-chain orderbook matching, and automated keepers
- **Infrastructure**: **Envio** for high-performance indexing (HyperIndex) and ultra-fast data APIs (HyperSync)
- **AI Subsystem**: Data ingestion pipelines with machine learning models for forecasting and recommendations
- **Frontend**: React dApp with embeddable widgets and real-time market data

### Development & Testing Tools

- **Hardhat 3**: Advanced development environment with Solidity tests, Rust performance components, and multichain support
- **State Channels**: **Yellow Network ERC-7824** for off-chain scaling and cross-chain operations
- **Stablecoin Integration**: **PayPal PYUSD** for fiat-backed stable value transactions

### Payment & Settlement

- **Multi-Currency Support**: Native HBAR, PYUSD, and cross-chain asset settlements
- **Automated Transactions**: Lit Protocol enables trustless, user-controlled automation

### Development Approach

#### Test-Driven Development (TDD)

Following strict TDD principles:

1. **Red**: Write failing tests for desired behavior
2. **Green**: Implement minimal code to pass tests
3. **Refactor**: Improve design while maintaining test coverage

**Test Categories:**

- Unit tests for smart contract functions
- Integration tests for cross-component interactions
- End-to-end tests for complete user workflows
- Property-based tests for edge cases and invariants

#### System Thinking Level 2

- **Holistic Analysis**: Consider interconnections between all components
- **Emergent Behavior**: Design for network effects and feedback loops
- **Resilience**: Build balancing mechanisms for system stability
- **Scalability**: Plan for growth and increased complexity

## Deployment Strategy

### Primary Network: Hedera

**Hedera** serves as our initial deployment target, providing unmatched performance characteristics for tokenized real estate trading:

- **10,000+ TPS**: Enables high-frequency trading and real-time settlement
- **3-Second Finality**: Critical for atomic transaction guarantees in hybrid marketplace
- **USD-Priced Fees**: Predictable costs for automated systems and AI agents
- **aBFT Security**: Highest grade security for financial applications
- **Council Governance**: Transparent, institutional-grade decision-making

**Why Hedera First:**

- Superior performance for AI-driven trading algorithms
- Lower operational costs for high-volume applications
- Enhanced security for regulatory compliance features
- Familiar EVM environment for rapid development

### Secondary Networks

- **Polygon zkEVM**: Cost-efficient scaling for high-volume operations
- **Ethereum Mainnet**: Maximum security and established liquidity for production
- **Development**: Hedera Testnet for comprehensive testing

### Multi-Chain Integration

Leveraging **Yellow Network's ERC-7824** state channels for cross-chain operations:

- **Off-chain Execution**: Real-time trading across multiple networks
- **On-chain Settlement**: Final settlement on Hedera for guaranteed finality
- **Chain Agnostic**: Seamless integration with any EVM-compatible chain

## Getting Started

### Prerequisites

- **Node.js 18+**: For JavaScript/TypeScript development
- **Hardhat 3**: Advanced development environment with multichain support
- **Foundry**: For Solidity testing and deployment (recommended for Hedera)
- **Python 3.9+**: For AI/ML components and data processing
- **Hedera Account**: For mainnet/testnet deployment

### Installation

```bash
# Clone and setup
git clone <repository-url>
cd evm-farsquare
npm install

# Install Hardhat 3 (enhanced development environment)
npm install --save-dev hardhat

# Install Foundry (for Hedera-optimized development)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Setup Envio for high-performance indexing
npx envio init

# Setup environment
cp .env.example .env
# Configure HEDERA_RPC_URL, HEDERA_ACCOUNT_ID, and other variables
```

### Development Workflow

```bash
# Run comprehensive tests (TDD approach)
npm test

# Deploy to Hedera testnet (primary development target)
npx hardhat deploy --network hedera-testnet

# Use Envio for real-time indexing
npx envio dev

# Deploy with state channels (Yellow Network integration)
npx hardhat deploy-yellow-channels --network hedera-mainnet

# Start local development environment with Lit Protocol
npm run dev
```

## Compliance & Security

- **Audits**: All smart contracts require third-party security audits
- **Legal Review**: Compliance with relevant securities regulations
- **Timelocks**: Multi-sig governance for critical operations
- **Emergency Pauses**: Circuit breakers for rapid response to issues

## Research & References

This platform builds upon extensive research into:

- **ERC-3643/T-REX standards** for permissioned tokens
- **Real-world RWA tokenization platforms** (RealT, Blocksquare, Centrifuge)
- **AI/ML integration** for financial market analysis
- **Systems thinking approaches** for complex platform design
- **Hedera blockchain** for high-performance deployment
- **State channel protocols** (ERC-7824) for off-chain scaling
- **Programmable signing** (Lit Protocol) for automated transactions

**Key Resources:**

- [ERC-3643 Specification](https://github.com/TokenySolutions/EIP3643)
- [Tokeny T-REX Implementation](https://tokeny.com/erc3643/)
- [Hedera Documentation](https://docs.hedera.com/)
- [Envio High-Performance Indexing](https://envio.dev/)
- [Lit Protocol Programmable Signing](https://litprotocol.com/)
- [PayPal PYUSD](https://pyusd.com/)
- [Hardhat 3 Development Environment](https://hardhat.org/)
- [Yellow Network ERC-7824](https://erc7824.org/)
- [Research Documentation](./.windsurf/docs/)

## License

MIT License - see LICENSE file for details.

---

**Note**: This is a prototype scaffold. All components require comprehensive testing, security audits, and legal review before production deployment with real assets.
