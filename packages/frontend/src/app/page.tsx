"use client";

import { useAccount, useReadContract } from "wagmi";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import { formatEther } from "viem";
import {
  CONTRACTS,
  P1_TOKEN_ABI,
  PLAYER_PASSPORT_ABI,
  TOURNAMENT_FACTORY_ABI,
} from "@/lib/contracts";

export default function HomePage() {
  const { isConnected, address } = useAccount();

  const { data: totalPassports } = useReadContract({
    address: CONTRACTS.PlayerPassport,
    abi: PLAYER_PASSPORT_ABI,
    functionName: "totalPassports",
  });

  const { data: tournamentCount } = useReadContract({
    address: CONTRACTS.TournamentFactory,
    abi: TOURNAMENT_FACTORY_ABI,
    functionName: "getTournamentCount",
  });

  const { data: totalSupply } = useReadContract({
    address: CONTRACTS.P1Token,
    abi: P1_TOKEN_ABI,
    functionName: "totalSupply",
  });

  return (
    <div className="space-y-16 pb-8">
      {/* Hero */}
      <section className="relative py-16 md:py-28">
        {/* Background glow */}
        <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-avax-red/[0.04] rounded-full blur-[120px] pointer-events-none" />

        <div className="relative text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Live badge */}
            <div className="inline-flex items-center gap-2 bg-avax-card/80 border border-avax-border px-4 py-2 rounded-full mb-8 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-avax-red opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-avax-red" />
              </span>
              <span className="text-sm text-avax-text-light font-medium">Live on Avalanche C-Chain</span>
            </div>

            <h1 className="text-hero-sm md:text-hero mb-6">
              YOUR ON-CHAIN
              <br />
              <span className="text-gradient">COMPETITIVE IDENTITY</span>
            </h1>

            <p className="text-lg md:text-xl text-avax-text max-w-2xl mx-auto mb-10 leading-relaxed">
              Trustless tournaments. Portable reputation. Achievement-based rewards.
              The open competitive infrastructure layer for Avalanche.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isConnected ? (
                <>
                  <Link href="/tournaments" className="btn-primary text-base px-8 py-3.5">
                    Browse Tournaments
                  </Link>
                  <Link href={`/player/${address}`} className="btn-secondary text-base px-8 py-3.5">
                    View My Profile
                  </Link>
                </>
              ) : (
                <ConnectButton label="Connect Wallet to Start" />
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live Stats Bar */}
      <motion.section
        className="grid grid-cols-3 gap-4 md:gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <StatBlock
          value={totalPassports != null ? totalPassports.toString() : "0"}
          label="Players"
        />
        <StatBlock
          value={tournamentCount != null ? tournamentCount.toString() : "0"}
          label="Tournaments"
        />
        <StatBlock
          value={totalSupply != null ? `${Number(formatEther(totalSupply)).toLocaleString()}` : "0"}
          label="P1 Distributed"
          accent
        />
      </motion.section>

      {/* Features */}
      <section>
        <h2 className="section-heading text-avax-text-light mb-6">Core Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            icon="tournament"
            title="Tournament Engine"
            description="Trustless bracket tournaments with VRF-seeded matchups, on-chain escrow, and automatic prize distribution."
            tag="COMPETE"
          />
          <FeatureCard
            icon="passport"
            title="Player Passport"
            description="Soulbound reputation that follows your wallet. Composite Gamerscore, tournament history, and achievements."
            tag="REPUTATION"
          />
          <FeatureCard
            icon="rewards"
            title="P1 Rewards"
            description="Earn P1 tokens through competitive play. Win tournaments, unlock achievements, and climb the ranks."
            tag="EARN"
          />
        </div>
      </section>

      {/* How It Works */}
      <section>
        <h2 className="section-heading text-avax-text-light mb-6">How It Works</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StepCard number={1} title="Connect" description="Link your wallet to create your Player Passport" />
          <StepCard number={2} title="Compete" description="Enter tournaments with trustless brackets" />
          <StepCard number={3} title="Earn" description="Win P1 tokens and unlock achievements" />
          <StepCard number={4} title="Grow" description="Build reputation across all games" />
        </div>
      </section>

      {/* CTA */}
      <motion.section
        className="relative overflow-hidden rounded-2xl border border-avax-red/20 p-8 md:p-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-avax-red/10 via-avax-red/5 to-transparent" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-avax-red/10 rounded-full blur-[80px]" />
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">Ready to Compete?</h3>
            <p className="text-avax-text text-lg">
              Join the next generation of on-chain competitive gaming.
            </p>
          </div>
          <Link href="/tournaments" className="btn-primary whitespace-nowrap text-base px-8 py-3.5">
            View Tournaments
          </Link>
        </div>
      </motion.section>
    </div>
  );
}

function StatBlock({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="stat-block">
      <div className={`stat-block-value ${accent ? "text-avax-red" : "text-white"}`}>{value}</div>
      <div className="stat-block-label">{label}</div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  tag,
}: {
  icon: "tournament" | "passport" | "rewards";
  title: string;
  description: string;
  tag: string;
}) {
  const icons = {
    tournament: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-3.77 1.522m0 0a6.003 6.003 0 01-3.77-1.522" />
      </svg>
    ),
    passport: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
      </svg>
    ),
    rewards: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
  };

  return (
    <motion.div
      className="card card-hover group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="absolute inset-0 bg-card-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-avax-red/10 rounded-xl flex items-center justify-center text-avax-red">
            {icons[icon]}
          </div>
          <span className="text-[10px] font-bold text-avax-text uppercase tracking-[0.2em]">{tag}</span>
        </div>
        <h3 className="text-lg font-bold mb-2 tracking-tight">{title}</h3>
        <p className="text-avax-text text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="card text-center group">
      <div className="w-10 h-10 bg-avax-red/10 border border-avax-red/20 rounded-xl flex items-center justify-center text-avax-red font-bold text-sm mx-auto mb-3 group-hover:bg-avax-red group-hover:text-white transition-all">
        {number}
      </div>
      <h4 className="font-bold text-sm mb-1 uppercase tracking-wide">{title}</h4>
      <p className="text-avax-text text-xs leading-relaxed">{description}</p>
    </div>
  );
}
