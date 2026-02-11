import type { Address } from "viem";
import { isAddress } from "viem";

export function validateAddress(raw: string): Address | null {
  if (!raw || !isAddress(raw)) return null;
  return raw as Address;
}

export function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
