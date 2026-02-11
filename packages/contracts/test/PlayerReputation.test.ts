import { expect } from "chai";
import { ethers } from "hardhat";
import { PlayerReputation } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("PlayerReputation", function () {
  let reputation: PlayerReputation;
  let admin: SignerWithAddress;
  let game: SignerWithAddress;
  let player1: SignerWithAddress;
  let player2: SignerWithAddress;
  let player3: SignerWithAddress;

  const GAME_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GAME_ROLE"));

  beforeEach(async function () {
    [admin, game, player1, player2, player3] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("PlayerReputation");
    reputation = await Factory.deploy(admin.address);
    await reputation.waitForDeployment();

    await reputation.connect(admin).grantRole(GAME_ROLE, game.address);
  });

  describe("Record Match", function () {
    it("should record a match between players", async function () {
      const tx = await reputation.connect(game).recordMatch(player1.address, player2.address);
      await expect(tx).to.emit(reputation, "MatchRecorded");

      expect(await reputation.hasPlayedAgainst(player1.address, player2.address)).to.be.true;
      expect(await reputation.hasPlayedAgainst(player2.address, player1.address)).to.be.true;
    });

    it("should reject non-game caller", async function () {
      await expect(
        reputation.connect(player1).recordMatch(player1.address, player2.address)
      ).to.be.reverted;
    });
  });

  describe("Rate Player", function () {
    beforeEach(async function () {
      await reputation.connect(game).recordMatch(player1.address, player2.address);
    });

    it("should give positive rating", async function () {
      const tx = await reputation.connect(player1).ratePlayer(player2.address, true);
      await expect(tx).to.emit(reputation, "PlayerRated").withArgs(player1.address, player2.address, true);

      const [positive, negative, total, score] = await reputation.getReputation(player2.address);
      expect(positive).to.equal(1);
      expect(negative).to.equal(0);
      expect(total).to.equal(1);
      expect(score).to.equal(1);
    });

    it("should give negative rating", async function () {
      await reputation.connect(player1).ratePlayer(player2.address, false);
      const [positive, negative, total, score] = await reputation.getReputation(player2.address);
      expect(positive).to.equal(0);
      expect(negative).to.equal(1);
      expect(score).to.equal(-1);
    });

    it("should reject rating self", async function () {
      await expect(
        reputation.connect(player1).ratePlayer(player1.address, true)
      ).to.be.revertedWith("Cannot rate self");
    });

    it("should reject rating without playing", async function () {
      await expect(
        reputation.connect(player3).ratePlayer(player1.address, true)
      ).to.be.revertedWith("Haven't played against them");
    });

    it("should reject double rating", async function () {
      await reputation.connect(player1).ratePlayer(player2.address, true);
      await expect(
        reputation.connect(player1).ratePlayer(player2.address, false)
      ).to.be.revertedWith("Already rated");
    });
  });

  describe("View Functions", function () {
    it("should return 100% for unrated player", async function () {
      const pct = await reputation.getReputationPercent(player1.address);
      expect(pct).to.equal(100);
    });

    it("should calculate reputation percent", async function () {
      await reputation.connect(game).recordMatch(player1.address, player2.address);
      await reputation.connect(game).recordMatch(player3.address, player2.address);

      await reputation.connect(player1).ratePlayer(player2.address, true);
      await reputation.connect(player3).ratePlayer(player2.address, false);

      const pct = await reputation.getReputationPercent(player2.address);
      expect(pct).to.equal(50); // 1 positive / 2 total
    });

    it("should check canRate correctly", async function () {
      await reputation.connect(game).recordMatch(player1.address, player2.address);

      expect(await reputation.canRate(player1.address, player2.address)).to.be.true;
      expect(await reputation.canRate(player3.address, player2.address)).to.be.false;
      expect(await reputation.canRate(player1.address, player1.address)).to.be.false;

      await reputation.connect(player1).ratePlayer(player2.address, true);
      expect(await reputation.canRate(player1.address, player2.address)).to.be.false;
    });
  });
});
