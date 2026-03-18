// import type { ChainId } from "@/lib/types";

// export type ExplainLevel = "basic" | "advanced";
// export type MetricTier = "primary" | "secondary" | "exploratory" | "na";

// export type MetricRegistryEntry = {
//   /** Must match the key in derived/<chain>/<date>.json.metrics */
//   key: string;
//   /** Human label used in UI selectors */
//   label: string;
//   /** Optional unit hint for display */
//   unit?: "count" | "seconds" | "native" | "ratio" | "unknown";
//   /** Which chains this metric should be shown for (omit => all) */
//   chains?: ChainId[];

//   /** Chain-specific relevance/tiering for UX + pedagogy */
//   tierByChain?: Partial<Record<ChainId, MetricTier>>;

//   /** Default metric suggestion: if true for a chain, prefer as default in UI */
//   defaultForChains?: ChainId[];

//   /**
//    * Why users might see nulls (or why the metric may be NA).
//    * Use this to teach that "null != zero", and to explain chain-specific structural NA.
//    */
//   expectedNulls?: Partial<
//     Record<
//       ChainId,
//       {
//         basic: string;
//         advanced: string;
//       }
//     >
//   >;

//   /** Explanation shown in InfoBox / tooltips */
//   description?: {
//     basic: string;
//     advanced: string;
//   };
// };

// /**
//  * Metric registry v1.2 (chain-semantic)
//  *
//  * Goals:
//  * - Centralize labels + explanations + chain-specific relevance
//  * - Keep UI graph-first while preserving deep auditability in Advanced
//  * - Teach: "null != zero" and why some metrics are structurally NA on some chains
//  */
// export const METRIC_REGISTRY: MetricRegistryEntry[] = [
//   // -------------------------
//   // Demand / activity proxies
//   // -------------------------
//   {
//     key: "tx_count_daily",
//     label: "Tx count daily",
//     unit: "count",
//     tierByChain: {
//       bitcoin: "primary",
//       ethereum: "secondary",
//       arbitrum: "primary",
//       base: "primary",
//     },
//     defaultForChains: ["bitcoin", "arbitrum", "base"],
//     expectedNulls: {
//       arbitrum: {
//         basic: "Occasional gaps can occur when upstream rollup indexing is delayed or incomplete.",
//         advanced:
//           "Nulls typically indicate missing upstream inputs (index lag / incomplete coverage) rather than zero activity. " +
//           "Interpret alongside confidence/coverage; treat gaps as ‘unknown’ not ‘low’.",
//       },
//       base: {
//         basic: "Occasional gaps can occur when upstream rollup indexing is delayed or incomplete.",
//         advanced:
//           "Nulls typically indicate missing upstream inputs (index lag / incomplete coverage) rather than zero activity. " +
//           "Interpret alongside confidence/coverage; treat gaps as ‘unknown’ not ‘low’.",
//       },
//     },
//     description: {
//       basic: "Daily count of confirmed transactions.",
//       advanced:
//         "Let x_t be the daily transaction count on day t. This is the raw (unsmoothed) daily series. " +
//         "For trend reading, compare x_t against MA7 and MA30. Missing values are represented as null (unknown), not zeros.",
//     },
//   },
//   {
//     key: "tx_count_daily__ma7",
//     label: "Transactions (7d MA)",
//     unit: "count",
//     tierByChain: {
//       bitcoin: "primary",
//       ethereum: "secondary",
//       arbitrum: "primary",
//       base: "primary",
//     },
//     description: {
//       basic: "Smoothed daily count of confirmed transactions (7-day moving average).",
//       advanced:
//         "MA7 is computed in the pipeline as: MA7_t = (1/7) * Σ_{i=0..6} x_{t-i}, where x_t is daily tx count. " +
//         "Use as a demand/activity proxy; interpret with coverage/confidence and chain-specific data lags. " +
//         "Nulls propagate if inputs are missing (gaps, not zeros).",
//     },
//   },
//   {
//     key: "tx_count_daily__ma30",
//     label: "Transactions (30d MA)",
//     unit: "count",
//     tierByChain: {
//       bitcoin: "secondary",
//       ethereum: "exploratory",
//       arbitrum: "secondary",
//       base: "secondary",
//     },
//     description: {
//       basic: "Longer-smoothed daily count of confirmed transactions (30-day moving average).",
//       advanced:
//         "MA30 is computed in the pipeline as: MA30_t = (1/30) * Σ_{i=0..29} x_{t-i}. " +
//         "Useful as regime context versus short-term movement (e.g., MA7 vs MA30).",
//     },
//   },

