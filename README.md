# GameScore Protocol

**Your On-Chain Competitive Identity**

GameScore Protocol is an open competitive infrastructure layer for the Avalanche blockchain. Think Xbox Live Gamerscore - but on-chain, open, composable, and player-owned.

## Overview

GameScore provides three interlocking modules:

### 1. Tournament Engine
Smart contracts that handle the complete tournament lifecycle. Entry fees held in escrow, brackets generated with verifiable randomness (Chainlink VRF), results with dispute protection, and automatic prize distribution.

### 2. Player Passport
A soulbound (non-transferable) wallet-linked reputation record tracking:
- Composite score (Gamerscore)
- Per-game scores
- Achievement attestations
- Tournament history
- Aggregate stats

### 3. Achievement Rewards (GSP Token)
ERC-20 utility token earned through competitive play:
- Tournament wins and placements
- Achievement unlocks
- Score milestones

## Tech Stack

- **Smart Contracts**: Solidity 0.8.24, Hardhat, OpenZeppelin, Chainlink VRF
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, wagmi, RainbowKit
- **SDK**: TypeScript, viem

## Project Structure

```
gamescore-protocol/
├── packages/
│   ├── contracts/     # Solidity smart contracts
│   ├── frontend/      # Next.js web application
│   └── sdk/           # TypeScript SDK for game integration
├── package.json       # Workspace root
└── turbo.json         # Turborepo config
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm run test:contracts

# Start frontend development server
npm run dev --workspace=@gamescore/frontend
```

### Environment Setup

Copy `.env.example` to `.env` and fill in:

```env
PRIVATE_KEY=your_deployer_private_key
SNOWTRACE_API_KEY=your_snowtrace_api_key
VRF_SUBSCRIPTION_ID=your_chainlink_vrf_subscription_id
TREASURY_ADDRESS=your_treasury_address
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

### Deployment

```bash
# Deploy to Fuji testnet
npm run deploy:fuji

# Verify contracts on Snowtrace
npm run verify:fuji
```

## Smart Contracts

| Contract | Description |
|----------|-------------|
| `GSPToken` | ERC-20 utility token |
| `AchievementRegistry` | Achievement definitions |
| `PlayerPassport` | Soulbound reputation |
| `RewardDistributor` | GSP emission controller |
| `Tournament` | Individual tournament instances |
| `TournamentFactory` | Deploys tournament clones |

## Networks

### Avalanche Fuji Testnet
- Chain ID: 43113
- RPC: https://api.avax-test.network/ext/bc/C/rpc
- Explorer: https://testnet.snowtrace.io/

## License

MIT

---

Built for the Avalanche Build Games Competition 2026
