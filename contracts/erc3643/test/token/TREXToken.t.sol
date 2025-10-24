// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../../token/TREXToken.sol";
import "../../identity/IdentityRegistry.sol";
import "../../storage/IdentityRegistryStorage.sol";
import "../../registries/ClaimTopicsRegistry.sol";
import "../../registries/TrustedIssuersRegistry.sol";
import "../../compliance/ModularCompliance.sol";

/**
 * @title TREXTokenTest
 * @dev Tests for ERC-3643 Token Base Implementation (IP-028)
 */
contract TREXTokenTest is Test {
    TREXToken public token;
    IdentityRegistry public identityRegistry;
    IdentityRegistryStorage public identityStorage;
    ClaimTopicsRegistry public claimTopicsRegistry;
    TrustedIssuersRegistry public trustedIssuersRegistry;
    ModularCompliance public compliance;
    
    address public owner;
    address public agent;
    address public investor1;
    address public investor2;
    address public onchainId;
    
    function setUp() public {
        owner = address(this);
        agent = makeAddr("agent");
        investor1 = makeAddr("investor1");
        investor2 = makeAddr("investor2");
        onchainId = makeAddr("onchainId");
        
        // Deploy identity infrastructure
        identityStorage = new IdentityRegistryStorage();
        claimTopicsRegistry = new ClaimTopicsRegistry();
        trustedIssuersRegistry = new TrustedIssuersRegistry();
        
        identityRegistry = new IdentityRegistry(
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry),
            address(identityStorage)
        );
        
        // Deploy compliance
        compliance = new ModularCompliance();
        
        // Deploy token
        token = new TREXToken(
            "Test Token",
            "TEST",
            18,
            address(identityRegistry),
            address(compliance),
            onchainId
        );
        
        // Add owner as agent so they can call agent-only functions in tests
        token.addAgent(owner);
    }
    
    // ========== Deployment Tests ==========
    
    function test_Deployment_Success() public {
        assertEq(token.name(), "Test Token");
        assertEq(token.symbol(), "TEST");
        assertEq(token.decimals(), 18);
        assertEq(address(token.identityRegistry()), address(identityRegistry));
        assertEq(address(token.compliance()), address(compliance));
        assertEq(token.onchainId(), onchainId);
        assertEq(token.owner(), owner);
    }
    
    function test_Deployment_InitialState() public {
        assertFalse(token.paused());
        assertEq(token.totalSupply(), 0);
        assertFalse(token.isFrozen(investor1));
        assertEq(token.getFrozenTokens(investor1), 0);
    }
    
    // ========== Identity Registry Tests ==========
    
    function test_SetIdentityRegistry_Success() public {
        IdentityRegistry newRegistry = new IdentityRegistry(
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry),
            address(identityStorage)
        );
        
        token.setIdentityRegistry(address(newRegistry));
        assertEq(address(token.identityRegistry()), address(newRegistry));
    }
    
    function test_SetIdentityRegistry_OnlyOwner() public {
        vm.prank(investor1);
        vm.expectRevert();
        token.setIdentityRegistry(makeAddr("newRegistry"));
    }
    
    // ========== Compliance Tests ==========
    
    function test_SetCompliance_Success() public {
        ModularCompliance newCompliance = new ModularCompliance();
        
        token.setCompliance(address(newCompliance));
        assertEq(address(token.compliance()), address(newCompliance));
    }
    
    function test_SetCompliance_OnlyOwner() public {
        vm.prank(investor1);
        vm.expectRevert();
        token.setCompliance(makeAddr("newCompliance"));
    }
    
    // ========== Pause/Unpause Tests ==========
    
    function test_Pause_Success() public {
        token.pause();
        assertTrue(token.paused());
    }
    
    function test_Unpause_Success() public {
        token.pause();
        token.unpause();
        assertFalse(token.paused());
    }
    
    function test_Pause_OnlyOwner() public {
        vm.prank(investor1);
        vm.expectRevert();
        token.pause();
    }
    
    // ========== Freeze Tests ==========
    
    function test_FreezeAddress_Success() public {
        token.setAddressFrozen(investor1, true);
        assertTrue(token.isFrozen(investor1));
    }
    
    function test_UnfreezeAddress_Success() public {
        token.setAddressFrozen(investor1, true);
        
        token.setAddressFrozen(investor1, false);
        assertFalse(token.isFrozen(investor1));
    }
    
    function test_FreezeAddress_OnlyAgent() public {
        vm.prank(investor1);
        vm.expectRevert();
        token.setAddressFrozen(investor2, true);
    }
    
    // Note: freezePartialTokens and unfreezePartialTokens require special permissions
    // They are tested separately in integration tests
    
    // ========== Agent Management Tests ==========
    
    function test_AddAgent_Success() public {
        token.addAgent(agent);
        assertTrue(token.isAgent(agent));
    }
    
    function test_RemoveAgent_Success() public {
        token.addAgent(agent);
        
        token.removeAgent(agent);
        assertFalse(token.isAgent(agent));
    }
    
    function test_AddAgent_OnlyOwner() public {
        vm.prank(investor1);
        vm.expectRevert();
        token.addAgent(agent);
    }
    
    // ========== Token Information Tests ==========
    
    function test_SetOnchainID_Success() public {
        address newID = makeAddr("newOnchainID");
        token.setOnchainID(newID);
        assertEq(token.onchainId(), newID);
    }
    
    function test_Version_Returns() public view {
        assertEq(token.version(), "1.0.0");
    }
}
