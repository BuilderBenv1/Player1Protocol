/**
 * Contract ABIs for Player1 Protocol
 * Copied from @player1/sdk to avoid cross-workspace dependency issues
 */

export const P1_TOKEN_ABI = [
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
] as const;

export const PLAYER_PASSPORT_ABI = [
  {
    name: "getProfile", type: "function", stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{
      name: "", type: "tuple",
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
    }],
  },
  {
    name: "getPlayerStats", type: "function", stateMutability: "view",
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
  { name: "totalPassports", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "getCompositeScore", type: "function", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  {
    name: "getAchievementHistory", type: "function", stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{
      name: "", type: "tuple[]",
      components: [
        { name: "achievementId", type: "uint256" },
        { name: "gameContract", type: "address" },
        { name: "timestamp", type: "uint256" },
      ],
    }],
  },
  {
    name: "getTournamentHistory", type: "function", stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{
      name: "", type: "tuple[]",
      components: [
        { name: "tournamentContract", type: "address" },
        { name: "placement", type: "uint8" },
        { name: "prizeMoney", type: "uint256" },
        { name: "pointsEarned", type: "uint256" },
        { name: "timestamp", type: "uint256" },
      ],
    }],
  },
  {
    name: "getTournamentHistoryPaginated", type: "function", stateMutability: "view",
    inputs: [{ name: "player", type: "address" }, { name: "offset", type: "uint256" }, { name: "limit", type: "uint256" }],
    outputs: [{
      name: "", type: "tuple[]",
      components: [
        { name: "tournamentContract", type: "address" },
        { name: "placement", type: "uint8" },
        { name: "prizeMoney", type: "uint256" },
        { name: "pointsEarned", type: "uint256" },
        { name: "timestamp", type: "uint256" },
      ],
    }],
  },
  { name: "hasPlayerAchievement", type: "function", stateMutability: "view", inputs: [{ name: "player", type: "address" }, { name: "achievementId", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
  {
    name: "attestAchievement", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "player", type: "address" }, { name: "achievementId", type: "uint256" }],
    outputs: [],
  },
] as const;

export const TOURNAMENT_FACTORY_ABI = [
  { name: "protocolFeeBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "getTournaments", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address[]" }] },
  { name: "getTournamentCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "getActiveTournaments", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address[]" }] },
  {
    name: "createTournament", type: "function", stateMutability: "nonpayable",
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
  {
    name: "TournamentCreated", type: "event",
    inputs: [
      { name: "tournament", type: "address", indexed: true },
      { name: "organizer", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
    ],
  },
] as const;

export const TOURNAMENT_ABI = [
  {
    name: "getConfig", type: "function", stateMutability: "view", inputs: [],
    outputs: [{
      name: "", type: "tuple",
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
    }],
  },
  { name: "status", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
  { name: "prizePool", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "getPlayerCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "getPlayers", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address[]" }] },
  { name: "currentRound", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "bracketGenerated", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] },
  { name: "register", type: "function", stateMutability: "payable", inputs: [], outputs: [] },
  { name: "isRegistered", type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { name: "getClaimableAmount", type: "function", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "claimPrize", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "reportResult", type: "function", stateMutability: "nonpayable", inputs: [{ name: "matchId", type: "uint256" }, { name: "winner", type: "address" }], outputs: [] },
  { name: "confirmResult", type: "function", stateMutability: "nonpayable", inputs: [{ name: "matchId", type: "uint256" }], outputs: [] },
  { name: "generateBracket", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "generateBracketDeterministic", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    name: "getAllMatches", type: "function", stateMutability: "view", inputs: [],
    outputs: [{
      name: "", type: "tuple[]",
      components: [
        { name: "matchId", type: "uint256" }, { name: "round", type: "uint256" },
        { name: "player1", type: "address" }, { name: "player2", type: "address" },
        { name: "winner", type: "address" }, { name: "reporter", type: "address" },
        { name: "reportedAt", type: "uint256" }, { name: "status", type: "uint8" },
      ],
    }],
  },
  {
    name: "getBracket", type: "function", stateMutability: "view", inputs: [],
    outputs: [{ name: "", type: "tuple[]", components: [{ name: "player", type: "address" }, { name: "seed", type: "uint256" }] }],
  },
  {
    name: "getTournamentInfo", type: "function", stateMutability: "view", inputs: [],
    outputs: [
      { name: "_status", type: "uint8" }, { name: "playerCount", type: "uint256" },
      { name: "_prizePool", type: "uint256" }, { name: "_currentRound", type: "uint256" },
      { name: "_bracketGenerated", type: "bool" },
    ],
  },
] as const;

export const ACHIEVEMENT_REGISTRY_ABI = [
  {
    name: "getAchievement", type: "function", stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{
      name: "", type: "tuple",
      components: [
        { name: "id", type: "uint256" }, { name: "gameContract", type: "address" },
        { name: "name", type: "string" }, { name: "description", type: "string" },
        { name: "rarity", type: "uint8" }, { name: "pointValue", type: "uint256" },
        { name: "p1Reward", type: "uint256" }, { name: "totalUnlocks", type: "uint256" },
        { name: "active", type: "bool" },
      ],
    }],
  },
  { name: "getAchievementCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "getGameAchievements", type: "function", stateMutability: "view", inputs: [{ name: "gameContract", type: "address" }], outputs: [{ name: "", type: "uint256[]" }] },
  {
    name: "registerAchievement", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "name", type: "string" }, { name: "description", type: "string" }, { name: "rarity", type: "uint8" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
