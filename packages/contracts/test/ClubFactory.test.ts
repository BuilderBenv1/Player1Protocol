import { expect } from "chai";
import { ethers } from "hardhat";
import { ClubFactory } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ClubFactory", function () {
  let factory: ClubFactory;
  let treasury: SignerWithAddress;
  let creator1: SignerWithAddress;
  let creator2: SignerWithAddress;

  const CREATION_FEE = ethers.parseEther("0.01");

  beforeEach(async function () {
    [treasury, creator1, creator2] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("ClubFactory");
    factory = await Factory.deploy(treasury.address, CREATION_FEE);
    await factory.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set treasury and fee", async function () {
      expect(await factory.treasury()).to.equal(treasury.address);
      expect(await factory.creationFee()).to.equal(CREATION_FEE);
    });
  });

  describe("Create Club", function () {
    it("should create a club", async function () {
      const tx = await factory.connect(creator1).createClub(
        "Test Club", "TST", "A test club", 0, 50, false,
        { value: CREATION_FEE }
      );
      await expect(tx).to.emit(factory, "ClubCreated");
      expect(await factory.getClubCount()).to.equal(1);
    });

    it("should reject insufficient fee", async function () {
      await expect(
        factory.connect(creator1).createClub(
          "Test", "TST", "desc", 0, 50, false,
          { value: 0 }
        )
      ).to.be.revertedWith("Insufficient fee");
    });

    it("should reject duplicate tag", async function () {
      await factory.connect(creator1).createClub(
        "Club A", "TST", "desc", 0, 50, false,
        { value: CREATION_FEE }
      );
      await expect(
        factory.connect(creator2).createClub(
          "Club B", "TST", "desc", 0, 50, false,
          { value: CREATION_FEE }
        )
      ).to.be.revertedWith("Tag already taken");
    });

    it("should reject too-short tag", async function () {
      await expect(
        factory.connect(creator1).createClub(
          "Club", "X", "desc", 0, 50, false,
          { value: CREATION_FEE }
        )
      ).to.be.revertedWith("Tag too short");
    });

    it("should send fee to treasury", async function () {
      const before = await ethers.provider.getBalance(treasury.address);
      await factory.connect(creator1).createClub(
        "Club", "TST", "desc", 0, 50, false,
        { value: CREATION_FEE }
      );
      const after = await ethers.provider.getBalance(treasury.address);
      expect(after - before).to.equal(CREATION_FEE);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await factory.connect(creator1).createClub(
        "Club A", "AAA", "First", 0, 50, false, { value: CREATION_FEE }
      );
      await factory.connect(creator1).createClub(
        "Club B", "BBB", "Second", 0, 50, false, { value: CREATION_FEE }
      );
      await factory.connect(creator2).createClub(
        "Club C", "CCC", "Third", 0, 50, false, { value: CREATION_FEE }
      );
    });

    it("should return all clubs", async function () {
      const clubs = await factory.getAllClubs();
      expect(clubs.length).to.equal(3);
    });

    it("should return clubs by owner", async function () {
      const clubs = await factory.getClubsByOwner(creator1.address);
      expect(clubs.length).to.equal(2);
    });

    it("should check tag taken", async function () {
      expect(await factory.tagTaken("AAA")).to.be.true;
      expect(await factory.tagTaken("ZZZ")).to.be.false;
    });
  });
});
