# EVM FarSquare frontend

Notes for the React dApp:

- Use ethers.js with a provider configured for Hedera EVM RPC (provided in hardhat config).
- UI flows:
  - Onboard KYC -> compliance attestation created by backend -> compliance admin stores attestation hash on-chain via ComplianceRegistry.
  - Users can place limit orders (EIP-712 signed typed data). Orders are stored in off-chain orderbook and matched by matching engine.
  - Keepers (relayers) submit fills on-chain via the Uniswap V3 fork/periphery. Tokens check compliance in _beforeTokenTransfer.
  - Lit Protocol integration: provide optional UX for delegated automation (user provides limited-scope delegation, viewable & revocable).
- Provide an AI pane with recommended investments + top contributing features and confidence score (attach SHAP or heuristic explanation).
