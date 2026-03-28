# Research notes behind this bundle

This bundle is grounded in **two different source layers**:

1. **Your own product logic** from the uploaded API / pipeline files.
2. **Official chain documentation** used to improve chain-specific explanatory copy.

## 1. Product-specific semantics taken from your own uploaded code

### Regime engine
From `api/regime_engine.py`:

- BTC profile uses:
  - demand metrics: `tx_count_daily`, `unique_active_addresses`
  - friction metrics: `median_tx_fee_native`
  - capacity metrics: `avg_block_time_sec`
- ETH L1 profile uses:
  - demand metrics: `tx_count_daily`, `unique_active_addresses`
  - friction metrics: `median_tx_fee_native`, `failed_tx_rate`
  - capacity metrics: `gas_utilization_pct`, `avg_block_time_sec`
- L2 profile uses:
  - demand metrics: `tx_count_daily`, `unique_active_addresses`
  - friction metrics: `median_tx_fee_native`, `failed_tx_rate`
  - capacity metrics: `capacity_util_pct`, `avg_block_time_sec`

### Regime rules
From `api/regime_engine.py`:

- `CONGESTED` when capacity is `EXTREME_HIGH`, or capacity is `HIGH` and friction is also `HIGH`
- `CHEAP` when friction is `LOW` and capacity is `LOW`
- `HEATING` when demand is `HIGH` and at least one of demand / friction / capacity has `HEATING` trend
- otherwise `STABLE`
- if confidence is below threshold, regime is overridden to `UNKNOWN/DEGRADED`

### Driver ranking
From `api/regime_engine.py`:

- driver rows are filtered so they broadly agree with the current regime
- then ranked by a weighted driver score using robust z-score, percentile distance from neutral, and momentum magnitude
- the UI currently shows only the strongest few published drivers, not the entire candidate universe

### Scorecard semantics
From `api/market_scorecard.py`:

- score scale is `0..100`
- `50` is neutral vs the chain's own history
- the raw score mapping is bounded using a tanh transform
- low confidence and weak coverage shrink axis scores back toward 50
- `coverage_factor` and `effective_confidence` are not decorative; they materially affect how aggressive the displayed score is allowed to be

### Confidence semantics
From uploaded patched `main.py` and earlier debug flow:

- confidence is now an **evidence sufficiency score**, not a forecast confidence score
- it is used as a gating layer for whether the regime should be treated normally or as `UNKNOWN/DEGRADED`
- the `0.40` threshold is therefore a **publish / interpretation floor**, not a price or predictive threshold

## 2. Official chain documentation used for chain-specific copy

### Bitcoin
Used for:
- peer-to-peer / electronic cash framing,
- UTXO semantics,
- fee and confirmation dynamics,
- block-space competition.

Official sources consulted:
- bitcoin whitepaper on bitcoin.org
- Bitcoin Developer Guide on transactions and payment processing

### Ethereum
Used for:
- gas / block-gas framing,
- block size and block time semantics,
- EIP-1559 fee behavior.

Official sources consulted:
- ethereum.org blocks docs
- ethereum.org gas docs
- EIP-1559 specification

### Arbitrum
Used for:
- sequencer / delayed inbox framing,
- L2 / parent-chain settlement explanation,
- two-part or parent-chain-sensitive fee mechanics.

Official sources consulted:
- Arbitrum docs on transaction lifecycle
- Arbitrum docs on fees / Ethereum comparison

### Base
Used for:
- L2 execution + L1 security fee explanation,
- OP Stack / Ethereum-settlement framing,
- why Base fees respond both to local activity and parent-chain publishing costs.

Official sources consulted:
- Base docs on network fees
- Base docs on network information / differences from Ethereum

## What this means for the patch

The goal is **not** to turn the chain page into a giant wall of text.
The goal is to:

- keep the first view readable,
- expose short explanatory sentences immediately,
- hide the deeper material behind expandable controls,
- make Basic genuinely beginner-friendly,
- make Advanced genuinely methodical.
