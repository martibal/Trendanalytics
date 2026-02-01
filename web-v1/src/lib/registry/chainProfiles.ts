import type { ChainId } from "@/lib/types";

export type ExplainMode = "basic" | "advanced";

export type ChainProfile = {
  chain: ChainId;
  displayName: string;

  primer: {
    basic: string;
    advanced: string;
  };

  /**
   * Landing card defaults: priority order of base metric keys.
   * (Base key = without __ma7/__ma30 suffix.)
   */
  landingDefaults: string[];

  /**
   * Chain page defaults: priority order of base metric keys.
   * Used later in Leveranse 6 for chain-specific dropdown ordering + hide expected-NA.
   */
  chainPageDefaults: string[];

  /**
   * Metrics we expect to be NA structurally, and why (education).
   */
  expectedNA: Array<{
    key: string;
    reason_basic: string;
    reason_advanced: string;
  }>;
};

export const CHAIN_PROFILES: Record<ChainId, ChainProfile> = {
  bitcoin: {
    chain: "bitcoin",
    displayName: "Bitcoin",
    primer: {
      basic:
        "Bitcoin is primarily a settlement network. Trend interpretation focuses on settlement demand and fee-market congestion rather than application execution.",
      advanced:
        "Bitcoin is a UTXO-based settlement layer. Interpretable signals concentrate in settlement demand (transactions), congestion/fees (friction), and throughput constraints. Many EVM-style execution metrics are structurally not applicable.",
    },
    landingDefaults: ["tx_count_daily", "median_tx_fee_native", "value_transferred_native"],
    chainPageDefaults: ["tx_count_daily", "median_tx_fee_native", "value_transferred_native", "avg_block_time_sec"],
    expectedNA: [
      {
        key: "gas_utilization_pct",
        reason_basic: "Bitcoin does not use gas.",
        reason_advanced: "Gas utilization is an EVM execution concept and is structurally not applicable to Bitcoin.",
      },
      {
        key: "failed_tx_rate",
        reason_basic: "Bitcoin does not have EVM-style transaction reverts.",
        reason_advanced:
          "BTC lacks EVM revert semantics; failure-rate definitions are not comparable to EVM chains, so this is treated as not applicable.",
      },
    ],
  },

  ethereum: {
    chain: "ethereum",
    displayName: "Ethereum",
    primer: {
      basic:
        "Ethereum is a global execution layer with a fee market. Trend interpretation centers on fee pressure and capacity usage alongside activity.",
      advanced:
        "Ethereum is an EVM execution layer with a mature fee market (EIP-1559). Canonical diagnostics are fee pressure (median fees), capacity usage (gas utilization), and execution demand (transactions). Activity without fee pressure can reflect low-value demand or subsidies.",
    },
    landingDefaults: ["median_tx_fee_native", "gas_utilization_pct", "tx_count_daily"],
    chainPageDefaults: ["median_tx_fee_native", "gas_utilization_pct", "tx_count_daily", "failed_tx_rate"],
    expectedNA: [],
  },

  arbitrum: {
    chain: "arbitrum",
    displayName: "Arbitrum",
    primer: {
      basic:
        "Arbitrum is a rollup designed to absorb execution demand. Trend interpretation focuses on usage, user-facing friction, and operational pressure.",
      advanced:
        "Arbitrum is an optimistic rollup. Interpretation differs from L1: fees and capacity are sequencer/operational. Key signals include transaction demand, user-facing friction (fees), and failure-rate/instability as an execution UX proxy.",
    },
    landingDefaults: ["tx_count_daily", "median_tx_fee_native", "failed_tx_rate"],
    chainPageDefaults: ["tx_count_daily", "median_tx_fee_native", "failed_tx_rate", "gas_utilization_pct"],
    expectedNA: [],
  },

  base: {
    chain: "base",
    displayName: "Base",
    primer: {
      basic:
        "Base is a consumer-facing rollup. Trend interpretation emphasizes adoption/engagement and user experience stability.",
      advanced:
        "Base is an optimistic rollup with adoption/consumer distribution. Interpret demand via engagement (transactions, active addresses) and friction via fee levels and failure rate. Capacity metrics are operational context rather than fixed protocol limits.",
    },
    landingDefaults: ["tx_count_daily", "unique_active_addresses", "failed_tx_rate"],
    chainPageDefaults: ["tx_count_daily", "unique_active_addresses", "failed_tx_rate", "median_tx_fee_native"],
    expectedNA: [],
  },
};
