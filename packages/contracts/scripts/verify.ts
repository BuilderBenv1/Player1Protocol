import { run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Player1 Protocol - Contract Verification Script
 *
 * Verifies all deployed contracts on Snowtrace.
 * Run with: npx hardhat run scripts/verify.ts --network fuji
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
  deployer: string;
  vrfConfig: {
    coordinator: string;
    keyHash: string;
    subscriptionId: string;
  };
}

async function verifyContract(
  address: string,
  constructorArguments: unknown[],
  contractName: string
) {
  console.log(`Verifying ${contractName} at ${address}...`);

  try {
    await run("verify:verify", {
      address,
      constructorArguments,
    });
    console.log(`${contractName} verified successfully!\n`);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Already Verified")) {
      console.log(`${contractName} already verified\n`);
    } else {
      console.error(`Failed to verify ${contractName}:`, error);
    }
  }
}

async function main() {
  console.log("========================================");
  console.log("Player1 Protocol - Verification Script");
  console.log("========================================\n");

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "..", "deployments", "fuji.json");

  if (!fs.existsSync(deploymentPath)) {
    throw new Error("Deployment file not found. Run deploy script first.");
  }

  const deployment: Deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  console.log("Loaded deployment from:", deploymentPath);
  console.log("Deployer:", deployment.deployer);
  console.log("\n");

  // Verify P1Token
  await verifyContract(
    deployment.contracts.P1Token,
    [deployment.deployer],
    "P1Token"
  );

  // Verify AchievementRegistry
  await verifyContract(
    deployment.contracts.AchievementRegistry,
    [deployment.deployer],
    "AchievementRegistry"
  );

  // Verify PlayerPassport
  await verifyContract(
    deployment.contracts.PlayerPassport,
    [deployment.contracts.AchievementRegistry, deployment.deployer],
    "PlayerPassport"
  );

  // Verify Tournament (implementation)
  await verifyContract(
    deployment.contracts.Tournament,
    [],
    "Tournament"
  );

  // Verify RewardDistributor
  await verifyContract(
    deployment.contracts.RewardDistributor,
    [deployment.contracts.P1Token, deployment.contracts.PlayerPassport],
    "RewardDistributor"
  );

  // Verify TournamentFactory
  // Get treasury address from env or use deployer
  const treasuryAddress = process.env.TREASURY_ADDRESS || deployment.deployer;

  await verifyContract(
    deployment.contracts.TournamentFactory,
    [
      deployment.contracts.Tournament,
      deployment.contracts.PlayerPassport,
      treasuryAddress,
      deployment.vrfConfig.subscriptionId,
      deployment.vrfConfig.keyHash,
      deployment.vrfConfig.coordinator,
    ],
    "TournamentFactory"
  );

  // Verify DemoGame
  await verifyContract(
    deployment.contracts.DemoGame,
    [deployment.contracts.PlayerPassport, deployment.contracts.AchievementRegistry],
    "DemoGame"
  );

  console.log("========================================");
  console.log("Verification Complete!");
  console.log("========================================");
  console.log("\nView contracts on Snowtrace:");
  console.log(`https://testnet.snowtrace.io/address/${deployment.contracts.P1Token}`);
  console.log(`https://testnet.snowtrace.io/address/${deployment.contracts.PlayerPassport}`);
  console.log(`https://testnet.snowtrace.io/address/${deployment.contracts.TournamentFactory}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
