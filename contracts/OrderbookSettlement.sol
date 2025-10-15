// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/*
  OrderbookSettlement
  - Makers deposit tokens into the contract.
  - Makers create signed off-chain orders (EIP-712) specifying desired swap (tokenIn -> tokenOut).
  - A keeper submits a fillOrder call with the maker's signature; contract verifies signature, checks balances, and moves deposited balances.
  - This design avoids requiring approval to transfer maker funds on fill by keeping deposits on-contract.
  - Production: add order cancellation, replay protection beyond nonce, matching fee model, gas limits, reentrancy guards, multisig admin controls.
*/

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract OrderbookSettlement {
    using ECDSA for bytes32;

    struct Order {
        address maker;
        address tokenIn;   // token maker deposited
        address tokenOut;  // token the maker expects
        uint256 amountIn;  // amount maker sells (deposited)
        uint256 amountOut; // amount maker expects to receive
        uint256 expiry;    // block timestamp
        uint256 salt;      // random nonce
    }

    // maker -> token -> balance (deposited)
    mapping(address => mapping(address => uint256)) public deposits;
    mapping(bytes32 => bool) public filledOrCancelled;

    event Deposited(address indexed who, address indexed token, uint256 amount);
    event Withdrawn(address indexed who, address indexed token, uint256 amount);
    event OrderFilled(bytes32 indexed orderHash, address indexed taker, address indexed maker);

    // deposit tokens to fund orders
    function deposit(IERC20 token, uint256 amount) external {
        require(amount > 0, "deposit: zero");
        // token.transferFrom will trigger token compliance hooks
        require(token.transferFrom(msg.sender, address(this), amount), "deposit: transferFrom failed");
        deposits[msg.sender][address(token)] += amount;
        emit Deposited(msg.sender, address(token), amount);
    }

    function withdraw(IERC20 token, uint256 amount) external {
        require(amount > 0, "withdraw: zero");
        require(deposits[msg.sender][address(token)] >= amount, "withdraw: insufficient");
        deposits[msg.sender][address(token)] -= amount;
        require(token.transfer(msg.sender, amount), "withdraw: transfer failed");
        emit Withdrawn(msg.sender, address(token), amount);
    }

    // Fill an off-chain signed order. Maker must have deposited at least amountIn for tokenIn.
    function fillOrder(Order calldata order, bytes calldata makerSig) external {
        require(block.timestamp <= order.expiry, "fillOrder: expired");
        bytes32 orderHash = _hashOrder(order);
        require(!filledOrCancelled[orderHash], "fillOrder: already filled or cancelled");
        // verify signature
        address signer = orderHash.toEthSignedMessageHash().recover(makerSig);
        require(signer == order.maker, "fillOrder: invalid signature");

        // Check maker deposit
        require(deposits[order.maker][order.tokenIn] >= order.amountIn, "fillOrder: maker insufficient deposit");

        // Check taker has approved tokenOut to this contract and has enough balance only by transferFrom, to be pulled now
        // Pull tokenOut from taker
        IERC20 tokenOut = IERC20(order.tokenOut);
        require(tokenOut.transferFrom(msg.sender, order.maker, order.amountOut), "fillOrder: taker->maker transfer failed");

        // Credit taker by reducing maker deposit and transferring tokenIn to taker
        deposits[order.maker][order.tokenIn] -= order.amountIn;
        IERC20 tokenIn = IERC20(order.tokenIn);
        require(tokenIn.transfer(msg.sender, order.amountIn), "fillOrder: maker->taker transfer failed");

        filledOrCancelled[orderHash] = true;
        emit OrderFilled(orderHash, msg.sender, order.maker);
    }

    function _hashOrder(Order calldata order) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            order.maker,
            order.tokenIn,
            order.tokenOut,
            order.amountIn,
            order.amountOut,
            order.expiry,
            order.salt
        ));
    }
}