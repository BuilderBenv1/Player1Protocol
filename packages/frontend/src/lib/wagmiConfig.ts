import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { avalanche, avalancheFuji } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Player1 Protocol",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
  chains: [avalanche, avalancheFuji],
  ssr: true,
});

// Export chains for use in components
export const supportedChains = [avalanche, avalancheFuji] as const;
export const defaultChain = avalanche;
