# GameScore Protocol - Complete Build Plan

## Executive Summary

Building a three-module competitive infrastructure layer for Avalanche:
1. **Tournament Engine** - Trustless tournament contracts with VRF seeding
2. **Player Passport** - Soulbound wallet-linked reputation (Gamerscore)
3. **Achievement Rewards** - GSP token earned through competitive play

**Target**: Avalanche Build Games competition ($1M prize pool, finals early March 2026)

---

## Phase 1: Project Scaffolding

### 1.1 Monorepo Structure

Create the following directory structure:

```
gamescore-protocol/
├── packages/
│   ├── contracts/
│   ├── frontend/
│   └── sdk/
├── package.json
├── turbo.json
├── .gitignore
├── .env.example
└── README.md
```

### 1.2 Root package.json

```json
{
  "name": "gamescore-protocol",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "dev": "turbo run dev"
  },
  "devDependencies": {
    "turbo": "2.3.3"
  }
}
```

### 1.3 packages/contracts/package.json

```json
{
  "name": "@gamescore/contracts",
  "version": "0.1.0",
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test",
    "coverage": "hardhat coverage",
    "deploy:fuji": "hardhat run scripts/deploy.ts --network fuji",
    "verify:fuji": "hardhat run scripts/verify.ts --network fuji"
  },
  "devDependencies": {
    "@chainlink/contracts": "1.3.0",
    "@nomicfoundation/hardhat-chai-matchers": "2.0.8",
    "@nomicfoundation/hardhat-ethers": "3.0.8",
    "@nomicfoundation/hardhat-verify": "2.0.12",
    "@openzeppelin/contracts": "5.1.0",
    "@typechain/ethers-v6": "0.5.1",
    "@typechain/hardhat": "9.1.0",
    "@types/chai": "4.3.20",
    "@types/mocha": "10.0.10",
    "@types/node": "22.10.5",
    "chai": "4.5.0",
    "dotenv": "16.4.7",
    "ethers": "6.13.4",
    "hardhat": "2.22.17",
    "hardhat-gas-reporter": "2.2.2",
    "solidity-coverage": "0.8.14",
    "ts-node": "10.9.2",
    "typechain": "8.3.2",
    "typescript": "5.7.2"
  }
}
```

### 1.4 packages/contracts/hardhat.config.ts

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: {
      avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY || ""
    }
  },
  gasReporter: {
    enabled: true,
    currency: "USD"
  }
};

export default config;
```

### 1.5 packages/frontend/package.json

```json
{
  "name": "@gamescore/frontend",
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@rainbow-me/rainbowkit": "2.2.2",
    "@tanstack/react-query": "5.62.8",
    "framer-motion": "11.15.0",
    "next": "14.2.21",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "recharts": "2.15.0",
    "viem": "2.21.54",
    "wagmi": "2.14.6"
  },
  "devDependencies": {
    "@types/node": "22.10.5",
    "@types/react": "18.3.18",
    "@types/react-dom": "18.3.5",
    "autoprefixer": "10.4.20",
    "postcss": "8.4.49",
    "tailwindcss": "3.4.17",
    "typescript": "5.7.2"
  }
}
```

### 1.6 packages/sdk/package.json

```json
{
  "name": "@gamescore/sdk",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "viem": "2.21.54"
  },
  "devDependencies": {
    "@types/node": "22.10.5",
    "typescript": "5.7.2"
  }
}
```

### 1.7 Environment Variables (.env.example)

```
# Deployer private key (without 0x prefix)
PRIVATE_KEY=

# Snowtrace API key for contract verification
SNOWTRACE_API_KEY=

# Chainlink VRF Subscription ID (get from vrf.chain.link/fuji)
VRF_SUBSCRIPTION_ID=

