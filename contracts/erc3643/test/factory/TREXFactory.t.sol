// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../../factory/TREXFactory.sol";
import "../../factory/ImplementationAuthority.sol";
import "../../token/TREXToken.sol";
import "../../identity/IdentityRegistry.sol";
import "../../compliance/ModularCompliance.sol";

contract TREXFactoryTest is Test {
    TREXFactory public factory;
    ImplementationAuthority public authority;
    
    address public owner;
    address public user;
    
    bytes32 public constant SALT = keccak256("test-salt-1");
    
    
    function setUp() public {
        owner = address(this);
        user = makeAddr("user");
        
        authority = new ImplementationAuthority();
        factory = new TREXFactory();
    }
    
    function test_Deployment_Success() public {
        assertTrue(address(factory) != address(0));
    }
    
    function test_DeployTREXSuite_Success() public {
        (address tokenAddress, address identityRegistryAddr, address complianceAddr,,,) = factory.deployTREXSuite(
            SALT,
            "Test Token",
            "TEST",
            18,
            address(0x1234)
        );
        
        assertTrue(tokenAddress != address(0));
        assertTrue(identityRegistryAddr != address(0));
        assertTrue(complianceAddr != address(0));
        
        TREXToken token = TREXToken(tokenAddress);
        assertEq(token.name(), "Test Token");
        assertEq(token.symbol(), "TEST");
        assertEq(token.decimals(), 18);
        assertEq(token.onchainId(), address(0x1234));
        
        // Verify compliance ownership transferred to deployer
        ModularCompliance compliance = ModularCompliance(complianceAddr);
        assertEq(compliance.owner(), address(this));
    }
    
    function test_DeployTREXSuite_RevertInvalidSalt() public {
        vm.expectRevert(TREXFactory.InvalidSalt.selector);
        factory.deployTREXSuite(
            bytes32(0),
            "Test Token",
            "TEST",
            18,
            address(0x1234)
        );
    }
    
    // Test removed: Factory no longer performs binding, must be done in deployment script
    // function test_DeployTREXSuite_ComplianceBound() public {}
    
    function test_DeployTREXSuite_IdentityLinked() public {
        (address tokenAddress,,,,,) = factory.deployTREXSuite(
            SALT,
            "Test Token",
            "TEST",
            18,
            address(0x1234)
        );
        
        TREXToken token = TREXToken(tokenAddress);
        address identityRegistryAddr = address(token.identityRegistry());
        
        assertTrue(identityRegistryAddr != address(0));
        
        IdentityRegistry idRegistry = IdentityRegistry(identityRegistryAddr);
        assertTrue(address(idRegistry.identityStorage()) != address(0));
        assertTrue(address(idRegistry.topicsRegistry()) != address(0));
        assertTrue(address(idRegistry.issuersRegistry()) != address(0));
    }
    
    // NOTE: predictTokenAddress removed for gas optimization
    // function test_PredictTokenAddress_Matches() public {
    //     address predicted = factory.predictTokenAddress(
    //         SALT,
    //         "Test Token",
    //         "TEST",
    //         18,
    //         address(0x1234)
    //     );
    //     
    //     address deployed = factory.deployTREXSuite(
    //         SALT,
    //         "Test Token",
    //         "TEST",
    //         18,
    //         address(0x1234)
    //     );
    //     
    //     assertEq(predicted, deployed);
    // }
    
    function test_DeployTREXSuite_DifferentSalts() public {
        bytes32 salt1 = keccak256("salt-1");
        bytes32 salt2 = keccak256("salt-2");
        
        (address token1,,,,,) = factory.deployTREXSuite(
            salt1,
            "Token 1",
            "TK1",
            18,
            address(0x1234)
        );
        
        (address token2,,,,,) = factory.deployTREXSuite(
            salt2,
            "Token 2",
            "TK2",
            18,
            address(0x1234)
        );
        
        assertTrue(token1 != token2);
    }
}
