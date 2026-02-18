# Player1 Protocol

## Universal Competitive Gaming Infrastructure for Web3

**Version 1.0 | February 2026**

---

## Abstract

Player1 Protocol is chain-agnostic infrastructure that provides trustless tournaments, portable player reputation, and achievement systems for competitive gaming. It serves as the foundational layer — analogous to Xbox Live — that any game can integrate to offer competitive features without building custom infrastructure. Players maintain a single identity across all integrated games, with verifiable stats, achievements, and rewards that follow them everywhere.

---

## The Problem

### For Game Developers

Building competitive gaming features is expensive and time-consuming:

- **Tournament systems** require bracket generation, escrow, dispute resolution, and prize distribution
- **Leaderboards** need backend infrastructure, anti-cheat considerations, and ongoing maintenance
- **Reputation systems** must be built from scratch for each game
- **Achievement systems** require design, tracking, and reward distribution
- **Matchmaking** needs skill rating algorithms and player pools

Each game rebuilds these systems independently, fragmenting the player experience and wasting development resources.

### For Players

The current landscape punishes player investment:

- **Fragmented identity** — reputation resets with each new game
- **Lost progress** — achievements and stats are siloed
- **Trust issues** — centralized tournaments can manipulate results or withhold prizes
- **No portability** — skill rating in Game A means nothing in Game B

### For Platforms

Gaming platforms (L1s, aggregators, publishers) lack:

- **Unified infrastructure** for all games in their ecosystem
- **Cross-game engagement** mechanics to retain players
- **Verifiable competitive integrity** for skill-based gaming

---

## The Solution

Player1 Protocol provides a complete competitive gaming stack as smart contract infrastructure:

```
┌─────────────────────────────────────────────────────────┐
│                    GAMES (Consumers)                     │
│         Any game integrates via SDK or contracts         │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   PLAYER1 PROTOCOL                       │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │ Tournaments │  │  Reputation │  │ Achievements│      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │ Leaderboards│  │   Social    │  │    Clubs    │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
│                                                          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   ANY EVM CHAIN                          │
│        Avalanche • Ethereum • Base • Arbitrum            │
└─────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. PlayerPassport

The universal player identity. A soulbound record of competitive history.

**Data Tracked:**
- Composite skill score (algorithmic rating based on performance)
- Total tournaments entered
- Wins, top-3 finishes, win rate
- Current and longest win streaks
- Total prize money earned
- P1 tokens earned

**Key Properties:**
- One passport per wallet address
- Automatically created on first tournament entry
- Cannot be transferred (soulbound)
- Readable by any game for matchmaking, gating, or display

### 2. Tournament System

Trustless competitive events with on-chain bracket generation and prize distribution.

**Features:**
- Configurable entry fees (including free tournaments)
- Bracket sizes: 4, 8, 16, 32, 64, 128 players
- VRF-seeded brackets (Chainlink) for provably fair matchups
- Customizable prize splits
- Dispute windows for contested results
- Automatic prize distribution via smart contract escrow

**Flow:**
1. Organizer creates tournament with parameters
2. Players register (paying entry fee if required)
3. Registration closes, bracket generates via VRF
4. Game contract reports match results
5. Results confirm after dispute window
6. Winners claim prizes trustlessly

### 3. Achievement Registry

Cross-game achievement system with token rewards.

**Structure:**
- Games register achievements (name, description, rarity, point value)
- Three rarity tiers: Common, Rare, Legendary
- Games award achievements to players
- Achievements contribute to composite score
- P1 token rewards for unlocks

**Benefits:**
- Players accumulate achievements across all games
- Rare achievements become status symbols
- Games can gate content based on achievement history

### 4. P1 Token

The reward token for competitive participation.

**Distribution:**
- Earned through tournament placement
- Earned through achievement unlocks
- Higher rewards for harder accomplishments

**Utility:**
- Governance (future)
- Premium tournament entry
- Achievement showcase customization
- Platform-specific integrations

### 5. Leaderboards

Per-game, per-metric ranking system.

**Features:**
- Multiple metrics per game (kills, wins, score, time)
- Time periods: All-time, Monthly, Weekly, Daily
- Configurable: higher-is-better or lower-is-better
- Top N storage (default 100)

### 6. Social Graph

On-chain friends and following system.

**Features:**
- Follow/unfollow any player
- Mutual follows = friends
- Block list
- Player bios
- Portable across all games

### 7. Looking for Group (LFG)

Find teammates based on game, activity, and skill.

**Features:**
- Skill range requirements (min/max composite score)
- Activity descriptions
- Expiring listings
- Join/leave mechanics

### 8. Clubs

Player-created organizations with shared treasury.

**Features:**
- Membership fees (optional)
- Invite-only or open
- Admin roles
- Club treasury for prizes
- Unique tags

---

## Technical Architecture

### Smart Contracts

| Contract | Purpose |
|----------|---------|
| PlayerPassport | Universal player identity and stats |
| Tournament | Individual tournament logic (clone template) |
| TournamentFactory | Creates tournament instances |
| P1Token | ERC-20 reward token |
| AchievementRegistry | Achievement definitions and awards |
| RewardDistributor | Mints P1 based on performance |
| Leaderboard | Per-game rankings |
| SocialGraph | Friends/following |
| LFG | Team finding |
| ClubFactory | Creates clubs |
| Club | Individual club logic |

### Proxy Pattern

Tournaments use the minimal proxy (clone) pattern:
- Single implementation contract
- Each tournament is a lightweight clone
- Reduces deployment costs by ~90%
- Upgradeable implementation for bug fixes

### Randomness

Bracket seeding uses Chainlink VRF V2.5:
- Provably fair random seed
- On-chain verification
- Tamper-proof bracket generation

### Access Control

Role-based permissions:
- `GAME_ROLE` — Approved games that can report results and award achievements
- `FACTORY_ROLE` — TournamentFactory can register players
- `MINTER_ROLE` — RewardDistributor can mint P1 tokens

---

## Integration Guide

### For Game Developers

**Minimal Integration (5 lines):**

```solidity
interface IPlayer1Tournament {
    function reportResult(uint256 matchId, address winner) external;
}

