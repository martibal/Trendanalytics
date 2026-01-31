import type { ChainId } from "@/lib/types";

export type ExplainLevel = "basic" | "advanced";

export type MetricRegistryEntry = {
  /** Must match the key in derived/<chain>/<date>.json.metrics */
  key: string;
  /** Human label used in UI selectors */
  label: string;
  /** Optional unit hint for display (kept lightweight for v1.1) */
  unit?: string;
  /** Which chains this metric should be shown for (omit => all) */
  chains?: ChainId[];
  /** Short description for inline explain UI */
  description?: {
    basic: string;
    advanced: string;
  };
};

/**
 * Metric registry v1.1
 *
 * Goal: eliminate hard-coded metric lists in components and centralize labels + explanations.
 * This registry is intentionally minimal and can be expanded with richer metadata later
 * (axis mapping, transformations, quality notes, etc.).
 */
export const METRIC_REGISTRY: MetricRegistryEntry[] = [
  {
    key: "tx_count_daily__ma7",
    label: "Transactions (7d MA)",
    unit: "count",
    description: {
      basic: "Smoothed daily count of confirmed transactions (7-day moving average).",
      advanced:
        "Daily transaction count, smoothed by a 7-day moving average computed in the pipeline. " +
        "Use as a demand/activity proxy; interpret in the context of coverage/confidence and chain-specific data lags.",
    },
  },
  {
    key: "tx_count_daily__ma30",
    label: "Transactions (30d MA)",
    unit: "count",
    description: {
      basic: "Longer-smoothed daily count of confirmed transactions (30-day moving average).",
      advanced:
        "Daily transaction count, smoothed by a 30-day moving average computed in the pipeline. " +
        "Useful for regime context versus short-term movement (e.g., MA7 vs MA30).",
    },
  },
  {
    key: "median_tx_fee_native__ma7",
    label: "Median fee (native, 7d MA)",
    unit: "native",
    description: {
      basic: "Typical transaction fee level, smoothed over 7 days (native asset units).",
      advanced:
        "Median per-transaction fee in native units, smoothed by a 7-day moving average. " +
        "This is a distributional statistic (median), reducing sensitivity to outliers.",
    },
  },
  {
    key: "median_tx_fee_native__ma30",
    label: "Median fee (native, 30d MA)",
    unit: "native",
    description: {
      basic: "Typical transaction fee level, smoothed over 30 days (native asset units).",
      advanced:
        "Median per-transaction fee in native units, smoothed by a 30-day moving average. " +
        "Long window smoothing emphasizes regime-level friction trends.",
    },
  },
  {
    key: "value_transferred_native__ma7",
    label: "Value transferred (native, 7d MA)",
    unit: "native",
    description: {
      basic: "Smoothed daily total value transferred on-chain (native units).",
      advanced:
        "Daily total value transferred on-chain, in native units, smoothed by a 7-day moving average. " +
        "Interpret cautiously across chains because economic meaning differs by chain design.",
    },
  },
  {
    key: "value_transferred_native__ma30",
    label: "Value transferred (native, 30d MA)",
    unit: "native",
    description: {
      basic: "Longer-smoothed daily total value transferred on-chain (native units).",
      advanced:
        "Daily total value transferred on-chain, in native units, smoothed by a 30-day moving average. " +
        "Used for broader demand/regime context rather than short-term variation.",
    },
  },

{
    key: "avg_block_time_sec",
    label: "Avg block time (sec)",
    unit: "seconds",
    description: {
      basic: "Average time between blocks, measured in seconds.",
      advanced:
        "Mean inter-block time in seconds for the observation day (no moving-average suffix). " +
        "This raw series can reflect changes in block production regularity and protocol/network conditions. " +
        "Interpret relative to the chain’s own historical distribution and coverage/confidence constraints.",
    },
  },


  {
    key: "avg_block_time_sec__ma7",
    label: "Avg block time (sec, 7d MA)",
    unit: "seconds",
    description: {
      basic: "Smoothed average time between blocks (7-day moving average).",
      advanced:
        "Average block time in seconds, smoothed by a 7-day moving average. " +
        "Can reflect protocol conditions and operational dynamics; interpretation is chain-specific.",
    },
  },
  {
    key: "avg_block_time_sec__ma30",
    label: "Avg block time (sec, 30d MA)",
    unit: "seconds",
    description: {
      basic: "Longer-smoothed average time between blocks (30-day moving average).",
      advanced:
        "Average block time in seconds, smoothed by a 30-day moving average. " +
        "A 30-day window highlights persistent shifts rather than transients.",
    },
  },
];

function humanizeMetricKey(key: string): string {
  // Remove common suffixes and transform into readable label.
  // Examples:
  //   avg_block_time_sec__ma7 -> Avg block time (sec, 7d MA)
  //   median_tx_fee_native__ma30 -> Median tx fee (native, 30d MA)
  //   tx_count_daily -> Tx count daily

  const parts = key.split("__");
  const base = parts[0] ?? key;

  // Handle moving-average suffix
  let suffix = "";
  const maybeMA = parts[1] ?? "";
  const maMatch = maybeMA.match(/^ma(\d+)$/i);
  if (maMatch) {
    suffix = ` (${maMatch[1]}d MA)`;
  }

  // Turn snake_case into words
  const words = base
    .split("_")
    .filter(Boolean)
    .map((w) => {
      // small normalizations
      if (w === "tx") return "tx";
      if (w === "sec") return "sec";
      if (w === "usd") return "usd";
      if (w === "eth") return "eth";
      if (w === "btc") return "btc";
      return w;
    });

  // Capitalize first word only, keep acronyms lower as-is
  const label =
    (words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : base) +
    (words.length > 1 ? " " + words.slice(1).join(" ") : "");

  return label + suffix;
}

/** Single source of truth for labels: registry if present, otherwise humanized key. */
export function getMetricLabel(key: string): string {
  const m = METRIC_REGISTRY.find((x) => x.key === key);
  return m?.label ?? humanizeMetricKey(key);
}


export function getMetricOptionsForChain(
  chain: ChainId,
  opts?: { availableKeys?: string[] }
): Array<{ key: string; label: string }> {
  const available = opts?.availableKeys ? new Set(opts.availableKeys) : null;

  // 1) Start with registry entries allowed for this chain
  const reg = METRIC_REGISTRY
    .filter((m) => !m.chains || m.chains.includes(chain))
    .map((m) => ({ key: m.key, label: m.label }));

  // If we know what's actually available in derived/meta, filter to only those keys
  const regFiltered = available ? reg.filter((m) => available.has(m.key)) : reg;

  // 2) If availableKeys is provided, include any keys that aren't in registry (humanized label)
  // This prevents "missing registry entry -> raw key everywhere" and prevents empty dropdowns.
  if (available) {
    const regKeys = new Set(regFiltered.map((x) => x.key));
    const extras: Array<{ key: string; label: string }> = [];

    for (const k of available) {
      if (!regKeys.has(k)) extras.push({ key: k, label: getMetricLabel(k) });
    }

    // Put registry-known entries first (curated), then extras (unknown)
    return [...regFiltered, ...extras];
  }

  return reg;
}


export function getMetricDescription(key: string, level: ExplainLevel): string | null {
  const m = METRIC_REGISTRY.find((x) => x.key === key);
  if (!m?.description) return null;
  return level === "advanced" ? m.description.advanced : m.description.basic;
}
