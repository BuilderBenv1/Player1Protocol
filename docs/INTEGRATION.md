# Integrating Player1 Protocol

## Overview

Player1 provides tournament infrastructure for your game. You handle gameplay, we handle:
- **Tournament creation and registration** — trustless escrow, bracket generation
- **Prize pool escrow and distribution** — automatic AVAX payouts, no middleman
- **Player reputation tracking** — composite score, win rate, streak history
- **Achievement system** — cross-game achievements with P1 token rewards
- **P1 token rewards** — earned through tournament performance and achievements

## Architecture

```
Your Game Contract ──→ Player1 Tournament ──→ Player1 Passport ──→ P1 Token
       │                      │                      │
       │ reportResult()       │ _reportToPassport()  │ distributeTournamentReward()
       │                      │                      │
       ▼                      ▼                      ▼
   Match winner         Score updated            P1 minted
   recorded            Win streak tracked       to player
```

### How It Works

1. Your game contract is approved and granted `GAME_ROLE`
2. Players register for tournaments (paying entry fee to escrow)
3. Bracket is generated (VRF on mainnet, deterministic on testnet)
4. Your game reports match results as they're played
5. After dispute windows, results are confirmed
6. Tournament auto-completes when a winner is determined
7. Prizes distributed, reputation updated, P1 rewards minted

## Step 1: Get Approved as a Game

Contact the Player1 team to get your game contract approved. This grants two roles:

- **`GAME_ROLE`** on PlayerPassport — allows attesting achievements to players
- **`GAME_ADMIN_ROLE`** on AchievementRegistry — allows registering achievements

```solidity
// Admin calls:
achievementRegistry.approveGame(yourGameContract);
playerPassport.grantGameRole(yourGameContract);
```

## Step 2: Report Match Results

Your game contract needs to implement match result reporting. The tournament contract accepts results from either the organizer or the registered game contract.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IPlayer1Tournament {
    function reportResult(uint256 matchId, address winner) external;
    function getMatch(uint256 matchId) external view returns (Match memory);

    struct Match {
        uint256 matchId;
        uint256 round;
        address player1;
        address player2;
        address winner;
        address reporter;
        uint256 reportedAt;
        uint8 status; // 0=Pending, 1=Reported, 2=Confirmed, 3=Disputed
    }
}

contract YourGame {
    function onMatchComplete(
        address tournament,
        uint256 matchId,
        address winner
    ) external {
        // Your game logic validates the winner...

        // Report to Player1
        IPlayer1Tournament(tournament).reportResult(matchId, winner);
    }
}
```

### Match Lifecycle

1. **Pending** — Match created, waiting for result
2. **Reported** — Result submitted, dispute window starts
3. **Confirmed** — Dispute window expired, result final
4. **Disputed** — Loser disputed, organizer resolves

The dispute window (configurable per tournament, default 30 minutes) allows the losing player to dispute. If disputed, the tournament organizer resolves it.

## Step 3: Award Achievements (Optional)

Register achievements for your game, then award them to players:

```solidity
interface IAchievementRegistry {
    enum Rarity { Common, Rare, Legendary }

    function registerAchievement(
        string calldata name,
        string calldata description,
        Rarity rarity
    ) external returns (uint256 achievementId);
}

interface IPlayerPassport {
    function attestAchievement(
        address player,
        uint256 achievementId
    ) external;
}

contract YourGame {
    uint256 public firstWinAchievementId;

    function setupAchievements() external {
        firstWinAchievementId = achievementRegistry.registerAchievement(
            "First Victory",
            "Win your first match",
            IAchievementRegistry.Rarity.Common
        );
    }

    function onPlayerWin(address player) internal {
        // Award achievement (automatically grants P1 tokens)
        playerPassport.attestAchievement(player, firstWinAchievementId);
    }
}
```

### Achievement Rewards

| Rarity    | Points | P1 Reward |
|-----------|--------|-----------|
| Common    | 5      | 5 P1      |
| Rare      | 25     | 25 P1     |
| Legendary | 100    | 100 P1    |

## Step 4: Using the SDK

For off-chain integration (frontend, backend), use the TypeScript SDK:

```bash
npm install @player1/sdk viem
```

```typescript
import { Player1Client } from '@player1/sdk';
import { avalancheFuji } from 'viem/chains';

const p1 = new Player1Client({ chain: avalancheFuji });

// Read player data
const stats = await p1.getPlayerStats('0x...');
const history = await p1.getTournamentHistory('0x...');
const achievements = await p1.getPlayerAchievements('0x...');

// Read tournament data
const tournament = await p1.getTournament('0x...');
const bracket = await p1.getBracket('0x...');
const matches = await p1.getMatches('0x...');
```

## Scoring System

### Tournament Points

| Placement | Base Points | With 0.1 AVAX entry (1.5x) |
|-----------|-------------|---------------------------|
| 1st       | 100         | 150                       |
| 2nd/3rd   | 50          | 75                        |
| Others    | 10          | 10                        |

Entry fee tiers multiply base points:
- **Free** (0 AVAX): 1.0x
- **Low** (0-1 AVAX): 1.5x
- **Medium** (1-10 AVAX): 2.0x
- **High** (10+ AVAX): 3.0x

Win streaks of 4+ add 20 bonus points per tournament.

### Player Tiers

| Tier     | Score    |
|----------|----------|
| Bronze   | 0+       |
| Silver   | 1,000+   |
| Gold     | 5,000+   |
| Platinum | 10,000+  |
| Diamond  | 50,000+  |

## Contract Addresses

### Avalanche Fuji (Testnet)

| Contract | Address |
|----------|---------|
| TournamentFactory | `0x734974f3C20Da199Bbb30D5d50e59b439A44404B` |
| PlayerPassport | `0xAfD4C1B72c6514C3B43de62EaE310657F02bccf5` |
| AchievementRegistry | `0xaC7EF608641Ae0D8b027C735BbC80C513766219b` |
| P1Token | `0xD5413889C518AC479731B06DD5d063cD08B4b1cb` |
| RewardDistributor | `0xf9436653C09095Fc78B4C87F38A9659f4f03aC0F` |
| DemoGame | `0x8b8792206fcBCbD9C7E175d793eed339c90Dbeb7` |

### Faucets

- AVAX testnet faucet: https://faucets.chain.link/fuji
- Explorer: https://testnet.snowtrace.io

## Support

For integration support, reach out to the Player1 team.
