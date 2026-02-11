import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Address,
  type Chain,
  type Hash,
  decodeEventLog,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalanche, avalancheFuji } from "viem/chains";
import { type Config } from "./config";

// Contract ABIs — imported inline to avoid SDK workspace dep issues
import {
  P1_TOKEN_ABI,
  PLAYER_PASSPORT_ABI,
  TOURNAMENT_FACTORY_ABI,
  TOURNAMENT_ABI,
  ACHIEVEMENT_REGISTRY_ABI,
} from "./abis";

// Contract addresses per chain
const CONTRACT_ADDRESSES: Record<number, Record<string, Address>> = {
  43114: {
    P1Token: "0xD967bB3a84109F845ded64eFdB961c0D314a0b20",
    AchievementRegistry: "0x4431f746969c7A4C0263e012035312bEe8697a7A",
    PlayerPassport: "0xe354C6394AAC25a786C27334d2B7bEf367bebDf8",
    TournamentFactory: "0x2EE6635740F8fE3b6B9765A245D0b66Ef013fE5c",
    RewardDistributor: "0xd4A5C78E87267c93fB738c56F1434591fBe8C03D",
  },
  43113: {
    P1Token: "0xD5413889C518AC479731B06DD5d063cD08B4b1cb",
    AchievementRegistry: "0xaC7EF608641Ae0D8b027C735BbC80C513766219b",
    PlayerPassport: "0xAfD4C1B72c6514C3B43de62EaE310657F02bccf5",
    TournamentFactory: "0x734974f3C20Da199Bbb30D5d50e59b439A44404B",
    RewardDistributor: "0xf9436653C09095Fc78B4C87F38A9659f4f03aC0F",
  },
};

const CHAINS: Record<number, Chain> = { 43113: avalancheFuji, 43114: avalanche };

export class ApiClient {
  public publicClient: PublicClient;
  public walletClient: WalletClient;
  public contracts: Record<string, Address>;
  public chain: Chain;
  public relayAddress: Address;

  constructor(config: Config) {
    const chain = CHAINS[config.chainId];
    if (!chain) throw new Error(`Unsupported chain: ${config.chainId}`);

    const contracts = CONTRACT_ADDRESSES[config.chainId];
    if (!contracts) throw new Error(`No contracts for chain: ${config.chainId}`);

    const account = privateKeyToAccount(config.relayPrivateKey);

    this.chain = chain;
    this.contracts = contracts;
    this.relayAddress = account.address;

    this.publicClient = createPublicClient({
      chain,
      transport: http(config.rpcUrl),
    });

    this.walletClient = createWalletClient({
      account,
      chain,
      transport: http(config.rpcUrl),
    });
  }

  // ── Read: Players ──

  async getPlayerProfile(player: Address) {
    return this.publicClient.readContract({
      address: this.contracts.PlayerPassport as Address,
      abi: PLAYER_PASSPORT_ABI,
      functionName: "getProfile",
      args: [player],
    });
  }

  async getPlayerStats(player: Address) {
    return this.publicClient.readContract({
      address: this.contracts.PlayerPassport as Address,
      abi: PLAYER_PASSPORT_ABI,
      functionName: "getPlayerStats",
      args: [player],
    });
  }

  async getPlayerAchievements(player: Address) {
    return this.publicClient.readContract({
      address: this.contracts.PlayerPassport as Address,
      abi: PLAYER_PASSPORT_ABI,
      functionName: "getAchievementHistory",
      args: [player],
    });
  }

  async getP1Balance(player: Address) {
    return this.publicClient.readContract({
      address: this.contracts.P1Token as Address,
      abi: P1_TOKEN_ABI,
      functionName: "balanceOf",
      args: [player],
    });
  }

  // ── Read: Tournaments ──

  async getAllTournaments() {
    return this.publicClient.readContract({
      address: this.contracts.TournamentFactory as Address,
      abi: TOURNAMENT_FACTORY_ABI,
      functionName: "getTournaments",
    }) as Promise<Address[]>;
  }

  async getTournamentCount() {
    return this.publicClient.readContract({
      address: this.contracts.TournamentFactory as Address,
      abi: TOURNAMENT_FACTORY_ABI,
      functionName: "getTournamentCount",
    }) as Promise<bigint>;
  }

  async getTournamentConfig(tournament: Address) {
    return this.publicClient.readContract({
      address: tournament,
      abi: TOURNAMENT_ABI,
      functionName: "getConfig",
    });
  }

