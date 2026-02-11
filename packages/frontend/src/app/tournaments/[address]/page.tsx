"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther, type Address } from "viem";
import { motion } from "framer-motion";
import Link from "next/link";
import { BracketView, type Match, type BracketSlot, MatchStatus } from "@/components/tournament/BracketView";
import { TOURNAMENT_ABI } from "@/lib/contracts";
import { showToast } from "@/components/shared/Toaster";

// Tournament status enum matching contract
enum TournamentStatus {
  Registration = 0,
  Active = 1,
  Completed = 2,
  Cancelled = 3,
  Finalized = 4,
}

const STATUS_LABELS: Record<TournamentStatus, string> = {
  [TournamentStatus.Registration]: "Registration",
  [TournamentStatus.Active]: "Active",
  [TournamentStatus.Completed]: "Completed",
  [TournamentStatus.Cancelled]: "Cancelled",
  [TournamentStatus.Finalized]: "Finalized",
};

const STATUS_STYLES: Record<TournamentStatus, string> = {
  [TournamentStatus.Registration]: "status-registration",
  [TournamentStatus.Active]: "status-active",
  [TournamentStatus.Completed]: "status-completed",
  [TournamentStatus.Cancelled]: "status-cancelled",
  [TournamentStatus.Finalized]: "status-completed",
};

