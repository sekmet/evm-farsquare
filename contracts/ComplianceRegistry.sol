// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/*
  ComplianceRegistry: whitelist + attestation hash. Exposes isTransferAllowed used by tokens.
  Production: integrate signed verifiable credentials, revocation lists, jurisdiction blocking,
  multisig/timelock for admins and detailed events to support indexing.
*/

import "@openzeppelin/contracts/access/AccessControl.sol";

contract ComplianceRegistry is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");

    mapping(address => bool) public whitelisted;
    mapping(address => bytes32) public attestationHash;

    event Whitelisted(address indexed who);
    event Dewhitelisted(address indexed who);
    event AttestationSet(address indexed who, bytes32 attestationHash);

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(COMPLIANCE_ADMIN, msg.sender);
    }

    function setWhitelisted(address who, bool allowed) external onlyRole(COMPLIANCE_ADMIN) {
        whitelisted[who] = allowed;
        if (allowed) emit Whitelisted(who);
        else emit Dewhitelisted(who);
    }

    function setAttestation(address who, bytes32 kycHash) external onlyRole(COMPLIANCE_ADMIN) {
        attestationHash[who] = kycHash;
        emit AttestationSet(who, kycHash);
    }

    function isTransferAllowed(address /*operator*/, address from, address to, uint256 /*amount*/) external view returns (bool) {
        return whitelisted[from] && whitelisted[to];
    }
}