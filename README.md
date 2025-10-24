# FarSquare: Tokenized Property Trading Platform

<p align="center">
<img width="372" height="372" alt="evm-farsquare" src="https://github.com/user-attachments/assets/27927762-c34e-42da-ad9a-cc04d55e4b89" />
</p>

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

- **Base Sepolia**: Primary deployment network, low fees
- **Ethereum Sepolia**: Secondary deployment network
- **Optimism Sepolia**: Secondary deployment network
- **EVM Compatibility**: Full Ethereum Virtual Machine support for seamless integration

### Core Components

- **Contracts**: Solidity smart contracts with ERC-3643 compliance registry and periphery adapters
- **Backend**: APIs, off-chain orderbook matching, and automated keepers
- **Infrastructure**: **Envio** for high-performance indexing (HyperIndex) and ultra-fast data APIs (HyperSync)
- **AI Subsystem**: Data ingestion pipelines with machine learning models for forecasting and recommendations
- **Frontend**: React dApp with embeddable widgets and real-time market data

### Development & Testing Tools

- **Hardhat 3**: Advanced development environment with Solidity tests, Rust performance components, and multichain support
- **Stablecoin Integration**: **PayPal PYUSD** for fiat-backed stable value transactions

### Payment & Settlement

- **Multi-Currency Support**: Native ETH, PYUSD, OP and cross-chain asset settlements
- **Automated Transactions**: Enables trustless, user-controlled automation

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

### Primary Network: Base

**Base** serves as our initial deployment target, providing high performance characteristics for tokenized real estate trading:

- **10,000+ TPS**: Enables high-frequency trading and real-time settlement
- **3-Second Finality**: Critical for atomic transaction guarantees in hybrid marketplace
- **USD-Priced Fees**: Predictable costs for automated systems and AI agents
- **aBFT Security**: Highest grade security for financial applications
- **Council Governance**: Transparent, institutional-grade decision-making

**Why Base First:**

- Superior performance for AI-driven trading algorithms
- Lower operational costs for high-volume applications
- Enhanced security for regulatory compliance features
- Familiar EVM environment for rapid development

### Secondary Networks

- **Ethereum Sepolia**: Maximum security and established liquidity for production
- **Optimism Sepolia**: Cost-efficient scaling for high-volume operations
- **Development**: Ethereum Sepolia, Base Sepolia and Optimism Sepolia for comprehensive testing

### Multi-Chain Integration

- **Off-chain Execution**: Real-time trading across multiple networks
- **On-chain Settlement**: Final settlement on Base for guaranteed finality
- **Chain Agnostic**: Seamless integration with any EVM-compatible chain

## Getting Started

### Prerequisites

- **Node.js 20+**: For JavaScript/TypeScript development
- **Hardhat 3**: Advanced development environment for Solidity testing and deployment with multichain support
- **Python 3.9+**: For AI/ML components and data processing
- **EVM networks wallets**: For mainnet/testnet deployment

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
# Configure BASE_SEPOLIA_RPC_URL, BASE_SEPOLIA_PRIVATE_KEY, and other variables
```

### Development Workflow

```bash
# Run comprehensive tests (TDD approach)
bun test

# Deploy to Base Sepolia (primary development target)
bunx hardhat deploy --network base-sepolia

# Use Envio for real-time indexing
cd infra
bun run dev

# Start local development environment
bun run dev
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
- **Multi-chain networks** for ERC3643 and UniswapV3 Orderbook/Marketplace contracts deployment

**Key Resources:**

- [ERC-3643 Specification](https://github.com/TokenySolutions/EIP3643)
- [Tokeny T-REX Implementation](https://tokeny.com/erc3643/)
- [Envio High-Performance Indexing](https://envio.dev/)
- [PayPal PYUSD](https://pyusd.com/)
- [Hardhat 3 Development Environment](https://hardhat.org/)

## License

MIT License - see LICENSE file for details.

---

**Note**: All components require comprehensive testing, security audits, and legal review before production deployment with real assets.