function truncateAddress(address: string): string {
  if (!address || address === "0x0000000000000000000000000000000000000000") return "---";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface PageProps {
  params: { address: string };
}

export default function TournamentDetailPage({ params }: PageProps) {
  const tournamentAddress = params.address as Address;
  const { address: userAddress, isConnected } = useAccount();
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<string>("");

  // Contract reads
  const { data: config, isLoading: configLoading } = useReadContract({
    address: tournamentAddress,
    abi: TOURNAMENT_ABI,
    functionName: "getConfig",
  });

  const { data: statusRaw } = useReadContract({
    address: tournamentAddress,
    abi: TOURNAMENT_ABI,
    functionName: "status",
  });

  const { data: prizePool } = useReadContract({
    address: tournamentAddress,
    abi: TOURNAMENT_ABI,
    functionName: "prizePool",
  });

  const { data: playerCount } = useReadContract({
    address: tournamentAddress,
    abi: TOURNAMENT_ABI,
    functionName: "getPlayerCount",
  });

  const { data: players } = useReadContract({
    address: tournamentAddress,
    abi: TOURNAMENT_ABI,
    functionName: "getPlayers",
  });

  const { data: currentRoundRaw } = useReadContract({
    address: tournamentAddress,
    abi: TOURNAMENT_ABI,
    functionName: "currentRound",
  });

  const { data: allMatches } = useReadContract({
    address: tournamentAddress,
    abi: TOURNAMENT_ABI,
    functionName: "getAllMatches",
  });

  const { data: bracket } = useReadContract({
    address: tournamentAddress,
    abi: TOURNAMENT_ABI,
    functionName: "getBracket",
  });

  const { data: isUserRegistered } = useReadContract({
    address: tournamentAddress,
    abi: TOURNAMENT_ABI,
    functionName: "isRegistered",
    args: userAddress ? [userAddress] : undefined,
  });

  const { data: claimableAmount } = useReadContract({
    address: tournamentAddress,
    abi: TOURNAMENT_ABI,
    functionName: "getClaimableAmount",
    args: userAddress ? [userAddress] : undefined,
  });

  // Write contract hooks
  const { writeContract: registerFn, data: registerHash, isPending: isRegistering } = useWriteContract();
  const { writeContract: reportResult, data: reportHash, isPending: isReporting } = useWriteContract();
  const { writeContract: claimPrizeFn, data: claimHash, isPending: isClaiming } = useWriteContract();

  // Wait for transaction receipts
  const { isLoading: isRegisterConfirming, isSuccess: isRegisterSuccess } = useWaitForTransactionReceipt({
    hash: registerHash,
  });

  const { isLoading: isReportConfirming, isSuccess: isReportSuccess } = useWaitForTransactionReceipt({
    hash: reportHash,
  });

  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimHash,
  });

  // Show toasts on success
  useEffect(() => {
    if (isRegisterSuccess) {
      showToast("Successfully registered for tournament!", "success");
    }
  }, [isRegisterSuccess]);

  useEffect(() => {
    if (isReportSuccess) {
      showToast("Match result reported!", "success");
      setSelectedMatch(null);
      setSelectedWinner("");
    }
  }, [isReportSuccess]);

  useEffect(() => {
    if (isClaimSuccess) {
      showToast("Prize claimed successfully!", "success");
    }
  }, [isClaimSuccess]);

  // Loading state
  if (configLoading || !config) {
    return (
      <div className="space-y-8">
        <Link href="/tournaments" className="inline-flex items-center gap-2 text-avax-text hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Tournaments
        </Link>
        <div className="card animate-pulse">
          <div className="h-8 bg-avax-border rounded w-1/2 mb-4" />
          <div className="h-4 bg-avax-border rounded w-3/4 mb-2" />
          <div className="h-32 bg-avax-border rounded mt-4" />
        </div>
      </div>
    );
  }

  // Derived state
  const status = Number(statusRaw ?? 0) as TournamentStatus;
  const currentRound = Number(currentRoundRaw ?? 0);
  const registeredPlayers = (players as string[]) || [];
  const matches = (allMatches as Match[]) || [];
  const bracketSlots = (bracket as BracketSlot[]) || [];
  const isOrganizer = userAddress?.toLowerCase() === config.organizer.toLowerCase();
  const isGameContract = userAddress?.toLowerCase() === config.gameContract.toLowerCase();
  const canReportResults = isOrganizer || isGameContract;
  const claimable = claimableAmount || 0n;

  // Get pending matches for reporting
  const pendingMatches = matches.filter(
    (m) => m.status === MatchStatus.Pending && m.player1 !== "0x0000000000000000000000000000000000000000"
  );

  // Handlers
  const handleRegister = async () => {
    if (!isConnected) {
      showToast("Please connect your wallet first", "error");
      return;
    }

    try {
      showToast("Registering for tournament...", "info");
      registerFn({
        address: tournamentAddress,
        abi: TOURNAMENT_ABI,
        functionName: "register",
        value: config.entryFee,
      });
    } catch (error) {
      console.error("Registration error:", error);
      showToast("Registration failed", "error");
    }
  };

  const handleReportResult = async () => {
    if (selectedMatch === null || !selectedWinner) {
      showToast("Please select a match and winner", "error");
      return;
    }

    try {
      showToast("Reporting match result...", "info");
      reportResult({
        address: tournamentAddress,
        abi: TOURNAMENT_ABI,
        functionName: "reportResult",
        args: [BigInt(selectedMatch), selectedWinner as Address],
      });
    } catch (error) {
      console.error("Report error:", error);
      showToast("Failed to report result", "error");
    }
  };

  const handleClaimPrize = async () => {
    try {
      showToast("Claiming prize...", "info");
      claimPrizeFn({
        address: tournamentAddress,
        abi: TOURNAMENT_ABI,
        functionName: "claimPrize",
      });
    } catch (error) {
      console.error("Claim error:", error);
      showToast("Failed to claim prize", "error");
    }
  };

  const deadlineMs = Number(config.registrationDeadline) * 1000;
  const timeRemaining = deadlineMs - Date.now();
  const isRegistrationOpen = status === TournamentStatus.Registration && timeRemaining > 0;
  const currentPlayerCount = Number(playerCount || 0n);
  const maxPlayers = Number(config.maxPlayers);

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Back link */}
      <Link href="/tournaments" className="inline-flex items-center gap-2 text-avax-text hover:text-white transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Tournaments
      </Link>

      {/* Tournament Header */}
      <div className="card">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{config.name}</h1>
              <span className={`badge ${STATUS_STYLES[status]}`}>
                {STATUS_LABELS[status]}
              </span>
            </div>
            <p className="text-avax-text mb-4">{config.description}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-avax-text block">Organizer</span>
                <span className="font-mono">{truncateAddress(config.organizer)}</span>
              </div>
              <div>
                <span className="text-avax-text block">Game</span>
                <span className="font-mono">{truncateAddress(config.gameContract)}</span>
              </div>
              <div>
                <span className="text-avax-text block">Entry Fee</span>
                <span className="font-semibold">
                  {config.entryFee === 0n ? "Free" : `${formatEther(config.entryFee)} AVAX`}
                </span>
              </div>
              <div>
                <span className="text-avax-text block">Dispute Window</span>
                <span>{Number(config.disputeWindowSeconds) / 60} mins</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-4">
            <div className="text-right">
              <span className="text-avax-text block text-sm">Prize Pool</span>
              <span className="text-3xl font-bold text-avax-red">
                {prizePool != null ? formatEther(prizePool) : "0"} AVAX
              </span>
            </div>
            <div className="text-right">
              <span className="text-avax-text block text-sm">Players</span>
              <span className="text-xl font-semibold">
                {currentPlayerCount} / {maxPlayers}
              </span>
            </div>
            {isRegistrationOpen && (
              <div className="text-right">
                <span className="text-avax-text block text-sm">Closes In</span>
                <span className="text-lg font-semibold">{formatTimeRemaining(timeRemaining)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Champion Banner - When completed or finalized */}
      {(status === TournamentStatus.Completed || status === TournamentStatus.Finalized) && (() => {
        // Find the champion from the last confirmed match
        const confirmedMatches = matches.filter((m) => m.status === MatchStatus.Confirmed);
        const finalMatch = confirmedMatches.length > 0 ? confirmedMatches[confirmedMatches.length - 1] : null;
        const champion = finalMatch?.winner;
        const runnerUp = finalMatch
          ? (finalMatch.winner === finalMatch.player1 ? finalMatch.player2 : finalMatch.player1)
          : null;

        return champion && champion !== "0x0000000000000000000000000000000000000000" ? (
          <div className="card border-2 border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-avax-card">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v1a2 2 0 002 2h1v1H4a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2V7h1a2 2 0 002-2V4a2 2 0 00-2-2H5zM7 7V5h6v2H7zm-1 3h8v3H6v-3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-yellow-400 font-medium">Champion</div>
                  <Link href={`/player/${champion}`} className="text-xl font-bold font-mono hover:text-yellow-400 transition-colors">
                    {truncateAddress(champion)}
                  </Link>
                </div>
              </div>
              {runnerUp && runnerUp !== "0x0000000000000000000000000000000000000000" && (
                <div className="text-center md:text-right">
                  <div className="text-sm text-avax-text">Runner-up</div>
                  <Link href={`/player/${runnerUp}`} className="font-mono hover:text-white transition-colors">
                    {truncateAddress(runnerUp)}
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : null;
      })()}

      {/* Registration Panel - Only during registration */}
      {status === TournamentStatus.Registration && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Registration</h2>

          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div>
              <p className="text-avax-text mb-4">
                {currentPlayerCount < maxPlayers
                  ? `${maxPlayers - currentPlayerCount} spots remaining`
                  : "Tournament is full"}
              </p>

              {/* Registered Players */}
              <div className="flex flex-wrap gap-2">
                {registeredPlayers.map((player) => (
                  <span
                    key={player}
                    className={`px-3 py-1 rounded-full text-sm font-mono ${
                      player.toLowerCase() === userAddress?.toLowerCase()
                        ? "bg-avax-red text-white"
                        : "bg-avax-dark text-avax-text"
                    }`}
                  >
                    {truncateAddress(player)}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center">
              {!isConnected ? (
                <p className="text-avax-text">Connect wallet to register</p>
              ) : isUserRegistered ? (
                <span className="text-green-400 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  You are registered
                </span>
              ) : currentPlayerCount >= maxPlayers ? (
                <span className="text-avax-text">Tournament is full</span>
              ) : !isRegistrationOpen ? (
                <span className="text-avax-text">Registration closed</span>
              ) : (
                <button
                  onClick={handleRegister}
                  disabled={isRegistering || isRegisterConfirming}
                  className="btn-primary"
                >
                  {isRegistering || isRegisterConfirming ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Registering...
                    </span>
                  ) : (
                    `Register (${formatEther(config.entryFee)} AVAX)`
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bracket Visualization */}
      {status !== TournamentStatus.Registration && bracketSlots.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Tournament Bracket</h2>
          <BracketView
            matches={matches}
            bracket={bracketSlots}
            currentRound={currentRound}
            maxPlayers={maxPlayers}
          />
        </div>
      )}

      {/* Match Reporting Panel - Only for organizer/game contract during active */}
      {status === TournamentStatus.Active && canReportResults && pendingMatches.length > 0 && (
        <div className="card border-avax-red/30">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-avax-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Report Match Result
          </h2>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Match Selection */}
            <div>
              <label className="label">Select Match</label>
              <select
                value={selectedMatch ?? ""}
                onChange={(e) => {
                  setSelectedMatch(e.target.value ? Number(e.target.value) : null);
                  setSelectedWinner("");
                }}
                className="input w-full"
              >
                <option value="">Choose a match...</option>
                {pendingMatches.map((match) => (
                  <option key={Number(match.matchId)} value={Number(match.matchId)}>
                    Match #{Number(match.matchId) + 1}: {truncateAddress(match.player1)} vs{" "}
                    {truncateAddress(match.player2)}
                  </option>
                ))}
              </select>
            </div>

            {/* Winner Selection */}
            <div>
              <label className="label">Select Winner</label>
              <select
                value={selectedWinner}
                onChange={(e) => setSelectedWinner(e.target.value)}
                disabled={selectedMatch === null}
                className="input w-full"
              >
                <option value="">Choose winner...</option>
                {selectedMatch !== null && (
                  <>
                    <option value={pendingMatches.find((m) => Number(m.matchId) === selectedMatch)?.player1}>
                      {truncateAddress(
                        pendingMatches.find((m) => Number(m.matchId) === selectedMatch)?.player1 || ""
                      )}
                    </option>
                    <option value={pendingMatches.find((m) => Number(m.matchId) === selectedMatch)?.player2}>
                      {truncateAddress(
                        pendingMatches.find((m) => Number(m.matchId) === selectedMatch)?.player2 || ""
                      )}
                    </option>
                  </>
                )}
              </select>
            </div>

            {/* Submit Button */}
            <div className="flex items-end">
              <button
                onClick={handleReportResult}
                disabled={selectedMatch === null || !selectedWinner || isReporting || isReportConfirming}
                className="btn-primary w-full"
              >
                {isReporting || isReportConfirming ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  "Report Result"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prize Claim Panel - Only when completed and user has claimable */}
      {(status === TournamentStatus.Completed || status === TournamentStatus.Finalized) && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Prize Claims</h2>

          {!isConnected ? (
            <p className="text-avax-text">Connect wallet to check claimable prizes</p>
          ) : claimable > 0n ? (
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <span className="text-avax-text block">Your Claimable Prize</span>
                <span className="text-2xl font-bold text-avax-red">
                  {formatEther(claimable)} AVAX
                </span>
              </div>
              <button
                onClick={handleClaimPrize}
                disabled={isClaiming || isClaimConfirming}
                className="btn-primary"
              >
                {isClaiming || isClaimConfirming ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Claiming...
                  </span>
                ) : (
                  "Claim Prize"
                )}
              </button>
            </div>
          ) : (
            <p className="text-avax-text">No prizes to claim</p>
          )}
        </div>
      )}

      {/* Registered Players List */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Registered Players ({registeredPlayers.length})</h2>
        {registeredPlayers.length === 0 ? (
          <p className="text-avax-text text-center py-4">No players registered yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {registeredPlayers.map((player, index) => (
              <Link
                key={player}
                href={`/player/${player}`}
                className="flex items-center gap-3 p-3 bg-avax-dark rounded-lg hover:bg-avax-card-hover transition-colors"
              >
                <span className="text-avax-text text-sm">#{index + 1}</span>
                <span className="font-mono text-sm">{truncateAddress(player)}</span>
                {player.toLowerCase() === userAddress?.toLowerCase() && (
                  <span className="badge bg-avax-red/20 text-avax-red text-xs ml-auto">You</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
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
