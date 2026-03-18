// src/config/chains.ts

export type ChainId = "bitcoin" | "ethereum" | "arbitrum" | "base";

export type ChainConfig = {
  /**
   * Canonical chain id used in routes and published JSON paths:
   * /public/data/published/v1/<genre>/<chain>/...
   */
  id: ChainId;

  /**
   * Short label used in UI.
   */
  label: string;

  /**
   * Long display name for headers (UI-only, descriptive).
   */
  name: string;

  /**
   * Small icon token for headers (UI-only, descriptive).
   * Keep this stable/deterministic (no external assets required).
   */
  icon: string;

  /**
   * One-line descriptive subtitle to display under the chain title.
   * Must remain descriptive (no advisory language).
   */
  subtitle: string;

  /**
   * LOCKED RULE (governance):
   * Metrics listed here MUST NOT be rendered in the UI for this chain.
   * Not even as "N/A" placeholders. They are intentionally hidden.
   *
   * Source of truth for which metrics are hidden by chain type lives in:
   * pipe/api/main.py -> PROFILE_BY_TYPE[*].hidden_metrics
   *
   * This file mirrors that rule at the web layer (normative list).
   */
  hiddenMetrics: string[];

  /**
   * Optional descriptive note shown in UI (if you choose to render it),
   * but must remain descriptive (no advisory language).
   */
  note?: string;
};

/**
 * Normative chain registry (web/config/chains.ts as per governance doc).
 * Keep this deterministic and explicit.
 */
export const CHAINS: Record<ChainId, ChainConfig> = {
  bitcoin: {
    id: "bitcoin",
    label: "BTC",
    name: "Bitcoin",
    icon: "₿",
    subtitle: "L1 UTXO network. Fees and throughput are governed by block space and confirmation dynamics.",
    // Mirrors PROFILE_BY_TYPE["btc"].hidden_metrics
    hiddenMetrics: [
      "gas_utilization_pct",
      "failed_tx_rate",
      "avg_gas_per_tx",
      "median_gas_price",
      "l2_burst_index",
    ],
    note: "BTC does not have EVM gas utilisation / failed-tx semantics; some EVM-style metrics are intentionally hidden.",
  },

  ethereum: {
    id: "ethereum",
    label: "ETH",
    name: "Ethereum",
    icon: "Ξ",
    subtitle: "EVM L1. Gas pricing and capacity reflect blockspace demand and execution constraints.",
    // Mirrors PROFILE_BY_TYPE["eth_l1"].hidden_metrics
    hiddenMetrics: [],
  },

  arbitrum: {
    id: "arbitrum",
    label: "ARB",
    name: "Arbitrum",
    icon: "A",
    subtitle: "EVM L2. Execution and fees depend on rollup mechanics and L1 settlement conditions.",
    // Mirrors PROFILE_BY_TYPE["l2"].hidden_metrics
    hiddenMetrics: ["gas_utilization_pct", "failed_tx_rate"],
    note: "L2s use different fee/capacity mechanics; selected L1-only metrics are intentionally hidden.",
  },

  base: {
    id: "base",
    label: "BASE",
    name: "Base",
    icon: "B",
    subtitle: "EVM L2. Activity and fees reflect rollup execution plus L1 data availability and settlement.",
    // Mirrors PROFILE_BY_TYPE["l2"].hidden_metrics
    hiddenMetrics: ["gas_utilization_pct", "failed_tx_rate"],
    note: "L2s use different fee/capacity mechanics; selected L1-only metrics are intentionally hidden.",
  },
};

export const CHAIN_LIST: ChainConfig[] = [
  CHAINS.bitcoin,
  CHAINS.ethereum,
  CHAINS.arbitrum,
  CHAINS.base,
];

/**
 * Convenience helpers (optional to use).
 */
export function getChainConfig(chain: string): ChainConfig | null {
  const key = String(chain) as ChainId;
  return key in CHAINS ? CHAINS[key] : null;
}

export function isHiddenMetric(chain: ChainId, metric: string): boolean {
  return CHAINS[chain].hiddenMetrics.includes(metric);
}