import { Hono } from "hono";
import type { ApiClient } from "../client";
import { ok, fail } from "../utils/response";
import { validateAddress } from "../utils/validation";

export function playerRoutes(client: ApiClient) {
  const app = new Hono();

  // GET /players/:address — full profile + stats + balance
  app.get("/:address", async (c) => {
    const addr = validateAddress(c.req.param("address"));
    if (!addr) return fail(c, "INVALID_ADDRESS", "Invalid Ethereum address", 400);

    const [profile, stats, balance, achievements] = await Promise.all([
      client.getPlayerProfile(addr),
      client.getPlayerStats(addr),
      client.getP1Balance(addr),
      client.getPlayerAchievements(addr),
    ]);

    return ok(c, { profile, stats, p1Balance: balance, achievements });
  });

  // GET /players/:address/achievements — achievement history only
  app.get("/:address/achievements", async (c) => {
    const addr = validateAddress(c.req.param("address"));
    if (!addr) return fail(c, "INVALID_ADDRESS", "Invalid Ethereum address", 400);

    const achievements = await client.getPlayerAchievements(addr);
    return ok(c, { achievements });
  });

  return app;
}
