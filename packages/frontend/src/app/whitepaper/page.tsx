"use client";

import Link from "next/link";

export default function WhitepaperPage() {
  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight uppercase">
          WHITEPAPER
        </h1>
        <p className="text-avax-text text-lg">
          Player1 Protocol — Universal Competitive Gaming Infrastructure for Web3
        </p>
        <p className="text-avax-text-light text-sm">Version 1.0 | February 2026</p>
      </div>

      {/* Abstract */}
      <section className="glass rounded-2xl p-8 md:p-12 space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Abstract</h2>
        <p className="text-avax-text leading-relaxed">
          Player1 Protocol is chain-agnostic infrastructure that provides trustless tournaments, portable player reputation, and achievement systems for competitive gaming. It serves as the foundational layer — analogous to Xbox Live — that any game can integrate to offer competitive features without building custom infrastructure. Players maintain a single identity across all integrated games, with verifiable stats, achievements, and rewards that follow them everywhere.
        </p>
      </section>

      {/* The Problem */}
      <section className="glass rounded-2xl p-8 md:p-12 space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">The Problem</h2>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-avax-red">For Game Developers</h3>
          <p className="text-avax-text leading-relaxed">
            Building competitive gaming features is expensive and time-consuming:
          </p>
          <ul className="list-disc list-inside text-avax-text space-y-2 ml-2">
            <li><span className="font-medium text-white">Tournament systems</span> require bracket generation, escrow, dispute resolution, and prize distribution</li>
            <li><span className="font-medium text-white">Leaderboards</span> need backend infrastructure, anti-cheat considerations, and ongoing maintenance</li>
            <li><span className="font-medium text-white">Reputation systems</span> must be built from scratch for each game</li>
            <li><span className="font-medium text-white">Achievement systems</span> require design, tracking, and reward distribution</li>
            <li><span className="font-medium text-white">Matchmaking</span> needs skill rating algorithms and player pools</li>
          </ul>
          <p className="text-avax-text leading-relaxed">
            Each game rebuilds these systems independently, fragmenting the player experience and wasting development resources.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-avax-red">For Players</h3>
          <p className="text-avax-text leading-relaxed">The current landscape punishes player investment:</p>
          <ul className="list-disc list-inside text-avax-text space-y-2 ml-2">
            <li><span className="font-medium text-white">Fragmented identity</span> — reputation resets with each new game</li>
            <li><span className="font-medium text-white">Lost progress</span> — achievements and stats are siloed</li>
            <li><span className="font-medium text-white">Trust issues</span> — centralized tournaments can manipulate results or withhold prizes</li>
            <li><span className="font-medium text-white">No portability</span> — skill rating in Game A means nothing in Game B</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-avax-red">For Platforms</h3>
          <p className="text-avax-text leading-relaxed">Gaming platforms (L1s, aggregators, publishers) lack:</p>
          <ul className="list-disc list-inside text-avax-text space-y-2 ml-2">
            <li><span className="font-medium text-white">Unified infrastructure</span> for all games in their ecosystem</li>
            <li><span className="font-medium text-white">Cross-game engagement</span> mechanics to retain players</li>
            <li><span className="font-medium text-white">Verifiable competitive integrity</span> for skill-based gaming</li>
          </ul>
        </div>
      </section>

      {/* The Solution */}
      <section className="glass rounded-2xl p-8 md:p-12 space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">The Solution</h2>
        <p className="text-avax-text leading-relaxed">
          Player1 Protocol provides a complete competitive gaming stack as smart contract infrastructure:
        </p>
        <div className="bg-black/40 rounded-xl p-6 font-mono text-sm text-avax-text overflow-x-auto">
          <pre>{`┌─────────────────────────────────────────────────────────┐
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
└─────────────────────────────────────────────────────────┘`}</pre>
        </div>
      </section>

      {/* Core Components */}
      <section className="glass rounded-2xl p-8 md:p-12 space-y-8">
        <h2 className="text-2xl font-bold tracking-tight">Core Components</h2>

        {/* PlayerPassport */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-avax-red">1. PlayerPassport</h3>
          <p className="text-avax-text leading-relaxed">
            The universal player identity. A soulbound record of competitive history.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-black/30 rounded-xl p-5 space-y-3">
              <h4 className="font-semibold text-sm uppercase tracking-wider text-avax-text-light">Data Tracked</h4>
              <ul className="text-avax-text text-sm space-y-1.5">
                <li>Composite skill score (algorithmic rating)</li>
                <li>Total tournaments entered</li>
                <li>Wins, top-3 finishes, win rate</li>
                <li>Current and longest win streaks</li>
                <li>Total prize money earned</li>
                <li>P1 tokens earned</li>
              </ul>
            </div>
            <div className="bg-black/30 rounded-xl p-5 space-y-3">
              <h4 className="font-semibold text-sm uppercase tracking-wider text-avax-text-light">Key Properties</h4>
              <ul className="text-avax-text text-sm space-y-1.5">
                <li>One passport per wallet address</li>
                <li>Automatically created on first tournament entry</li>
                <li>Cannot be transferred (soulbound)</li>
                <li>Readable by any game for matchmaking</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tournament System */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-avax-red">2. Tournament System</h3>
          <p className="text-avax-text leading-relaxed">
            Trustless competitive events with on-chain bracket generation and prize distribution.
          </p>
          <div className="bg-black/30 rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-avax-text-light">Features</h4>
            <ul className="text-avax-text text-sm space-y-1.5">
              <li>Configurable entry fees (including free tournaments)</li>
              <li>Bracket sizes: 4, 8, 16, 32, 64, 128 players</li>
              <li>VRF-seeded brackets (Chainlink) for provably fair matchups</li>
              <li>Customizable prize splits</li>
              <li>Dispute windows for contested results</li>
              <li>Automatic prize distribution via smart contract escrow</li>
            </ul>
          </div>
          <div className="bg-black/30 rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-avax-text-light">Flow</h4>
            <ol className="text-avax-text text-sm space-y-1.5 list-decimal list-inside">
              <li>Organizer creates tournament with parameters</li>
              <li>Players register (paying entry fee if required)</li>
              <li>Registration closes, bracket generates via VRF</li>
              <li>Game contract reports match results</li>
              <li>Results confirm after dispute window</li>
              <li>Winners claim prizes trustlessly</li>
            </ol>
          </div>
        </div>

        {/* Achievement Registry */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-avax-red">3. Achievement Registry</h3>
          <p className="text-avax-text leading-relaxed">
            Cross-game achievement system with token rewards.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-black/30 rounded-xl p-5 space-y-3">
              <h4 className="font-semibold text-sm uppercase tracking-wider text-avax-text-light">Structure</h4>
              <ul className="text-avax-text text-sm space-y-1.5">
                <li>Games register achievements (name, description, rarity, points)</li>
                <li>Three rarity tiers: Common, Rare, Legendary</li>
                <li>Games award achievements to players</li>
                <li>Achievements contribute to composite score</li>
                <li>P1 token rewards for unlocks</li>
              </ul>
            </div>
            <div className="bg-black/30 rounded-xl p-5 space-y-3">
              <h4 className="font-semibold text-sm uppercase tracking-wider text-avax-text-light">Benefits</h4>
              <ul className="text-avax-text text-sm space-y-1.5">
                <li>Players accumulate achievements across all games</li>
                <li>Rare achievements become status symbols</li>
                <li>Games can gate content based on achievement history</li>
              </ul>
            </div>
          </div>
        </div>

        {/* P1 Token */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-avax-red">4. P1 Token</h3>
          <p className="text-avax-text leading-relaxed">The reward token for competitive participation.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-black/30 rounded-xl p-5 space-y-3">
              <h4 className="font-semibold text-sm uppercase tracking-wider text-avax-text-light">Distribution</h4>
              <ul className="text-avax-text text-sm space-y-1.5">
                <li>Earned through tournament placement</li>
                <li>Earned through achievement unlocks</li>
                <li>Higher rewards for harder accomplishments</li>
              </ul>
            </div>
            <div className="bg-black/30 rounded-xl p-5 space-y-3">
              <h4 className="font-semibold text-sm uppercase tracking-wider text-avax-text-light">Utility</h4>
              <ul className="text-avax-text text-sm space-y-1.5">
                <li>Governance (future)</li>
                <li>Premium tournament entry</li>
                <li>Achievement showcase customization</li>
                <li>Platform-specific integrations</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Leaderboards */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-avax-red">5. Leaderboards</h3>
          <p className="text-avax-text leading-relaxed">Per-game, per-metric ranking system.</p>
          <ul className="text-avax-text text-sm space-y-1.5 ml-2 list-disc list-inside">
            <li>Multiple metrics per game (kills, wins, score, time)</li>
            <li>Time periods: All-time, Monthly, Weekly, Daily</li>
            <li>Configurable: higher-is-better or lower-is-better</li>
            <li>Top N storage (default 100)</li>
          </ul>
        </div>

        {/* Social Graph */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-avax-red">6. Social Graph</h3>
          <p className="text-avax-text leading-relaxed">On-chain friends and following system.</p>
          <ul className="text-avax-text text-sm space-y-1.5 ml-2 list-disc list-inside">
            <li>Follow/unfollow any player</li>
            <li>Mutual follows = friends</li>
            <li>Block list</li>
            <li>Player bios</li>
            <li>Portable across all games</li>
          </ul>
        </div>

        {/* LFG */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-avax-red">7. Looking for Group (LFG)</h3>
          <p className="text-avax-text leading-relaxed">Find teammates based on game, activity, and skill.</p>
          <ul className="text-avax-text text-sm space-y-1.5 ml-2 list-disc list-inside">
            <li>Skill range requirements (min/max composite score)</li>
            <li>Activity descriptions</li>
            <li>Expiring listings</li>
            <li>Join/leave mechanics</li>
          </ul>
        </div>

        {/* Clubs */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-avax-red">8. Clubs</h3>
          <p className="text-avax-text leading-relaxed">Player-created organizations with shared treasury.</p>
          <ul className="text-avax-text text-sm space-y-1.5 ml-2 list-disc list-inside">
            <li>Membership fees (optional)</li>
            <li>Invite-only or open</li>
            <li>Admin roles</li>
            <li>Club treasury for prizes</li>
            <li>Unique tags</li>
          </ul>
        </div>
      </section>

      {/* Technical Architecture */}
      <section className="glass rounded-2xl p-8 md:p-12 space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Technical Architecture</h2>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-avax-red">Smart Contracts</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 font-semibold text-avax-text-light uppercase tracking-wider text-xs">Contract</th>
                  <th className="text-left py-3 px-4 font-semibold text-avax-text-light uppercase tracking-wider text-xs">Purpose</th>
                </tr>
              </thead>
              <tbody className="text-avax-text">
                <tr className="border-b border-white/[0.04]"><td className="py-2.5 px-4 font-medium text-white">PlayerPassport</td><td className="py-2.5 px-4">Universal player identity and stats</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-2.5 px-4 font-medium text-white">Tournament</td><td className="py-2.5 px-4">Individual tournament logic (clone template)</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-2.5 px-4 font-medium text-white">TournamentFactory</td><td className="py-2.5 px-4">Creates tournament instances</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-2.5 px-4 font-medium text-white">P1Token</td><td className="py-2.5 px-4">ERC-20 reward token</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-2.5 px-4 font-medium text-white">AchievementRegistry</td><td className="py-2.5 px-4">Achievement definitions and awards</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-2.5 px-4 font-medium text-white">RewardDistributor</td><td className="py-2.5 px-4">Mints P1 based on performance</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-2.5 px-4 font-medium text-white">Leaderboard</td><td className="py-2.5 px-4">Per-game rankings</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-2.5 px-4 font-medium text-white">SocialGraph</td><td className="py-2.5 px-4">Friends/following</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-2.5 px-4 font-medium text-white">LFG</td><td className="py-2.5 px-4">Team finding</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-2.5 px-4 font-medium text-white">ClubFactory</td><td className="py-2.5 px-4">Creates clubs</td></tr>
                <tr><td className="py-2.5 px-4 font-medium text-white">Club</td><td className="py-2.5 px-4">Individual club logic</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-avax-text-light">Proxy Pattern</h4>
            <p className="text-avax-text text-sm leading-relaxed">
              Tournaments use the minimal proxy (clone) pattern — single implementation contract with lightweight clones. Reduces deployment costs by ~90%.
            </p>
          </div>
          <div className="bg-black/30 rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-avax-text-light">Randomness</h4>
            <p className="text-avax-text text-sm leading-relaxed">
              Bracket seeding uses Chainlink VRF V2.5 for provably fair random seeds with on-chain verification.
            </p>
          </div>
          <div className="bg-black/30 rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-avax-text-light">Access Control</h4>
            <p className="text-avax-text text-sm leading-relaxed">
              Role-based permissions: GAME_ROLE, FACTORY_ROLE, and MINTER_ROLE for approved games, factories, and reward distribution.
            </p>
          </div>
        </div>
      </section>

      {/* Integration Guide */}
      <section className="glass rounded-2xl p-8 md:p-12 space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Integration Guide</h2>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-avax-red">Minimal Integration (5 lines)</h3>
          <div className="bg-black/60 rounded-xl p-5 font-mono text-sm text-avax-text overflow-x-auto">
            <pre>{`interface IPlayer1Tournament {
    function reportResult(uint256 matchId, address winner) external;
}

// In your game contract, after a match ends:
function onMatchComplete(uint256 matchId, address winner) external {
    IPlayer1Tournament(tournamentAddress).reportResult(matchId, winner);
}`}</pre>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-avax-red">SDK Integration</h3>
          <div className="bg-black/60 rounded-xl p-5 font-mono text-sm text-avax-text overflow-x-auto">
            <pre>{`import { Player1Client } from '@player1/sdk';

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
}`}</pre>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-black/30 rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-avax-text-light">What Games Handle</h4>
            <ul className="text-avax-text text-sm space-y-1.5">
              <li>Gameplay mechanics</li>
              <li>Match result determination</li>
              <li>Calling reportResult() when matches end</li>
            </ul>
          </div>
          <div className="bg-black/30 rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-avax-text-light">What Player1 Handles</h4>
            <ul className="text-avax-text text-sm space-y-1.5">
              <li>Tournament brackets and seeding</li>
              <li>Entry fee escrow</li>
              <li>Prize distribution</li>
              <li>Player reputation tracking</li>
              <li>Achievement awards</li>
              <li>P1 token rewards</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Economic Model */}
      <section className="glass rounded-2xl p-8 md:p-12 space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Economic Model</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-avax-red">Protocol Revenue</h3>
            <div className="bg-black/30 rounded-xl p-5 space-y-3">
              <p className="text-avax-text text-sm leading-relaxed">
                <span className="font-medium text-white">Tournament Fees:</span> 3% of prize pools (configurable), collected automatically on prize distribution.
              </p>
              <p className="text-avax-text text-sm leading-relaxed">
                <span className="font-medium text-white">Club Creation:</span> Optional fee to create clubs — prevents spam and generates revenue.
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-avax-red">Token Distribution</h3>
            <div className="bg-black/30 rounded-xl p-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 font-semibold text-avax-text-light text-xs uppercase tracking-wider">Placement</th>
                    <th className="text-left py-2 font-semibold text-avax-text-light text-xs uppercase tracking-wider">Base Reward</th>
                  </tr>
                </thead>
                <tbody className="text-avax-text">
                  <tr className="border-b border-white/[0.04]"><td className="py-2 text-white font-medium">1st Place</td><td className="py-2">50 P1</td></tr>
                  <tr className="border-b border-white/[0.04]"><td className="py-2 text-white font-medium">2nd Place</td><td className="py-2">25 P1</td></tr>
                  <tr className="border-b border-white/[0.04]"><td className="py-2 text-white font-medium">3rd Place</td><td className="py-2">15 P1</td></tr>
                  <tr><td className="py-2 text-white font-medium">Participation</td><td className="py-2">5 P1</td></tr>
                </tbody>
              </table>
              <p className="text-avax-text text-xs mt-3">Rewards scale with tournament size and entry fee.</p>
            </div>
          </div>
        </div>

        <div className="bg-black/30 rounded-xl p-5 space-y-2">
          <h4 className="font-semibold text-sm uppercase tracking-wider text-avax-text-light">Sustainability</h4>
          <ul className="text-avax-text text-sm space-y-1.5 list-disc list-inside">
            <li>No pre-mine or team allocation</li>
            <li>All tokens earned through competition</li>
            <li>Protocol fees fund development</li>
            <li>Deflationary mechanisms (future)</li>
          </ul>
        </div>
      </section>

      {/* Use Cases */}
      <section className="glass rounded-2xl p-8 md:p-12 space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Use Cases</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-black/30 rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-avax-red">Skill-Based Gaming Platforms</h4>
            <p className="text-avax-text text-sm leading-relaxed">
              Run provably fair tournaments with automatic payouts. Use reputation scores for matchmaking. Offer cross-game progression to increase retention.
            </p>
          </div>
          <div className="bg-black/30 rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-avax-red">Gaming L1s</h4>
            <p className="text-avax-text text-sm leading-relaxed">
              Default competitive infrastructure for all games. Unified identity layer across the ecosystem. Engagement mechanics that keep players on-chain.
            </p>
          </div>
          <div className="bg-black/30 rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-avax-red">Esports Organizations</h4>
            <p className="text-avax-text text-sm leading-relaxed">
              Manage team rosters on-chain. Run internal tournaments. Manage prize pool treasuries. Build verifiable competitive history.
            </p>
          </div>
          <div className="bg-black/30 rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-avax-red">AI Agents</h4>
            <p className="text-avax-text text-sm leading-relaxed">
              AI agents compete in tournaments. Performance builds verifiable track records. Trust scores derived from competitive history.
            </p>
          </div>
        </div>
      </section>

      {/* Deployment */}
      <section className="glass rounded-2xl p-8 md:p-12 space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Deployment</h2>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-avax-red">Avalanche C-Chain (Mainnet)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 font-semibold text-avax-text-light uppercase tracking-wider text-xs">Contract</th>
                  <th className="text-left py-3 px-4 font-semibold text-avax-text-light uppercase tracking-wider text-xs">Address</th>
                </tr>
              </thead>
              <tbody className="text-avax-text">
                <tr className="border-b border-white/[0.04]"><td className="py-2.5 px-4 font-medium text-white">P1Token</td><td className="py-2.5 px-4 font-mono text-xs">0xD967bB3a84109F845ded64eFdB961c0D314a0b20</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-2.5 px-4 font-medium text-white">PlayerPassport</td><td className="py-2.5 px-4 font-mono text-xs">0xe354C6394AAC25a786C27334d2B7bEf367bebDf8</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-2.5 px-4 font-medium text-white">TournamentFactory</td><td className="py-2.5 px-4 font-mono text-xs">0x2EE6635740F8fE3b6B9765A245D0b66Ef013fE5c</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-2.5 px-4 font-medium text-white">AchievementRegistry</td><td className="py-2.5 px-4 font-mono text-xs">0x4431f746969c7A4C0263e012035312bEe8697a7A</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-2.5 px-4 font-medium text-white">RewardDistributor</td><td className="py-2.5 px-4 font-mono text-xs">0xd4A5C78E87267c93fB738c56F1434591fBe8C03D</td></tr>
                <tr><td className="py-2.5 px-4 font-medium text-white">Tournament (impl)</td><td className="py-2.5 px-4 font-mono text-xs">0x108b26a648295326b6220d3bD748f0232f9Bfb2b</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-avax-red">Future Deployments</h3>
          <div className="flex flex-wrap gap-3">
            <span className="px-4 py-2 bg-black/30 rounded-xl text-avax-text text-sm">The Grotto (Avalanche Gaming L1)</span>
            <span className="px-4 py-2 bg-black/30 rounded-xl text-avax-text text-sm">Base</span>
            <span className="px-4 py-2 bg-black/30 rounded-xl text-avax-text text-sm">Arbitrum</span>
            <span className="px-4 py-2 bg-black/30 rounded-xl text-avax-text text-sm">Any EVM-compatible chain</span>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="glass rounded-2xl p-8 md:p-12 space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Roadmap</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-black/30 rounded-xl p-5 space-y-3 border border-avax-red/20">
            <div className="flex items-center gap-2">
              <span className="text-avax-red font-bold text-sm">Phase 1</span>
              <span className="text-xs bg-avax-red/20 text-avax-red px-2 py-0.5 rounded-full">Complete</span>
            </div>
            <h4 className="font-semibold">Foundation</h4>
            <ul className="text-avax-text text-sm space-y-1">
              <li>Core contracts (Tournament, Passport, Achievements, P1 Token)</li>
              <li>TypeScript SDK</li>
              <li>Frontend dashboard</li>
              <li>Mainnet deployment</li>
            </ul>
          </div>
          <div className="bg-black/30 rounded-xl p-5 space-y-3">
            <span className="text-avax-text-light font-bold text-sm">Phase 2</span>
            <h4 className="font-semibold">Social Layer</h4>
            <ul className="text-avax-text text-sm space-y-1">
              <li>Leaderboards</li>
              <li>Social graph (friends/following)</li>
              <li>LFG system</li>
              <li>Clubs/guilds</li>
            </ul>
          </div>
          <div className="bg-black/30 rounded-xl p-5 space-y-3">
            <span className="text-avax-text-light font-bold text-sm">Phase 3</span>
            <h4 className="font-semibold">Ecosystem Growth</h4>
            <ul className="text-avax-text text-sm space-y-1">
              <li>Multi-chain deployment</li>
              <li>Cross-chain reputation aggregation</li>
              <li>Matchmaking API</li>
              <li>Season/league system</li>
            </ul>
          </div>
          <div className="bg-black/30 rounded-xl p-5 space-y-3">
            <span className="text-avax-text-light font-bold text-sm">Phase 4</span>
            <h4 className="font-semibold">Advanced Features</h4>
            <ul className="text-avax-text text-sm space-y-1">
              <li>Spectator integrations</li>
              <li>Streaming platform hooks</li>
              <li>AI agent tournaments</li>
              <li>Governance</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Competitive Landscape */}
      <section className="glass rounded-2xl p-8 md:p-12 space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Competitive Landscape</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 font-semibold text-avax-text-light uppercase tracking-wider text-xs">Feature</th>
                <th className="text-left py-3 px-4 font-semibold text-avax-red uppercase tracking-wider text-xs">Player1</th>
                <th className="text-left py-3 px-4 font-semibold text-avax-text-light uppercase tracking-wider text-xs">Traditional</th>
                <th className="text-left py-3 px-4 font-semibold text-avax-text-light uppercase tracking-wider text-xs">Other Web3</th>
              </tr>
            </thead>
            <tbody className="text-avax-text">
              <tr className="border-b border-white/[0.04]">
                <td className="py-2.5 px-4 text-white">Trustless prizes</td>
                <td className="py-2.5 px-4 text-green-400">Yes</td>
                <td className="py-2.5 px-4 text-red-400">No</td>
                <td className="py-2.5 px-4 text-yellow-400">Partial</td>
              </tr>
              <tr className="border-b border-white/[0.04]">
                <td className="py-2.5 px-4 text-white">Portable reputation</td>
                <td className="py-2.5 px-4 text-green-400">Yes</td>
                <td className="py-2.5 px-4 text-red-400">No</td>
                <td className="py-2.5 px-4 text-red-400">No</td>
              </tr>
              <tr className="border-b border-white/[0.04]">
                <td className="py-2.5 px-4 text-white">Cross-game identity</td>
                <td className="py-2.5 px-4 text-green-400">Yes</td>
                <td className="py-2.5 px-4 text-yellow-400">Partial</td>
                <td className="py-2.5 px-4 text-red-400">No</td>
              </tr>
              <tr className="border-b border-white/[0.04]">
                <td className="py-2.5 px-4 text-white">On-chain verification</td>
                <td className="py-2.5 px-4 text-green-400">Yes</td>
                <td className="py-2.5 px-4 text-red-400">No</td>
                <td className="py-2.5 px-4 text-green-400">Yes</td>
              </tr>
              <tr className="border-b border-white/[0.04]">
                <td className="py-2.5 px-4 text-white">Open integration</td>
                <td className="py-2.5 px-4 text-green-400">Yes</td>
                <td className="py-2.5 px-4 text-red-400">No</td>
                <td className="py-2.5 px-4 text-yellow-400">Varies</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-white">Chain agnostic</td>
                <td className="py-2.5 px-4 text-green-400">Yes</td>
                <td className="py-2.5 px-4 text-avax-text">N/A</td>
                <td className="py-2.5 px-4 text-red-400">No</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Conclusion */}
      <section className="glass rounded-2xl p-8 md:p-12 space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Conclusion</h2>
        <p className="text-avax-text leading-relaxed">
          Player1 Protocol is the missing infrastructure layer for competitive web3 gaming. By providing trustless tournaments, portable reputation, and cross-game identity, we enable:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-xl p-5 text-center space-y-2">
            <h4 className="font-semibold text-avax-red">Game Developers</h4>
            <p className="text-avax-text text-sm">Add competitive features in hours, not months</p>
          </div>
          <div className="bg-black/30 rounded-xl p-5 text-center space-y-2">
            <h4 className="font-semibold text-avax-red">Players</h4>
            <p className="text-avax-text text-sm">Build lasting reputation that follows them everywhere</p>
          </div>
          <div className="bg-black/30 rounded-xl p-5 text-center space-y-2">
            <h4 className="font-semibold text-avax-red">Platforms</h4>
            <p className="text-avax-text text-sm">Unified competitive infrastructure across their ecosystem</p>
          </div>
        </div>
        <p className="text-center text-lg font-semibold mt-4">
          The future of competitive gaming is verifiable, portable, and player-owned.
        </p>
        <p className="text-center text-avax-red font-bold text-xl">
          Player1 builds that future.
        </p>
      </section>

      {/* Links & Contact */}
      <section className="glass rounded-2xl p-8 md:p-12 space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Links & Contact</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-black/30 rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-avax-text-light">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="https://github.com/BuilderBenv1" target="_blank" rel="noopener noreferrer" className="text-avax-red hover:text-white transition-colors">GitHub</a></li>
              <li><a href="https://x.com/BuilderBenv1" target="_blank" rel="noopener noreferrer" className="text-avax-red hover:text-white transition-colors">Twitter / X</a></li>
            </ul>
          </div>
          <div className="bg-black/30 rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-avax-text-light">Contact</h4>
            <p className="text-avax-text text-sm">
              For integration inquiries, partnership discussions, or technical questions:
            </p>
            <p className="text-white text-sm font-medium">hello@player1protocol.io</p>
          </div>
        </div>
        <p className="text-center text-avax-text text-sm italic mt-4">
          Player1 Protocol — Your reputation. Every game. One identity.
        </p>
      </section>
    </div>
  );
}
