import {
  createPublicClient,
  http,
  decodeEventLog,
  type PublicClient,
  type WalletClient,
  type Address,
  type Chain,
  type Hash,
} from "viem";
import { avalancheFuji, avalanche } from "viem/chains";
import { CONTRACT_ADDRESSES, type ContractAddresses } from "./contracts/addresses";
import {
  P1_TOKEN_ABI,
  PLAYER_PASSPORT_ABI,
  TOURNAMENT_FACTORY_ABI,
  TOURNAMENT_ABI,
  ACHIEVEMENT_REGISTRY_ABI,
  LEADERBOARD_ABI,
  SOCIAL_GRAPH_ABI,
  LFG_ABI,
  PLAYER_REPUTATION_ABI,
  CLUB_ABI,
  CLUB_FACTORY_ABI,
} from "./contracts/abis";
import type {
  PlayerProfile,
  PlayerStats,
  TournamentInfo,
  TournamentConfig,
  TournamentResult,
  Match,
  BracketSlot,
  Achievement,
  AchievementUnlock,
  TournamentStatus,
  Rarity,
  LeaderboardScore,
  PlayerRank,
  ReputationData,
  LFGListing,
  LFGParams,
  ClubInfo,
  ClubParams,
} from "./types";
import { LeaderboardPeriod } from "./types";

export interface Player1Config {
  chain: Chain;
  rpcUrl?: string;
  walletClient?: WalletClient;
}

export interface TournamentParams {
  name: string;
  description?: string;
  gameContract: Address;
  entryFee: bigint;
  maxPlayers: 4 | 8 | 16 | 32 | 64 | 128;
  prizeSplit: [number, number, number];
  registrationDeadline: number;
  disputeWindowSeconds?: number;
}

const CHAIN_MAP: Record<number, Chain> = {
  43113: avalancheFuji,
  43114: avalanche,
};

export class Player1Client {
  private publicClient: PublicClient;
  private walletClient?: WalletClient;
  private contracts: ContractAddresses;
  private chain: Chain;

  constructor(config: Player1Config) {
    this.chain = config.chain;

    const addresses = CONTRACT_ADDRESSES[config.chain.id];
    if (!addresses) {
      throw new Error(`Chain ${config.chain.id} (${config.chain.name}) is not supported. Supported: Avalanche Fuji (43113)`);
    }
    this.contracts = addresses;

    this.publicClient = createPublicClient({
      chain: config.chain,
      transport: http(config.rpcUrl),
    });

    this.walletClient = config.walletClient;
  }

  private requireWallet(): WalletClient & { account: NonNullable<WalletClient["account"]> } {
    if (!this.walletClient) {
      throw new Error("WalletClient required for write operations. Pass walletClient in Player1Config.");
    }
    if (!this.walletClient.account) {
      throw new Error("WalletClient must have an account. Use createWalletClient with an account parameter.");
    }
    return this.walletClient as WalletClient & { account: NonNullable<WalletClient["account"]> };
  }

  // ═══════════════════════════════════════════════════════════════════
  // TOURNAMENT OPERATIONS (Write)
  // ═══════════════════════════════════════════════════════════════════

