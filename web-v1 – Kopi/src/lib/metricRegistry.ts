// src/lib/metricRegistry.ts
// Chain-aware metric registry (UI & methodology metadata)
// - No prices / no forecasting / no normative language
// - Designed for maintainability: one place to control what appears per chain.

export type Chain = "bitcoin" | "ethereum" | "arbitrum" | "base";
export type Genre = "meta" | "gold" | "derived";

// Keep units simple; rendering can map these to formatting.
export type Unit =
  | "count"
  | "pct" // 0..1 fraction or 0..100? (we treat as fraction unless explicitly stated)
  | "sec"
  | "native" // chain native unit (BTC/ETH etc)
  | "unknown";

export type MetricKey = string;

export type MetricDefinition = {
  key: MetricKey;

  // Default display properties (may be overridden per-chain)
  title: string;
  unit: Unit;

  // How to format values in UI (not analytics). Keep minimal.
  format?: {
    decimals?: number; // default 0 for count, 2 for pct, 2 for native, 2 for sec
    // If pct is stored as fraction (0..1), set pctIsFraction = true (default).
    pctIsFraction?: boolean;
  };

  // Descriptive explanations used across the site (Basic/Advanced).
  // These are product copy inputs; keep them neutral.
  explain: {
    basic: string;
    advanced: string;
  };

  // Common data pitfalls (e.g., missingness, chain-specific quirks).
  caveats?: string[];

  // Optional grouping/tagging for UI organization.
  tags?: string[];
};

export type ChainMetricOverride = {
  // Override title/unit/format for a given chain if needed.
  title?: string;
  unit?: Unit;
  format?: MetricDefinition["format"];

  // Chain-specific explanations (optional override/additions)
  explain?: Partial<MetricDefinition["explain"]>;

  // If a metric exists but should not be surfaced for this chain, set hidden.
  hidden?: boolean;

  // Optional note for chain-specific interpretation.
  note?: string;
};

export type ChainProfile = {
  chain: Chain;
  label: string; // short label: BTC, ETH L1, Base L2, Arbitrum L2
  kind: "L1" | "L2";

  // Default window and default metric for first render.
  defaults: {
    windowDays: 7 | 30 | 90 | 180 | 365;
    metricKey: MetricKey;
  };

  // “Market-facing” primary metrics (ordered).
  primaryMetrics: MetricKey[];

  // Additional metrics (ordered); may be used in “More metrics” dropdowns.
  secondaryMetrics: MetricKey[];

  // Chain-specific interpretation context (neutral).
  interpretation: {
    basic: string;
    advanced: string;
  };

  // Per-chain overrides for titles/units/explanations.
  overrides?: Record<MetricKey, ChainMetricOverride>;
};

// ---------------------------
// Metric catalog (global)
// ---------------------------

