"use client";

import Link from "next/link";
import { useAccount } from "wagmi";

export default function SocialPage() {
  const { address, isConnected } = useAccount();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight uppercase">
          Social
        </h1>
        <p className="text-avax-text text-lg">
          On-chain friends list — portable across all games
        </p>
      </div>

      {!isConnected ? (
        <div className="glass rounded-2xl p-12 text-center space-y-4">
          <h2 className="text-xl font-bold">Connect Your Wallet</h2>
          <p className="text-avax-text">Connect your wallet to see your social graph</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Friends Card */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold uppercase tracking-wider">Friends</h2>
              <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-bold">Mutual</span>
            </div>
            <p className="text-avax-text text-sm">
              Players who follow each other become friends. Your friends list is portable across every game on Player1 Protocol.
            </p>
            <div className="text-center py-8 text-avax-text text-sm">
              Deploy contracts to see friends
            </div>
          </div>

          {/* Following Card */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold uppercase tracking-wider">Following</h2>
              <span className="px-3 py-1 rounded-full bg-avax-red/10 text-avax-red text-xs font-bold">0</span>
            </div>
            <p className="text-avax-text text-sm">
              Follow players to track their progress, see when they enter tournaments, and be notified of achievements.
            </p>
            <div className="text-center py-8 text-avax-text text-sm">
              No players followed yet
            </div>
          </div>

          {/* Followers Card */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold uppercase tracking-wider">Followers</h2>
              <span className="px-3 py-1 rounded-full bg-white/[0.06] text-white text-xs font-bold">0</span>
            </div>
            <p className="text-avax-text text-sm">
              Other players following you. Follow them back to become friends.
            </p>
            <div className="text-center py-8 text-avax-text text-sm">
              No followers yet
            </div>
          </div>
        </div>
      )}

      {/* Find Players */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold uppercase tracking-wider">Find Players</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Enter wallet address (0x...)"
            className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder:text-avax-text focus:outline-none focus:border-avax-red/40"
          />
          <button className="px-6 py-3 bg-avax-red hover:bg-avax-red/90 rounded-xl text-sm font-bold transition-all">
            Search
          </button>
        </div>
      </div>

      {/* Feature Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-xl p-5 space-y-2">
          <div className="text-avax-red font-bold text-sm uppercase tracking-wider">Bio</div>
          <p className="text-avax-text text-sm">Set a 280-character bio visible to everyone. Stored on-chain.</p>
        </div>
        <div className="glass rounded-xl p-5 space-y-2">
          <div className="text-avax-red font-bold text-sm uppercase tracking-wider">Block List</div>
          <p className="text-avax-text text-sm">Block players to prevent them from following you. Auto-removes their follow.</p>
        </div>
      </div>
    </div>
  );
}
