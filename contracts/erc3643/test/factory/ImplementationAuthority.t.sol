// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../../factory/ImplementationAuthority.sol";

contract ImplementationAuthorityTest is Test {
    ImplementationAuthority public authority;
    
    address public owner;
    address public nonOwner;
    address public implementation1;
    address public implementation2;
    
    bytes32 public constant TOKEN_NAME = keccak256("TREXToken");
    bytes32 public constant COMPLIANCE_NAME = keccak256("ModularCompliance");
    
    event ImplementationUpdated(bytes32 indexed name, address indexed implementation, uint256 version);
    
    function setUp() public {
        owner = address(this);
        nonOwner = makeAddr("nonOwner");
        implementation1 = makeAddr("implementation1");
        implementation2 = makeAddr("implementation2");
        
        authority = new ImplementationAuthority();
    }
    
    function test_Deployment_Success() public {
        assertEq(authority.owner(), owner);
    }
    
    function test_SetImplementation_Success() public {
        authority.setImplementation(TOKEN_NAME, implementation1);
        
        assertEq(authority.getImplementation(TOKEN_NAME), implementation1);
        assertEq(authority.getVersion(TOKEN_NAME), 1);
    }
    
    function test_SetImplementation_UpdatesVersion() public {
        authority.setImplementation(TOKEN_NAME, implementation1);
        assertEq(authority.getVersion(TOKEN_NAME), 1);
        
        authority.setImplementation(TOKEN_NAME, implementation2);
        assertEq(authority.getVersion(TOKEN_NAME), 2);
        assertEq(authority.getImplementation(TOKEN_NAME), implementation2);
    }
    
    function test_SetImplementation_EmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit ImplementationUpdated(TOKEN_NAME, implementation1, 1);
        
        authority.setImplementation(TOKEN_NAME, implementation1);
    }
    
    function test_SetImplementation_RevertInvalidName() public {
        vm.expectRevert(ImplementationAuthority.InvalidName.selector);
        authority.setImplementation(bytes32(0), implementation1);
    }
    
    function test_SetImplementation_RevertInvalidImplementation() public {
        vm.expectRevert(ImplementationAuthority.InvalidImplementation.selector);
        authority.setImplementation(TOKEN_NAME, address(0));
    }
    
    function test_SetImplementation_OnlyOwner() public {
        vm.prank(nonOwner);
        vm.expectRevert();
        authority.setImplementation(TOKEN_NAME, implementation1);
    }
    
    function test_GetImplementation_ReturnsZeroIfNotSet() public {
        assertEq(authority.getImplementation(TOKEN_NAME), address(0));
    }
    
    function test_MultipleImplementations() public {
        authority.setImplementation(TOKEN_NAME, implementation1);
        authority.setImplementation(COMPLIANCE_NAME, implementation2);
        
        assertEq(authority.getImplementation(TOKEN_NAME), implementation1);
        assertEq(authority.getImplementation(COMPLIANCE_NAME), implementation2);
    }
}
