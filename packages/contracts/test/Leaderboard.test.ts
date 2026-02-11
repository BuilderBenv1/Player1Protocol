import { expect } from "chai";
import { ethers } from "hardhat";
import { Leaderboard } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Leaderboard", function () {
  let leaderboard: Leaderboard;
  let admin: SignerWithAddress;
  let game: SignerWithAddress;
  let player1: SignerWithAddress;
  let player2: SignerWithAddress;
  let player3: SignerWithAddress;

  const GAME_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GAME_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

  beforeEach(async function () {
    [admin, game, player1, player2, player3] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("Leaderboard");
    leaderboard = await Factory.deploy(admin.address);
    await leaderboard.waitForDeployment();

    await leaderboard.connect(admin).grantRole(GAME_ROLE, game.address);
  });

  describe("Deployment", function () {
    it("should grant admin role", async function () {
      expect(await leaderboard.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });
  });

  describe("Create Leaderboard", function () {
    it("should create a leaderboard", async function () {
      const tx = await leaderboard.connect(game).createLeaderboard(
        game.address, "kills", true, 100
      );
      await expect(tx).to.emit(leaderboard, "LeaderboardCreated");
    });

    it("should reject duplicate leaderboard", async function () {
      await leaderboard.connect(game).createLeaderboard(game.address, "kills", true, 100);
      await expect(
        leaderboard.connect(game).createLeaderboard(game.address, "kills", true, 100)
      ).to.be.revertedWith("Leaderboard exists");
    });

    it("should reject non-game role", async function () {
      await expect(
        leaderboard.connect(player1).createLeaderboard(game.address, "kills", true, 100)
      ).to.be.reverted;
    });

    it("should default maxEntries to 100 if 0", async function () {
      const id = ethers.keccak256(ethers.solidityPacked(["address", "string"], [game.address, "kills"]));
      await leaderboard.connect(game).createLeaderboard(game.address, "kills", true, 0);
      const config = await leaderboard.leaderboards(id);
      expect(config.maxEntries).to.equal(100);
    });
  });

  describe("Submit Scores", function () {
    let leaderboardId: string;

    beforeEach(async function () {
      leaderboardId = ethers.keccak256(ethers.solidityPacked(["address", "string"], [game.address, "kills"]));
      await leaderboard.connect(game).createLeaderboard(game.address, "kills", true, 10);
    });

    it("should submit and rank a score", async function () {
      const tx = await leaderboard.connect(game).submitScore(leaderboardId, player1.address, 100);
      await expect(tx).to.emit(leaderboard, "ScoreSubmitted");

      const [rank, score] = await leaderboard.getPlayerRank(leaderboardId, 0, player1.address);
      expect(rank).to.equal(1);
      expect(score).to.equal(100);
    });

    it("should rank players in order (higher is better)", async function () {
      await leaderboard.connect(game).submitScore(leaderboardId, player1.address, 50);
      await leaderboard.connect(game).submitScore(leaderboardId, player2.address, 100);
      await leaderboard.connect(game).submitScore(leaderboardId, player3.address, 75);

      const [rank1] = await leaderboard.getPlayerRank(leaderboardId, 0, player2.address);
      const [rank2] = await leaderboard.getPlayerRank(leaderboardId, 0, player3.address);
      const [rank3] = await leaderboard.getPlayerRank(leaderboardId, 0, player1.address);

      expect(rank1).to.equal(1); // player2: 100
      expect(rank2).to.equal(2); // player3: 75
      expect(rank3).to.equal(3); // player1: 50
    });

    it("should update player score if better", async function () {
      await leaderboard.connect(game).submitScore(leaderboardId, player1.address, 50);
      await leaderboard.connect(game).submitScore(leaderboardId, player1.address, 100);

      const [rank, score] = await leaderboard.getPlayerRank(leaderboardId, 0, player1.address);
      expect(rank).to.equal(1);
      expect(score).to.equal(100);
    });

    it("should not update if score is worse", async function () {
      await leaderboard.connect(game).submitScore(leaderboardId, player1.address, 100);
      await leaderboard.connect(game).submitScore(leaderboardId, player1.address, 50);

      const [, score] = await leaderboard.getPlayerRank(leaderboardId, 0, player1.address);
      expect(score).to.equal(100);
    });

    it("should reject non-existent leaderboard", async function () {
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      await expect(
        leaderboard.connect(game).submitScore(fakeId, player1.address, 100)
      ).to.be.revertedWith("Leaderboard not found");
    });
  });

  describe("View Functions", function () {
    let leaderboardId: string;

    beforeEach(async function () {
      leaderboardId = ethers.keccak256(ethers.solidityPacked(["address", "string"], [game.address, "kills"]));
      await leaderboard.connect(game).createLeaderboard(game.address, "kills", true, 10);
      await leaderboard.connect(game).submitScore(leaderboardId, player1.address, 100);
      await leaderboard.connect(game).submitScore(leaderboardId, player2.address, 200);
      await leaderboard.connect(game).submitScore(leaderboardId, player3.address, 150);
    });

    it("should return top scores with limit", async function () {
      const top2 = await leaderboard.getTopScores(leaderboardId, 0, 2);
      expect(top2.length).to.equal(2);
      expect(top2[0].player).to.equal(player2.address);
      expect(top2[1].player).to.equal(player3.address);
    });

    it("should return unranked player as rank 0", async function () {
      const [rank] = await leaderboard.getPlayerRank(leaderboardId, 0, admin.address);
      expect(rank).to.equal(0);
    });

    it("should return game leaderboards", async function () {
      const ids = await leaderboard.getGameLeaderboards(game.address);
      expect(ids.length).to.equal(1);
      expect(ids[0]).to.equal(leaderboardId);
    });
  });

  describe("Lower is Better (Speedrun)", function () {
    let leaderboardId: string;

    beforeEach(async function () {
      leaderboardId = ethers.keccak256(ethers.solidityPacked(["address", "string"], [game.address, "speedrun"]));
      await leaderboard.connect(game).createLeaderboard(game.address, "speedrun", false, 10);
    });

    it("should rank lower scores first", async function () {
      await leaderboard.connect(game).submitScore(leaderboardId, player1.address, 300);
      await leaderboard.connect(game).submitScore(leaderboardId, player2.address, 100);
      await leaderboard.connect(game).submitScore(leaderboardId, player3.address, 200);

      const [rank1] = await leaderboard.getPlayerRank(leaderboardId, 0, player2.address);
      const [rank2] = await leaderboard.getPlayerRank(leaderboardId, 0, player3.address);
      const [rank3] = await leaderboard.getPlayerRank(leaderboardId, 0, player1.address);

      expect(rank1).to.equal(1);
      expect(rank2).to.equal(2);
      expect(rank3).to.equal(3);
    });
  });
});
