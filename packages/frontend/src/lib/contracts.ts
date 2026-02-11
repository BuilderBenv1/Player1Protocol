import { type Address } from "viem";

// Contract addresses by chain ID
const CONTRACT_ADDRESSES: Record<number, Record<string, Address>> = {
  // Avalanche Mainnet (43114)
  43114: {
    P1Token: "0xD967bB3a84109F845ded64eFdB961c0D314a0b20",
    AchievementRegistry: "0x4431f746969c7A4C0263e012035312bEe8697a7A",
    PlayerPassport: "0xe354C6394AAC25a786C27334d2B7bEf367bebDf8",
    TournamentFactory: "0x2EE6635740F8fE3b6B9765A245D0b66Ef013fE5c",
    RewardDistributor: "0xd4A5C78E87267c93fB738c56F1434591fBe8C03D",
  },
  // Avalanche Fuji Testnet (43113)
  43113: {
    P1Token: "0xD5413889C518AC479731B06DD5d063cD08B4b1cb",
    AchievementRegistry: "0xaC7EF608641Ae0D8b027C735BbC80C513766219b",
    PlayerPassport: "0xAfD4C1B72c6514C3B43de62EaE310657F02bccf5",
    TournamentFactory: "0x734974f3C20Da199Bbb30D5d50e59b439A44404B",
    RewardDistributor: "0xf9436653C09095Fc78B4C87F38A9659f4f03aC0F",
    DemoGame: "0x8b8792206fcBCbD9C7E175d793eed339c90Dbeb7",
  },
};

// Default to mainnet, allow env override per contract
const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "43114");

export const CONTRACTS: Record<string, Address> = {
  P1Token: (process.env.NEXT_PUBLIC_P1_TOKEN || CONTRACT_ADDRESSES[chainId]?.P1Token || "0x") as Address,
  AchievementRegistry: (process.env.NEXT_PUBLIC_ACHIEVEMENT_REGISTRY || CONTRACT_ADDRESSES[chainId]?.AchievementRegistry || "0x") as Address,
  PlayerPassport: (process.env.NEXT_PUBLIC_PLAYER_PASSPORT || CONTRACT_ADDRESSES[chainId]?.PlayerPassport || "0x") as Address,
  TournamentFactory: (process.env.NEXT_PUBLIC_TOURNAMENT_FACTORY || CONTRACT_ADDRESSES[chainId]?.TournamentFactory || "0x") as Address,
  RewardDistributor: (process.env.NEXT_PUBLIC_REWARD_DISTRIBUTOR || CONTRACT_ADDRESSES[chainId]?.RewardDistributor || "0x") as Address,
  DemoGame: (process.env.NEXT_PUBLIC_DEMO_GAME || CONTRACT_ADDRESSES[chainId]?.DemoGame || "0x") as Address,
} as const;

export { CONTRACT_ADDRESSES };

// ABIs - simplified for key functions
export const P1_TOKEN_ABI = [
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

export const PLAYER_PASSPORT_ABI = [
  {
    name: "getProfile",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "compositeScore", type: "uint256" },
          { name: "totalTournaments", type: "uint256" },
          { name: "totalWins", type: "uint256" },
          { name: "totalTopThree", type: "uint256" },
          { name: "totalPrizeMoney", type: "uint256" },
          { name: "currentWinStreak", type: "uint256" },
          { name: "longestWinStreak", type: "uint256" },
          { name: "p1Earned", type: "uint256" },
          { name: "exists", type: "bool" },
        ],
      },
    ],
  },
  {
    name: "getCompositeScore",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalPassports",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getPlayerStats",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [
      { name: "compositeScore", type: "uint256" },
      { name: "totalTournaments", type: "uint256" },
      { name: "totalWins", type: "uint256" },
      { name: "winRate", type: "uint256" },
      { name: "totalPrizeMoney", type: "uint256" },
      { name: "longestWinStreak", type: "uint256" },
      { name: "p1Earned", type: "uint256" },
    ],
  },
  {
    name: "getAchievementHistory",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "achievementId", type: "uint256" },
          { name: "gameContract", type: "address" },
          { name: "unlockedAt", type: "uint256" },
        ],
      },
    ],
  },
] as const;

export const TOURNAMENT_FACTORY_ABI = [
  {
    name: "protocolFeeBps",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getTournaments",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    name: "getTournamentCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getActiveTournaments",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    name: "createTournament",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "description", type: "string" },
      { name: "gameContract", type: "address" },
      { name: "entryFee", type: "uint256" },
      { name: "maxPlayers", type: "uint256" },
      { name: "prizeSplitBps", type: "uint256[]" },
      { name: "registrationDeadline", type: "uint256" },
      { name: "disputeWindowSeconds", type: "uint256" },
    ],
    outputs: [{ name: "tournament", type: "address" }],
  },
] as const;

export const TOURNAMENT_ABI = [
  {
    name: "getConfig",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "organizer", type: "address" },
          { name: "gameContract", type: "address" },
          { name: "entryFee", type: "uint256" },
          { name: "maxPlayers", type: "uint256" },
          { name: "prizeSplitBps", type: "uint256[]" },
          { name: "protocolFeeBps", type: "uint256" },
          { name: "registrationDeadline", type: "uint256" },
          { name: "disputeWindowSeconds", type: "uint256" },
          { name: "name", type: "string" },
          { name: "description", type: "string" },
        ],
      },
    ],
  },
  {
    name: "status",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "prizePool",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getPlayerCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getPlayers",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    name: "register",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    name: "isRegistered",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getAllMatches",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "matchId", type: "uint256" },
          { name: "round", type: "uint256" },
          { name: "player1", type: "address" },
          { name: "player2", type: "address" },
          { name: "winner", type: "address" },
          { name: "reporter", type: "address" },
          { name: "reportedAt", type: "uint256" },
          { name: "status", type: "uint8" },
        ],
      },
    ],
  },
  {
    name: "getBracket",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "player", type: "address" },
          { name: "seed", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "reportResult",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "matchId", type: "uint256" },
      { name: "winner", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "currentRound",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "claimPrize",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "getClaimableAmount",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "generateBracketDeterministic",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

export const ACHIEVEMENT_REGISTRY_ABI = [
  {
    name: "getAchievement",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "gameContract", type: "address" },
          { name: "name", type: "string" },
          { name: "description", type: "string" },
          { name: "rarity", type: "uint8" },
          { name: "pointValue", type: "uint256" },
          { name: "p1Reward", type: "uint256" },
          { name: "totalUnlocks", type: "uint256" },
          { name: "active", type: "bool" },
        ],
      },
    ],
  },
  {
    name: "getAchievementCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getGameAchievements",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "gameContract", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
] as const;