# Protocol treasury address
TREASURY_ADDRESS=
```

### 1.8 Files to Create

| File | Purpose |
|------|---------|
| `package.json` | Root workspace config |
| `turbo.json` | Turborepo pipeline config |
| `.gitignore` | Git ignore patterns |
| `.env.example` | Environment template |
| `packages/contracts/package.json` | Contracts dependencies |
| `packages/contracts/hardhat.config.ts` | Hardhat configuration |
| `packages/contracts/tsconfig.json` | TypeScript config |
| `packages/frontend/package.json` | Frontend dependencies |
| `packages/frontend/next.config.js` | Next.js config |
| `packages/frontend/tailwind.config.ts` | Tailwind config |
| `packages/frontend/tsconfig.json` | TypeScript config |
| `packages/sdk/package.json` | SDK dependencies |
| `packages/sdk/tsconfig.json` | TypeScript config |

---

## Phase 2: Contracts - Foundation (GSPToken + AchievementRegistry)

### 2.1 GSPToken.sol

**Path**: `packages/contracts/contracts/core/GSPToken.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract GSPToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(address admin) ERC20("GameScore Points", "GSP") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
```

**Functions**:
- `constructor(address admin)` - Sets admin, grants MINTER_ROLE
- `mint(address to, uint256 amount)` - Only MINTER_ROLE
- `burn(uint256 amount)` - Any holder burns their own

**Tests** (`packages/contracts/test/GSPToken.test.ts`):
1. Deployment sets correct name "GameScore Points" and symbol "GSP"
2. Admin has DEFAULT_ADMIN_ROLE
3. Admin has MINTER_ROLE
4. Admin can grant MINTER_ROLE to another address
5. Minter can mint tokens to any address
6. Non-minter cannot mint (reverts with AccessControlUnauthorizedAccount)
7. Any holder can burn their own tokens
8. Cannot burn more than balance
9. Standard ERC-20 transfer works
10. Standard ERC-20 approve/transferFrom works

### 2.2 AchievementRegistry.sol

**Path**: `packages/contracts/contracts/core/AchievementRegistry.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract AchievementRegistry is AccessControl {
    bytes32 public constant GAME_ADMIN_ROLE = keccak256("GAME_ADMIN_ROLE");
    bytes32 public constant PASSPORT_ROLE = keccak256("PASSPORT_ROLE");

    enum Rarity { Common, Rare, Legendary }

    struct Achievement {
        uint256 id;
        address gameContract;
        string name;
        string description;
        Rarity rarity;
        uint256 pointValue;
        uint256 gspReward;
        uint256 totalUnlocks;
        bool active;
    }

    uint256 public nextAchievementId = 1;
    mapping(uint256 => Achievement) public achievements;
    mapping(address => uint256[]) public gameAchievements;
    mapping(address => bool) public approvedGames;

    event GameApproved(address indexed gameContract);
    event GameRevoked(address indexed gameContract);
    event AchievementRegistered(uint256 indexed id, address indexed gameContract, string name, Rarity rarity);
    event AchievementDeactivated(uint256 indexed id);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function approveGame(address gameContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        approvedGames[gameContract] = true;
        _grantRole(GAME_ADMIN_ROLE, gameContract);
        emit GameApproved(gameContract);
    }

    function revokeGame(address gameContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        approvedGames[gameContract] = false;
        _revokeRole(GAME_ADMIN_ROLE, gameContract);
        emit GameRevoked(gameContract);
    }

    function registerAchievement(
        string calldata name,
        string calldata description,
        Rarity rarity
    ) external onlyRole(GAME_ADMIN_ROLE) returns (uint256) {
        uint256 pointValue;
        uint256 gspReward;

        if (rarity == Rarity.Common) {
            pointValue = 5;
            gspReward = 5 ether;
        } else if (rarity == Rarity.Rare) {
            pointValue = 25;
            gspReward = 25 ether;
        } else {
            pointValue = 100;
            gspReward = 100 ether;
        }

        uint256 id = nextAchievementId++;
        achievements[id] = Achievement({
            id: id,
            gameContract: msg.sender,
            name: name,
            description: description,
            rarity: rarity,
            pointValue: pointValue,
            gspReward: gspReward,
            totalUnlocks: 0,
            active: true
        });

        gameAchievements[msg.sender].push(id);
        emit AchievementRegistered(id, msg.sender, name, rarity);
        return id;
    }

    function deactivateAchievement(uint256 achievementId) external {
        Achievement storage achievement = achievements[achievementId];
        require(achievement.gameContract == msg.sender, "Not achievement owner");
        achievement.active = false;
        emit AchievementDeactivated(achievementId);
    }

    function incrementUnlockCount(uint256 achievementId) external onlyRole(PASSPORT_ROLE) {
        achievements[achievementId].totalUnlocks++;
    }

    function setPassportRole(address passport) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(PASSPORT_ROLE, passport);
    }

    function getAchievement(uint256 id) external view returns (Achievement memory) {
        return achievements[id];
    }

    function getGameAchievements(address gameContract) external view returns (uint256[] memory) {
        return gameAchievements[gameContract];
    }

    function getAchievementCount() external view returns (uint256) {
        return nextAchievementId - 1;
    }
}
```

**Tests** (`packages/contracts/test/AchievementRegistry.test.ts`):
1. Only admin can approve games
2. Only admin can revoke games
3. Approved game receives GAME_ADMIN_ROLE
4. Only approved games can register achievements
5. Common rarity maps to 5 points, 5 GSP
6. Rare rarity maps to 25 points, 25 GSP
7. Legendary rarity maps to 100 points, 100 GSP
8. Achievement IDs auto-increment starting from 1
9. Only registering game can deactivate its own achievement
10. Cannot deactivate another game's achievement
11. getGameAchievements returns correct array
12. incrementUnlockCount only callable by PASSPORT_ROLE
13. Unapproved address cannot register achievements

---

## Phase 3: Contracts - Core (PlayerPassport + RewardDistributor)

### 3.1 IRewardDistributor Interface

**Path**: `packages/contracts/contracts/interfaces/IRewardDistributor.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IRewardDistributor {
    function distributeTournamentReward(
        address player,
        uint8 placement,
        uint256 entryFee,
        uint256 currentStreak
    ) external;

    function distributeAchievementReward(
        address player,
        uint256 gspAmount
    ) external;

    function checkAndDistributeMilestone(
        address player,
        uint256 compositeScore
    ) external;
}
```

### 3.2 PlayerPassport.sol

**Path**: `packages/contracts/contracts/core/PlayerPassport.sol`

**Key Structs**:
```solidity
struct PlayerProfile {
    uint256 compositeScore;
    uint256 totalTournaments;
    uint256 totalWins;
    uint256 totalTopThree;
    uint256 totalPrizeMoney;
    uint256 currentWinStreak;
    uint256 longestWinStreak;
    uint256 gspEarned;
    bool exists;
}

struct TournamentResult {
    address tournamentContract;
    uint8 placement;
    uint256 prizeMoney;
    uint256 pointsEarned;
    uint256 timestamp;
}

struct AchievementUnlock {
    uint256 achievementId;
    address gameContract;
    uint256 timestamp;
}

