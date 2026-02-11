import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Player1 Protocol - Demo Scenario Script
 *
 * Creates a complete tournament, plays through all matches, and demonstrates
 * the full protocol flow including achievements and P1 rewards.
 *
 * Run with: npx hardhat run scripts/demo.ts --network fuji
 */

interface Deployment {
  contracts: {
    P1Token: string;
    AchievementRegistry: string;
    PlayerPassport: string;
    Tournament: string;
    TournamentFactory: string;
    RewardDistributor: string;
    DemoGame: string;
  };
  vrfConfig: {
    coordinator: string;
  };
}

async function main() {
  console.log("========================================");
  console.log("Player1 Protocol - Demo Scenario");
  console.log("========================================\n");

  const signers = await ethers.getSigners();
  const [deployer, ...players] = signers;
  const network = await ethers.provider.getNetwork();
  const isLocalNetwork = network.chainId === 31337n;

  // Load deployment
  const deploymentFile = isLocalNetwork ? "localhost.json" : "fuji.json";
  const deploymentPath = path.join(__dirname, "..", "deployments", deploymentFile);

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found: ${deploymentPath}. Run deploy script first.`);
  }

  const deployment: Deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  // Get contracts
  const factory = await ethers.getContractAt("TournamentFactory", deployment.contracts.TournamentFactory);
  const passport = await ethers.getContractAt("PlayerPassport", deployment.contracts.PlayerPassport);
  const p1Token = await ethers.getContractAt("P1Token", deployment.contracts.P1Token);
  const demoGame = await ethers.getContractAt("DemoGame", deployment.contracts.DemoGame);
  const registry = await ethers.getContractAt("AchievementRegistry", deployment.contracts.AchievementRegistry);

  // Get mock VRF if local
  let mockVRF: any;
  if (isLocalNetwork) {
    mockVRF = await ethers.getContractAt("MockVRFCoordinator", deployment.vrfConfig.coordinator);
  }

  console.log("Contracts loaded from deployment\n");

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 1: Create Tournament
  // ═══════════════════════════════════════════════════════════════════════
  console.log("Step 1: Creating 'Player1 Launch Cup' tournament...");

  const ENTRY_FEE = ethers.parseEther("0.1");
  const MAX_PLAYERS = 8;
  const PRIZE_SPLIT = [5000n, 3000n, 1700n]; // 50% + 30% + 17% = 97% (3% fee)
  const deadline = Math.floor(Date.now() / 1000) + 7200; // 2 hours from now

  const createTx = await factory.connect(deployer).createTournament(
    "Player1 Launch Cup",
    "The inaugural tournament showcasing Player1 Protocol",
    deployment.contracts.DemoGame,
    ENTRY_FEE,
    MAX_PLAYERS,
    PRIZE_SPLIT,
    deadline,
    1800 // 30 min dispute window (use 60 for faster demo)
  );

  const createReceipt = await createTx.wait();
  const createEvent = createReceipt?.logs.find(
    (log: any) => factory.interface.parseLog(log)?.name === "TournamentCreated"
  );
  const parsedEvent = factory.interface.parseLog(createEvent as any);
  const tournamentAddress = parsedEvent?.args.tournament;

  const tournament = await ethers.getContractAt("Tournament", tournamentAddress);

  console.log(`Tournament created: ${tournamentAddress}`);
  console.log(`Entry fee: ${ethers.formatEther(ENTRY_FEE)} AVAX`);
  console.log(`Max players: ${MAX_PLAYERS}`);
  console.log(`Prize pool: ${ethers.formatEther(ENTRY_FEE * BigInt(MAX_PLAYERS))} AVAX`);

  if (!isLocalNetwork) {
    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║  IMPORTANT: VRF CONSUMER REGISTRATION REQUIRED             ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log("║  Each tournament clone must be added as a VRF consumer.     ║");
    console.log("║  Without this, bracket generation will fail.                ║");
    console.log("║                                                             ║");
    console.log(`║  Tournament address: ${tournamentAddress} ║`);
    console.log("║                                                             ║");
    console.log("║  Steps:                                                     ║");
    console.log("║  1. Go to https://vrf.chain.link/fuji                       ║");
    console.log("║  2. Open your VRF subscription                              ║");
    console.log("║  3. Click 'Add Consumer'                                    ║");
    console.log("║  4. Paste the tournament address above                      ║");
    console.log("║  5. Confirm the transaction                                 ║");
    console.log("╚══════════════════════════════════════════════════════════════╝\n");
  }
  console.log();

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 2: Register Players
  // ═══════════════════════════════════════════════════════════════════════
  console.log("Step 2: Registering players...");

  // Use first 8 signers as players (excluding deployer if needed)
  const tournamentPlayers = players.slice(0, MAX_PLAYERS);

  // Fund players if on local network
  if (isLocalNetwork) {
    for (const player of tournamentPlayers) {
      const balance = await ethers.provider.getBalance(player.address);
      if (balance < ENTRY_FEE * 2n) {
        await deployer.sendTransaction({
          to: player.address,
          value: ethers.parseEther("1"),
        });
      }
    }
  }

  // On testnet, register players one-by-one with error handling.
  // The 8th registration triggers VRF bracket generation, which will
  // fail if the tournament hasn't been added as a VRF consumer.
  for (let i = 0; i < tournamentPlayers.length; i++) {
    const player = tournamentPlayers[i];
    try {
      await tournament.connect(player).register({ value: ENTRY_FEE });
      console.log(`Player ${i + 1} registered: ${player.address}`);
    } catch (error: any) {
      if (!isLocalNetwork && i === MAX_PLAYERS - 1) {
        console.error(`\nPlayer ${i + 1} registration failed (likely VRF consumer not added).`);
        console.error("The last registration triggers bracket generation via VRF.");
        console.error(`Add ${tournamentAddress} as a VRF consumer and re-run this script.\n`);
        throw error;
      }
      throw error;
    }
  }

  console.log(`\nAll ${MAX_PLAYERS} players registered!`);
  console.log(`Prize pool: ${ethers.formatEther(await tournament.prizePool())} AVAX\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 3: Generate Bracket (VRF)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("Step 3: Generating bracket with VRF...");

  if (isLocalNetwork) {
    // Fulfill VRF on local network
    const requestId = await tournament.vrfRequestId();
    await mockVRF.fulfillRandomWordsWithSeed(requestId, 42069, 1);
    console.log("Mock VRF fulfilled");
  } else {
    // On testnet, wait for Chainlink VRF callback (up to 5 minutes)
    console.log("Waiting for Chainlink VRF callback (this can take 1-3 minutes)...");
    let bracketGenerated = false;
    let attempts = 0;
    const maxAttempts = 60; // 60 * 5s = 5 minutes
    while (!bracketGenerated && attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 5000));
      bracketGenerated = await tournament.bracketGenerated();
      attempts++;
      process.stdout.write(".");
    }
    console.log();

    if (!bracketGenerated) {
      console.error("\nVRF callback was not received within 5 minutes.");
      console.error("Possible causes:");
      console.error(`  - Tournament ${tournamentAddress} is not a VRF consumer`);
      console.error("  - VRF subscription is not funded with LINK");
      console.error("  - Network congestion");
      console.error("\nAdd the tournament as a VRF consumer at https://vrf.chain.link/fuji and retry.");
      process.exit(1);
    }
  }

  const bracket = await tournament.getBracket();
  console.log("\nBracket generated:");
  for (let i = 0; i < bracket.length; i++) {
    console.log(`  Seed ${i + 1}: ${bracket[i].player}`);
  }
  console.log();

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 4: Play Tournament
  // ═══════════════════════════════════════════════════════════════════════
  console.log("Step 4: Playing tournament matches...\n");

  // Track winners for achievements
  const matchResults: { winner: string; loser: string }[] = [];

  async function playRound(roundName: string) {
    console.log(`--- ${roundName} ---`);
    const matches = await tournament.getCurrentRoundMatches();

    for (const match of matches) {
      if (match.status === 0n) { // Pending
        // Player 1 wins (deterministic for demo)
        const winner = match.player1;
        const loser = match.player2;

        await demoGame.connect(deployer).reportMatchResult(
          tournamentAddress,
          match.matchId,
          winner
        );

        matchResults.push({ winner, loser });
        console.log(`Match ${match.matchId}: ${winner.slice(0, 10)}... beats ${loser.slice(0, 10)}...`);

        // On local network, fast-forward time for dispute window
        if (isLocalNetwork) {
          await ethers.provider.send("evm_increaseTime", [1801]);
          await ethers.provider.send("evm_mine", []);
        } else {
          // On testnet, wait for dispute window
          console.log("  Waiting for dispute window...");
          await new Promise((r) => setTimeout(r, 30000)); // 30 seconds for demo
        }

        await tournament.confirmResult(match.matchId);
      }
    }
    console.log();
  }

  // Round 1: Quarter Finals (4 matches)
  await playRound("Quarter Finals");

  // Round 2: Semi Finals (2 matches)
  await playRound("Semi Finals");

  // Round 3: Final (1 match)
  await playRound("Grand Final");

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 5: Tournament Complete
  // ═══════════════════════════════════════════════════════════════════════
  console.log("Step 5: Tournament completed!\n");

  const status = await tournament.status();
  console.log(`Tournament status: ${["Registration", "Active", "Completed", "Cancelled", "Finalized"][Number(status)]}`);

  // Get final placements
  const finalBracket = await tournament.getBracket();
  const winner = finalBracket[0].player;
  const runnerUp = finalBracket.length > 1 ? finalBracket[1].player : ethers.ZeroAddress;

  console.log(`\n1st Place: ${winner}`);
  console.log(`2nd Place: ${runnerUp}\n`);

  // Record tournament win for achievements
  await demoGame.connect(deployer).recordTournamentWin(
    winner,
    MAX_PLAYERS,
    ENTRY_FEE,
    true // Undefeated (won all matches)
  );

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 6: Prize Claims
  // ═══════════════════════════════════════════════════════════════════════
  console.log("Step 6: Claiming prizes...\n");

  const winnerSigner = tournamentPlayers.find((p) => p.address === winner);
  const runnerUpSigner = tournamentPlayers.find((p) => p.address === runnerUp);

  if (winnerSigner) {
    const claimable = await tournament.getClaimableAmount(winner);
    console.log(`Winner claimable: ${ethers.formatEther(claimable)} AVAX`);

    if (claimable > 0n) {
      await tournament.connect(winnerSigner).claimPrize();
      console.log("Winner claimed prize!");
    }
  }

  if (runnerUpSigner) {
    const claimable = await tournament.getClaimableAmount(runnerUp);
    console.log(`Runner-up claimable: ${ethers.formatEther(claimable)} AVAX`);

    if (claimable > 0n) {
      await tournament.connect(runnerUpSigner).claimPrize();
      console.log("Runner-up claimed prize!");
    }
  }

  console.log();

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 7: Show Player Stats
  // ═══════════════════════════════════════════════════════════════════════
  console.log("Step 7: Player Statistics\n");

  console.log("=== WINNER PROFILE ===");
  const winnerProfile = await passport.getProfile(winner);
  const winnerP1 = await p1Token.balanceOf(winner);
  const winnerAchievements = await passport.getAchievementHistory(winner);

  console.log(`Address: ${winner}`);
  console.log(`Composite Score: ${winnerProfile.compositeScore}`);
  console.log(`Tournaments: ${winnerProfile.totalTournaments}`);
  console.log(`Wins: ${winnerProfile.totalWins}`);
  console.log(`Current Streak: ${winnerProfile.currentWinStreak}`);
  console.log(`Longest Streak: ${winnerProfile.longestWinStreak}`);
  console.log(`Prize Money: ${ethers.formatEther(winnerProfile.totalPrizeMoney)} AVAX`);
  console.log(`P1 Balance: ${ethers.formatEther(winnerP1)} P1`);
  console.log(`Achievements: ${winnerAchievements.length}`);

  for (const unlock of winnerAchievements) {
    const achievement = await registry.getAchievement(unlock.achievementId);
    console.log(`  - ${achievement.name} (${["Common", "Rare", "Legendary"][achievement.rarity]})`);
  }

  console.log("\n=== RUNNER-UP PROFILE ===");
  const runnerUpProfile = await passport.getProfile(runnerUp);
  const runnerUpP1 = await p1Token.balanceOf(runnerUp);

  console.log(`Address: ${runnerUp}`);
  console.log(`Composite Score: ${runnerUpProfile.compositeScore}`);
  console.log(`Tournaments: ${runnerUpProfile.totalTournaments}`);
  console.log(`P1 Balance: ${ethers.formatEther(runnerUpP1)} P1`);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 8: Protocol Stats
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n=== PROTOCOL STATS ===");
  console.log(`Total Passports: ${await passport.totalPassports()}`);
  console.log(`Total Tournaments: ${await factory.getTournamentCount()}`);
  console.log(`Total P1 Supply: ${ethers.formatEther(await p1Token.totalSupply())} P1`);

  // ═══════════════════════════════════════════════════════════════════════
  // Save Demo Results
  // ═══════════════════════════════════════════════════════════════════════
  const demoData = {
    tournament: tournamentAddress,
    winner,
    runnerUp,
    players: tournamentPlayers.map((p) => p.address),
    prizePool: ethers.formatEther(ENTRY_FEE * BigInt(MAX_PLAYERS)),
    winnerScore: winnerProfile.compositeScore.toString(),
    winnerP1: ethers.formatEther(winnerP1),
    totalPassports: (await passport.totalPassports()).toString(),
  };

  const outputPath = path.join(__dirname, "..", "demo-data.json");
  fs.writeFileSync(outputPath, JSON.stringify(demoData, null, 2));

  console.log(`\nDemo data saved to: ${outputPath}`);
  console.log("\n========================================");
  console.log("Demo Complete!");
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
