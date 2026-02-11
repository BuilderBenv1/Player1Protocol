/**
 * Player1 Protocol SDK Types
 */

export interface PlayerProfile {
  compositeScore: bigint;
  totalTournaments: bigint;
  totalWins: bigint;
  totalTopThree: bigint;
  totalPrizeMoney: bigint;
  currentWinStreak: bigint;
  longestWinStreak: bigint;
  p1Earned: bigint;
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
  rarity: Rarity;
  pointValue: bigint;
  p1Reward: bigint;
  totalUnlocks: bigint;
  active: boolean;
}

export enum Rarity {
  Common = 0,
  Rare = 1,
  Legendary = 2,
}

export interface TournamentConfig {
  organizer: `0x${string}`;
  gameContract: `0x${string}`;
  entryFee: bigint;
  maxPlayers: bigint;
  prizeSplitBps: bigint[];
  protocolFeeBps: bigint;
  registrationDeadline: bigint;
  disputeWindowSeconds: bigint;
  name: string;
  description: string;
}

export interface TournamentInfo {
  address: `0x${string}`;
  config: TournamentConfig;
  status: TournamentStatus;
  playerCount: bigint;
  prizePool: bigint;
  currentRound: bigint;
  bracketGenerated: boolean;
}

export enum TournamentStatus {
  Registration = 0,
  Active = 1,
  Completed = 2,
  Cancelled = 3,
  Finalized = 4,
}

export interface Match {
  matchId: bigint;
  round: bigint;
  player1: `0x${string}`;
  player2: `0x${string}`;
  winner: `0x${string}`;
  reporter: `0x${string}`;
  reportedAt: bigint;
  status: MatchStatus;
}

export enum MatchStatus {
  Pending = 0,
  Reported = 1,
  Confirmed = 2,
  Disputed = 3,
}

export interface BracketSlot {
  player: `0x${string}`;
  seed: bigint;
}

export interface PlayerStats {
  compositeScore: bigint;
  totalTournaments: bigint;
  totalWins: bigint;
  winRate: bigint; // In basis points (0-10000)
  totalPrizeMoney: bigint;
  longestWinStreak: bigint;
  p1Earned: bigint;
}

/**
 * Event Types
 */

export interface ScoreUpdatedEvent {
  player: `0x${string}`;
  newCompositeScore: bigint;
  pointsAdded: bigint;
}

export interface AchievementAttestedEvent {
  player: `0x${string}`;
  achievementId: bigint;
  gameContract: `0x${string}`;
  pointsEarned: bigint;
}

export interface TournamentCreatedEvent {
  tournament: `0x${string}`;
  organizer: `0x${string}`;
  gameContract: `0x${string}`;
  name: string;
  entryFee: bigint;
  maxPlayers: bigint;
}

export interface TournamentCompletedEvent {
  tournament: `0x${string}`;
  prizePool: bigint;
  winner: `0x${string}`;
}
