import { expect } from "chai";
import { ethers } from "hardhat";
import { PlayerPassport, AchievementRegistry, P1Token, RewardDistributor } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("PlayerPassport", function () {
  let passport: PlayerPassport;
  let registry: AchievementRegistry;
  let p1Token: P1Token;
  let rewardDistributor: RewardDistributor;
  let admin: SignerWithAddress;
  let game: SignerWithAddress;
  let tournament: SignerWithAddress;
  let player1: SignerWithAddress;
  let player2: SignerWithAddress;

  const REPORTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REPORTER_ROLE"));
  const GAME_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GAME_ROLE"));
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

  const Rarity = { Common: 0, Rare: 1, Legendary: 2 };

  beforeEach(async function () {
    [admin, game, tournament, player1, player2] = await ethers.getSigners();

    // Deploy P1Token
    const P1TokenFactory = await ethers.getContractFactory("P1Token");
    p1Token = await P1TokenFactory.deploy(admin.address);

    // Deploy AchievementRegistry
    const RegistryFactory = await ethers.getContractFactory("AchievementRegistry");
    registry = await RegistryFactory.deploy(admin.address);

    // Deploy PlayerPassport
    const PassportFactory = await ethers.getContractFactory("PlayerPassport");
    passport = await PassportFactory.deploy(await registry.getAddress(), admin.address);

    // Deploy RewardDistributor
    const DistributorFactory = await ethers.getContractFactory("RewardDistributor");
    rewardDistributor = await DistributorFactory.connect(admin).deploy(
      await p1Token.getAddress(),
      await passport.getAddress(),
      admin.address
    );

    // Wire contracts
    await p1Token.connect(admin).grantRole(MINTER_ROLE, await rewardDistributor.getAddress());
    await passport.connect(admin).setRewardDistributor(await rewardDistributor.getAddress());
    await registry.connect(admin).setPassportRole(await passport.getAddress());

    // Approve game and grant roles
    await registry.connect(admin).approveGame(game.address);
    await passport.connect(admin).grantGameRole(game.address);
    await passport.connect(admin).grantRole(REPORTER_ROLE, tournament.address);
  });

  describe("Deployment", function () {
    it("should set achievement registry", async function () {
      expect(await passport.achievementRegistry()).to.equal(await registry.getAddress());
    });

    it("should grant admin role", async function () {
      expect(await passport.hasRole(ethers.ZeroHash, admin.address)).to.be.true;
    });

    it("should start with zero passports", async function () {
      expect(await passport.totalPassports()).to.equal(0);
    });

    it("should revert if registry is zero", async function () {
      const PassportFactory = await ethers.getContractFactory("PlayerPassport");
      await expect(PassportFactory.deploy(ethers.ZeroAddress, admin.address))
        .to.be.revertedWith("Registry cannot be zero");
    });
  });

  describe("Passport Creation", function () {
    it("auto-creates passport on tournament result", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 1, ethers.parseEther("1"), 0, game.address
      );
      const profile = await passport.getProfile(player1.address);
      expect(profile.exists).to.be.true;
    });

    it("auto-creates passport on achievement attestation", async function () {
      await registry.connect(game).registerAchievement("Test", "Desc", Rarity.Common);
      await passport.connect(game).attestAchievement(player1.address, 1);
      const profile = await passport.getProfile(player1.address);
      expect(profile.exists).to.be.true;
    });

    it("increments totalPassports counter", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 4, 0, 0, game.address
      );
      await passport.connect(tournament).reportTournamentResult(
        player2.address, 4, 0, 0, game.address
      );
      expect(await passport.totalPassports()).to.equal(2);
    });

    it("emits PassportCreated event", async function () {
      await expect(passport.connect(tournament).reportTournamentResult(
        player1.address, 1, 0, 0, game.address
      )).to.emit(passport, "PassportCreated").withArgs(player1.address, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));
    });
  });

  describe("Tournament Scoring - Placement Points", function () {
    it("1st place gets 100 base points (free tier)", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 1, 0, 0, game.address
      );
      expect(await passport.getCompositeScore(player1.address)).to.equal(100);
    });

    it("2nd place gets 50 base points (free tier)", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 2, 0, 0, game.address
      );
      expect(await passport.getCompositeScore(player1.address)).to.equal(50);
    });

    it("3rd place gets 50 base points (free tier)", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 3, 0, 0, game.address
      );
      expect(await passport.getCompositeScore(player1.address)).to.equal(50);
    });

    it("4th+ place gets 10 participation points", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 4, 0, 0, game.address
      );
      expect(await passport.getCompositeScore(player1.address)).to.equal(10);
    });

    it("participation (0 placement) gets 10 points", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 0, 0, 0, game.address
      );
      expect(await passport.getCompositeScore(player1.address)).to.equal(10);
    });
  });

  describe("Tournament Scoring - Tier Multipliers", function () {
    it("Free tier (0 AVAX): x1 multiplier", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 1, 0, 0, game.address
      );
      expect(await passport.getCompositeScore(player1.address)).to.equal(100); // 100 * 1.0
    });

    it("Low tier (0.5 AVAX): x1.5 multiplier", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 1, 0, ethers.parseEther("0.5"), game.address
      );
      expect(await passport.getCompositeScore(player1.address)).to.equal(150); // 100 * 1.5
    });

    it("Low tier (1 AVAX): x1.5 multiplier", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 1, 0, ethers.parseEther("1"), game.address
      );
      expect(await passport.getCompositeScore(player1.address)).to.equal(150);
    });

    it("Medium tier (5 AVAX): x2 multiplier", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 1, 0, ethers.parseEther("5"), game.address
      );
      expect(await passport.getCompositeScore(player1.address)).to.equal(200); // 100 * 2.0
    });

    it("High tier (15 AVAX): x3 multiplier", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 1, 0, ethers.parseEther("15"), game.address
      );
      expect(await passport.getCompositeScore(player1.address)).to.equal(300); // 100 * 3.0
    });

    it("participation points not multiplied", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 4, 0, ethers.parseEther("15"), game.address
      );
      expect(await passport.getCompositeScore(player1.address)).to.equal(10); // No multiplier
    });
  });

  describe("Win Streaks", function () {
    it("win streak increments on win", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 1, 0, 0, game.address
      );
      const profile = await passport.getProfile(player1.address);
      expect(profile.currentWinStreak).to.equal(1);
    });

    it("win streak continues on consecutive wins", async function () {
      for (let i = 0; i < 3; i++) {
        await passport.connect(tournament).reportTournamentResult(
          player1.address, 1, 0, 0, game.address
        );
      }
      const profile = await passport.getProfile(player1.address);
      expect(profile.currentWinStreak).to.equal(3);
    });

    it("win streak resets on non-win", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 1, 0, 0, game.address
      );
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 2, 0, 0, game.address
      );
      const profile = await passport.getProfile(player1.address);
      expect(profile.currentWinStreak).to.equal(0);
    });

    it("win streak bonus applies after 3+ wins (4th win)", async function () {
      // First 3 wins: no bonus
      for (let i = 0; i < 3; i++) {
        await passport.connect(tournament).reportTournamentResult(
          player1.address, 1, 0, 0, game.address
        );
      }
      // 4th win should add streak bonus
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 1, 0, 0, game.address
      );
      // 100 * 4 + 20 (streak bonus on 4th win) = 420
      expect(await passport.getCompositeScore(player1.address)).to.equal(420);
    });

    it("longest win streak updates correctly", async function () {
      // Build 5-win streak
      for (let i = 0; i < 5; i++) {
        await passport.connect(tournament).reportTournamentResult(
          player1.address, 1, 0, 0, game.address
        );
      }
      // Break streak
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 2, 0, 0, game.address
      );
      // Start new 2-win streak
      for (let i = 0; i < 2; i++) {
        await passport.connect(tournament).reportTournamentResult(
          player1.address, 1, 0, 0, game.address
        );
      }

      const profile = await passport.getProfile(player1.address);
      expect(profile.longestWinStreak).to.equal(5);
      expect(profile.currentWinStreak).to.equal(2);
    });
  });

  describe("Profile Stats", function () {
    it("tracks total tournaments", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 1, 0, 0, game.address
      );
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 4, 0, 0, game.address
      );
      const profile = await passport.getProfile(player1.address);
      expect(profile.totalTournaments).to.equal(2);
    });

    it("tracks total wins", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 1, 0, 0, game.address
      );
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 2, 0, 0, game.address
      );
      const profile = await passport.getProfile(player1.address);
      expect(profile.totalWins).to.equal(1);
    });

    it("tracks total top three", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 1, 0, 0, game.address
      );
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 3, 0, 0, game.address
      );
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 4, 0, 0, game.address
      );
      const profile = await passport.getProfile(player1.address);
      expect(profile.totalTopThree).to.equal(2);
    });

    it("accumulates prize money", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 1, ethers.parseEther("5"), 0, game.address
      );
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 2, ethers.parseEther("3"), 0, game.address
      );
      const profile = await passport.getProfile(player1.address);
      expect(profile.totalPrizeMoney).to.equal(ethers.parseEther("8"));
    });
  });

  describe("Per-Game Scores", function () {
    it("tracks scores per game", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 1, 0, 0, game.address
      );
      expect(await passport.getGameScore(player1.address, game.address)).to.equal(100);
    });

    it("games are independent", async function () {
      const game2 = player2; // Using player2 as another game for this test
      await passport.connect(admin).grantGameRole(game2.address);

      await passport.connect(tournament).reportTournamentResult(
        player1.address, 1, 0, 0, game.address
      );
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 2, 0, 0, game2.address
      );

      expect(await passport.getGameScore(player1.address, game.address)).to.equal(100);
      expect(await passport.getGameScore(player1.address, game2.address)).to.equal(50);
    });
  });

  describe("Tournament History", function () {
    it("stores tournament results", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 1, ethers.parseEther("5"), ethers.parseEther("1"), game.address
      );
      const history = await passport.getTournamentHistory(player1.address);
      expect(history.length).to.equal(1);
      expect(history[0].placement).to.equal(1);
      expect(history[0].prizeMoney).to.equal(ethers.parseEther("5"));
      expect(history[0].pointsEarned).to.equal(150); // 100 * 1.5 (low tier)
    });

    it("paginated history returns correct slice", async function () {
      for (let i = 0; i < 5; i++) {
        await passport.connect(tournament).reportTournamentResult(
          player1.address, 4, 0, 0, game.address
        );
      }
      const page = await passport.getTournamentHistoryPaginated(player1.address, 2, 2);
      expect(page.length).to.equal(2);
    });

    it("paginated history handles offset beyond length", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 1, 0, 0, game.address
      );
      const page = await passport.getTournamentHistoryPaginated(player1.address, 10, 5);
      expect(page.length).to.equal(0);
    });
  });

  describe("Achievement Attestation", function () {
    beforeEach(async function () {
      await registry.connect(game).registerAchievement("First Blood", "Win your first match", Rarity.Common);
      await registry.connect(game).registerAchievement("Champion", "Win a tournament", Rarity.Rare);
    });

    it("game can attest achievement", async function () {
      await passport.connect(game).attestAchievement(player1.address, 1);
      expect(await passport.hasPlayerAchievement(player1.address, 1)).to.be.true;
    });

    it("adds achievement points to score", async function () {
      await passport.connect(game).attestAchievement(player1.address, 1); // 5 points (Common)
      expect(await passport.getCompositeScore(player1.address)).to.equal(5);
    });

    it("updates game score", async function () {
      await passport.connect(game).attestAchievement(player1.address, 1);
      expect(await passport.getGameScore(player1.address, game.address)).to.equal(5);
    });

    it("cannot attest same achievement twice", async function () {
      await passport.connect(game).attestAchievement(player1.address, 1);
      await expect(
        passport.connect(game).attestAchievement(player1.address, 1)
      ).to.be.revertedWith("Achievement already unlocked");
    });

    it("only game owner can attest their achievement", async function () {
      const game2 = player2;
      await registry.connect(admin).approveGame(game2.address);
      await passport.connect(admin).grantGameRole(game2.address);

      await expect(
        passport.connect(game2).attestAchievement(player1.address, 1)
      ).to.be.revertedWith("Not achievement owner");
    });

    it("stores achievement in history", async function () {
      await passport.connect(game).attestAchievement(player1.address, 1);
      const history = await passport.getAchievementHistory(player1.address);
      expect(history.length).to.equal(1);
      expect(history[0].achievementId).to.equal(1);
      expect(history[0].gameContract).to.equal(game.address);
    });

    it("emits AchievementAttested event", async function () {
      await expect(passport.connect(game).attestAchievement(player1.address, 1))
        .to.emit(passport, "AchievementAttested")
        .withArgs(player1.address, 1, game.address, 5);
    });
  });

  describe("Access Control", function () {
    it("only REPORTER_ROLE can report results", async function () {
      await expect(
        passport.connect(player1).reportTournamentResult(
          player1.address, 1, 0, 0, game.address
        )
      ).to.be.revertedWithCustomError(passport, "AccessControlUnauthorizedAccount");
    });

    it("only GAME_ROLE can attest achievements", async function () {
      await registry.connect(game).registerAchievement("Test", "Desc", Rarity.Common);
      await expect(
        passport.connect(player1).attestAchievement(player1.address, 1)
      ).to.be.revertedWithCustomError(passport, "AccessControlUnauthorizedAccount");
    });

    it("admin can grant and revoke GAME_ROLE", async function () {
      const newGame = player2;
      await passport.connect(admin).grantGameRole(newGame.address);
      expect(await passport.hasRole(GAME_ROLE, newGame.address)).to.be.true;

      await passport.connect(admin).revokeGameRole(newGame.address);
      expect(await passport.hasRole(GAME_ROLE, newGame.address)).to.be.false;
    });
  });

  describe("getPlayerStats", function () {
    it("returns correct stats tuple", async function () {
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 1, ethers.parseEther("5"), 0, game.address
      );
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 4, 0, 0, game.address
      );

      const stats = await passport.getPlayerStats(player1.address);
      expect(stats.compositeScore).to.equal(110); // 100 + 10
      expect(stats.totalTournaments).to.equal(2);
      expect(stats.totalWins).to.equal(1);
      expect(stats.winRate).to.equal(5000); // 50% in basis points
      expect(stats.totalPrizeMoney).to.equal(ethers.parseEther("5"));
      expect(stats.longestWinStreak).to.equal(1);
    });

    it("calculates win rate correctly", async function () {
      for (let i = 0; i < 3; i++) {
        await passport.connect(tournament).reportTournamentResult(
          player1.address, 1, 0, 0, game.address
        );
      }
      await passport.connect(tournament).reportTournamentResult(
        player1.address, 2, 0, 0, game.address
      );

      const stats = await passport.getPlayerStats(player1.address);
      expect(stats.winRate).to.equal(7500); // 75% = 3/4
    });

    it("win rate is 0 for no tournaments", async function () {
      const stats = await passport.getPlayerStats(player1.address);
      expect(stats.winRate).to.equal(0);
    });
  });
});
