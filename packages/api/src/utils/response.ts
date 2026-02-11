import type { Context } from "hono";
import { serialize } from "./serialize";

export function ok(c: Context, data: unknown, status = 200) {
  return c.json({ ok: true, data: serialize(data) }, status as any);
}

export function fail(c: Context, code: string, message: string, status = 400) {
  return c.json({ ok: false, error: { code, message } }, status as any);
}