  async getTournamentStatus(tournament: Address) {
    return this.publicClient.readContract({
      address: tournament,
      abi: TOURNAMENT_ABI,
      functionName: "status",
    }) as Promise<number>;
  }

  async getTournamentPrizePool(tournament: Address) {
    return this.publicClient.readContract({
      address: tournament,
      abi: TOURNAMENT_ABI,
      functionName: "prizePool",
    }) as Promise<bigint>;
  }

  async getTournamentPlayerCount(tournament: Address) {
    return this.publicClient.readContract({
      address: tournament,
      abi: TOURNAMENT_ABI,
      functionName: "getPlayerCount",
    }) as Promise<bigint>;
  }

  async getTournamentPlayers(tournament: Address) {
    return this.publicClient.readContract({
      address: tournament,
      abi: TOURNAMENT_ABI,
      functionName: "getPlayers",
    }) as Promise<Address[]>;
  }

  async getBracket(tournament: Address) {
    return this.publicClient.readContract({
      address: tournament,
      abi: TOURNAMENT_ABI,
      functionName: "getBracket",
    });
  }

  async getMatches(tournament: Address) {
    return this.publicClient.readContract({
      address: tournament,
      abi: TOURNAMENT_ABI,
      functionName: "getAllMatches",
    });
  }

  // ── Read: Achievements ──

  async getAchievementCount() {
    return this.publicClient.readContract({
      address: this.contracts.AchievementRegistry as Address,
      abi: ACHIEVEMENT_REGISTRY_ABI,
      functionName: "getAchievementCount",
    }) as Promise<bigint>;
  }

  async getAchievement(id: bigint) {
    return this.publicClient.readContract({
      address: this.contracts.AchievementRegistry as Address,
      abi: ACHIEVEMENT_REGISTRY_ABI,
      functionName: "getAchievement",
      args: [id],
    });
  }

  // ── Read: Protocol stats ──

  async getTotalPassports() {
    return this.publicClient.readContract({
      address: this.contracts.PlayerPassport as Address,
      abi: PLAYER_PASSPORT_ABI,
      functionName: "totalPassports",
    }) as Promise<bigint>;
  }

  async getP1TotalSupply() {
    return this.publicClient.readContract({
      address: this.contracts.P1Token as Address,
      abi: P1_TOKEN_ABI,
      functionName: "totalSupply",
    }) as Promise<bigint>;
  }

  // ── Write: Tournaments ──

  async createTournament(params: {
    name: string;
    description: string;
    gameContract: Address;
    entryFee: bigint;
    maxPlayers: bigint;
    prizeSplitBps: bigint[];
    registrationDeadline: bigint;
    disputeWindowSeconds: bigint;
  }): Promise<{ tournamentAddress: Address; txHash: Hash }> {
    const hash = await this.walletClient.writeContract({
      address: this.contracts.TournamentFactory as Address,
      abi: TOURNAMENT_FACTORY_ABI,
      functionName: "createTournament",
      args: [
        params.name,
        params.description,
        params.gameContract,
        params.entryFee,
        params.maxPlayers,
        params.prizeSplitBps,
        params.registrationDeadline,
        params.disputeWindowSeconds,
      ],
      account: this.walletClient.account!,
      chain: this.chain,
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    for (const log of receipt.logs) {
      try {
        const event = decodeEventLog({
          abi: TOURNAMENT_FACTORY_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (event.eventName === "TournamentCreated") {
          return { tournamentAddress: (event.args as any).tournament, txHash: hash };
        }
      } catch {}
    }

    return { tournamentAddress: "0x0" as Address, txHash: hash };
  }

  async reportMatchResult(tournament: Address, matchId: number, winner: Address): Promise<Hash> {
    return this.walletClient.writeContract({
      address: tournament,
      abi: TOURNAMENT_ABI,
      functionName: "reportResult",
      args: [BigInt(matchId), winner],
      account: this.walletClient.account!,
      chain: this.chain,
    });
  }

  // ── Write: Achievements ──

  async awardAchievement(player: Address, achievementId: bigint): Promise<Hash> {
    return this.walletClient.writeContract({
      address: this.contracts.PlayerPassport as Address,
      abi: PLAYER_PASSPORT_ABI,
      functionName: "attestAchievement",
      args: [player, achievementId],
      account: this.walletClient.account!,
      chain: this.chain,
    });
  }
}

let _client: ApiClient | null = null;

export function getClient(config: Config): ApiClient {
  if (!_client) {
    _client = new ApiClient(config);
  }
  return _client;
}
