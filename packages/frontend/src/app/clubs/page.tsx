"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { formatEther } from "viem";

export default function ClubsPage() {
  const { isConnected } = useAccount();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight uppercase">
            Clubs
          </h1>
          <p className="text-avax-text text-lg">
            Player-created guilds with shared treasury and team management
          </p>
        </div>
        {isConnected && (
          <button className="px-6 py-3 bg-avax-red hover:bg-avax-red/90 rounded-xl text-sm font-bold transition-all whitespace-nowrap">
            + Create Club
          </button>
        )}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search clubs by name or tag..."
          className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder:text-avax-text focus:outline-none focus:border-avax-red/40"
        />
        <select className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-avax-red/40">
          <option>All Clubs</option>
          <option>Open Membership</option>
          <option>Invite Only</option>
        </select>
      </div>

      {/* Clubs List */}
      <div className="glass rounded-2xl p-12 text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-avax-red/10 rounded-2xl flex items-center justify-center">
          <svg className="w-8 h-8 text-avax-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h3 className="text-xl font-bold">No Clubs Yet</h3>
        <p className="text-avax-text max-w-md mx-auto">
          Create the first club on Player1 Protocol. Clubs have unique tags, shared treasuries, and member management.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-5 space-y-2">
          <div className="text-avax-red font-bold text-sm uppercase tracking-wider">Unique Tags</div>
          <p className="text-avax-text text-sm">Each club has a unique 2-8 character tag like [ALPHA]. First come, first served.</p>
        </div>
        <div className="glass rounded-xl p-5 space-y-2">
          <div className="text-avax-red font-bold text-sm uppercase tracking-wider">Treasury</div>
          <p className="text-avax-text text-sm">Shared club treasury funded by membership fees and deposits. Owner controls withdrawals.</p>
        </div>
        <div className="glass rounded-xl p-5 space-y-2">
          <div className="text-avax-red font-bold text-sm uppercase tracking-wider">Roles</div>
          <p className="text-avax-text text-sm">Owner, Admin, and Member roles. Admins can invite, kick, and manage the club.</p>
        </div>
        <div className="glass rounded-xl p-5 space-y-2">
          <div className="text-avax-red font-bold text-sm uppercase tracking-wider">Access Control</div>
          <p className="text-avax-text text-sm">Open or invite-only membership. Set fees from 0 to any amount of AVAX.</p>
        </div>
      </div>
    </div>
  );
}
