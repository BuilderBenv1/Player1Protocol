import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export interface Config {
  relayPrivateKey: `0x${string}`;
  chainId: 43113 | 43114;
  rpcUrl: string;
  port: number;
  apiKeys: Record<string, string>; // gameName → apiKey
}

const RPC_URLS: Record<number, string> = {
  43113: "https://api.avax-test.network/ext/bc/C/rpc",
  43114: "https://api.avax.network/ext/bc/C/rpc",
};

export function loadConfig(): Config {
  const key = process.env.RELAY_PRIVATE_KEY;
  if (!key) {
    throw new Error("RELAY_PRIVATE_KEY is required");
  }

  const relayPrivateKey = (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`;
  const chainId = (parseInt(process.env.CHAIN_ID || "43114") as 43113 | 43114);

  if (chainId !== 43113 && chainId !== 43114) {
    throw new Error(`Invalid CHAIN_ID: ${chainId}. Must be 43113 (Fuji) or 43114 (mainnet)`);
  }

  let apiKeys: Record<string, string> = {};
  if (process.env.API_KEYS) {
    try {
      apiKeys = JSON.parse(process.env.API_KEYS);
    } catch {
      throw new Error("API_KEYS must be valid JSON, e.g. {\"gameName\":\"key-value\"}");
    }
  }

  return {
    relayPrivateKey,
    chainId,
    rpcUrl: process.env.RPC_URL || RPC_URLS[chainId],
    port: parseInt(process.env.PORT || "3001"),
    apiKeys,
  };
}
