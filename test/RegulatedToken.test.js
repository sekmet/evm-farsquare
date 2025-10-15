const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RegulatedToken + ComplianceRegistry", function () {
  let RegulatedToken, ComplianceRegistry, token, registry, owner, alice, bob, orderbook;
  beforeEach(async function () {
    [owner, alice, bob, orderbook] = await ethers.getSigners();
    const Compliance = await ethers.getContractFactory("ComplianceRegistry");
    registry = await Compliance.deploy();
    await registry.deployed();

    const Token = await ethers.getContractFactory("RegulatedToken");
    token = await Token.deploy("REToken", "RET", registry.address);
    await token.deployed();

    // whitelist owner & orderbook & alice & bob where needed
    await registry.setWhitelisted(owner.address, true);
    await registry.setWhitelisted(alice.address, true);
    await registry.setWhitelisted(bob.address, true);
    await registry.setWhitelisted(orderbook.address, true);
  });

  it("mint, transfer with whitelist passes", async function () {
    await token.mint(alice.address, ethers.utils.parseEther("100"));
    expect(await token.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("100"));
    // transfer from alice -> bob
    await token.connect(alice).transfer(bob.address, ethers.utils.parseEther("1"));
    expect(await token.balanceOf(bob.address)).to.equal(ethers.utils.parseEther("1"));
  });

  it("transfer blocked if recipient not whitelisted", async function () {
    const charlie = ethers.Wallet.createRandom().address;
    // ensure charlie not whitelisted
    await token.mint(alice.address, ethers.utils.parseEther("10"));
    await registry.setWhitelisted(charlie, false);
    await expect(token.connect(alice).transfer(charlie, ethers.utils.parseEther("1"))).to.be.revertedWith("RegulatedToken: transfer blocked by compliance");
  });

  it("pause stops transfers", async function () {
    await token.mint(alice.address, ethers.utils.parseEther("10"));
    await registry.setWhitelisted(alice.address, true);
    await registry.setWhitelisted(bob.address, true);
    await token.connect(owner).pause();
    await expect(token.connect(alice).transfer(bob.address, ethers.utils.parseEther("1"))).to.be.revertedWith("RegulatedToken: token transfer while paused");
  });
});