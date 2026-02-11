/**
 * @player1/sdk — Universal competitive gaming infrastructure for web3
 *
 * TypeScript SDK for interacting with the Player1 Protocol contracts.
 */

export { Player1Client } from "./Player1Client";
export type { Player1Config, TournamentParams } from "./Player1Client";

export * from "./types";
export {
  CONTRACT_ADDRESSES,
  SUPPORTED_CHAINS,
  getContractAddresses,
  isChainSupported,
  type ContractAddresses,
} from "./contracts/addresses";

export {
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

export const SDK_VERSION = "0.1.0";
