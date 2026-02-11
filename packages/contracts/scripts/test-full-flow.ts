import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Player1 Protocol - Full Tournament Lifecycle Test
 *
 * Ensures the factory has the updated Tournament implementation (with
 * generateBracketDeterministic), then runs a complete 4-player tournament.
 *
 * Run with: npx hardhat run scripts/test-full-flow.ts --network fuji
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
}

async function main() {
  console.log("════════════════════════════════════════════════════════════");
  console.log("  Player1 Protocol — Full Tournament Lifecycle Test");
  console.log("════════════════════════════════════════════════════════════\n");

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const isLocal = network.chainId === 31337n;

  console.log(`Network: ${network.name} (chainId ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  const deployerBal = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(deployerBal)} AVAX\n`);

  // Load deployment
  const deploymentFile = isLocal ? "localhost.json" : "fuji.json";
  const deploymentPath = path.join(__dirname, "..", "deployments", deploymentFile);
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment not found: ${deploymentPath}. Run deploy script first.`);
  }
  const deployment: Deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  // Get existing contracts
  const factory = await ethers.getContractAt("TournamentFactory", deployment.contracts.TournamentFactory);
  const passport = await ethers.getContractAt("PlayerPassport", deployment.contracts.PlayerPassport);
  const p1Token = await ethers.getContractAt("P1Token", deployment.contracts.P1Token);
  const demoGame = await ethers.getContractAt("DemoGame", deployment.contracts.DemoGame);

  // ═════════════════════════════════════════════════════════════════════
  // STEP 1: Ensure factory has updated Tournament implementation
  // ═════════════════════════════════════════════════════════════════════
  console.log("Step 1: Checking Tournament implementation...");

  const currentImpl = await factory.tournamentImplementation();
  console.log(`  Current factory impl: ${currentImpl}`);

  // Test if the current implementation has generateBracketDeterministic
  // by checking if the function selector exists in the deployed bytecode
  let needsRedeploy = false;
  try {
    const implContract = await ethers.getContractAt("Tournament", currentImpl);
    // Try a static call — it will revert with a REASON if the function exists
    // but will revert with "no data" / unrecognized selector if it doesn't
    await implContract.generateBracketDeterministic.staticCall();
  } catch (e: any) {
    const msg = e.message || "";
    // If we get a meaningful revert reason, the function exists
    if (msg.includes("Not in registration") || msg.includes("Not enough players") ||
        msg.includes("Bracket already generated") || msg.includes("Not available on mainnet") ||
        msg.includes("Only organizer") || msg.includes("Already initialized")) {
      console.log("  Implementation already has generateBracketDeterministic()");
    } else {
      // Function selector not recognized = old implementation
      console.log("  Implementation does NOT have generateBracketDeterministic()");
      needsRedeploy = true;
    }
  }

  let newImplAddress = currentImpl;

  if (needsRedeploy) {
    console.log("  Deploying new Tournament implementation...");
    const TournamentFactory = await ethers.getContractFactory("Tournament");
    const newImpl = await TournamentFactory.deploy();
    await newImpl.waitForDeployment();
    newImplAddress = await newImpl.getAddress();
    console.log(`  New implementation deployed: ${newImplAddress}`);

    console.log("  Updating factory...");
    const updateTx = await factory.updateImplementation(newImplAddress);
    await updateTx.wait();

    // Verify
    const verifiedImpl = await factory.tournamentImplementation();
    console.log(`  Factory impl verified: ${verifiedImpl}`);
    if (verifiedImpl !== newImplAddress) {
      throw new Error("Factory implementation update failed!");
    }

    // Update deployment file
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    deploymentData.contracts.Tournament = newImplAddress;
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
    console.log("  Deployment file updated");
  } else {
    console.log("  Factory already has updated implementation — skipping redeploy");
    newImplAddress = currentImpl;
  }

  // ═════════════════════════════════════════════════════════════════════
  // STEP 2: Create tournament
  // ═════════════════════════════════════════════════════════════════════
  console.log("\nStep 2: Creating tournament...");

  const ENTRY_FEE = ethers.parseEther("0.01");
  const FUND_AMOUNT = ethers.parseEther("0.02"); // entry fee + gas
  const NUM_PLAYERS = 4;
  const PRIZE_SPLIT = [5000n, 3000n, 1700n]; // 50% + 30% + 17% = 97% (3% protocol fee)
  const MAX_PLAYERS = 8; // Higher than 4 to avoid auto-triggering VRF on last registration
  const DISPUTE_WINDOW = 60; // 1 minute
  const deadline = Math.floor(Date.now() / 1000) + 7200;

  const createTx = await factory.createTournament(
    "Test Full Flow Cup",
    "End-to-end lifecycle test",
    deployment.contracts.DemoGame,
    ENTRY_FEE,
    MAX_PLAYERS,
    PRIZE_SPLIT,
    deadline,
    DISPUTE_WINDOW,
  );
  const createReceipt = await createTx.wait();

  // Parse tournament address from event
  let tournamentAddress = "";
  for (const log of createReceipt!.logs) {
    try {
      const parsed = factory.interface.parseLog(log as any);
      if (parsed?.name === "TournamentCreated") {
        tournamentAddress = parsed.args.tournament;
        break;
      }
    } catch {}
  }

  if (!tournamentAddress) throw new Error("Failed to parse TournamentCreated event");

  const tournament = await ethers.getContractAt("Tournament", tournamentAddress);
  console.log(`  Tournament: ${tournamentAddress}`);
  console.log(`  Entry fee: ${ethers.formatEther(ENTRY_FEE)} AVAX`);
  console.log(`  Max players: ${MAX_PLAYERS}, registering: ${NUM_PLAYERS}`);
  console.log(`  Dispute window: ${DISPUTE_WINDOW}s`);

  // ═════════════════════════════════════════════════════════════════════
  // STEP 3: Create & fund 4 player wallets
  // ═════════════════════════════════════════════════════════════════════
  console.log("\nStep 3: Creating and funding 4 player wallets...");

  const playerWallets = [];
  for (let i = 0; i < NUM_PLAYERS; i++) {
    const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
    playerWallets.push(wallet);

    const fundTx = await deployer.sendTransaction({
      to: wallet.address,
      value: FUND_AMOUNT,
    });
    await fundTx.wait();
    console.log(`  Player ${i + 1}: ${wallet.address} (funded ${ethers.formatEther(FUND_AMOUNT)} AVAX)`);
  }

  // ═════════════════════════════════════════════════════════════════════
  // STEP 4: Register 4 players
  // ═════════════════════════════════════════════════════════════════════
  console.log("\nStep 4: Registering 4 players...");
  for (let i = 0; i < playerWallets.length; i++) {
    const regTx = await tournament.connect(playerWallets[i]).register({ value: ENTRY_FEE });
    await regTx.wait();
    console.log(`  Player ${i + 1} registered: ${playerWallets[i].address}`);
  }
  const poolAfterReg = await tournament.prizePool();
  console.log(`  Prize pool: ${ethers.formatEther(poolAfterReg)} AVAX`);

  // ═════════════════════════════════════════════════════════════════════
  // STEP 5: Generate bracket deterministically (with diagnostics)
  // ═════════════════════════════════════════════════════════════════════
  console.log("\nStep 5: Generating bracket deterministically...");

  // Diagnostic: check all preconditions before calling
  const preStatus = await tournament.status();
  const prePlayerCount = await tournament.getPlayerCount();
  const preBracketGenerated = await tournament.bracketGenerated();
  const preOrganizer = (await tournament.getConfig()).organizer;

  console.log(`  Pre-check — status: ${preStatus} (expect 0=Registration)`);
  console.log(`  Pre-check — playerCount: ${prePlayerCount} (expect ${NUM_PLAYERS})`);
  console.log(`  Pre-check — bracketGenerated: ${preBracketGenerated} (expect false)`);
  console.log(`  Pre-check — organizer: ${preOrganizer}`);
  console.log(`  Pre-check — deployer: ${deployer.address}`);
  console.log(`  Pre-check — organizer === deployer: ${preOrganizer.toLowerCase() === deployer.address.toLowerCase()}`);
  console.log(`  Pre-check — chainId: ${network.chainId} (must != 43114)`);

  if (Number(preStatus) !== 0) throw new Error(`Tournament status is ${preStatus}, expected 0 (Registration)`);
  if (Number(prePlayerCount) < 2) throw new Error(`Only ${prePlayerCount} players, need >= 2`);
  if (preBracketGenerated) throw new Error("Bracket already generated");
  if (preOrganizer.toLowerCase() !== deployer.address.toLowerCase()) throw new Error("Deployer is not the organizer");

  try {
    const bracketTx = await tournament.connect(deployer).generateBracketDeterministic();
    await bracketTx.wait();
    console.log("  Bracket generated successfully!");
  } catch (e: any) {
    console.error("\n  ERROR: generateBracketDeterministic() reverted!");
    console.error(`  Message: ${e.message?.slice(0, 500)}`);
    console.error(`  Reason: ${e.reason || "unknown"}`);
    // Try to get more info from the revert
    if (e.data) console.error(`  Data: ${e.data}`);
    throw e;
  }

  const bracketData = await tournament.getBracket();
  console.log("  Bracket seeded:");
  for (let i = 0; i < bracketData.length; i++) {
    console.log(`    Seed ${i + 1}: ${bracketData[i].player}`);
  }

  const statusAfterBracket = await tournament.status();
  console.log(`  Status: ${["Registration", "Active", "Completed", "Cancelled", "Finalized"][Number(statusAfterBracket)]}`);

  // ═════════════════════════════════════════════════════════════════════
  // STEP 6: Play all matches
  // ═════════════════════════════════════════════════════════════════════
  console.log("\nStep 6: Playing tournament matches...");

  async function playCurrentRound(roundName: string) {
    console.log(`\n  -- ${roundName} --`);
    const currentMatches = await tournament.getCurrentRoundMatches();
    console.log(`  ${currentMatches.length} match(es) in this round`);

    for (const match of currentMatches) {
      if (Number(match.status) !== 0) {
        console.log(`  Match ${match.matchId}: skipping (status=${match.status})`);
        continue;
      }

      // Player 1 wins (deterministic for test)
      const winner = match.player1;
      const loser = match.player2;

      // Report result (deployer is organizer)
      const reportTx = await tournament.connect(deployer).reportResult(match.matchId, winner);
      await reportTx.wait();
      console.log(`  Match ${match.matchId}: ${winner.slice(0, 10)}... beats ${loser.slice(0, 10)}...`);

      // Wait for dispute window
      if (isLocal) {
        await ethers.provider.send("evm_increaseTime", [DISPUTE_WINDOW + 1]);
        await ethers.provider.send("evm_mine", []);
      } else {
        const waitSec = DISPUTE_WINDOW + 5; // extra 5s buffer
        console.log(`    Waiting ${waitSec}s for dispute window...`);
        await new Promise((r) => setTimeout(r, waitSec * 1000));
      }

      // Confirm result
      const confirmTx = await tournament.connect(deployer).confirmResult(match.matchId);
      await confirmTx.wait();
      console.log(`    Result confirmed`);
    }
  }

  // Round 0: Semifinals (2 matches with 4 players)
  await playCurrentRound("Round 1 (Semifinals)");

  // Round 1: Final (1 match)
  await playCurrentRound("Round 2 (Final)");

  // ═════════════════════════════════════════════════════════════════════
  // STEP 7: Verify tournament completion
  // ═════════════════════════════════════════════════════════════════════
  console.log("\n\nStep 7: Verifying tournament completion...");
  const finalStatus = await tournament.status();
  const statusName = ["Registration", "Active", "Completed", "Cancelled", "Finalized"][Number(finalStatus)];
  console.log(`  Tournament status: ${statusName}`);

  if (Number(finalStatus) !== 2) {
    console.error("  ERROR: Tournament did not complete! Status:", statusName);
    process.exit(1);
  }
  console.log("  Tournament completed successfully");

  // ═════════════════════════════════════════════════════════════════════
  // STEP 8: Claim prizes
  // ═════════════════════════════════════════════════════════════════════
  console.log("\nStep 8: Claiming prizes...");

  for (let i = 0; i < playerWallets.length; i++) {
    const claimable = await tournament.getClaimableAmount(playerWallets[i].address);
    if (claimable > 0n) {
      const balBefore = await ethers.provider.getBalance(playerWallets[i].address);
      const claimTx = await tournament.connect(playerWallets[i]).claimPrize();
      await claimTx.wait();
      const balAfter = await ethers.provider.getBalance(playerWallets[i].address);
      console.log(`  Player ${i + 1} claimed: ${ethers.formatEther(claimable)} AVAX (balance: ${ethers.formatEther(balBefore)} -> ${ethers.formatEther(balAfter)})`);
    } else {
      console.log(`  Player ${i + 1}: no prize to claim`);
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // STEP 9: Verify PlayerPassport stats
  // ═════════════════════════════════════════════════════════════════════
  console.log("\nStep 9: Verifying PlayerPassport data...\n");

  const totalPassports = await passport.totalPassports();

  const results: {
    player: string;
    compositeScore: number;
    totalTournaments: number;
    totalWins: number;
    totalTopThree: number;
    prizeMoney: string;
    p1Balance: string;
    exists: boolean;
  }[] = [];

  for (let i = 0; i < playerWallets.length; i++) {
    const addr = playerWallets[i].address;
    const profile = await passport.getProfile(addr);
    const p1Bal = await p1Token.balanceOf(addr);

    const r = {
      player: addr,
      compositeScore: Number(profile.compositeScore),
      totalTournaments: Number(profile.totalTournaments),
      totalWins: Number(profile.totalWins),
      totalTopThree: Number(profile.totalTopThree),
      prizeMoney: ethers.formatEther(profile.totalPrizeMoney),
      p1Balance: ethers.formatEther(p1Bal),
      exists: profile.exists,
    };
    results.push(r);

    console.log(`  Player ${i + 1} (${addr.slice(0, 10)}...):`);
    console.log(`    Passport exists: ${r.exists}`);
    console.log(`    Composite Score: ${r.compositeScore}`);
    console.log(`    Tournaments: ${r.totalTournaments}`);
    console.log(`    Wins: ${r.totalWins}`);
    console.log(`    Top 3: ${r.totalTopThree}`);
    console.log(`    Prize Money: ${r.prizeMoney} AVAX`);
    console.log(`    P1 Balance: ${r.p1Balance} P1`);
    console.log();
  }

  // ═════════════════════════════════════════════════════════════════════
  // STEP 10: Validation summary
  // ═════════════════════════════════════════════════════════════════════
  console.log("════════════════════════════════════════════════════════════");
  console.log("  VALIDATION SUMMARY");
  console.log("════════════════════════════════════════════════════════════\n");

  let allPassed = true;

  function check(label: string, condition: boolean) {
    const icon = condition ? "PASS" : "FAIL";
    console.log(`  [${icon}] ${label}`);
    if (!condition) allPassed = false;
  }

  check("Tournament status is Completed", Number(finalStatus) === 2);
  check("All 4 players have passports", results.every((r) => r.exists));
  check("All 4 players have 1 tournament", results.every((r) => r.totalTournaments === 1));

  // Find winner (highest score) and runner-up
  const sorted = [...results].sort((a, b) => b.compositeScore - a.compositeScore);
  const winner = sorted[0];
  const runnerUp = sorted[1];

  check(`Winner score > 0 (got ${winner.compositeScore})`, winner.compositeScore > 0);
  check(`Winner totalWins = 1 (got ${winner.totalWins})`, winner.totalWins === 1);
  check(`Runner-up totalTopThree = 1 (got ${runnerUp.totalTopThree})`, runnerUp.totalTopThree === 1);

  // Prize money checks
  check(`Winner has prize money > 0 (${winner.prizeMoney} AVAX)`, parseFloat(winner.prizeMoney) > 0);
  check(`Runner-up has prize money > 0 (${runnerUp.prizeMoney} AVAX)`, parseFloat(runnerUp.prizeMoney) > 0);

  // Protocol stats
  const totalP1Supply = await p1Token.totalSupply();
  const tournamentCount = await factory.getTournamentCount();
  console.log(`\n  Protocol stats:`);
  console.log(`    Total Passports: ${totalPassports}`);
  console.log(`    Total Tournaments: ${tournamentCount}`);
  console.log(`    Total P1 Supply: ${ethers.formatEther(totalP1Supply)} P1`);
  console.log(`    Tournament Impl: ${newImplAddress}`);

  console.log(`\n════════════════════════════════════════════════════════════`);
  if (allPassed) {
    console.log("  ALL CHECKS PASSED - Full flow working end-to-end!");
  } else {
    console.log("  SOME CHECKS FAILED - Review output above.");
  }
  console.log("════════════════════════════════════════════════════════════\n");

  // Save test results
  const testResults = {
    timestamp: new Date().toISOString(),
    network: network.name,
    chainId: Number(network.chainId),
    tournament: tournamentAddress,
    implementation: newImplAddress,
    players: results.map((r) => ({
      address: r.player,
      compositeScore: r.compositeScore,
      totalWins: r.totalWins,
      prizeMoney: r.prizeMoney,
      p1Balance: r.p1Balance,
    })),
    allPassed,
  };

  const outputPath = path.join(__dirname, "..", "test-flow-results.json");
  fs.writeFileSync(outputPath, JSON.stringify(testResults, null, 2));
  console.log(`Results saved to: ${outputPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
