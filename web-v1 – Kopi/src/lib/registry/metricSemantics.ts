import type { ChainId } from "@/lib/types";

/**
 * High-level roles used across meta/scorecard/gold.
 */
export type MetricRole = "demand" | "friction" | "capacity";

/**
 * Visibility / importance per chain.
 * - primary: headline metrics (default charts, landing cards)
 * - secondary: contextual metrics (shown, but not headline)
 * - hidden: not shown in Basic; Advanced-only or diagnostics
 */
export type Importance = "primary" | "secondary" | "hidden";

/**
 * Null semantics per chain.
 * - expected: structural NA (by design; explain why)
 * - missing: should exist, but coverage/pipeline gap
 * - valid: zero/null is a meaningful value
 */
export type NullKind = "expected" | "missing" | "valid";

export type NullPolicy = {
  kind: NullKind;
  reason_basic: string;
  reason_advanced: string;
};

/**
 * Pedagogical context per chain.
 */
export type MarketContext = {
  basic: string;
  advanced: string;
};

/**
 * Graph requirements.
 * Enforces the 3-line standard across the platform.
 */
export type GraphSpec = {
  require_daily: boolean; // raw daily series expected
  require_ma7: boolean;
  require_ma30: boolean;
};

/**
 * Canonical registry entry.
 */
export type MetricSemanticsEntry = {
  key: string;                 // metric key (base or MA key)
  label: string;               // human-readable label
  unit?: string;

  role: MetricRole;

  /**
   * Per-chain semantics.
   */
  perChain: Partial<Record<ChainId, {
    importance: Importance;
    nullPolicy: NullPolicy;
    marketContext: MarketContext;
  }>>;

  /**
   * Graphing contract.
   */
  graph: GraphSpec;

  /**
   * Methodology (Advanced-only, math-level transparency).
   */
  methodology: {
    definition: string;
    computation: string;
    caveats: string[];
  };
};

/* ------------------------------------------------------------------ */
/*  REGISTRY                                                          */
/* ------------------------------------------------------------------ */

