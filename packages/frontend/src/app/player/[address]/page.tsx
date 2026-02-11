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
      <div className="space-y-6">
        <div className="skeleton h-48 rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
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
    <div className="space-y-6 pb-8">
      {/* Profile Header — Xbox Gamerscore style */}
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-avax-border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-avax-card via-avax-dark to-black" />
        <div className="absolute top-0 left-0 w-72 h-72 bg-avax-red/[0.06] rounded-full blur-[100px]" />

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Score Circle */}
            <div className="relative flex-shrink-0">
              <div className={`w-36 h-36 rounded-full border-[3px] ${scoreTier.borderColor} flex items-center justify-center relative`}>
                {/* Animated ring */}
                <div className={`absolute inset-0 rounded-full border-[3px] ${scoreTier.borderColor} animate-pulse-ring opacity-30`} />
                <div className="text-center">
                  <div className="text-4xl font-extrabold tracking-tight">{compositeScore.toLocaleString()}</div>
                  <div className={`text-xs font-bold uppercase tracking-[0.15em] mt-1 ${scoreTier.textColor}`}>{scoreTier.name}</div>
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                <h1 className="text-2xl font-bold font-mono tracking-tight">{truncatedAddress}</h1>
                <button
                  onClick={() => navigator.clipboard.writeText(address)}
                  className="text-avax-text hover:text-white p-1.5 rounded-lg hover:bg-white/[0.06] transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              {!hasProfile && (
                <p className="text-avax-text text-sm">No passport found for this address.</p>
              )}
              {hasProfile && (
                <p className="text-avax-text text-sm">
                  {totalTournaments} tournaments &middot; {totalWins} wins &middot; {achievements.length} achievements
                </p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 flex-shrink-0">
              <div className="bg-black/30 rounded-xl p-4 text-center border border-white/[0.04] min-w-[100px]">
                <div className="text-2xl font-bold text-avax-red tracking-tight">
                  {p1Balance != null ? Number(formatEther(p1Balance)).toLocaleString() : "0"}
                </div>
                <div className="text-[10px] text-avax-text uppercase tracking-[0.15em] mt-0.5">P1 Balance</div>
              </div>
              <div className="bg-black/30 rounded-xl p-4 text-center border border-white/[0.04] min-w-[100px]">
                <div className="text-2xl font-bold text-emerald-400 tracking-tight">{winRate}%</div>
                <div className="text-[10px] text-avax-text uppercase tracking-[0.15em] mt-0.5">Win Rate</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Tournaments" value={totalTournaments} />
        <StatCard label="Wins" value={totalWins} />
        <StatCard label="Top 3" value={totalTopThree} />
        <StatCard label="Prize Money" value={`${Number(formatEther(totalPrizeMoney)).toFixed(2)} AVAX`} />
        <StatCard label="Current Streak" value={currentWinStreak} highlight={currentWinStreak >= 3} />
        <StatCard label="Best Streak" value={longestWinStreak} />
        <StatCard label="P1 Earned" value={p1Balance != null ? Number(formatEther(p1Balance)).toLocaleString() : "0"} />
        <StatCard label="Achievements" value={achievements.length} />
      </div>

      {/* Achievements */}
      <div>
        <h2 className="section-heading text-avax-text-light mb-4">Achievements</h2>
        {achievements.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-avax-text">No achievements unlocked yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
    return <div className="skeleton h-24 rounded-2xl" />;
  }

  const rarityLabels = ["Common", "Rare", "Legendary"];
  const rarityColors = ["badge-common", "badge-rare", "badge-legendary"];
  const rarityBg = ["", "bg-rarity-rare/5", "bg-gradient-to-br from-rarity-legendary-bg/20 to-avax-card"];

  return (
    <div className={`card text-center ${rarityBg[Number(achievement.rarity)] || ""}`}>
      <div className="w-10 h-10 bg-avax-red/10 rounded-xl mx-auto mb-2 flex items-center justify-center">
        <svg className="w-5 h-5 text-avax-red" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </div>
      <h4 className="font-bold text-sm mb-1">{achievement.name}</h4>
      <span className={`badge text-[10px] ${rarityColors[Number(achievement.rarity)] || ""}`}>
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
    <div className="stat-block">
      <div className={`stat-block-value ${highlight ? "text-avax-red" : ""}`}>{value}</div>
      <div className="stat-block-label">{label}</div>
    </div>
  );
}

function getScoreTier(score: number): { name: string; borderColor: string; textColor: string } {
  if (score >= 50000) return { name: "Diamond", borderColor: "border-tier-diamond", textColor: "text-tier-diamond" };
  if (score >= 10000) return { name: "Platinum", borderColor: "border-tier-platinum", textColor: "text-tier-platinum" };
  if (score >= 5000) return { name: "Gold", borderColor: "border-tier-gold", textColor: "text-tier-gold" };
  if (score >= 1000) return { name: "Silver", borderColor: "border-tier-silver", textColor: "text-tier-silver" };
  return { name: "Bronze", borderColor: "border-tier-bronze", textColor: "text-tier-bronze" };
}
