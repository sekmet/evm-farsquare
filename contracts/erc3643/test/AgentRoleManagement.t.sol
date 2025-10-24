// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../registry/IdentityRegistry.sol";
import "../storage/IdentityRegistryStorage.sol";
import "../registries/TrustedIssuersRegistry.sol";
import "../registries/ClaimTopicsRegistry.sol";
import "../identity/Identity.sol";

/**
 * @title AgentRoleManagementTest
 * @dev Tests for agent role management in Identity Registry
 */
contract AgentRoleManagementTest is Test {
    IdentityRegistry public identityRegistry;
    IdentityRegistryStorage public identityStorage;
    TrustedIssuersRegistry public trustedIssuers;
    ClaimTopicsRegistry public claimTopics;
    
    address public owner;
    address public agent1;
    address public agent2;
    address public agent3;
    address public user1;
    address public nonAgent;
    Identity public identity1;
    
    uint16 constant US_CODE = 840;
    
    event AgentAdded(address indexed agent);
    event AgentRemoved(address indexed agent);
    
    function setUp() public {
        owner = address(this);
        agent1 = makeAddr("agent1");
        agent2 = makeAddr("agent2");
        agent3 = makeAddr("agent3");
        user1 = makeAddr("user1");
        nonAgent = makeAddr("nonAgent");
        
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
    }
    
    // ========== Add Agent Tests ==========
    
    function test_AddAgent_Success() public {
        vm.expectEmit(true, false, false, false);
        emit AgentAdded(agent1);
        
        identityRegistry.addAgent(agent1);
        
        assertTrue(identityRegistry.isAgent(agent1));
    }
    
    function test_AddAgent_MultipleAgents() public {
        identityRegistry.addAgent(agent1);
        identityRegistry.addAgent(agent2);
        identityRegistry.addAgent(agent3);
        
        assertTrue(identityRegistry.isAgent(agent1));
        assertTrue(identityRegistry.isAgent(agent2));
        assertTrue(identityRegistry.isAgent(agent3));
    }
    
    function test_AddAgent_RevertIf_ZeroAddress() public {
        vm.expectRevert();
        identityRegistry.addAgent(address(0));
    }
    
    function test_AddAgent_RevertIf_AlreadyAgent() public {
        identityRegistry.addAgent(agent1);
        
        vm.expectRevert();
        identityRegistry.addAgent(agent1);
    }
    
    function test_AddAgent_RevertIf_NotOwner() public {
        vm.prank(nonAgent);
        vm.expectRevert();
        identityRegistry.addAgent(agent1);
    }
    
    // ========== Remove Agent Tests ==========
    
    function test_RemoveAgent_Success() public {
        identityRegistry.addAgent(agent1);
        assertTrue(identityRegistry.isAgent(agent1));
        
        vm.expectEmit(true, false, false, false);
        emit AgentRemoved(agent1);
        
        identityRegistry.removeAgent(agent1);
        
        assertFalse(identityRegistry.isAgent(agent1));
    }
    
    function test_RemoveAgent_MultipleAgents() public {
        identityRegistry.addAgent(agent1);
        identityRegistry.addAgent(agent2);
        identityRegistry.addAgent(agent3);
        
        identityRegistry.removeAgent(agent2);
        
        assertTrue(identityRegistry.isAgent(agent1));
        assertFalse(identityRegistry.isAgent(agent2));
        assertTrue(identityRegistry.isAgent(agent3));
    }
    
    function test_RemoveAgent_RevertIf_NotAgent() public {
        vm.expectRevert();
        identityRegistry.removeAgent(agent1);
    }
    
    function test_RemoveAgent_RevertIf_NotOwner() public {
        identityRegistry.addAgent(agent1);
        
        vm.prank(nonAgent);
        vm.expectRevert();
        identityRegistry.removeAgent(agent1);
    }
    
    // ========== Is Agent Tests ==========
    
    function test_IsAgent_ReturnsTrueForAgent() public {
        identityRegistry.addAgent(agent1);
        assertTrue(identityRegistry.isAgent(agent1));
    }
    
    function test_IsAgent_ReturnsFalseForNonAgent() public {
        assertFalse(identityRegistry.isAgent(nonAgent));
    }
    
    function test_IsAgent_ReturnsFalseAfterRemoval() public {
        identityRegistry.addAgent(agent1);
        identityRegistry.removeAgent(agent1);
        
        assertFalse(identityRegistry.isAgent(agent1));
    }
    
    // ========== Agent Permissions Tests ==========
    
    function test_Agent_CanRegisterIdentity() public {
        identityRegistry.addAgent(agent1);
        
        vm.prank(agent1);
        identityRegistry.registerIdentity(user1, identity1, US_CODE);
        
        assertTrue(identityRegistry.contains(user1));
    }
    
    function test_Agent_CanUpdateIdentity() public {
        identityRegistry.registerIdentity(user1, identity1, US_CODE);
        Identity newIdentity = new Identity(user1);
        
        identityRegistry.addAgent(agent1);
        
        vm.prank(agent1);
        identityRegistry.updateIdentity(user1, newIdentity);
        
        assertEq(address(identityRegistry.identity(user1)), address(newIdentity));
    }
    
    function test_Agent_CanDeleteIdentity() public {
        identityRegistry.registerIdentity(user1, identity1, US_CODE);
        identityRegistry.addAgent(agent1);
        
        vm.prank(agent1);
        identityRegistry.deleteIdentity(user1);
        
        assertFalse(identityRegistry.contains(user1));
    }
    
    function test_Agent_CanUpdateCountry() public {
        identityRegistry.registerIdentity(user1, identity1, US_CODE);
        identityRegistry.addAgent(agent1);
        
        vm.prank(agent1);
        identityRegistry.updateCountry(user1, 250); // France
        
        assertEq(identityRegistry.investorCountry(user1), 250);
    }
    
    function test_Agent_CanRecoverIdentity() public {
        identityRegistry.registerIdentity(user1, identity1, US_CODE);
        address newWallet = makeAddr("newWallet");
        
        identityRegistry.addAgent(agent1);
        
        vm.prank(agent1);
        identityRegistry.recoverIdentity(user1, newWallet);
        
        assertTrue(identityRegistry.contains(newWallet));
        assertFalse(identityRegistry.contains(user1));
    }
    
    function test_NonAgent_CannotRegisterIdentity() public {
        vm.prank(nonAgent);
        vm.expectRevert();
        identityRegistry.registerIdentity(user1, identity1, US_CODE);
    }
    
    function test_NonAgent_CannotUpdateIdentity() public {
        identityRegistry.registerIdentity(user1, identity1, US_CODE);
        Identity newIdentity = new Identity(user1);
        
        vm.prank(nonAgent);
        vm.expectRevert();
        identityRegistry.updateIdentity(user1, newIdentity);
    }
    
    function test_NonAgent_CannotDeleteIdentity() public {
        identityRegistry.registerIdentity(user1, identity1, US_CODE);
        
        vm.prank(nonAgent);
        vm.expectRevert();
        identityRegistry.deleteIdentity(user1);
    }
    
    function test_RemovedAgent_CannotRegisterIdentity() public {
        identityRegistry.addAgent(agent1);
        identityRegistry.removeAgent(agent1);
        
        vm.prank(agent1);
        vm.expectRevert();
        identityRegistry.registerIdentity(user1, identity1, US_CODE);
    }
    
    // ========== Integration Tests ==========
    
    function test_Integration_MultipleAgentsWorkingSimultaneously() public {
        identityRegistry.addAgent(agent1);
        identityRegistry.addAgent(agent2);
        
        address user2 = makeAddr("user2");
        Identity identity2 = new Identity(user2);
        
        // Agent1 registers user1
        vm.prank(agent1);
        identityRegistry.registerIdentity(user1, identity1, US_CODE);
        
        // Agent2 registers user2
        vm.prank(agent2);
        identityRegistry.registerIdentity(user2, identity2, 250); // France
        
        assertTrue(identityRegistry.contains(user1));
        assertTrue(identityRegistry.contains(user2));
        assertEq(identityRegistry.investorCountry(user1), US_CODE);
        assertEq(identityRegistry.investorCountry(user2), 250);
    }
    
    function test_Integration_AddRemoveAddAgent() public {
        // Add agent
        identityRegistry.addAgent(agent1);
        assertTrue(identityRegistry.isAgent(agent1));
        
        // Agent can perform actions
        vm.prank(agent1);
        identityRegistry.registerIdentity(user1, identity1, US_CODE);
        
        // Remove agent
        identityRegistry.removeAgent(agent1);
        assertFalse(identityRegistry.isAgent(agent1));
        
        // Cannot perform actions
        address user2 = makeAddr("user2");
        Identity identity2 = new Identity(user2);
        vm.prank(agent1);
        vm.expectRevert();
        identityRegistry.registerIdentity(user2, identity2, US_CODE);
        
        // Add agent again
        identityRegistry.addAgent(agent1);
        assertTrue(identityRegistry.isAgent(agent1));
        
        // Can perform actions again
        vm.prank(agent1);
        identityRegistry.registerIdentity(user2, identity2, US_CODE);
        assertTrue(identityRegistry.contains(user2));
    }
    
    function test_Integration_OwnerCanAlwaysPerformActions() public {
        // Owner can perform actions without being an agent
        assertFalse(identityRegistry.isAgent(owner));
        
        identityRegistry.registerIdentity(user1, identity1, US_CODE);
        assertTrue(identityRegistry.contains(user1));
        
        identityRegistry.updateCountry(user1, 250);
        assertEq(identityRegistry.investorCountry(user1), 250);
    }
}