enum EntryFeeTier { Free, Low, Medium, High }
```

**Scoring Constants**:
```solidity
uint256 constant TOURNAMENT_WIN_BASE = 100;
uint256 constant TOURNAMENT_TOP3_BASE = 50;
uint256 constant TOURNAMENT_PARTICIPATION = 10;
uint256 constant WIN_STREAK_BONUS = 20;
uint256 constant TIER_FREE_MULT = 100;   // x1.0
uint256 constant TIER_LOW_MULT = 150;    // x1.5
uint256 constant TIER_MED_MULT = 200;    // x2.0
uint256 constant TIER_HIGH_MULT = 300;   // x3.0
```

**Key Functions**:
- `reportTournamentResult(address player, uint8 placement, uint256 prizeMoney, uint256 entryFee, address gameContract)` - REPORTER_ROLE only
- `attestAchievement(address player, uint256 achievementId)` - GAME_ROLE only
- `getProfile(address player)` - View, returns PlayerProfile
- `getCompositeScore(address player)` - View, gas-cheap single uint256
- `getGameScore(address player, address gameContract)` - View
- `getTournamentHistory(address player)` - View
- `getTournamentHistoryPaginated(address player, uint256 offset, uint256 limit)` - View
- `getAchievementHistory(address player)` - View
- `hasPlayerAchievement(address player, uint256 achievementId)` - View
- `getPlayerStats(address player)` - View, returns tuple

**Tests** (`packages/contracts/test/PlayerPassport.test.ts`):
1. Passport auto-creates on first tournament result
2. Passport auto-creates on first achievement attestation
3. Correct point calculation: 1st place = 100 * tierMultiplier
4. Correct point calculation: 2nd/3rd = 50 * tierMultiplier
5. Correct point calculation: 4th+ = 10 (no multiplier)
6. Free tier (0 AVAX): multiplier x1
7. Low tier (0 < fee <= 1 AVAX): multiplier x1.5
8. Medium tier (1 < fee <= 10 AVAX): multiplier x2
9. High tier (> 10 AVAX): multiplier x3
10. Win streak increments on consecutive wins
11. Win streak resets on non-win placement
12. Win streak bonus (20 points) applies after 3+ consecutive wins
13. Longest win streak updates correctly
14. Achievement can only be attested once per player
15. Only GAME_ROLE can attest achievements
16. Only REPORTER_ROLE can report tournament results
17. Per-game scores update independently
18. Paginated history returns correct slices
19. getPlayerStats calculates win rate correctly
20. totalPassports counter increments on new passports
21. Prize money accumulates correctly

### 3.3 RewardDistributor.sol

**Path**: `packages/contracts/contracts/core/RewardDistributor.sol`

**State**:
```solidity
GSPToken public gspToken;
address public playerPassport;

uint256 public tournamentWinGSP = 50 ether;
uint256 public tournamentTop3GSP = 25 ether;
uint256 public tournamentParticipationGSP = 5 ether;
uint256 public streakBonusGSP = 10 ether;

uint256[] public milestoneThresholds = [1000, 5000, 10000, 50000];
uint256[] public milestoneRewards = [100 ether, 500 ether, 1000 ether, 5000 ether];
mapping(address => mapping(uint256 => bool)) public milestoneClaimed;
```

**Functions**:
- `distributeTournamentReward(address player, uint8 placement, uint256 entryFee, uint256 currentStreak)` - DISTRIBUTOR_ROLE
- `distributeAchievementReward(address player, uint256 gspAmount)` - DISTRIBUTOR_ROLE
- `checkAndDistributeMilestone(address player, uint256 compositeScore)` - DISTRIBUTOR_ROLE
- `setTournamentRewards(uint256 win, uint256 top3, uint256 participation)` - Admin
- `setStreakBonus(uint256 bonus)` - Admin
- `setMilestones(uint256[] thresholds, uint256[] rewards)` - Admin

**Tests** (`packages/contracts/test/RewardDistributor.test.ts`):
1. Correct GSP for 1st place (50 GSP * tier multiplier)
2. Correct GSP for 2nd-3rd (25 GSP * tier multiplier)
3. Correct GSP for participation (5 GSP, no multiplier)
4. Streak bonus (10 GSP) only after 3+ consecutive wins
5. Achievement rewards mint exact gspAmount
6. Milestone at 1000 points = 100 GSP
7. Milestone at 5000 points = 500 GSP
8. Milestone at 10000 points = 1000 GSP
9. Milestone at 50000 points = 5000 GSP
10. Cannot claim same milestone twice
11. Only DISTRIBUTOR_ROLE can trigger distribution
12. Admin can update emission rates

---

## Phase 4: Contracts - Tournament System

### 4.1 MockVRFCoordinator.sol

**Path**: `packages/contracts/contracts/mocks/MockVRFCoordinator.sol`

For testing without Chainlink:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

contract MockVRFCoordinator {
    uint256 public requestCounter;

    function requestRandomWords(
        bytes32, // keyHash
        uint256, // subId
        uint16,  // minimumRequestConfirmations
        uint32,  // callbackGasLimit
        uint32 numWords
    ) external returns (uint256 requestId) {
        requestId = ++requestCounter;
    }

    function fulfillRandomWordsWithOverride(
        uint256 requestId,
        address consumer,
        uint256[] memory randomWords
    ) external {
        // Call the consumer's fulfillRandomWords
        (bool success,) = consumer.call(
            abi.encodeWithSignature(
                "rawFulfillRandomWords(uint256,uint256[])",
                requestId,
                randomWords
            )
        );
        require(success, "Callback failed");
    }
}
```

### 4.2 Tournament.sol

**Path**: `packages/contracts/contracts/core/Tournament.sol`

**Enums**:
```solidity
enum TournamentStatus { Registration, Active, Completed, Cancelled, Finalized }
enum MatchStatus { Pending, Reported, Confirmed, Disputed }
```

**Structs**:
```solidity
struct TournamentConfig {
    address organizer;
    address gameContract;
    uint256 entryFee;
    uint256 maxPlayers;
    uint256[] prizeSplitBps;
    uint256 protocolFeeBps;
    uint256 registrationDeadline;
    uint256 disputeWindowSeconds;
    string name;
    string description;
}

struct Match {
    uint256 matchId;
    uint256 round;
    address player1;
    address player2;
    address winner;
    address reporter;
    uint256 reportedAt;
    MatchStatus status;
}

struct BracketSlot {
    address player;
    uint256 seed;
}
```

