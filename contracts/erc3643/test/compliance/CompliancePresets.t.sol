// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../../compliance/CompliancePresets.sol";
import "../../compliance/ModularCompliance.sol";
import "../../compliance/modules/MaxHoldersModule.sol";
import "../../compliance/modules/MaxBalanceModule.sol";
import "../../compliance/modules/CountryRestrictionsModule.sol";

/**
 * @title CompliancePresetsTest
 * @dev Tests for compliance preset templates (RegD, RegS, MiFID II)
 */
contract CompliancePresetsTest is Test {
    CompliancePresets public presets;
    
    address public owner;
    address public token;
    
    event PresetDeployed(string indexed presetName, address indexed compliance);
    
    function setUp() public {
        owner = address(this);
        token = makeAddr("token");
        
        presets = new CompliancePresets();
    }
    
    // ========== RegD Preset Tests ==========
    
    function test_DeployRegDPreset_Success() public {
        vm.expectEmit(true, false, false, true);
        emit PresetDeployed("RegD", address(0)); // Address will be determined at runtime
        
        address compliance = presets.deployRegDPreset();
        
        assertTrue(compliance != address(0));
        assertEq(ModularCompliance(compliance).owner(), address(this));
    }
    
    function test_RegDPreset_HasCorrectModules() public {
        address compliance = presets.deployRegDPreset();
        
        // RegD should have max holders and accredited investor restrictions
        address[] memory modules = ModularCompliance(compliance).getModules();
        
        // Should have at least max holders module
        assertGt(modules.length, 0);
    }
    
    function test_RegDPreset_EnforcesMaxHolders() public {
        address compliance = presets.deployRegDPreset();
        ModularCompliance(compliance).bindToken(token);
        
        // RegD typically has a 2000 holder limit
        address[] memory modules = ModularCompliance(compliance).getModules();
        
        bool hasMaxHolders = false;
        for (uint i = 0; i < modules.length; i++) {
            if (MaxHoldersModule(modules[i]).moduleCheck(compliance)) {
                hasMaxHolders = true;
                break;
            }
        }
        
        assertTrue(hasMaxHolders, "RegD should enforce max holders");
    }
    
    // ========== RegS Preset Tests ==========
    
    function test_DeployRegSPreset_Success() public {
        vm.expectEmit(true, false, false, true);
        emit PresetDeployed("RegS", address(0));
        
        address compliance = presets.deployRegSPreset();
        
        assertTrue(compliance != address(0));
        assertEq(ModularCompliance(compliance).owner(), address(this));
    }
    
    function test_RegSPreset_HasCountryRestrictions() public {
        address compliance = presets.deployRegSPreset();
        
        // RegS should restrict US investors
        address[] memory modules = ModularCompliance(compliance).getModules();
        
        bool hasCountryRestrictions = false;
        for (uint i = 0; i < modules.length; i++) {
            if (CountryRestrictionsModule(modules[i]).moduleCheck(compliance)) {
                hasCountryRestrictions = true;
                break;
            }
        }
        
        assertTrue(hasCountryRestrictions, "RegS should have country restrictions");
    }
    
    function test_RegSPreset_RestrictsUSInvestors() public {
        address compliance = presets.deployRegSPreset();
        ModularCompliance(compliance).bindToken(token);
        
        // Find the country restrictions module
        address[] memory modules = ModularCompliance(compliance).getModules();
        
        address countryModule = address(0);
        for (uint i = 0; i < modules.length; i++) {
            if (CountryRestrictionsModule(modules[i]).moduleCheck(compliance)) {
                countryModule = modules[i];
                break;
            }
        }
        
        require(countryModule != address(0), "No country module found");
        
        // US (840) should be blacklisted
        assertTrue(CountryRestrictionsModule(countryModule).isCountryBlacklisted(840));
    }
    
    // ========== MiFID II Preset Tests ==========
    
    function test_DeployMiFIDIIPreset_Success() public {
        vm.expectEmit(true, false, false, true);
        emit PresetDeployed("MiFID_II", address(0));
        
        address compliance = presets.deployMiFIDIIPreset();
        
        assertTrue(compliance != address(0));
        assertEq(ModularCompliance(compliance).owner(), address(this));
    }
    
    function test_MiFIDIIPreset_HasEUCompliance() public {
        address compliance = presets.deployMiFIDIIPreset();
        
        // MiFID II should have appropriate EU compliance modules
        address[] memory modules = ModularCompliance(compliance).getModules();
        
        // Should have at least one module configured
        assertGt(modules.length, 0);
    }
    
    function test_MiFIDIIPreset_HasBalanceLimits() public {
        address compliance = presets.deployMiFIDIIPreset();
        
        address[] memory modules = ModularCompliance(compliance).getModules();
        
        bool hasMaxBalance = false;
        for (uint i = 0; i < modules.length; i++) {
            if (MaxBalanceModule(modules[i]).moduleCheck(compliance)) {
                hasMaxBalance = true;
                break;
            }
        }
        
        assertTrue(hasMaxBalance, "MiFID II should have balance limits");
    }
    
    // ========== Configuration Helper Tests ==========
    
    function test_GetPresetInfo_RegD() public view {
        (
            string memory name,
            string memory description,
            uint256 expectedModules
        ) = presets.getPresetInfo("RegD");
        
        assertEq(name, "RegD");
        assertGt(bytes(description).length, 0);
        assertGt(expectedModules, 0);
    }
    
    function test_GetPresetInfo_RegS() public view {
        (
            string memory name,
            string memory description,
            uint256 expectedModules
        ) = presets.getPresetInfo("RegS");
        
        assertEq(name, "RegS");
        assertGt(bytes(description).length, 0);
        assertGt(expectedModules, 0);
    }
    
    function test_GetPresetInfo_MiFIDII() public view {
        (
            string memory name,
            string memory description,
            uint256 expectedModules
        ) = presets.getPresetInfo("MiFID_II");
        
        assertEq(name, "MiFID_II");
        assertGt(bytes(description).length, 0);
        assertGt(expectedModules, 0);
    }
    
    function test_GetPresetInfo_InvalidPreset() public {
        vm.expectRevert();
        presets.getPresetInfo("InvalidPreset");
    }
    
    // ========== Multiple Preset Deployment Tests ==========
    
    function test_DeployMultiplePresets() public {
        address regD = presets.deployRegDPreset();
        address regS = presets.deployRegSPreset();
        address mifid = presets.deployMiFIDIIPreset();
        
        // All should be different addresses
        assertTrue(regD != regS);
        assertTrue(regS != mifid);
        assertTrue(regD != mifid);
    }
    
    function test_PresetsAreIndependent() public {
        address regD = presets.deployRegDPreset();
        address regS = presets.deployRegSPreset();
        
        // Binding token to one shouldn't affect the other
        ModularCompliance(regD).bindToken(makeAddr("token1"));
        ModularCompliance(regS).bindToken(makeAddr("token2"));
        
        assertEq(ModularCompliance(regD).tokenBound(), makeAddr("token1"));
        assertEq(ModularCompliance(regS).tokenBound(), makeAddr("token2"));
    }
    
    // ========== Gas Efficiency Tests ==========
    
    function test_DeploymentGasCost_RegD() public {
        uint256 gasBefore = gasleft();
        presets.deployRegDPreset();
        uint256 gasUsed = gasBefore - gasleft();
        
        // Should be reasonable gas cost (< 5M gas)
        assertLt(gasUsed, 5_000_000);
    }
    
    function test_DeploymentGasCost_RegS() public {
        uint256 gasBefore = gasleft();
        presets.deployRegSPreset();
        uint256 gasUsed = gasBefore - gasleft();
        
        assertLt(gasUsed, 5_000_000);
    }
    
    function test_DeploymentGasCost_MiFIDII() public {
        uint256 gasBefore = gasleft();
        presets.deployMiFIDIIPreset();
        uint256 gasUsed = gasBefore - gasleft();
        
        assertLt(gasUsed, 5_000_000);
    }
}
