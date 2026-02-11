/**
 * Contract ABIs for Player1 Protocol
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

export const LEADERBOARD_ABI = [
  { name: "createLeaderboard", type: "function", stateMutability: "nonpayable", inputs: [{ name: "game", type: "address" }, { name: "metricName", type: "string" }, { name: "higherIsBetter", type: "bool" }, { name: "maxEntries", type: "uint256" }], outputs: [{ name: "leaderboardId", type: "bytes32" }] },
  { name: "submitScore", type: "function", stateMutability: "nonpayable", inputs: [{ name: "leaderboardId", type: "bytes32" }, { name: "player", type: "address" }, { name: "value", type: "uint256" }], outputs: [] },
  {
    name: "getTopScores", type: "function", stateMutability: "view",
    inputs: [{ name: "leaderboardId", type: "bytes32" }, { name: "period", type: "uint8" }, { name: "limit", type: "uint256" }],
    outputs: [{ name: "", type: "tuple[]", components: [{ name: "player", type: "address" }, { name: "value", type: "uint256" }, { name: "timestamp", type: "uint256" }] }],
  },
  { name: "getPlayerRank", type: "function", stateMutability: "view", inputs: [{ name: "leaderboardId", type: "bytes32" }, { name: "period", type: "uint8" }, { name: "player", type: "address" }], outputs: [{ name: "rank", type: "uint256" }, { name: "score", type: "uint256" }] },
  { name: "getGameLeaderboards", type: "function", stateMutability: "view", inputs: [{ name: "game", type: "address" }], outputs: [{ name: "", type: "bytes32[]" }] },
  { name: "ScoreSubmitted", type: "event", inputs: [{ name: "leaderboardId", type: "bytes32", indexed: true }, { name: "player", type: "address", indexed: true }, { name: "value", type: "uint256", indexed: false }, { name: "rank", type: "uint256", indexed: false }] },
] as const;

export const SOCIAL_GRAPH_ABI = [
  { name: "follow", type: "function", stateMutability: "nonpayable", inputs: [{ name: "player", type: "address" }], outputs: [] },
  { name: "unfollow", type: "function", stateMutability: "nonpayable", inputs: [{ name: "player", type: "address" }], outputs: [] },
  { name: "blockPlayer", type: "function", stateMutability: "nonpayable", inputs: [{ name: "player", type: "address" }], outputs: [] },
  { name: "unblockPlayer", type: "function", stateMutability: "nonpayable", inputs: [{ name: "player", type: "address" }], outputs: [] },
  { name: "setBio", type: "function", stateMutability: "nonpayable", inputs: [{ name: "newBio", type: "string" }], outputs: [] },
  { name: "isFollowing", type: "function", stateMutability: "view", inputs: [{ name: "follower", type: "address" }, { name: "followed", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { name: "areFriends", type: "function", stateMutability: "view", inputs: [{ name: "a", type: "address" }, { name: "b", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { name: "getFollowing", type: "function", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ name: "", type: "address[]" }] },
  { name: "getFollowers", type: "function", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ name: "", type: "address[]" }] },
  { name: "getFollowingCount", type: "function", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "getFollowerCount", type: "function", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "getFriends", type: "function", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ name: "", type: "address[]" }] },
  { name: "bio", type: "function", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ name: "", type: "string" }] },
] as const;

export const LFG_ABI = [
  { name: "createListing", type: "function", stateMutability: "nonpayable", inputs: [{ name: "game", type: "address" }, { name: "activity", type: "string" }, { name: "minScore", type: "uint256" }, { name: "maxScore", type: "uint256" }, { name: "playersNeeded", type: "uint256" }, { name: "duration", type: "uint256" }], outputs: [{ name: "listingId", type: "uint256" }] },
  { name: "joinListing", type: "function", stateMutability: "nonpayable", inputs: [{ name: "listingId", type: "uint256" }], outputs: [] },
  { name: "leaveListing", type: "function", stateMutability: "nonpayable", inputs: [{ name: "listingId", type: "uint256" }], outputs: [] },
  { name: "cancelListing", type: "function", stateMutability: "nonpayable", inputs: [{ name: "listingId", type: "uint256" }], outputs: [] },
  {
    name: "getListing", type: "function", stateMutability: "view",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" }, { name: "creator", type: "address" }, { name: "game", type: "address" },
      { name: "activity", type: "string" }, { name: "minScore", type: "uint256" }, { name: "maxScore", type: "uint256" },
      { name: "playersNeeded", type: "uint256" }, { name: "playersJoined", type: "uint256" },
      { name: "players", type: "address[]" }, { name: "createdAt", type: "uint256" },
      { name: "expiresAt", type: "uint256" }, { name: "active", type: "bool" },
    ],
  },
  { name: "getActiveListingsForGame", type: "function", stateMutability: "view", inputs: [{ name: "game", type: "address" }], outputs: [{ name: "", type: "uint256[]" }] },
  { name: "getPlayerActiveListings", type: "function", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ name: "", type: "uint256[]" }] },
  { name: "nextListingId", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
] as const;

export const PLAYER_REPUTATION_ABI = [
  { name: "recordMatch", type: "function", stateMutability: "nonpayable", inputs: [{ name: "player1", type: "address" }, { name: "player2", type: "address" }], outputs: [] },
  { name: "ratePlayer", type: "function", stateMutability: "nonpayable", inputs: [{ name: "player", type: "address" }, { name: "positive", type: "bool" }], outputs: [] },
  { name: "getReputation", type: "function", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ name: "positive", type: "uint256" }, { name: "negative", type: "uint256" }, { name: "total", type: "uint256" }, { name: "score", type: "int256" }] },
  { name: "getReputationPercent", type: "function", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "canRate", type: "function", stateMutability: "view", inputs: [{ name: "rater", type: "address" }, { name: "player", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { name: "hasPlayedAgainst", type: "function", stateMutability: "view", inputs: [{ name: "a", type: "address" }, { name: "b", type: "address" }], outputs: [{ name: "", type: "bool" }] },
] as const;

export const CLUB_ABI = [
  { name: "join", type: "function", stateMutability: "payable", inputs: [], outputs: [] },
  { name: "leave", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "invite", type: "function", stateMutability: "nonpayable", inputs: [{ name: "player", type: "address" }], outputs: [] },
  { name: "kick", type: "function", stateMutability: "nonpayable", inputs: [{ name: "member", type: "address" }], outputs: [] },
  { name: "depositToTreasury", type: "function", stateMutability: "payable", inputs: [], outputs: [] },
  {
    name: "getClubInfo", type: "function", stateMutability: "view", inputs: [],
    outputs: [
      { name: "_name", type: "string" }, { name: "_tag", type: "string" }, { name: "_description", type: "string" },
      { name: "_owner", type: "address" }, { name: "_memberCount", type: "uint256" }, { name: "_maxMembers", type: "uint256" },
      { name: "_membershipFee", type: "uint256" }, { name: "_inviteOnly", type: "bool" }, { name: "_treasury", type: "uint256" },
    ],
  },
  { name: "getMembers", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address[]" }] },
  { name: "getMemberCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "isMember", type: "function", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { name: "memberSince", type: "function", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
] as const;

export const CLUB_FACTORY_ABI = [
  { name: "createClub", type: "function", stateMutability: "payable", inputs: [{ name: "name", type: "string" }, { name: "tag", type: "string" }, { name: "description", type: "string" }, { name: "membershipFee", type: "uint256" }, { name: "maxMembers", type: "uint256" }, { name: "inviteOnly", type: "bool" }], outputs: [{ name: "", type: "address" }] },
  { name: "getClubCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "getAllClubs", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address[]" }] },
  { name: "getClubsByOwner", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ name: "", type: "address[]" }] },
  { name: "creationFee", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "tagTaken", type: "function", stateMutability: "view", inputs: [{ name: "tag", type: "string" }], outputs: [{ name: "", type: "bool" }] },
  { name: "ClubCreated", type: "event", inputs: [{ name: "club", type: "address", indexed: true }, { name: "owner", type: "address", indexed: true }, { name: "name", type: "string", indexed: false }, { name: "tag", type: "string", indexed: false }] },
] as const;