**Key Functions**:
- `initialize(TournamentConfig, address playerPassport, address treasury, address factory, uint256 vrfSubId, bytes32 keyHash)` - Called by factory
- `register()` - Payable, exact entry fee required
- `generateBracket()` - Auto on full, or manual by organizer after deadline
- `fulfillRandomWords(uint256 requestId, uint256[] randomWords)` - VRF callback
- `reportResult(uint256 matchId, address winner)` - Game contract or organizer
- `confirmResult(uint256 matchId)` - Anyone after dispute window
- `disputeResult(uint256 matchId)` - Losing player only
- `resolveDispute(uint256 matchId, address winner)` - Organizer only
- `claimPrize()` - NonReentrant, pull-based
- `cancelTournament()` - Organizer, registration phase only
- `claimRefund()` - NonReentrant, cancelled tournaments only

**Security**:
- ReentrancyGuard on claimPrize() and claimRefund()
- Checks-effects-interactions pattern
- Exact entry fee match (==, not >=)
- Pull-based prize distribution
- Dispute window enforced on-chain

**Tests** (`packages/contracts/test/Tournament.test.ts`):
1. Registration: player added, isRegistered true, prizePool updated
2. Registration: rejects after deadline
3. Registration: rejects when full
4. Registration: rejects duplicate registration
5. Registration: rejects wrong entry fee amount (too low)
6. Registration: rejects wrong entry fee amount (too high)
7. Auto-triggers bracket generation when full
8. VRF callback seeds bracket correctly
9. Bracket order is deterministic given same random seed
10. Result reporting only by game contract
11. Result reporting only by organizer
12. Non-authorized address cannot report results
13. Dispute window: can dispute within window
14. Dispute window: cannot dispute after window
15. Only losing player can dispute
16. Organizer can resolve dispute
17. Result confirmation after dispute window passes
18. Round advancement generates correct next-round matches
19. Final match triggers settlement
20. Prize calculation matches prizeSplitBps
21. Protocol fee sent to treasury
22. Pull-based prize claim transfers correct amount
23. Cannot claim twice
24. Cannot claim if no prize owed
25. Cancellation only during registration phase
26. Cancellation fails if tournament active
27. Refund returns exact entry fee
28. ReentrancyGuard prevents re-entrancy on claim
29. ReentrancyGuard prevents re-entrancy on refund
30. Passport reporting called with correct data

### 4.3 TournamentFactory.sol

**Path**: `packages/contracts/contracts/core/TournamentFactory.sol`

Uses OpenZeppelin Clones library for EIP-1167 minimal proxies.

**State**:
```solidity
address public tournamentImplementation;
address public playerPassport;
address public protocolTreasury;
uint256 public protocolFeeBps = 300; // 3%
uint256 public defaultDisputeWindowSeconds = 1800; // 30 min
address[] public allTournaments;
mapping(address => address[]) public organizerTournaments;
mapping(address => bool) public isTournament;
uint256 public vrfSubscriptionId;
bytes32 public vrfKeyHash;
```

**Functions**:
- `createTournament(string name, string description, address gameContract, uint256 entryFee, uint256 maxPlayers, uint256[] prizeSplitBps, uint256 registrationDeadline, uint256 disputeWindowSeconds)` - Returns tournament address
- `getTournaments()` - View
- `getTournamentCount()` - View
- `getOrganizerTournaments(address)` - View
- `getActiveTournaments()` - View (gas-heavy, OK for MVP)
- `setProtocolFee(uint256)` - Admin, max 1000 (10%)
- `setDefaultDisputeWindow(uint256)` - Admin
- `setProtocolTreasury(address)` - Admin
- `updateImplementation(address)` - Admin

**Validations**:
- maxPlayers is power of 2: `maxPlayers != 0 && (maxPlayers & (maxPlayers - 1)) == 0`
- prizeSplitBps sum + protocolFeeBps == 10000
- registrationDeadline > block.timestamp
- prizeSplitBps.length <= maxPlayers

**Tests** (`packages/contracts/test/TournamentFactory.test.ts`):
1. Tournament creation deploys working clone
2. Clone is properly initialized
3. Clone can register players
4. maxPlayers must be power of 2 (rejects 3, 5, 6, 7, etc.)
5. Accepts valid maxPlayers (4, 8, 16, 32, 64)
6. prizeSplitBps must sum correctly with protocol fee
7. Rejects invalid prize split sum
8. organizerTournaments tracks correctly
9. allTournaments includes all deployed tournaments
10. isTournament returns true for deployed tournaments
11. isTournament returns false for random addresses
12. Protocol fee update enforces max cap (10%)
13. Only admin can update protocol fee
14. Only admin can update treasury
15. Multiple independent tournaments can be created

### 4.4 Integration Test

**Path**: `packages/contracts/test/integration/FullFlow.test.ts`

Full lifecycle test:
1. Deploy all contracts in correct order
2. Wire contracts together
3. Register demo game
4. Create demo achievements
5. Create tournament via factory
6. Register 4 players
7. VRF seeds bracket
8. Report all match results
9. Confirm results after dispute windows
10. Tournament completes
11. Verify passport updates for all players
12. Verify GSP minting for all players
13. Winners claim prizes
14. Verify treasury received protocol fee
15. Attest achievement to winner
16. Verify achievement recorded in passport
17. Verify achievement GSP minted

---

## Phase 5: Deployment

### 5.1 Deployment Script

**Path**: `packages/contracts/scripts/deploy.ts`

