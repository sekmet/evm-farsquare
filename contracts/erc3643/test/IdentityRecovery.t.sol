// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../registry/IdentityRegistry.sol";
import "../storage/IdentityRegistryStorage.sol";
import "../registries/TrustedIssuersRegistry.sol";
import "../registries/ClaimTopicsRegistry.sol";
import "../identity/Identity.sol";

/**
 * @title IdentityRecoveryTest
 * @dev Tests for identity recovery mechanism
 */
contract IdentityRecoveryTest is Test {
    IdentityRegistry public identityRegistry;
    IdentityRegistryStorage public identityStorage;
    TrustedIssuersRegistry public trustedIssuers;
    ClaimTopicsRegistry public claimTopics;
    
    address public owner;
    address public user1;
    address public newWallet;
    address public attacker;
    Identity public identity1;
    
    uint16 constant US_CODE = 840;
    
    event IdentityRecovered(address indexed oldWallet, address indexed newWallet, IIdentity indexed identity);
    
    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        newWallet = makeAddr("newWallet");
        attacker = makeAddr("attacker");
        
        // Deploy infrastructure
        trustedIssuers = new TrustedIssuersRegistry();
        claimTopics = new ClaimTopicsRegistry();
        identityStorage = new IdentityRegistryStorage();
        
        identityRegistry = new IdentityRegistry(
            address(trustedIssuers),
            address(claimTopics),
            address(identityStorage)
        );
        
        // Bind registry to storage
        identityStorage.bindIdentityRegistry(address(identityRegistry));
        
        // Setup test identity
        identity1 = new Identity(user1);
        identityRegistry.registerIdentity(user1, identity1, US_CODE);
    }
    
    // ========== Recovery Success Tests ==========
    
    function test_RecoverIdentity_Success() public {
        vm.expectEmit(true, true, true, false);
        emit IdentityRecovered(user1, newWallet, identity1);
        
        identityRegistry.recoverIdentity(user1, newWallet);
        
        // Old wallet should no longer have identity
        assertEq(address(identityRegistry.identity(user1)), address(0));
        assertEq(identityRegistry.investorCountry(user1), 0);
        assertFalse(identityRegistry.contains(user1));
        
        // New wallet should have the identity
        assertEq(address(identityRegistry.identity(newWallet)), address(identity1));
        assertEq(identityRegistry.investorCountry(newWallet), US_CODE);
        assertTrue(identityRegistry.contains(newWallet));
    }
    
    function test_RecoverIdentity_ByAgent() public {
        address agent = makeAddr("agent");
        identityRegistry.addAgent(agent);
        
        vm.prank(agent);
        identityRegistry.recoverIdentity(user1, newWallet);
        
        // Verify recovery
        assertEq(address(identityRegistry.identity(newWallet)), address(identity1));
        assertFalse(identityRegistry.contains(user1));
    }
    
    // ========== Recovery Failure Tests ==========
    
    function test_RecoverIdentity_RevertIf_OldWalletNotRegistered() public {
        address unregistered = makeAddr("unregistered");
        
        vm.expectRevert();
        identityRegistry.recoverIdentity(unregistered, newWallet);
    }
    
    function test_RecoverIdentity_RevertIf_NewWalletAlreadyRegistered() public {
        address user2 = makeAddr("user2");
        Identity identity2 = new Identity(user2);
        identityRegistry.registerIdentity(user2, identity2, US_CODE);
        
        vm.expectRevert();
        identityRegistry.recoverIdentity(user1, user2);
    }
    
    function test_RecoverIdentity_RevertIf_NewWalletIsZero() public {
        vm.expectRevert();
        identityRegistry.recoverIdentity(user1, address(0));
    }
    
    function test_RecoverIdentity_RevertIf_NotOwnerOrAgent() public {
        vm.prank(attacker);
        vm.expectRevert();
        identityRegistry.recoverIdentity(user1, newWallet);
    }
    
    function test_RecoverIdentity_RevertIf_SameAddress() public {
        vm.expectRevert();
        identityRegistry.recoverIdentity(user1, user1);
    }
    
    // ========== Integration Tests ==========
    
    function test_Integration_RecoverAndRegisterAgain() public {
        // Recover to new wallet
        identityRegistry.recoverIdentity(user1, newWallet);
        
        // Old wallet should be free to register a new identity
        Identity newIdentity = new Identity(user1);
        identityRegistry.registerIdentity(user1, newIdentity, US_CODE);
        
        // Both should have different identities
        assertEq(address(identityRegistry.identity(user1)), address(newIdentity));
        assertEq(address(identityRegistry.identity(newWallet)), address(identity1));
    }
    
    function test_Integration_MultipleRecoveries() public {
        address wallet2 = makeAddr("wallet2");
        address wallet3 = makeAddr("wallet3");
        
        // First recovery
        identityRegistry.recoverIdentity(user1, newWallet);
        assertEq(address(identityRegistry.identity(newWallet)), address(identity1));
        
        // Second recovery from the recovered wallet
        identityRegistry.recoverIdentity(newWallet, wallet2);
        assertEq(address(identityRegistry.identity(wallet2)), address(identity1));
        assertFalse(identityRegistry.contains(newWallet));
        
        // Third recovery
        identityRegistry.recoverIdentity(wallet2, wallet3);
        assertEq(address(identityRegistry.identity(wallet3)), address(identity1));
        assertFalse(identityRegistry.contains(wallet2));
    }
    
    function test_Integration_RecoveryPreservesCountry() public {
        uint16 newCountry = 250; // France
        identityRegistry.updateCountry(user1, newCountry);
        
        identityRegistry.recoverIdentity(user1, newWallet);
        
        // Country should be preserved
        assertEq(identityRegistry.investorCountry(newWallet), newCountry);
    }
}
