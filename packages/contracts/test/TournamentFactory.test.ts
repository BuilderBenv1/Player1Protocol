import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  TournamentFactory,
  Tournament,
  PlayerPassport,
  AchievementRegistry,
  P1Token,
  RewardDistributor,
  MockVRFCoordinator
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TournamentFactory", function () {
  let factory: TournamentFactory;
  let tournamentImpl: Tournament;
  let passport: PlayerPassport;
  let registry: AchievementRegistry;
  let p1Token: P1Token;
  let rewardDistributor: RewardDistributor;
  let mockVRF: MockVRFCoordinator;

  let admin: SignerWithAddress;
  let organizer: SignerWithAddress;
  let game: SignerWithAddress;
  let treasury: SignerWithAddress;
  let player1: SignerWithAddress;

  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

  beforeEach(async function () {
    [admin, organizer, game, treasury, player1] = await ethers.getSigners();

    // Deploy mock VRF
    const MockVRFFactory = await ethers.getContractFactory("MockVRFCoordinator");
    mockVRF = await MockVRFFactory.deploy();

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
    await registry.connect(admin).approveGame(game.address);
    await passport.connect(admin).grantGameRole(game.address);

    // Deploy Tournament implementation
    const TournamentFactory = await ethers.getContractFactory("Tournament");
    tournamentImpl = await TournamentFactory.deploy();

    // Deploy TournamentFactory
    const FactoryFactory = await ethers.getContractFactory("TournamentFactory");
    factory = await FactoryFactory.deploy(
      await tournamentImpl.getAddress(),
      await passport.getAddress(),
      treasury.address,
      1, // VRF subscription ID
      ethers.ZeroHash, // VRF key hash
      await mockVRF.getAddress()
    );

    // Grant factory role to factory
    await passport.connect(admin).grantFactoryRole(await factory.getAddress());
  });

  describe("Deployment", function () {
    it("sets tournament implementation", async function () {
      expect(await factory.tournamentImplementation()).to.equal(await tournamentImpl.getAddress());
    });

    it("sets player passport", async function () {
      expect(await factory.playerPassport()).to.equal(await passport.getAddress());
    });

    it("sets protocol treasury", async function () {
      expect(await factory.protocolTreasury()).to.equal(treasury.address);
    });

    it("sets default protocol fee (3%)", async function () {
      expect(await factory.protocolFeeBps()).to.equal(300);
    });

    it("sets default dispute window (30 min)", async function () {
      expect(await factory.defaultDisputeWindowSeconds()).to.equal(1800);
    });

    it("grants admin role to deployer", async function () {
      expect(await factory.hasRole(ethers.ZeroHash, admin.address)).to.be.true;
    });

    it("reverts if implementation is zero", async function () {
      const FactoryFactory = await ethers.getContractFactory("TournamentFactory");
      await expect(
        FactoryFactory.deploy(
          ethers.ZeroAddress,
          await passport.getAddress(),
          treasury.address,
          1,
          ethers.ZeroHash,
          await mockVRF.getAddress()
        )
      ).to.be.revertedWith("Implementation cannot be zero");
    });
  });

  describe("Tournament Creation", function () {
    const ENTRY_FEE = ethers.parseEther("0.1");
    const MAX_PLAYERS = 8;
    const PRIZE_SPLIT = [6500n, 3200n]; // 65% + 32% = 97%

    async function createTournament() {
      const deadline = (await time.latest()) + 3600;

      return factory.connect(organizer).createTournament(
        "Test Tournament",
        "A test tournament",
        game.address,
        ENTRY_FEE,
        MAX_PLAYERS,
        PRIZE_SPLIT,
        deadline,
        1800
      );
    }

    it("creates a tournament clone", async function () {
      const tx = await createTournament();
      const receipt = await tx.wait();

      const event = receipt?.logs.find(
        (log) => factory.interface.parseLog(log as any)?.name === "TournamentCreated"
      );
      const parsedEvent = factory.interface.parseLog(event as any);

      expect(parsedEvent?.args.tournament).to.not.equal(ethers.ZeroAddress);
    });

    it("tournament clone is properly initialized", async function () {
      const tx = await createTournament();
      const receipt = await tx.wait();

      const event = receipt?.logs.find(
        (log) => factory.interface.parseLog(log as any)?.name === "TournamentCreated"
      );
      const parsedEvent = factory.interface.parseLog(event as any);
      const tournamentAddress = parsedEvent?.args.tournament;

      const tournament = await ethers.getContractAt("Tournament", tournamentAddress);
      const config = await tournament.getConfig();

      expect(config.organizer).to.equal(organizer.address);
      expect(config.gameContract).to.equal(game.address);
      expect(config.entryFee).to.equal(ENTRY_FEE);
      expect(config.maxPlayers).to.equal(MAX_PLAYERS);
    });

    it("increments tournament count", async function () {
      await createTournament();
      expect(await factory.getTournamentCount()).to.equal(1);

      await createTournament();
      expect(await factory.getTournamentCount()).to.equal(2);
    });

    it("tracks organizer tournaments", async function () {
      await createTournament();
      await createTournament();

      const orgTournaments = await factory.getOrganizerTournaments(organizer.address);
      expect(orgTournaments.length).to.equal(2);
    });

    it("sets isTournament mapping", async function () {
      const tx = await createTournament();
      const receipt = await tx.wait();

      const event = receipt?.logs.find(
        (log) => factory.interface.parseLog(log as any)?.name === "TournamentCreated"
      );
      const parsedEvent = factory.interface.parseLog(event as any);
      const tournamentAddress = parsedEvent?.args.tournament;

      expect(await factory.isTournament(tournamentAddress)).to.be.true;
    });

    it("returns false for non-tournament addresses", async function () {
      expect(await factory.isTournament(admin.address)).to.be.false;
    });

    it("emits TournamentCreated event", async function () {
      const deadline = (await time.latest()) + 3600;

      await expect(
        factory.connect(organizer).createTournament(
          "Test Tournament",
          "A test tournament",
          game.address,
          ENTRY_FEE,
          MAX_PLAYERS,
          PRIZE_SPLIT,
          deadline,
          1800
        )
      ).to.emit(factory, "TournamentCreated");
    });
  });

  describe("Validation", function () {
    const ENTRY_FEE = ethers.parseEther("0.1");
    const PRIZE_SPLIT = [6500n, 3200n];

    it("rejects empty name", async function () {
      const deadline = (await time.latest()) + 3600;

      await expect(
        factory.connect(organizer).createTournament(
          "",
          "Description",
          game.address,
          ENTRY_FEE,
          8,
          PRIZE_SPLIT,
          deadline,
          1800
        )
      ).to.be.revertedWith("Name cannot be empty");
    });

    it("rejects zero game address", async function () {
      const deadline = (await time.latest()) + 3600;

      await expect(
        factory.connect(organizer).createTournament(
          "Test",
          "Description",
          ethers.ZeroAddress,
          ENTRY_FEE,
          8,
          PRIZE_SPLIT,
          deadline,
          1800
        )
      ).to.be.revertedWith("Game cannot be zero");
    });

    it("rejects non-power-of-2 max players (3)", async function () {
      const deadline = (await time.latest()) + 3600;

      await expect(
        factory.connect(organizer).createTournament(
          "Test",
          "Description",
          game.address,
          ENTRY_FEE,
          3,
          PRIZE_SPLIT,
          deadline,
          1800
        )
      ).to.be.revertedWith("Max players must be power of 2");
    });

    it("rejects non-power-of-2 max players (5)", async function () {
      const deadline = (await time.latest()) + 3600;

      await expect(
        factory.connect(organizer).createTournament(
          "Test",
          "Description",
          game.address,
          ENTRY_FEE,
          5,
          PRIZE_SPLIT,
          deadline,
          1800
        )
      ).to.be.revertedWith("Max players must be power of 2");
    });

    it("accepts valid power-of-2 values", async function () {
      const validSizes = [2, 4, 8, 16, 32, 64];
      const deadline = (await time.latest()) + 3600;

      for (const size of validSizes) {
        await factory.connect(organizer).createTournament(
          `Test ${size}`,
          "Description",
          game.address,
          ENTRY_FEE,
          size,
          PRIZE_SPLIT,
          deadline,
          1800
        );
      }

      expect(await factory.getTournamentCount()).to.equal(validSizes.length);
    });

    it("rejects past deadline", async function () {
      const pastDeadline = (await time.latest()) - 1;

      await expect(
        factory.connect(organizer).createTournament(
          "Test",
          "Description",
          game.address,
          ENTRY_FEE,
          8,
          PRIZE_SPLIT,
          pastDeadline,
          1800
        )
      ).to.be.revertedWith("Deadline must be future");
    });

    it("rejects invalid prize split sum", async function () {
      const deadline = (await time.latest()) + 3600;
      const badSplit = [5000n, 2000n]; // Only 70%, should be 97%

      await expect(
        factory.connect(organizer).createTournament(
          "Test",
          "Description",
          game.address,
          ENTRY_FEE,
          8,
          badSplit,
          deadline,
          1800
        )
      ).to.be.revertedWith("Prize split must equal 100% minus fee");
    });

    it("rejects too many prize positions", async function () {
      const deadline = (await time.latest()) + 3600;
      // 5 prize positions for 4 players
      const tooManySplits = [3000n, 2500n, 2000n, 1200n, 1000n]; // Sums to 97%

      await expect(
        factory.connect(organizer).createTournament(
          "Test",
          "Description",
          game.address,
          ENTRY_FEE,
          4,
          tooManySplits,
          deadline,
          1800
        )
      ).to.be.revertedWith("Too many prize positions");
    });
  });

  describe("Admin Functions", function () {
    it("admin can update protocol fee", async function () {
      await factory.connect(admin).setProtocolFee(500); // 5%
      expect(await factory.protocolFeeBps()).to.equal(500);
    });

    it("protocol fee max is 10%", async function () {
      await expect(
        factory.connect(admin).setProtocolFee(1100)
      ).to.be.revertedWith("Max 10% fee");
    });

    it("non-admin cannot update fee", async function () {
      await expect(
        factory.connect(organizer).setProtocolFee(500)
      ).to.be.revertedWithCustomError(factory, "AccessControlUnauthorizedAccount");
    });

    it("admin can update dispute window", async function () {
      await factory.connect(admin).setDefaultDisputeWindow(3600); // 1 hour
      expect(await factory.defaultDisputeWindowSeconds()).to.equal(3600);
    });

    it("dispute window min is 1 minute", async function () {
      await expect(
        factory.connect(admin).setDefaultDisputeWindow(30)
      ).to.be.revertedWith("Min 1 minute");
    });

    it("admin can update treasury", async function () {
      await factory.connect(admin).setProtocolTreasury(player1.address);
      expect(await factory.protocolTreasury()).to.equal(player1.address);
    });

    it("treasury cannot be zero", async function () {
      await expect(
        factory.connect(admin).setProtocolTreasury(ethers.ZeroAddress)
      ).to.be.revertedWith("Treasury cannot be zero");
    });

    it("admin can update implementation", async function () {
      const NewTournamentFactory = await ethers.getContractFactory("Tournament");
      const newImpl = await NewTournamentFactory.deploy();

      await factory.connect(admin).updateImplementation(await newImpl.getAddress());
      expect(await factory.tournamentImplementation()).to.equal(await newImpl.getAddress());
    });

    it("emits events on config changes", async function () {
      await expect(factory.connect(admin).setProtocolFee(500))
        .to.emit(factory, "ProtocolFeeUpdated")
        .withArgs(300, 500);

      await expect(factory.connect(admin).setProtocolTreasury(player1.address))
        .to.emit(factory, "TreasuryUpdated")
        .withArgs(treasury.address, player1.address);
    });
  });

  describe("Active Tournaments", function () {
    it("returns active tournaments correctly", async function () {
      const deadline = (await time.latest()) + 3600;
      const PRIZE_SPLIT = [6500n, 3200n];

      // Create 2 tournaments
      await factory.connect(organizer).createTournament(
        "Tournament 1",
        "Description",
        game.address,
        ethers.parseEther("0.1"),
        4,
        PRIZE_SPLIT,
        deadline,
        1800
      );

      await factory.connect(organizer).createTournament(
        "Tournament 2",
        "Description",
        game.address,
        ethers.parseEther("0.1"),
        4,
        PRIZE_SPLIT,
        deadline,
        1800
      );

      const activeTournaments = await factory.getActiveTournaments();
      expect(activeTournaments.length).to.equal(2);
    });
  });

  describe("Multiple Tournaments", function () {
    it("creates independent tournaments", async function () {
      const deadline = (await time.latest()) + 3600;
      const PRIZE_SPLIT = [6500n, 3200n];

      await factory.connect(organizer).createTournament(
        "Tournament A",
        "Description A",
        game.address,
        ethers.parseEther("0.1"),
        4,
        PRIZE_SPLIT,
        deadline,
        1800
      );

      await factory.connect(organizer).createTournament(
        "Tournament B",
        "Description B",
        game.address,
        ethers.parseEther("0.5"),
        8,
        PRIZE_SPLIT,
        deadline,
        3600
      );

      const tournaments = await factory.getTournaments();

      const tournamentA = await ethers.getContractAt("Tournament", tournaments[0]);
      const tournamentB = await ethers.getContractAt("Tournament", tournaments[1]);

      const configA = await tournamentA.getConfig();
      const configB = await tournamentB.getConfig();

      expect(configA.name).to.equal("Tournament A");
      expect(configB.name).to.equal("Tournament B");
      expect(configA.entryFee).to.equal(ethers.parseEther("0.1"));
      expect(configB.entryFee).to.equal(ethers.parseEther("0.5"));
    });
  });
});
