import { expect } from "chai";
import { ethers } from "hardhat";
import { P1Token } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("P1Token", function () {
  let p1Token: P1Token;
  let admin: SignerWithAddress;
  let minter: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

  beforeEach(async function () {
    [admin, minter, user1, user2] = await ethers.getSigners();

    const P1TokenFactory = await ethers.getContractFactory("P1Token");
    p1Token = await P1TokenFactory.deploy(admin.address);
    await p1Token.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set correct name", async function () {
      expect(await p1Token.name()).to.equal("Player1 Points");
    });

    it("should set correct symbol", async function () {
      expect(await p1Token.symbol()).to.equal("P1");
    });

    it("should have 18 decimals", async function () {
      expect(await p1Token.decimals()).to.equal(18);
    });

    it("should grant DEFAULT_ADMIN_ROLE to admin", async function () {
      expect(await p1Token.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("should grant MINTER_ROLE to admin", async function () {
      expect(await p1Token.hasRole(MINTER_ROLE, admin.address)).to.be.true;
    });

    it("should start with zero total supply", async function () {
      expect(await p1Token.totalSupply()).to.equal(0);
    });

    it("should revert if admin is zero address", async function () {
      const P1TokenFactory = await ethers.getContractFactory("P1Token");
      await expect(P1TokenFactory.deploy(ethers.ZeroAddress)).to.be.revertedWith(
        "Admin cannot be zero address"
      );
    });
  });

  describe("Access Control", function () {
    it("admin can grant MINTER_ROLE to another address", async function () {
      await p1Token.connect(admin).grantRole(MINTER_ROLE, minter.address);
      expect(await p1Token.hasRole(MINTER_ROLE, minter.address)).to.be.true;
    });

    it("admin can revoke MINTER_ROLE", async function () {
      await p1Token.connect(admin).grantRole(MINTER_ROLE, minter.address);
      await p1Token.connect(admin).revokeRole(MINTER_ROLE, minter.address);
      expect(await p1Token.hasRole(MINTER_ROLE, minter.address)).to.be.false;
    });

    it("non-admin cannot grant roles", async function () {
      await expect(
        p1Token.connect(user1).grantRole(MINTER_ROLE, user2.address)
      ).to.be.revertedWithCustomError(p1Token, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Minting", function () {
    it("minter can mint tokens to any address", async function () {
      const amount = ethers.parseEther("100");
      await p1Token.connect(admin).mint(user1.address, amount);
      expect(await p1Token.balanceOf(user1.address)).to.equal(amount);
    });

    it("minting increases total supply", async function () {
      const amount = ethers.parseEther("100");
      await p1Token.connect(admin).mint(user1.address, amount);
      expect(await p1Token.totalSupply()).to.equal(amount);
    });

    it("granted minter can mint", async function () {
      await p1Token.connect(admin).grantRole(MINTER_ROLE, minter.address);
      const amount = ethers.parseEther("50");
      await p1Token.connect(minter).mint(user1.address, amount);
      expect(await p1Token.balanceOf(user1.address)).to.equal(amount);
    });

    it("non-minter cannot mint tokens", async function () {
      const amount = ethers.parseEther("100");
      await expect(
        p1Token.connect(user1).mint(user2.address, amount)
      ).to.be.revertedWithCustomError(p1Token, "AccessControlUnauthorizedAccount");
    });

    it("cannot mint to zero address", async function () {
      const amount = ethers.parseEther("100");
      await expect(
        p1Token.connect(admin).mint(ethers.ZeroAddress, amount)
      ).to.be.revertedWith("Cannot mint to zero address");
    });

    it("can mint zero amount", async function () {
      await p1Token.connect(admin).mint(user1.address, 0);
      expect(await p1Token.balanceOf(user1.address)).to.equal(0);
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      await p1Token.connect(admin).mint(user1.address, ethers.parseEther("100"));
    });

    it("holder can burn their own tokens", async function () {
      const burnAmount = ethers.parseEther("30");
      await p1Token.connect(user1).burn(burnAmount);
      expect(await p1Token.balanceOf(user1.address)).to.equal(ethers.parseEther("70"));
    });

    it("burning decreases total supply", async function () {
      const burnAmount = ethers.parseEther("30");
      await p1Token.connect(user1).burn(burnAmount);
      expect(await p1Token.totalSupply()).to.equal(ethers.parseEther("70"));
    });

    it("cannot burn more than balance", async function () {
      const burnAmount = ethers.parseEther("200");
      await expect(p1Token.connect(user1).burn(burnAmount)).to.be.revertedWithCustomError(
        p1Token,
        "ERC20InsufficientBalance"
      );
    });

    it("can burn entire balance", async function () {
      await p1Token.connect(user1).burn(ethers.parseEther("100"));
      expect(await p1Token.balanceOf(user1.address)).to.equal(0);
    });
  });

  describe("ERC-20 Standard Functions", function () {
    beforeEach(async function () {
      await p1Token.connect(admin).mint(user1.address, ethers.parseEther("100"));
    });

    it("transfer works correctly", async function () {
      const amount = ethers.parseEther("25");
      await p1Token.connect(user1).transfer(user2.address, amount);
      expect(await p1Token.balanceOf(user1.address)).to.equal(ethers.parseEther("75"));
      expect(await p1Token.balanceOf(user2.address)).to.equal(amount);
    });

    it("approve works correctly", async function () {
      const amount = ethers.parseEther("50");
      await p1Token.connect(user1).approve(user2.address, amount);
      expect(await p1Token.allowance(user1.address, user2.address)).to.equal(amount);
    });

    it("transferFrom works correctly", async function () {
      const amount = ethers.parseEther("50");
      await p1Token.connect(user1).approve(user2.address, amount);
      await p1Token.connect(user2).transferFrom(user1.address, user2.address, amount);
      expect(await p1Token.balanceOf(user1.address)).to.equal(ethers.parseEther("50"));
      expect(await p1Token.balanceOf(user2.address)).to.equal(amount);
    });

    it("transferFrom fails without approval", async function () {
      const amount = ethers.parseEther("50");
      await expect(
        p1Token.connect(user2).transferFrom(user1.address, user2.address, amount)
      ).to.be.revertedWithCustomError(p1Token, "ERC20InsufficientAllowance");
    });

    it("transferFrom fails with insufficient allowance", async function () {
      await p1Token.connect(user1).approve(user2.address, ethers.parseEther("25"));
      await expect(
        p1Token.connect(user2).transferFrom(user1.address, user2.address, ethers.parseEther("50"))
      ).to.be.revertedWithCustomError(p1Token, "ERC20InsufficientAllowance");
    });

    it("transfer to zero address fails", async function () {
      await expect(
        p1Token.connect(user1).transfer(ethers.ZeroAddress, ethers.parseEther("10"))
      ).to.be.revertedWithCustomError(p1Token, "ERC20InvalidReceiver");
    });
  });

  describe("Events", function () {
    it("emits Transfer event on mint", async function () {
      const amount = ethers.parseEther("100");
      await expect(p1Token.connect(admin).mint(user1.address, amount))
        .to.emit(p1Token, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, amount);
    });

    it("emits Transfer event on burn", async function () {
      await p1Token.connect(admin).mint(user1.address, ethers.parseEther("100"));
      const burnAmount = ethers.parseEther("50");
      await expect(p1Token.connect(user1).burn(burnAmount))
        .to.emit(p1Token, "Transfer")
        .withArgs(user1.address, ethers.ZeroAddress, burnAmount);
    });

    it("emits Approval event on approve", async function () {
      const amount = ethers.parseEther("50");
      await expect(p1Token.connect(user1).approve(user2.address, amount))
        .to.emit(p1Token, "Approval")
        .withArgs(user1.address, user2.address, amount);
    });
  });
});
