// web-v1/src/catalog/decisions/productDecisions.ts
// Single source of truth for what is allowed to exist in the product UI.
//
// Rules:
// - If a metric is not declared here, it does not exist in the product.
// - Scope is chain-specific. Never assume cross-chain comparability.
// - Rationale is mandatory and human-written.
// - This file is reviewed like a contract.

export type Chain = "bitcoin" | "ethereum" | "arbitrum" | "base";
export type Genre = "gold" | "derived" | "meta";

export type DecisionStatus = "core" | "secondary" | "hidden" | "experimental";

export type Scope =
  | "all"
  | Chain[]
  | Partial<Record<Chain, DecisionStatus>>; // for per-chain overrides

export type MetricDecision = {
  metric_id: string;
  genre: Genre;

  status: DecisionStatus | Partial<Record<Chain, DecisionStatus>>;
  scope: "all" | Chain[]; // where the metric is allowed to be surfaced in-product

  // Mandatory: short, explicit, non-advisory, non-price language.
  rationale: string;

  // Optional: implementation guards the UI must respect.
  ui_rules?: {
    // If true, only show in Advanced mode.
    advanced_only?: boolean;

    // If true, never allow standalone “Notables” from this metric.
    never_standalone_notables?: boolean;

    // If true, landing/overview must not surface it.
    exclude_from_landing?: boolean;

    // If set, require these companion metrics to be visible alongside when shown.
    requires_companions?: string[];
  };

  // Optional: risk flags used by internal catalog warnings (not user-facing copy).
  risk_flags?: {
    chain_semantic_risk?: boolean;
    price_proxy_risk?: "low" | "moderate" | "high";
    misinterpretation_risk?: "low" | "moderate" | "high" | "very_high";
  };
};