//   // -------------------------
//   // Friction proxies (fees)
//   // -------------------------
//   {
//     key: "median_tx_fee_native",
//     label: "Median tx fee (native)",
//     unit: "native",
//     tierByChain: {
//       bitcoin: "secondary",
//       ethereum: "primary",
//       arbitrum: "primary",
//       base: "primary",
//     },
//     defaultForChains: ["ethereum"],
//     expectedNulls: {
//       bitcoin: {
//         basic:
//           "Can be missing depending on whether fee medians are available for the snapshot. Fees are less comparable across designs.",
//         advanced:
//           "If fee distribution inputs are missing for the day, median cannot be computed and is null. " +
//           "Also note comparability limits: BTC fee market structure differs from EVM fee markets.",
//       },
//     },
//     description: {
//       basic: "Typical transaction fee level (median), in native asset units.",
//       advanced:
//         "Median is a distributional statistic: med_t = median({fee_i}_t). It is robust to outliers compared to the mean. " +
//         "Interpret levels within-chain; cross-chain comparisons are not economically identical due to different execution models and fee markets.",
//     },
//   },
//   {
//     key: "median_tx_fee_native__ma7",
//     label: "Median fee (native, 7d MA)",
//     unit: "native",
//     tierByChain: {
//       bitcoin: "secondary",
//       ethereum: "primary",
//       arbitrum: "primary",
//       base: "primary",
//     },
//     description: {
//       basic: "Typical transaction fee level, smoothed over 7 days (native asset units).",
//       advanced:
//         "Let m_t be the daily median fee. MA7_t = (1/7) * Σ_{i=0..6} m_{t-i}. " +
//         "Median reduces sensitivity to fee spikes/outliers; MA7 reduces day-to-day noise further.",
//     },
//   },
//   {
//     key: "median_tx_fee_native__ma30",
//     label: "Median fee (native, 30d MA)",
//     unit: "native",
//     tierByChain: {
//       bitcoin: "exploratory",
//       ethereum: "secondary",
//       arbitrum: "secondary",
//       base: "secondary",
//     },
//     description: {
//       basic: "Typical transaction fee level, smoothed over 30 days (native asset units).",
//       advanced:
//         "MA30 emphasizes regime-level friction trends. Use MA7 vs MA30 to characterize short-vs-long friction shifts. " +
//         "Nulls indicate missing inputs; gaps are ‘unknown’, not ‘low’.",
//     },
//   },

//   // -------------------------
//   // Value / settlement proxies
//   // -------------------------
//   {
//     key: "value_transferred_native",
//     label: "Value transferred (native)",
//     unit: "native",
//     tierByChain: {
//       bitcoin: "primary",
//       ethereum: "secondary",
//       arbitrum: "exploratory",
//       base: "exploratory",
//     },
//     expectedNulls: {
//       ethereum: {
//         basic: "May be missing depending on how value-transferred is defined/available for the snapshot.",
//         advanced:
//           "Null indicates missing upstream value-transfer aggregates for the day. " +
//           "Also note: value transferred in native is sensitive to chain-specific semantics (L1 vs L2 economic meaning).",
//       },
//       arbitrum: {
//         basic:
//           "Often missing or hard to interpret on rollups depending on whether L2 value-transfer aggregates are published.",
//         advanced:
//           "On rollups, value transferred can be structurally ambiguous (bridges, batching, L1 calldata effects). " +
//           "If the pipeline does not publish a robust aggregate for the day, this is null rather than a misleading number.",
//       },
//       base: {
//         basic:
//           "Often missing or hard to interpret on rollups depending on whether L2 value-transfer aggregates are published.",
//         advanced:
//           "On rollups, value transferred can be structurally ambiguous (bridges, batching, L1 calldata effects). " +
//           "If the pipeline does not publish a robust aggregate for the day, this is null rather than a misleading number.",
//       },
//     },
//     description: {
//       basic: "Daily total value transferred on-chain (native units).",
//       advanced:
//         "Let v_t be the daily sum of transferred value (in native units). Interpretation is chain-specific; " +
//         "cross-chain comparisons can be misleading because economic meaning differs by execution/settlement design.",
//     },
//   },
//   {
//     key: "value_transferred_native__ma7",
//     label: "Value transferred (native, 7d MA)",
//     unit: "native",
//     tierByChain: {
//       bitcoin: "primary",
//       ethereum: "secondary",
//       arbitrum: "exploratory",
//       base: "exploratory",
//     },
//     description: {
//       basic: "Smoothed daily total value transferred on-chain (native units).",
//       advanced:
//         "MA7_t = (1/7) * Σ_{i=0..6} v_{t-i}. Use primarily within-chain. On rollups, treat as exploratory unless the pipeline guarantees semantics.",
//     },
//   },
//   {
//     key: "value_transferred_native__ma30",
//     label: "Value transferred (native, 30d MA)",
//     unit: "native",
//     tierByChain: {
//       bitcoin: "secondary",
//       ethereum: "exploratory",
//       arbitrum: "na",
//       base: "na",
//     },
//     expectedNulls: {
//       arbitrum: {
//         basic: "Not published as a stable rollup diagnostic in this dataset (often null).",
//         advanced:
//           "Marked NA for rollups in v1.x because economic interpretation is not stable enough to present as canonical. " +
//           "If a value appears, treat it as exploratory and validate against gold/meta semantics.",
//       },
//       base: {
//         basic: "Not published as a stable rollup diagnostic in this dataset (often null).",
//         advanced:
//           "Marked NA for rollups in v1.x because economic interpretation is not stable enough to present as canonical. " +
//           "If a value appears, treat it as exploratory and validate against gold/meta semantics.",
//       },
//     },
//     description: {
//       basic: "Longer-smoothed daily total value transferred on-chain (native units).",
//       advanced:
//         "Used for broader regime context rather than short-term variation. On rollups this is NA by default in v1.x.",
//     },
//   },

