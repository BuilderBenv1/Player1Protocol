import { expect } from "chai";
import { ethers } from "hardhat";
import { AchievementRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("AchievementRegistry", function () {
  let registry: AchievementRegistry;
  let admin: SignerWithAddress;
  let game1: SignerWithAddress;
  let game2: SignerWithAddress;
  let passport: SignerWithAddress;
  let user: SignerWithAddress;

  const GAME_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GAME_ADMIN_ROLE"));
  const PASSPORT_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PASSPORT_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

  // Rarity enum values
  const Rarity = {
    Common: 0,
    Rare: 1,
    Legendary: 2,
  };

  beforeEach(async function () {
    [admin, game1, game2, passport, user] = await ethers.getSigners();

    const RegistryFactory = await ethers.getContractFactory("AchievementRegistry");
    registry = await RegistryFactory.deploy(admin.address);
    await registry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should grant DEFAULT_ADMIN_ROLE to admin", async function () {
      expect(await registry.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("should start with nextAchievementId = 1", async function () {
      expect(await registry.nextAchievementId()).to.equal(1);
    });

    it("should start with zero achievements", async function () {
      expect(await registry.getAchievementCount()).to.equal(0);
    });

    it("should revert if admin is zero address", async function () {
      const RegistryFactory = await ethers.getContractFactory("AchievementRegistry");
      await expect(RegistryFactory.deploy(ethers.ZeroAddress)).to.be.revertedWith(
        "Admin cannot be zero address"
      );
    });
  });

  describe("Game Approval", function () {
    it("admin can approve a game", async function () {
      await registry.connect(admin).approveGame(game1.address);
      expect(await registry.approvedGames(game1.address)).to.be.true;
    });

    it("approved game receives GAME_ADMIN_ROLE", async function () {
      await registry.connect(admin).approveGame(game1.address);
      expect(await registry.hasRole(GAME_ADMIN_ROLE, game1.address)).to.be.true;
    });

    it("emits GameApproved event", async function () {
      await expect(registry.connect(admin).approveGame(game1.address))
        .to.emit(registry, "GameApproved")
        .withArgs(game1.address);
    });

    it("non-admin cannot approve games", async function () {
      await expect(
        registry.connect(user).approveGame(game1.address)
      ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });

    it("cannot approve zero address", async function () {
      await expect(
        registry.connect(admin).approveGame(ethers.ZeroAddress)
      ).to.be.revertedWith("Game cannot be zero address");
    });

    it("cannot approve already approved game", async function () {
      await registry.connect(admin).approveGame(game1.address);
      await expect(
        registry.connect(admin).approveGame(game1.address)
      ).to.be.revertedWith("Game already approved");
    });

    it("isGameApproved returns correct status", async function () {
      expect(await registry.isGameApproved(game1.address)).to.be.false;
      await registry.connect(admin).approveGame(game1.address);
      expect(await registry.isGameApproved(game1.address)).to.be.true;
    });
  });

  describe("Game Revocation", function () {
    beforeEach(async function () {
      await registry.connect(admin).approveGame(game1.address);
    });

    it("admin can revoke a game", async function () {
      await registry.connect(admin).revokeGame(game1.address);
      expect(await registry.approvedGames(game1.address)).to.be.false;
    });

    it("revoked game loses GAME_ADMIN_ROLE", async function () {
      await registry.connect(admin).revokeGame(game1.address);
      expect(await registry.hasRole(GAME_ADMIN_ROLE, game1.address)).to.be.false;
    });

    it("emits GameRevoked event", async function () {
      await expect(registry.connect(admin).revokeGame(game1.address))
        .to.emit(registry, "GameRevoked")
        .withArgs(game1.address);
    });

    it("cannot revoke unapproved game", async function () {
      await expect(
        registry.connect(admin).revokeGame(game2.address)
      ).to.be.revertedWith("Game not approved");
    });

    it("non-admin cannot revoke games", async function () {
      await expect(
        registry.connect(user).revokeGame(game1.address)
      ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Achievement Registration", function () {
    beforeEach(async function () {
      await registry.connect(admin).approveGame(game1.address);
    });

    it("approved game can register achievement", async function () {
      await registry.connect(game1).registerAchievement("First Blood", "Win your first match", Rarity.Common);
      expect(await registry.getAchievementCount()).to.equal(1);
    });

    it("returns correct achievement ID", async function () {
      const tx = await registry.connect(game1).registerAchievement("First Blood", "Win your first match", Rarity.Common);
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log) => registry.interface.parseLog(log as any)?.name === "AchievementRegistered"
      );
      const parsedEvent = registry.interface.parseLog(event as any);
      expect(parsedEvent?.args.id).to.equal(1);
    });

    it("IDs auto-increment", async function () {
      await registry.connect(game1).registerAchievement("Achievement 1", "Description 1", Rarity.Common);
      await registry.connect(game1).registerAchievement("Achievement 2", "Description 2", Rarity.Rare);
      await registry.connect(game1).registerAchievement("Achievement 3", "Description 3", Rarity.Legendary);
      expect(await registry.nextAchievementId()).to.equal(4);
    });

    it("emits AchievementRegistered event", async function () {
      await expect(registry.connect(game1).registerAchievement("First Blood", "Win your first match", Rarity.Common))
        .to.emit(registry, "AchievementRegistered")
        .withArgs(1, game1.address, "First Blood", Rarity.Common);
    });

    it("unapproved address cannot register", async function () {
      await expect(
        registry.connect(user).registerAchievement("Hack", "Hacked achievement", Rarity.Legendary)
      ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });

    it("cannot register with empty name", async function () {
      await expect(
        registry.connect(game1).registerAchievement("", "Description", Rarity.Common)
      ).to.be.revertedWith("Name cannot be empty");
    });

    it("cannot register with empty description", async function () {
      await expect(
        registry.connect(game1).registerAchievement("Name", "", Rarity.Common)
      ).to.be.revertedWith("Description cannot be empty");
    });
  });

  describe("Rarity Point Values", function () {
    beforeEach(async function () {
      await registry.connect(admin).approveGame(game1.address);
    });

    it("Common rarity: 5 points, 5 P1", async function () {
      await registry.connect(game1).registerAchievement("Common Achievement", "Description", Rarity.Common);
      const achievement = await registry.getAchievement(1);
      expect(achievement.pointValue).to.equal(5);
      expect(achievement.p1Reward).to.equal(ethers.parseEther("5"));
    });

    it("Rare rarity: 25 points, 25 P1", async function () {
      await registry.connect(game1).registerAchievement("Rare Achievement", "Description", Rarity.Rare);
      const achievement = await registry.getAchievement(1);
      expect(achievement.pointValue).to.equal(25);
      expect(achievement.p1Reward).to.equal(ethers.parseEther("25"));
    });

    it("Legendary rarity: 100 points, 100 P1", async function () {
      await registry.connect(game1).registerAchievement("Legendary Achievement", "Description", Rarity.Legendary);
      const achievement = await registry.getAchievement(1);
      expect(achievement.pointValue).to.equal(100);
      expect(achievement.p1Reward).to.equal(ethers.parseEther("100"));
    });
  });

  describe("Achievement Data", function () {
    beforeEach(async function () {
      await registry.connect(admin).approveGame(game1.address);
      await registry.connect(game1).registerAchievement("Test Achievement", "Test Description", Rarity.Rare);
    });

    it("stores correct achievement data", async function () {
      const achievement = await registry.getAchievement(1);
      expect(achievement.id).to.equal(1);
      expect(achievement.gameContract).to.equal(game1.address);
      expect(achievement.name).to.equal("Test Achievement");
      expect(achievement.description).to.equal("Test Description");
      expect(achievement.rarity).to.equal(Rarity.Rare);
      expect(achievement.totalUnlocks).to.equal(0);
      expect(achievement.active).to.be.true;
    });

    it("getAchievement reverts for non-existent ID", async function () {
      await expect(registry.getAchievement(999)).to.be.revertedWith("Achievement does not exist");
    });

    it("getAchievement reverts for ID 0", async function () {
      await expect(registry.getAchievement(0)).to.be.revertedWith("Achievement does not exist");
    });
  });

  describe("Game Achievements List", function () {
    beforeEach(async function () {
      await registry.connect(admin).approveGame(game1.address);
      await registry.connect(admin).approveGame(game2.address);
    });

    it("tracks achievements per game", async function () {
      await registry.connect(game1).registerAchievement("Game1 A1", "Desc", Rarity.Common);
      await registry.connect(game1).registerAchievement("Game1 A2", "Desc", Rarity.Rare);
      await registry.connect(game2).registerAchievement("Game2 A1", "Desc", Rarity.Legendary);

      const game1Achievements = await registry.getGameAchievements(game1.address);
      const game2Achievements = await registry.getGameAchievements(game2.address);

      expect(game1Achievements.length).to.equal(2);
      expect(game1Achievements[0]).to.equal(1);
      expect(game1Achievements[1]).to.equal(2);

      expect(game2Achievements.length).to.equal(1);
      expect(game2Achievements[0]).to.equal(3);
    });

    it("returns empty array for games with no achievements", async function () {
      const achievements = await registry.getGameAchievements(user.address);
      expect(achievements.length).to.equal(0);
    });
  });

  describe("Achievement Deactivation", function () {
    beforeEach(async function () {
      await registry.connect(admin).approveGame(game1.address);
      await registry.connect(admin).approveGame(game2.address);
      await registry.connect(game1).registerAchievement("Game1 Achievement", "Desc", Rarity.Common);
    });

    it("game can deactivate its own achievement", async function () {
      await registry.connect(game1).deactivateAchievement(1);
      const achievement = await registry.getAchievement(1);
      expect(achievement.active).to.be.false;
    });

    it("emits AchievementDeactivated event", async function () {
      await expect(registry.connect(game1).deactivateAchievement(1))
        .to.emit(registry, "AchievementDeactivated")
        .withArgs(1);
    });

    it("game cannot deactivate another game's achievement", async function () {
      await expect(
        registry.connect(game2).deactivateAchievement(1)
      ).to.be.revertedWith("Not achievement owner");
    });

    it("cannot deactivate non-existent achievement", async function () {
      await expect(
        registry.connect(game1).deactivateAchievement(999)
      ).to.be.revertedWith("Achievement does not exist");
    });

    it("cannot deactivate already inactive achievement", async function () {
      await registry.connect(game1).deactivateAchievement(1);
      await expect(
        registry.connect(game1).deactivateAchievement(1)
      ).to.be.revertedWith("Achievement already inactive");
    });
  });

  describe("Unlock Count", function () {
    beforeEach(async function () {
      await registry.connect(admin).approveGame(game1.address);
      await registry.connect(admin).setPassportRole(passport.address);
      await registry.connect(game1).registerAchievement("Test Achievement", "Desc", Rarity.Common);
    });

    it("passport role can increment unlock count", async function () {
      await registry.connect(passport).incrementUnlockCount(1);
      const achievement = await registry.getAchievement(1);
      expect(achievement.totalUnlocks).to.equal(1);
    });

    it("can increment multiple times", async function () {
      await registry.connect(passport).incrementUnlockCount(1);
      await registry.connect(passport).incrementUnlockCount(1);
      await registry.connect(passport).incrementUnlockCount(1);
      const achievement = await registry.getAchievement(1);
      expect(achievement.totalUnlocks).to.equal(3);
    });

    it("non-passport cannot increment unlock count", async function () {
      await expect(
        registry.connect(user).incrementUnlockCount(1)
      ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });

    it("cannot increment for non-existent achievement", async function () {
      await expect(
        registry.connect(passport).incrementUnlockCount(999)
      ).to.be.revertedWith("Achievement does not exist");
    });
  });

  describe("Passport Role", function () {
    it("admin can set passport role", async function () {
      await registry.connect(admin).setPassportRole(passport.address);
      expect(await registry.hasRole(PASSPORT_ROLE, passport.address)).to.be.true;
    });

    it("cannot set passport to zero address", async function () {
      await expect(
        registry.connect(admin).setPassportRole(ethers.ZeroAddress)
      ).to.be.revertedWith("Passport cannot be zero address");
    });

    it("non-admin cannot set passport role", async function () {
      await expect(
        registry.connect(user).setPassportRole(passport.address)
      ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });
  });
});
