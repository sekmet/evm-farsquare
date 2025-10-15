const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OrderbookSettlement", function () {
  let Token, tokenA, tokenB, registry, TokenFactory, Orderbook, orderbook;
  let owner, maker, taker;

  beforeEach(async function () {
    [owner, maker, taker] = await ethers.getSigners();
    const Compliance = await ethers.getContractFactory("ComplianceRegistry");
    registry = await Compliance.deploy();
    await registry.deployed();

    const Token = await ethers.getContractFactory("RegulatedToken");
    tokenA = await Token.deploy("TokenA", "A", registry.address);
    tokenB = await Token.deploy("TokenB", "B", registry.address);
    await tokenA.deployed();
    await tokenB.deployed();

    const OB = await ethers.getContractFactory("OrderbookSettlement");
    orderbook = await OB.deploy();
    await orderbook.deployed();

    // whitelist maker, taker, and contract
    await registry.setWhitelisted(maker.address, true);
    await registry.setWhitelisted(taker.address, true);
    await registry.setWhitelisted(orderbook.address, true);

    // mint tokens: maker has tokenA, taker has tokenB
    await tokenA.mint(maker.address, ethers.utils.parseEther("100"));
    await tokenB.mint(taker.address, ethers.utils.parseEther("100"));

    // maker approve and deposit tokenA into orderbook
    await tokenA.connect(maker).approve(orderbook.address, ethers.utils.parseEther("10"));
    await orderbook.connect(maker).deposit(tokenA.address, ethers.utils.parseEther("10"));

    // taker approve tokenB to be transferable during fill
    await tokenB.connect(taker).approve(orderbook.address, ethers.utils.parseEther("10"));
  });

  it("fills a signed off-chain order", async function () {
    const amountIn = ethers.utils.parseEther("5");
    const amountOut = ethers.utils.parseEther("6");
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const salt = 42;
    const order = {
      maker: maker.address,
      tokenIn: tokenA.address,
      tokenOut: tokenB.address,
      amountIn: amountIn,
      amountOut: amountOut,
      expiry: expiry,
      salt: salt
    };
    const orderHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
      ["address","address","address","uint256","uint256","uint256","uint256"],
      [order.maker, order.tokenIn, order.tokenOut, order.amountIn, order.amountOut, order.expiry, order.salt]
    ));
    const sig = await maker.signMessage(ethers.utils.arrayify(orderHash));
    // taker (msg.sender) calls fillOrder
    await orderbook.connect(taker).fillOrder(order, sig);
    // balances updated: maker deposit reduced, taker received tokenA, maker received tokenB
    expect(await tokenA.balanceOf(taker.address)).to.equal(amountIn);
    expect(await tokenB.balanceOf(maker.address)).to.equal(amountOut);
  });
});