//   // -------------------------
//   // Capacity / block production
//   // -------------------------
//   {
//     key: "avg_block_time_sec",
//     label: "Avg block time (sec)",
//     unit: "seconds",
//     tierByChain: {
//       bitcoin: "primary",
//       ethereum: "secondary",
//       arbitrum: "na",
//       base: "na",
//     },
//     expectedNulls: {
//       arbitrum: {
//         basic:
//           "Not a stable rollup diagnostic: L2 ‘block time’ is not comparable to L1 block production (often null).",
//         advanced:
//           "Rollups do not have the same consensus block cadence semantics as L1. If the pipeline does not publish a meaningful L2 analogue, it is null.",
//       },
//       base: {
//         basic:
//           "Not a stable rollup diagnostic: L2 ‘block time’ is not comparable to L1 block production (often null).",
//         advanced:
//           "Rollups do not have the same consensus block cadence semantics as L1. If the pipeline does not publish a meaningful L2 analogue, it is null.",
//       },
//     },
//     description: {
//       basic: "Average time between blocks, measured in seconds.",
//       advanced:
//         "Mean inter-block time in seconds for the day. This can reflect changes in block production regularity and protocol/network conditions. " +
//         "Interpret relative to the chain’s own historical distribution and coverage/confidence constraints.",
//     },
//   },
//   {
//     key: "avg_block_time_sec__ma7",
//     label: "Avg block time (sec, 7d MA)",
//     unit: "seconds",
//     tierByChain: {
//       bitcoin: "secondary",
//       ethereum: "exploratory",
//       arbitrum: "na",
//       base: "na",
//     },
//     description: {
//       basic: "Smoothed average time between blocks (7-day moving average).",
//       advanced:
//         "MA7 over avg block time. Useful to see persistent shifts rather than transient day-to-day jitter. NA for rollups by default in v1.x.",
//     },
//   },
//   {
//     key: "avg_block_time_sec__ma30",
//     label: "Avg block time (sec, 30d MA)",
//     unit: "seconds",
//     tierByChain: {
//       bitcoin: "exploratory",
//       ethereum: "na",
//       arbitrum: "na",
//       base: "na",
//     },
//     description: {
//       basic: "Longer-smoothed average time between blocks (30-day moving average).",
//       advanced:
//         "A 30-day smoothing highlights persistent shifts. This is typically only meaningful for BTC in v1.x.",
//     },
//   },
// ];

// // -------------------------
// // Helpers
// // -------------------------

// function humanizeMetricKey(key: string): string {
//   const parts = key.split("__");
//   const base = parts[0] ?? key;

//   let suffix = "";
//   const maybeMA = parts[1] ?? "";
//   const maMatch = maybeMA.match(/^ma(\d+)$/i);
//   if (maMatch) suffix = ` (${maMatch[1]}d MA)`;