export const METRICS: Record<MetricKey, MetricDefinition> = {
  unique_active_addresses: {
    key: "unique_active_addresses",
    title: "Unique active addresses",
    unit: "count",
    format: { decimals: 0 },
    explain: {
      basic:
        "Counts distinct addresses observed as active in the day. Useful as a broad activity proxy when interpreted with coverage and chain-specific context.",
      advanced:
        "Distinct-address count as emitted by the pipeline for a given day. Sensitivity depends on address reuse patterns, account abstraction, and how activity is defined upstream. Should be interpreted alongside transaction counts and any known sampling/coverage flags.",
    },
    caveats: [
      "Address reuse and account models differ across chains.",
      "May be affected by airdrops, batching, relayers, or contract-based activity patterns.",
    ],
    tags: ["activity"],
  },

  tx_count_daily: {
    key: "tx_count_daily",
    title: "Transactions per day",
    unit: "count",
    format: { decimals: 0 },
    explain: {
      basic:
        "Total number of transactions observed for the day. A direct activity measure that complements active addresses.",
      advanced:
        "Daily transaction count as defined by the pipeline for the chain. Interpretation differs between account models and L2 architectures. Consider periods of degraded data availability or changes in upstream indexing.",
    },
    caveats: ["Transaction definitions can vary between chains and tooling."],
    tags: ["activity"],
  },

  block_count_daily: {
    key: "block_count_daily",
    title: "Blocks per day",
    unit: "count",
    format: { decimals: 0 },
    explain: {
      basic:
        "Number of blocks produced in the day. Can reflect uptime and block production cadence.",
      advanced:
        "Daily block count derived from chain data. Useful for validating expected block cadence; should be interpreted with chain-specific block time characteristics.",
    },
    caveats: ["Reorg handling and indexing coverage can affect counts."],
    tags: ["protocol"],
  },

  avg_block_time_sec: {
    key: "avg_block_time_sec",
    title: "Average block time",
    unit: "sec",
    format: { decimals: 2 },
    explain: {
      basic:
        "Average time between blocks for the day. Helps contextualize throughput and cadence.",
      advanced:
        "Mean inter-block time for the day. Distribution can be skewed by outliers; compare with block counts and known protocol changes.",
    },
    caveats: ["Averages can hide bursty variance."],
    tags: ["protocol"],
  },

  gas_utilization_pct: {
    key: "gas_utilization_pct",
    title: "Gas utilization",
    unit: "pct",
    format: { decimals: 2, pctIsFraction: true },
    explain: {
      basic:
        "Share of available block capacity that was used during the day (as defined by the chain’s gas model).",
      advanced:
        "Utilization computed relative to the chain’s effective capacity proxy used by the pipeline. For EVM chains, interpret with fee metrics and throughput constraints. Stored as a fraction (0–1) unless otherwise stated.",
    },
    caveats: [
      "Capacity proxies can differ by chain and by pipeline version.",
      "High utilization can coincide with fee market changes but does not imply causality.",
    ],
    tags: ["fees", "capacity"],
  },

  failed_tx_rate: {
    key: "failed_tx_rate",
    title: "Failed transaction rate",
    unit: "pct",
    format: { decimals: 3, pctIsFraction: true },
    explain: {
      basic:
        "Fraction of transactions that failed in the day (as defined by the pipeline). Useful for spotting abnormal execution patterns or degraded UX periods.",
      advanced:
        "Failure-rate definition depends on how the pipeline classifies failures per chain (reverts, out-of-gas, etc.). Stored as a fraction (0–1). Validate against known protocol or client incidents.",
    },
    caveats: [
      "Failure semantics can vary between chains and tooling.",
      "Periods of partial indexing can distort rates.",
    ],
    tags: ["quality", "ux"],
  },

  median_tx_fee_native: {
    key: "median_tx_fee_native",
    title: "Median transaction fee (native)",
    unit: "native",
    format: { decimals: 6 },
    explain: {
      basic:
        "Median transaction fee paid in the chain’s native unit for the day. Helps track fee regime changes without using prices.",
      advanced:
        "Median of per-transaction fees in native units. Median reduces sensitivity to fee outliers. Interpret alongside utilization and transaction counts.",
    },
    caveats: [
      "Fee accounting differs across L1/L2.",
      "Native-unit comparisons across chains are not meaningful without conversion (not provided by design).",
    ],
    tags: ["fees"],
  },

  median_tx_value_native: {
    key: "median_tx_value_native",
    title: "Median transaction value (native)",
    unit: "native",
    format: { decimals: 6 },
    explain: {
      basic:
        "Median value transferred per transaction in native units for the day. A distribution proxy, not a total.",
      advanced:
        "Median of per-transaction transferred value in native units. Sensitive to chain-specific transfer semantics, batching, and contract interactions.",
    },
    caveats: [
      "May not represent economic value for contract-heavy chains.",
      "Native units are chain-specific and not comparable across chains.",
    ],
    tags: ["value"],
  },

  value_transferred_native: {
    key: "value_transferred_native",
    title: "Value transferred (native)",
    unit: "native",
    format: { decimals: 6 },
    explain: {
      basic:
        "Total value transferred in the chain’s native unit for the day, as defined by the pipeline. Useful as a coarse activity/value proxy.",
      advanced:
        "Aggregate transferred value computed by the pipeline. Definitions may exclude certain transfer types (e.g., internal calls) depending on chain and methodology version.",
    },
    caveats: [
      "Transfer definitions differ across chains and pipeline versions.",
      "Native units are not comparable across chains without conversion (not provided).",
    ],
    tags: ["value"],
  },
};

