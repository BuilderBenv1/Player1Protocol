import { expect } from "chai";
import { ethers } from "hardhat";
import { P1Token, RewardDistributor } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("RewardDistributor", function () {
  let p1Token: P1Token;
  let distributor: RewardDistributor;
  let admin: SignerWithAddress;
  let passport: SignerWithAddress;
  let player1: SignerWithAddress;
  let player2: SignerWithAddress;

  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const DISTRIBUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE"));

  beforeEach(async function () {
    [admin, passport, player1, player2] = await ethers.getSigners();

    // Deploy P1Token
    const P1TokenFactory = await ethers.getContractFactory("P1Token");
    p1Token = await P1TokenFactory.deploy(admin.address);

    // Deploy RewardDistributor
    const DistributorFactory = await ethers.getContractFactory("RewardDistributor");
    distributor = await DistributorFactory.connect(admin).deploy(
      await p1Token.getAddress(),
      passport.address,
      admin.address
    );

    // Grant MINTER_ROLE to distributor
    await p1Token.connect(admin).grantRole(MINTER_ROLE, await distributor.getAddress());
  });

  describe("Deployment", function () {
    it("should set P1 token", async function () {
      expect(await distributor.p1Token()).to.equal(await p1Token.getAddress());
    });

    it("should set player passport", async function () {
      expect(await distributor.playerPassport()).to.equal(passport.address);
    });

    it("should grant DISTRIBUTOR_ROLE to passport", async function () {
      expect(await distributor.hasRole(DISTRIBUTOR_ROLE, passport.address)).to.be.true;
    });

    it("should set default emission rates", async function () {
      expect(await distributor.tournamentWinP1()).to.equal(ethers.parseEther("50"));
      expect(await distributor.tournamentTop3P1()).to.equal(ethers.parseEther("25"));
      expect(await distributor.tournamentParticipationP1()).to.equal(ethers.parseEther("5"));
      expect(await distributor.streakBonusP1()).to.equal(ethers.parseEther("10"));
    });

    it("should set default milestones", async function () {
      const thresholds = await distributor.getMilestoneThresholds();
      const rewards = await distributor.getMilestoneRewards();

      expect(thresholds[0]).to.equal(1000);
      expect(thresholds[1]).to.equal(5000);
      expect(thresholds[2]).to.equal(10000);
      expect(thresholds[3]).to.equal(50000);

      expect(rewards[0]).to.equal(ethers.parseEther("100"));
      expect(rewards[1]).to.equal(ethers.parseEther("500"));
      expect(rewards[2]).to.equal(ethers.parseEther("1000"));
      expect(rewards[3]).to.equal(ethers.parseEther("5000"));
    });

    it("should revert if P1 token is zero", async function () {
      const DistributorFactory = await ethers.getContractFactory("RewardDistributor");
      await expect(
        DistributorFactory.deploy(ethers.ZeroAddress, passport.address, admin.address)
      ).to.be.revertedWith("P1 token cannot be zero");
    });

    it("should revert if passport is zero", async function () {
      const DistributorFactory = await ethers.getContractFactory("RewardDistributor");
      await expect(
        DistributorFactory.deploy(await p1Token.getAddress(), ethers.ZeroAddress, admin.address)
      ).to.be.revertedWith("Passport cannot be zero");
    });

    it("should revert if admin is zero", async function () {
      const DistributorFactory = await ethers.getContractFactory("RewardDistributor");
      await expect(
        DistributorFactory.deploy(await p1Token.getAddress(), passport.address, ethers.ZeroAddress)
      ).to.be.revertedWith("Admin cannot be zero");
    });
  });

  describe("Tournament Rewards - Placement", function () {
    it("1st place: 50 P1 (free tier)", async function () {
      await distributor.connect(passport).distributeTournamentReward(
        player1.address, 1, 0, 0
      );
      expect(await p1Token.balanceOf(player1.address)).to.equal(ethers.parseEther("50"));
    });

    it("2nd place: 25 P1 (free tier)", async function () {
      await distributor.connect(passport).distributeTournamentReward(
        player1.address, 2, 0, 0
      );
      expect(await p1Token.balanceOf(player1.address)).to.equal(ethers.parseEther("25"));
    });

    it("3rd place: 25 P1 (free tier)", async function () {
      await distributor.connect(passport).distributeTournamentReward(
        player1.address, 3, 0, 0
      );
      expect(await p1Token.balanceOf(player1.address)).to.equal(ethers.parseEther("25"));
    });

    it("4th+ place: 5 P1 (participation)", async function () {
      await distributor.connect(passport).distributeTournamentReward(
        player1.address, 4, 0, 0
      );
      expect(await p1Token.balanceOf(player1.address)).to.equal(ethers.parseEther("5"));
    });

    it("0 placement (participated): 5 P1", async function () {
      await distributor.connect(passport).distributeTournamentReward(
        player1.address, 0, 0, 0
      );
      expect(await p1Token.balanceOf(player1.address)).to.equal(ethers.parseEther("5"));
    });
  });

  describe("Tournament Rewards - Tier Multipliers", function () {
    it("Free tier (0 AVAX): x1 multiplier", async function () {
      await distributor.connect(passport).distributeTournamentReward(
        player1.address, 1, 0, 0
      );
      expect(await p1Token.balanceOf(player1.address)).to.equal(ethers.parseEther("50"));
    });

    it("Low tier (0.5 AVAX): x1.5 multiplier", async function () {
      await distributor.connect(passport).distributeTournamentReward(
        player1.address, 1, ethers.parseEther("0.5"), 0
      );
      expect(await p1Token.balanceOf(player1.address)).to.equal(ethers.parseEther("75")); // 50 * 1.5
    });

    it("Medium tier (5 AVAX): x2 multiplier", async function () {
      await distributor.connect(passport).distributeTournamentReward(
        player1.address, 1, ethers.parseEther("5"), 0
      );
      expect(await p1Token.balanceOf(player1.address)).to.equal(ethers.parseEther("100")); // 50 * 2
    });

    it("High tier (15 AVAX): x3 multiplier", async function () {
      await distributor.connect(passport).distributeTournamentReward(
        player1.address, 1, ethers.parseEther("15"), 0
      );
      expect(await p1Token.balanceOf(player1.address)).to.equal(ethers.parseEther("150")); // 50 * 3
    });

    it("Participation not multiplied", async function () {
      await distributor.connect(passport).distributeTournamentReward(
        player1.address, 4, ethers.parseEther("15"), 0
      );
      expect(await p1Token.balanceOf(player1.address)).to.equal(ethers.parseEther("5")); // No multiplier
    });

    it("2nd place with multiplier", async function () {
      await distributor.connect(passport).distributeTournamentReward(
        player1.address, 2, ethers.parseEther("5"), 0
      );
      expect(await p1Token.balanceOf(player1.address)).to.equal(ethers.parseEther("50")); // 25 * 2
    });
  });

  describe("Tournament Rewards - Streak Bonus", function () {
    it("no bonus for streak <= 3", async function () {
      await distributor.connect(passport).distributeTournamentReward(
        player1.address, 1, 0, 3
      );
      expect(await p1Token.balanceOf(player1.address)).to.equal(ethers.parseEther("50"));
    });

    it("10 P1 bonus for 4th consecutive win", async function () {
      await distributor.connect(passport).distributeTournamentReward(
        player1.address, 1, 0, 4
      );
      expect(await p1Token.balanceOf(player1.address)).to.equal(ethers.parseEther("60")); // 50 + 10
    });

    it("20 P1 bonus for 5th consecutive win", async function () {
      await distributor.connect(passport).distributeTournamentReward(
        player1.address, 1, 0, 5
      );
      expect(await p1Token.balanceOf(player1.address)).to.equal(ethers.parseEther("70")); // 50 + 20
    });

    it("streak bonus scales with streak length", async function () {
      await distributor.connect(passport).distributeTournamentReward(
        player1.address, 1, 0, 10
      );
      expect(await p1Token.balanceOf(player1.address)).to.equal(ethers.parseEther("120")); // 50 + 70 (7*10)
    });

    it("streak bonus only applies to 1st place", async function () {
      await distributor.connect(passport).distributeTournamentReward(
        player1.address, 2, 0, 10
      );
      expect(await p1Token.balanceOf(player1.address)).to.equal(ethers.parseEther("25")); // No bonus
    });

    it("streak bonus stacks with tier multiplier", async function () {
      await distributor.connect(passport).distributeTournamentReward(
        player1.address, 1, ethers.parseEther("5"), 5 // Medium tier, 5th win
      );
      // 50 * 2 (medium) + 20 (streak bonus for 5-3=2 wins) = 120
      expect(await p1Token.balanceOf(player1.address)).to.equal(ethers.parseEther("120"));
    });
  });

  describe("Achievement Rewards", function () {
    it("mints exact P1 amount", async function () {
      await distributor.connect(passport).distributeAchievementReward(
        player1.address, ethers.parseEther("25")
      );
      expect(await p1Token.balanceOf(player1.address)).to.equal(ethers.parseEther("25"));
    });

    it("handles zero amount", async function () {
      await distributor.connect(passport).distributeAchievementReward(
        player1.address, 0
      );
      expect(await p1Token.balanceOf(player1.address)).to.equal(0);
    });

    it("emits RewardDistributed event", async function () {
      await expect(
        distributor.connect(passport).distributeAchievementReward(
          player1.address, ethers.parseEther("100")
        )
      ).to.emit(distributor, "RewardDistributed")
        .withArgs(player1.address, ethers.parseEther("100"), "Achievement Unlock");
    });
  });

  describe("Milestone Rewards", function () {
    it("distributes 100 P1 at 1000 points", async function () {
      await distributor.connect(passport).checkAndDistributeMilestone(player1.address, 1000);
      expect(await p1Token.balanceOf(player1.address)).to.equal(ethers.parseEther("100"));
    });

    it("distributes 500 P1 at 5000 points", async function () {
      await distributor.connect(passport).checkAndDistributeMilestone(player1.address, 5000);
      // Should get 1000 milestone (100 P1) + 5000 milestone (500 P1) = 600 P1
      expect(await p1Token.balanceOf(player1.address)).to.equal(ethers.parseEther("600"));
    });

    it("distributes 1000 P1 at 10000 points", async function () {
      await distributor.connect(passport).checkAndDistributeMilestone(player1.address, 10000);
      // 100 + 500 + 1000 = 1600 P1
      expect(await p1Token.balanceOf(player1.address)).to.equal(ethers.parseEther("1600"));
    });

    it("distributes 5000 P1 at 50000 points", async function () {
      await distributor.connect(passport).checkAndDistributeMilestone(player1.address, 50000);
      // 100 + 500 + 1000 + 5000 = 6600 P1
      expect(await p1Token.balanceOf(player1.address)).to.equal(ethers.parseEther("6600"));
    });

    it("cannot claim same milestone twice", async function () {
      await distributor.connect(passport).checkAndDistributeMilestone(player1.address, 1500);
      const balanceAfterFirst = await p1Token.balanceOf(player1.address);

      await distributor.connect(passport).checkAndDistributeMilestone(player1.address, 2000);
      expect(await p1Token.balanceOf(player1.address)).to.equal(balanceAfterFirst);
    });

    it("tracks claimed milestones", async function () {
      await distributor.connect(passport).checkAndDistributeMilestone(player1.address, 1000);
      expect(await distributor.hasMilestoneClaimed(player1.address, 1000)).to.be.true;
      expect(await distributor.hasMilestoneClaimed(player1.address, 5000)).to.be.false;
    });

    it("emits MilestoneReached event", async function () {
      await expect(
        distributor.connect(passport).checkAndDistributeMilestone(player1.address, 1000)
      ).to.emit(distributor, "MilestoneReached")
        .withArgs(player1.address, 1000, ethers.parseEther("100"));
    });

    it("no reward below first threshold", async function () {
      await distributor.connect(passport).checkAndDistributeMilestone(player1.address, 500);
      expect(await p1Token.balanceOf(player1.address)).to.equal(0);
    });
  });

  describe("Access Control", function () {
    it("only DISTRIBUTOR_ROLE can distribute tournament rewards", async function () {
      await expect(
        distributor.connect(player1).distributeTournamentReward(player1.address, 1, 0, 0)
      ).to.be.revertedWithCustomError(distributor, "AccessControlUnauthorizedAccount");
    });

    it("only DISTRIBUTOR_ROLE can distribute achievement rewards", async function () {
      await expect(
        distributor.connect(player1).distributeAchievementReward(player1.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(distributor, "AccessControlUnauthorizedAccount");
    });

    it("only DISTRIBUTOR_ROLE can check milestones", async function () {
      await expect(
        distributor.connect(player1).checkAndDistributeMilestone(player1.address, 10000)
      ).to.be.revertedWithCustomError(distributor, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Admin Functions", function () {
    it("admin can update tournament rewards", async function () {
      await distributor.connect(admin).setTournamentRewards(
        ethers.parseEther("100"),
        ethers.parseEther("50"),
        ethers.parseEther("10")
      );

      expect(await distributor.tournamentWinP1()).to.equal(ethers.parseEther("100"));
      expect(await distributor.tournamentTop3P1()).to.equal(ethers.parseEther("50"));
      expect(await distributor.tournamentParticipationP1()).to.equal(ethers.parseEther("10"));
    });

    it("admin can update streak bonus", async function () {
      await distributor.connect(admin).setStreakBonus(ethers.parseEther("20"));
      expect(await distributor.streakBonusP1()).to.equal(ethers.parseEther("20"));
    });

    it("admin can update milestones", async function () {
      const newThresholds = [2000n, 8000n, 20000n];
      const newRewards = [
        ethers.parseEther("200"),
        ethers.parseEther("800"),
        ethers.parseEther("2000")
      ];

      await distributor.connect(admin).setMilestones(newThresholds, newRewards);

      const thresholds = await distributor.getMilestoneThresholds();
      expect(thresholds.length).to.equal(3);
      expect(thresholds[0]).to.equal(2000);
    });

    it("milestones must be in ascending order", async function () {
      const badThresholds = [5000n, 2000n, 10000n];
      const rewards = [
        ethers.parseEther("100"),
        ethers.parseEther("200"),
        ethers.parseEther("300")
      ];

      await expect(
        distributor.connect(admin).setMilestones(badThresholds, rewards)
      ).to.be.revertedWith("Thresholds must be ascending");
    });

    it("milestones arrays must match length", async function () {
      const thresholds = [1000n, 5000n];
      const rewards = [ethers.parseEther("100")];

      await expect(
        distributor.connect(admin).setMilestones(thresholds, rewards)
      ).to.be.revertedWith("Arrays must match");
    });

    it("non-admin cannot update settings", async function () {
      await expect(
        distributor.connect(player1).setTournamentRewards(
          ethers.parseEther("100"),
          ethers.parseEther("50"),
          ethers.parseEther("10")
        )
      ).to.be.revertedWithCustomError(distributor, "AccessControlUnauthorizedAccount");
    });
  });

  describe("calculateTournamentReward", function () {
    it("returns correct reward for 1st place free tier", async function () {
      const reward = await distributor.calculateTournamentReward(1, 0, 0);
      expect(reward).to.equal(ethers.parseEther("50"));
    });

    it("returns correct reward with multiplier and streak", async function () {
      const reward = await distributor.calculateTournamentReward(
        1, ethers.parseEther("5"), 5
      );
      // 50 * 2 (medium) + 20 (streak) = 120
      expect(reward).to.equal(ethers.parseEther("120"));
    });
  });

  describe("Events", function () {
    it("emits RewardDistributed on tournament win", async function () {
      await expect(
        distributor.connect(passport).distributeTournamentReward(player1.address, 1, 0, 0)
      ).to.emit(distributor, "RewardDistributed")
        .withArgs(player1.address, ethers.parseEther("50"), "Tournament Win");
    });

    it("emits RewardDistributed on participation", async function () {
      await expect(
        distributor.connect(passport).distributeTournamentReward(player1.address, 4, 0, 0)
      ).to.emit(distributor, "RewardDistributed")
        .withArgs(player1.address, ethers.parseEther("5"), "Tournament Participation");
    });

    it("emits EmissionRatesUpdated", async function () {
      await expect(
        distributor.connect(admin).setTournamentRewards(
          ethers.parseEther("100"),
          ethers.parseEther("50"),
          ethers.parseEther("10")
        )
      ).to.emit(distributor, "EmissionRatesUpdated")
        .withArgs(
          ethers.parseEther("100"),
          ethers.parseEther("50"),
          ethers.parseEther("10")
        );
    });
  });
});
