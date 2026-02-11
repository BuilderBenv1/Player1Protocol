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
} from "./types";

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
  // UTILITY
  // ═══════════════════════════════════════════════════════════════════

  getContractAddresses(): ContractAddresses {
    return this.contracts;
  }

  getChain(): Chain {
    return this.chain;
  }
}
