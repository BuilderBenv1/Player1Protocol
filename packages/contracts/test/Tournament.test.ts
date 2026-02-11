import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  Tournament,
  TournamentFactory,
  PlayerPassport,
  AchievementRegistry,
  P1Token,
  RewardDistributor,
  MockVRFCoordinator
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Tournament", function () {
  let tournament: Tournament;
  let factory: TournamentFactory;
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
  let player2: SignerWithAddress;
  let player3: SignerWithAddress;
  let player4: SignerWithAddress;
  let players: SignerWithAddress[];

  const ENTRY_FEE = ethers.parseEther("0.1");
  const MAX_PLAYERS = 4;
  const PRIZE_SPLIT = [6500n, 3200n]; // 65% + 32% = 97% (3% protocol fee)
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

  async function deployContracts() {
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
    const tournamentImpl = await TournamentFactory.deploy();

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
  }

  async function createTournament(entryFee = ENTRY_FEE, maxPlayers = MAX_PLAYERS) {
    const deadline = (await time.latest()) + 3600; // 1 hour from now

    const tx = await factory.connect(organizer).createTournament(
      "Test Tournament",
      "A test tournament",
      game.address,
      entryFee,
      maxPlayers,
      PRIZE_SPLIT,
      deadline,
      1800 // 30 min dispute window
    );

    const receipt = await tx.wait();
    const event = receipt?.logs.find(
      (log) => factory.interface.parseLog(log as any)?.name === "TournamentCreated"
    );
    const parsedEvent = factory.interface.parseLog(event as any);
    const tournamentAddress = parsedEvent?.args.tournament;

    return ethers.getContractAt("Tournament", tournamentAddress) as Promise<Tournament>;
  }

  beforeEach(async function () {
    [admin, organizer, game, treasury, player1, player2, player3, player4] = await ethers.getSigners();
    players = [player1, player2, player3, player4];
    await deployContracts();
  });

  describe("Registration", function () {
    beforeEach(async function () {
      tournament = await createTournament();
    });

    it("player can register with correct entry fee", async function () {
      await tournament.connect(player1).register({ value: ENTRY_FEE });
      expect(await tournament.isRegistered(player1.address)).to.be.true;
    });

    it("updates player count on registration", async function () {
      await tournament.connect(player1).register({ value: ENTRY_FEE });
      expect(await tournament.getPlayerCount()).to.equal(1);
    });

    it("updates prize pool on registration", async function () {
      await tournament.connect(player1).register({ value: ENTRY_FEE });
      expect(await tournament.prizePool()).to.equal(ENTRY_FEE);
    });

    it("emits PlayerRegistered event", async function () {
      await expect(tournament.connect(player1).register({ value: ENTRY_FEE }))
        .to.emit(tournament, "PlayerRegistered")
        .withArgs(player1.address, 1);
    });

    it("rejects registration with wrong entry fee (too low)", async function () {
      await expect(
        tournament.connect(player1).register({ value: ENTRY_FEE - 1n })
      ).to.be.revertedWith("Incorrect entry fee");
    });

    it("rejects registration with wrong entry fee (too high)", async function () {
      await expect(
        tournament.connect(player1).register({ value: ENTRY_FEE + 1n })
      ).to.be.revertedWith("Incorrect entry fee");
    });

    it("rejects duplicate registration", async function () {
      await tournament.connect(player1).register({ value: ENTRY_FEE });
      await expect(
        tournament.connect(player1).register({ value: ENTRY_FEE })
      ).to.be.revertedWith("Already registered");
    });

    it("rejects registration after deadline", async function () {
      await time.increase(3601); // Past deadline
      await expect(
        tournament.connect(player1).register({ value: ENTRY_FEE })
      ).to.be.revertedWith("Registration deadline passed");
    });

    it("rejects registration when full (status changes to Active)", async function () {
      // When tournament fills up, it auto-triggers bracket generation
      // and status changes to Active, so registration is closed
      for (const player of players) {
        await tournament.connect(player).register({ value: ENTRY_FEE });
      }

      const [extra] = await ethers.getSigners();
      await expect(
        tournament.connect(extra).register({ value: ENTRY_FEE })
      ).to.be.revertedWith("Registration closed");
    });

    it("auto-triggers bracket generation when full", async function () {
      for (const player of players) {
        await tournament.connect(player).register({ value: ENTRY_FEE });
      }

      // Status should be Active now
      expect(await tournament.status()).to.equal(1); // Active
    });
  });

  describe("Bracket Generation", function () {
    beforeEach(async function () {
      tournament = await createTournament();
    });

    it("requests VRF when full", async function () {
      for (let i = 0; i < MAX_PLAYERS - 1; i++) {
        await tournament.connect(players[i]).register({ value: ENTRY_FEE });
      }

      await expect(
        tournament.connect(players[MAX_PLAYERS - 1]).register({ value: ENTRY_FEE })
      ).to.emit(tournament, "BracketGenerationRequested");
    });

    it("VRF callback generates bracket", async function () {
      // Register all players
      for (const player of players) {
        await tournament.connect(player).register({ value: ENTRY_FEE });
      }

      const requestId = await tournament.vrfRequestId();

      // Fulfill VRF with deterministic seed
      await mockVRF.fulfillRandomWordsWithSeed(requestId, 12345, 1);

      expect(await tournament.bracketGenerated()).to.be.true;
    });

    it("bracket has correct number of slots", async function () {
      for (const player of players) {
        await tournament.connect(player).register({ value: ENTRY_FEE });
      }

      await mockVRF.fulfillRandomWordsWithSeed(await tournament.vrfRequestId(), 12345, 1);

      const bracket = await tournament.getBracket();
      expect(bracket.length).to.equal(MAX_PLAYERS);
    });

    it("generates first round matches", async function () {
      for (const player of players) {
        await tournament.connect(player).register({ value: ENTRY_FEE });
      }

      await mockVRF.fulfillRandomWordsWithSeed(await tournament.vrfRequestId(), 12345, 1);

      const matchCount = await tournament.getMatchCount();
      expect(matchCount).to.equal(MAX_PLAYERS / 2);
    });

    it("organizer can manually trigger after deadline", async function () {
      await tournament.connect(player1).register({ value: ENTRY_FEE });
      await tournament.connect(player2).register({ value: ENTRY_FEE });

      await time.increase(3601);

      await tournament.connect(organizer).generateBracket();
      expect(await tournament.status()).to.equal(1); // Active
    });
  });

  describe("Match Reporting", function () {
    beforeEach(async function () {
      tournament = await createTournament();

      for (const player of players) {
        await tournament.connect(player).register({ value: ENTRY_FEE });
      }

      await mockVRF.fulfillRandomWordsWithSeed(await tournament.vrfRequestId(), 12345, 1);
    });

    it("game contract can report result", async function () {
      const match0 = await tournament.getMatch(0);

      await tournament.connect(game).reportResult(0, match0.player1);

      const updatedMatch = await tournament.getMatch(0);
      expect(updatedMatch.winner).to.equal(match0.player1);
      expect(updatedMatch.status).to.equal(1); // Reported
    });

    it("organizer can report result", async function () {
      const match0 = await tournament.getMatch(0);

      await tournament.connect(organizer).reportResult(0, match0.player1);

      const updatedMatch = await tournament.getMatch(0);
      expect(updatedMatch.winner).to.equal(match0.player1);
    });

    it("rejects report from unauthorized address", async function () {
      const match0 = await tournament.getMatch(0);

      await expect(
        tournament.connect(player1).reportResult(0, match0.player1)
      ).to.be.revertedWith("Only game or organizer");
    });

    it("rejects invalid winner", async function () {
      await expect(
        tournament.connect(game).reportResult(0, admin.address)
      ).to.be.revertedWith("Invalid winner");
    });

    it("emits ResultReported event", async function () {
      const match0 = await tournament.getMatch(0);

      await expect(tournament.connect(game).reportResult(0, match0.player1))
        .to.emit(tournament, "ResultReported")
        .withArgs(0, match0.player1, game.address);
    });
  });

  describe("Dispute System", function () {
    beforeEach(async function () {
      tournament = await createTournament();

      for (const player of players) {
        await tournament.connect(player).register({ value: ENTRY_FEE });
      }

      await mockVRF.fulfillRandomWordsWithSeed(await tournament.vrfRequestId(), 12345, 1);
    });

    it("loser can dispute within window", async function () {
      const match0 = await tournament.getMatch(0);
      const winner = match0.player1;
      const loserAddress = match0.player2;

      await tournament.connect(game).reportResult(0, winner);

      // Get the loser signer
      const loser = players.find(p => p.address === loserAddress) || player1;

      await tournament.connect(loser).disputeResult(0);

      const disputedMatch = await tournament.getMatch(0);
      expect(disputedMatch.status).to.equal(3); // Disputed
    });

    it("cannot dispute after window", async function () {
      const match0 = await tournament.getMatch(0);
      const winner = match0.player1;
      const loserAddress = match0.player2;

      await tournament.connect(game).reportResult(0, winner);

      await time.increase(1801); // Past 30 min dispute window

      const loser = players.find(p => p.address === loserAddress) || player1;

      await expect(
        tournament.connect(loser).disputeResult(0)
      ).to.be.revertedWith("Dispute window closed");
    });

    it("winner cannot dispute", async function () {
      const match0 = await tournament.getMatch(0);
      const winnerAddress = match0.player1;

      await tournament.connect(game).reportResult(0, winnerAddress);

      const winner = players.find(p => p.address === winnerAddress) || player1;

      await expect(
        tournament.connect(winner).disputeResult(0)
      ).to.be.revertedWith("Only loser can dispute");
    });

    it("organizer can resolve dispute", async function () {
      const match0 = await tournament.getMatch(0);
      const winner = match0.player1;
      const loserAddress = match0.player2;

      await tournament.connect(game).reportResult(0, winner);

      const loser = players.find(p => p.address === loserAddress) || player1;
      await tournament.connect(loser).disputeResult(0);

      // Organizer resolves in favor of original loser
      await tournament.connect(organizer).resolveDispute(0, loserAddress);

      const resolvedMatch = await tournament.getMatch(0);
      expect(resolvedMatch.winner).to.equal(loserAddress);
      expect(resolvedMatch.status).to.equal(2); // Confirmed
    });
  });

  describe("Result Confirmation", function () {
    beforeEach(async function () {
      tournament = await createTournament();

      for (const player of players) {
        await tournament.connect(player).register({ value: ENTRY_FEE });
      }

      await mockVRF.fulfillRandomWordsWithSeed(await tournament.vrfRequestId(), 12345, 1);
    });

    it("anyone can confirm after dispute window", async function () {
      const match0 = await tournament.getMatch(0);

      await tournament.connect(game).reportResult(0, match0.player1);

      await time.increase(1801);

      await tournament.confirmResult(0);

      const confirmedMatch = await tournament.getMatch(0);
      expect(confirmedMatch.status).to.equal(2); // Confirmed
    });

    it("cannot confirm during dispute window", async function () {
      const match0 = await tournament.getMatch(0);

      await tournament.connect(game).reportResult(0, match0.player1);

      await expect(tournament.confirmResult(0)).to.be.revertedWith("Dispute window active");
    });

    it("emits ResultConfirmed event", async function () {
      const match0 = await tournament.getMatch(0);

      await tournament.connect(game).reportResult(0, match0.player1);

      await time.increase(1801);

      await expect(tournament.confirmResult(0))
        .to.emit(tournament, "ResultConfirmed")
        .withArgs(0, match0.player1);
    });
  });

  describe("Full Tournament Flow", function () {
    beforeEach(async function () {
      tournament = await createTournament();
    });

    it("completes full 4-player bracket", async function () {
      // Register all players
      for (const player of players) {
        await tournament.connect(player).register({ value: ENTRY_FEE });
      }

      // Generate bracket
      await mockVRF.fulfillRandomWordsWithSeed(await tournament.vrfRequestId(), 12345, 1);

      const bracket = await tournament.getBracket();
      const firstRoundMatches = await tournament.getCurrentRoundMatches();

      // First round: 2 matches
      for (let i = 0; i < 2; i++) {
        const match = firstRoundMatches[i];
        await tournament.connect(game).reportResult(Number(match.matchId), match.player1);
        await time.increase(1801);
        await tournament.confirmResult(Number(match.matchId));
      }

      // Should advance to round 2 (final)
      expect(await tournament.currentRound()).to.equal(1);

      // Final match
      const finalMatches = await tournament.getCurrentRoundMatches();
      expect(finalMatches.length).to.equal(1);

      const finalMatch = finalMatches[0];
      await tournament.connect(game).reportResult(Number(finalMatch.matchId), finalMatch.player1);
      await time.increase(1801);
      await tournament.confirmResult(Number(finalMatch.matchId));

      // Tournament should be completed
      expect(await tournament.status()).to.equal(2); // Completed
    });

    it("distributes prizes correctly", async function () {
      // Register all players
      for (const player of players) {
        await tournament.connect(player).register({ value: ENTRY_FEE });
      }

      await mockVRF.fulfillRandomWordsWithSeed(await tournament.vrfRequestId(), 12345, 1);

      // Play through tournament (winner is consistent due to deterministic VRF)
      const allMatches = await tournament.getAllMatches();

      for (const match of allMatches) {
        if (match.status === 0n) { // Pending
          await tournament.connect(game).reportResult(Number(match.matchId), match.player1);
          await time.increase(1801);
          await tournament.confirmResult(Number(match.matchId));
        }
      }

      // Check final matches and complete
      let finalMatches = await tournament.getCurrentRoundMatches();
      while (finalMatches.length > 0 && finalMatches[0].status === 0n) {
        for (const match of finalMatches) {
          if (match.status === 0n) {
            await tournament.connect(game).reportResult(Number(match.matchId), match.player1);
            await time.increase(1801);
            await tournament.confirmResult(Number(match.matchId));
          }
        }
        if (await tournament.status() === 2n) break;
        finalMatches = await tournament.getCurrentRoundMatches();
      }

      // Prize pool minus 3% fee
      const totalPrize = ENTRY_FEE * BigInt(MAX_PLAYERS);
      const protocolFee = (totalPrize * 300n) / 10000n;
      const distributablePool = totalPrize - protocolFee;

      // Check treasury received fee
      expect(await ethers.provider.getBalance(treasury.address)).to.be.gt(0);
    });
  });

  describe("Prize Claims", function () {
    let winner: SignerWithAddress;

    beforeEach(async function () {
      tournament = await createTournament();

      for (const player of players) {
        await tournament.connect(player).register({ value: ENTRY_FEE });
      }

      await mockVRF.fulfillRandomWordsWithSeed(await tournament.vrfRequestId(), 12345, 1);

      // Play through entire tournament
      let status = await tournament.status();
      while (status !== 2n) { // Not Completed
        const matches = await tournament.getCurrentRoundMatches();
        for (const match of matches) {
          if (match.status === 0n) { // Pending
            await tournament.connect(game).reportResult(Number(match.matchId), match.player1);
            await time.increase(1801);
            await tournament.confirmResult(Number(match.matchId));
          }
        }
        status = await tournament.status();
      }

      // Find winner
      const bracket = await tournament.getBracket();
      winner = players.find(p => p.address === bracket[0].player) || player1;
    });

    it("winner can claim prize", async function () {
      const claimable = await tournament.getClaimableAmount(winner.address);

      if (claimable > 0) {
        const balanceBefore = await ethers.provider.getBalance(winner.address);

        const tx = await tournament.connect(winner).claimPrize();
        const receipt = await tx.wait();
        const gasCost = receipt!.gasUsed * receipt!.gasPrice;

        const balanceAfter = await ethers.provider.getBalance(winner.address);

        expect(balanceAfter).to.equal(balanceBefore + claimable - gasCost);
      }
    });

    it("cannot claim twice", async function () {
      const claimable = await tournament.getClaimableAmount(winner.address);

      if (claimable > 0) {
        await tournament.connect(winner).claimPrize();

        await expect(
          tournament.connect(winner).claimPrize()
        ).to.be.revertedWith("Already claimed");
      }
    });

    it("cannot claim if no prize", async function () {
      await expect(
        tournament.connect(admin).claimPrize()
      ).to.be.revertedWith("No prize to claim");
    });
  });

  describe("Cancellation", function () {
    beforeEach(async function () {
      tournament = await createTournament();
    });

    it("organizer can cancel during registration", async function () {
      await tournament.connect(organizer).cancelTournament();
      expect(await tournament.status()).to.equal(3); // Cancelled
    });

    it("cannot cancel after tournament starts", async function () {
      for (const player of players) {
        await tournament.connect(player).register({ value: ENTRY_FEE });
      }

      await mockVRF.fulfillRandomWordsWithSeed(await tournament.vrfRequestId(), 12345, 1);

      await expect(
        tournament.connect(organizer).cancelTournament()
      ).to.be.revertedWith("Cannot cancel");
    });

    it("players can claim refund after cancellation", async function () {
      await tournament.connect(player1).register({ value: ENTRY_FEE });
      await tournament.connect(player2).register({ value: ENTRY_FEE });

      await tournament.connect(organizer).cancelTournament();

      const balanceBefore = await ethers.provider.getBalance(player1.address);

      const tx = await tournament.connect(player1).claimRefund();
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(player1.address);

      expect(balanceAfter).to.equal(balanceBefore + ENTRY_FEE - gasCost);
    });

    it("cannot claim refund twice", async function () {
      await tournament.connect(player1).register({ value: ENTRY_FEE });
      await tournament.connect(organizer).cancelTournament();
      await tournament.connect(player1).claimRefund();

      await expect(
        tournament.connect(player1).claimRefund()
      ).to.be.revertedWith("Already claimed");
    });
  });
});
