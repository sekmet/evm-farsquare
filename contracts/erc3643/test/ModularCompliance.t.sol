// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../compliance/ModularCompliance.sol";
import "../interfaces/IComplianceModule.sol";

contract MockComplianceModule is IComplianceModule {
    bool public shouldAllowTransfer = true;
    address public boundCompliance;
    
    uint256 public transferCount;
    uint256 public createdCount;
    uint256 public destroyedCount;
    
    function setAllowTransfer(bool _allow) external {
        shouldAllowTransfer = _allow;
    }
    
    function canTransfer(address, address, uint256) external view override returns (bool) {
        return shouldAllowTransfer;
    }
    
    function transferred(address, address, uint256) external override {
        transferCount++;
    }
    
    function created(address, uint256) external override {
        createdCount++;
    }
    
    function destroyed(address, uint256) external override {
        destroyedCount++;
    }
    
    function moduleCheck(address _compliance) external view override returns (bool) {
        return boundCompliance == _compliance;
    }
    
    function bindCompliance(address _compliance) external {
        boundCompliance = _compliance;
    }
}

contract ModularComplianceTest is Test {
    ModularCompliance public compliance;
    MockComplianceModule public module1;
    MockComplianceModule public module2;
    
    address public owner;
    address public token;
    address public user1;
    address public user2;
    
    event ModuleAdded(address indexed module);
    event ModuleRemoved(address indexed module);
    event TokenBound(address indexed token);
    event TokenUnbound(address indexed token);
    
    function setUp() public {
        owner = address(this);
        token = makeAddr("token");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        
        compliance = new ModularCompliance();
        module1 = new MockComplianceModule();
        module2 = new MockComplianceModule();
        
        module1.bindCompliance(address(compliance));
        module2.bindCompliance(address(compliance));
    }
    
    // ========== Token Binding Tests ==========
    
    function test_BindToken_Success() public {
        vm.expectEmit(true, false, false, false);
        emit TokenBound(token);
        
        compliance.bindToken(token);
        
        assertEq(compliance.tokenBound(), token);
    }
    
    function test_BindToken_RevertIf_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        compliance.bindToken(token);
    }
    
    function test_BindToken_RevertIf_ZeroAddress() public {
        vm.expectRevert();
        compliance.bindToken(address(0));
    }
    
    function test_BindToken_RevertIf_AlreadyBound() public {
        compliance.bindToken(token);
        
        vm.expectRevert();
        compliance.bindToken(token);
    }
    
    function test_UnbindToken_Success() public {
        compliance.bindToken(token);
        
        vm.expectEmit(true, false, false, false);
        emit TokenUnbound(token);
        
        compliance.unbindToken(token);
        
        assertEq(compliance.tokenBound(), address(0));
    }
    
    function test_UnbindToken_RevertIf_NotOwner() public {
        compliance.bindToken(token);
        
        vm.prank(user1);
        vm.expectRevert();
        compliance.unbindToken(token);
    }
    
    // ========== Module Management Tests ==========
    
    function test_AddModule_Success() public {
        vm.expectEmit(true, false, false, false);
        emit ModuleAdded(address(module1));
        
        compliance.addModule(address(module1));
        
        assertTrue(compliance.isModuleBound(address(module1)));
    }
    
    function test_AddModule_RevertIf_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        compliance.addModule(address(module1));
    }
    
    function test_AddModule_RevertIf_ZeroAddress() public {
        vm.expectRevert();
        compliance.addModule(address(0));
    }
    
    function test_AddModule_RevertIf_AlreadyBound() public {
        compliance.addModule(address(module1));
        
        vm.expectRevert();
        compliance.addModule(address(module1));
    }
    
    function test_AddModule_RevertIf_ModuleCheckFails() public {
        MockComplianceModule badModule = new MockComplianceModule();
        // Don't bind compliance to this module
        
        vm.expectRevert();
        compliance.addModule(address(badModule));
    }
    
    function test_RemoveModule_Success() public {
        compliance.addModule(address(module1));
        
        vm.expectEmit(true, false, false, false);
        emit ModuleRemoved(address(module1));
        
        compliance.removeModule(address(module1));
        
        assertFalse(compliance.isModuleBound(address(module1)));
    }
    
    function test_RemoveModule_RevertIf_NotOwner() public {
        compliance.addModule(address(module1));
        
        vm.prank(user1);
        vm.expectRevert();
        compliance.removeModule(address(module1));
    }
    
    function test_RemoveModule_RevertIf_NotBound() public {
        vm.expectRevert();
        compliance.removeModule(address(module1));
    }
    
    function test_GetModules_ReturnsCorrectList() public {
        compliance.addModule(address(module1));
        compliance.addModule(address(module2));
        
        address[] memory modules = compliance.getModules();
        
        assertEq(modules.length, 2);
        assertTrue(modules[0] == address(module1) || modules[0] == address(module2));
        assertTrue(modules[1] == address(module1) || modules[1] == address(module2));
    }
    
    // ========== Transfer Validation Tests ==========
    
    function test_CanTransfer_ReturnsTrueWithNoModules() public view {
        assertTrue(compliance.canTransfer(user1, user2, 100));
    }
    
    function test_CanTransfer_ReturnsTrueWhenAllModulesAllow() public {
        compliance.addModule(address(module1));
        compliance.addModule(address(module2));
        
        assertTrue(compliance.canTransfer(user1, user2, 100));
    }
    
    function test_CanTransfer_ReturnsFalseWhenAnyModuleRejects() public {
        compliance.addModule(address(module1));
        compliance.addModule(address(module2));
        
        module2.setAllowTransfer(false);
        
        assertFalse(compliance.canTransfer(user1, user2, 100));
    }
    
    // ========== Post-Transfer Hooks Tests ==========
    
    function test_Transferred_NotifiesAllModules() public {
        compliance.bindToken(token);
        compliance.addModule(address(module1));
        compliance.addModule(address(module2));
        
        vm.prank(token);
        compliance.transferred(user1, user2, 100);
        
        assertEq(module1.transferCount(), 1);
        assertEq(module2.transferCount(), 1);
    }
    
    function test_Transferred_RevertIf_NotToken() public {
        compliance.bindToken(token);
        
        vm.expectRevert();
        compliance.transferred(user1, user2, 100);
    }
    
    function test_Created_NotifiesAllModules() public {
        compliance.bindToken(token);
        compliance.addModule(address(module1));
        compliance.addModule(address(module2));
        
        vm.prank(token);
        compliance.created(user1, 100);
        
        assertEq(module1.createdCount(), 1);
        assertEq(module2.createdCount(), 1);
    }
    
    function test_Created_RevertIf_NotToken() public {
        compliance.bindToken(token);
        
        vm.expectRevert();
        compliance.created(user1, 100);
    }
    
    function test_Destroyed_NotifiesAllModules() public {
        compliance.bindToken(token);
        compliance.addModule(address(module1));
        compliance.addModule(address(module2));
        
        vm.prank(token);
        compliance.destroyed(user1, 100);
        
        assertEq(module1.destroyedCount(), 1);
        assertEq(module2.destroyedCount(), 1);
    }
    
    function test_Destroyed_RevertIf_NotToken() public {
        compliance.bindToken(token);
        
        vm.expectRevert();
        compliance.destroyed(user1, 100);
    }
    
    // ========== Edge Cases ==========
    
    function test_RemoveModule_UpdatesList() public {
        compliance.addModule(address(module1));
        compliance.addModule(address(module2));
        
        compliance.removeModule(address(module1));
        
        address[] memory modules = compliance.getModules();
        assertEq(modules.length, 1);
        assertEq(modules[0], address(module2));
    }
    
    function testFuzz_CanTransfer_DifferentAmounts(uint256 amount) public {
        compliance.addModule(address(module1));
        
        assertTrue(compliance.canTransfer(user1, user2, amount));
    }
}
