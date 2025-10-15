# HTS-to-EVM adaptor (pattern)

Pattern: Relayer custodial adaptor + ERC-20 representative token

1) HTS mint/lock flow:
   - User deposits HTS tokens to a managed treasury (HTS transfer).
   - Relayer observes HTS transfer events and mints equivalent ERC-20 representative tokens on EVM for the user's address.
   - Representative token implements RegulatedToken semantics and is used by AMM/orderbook.

2) Redeem flow:
   - User burns representative ERC-20 on EVM (or sends to relayer).
   - Relayer verifies burn & user KYC, then releases HTS tokens from treasury to user's Hedera account.

3) Security:
   - Custody should be multisig / Hedera scheduled transactions with threshold.
   - Relayer should publish signed attestations of custody changes and expose audit logs.
   - Consider economic bonding or insurance to reduce custody risk.

4) Tradeoffs:
   - Pros: Use HTS native features (KYC keys, low-cost transfers).
   - Cons: Custodial relayer introduces trust; mitigate via governance, multisig, or decentralized custody schemes.
