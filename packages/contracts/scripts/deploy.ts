import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Player1 Protocol - Full Deployment Script
 *
 * Deploys all contracts in the correct order with proper wiring.
 * Run with: npx hardhat run scripts/deploy.ts --network fuji
 */

// Chainlink VRF Config for Fuji
const VRF_COORDINATOR_FUJI = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
const VRF_KEY_HASH_FUJI = "0xc799bd1e3bd4d1a41cd4968997a4e03dfd2a3c7c04b695881138580163f42887";

// Chainlink VRF Config for Avalanche Mainnet (V2.5)
const VRF_COORDINATOR_MAINNET = "0xE40895D055bccd2053dD0638C9695E326152b1A4";
const VRF_KEY_HASH_MAINNET = "0x89630569c9567e43c4fe7b1633258df9f2531b62f2352fa721cf3162ee4ecb46";

interface DeploymentResult {
  chainId: number;
  networkName: string;
  deployer: string;
  deployedAt: string;
  contracts: {
    P1Token: string;
    AchievementRegistry: string;
    PlayerPassport: string;
    Tournament: string;
    TournamentFactory: string;
    RewardDistributor: string;
    DemoGame: string;
    Leaderboard: string;
    SocialGraph: string;
    LFG: string;
    PlayerReputation: string;
    ClubFactory: string;
  };
  vrfConfig: {
    coordinator: string;
    keyHash: string;
    subscriptionId: string;
  };
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("========================================");
  console.log("Player1 Protocol - Deployment Script");
  console.log("========================================");
  console.log(`Network: ${network.name} (${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} AVAX`);
  console.log("========================================\n");

  // Get VRF subscription ID from env
  const VRF_SUBSCRIPTION_ID = process.env.VRF_SUBSCRIPTION_ID || "0";
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || deployer.address;

  // Determine network type
  const isLocalNetwork = network.chainId === 31337n;
  const isMainnet = network.chainId === 43114n;
  let vrfCoordinator: string;
  let vrfKeyHash: string;

  // ── Mainnet safety checks ──
  if (isMainnet) {
    const balance = await ethers.provider.getBalance(deployer.address);
    const balanceInAvax = parseFloat(ethers.formatEther(balance));

    console.log("⚠️  ========================================");
    console.log("⚠️  MAINNET DEPLOYMENT — REAL MONEY AT STAKE");
    console.log("⚠️  ========================================");
    console.log(`Treasury: ${TREASURY_ADDRESS}`);
    console.log(`Deployer balance: ${balanceInAvax.toFixed(4)} AVAX\n`);

    if (balanceInAvax < 1) {
      throw new Error(
        `Insufficient AVAX balance: ${balanceInAvax.toFixed(4)} AVAX. Need at least 1 AVAX for deployment gas.`
      );
    }

    // Require --confirm flag or CONFIRM_MAINNET env var
    if (!process.env.CONFIRM_MAINNET) {
      throw new Error(
        "Mainnet deployment requires confirmation. Run with:\n" +
        "  CONFIRM_MAINNET=true npx hardhat run scripts/deploy.ts --network mainnet"
      );
    }

    console.log("Mainnet deployment confirmed. Proceeding...\n");
  }

