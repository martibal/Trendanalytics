// src/config/chains.ts

export type ChainId = "bitcoin" | "ethereum" | "arbitrum" | "base";

export type ChainPrimer = {
  shortFact: string;
  whatMakesItDifferent: string;
  whyUsersCare: string;
  primaryDrivers: string[];
  caveats?: string[];
};

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
   */
  hiddenMetrics: string[];

  /**
   * Optional descriptive note shown in UI.
   */
  note?: string;

  /**
   * Optional richer primer content for expandable chain explanation cards.
   */
  primer?: ChainPrimer;
};

export const CHAINS: Record<ChainId, ChainConfig> = {
  bitcoin: {
    id: "bitcoin",
    label: "BTC",
    name: "Bitcoin",
    icon: "₿",
    subtitle:
      "L1 UTXO network. Fees and throughput are governed by block-space competition and confirmation dynamics.",
    hiddenMetrics: [
      "gas_utilization_pct",
      "failed_tx_rate",
      "avg_gas_per_tx",
      "median_gas_price",
      "l2_burst_index",
    ],
    note:
      "BTC does not have EVM gas-utilisation or failed-transaction semantics. Capacity is therefore proxied differently than on EVM chains.",
    primer: {
      shortFact:
        "Bitcoin is the original peer-to-peer cash network and uses the UTXO model rather than the EVM account model.",
      whatMakesItDifferent:
        "Compared with EVM chains, BTC does not express demand and congestion through gas utilisation or smart-contract execution cost. Instead, the strongest direct operating signals are transaction count, transaction fees, and block-time behaviour relative to the chain's own recent history.",
      whyUsersCare:
        "BTC users usually care whether the network currently looks quiet, warming up, or crowded because that changes how difficult and expensive it is to get transactions included, and whether current activity looks ordinary or unusually stressed relative to recent history.",
      primaryDrivers: [
        "Demand is primarily read from tx_count_daily and unique_active_addresses.",
        "Friction is primarily read from median_tx_fee_native.",
        "Capacity is proxied through avg_block_time_sec because BTC does not have an EVM-style gas utilisation field.",
      ],
      caveats: [
        "Block time is a proxy, not a literal spare-capacity meter.",
        "BTC fee spikes can be sharp and episodic because users compete for finite block space.",
      ],
    },
  },

  ethereum: {
    id: "ethereum",
    label: "ETH",
    name: "Ethereum",
    icon: "Ξ",
    subtitle:
      "EVM L1. Gas pricing and capacity reflect block-space demand and execution constraints.",
    hiddenMetrics: [],
    primer: {
      shortFact:
        "Ethereum is the main smart-contract base layer of the EVM ecosystem, with gas-based block capacity and EIP-1559 fee mechanics.",
      whatMakesItDifferent:
        "ETH differs from BTC because execution cost and congestion are strongly visible through gas-related fields such as gas utilisation, transaction fees, and failed transaction rate. That makes the friction and capacity surface richer than on BTC.",
      whyUsersCare:
        "ETH users care whether execution looks normal, heating, or congested because cost, inclusion pressure, and smart-contract usability can change quickly when demand rises against finite block capacity.",
      primaryDrivers: [
        "Demand is primarily read from tx_count_daily and unique_active_addresses.",
        "Friction is read from median_tx_fee_native and failed_tx_rate.",
        "Capacity is read from gas_utilization_pct plus block-time behaviour.",
      ],
      caveats: [
        "A high fee environment can reflect genuine usage pressure, but also specific application-level or MEV-heavy activity.",
      ],
    },
  },

  arbitrum: {
    id: "arbitrum",
    label: "ARB",
    name: "Arbitrum",
    icon: "A",
    subtitle:
      "EVM L2. Execution and fees depend on rollup mechanics, sequencer flow, and parent-chain settlement conditions.",
    hiddenMetrics: ["gas_utilization_pct", "failed_tx_rate"],
    note:
      "L2s use different fee and capacity mechanics; selected L1-only metrics are intentionally hidden.",
    primer: {
      shortFact:
        "Arbitrum is an Ethereum-secured optimistic rollup where most transactions go through a sequencer and batches are ultimately posted to a parent chain.",
      whatMakesItDifferent:
        "Arbitrum differs from L1s because user-visible cost and throughput depend on both local L2 execution conditions and parent-chain publishing conditions. It also has sequencer-specific transaction flow and delayed-inbox fallback mechanics.",
      whyUsersCare:
        "Users care whether Arbitrum is heating or congested because lower apparent L2 cost can still change materially when parent-chain publishing becomes expensive or when local activity spikes.",
      primaryDrivers: [
        "Demand is primarily read from tx_count_daily and unique_active_addresses.",
        "Friction is read from median_tx_fee_native and failed_tx_rate where published.",
        "Capacity is read from capacity_util_pct and block-time behaviour rather than ETH L1 gas utilisation.",
      ],
      caveats: [
        "L2 fee behaviour is not the same thing as L1 gas behaviour.",
        "Settlement and posting costs can matter even when local execution looks calm.",
      ],
    },
  },

  base: {
    id: "base",
    label: "BASE",
    name: "Base",
    icon: "B",
    subtitle:
      "EVM L2. Activity and fees reflect rollup execution plus L1 publishing and settlement conditions.",
    hiddenMetrics: ["gas_utilization_pct", "failed_tx_rate"],
    note:
      "Base uses a two-part fee environment: local L2 execution cost plus parent-chain publishing cost.",
    primer: {
      shortFact:
        "Base is an Ethereum Layer 2 built on the OP Stack, so its operating state depends on both local L2 activity and L1 security publication costs.",
      whatMakesItDifferent:
        "Base differs from ETH mainnet because a user transaction typically contains both an L2 execution cost and an L1 security / publication cost. That makes fee interpretation more two-dimensional than on a standalone L1.",
      whyUsersCare:
        "Users care whether Base is heating or congested because apparent cheapness can still change quickly when L1 posting cost rises or when local demand begins to absorb available L2 block capacity.",
      primaryDrivers: [
        "Demand is primarily read from tx_count_daily and unique_active_addresses.",
        "Friction is read from median_tx_fee_native and failed_tx_rate where published.",
        "Capacity is read from capacity_util_pct and block-time behaviour.",
      ],
      caveats: [
        "Low local demand does not guarantee low total fee if parent-chain conditions worsen.",
      ],
    },
  },
};

export const CHAIN_LIST: ChainConfig[] = [
  CHAINS.bitcoin,
  CHAINS.ethereum,
  CHAINS.arbitrum,
  CHAINS.base,
];

export function getChainConfig(chain: string): ChainConfig | null {
  const key = String(chain) as ChainId;
  return key in CHAINS ? CHAINS[key] : null;
}

export function isHiddenMetric(chain: ChainId, metric: string): boolean {
  return CHAINS[chain].hiddenMetrics.includes(metric);
}
