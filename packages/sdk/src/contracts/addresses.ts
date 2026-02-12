/**
 * Contract Addresses per Network
 */

export interface ContractAddresses {
  P1Token: `0x${string}`;
  AchievementRegistry: `0x${string}`;
  PlayerPassport: `0x${string}`;
  TournamentFactory: `0x${string}`;
  RewardDistributor: `0x${string}`;
  Leaderboard: `0x${string}`;
  SocialGraph: `0x${string}`;
  LFG: `0x${string}`;
  PlayerReputation: `0x${string}`;
  ClubFactory: `0x${string}`;
}

export const SUPPORTED_CHAINS = {
  AVALANCHE_FUJI: 43113,
  AVALANCHE_MAINNET: 43114,
} as const;

/**
 * Contract addresses by chain ID
 */
export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  // Avalanche Mainnet (C-Chain)
  [SUPPORTED_CHAINS.AVALANCHE_MAINNET]: {
    P1Token: "0xD967bB3a84109F845ded64eFdB961c0D314a0b20",
    AchievementRegistry: "0x4431f746969c7A4C0263e012035312bEe8697a7A",
    PlayerPassport: "0xe354C6394AAC25a786C27334d2B7bEf367bebDf8",
    TournamentFactory: "0x2EE6635740F8fE3b6B9765A245D0b66Ef013fE5c",
    RewardDistributor: "0xd4A5C78E87267c93fB738c56F1434591fBe8C03D",
    Leaderboard: "0xf3DD4b4715112eCaDE84fD0a73AC838CB02bE0eC",
    SocialGraph: "0x5D65af9228BF3a189773DD1deeaE8365936B084c",
    LFG: "0x079dA118713C72E37bfebE807F631C78cE09fCce",
    PlayerReputation: "0x7f0A3c531f52E127864FB6F379D6cE07685CCA63",
    ClubFactory: "0x1Bbc2d469f83C56904E0BAC0E361F2DCD84d736E",
  },
  // Avalanche Fuji Testnet
  [SUPPORTED_CHAINS.AVALANCHE_FUJI]: {
    P1Token: "0xD5413889C518AC479731B06DD5d063cD08B4b1cb",
    AchievementRegistry: "0xaC7EF608641Ae0D8b027C735BbC80C513766219b",
    PlayerPassport: "0xAfD4C1B72c6514C3B43de62EaE310657F02bccf5",
    TournamentFactory: "0x734974f3C20Da199Bbb30D5d50e59b439A44404B",
    RewardDistributor: "0xf9436653C09095Fc78B4C87F38A9659f4f03aC0F",
    Leaderboard: "0x0000000000000000000000000000000000000000",
    SocialGraph: "0x0000000000000000000000000000000000000000",
    LFG: "0x0000000000000000000000000000000000000000",
    PlayerReputation: "0x0000000000000000000000000000000000000000",
    ClubFactory: "0x0000000000000000000000000000000000000000",
  },
};

/**
 * Get contract addresses for a specific chain
 */
export function getContractAddresses(chainId: number): ContractAddresses | undefined {
  return CONTRACT_ADDRESSES[chainId];
}

/**
 * Check if a chain is supported
 */
export function isChainSupported(chainId: number): boolean {
  return chainId in CONTRACT_ADDRESSES;
}
