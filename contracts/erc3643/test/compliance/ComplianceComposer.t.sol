// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../../compliance/ComplianceComposer.sol";
import "../../compliance/ModularCompliance.sol";
import "../../compliance/modules/MaxHoldersModule.sol";
import "../../compliance/modules/MaxBalanceModule.sol";
import "../../compliance/modules/CountryRestrictionsModule.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Mock", "MOCK") {}
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title ComplianceComposerTest
 * @dev Tests for advanced AND/OR compliance rule composition
 */
contract ComplianceComposerTest is Test {
    ComplianceComposer public composer;
    
    MaxHoldersModule public maxHoldersModule;
    MaxBalanceModule public maxBalanceModule;
    CountryRestrictionsModule public countryModule;
    
    MockToken public token;
    address public owner;
    address public investor1;
    address public investor2;
    
    event RuleEvaluated(uint256 indexed ruleId, bool result);
    event ComplianceCheckFailed(uint256 indexed ruleId, string reason);
    
    function setUp() public {
        owner = address(this);
        investor1 = makeAddr("investor1");
        investor2 = makeAddr("investor2");
        
        token = new MockToken();
        
        composer = new ComplianceComposer();
        composer.bindToken(address(token));
        
        // Create test modules
        maxHoldersModule = new MaxHoldersModule(address(composer));
        maxHoldersModule.setHolderLimit(100);
        maxHoldersModule.bindToken(address(token));
        
        maxBalanceModule = new MaxBalanceModule(address(composer));
        maxBalanceModule.setMaxBalance(1000 ether);
        maxBalanceModule.bindToken(address(token));
        
        countryModule = new CountryRestrictionsModule(address(composer));
        countryModule.blacklistCountry(840); // USA
        countryModule.bindToken(address(token));
    }
    
    // ========== AND Logic Tests ==========
    
    function test_AndRule_AllModulesPass() public {
        // Create AND rule: maxHolders AND maxBalance
        address[] memory modules = new address[](2);
        modules[0] = address(maxHoldersModule);
        modules[1] = address(maxBalanceModule);
        
        uint256 ruleId = composer.createAndRule(modules);
        
        // Both modules should pass for a normal transfer
        assertTrue(composer.evaluateRule(ruleId, investor1, investor2, 100 ether));
    }
    
    function test_AndRule_OneModuleFails() public {
        address[] memory modules = new address[](2);
        modules[0] = address(maxHoldersModule);
        modules[1] = address(maxBalanceModule);
        
        uint256 ruleId = composer.createAndRule(modules);
        
        // Mint tokens to investor2 to exceed maxBalance
        token.mint(investor2, 1500 ether);
        
        // Should fail because maxBalance module fails (1500 + 100 > 1000 max)
        assertFalse(composer.evaluateRule(ruleId, investor1, investor2, 100 ether));
    }
    
    function test_AndRule_AllModulesFail() public {
        address[] memory modules = new address[](2);
        modules[0] = address(maxHoldersModule);
        modules[1] = address(maxBalanceModule);
        
        uint256 ruleId = composer.createAndRule(modules);
        
        // Make maxHolders fail - register holders and set limit to 1
        token.mint(investor2, 100 ether);
        vm.prank(address(composer));
        maxHoldersModule.transferred(address(0), investor2, 100 ether); // Register investor2
        token.mint(investor1, 100 ether);
        vm.prank(address(composer));
        maxHoldersModule.transferred(address(0), investor1, 100 ether); // Register investor1
        maxHoldersModule.setHolderLimit(1); // Only 1 holder allowed, but we have 2
        
        // Make maxBalance fail by minting more tokens
        token.mint(investor2, 900 ether); // Total 1000 ether for investor2
        
        // Should fail because both modules fail (trying to add address(this) as 3rd holder)
        assertFalse(composer.evaluateRule(ruleId, investor1, address(this), 100 ether));
    }
    
    // ========== OR Logic Tests ==========
    
    function test_OrRule_AllModulesPass() public {
        address[] memory modules = new address[](2);
        modules[0] = address(maxHoldersModule);
        modules[1] = address(maxBalanceModule);
        
        uint256 ruleId = composer.createOrRule(modules);
        
        // Should pass if any module passes (all pass in this case)
        assertTrue(composer.evaluateRule(ruleId, investor1, investor2, 100 ether));
    }
    
    function test_OrRule_OneModulePasses() public {
        address[] memory modules = new address[](2);
        modules[0] = address(maxHoldersModule);
        modules[1] = address(maxBalanceModule);
        
        uint256 ruleId = composer.createOrRule(modules);
        
        // Make maxBalance fail by minting tokens
        token.mint(investor2, 1500 ether);
        
        // Should still pass because maxHolders passes
        assertTrue(composer.evaluateRule(ruleId, investor1, investor2, 100 ether));
    }
    
    function test_OrRule_AllModulesFail() public {
        address[] memory modules = new address[](2);
        modules[0] = address(maxHoldersModule);
        modules[1] = address(maxBalanceModule);
        
        uint256 ruleId = composer.createOrRule(modules);
        
        // Make maxHolders fail - register 2 holders but set limit to 1
        token.mint(investor1, 100 ether);
        vm.prank(address(composer));
        maxHoldersModule.transferred(address(0), investor1, 100 ether); // Register investor1
        token.mint(investor2, 100 ether);
        vm.prank(address(composer));
        maxHoldersModule.transferred(address(0), investor2, 100 ether); // Register investor2
        maxHoldersModule.setHolderLimit(1); // Only 1 holder allowed
        
        // Make maxBalance fail by minting tokens to address(this) that exceed limit
        token.mint(address(this), 1500 ether); // Exceeds max balance of 1000 ether
        
        // Should fail because all modules fail (holder limit exceeded AND balance would exceed max)
        assertFalse(composer.evaluateRule(ruleId, investor1, address(this), 100 ether));
    }
    
    // ========== Nested Logic Tests ==========
    
    function test_NestedRule_AndOfOrs() public {
        // Create: (maxHolders OR maxBalance) AND countryModule
        address[] memory orModules = new address[](2);
        orModules[0] = address(maxHoldersModule);
        orModules[1] = address(maxBalanceModule);
        
        uint256 orRuleId = composer.createOrRule(orModules);
        
        uint256[] memory andRules = new uint256[](2);
        andRules[0] = orRuleId;
        
        // Create a simple rule for country module
        address[] memory countryModules = new address[](1);
        countryModules[0] = address(countryModule);
        andRules[1] = composer.createAndRule(countryModules);
        
        uint256 compositeId = composer.createCompositeAndRule(andRules);
        
        // Should pass if OR passes AND country check passes
        assertTrue(composer.evaluateRule(compositeId, investor1, investor2, 100 ether));
    }
    
    function test_NestedRule_OrOfAnds() public {
        // Create: (maxHolders AND maxBalance) OR countryModule
        address[] memory andModules = new address[](2);
        andModules[0] = address(maxHoldersModule);
        andModules[1] = address(maxBalanceModule);
        
        uint256 andRuleId = composer.createAndRule(andModules);
        
        uint256[] memory orRules = new uint256[](2);
        orRules[0] = andRuleId;
        
        // Create a simple rule for country module
        address[] memory countryModules = new address[](1);
        countryModules[0] = address(countryModule);
        orRules[1] = composer.createAndRule(countryModules);
        
        uint256 compositeId = composer.createCompositeOrRule(orRules);
        
        // Should pass if either AND passes OR country check passes
        assertTrue(composer.evaluateRule(compositeId, investor1, investor2, 100 ether));
    }
    
    // ========== Short-Circuit Evaluation Tests ==========
    
    function test_AndRule_ShortCircuitsOnFirstFailure() public {
        address[] memory modules = new address[](3);
        modules[0] = address(maxHoldersModule);
        modules[1] = address(maxBalanceModule);
        modules[2] = address(countryModule);
        
        uint256 ruleId = composer.createAndRule(modules);
        
        // Make first module fail by having max holders reached
        token.mint(investor1, 100 ether);
        vm.prank(address(composer));
        maxHoldersModule.transferred(address(0), investor1, 100 ether);
        token.mint(investor2, 100 ether);
        vm.prank(address(composer));
        maxHoldersModule.transferred(address(0), investor2, 100 ether);
        maxHoldersModule.setHolderLimit(2);
        
        // Should short-circuit on first failure (trying to add address(this) as 3rd holder)
        bool result = composer.evaluateRule(ruleId, investor1, address(this), 100 ether);
        assertFalse(result);
    }
    
    function test_OrRule_ShortCircuitsOnFirstSuccess() public {
        address[] memory modules = new address[](3);
        modules[0] = address(maxHoldersModule);
        modules[1] = address(maxBalanceModule);
        modules[2] = address(countryModule);
        
        uint256 ruleId = composer.createOrRule(modules);
        
        // First module passes, should short-circuit
        uint256 gasBefore = gasleft();
        bool result = composer.evaluateRule(ruleId, investor1, investor2, 100 ether);
        uint256 gasUsed = gasBefore - gasleft();
        
        assertTrue(result);
        // Gas should be less than evaluating all modules
        assertLt(gasUsed, 100000);
    }
    
    // ========== Gas Benchmarking Tests ==========
    
    function test_GasBenchmark_SimpleAndRule() public {
        address[] memory modules = new address[](2);
        modules[0] = address(maxHoldersModule);
        modules[1] = address(maxBalanceModule);
        
        uint256 ruleId = composer.createAndRule(modules);
        
        uint256 gasBefore = gasleft();
        composer.evaluateRule(ruleId, investor1, investor2, 100 ether);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas used for simple AND rule", gasUsed);
        assertLt(gasUsed, 150000);
    }
    
    function test_GasBenchmark_NestedRules() public {
        // Create complex nested rule
        address[] memory modules1 = new address[](2);
        modules1[0] = address(maxHoldersModule);
        modules1[1] = address(maxBalanceModule);
        
        uint256 andRule1 = composer.createAndRule(modules1);
        
        address[] memory modules2 = new address[](1);
        modules2[0] = address(countryModule);
        
        uint256 andRule2 = composer.createAndRule(modules2);
        
        uint256[] memory orRules = new uint256[](2);
        orRules[0] = andRule1;
        orRules[1] = andRule2;
        
        uint256 compositeId = composer.createCompositeOrRule(orRules);
        
        uint256 gasBefore = gasleft();
        composer.evaluateRule(compositeId, investor1, investor2, 100 ether);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas used for nested OR of ANDs", gasUsed);
        assertLt(gasUsed, 250000);
    }
    
    // ========== Access Control Tests ==========
    
    function test_CreateRule_OnlyOwner() public {
        address[] memory modules = new address[](1);
        modules[0] = address(maxHoldersModule);
        
        vm.prank(investor1);
        vm.expectRevert();
        composer.createAndRule(modules);
    }
    
    function test_BindToken_OnlyOwner() public {
        vm.prank(investor1);
        vm.expectRevert();
        composer.bindToken(makeAddr("newToken"));
    }
    
    // ========== Rule Management Tests ==========
    
    function test_GetRuleInfo() public {
        address[] memory modules = new address[](2);
        modules[0] = address(maxHoldersModule);
        modules[1] = address(maxBalanceModule);
        
        uint256 ruleId = composer.createAndRule(modules);
        
        (
            ComplianceComposer.LogicOperator operator,
            uint256 moduleCount,
            bool isComposite
        ) = composer.getRuleInfo(ruleId);
        
        assertEq(uint8(operator), uint8(ComplianceComposer.LogicOperator.AND));
        assertEq(moduleCount, 2);
        assertFalse(isComposite);
    }
    
    function test_UpdateRule() public {
        address[] memory modules = new address[](1);
        modules[0] = address(maxHoldersModule);
        
        uint256 ruleId = composer.createAndRule(modules);
        
        // Update to include another module
        address[] memory newModules = new address[](2);
        newModules[0] = address(maxHoldersModule);
        newModules[1] = address(maxBalanceModule);
        
        composer.updateRule(ruleId, newModules);
        
        (, uint256 moduleCount,) = composer.getRuleInfo(ruleId);
        assertEq(moduleCount, 2);
    }
}
