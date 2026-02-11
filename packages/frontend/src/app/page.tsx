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
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative py-12 md:py-20">
        <div className="absolute inset-0 bg-hero-gradient opacity-50" />
        <div className="relative text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-avax-card/50 border border-avax-border px-4 py-2 rounded-full mb-6">
              <span className="w-2 h-2 bg-avax-red rounded-full animate-pulse" />
              <span className="text-sm text-avax-text">Live on Avalanche Fuji</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Your On-Chain
              <br />
              <span className="text-gradient">Competitive Identity</span>
            </h1>

            <p className="text-lg md:text-xl text-avax-text max-w-2xl mx-auto mb-8">
              Player1 Protocol is the open competitive infrastructure layer for Avalanche.
              Trustless tournaments, portable reputation, and achievement-based rewards.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isConnected ? (
                <>
                  <Link href="/tournaments" className="btn-primary">
                    Browse Tournaments
                  </Link>
                  <Link href={`/player/${address}`} className="btn-secondary">
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

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard
          icon="trophy"
          title="Tournament Engine"
          description="Trustless bracket tournaments with VRF-seeded matchups, escrow, and automatic prize distribution."
        />
        <FeatureCard
          icon="user"
          title="Player Passport"
          description="Soulbound reputation that follows your wallet. Composite score, tournament history, and achievements."
        />
        <FeatureCard
          icon="coin"
          title="P1 Rewards"
          description="Earn P1 tokens through competitive play. Spend in integrated game shops or trade on DEXs."
        />
      </section>

      {/* How It Works */}
      <section className="card">
        <h2 className="text-2xl font-bold mb-8 text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Step number={1} title="Connect" description="Link your wallet to create your Player Passport" />
          <Step number={2} title="Compete" description="Enter tournaments and compete in trustless brackets" />
          <Step number={3} title="Earn" description="Win P1 tokens and unlock achievements" />
          <Step number={4} title="Grow" description="Build your on-chain reputation across all games" />
        </div>
      </section>

      {/* Quick Stats */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Passports"
          value={totalPassports != null ? totalPassports.toString() : "0"}
        />
        <StatCard
          label="Tournaments Created"
          value={tournamentCount != null ? tournamentCount.toString() : "0"}
        />
        <StatCard
          label="P1 Distributed"
          value={totalSupply != null ? `${formatEther(totalSupply)} P1` : "0 P1"}
        />
      </section>

      {/* CTA Section */}
      <section className="card bg-gradient-to-r from-avax-red/20 to-transparent border-avax-red/30">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">Ready to Compete?</h3>
            <p className="text-avax-text">
              Join the next generation of on-chain competitive gaming.
            </p>
          </div>
          <Link href="/tournaments" className="btn-primary whitespace-nowrap">
            View Tournaments
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: "trophy" | "user" | "coin";
  title: string;
  description: string;
}) {
  const icons = {
    trophy: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    user: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    coin: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <motion.div
      className="card card-hover"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="w-12 h-12 bg-avax-red/20 rounded-xl flex items-center justify-center text-avax-red mb-4">
        {icons[icon]}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-avax-text text-sm">{description}</p>
    </motion.div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-avax-red rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h4 className="font-semibold mb-2">{title}</h4>
      <p className="text-avax-text text-sm">{description}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card text-center">
      <div className="text-2xl md:text-3xl font-bold text-avax-red mb-1">{value}</div>
      <div className="text-sm text-avax-text">{label}</div>
    </div>
  );
}
