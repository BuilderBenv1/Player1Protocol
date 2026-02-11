"use client";

import { useState } from "react";
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
  [Rarity.Common]: "border-white/[0.04] hover:border-rarity-common/30",
  [Rarity.Rare]: "border-rarity-rare/20 hover:border-rarity-rare/40",
  [Rarity.Legendary]: "border-rarity-legendary/20 hover:border-rarity-legendary/40",
};

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

  const filters: { key: RarityFilter; label: string; activeClass: string }[] = [
    { key: "all", label: "All", activeClass: "bg-avax-red text-white shadow-lg shadow-avax-red/20" },
    { key: Rarity.Common, label: "Common", activeClass: "bg-rarity-common-bg text-rarity-common" },
    { key: Rarity.Rare, label: "Rare", activeClass: "bg-rarity-rare-bg text-rarity-rare" },
    { key: Rarity.Legendary, label: "Legendary", activeClass: "bg-rarity-legendary-bg text-rarity-legendary" },
  ];

  return (
    <motion.div
      className="space-y-8 pb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">ACHIEVEMENTS</h1>
        <p className="text-avax-text text-sm mt-1">
          {isLoading ? "Loading..." : `${count} achievement${count !== 1 ? "s" : ""} registered on-chain`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map(({ key, label, activeClass }) => (
          <button
            key={String(key)}
            onClick={() => setRarityFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              rarityFilter === key
                ? activeClass
                : "bg-avax-card text-avax-text hover:text-white border border-avax-border hover:border-avax-border-light"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : count === 0 ? (
        <div className="text-center py-20">
          <p className="text-avax-text text-lg">No achievements registered yet.</p>
          <p className="text-avax-text text-sm mt-1">Achievements appear after games register them.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        <div className="skeleton h-48 rounded-2xl" />
      </motion.div>
    );
  }

  const rarity = Number(achievement.rarity) as Rarity;

  if (rarityFilter !== "all" && rarity !== rarityFilter) {
    return null;
  }

  const isLegendary = rarity === Rarity.Legendary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`
        card border-2 transition-all
        ${RARITY_CARD_STYLES[rarity]}
        ${isLegendary ? "bg-gradient-to-br from-rarity-legendary-bg/10 to-avax-card" : ""}
      `}
    >
      {/* Legendary glow */}
      {isLegendary && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-rarity-legendary/5 to-transparent pointer-events-none" />
      )}

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-base tracking-tight flex-1">{achievement.name}</h3>
          <span className={`badge ml-3 ${RARITY_STYLES[rarity]}`}>
            {RARITY_LABELS[rarity]}
          </span>
        </div>

        {/* Description */}
        <p className="text-avax-text text-sm mb-5 leading-relaxed">{achievement.description}</p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[10px] text-avax-text uppercase tracking-widest block">Points</span>
            <span className="font-bold">{Number(achievement.pointValue)}</span>
          </div>
          <div>
            <span className="text-[10px] text-avax-text uppercase tracking-widest block">P1 Reward</span>
            <span className="font-bold text-avax-red">{formatEther(achievement.p1Reward)} P1</span>
          </div>
          <div>
            <span className="text-[10px] text-avax-text uppercase tracking-widest block">Unlocks</span>
            <span className="font-bold">{Number(achievement.totalUnlocks).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[10px] text-avax-text uppercase tracking-widest block">Game</span>
            <span className="font-mono text-xs text-avax-text-light">{truncateAddress(achievement.gameContract)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
