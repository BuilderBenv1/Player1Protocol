import type { Context, Next } from "hono";
import { type Config } from "../config";

export function authMiddleware(config: Config) {
  return async (c: Context, next: Next) => {
    const key = c.req.header("X-API-Key");
    if (!key) {
      return c.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Missing X-API-Key header" } }, 401);
    }

    const validKeys = Object.values(config.apiKeys);
    if (!validKeys.includes(key)) {
      return c.json({ ok: false, error: { code: "FORBIDDEN", message: "Invalid API key" } }, 403);
    }

    await next();
  };
}
