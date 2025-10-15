# HTS-native design and EVM adaptor (overview)

## Goal

- Support canonical issuance on Hedera Token Service (HTS) to capture native Hedera benefits (low cost, native balance tracking), while enabling trading on an EVM-based AMM/orderbook using a representative ERC-20.

1) Design options:
   - Canonical HTS issuance, representative ERC-20 on Hedera EVM:
   - Issuer mints HTS tokens on Hedera.
   - A relayer/guardian service (operated by the issuer or a multisig) locks HTS tokens in custody and mints representative ERC-20 tokens on the Hedera EVM or another EVM chain; or
   - Alternatively, use a HTS-to-EVM bridging pattern with attestation and challenge windows.

2) HTS wrapper via custodian with on-chain receipts:
   - HTS tokens remain canonical. An EVM-side wrapper contract is a minimal ERC-20 that represents custodial balances. A relayer listens to HTS events and mints/burns the wrapper token accordingly.
   - The ComplianceRegistry and regulated token semantics can be applied to the wrapper token (ERC-20) to enforce transfer restrictions on-trading venues.

3) Key components:
   - HTS token with KYC keys: HTS supports keys enabling KYC and freeze behavior.
   - Custodian/Relayer: watches HTS transfers and issues/burns representative ERC-20 tokens.
   - ERC-20 wrapper + ComplianceRegistry: used by AMM/orderbook contracts to apply ERC-3643-like hooks.
   - Redemption flow: user burns wrapper ERC-20 -> relayer releases HTS to user's Hedera account (with KYC checks).

4) Security considerations:
   - Relayer custody risk: minimize by multisig, thresholds, fraud proofs, auditor or bond.
   - Challenge windows: allow on-chain dispute and sanity checks; maintain logs.
   - Compliance: maintain attestation hashes on-chain, avoid storing PII.

5) PoC approach:
   - Use Hedera JS SDK to create an HTS token with KYC key and supply.
   - Implement a simple relayer script that mints a dummy ERC-20 on EVM (local Hardhat) representing HTS and demonstrates mint+burn on lock/unlock events.
   - Evaluate HTS native KYC and freeze features to see if they meet regulatory requirements before choosing canonical HTS.
