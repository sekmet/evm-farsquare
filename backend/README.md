```markdown
# backend

Backend scaffolds:
- lit-integration.ts: sample showing how to use Lit Protocol for delegated signing / transaction automation.
- orderbook/: off-chain orderbook service (not included here); expected features:
  - EIP-712 signed limit orders
  - Matching engine / market-making bots
  - Keeper/relayer that submits fills on-chain (Hedera EVM)
- keeper: process that listens to matched fills and submits settlement txns on-chain
- compliance-admin: microservice for KYC attestation management (stores attestations off-chain and writes hashes to ComplianceRegistry)
```