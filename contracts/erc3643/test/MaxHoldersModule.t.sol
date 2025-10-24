// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../compliance/modules/MaxHoldersModule.sol";
import "../compliance/ModularCompliance.sol";

contract MaxHoldersModuleTest is Test {
    MaxHoldersModule public module;
    ModularCompliance public compliance;
    
    address public owner;
    address public token;
    address public user1;
    address public user2;
    address public user3;
    address public user4;
    
    event HolderLimitSet(uint256 limit);
    event HolderAdded(address indexed holder);
    event HolderRemoved(address indexed holder);
    
    function setUp() public {
        owner = address(this);
        token = makeAddr("token");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");
        user4 = makeAddr("user4");
        
        compliance = new ModularCompliance();
        module = new MaxHoldersModule(address(compliance));
        
        compliance.bindToken(token);
        module.bindToken(token);
    }
    
    // ========== Configuration Tests ==========
    
    function test_SetHolderLimit_Success() public {
        vm.expectEmit(false, false, false, true);
        emit HolderLimitSet(100);
        
        module.setHolderLimit(100);
        
        assertEq(module.holderLimit(), 100);
    }
    
    function test_SetHolderLimit_RevertIf_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        module.setHolderLimit(100);
    }
    
    function test_Constructor_BindsCompliance() public view {
        assertTrue(module.moduleCheck(address(compliance)));
        assertFalse(module.moduleCheck(address(0)));
    }
    
    // ========== Holder Count Tests ==========
    
    function test_GetHolderCount_InitiallyZero() public view {
        assertEq(module.holderCount(), 0);
    }
    
    function test_IsHolder_ReturnsFalseForNonHolders() public view {
        assertFalse(module.isHolder(user1));
    }
    
    // ========== Transfer Validation Tests ==========
    
    function test_CanTransfer_AllowsWhenBelowLimit() public {
        module.setHolderLimit(10);
        
        assertTrue(module.canTransfer(address(0), user1, 100));
    }
    
    function test_CanTransfer_AllowsTransferBetweenExistingHolders() public {
        module.setHolderLimit(2);
        
        // Simulate user1 and user2 becoming holders
        vm.prank(address(compliance));
        module.created(user1, 100);
        vm.prank(address(compliance));
        module.created(user2, 100);
        
        // Transfer between existing holders should be allowed
        assertTrue(module.canTransfer(user1, user2, 50));
    }
    
    function test_CanTransfer_RejectsWhenLimitReached() public {
        module.setHolderLimit(2);
        
        // Add 2 holders
        vm.prank(address(compliance));
        module.created(user1, 100);
        vm.prank(address(compliance));
        module.created(user2, 100);
        
        // Try to add a third holder
        assertFalse(module.canTransfer(address(0), user3, 100));
    }
    
    function test_CanTransfer_AllowsWhenNoLimitSet() public {
        // No limit set (defaults to 0, meaning no restriction)
        assertTrue(module.canTransfer(address(0), user1, 100));
    }
    
    function test_CanTransfer_AllowsTransferToSelf() public {
        module.setHolderLimit(1);
        
        vm.prank(address(compliance));
        module.created(user1, 100);
        
        // Transfer to self should be allowed
        assertTrue(module.canTransfer(user1, user1, 50));
    }
    
    function test_CanTransfer_AllowsZeroAmountTransfer() public {
        module.setHolderLimit(1);
        
        vm.prank(address(compliance));
        module.created(user1, 100);
        
        // Zero amount transfer to new address should be allowed
        assertTrue(module.canTransfer(user1, user2, 0));
    }
    
    // ========== Created Hook Tests ==========
    
    function test_Created_AddsNewHolder() public {
        module.setHolderLimit(10);
        
        vm.expectEmit(true, false, false, false);
        emit HolderAdded(user1);
        
        vm.prank(address(compliance));
        module.created(user1, 100);
        
        assertTrue(module.isHolder(user1));
        assertEq(module.holderCount(), 1);
    }
    
    function test_Created_DoesNotDuplicateExistingHolder() public {
        module.setHolderLimit(10);
        
        vm.prank(address(compliance));
        module.created(user1, 100);
        
        // Create more tokens for same holder
        vm.prank(address(compliance));
        module.created(user1, 50);
        
        assertEq(module.holderCount(), 1);
    }
    
    function test_Created_RevertIf_NotToken() public {
        vm.expectRevert();
        module.created(user1, 100);
    }
    
    // ========== Destroyed Hook Tests ==========
    
    function test_Destroyed_DoesNotRemoveHolder() public {
        module.setHolderLimit(10);
        
        vm.prank(address(compliance));
        module.created(user1, 100);
        
        // Destroy some tokens but not all
        vm.prank(address(compliance));
        module.destroyed(user1, 50);
        
        // Holder should still exist
        assertTrue(module.isHolder(user1));
        assertEq(module.holderCount(), 1);
    }
    
    function test_Destroyed_RevertIf_NotToken() public {
        vm.expectRevert();
        module.destroyed(user1, 100);
    }
    
    // ========== Transferred Hook Tests ==========
    
    function test_Transferred_AddsNewRecipient() public {
        module.setHolderLimit(10);
        
        vm.prank(address(compliance));
        module.created(user1, 100);
        
        vm.expectEmit(true, false, false, false);
        emit HolderAdded(user2);
        
        vm.prank(address(compliance));
        module.transferred(user1, user2, 50);
        
        assertTrue(module.isHolder(user2));
        assertEq(module.holderCount(), 2);
    }
    
    function test_Transferred_DoesNotAddZeroRecipient() public {
        module.setHolderLimit(10);
        
        vm.prank(address(compliance));
        module.created(user1, 100);
        
        // Transfer to zero address (burn)
        vm.prank(address(compliance));
        module.transferred(user1, address(0), 50);
        
        assertEq(module.holderCount(), 1);
    }
    
    function test_Transferred_RevertIf_NotToken() public {
        vm.expectRevert();
        module.transferred(user1, user2, 100);
    }
    
    // ========== Edge Cases ==========
    
    function test_MultipleHoldersScenario() public {
        module.setHolderLimit(3);
        
        // Add 3 holders
        vm.prank(address(compliance));
        module.created(user1, 100);
        vm.prank(address(compliance));
        module.created(user2, 100);
        vm.prank(address(compliance));
        module.created(user3, 100);
        
        assertEq(module.holderCount(), 3);
        
        // Cannot add 4th holder
        assertFalse(module.canTransfer(address(0), user4, 100));
        
        // Can transfer between existing holders
        assertTrue(module.canTransfer(user1, user2, 50));
        assertTrue(module.canTransfer(user2, user3, 50));
    }
    
    function testFuzz_SetHolderLimit_AcceptsAnyValue(uint256 limit) public {
        module.setHolderLimit(limit);
        assertEq(module.holderLimit(), limit);
    }
    
    function testFuzz_CanTransfer_ConsistentBehavior(address to, uint256 amount) public {
        vm.assume(to != address(0));
        module.setHolderLimit(1);
        
        // First transfer should always be allowed if under limit
        assertTrue(module.canTransfer(address(0), to, amount));
    }
}