**Deployment Order**:
```typescript
async function main() {
  // Step 1: Deploy GSPToken
  const GSPToken = await ethers.getContractFactory("GSPToken");
  const gspToken = await GSPToken.deploy(deployer.address);

  // Step 2: Deploy AchievementRegistry
  const AchievementRegistry = await ethers.getContractFactory("AchievementRegistry");
  const achievementRegistry = await AchievementRegistry.deploy(deployer.address);

  // Step 3: Deploy PlayerPassport
  const PlayerPassport = await ethers.getContractFactory("PlayerPassport");
  const playerPassport = await PlayerPassport.deploy(
    achievementRegistry.target,
    deployer.address
  );

  // Step 4: Deploy Tournament implementation
  const Tournament = await ethers.getContractFactory("Tournament");
  const tournamentImpl = await Tournament.deploy();

  // Step 5: Deploy RewardDistributor
  const RewardDistributor = await ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = await RewardDistributor.deploy(
    gspToken.target,
    playerPassport.target
  );

  // Step 6: Grant MINTER_ROLE to RewardDistributor
  await gspToken.grantRole(MINTER_ROLE, rewardDistributor.target);

  // Step 7: Wire PlayerPassport to RewardDistributor
  await playerPassport.setRewardDistributor(rewardDistributor.target);

  // Step 8: Set PASSPORT_ROLE on AchievementRegistry
  await achievementRegistry.setPassportRole(playerPassport.target);

  // Step 9: Deploy TournamentFactory
  const TournamentFactory = await ethers.getContractFactory("TournamentFactory");
  const tournamentFactory = await TournamentFactory.deploy(
    tournamentImpl.target,
    playerPassport.target,
    TREASURY_ADDRESS,
    VRF_SUBSCRIPTION_ID,
    VRF_KEY_HASH
  );

  // Step 10: Grant REPORTER_ROLE granting permission to factory
  await playerPassport.grantFactoryRole(tournamentFactory.target);

  // Save addresses to deployments/fuji.json
}
```

### 5.2 Chainlink VRF Configuration

**Fuji Testnet Values**:
- VRF Coordinator: `0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE`
- Key Hash (300 gwei): `0xc799bd1e3bd4d1a41cd4968997a4e03dfd2a3c7c04b695881138580163f42887`
- LINK Token: `0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846`

**Setup Steps**:
1. Go to https://vrf.chain.link/fuji
2. Create new subscription
3. Fund with LINK from https://faucets.chain.link/fuji
4. Add TournamentFactory address as consumer

### 5.3 Verification Script

**Path**: `packages/contracts/scripts/verify.ts`

```typescript
async function main() {
  const deployment = require("../deployments/fuji.json");

  // Verify each contract with constructor args
  await hre.run("verify:verify", {
    address: deployment.GSPToken,
    constructorArguments: [deployment.deployer]
  });

  // ... repeat for each contract
}
```

### 5.4 Deployment Addresses File

**Path**: `packages/contracts/deployments/fuji.json`

```json
{
  "chainId": 43113,
  "deployer": "",
  "GSPToken": "",
  "AchievementRegistry": "",
  "PlayerPassport": "",
  "Tournament": "",
  "TournamentFactory": "",
  "RewardDistributor": "",
  "DemoGame": ""
}
```

---

## Phase 6: SDK

### 6.1 Directory Structure

```
packages/sdk/src/
├── index.ts
├── contracts/
│   ├── abis/
│   │   ├── GSPToken.json
│   │   ├── AchievementRegistry.json
│   │   ├── PlayerPassport.json
│   │   ├── Tournament.json
│   │   ├── TournamentFactory.json
│   │   └── RewardDistributor.json
│   └── addresses.ts
├── functions/
│   ├── tournament.ts
│   ├── passport.ts
│   ├── achievements.ts
│   └── rewards.ts
├── events/
│   └── listeners.ts
└── types/
    └── index.ts
```

### 6.2 Type Definitions

**Path**: `packages/sdk/src/types/index.ts`

```typescript
export interface PlayerProfile {
  compositeScore: bigint;
  totalTournaments: bigint;
  totalWins: bigint;
  totalTopThree: bigint;
  totalPrizeMoney: bigint;
  currentWinStreak: bigint;
  longestWinStreak: bigint;
  gspEarned: bigint;
  exists: boolean;
}

export interface TournamentResult {
  tournamentContract: `0x${string}`;
  placement: number;
  prizeMoney: bigint;
  pointsEarned: bigint;
  timestamp: bigint;
}

export interface AchievementUnlock {
  achievementId: bigint;
  gameContract: `0x${string}`;
  timestamp: bigint;
}

export interface Achievement {
  id: bigint;
  gameContract: `0x${string}`;
  name: string;
  description: string;
  rarity: 0 | 1 | 2; // Common, Rare, Legendary
  pointValue: bigint;
  gspReward: bigint;
  totalUnlocks: bigint;
  active: boolean;
}

export interface TournamentInfo {
  address: `0x${string}`;
  name: string;
  description: string;
  gameContract: `0x${string}`;
  organizer: `0x${string}`;
  entryFee: bigint;
  maxPlayers: bigint;
  playerCount: bigint;
  prizePool: bigint;
  status: number;
  registrationDeadline: bigint;
  bracketGenerated: boolean;
}

export interface Match {
  matchId: bigint;
  round: bigint;
  player1: `0x${string}`;
  player2: `0x${string}`;
  winner: `0x${string}`;
  reporter: `0x${string}`;
  reportedAt: bigint;
  status: number;
}
```

### 6.3 SDK Functions

**Tournament Functions** (`packages/sdk/src/functions/tournament.ts`):
```typescript
export async function reportMatchResult(config: {
  tournamentAddress: `0x${string}`;
  matchId: number;
  winner: `0x${string}`;
  walletClient: WalletClient;
}): Promise<Hash>

export async function getTournamentInfo(
  tournamentAddress: `0x${string}`,
  publicClient: PublicClient
): Promise<TournamentInfo>

export async function getActiveTournaments(
  publicClient: PublicClient
): Promise<TournamentInfo[]>

export async function getBracket(
  tournamentAddress: `0x${string}`,
  publicClient: PublicClient
): Promise<BracketSlot[]>

export async function getMatches(
  tournamentAddress: `0x${string}`,
  publicClient: PublicClient
): Promise<Match[]>
```

