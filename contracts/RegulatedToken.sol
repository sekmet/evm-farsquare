// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/*
  RegulatedToken: ERC20 with compliance transfer hook, issuer role, pausable and blacklist support.
  Production: add timelock for admin actions, events for attestation updates, upgradability.
*/

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

interface IComplianceRegistry {
    function isTransferAllowed(address operator, address from, address to, uint256 amount) external view returns (bool);
}

contract RegulatedToken is ERC20, AccessControl, Pausable {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");

    IComplianceRegistry public compliance;

    event ComplianceRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);

    constructor(string memory name_, string memory symbol_, address complianceRegistry) ERC20(name_, symbol_) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ISSUER_ROLE, msg.sender);
        _setupRole(COMPLIANCE_ADMIN, msg.sender);
        compliance = IComplianceRegistry(complianceRegistry);
    }

    function setComplianceRegistry(address registry) external onlyRole(COMPLIANCE_ADMIN) {
        address old = address(compliance);
        compliance = IComplianceRegistry(registry);
        emit ComplianceRegistryUpdated(old, registry);
    }

    function mint(address to, uint256 amount) external onlyRole(ISSUER_ROLE) whenNotPaused {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyRole(ISSUER_ROLE) whenNotPaused {
        _burn(from, amount);
    }

    function pause() external onlyRole(COMPLIANCE_ADMIN) {
        _pause();
    }

    function unpause() external onlyRole(COMPLIANCE_ADMIN) {
        _unpause();
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
        super._beforeTokenTransfer(from, to, amount);
        require(!paused(), "RegulatedToken: token transfer while paused");
        // Allow mint/burn
        if (from != address(0) && to != address(0)) {
            require(address(compliance) != address(0), "RegulatedToken: no compliance registry set");
            require(compliance.isTransferAllowed(msg.sender, from, to, amount), "RegulatedToken: transfer blocked by compliance");
        }
    }
}