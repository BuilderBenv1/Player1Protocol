import { Hono } from "hono";
import type { ApiClient } from "../client";
import { ok } from "../utils/response";

export function statsRoutes(client: ApiClient) {
  const app = new Hono();

  // GET /stats — protocol-level stats
  app.get("/", async (c) => {
    const [totalPassports, tournamentCount, p1Supply] = await Promise.all([
      client.getTotalPassports(),
      client.getTournamentCount(),
      client.getP1TotalSupply(),
    ]);

    return ok(c, {
      totalPlayers: totalPassports,
      totalTournaments: tournamentCount,
      p1TotalSupply: p1Supply,
    });
  });

  return app;
}
