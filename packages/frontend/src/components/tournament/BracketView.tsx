"use client";

import { useMemo } from "react";

// Match status enum matching contract
export enum MatchStatus {
  Pending = 0,
  Reported = 1,
  Confirmed = 2,
  Disputed = 3,
}

export interface Match {
  matchId: bigint | number;
  round: bigint | number;
  player1: string;
  player2: string;
  winner: string;
  reporter: string;
  reportedAt: bigint | number;
  status: number;
}

export interface BracketSlot {
  player: string;
  seed: bigint | number;
}

interface BracketViewProps {
  matches: Match[];
  bracket: BracketSlot[];
  currentRound: number;
  maxPlayers: number;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function truncateAddress(address: string): string {
  if (!address || address === ZERO_ADDRESS) return "TBD";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getRoundName(round: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - round;
  switch (roundsFromEnd) {
    case 0:
      return "Final";
    case 1:
      return "Semi-Finals";
    case 2:
      return "Quarter-Finals";
    default:
      return `Round ${round + 1}`;
  }
}

function MatchBox({
  match,
  currentRound,
  isCurrentRound,
}: {
  match: Match | null;
  currentRound: number;
  isCurrentRound: boolean;
}) {
  if (!match) {
    return (
      <div className="w-48 h-24 flex items-center justify-center text-avax-text">
        <span className="text-sm">BYE</span>
      </div>
    );
  }

  const player1 = match.player1;
  const player2 = match.player2;
  const winner = match.winner;
  const hasWinner = winner !== ZERO_ADDRESS;
  const isPending = match.status === MatchStatus.Pending;
  const isDisputed = match.status === MatchStatus.Disputed;

  const p1IsWinner = hasWinner && winner.toLowerCase() === player1.toLowerCase();
  const p2IsWinner = hasWinner && winner.toLowerCase() === player2.toLowerCase();
  const p1IsBye = player1 === ZERO_ADDRESS;
  const p2IsBye = player2 === ZERO_ADDRESS;

  return (
    <div
      className={`
        w-48 bg-avax-card border rounded-lg overflow-hidden transition-all
        ${isCurrentRound ? "border-avax-red shadow-lg shadow-avax-red/20" : "border-avax-border"}
        ${isDisputed ? "border-yellow-500" : ""}
      `}
    >
      {/* Match ID header */}
      <div className="px-3 py-1 bg-avax-dark/50 flex justify-between items-center text-xs text-avax-text">
        <span>Match #{Number(match.matchId) + 1}</span>
        {isDisputed && <span className="text-yellow-400">Disputed</span>}
        {isPending && isCurrentRound && <span className="text-blue-400">Active</span>}
        {hasWinner && match.status === MatchStatus.Confirmed && (
          <span className="text-green-400">Confirmed</span>
        )}
      </div>

      {/* Player 1 */}
      <div
        className={`
          px-3 py-2 flex items-center gap-2 border-b border-avax-border/50 transition-colors
          ${p1IsWinner ? "bg-avax-red/20 text-white" : ""}
          ${p1IsBye ? "text-avax-text italic" : ""}
        `}
      >
        <div
          className={`
            w-2 h-2 rounded-full
            ${p1IsWinner ? "bg-avax-red" : p1IsBye ? "bg-avax-text/30" : "bg-avax-border"}
          `}
        />
        <span className="font-mono text-sm truncate flex-1">
          {p1IsBye ? "BYE" : truncateAddress(player1)}
        </span>
        {p1IsWinner && (
          <svg className="w-4 h-4 text-avax-red" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>

      {/* Player 2 */}
      <div
        className={`
          px-3 py-2 flex items-center gap-2 transition-colors
          ${p2IsWinner ? "bg-avax-red/20 text-white" : ""}
          ${p2IsBye ? "text-avax-text italic" : ""}
        `}
      >
        <div
          className={`
            w-2 h-2 rounded-full
            ${p2IsWinner ? "bg-avax-red" : p2IsBye ? "bg-avax-text/30" : "bg-avax-border"}
          `}
        />
        <span className="font-mono text-sm truncate flex-1">
          {p2IsBye ? "BYE" : truncateAddress(player2)}
        </span>
        {p2IsWinner && (
          <svg className="w-4 h-4 text-avax-red" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
    </div>
  );
}

function ConnectorLine({ fromTop, toMiddle }: { fromTop: boolean; toMiddle: boolean }) {
  return (
    <div className="w-8 flex flex-col justify-center relative">
      {/* Horizontal line from match */}
      <div className="absolute right-0 w-4 h-0.5 bg-avax-border" style={{ top: "50%" }} />

      {/* Vertical line */}
      <div
        className={`absolute right-0 w-0.5 bg-avax-border ${
          fromTop ? "top-1/2 h-1/2" : "bottom-1/2 h-1/2"
        }`}
      />
    </div>
  );
}

export function BracketView({ matches, bracket, currentRound, maxPlayers }: BracketViewProps) {
  // Calculate number of rounds
  const totalRounds = useMemo(() => {
    return Math.log2(maxPlayers);
  }, [maxPlayers]);

  // Organize matches by round
  const matchesByRound = useMemo(() => {
    const byRound: Map<number, Match[]> = new Map();

    for (let i = 0; i < totalRounds; i++) {
      byRound.set(i, []);
    }

    matches.forEach((match) => {
      const round = Number(match.round);
      if (!byRound.has(round)) {
        byRound.set(round, []);
      }
      byRound.get(round)!.push(match);
    });

    // Sort matches within each round by matchId
    byRound.forEach((roundMatches) => {
      roundMatches.sort((a, b) => Number(a.matchId) - Number(b.matchId));
    });

    return byRound;
  }, [matches, totalRounds]);

  // Calculate expected matches per round
  const getMatchesPerRound = (round: number): number => {
    return maxPlayers / Math.pow(2, round + 1);
  };

  // Render rounds
  const rounds = [];
  for (let round = 0; round < totalRounds; round++) {
    const roundMatches = matchesByRound.get(round) || [];
    const expectedMatches = getMatchesPerRound(round);
    const isCurrentRoundActive = round === currentRound;

    // Calculate spacing multiplier for vertical centering
    const spacingMultiplier = Math.pow(2, round);

    rounds.push(
      <div key={round} className="flex flex-col">
        {/* Round header */}
        <div
          className={`
            text-center mb-4 pb-2 border-b
            ${isCurrentRoundActive ? "border-avax-red text-white" : "border-avax-border text-avax-text"}
          `}
        >
          <span className="text-sm font-medium">{getRoundName(round, totalRounds)}</span>
        </div>

        {/* Matches */}
        <div
          className="flex flex-col justify-around flex-1"
          style={{ gap: `${spacingMultiplier * 24}px` }}
        >
          {Array.from({ length: expectedMatches }).map((_, index) => {
            const match = roundMatches[index] || null;
            return (
              <div key={index} className="flex items-center">
                <MatchBox
                  match={match}
                  currentRound={currentRound}
                  isCurrentRound={isCurrentRoundActive}
                />
                {/* Connector lines to next round */}
                {round < totalRounds - 1 && (
                  <div className="w-8 h-24 relative">
                    {/* Right horizontal line */}
                    <div
                      className="absolute right-0 w-4 h-0.5 bg-avax-border"
                      style={{ top: "50%", transform: "translateY(-50%)" }}
                    />
                    {/* Vertical connector */}
                    {index % 2 === 0 ? (
                      <div
                        className="absolute right-0 w-0.5 bg-avax-border"
                        style={{
                          top: "50%",
                          height: `${spacingMultiplier * 24 + 48}px`,
                        }}
                      />
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Add winner display
  const finalMatch = matchesByRound.get(totalRounds - 1)?.[0];
  const champion = finalMatch?.winner !== ZERO_ADDRESS ? finalMatch?.winner : null;

  return (
    <div className="relative">
      {/* Scroll hint for mobile */}
      <div className="md:hidden absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-avax-dark to-transparent pointer-events-none z-10" />

      {/* Bracket container */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-8 min-w-max p-4">
          {rounds}

          {/* Champion display */}
          <div className="flex flex-col">
            <div className="text-center mb-4 pb-2 border-b border-rarity-legendary text-rarity-legendary">
              <span className="text-sm font-medium">Champion</span>
            </div>
            <div className="flex items-center justify-center flex-1">
              <div
                className={`
                  w-48 bg-gradient-to-br from-rarity-legendary-bg to-avax-card
                  border-2 border-rarity-legendary rounded-lg p-4 text-center
                  ${champion ? "glow-gold" : "opacity-50"}
                `}
              >
                {champion ? (
                  <>
                    <div className="text-2xl mb-2">🏆</div>
                    <div className="font-mono text-sm text-rarity-legendary">
                      {truncateAddress(champion)}
                    </div>
                  </>
                ) : (
                  <div className="text-avax-text text-sm">TBD</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-avax-text mt-4 pt-4 border-t border-avax-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-avax-red" />
          <span>Winner</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border border-avax-red bg-transparent" />
          <span>Current Round</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border border-yellow-500 bg-transparent" />
          <span>Disputed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-avax-border" />
          <span>Pending</span>
        </div>
      </div>
    </div>
  );
}