export const PRODUCT_DECISIONS: Record<string, MetricDecision> = {
  // -------------------------
  // Activity (Gold)
  // -------------------------
  tx_count_daily: {
    metric_id: "tx_count_daily",
    genre: "gold",
    status: "core",
    scope: "all",
    rationale:
      "Baseline activity indicator used as context for nearly all other on-chain metrics. Interpreted relative to each chain’s own history.",
    ui_rules: {
      exclude_from_landing: false,
      advanced_only: false,
      never_standalone_notables: false,
    },
    risk_flags: {
      chain_semantic_risk: true, // L2 tx-count inflation risk exists; handled via context elsewhere
      misinterpretation_risk: "moderate",
    },
  },

  unique_active_addresses: {
    metric_id: "unique_active_addresses",
    genre: "gold",
    // status is effectively secondary on BTC/ETH and hidden on L2; encode via scope+status per chain.
    status: {
      bitcoin: "secondary",
      ethereum: "secondary",
      arbitrum: "hidden",
      base: "hidden",
    },
    scope: ["bitcoin", "ethereum"],
    rationale:
      "Address counts do not equal users and can be inflated by automation. On L2 networks the inflation is systematic, so this metric is withheld from the product signal layer there.",
    ui_rules: {
      advanced_only: true,
      exclude_from_landing: true,
      never_standalone_notables: true,
      requires_companions: ["tx_count_daily"],
    },
    risk_flags: {
      chain_semantic_risk: true,
      misinterpretation_risk: "very_high",
    },
  },

  // -------------------------
  // Friction (Gold)
  // -------------------------
  median_tx_fee_native: {
    metric_id: "median_tx_fee_native",
    genre: "gold",
    status: "core",
    scope: "all",
    rationale:
      "Primary friction indicator shown strictly in native units and interpreted relative to each chain’s own history. Median is used for robustness under heavy tails.",
    ui_rules: {
      exclude_from_landing: false,
      advanced_only: false,
      never_standalone_notables: false,
    },
    risk_flags: {
      price_proxy_risk: "moderate",
      misinterpretation_risk: "moderate",
    },
  },

  failed_tx_rate: {
    metric_id: "failed_tx_rate",
    genre: "gold",
    status: {
      bitcoin: "hidden",
      ethereum: "secondary",
      arbitrum: "secondary",
      base: "secondary",
    },
    scope: ["ethereum", "arbitrum", "base"],
    rationale:
      "Reflects contract interaction friction and competition intensity on EVM chains. It is not a network-stability metric and is excluded from Bitcoin and from standalone interpretation.",
    ui_rules: {
      advanced_only: true,
      exclude_from_landing: true,
      never_standalone_notables: true,
      requires_companions: ["tx_count_daily", "median_tx_fee_native"],
    },
    risk_flags: {
      chain_semantic_risk: true,
      misinterpretation_risk: "very_high",
    },
  },

  // -------------------------
  // Capacity (Gold)
  // -------------------------
  gas_utilization_pct: {
    metric_id: "gas_utilization_pct",
    genre: "gold",
    status: {
      bitcoin: "hidden",
      ethereum: "core",
      arbitrum: "secondary",
      base: "secondary",
    },
    scope: ["ethereum", "arbitrum", "base"],
    rationale:
      "Direct capacity utilization signal on Ethereum. On L2 networks, utilization can reflect operational parameters and is therefore treated as secondary context rather than primary signal.",
    ui_rules: {
      exclude_from_landing: false, // allowed on ETH landing only (landing logic should respect per-chain status)
      advanced_only: false, // ETH can show in Basic; L2 can optionally gate to Advanced in UI layer if desired
      never_standalone_notables: false, // but notables should prefer persistence rules (handled pipeline/derived-side)
      requires_companions: ["tx_count_daily", "median_tx_fee_native"],
    },
    risk_flags: {
      chain_semantic_risk: true,
      misinterpretation_risk: "high",
    },
  },

    avg_block_time_sec: {
    metric_id: "avg_block_time_sec",
    genre: "gold",
    status: {
      bitcoin: "hidden",
      ethereum: "hidden",
      arbitrum: "hidden",
      base: "hidden",
    },
    scope: [],
    rationale:
      "Operational/protocol-level timing metric. Easy to misread as a performance or health statement. Kept for internal diagnostics only, not a product signal.",
    ui_rules: {
      advanced_only: true,
      exclude_from_landing: true,
      never_standalone_notables: true,
    },
    risk_flags: {
      chain_semantic_risk: true,
      misinterpretation_risk: "high",
    },
  },

  block_count_daily: {
    metric_id: "block_count_daily",
    genre: "gold",
    status: {
      bitcoin: "secondary",
      ethereum: "secondary",
      arbitrum: "hidden",
      base: "hidden",
    },
    scope: ["bitcoin", "ethereum"],
    rationale:
      "Context metric for L1 chain operation (how many blocks were produced). Not an activity metric and not comparable across chains; withheld on L2 where the concept is less meaningful.",
    ui_rules: {
      advanced_only: true,
      exclude_from_landing: true,
      never_standalone_notables: true,
      requires_companions: ["tx_count_daily"],
    },
    risk_flags: {
      chain_semantic_risk: true,
      misinterpretation_risk: "high",
    },
  },

  median_tx_value_native: {
    metric_id: "median_tx_value_native",
    genre: "gold",
    status: {
      bitcoin: "secondary",
      ethereum: "secondary",
      arbitrum: "hidden",
      base: "hidden",
    },
    scope: ["bitcoin", "ethereum"],
    rationale:
      "Context for settlement characteristics on L1 (typical transfer size in native units). High misinterpretation and price-proxy risk; withheld on L2 where internal transfers can dominate.",
    ui_rules: {
      advanced_only: true,
      exclude_from_landing: true,
      never_standalone_notables: true,
      requires_companions: ["tx_count_daily"],
    },
    risk_flags: {
      chain_semantic_risk: true,
      price_proxy_risk: "high",
      misinterpretation_risk: "very_high",
    },
  },


  // -------------------------
  // Settlement volume (Gold)
  // -------------------------
  value_transferred_native: {
    metric_id: "value_transferred_native",
    genre: "gold",
    status: {
      bitcoin: "secondary",
      ethereum: "secondary",
      arbitrum: "hidden",
      base: "hidden",
    },
    scope: ["bitcoin", "ethereum"],
    rationale:
      "Gross settlement volume in native units. Useful as contextual signal on L1 networks when interpreted relative to each chain’s history, but systematically misleading on L2 due to internal transfers.",
    ui_rules: {
      advanced_only: true,
      exclude_from_landing: true,
      never_standalone_notables: true,
      requires_companions: ["tx_count_daily"],
    },
    risk_flags: {
      price_proxy_risk: "high",
      misinterpretation_risk: "high",
      chain_semantic_risk: true,
    },
  },
} as const;

// Convenience helpers for internal tooling (optional use in /internal/catalog).
export const CHAINS: Chain[] = ["bitcoin", "ethereum", "arbitrum", "base"];

export function decisionStatusForChain(
  metricId: string,
  chain: Chain
): DecisionStatus | null {
  const d = PRODUCT_DECISIONS[metricId];
  if (!d) return null;

  if (typeof d.status === "string") {
    // status applies globally but scope may still restrict visibility
    if (d.scope === "all") return d.status;
    return d.scope.includes(chain) ? d.status : "hidden";
  }

  // per-chain status map
  return d.status[chain] ?? "hidden";
}

export function isAllowedInProduct(metricId: string, chain: Chain): boolean {
  const d = PRODUCT_DECISIONS[metricId];
  if (!d) return false;

  if (d.scope === "all") return decisionStatusForChain(metricId, chain) !== "hidden";
  return d.scope.includes(chain) && decisionStatusForChain(metricId, chain) !== "hidden";
}