// ---------------------------
// Chain profiles (UI defaults & context)
// ---------------------------

export const CHAINS: Record<Chain, ChainProfile> = {
  bitcoin: {
    chain: "bitcoin",
    label: "BTC",
    kind: "L1",
    defaults: {
      windowDays: 365,
      metricKey: "tx_count_daily",
    },
    primaryMetrics: [
      "tx_count_daily",
      "block_count_daily",
      "avg_block_time_sec",
      "value_transferred_native",
      "median_tx_value_native",
    ],
    secondaryMetrics: [
      "unique_active_addresses",
      "failed_tx_rate",
      "median_tx_fee_native",
      "gas_utilization_pct",
    ],
    interpretation: {
      basic:
        "Bitcoin’s on-chain activity is most often interpreted through transaction counts, block production cadence, and transfer aggregates. Some EVM-centric metrics may be absent or not meaningful.",
      advanced:
        "BTC metrics often reflect UTXO behavior and batching patterns. Address-based activity can be especially sensitive to wallet batching and consolidation. Interpret value-transfer aggregates with awareness of UTXO change outputs and pipeline-specific transfer definitions.",
    },
    overrides: {
      gas_utilization_pct: {
        hidden: true,
        note: "Not applicable for Bitcoin’s non-EVM gas model in this product.",
      },
      failed_tx_rate: {
        hidden: true,
        note: "Not applicable / not consistently available for Bitcoin in this product.",
      },

      median_tx_fee_native: {
        title: "Median fee (BTC)",
        format: { decimals: 8 },
      },
      value_transferred_native: {
        title: "Value transferred (BTC)",
        format: { decimals: 8 },
      },
      median_tx_value_native: {
        title: "Median tx value (BTC)",
        format: { decimals: 8 },
      },
    },
  },

  ethereum: {
    chain: "ethereum",
    label: "ETH L1",
    kind: "L1",
    defaults: {
      windowDays: 365,
      metricKey: "unique_active_addresses",
    },
    primaryMetrics: [
      "unique_active_addresses",
      "tx_count_daily",
      "gas_utilization_pct",
      "median_tx_fee_native",
      "value_transferred_native",
    ],
    secondaryMetrics: ["avg_block_time_sec", "block_count_daily", "failed_tx_rate", "median_tx_value_native"],
    interpretation: {
      basic:
        "Ethereum L1 is typically interpreted via usage (addresses/transactions), capacity pressure (utilization), and fee regime in native units.",
      advanced:
        "EVM fee markets and capacity constraints are central for ETH L1 interpretation. Utilization and fee distributions are often more informative than totals. Value-transfer aggregates can be influenced by contract interactions; interpret alongside transaction composition.",
    },
    overrides: {
      median_tx_fee_native: {
        title: "Median fee (ETH)",
        format: { decimals: 6 },
      },
      value_transferred_native: {
        title: "Value transferred (ETH)",
        format: { decimals: 6 },
      },
    },
  },

  arbitrum: {
    chain: "arbitrum",
    label: "Arbitrum L2",
    kind: "L2",
    defaults: {
      windowDays: 365,
      metricKey: "tx_count_daily",
    },
    primaryMetrics: [
      "tx_count_daily",
      "unique_active_addresses",
      "failed_tx_rate",
      "median_tx_fee_native",
      "value_transferred_native",
    ],
    secondaryMetrics: ["avg_block_time_sec", "block_count_daily", "gas_utilization_pct", "median_tx_value_native"],
    interpretation: {
      basic:
        "For L2s, usage and reliability metrics are usually prioritized: transactions, active addresses, and failure behavior. Fees are interpreted in native units without price conversion.",
      advanced:
        "L2 semantics and execution environment differ from L1; definitions of fees, blocks, and capacity proxies are chain-specific. Interpret series with attention to upstream pipeline versioning and any L2-specific data availability notes.",
    },
    overrides: {
      gas_utilization_pct: {
        note: "May reflect a pipeline capacity proxy; interpret as chain-specific utilization signal rather than a universal percentage.",
      },
    },
  },

  base: {
    chain: "base",
    label: "Base L2",
    kind: "L2",
    defaults: {
      windowDays: 365,
      metricKey: "tx_count_daily",
    },
    primaryMetrics: [
      "tx_count_daily",
      "unique_active_addresses",
      "failed_tx_rate",
      "median_tx_fee_native",
      "value_transferred_native",
    ],
    secondaryMetrics: ["avg_block_time_sec", "block_count_daily", "gas_utilization_pct", "median_tx_value_native"],
    interpretation: {
      basic:
        "For Base (L2), activity and execution quality metrics are typically the first lens: transactions, active addresses, and failure rate, with fees in native units as additional context.",
      advanced:
        "L2 metrics require chain-specific interpretation due to differences in batching, sequencing, and fee accounting. Capacity/utilization is based on the pipeline’s proxy and should be treated as a chain-scoped signal.",
    },
    overrides: {
      gas_utilization_pct: {
        note: "May reflect a pipeline capacity proxy; interpret as chain-specific utilization signal rather than a universal percentage.",
      },
    },
  },
};

