// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/*
  Simple periphery adapter showing how router/periphery may call tokens' transferFrom,
  thereby invoking compliance logic implemented in the token (RegulatedToken._beforeTokenTransfer).
  In your Uniswap V3 fork, ensure periphery/router uses safeTransferFrom semantics that
  expect token transfer hooks to enforce compliance.
*/

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

contract PeripheryComplianceAdapter {
    function safeTransferFrom(IERC20 token, address from, address to, uint256 amount) external {
        bool ok = token.transferFrom(from, to, amount);
        require(ok, "Transfer failed");
    }
}