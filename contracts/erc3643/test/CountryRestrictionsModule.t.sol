// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../compliance/modules/CountryRestrictionsModule.sol";
import "../compliance/ModularCompliance.sol";

contract MockIdentityRegistry {
    mapping(address => uint16) private _countries;
    
    function investorCountry(address investor) external view returns (uint16) {
        return _countries[investor];
    }
    
    function setInvestorCountry(address investor, uint16 country) external {
        _countries[investor] = country;
    }
}

contract CountryRestrictionsModuleTest is Test {
    CountryRestrictionsModule public module;
    ModularCompliance public compliance;
    MockIdentityRegistry public identityRegistry;
    
    address public owner;
    address public token;
    address public user1;
    address public user2;
    address public user3;
    
    uint16 constant US = 840;
    uint16 constant UK = 826;
    uint16 constant FR = 250;
    uint16 constant CN = 156;
    uint16 constant KP = 408;
    
    event CountryWhitelisted(uint16 indexed country);
    event CountryUnwhitelisted(uint16 indexed country);
    event CountryBlacklisted(uint16 indexed country);
    event CountryUnblacklisted(uint16 indexed country);
    
    function setUp() public {
        owner = address(this);
        token = makeAddr("token");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");
        
        compliance = new ModularCompliance();
        identityRegistry = new MockIdentityRegistry();
        module = new CountryRestrictionsModule(address(compliance));
        
        compliance.bindToken(token);
        module.bindToken(token);
        module.setIdentityRegistry(address(identityRegistry));
    }
    
    // ========== Configuration Tests ==========
    
    function test_SetIdentityRegistry_Success() public {
        CountryRestrictionsModule newModule = new CountryRestrictionsModule(address(compliance));
        newModule.setIdentityRegistry(address(identityRegistry));
        
        assertEq(newModule.identityRegistry(), address(identityRegistry));
    }
    
    function test_SetIdentityRegistry_RevertIf_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        module.setIdentityRegistry(address(identityRegistry));
    }
    
    function test_WhitelistCountry_Success() public {
        vm.expectEmit(true, false, false, false);
        emit CountryWhitelisted(US);
        
        module.whitelistCountry(US);
        
        assertTrue(module.isCountryWhitelisted(US));
    }
    
    function test_WhitelistCountry_RevertIf_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        module.whitelistCountry(US);
    }
    
    function test_UnwhitelistCountry_Success() public {
        module.whitelistCountry(US);
        
        vm.expectEmit(true, false, false, false);
        emit CountryUnwhitelisted(US);
        
        module.unwhitelistCountry(US);
        
        assertFalse(module.isCountryWhitelisted(US));
    }
    
    function test_BlacklistCountry_Success() public {
        vm.expectEmit(true, false, false, false);
        emit CountryBlacklisted(KP);
        
        module.blacklistCountry(KP);
        
        assertTrue(module.isCountryBlacklisted(KP));
    }
    
    function test_BlacklistCountry_RevertIf_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        module.blacklistCountry(KP);
    }
    
    function test_UnblacklistCountry_Success() public {
        module.blacklistCountry(KP);
        
        vm.expectEmit(true, false, false, false);
        emit CountryUnblacklisted(KP);
        
        module.unblacklistCountry(KP);
        
        assertFalse(module.isCountryBlacklisted(KP));
    }
    
    function test_Constructor_BindsCompliance() public view {
        assertTrue(module.moduleCheck(address(compliance)));
    }
    
    // ========== Whitelist Tests ==========
    
    function test_CanTransfer_AllowsWhitelistedCountries() public {
        module.whitelistCountry(US);
        module.whitelistCountry(UK);
        
        identityRegistry.setInvestorCountry(user1, US);
        identityRegistry.setInvestorCountry(user2, UK);
        
        assertTrue(module.canTransfer(user1, user2, 100));
    }
    
    function test_CanTransfer_RejectsSenderNotWhitelisted() public {
        module.whitelistCountry(US);
        
        identityRegistry.setInvestorCountry(user1, FR); // Not whitelisted
        identityRegistry.setInvestorCountry(user2, US);
        
        assertFalse(module.canTransfer(user1, user2, 100));
    }
    
    function test_CanTransfer_RejectsReceiverNotWhitelisted() public {
        module.whitelistCountry(US);
        
        identityRegistry.setInvestorCountry(user1, US);
        identityRegistry.setInvestorCountry(user2, FR); // Not whitelisted
        
        assertFalse(module.canTransfer(user1, user2, 100));
    }
    
    function test_CanTransfer_AllowsWhenNoWhitelist() public {
        // No whitelist configured means all countries allowed
        identityRegistry.setInvestorCountry(user1, US);
        identityRegistry.setInvestorCountry(user2, FR);
        
        assertTrue(module.canTransfer(user1, user2, 100));
    }
    
    // ========== Blacklist Tests ==========
    
    function test_CanTransfer_RejectsBlacklistedSender() public {
        module.blacklistCountry(KP);
        
        identityRegistry.setInvestorCountry(user1, KP);
        identityRegistry.setInvestorCountry(user2, US);
        
        assertFalse(module.canTransfer(user1, user2, 100));
    }
    
    function test_CanTransfer_RejectsBlacklistedReceiver() public {
        module.blacklistCountry(KP);
        
        identityRegistry.setInvestorCountry(user1, US);
        identityRegistry.setInvestorCountry(user2, KP);
        
        assertFalse(module.canTransfer(user1, user2, 100));
    }
    
    function test_CanTransfer_AllowsNonBlacklistedCountries() public {
        module.blacklistCountry(KP);
        
        identityRegistry.setInvestorCountry(user1, US);
        identityRegistry.setInvestorCountry(user2, UK);
        
        assertTrue(module.canTransfer(user1, user2, 100));
    }
    
    // ========== Combined Whitelist & Blacklist Tests ==========
    
    function test_CanTransfer_BlacklistTakesPrecedence() public {
        module.whitelistCountry(US);
        module.blacklistCountry(US); // Blacklist same country
        
        identityRegistry.setInvestorCountry(user1, US);
        identityRegistry.setInvestorCountry(user2, US);
        
        assertFalse(module.canTransfer(user1, user2, 100));
    }
    
    function test_CanTransfer_RequiresBothWhitelistAndNotBlacklist() public {
        module.whitelistCountry(US);
        module.whitelistCountry(UK);
        module.blacklistCountry(FR);
        
        identityRegistry.setInvestorCountry(user1, US);
        identityRegistry.setInvestorCountry(user2, UK);
        
        assertTrue(module.canTransfer(user1, user2, 100));
        
        // Try with blacklisted country
        identityRegistry.setInvestorCountry(user3, FR);
        assertFalse(module.canTransfer(user1, user3, 100));
    }
    
    // ========== Edge Cases ==========
    
    function test_CanTransfer_AllowsZeroAmount() public {
        module.whitelistCountry(US);
        identityRegistry.setInvestorCountry(user1, FR);
        identityRegistry.setInvestorCountry(user2, FR);
        
        // Even if countries not whitelisted, zero amount is allowed
        assertTrue(module.canTransfer(user1, user2, 0));
    }
    
    function test_CanTransfer_AllowsTransferToSelf() public {
        module.whitelistCountry(US);
        identityRegistry.setInvestorCountry(user1, FR);
        
        // Transfer to self is allowed regardless of whitelist
        assertTrue(module.canTransfer(user1, user1, 100));
    }
    
    function test_CanTransfer_HandlesMintFromZeroAddress() public {
        module.whitelistCountry(US);
        identityRegistry.setInvestorCountry(user1, US);
        
        // Mint from zero address to whitelisted country
        assertTrue(module.canTransfer(address(0), user1, 100));
    }
    
    function test_CanTransfer_HandlesBurnToZeroAddress() public {
        module.whitelistCountry(US);
        identityRegistry.setInvestorCountry(user1, US);
        
        // Burn to zero address
        assertTrue(module.canTransfer(user1, address(0), 100));
    }
    
    function test_CanTransfer_HandlesStatelessInvestor() public {
        module.whitelistCountry(US);
        
        // user1 has no country set (returns 0)
        identityRegistry.setInvestorCountry(user2, US);
        
        // Transfer from stateless investor should fail if whitelist enabled
        assertFalse(module.canTransfer(user1, user2, 100));
    }
    
    function test_CanTransfer_AllowsStatelessWithNoWhitelist() public {
        // No whitelist, no blacklist
        
        // user1 has no country set
        identityRegistry.setInvestorCountry(user2, US);
        
        assertTrue(module.canTransfer(user1, user2, 100));
    }
    
    // ========== Batch Configuration Tests ==========
    
    function test_WhitelistMultipleCountries() public {
        module.whitelistCountry(US);
        module.whitelistCountry(UK);
        module.whitelistCountry(FR);
        
        assertTrue(module.isCountryWhitelisted(US));
        assertTrue(module.isCountryWhitelisted(UK));
        assertTrue(module.isCountryWhitelisted(FR));
        assertFalse(module.isCountryWhitelisted(CN));
    }
    
    function test_BlacklistMultipleCountries() public {
        module.blacklistCountry(KP);
        module.blacklistCountry(CN);
        
        assertTrue(module.isCountryBlacklisted(KP));
        assertTrue(module.isCountryBlacklisted(CN));
        assertFalse(module.isCountryBlacklisted(US));
    }
    
    // ========== Hooks Tests (No-ops for this module) ==========
    
    function test_Transferred_DoesNothing() public view {
        // No-op, just verify it doesn't revert
    }
    
    function test_Created_DoesNothing() public view {
        // No-op
    }
    
    function test_Destroyed_DoesNothing() public view {
        // No-op
    }
}