//   const words = base
//     .split("_")
//     .filter(Boolean)
//     .map((w) => {
//       if (w === "tx") return "tx";
//       if (w === "sec") return "sec";
//       if (w === "usd") return "usd";
//       if (w === "eth") return "eth";
//       if (w === "btc") return "btc";
//       return w;
//     });

//   const label =
//     (words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : base) +
//     (words.length > 1 ? " " + words.slice(1).join(" ") : "");

//   return label + suffix;
// }

// /** Single source of truth for labels: registry if present, otherwise humanized key. */
// export function getMetricLabel(key: string): string {
//   const m = METRIC_REGISTRY.find((x) => x.key === key);
//   return m?.label ?? humanizeMetricKey(key);
// }

// export function getMetricTier(chain: ChainId, key: string): MetricTier {
//   const m = METRIC_REGISTRY.find((x) => x.key === key);
//   if (!m) return "exploratory";
//   if (m.chains && !m.chains.includes(chain)) return "na";
//   return m.tierByChain?.[chain] ?? "exploratory";
// }

// export function getExpectedNullReason(chain: ChainId, key: string, level: ExplainLevel): string | null {
//   const m = METRIC_REGISTRY.find((x) => x.key === key);
//   const r = m?.expectedNulls?.[chain];
//   if (!r) return null;
//   return level === "advanced" ? r.advanced : r.basic;
// }

// export function getMetricDescription(key: string, level: ExplainLevel): string | null {
//   const m = METRIC_REGISTRY.find((x) => x.key === key);
//   if (!m?.description) return null;
//   return level === "advanced" ? m.description.advanced : m.description.basic;
// }

// export function getDefaultMetricForChain(chain: ChainId): string {
//   // Prefer explicit defaults in registry
//   const hit = METRIC_REGISTRY.find((m) => m.defaultForChains?.includes(chain));
//   if (hit) return hit.key;

//   // Fallback: pick the first "primary" metric for chain
//   const primary = METRIC_REGISTRY.find((m) => getMetricTier(chain, m.key) === "primary");
//   if (primary) return primary.key;

//   // Final fallback
//   return "tx_count_daily";
// }

// export function getChainMetricGuidance(chain: ChainId): {
//   primary: Array<{ key: string; label: string }>;
//   secondary: Array<{ key: string; label: string }>;
//   exploratory: Array<{ key: string; label: string }>;
//   expectedNulls: Array<{ key: string; label: string; reasonBasic: string; reasonAdvanced: string }>;
// } {
//   const primary: Array<{ key: string; label: string }> = [];
//   const secondary: Array<{ key: string; label: string }> = [];
//   const exploratory: Array<{ key: string; label: string }> = [];
//   const expectedNulls: Array<{ key: string; label: string; reasonBasic: string; reasonAdvanced: string }> = [];

//   for (const m of METRIC_REGISTRY) {
//     if (m.chains && !m.chains.includes(chain)) continue;

//     const tier = getMetricTier(chain, m.key);
//     const item = { key: m.key, label: m.label };

//     if (tier === "primary") primary.push(item);
//     else if (tier === "secondary") secondary.push(item);
//     else if (tier === "exploratory") exploratory.push(item);

//     const r = m.expectedNulls?.[chain];
//     if (r) {
//       expectedNulls.push({
//         key: m.key,
//         label: m.label,
//         reasonBasic: r.basic,
//         reasonAdvanced: r.advanced,
//       });
//     }
//   }

//   return { primary, secondary, exploratory, expectedNulls };
// }

// /**
//  * Options for dropdown, with chain-specific filtering and ordering.
//  *
//  * - In Basic: hide NA metrics (tier === "na")
//  * - In Advanced: include NA metrics (but still filtered by availableKeys if provided)
//  * - Ordering: primary -> secondary -> exploratory -> (extras from availableKeys not in registry)
//  */
// export function getMetricOptionsForChain(
//   chain: ChainId,
//   opts?: { availableKeys?: string[]; includeNA?: boolean }
// ): Array<{ key: string; label: string; tier: MetricTier }> {
//   const available = opts?.availableKeys ? new Set(opts.availableKeys) : null;
//   const includeNA = Boolean(opts?.includeNA);

//   const reg = METRIC_REGISTRY
//     .filter((m) => (!m.chains || m.chains.includes(chain)))
//     .map((m) => {
//       const tier = getMetricTier(chain, m.key);
//       return { key: m.key, label: m.label, tier };
//     })
//     .filter((m) => includeNA || m.tier !== "na");