  async createTournament(params: TournamentParams): Promise<Address> {
    const wallet = this.requireWallet();
    const prizeSplitBps = params.prizeSplit.map((p) => BigInt(p * 100));

    const hash = await wallet.writeContract({
      address: this.contracts.TournamentFactory,
      abi: TOURNAMENT_FACTORY_ABI,
      functionName: "createTournament",
      args: [
        params.name,
        params.description || "",
        params.gameContract,
        params.entryFee,
        BigInt(params.maxPlayers),
        prizeSplitBps,
        BigInt(params.registrationDeadline),
        BigInt(params.disputeWindowSeconds || 1800),
      ],
      account: wallet.account,
      chain: this.chain,
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    // Parse TournamentCreated event to get address
    for (const log of receipt.logs) {
      try {
        const event = decodeEventLog({
          abi: TOURNAMENT_FACTORY_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (event.eventName === "TournamentCreated") {
          return (event.args as any).tournament as Address;
        }
      } catch {}
    }

    throw new Error("Failed to parse TournamentCreated event from transaction receipt");
  }

  async register(tournament: Address): Promise<Hash> {
    const wallet = this.requireWallet();
    const config = await this.publicClient.readContract({
      address: tournament,
      abi: TOURNAMENT_ABI,
      functionName: "getConfig",
    }) as any;

    return wallet.writeContract({
      address: tournament,
      abi: TOURNAMENT_ABI,
      functionName: "register",
      value: config.entryFee,
      account: wallet.account,
      chain: this.chain,
    });
  }

  async reportMatchResult(tournament: Address, matchId: number, winner: Address): Promise<Hash> {
    const wallet = this.requireWallet();
    return wallet.writeContract({
      address: tournament,
      abi: TOURNAMENT_ABI,
      functionName: "reportResult",
      args: [BigInt(matchId), winner],
      account: wallet.account,
      chain: this.chain,
    });
  }

  async confirmMatchResult(tournament: Address, matchId: number): Promise<Hash> {
    const wallet = this.requireWallet();
    return wallet.writeContract({
      address: tournament,
      abi: TOURNAMENT_ABI,
      functionName: "confirmResult",
      args: [BigInt(matchId)],
      account: wallet.account,
      chain: this.chain,
    });
  }

  async claimPrize(tournament: Address): Promise<Hash> {
    const wallet = this.requireWallet();
    return wallet.writeContract({
      address: tournament,
      abi: TOURNAMENT_ABI,
      functionName: "claimPrize",
      account: wallet.account,
      chain: this.chain,
    });
  }

  async generateBracket(tournament: Address, deterministic = false): Promise<Hash> {
    const wallet = this.requireWallet();
    if (deterministic) {
      return wallet.writeContract({
        address: tournament,
        abi: TOURNAMENT_ABI,
        functionName: "generateBracketDeterministic",
        account: wallet.account,
        chain: this.chain,
      });
    }
    return wallet.writeContract({
      address: tournament,
      abi: TOURNAMENT_ABI,
      functionName: "generateBracket",
      account: wallet.account,
      chain: this.chain,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // TOURNAMENT READ OPERATIONS
  // ═══════════════════════════════════════════════════════════════════

  async getTournament(address: Address): Promise<TournamentInfo> {
    const [config, info] = await Promise.all([
      this.publicClient.readContract({ address, abi: TOURNAMENT_ABI, functionName: "getConfig" }),
      this.publicClient.readContract({ address, abi: TOURNAMENT_ABI, functionName: "getTournamentInfo" }),
    ]);

    const i = info as any;
    return {
      address,
      config: config as any as TournamentConfig,
      status: Number(i[0]) as TournamentStatus,
      playerCount: i[1] as bigint,
      prizePool: i[2] as bigint,
      currentRound: i[3] as bigint,
      bracketGenerated: i[4] as boolean,
    };
  }

  async getActiveTournaments(): Promise<TournamentInfo[]> {
    const addresses = await this.publicClient.readContract({
      address: this.contracts.TournamentFactory,
      abi: TOURNAMENT_FACTORY_ABI,
      functionName: "getActiveTournaments",
    }) as Address[];

    return Promise.all(addresses.map((addr) => this.getTournament(addr)));
  }

  async getAllTournaments(): Promise<Address[]> {
    return this.publicClient.readContract({
      address: this.contracts.TournamentFactory,
      abi: TOURNAMENT_FACTORY_ABI,
      functionName: "getTournaments",
    }) as Promise<Address[]>;
  }

  async getTournamentCount(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contracts.TournamentFactory,
      abi: TOURNAMENT_FACTORY_ABI,
      functionName: "getTournamentCount",
    }) as Promise<bigint>;
  }

  async getBracket(tournament: Address): Promise<BracketSlot[]> {
    const raw = await this.publicClient.readContract({
      address: tournament,
      abi: TOURNAMENT_ABI,
      functionName: "getBracket",
    }) as any[];
    return raw as BracketSlot[];
  }

  async getMatches(tournament: Address): Promise<Match[]> {
    const raw = await this.publicClient.readContract({
      address: tournament,
      abi: TOURNAMENT_ABI,
      functionName: "getAllMatches",
    }) as any[];
    return raw as Match[];
  }

  async getClaimableAmount(tournament: Address, player: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: tournament,
      abi: TOURNAMENT_ABI,
      functionName: "getClaimableAmount",
      args: [player],
    }) as Promise<bigint>;
  }

  // ═══════════════════════════════════════════════════════════════════
  // PLAYER OPERATIONS
  // ═══════════════════════════════════════════════════════════════════

  async getPlayerProfile(player: Address): Promise<PlayerProfile> {
    const raw = await this.publicClient.readContract({
      address: this.contracts.PlayerPassport,
      abi: PLAYER_PASSPORT_ABI,
      functionName: "getProfile",
      args: [player],
    });
    return raw as any as PlayerProfile;
  }

  async getPlayerStats(player: Address): Promise<PlayerStats> {
    const raw = await this.publicClient.readContract({
      address: this.contracts.PlayerPassport,
      abi: PLAYER_PASSPORT_ABI,
      functionName: "getPlayerStats",
      args: [player],
    });
    const r = raw as any;
    return {
      compositeScore: r[0],
      totalTournaments: r[1],
      totalWins: r[2],
      winRate: r[3],
      totalPrizeMoney: r[4],
      longestWinStreak: r[5],
      p1Earned: r[6],
    };
  }

  async getTournamentHistory(player: Address, offset?: number, limit?: number): Promise<TournamentResult[]> {
    if (offset !== undefined && limit !== undefined) {
      const raw = await this.publicClient.readContract({
        address: this.contracts.PlayerPassport,
        abi: PLAYER_PASSPORT_ABI,
        functionName: "getTournamentHistoryPaginated",
        args: [player, BigInt(offset), BigInt(limit)],
      });
      return raw as any as TournamentResult[];
    }

    const raw = await this.publicClient.readContract({
      address: this.contracts.PlayerPassport,
      abi: PLAYER_PASSPORT_ABI,
      functionName: "getTournamentHistory",
      args: [player],
    });
    return raw as any as TournamentResult[];
  }

  async getPlayerAchievements(player: Address): Promise<AchievementUnlock[]> {
    const raw = await this.publicClient.readContract({
      address: this.contracts.PlayerPassport,
      abi: PLAYER_PASSPORT_ABI,
      functionName: "getAchievementHistory",
      args: [player],
    });
    return raw as any as AchievementUnlock[];
  }

  async getP1Balance(player: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contracts.P1Token,
      abi: P1_TOKEN_ABI,
      functionName: "balanceOf",
      args: [player],
    }) as Promise<bigint>;
  }

  async getP1TotalSupply(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contracts.P1Token,
      abi: P1_TOKEN_ABI,
      functionName: "totalSupply",
    }) as Promise<bigint>;
  }

  async getTotalPassports(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contracts.PlayerPassport,
      abi: PLAYER_PASSPORT_ABI,
      functionName: "totalPassports",
    }) as Promise<bigint>;
  }

  // ═══════════════════════════════════════════════════════════════════
  // ACHIEVEMENT OPERATIONS
  // ═══════════════════════════════════════════════════════════════════

  async getAchievement(id: bigint): Promise<Achievement> {
    const raw = await this.publicClient.readContract({
      address: this.contracts.AchievementRegistry,
      abi: ACHIEVEMENT_REGISTRY_ABI,
      functionName: "getAchievement",
      args: [id],
    });
    return raw as any as Achievement;
  }

  async getAchievementCount(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contracts.AchievementRegistry,
      abi: ACHIEVEMENT_REGISTRY_ABI,
      functionName: "getAchievementCount",
    }) as Promise<bigint>;
  }

  async registerAchievement(
    name: string,
    description: string,
    rarity: "Common" | "Rare" | "Legendary",
  ): Promise<Hash> {
    const wallet = this.requireWallet();
    const rarityMap = { Common: 0, Rare: 1, Legendary: 2 };
    return wallet.writeContract({
      address: this.contracts.AchievementRegistry,
      abi: ACHIEVEMENT_REGISTRY_ABI,
      functionName: "registerAchievement",
      args: [name, description, rarityMap[rarity]],
      account: wallet.account,
      chain: this.chain,
    });
  }

  async awardAchievement(player: Address, achievementId: bigint): Promise<Hash> {
    const wallet = this.requireWallet();
    return wallet.writeContract({
      address: this.contracts.PlayerPassport,
      abi: PLAYER_PASSPORT_ABI,
      functionName: "attestAchievement",
      args: [player, achievementId],
      account: wallet.account,
      chain: this.chain,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // LEADERBOARD OPERATIONS
  // ═══════════════════════════════════════════════════════════════════

  async getTopScores(leaderboardId: `0x${string}`, period: LeaderboardPeriod = LeaderboardPeriod.AllTime, limit = 10): Promise<LeaderboardScore[]> {
    const raw = await this.publicClient.readContract({
      address: this.contracts.Leaderboard,
      abi: LEADERBOARD_ABI,
      functionName: "getTopScores",
      args: [leaderboardId, period, BigInt(limit)],
    });
    return raw as any as LeaderboardScore[];
  }

  async getPlayerRank(leaderboardId: `0x${string}`, period: LeaderboardPeriod, player: Address): Promise<PlayerRank> {
    const raw = await this.publicClient.readContract({
      address: this.contracts.Leaderboard,
      abi: LEADERBOARD_ABI,
      functionName: "getPlayerRank",
      args: [leaderboardId, period, player],
    });
    const r = raw as any;
    return { rank: r[0], score: r[1] };
  }

  async getGameLeaderboards(game: Address): Promise<`0x${string}`[]> {
    return this.publicClient.readContract({
      address: this.contracts.Leaderboard,
      abi: LEADERBOARD_ABI,
      functionName: "getGameLeaderboards",
      args: [game],
    }) as Promise<`0x${string}`[]>;
  }

  async submitScore(leaderboardId: `0x${string}`, player: Address, value: bigint): Promise<Hash> {
    const wallet = this.requireWallet();
    return wallet.writeContract({
      address: this.contracts.Leaderboard,
      abi: LEADERBOARD_ABI,
      functionName: "submitScore",
      args: [leaderboardId, player, value],
      account: wallet.account,
      chain: this.chain,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // SOCIAL GRAPH OPERATIONS
  // ═══════════════════════════════════════════════════════════════════

  async follow(player: Address): Promise<Hash> {
    const wallet = this.requireWallet();
    return wallet.writeContract({
      address: this.contracts.SocialGraph,
      abi: SOCIAL_GRAPH_ABI,
      functionName: "follow",
      args: [player],
      account: wallet.account,
      chain: this.chain,
    });
  }

  async unfollow(player: Address): Promise<Hash> {
    const wallet = this.requireWallet();
    return wallet.writeContract({
      address: this.contracts.SocialGraph,
      abi: SOCIAL_GRAPH_ABI,
      functionName: "unfollow",
      args: [player],
      account: wallet.account,
      chain: this.chain,
    });
  }

  async blockPlayer(player: Address): Promise<Hash> {
    const wallet = this.requireWallet();
    return wallet.writeContract({
      address: this.contracts.SocialGraph,
      abi: SOCIAL_GRAPH_ABI,
      functionName: "blockPlayer",
      args: [player],
      account: wallet.account,
      chain: this.chain,
    });
  }

  async getFollowing(player: Address): Promise<Address[]> {
    return this.publicClient.readContract({
      address: this.contracts.SocialGraph,
      abi: SOCIAL_GRAPH_ABI,
      functionName: "getFollowing",
      args: [player],
    }) as Promise<Address[]>;
  }

  async getFollowers(player: Address): Promise<Address[]> {
    return this.publicClient.readContract({
      address: this.contracts.SocialGraph,
      abi: SOCIAL_GRAPH_ABI,
      functionName: "getFollowers",
      args: [player],
    }) as Promise<Address[]>;
  }

  async getFriends(player: Address): Promise<Address[]> {
    return this.publicClient.readContract({
      address: this.contracts.SocialGraph,
      abi: SOCIAL_GRAPH_ABI,
      functionName: "getFriends",
      args: [player],
    }) as Promise<Address[]>;
  }

  async areFriends(a: Address, b: Address): Promise<boolean> {
    return this.publicClient.readContract({
      address: this.contracts.SocialGraph,
      abi: SOCIAL_GRAPH_ABI,
      functionName: "areFriends",
      args: [a, b],
    }) as Promise<boolean>;
  }

  async isFollowing(follower: Address, followed: Address): Promise<boolean> {
    return this.publicClient.readContract({
      address: this.contracts.SocialGraph,
      abi: SOCIAL_GRAPH_ABI,
      functionName: "isFollowing",
      args: [follower, followed],
    }) as Promise<boolean>;
  }

  async getBio(player: Address): Promise<string> {
    return this.publicClient.readContract({
      address: this.contracts.SocialGraph,
      abi: SOCIAL_GRAPH_ABI,
      functionName: "bio",
      args: [player],
    }) as Promise<string>;
  }

  async setBio(bio: string): Promise<Hash> {
    const wallet = this.requireWallet();
    return wallet.writeContract({
      address: this.contracts.SocialGraph,
      abi: SOCIAL_GRAPH_ABI,
      functionName: "setBio",
      args: [bio],
      account: wallet.account,
      chain: this.chain,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // LFG OPERATIONS
  // ═══════════════════════════════════════════════════════════════════

  async createLFGListing(params: LFGParams): Promise<Hash> {
    const wallet = this.requireWallet();
    return wallet.writeContract({
      address: this.contracts.LFG,
      abi: LFG_ABI,
      functionName: "createListing",
      args: [
        params.game,
        params.activity,
        params.minScore || 0n,
        params.maxScore || 0n,
        BigInt(params.playersNeeded),
        BigInt(params.duration),
      ],
      account: wallet.account,
      chain: this.chain,
    });
  }

  async joinListing(listingId: bigint): Promise<Hash> {
    const wallet = this.requireWallet();
    return wallet.writeContract({
      address: this.contracts.LFG,
      abi: LFG_ABI,
      functionName: "joinListing",
      args: [listingId],
      account: wallet.account,
      chain: this.chain,
    });
  }

  async leaveListing(listingId: bigint): Promise<Hash> {
    const wallet = this.requireWallet();
    return wallet.writeContract({
      address: this.contracts.LFG,
      abi: LFG_ABI,
      functionName: "leaveListing",
      args: [listingId],
      account: wallet.account,
      chain: this.chain,
    });
  }

  async getLFGListing(listingId: bigint): Promise<LFGListing> {
    const raw = await this.publicClient.readContract({
      address: this.contracts.LFG,
      abi: LFG_ABI,
      functionName: "getListing",
      args: [listingId],
    });
    const r = raw as any;
    return {
      id: r[0], creator: r[1], game: r[2], activity: r[3],
      minScore: r[4], maxScore: r[5], playersNeeded: r[6], playersJoined: r[7],
      players: r[8], createdAt: r[9], expiresAt: r[10], active: r[11],
    };
  }

  async getActiveListingsForGame(game: Address): Promise<bigint[]> {
    return this.publicClient.readContract({
      address: this.contracts.LFG,
      abi: LFG_ABI,
      functionName: "getActiveListingsForGame",
      args: [game],
    }) as Promise<bigint[]>;
  }

  // ═══════════════════════════════════════════════════════════════════
  // REPUTATION OPERATIONS
  // ═══════════════════════════════════════════════════════════════════

  async ratePlayer(player: Address, positive: boolean): Promise<Hash> {
    const wallet = this.requireWallet();
    return wallet.writeContract({
      address: this.contracts.PlayerReputation,
      abi: PLAYER_REPUTATION_ABI,
      functionName: "ratePlayer",
      args: [player, positive],
      account: wallet.account,
      chain: this.chain,
    });
  }

  async getReputation(player: Address): Promise<ReputationData> {
    const raw = await this.publicClient.readContract({
      address: this.contracts.PlayerReputation,
      abi: PLAYER_REPUTATION_ABI,
      functionName: "getReputation",
      args: [player],
    });
    const r = raw as any;
    return { positive: r[0], negative: r[1], total: r[2], score: r[3] };
  }

  async getReputationPercent(player: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contracts.PlayerReputation,
      abi: PLAYER_REPUTATION_ABI,
      functionName: "getReputationPercent",
      args: [player],
    }) as Promise<bigint>;
  }

  async canRatePlayer(rater: Address, player: Address): Promise<boolean> {
    return this.publicClient.readContract({
      address: this.contracts.PlayerReputation,
      abi: PLAYER_REPUTATION_ABI,
      functionName: "canRate",
      args: [rater, player],
    }) as Promise<boolean>;
  }

  // ═══════════════════════════════════════════════════════════════════
  // CLUB OPERATIONS
  // ═══════════════════════════════════════════════════════════════════

  async createClub(params: ClubParams): Promise<Hash> {
    const wallet = this.requireWallet();
    const creationFee = await this.publicClient.readContract({
      address: this.contracts.ClubFactory,
      abi: CLUB_FACTORY_ABI,
      functionName: "creationFee",
    }) as bigint;

    return wallet.writeContract({
      address: this.contracts.ClubFactory,
      abi: CLUB_FACTORY_ABI,
      functionName: "createClub",
      args: [
        params.name,
        params.tag,
        params.description,
        params.membershipFee || 0n,
        BigInt(params.maxMembers || 100),
        params.inviteOnly || false,
      ],
      value: creationFee,
      account: wallet.account,
      chain: this.chain,
    });
  }

  async joinClub(club: Address): Promise<Hash> {
    const wallet = this.requireWallet();
    const info = await this.getClubInfo(club);
    return wallet.writeContract({
      address: club,
      abi: CLUB_ABI,
      functionName: "join",
      value: info.membershipFee,
      account: wallet.account,
      chain: this.chain,
    });
  }

  async leaveClub(club: Address): Promise<Hash> {
    const wallet = this.requireWallet();
    return wallet.writeContract({
      address: club,
      abi: CLUB_ABI,
      functionName: "leave",
      account: wallet.account,
      chain: this.chain,
    });
  }

  async getClubInfo(club: Address): Promise<ClubInfo> {
    const raw = await this.publicClient.readContract({
      address: club,
      abi: CLUB_ABI,
      functionName: "getClubInfo",
    });
    const r = raw as any;
    return {
      name: r[0], tag: r[1], description: r[2], owner: r[3],
      memberCount: r[4], maxMembers: r[5], membershipFee: r[6],
      inviteOnly: r[7], treasury: r[8],
    };
  }

  async getAllClubs(): Promise<Address[]> {
    return this.publicClient.readContract({
      address: this.contracts.ClubFactory,
      abi: CLUB_FACTORY_ABI,
      functionName: "getAllClubs",
    }) as Promise<Address[]>;
  }

  async getClubMembers(club: Address): Promise<Address[]> {
    return this.publicClient.readContract({
      address: club,
      abi: CLUB_ABI,
      functionName: "getMembers",
    }) as Promise<Address[]>;
  }

  // ═══════════════════════════════════════════════════════════════════
  // UTILITY
  // ═══════════════════════════════════════════════════════════════════

  getContractAddresses(): ContractAddresses {
    return this.contracts;
  }

  getChain(): Chain {
    return this.chain;
  }
}
