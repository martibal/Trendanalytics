import type { ChainId } from "@/lib/types";
import type { MetricRole } from "@/lib/registry/metricSemantics";

/**
 * A chain profile is a pedagogical + UX contract.
 * - what makes the chain different
 * - which axes dominate interpretation
 * - which metrics are the headline defaults
 */
export type ChainProfile = {
  chain: ChainId;
  displayName: string;

  // high-level "what this chain is"
  primer: {
    basic: string;
    advanced: string;
  };

  // which axes are dominant in interpretation for this chain
  dominantAxes: MetricRole[];

  // metrics shown on landing card by default (in priority order)
  landingDefaults: string[]; // metric keys (base keys preferred)

  // metrics shown by default on chain detail page (in priority order)
  chainPageDefaults: string[]; // metric keys

  // expected-NA metrics we explicitly explain (education)
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
        "Bitcoin is primarily a settlement network. Trend interpretation focuses on demand for settlement and fee-market congestion rather than application execution.",
      advanced:
        "Bitcoin is a UTXO-based settlement layer. The most interpretable trend signals are settlement demand (transactions), congestion/fee pressure, and throughput constraints. Many EVM-style operational metrics are structurally not applicable.",
    },
    dominantAxes: ["demand", "friction", "capacity"],
    landingDefaults: ["tx_count_daily", "median_tx_fee_native", "value_transferred_native"],
    chainPageDefaults: ["tx_count_daily", "median_tx_fee_native", "value_transferred_native"],
    expectedNA: [
      {
        key: "gas_utilization_pct",
        reason_basic: "Bitcoin does not use gas.",
        reason_advanced: "Gas utilization is an EVM concept and is structurally not applicable to Bitcoin.",
      },
      {
        key: "failed_tx_rate",
        reason_basic: "Bitcoin does not have EVM-style transaction reverts.",
        reason_advanced:
          "BTC lacks EVM revert semantics; failure definitions are not comparable to EVM chains, so this metric is treated as not applicable.",
      },
    ],
  },

  ethereum: {
    chain: "ethereum",
    displayName: "Ethereum",
    primer: {
      basic:
        "Ethereum is a global execution layer with a fee market. Trend interpretation centers on fee pressure (friction) and capacity utilization alongside activity.",
      advanced:
        "Ethereum is an EVM execution layer with a mature fee market (EIP-1559). The canonical diagnostic signals are fee pressure (median fees), capacity usage (gas utilization), and execution demand (transactions). Activity without fee pressure can reflect low-value spam or subsidies.",
    },
    dominantAxes: ["friction", "capacity", "demand"],
    landingDefaults: ["median_tx_fee_native", "gas_utilization_pct", "tx_count_daily"],
    chainPageDefaults: ["median_tx_fee_native", "gas_utilization_pct", "tx_count_daily"],
    expectedNA: [],
  },

  arbitrum: {
    chain: "arbitrum",
    displayName: "Arbitrum",
    primer: {
      basic:
        "Arbitrum is a rollup designed to absorb execution demand. Trend interpretation focuses on usage, user-facing friction, and sequencer capacity pressure.",
      advanced:
        "Arbitrum is an optimistic rollup. Interpretation differs from L1: fees are relative and sequencer-driven; capacity is operational (batch packing, execution pressure). Key signals are transaction demand, failure rates (UX), and utilization/pressure.",
    },
    dominantAxes: ["demand", "capacity", "friction"],
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
        "Base is an optimistic rollup with a distribution advantage and an adoption narrative. Interpret demand through engagement signals (transactions, active addresses) and friction through fee levels and failure rates. Capacity metrics are operational context.",
    },
    dominantAxes: ["demand", "friction", "capacity"],
    landingDefaults: ["tx_count_daily", "unique_active_addresses", "failed_tx_rate"],
    chainPageDefaults: ["tx_count_daily", "unique_active_addresses", "failed_tx_rate", "median_tx_fee_native"],
    expectedNA: [],
  },
};