//   const regFiltered = available ? reg.filter((m) => available.has(m.key)) : reg;

//   // Order by tier then label
//   const tierRank: Record<MetricTier, number> = { primary: 0, secondary: 1, exploratory: 2, na: 3 };
//   regFiltered.sort((a, b) => {
//     const ra = tierRank[a.tier] ?? 9;
//     const rb = tierRank[b.tier] ?? 9;
//     if (ra !== rb) return ra - rb;
//     return a.label.localeCompare(b.label);
//   });

//   // Extras: any available key not in registry
//   if (available) {
//     const regKeys = new Set(regFiltered.map((x) => x.key));
//     const extras: Array<{ key: string; label: string; tier: MetricTier }> = [];
//     for (const k of available) {
//       if (!regKeys.has(k)) {
//         // Unknown keys: exploratory
//         extras.push({ key: k, label: getMetricLabel(k), tier: "exploratory" });
//       }
//     }
//     extras.sort((a, b) => a.label.localeCompare(b.label));
//     return [...regFiltered, ...extras];
//   }

//   return regFiltered;
// }


import type { ChainId } from "@/lib/types";
import { getMetricTier, pickDefaultBaseMetricKey } from "@/lib/registry/chainSemantics";

export type ExplainLevel = "basic" | "advanced";

export type MetricRegistryEntry = {
  /** Must match a key in derived/<chain>/<date>.json.metrics OR gold/<chain>/<date>.json keys (when used as daily source) */
  key: string;
  label: string;
  unit?: string;
  chains?: ChainId[];
  description?: {
    basic: string;
    advanced: string;
  };
};

export const METRIC_REGISTRY: MetricRegistryEntry[] = [
  {
    key: "tx_count_daily__ma7",
    label: "Transactions (7d MA)",
    unit: "count",
    description: {
      basic: "Smoothed daily count of confirmed transactions (7-day moving average).",
      advanced:
        "Daily transaction count smoothed by a 7-day moving average computed in the pipeline. " +
        "Use as a demand/activity proxy; interpret in the context of coverage/confidence and chain-specific lag.",
    },
  },
  {
    key: "tx_count_daily__ma30",
    label: "Transactions (30d MA)",
    unit: "count",
    description: {
      basic: "Longer-smoothed daily count of confirmed transactions (30-day moving average).",
      advanced:
        "Daily transaction count smoothed by a 30-day moving average computed in the pipeline. " +
        "Useful for regime context (e.g., MA7 vs MA30).",
    },
  },
  {
    key: "median_tx_fee_native__ma7",
    label: "Median fee (native, 7d MA)",
    unit: "native",
    description: {
      basic: "Typical transaction fee level, smoothed over 7 days (native units).",
      advanced:
        "Median per-transaction fee in native units smoothed by a 7-day moving average. " +
        "Median reduces sensitivity to outliers and spam bursts.",
    },
  },
  {
    key: "median_tx_fee_native__ma30",
    label: "Median fee (native, 30d MA)",
    unit: "native",
    description: {
      basic: "Typical transaction fee level, smoothed over 30 days (native units).",
      advanced:
        "Median per-transaction fee in native units smoothed by a 30-day moving average. " +
        "Highlights persistent friction regimes rather than short transients.",
    },
  },
  {
    key: "value_transferred_native__ma7",
    label: "Value transferred (native, 7d MA)",
    unit: "native",
    description: {
      basic: "Smoothed daily total value transferred on-chain (native units).",
      advanced:
        "Daily total value transferred in native units smoothed by a 7-day moving average. " +
        "Interpret carefully across chains: economic meaning differs by design and usage.",
    },
  },
  {
    key: "value_transferred_native__ma30",
    label: "Value transferred (native, 30d MA)",
    unit: "native",
    description: {
      basic: "Longer-smoothed daily total value transferred on-chain (native units).",
      advanced:
        "Daily total value transferred in native units smoothed by a 30-day moving average. " +
        "Better for regime context than for short-term changes.",
    },
  },
  {
    key: "avg_block_time_sec",
    label: "Avg block time (sec, daily)",
    unit: "seconds",
    description: {
      basic: "Average time between blocks, measured in seconds (daily).",
      advanced:
        "Mean inter-block time in seconds for the day (raw daily). " +
        "Often appears as canonical daily in gold; MA smoothing typically appears in derived.",
    },
  },
  {
    key: "avg_block_time_sec__ma7",
    label: "Avg block time (sec, 7d MA)",
    unit: "seconds",
    description: {
      basic: "Smoothed average time between blocks (7-day moving average).",
      advanced:
        "Average block time in seconds smoothed by a 7-day moving average. " +
        "Interpretation is chain-specific; can reflect operational/protocol conditions.",
    },
  },
  {
    key: "avg_block_time_sec__ma30",
    label: "Avg block time (sec, 30d MA)",
    unit: "seconds",
    description: {
      basic: "Longer-smoothed average time between blocks (30-day moving average).",
      advanced:
        "Average block time in seconds smoothed by a 30-day moving average. " +
        "Highlights persistent shifts rather than transients.",
    },
  },
];

