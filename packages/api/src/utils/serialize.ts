/**
 * Recursively converts BigInt values to strings for JSON serialization.
 * viem returns bigint for all uint256 fields — JSON.stringify throws on BigInt.
 */
export function serialize(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(serialize);
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = serialize(v);
    }
    return out;
  }
  return value;
}
