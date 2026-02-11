"use client";

import Link from "next/link";

const PERIOD_LABELS = ["All Time", "Monthly", "Weekly", "Daily"];

export default function LeaderboardsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight uppercase">
          Leaderboards
        </h1>
        <p className="text-avax-text text-lg">
          Per-game rankings across all Player1 Protocol games
        </p>
      </div>

      {/* Coming Soon State */}
      <div className="glass rounded-2xl p-12 text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-avax-red/10 rounded-2xl flex items-center justify-center">
          <svg className="w-8 h-8 text-avax-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold">Leaderboards Coming Soon</h2>
        <p className="text-avax-text max-w-md mx-auto">
          Per-game, per-metric leaderboards with All Time, Monthly, Weekly, and Daily periods.
          Games will submit scores directly from their smart contracts.
        </p>

        {/* Period Preview */}
        <div className="flex justify-center gap-2 pt-4">
          {PERIOD_LABELS.map((label) => (
            <span
              key={label}
              className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-avax-text"
            >
              {label}
            </span>
          ))}
        </div>

        {/* Feature Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 max-w-2xl mx-auto">
          <div className="glass rounded-xl p-4 text-left">
            <div className="text-avax-red font-bold text-sm uppercase tracking-wider mb-1">Higher is Better</div>
            <div className="text-avax-text text-sm">Kills, Wins, Points</div>
          </div>
          <div className="glass rounded-xl p-4 text-left">
            <div className="text-avax-red font-bold text-sm uppercase tracking-wider mb-1">Lower is Better</div>
            <div className="text-avax-text text-sm">Speedruns, Time Trials</div>
          </div>
          <div className="glass rounded-xl p-4 text-left">
            <div className="text-avax-red font-bold text-sm uppercase tracking-wider mb-1">Top 100</div>
            <div className="text-avax-text text-sm">Per leaderboard capacity</div>
          </div>
        </div>
      </div>
    </div>
  );
}
