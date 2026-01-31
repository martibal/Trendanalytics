// web-v1/src/catalog/docs/metricDocs.ts
//
// Metric documentation for Basic + Advanced explainers.
// This is product-facing text (English only), but currently consumed by internal UI.
// Policy constraints:
// - Descriptive only (no recommendations, no forecasting).
// - No price, no price proxies, no USD framing.
// - Always explicit about units, windowing, and chain-specific caveats.

import type { Chain } from "../decisions/productDecisions";

export type MetricDoc = {
  metric_id: string;

  basic: {
    what: string; // what it is
    howToRead: string; // how to interpret
    whyIncluded: string; // why included in product
    valueToUser: string; // what value it provides
    commonMisreads: string[]; // pitfalls without being normative
  };

  advanced: {
    definition: string; // precise definition
    calculation: string; // how computed (inputs, transforms, aggregation)
    unitsAndScale: string; // units/scale; explicit
    windowing: string; // windowing / sampling / missingness
    caveats: string[]; // uncertainty + alternative explanations
    chainNotes: Partial<Record<Chain, string>>; // chain-specific notes
  };
};

export type MetricDocMap = Record<string, MetricDoc>;

export const METRIC_DOCS: MetricDocMap = {
  tx_count_daily: {
    metric_id: "tx_count_daily",
    basic: {
      what:
        "Number of transactions recorded per day on a given chain (as defined by the chain’s canonical transaction model).",
      howToRead:
        "Higher values mean more on-chain transaction events that day. This is an activity/usage count, not a measure of economic value.",
      whyIncluded:
        "It provides a simple baseline for network usage and is useful as context for interpreting other metrics (fees, active addresses, utilization).",
      valueToUser:
        "Helps you understand whether observed changes in other metrics are occurring alongside broad activity changes or during stable activity levels.",
      commonMisreads: [
        "Interpreting higher tx counts as ‘better’ or ‘worse’ network health (the metric is descriptive only).",
        "Comparing absolute tx counts across chains without considering chain design differences (L1 vs L2 semantics).",
        "Assuming tx count directly reflects user count (one user can generate many transactions).",
      ],
    },
    advanced: {
      definition:
        "Daily count of transaction events included in the dataset’s gold window for the chain. A ‘transaction’ follows the chain’s canonical model (e.g., UTXO tx on Bitcoin; account-based tx on EVM chains).",
      calculation:
        "For each day D: count all transaction records with timestamp in day D (UTC day boundaries). Aggregation is a simple count; no weighting. Missing days can occur if upstream data is absent for that day.",
      unitsAndScale: "Unit: transactions/day. Scale: integer count (>= 0).",
      windowing:
        "Computed over daily observations within the selected scan window (e.g., last365d). Missingness is tracked as missing_rate_by_chain; downstream summaries may exclude missing days depending on the view.",
      caveats: [
        "Chain design affects what is considered a transaction (e.g., batching on L2, account abstraction patterns).",
        "Protocol or client changes can alter transaction composition without reflecting a regime change in user demand.",
        "High variance days can reflect episodic events (airdrops, inscriptions, congestion) without implying persistence.",
      ],
      chainNotes: {
        bitcoin:
          "Bitcoin transactions follow the UTXO model; transaction count can rise due to changes in input/output composition (consolidations, inscriptions) even if address-level behavior is stable.",
        ethereum:
          "Ethereum transaction count is sensitive to gas pricing and block limits. L2 adoption can shift activity away from L1 without changing total ecosystem activity.",
        arbitrum:
          "L2 batching and sequencer behavior can affect the mapping of user actions to on-chain transaction events; interpret cross-chain comparisons cautiously.",
        base:
          "L2 batching and application mix can dominate tx dynamics. Cross-chain comparisons should account for different transaction ‘granularity’.",
      },
    },
  },

  block_count_daily: {
    metric_id: "block_count_daily",
    basic: {
      what:
        "Number of blocks produced per day on a given chain (as defined by the chain’s block production model).",
      howToRead:
        "Higher values mean more blocks were produced that day. This is operational context and affects daily capacity and throughput, but it is not the same as ‘more users’ or ‘more demand’.",
      whyIncluded:
        "It provides context for interpreting daily aggregates that depend on block production (e.g., gas utilization, fees, and transaction inclusion dynamics).",
      valueToUser:
        "Helps you separate changes that may be driven by block production/timing dynamics from changes driven by transaction demand alone.",
      commonMisreads: [
        "Treating block count as a direct measure of user activity (it is operational, not user-level).",
        "Comparing block counts across chains without considering different block cadence and sequencing models.",
        "Assuming block count changes imply ‘health’ or ‘quality’ changes (descriptive only).",
      ],
    },
    advanced: {
      definition:
        "Daily count of blocks observed for the chain within day D (UTC day boundaries), based on the dataset’s block series for that chain.",
      calculation:
        "For each day D: count the number of block records whose timestamps fall within day D. If blocks are missing from the upstream source, the daily count can be understated.",
      unitsAndScale: "Unit: blocks/day. Scale: integer count (>= 0).",
      windowing:
        "Observed daily over the scan window (e.g., last365d). Missingness can occur if block data is incomplete or if upstream lag prevents a full day from being present.",
      caveats: [
        "Block cadence is chain-dependent and may be influenced by protocol targets, variance, and policy (especially for probabilistic systems).",
        "On L2s, ‘block’ concepts can reflect sequencer policy and may not be comparable to L1 blocks; this metric is often less meaningful on L2.",
        "Short-term deviations (a day) can reflect variance rather than a persistent change; interpret with persistence and historical context.",
      ],
      chainNotes: {
        bitcoin:
          "Bitcoin block production is probabilistic. Daily block counts can vary notably around the long-run target without implying a structural change.",
        ethereum:
          "Ethereum block cadence can shift with protocol and validator dynamics. Treat as operational context for daily capacity and inclusion behavior.",
        arbitrum:
          "On L2s, the block concept can reflect sequencer cadence and timestamp policy. Cross-chain comparison to L1 block counts is typically not meaningful.",
        base:
          "On L2s, the block concept can reflect sequencer cadence and timestamp policy. Cross-chain comparison to L1 block counts is typically not meaningful.",
      },
    },
  },

  unique_active_addresses: {
    metric_id: "unique_active_addresses",
    basic: {
      what:
        "Number of unique addresses that were active on a given day. ‘Active’ means the address appears in transaction activity for that day (chain-specific definition).",
      howToRead:
        "Higher values indicate more distinct addresses participated in activity that day. This is a participation proxy, not a unique-user count.",
      whyIncluded:
        "It complements transaction counts by providing a participation-style measure (how widely activity is distributed across addresses).",
      valueToUser:
        "Helps distinguish ‘many transactions by few addresses’ vs ‘activity spread across many addresses’—useful context for regime and distribution analysis.",
      commonMisreads: [
        "Treating addresses as users (one user can control many addresses; one address can represent many users via smart contracts or exchanges).",
        "Comparing address counts across chains without considering account model differences and contract-mediated activity.",
        "Interpreting a rise/fall as adoption/attrition without considering airdrops, sybil behavior, or exchange consolidation.",
      ],
    },
    advanced: {
      definition:
        "Daily count of distinct addresses observed as participating in on-chain transaction activity for the chain’s gold dataset. Participation criteria are chain-specific (e.g., appearing as sender/recipient; contract interactions).",
      calculation:
        "For each day D: build the set S(D) of addresses that appear in transaction activity for day D (per the dataset’s address extraction logic). Output is |S(D)|. No dedup across days; it is per-day unique.",
      unitsAndScale: "Unit: addresses/day. Scale: integer count (>= 0).",
      windowing:
        "Observed daily within the selected scan window (e.g., last365d). Missingness can be non-trivial on some chains due to upstream lag or address extraction limitations.",
      caveats: [
        "Address-level participation is not identity-level participation; contract wallets, exchanges, bridges, and batching can distort interpretation.",
        "Sybil behavior (many addresses controlled by one actor) can inflate the metric without reflecting distributed participation.",
        "Protocol-level changes (account abstraction, new wallet patterns) can shift address usage without a comparable shift in economic activity.",
      ],
      chainNotes: {
        bitcoin:
          "Address reuse and UTXO management practices can affect observed active addresses. Script types and consolidation behavior can shift address activity patterns.",
        ethereum:
          "Smart contract interactions can cause contract addresses to appear active. EOAs vs contract accounts should not be interpreted as distinct ‘users’.",
        arbitrum:
          "Contract-mediated activity and batching can affect address participation. Bridges and rollup mechanics can concentrate activity into fewer on-chain actors.",
        base:
          "Application mix can dominate address participation. Some apps generate many ephemeral addresses or contract interactions that distort ‘human’ participation proxies.",
      },
    },
  },

  median_tx_fee_native: {
    metric_id: "median_tx_fee_native",
    basic: {
      what:
        "Median transaction fee per day, expressed in the chain’s native base units (e.g., satoshis for Bitcoin; wei for EVM chains).",
      howToRead:
        "A higher median fee indicates that a ‘typical’ transaction that day cost more in native units. This is a cost/competition proxy for blockspace, not a price metric.",
      whyIncluded:
        "Fees provide descriptive evidence about demand for limited blockspace and help contextualize activity metrics (e.g., tx_count) during congestion regimes.",
      valueToUser:
        "Helps identify persistent shifts in transaction cost regimes and supports contextual interpretation (e.g., activity rising alongside higher typical fees).",
      commonMisreads: [
        "Converting to fiat or treating as a price signal (product must remain non-price).",
        "Comparing fee levels across chains as if units are comparable (sat vs wei are different base units).",
        "Assuming high fees are ‘good’ or ‘bad’—the metric is descriptive only.",
      ],
    },
    advanced: {
      definition:
        "Daily median of per-transaction fee values for transactions observed that day, expressed in the chain’s native base unit. The median is used for robustness against outliers.",
      calculation:
        "For each day D: collect the set F(D) of transaction fee values in native base units for all observed transactions on day D. Output is median(F(D)). If fee values are missing/unavailable, the day may be missing.",
      unitsAndScale:
        "Unit: native base units per transaction (BTC: sat; EVM: wei). Scale: non-negative integer-like values; cross-chain absolute comparisons are not meaningful without normalization.",
      windowing:
        "Observed daily over the selected scan window (e.g., last365d). Missingness depends on upstream fee availability and chain semantics (e.g., EIP-1559 fields).",
      caveats: [
        "Median reduces outlier impact but does not capture tail risk (rare expensive transactions).",
        "Protocol changes (fee markets, base fee dynamics) can change the structure of fees without implying user demand shifts.",
        "Cross-chain comparisons are complicated by different fee models (L1 vs L2, calldata costs, batching).",
      ],
      chainNotes: {
        bitcoin:
          "Fees depend on mempool conditions and transaction composition (vbytes). Satoshi amounts do not map to a stable ‘cost’ concept without additional normalization (not performed here).",
        ethereum:
          "Post-EIP-1559 fee model splits base fee and priority fee; depending on data source, ‘fee’ may reflect effective paid cost. Base unit is wei.",
        arbitrum:
          "Rollup fee dynamics can differ from L1; costs can be influenced by L1 calldata pricing and batching. Base unit is wei.",
        base:
          "Rollup fee dynamics can differ from L1; costs can be influenced by L1 calldata pricing and batching. Base unit is wei.",
      },
    },
  },

  gas_utilization_pct: {
    metric_id: "gas_utilization_pct",
    basic: {
      what:
        "Share of available gas capacity that was actually used in blocks on a given day (EVM chains).",
      howToRead:
        "Values closer to 1.0 mean blocks were more ‘full’ on average that day. This is a capacity/pressure indicator, not a performance score.",
      whyIncluded:
        "It provides descriptive context about capacity usage: whether the chain operated near its configured gas limits over time.",
      valueToUser:
        "Helps interpret fee and activity behavior: periods of consistently high utilization often coincide with tighter capacity and more competition for inclusion.",
      commonMisreads: [
        "Treating utilization as a ‘health’ metric or value judgment (descriptive only).",
        "Assuming it applies equally to non-EVM chains (Bitcoin does not have gas; this metric is N/A there).",
        "Comparing utilization across chains without considering different gas limit policies and block building mechanics.",
      ],
    },
    advanced: {
      definition:
        "Daily aggregate of block-level gas_used divided by block-level gas_limit, summarized as a daily representative statistic (dataset-defined). Intended for EVM chains where gas_limit is defined per block.",
      calculation:
        "For each block b in day D: compute u(b)=gas_used(b)/gas_limit(b). Aggregate u(b) over all blocks in D into a daily value (e.g., mean or median; depends on the upstream gold definition).",
      unitsAndScale:
        "Unit: fraction. Expected scale: 0..1. The internal catalog’s pct diagnostics can detect 0..1 vs 0..100 inconsistencies.",
      windowing:
        "Observed daily within the scan window (e.g., last365d). Missingness can occur if block-level fields are absent or upstream aggregation failed.",
      caveats: [
        "Utilization can be high due to sustained demand or due to policy/parameter changes (e.g., gas limit adjustments).",
        "Daily aggregates can hide intraday variance (spiky congestion vs consistently full blocks).",
        "L2s may reflect different cost drivers (calldata, batching) even if utilization is high; interpret alongside fee metrics.",
      ],
      chainNotes: {
        bitcoin:
          "N/A. Bitcoin does not have a gas model; utilization should be represented via different concepts (e.g., block weight/size), not gas.",
        ethereum:
          "Gas utilization is influenced by EIP-1559 dynamics and gas limit policy. Sustained high utilization can coexist with stable transaction counts if transactions become more gas-heavy.",
        arbitrum:
          "As an L2, utilization reflects sequencer-produced blocks and rollup mechanics. Interpret in the context of L1 calldata costs and batching.",
        base:
          "As an L2, utilization reflects sequencer-produced blocks and rollup mechanics. Interpret in the context of L1 calldata costs and batching.",
      },
    },
  },

  failed_tx_rate: {
    metric_id: "failed_tx_rate",
    basic: {
      what:
        "Share of transactions that ended in failure/reversion on a given day (EVM chains).",
      howToRead:
        "Higher values mean a larger fraction of transactions did not execute successfully that day. This is an execution-outcome descriptor, not a value judgment.",
      whyIncluded:
        "It captures an important aspect of transaction outcomes that can shift during congestion, contract interactions, or changes in application mix.",
      valueToUser:
        "Helps distinguish ‘more activity’ from ‘more attempted but unsuccessful activity’ and provides context for interpreting fees and utilization.",
      commonMisreads: [
        "Interpreting failures as a chain being ‘broken’ (failures can be normal for certain workflows and contracts).",
        "Assuming the same concept applies to Bitcoin in the same way (Bitcoin does not have EVM-style reverts).",
        "Treating this as a security/attack indicator without additional evidence (descriptive only).",
      ],
    },
    advanced: {
      definition:
        "Daily fraction of observed transactions that have a failed execution outcome per the upstream gold definition (e.g., EVM status=0, reverted execution, or equivalent).",
      calculation:
        "For each day D: failed_tx_rate(D) = (# failed transactions in D) / (# total transactions in D). Requires consistent classification of ‘failed’ in the upstream data.",
      unitsAndScale:
        "Unit: fraction. Expected scale: 0..1. This is a strict invariant in the internal catalog (violations are errors).",
      windowing:
        "Observed daily over the scan window (e.g., last365d). If the upstream source does not provide outcome classification, values may be missing (and flagged as all-missing).",
      caveats: [
        "Failure semantics depend on the chain and data source (revert vs out-of-gas vs dropped/never-included attempts are different categories).",
        "Application mix matters: some protocols intentionally generate many reverting calls as part of search/MEV or user behavior.",
        "Sudden shifts can reflect client/library changes (e.g., gas estimation behavior) rather than a regime shift in user demand.",
      ],
      chainNotes: {
        bitcoin:
          "N/A in this form. Bitcoin transactions are either valid and confirmed or not included; ‘revert’ is not a native concept. This metric is typically hidden for Bitcoin.",
        ethereum:
          "Failures often come from reverts/out-of-gas or contract logic. Interpret alongside gas utilization and median fees to contextualize congestion regimes.",
        arbitrum:
          "L2 execution semantics differ from L1 in some edge cases. Some failures can reflect app behavior and sequencing rather than L1-like congestion.",
        base:
          "L2 execution semantics differ from L1 in some edge cases. Some failures can reflect app behavior and sequencing rather than L1-like congestion.",
      },
    },
  },

  value_transferred_native: {
    metric_id: "value_transferred_native",
    basic: {
      what:
        "Total amount of native asset transferred on-chain per day, expressed in native base units (BTC: satoshis; EVM: wei).",
      howToRead:
        "Higher values mean more native asset was transferred that day in native units. This describes flow volume in native units, not fiat value.",
      whyIncluded:
        "It captures large-scale flow dynamics and helps contextualize activity: high activity can occur with low transfer volume and vice versa.",
      valueToUser:
        "Helps distinguish regimes where the chain is used mainly for many small transfers vs fewer large settlement-style transfers, without introducing price.",
      commonMisreads: [
        "Converting to fiat or treating it as a price/market signal (product is non-price).",
        "Comparing absolute totals across chains as if units are comparable (sat vs wei differ; chain models differ).",
        "Assuming higher transfers imply ‘more important’ activity (descriptive only; composition matters).",
      ],
    },
    advanced: {
      definition:
        "Daily aggregate of transferred value in the chain’s native asset, computed from transaction-level transferred amounts (dataset-defined) and expressed in native base units.",
      calculation:
        "For each day D: sum the transaction-level transferred value v(tx) across all observed transactions in D, where v(tx) represents native asset moved (excluding token transfers unless explicitly modeled). Output is Σ v(tx). Exact inclusion rules depend on upstream gold definition (e.g., change outputs on UTXO chains, internal transfers on EVM).",
      unitsAndScale:
        "Unit: native base units/day (BTC: sat/day; EVM: wei/day). Scale: large non-negative integers. Cross-chain absolute comparisons are not meaningful without normalization (not performed).",
      windowing:
        "Observed daily over the scan window (e.g., last365d). Missingness can arise from incomplete value extraction, chain-specific modeling, or upstream lag.",
      caveats: [
        "On UTXO chains, distinguishing ‘payment’ vs ‘change’ is non-trivial; totals can be sensitive to heuristics.",
        "On EVM chains, native transfers can include internal value movements driven by contracts; this can inflate totals relative to simple user-to-user transfers.",
        "Large spikes can come from a small number of very large transfers; complementary distribution metrics (median) help interpret typical behavior.",
      ],
      chainNotes: {
        bitcoin:
          "UTXO structure means ‘value transferred’ depends on how the dataset treats change outputs and consolidation patterns. Interpretation should consider that large totals may reflect wallet management behavior.",
        ethereum:
          "Native value transfers can occur via direct transfers and contract-mediated internal movements. The dataset’s definition determines whether internal transfers are included.",
        arbitrum:
          "As an L2, native value movements can be dominated by bridges, settlement, and app-specific flows. Interpret alongside tx_count and median_tx_value_native for typical transfer size context.",
        base:
          "As an L2, native value movements can be dominated by bridges, settlement, and app-specific flows. Interpret alongside tx_count and median_tx_value_native for typical transfer size context.",
      },
    },
  },

  median_tx_value_native: {
    metric_id: "median_tx_value_native",
    basic: {
      what:
        "Median transferred native value per transaction on a given day, expressed in native base units (BTC: satoshis; EVM: wei).",
      howToRead:
        "A higher median means a ‘typical’ transaction moved more native value that day. The median is robust to a few very large transfers.",
      whyIncluded:
        "It complements total transferred value by describing typical transfer size, helping separate ‘few large transfers’ from ‘many small transfers’ regimes.",
      valueToUser:
        "Provides distribution context: even if total transfer volume is high, the median can reveal whether that volume is driven by typical transactions or by outliers.",
      commonMisreads: [
        "Converting to fiat or treating it as a market signal (product is non-price).",
        "Comparing medians across chains as if units are comparable (sat vs wei differ; chain semantics differ).",
        "Assuming the median represents ‘user’ intent (contract batching, internal transfers, and app mechanics can affect per-tx values).",
      ],
    },
    advanced: {
      definition:
        "Daily median of transaction-level transferred native value v(tx), expressed in native base units. The median summarizes the central tendency of transfer sizes for that day.",
      calculation:
        "For each day D: collect transaction-level transferred native values V(D) = { v(tx) } for all observed transactions in D (dataset-defined). Output is median(V(D)). If v(tx) is unavailable for many transactions, the day may be missing or biased.",
      unitsAndScale:
        "Unit: native base units per transaction (BTC: sat/tx; EVM: wei/tx). Scale: non-negative. Cross-chain absolute comparisons are not meaningful without normalization (not performed).",
      windowing:
        "Observed daily over the scan window (e.g., last365d). Missingness and bias depend on upstream value extraction and which transaction types are included.",
      caveats: [
        "Median is robust but can still shift due to changes in transaction composition (e.g., more contract calls with small native value but large token value).",
        "On some chains, many transactions move zero or near-zero native value; the median may be zero depending on inclusion rules.",
        "Interpret together with tx_count_daily and value_transferred_native to separate volume-driven vs distribution-driven changes.",
      ],
      chainNotes: {
        bitcoin:
          "Median transfer size can be affected by UTXO consolidation patterns and how the dataset models value moved vs change. A median near common dust thresholds can reflect wallet hygiene behavior.",
        ethereum:
          "Many transactions are contract interactions where the meaningful economic action is in tokens, not native value. Median native tx value may be low even during high on-chain activity.",
        arbitrum:
          "L2 application mix can cause many near-zero native transfers; median can be dominated by app mechanics. Interpret alongside fee and utilization to understand congestion regimes.",
        base:
          "L2 application mix can cause many near-zero native transfers; median can be dominated by app mechanics. Interpret alongside fee and utilization to understand congestion regimes.",
      },
    },
  },

  avg_block_time_sec: {
    metric_id: "avg_block_time_sec",
    basic: {
      what:
        "Average time between consecutive blocks, expressed in seconds (chain-specific block production model).",
      howToRead:
        "Higher values mean blocks were produced more slowly on average over the day; lower values mean faster block production. This is operational timing context, not a direct usage metric.",
      whyIncluded:
        "Primarily for internal diagnostics and context. It can help explain changes in per-day counts (e.g., blocks/day) and capacity-derived measures, without making normative claims.",
      valueToUser:
        "Provides operational context for interpreting other daily aggregates. It can indicate when observed changes might be related to timing/production dynamics rather than user demand alone.",
      commonMisreads: [
        "Treating block time as a ‘performance score’ or making value judgments (descriptive only).",
        "Assuming block time is fully controllable or comparable across chains (different consensus and sequencing models).",
        "Interpreting short-lived timing variation as a persistent regime change without checking persistence.",
      ],
    },
    advanced: {
      definition:
        "Daily average of inter-block intervals for the chain, computed from block timestamps over the day (dataset-defined). For some chains this approximates protocol target; for others it can reflect sequencer behavior or timestamp policy.",
      calculation:
        "For each day D: compute the time differences Δt between consecutive blocks included in D (or spanning D, dataset-defined). Output is average(Δt). If blocks are missing or timestamps are irregular, the metric may be noisy or missing.",
      unitsAndScale: "Unit: seconds. Scale: positive real values; typical magnitudes are chain-dependent.",
      windowing:
        "Observed daily over the scan window (e.g., last365d). Missingness can occur if block timestamp series is incomplete or upstream aggregation failed.",
      caveats: [
        "Timestamp policies and clock drift can introduce noise; measured intervals are not a pure ‘network latency’ measure.",
        "Protocol upgrades or policy changes (e.g., gas limit adjustments, sequencer changes) can affect observed timing.",
        "On L2s, block timing can be more a product of sequencer configuration than decentralized consensus dynamics.",
      ],
      chainNotes: {
        bitcoin:
          "Bitcoin block times are probabilistic; short windows can deviate substantially from the target due to variance. Daily averages can swing without implying a fundamental change.",
        ethereum:
          "Ethereum block times can shift with protocol changes and validator behavior. Interpret as operational timing context, not demand.",
        arbitrum:
          "L2 ‘block’ timing can reflect sequencer batch cadence and timestamp policy. Not directly comparable to L1 block production.",
        base:
          "L2 ‘block’ timing can reflect sequencer batch cadence and timestamp policy. Not directly comparable to L1 block production.",
      },
    },
  },
};

export function getMetricDoc(metric_id: string): MetricDoc | null {
  return METRIC_DOCS[metric_id] ?? null;
}
