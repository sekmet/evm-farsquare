// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../registry/IdentityRegistry.sol";
import "../identity/Identity.sol";
import "../storage/IdentityRegistryStorage.sol";
import "../registries/TrustedIssuersRegistry.sol";
import "../registries/ClaimTopicsRegistry.sol";

contract IdentityRegistryTest is Test {
    IdentityRegistry public registry;
    IdentityRegistryStorage public storage_;
    TrustedIssuersRegistry public trustedIssuersRegistry;
    ClaimTopicsRegistry public claimTopicsRegistry;
    
    address public owner;
    address public agent1;
    address public agent2;
    address public user1;
    address public user2;
    address public claimIssuer1;
    
    Identity public identity1;
    Identity public identity2;
    
    uint16 constant US_CODE = 840;
    uint16 constant UK_CODE = 826;
    uint256 constant KYC_TOPIC = 1;
    
    event ClaimTopicsRegistrySet(address indexed claimTopicsRegistry);
    event IdentityStorageSet(address indexed identityStorage);
    event TrustedIssuersRegistrySet(address indexed trustedIssuersRegistry);
    event IdentityRegistered(address indexed investorAddress, IIdentity indexed identity);
    event IdentityRemoved(address indexed investorAddress, IIdentity indexed identity);
    event IdentityUpdated(IIdentity indexed oldIdentity, IIdentity indexed newIdentity);
    event CountryUpdated(address indexed investorAddress, uint16 indexed country);
    event AgentAdded(address indexed agent);
    event AgentRemoved(address indexed agent);
    
    function setUp() public {
        owner = address(this);
        agent1 = makeAddr("agent1");
        agent2 = makeAddr("agent2");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        claimIssuer1 = makeAddr("claimIssuer1");
        
        identity1 = new Identity(user1);
        identity2 = new Identity(user2);
        
        storage_ = new IdentityRegistryStorage();
        trustedIssuersRegistry = new TrustedIssuersRegistry();
        claimTopicsRegistry = new ClaimTopicsRegistry();
        
        registry = new IdentityRegistry(
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry),
            address(storage_)
        );
        
        storage_.bindIdentityRegistry(address(registry));
    }
    
    // ========== Constructor Tests ==========
    
    function test_Constructor_SetsRegistries() public view {
        assertEq(address(registry.issuersRegistry()), address(trustedIssuersRegistry));
        assertEq(address(registry.topicsRegistry()), address(claimTopicsRegistry));
        assertEq(address(registry.identityStorage()), address(storage_));
    }
    
    function test_Constructor_RevertIf_ZeroAddress() public {
        vm.expectRevert();
        new IdentityRegistry(address(0), address(claimTopicsRegistry), address(storage_));
        
        vm.expectRevert();
        new IdentityRegistry(address(trustedIssuersRegistry), address(0), address(storage_));
        
        vm.expectRevert();
        new IdentityRegistry(address(trustedIssuersRegistry), address(claimTopicsRegistry), address(0));
    }
    
    // ========== Registry Update Tests ==========
    
    function test_SetIdentityRegistryStorage_Success() public {
        IdentityRegistryStorage newStorage = new IdentityRegistryStorage();
        newStorage.bindIdentityRegistry(address(registry));
        
        vm.expectEmit(true, false, false, false);
        emit IdentityStorageSet(address(newStorage));
        
        registry.setIdentityRegistryStorage(address(newStorage));
        
        assertEq(address(registry.identityStorage()), address(newStorage));
    }
    
    function test_SetIdentityRegistryStorage_RevertIf_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        registry.setIdentityRegistryStorage(address(1));
    }
    
    function test_SetClaimTopicsRegistry_Success() public {
        ClaimTopicsRegistry newRegistry = new ClaimTopicsRegistry();
        
        vm.expectEmit(true, false, false, false);
        emit ClaimTopicsRegistrySet(address(newRegistry));
        
        registry.setClaimTopicsRegistry(address(newRegistry));
        
        assertEq(address(registry.topicsRegistry()), address(newRegistry));
    }
    
    function test_SetTrustedIssuersRegistry_Success() public {
        TrustedIssuersRegistry newRegistry = new TrustedIssuersRegistry();
        
        vm.expectEmit(true, false, false, false);
        emit TrustedIssuersRegistrySet(address(newRegistry));
        
        registry.setTrustedIssuersRegistry(address(newRegistry));
        
        assertEq(address(registry.issuersRegistry()), address(newRegistry));
    }
    
    // ========== Agent Management Tests ==========
    
    function test_AddAgent_Success() public {
        vm.expectEmit(true, false, false, false);
        emit AgentAdded(agent1);
        
        registry.addAgent(agent1);
        
        assertTrue(registry.isAgent(agent1));
    }
    
    function test_AddAgent_RevertIf_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        registry.addAgent(agent1);
    }
    
    function test_AddAgent_RevertIf_ZeroAddress() public {
        vm.expectRevert();
        registry.addAgent(address(0));
    }
    
    function test_AddAgent_RevertIf_AlreadyAgent() public {
        registry.addAgent(agent1);
        
        vm.expectRevert();
        registry.addAgent(agent1);
    }
    
    function test_RemoveAgent_Success() public {
        registry.addAgent(agent1);
        
        vm.expectEmit(true, false, false, false);
        emit AgentRemoved(agent1);
        
        registry.removeAgent(agent1);
        
        assertFalse(registry.isAgent(agent1));
    }
    
    function test_RemoveAgent_RevertIf_NotOwner() public {
        registry.addAgent(agent1);
        
        vm.prank(user1);
        vm.expectRevert();
        registry.removeAgent(agent1);
    }
    
    function test_RemoveAgent_RevertIf_NotAgent() public {
        vm.expectRevert();
        registry.removeAgent(agent1);
    }
    
    // ========== Register Identity Tests ==========
    
    function test_RegisterIdentity_SuccessAsOwner() public {
        vm.expectEmit(true, true, false, false);
        emit IdentityRegistered(user1, identity1);
        
        registry.registerIdentity(user1, identity1, US_CODE);
        
        assertEq(address(registry.identity(user1)), address(identity1));
        assertEq(registry.investorCountry(user1), US_CODE);
        assertTrue(registry.contains(user1));
    }
    
    function test_RegisterIdentity_SuccessAsAgent() public {
        registry.addAgent(agent1);
        
        vm.prank(agent1);
        registry.registerIdentity(user1, identity1, US_CODE);
        
        assertTrue(registry.contains(user1));
    }
    
    function test_RegisterIdentity_RevertIf_NotAuthorized() public {
        vm.prank(user2);
        vm.expectRevert();
        registry.registerIdentity(user1, identity1, US_CODE);
    }
    
    function test_RegisterIdentity_RevertIf_ZeroAddress() public {
        vm.expectRevert();
        registry.registerIdentity(address(0), identity1, US_CODE);
    }
    
    function test_RegisterIdentity_RevertIf_AlreadyRegistered() public {
        registry.registerIdentity(user1, identity1, US_CODE);
        
        vm.expectRevert();
        registry.registerIdentity(user1, identity2, UK_CODE);
    }
    
    // ========== Batch Registration Tests ==========
    
    function test_BatchRegisterIdentity_Success() public {
        address[] memory users = new address[](2);
        users[0] = user1;
        users[1] = user2;
        
        IIdentity[] memory identities = new IIdentity[](2);
        identities[0] = identity1;
        identities[1] = identity2;
        
        uint16[] memory countries = new uint16[](2);
        countries[0] = US_CODE;
        countries[1] = UK_CODE;
        
        registry.batchRegisterIdentity(users, identities, countries);
        
        assertTrue(registry.contains(user1));
        assertTrue(registry.contains(user2));
        assertEq(address(registry.identity(user1)), address(identity1));
        assertEq(address(registry.identity(user2)), address(identity2));
    }
    
    function test_BatchRegisterIdentity_RevertIf_LengthMismatch() public {
        address[] memory users = new address[](2);
        IIdentity[] memory identities = new IIdentity[](1);
        uint16[] memory countries = new uint16[](2);
        
        vm.expectRevert();
        registry.batchRegisterIdentity(users, identities, countries);
    }
    
    // ========== Delete Identity Tests ==========
    
    function test_DeleteIdentity_Success() public {
        registry.registerIdentity(user1, identity1, US_CODE);
        
        vm.expectEmit(true, true, false, false);
        emit IdentityRemoved(user1, identity1);
        
        registry.deleteIdentity(user1);
        
        assertFalse(registry.contains(user1));
        assertEq(address(registry.identity(user1)), address(0));
    }
    
    function test_DeleteIdentity_RevertIf_NotOwnerOrAgent() public {
        registry.registerIdentity(user1, identity1, US_CODE);
        
        vm.prank(user2);
        vm.expectRevert();
        registry.deleteIdentity(user1);
    }
    
    function test_DeleteIdentity_RevertIf_NotRegistered() public {
        vm.expectRevert();
        registry.deleteIdentity(user1);
    }
    
    // ========== Update Identity Tests ==========
    
    function test_UpdateIdentity_Success() public {
        registry.registerIdentity(user1, identity1, US_CODE);
        
        vm.expectEmit(true, true, false, false);
        emit IdentityUpdated(identity1, identity2);
        
        registry.updateIdentity(user1, identity2);
        
        assertEq(address(registry.identity(user1)), address(identity2));
    }
    
    function test_UpdateIdentity_RevertIf_NotOwnerOrAgent() public {
        registry.registerIdentity(user1, identity1, US_CODE);
        
        vm.prank(user2);
        vm.expectRevert();
        registry.updateIdentity(user1, identity2);
    }
    
    function test_UpdateCountry_Success() public {
        registry.registerIdentity(user1, identity1, US_CODE);
        
        vm.expectEmit(true, true, false, false);
        emit CountryUpdated(user1, UK_CODE);
        
        registry.updateCountry(user1, UK_CODE);
        
        assertEq(registry.investorCountry(user1), UK_CODE);
    }
    
    // ========== Query Tests ==========
    
    function test_Contains_ReturnsFalseForNonExistent() public view {
        assertFalse(registry.contains(user1));
    }
    
    function test_Identity_ReturnsZeroForNonExistent() public view {
        assertEq(address(registry.identity(user1)), address(0));
    }
    
    function test_InvestorCountry_ReturnsZeroForNonExistent() public view {
        assertEq(registry.investorCountry(user1), 0);
    }
}
