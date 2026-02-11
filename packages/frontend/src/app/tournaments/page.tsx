"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useReadContract } from "wagmi";
import { formatEther, type Address } from "viem";
import {
  CONTRACTS,
  TOURNAMENT_FACTORY_ABI,
  TOURNAMENT_ABI,
} from "@/lib/contracts";

const STATUS_LABELS = ["Registration", "Active", "Completed", "Cancelled", "Finalized"] as const;
type StatusFilter = "all" | "Registration" | "Active" | "Completed";

// Sort priority: Active=0 > Registration=1 > Completed=2 > rest=3
const STATUS_SORT_ORDER: Record<string, number> = {
  Active: 0,
  Registration: 1,
  Completed: 2,
  Finalized: 2,
  Cancelled: 3,
};

export default function TournamentsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: tournamentAddresses, isLoading } = useReadContract({
    address: CONTRACTS.TournamentFactory,
    abi: TOURNAMENT_FACTORY_ABI,
    functionName: "getTournaments",
  });

  // Reverse so newest first (factory appends, so last = newest)
  const addresses = useMemo(() => {
    const raw = (tournamentAddresses as Address[]) || [];
    return [...raw].reverse();
  }, [tournamentAddresses]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tournaments</h1>
          <p className="text-avax-text">Browse and join trustless on-chain tournaments</p>
        </div>
        <Link href="/tournaments/create" className="btn-primary">
          Create Tournament
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", "Registration", "Active", "Completed"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? "bg-avax-red text-white"
                : "bg-avax-card text-avax-text hover:text-white"
            }`}
          >
            {status === "all" ? "All" : status}
          </button>
        ))}
      </div>

      {/* Tournament Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-avax-text">Loading tournaments...</div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-12 text-avax-text">
          No tournaments created yet. Be the first to create one!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {addresses.map((addr, index) => (
            <TournamentCard
              key={addr}
              address={addr}
              index={index}
              statusFilter={statusFilter}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TournamentCard({
  address,
  index,
  statusFilter,
}: {
  address: Address;
  index: number;
  statusFilter: StatusFilter;
}) {
  const { data: config } = useReadContract({
    address,
    abi: TOURNAMENT_ABI,
    functionName: "getConfig",
  });

  const { data: status } = useReadContract({
    address,
    abi: TOURNAMENT_ABI,
    functionName: "status",
  });

  const { data: prizePool } = useReadContract({
    address,
    abi: TOURNAMENT_ABI,
    functionName: "prizePool",
  });

  const { data: playerCount } = useReadContract({
    address,
    abi: TOURNAMENT_ABI,
    functionName: "getPlayerCount",
  });

  if (!config || status === undefined) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
      >
        <div className="card h-full animate-pulse">
          <div className="h-6 bg-avax-border rounded w-3/4 mb-4" />
          <div className="h-4 bg-avax-border rounded w-1/2 mb-2" />
          <div className="h-4 bg-avax-border rounded w-1/3" />
        </div>
      </motion.div>
    );
  }

  const statusLabel = STATUS_LABELS[Number(status)] || "Unknown";
  const deadlineMs = Number(config.registrationDeadline) * 1000;
  const timeRemaining = deadlineMs - Date.now();
  const currentPlayerCount = Number(playerCount || 0n);
  const maxPlayers = Number(config.maxPlayers);

  // Hide expired Registration tournaments with 0 players
  if (statusLabel === "Registration" && timeRemaining <= 0 && currentPlayerCount === 0) {
    return null;
  }

  // Apply filter
  if (statusFilter !== "all" && statusLabel !== statusFilter) {
    return null;
  }

  const statusColors: Record<string, string> = {
    Registration: "status-registration",
    Active: "status-active",
    Completed: "status-completed",
    Cancelled: "status-cancelled",
    Finalized: "status-completed",
  };

  const isRegistrationOpen = statusLabel === "Registration" && timeRemaining > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Link href={`/tournaments/${address}`}>
        <div className="card card-hover h-full">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg mb-1">{config.name}</h3>
              <p className="text-sm text-avax-text font-mono">
                {address.slice(0, 6)}...{address.slice(-4)}
              </p>
            </div>
            <span className={`badge ${statusColors[statusLabel] || ""}`}>
              {statusLabel}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-avax-text">Entry Fee</p>
              <p className="font-semibold">
                {config.entryFee === 0n ? "Free" : `${formatEther(config.entryFee)} AVAX`}
              </p>
            </div>
            <div>
              <p className="text-sm text-avax-text">Prize Pool</p>
              <p className="font-semibold text-avax-red">
                {prizePool != null ? formatEther(prizePool) : "0"} AVAX
              </p>
            </div>
            <div>
              <p className="text-sm text-avax-text">Players</p>
              <p className="font-semibold">
                {currentPlayerCount} / {maxPlayers}
              </p>
            </div>
            <div>
              <p className="text-sm text-avax-text">
                {isRegistrationOpen ? "Closes In" : "Status"}
              </p>
              <p className="font-semibold">
                {isRegistrationOpen ? formatTimeRemaining(timeRemaining) : statusLabel}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative h-2 bg-avax-dark rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-avax-red rounded-full transition-all"
              style={{
                width: `${(currentPlayerCount / maxPlayers) * 100}%`,
              }}
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "Closed";

  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}
