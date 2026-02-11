import type { Context } from "hono";

export function errorHandler(err: Error, c: Context) {
  console.error("[API Error]", err);

  // viem contract revert
  if (err.message?.includes("reverted")) {
    const match = err.message.match(/reverted with reason string '(.+?)'/);
    return c.json({
      ok: false,
      error: {
        code: "CONTRACT_REVERT",
        message: match ? match[1] : "Transaction reverted",
      },
    }, 400);
  }

  // viem estimation / call errors
  if (err.message?.includes("execution reverted")) {
    return c.json({
      ok: false,
      error: {
        code: "CONTRACT_ERROR",
        message: "Contract call failed — check arguments",
      },
    }, 400);
  }

  return c.json({
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    },
  }, 500);
}
