// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../compliance/ComplianceModuleRegistry.sol";
import "../compliance/modules/MaxHoldersModule.sol";
import "../compliance/ModularCompliance.sol";

contract ComplianceModuleRegistryTest is Test {
    ComplianceModuleRegistry public registry;
    ModularCompliance public compliance;
    MaxHoldersModule public testModule;
    
    address public owner;
    address public user1;
    
    event ModuleRegistered(
        address indexed module,
        string name,
        string version,
        string description
    );
    event ModuleDeregistered(address indexed module);
    event ModuleMetadataUpdated(address indexed module);
    
    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        
        registry = new ComplianceModuleRegistry();
        compliance = new ModularCompliance();
        testModule = new MaxHoldersModule(address(compliance));
    }
    
    // ========== Registration Tests ==========
    
    function test_RegisterModule_Success() public {
        vm.expectEmit(true, false, false, true);
        emit ModuleRegistered(
            address(testModule),
            "MaxHoldersModule",
            "1.0.0",
            "Enforces maximum number of token holders"
        );
        
        registry.registerModule(
            address(testModule),
            "MaxHoldersModule",
            "1.0.0",
            "Enforces maximum number of token holders"
        );
        
        assertTrue(registry.isRegistered(address(testModule)));
    }
    
    function test_RegisterModule_RevertIf_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        registry.registerModule(
            address(testModule),
            "MaxHoldersModule",
            "1.0.0",
            "Test"
        );
    }
    
    function test_RegisterModule_RevertIf_ZeroAddress() public {
        vm.expectRevert();
        registry.registerModule(
            address(0),
            "Test",
            "1.0.0",
            "Test"
        );
    }
    
    function test_RegisterModule_RevertIf_AlreadyRegistered() public {
        registry.registerModule(
            address(testModule),
            "MaxHoldersModule",
            "1.0.0",
            "Test"
        );
        
        vm.expectRevert();
        registry.registerModule(
            address(testModule),
            "MaxHoldersModule",
            "1.0.0",
            "Test"
        );
    }
    
    function test_RegisterModule_RevertIf_EmptyName() public {
        vm.expectRevert();
        registry.registerModule(
            address(testModule),
            "",
            "1.0.0",
            "Test"
        );
    }
    
    function test_RegisterModule_RevertIf_EmptyVersion() public {
        vm.expectRevert();
        registry.registerModule(
            address(testModule),
            "Test",
            "",
            "Test"
        );
    }
    
    // ========== Deregistration Tests ==========
    
    function test_DeregisterModule_Success() public {
        registry.registerModule(
            address(testModule),
            "MaxHoldersModule",
            "1.0.0",
            "Test"
        );
        
        vm.expectEmit(true, false, false, false);
        emit ModuleDeregistered(address(testModule));
        
        registry.deregisterModule(address(testModule));
        
        assertFalse(registry.isRegistered(address(testModule)));
    }
    
    function test_DeregisterModule_RevertIf_NotOwner() public {
        registry.registerModule(
            address(testModule),
            "MaxHoldersModule",
            "1.0.0",
            "Test"
        );
        
        vm.prank(user1);
        vm.expectRevert();
        registry.deregisterModule(address(testModule));
    }
    
    function test_DeregisterModule_RevertIf_NotRegistered() public {
        vm.expectRevert();
        registry.deregisterModule(address(testModule));
    }
    
    // ========== Metadata Tests ==========
    
    function test_GetModuleInfo_ReturnsCorrectData() public {
        registry.registerModule(
            address(testModule),
            "MaxHoldersModule",
            "1.0.0",
            "Enforces maximum number of token holders"
        );
        
        (
            string memory name,
            string memory version,
            string memory description,
            bool active
        ) = registry.getModuleInfo(address(testModule));
        
        assertEq(name, "MaxHoldersModule");
        assertEq(version, "1.0.0");
        assertEq(description, "Enforces maximum number of token holders");
        assertTrue(active);
    }
    
    function test_GetModuleInfo_RevertIf_NotRegistered() public {
        vm.expectRevert();
        registry.getModuleInfo(address(testModule));
    }
    
    function test_UpdateModuleMetadata_Success() public {
        registry.registerModule(
            address(testModule),
            "MaxHoldersModule",
            "1.0.0",
            "Original description"
        );
        
        vm.expectEmit(true, false, false, false);
        emit ModuleMetadataUpdated(address(testModule));
        
        registry.updateModuleMetadata(
            address(testModule),
            "MaxHoldersModule",
            "1.1.0",
            "Updated description"
        );
        
        (
            string memory name,
            string memory version,
            string memory description,
            bool active
        ) = registry.getModuleInfo(address(testModule));
        
        assertEq(name, "MaxHoldersModule");
        assertEq(version, "1.1.0");
        assertEq(description, "Updated description");
        assertTrue(active);
    }
    
    function test_UpdateModuleMetadata_RevertIf_NotOwner() public {
        registry.registerModule(
            address(testModule),
            "MaxHoldersModule",
            "1.0.0",
            "Test"
        );
        
        vm.prank(user1);
        vm.expectRevert();
        registry.updateModuleMetadata(
            address(testModule),
            "MaxHoldersModule",
            "1.1.0",
            "Test"
        );
    }
    
    function test_UpdateModuleMetadata_RevertIf_NotRegistered() public {
        vm.expectRevert();
        registry.updateModuleMetadata(
            address(testModule),
            "MaxHoldersModule",
            "1.1.0",
            "Test"
        );
    }
    
    // ========== Query Tests ==========
    
    function test_IsRegistered_ReturnsFalseForUnregistered() public view {
        assertFalse(registry.isRegistered(address(testModule)));
    }
    
    function test_IsRegistered_ReturnsTrueForRegistered() public {
        registry.registerModule(
            address(testModule),
            "MaxHoldersModule",
            "1.0.0",
            "Test"
        );
        
        assertTrue(registry.isRegistered(address(testModule)));
    }
    
    function test_GetAllModules_ReturnsEmptyInitially() public view {
        address[] memory modules = registry.getAllModules();
        assertEq(modules.length, 0);
    }
    
    function test_GetAllModules_ReturnsRegisteredModules() public {
        MaxHoldersModule module1 = new MaxHoldersModule(address(compliance));
        MaxHoldersModule module2 = new MaxHoldersModule(address(compliance));
        
        registry.registerModule(address(module1), "Module1", "1.0.0", "Test 1");
        registry.registerModule(address(module2), "Module2", "1.0.0", "Test 2");
        
        address[] memory modules = registry.getAllModules();
        
        assertEq(modules.length, 2);
        assertEq(modules[0], address(module1));
        assertEq(modules[1], address(module2));
    }
    
    function test_GetAllModules_UpdatesAfterDeregistration() public {
        MaxHoldersModule module1 = new MaxHoldersModule(address(compliance));
        MaxHoldersModule module2 = new MaxHoldersModule(address(compliance));
        
        registry.registerModule(address(module1), "Module1", "1.0.0", "Test 1");
        registry.registerModule(address(module2), "Module2", "1.0.0", "Test 2");
        
        registry.deregisterModule(address(module1));
        
        address[] memory modules = registry.getAllModules();
        
        assertEq(modules.length, 1);
        assertEq(modules[0], address(module2));
    }
    
    // ========== Validation Tests ==========
    
    function test_IsApprovedModule_ReturnsTrueForRegistered() public {
        registry.registerModule(
            address(testModule),
            "MaxHoldersModule",
            "1.0.0",
            "Test"
        );
        
        assertTrue(registry.isApprovedModule(address(testModule)));
    }
    
    function test_IsApprovedModule_ReturnsFalseForUnregistered() public view {
        assertFalse(registry.isApprovedModule(address(testModule)));
    }
    
    function test_IsApprovedModule_ReturnsFalseAfterDeregistration() public {
        registry.registerModule(
            address(testModule),
            "MaxHoldersModule",
            "1.0.0",
            "Test"
        );
        
        registry.deregisterModule(address(testModule));
        
        assertFalse(registry.isApprovedModule(address(testModule)));
    }
    
    // ========== Multiple Modules Tests ==========
    
    function test_RegisterMultipleModules() public {
        MaxHoldersModule module1 = new MaxHoldersModule(address(compliance));
        MaxHoldersModule module2 = new MaxHoldersModule(address(compliance));
        MaxHoldersModule module3 = new MaxHoldersModule(address(compliance));
        
        registry.registerModule(address(module1), "Module1", "1.0.0", "Test 1");
        registry.registerModule(address(module2), "Module2", "2.0.0", "Test 2");
        registry.registerModule(address(module3), "Module3", "1.5.0", "Test 3");
        
        assertTrue(registry.isRegistered(address(module1)));
        assertTrue(registry.isRegistered(address(module2)));
        assertTrue(registry.isRegistered(address(module3)));
        
        address[] memory modules = registry.getAllModules();
        assertEq(modules.length, 3);
    }
}
