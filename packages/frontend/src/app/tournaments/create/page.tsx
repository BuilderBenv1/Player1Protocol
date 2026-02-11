"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseEther, isAddress } from "viem";
import { motion } from "framer-motion";
import Link from "next/link";
import { CONTRACTS, TOURNAMENT_FACTORY_ABI } from "@/lib/contracts";
import { showToast } from "@/components/shared/Toaster";

const MAX_PLAYER_OPTIONS = [4, 8, 16, 32] as const;
const DEFAULT_DISPUTE_WINDOW = 1800; // 30 minutes in seconds

// Protocol fee (3% = 300 bps)
const PROTOCOL_FEE_BPS = 300;

interface PrizeSplit {
  place: number;
  percentage: number;
}

export default function CreateTournamentPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gameContract, setGameContract] = useState("");
  const [entryFee, setEntryFee] = useState("");
  const [maxPlayers, setMaxPlayers] = useState<number>(8);
  const [prizeSplits, setPrizeSplits] = useState<PrizeSplit[]>([
    { place: 1, percentage: 70 },
    { place: 2, percentage: 20 },
    { place: 3, percentage: 7 },
  ]);
  const [registrationDeadline, setRegistrationDeadline] = useState("");

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Contract interactions
  const { writeContract, data: txHash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Read protocol fee from contract (fallback to default)
  // TODO: Replace with actual contract read when deployed
  const protocolFeeBps = PROTOCOL_FEE_BPS;
  const protocolFeePercent = protocolFeeBps / 100;

  // Calculate remaining percentage after protocol fee
  const remainingPercent = 100 - protocolFeePercent;
  const totalSplitPercent = prizeSplits.reduce((sum, split) => sum + split.percentage, 0);
  const isValidSplit = Math.abs(totalSplitPercent - remainingPercent) < 0.01;

  // Set default deadline to 1 hour from now
  useEffect(() => {
    const oneHourFromNow = new Date(Date.now() + 3600000);
    const formatted = oneHourFromNow.toISOString().slice(0, 16);
    setRegistrationDeadline(formatted);
  }, []);

  // Redirect on success
  useEffect(() => {
    if (isSuccess && receipt) {
      // Extract tournament address from TournamentCreated event
      const logs = receipt.logs;
      // The first log should be the TournamentCreated event
      // For now, redirect to tournaments list
      showToast("Tournament created successfully!", "success");
      setTimeout(() => {
        router.push("/tournaments");
      }, 1500);
    }
  }, [isSuccess, receipt, router]);

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Tournament name is required";
    } else if (name.length > 100) {
      newErrors.name = "Name must be 100 characters or less";
    }

    if (!gameContract) {
      newErrors.gameContract = "Game contract address is required";
    } else if (!isAddress(gameContract)) {
      newErrors.gameContract = "Invalid Ethereum address";
    }

    const entryFeeNum = parseFloat(entryFee);
    if (entryFee && (isNaN(entryFeeNum) || entryFeeNum < 0)) {
      newErrors.entryFee = "Entry fee must be 0 or greater";
    }

    if (!isValidSplit) {
      newErrors.prizeSplit = `Prize splits must total ${remainingPercent}% (100% - ${protocolFeePercent}% protocol fee)`;
    }

    if (prizeSplits.length > maxPlayers / 2) {
      newErrors.prizeSplit = `Cannot have more prize positions than half the players`;
    }

    if (!registrationDeadline) {
      newErrors.deadline = "Registration deadline is required";
    } else {
      const deadlineDate = new Date(registrationDeadline);
      const minDeadline = new Date(Date.now() + 3600000); // At least 1 hour from now
      if (deadlineDate < minDeadline) {
        newErrors.deadline = "Deadline must be at least 1 hour in the future";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Add prize split row
  const addPrizeSplit = () => {
    if (prizeSplits.length < maxPlayers / 2) {
      setPrizeSplits([
        ...prizeSplits,
        { place: prizeSplits.length + 1, percentage: 0 },
      ]);
    }
  };

  // Remove prize split row
  const removePrizeSplit = (index: number) => {
    if (prizeSplits.length > 1) {
      const newSplits = prizeSplits.filter((_, i) => i !== index);
      // Renumber places
      setPrizeSplits(newSplits.map((split, i) => ({ ...split, place: i + 1 })));
    }
  };

  // Update prize split percentage
  const updateSplitPercentage = (index: number, value: string) => {
    const percentage = parseInt(value) || 0;
    const newSplits = [...prizeSplits];
    newSplits[index] = { ...newSplits[index], percentage };
    setPrizeSplits(newSplits);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      showToast("Please connect your wallet first", "error");
      return;
    }

    if (!validate()) {
      showToast("Please fix the form errors", "error");
      return;
    }

    try {
      showToast("Creating tournament...", "info");

      const entryFeeWei = entryFee ? parseEther(entryFee) : 0n;
      const deadlineTimestamp = Math.floor(new Date(registrationDeadline).getTime() / 1000);
      const prizeSplitBps = prizeSplits.map((split) => BigInt(split.percentage * 100));

      writeContract({
        address: CONTRACTS.TournamentFactory as `0x${string}`,
        abi: TOURNAMENT_FACTORY_ABI,
        functionName: "createTournament",
        args: [
          name,
          description,
          gameContract as `0x${string}`,
          entryFeeWei,
          BigInt(maxPlayers),
          prizeSplitBps,
          BigInt(deadlineTimestamp),
          BigInt(DEFAULT_DISPUTE_WINDOW),
        ],
      });
    } catch (error) {
      console.error("Create tournament error:", error);
      showToast("Failed to create tournament", "error");
    }
  };

  const isSubmitting = isPending || isConfirming;

  return (
    <motion.div
      className="max-w-2xl mx-auto space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div>
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-2 text-avax-text hover:text-white transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Tournaments
        </Link>
        <h1 className="text-3xl font-bold">Create Tournament</h1>
        <p className="text-avax-text mt-2">Set up a new trustless tournament on Player1 Protocol</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tournament Name */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>

          <div className="space-y-4">
            <div>
              <label className="label">
                Tournament Name <span className="text-avax-red">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Weekly Championship"
                className={`input w-full ${errors.name ? "border-red-500" : ""}`}
                maxLength={100}
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
              <p className="text-avax-text text-xs mt-1">{name.length}/100 characters</p>
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your tournament..."
                className="input w-full h-24 resize-none"
                rows={3}
              />
            </div>

            <div>
              <label className="label">
                Game Contract Address <span className="text-avax-red">*</span>
              </label>
              <input
                type="text"
                value={gameContract}
                onChange={(e) => setGameContract(e.target.value)}
                placeholder="0x..."
                className={`input w-full font-mono ${errors.gameContract ? "border-red-500" : ""}`}
              />
              {errors.gameContract && (
                <p className="text-red-400 text-sm mt-1">{errors.gameContract}</p>
              )}
              <p className="text-avax-text text-xs mt-1">
                The game contract that will report match results
              </p>
            </div>
          </div>
        </div>

        {/* Tournament Settings */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Tournament Settings</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Entry Fee (AVAX)</label>
              <input
                type="number"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                className={`input w-full ${errors.entryFee ? "border-red-500" : ""}`}
              />
              {errors.entryFee && <p className="text-red-400 text-sm mt-1">{errors.entryFee}</p>}
              <p className="text-avax-text text-xs mt-1">Leave empty or 0 for free tournament</p>
            </div>

            <div>
              <label className="label">
                Max Players <span className="text-avax-red">*</span>
              </label>
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                className="input w-full"
              >
                {MAX_PLAYER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option} Players
                  </option>
                ))}
              </select>
              <p className="text-avax-text text-xs mt-1">Must be a power of 2</p>
            </div>

            <div className="md:col-span-2">
              <label className="label">
                Registration Deadline <span className="text-avax-red">*</span>
              </label>
              <input
                type="datetime-local"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                className={`input w-full ${errors.deadline ? "border-red-500" : ""}`}
              />
              {errors.deadline && <p className="text-red-400 text-sm mt-1">{errors.deadline}</p>}
            </div>
          </div>
        </div>

        {/* Prize Distribution */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Prize Distribution</h2>
            <button
              type="button"
              onClick={addPrizeSplit}
              disabled={prizeSplits.length >= maxPlayers / 2}
              className="text-sm text-avax-red hover:text-avax-red-light disabled:text-avax-text disabled:cursor-not-allowed"
            >
              + Add Position
            </button>
          </div>

          <div className="space-y-3">
            {prizeSplits.map((split, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-20 text-avax-text text-sm">
                  {split.place === 1
                    ? "1st Place"
                    : split.place === 2
                    ? "2nd Place"
                    : split.place === 3
                    ? "3rd Place"
                    : `${split.place}th Place`}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="number"
                    value={split.percentage}
                    onChange={(e) => updateSplitPercentage(index, e.target.value)}
                    min="0"
                    max="100"
                    className="input w-24"
                  />
                  <span className="text-avax-text">%</span>
                </div>
                {prizeSplits.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePrizeSplit(index)}
                    className="text-avax-text hover:text-red-400 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-4 pt-4 border-t border-avax-border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-avax-text">Prize Pool Total</span>
              <span className={isValidSplit ? "text-green-400" : "text-red-400"}>
                {totalSplitPercent}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-avax-text">Protocol Fee</span>
              <span>{protocolFeePercent}%</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span className={isValidSplit ? "text-green-400" : "text-red-400"}>
                {totalSplitPercent + protocolFeePercent}%
              </span>
            </div>
          </div>

          {errors.prizeSplit && (
            <p className="text-red-400 text-sm mt-2">{errors.prizeSplit}</p>
          )}
        </div>

        {/* Preview */}
        <div className="card bg-avax-dark">
          <h2 className="text-lg font-semibold mb-4">Tournament Preview</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-avax-text block">Entry Fee</span>
              <span className="font-semibold">
                {entryFee ? `${entryFee} AVAX` : "Free"}
              </span>
            </div>
            <div>
              <span className="text-avax-text block">Max Prize Pool</span>
              <span className="font-semibold text-avax-red">
                {entryFee ? `${(parseFloat(entryFee) * maxPlayers * (1 - protocolFeePercent / 100)).toFixed(2)} AVAX` : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-avax-text block">Format</span>
              <span className="font-semibold">
                {maxPlayers}-Player Single Elimination
              </span>
            </div>
            <div>
              <span className="text-avax-text block">Dispute Window</span>
              <span className="font-semibold">{DEFAULT_DISPUTE_WINDOW / 60} minutes</span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <Link href="/tournaments" className="btn-secondary flex-1 text-center">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !isConnected}
            className="btn-primary flex-1"
          >
            {isSubmitting ? (
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
                {isPending ? "Confirm in Wallet..." : "Creating..."}
              </span>
            ) : !isConnected ? (
              "Connect Wallet to Create"
            ) : (
              "Create Tournament"
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