  if (isLocalNetwork) {
    console.log("Deploying MockVRFCoordinator for local testing...");
    const MockVRFFactory = await ethers.getContractFactory("MockVRFCoordinator");
    const mockVRF = await MockVRFFactory.deploy();
    await mockVRF.waitForDeployment();
    vrfCoordinator = await mockVRF.getAddress();
    vrfKeyHash = VRF_KEY_HASH_FUJI;
    console.log(`MockVRFCoordinator deployed: ${vrfCoordinator}\n`);
  } else if (isMainnet) {
    vrfCoordinator = VRF_COORDINATOR_MAINNET;
    vrfKeyHash = VRF_KEY_HASH_MAINNET;
  } else {
    vrfCoordinator = VRF_COORDINATOR_FUJI;
    vrfKeyHash = VRF_KEY_HASH_FUJI;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 1: Deploy P1Token
  // ═══════════════════════════════════════════════════════════════════════
  console.log("Step 1: Deploying P1Token...");
  const P1TokenFactory = await ethers.getContractFactory("P1Token");
  const p1Token = await P1TokenFactory.deploy(deployer.address);
  await p1Token.waitForDeployment();
  console.log(`P1Token deployed: ${await p1Token.getAddress()}\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 2: Deploy AchievementRegistry
  // ═══════════════════════════════════════════════════════════════════════
  console.log("Step 2: Deploying AchievementRegistry...");
  const RegistryFactory = await ethers.getContractFactory("AchievementRegistry");
  const registry = await RegistryFactory.deploy(deployer.address);
  await registry.waitForDeployment();
  console.log(`AchievementRegistry deployed: ${await registry.getAddress()}\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 3: Deploy PlayerPassport
  // ═══════════════════════════════════════════════════════════════════════
  console.log("Step 3: Deploying PlayerPassport...");
  const PassportFactory = await ethers.getContractFactory("PlayerPassport");
  const passport = await PassportFactory.deploy(
    await registry.getAddress(),
    deployer.address
  );
  await passport.waitForDeployment();
  console.log(`PlayerPassport deployed: ${await passport.getAddress()}\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 4: Deploy Tournament Implementation
  // ═══════════════════════════════════════════════════════════════════════
  console.log("Step 4: Deploying Tournament implementation...");
  const TournamentFactory = await ethers.getContractFactory("Tournament");
  const tournamentImpl = await TournamentFactory.deploy();
  await tournamentImpl.waitForDeployment();
  console.log(`Tournament implementation deployed: ${await tournamentImpl.getAddress()}\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 5: Deploy RewardDistributor
  // ═══════════════════════════════════════════════════════════════════════
  console.log("Step 5: Deploying RewardDistributor...");
  const DistributorFactory = await ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = await DistributorFactory.deploy(
    await p1Token.getAddress(),
    await passport.getAddress(),
    deployer.address
  );
  await rewardDistributor.waitForDeployment();
  console.log(`RewardDistributor deployed: ${await rewardDistributor.getAddress()}\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 6: Grant MINTER_ROLE to RewardDistributor
  // ═══════════════════════════════════════════════════════════════════════
  console.log("Step 6: Granting MINTER_ROLE to RewardDistributor...");
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  await p1Token.grantRole(MINTER_ROLE, await rewardDistributor.getAddress());
  console.log("MINTER_ROLE granted\n");

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 7: Wire PlayerPassport to RewardDistributor
  // ═══════════════════════════════════════════════════════════════════════
  console.log("Step 7: Wiring PlayerPassport to RewardDistributor...");
  await passport.setRewardDistributor(await rewardDistributor.getAddress());
  console.log("RewardDistributor set on PlayerPassport\n");

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 8: Set PASSPORT_ROLE on AchievementRegistry
  // ═══════════════════════════════════════════════════════════════════════
  console.log("Step 8: Setting PASSPORT_ROLE on AchievementRegistry...");
  await registry.setPassportRole(await passport.getAddress());
  console.log("PASSPORT_ROLE set\n");

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 9: Deploy TournamentFactory
  // ═══════════════════════════════════════════════════════════════════════
  console.log("Step 9: Deploying TournamentFactory...");
  const FactoryFactory = await ethers.getContractFactory("TournamentFactory");
  const factory = await FactoryFactory.deploy(
    await tournamentImpl.getAddress(),
    await passport.getAddress(),
    TREASURY_ADDRESS,
    VRF_SUBSCRIPTION_ID,
    vrfKeyHash,
    vrfCoordinator
  );
  await factory.waitForDeployment();
  console.log(`TournamentFactory deployed: ${await factory.getAddress()}\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 10: Grant FACTORY_ROLE to TournamentFactory
  // ═══════════════════════════════════════════════════════════════════════
  console.log("Step 10: Granting FACTORY_ROLE to TournamentFactory...");
  await passport.grantFactoryRole(await factory.getAddress());
  console.log("FACTORY_ROLE granted\n");

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 11: Deploy DemoGame (skip on mainnet to save gas)
  // ═══════════════════════════════════════════════════════════════════════
  let demoGameAddress = "0x0000000000000000000000000000000000000000";

  if (isMainnet) {
    console.log("Step 11: Skipping DemoGame on mainnet (not needed for production)\n");
  } else {
    console.log("Step 11: Deploying DemoGame...");
    const DemoGameFactory = await ethers.getContractFactory("DemoGame");
    const demoGame = await DemoGameFactory.deploy(
      await passport.getAddress(),
      await registry.getAddress()
    );
    await demoGame.waitForDeployment();
    demoGameAddress = await demoGame.getAddress();
    console.log(`DemoGame deployed: ${demoGameAddress}\n`);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 12: Approve and Configure DemoGame
    // ═══════════════════════════════════════════════════════════════════════
    console.log("Step 12: Approving DemoGame in AchievementRegistry...");
    await registry.approveGame(demoGameAddress);
    console.log("DemoGame approved");

    console.log("Granting GAME_ROLE to DemoGame in PlayerPassport...");
    await passport.grantGameRole(demoGameAddress);
    console.log("GAME_ROLE granted");

    console.log("Registering demo achievements...");
    try {
      const regTx = await demoGame.registerDemoAchievements({ gasLimit: 2000000 });
      await regTx.wait();
      console.log("Demo achievements registered\n");
    } catch (error: any) {
      console.warn("WARNING: registerDemoAchievements() failed.");
      console.warn("This is non-critical - achievements can be registered later.");
      console.warn(`Error: ${error.message?.slice(0, 200)}\n`);
      console.warn("To register achievements manually, run:");
      console.warn("  const demoGame = await ethers.getContractAt('DemoGame', '<address>');");
      console.warn("  await demoGame.registerDemoAchievements({ gasLimit: 2000000 });\n");
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 13: Deploy Leaderboard
  // ═══════════════════════════════════════════════════════════════════════
  console.log("Step 13: Deploying Leaderboard...");
  const LeaderboardFactory = await ethers.getContractFactory("Leaderboard");
  const leaderboard = await LeaderboardFactory.deploy(deployer.address);
  await leaderboard.waitForDeployment();
  console.log(`Leaderboard deployed: ${await leaderboard.getAddress()}\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 14: Deploy SocialGraph
  // ═══════════════════════════════════════════════════════════════════════
  console.log("Step 14: Deploying SocialGraph...");
  const SocialGraphFactory = await ethers.getContractFactory("SocialGraph");
  const socialGraph = await SocialGraphFactory.deploy();
  await socialGraph.waitForDeployment();
  console.log(`SocialGraph deployed: ${await socialGraph.getAddress()}\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 15: Deploy LFG
  // ═══════════════════════════════════════════════════════════════════════
  console.log("Step 15: Deploying LFG...");
  const LFGFactory = await ethers.getContractFactory("LFG");
  const lfg = await LFGFactory.deploy(await passport.getAddress());
  await lfg.waitForDeployment();
  console.log(`LFG deployed: ${await lfg.getAddress()}\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 16: Deploy PlayerReputation
  // ═══════════════════════════════════════════════════════════════════════
  console.log("Step 16: Deploying PlayerReputation...");
  const ReputationFactory = await ethers.getContractFactory("PlayerReputation");
  const playerReputation = await ReputationFactory.deploy(deployer.address);
  await playerReputation.waitForDeployment();
  console.log(`PlayerReputation deployed: ${await playerReputation.getAddress()}\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 17: Deploy ClubFactory
  // ═══════════════════════════════════════════════════════════════════════
  console.log("Step 17: Deploying ClubFactory...");
  const CLUB_CREATION_FEE = ethers.parseEther("0.01"); // 0.01 AVAX
  const ClubFactoryFactory = await ethers.getContractFactory("ClubFactory");
  const clubFactory = await ClubFactoryFactory.deploy(TREASURY_ADDRESS, CLUB_CREATION_FEE);
  await clubFactory.waitForDeployment();
  console.log(`ClubFactory deployed: ${await clubFactory.getAddress()}\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // Save deployment addresses
  // ═══════════════════════════════════════════════════════════════════════
  const deployment: DeploymentResult = {
    chainId: Number(network.chainId),
    networkName: network.name,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      P1Token: await p1Token.getAddress(),
      AchievementRegistry: await registry.getAddress(),
      PlayerPassport: await passport.getAddress(),
      Tournament: await tournamentImpl.getAddress(),
      TournamentFactory: await factory.getAddress(),
      RewardDistributor: await rewardDistributor.getAddress(),
      DemoGame: demoGameAddress,
      Leaderboard: await leaderboard.getAddress(),
      SocialGraph: await socialGraph.getAddress(),
      LFG: await lfg.getAddress(),
      PlayerReputation: await playerReputation.getAddress(),
      ClubFactory: await clubFactory.getAddress(),
    },
    vrfConfig: {
      coordinator: vrfCoordinator,
      keyHash: vrfKeyHash,
      subscriptionId: VRF_SUBSCRIPTION_ID,
    },
  };

  // Determine output file
  const outputDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = isLocalNetwork
    ? "localhost.json"
    : isMainnet
      ? "mainnet.json"
      : "fuji.json";
  const outputPath = path.join(outputDir, outputFile);

  fs.writeFileSync(outputPath, JSON.stringify(deployment, null, 2));

  console.log("========================================");
  console.log("Deployment Complete!");
  console.log("========================================");
  console.log(`Addresses saved to: ${outputPath}`);
  console.log("\nContract Addresses:");
  console.log(`  P1Token:           ${deployment.contracts.P1Token}`);
  console.log(`  AchievementRegistry: ${deployment.contracts.AchievementRegistry}`);
  console.log(`  PlayerPassport:     ${deployment.contracts.PlayerPassport}`);
  console.log(`  Tournament (impl):  ${deployment.contracts.Tournament}`);
  console.log(`  TournamentFactory:  ${deployment.contracts.TournamentFactory}`);
  console.log(`  RewardDistributor:  ${deployment.contracts.RewardDistributor}`);
  console.log(`  DemoGame:           ${deployment.contracts.DemoGame}`);
  console.log(`  Leaderboard:        ${deployment.contracts.Leaderboard}`);
  console.log(`  SocialGraph:        ${deployment.contracts.SocialGraph}`);
  console.log(`  LFG:                ${deployment.contracts.LFG}`);
  console.log(`  PlayerReputation:   ${deployment.contracts.PlayerReputation}`);
  console.log(`  ClubFactory:        ${deployment.contracts.ClubFactory}`);
  console.log("========================================");

  if (!isLocalNetwork) {
    if (isMainnet) {
      console.log("\nNext Steps (MAINNET):");
      console.log("1. Create VRF subscription at https://vrf.chain.link/avalanche");
      console.log("2. Fund subscription with 5-10 LINK");
      console.log(`3. Add TournamentFactory (${deployment.contracts.TournamentFactory}) as VRF consumer`);
      console.log("4. Update VRF_SUBSCRIPTION_ID in .env");
      console.log("5. Verify contracts on Snowtrace:");
      console.log("   npx hardhat run scripts/verify.ts --network mainnet");
    } else {
      console.log("\nNext Steps:");
      console.log("1. Create VRF subscription at https://vrf.chain.link/fuji");
      console.log("2. Fund subscription with LINK from https://faucets.chain.link/fuji");
      console.log(`3. Add TournamentFactory (${deployment.contracts.TournamentFactory}) as VRF consumer`);
      console.log("4. Update VRF_SUBSCRIPTION_ID in .env and redeploy factory if needed");
      console.log("5. Run verification script: npm run verify:fuji");
    }
  }

  return deployment;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