**Passport Functions** (`packages/sdk/src/functions/passport.ts`):
```typescript
export async function getPlayerScore(
  playerAddress: `0x${string}`,
  publicClient: PublicClient
): Promise<bigint>

export async function getPlayerProfile(
  playerAddress: `0x${string}`,
  publicClient: PublicClient
): Promise<PlayerProfile>

export async function getTournamentHistory(
  playerAddress: `0x${string}`,
  publicClient: PublicClient
): Promise<TournamentResult[]>

export async function getPlayerAchievements(
  playerAddress: `0x${string}`,
  publicClient: PublicClient
): Promise<AchievementUnlock[]>

export async function getPlayerStats(
  playerAddress: `0x${string}`,
  publicClient: PublicClient
): Promise<{
  compositeScore: bigint;
  totalTournaments: bigint;
  totalWins: bigint;
  winRate: bigint;
  totalPrizeMoney: bigint;
  longestWinStreak: bigint;
  gspEarned: bigint;
}>
```

**Achievement Functions** (`packages/sdk/src/functions/achievements.ts`):
```typescript
export async function attestAchievement(config: {
  playerAddress: `0x${string}`;
  achievementId: number;
  walletClient: WalletClient;
}): Promise<Hash>

export async function getAchievement(
  achievementId: number,
  publicClient: PublicClient
): Promise<Achievement>

export async function getGameAchievements(
  gameContract: `0x${string}`,
  publicClient: PublicClient
): Promise<Achievement[]>
```

**Event Listeners** (`packages/sdk/src/events/listeners.ts`):
```typescript
export function onScoreUpdated(
  callback: (player: `0x${string}`, newScore: bigint) => void,
  publicClient: PublicClient
): () => void

export function onAchievementUnlocked(
  callback: (player: `0x${string}`, achievementId: bigint) => void,
  publicClient: PublicClient
): () => void

export function onTournamentCreated(
  callback: (tournament: `0x${string}`, name: string) => void,
  publicClient: PublicClient
): () => void

export function onTournamentCompleted(
  callback: (tournament: `0x${string}`, winner: `0x${string}`, prizePool: bigint) => void,
  publicClient: PublicClient
): () => void
```

---

## Phase 7: Frontend - Shell & Wallet

### 7.1 App Layout

**Path**: `packages/frontend/src/app/layout.tsx`

```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0A0A0F] text-white min-h-screen">
        <Providers>
          <Header />
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
          <Footer />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
```

### 7.2 Wagmi Configuration

**Path**: `packages/frontend/src/lib/wagmiConfig.ts`

```typescript
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { avalancheFuji } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'GameScore Protocol',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
  chains: [avalancheFuji],
  ssr: true,
});
```

### 7.3 Shared Components

| Component | Path | Purpose |
|-----------|------|---------|
| `Header.tsx` | `components/layout/` | Nav, wallet button, GSP balance |
| `Footer.tsx` | `components/layout/` | Protocol stats, links |
| `Navigation.tsx` | `components/layout/` | Nav links |
| `WalletButton.tsx` | `components/shared/` | Connect/disconnect, shows address |
| `CountdownTimer.tsx` | `components/shared/` | Tournament deadlines |
| `LoadingState.tsx` | `components/shared/` | Skeleton loaders |
| `ErrorState.tsx` | `components/shared/` | Error with retry |
| `Toast.tsx` | `components/shared/` | Transaction notifications |

### 7.4 Tailwind Configuration

**Path**: `packages/frontend/tailwind.config.ts`

```typescript
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        avax: {
          red: '#E84142',
          dark: '#0A0A0F',
          card: '#1A1A2E',
          text: '#888899',
        },
        rarity: {
          common: '#9CA3AF',
          rare: '#7C3AED',
          legendary: '#F59E0B',
        },
      },
    },
  },
  plugins: [],
};
```

---

## Phase 8: Frontend - Tournament Pages

### 8.1 Tournament Hub

**Path**: `packages/frontend/src/app/tournaments/page.tsx`

**Features**:
- Tabs: All, Upcoming, Active, Completed
- Filters: by game, entry fee tier, player count
- Sort: creation date, entry fee, prize pool
- Tournament cards grid
- "Create Tournament" button (top right)

**Tournament Card Data**:
- Name
- Game badge
- Entry fee (AVAX + USD estimate)
- Player count / max
- Prize pool
- Time until registration closes
- Status badge (color coded)

### 8.2 Create Tournament

**Path**: `packages/frontend/src/app/tournaments/create/page.tsx`

**Form Fields**:
1. Tournament Name (text, required)
2. Description (textarea)
3. Game (dropdown from AchievementRegistry.approvedGames)
4. Entry Fee (number in AVAX, shows USD estimate)
5. Max Players (dropdown: 4, 8, 16, 32, 64)
6. Prize Split (presets + custom):
   - "Winner Takes All" [9700]
   - "Top 2" [6500, 3200]
   - "Top 3" [5000, 3000, 1700]
   - "Custom" (dynamic inputs)
7. Registration Deadline (datetime picker)
8. Dispute Window (dropdown: 30min, 1h, 6h, 24h)

**Preview Card**: Live preview of how tournament will appear

**Validation**:
- Prize split sums to 9700 (97%)
- Deadline in future
- Name not empty

### 8.3 Tournament Detail

**Path**: `packages/frontend/src/app/tournaments/[address]/page.tsx`

**Sections by Status**:

**Registration Phase**:
- Header: name, game, organizer, status, entry fee, prize pool
- Player list (scrollable)
- "Register" button (if connected + not registered)
- Countdown to deadline

