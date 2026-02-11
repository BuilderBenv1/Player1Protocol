import { expect } from "chai";
import { ethers } from "hardhat";
import { LFG, PlayerPassport } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("LFG", function () {
  let lfg: LFG;
  let passport: PlayerPassport;
  let admin: SignerWithAddress;
  let game: SignerWithAddress;
  let player1: SignerWithAddress;
  let player2: SignerWithAddress;
  let player3: SignerWithAddress;

  const GAME_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GAME_ROLE"));

  beforeEach(async function () {
    [admin, game, player1, player2, player3] = await ethers.getSigners();

    // Deploy dependencies
    const AchFactory = await ethers.getContractFactory("AchievementRegistry");
    const achievements = await AchFactory.deploy(admin.address);

    const PPFactory = await ethers.getContractFactory("PlayerPassport");
    passport = await PPFactory.deploy(
      await achievements.getAddress(),
      admin.address
    );

    const LFGFactory = await ethers.getContractFactory("LFG");
    lfg = await LFGFactory.deploy(await passport.getAddress());
    await lfg.waitForDeployment();
  });

  describe("Create Listing", function () {
    it("should create a listing", async function () {
      const tx = await lfg.connect(player1).createListing(
        game.address, "Ranked 2v2", 0, 0, 2, 3600
      );
      await expect(tx).to.emit(lfg, "ListingCreated");
      expect(await lfg.nextListingId()).to.equal(2);
    });

    it("should reject invalid duration", async function () {
      await expect(
        lfg.connect(player1).createListing(game.address, "Test", 0, 0, 2, 100)
      ).to.be.revertedWith("Duration 5min-24hr");
    });

    it("should reject 0 players needed", async function () {
      await expect(
        lfg.connect(player1).createListing(game.address, "Test", 0, 0, 0, 3600)
      ).to.be.revertedWith("Need at least 1 player");
    });

    it("should auto-fill solo listings", async function () {
      const tx = await lfg.connect(player1).createListing(
        game.address, "Solo", 0, 0, 1, 3600
      );
      await expect(tx).to.emit(lfg, "ListingFilled");
    });
  });

  describe("Join / Leave", function () {
    beforeEach(async function () {
      await lfg.connect(player1).createListing(game.address, "Ranked 2v2", 0, 0, 3, 3600);
    });

    it("should allow joining a listing", async function () {
      const tx = await lfg.connect(player2).joinListing(1);
      await expect(tx).to.emit(lfg, "PlayerJoined");
    });

    it("should reject double join", async function () {
      await lfg.connect(player2).joinListing(1);
      await expect(lfg.connect(player2).joinListing(1))
        .to.be.revertedWith("Already joined");
    });

    it("should allow leaving", async function () {
      await lfg.connect(player2).joinListing(1);
      const tx = await lfg.connect(player2).leaveListing(1);
      await expect(tx).to.emit(lfg, "PlayerLeft");
    });

    it("should reject creator leaving", async function () {
      await expect(lfg.connect(player1).leaveListing(1))
        .to.be.revertedWith("Creator cannot leave");
    });

    it("should emit ListingFilled when full", async function () {
      await lfg.connect(player2).joinListing(1);
      const tx = await lfg.connect(player3).joinListing(1);
      await expect(tx).to.emit(lfg, "ListingFilled");
    });
  });

  describe("Cancel", function () {
    beforeEach(async function () {
      await lfg.connect(player1).createListing(game.address, "Test", 0, 0, 2, 3600);
    });

    it("should allow creator to cancel", async function () {
      const tx = await lfg.connect(player1).cancelListing(1);
      await expect(tx).to.emit(lfg, "ListingCancelled");
    });

    it("should reject non-creator cancel", async function () {
      await expect(lfg.connect(player2).cancelListing(1))
        .to.be.revertedWith("Only creator");
    });
  });

  describe("View Functions", function () {
    it("should return active listings for game", async function () {
      await lfg.connect(player1).createListing(game.address, "Ranked", 0, 0, 2, 3600);
      await lfg.connect(player2).createListing(game.address, "Casual", 0, 0, 4, 3600);

      const active = await lfg.getActiveListingsForGame(game.address);
      expect(active.length).to.equal(2);
    });

    it("should return player active listings", async function () {
      await lfg.connect(player1).createListing(game.address, "Ranked", 0, 0, 2, 3600);
      const listings = await lfg.getPlayerActiveListings(player1.address);
      expect(listings.length).to.equal(1);
    });
  });
});