// In your game contract, after a match ends:
function onMatchComplete(uint256 matchId, address winner) external {
    IPlayer1Tournament(tournamentAddress).reportResult(matchId, winner);
}
```

**SDK Integration:**

```typescript
import { Player1Client } from '@player1/sdk';

const p1 = new Player1Client({ chain: avalanche });

// Create a tournament
const tournament = await p1.createTournament({
  name: "Weekly Championship",
  gameContract: myGameAddress,
  entryFee: parseEther("1"),
  maxPlayers: 32,
  prizeSplit: [70, 20, 10],
});

// Get player stats for matchmaking
const stats = await p1.getPlayerStats(playerAddress);
if (stats.compositeScore >= 100) {
  // Allow ranked queue
}
```

### What Games Handle

- Gameplay mechanics
- Match result determination
- Calling `reportResult()` when matches end

### What Player1 Handles

- Tournament brackets and seeding
- Entry fee escrow
- Prize distribution
- Player reputation tracking
- Achievement awards
- P1 token rewards

---

## Economic Model

### Protocol Revenue

**Tournament Fees:**
- 3% of prize pools (configurable per deployment)
- Collected automatically on prize distribution
- Sent to protocol treasury

**Club Creation:**
- Optional fee to create clubs
- Prevents spam, generates revenue

### Token Distribution

P1 tokens are minted based on competitive performance:

| Placement | Base Reward |
|-----------|-------------|
| 1st Place | 50 P1 |
| 2nd Place | 25 P1 |
| 3rd Place | 15 P1 |
| Participation | 5 P1 |

Rewards scale with tournament size and entry fee.

### Sustainability

- No pre-mine or team allocation
- All tokens earned through competition
- Protocol fees fund development
- Deflationary mechanisms (future)

---

## Use Cases

### Skill-Based Gaming Platforms

Platforms like Kokomo Games can integrate Player1 to:
- Run provably fair tournaments with automatic payouts
- Use reputation scores for matchmaking
- Offer cross-game progression to increase retention

### Gaming L1s

Chains like The Grotto (Avalanche gaming L1) can adopt Player1 as:
- Default competitive infrastructure for all games
- Unified identity layer across the ecosystem
- Engagement mechanics that keep players on-chain

### Esports Organizations

Orgs can use Clubs to:
- Manage team rosters on-chain
- Run internal tournaments
- Manage prize pool treasuries
- Build verifiable competitive history

### AI Agents

Through integration with AgentProof:
- AI agents compete in tournaments
- Performance builds verifiable track records
- Trust scores derived from competitive history

---

## Deployment

### Current Status

**Avalanche C-Chain (Mainnet):**

| Contract | Address |
|----------|---------|
| P1Token | `0xD967bB3a84109F845ded64eFdB961c0D314a0b20` |
| PlayerPassport | `0xe354C6394AAC25a786C27334d2B7bEf367bebDf8` |
| TournamentFactory | `0x2EE6635740F8fE3b6B9765A245D0b66Ef013fE5c` |
| AchievementRegistry | `0x4431f746969c7A4C0263e012035312bEe8697a7A` |
| RewardDistributor | `0xd4A5C78E87267c93fB738c56F1434591fBe8C03D` |
| Tournament (impl) | `0x108b26a648295326b6220d3bD748f0232f9Bfb2b` |

**Avalanche Fuji (Testnet):**

Full deployment available for testing and integration development.

### Future Deployments

- The Grotto (Avalanche Gaming L1)
- Base
- Arbitrum
- Any EVM-compatible chain on request

---

## Roadmap

### Phase 1: Foundation ✅
- Core contracts (Tournament, Passport, Achievements, P1 Token)
- TypeScript SDK
- Frontend dashboard
- Mainnet deployment

### Phase 2: Social Layer
- Leaderboards
- Social graph (friends/following)
- LFG system
- Clubs/guilds

### Phase 3: Ecosystem Growth
- Multi-chain deployment
- Cross-chain reputation aggregation
- Matchmaking API
- Season/league system

### Phase 4: Advanced Features
- Spectator integrations
- Streaming platform hooks
- AI agent tournaments
- Governance

---

## Competitive Landscape

| Feature | Player1 | Traditional Gaming | Other Web3 |
|---------|---------|-------------------|-------------|
| Trustless prizes | ✅ | ❌ | Partial |
| Portable reputation | ✅ | ❌ | ❌ |
| Cross-game identity | ✅ | Partial (Xbox/Steam) | ❌ |
| On-chain verification | ✅ | ❌ | ✅ |
| Open integration | ✅ | ❌ | Varies |
| Chain agnostic | ✅ | N/A | ❌ |

---

## Team

Built by developers with 10+ years of experience in betting, gaming, and financial technology. Production systems handling real money daily. Solo development for speed and focus.

---

## Conclusion

Player1 Protocol is the missing infrastructure layer for competitive web3 gaming. By providing trustless tournaments, portable reputation, and cross-game identity, we enable:

- **Game developers** to add competitive features in hours, not months
- **Players** to build lasting reputation that follows them everywhere
- **Platforms** to offer unified competitive infrastructure across their ecosystem

The future of competitive gaming is verifiable, portable, and player-owned. Player1 builds that future.

---

## Links

- **Website:** [player1protocol.io](https://player1protocol.io)
- **Documentation:** [docs.player1protocol.io](https://docs.player1protocol.io)
- **GitHub:** [github.com/BuilderBenv1](https://github.com/BuilderBenv1)
- **Twitter:** [@BuilderBenv1](https://x.com/BuilderBenv1)

---

## Contact

For integration inquiries, partnership discussions, or technical questions:

**Email:** hello@player1protocol.io

---

*Player1 Protocol — Your reputation. Every game. One identity.*
