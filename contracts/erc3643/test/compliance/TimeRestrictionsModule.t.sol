// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../../compliance/modules/TimeRestrictionsModule.sol";
import "../../compliance/ModularCompliance.sol";

/**
 * @title TimeRestrictionsModuleTest
 * @dev Tests for time-based transfer restrictions including lockups and vesting
 */
contract TimeRestrictionsModuleTest is Test {
    TimeRestrictionsModule public module;
    ModularCompliance public compliance;
    
    address public owner;
    address public token;
    address public investor1;
    address public investor2;
    
    uint256 constant YEAR = 365 days;
    uint256 constant MONTH = 30 days;
    
    event TokensLocked(address indexed investor, uint256 amount, uint256 releaseTime);
    event TokensUnlocked(address indexed investor, uint256 amount);
    event LockupSet(address indexed investor, uint256 lockupEnd, uint256 cliffEnd, uint256 vestingDuration);
    
    function setUp() public {
        owner = address(this);
        token = makeAddr("token");
        investor1 = makeAddr("investor1");
        investor2 = makeAddr("investor2");
        
        compliance = new ModularCompliance();
        module = new TimeRestrictionsModule();
        
        module.bindCompliance(address(compliance));
    }
    
    // ========== Basic Lockup Tests ==========
    
    function test_SetLockup_Success() public {
        uint256 lockupEnd = block.timestamp + 6 * MONTH;
        
        vm.expectEmit(true, false, false, true);
        emit LockupSet(investor1, lockupEnd, 0, 0);
        
        module.setLockup(investor1, lockupEnd, 0, 0);
        
        (uint256 storedLockupEnd, , , ) = module.lockupInfo(investor1);
        assertEq(storedLockupEnd, lockupEnd);
    }
    
    function test_SetLockup_RevertIf_PastTime() public {
        vm.expectRevert();
        module.setLockup(investor1, block.timestamp, 0, 0);
    }
    
    function test_SetLockup_RevertIf_NotOwner() public {
        vm.prank(investor1);
        vm.expectRevert();
        module.setLockup(investor2, block.timestamp + 1 days, 0, 0);
    }
    
    // ========== Transfer During Lockup Tests ==========
    
    function test_CanTransfer_BlockedDuringLockup() public {
        module.setLockup(investor1, block.timestamp + 6 * MONTH, 0, 0);
        
        assertFalse(module.canTransfer(investor1, investor2, 1000 ether));
    }
    
    function test_CanTransfer_AllowedAfterLockup() public {
        module.setLockup(investor1, block.timestamp + 1 days, 0, 0);
        
        vm.warp(block.timestamp + 2 days);
        
        assertTrue(module.canTransfer(investor1, investor2, 1000 ether));
    }
    
    function test_CanTransfer_NoLockup() public {
        assertTrue(module.canTransfer(investor1, investor2, 1000 ether));
    }
    
    // ========== Cliff Vesting Tests ==========
    
    function test_CliffVesting_BlockedBeforeCliff() public {
        uint256 lockupEnd = block.timestamp + YEAR;
        uint256 cliffEnd = block.timestamp + 3 * MONTH;
        
        module.setLockup(investor1, lockupEnd, cliffEnd, 0);
        vm.prank(address(compliance));
        module.created(investor1, 1000 ether);
        
        vm.warp(block.timestamp + 1 * MONTH);
        
        // Before cliff, nothing is unlocked
        assertFalse(module.canTransfer(investor1, investor2, 100 ether));
    }
    
    function test_CliffVesting_AllowedAfterCliff() public {
        uint256 lockupEnd = block.timestamp + YEAR;
        uint256 cliffEnd = block.timestamp + 3 * MONTH;
        
        module.setLockup(investor1, lockupEnd, cliffEnd, 0);
        vm.prank(address(compliance));
        module.created(investor1, 1000 ether);
        
        vm.warp(cliffEnd + 1);
        
        // After cliff, tokens start vesting
        assertTrue(module.canTransfer(investor1, investor2, 100 ether));
    }
    
    // ========== Gradual Vesting Tests ==========
    
    function test_GradualVesting_LinearUnlock() public {
        uint256 lockupEnd = block.timestamp + YEAR;
        uint256 cliffEnd = block.timestamp + 3 * MONTH;
        uint256 vestingDuration = YEAR;
        
        module.setLockup(investor1, lockupEnd, cliffEnd, vestingDuration);
        vm.prank(address(compliance));
        module.created(investor1, 1200 ether);
        
        // After 6 months (50% of vesting period), 600 tokens should be unlocked
        vm.warp(block.timestamp + 6 * MONTH);
        
        uint256 unlocked = module.getUnlockedBalance(investor1);
        assertApproxEqRel(unlocked, 600 ether, 0.02e18); // 2% tolerance (accounts for MONTH=30d vs YEAR=365d)
    }
    
    function test_GradualVesting_FullyUnlockedAtEnd() public {
        uint256 vestingDuration = YEAR;
        module.setLockup(investor1, block.timestamp + vestingDuration, 0, vestingDuration);
        vm.prank(address(compliance));
        module.created(investor1, 1000 ether);
        
        vm.warp(block.timestamp + vestingDuration + 1);
        
        uint256 unlocked = module.getUnlockedBalance(investor1);
        assertEq(unlocked, 1000 ether);
    }
    
    function test_GradualVesting_PartialTransferAllowed() public {
        uint256 vestingDuration = YEAR;
        module.setLockup(investor1, block.timestamp + vestingDuration, 0, vestingDuration);
        vm.prank(address(compliance));
        module.created(investor1, 1000 ether);
        
        // After 3 months, 250 tokens unlocked
        vm.warp(block.timestamp + 3 * MONTH);
        
        assertTrue(module.canTransfer(investor1, investor2, 200 ether));
        assertFalse(module.canTransfer(investor1, investor2, 300 ether));
    }
    
    // ========== Balance Tracking Tests ==========
    
    function test_Created_TracksInitialBalance() public {
        vm.prank(address(compliance));
        module.created(investor1, 1000 ether);
        
        assertEq(module.getTotalBalance(investor1), 1000 ether);
    }
    
    function test_Transferred_UpdatesBalances() public {
        vm.prank(address(compliance));
        module.created(investor1, 1000 ether);
        
        vm.prank(address(compliance));
        module.transferred(investor1, investor2, 200 ether);
        
        assertEq(module.getTotalBalance(investor1), 800 ether);
        assertEq(module.getTotalBalance(investor2), 200 ether);
    }
    
    function test_Destroyed_DecreasesBalance() public {
        vm.prank(address(compliance));
        module.created(investor1, 1000 ether);
        
        vm.prank(address(compliance));
        module.destroyed(investor1, 300 ether);
        
        assertEq(module.getTotalBalance(investor1), 700 ether);
    }
    
    // ========== Multiple Investors Tests ==========
    
    function test_MultipleInvestors_IndependentLockups() public {
        module.setLockup(investor1, block.timestamp + 6 * MONTH, 0, 0);
        module.setLockup(investor2, block.timestamp + 3 * MONTH, 0, 0);
        
        vm.prank(address(compliance));
        module.created(investor1, 1000 ether);
        vm.prank(address(compliance));
        module.created(investor2, 500 ether);
        
        vm.warp(block.timestamp + 4 * MONTH);
        
        // Investor1 still locked
        assertFalse(module.canTransfer(investor1, investor2, 100 ether));
        
        // Investor2 unlocked
        assertTrue(module.canTransfer(investor2, investor1, 100 ether));
    }
    
    // ========== Edge Cases ==========
    
    function test_TransferToSelf_Allowed() public {
        module.setLockup(investor1, block.timestamp + 6 * MONTH, 0, 0);
        
        // Transfer to self should always be allowed (no actual movement)
        assertTrue(module.canTransfer(investor1, investor1, 100 ether));
    }
    
    function test_ZeroAmount_Allowed() public {
        module.setLockup(investor1, block.timestamp + 6 * MONTH, 0, 0);
        
        assertTrue(module.canTransfer(investor1, investor2, 0));
    }
    
    function test_UpdateLockup_ExistingInvestor() public {
        module.setLockup(investor1, block.timestamp + 6 * MONTH, 0, 0);
        
        // Update to shorter lockup
        uint256 newLockupEnd = block.timestamp + 3 * MONTH;
        module.setLockup(investor1, newLockupEnd, 0, 0);
        
        (uint256 lockupEnd, , , ) = module.lockupInfo(investor1);
        assertEq(lockupEnd, newLockupEnd);
    }
    
    // ========== Complex Vesting Scenarios ==========
    
    function test_CliffAndVesting_Combined() public {
        uint256 lockupEnd = block.timestamp + YEAR;
        uint256 cliffEnd = block.timestamp + 3 * MONTH;
        uint256 vestingDuration = 9 * MONTH;
        
        module.setLockup(investor1, lockupEnd, cliffEnd, vestingDuration);
        vm.prank(address(compliance));
        module.created(investor1, 900 ether);
        
        // Before cliff: nothing unlocked
        vm.warp(block.timestamp + 2 * MONTH);
        assertEq(module.getUnlockedBalance(investor1), 0);
        
        // At cliff: vesting starts
        vm.warp(cliffEnd);
        uint256 unlockedAtCliff = module.getUnlockedBalance(investor1);
        assertGt(unlockedAtCliff, 0);
        
        // Halfway through vesting: ~50% unlocked
        vm.warp(cliffEnd + (vestingDuration / 2));
        uint256 unlockedHalfway = module.getUnlockedBalance(investor1);
        assertApproxEqRel(unlockedHalfway, 450 ether, 0.05e18);
        
        // End of vesting: 100% unlocked
        vm.warp(lockupEnd);
        assertEq(module.getUnlockedBalance(investor1), 900 ether);
    }
    
    function test_IncrementalTransfers_UpdateTracking() public {
        uint256 vestingDuration = YEAR;
        module.setLockup(investor1, block.timestamp + vestingDuration, 0, vestingDuration);
        vm.prank(address(compliance));
        module.created(investor1, 1000 ether);
        
        // After 3 months, transfer some
        vm.warp(block.timestamp + 3 * MONTH);
        vm.prank(address(compliance));
        module.transferred(investor1, investor2, 100 ether);
        
        // Remaining balance should be tracked correctly
        assertEq(module.getTotalBalance(investor1), 900 ether);
        
        // After 6 months, more should be unlocked
        vm.warp(block.timestamp + 6 * MONTH);
        uint256 unlocked = module.getUnlockedBalance(investor1);
        
        // Should be based on remaining balance
        assertGt(unlocked, 100 ether);
    }
    
    // ========== ModuleCheck Test ==========
    
    function test_ModuleCheck_ReturnsTrueForBoundCompliance() public {
        assertTrue(module.moduleCheck(address(compliance)));
    }
    
    function test_ModuleCheck_ReturnsFalseForUnbound() public {
        assertFalse(module.moduleCheck(makeAddr("random")));
    }
}
