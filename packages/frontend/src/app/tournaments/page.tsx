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

export default function TournamentsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: tournamentAddresses, isLoading } = useReadContract({
    address: CONTRACTS.TournamentFactory,
    abi: TOURNAMENT_FACTORY_ABI,
    functionName: "getTournaments",
  });

  const addresses = useMemo(() => {
    const raw = (tournamentAddresses as Address[]) || [];
    return [...raw].reverse();
  }, [tournamentAddresses]);

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "Registration", label: "Open" },
    { key: "Active", label: "Live" },
    { key: "Completed", label: "Ended" },
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">TOURNAMENTS</h1>
          <p className="text-avax-text text-sm mt-1">Browse and join trustless on-chain tournaments</p>
        </div>
        <Link href="/tournaments/create" className="btn-primary">
          + Create Tournament
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              statusFilter === key
                ? "bg-avax-red text-white shadow-lg shadow-avax-red/20"
                : "bg-avax-card text-avax-text hover:text-white border border-avax-border hover:border-avax-border-light"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-56 rounded-2xl" />)}
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-avax-text text-lg">No tournaments created yet.</p>
          <p className="text-avax-text text-sm mt-1">Be the first to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        <div className="skeleton h-56 rounded-2xl" />
      </motion.div>
    );
  }

  const statusLabel = STATUS_LABELS[Number(status)] || "Unknown";
  const deadlineMs = Number(config.registrationDeadline) * 1000;
  const timeRemaining = deadlineMs - Date.now();
  const currentPlayerCount = Number(playerCount || 0n);
  const maxPlayers = Number(config.maxPlayers);

  if (statusLabel === "Registration" && timeRemaining <= 0 && currentPlayerCount === 0) {
    return null;
  }

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
  const fillPercent = (currentPlayerCount / maxPlayers) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link href={`/tournaments/${address}`}>
        <div className="card card-hover h-full group">
          {/* Red top accent on active */}
          {statusLabel === "Active" && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-400" />
          )}
          {isRegistrationOpen && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-400" />
          )}

          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base truncate tracking-tight">{config.name}</h3>
              <p className="text-xs text-avax-text font-mono mt-0.5">
                {address.slice(0, 6)}...{address.slice(-4)}
              </p>
            </div>
            <span className={`badge ml-3 flex-shrink-0 ${statusColors[statusLabel] || ""}`}>
              {statusLabel === "Registration" ? "Open" : statusLabel}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-5">
            <div>
              <p className="text-[10px] text-avax-text uppercase tracking-widest">Entry</p>
              <p className="font-bold text-sm">
                {config.entryFee === 0n ? "Free" : `${formatEther(config.entryFee)} AVAX`}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-avax-text uppercase tracking-widest">Prize Pool</p>
              <p className="font-bold text-sm text-avax-red">
                {prizePool != null ? formatEther(prizePool) : "0"} AVAX
              </p>
            </div>
            <div>
              <p className="text-[10px] text-avax-text uppercase tracking-widest">Players</p>
              <p className="font-bold text-sm">
                {currentPlayerCount} / {maxPlayers}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-avax-text uppercase tracking-widest">
                {isRegistrationOpen ? "Closes" : "Status"}
              </p>
              <p className="font-bold text-sm">
                {isRegistrationOpen ? formatTimeRemaining(timeRemaining) : statusLabel}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="relative h-1 bg-avax-dark rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-avax-red rounded-full transition-all duration-500"
              style={{ width: `${fillPercent}%` }}
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
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