function humanizeMetricKey(key: string): string {
  const parts = key.split("__");
  const base = parts[0] ?? key;

  let suffix = "";
  const maybeMA = parts[1] ?? "";
  const maMatch = maybeMA.match(/^ma(\d+)$/i);
  if (maMatch) suffix = ` (${maMatch[1]}d MA)`;

  const words = base
    .split("_")
    .filter(Boolean)
    .map((w) => {
      if (w === "tx") return "tx";
      if (w === "sec") return "sec";
      if (w === "usd") return "usd";
      if (w === "eth") return "eth";
      if (w === "btc") return "btc";
      return w;
    });

  const label =
    (words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : base) +
    (words.length > 1 ? " " + words.slice(1).join(" ") : "");

  return label + suffix;
}

export function getMetricLabel(key: string): string {
  const m = METRIC_REGISTRY.find((x) => x.key === key);
  return m?.label ?? humanizeMetricKey(key);
}

export function getMetricDescription(key: string, level: ExplainLevel): string | null {
  const m = METRIC_REGISTRY.find((x) => x.key === key);
  if (!m?.description) return null;
  return level === "advanced" ? m.description.advanced : m.description.basic;
}

/** Extract baseKey (strip __ma7/__ma30). */
export function getBaseMetricKey(key: string): string {
  return (key.split("__")[0] ?? key).trim();
}

export function getMetricOptionsForChain(
  chain: ChainId,
  opts?: { availableKeys?: string[] }
): Array<{ key: string; label: string; baseKey: string; tier: "primary" | "secondary" | "other" }> {
  const available = opts?.availableKeys ? new Set(opts.availableKeys) : null;

  // Start with curated registry entries
  const reg = METRIC_REGISTRY
    .filter((m) => !m.chains || m.chains.includes(chain))
    .map((m) => {
      const baseKey = getBaseMetricKey(m.key);
      return { key: m.key, label: m.label, baseKey, tier: getMetricTier(chain, baseKey) as any };
    });

  const regFiltered = available ? reg.filter((m) => available.has(m.key)) : reg;

  // Add extras (present in data but missing in registry)
  const out: Array<{ key: string; label: string; baseKey: string; tier: "primary" | "secondary" | "other" }> = [...regFiltered];

  if (available) {
    const regKeys = new Set(regFiltered.map((x) => x.key));
    for (const k of available) {
      if (!regKeys.has(k)) {
        const baseKey = getBaseMetricKey(k);
        out.push({ key: k, label: getMetricLabel(k), baseKey, tier: getMetricTier(chain, baseKey) });
      }
    }
  }

  // Sort: primary → secondary → other, then label
  const tierRank: Record<string, number> = { primary: 0, secondary: 1, other: 2 };
  out.sort((a, b) => {
    const ta = tierRank[a.tier] ?? 9;
    const tb = tierRank[b.tier] ?? 9;
    if (ta !== tb) return ta - tb;
    return a.label.localeCompare(b.label);
  });

  return out;
}

/**
 * Choose a default metric key for a chain.
 * Returns an actual key that should exist in availableKeys (prefers daily/base; otherwise MA variants).
 */
export function pickDefaultMetricKeyForChain(chain: ChainId, availableKeys?: string[] | null): string {
  const set = availableKeys ? new Set(availableKeys) : null;
  const base = pickDefaultBaseMetricKey(chain, set);

  if (!set || set.size === 0) return base;

  // Prefer raw daily/base if present, else MA7 then MA30
  if (set.has(base)) return base;
  if (set.has(`${base}__ma7`)) return `${base}__ma7`;
  if (set.has(`${base}__ma30`)) return `${base}__ma30`;

  // fallback to first available
  return Array.from(set)[0] ?? base;
}
