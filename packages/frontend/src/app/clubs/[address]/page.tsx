"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useAccount } from "wagmi";

export default function ClubDetailPage() {
  const { address: clubAddress } = useParams<{ address: string }>();
  const { address: userAddress, isConnected } = useAccount();

  return (
    <div className="space-y-8">
      {/* Back */}
      <Link href="/clubs" className="text-avax-text hover:text-white text-sm transition-colors">
        &larr; Back to Clubs
      </Link>

      {/* Club Header */}
      <div className="glass rounded-2xl p-8 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-avax-red/10 rounded-2xl flex items-center justify-center">
            <span className="text-avax-red font-extrabold text-xl">C</span>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Loading...</h1>
            <p className="text-avax-text font-mono text-sm">{clubAddress}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          <div className="stat-block">
            <div className="stat-label">Members</div>
            <div className="stat-value">--</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">Max Members</div>
            <div className="stat-value">--</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">Treasury</div>
            <div className="stat-value">-- AVAX</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">Membership Fee</div>
            <div className="stat-value">--</div>
          </div>
        </div>

        {/* Actions */}
        {isConnected && (
          <div className="flex gap-3 pt-4">
            <button className="px-6 py-3 bg-avax-red hover:bg-avax-red/90 rounded-xl text-sm font-bold transition-all">
              Join Club
            </button>
            <button className="px-6 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl text-sm font-bold transition-all">
              Leave Club
            </button>
          </div>
        )}
      </div>

      {/* Members List */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold uppercase tracking-wider">Members</h2>
        <p className="text-avax-text text-sm">
          Deploy the Club contracts to see member data.
        </p>
      </div>
    </div>
  );
}
