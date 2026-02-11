"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { formatEther } from "viem";
import { useReadContract } from "wagmi";
import { CONTRACTS, ACHIEVEMENT_REGISTRY_ABI } from "@/lib/contracts";

enum Rarity {
  Common = 0,
  Rare = 1,
  Legendary = 2,
}

const RARITY_LABELS: Record<Rarity, string> = {
  [Rarity.Common]: "Common",
  [Rarity.Rare]: "Rare",
  [Rarity.Legendary]: "Legendary",
};

const RARITY_STYLES: Record<Rarity, string> = {
  [Rarity.Common]: "badge-common",
  [Rarity.Rare]: "badge-rare",
  [Rarity.Legendary]: "badge-legendary",
};

const RARITY_CARD_STYLES: Record<Rarity, string> = {
  [Rarity.Common]: "border-rarity-common/30 hover:border-rarity-common/50",
  [Rarity.Rare]: "border-rarity-rare/30 hover:border-rarity-rare/50",
  [Rarity.Legendary]: "border-rarity-legendary/30 hover:border-rarity-legendary/50 glow-gold",
};

interface Achievement {
  id: number;
  gameContract: string;
  name: string;
  description: string;
  rarity: Rarity;
  pointValue: number;
  p1Reward: bigint;
  totalUnlocks: number;
  active: boolean;
}

type RarityFilter = "all" | Rarity;

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function AchievementsPage() {
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("all");

  const { data: achievementCount, isLoading } = useReadContract({
    address: CONTRACTS.AchievementRegistry,
    abi: ACHIEVEMENT_REGISTRY_ABI,
    functionName: "getAchievementCount",
  });

  const count = Number(achievementCount || 0n);

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Achievements</h1>
          <p className="text-avax-text">
            {isLoading ? "Loading..." : `${count} achievement${count !== 1 ? "s" : ""} registered on-chain`}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setRarityFilter("all")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            rarityFilter === "all"
              ? "bg-avax-red text-white"
              : "bg-avax-card text-avax-text hover:text-white"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setRarityFilter(Rarity.Common)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            rarityFilter === Rarity.Common
              ? "bg-rarity-common-bg text-rarity-common"
              : "bg-avax-card text-avax-text hover:text-rarity-common"
          }`}
        >
          Common
        </button>
        <button
          onClick={() => setRarityFilter(Rarity.Rare)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            rarityFilter === Rarity.Rare
              ? "bg-rarity-rare-bg text-rarity-rare"
              : "bg-avax-card text-avax-text hover:text-rarity-rare"
          }`}
        >
          Rare
        </button>
        <button
          onClick={() => setRarityFilter(Rarity.Legendary)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            rarityFilter === Rarity.Legendary
              ? "bg-rarity-legendary-bg text-rarity-legendary"
              : "bg-avax-card text-avax-text hover:text-rarity-legendary"
          }`}
        >
          Legendary
        </button>
      </div>

      {/* Achievement Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-avax-text">Loading achievements...</div>
      ) : count === 0 ? (
        <div className="text-center py-12 text-avax-text">
          No achievements registered yet. Achievements appear after games register them.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: count }, (_, i) => (
            <AchievementCard
              key={i + 1}
              achievementId={i + 1}
              index={i}
              rarityFilter={rarityFilter}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function AchievementCard({
  achievementId,
  index,
  rarityFilter,
}: {
  achievementId: number;
  index: number;
  rarityFilter: RarityFilter;
}) {
  const { data: achievement } = useReadContract({
    address: CONTRACTS.AchievementRegistry,
    abi: ACHIEVEMENT_REGISTRY_ABI,
    functionName: "getAchievement",
    args: [BigInt(achievementId)],
  });

  if (!achievement) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className="card border-2 border-avax-border animate-pulse"
      >
        <div className="h-6 bg-avax-border rounded w-3/4 mb-3" />
        <div className="h-4 bg-avax-border rounded w-full mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-8 bg-avax-border rounded" />
          <div className="h-8 bg-avax-border rounded" />
        </div>
      </motion.div>
    );
  }

  const rarity = Number(achievement.rarity) as Rarity;

  // Apply filter
  if (rarityFilter !== "all" && rarity !== rarityFilter) {
    return null;
  }

  const isLegendary = rarity === Rarity.Legendary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`
        card border-2 transition-all
        ${RARITY_CARD_STYLES[rarity]}
        ${isLegendary ? "bg-gradient-to-br from-rarity-legendary-bg/20 to-avax-card" : ""}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{achievement.name}</h3>
        </div>
        <span className={`badge ${RARITY_STYLES[rarity]}`}>
          {RARITY_LABELS[rarity]}
        </span>
      </div>

      {/* Description */}
      <p className="text-avax-text text-sm mb-4">{achievement.description}</p>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-avax-text block">Points</span>
          <span className="font-semibold">{Number(achievement.pointValue)}</span>
        </div>
        <div>
          <span className="text-avax-text block">P1 Reward</span>
          <span className="font-semibold text-avax-red">
            {formatEther(achievement.p1Reward)} P1
          </span>
        </div>
        <div>
          <span className="text-avax-text block">Unlocks</span>
          <span className="font-semibold">{Number(achievement.totalUnlocks).toLocaleString()}</span>
        </div>
        <div>
          <span className="text-avax-text block">Game</span>
          <span className="font-mono text-xs">{truncateAddress(achievement.gameContract)}</span>
        </div>
      </div>

      {/* Legendary glow effect */}
      {isLegendary && (
        <div className="absolute inset-0 rounded-xl pointer-events-none">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-rarity-legendary/10 to-transparent opacity-50" />
        </div>
      )}
    </motion.div>
  );
}
