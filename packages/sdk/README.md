# @player1/sdk

Universal competitive gaming infrastructure for web3. Player1 is Xbox Live for on-chain games — trustless tournaments, portable reputation, cross-game achievements, and P1 token rewards.

## Installation

```bash
npm install @player1/sdk viem
```

## Quick Start

```typescript
import { Player1Client } from '@player1/sdk';
import { avalancheFuji } from 'viem/chains';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Read-only client (no wallet needed)
const p1 = new Player1Client({
  chain: avalancheFuji,
});

// Get player stats
const stats = await p1.getPlayerStats('0x...');
console.log(`Score: ${stats.compositeScore}, Win rate: ${stats.winRate} bps`);

// Get all tournaments
const tournaments = await p1.getActiveTournaments();
console.log(`${tournaments.length} active tournaments`);
```

## Write Operations

For creating tournaments, registering, and claiming prizes, pass a `walletClient`:

```typescript
import { createWalletClient, custom, parseEther } from 'viem';
import { avalancheFuji } from 'viem/chains';

// Browser wallet (MetaMask, etc.)
const walletClient = createWalletClient({
  chain: avalancheFuji,
  transport: custom(window.ethereum),
});

const p1 = new Player1Client({
  chain: avalancheFuji,
  walletClient,
});

// Create a tournament
const tournamentAddr = await p1.createTournament({
  name: 'Weekly Championship',
  gameContract: '0x...',
  entryFee: parseEther('0.1'),
  maxPlayers: 16,
  prizeSplit: [50, 30, 17], // percentages, must sum to 97 (3% protocol fee)
  registrationDeadline: Math.floor(Date.now() / 1000) + 86400,
});

// Register for a tournament
await p1.register(tournamentAddr);

// Claim prize after tournament completes
await p1.claimPrize(tournamentAddr);
```

## Player Data

```typescript
// Full profile from PlayerPassport
const profile = await p1.getPlayerProfile('0x...');
console.log(`Composite Score: ${profile.compositeScore}`);
console.log(`Wins: ${profile.totalWins} / ${profile.totalTournaments}`);
console.log(`Current Streak: ${profile.currentWinStreak}`);

// P1 token balance
const balance = await p1.getP1Balance('0x...');

// Tournament history
const history = await p1.getTournamentHistory('0x...', 0, 10);

// Achievements
const achievements = await p1.getPlayerAchievements('0x...');
```

## For Game Developers

```typescript
// Report match results (requires game contract role)
await p1.reportMatchResult(tournamentAddr, 0, winnerAddress);

// Register achievements (requires GAME_ADMIN_ROLE)
await p1.registerAchievement('First Blood', 'Win your first match', 'Common');

// Award achievements to players (requires GAME_ROLE)
await p1.awardAchievement(playerAddress, achievementId);

// Generate bracket (organizer only, testnet)
await p1.generateBracket(tournamentAddr, true); // deterministic
```

## Contract Addresses

### Avalanche Fuji (Testnet)

| Contract | Address |
|----------|---------|
| TournamentFactory | `0x734974f3C20Da199Bbb30D5d50e59b439A44404B` |
| PlayerPassport | `0xAfD4C1B72c6514C3B43de62EaE310657F02bccf5` |
| AchievementRegistry | `0xaC7EF608641Ae0D8b027C735BbC80C513766219b` |
| P1Token | `0xD5413889C518AC479731B06DD5d063cD08B4b1cb` |
| RewardDistributor | `0xf9436653C09095Fc78B4C87F38A9659f4f03aC0F` |

## API Reference

See [Integration Guide](../../docs/INTEGRATION.md) for full documentation.