// ---------------------------
// Helpers
// ---------------------------

export function getChainProfile(chain: Chain): ChainProfile {
  return CHAINS[chain];
}

export function getMetricDef(key: MetricKey): MetricDefinition | undefined {
  return METRICS[key];
}

export function isMetricHiddenForChain(chain: Chain, key: MetricKey): boolean {
  const p = CHAINS[chain];
  const ov = p.overrides?.[key];
  return Boolean(ov?.hidden);
}

export function metricTitleForChain(chain: Chain, key: MetricKey): string {
  const def = METRICS[key];
  const p = CHAINS[chain];
  const ov = p.overrides?.[key];
  return ov?.title ?? def?.title ?? key;
}

export function metricUnitForChain(chain: Chain, key: MetricKey): Unit {
  const def = METRICS[key];
  const p = CHAINS[chain];
  const ov = p.overrides?.[key];
  return ov?.unit ?? def?.unit ?? "unknown";
}

export function metricFormatForChain(chain: Chain, key: MetricKey): MetricDefinition["format"] | undefined {
  const def = METRICS[key];
  const p = CHAINS[chain];
  const ov = p.overrides?.[key];
  return ov?.format ?? def?.format;
}

export function metricExplainForChain(chain: Chain, key: MetricKey): MetricDefinition["explain"] | null {
  const def = METRICS[key];
  if (!def) return null;
  const p = CHAINS[chain];
  const ov = p.overrides?.[key];
  return {
    basic: ov?.explain?.basic ?? def.explain.basic,
    advanced: ov?.explain?.advanced ?? def.explain.advanced,
  };
}

/**
 * Given the actual keys present in data, return the chain-tailored ordering for dropdowns.
 * - Starts with primary metrics (that exist)
 * - then secondary metrics (that exist)
 * - then the rest (alphabetical)
 * - excluding hidden metrics for the chain
 */
export function orderedMetricKeysForChain(chain: Chain, keysInData: MetricKey[]): MetricKey[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const p = CHAINS[chain];

  const add = (k: string) => {
    if (!k) return;
    if (seen.has(k)) return;
    if (!keysInData.includes(k)) return;
    if (isMetricHiddenForChain(chain, k)) return;
    seen.add(k);
    out.push(k);
  };

  p.primaryMetrics.forEach(add);
  p.secondaryMetrics.forEach(add);

  const rest = keysInData
    .filter((k) => !seen.has(k))
    .filter((k) => !isMetricHiddenForChain(chain, k))
    .slice()
    .sort((a, b) => a.localeCompare(b));

  rest.forEach(add);
  return out;
}
