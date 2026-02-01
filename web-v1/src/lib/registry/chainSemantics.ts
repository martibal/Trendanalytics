import type { ChainId } from "@/lib/types";

/**
 * Chain semantics v1
 * - Primary: default in Basic, first-class in UI
 * - Secondary: shown in Advanced as supporting evidence
 * - Other: everything else (still accessible in Advanced)
 *
 * NOTE: Keys are raw canonical metric keys (no MA suffix). UI/series code resolves daily/ma7/ma30.
 */
export const PRIMARY_METRICS_BY_CHAIN: Record<ChainId, string[]> = {
  bitcoin: [
    "tx_count_daily",
    "median_tx_fee_native",
    "avg_block_time_sec",
    "value_transferred_native",
    "block_count_daily",
  ],
  ethereum: [
    "median_tx_fee_native",
    "tx_count_daily",
    "unique_active_addresses",
    "gas_utilization_pct",
    "failed_tx_rate",
  ],
  arbitrum: [
    "tx_count_daily",
    "unique_active_addresses",
    "failed_tx_rate",
    "median_tx_fee_native",
    "value_transferred_native",
  ],
  base: [
    "tx_count_daily",
    "unique_active_addresses",
    "tx_per_user",
    "failed_tx_rate",
    "median_tx_fee_native",
  ],
};

export const SECONDARY_METRICS_BY_CHAIN: Record<ChainId, string[]> = {
  bitcoin: ["unique_active_addresses", "tx_per_user"],
  ethereum: ["value_transferred_native", "avg_block_time_sec", "block_count_daily"],
  arbitrum: ["gas_utilization_pct", "avg_block_time_sec", "block_count_daily", "tx_per_user"],
  base: ["value_transferred_native", "gas_utilization_pct", "avg_block_time_sec", "block_count_daily"],
};

export type MetricTier = "primary" | "secondary" | "other";

export function getMetricTier(chain: ChainId, baseKey: string): MetricTier {
  if (PRIMARY_METRICS_BY_CHAIN[chain]?.includes(baseKey)) return "primary";
  if (SECONDARY_METRICS_BY_CHAIN[chain]?.includes(baseKey)) return "secondary";
  return "other";
}

/**
 * Pick a default metric (base key) for a chain.
 * If availableKeys is provided, we try to select the first primary key that exists (daily or MA variants).
 */
export function pickDefaultBaseMetricKey(chain: ChainId, availableKeys?: Set<string> | null): string {
  const primary = PRIMARY_METRICS_BY_CHAIN[chain] ?? [];
  if (!availableKeys || availableKeys.size === 0) return primary[0] ?? "tx_count_daily";

  const existsForBase = (base: string) =>
    availableKeys.has(base) || availableKeys.has(`${base}__ma7`) || availableKeys.has(`${base}__ma30`);

  for (const b of primary) {
    if (existsForBase(b)) return b;
  }

  // fallback: tx_count_daily if present
  if (existsForBase("tx_count_daily")) return "tx_count_daily";

  // final fallback: just pick any available key and strip suffix
  const any = Array.from(availableKeys)[0] ?? "tx_count_daily";
  return any.split("__")[0] ?? any;
}

/**
 * Some metrics are structurally not applicable; this is used for UI education strings.
 * (We don’t “hide” solely based on this; availability + tier drive UI.)
 */
export const STRUCTURALLY_NOT_APPLICABLE: Partial<Record<ChainId, Array<{ key: string; why: string }>>> = {
  bitcoin: [
    { key: "gas_utilization_pct", why: "Bitcoin has no gas accounting; execution-style capacity metrics do not apply." },
    { key: "failed_tx_rate", why: "Bitcoin does not have the same notion of EVM-style transaction failure/revert." },
  ],
};

export function getPrimaryBaseKeys(chain: ChainId): string[] {
  return PRIMARY_METRICS_BY_CHAIN[chain] ?? [];
}

export function getSecondaryBaseKeys(chain: ChainId): string[] {
  return SECONDARY_METRICS_BY_CHAIN[chain] ?? [];
}
