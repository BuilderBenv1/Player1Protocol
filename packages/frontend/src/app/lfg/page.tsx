"use client";

import { useAccount } from "wagmi";

export default function LFGPage() {
  const { isConnected } = useAccount();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight uppercase">
            LFG
          </h1>
          <p className="text-avax-text text-lg">
            Looking For Group — find teammates by game, activity & skill
          </p>
        </div>
        {isConnected && (
          <button className="px-6 py-3 bg-avax-red hover:bg-avax-red/90 rounded-xl text-sm font-bold transition-all whitespace-nowrap">
            + Create Listing
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-avax-red/40">
          <option>All Games</option>
        </select>
        <select className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-avax-red/40">
          <option>Any Skill Level</option>
          <option>Beginner (0-100)</option>
          <option>Intermediate (100-500)</option>
          <option>Advanced (500+)</option>
        </select>
        <select className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-avax-red/40">
          <option>All Activities</option>
          <option>Ranked</option>
          <option>Casual</option>
          <option>Tournament Practice</option>
        </select>
      </div>

      {/* Active Listings */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold uppercase tracking-wider">Active Listings</h2>

        <div className="glass rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-avax-red/10 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-avax-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold">No Active Listings</h3>
          <p className="text-avax-text max-w-md mx-auto">
            LFG listings appear here once the contracts are deployed.
            Create a listing to find teammates for ranked matches, tournaments, or casual play.
          </p>
        </div>
      </div>

      {/* How it Works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-5 space-y-2">
          <div className="text-avax-red font-bold text-2xl">1</div>
          <div className="font-bold">Create Listing</div>
          <p className="text-avax-text text-sm">Pick game, activity, set skill range and team size. Listings last 5 min to 24 hrs.</p>
        </div>
        <div className="glass rounded-xl p-5 space-y-2">
          <div className="text-avax-red font-bold text-2xl">2</div>
          <div className="font-bold">Skill Matched</div>
          <p className="text-avax-text text-sm">Only players within your set composite score range can join. No smurfs, no carries.</p>
        </div>
        <div className="glass rounded-xl p-5 space-y-2">
          <div className="text-avax-red font-bold text-2xl">3</div>
          <div className="font-bold">Group Filled</div>
          <p className="text-avax-text text-sm">Once all slots are filled, the listing closes and your squad is ready to compete.</p>
        </div>
      </div>
    </div>
  );
}