export const METRIC_SEMANTICS_REGISTRY: MetricSemanticsEntry[] = [

  /* =========================
   * TRANSACTIONS (COUNT)
   * ========================= */

  {
    key: "tx_count_daily",
    label: "Transactions (daily)",
    unit: "count",
    role: "demand",

    perChain: {
      bitcoin: {
        importance: "primary",
        nullPolicy: {
          kind: "valid",
          reason_basic: "Bitcoin transaction count reflects demand for settlement.",
          reason_advanced: "Transaction count is a direct observation of settlement demand; zeros would indicate an outage."
        },
        marketContext: {
          basic: "Shows how much Bitcoin is being used for settlement.",
          advanced: "A proxy for settlement demand. Interpreted relative to MA7/MA30 to distinguish noise from regime shifts."
        }
      },
      ethereum: {
        importance: "primary",
        nullPolicy: {
          kind: "valid",
          reason_basic: "Ethereum transactions reflect execution demand.",
          reason_advanced: "Execution demand across contracts and EOAs; must be read alongside fees."
        },
        marketContext: {
          basic: "Shows how much Ethereum blockspace is being used.",
          advanced: "Execution activity signal; high counts without fees may indicate low-value spam or subsidized usage."
        }
      },
      arbitrum: {
        importance: "primary",
        nullPolicy: {
          kind: "valid",
          reason_basic: "Arbitrum transaction count reflects real L2 usage.",
          reason_advanced: "Primary usage metric for rollups; reflects demand absorbed from L1."
        },
        marketContext: {
          basic: "Shows how actively Arbitrum is being used.",
          advanced: "Core throughput indicator for a rollup; interpreted with sequencer capacity metrics."
        }
      },
      base: {
        importance: "primary",
        nullPolicy: {
          kind: "valid",
          reason_basic: "Base transaction count reflects retail and app usage.",
          reason_advanced: "Usage and engagement proxy for a consumer-facing rollup."
        },
        marketContext: {
          basic: "Shows how many transactions users make on Base.",
          advanced: "Engagement signal; growth matters more than absolute level."
        }
      }
    },

    graph: { require_daily: true, require_ma7: true, require_ma30: true },

    methodology: {
      definition: "Count of confirmed transactions per day.",
      computation: "Daily count aggregated from on-chain confirmed transactions.",
      caveats: [
        "Does not measure economic value.",
        "Can be inflated by low-cost or automated activity."
      ]
    }
  },

  /* =========================
   * MEDIAN TRANSACTION FEE
   * ========================= */

  {
    key: "median_tx_fee_native",
    label: "Median transaction fee",
    unit: "native",
    role: "friction",

    perChain: {
      bitcoin: {
        importance: "primary",
        nullPolicy: {
          kind: "valid",
          reason_basic: "Bitcoin fees measure congestion for settlement.",
          reason_advanced: "Median fee reflects fee market pressure independent of outliers."
        },
        marketContext: {
          basic: "Shows how congested the Bitcoin network is.",
          advanced: "Primary congestion indicator; sustained elevation signals demand pressure."
        }
      },
      ethereum: {
        importance: "primary",
        nullPolicy: {
          kind: "valid",
          reason_basic: "Ethereum fees are the price of blockspace.",
          reason_advanced: "Central signal of Ethereum’s fee market under EIP-1559."
        },
        marketContext: {
          basic: "Shows how expensive it is to use Ethereum.",
          advanced: "Fee pressure metric; must be interpreted alongside gas utilization."
        }
      },
      arbitrum: {
        importance: "primary",
        nullPolicy: {
          kind: "valid",
          reason_basic: "Fees reflect user-facing friction on Arbitrum.",
          reason_advanced: "Relative fee levels indicate sequencer pricing and congestion."
        },
        marketContext: {
          basic: "Shows transaction cost on Arbitrum.",
          advanced: "Low absolute fees require relative interpretation over time."
        }
      },
      base: {
        importance: "primary",
        nullPolicy: {
          kind: "valid",
          reason_basic: "Fees represent a cost barrier for Base users.",
          reason_advanced: "Critical UX metric for a retail-oriented rollup."
        },
        marketContext: {
          basic: "Shows how cheap or expensive Base is to use.",
          advanced: "Persistent increases may indicate onboarding or app-driven congestion."
        }
      }
    },

    graph: { require_daily: true, require_ma7: true, require_ma30: true },

    methodology: {
      definition: "Median fee paid per transaction, in native units.",
      computation: "Median across all transactions confirmed in a day.",
      caveats: [
        "Median hides tail risk for high-priority transactions.",
        "Cross-chain comparisons require caution."
      ]
    }
  },

  /* =========================
   * GAS UTILIZATION
   * ========================= */

  {
    key: "gas_utilization_pct",
    label: "Gas utilization",
    unit: "percent",
    role: "capacity",

    perChain: {
      bitcoin: {
        importance: "hidden",
        nullPolicy: {
          kind: "expected",
          reason_basic: "Bitcoin does not have a gas model.",
          reason_advanced: "Gas utilization is an EVM concept and is structurally not applicable to Bitcoin."
        },
        marketContext: {
          basic: "Not applicable to Bitcoin.",
          advanced: "Bitcoin capacity must be analyzed via block size and fee pressure instead."
        }
      },
      ethereum: {
        importance: "primary",
        nullPolicy: {
          kind: "valid",
          reason_basic: "Gas utilization measures how full Ethereum blocks are.",
          reason_advanced: "Direct indicator of capacity usage under EIP-1559."
        },
        marketContext: {
          basic: "Shows how full Ethereum blocks are.",
          advanced: "Sustained high utilization indicates persistent demand pressure."
        }
      },
      arbitrum: {
        importance: "primary",
        nullPolicy: {
          kind: "valid",
          reason_basic: "Measures sequencer capacity usage.",
          reason_advanced: "Reflects batch packing and execution pressure on the rollup."
        },
        marketContext: {
          basic: "Shows how busy the Arbitrum sequencer is.",
          advanced: "Capacity saturation can degrade UX even if fees remain low."
        }
      },
      base: {
        importance: "secondary",
        nullPolicy: {
          kind: "valid",
          reason_basic: "Measures backend load on Base.",
          reason_advanced: "Operational metric; less directly visible to users."
        },
        marketContext: {
          basic: "Shows how much capacity Base is using.",
          advanced: "Primarily useful for diagnosing backend pressure."
        }
      }
    },

    graph: { require_daily: true, require_ma7: true, require_ma30: true },

    methodology: {
      definition: "Percentage of available gas capacity used per day.",
      computation: "Daily average of gas used divided by gas limit.",
      caveats: [
        "Meaningful only for EVM-based chains.",
        "Must be interpreted with fee dynamics."
      ]
    }
  },

  /* =========================
   * FAILED TRANSACTION RATE
   * ========================= */

  {
    key: "failed_tx_rate",
    label: "Failed transaction rate",
    unit: "percent",
    role: "friction",

    perChain: {
      bitcoin: {
        importance: "hidden",
        nullPolicy: {
          kind: "expected",
          reason_basic: "Bitcoin transactions do not fail in the same way.",
          reason_advanced: "BTC lacks EVM-style reverts; failures are not semantically comparable."
        },
        marketContext: {
          basic: "Not applicable to Bitcoin.",
          advanced: "Transaction failure semantics differ fundamentally from EVM chains."
        }
      },
      ethereum: {
        importance: "secondary",
        nullPolicy: {
          kind: "valid",
          reason_basic: "Some Ethereum transactions revert.",
          reason_advanced: "Reflects execution errors, out-of-gas, or MEV effects."
        },
        marketContext: {
          basic: "Shows how often transactions fail.",
          advanced: "High rates can signal congestion or complex contract interactions."
        }
      },
      arbitrum: {
        importance: "primary",
        nullPolicy: {
          kind: "valid",
          reason_basic: "Failures directly impact user experience on L2.",
          reason_advanced: "Key UX metric for rollups promising cheap execution."
        },
        marketContext: {
          basic: "Shows how often Arbitrum transactions fail.",
          advanced: "Persistent elevation indicates sequencer or congestion issues."
        }
      },
      base: {
        importance: "primary",
        nullPolicy: {
          kind: "valid",
          reason_basic: "Failures harm onboarding and retail UX.",
          reason_advanced: "Critical stability metric for consumer adoption."
        },
        marketContext: {
          basic: "Shows how reliable Base transactions are.",
          advanced: "Used to diagnose UX regressions or app-driven overload."
        }
      }
    },

    graph: { require_daily: true, require_ma7: true, require_ma30: true },

    methodology: {
      definition: "Share of transactions that fail or revert.",
      computation: "Failed transactions divided by total submitted transactions per day.",
      caveats: [
        "Failure semantics differ across chains.",
        "Not comparable between BTC and EVM chains."
      ]
    }
  }

];

/* ------------------------------------------------------------------ */
/*  HELPERS (used by UI / meta / gold)                                 */
/* ------------------------------------------------------------------ */

export function getMetricsForChain(chain: ChainId) {
  return METRIC_SEMANTICS_REGISTRY.filter((m) => m.perChain[chain]);
}

export function getPrimaryMetrics(chain: ChainId) {
  return getMetricsForChain(chain).filter(
    (m) => m.perChain[chain]?.importance === "primary"
  );
}

export function getMetricNullPolicy(metricKey: string, chain: ChainId): NullPolicy | null {
  const m = METRIC_SEMANTICS_REGISTRY.find((x) => x.key === metricKey);
  return m?.perChain[chain]?.nullPolicy ?? null;
}