**Active Phase**:
- Bracket visualization (tree structure)
- Current round highlighted
- Click match for detail modal
- Animated bracket progression

**Completed Phase**:
- Final bracket
- Standings table with prizes
- "Claim Prize" button for eligible winners

**Cancelled Phase**:
- Refund notice
- "Claim Refund" button

### 8.4 Bracket Component

**Path**: `packages/frontend/src/components/tournament/BracketView.tsx`

**Requirements**:
- Tree structure visualization
- Supports 4, 8, 16, 32, 64 players
- Current round highlighted
- Completed matches show winner (green highlight)
- Pending matches show "TBD"
- Smooth animations when results come in
- Click match opens detail modal
- Mobile: horizontal scroll

---

## Phase 9: Frontend - Player & Achievement Pages

### 9.1 Player Profile

**Path**: `packages/frontend/src/app/player/[address]/page.tsx`

**Hero Section**:
- Wallet address (truncated + copy button)
- Composite Score (BIG, animated counter, rank badge)
- Global rank (#X of Y passports)

**Score Breakdown** (recharts):
- Pie chart or stacked bar
- Shows contribution from each game
- Hover for details

**Stats Grid** (2x4 or 4x2):
| Stat | Format |
|------|--------|
| Tournaments | Number |
| Wins | Number |
| Win Rate | Percentage (color coded) |
| Prize Money | AVAX + USD |
| Current Streak | Number + fire emoji if > 3 |
| Longest Streak | Number |
| GSP Earned | Number |
| Rank | #X |

**Tournament History**:
- Table: Date, Name, Game, Placement, Prize, Points
- Sortable columns
- Paginated (10 per page)

**Achievement Showcase**:
- Grid of achievement cards
- Unlocked: full color, rarity border
- Locked: greyed out
- Rarity colors: grey (Common), purple (Rare), gold (Legendary)

### 9.2 Score Display Component

**Path**: `packages/frontend/src/components/player/ScoreDisplay.tsx`

**Requirements**:
- Large animated number (counting up effect)
- Rank badge/ring visual
- Color gradient based on score tier
- Subtle glow effect
- "Gamerscore" label

**Score Tiers** (for visual styling):
- 0-999: Bronze
- 1000-4999: Silver
- 5000-9999: Gold
- 10000-49999: Platinum
- 50000+: Diamond

### 9.3 Achievement Gallery

**Path**: `packages/frontend/src/app/achievements/page.tsx`

**Features**:
- Filter by game (dropdown)
- Filter by rarity (buttons: All, Common, Rare, Legendary)
- Grid of achievement cards
- Each card: name, description, rarity badge, points, GSP, unlock rate

**Achievement Card**:
- Icon (placeholder or game-specific)
- Name
- Description (truncated, expand on click)
- Rarity badge (colored)
- Point value
- GSP reward
- Global unlock rate: "X% of players"

---

## Phase 10: Frontend - Shop & Polish

### 10.1 Reward Shop

**Path**: `packages/frontend/src/app/shop/page.tsx`

**Header**:
- "Reward Shop" title
- GSP Balance (prominent)
- Category tabs: All, Badges, Titles, Cosmetics

**Item Grid**:
- Image (placeholder)
- Name
- GSP Price
- "Purchase" button (disabled if insufficient balance)

**Purchase Flow**:
1. Click "Purchase"
2. Modal: confirm GSP spend
3. Transaction: transfer GSP to treasury (burn for MVP)
4. Success: toast notification, item added to inventory
5. Item shows on player profile

**Demo Items**:
| Name | Category | Price |
|------|----------|-------|
| Bronze Badge | Badge | 10 GSP |
| Silver Badge | Badge | 50 GSP |
| Gold Badge | Badge | 200 GSP |
| Champion Title | Title | 100 GSP |
| Veteran Title | Title | 250 GSP |
| Legend Title | Title | 500 GSP |
| Fire Avatar Border | Cosmetic | 150 GSP |
| Ice Avatar Border | Cosmetic | 150 GSP |

### 10.2 Home Dashboard

**Path**: `packages/frontend/src/app/page.tsx`

**Sections**:

1. **Hero** (full width):
   - GameScore Protocol logo
   - "Your On-Chain Competitive Identity"
   - Connect Wallet CTA (or quick stats if connected)

2. **Quick Stats** (if connected):
   - Your composite score
   - GSP balance
   - Active tournaments
   - Recent achievement

3. **Featured Tournaments** (3-4 cards):
   - Upcoming tournaments with highest prize pools
   - Countdown timers

4. **Global Leaderboard** (table):
   - Top 10 by composite score
   - Rank, wallet, score, win rate
   - "View All" link

5. **Recent Activity Feed**:
   - Latest events (from contract events)
   - "Player X won Tournament Y"
   - "Player X unlocked Achievement Y"
   - Timestamp

6. **Ecosystem Stats** (4 cards):
   - Total Passports
   - Total Tournaments
   - Total AVAX in Prize Pools
   - Total GSP Distributed

### 10.3 Animations

**Using framer-motion**:

| Element | Animation |
|---------|-----------|
| Score counter | Count up on mount |
| Achievement unlock | Scale + glow pulse |
| Tournament bracket | Slide in matches |
| Match result | Winner highlight pulse |
| Page transitions | Fade + slight slide |
| Cards | Hover: slight lift + shadow |
| Buttons | Hover: scale 1.02 |

### 10.4 Polish Checklist

- [ ] All loading states have skeletons
- [ ] All errors show retry button
- [ ] All transactions show pending/success/error toasts
- [ ] Mobile responsive (test 375px width)
- [ ] Tablet responsive (test 768px width)
- [ ] Core Wallet works
- [ ] MetaMask works
- [ ] WalletConnect works
- [ ] Empty states for no data
- [ ] 404 page styled
- [ ] Favicon and meta tags

---

## Phase 11: Demo

### 11.1 DemoGame Contract

**Path**: `packages/contracts/contracts/demo/DemoGame.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../interfaces/ITournament.sol";
import "../interfaces/IPlayerPassport.sol";

contract DemoGame {
    address public playerPassport;
    address public achievementRegistry;

    constructor(address _passport, address _registry) {
        playerPassport = _passport;
        achievementRegistry = _registry;
    }

    function reportMatchResult(
        address tournament,
        uint256 matchId,
        address winner
    ) external {
        ITournament(tournament).reportResult(matchId, winner);
    }

    function attestAchievement(
        address player,
        uint256 achievementId
    ) external {
        IPlayerPassport(playerPassport).attestAchievement(player, achievementId);
    }
}
```

### 11.2 Demo Achievements

| ID | Name | Rarity | Description |
|----|------|--------|-------------|
| 1 | First Blood | Common | Win your first match |
| 2 | Undefeated | Rare | Win a tournament without losing a match |
| 3 | Hat Trick | Rare | Win 3 tournaments |
| 4 | Legendary Champion | Legendary | Win a tournament with 16+ players and 10+ AVAX entry |
| 5 | Social Butterfly | Common | Compete against 10 unique opponents |

### 11.3 Demo Script

**Path**: `packages/contracts/scripts/demo.ts`

**Scenario**:
1. Deploy DemoGame, approve as game
2. Register 5 demo achievements
3. Create "GameScore Launch Cup" tournament:
   - 8 players
   - 0.1 AVAX entry
   - Top 3 payout [5000, 3000, 1700]
4. Register 8 test wallets
5. Fund wallets from faucet/deployer
6. Wait for bracket generation (VRF)
7. Play through all matches:
   - Round 1: 4 matches
   - Round 2: 2 matches (semis)
   - Round 3: 1 match (final)
8. Confirm all results
9. Winners claim prizes
10. Attest "First Blood" to winner
11. Attest "Undefeated" to winner (if applicable)
12. Log all addresses and stats

### 11.4 Demo Data Output

After running demo.ts, save to `packages/contracts/demo-data.json`:
```json
{
  "tournament": "0x...",
  "winner": "0x...",
  "runnerUp": "0x...",
  "third": "0x...",
  "players": ["0x...", ...],
  "achievements": [1, 2, 3, 4, 5]
}
```

---

## Dependency Chain

```
Phase 1 (Scaffolding)
    ↓
Phase 2 (GSPToken + AchievementRegistry)
    ↓
Phase 3 (PlayerPassport + RewardDistributor)
    ↓
Phase 4 (Tournament + TournamentFactory)
    ↓
Phase 5 (Deployment to Fuji)
    ↓
Phase 6 (SDK)
    ↓
Phase 7 (Frontend Shell)
    ↓
Phase 8 (Tournament Pages) ←→ Phase 9 (Player Pages) [parallel]
    ↓
Phase 10 (Shop + Polish)
    ↓
Phase 11 (Demo)
```

---

## Critical Checkpoints

### After Phase 2
- [ ] GSPToken compiles and all tests pass
- [ ] AchievementRegistry compiles and all tests pass
- [ ] Gas report generated

### After Phase 4
- [ ] All 6 contracts compile
- [ ] All unit tests pass (90%+ coverage)
- [ ] Integration test passes
- [ ] Gas report shows acceptable costs

### After Phase 5
- [ ] All contracts deployed to Fuji
- [ ] All contracts verified on Snowtrace
- [ ] VRF subscription funded and working
- [ ] deployments/fuji.json populated

### After Phase 7
- [ ] Wallet connects (Core + MetaMask)
- [ ] Network switches to Fuji
- [ ] Contract reads work
- [ ] Basic layout renders

### After Phase 10
- [ ] All pages render correctly
- [ ] All contract interactions work
- [ ] Mobile responsive
- [ ] No console errors

### After Phase 11
- [ ] Demo scenario runs end-to-end
- [ ] Frontend displays demo data
- [ ] Video demo can be recorded

---

## Estimated Gas Costs (Fuji)

| Operation | Gas Units | Cost @ 25 gwei |
|-----------|-----------|----------------|
| Create Tournament | ~400,000 | ~0.01 AVAX |
| Register for Tournament | ~100,000 | ~0.0025 AVAX |
| Report Match Result | ~150,000 | ~0.00375 AVAX |
| Claim Prize | ~80,000 | ~0.002 AVAX |
| Attest Achievement | ~120,000 | ~0.003 AVAX |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| VRF callback fails | Mock VRF for testing; manual bracket fallback |
| Gas costs too high | Struct packing; minimal proxy pattern |
| Frontend complexity | Component-first approach; shared hooks |
| Timeline pressure | Parallel Phase 8+9; MVP scope only |
| Dependency drift | Pin all versions; lockfiles committed |

---

## Files to Create (Summary)

**Phase 1**: 13 files
**Phase 2**: 4 files (2 contracts + 2 tests)
**Phase 3**: 6 files (2 contracts + 1 interface + 2 tests + 1 integration)
**Phase 4**: 8 files (3 contracts + 2 tests + interfaces)
**Phase 5**: 3 files (deploy + verify + addresses)
**Phase 6**: 12 files (SDK)
**Phase 7-10**: ~35 files (frontend)
**Phase 11**: 3 files (demo)

**Total**: ~84 files

---

## Ready for Execution

This plan covers:
1. Complete monorepo structure with pinned dependencies
2. All 6 smart contracts with full specifications
3. Comprehensive test requirements (90%+ coverage target)
4. Deployment and verification scripts
5. TypeScript SDK with typed functions
6. All 7 frontend pages with component breakdown
7. Demo scenario for competition video
8. Dependency chain and checkpoints

Switch to act mode to begin Phase 1.
