"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useReadContract } from "wagmi";
import { formatEther, type Address } from "viem";
import {
  CONTRACTS,
  PLAYER_PASSPORT_ABI,
  P1_TOKEN_ABI,
  ACHIEVEMENT_REGISTRY_ABI,
} from "@/lib/contracts";

export default function PlayerProfilePage() {
  const params = useParams();
  const address = params.address as Address;

  const truncatedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const { data: profile, isLoading: profileLoading } = useReadContract({
    address: CONTRACTS.PlayerPassport,
    abi: PLAYER_PASSPORT_ABI,
    functionName: "getProfile",
    args: [address],
  });

  const { data: p1Balance } = useReadContract({
    address: CONTRACTS.P1Token,
    abi: P1_TOKEN_ABI,
    functionName: "balanceOf",
    args: [address],
  });

  const { data: achievementHistory } = useReadContract({
    address: CONTRACTS.PlayerPassport,
    abi: PLAYER_PASSPORT_ABI,
    functionName: "getAchievementHistory",
    args: [address],
  });

  if (profileLoading) {
    return (
      <div className="space-y-8">
        <div className="card animate-pulse">
          <div className="h-32 bg-avax-border rounded" />
        </div>
      </div>
    );
  }

  const hasProfile = profile && profile.exists;
  const compositeScore = hasProfile ? Number(profile.compositeScore) : 0;
  const totalTournaments = hasProfile ? Number(profile.totalTournaments) : 0;
  const totalWins = hasProfile ? Number(profile.totalWins) : 0;
  const totalTopThree = hasProfile ? Number(profile.totalTopThree) : 0;
  const totalPrizeMoney = hasProfile ? profile.totalPrizeMoney : 0n;
  const currentWinStreak = hasProfile ? Number(profile.currentWinStreak) : 0;
  const longestWinStreak = hasProfile ? Number(profile.longestWinStreak) : 0;
  const p1Earned = hasProfile ? profile.p1Earned : 0n;
  const winRate = totalTournaments > 0 ? Math.round((totalWins / totalTournaments) * 100) : 0;
  const scoreTier = getScoreTier(compositeScore);
  const achievements = (achievementHistory as any[]) || [];

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <motion.div
        className="card bg-gradient-to-br from-avax-card to-avax-darker"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Score Display */}
          <div className="relative">
            <div className={`w-32 h-32 rounded-full border-4 ${scoreTier.borderColor} flex items-center justify-center glow-red`}>
              <div className="text-center">
                <div className="text-3xl font-bold">{compositeScore.toLocaleString()}</div>
                <div className="text-xs text-avax-text uppercase">{scoreTier.name}</div>
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <h1 className="text-2xl font-bold font-mono">{truncatedAddress}</h1>
              <button
                onClick={() => navigator.clipboard.writeText(address)}
                className="text-avax-text hover:text-white p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            {!hasProfile && (
              <p className="text-avax-text">No passport found for this address.</p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-avax-dark/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-avax-red">
                {p1Balance != null ? formatEther(p1Balance) : "0"}
              </div>
              <div className="text-xs text-avax-text">P1 Balance</div>
            </div>
            <div className="bg-avax-dark/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-400">{winRate}%</div>
              <div className="text-xs text-avax-text">Win Rate</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Tournaments" value={totalTournaments} />
        <StatCard label="Wins" value={totalWins} />
        <StatCard label="Top 3 Finishes" value={totalTopThree} />
        <StatCard label="Prize Money" value={`${formatEther(totalPrizeMoney)} AVAX`} />
        <StatCard label="Current Streak" value={currentWinStreak} highlight={currentWinStreak >= 3} />
        <StatCard label="Longest Streak" value={longestWinStreak} />
        <StatCard label="P1 Earned" value={p1Balance != null ? formatEther(p1Balance) : "0"} />
        <StatCard label="Achievements" value={achievements.length} />
      </div>

      {/* Achievements */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Achievements</h2>
        {achievements.length === 0 ? (
          <p className="text-avax-text text-center py-6">No achievements unlocked yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {achievements.map((unlock: any, index: number) => (
              <AchievementUnlockCard
                key={index}
                achievementId={Number(unlock.achievementId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AchievementUnlockCard({ achievementId }: { achievementId: number }) {
  const { data: achievement } = useReadContract({
    address: CONTRACTS.AchievementRegistry,
    abi: ACHIEVEMENT_REGISTRY_ABI,
    functionName: "getAchievement",
    args: [BigInt(achievementId)],
  });

  if (!achievement) {
    return (
      <div className="card text-center animate-pulse">
        <div className="h-12 w-12 bg-avax-border rounded-full mx-auto mb-2" />
        <div className="h-4 bg-avax-border rounded w-3/4 mx-auto" />
      </div>
    );
  }

  const rarityLabels = ["Common", "Rare", "Legendary"];
  const rarityColors = ["badge-common", "badge-rare", "badge-legendary"];

  return (
    <div className="card text-center">
      <div className="w-12 h-12 bg-avax-dark rounded-full mx-auto mb-2 flex items-center justify-center">
        <svg className="w-6 h-6 text-avax-red" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </div>
      <h4 className="font-medium text-sm mb-1">{achievement.name}</h4>
      <span className={`badge text-xs ${rarityColors[Number(achievement.rarity)] || ""}`}>
        {rarityLabels[Number(achievement.rarity)] || "Unknown"}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className="card text-center">
      <div className={`text-2xl font-bold ${highlight ? "text-avax-red" : ""}`}>{value}</div>
      <div className="text-sm text-avax-text">{label}</div>
    </div>
  );
}

function getScoreTier(score: number): { name: string; borderColor: string } {
  if (score >= 50000) return { name: "Diamond", borderColor: "border-tier-diamond" };
  if (score >= 10000) return { name: "Platinum", borderColor: "border-tier-platinum" };
  if (score >= 5000) return { name: "Gold", borderColor: "border-tier-gold" };
  if (score >= 1000) return { name: "Silver", borderColor: "border-tier-silver" };
  return { name: "Bronze", borderColor: "border-tier-bronze" };
}
