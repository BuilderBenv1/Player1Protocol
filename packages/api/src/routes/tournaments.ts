import { Hono } from "hono";
import type { Address } from "viem";
import type { ApiClient } from "../client";
import { ok, fail } from "../utils/response";
import { validateAddress } from "../utils/validation";
import { authMiddleware } from "../middleware/auth";
import type { Config } from "../config";

const STATUS_LABELS: Record<number, string> = {
  0: "Registration",
  1: "Active",
  2: "Completed",
  3: "Cancelled",
};

export function tournamentRoutes(client: ApiClient, config: Config) {
  const app = new Hono();

  // GET /tournaments — list all tournaments with summary info
  app.get("/", async (c) => {
    const addresses = await client.getAllTournaments();

    const tournaments = await Promise.all(
      addresses.map(async (addr: Address) => {
        const [cfg, status, prizePool, playerCount] = await Promise.all([
          client.getTournamentConfig(addr),
          client.getTournamentStatus(addr),
          client.getTournamentPrizePool(addr),
          client.getTournamentPlayerCount(addr),
        ]);
        return {
          address: addr,
          config: cfg,
          status,
          statusLabel: STATUS_LABELS[status] || "Unknown",
          prizePool,
          playerCount,
        };
      })
    );

    return ok(c, { tournaments, total: tournaments.length });
  });

  // GET /tournaments/:address — full tournament details
  app.get("/:address", async (c) => {
    const addr = validateAddress(c.req.param("address"));
    if (!addr) return fail(c, "INVALID_ADDRESS", "Invalid tournament address", 400);

    const [cfg, status, prizePool, playerCount, players] = await Promise.all([
      client.getTournamentConfig(addr),
      client.getTournamentStatus(addr),
      client.getTournamentPrizePool(addr),
      client.getTournamentPlayerCount(addr),
      client.getTournamentPlayers(addr),
    ]);

    let bracket = null;
    let matches = null;
    try {
      [bracket, matches] = await Promise.all([
        client.getBracket(addr),
        client.getMatches(addr),
      ]);
    } catch {}

    return ok(c, {
      address: addr,
      config: cfg,
      status,
      statusLabel: STATUS_LABELS[status] || "Unknown",
      prizePool,
      playerCount,
      players,
      bracket,
      matches,
    });
  });

  // GET /tournaments/:address/bracket
  app.get("/:address/bracket", async (c) => {
    const addr = validateAddress(c.req.param("address"));
    if (!addr) return fail(c, "INVALID_ADDRESS", "Invalid tournament address", 400);

    const bracket = await client.getBracket(addr);
    return ok(c, { bracket });
  });

  // GET /tournaments/:address/matches
  app.get("/:address/matches", async (c) => {
    const addr = validateAddress(c.req.param("address"));
    if (!addr) return fail(c, "INVALID_ADDRESS", "Invalid tournament address", 400);

    const matches = await client.getMatches(addr);
    return ok(c, { matches });
  });

  // POST /tournaments — create a new tournament (authenticated)
  app.post("/", authMiddleware(config), async (c) => {
    const body = await c.req.json();

    const required = ["name", "description", "gameContract", "entryFee", "maxPlayers", "prizeSplitBps", "registrationDeadline"];
    for (const field of required) {
      if (body[field] === undefined) {
        return fail(c, "MISSING_FIELD", `Missing required field: ${field}`, 400);
      }
    }

    const gameContract = validateAddress(body.gameContract);
    if (!gameContract) return fail(c, "INVALID_ADDRESS", "Invalid gameContract address", 400);

    const result = await client.createTournament({
      name: body.name,
      description: body.description,
      gameContract,
      entryFee: BigInt(body.entryFee),
      maxPlayers: BigInt(body.maxPlayers),
      prizeSplitBps: body.prizeSplitBps.map((x: string | number) => BigInt(x)),
      registrationDeadline: BigInt(body.registrationDeadline),
      disputeWindowSeconds: BigInt(body.disputeWindowSeconds || 3600),
    });

    return ok(c, result, 201);
  });

  // POST /tournaments/:address/report — report match result (authenticated)
  app.post("/:address/report", authMiddleware(config), async (c) => {
    const addr = validateAddress(c.req.param("address"));
    if (!addr) return fail(c, "INVALID_ADDRESS", "Invalid tournament address", 400);

    const body = await c.req.json();
    if (body.matchId === undefined || !body.winner) {
      return fail(c, "MISSING_FIELD", "matchId and winner are required", 400);
    }

    const winner = validateAddress(body.winner);
    if (!winner) return fail(c, "INVALID_ADDRESS", "Invalid winner address", 400);

    const txHash = await client.reportMatchResult(addr, Number(body.matchId), winner);
    return ok(c, { txHash });
  });

  return app;
}
