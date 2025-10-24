// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../registry/IdentityRegistry.sol";
import "../storage/IdentityRegistryStorage.sol";
import "../registries/TrustedIssuersRegistry.sol";
import "../registries/ClaimTopicsRegistry.sol";
import "../identity/Identity.sol";

/**
 * @title CountryCodeValidatorTest
 * @dev Tests for country code validation following ISO-3166
 */
contract CountryCodeValidatorTest is Test {
    IdentityRegistry public identityRegistry;
    IdentityRegistryStorage public identityStorage;
    TrustedIssuersRegistry public trustedIssuers;
    ClaimTopicsRegistry public claimTopics;
    
    address public owner;
    address public user1;
    Identity public identity1;
    
    // ISO-3166 numeric codes
    uint16 constant US_CODE = 840;      // United States
    uint16 constant FR_CODE = 250;      // France
    uint16 constant DE_CODE = 276;      // Germany
    uint16 constant JP_CODE = 392;      // Japan
    uint16 constant INVALID_CODE = 9999; // Invalid
    
    event CountryUpdated(address indexed investorAddress, uint16 indexed country);
    
    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        
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
    
    // ========== Country Code Registration Tests ==========
    
    function test_RegisterIdentity_ValidUSCode() public {
        identityRegistry.registerIdentity(user1, identity1, US_CODE);
        
        uint16 storedCountry = identityRegistry.investorCountry(user1);
        assertEq(storedCountry, US_CODE);
    }
    
    function test_RegisterIdentity_ValidFranceCode() public {
        identityRegistry.registerIdentity(user1, identity1, FR_CODE);
        
        uint16 storedCountry = identityRegistry.investorCountry(user1);
        assertEq(storedCountry, FR_CODE);
    }
    
    function test_RegisterIdentity_ValidGermanyCode() public {
        identityRegistry.registerIdentity(user1, identity1, DE_CODE);
        
        uint16 storedCountry = identityRegistry.investorCountry(user1);
        assertEq(storedCountry, DE_CODE);
    }
    
    function test_RegisterIdentity_ValidJapanCode() public {
        identityRegistry.registerIdentity(user1, identity1, JP_CODE);
        
        uint16 storedCountry = identityRegistry.investorCountry(user1);
        assertEq(storedCountry, JP_CODE);
    }
    
    function test_RegisterIdentity_ZeroCode() public {
        // Zero is a valid ISO-3166 code (used for international organizations)
        identityRegistry.registerIdentity(user1, identity1, 0);
        
        uint16 storedCountry = identityRegistry.investorCountry(user1);
        assertEq(storedCountry, 0);
    }
    
    // ========== Country Update Tests ==========
    
    function test_UpdateCountry_Success() public {
        identityRegistry.registerIdentity(user1, identity1, US_CODE);
        
        vm.expectEmit(true, true, false, false);
        emit CountryUpdated(user1, FR_CODE);
        
        identityRegistry.updateCountry(user1, FR_CODE);
        
        uint16 updatedCountry = identityRegistry.investorCountry(user1);
        assertEq(updatedCountry, FR_CODE);
    }
    
    function test_UpdateCountry_RevertIf_NotRegistered() public {
        address unregistered = makeAddr("unregistered");
        
        vm.expectRevert();
        identityRegistry.updateCountry(unregistered, US_CODE);
    }
    
    function test_UpdateCountry_RevertIf_NotOwnerOrAgent() public {
        identityRegistry.registerIdentity(user1, identity1, US_CODE);
        
        vm.prank(user1);
        vm.expectRevert();
        identityRegistry.updateCountry(user1, FR_CODE);
    }
    
    function test_UpdateCountry_ByAgent() public {
        address agent = makeAddr("agent");
        identityRegistry.addAgent(agent);
        identityRegistry.registerIdentity(user1, identity1, US_CODE);
        
        vm.prank(agent);
        identityRegistry.updateCountry(user1, FR_CODE);
        
        uint16 updatedCountry = identityRegistry.investorCountry(user1);
        assertEq(updatedCountry, FR_CODE);
    }
    
    // ========== Batch Country Update Tests ==========
    
    function test_BatchUpdateCountry_Success() public {
        address user2 = makeAddr("user2");
        Identity identity2 = new Identity(user2);
        
        identityRegistry.registerIdentity(user1, identity1, US_CODE);
        identityRegistry.registerIdentity(user2, identity2, US_CODE);
        
        address[] memory users = new address[](2);
        users[0] = user1;
        users[1] = user2;
        
        uint16[] memory countries = new uint16[](2);
        countries[0] = FR_CODE;
        countries[1] = DE_CODE;
        
        identityRegistry.batchUpdateCountry(users, countries);
        
        assertEq(identityRegistry.investorCountry(user1), FR_CODE);
        assertEq(identityRegistry.investorCountry(user2), DE_CODE);
    }
    
    function test_BatchUpdateCountry_RevertIf_ArrayLengthMismatch() public {
        address[] memory users = new address[](2);
        uint16[] memory countries = new uint16[](1);
        
        vm.expectRevert();
        identityRegistry.batchUpdateCountry(users, countries);
    }
    
    // ========== Country Query Tests ==========
    
    function test_InvestorCountry_RegisteredUser() public {
        identityRegistry.registerIdentity(user1, identity1, US_CODE);
        
        uint16 country = identityRegistry.investorCountry(user1);
        assertEq(country, US_CODE);
    }
    
    function test_InvestorCountry_UnregisteredUser() public {
        address unregistered = makeAddr("unregistered");
        
        uint16 country = identityRegistry.investorCountry(unregistered);
        assertEq(country, 0);
    }
    
    // ========== Integration Tests ==========
    
    function test_Integration_RegisterAndUpdateCountry() public {
        // Register with US
        identityRegistry.registerIdentity(user1, identity1, US_CODE);
        assertEq(identityRegistry.investorCountry(user1), US_CODE);
        
        // Update to France
        identityRegistry.updateCountry(user1, FR_CODE);
        assertEq(identityRegistry.investorCountry(user1), FR_CODE);
        
        // Update to Germany
        identityRegistry.updateCountry(user1, DE_CODE);
        assertEq(identityRegistry.investorCountry(user1), DE_CODE);
    }
    
    function test_Integration_MultipleUsersMultipleCountries() public {
        address user2 = makeAddr("user2");
        address user3 = makeAddr("user3");
        
        Identity identity2 = new Identity(user2);
        Identity identity3 = new Identity(user3);
        
        identityRegistry.registerIdentity(user1, identity1, US_CODE);
        identityRegistry.registerIdentity(user2, identity2, FR_CODE);
        identityRegistry.registerIdentity(user3, identity3, DE_CODE);
        
        assertEq(identityRegistry.investorCountry(user1), US_CODE);
        assertEq(identityRegistry.investorCountry(user2), FR_CODE);
        assertEq(identityRegistry.investorCountry(user3), DE_CODE);
    }
}
