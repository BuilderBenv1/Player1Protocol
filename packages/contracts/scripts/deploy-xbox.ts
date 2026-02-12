import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Player1 Protocol — Xbox Live Feature Deployment
 *
 * Deploys ONLY the new contracts (Leaderboard, SocialGraph, LFG, PlayerReputation, ClubFactory)
 * using existing mainnet contract addresses.
 *
 * Run with: CONFIRM_MAINNET=true npx hardhat run scripts/deploy-xbox.ts --network mainnet
 */

// Existing mainnet addresses
const EXISTING = {
  PlayerPassport: "0xe354C6394AAC25a786C27334d2B7bEf367bebDf8",
  RewardDistributor: "0xd4A5C78E87267c93fB738c56F1434591fBe8C03D",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("========================================");
  console.log("Player1 Protocol — Xbox Live Deployment");
  console.log("========================================");
  console.log(`Network: ${network.name} (${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} AVAX`);
  console.log("========================================\n");

  const isMainnet = network.chainId === 43114n;
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || deployer.address;

  if (isMainnet) {
    const balance = await ethers.provider.getBalance(deployer.address);
    const balanceInAvax = parseFloat(ethers.formatEther(balance));

    console.log("⚠️  MAINNET DEPLOYMENT — REAL MONEY AT STAKE");
    console.log(`Treasury: ${TREASURY_ADDRESS}`);
    console.log(`Deployer balance: ${balanceInAvax.toFixed(4)} AVAX\n`);

    if (balanceInAvax < 0.5) {
      throw new Error(`Insufficient balance: ${balanceInAvax.toFixed(4)} AVAX. Need at least 0.5 AVAX.`);
    }

    if (!process.env.CONFIRM_MAINNET) {
      throw new Error(
        "Mainnet deployment requires confirmation. Run with:\n" +
        "  CONFIRM_MAINNET=true npx hardhat run scripts/deploy-xbox.ts --network mainnet"
      );
    }

    console.log("Mainnet deployment confirmed. Proceeding...\n");
  }

  // ── Step 1: Deploy Leaderboard ──
  console.log("Step 1/5: Deploying Leaderboard...");
  const LeaderboardFactory = await ethers.getContractFactory("Leaderboard");
  const leaderboard = await LeaderboardFactory.deploy(deployer.address);
  await leaderboard.waitForDeployment();
  const leaderboardAddr = await leaderboard.getAddress();
  console.log(`  Leaderboard: ${leaderboardAddr}\n`);

  // ── Step 2: Deploy SocialGraph ──
  console.log("Step 2/5: Deploying SocialGraph...");
  const SocialGraphFactory = await ethers.getContractFactory("SocialGraph");
  const socialGraph = await SocialGraphFactory.deploy();
  await socialGraph.waitForDeployment();
  const socialGraphAddr = await socialGraph.getAddress();
  console.log(`  SocialGraph: ${socialGraphAddr}\n`);

  // ── Step 3: Deploy LFG ──
  console.log("Step 3/5: Deploying LFG...");
  const LFGFactory = await ethers.getContractFactory("LFG");
  const lfg = await LFGFactory.deploy(EXISTING.PlayerPassport);
  await lfg.waitForDeployment();
  const lfgAddr = await lfg.getAddress();
  console.log(`  LFG: ${lfgAddr}\n`);

  // ── Step 4: Deploy PlayerReputation ──
  console.log("Step 4/5: Deploying PlayerReputation...");
  const ReputationFactory = await ethers.getContractFactory("PlayerReputation");
  const reputation = await ReputationFactory.deploy(deployer.address);
  await reputation.waitForDeployment();
  const reputationAddr = await reputation.getAddress();
  console.log(`  PlayerReputation: ${reputationAddr}\n`);

  // ── Step 5: Deploy ClubFactory ──
  console.log("Step 5/5: Deploying ClubFactory...");
  const CLUB_CREATION_FEE = ethers.parseEther("0.01");
  const ClubFactoryFactory = await ethers.getContractFactory("ClubFactory");
  const clubFactory = await ClubFactoryFactory.deploy(TREASURY_ADDRESS, CLUB_CREATION_FEE);
  await clubFactory.waitForDeployment();
  const clubFactoryAddr = await clubFactory.getAddress();
  console.log(`  ClubFactory: ${clubFactoryAddr}\n`);

  // ── Save addresses ──
  const result = {
    Leaderboard: leaderboardAddr,
    SocialGraph: socialGraphAddr,
    LFG: lfgAddr,
    PlayerReputation: reputationAddr,
    ClubFactory: clubFactoryAddr,
  };

  // Update existing mainnet.json
  const deploymentPath = path.join(__dirname, "..", "deployments", "mainnet.json");
  if (fs.existsSync(deploymentPath)) {
    const existing = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
    existing.contracts = { ...existing.contracts, ...result };
    existing.deployedAt = new Date().toISOString();
    fs.writeFileSync(deploymentPath, JSON.stringify(existing, null, 2));
    console.log(`Updated: ${deploymentPath}`);
  }

  // Also save standalone file
  const xboxPath = path.join(__dirname, "..", "deployments", "xbox-mainnet.json");
  fs.writeFileSync(xboxPath, JSON.stringify({
    chainId: Number(network.chainId),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: result,
  }, null, 2));

  console.log("\n========================================");
  console.log("Xbox Live Contracts Deployed!");
  console.log("========================================");
  console.log(`  Leaderboard:       ${leaderboardAddr}`);
  console.log(`  SocialGraph:       ${socialGraphAddr}`);
  console.log(`  LFG:               ${lfgAddr}`);
  console.log(`  PlayerReputation:  ${reputationAddr}`);
  console.log(`  ClubFactory:       ${clubFactoryAddr}`);
  console.log("========================================");
  console.log("\nNext: Update SDK addresses and frontend contracts.ts with these addresses.");

  return result;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
