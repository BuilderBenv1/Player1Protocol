import { Hono } from "hono";
import type { ApiClient } from "../client";
import { ok, fail } from "../utils/response";
import { validateAddress } from "../utils/validation";
import { authMiddleware } from "../middleware/auth";
import type { Config } from "../config";

export function achievementRoutes(client: ApiClient, config: Config) {
  const app = new Hono();

  // GET /achievements — list all achievements
  app.get("/", async (c) => {
    const count = await client.getAchievementCount();
    const total = Number(count);

    const achievements = [];
    for (let i = 1; i <= total; i++) {
      try {
        const a = await client.getAchievement(BigInt(i));
        achievements.push(a);
      } catch {}
    }

    return ok(c, { achievements, total });
  });

  // GET /achievements/:id — single achievement
  app.get("/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (!Number.isFinite(id) || id < 1) {
      return fail(c, "INVALID_ID", "Achievement ID must be a positive integer", 400);
    }

    const achievement = await client.getAchievement(BigInt(id));
    return ok(c, { achievement });
  });

  // POST /achievements/unlock — award achievement to player (authenticated)
  app.post("/unlock", authMiddleware(config), async (c) => {
    const body = await c.req.json();

    if (!body.player || body.achievementId === undefined) {
      return fail(c, "MISSING_FIELD", "player and achievementId are required", 400);
    }

    const player = validateAddress(body.player);
    if (!player) return fail(c, "INVALID_ADDRESS", "Invalid player address", 400);

    const txHash = await client.awardAchievement(player, BigInt(body.achievementId));
    return ok(c, { txHash });
  });

  return app;
}
