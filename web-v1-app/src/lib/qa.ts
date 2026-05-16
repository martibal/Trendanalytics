
export type QaCategory =
  | "Fundamentals"
  | "Classification"
  | "Confidence"
  | "Data and Metrics"
  | "JSON and Subscription"
  | "Trust and Traceability"
  | "Advanced";

export type QaEntry = {
  id: string;
  category: QaCategory;
  question: string;
  basic: string[];
  advanced: string[];
};

export const qaCategories: { key: QaCategory; label: string }[] = [
  { key: "Fundamentals", label: "Fundamentals" },
  { key: "Classification", label: "Classification" },
  { key: "Confidence", label: "Confidence" },
  { key: "Data and Metrics", label: "Data and Metrics" },
  { key: "JSON and Subscription", label: "JSON and Subscription" },
  { key: "Trust and Traceability", label: "Trust and Traceability" },
  { key: "Advanced", label: "Advanced" },
] as const;

export const qaEntries: QaEntry[] = [
  {
    id: "what-product-does",
    category: "Fundamentals",
    question: "What does this product actually do?",
    basic: [
      "Urd Atlas reads raw blockchain data every day, runs it through a calculation pipeline, and publishes an answer to one question: does this chain still look normal, or is something meaningfully changing?",
      "The answer is published as on-chain reference data: a regime label, a confidence score, and a short explanation of which metrics are doing the explanatory work. You can read the web surface for free or subscribe to the reference data JSON for direct downstream use.",
    ],
    advanced: [
      "The product is a deterministic on-chain reference data layer built on top of AWS Public Blockchain Data. It aggregates daily chain data, normalizes it with robust z-score logic, calculates evidence sufficiency, and publishes Gold, Derived, Meta, and Briefs reference data JSON.",
      "Meta contains the main analytical output: status.label, confidence, scorecard dimensions, drivers, and traceability fields. The design goal is reproducible descriptive context, not forecasting or recommendations.",
    ],
  },
  {
    id: "what-know-beyond-raw-data",
    category: "Fundamentals",
    question: "What do you know that is not already visible in raw data?",
    basic: [
      "Raw data gives you numbers. It does not tell you whether those numbers are high, low, normal, or important for that specific chain right now.",
      "Urd Atlas adds that reference context by comparing the latest data to the chain's own recent history and deciding whether the move is meaningful enough to count as a regime state rather than noise.",
    ],
    advanced: [
      "The additional layer is chain-relative normalization, confidence gating, and deterministic classification. Absolute values alone do not tell you whether a move is unusual for Bitcoin, Ethereum, Arbitrum, or Base.",
      "Urd Atlas adds robust baseline comparison, evidence quality scoring, and a rule-based mapping from multidimensional on-chain signals into a stable published state variable.",
    ],
  },
  {
    id: "what-not-free-elsewhere",
    category: "Fundamentals",
    question: "What do I get here that I cannot already get for free elsewhere?",
    basic: [
      "You can read raw chain data for free in explorers and dashboards. What you usually do not get is a daily, documented answer to whether the current move still looks like noise or has become structural.",
      "You also usually do not get that answer as reusable on-chain reference data that can go straight into your own notebooks, dashboards, filters, or models.",
    ],
    advanced: [
      "The free alternative is to pull AWS Public Blockchain Data yourself, write the aggregation logic, normalize it correctly per chain, implement confidence gating, version the artifacts, and keep the whole pipeline maintained.",
      "Urd Atlas packages that work into documented Gold, Derived, Meta, and Briefs reference layers so the user consumes stateful, chain-relative reference data instead of rebuilding the full stack from public source data.",
    ],
  },
  {
    id: "what-is-noise",
    category: "Classification",
    question: "What does noise mean here?",
    basic: [
      "Noise is short-lived movement in on-chain data that looks dramatic in the moment but does not last and does not represent a lasting change in the chain's state.",
      "A one-day spike in fees or activity is often noise. A persistent, multi-metric move that keeps showing up after aggregation is something else.",
    ],
    advanced: [
      "Operationally, noise is an observed deviation that fails to become a published state change. That can happen because the move is too small, too short-lived, too narrow across metrics, or too weak to survive the confidence gate.",
      "The system is explicitly designed so a single-day anomaly does not automatically become a named regime. MA7 versus MA30 and the axis rules exist to keep one-off volatility from being over-interpreted.",
    ],
  },
  {
    id: "what-is-regime-change",
    category: "Classification",
    question: "What is a real regime change?",
    basic: [
      "A real regime change is a persistent shift in the chain's descriptive state. It is not just one unusual print; it is a situation where demand, friction, or capacity has changed enough, and long enough, to justify a named published state.",
      "That is why the product talks about regime labels rather than isolated spikes. The goal is to describe state, not excitement.",
    ],
    advanced: [
      "A regime change is a label change driven by genuine changes in the relevant state dimensions. In this model those are Demand, Friction, and Capacity, expressed as banded and trend-aware signals rather than raw values.",
      "HEATING, CONGESTED, CHEAP, and STABLE are all outputs of a deterministic rule-tree. A move counts as structural when it is strong enough and coherent enough across those dimensions to satisfy the publishable rule conditions.",
    ],
  },
  {
    id: "spike-vs-change",
    category: "Classification",
    question: "What is the difference between a spike and a real change?",
    basic: [
      "A spike is a short shock in the daily data. A real change is something that remains visible after the data is smoothed and compared with the chain's own recent baseline.",
      "The system is tuned to avoid overreacting to a single day. It needs enough persistence to treat a move as more than transient disturbance.",
    ],
    advanced: [
      "Technically, the system relies on persistence signals such as MA7 versus MA30 and momentum in standardized space. A one-day spike often does not move the short window enough to satisfy the regime criteria.",
      "A real change accumulates. It survives aggregation, remains visible after baseline comparison, and pushes the relevant axes into stable enough bands to support a named label.",
    ],
  },
  {
    id: "what-is-regime",
    category: "Classification",
    question: "What does regime mean in practice?",
    basic: [
      "Regime is a compact description of the chain's current operating state relative to its own recent history. It is not a prediction, a valuation, or a recommendation.",
      "The practical point is to replace dozens of raw metrics with one consistent descriptive answer plus the evidence behind it.",
    ],
    advanced: [
      "Regime is the output of the deterministic rule engine operating on normalized metrics and axis state. It is not an ML label and not a probabilistic forecast.",
      "The published regime is equivalent to status.label in Meta and exists as a descriptive state variable anchored to documented thresholds, rule ordering, and chain-specific input profiles.",
    ],
  },
  {
    id: "descriptive-state",
    category: "Classification",
    question: "What does it mean that the label is a descriptive state?",
    basic: [
      "It means the product describes what is happening now rather than what will happen next. A state label tells you how the chain looks, not what price will do.",
      "That matters because many analytics products blur description and prediction. Urd Atlas does not.",
    ],
    advanced: [
      "Descriptive state is an explicit epistemic boundary. The system publishes current-state classification under the semantics of evidence sufficiency as of the observation date.",
      "It does not publish causal claims, expected returns, or policy guidance. This separation is deliberate and is enforced in the data contract, not just the marketing copy.",
    ],
  },
  {
    id: "label-meanings",
    category: "Classification",
    question: "What do STABLE, HEATING, CONGESTED, CHEAP, and UNKNOWN/DEGRADED actually mean?",
    basic: [
      "STABLE means the chain looks close to its normal recent operating range. HEATING means pressure is building. CONGESTED means conditions look materially tighter or costlier than usual. CHEAP means conditions look looser or cheaper than usual.",
      "UNKNOWN/DEGRADED means the system has decided not to publish a normal-confidence label because the evidence base is too weak.",
    ],
    advanced: [
      "These labels are outputs of a deterministic rule hierarchy. CONGESTED is evaluated before CHEAP, CHEAP before HEATING, and STABLE is the residual state when the higher-priority conditions do not fire.",
      "UNKNOWN/DEGRADED is not just another regime; it is the confidence-gated fallback when evidence quality falls below threshold.",
    ],
  },
  {
    id: "why-degraded",
    category: "Confidence",
    question: "Why does a chain sometimes become UNKNOWN/DEGRADED?",
    basic: [
      "Because the product would rather say 'not enough evidence' than publish a confident-sounding answer built on weak data.",
      "Typical reasons are missing fields, thin recent density, insufficient history, or other quality problems in the available artifact set.",
    ],
    advanced: [
      "A chain is gated when confidence_score drops below the publication threshold. In this system confidence is driven by metric coverage, recent density, and history depth.",
      "Low confidence pulls the scorecard toward neutral and suppresses the normal label. The degraded label is therefore an explicit honesty mechanism rather than a system failure.",
    ],
  },
  {
    id: "what-is-confidence",
    category: "Confidence",
    question: "What does confidence mean?",
    basic: [
      "Confidence is a 0 to 1 measure of how well-supported the published reading is by the available data. Higher means stronger evidence quality. Lower means the evidence base is weaker.",
      "It is not the probability that the label is correct. It is a quality score for the evidence behind the label.",
    ],
    advanced: [
      "Confidence is evidence sufficiency as of the published date. It reflects coverage, density, and available history, and it acts as a gate on whether a named regime should be published at all.",
      "It is separate from interpretive usefulness and separate from any notion of predictive confidence. It is a controlled quality measure on the current analytical context.",
    ],
  },
  {
    id: "interpret-confidence-values",
    category: "Confidence",
    question: "What does a confidence like 0.675 or 0.847 mean in practice?",
    basic: [
      "A score like 0.847 means the current row is backed by relatively complete, recent, and historically sufficient data. A score like 0.675 still clears the gate, but the evidence is weaker and should be read a bit more carefully.",
      "Below 0.40 the product stops publishing a normal regime label and switches to UNKNOWN/DEGRADED.",
    ],
    advanced: [
      "These numbers reflect the weighted combination of the confidence components. A higher score lets the state read more assertively; a lower score drags scorecard values back toward neutral and signals weaker evidence support.",
      "The number is therefore operational: it changes both whether the label is publishable and how aggressively the evidence should be interpreted downstream.",
    ],
  },
  {
    id: "clear-the-gate",
    category: "Confidence",
    question: "What does it mean that confidence must clear the gate?",
    basic: [
      "It means the product has a minimum evidence threshold for publishing a named regime. If the row does not clear that bar, the product withholds the label instead of pretending the answer is reliable.",
    ],
    advanced: [
      "The gate is evaluated after the row's underlying analytical state has been computed. If confidence_score is below the configured threshold, the normal label is overridden to UNKNOWN/DEGRADED.",
      "This prevents weak or incomplete rows from being read as equally trustworthy state transitions.",
    ],
  },
  {
    id: "why-threshold-040",
    category: "Confidence",
    question: "Why is the confidence threshold 0.40?",
    basic: [
      "Because the product needs a documented minimum evidence level before it will publish a normal label. Under that level the safer answer is to degrade rather than guess.",
    ],
    advanced: [
      "0.40 is a documented product threshold, not a mystical optimum. It is a conservative operational choice: low enough to keep the product usable, high enough to stop obviously weak evidence from being treated as normal state output.",
      "The important point is that the threshold is explicit, consistent, and exposed to the user rather than hidden inside opaque model behavior.",
    ],
  },
  {
    id: "what-data-used",
    category: "Data and Metrics",
    question: "What data do you use?",
    basic: [
      "The product uses public on-chain transaction and block data from AWS Public Blockchain Data for Bitcoin, Ethereum, Arbitrum, and Base.",
      "Urd Atlas does not claim to own the raw data. The value is in the aggregation, normalization, confidence gating, and artifact publishing layer built on top of it.",
    ],
    advanced: [
      "The core Gold layer is made from canonical daily aggregates such as tx_count_daily, block_count_daily, value_transferred_native, median_tx_value_native, median_tx_fee_native, failed_tx_rate, gas_utilization_pct, unique_active_addresses, and avg_block_time_sec.",
      "Chain-specific profiles determine which fields exist and which fields meaningfully participate in regime computation.",
    ],
  },

    {
    id: "when-does-data-update",
    category: "JSON and Subscription",
    question: "When does the data usually update?",
    basic: [
      "Urd Atlas is generally scheduled to publish updated artifacts around 09:00 and 21:00 Europe/Oslo.",
      "These are expected refresh windows, not guaranteed timestamps. Actual availability can move slightly because of upstream source delays, chain-specific lag, or processing time.",
    ],
    advanced: [
      "Operationally, the pipeline is scheduled to run twice daily, around 09:00 and 21:00 Europe/Oslo. Those windows describe the intended publication rhythm rather than a hard real-time guarantee.",
      "Bitcoin and Ethereum are normally expected to update on a tighter cadence than Arbitrum and Base, which use a different lag policy by design. The Status page should be treated as the authoritative view of current freshness.",
    ],
  },


  {
    id: "what-is-baseline",
    category: "Data and Metrics",
    question: "What is the baseline you compare against?",
    basic: [
      "Baseline means the chain's own recent history. The product does not compare Bitcoin to Ethereum or compare today's numbers to some universal market norm.",
      "It asks whether the current readings are unusual for this chain relative to what has recently been normal for that same chain.",
    ],
    advanced: [
      "The system uses rolling historical windows rather than a fixed benchmark. In the regime logic, robust z-scores are computed against a chain-relative 180-day baseline and percentile ranks against a 90-day window.",
      "That makes 'normal' dynamic and chain-specific rather than absolute or cross-chain.",
    ],
  },
  {
    id: "what-compare-today-to",
    category: "Data and Metrics",
    question: "What are today's numbers actually compared against?",
    basic: [
      "Today's values are compared against the same chain's own recent historical distribution. The point is to know whether the current move is unusual for that chain, not whether it is large in the abstract.",
    ],
    advanced: [
      "The regime engine uses robust z-score logic over chain-local history and percentile context over a rolling recent window. The scorecard layer uses its own longer baseline. Both are chain-relative and update as history grows.",
    ],
  },
  {
    id: "same-window-all-chains",
    category: "Data and Metrics",
    question: "Do all chains use the same baseline windows?",
    basic: [
      "The window lengths are the same, but the data inside them is chain-specific. Bitcoin is compared to Bitcoin history, Ethereum to Ethereum history, and so on.",
    ],
    advanced: [
      "Yes, the code uses shared window parameters, but the actual distributions differ because each chain has different data, different missingness patterns, and different metric semantics. Same window length does not mean same baseline behavior.",
    ],
  },
  {
    id: "why-btc-eth-not-same",
    category: "Data and Metrics",
    question: "Why can Bitcoin and Ethereum not be evaluated in exactly the same way?",
    basic: [
      "Because they are not the same kind of system. Ethereum has gas utilization and failed transactions in a way Bitcoin does not. Bitcoin has different capacity and fee mechanics.",
      "A good product should not pretend those differences do not exist.",
    ],
    advanced: [
      "The regime engine uses explicit chain profiles. BTC, ETH L1, and L2s do not share identical metric surfaces, so their demand, friction, and capacity inputs are not identical either.",
      "Profile-awareness is one of the reasons the product is more than a thin wrapper over generic raw data.",
    ],
  },
  {
    id: "robust-zscore-mad",
    category: "Data and Metrics",
    question: "What is a robust z-score, and why use MAD?",
    basic: [
      "Normal z-scores get distorted by extreme outliers. On-chain data has a lot of those. A robust z-score uses the median and median absolute deviation so a single whale day or fee shock does not bend the whole baseline out of shape.",
    ],
    advanced: [
      "The robust z-score is based on MAD rather than mean and standard deviation because on-chain distributions are heavy-tailed and asymmetric. MAD-based normalization keeps the baseline interpretable even when the raw series includes violent spikes.",
      "This is one of the core technical choices that makes the labels more stable and more credible.",
    ],
  },
  {
    id: "coverage-factor",
    category: "Data and Metrics",
    question: "What does coverage_factor mean?",
    basic: [
      "Coverage factor tells you how much of the expected evidence was actually present for that dimension. If too much data is missing, the score is pulled back toward neutral.",
    ],
    advanced: [
      "It is the ratio of available components to expected components for a given axis. That factor is multiplied by confidence to produce effective_confidence, which then controls how far the axis score is allowed to move away from 50.",
    ],
  },
  {
    id: "gold-meta-derived-difference",
    category: "JSON and Subscription",
    question: "What is the difference between Gold, Derived, Meta, and Briefs?",
    basic: [
      "Gold is the raw daily observation layer. Meta is the analytical interpretation layer. Derived is the smoothed trend layer built from Gold.",
      "Together they give you raw facts, the model's reading, and trend context in a reusable JSON format.",
    ],
    advanced: [
      "Gold contains the canonical aggregated daily metrics. Meta contains the regime label, confidence, scorecard, drivers, and traceability fields. Derived contains MA7 and MA30 style rolling context derived from Gold plus confidence overlay support.",
      "Meta is the commercial heart of the product, while Gold and Derived make the interpretation verifiable and operationally useful.",
    ],
  },
  {
    id: "which-json-buying",
    category: "JSON and Subscription",
    question: "Which JSON file am I really paying for?",
    basic: [
      "Mostly Meta. That is where the actual analytical output lives. Gold and Derived matter because they let you verify, compare, and build around the same state layer.",
    ],
    advanced: [
      "The subscription gives access to Gold, Derived, Meta, and Briefs. Meta is where the expensive analytical work is compressed into a reusable artifact; Briefs turn that context into a short readable JSON summary. Gold and Derived make it possible to audit and extend the output rather than blindly trusting it.",
    ],
  },
  {
    id: "label-vs-scorecard",
    category: "JSON and Subscription",
    question: "What is the difference between a label and a scorecard dimension?",
    basic: [
      "The label is the short answer. The scorecard dimensions are the structured explanation of what is driving that answer.",
      "If the label says HEATING, the scorecard helps you see whether it is mostly demand, friction, or capacity pressure doing the work.",
    ],
    advanced: [
      "The regime label is a discrete rule-engine output. The scorecard is a separate continuous representation of the same state space, expressed across Demand, Friction, and Capacity with axis-specific confidence adjustment.",
    ],
  },
  {
    id: "meta-value-vs-build-yourself",
    category: "JSON and Subscription",
    question: "What is the real value of Meta compared with building it myself from Gold?",
    basic: [
      "Meta saves you from implementing the difficult middle layer yourself: normalization, confidence, score construction, and explainable driver output.",
    ],
    advanced: [
      "Meta replaces a meaningful amount of engineering and analytical maintenance: robust baseline logic, chain-aware feature handling, confidence gating, scorecard degradation, driver ranking, and traceable publishing. That is the paid product's main time-saving function.",
    ],
  },
  {
    id: "derived-only-ma7-ma30",
    category: "JSON and Subscription",
    question: "Is Derived only MA7 and MA30, or is there more?",
    basic: [
      "In the current version, Derived is primarily rolling trend context built from Gold plus a confidence carry-through field useful for chart overlays.",
    ],
    advanced: [
      "The current Derived layer focuses on MA7 and MA30 because they are easy to verify independently and because they align with the model's broader persistence logic. It is intentionally limited rather than overloaded with arbitrary transforms.",
    ],
  },
  {
    id: "why-ma7-ma30",
    category: "JSON and Subscription",
    question: "Why MA7 and MA30 specifically?",
    basic: [
      "Seven days is long enough to reduce single-day noise but short enough to react to actual change. Thirty days gives a broader medium-term reference.",
    ],
    advanced: [
      "The pairing gives a practical persistence filter. MA7 reacts, MA30 stabilizes, and their relationship is a natural way to separate short disturbance from more structural movement without turning the product into a forecasting engine.",
    ],
  },
  {
    id: "basic-vs-free",
    category: "JSON and Subscription",
    question: "What do I get in Single Chain that I do not already get for free?",
    basic: [
      "The free surface lets you inspect the published state. Single Chain gives you the actual reference data JSON for one chain so you can use it in your own tools and models.",
    ],
    advanced: [
      "Single Chain unlocks authenticated API access to Gold, Derived, Meta, and Briefs for one chain across the supported windows. The public site is the readable inspection layer; Single Chain is the programmatic reference data layer.",
    ],
  },
  {
    id: "pro-vs-basic",
    category: "JSON and Subscription",
    question: "What do I get in Research that I do not get in Single Chain?",
    basic: [
      "Research expands from one chain to all four and gives you a deeper history window. It is for users who need cross-chain context or broader research coverage.",
    ],
    advanced: [
      "Research gives broader chain entitlement, longer historical windows, and a more natural setup for cross-chain or research-heavy workflows. It is the package most serious users will see as the actual product rather than the entry tier.",
    ],
  },
  {
    id: "why-pay-if-free-site",
    category: "JSON and Subscription",
    question: "Why pay if the site already shows so much for free?",
    basic: [
      "Because the site is for reading and inspecting. The subscription is for using the artifacts directly in your own workflow.",
    ],
    advanced: [
      "The public site and the subscriber API are built on the same published reference data, but only the subscription exposes the raw machine-readable JSON as a stable downstream interface. That is the qualitative difference, not just more text or more charts.",
    ],
  },
  {
    id: "not-a-price-product",
    category: "JSON and Subscription",
    question: "What does it mean that this is not a price product?",
    basic: [
      "It means the product does not tell you what price will do and does not use price data in its core labels. It describes network conditions, not market direction.",
    ],
    advanced: [
      "The product deliberately limits itself to operational on-chain state. Inputs are chain metrics, not returns, order books, or sentiment. Any user who wants to connect this output to price must do that separately and under their own methodology.",
    ],
  },
  {
    id: "what-use-this-for",
    category: "Fundamentals",
    question: "What should I actually use this for?",
    basic: [
      "Use it when you need structured context on whether current on-chain conditions still look normal, are heating up, are congested, or are unusually cheap.",
      "It is especially useful when you do not want to build the whole data and interpretation layer yourself.",
    ],
    advanced: [
      "Natural uses include regime-conditioned research, confidence-aware filtering, independent sanity checks on your own observations, and direct feature input into notebooks or internal systems.",
    ],
  },
  {
    id: "who-is-it-for",
    category: "Fundamentals",
    question: "Is this for investors, developers, or researchers?",
    basic: [
      "Primarily for analytically oriented users who are comfortable with data and want reusable on-chain reference data JSON, not just visual dashboards.",
    ],
    advanced: [
      "The product fits three core groups: quantitative investors, research-oriented on-chain users, and developers who want chain-state artifacts without owning the entire ingestion and normalization stack.",
    ],
  },
  {
    id: "need-to-code",
    category: "Fundamentals",
    question: "Do I need to know how to code to get value from this?",
    basic: [
      "No for the public site. Yes, at least a little, if you want to get the full value from the subscriber reference data JSON.",
    ],
    advanced: [
      "The website itself is readable without code. The API product is designed for programmatic use, so some ability to make authenticated requests and parse JSON is expected for subscriber workflows.",
    ],
  },
  {
    id: "determinism-hash",
    category: "Trust and Traceability",
    question: "What is the determinism hash?",
    basic: [
      "It is a fingerprint of the published analytical row. It exists so the output can be checked for reproducibility rather than treated as a soft editorial opinion.",
    ],
    advanced: [
      "The determinism hash is a truncated hash of a canonicalized payload including the state output and its supporting structure. If the inputs and methodology are the same, the hash should remain the same. That is what makes the publication auditable.",
    ],
  },
  {
    id: "revision-id",
    category: "Trust and Traceability",
    question: "What is revision_id?",
    basic: [
      "It is a traceability field that helps identify a specific published historical row or revision context.",
    ],
    advanced: [
      "revision_id is intended as a stable row-level traceability identifier for historical artifacts. It is useful for auditability and for understanding whether a historical row is the same publication object across rebuilds.",
    ],
  },
  {
    id: "can-change-old-labels",
    category: "Trust and Traceability",
    question: "Can you change old labels in hindsight?",
    basic: [
      "Corrections are possible in principle, but the product is designed so that changes are not silent. Versioning and traceability exist precisely so users can detect meaningful changes over time.",
    ],
    advanced: [
      "Historical artifacts can be rebuilt, but reproducibility and versioning make silent retroactive changes visible. If methodology changes, that should be observable through methodology version and associated traceability fields.",
    ],
  },
  {
    id: "why-trust-track-record",
    category: "Trust and Traceability",
    question: "Why should I trust the Track Record page?",
    basic: [
      "Because it is meant to show what the system actually published, including weak-evidence days, not just the days that make the product look good.",
    ],
    advanced: [
      "Track Record is useful because it reads from the same published artifact family as the rest of the product. It is not intended as reconstructed narrative; it is intended as an inspectable record of the published state surface over time.",
    ],
  },
  {
    id: "why-status-page",
    category: "Trust and Traceability",
    question: "Why is there a Status page?",
    basic: [
      "Because a chain-state product should show whether its own published rows are fresh enough and trustworthy enough to read with confidence.",
    ],
    advanced: [
      "Status exposes freshness and confidence as separate operational dimensions. That is important because a row can be timely but weakly supported, or delayed but still interpretable with the proper caution.",
    ],
  },
  {
    id: "why-l2-lag",
    category: "Trust and Traceability",
    question: "Why do Arbitrum and Base have a seven-day lag policy?",
    basic: [
      "Because the product treats those chains with a different freshness policy rather than pretending their source data behaves exactly like L1 data.",
    ],
    advanced: [
      "The L2 lag policy is an explicit operational choice tied to source behavior and robustness tradeoffs. The point is to publish trustworthy artifacts consistently rather than force lower-quality daily artifacts where the source pipeline is less stable.",
    ],
  },
  {
    id: "rule-based-or-hybrid",
    category: "Advanced",
    question: "Is the regime engine rule-based, score-based, or hybrid?",
    basic: [
      "At a high level, the final regime label is rule-based. The underlying evidence layers include scores and normalized signals, but the published label is produced by deterministic rules rather than a black-box model.",
    ],
    advanced: [
      "The regime label is generated by a deterministic rule tree. The scorecard is a separate continuous layer. The system is therefore best understood as a rule-based classifier supported by standardized and scored evidence, not as an ML model.",
    ],
  },
  {
    id: "drivers-ranking",
    category: "Advanced",
    question: "Are drivers explanatory ranking, feature importance, or just surfacing?",
    basic: [
      "They are a ranked explanation layer: the product is surfacing the metrics that most help explain the current published reading.",
    ],
    advanced: [
      "Drivers are deterministic explanatory ranking, not statistical feature importance in the machine-learning sense. They are ranked from the available evidence surface and filtered for consistency with the published state.",
    ],
  },
  {
    id: "drivers-empty",
    category: "Advanced",
    question: "What does it mean if drivers[] is empty?",
    basic: [
      "It usually means the product did not have strong enough or coherent enough evidence to surface meaningful drivers for that row.",
    ],
    advanced: [
      "An empty drivers array is informative. It often reflects weak evidence, gating behavior, or missingness in the upstream metrics rather than a UI error.",
    ],
  },
  {
    id: "what-happens-over-under-gate",
    category: "Advanced",
    question: "What happens above and below the 0.40 gate in pipeline terms?",
    basic: [
      "Above the gate, the product publishes a normal named regime when the rule conditions are met. Below the gate, it withholds the normal label and publishes UNKNOWN/DEGRADED instead.",
    ],
    advanced: [
      "Above threshold the normal label, scorecard, and traceability fields are published as usual. Below threshold the row is gated, the descriptive state is degraded, and the row should be interpreted as insufficiently supported rather than normally classified.",
    ],
  },
  {
    id: "hash-contents",
    category: "Advanced",
    question: "What goes into determinism_hash?",
    basic: [
      "The hash is built from the key state output and the information needed to reproduce it consistently.",
    ],
    advanced: [
      "It is generated from a canonicalized payload containing the state result and its supporting identity fields. The important property is determinism: same inputs and same methodology should yield the same hash.",
    ],
  },
  {
    id: "thin-wrapper-argument",
    category: "Advanced",
    question: "What is the strongest argument that this is not just a thin wrapper over public data?",
    basic: [
      "Because the product does the hard part between raw data and usable state: aggregation, normalization, confidence gating, explanatory ranking, and artifact publishing.",
    ],
    advanced: [
      "The real value is the chain-aware analytical middle layer: robust baseline logic, axis construction, confidence gating, deterministic driver ranking, artifact versioning, and trackable publication. Public raw data does not arrive with any of that solved.",
    ],
  },
  {
    id: "meta-assumptions",
    category: "Advanced",
    question: "What are the main modeling assumptions I inherit if I use Meta directly?",
    basic: [
      "You are accepting the product's definitions of baseline, persistence, confidence, and regime thresholds instead of defining all of those yourself.",
    ],
    advanced: [
      "The largest inherited assumptions are the rolling baseline windows, the MAD-based standardization choice, the confidence-gate threshold, the persistence logic, and the chain-specific metric profiles. Meta is valuable because those assumptions are explicit rather than hidden.",
    ],
  },
  {
    id: "how-much-history-needed",
    category: "Advanced",
    question: "How much history do I need before the product becomes genuinely useful?",
    basic: [
      "Ninety days is enough for immediate context. A year or more becomes much more useful for serious historical analysis and regime-conditioned research.",
    ],
    advanced: [
      "Short history can support day-to-day reading, but deeper history is better for stable percentiles, stronger baselines, and meaningful backtesting of regime-conditioned logic. That is why the deeper paid history matters for advanced users.",
    ],
  },
];
