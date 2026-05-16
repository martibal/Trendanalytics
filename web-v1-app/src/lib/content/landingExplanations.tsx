import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Shared types (mirrors pageExplanations.tsx contract)
// ---------------------------------------------------------------------------

export type ExplainContent = {
  title: string;
  subtitle?: ReactNode;
  basic: ReactNode;
  advanced: ReactNode;
  traceability?: ReactNode;
};

function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 text-xs">{children}</code>;
}

// ---------------------------------------------------------------------------
// What is Urd Atlas
// ---------------------------------------------------------------------------

export function whatIsUrdAtlasExplanation(): ExplainContent {
  return {
    title: "What is Urd Atlas?",
    subtitle: "The product in plain language.",
    basic: (
      <>
        <p>
          Blockchains are public networks where anyone can send transactions. But like any network,
          they are not always in the same condition. Sometimes they are quiet and cheap to use.
          Sometimes they are busy and expensive. Sometimes they are somewhere in between.
        </p>
        <p className="mt-3">
          Urd Atlas watches four blockchain networks — Bitcoin, Ethereum, Arbitrum, and Base —
          and publishes a daily description of what kind of condition each one is in. Not a
          prediction of what will happen next. Not a trading signal. Just a clear, documented answer
          to one question: <span className="font-medium text-white">is what I am seeing right now
          a real shift, or just noise?</span>
        </p>
        <p className="mt-3">
          Every number on this site comes from publicly available blockchain data and is produced by
          a documented, repeatable method. Nothing is hidden and nothing is improvised. If you want
          to understand how a number was calculated, you can follow it all the way back to the raw
          data.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          Urd Atlas is a deterministic on-chain context layer. It produces daily regime
          classifications for four chains (Bitcoin, Ethereum, Arbitrum, Base) using a
          reproducible pipeline over AWS Public Blockchain Data. The primary analytical deliverable
          is a published meta layer containing: a regime label drawn from a finite state vocabulary
          (STABLE, HEATING, CONGESTED, CHEAP, UNKNOWN/DEGRADED), a three-axis scorecard
          (Demand, Friction, Capacity), a ranked driver set, and a confidence score that gates
          publication eligibility.
        </p>
        <p className="mt-3">
          The design philosophy is epistemic conservatism. The system never produces price data,
          forecasts, or advisory outputs. Every published field is anchored to a determinism hash
          and a methodology version, enabling full reproducibility auditing. The confidence gate
          (default 0.40) enforces that UNKNOWN/DEGRADED is shown when evidence is insufficient
          rather than publishing a spurious named regime.
        </p>
        <p className="mt-3">
          The intended audience is capital allocators and analysts who need persistent structural
          context rather than intraday signal. The product&apos;s comparative advantage is
          methodological transparency: the MAD-based robust z-score, percentile rank, and momentum
          decomposition are fully documented and the canonical threshold parameters are published
          and versioned.
        </p>
      </>
    ),
  };
}

// ---------------------------------------------------------------------------
// Who this is for — extended (drives #who-this-is-for-modal)
// ---------------------------------------------------------------------------

export function whoThisIsForExplanation(): ExplainContent {
  return {
    title: "Who this is for",
    subtitle:
      "Three working roles, each with a different reason to want a documented on-chain state on every row of their workflow.",
    basic: (
      <>
        <p>
          Crypto markets move for reasons that are not always visible in the price. Two days can
          show the same price move and yet be driven by completely different conditions on the
          underlying network — how busy it is, how expensive it is to use, how close it is to
          capacity. Urd Atlas measures those conditions every day and gives the day a name:{" "}
          <span className="font-medium text-white">STABLE</span>,{" "}
          <span className="font-medium text-white">HEATING</span>,{" "}
          <span className="font-medium text-white">CONGESTED</span>,{" "}
          <span className="font-medium text-white">CHEAP</span>, or{" "}
          <span className="font-medium text-white">UNKNOWN/DEGRADED</span> when the data is not
          good enough to publish a confident label.
        </p>

        <p className="mt-4 font-medium text-white">Traders use this to test their own strategies.</p>
        <p className="mt-2">
          A strategy that is profitable on average can still lose money systematically in specific
          market conditions. With a regime label on every day, a backtest can be split by
          condition. The strategy is not judged by its average — it is judged by where the average
          actually comes from.
        </p>

        <p className="mt-4 font-medium text-white">Analysts use this to write concrete notes.</p>
        <p className="mt-2">
          Daily and weekly market notes need specific language about on-chain conditions. &ldquo;Activity
          has been elevated&rdquo; is not verifiable. A named state with a dated row, a confidence score,
          and a ranked driver set is. The analyst writes from data, not from impression.
        </p>

        <p className="mt-4 font-medium text-white">
          Risk and compliance use this to defend past decisions.
        </p>
        <p className="mt-2">
          Every published row carries a determinism hash — a fingerprint that proves a particular
          classification was published on a particular date and has not been rewritten. Citing the
          hash in a post-mortem, an LP letter, or an audit closes the loop between what was seen at
          the time and what is being defended now.
        </p>

        <p className="mt-5 text-slate-400">
          This is not for retail looking for buy and sell signals, and not for teams that already
          run a trusted internal regime model.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The intended audience is professional readers who already operate their own analytical
          stack and need a deterministic, externally-published on-chain context variable to join
          against it. Urd Atlas is positioned upstream of analysis, not as analysis itself.
        </p>

        <p className="mt-4 font-medium text-white">Quantitative and systematic desks.</p>
        <p className="mt-2">
          The published meta layer functions as a categorical regime feature on a daily index. It
          can be used directly as a conditioning variable in a regime-switching model, as a filter
          for sample selection, or as a stratification key for performance attribution. The
          categorical state space is finite and stable across methodology versions, with explicit
          versioning of the ruleset (e.g.{" "}
          <InlineCode>regime.ruleset_id = &quot;eth_l1_v1&quot;</InlineCode>) so feature drift is
          traceable.
        </p>

        <p className="mt-4 font-medium text-white">Research and analyst desks.</p>
        <p className="mt-2">
          The driver decomposition (<InlineCode>demand</InlineCode>,{" "}
          <InlineCode>friction</InlineCode>, <InlineCode>capacity</InlineCode>) carries per-axis
          MAD-based robust z-scores, 90-day percentile ranks, and 7d-vs-30d momentum, exposing not
          only the label but the evidence behind it. This is what allows a written narrative to
          cite a specific axis and a specific historical position rather than gestural language.
        </p>

        <p className="mt-4 font-medium text-white">Risk, valuation, and compliance functions.</p>
        <p className="mt-2">
          Each row exposes a <InlineCode>determinism_hash</InlineCode>, a{" "}
          <InlineCode>methodology_version</InlineCode>, and the publication confidence band the row
          fell into at the time of publishing. Together these provide reproducibility guarantees
          adequate for regulator-readable documentation, LP reporting, and post-mortem
          reconstruction. Weak evidence degrades to <InlineCode>UNKNOWN/DEGRADED</InlineCode>{" "}
          rather than being smoothed into a named regime, which is the relevant property for
          defensible record-keeping.
        </p>

        <p className="mt-5 text-slate-400">
          Outside the intended audience: discretionary retail traders seeking entry/exit signals,
          and shops that already operate a trusted in-house regime classifier. Urd Atlas does not
          attempt to replace either.
        </p>
      </>
    ),
  };
}

// ---------------------------------------------------------------------------
// What this data is used for — extended (drives #what-this-is-used-for-modal)
// ---------------------------------------------------------------------------

export function whatThisIsUsedForExplanation(): ExplainContent {
  return {
    title: "What this data is used for",
    subtitle:
      "Concrete things subscribers do with the JSON files in their daily work — and what each one looks like in practice.",
    basic: (
      <>
        <p>
          Urd Atlas publishes three JSON files per chain per day. Customers do not look at them as
          charts — they read them with code, join them onto their own data, and let them drive
          something else.
        </p>

        <p className="mt-4 font-medium text-white">
          1. Tag every day with a regime, then split your own data by it.
        </p>
        <p className="mt-2">
          A trader takes her own table of daily PnL, attaches the published regime label to each
          date, and groups the results. She might find that a strategy that looks profitable on
          average actually delivers all of its returns in STABLE periods and quietly bleeds during
          CONGESTED ones. That is not a verdict on the strategy — it is a map of when the strategy
          belongs in the book and when it does not.
        </p>

        <p className="mt-4 font-medium text-white">2. Filter out unreliable days automatically.</p>
        <p className="mt-2">
          Not every day produces a clean signal. Some days the underlying data is delayed, sparse,
          or noisy. Each row carries a confidence score from 0 to 1 and a publication threshold
          (default 0.40). Below the threshold the label degrades to UNKNOWN/DEGRADED. A pipeline
          can simply drop those rows from training and live execution, and the model never learns
          from a bad day.
        </p>

        <p className="mt-4 font-medium text-white">3. Read the network in concrete language.</p>
        <p className="mt-2">
          Instead of writing &ldquo;Ethereum activity was elevated this week&rdquo;, an analyst reads the
          driver fields and writes:{" "}
          <span className="italic text-slate-200">
            &ldquo;Ethereum entered CONGESTED on Wednesday, driven primarily by a friction-axis spike at
            the 99th percentile of 90-day history, while demand-axis change was within noise.&rdquo;
          </span>{" "}
          The reader can open the row and verify every clause.
        </p>

        <p className="mt-4 font-medium text-white">4. Prove a past call after the fact.</p>
        <p className="mt-2">
          Each published row has a determinism hash — a short fingerprint tied to its inputs and
          method. Months later, a desk can cite that hash and prove the classification was real on
          that date and has not been edited. This matters for post-mortems, investor letters, and
          internal audit trails.
        </p>

        <p className="mt-4 font-medium text-white">5. Cover four chains with one piece of code.</p>
        <p className="mt-2">
          Bitcoin, Ethereum, Arbitrum, and Base are very different networks technically, but Urd
          Atlas exposes them in identical schema. A multi-chain analysis that would normally
          require four ingestion pipelines and four normalisation layers becomes one query, one
          parser, one join.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The Meta layer is the primary commercial deliverable. It is consumed as a deterministic
          categorical feature whose typical applications fall into the patterns below.
        </p>

        <p className="mt-4 font-medium text-white">Regime-conditioned performance attribution.</p>
        <p className="mt-2">
          Join <InlineCode>status.label</InlineCode> onto a daily PnL or strategy-return series and
          stratify by label. The categorical state space (<InlineCode>STABLE</InlineCode> /{" "}
          <InlineCode>HEATING</InlineCode> / <InlineCode>CONGESTED</InlineCode> /{" "}
          <InlineCode>CHEAP</InlineCode> / <InlineCode>UNKNOWN/DEGRADED</InlineCode>) is finite and
          stable across methodology versions, so longitudinal comparisons remain valid as long as{" "}
          <InlineCode>regime.ruleset_id</InlineCode> and{" "}
          <InlineCode>methodology_version</InlineCode> are tracked alongside the join.
        </p>

        <p className="mt-4 font-medium text-white">Confidence-gated training and execution.</p>
        <p className="mt-2">
          Filter on <InlineCode>confidence.confidence_score &gt;= threshold</InlineCode> (canonical
          0.40, configurable upward) before passing rows into a model. This excludes
          publication-threshold failures, lag-induced degradations, and quality-degraded inputs
          from feature ingestion, materially reducing the surface area for label leakage from noisy
          windows.
        </p>

        <p className="mt-4 font-medium text-white">Driver-level attribution in narrative output.</p>
        <p className="mt-2">
          The <InlineCode>regime.drivers</InlineCode> array exposes per-axis robust z-score (
          <InlineCode>z_robust</InlineCode>), 90-day percentile rank (
          <InlineCode>pct_90d</InlineCode>), and short-vs-medium momentum ratio (
          <InlineCode>momentum_7d_vs_30d</InlineCode>). This decomposition supports written
          attribution that names a specific axis and a specific historical extremity rather than
          collapsing to a single composite score.
        </p>

        <p className="mt-4 font-medium text-white">Reproducibility and audit.</p>
        <p className="mt-2">
          Each row carries a 12-character <InlineCode>regime.determinism_hash</InlineCode> derived
          from inputs, ruleset, and methodology version. The hash function is documented, and
          historical published rows are retained verbatim — meaning a counterparty can recompute
          the hash from declared inputs and verify the classification was not silently mutated.
          This satisfies a meaningful fraction of typical audit and LP-reporting requirements
          without bespoke evidence collection.
        </p>

        <p className="mt-4 font-medium text-white">Cross-chain analysis on one schema.</p>
        <p className="mt-2">
          BTC, ETH, ARB, and BASE share a common Meta schema. Code written against the published
          contract for one chain runs unchanged on the other three, including driver axes and
          confidence semantics. The per-chain ruleset (<InlineCode>eth_l1_v1</InlineCode>,{" "}
          <InlineCode>arb_v1</InlineCode>, etc.) carries the chain-specific calibration, so
          comparisons across chains are normalised by ruleset rather than by ad-hoc rescaling.
        </p>

        <p className="mt-4 font-medium text-white">Operational integration patterns.</p>
        <p className="mt-2">
          Pull-based: GET the latest meta JSON per chain via the documented endpoint and cache
          locally. Push to internal dashboards, alerting, or notebooks. The published JSON is the
          finished output — there is no aggregation, normalisation, or baseline maintenance to
          carry on the customer side.
        </p>
      </>
    ),
  };
}

// ---------------------------------------------------------------------------
// What a regime label means
// ---------------------------------------------------------------------------

export function regimeLabelExplanation(): ExplainContent {
  return {
    title: "What the regime label means",
    subtitle: "The five possible states and what each one describes.",
    basic: (
      <>
        <p>
          Every blockchain on this page is assigned one of five labels. Think of it like a weather
          description — not a forecast, just a description of current conditions.
        </p>
        <p className="mt-3">
          <span className="font-medium text-white">STABLE</span> — nothing unusual is standing out.
          The network looks roughly normal compared to its own recent history.
        </p>
        <p className="mt-3">
          <span className="font-medium text-white">HEATING</span> — demand is rising above normal
          and at least one part of the network is showing signs of acceleration. The network is
          warming up but not yet stretched.
        </p>
        <p className="mt-3">
          <span className="font-medium text-white">CONGESTED</span> — the network is under
          significant pressure. Capacity is extremely stretched, or both costs and capacity are
          elevated at the same time. This is when fees tend to rise noticeably.
        </p>
        <p className="mt-3">
          <span className="font-medium text-white">CHEAP</span> — both friction and capacity
          pressure are low. Fees are down, the network is quiet, and transactions are easy and
          inexpensive.
        </p>
        <p className="mt-3">
          <span className="font-medium text-white">UNKNOWN/DEGRADED</span> — the data quality is
          not sufficient to assign a reliable label. The raw data is still shown, but do not rely on
          the regime label until confidence recovers.
        </p>
        <p className="mt-3">
          All labels are relative to each chain&apos;s own recent history — not compared to other
          chains.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          Regime labels are the terminal output of a deterministic classification function applied
          to the meta layer&apos;s axis scores after confidence gating. The classification rules are:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium">CONGESTED</span>: capacity is EXTREME_HIGH, or (capacity
            is HIGH and friction is HIGH).
          </li>
          <li>
            <span className="font-medium">CHEAP</span>: friction is LOW and capacity is LOW.
          </li>
          <li>
            <span className="font-medium">HEATING</span>: demand is HIGH and at least one axis trend
            is HEATING (momentum ≥ 0.15).
          </li>
          <li>
            <span className="font-medium">STABLE</span>: none of the above conditions hold.
          </li>
          <li>
            <span className="font-medium">UNKNOWN/DEGRADED</span>: confidence_score &lt; 0.40,
            applied before all other rules.
          </li>
        </ul>
        <p className="mt-3">
          Axis band thresholds: HIGH if pct_90d ≥ 80 or z_robust ≥ 1.5; EXTREME_HIGH if pct_90d ≥
          90 or z_robust ≥ 2.5; LOW if pct_90d ≤ 20 or z_robust ≤ −1.5; EXTREME_LOW if pct_90d ≤
          10 or z_robust ≤ −2.5. These are union conditions — either the percentile or the z
          criterion is sufficient.
        </p>
        <p className="mt-3">
          Two properties of this scheme matter analytically. First, the confidence gate pre-empts
          all other rules, enforcing epistemic conservatism before label assignment. Second, the
          scheme is threshold-based rather than probabilistic, which means the label can flip at
          axis-score boundaries without implying a large underlying data change. The continuous
          scorecard scores are the appropriate complement for reading classification margin.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          <InlineCode>meta/&lt;chain&gt;/latest.json</InlineCode> →{" "}
          <InlineCode>status.label</InlineCode>
        </li>
        <li>
          Confidence gate: <InlineCode>confidence.confidence_score &lt; 0.40</InlineCode> →
          UNKNOWN/DEGRADED
        </li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// What confidence means on the landing cards
// ---------------------------------------------------------------------------

export function landingConfidenceExplanation(): ExplainContent {
  return {
    title: "What confidence means",
    subtitle: "How much to trust the current regime label.",
    basic: (
      <>
        <p>
          The confidence score tells you how well-supported the current regime label is by the
          available data. Think of it like the strength of a weather forecast.
        </p>
        <p className="mt-3">
          A score close to <span className="font-medium text-white">1.0</span> means lots of
          consistent, recent evidence pointing in the same direction. A score close to{" "}
          <span className="font-medium text-white">0</span> means the evidence is thin, incomplete,
          or internally inconsistent — you should treat the label with more caution.
        </p>
        <p className="mt-3">
          There are three bands:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium text-white">Good</span> (≥ 0.70) — the label is
            well-supported. Read it normally.
          </li>
          <li>
            <span className="font-medium text-white">Caution</span> (0.40–0.69) — the label is
            still shown but with reduced certainty. Check the scorecard and drivers before
            concluding.
          </li>
          <li>
            <span className="font-medium text-white">Degraded</span> (&lt; 0.40) — the label
            becomes UNKNOWN/DEGRADED. The data exists but is not reliable enough to support a named
            state.
          </li>
        </ul>
      </>
    ),
    advanced: (
      <>
        <p>
          The confidence score is a composite evidence-strength scalar, not a Bayesian posterior
          probability of regime persistence. It is defined over the published row as a function of
          data quality (null rates, out-of-range values, metric coverage) and label support (how
          strongly the evidence surface distinguishes the published label from the nearest
          alternative).
        </p>
        <p className="mt-3">
          The canonical gate at 0.40 forces UNKNOWN/DEGRADED regardless of axis structure below
          that threshold. In the Caution band (0.40–0.69), scorecard scores are pulled toward 50
          (the uninformative prior) in proportion to the confidence deficit. This degradation is
          applied before the regime classification rule evaluation, so a Caution-band row will
          produce axis scores closer to neutral than its raw signal would otherwise suggest.
        </p>
        <p className="mt-3">
          For cross-chain comparison on the landing page, confidence is the primary epistemic
          qualifier on any inter-chain regime comparison. Two chains showing the same label at
          confidence 0.85 and 0.45 respectively are not epistemically equivalent, even though the
          surface label is identical. The landing cards expose the confidence score and band
          precisely for this reason.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          <InlineCode>meta/&lt;chain&gt;/latest.json</InlineCode> →{" "}
          <InlineCode>confidence.confidence_score</InlineCode>
        </li>
        <li>
          Good ≥ 0.70 · Caution 0.40–0.69 · Degraded &lt; 0.40
        </li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// What as-of and lag mean on the landing cards
// ---------------------------------------------------------------------------

export function landingFreshnessExplanation(): ExplainContent {
  return {
    title: "What as-of and lag mean",
    subtitle: "How fresh the data on each chain card is.",
    basic: (
      <>
        <p>
          Blockchain data is not updated in real-time on this site. Each chain is published once a
          day, and some chains have a built-in delay before data is ready to publish.
        </p>
        <p className="mt-3">
          <span className="font-medium text-white">As of</span> tells you the date the current
          information represents. All the numbers and labels for a chain describe the network as it
          was on that specific date.
        </p>
        <p className="mt-3">
          <span className="font-medium text-white">Lag</span> tells you how many days old that data
          is relative to today. A lag of 1 means yesterday&apos;s data. A lag of 7 means data from
          a week ago.
        </p>
        <p className="mt-3">
          Bitcoin and Ethereum publish with a roughly 1-day lag. Arbitrum and Base publish with a
          roughly 7-day lag — that is by design, not an error.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The as-of date is the temporal coordinate of the published state vector. It is resolved
          from the canonical field hierarchy in the meta row and is part of the published contract
          — not a browser clock approximation. Lag is derived as the integer day difference between
          UTC today and the as-of date.
        </p>
        <p className="mt-3">
          Per-chain expected lag policy: BTC and ETH expect 1-day lag; ARB and BASE expect 7-day
          lag. Staleness classification: soft warn if lag exceeds expected + 2 days (BTC/ETH: &gt;2d,
          ARB/BASE: &gt;9d); hard fail if lag exceeds expected + 4 days (BTC/ETH: &gt;4d, ARB/BASE:
          &gt;11d). The chain cards on this page show the raw lag value against these thresholds via
          the status chip.
        </p>
        <p className="mt-3">
          Lag and confidence are orthogonal failure dimensions. A fresh row with low confidence
          is epistemically weaker than a slightly stale row with high confidence. The landing cards
          expose both independently so the reader can form their own composite assessment rather
          than relying on a single aggregated freshness indicator.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          <InlineCode>confidence.lag_days_vs_utc_today</InlineCode>
        </li>
        <li>
          Expected lag: BTC/ETH 1d · ARB/BASE 7d
        </li>
        <li>
          Soft warn: +2d over expected · Hard fail: +4d over expected
        </li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// What the four published JSON layers mean (Gold / Meta / Derived)
// ---------------------------------------------------------------------------

export function dataLayersExplanation(): ExplainContent {
  return {
    title: "Gold, Derived, Meta, and Briefs — what the four published JSON layers mean",
    subtitle: "How published data is structured from raw observations to regime intelligence.",
    basic: (
      <>
        <p>
          All the information on this site comes from one of four published JSON layers, each building on the
          previous one. Understanding the layers helps you know where any number comes from.
        </p>
        <p className="mt-3">
          <span className="font-medium text-white">Gold</span> is the raw foundation. It is the
          actual daily counts and measurements from the blockchain — how many transactions happened,
          how much was paid in fees, how many blocks were produced. Nothing is calculated or
          inferred here; it is just what the network did that day.
        </p>
        <p className="mt-3">
          <span className="font-medium text-white">Meta</span> is the intelligence layer. It takes
          the Gold data and runs it through the analytical model — producing the regime label,
          confidence score, scorecard, and the list of drivers that explain why the label was
          assigned.
        </p>
        <p className="mt-3">
          <span className="font-medium text-white">Derived</span> is the trend layer. It takes the
          Gold data and produces smoothed rolling averages (7-day and 30-day) that are used to draw
          the charts on each chain page. It helps you see whether something has been building over
          time or is just a one-day event.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The three-layer architecture is a deliberate separation of concerns in the published data
          contract.
        </p>
        <p className="mt-3">
          <span className="font-medium">Gold</span> contains the canonical daily aggregates
          (CANON_COLS): transaction count, block count, value transferred, median transaction value,
          median fee, failed transaction rate, gas utilization, unique active addresses, and average
          block time. Gold values are never transformed or normalised for presentation — they are
          published in native units exactly as they emerge from the AWS Public Blockchain Data
          aggregation. This ensures the Gold layer can be independently verified against chain
          explorers and alternative data sources.
        </p>
        <p className="mt-3">
          <span className="font-medium">Meta</span> is the statistical processing layer. It applies
          the regime engine (MAD-based robust z-score, percentile rank, momentum, axis scoring via
          tanh compression, confidence gating, and deterministic label classification) to produce a
          fully documented, versioned, and hash-anchored classification. The meta layer is the
          primary product output.
        </p>
        <p className="mt-3">
          <span className="font-medium">Derived</span> contains rolling means (MA7, MA30) over the
          Gold series and the meta confidence score. It exists separately from Gold because smoothed
          series are derivative quantities — they are useful for visual trend analysis but should
          not be confused with point observations. The separation makes the derivation explicit and
          auditable.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          Gold: <InlineCode>gold/&lt;chain&gt;/latest.json</InlineCode>
        </li>
        <li>
          Meta: <InlineCode>meta/&lt;chain&gt;/latest.json</InlineCode>
        </li>
        <li>
          Derived: <InlineCode>derived/&lt;chain&gt;/latest.json</InlineCode>
        </li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// Interpretation boundary (no price, no forecasts)
// ---------------------------------------------------------------------------

export function interpretationBoundaryExplanation(): ExplainContent {
  return {
    title: "Interpretation boundary",
    subtitle: "What this site does and does not do — and why.",
    basic: (
      <>
        <p>
          This site deliberately does not show price data, make forecasts, or give you advice about
          what to buy or sell. That is not an oversight — it is a core design decision.
        </p>
        <p className="mt-3">
          There are plenty of sites that combine on-chain data with price charts and present the
          result as a trading signal. Urd Atlas does something different: it focuses only on
          the network itself — how busy it is, how expensive it is to use, whether it looks
          stretched or quiet — and describes that in plain, documented language.
        </p>
        <p className="mt-3">
          This matters because it keeps the analysis honest. Regime labels like HEATING or CHEAP
          describe what the network is doing right now relative to its own history. They are useful
          for understanding the operating environment. They are not recommendations.
        </p>
        <p className="mt-3">
          If you want to use this information alongside your own analysis of prices and markets, you
          are free to do that. But the site will not do it for you, because mixing the two without
          clear labelling is how analysis becomes misleading.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The interpretation boundary is enforced at the product level, not just the UI level. The
          pipeline does not compute or store price data. No published artifact contains price fields,
          return estimates, or probabilistic forecasts. All outputs are strictly descriptive
          conditional on the current on-chain evidence surface.
        </p>
        <p className="mt-3">
          This design choice reflects two epistemological commitments. First, the causal relationship
          between on-chain network state and asset price is contested and context-dependent — regime
          HEATING on Ethereum does not imply a positive ETH return, and any product that presented
          it as such would be making a causal claim the data does not support. Second, descriptive
          explainability requires that every output can be traced back to a deterministic function
          of documented inputs. Price-dependent outputs would introduce a level of model complexity
          and market dependency that is incompatible with that traceability standard.
        </p>
        <p className="mt-3">
          The practical implication is that Urd Atlas outputs are appropriate as one input to
          a broader analytical process, not as a standalone signal product. An analyst using this
          data is expected to combine reference data with their own price views, positioning data,
          and market structure analysis. The product explicitly does not do that synthesis on their
          behalf.
        </p>
      </>
    ),
  };
}

// ---------------------------------------------------------------------------
// How the product is organised (site map)
// ---------------------------------------------------------------------------

export function siteOrganisationExplanation(): ExplainContent {
  return {
    title: "How this site is organised",
    subtitle: "Where to go for different kinds of information.",
    basic: (
      <>
        <p>
          The site has a few main sections. Here is what each one is for:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <span className="font-medium text-white">Chains</span> — the main analytical pages.
            Each of the four supported blockchains has its own page with the current regime label,
            scorecard, drivers, and charts. This is where you will spend most of your time.
          </li>
          <li>
            <span className="font-medium text-white">Track Record</span> — a historical log of
            regime labels over time. If you want to see what the model said about Ethereum three
            months ago, this is where to look.
          </li>
          <li>
            <span className="font-medium text-white">Thresholds</span> — a public tool that lets
            you adjust the model&apos;s sensitivity parameters locally in your browser and see how
            the regime labels would change. Useful if you want to understand how robust a label is
            to small changes in the rules.
          </li>
          <li>
            <span className="font-medium text-white">Glossary</span> — plain-language and technical
            definitions for every term the site uses. If you see a word you do not recognise, start
            here.
          </li>
          <li>
            <span className="font-medium text-white">Methodology</span> — full documentation of how
            the regime model works, including the exact formulas. For technical readers.
          </li>
          <li>
            <span className="font-medium text-white">Status</span> — a real-time view of data
            freshness and pipeline health for all four chains.
          </li>
        </ul>
      </>
    ),
    advanced: (
      <>
        <p>
          The site is structured as a layered interpretation stack. The landing page provides a
          cross-chain snapshot for rapid regime orientation. Chain pages provide the full
          meta-layer decomposition: regime, confidence, scorecard, drivers, charts, and
          traceability fields, with Basic and Advanced explanations at every level.
        </p>
        <p className="mt-3">
          The Track Record page exposes the historical time series of regime labels, enabling
          backtesting of regime-conditional strategies and reproducibility auditing of past
          classifications via determinism hashes. The Thresholds page exposes the canonical default
          parameters and allows local simulation of alternative threshold configurations — custom
          outputs are identity-hashed and never presented as canonical.
        </p>
        <p className="mt-3">
          The subscriber surface adds authenticated file delivery via the{" "}
          <InlineCode>/api/v1/files/</InlineCode> endpoint, which enforces chain, genre, window,
          and date-range entitlements server-side. API keys are hashed at rest. Rate limiting
          applies per account across all keys (Single Chain: 60 req/min, Research: 300 req/min). The public
          pages remain 100% unauthenticated with no login wall.
        </p>
      </>
    ),
  };
}

// ---------------------------------------------------------------------------
// What cross-chain notables are
// ---------------------------------------------------------------------------

export function crossChainNotablesExplanation(): ExplainContent {
  return {
    title: "Cross-chain notables",
    subtitle: "Signals that are worth your attention across the full surface right now.",
    basic: (
      <>
        <p>
          The notables section surfaces things that are worth paying attention to across all four
          chains right now — not analysis or opinions, just factual observations drawn from the
          published data.
        </p>
        <p className="mt-3">
          For example, if one or more chains have data quality below the reliable threshold, a
          notable will say so. If a chain&apos;s data is more delayed than expected, it will appear
          here. These are not alarms — they are context flags that help you read the regime cards
          with the right expectations.
        </p>
        <p className="mt-3">
          Notables are generated automatically from the same published data as everything else on
          the page. They do not represent editorial opinions.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          Cross-chain notables are deterministically generated from the current status surface. The
          generation rules are: (1) if any chain has confidence_score &lt; 0.40, flag degraded
          confidence; (2) if any chain has status = warn or fail, flag freshness deviation; (3) if
          L2 chains (ARB/BASE) are present, note the expected 7-day publish cadence. If no
          conditions fire, a positive all-clear notable is generated.
        </p>
        <p className="mt-3">
          The notables are capped at three items. They are not WHN (What&apos;s Happening Now)
          anomaly signals — those are metric-level z-score anomalies computed in the meta layer and
          exposed on individual chain pages. The landing notables are structural status observations
          across the cross-chain surface, intended to orient the reader before they drill into
          individual chain pages.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          Generated from <InlineCode>data/published/v1/status/index.json</InlineCode>
        </li>
        <li>
          Fallback: <InlineCode>meta/&lt;chain&gt;/latest.json</InlineCode> per chain
        </li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// What the subscriber API surface is
// ---------------------------------------------------------------------------

export function subscriberSurfaceExplanation(): ExplainContent {
  return {
    title: "Subscriber access and the data API",
    subtitle: "What you get with a subscription beyond the public pages.",
    basic: (
      <>
        <p>
          Everything on the public pages — all the regime labels, scorecard, drivers, and charts —
          is free and requires no account. No login wall, no nag screen.
        </p>
        <p className="mt-3">
          A subscription adds one thing: direct access to the underlying JSON data files that power
          the site. If you are an analyst or developer who wants to run your own calculations,
          build your own charts, or feed the data into another tool, a subscription lets you
          download the raw Gold, Derived, Meta, and Briefs files for each chain.
        </p>
        <p className="mt-3">
          There are two subscription tiers. <span className="font-medium text-white">Single Chain</span>{" "}
          gives you access to one chain of your choice. {" "}
          <span className="font-medium text-white">Research</span> gives you access to all four chains,
          a longer history window, and the ability to generate custom threshold outputs. A one-time{" "}
          <span className="font-medium text-white">History Add-on</span> unlocks the full available
          history for your entitled scope.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The subscriber API delivers authenticated access to the published artifact hierarchy via{" "}
          <InlineCode>GET /api/v1/files/&lt;genre&gt;/&lt;chain&gt;/&lt;window&gt;/latest.json</InlineCode>.
          Entitlement is enforced server-side across chain, genre, window, and date-range
          dimensions. Requests outside the entitled scope return 403 with a stable error code rather
          than 404, explicitly signalling entitlement enforcement rather than content absence.
        </p>
        <p className="mt-3">
          Single Chain entitlement: one chain, all genres (gold/meta/derived), windows up to 90d, history
          depth 90 days. Research entitlement: all chains, all genres, windows up to 365d, history depth
          365 days, custom threshold feed generation. The History Add-on sets{" "}
          <InlineCode>historyUnlocked = true</InlineCode>, removing the depth constraint for the
          entitled scope.
        </p>
        <p className="mt-3">
          API keys are opaque random strings stored as argon2id hashes. Keys are shown once at
          creation; thereafter only the last 4 characters are exposed for identification. Rate
          limits are enforced per account across all keys using a sliding window (Single Chain: 60/min,
          Research: 300/min) via Upstash Redis with an in-process fallback for degraded Redis conditions.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          File delivery: <InlineCode>GET /api/v1/files/&lt;genre&gt;/&lt;chain&gt;/latest.json</InlineCode> or <InlineCode>GET /api/v1/files/&lt;genre&gt;/&lt;chain&gt;/&lt;window&gt;/latest.json</InlineCode>
        </li>
        <li>
          Auth: <InlineCode>X-API-Key</InlineCode> header
        </li>
        <li>
          Entitlement: chain · genre · window · date-range enforced server-side
        </li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// Value proposition — the "is this for me?" modal
// ---------------------------------------------------------------------------

export function valuePropositionExplanation(): ExplainContent {
  return {
    title: "What you are paying for — and whether it is worth it",
    subtitle: "A direct, honest explanation of what this product does and who it serves.",
    basic: (
      <>
        <p>
          The core question Urd Atlas answers is: <span className="font-medium text-white">
          is what I am seeing on this blockchain right now a real shift, or will it reverse in
          a few days?</span> That is it. Everything on this site is built around that one question.
        </p>
        <p className="mt-3">
          Blockchain networks produce enormous amounts of data every day. Transaction counts, fees,
          block times, gas usage, active addresses — it is all public. But raw numbers by themselves
          do not tell you very much. A transaction count of 1.2 million could be high, normal, or
          low depending on what the network has looked like over the past few months.
        </p>
        <p className="mt-3">
          Urd Atlas takes that raw data, compares it to each network&apos;s own recent
          history, and publishes a daily descriptive label — STABLE, HEATING, CONGESTED, or CHEAP
          — along with the full breakdown of why that label was assigned. Not an opinion. Not a
          prediction. A documented, reproducible description of the current network state.
        </p>
        <p className="mt-3">
          The public pages are completely free. You can read every regime label, every scorecard,
          every driver explanation, and every chart without an account. A subscription is for
          people who want to take the underlying data away and work with it directly — analysts and
          developers who want to feed the raw daily JSON into their own tools, models, or
          dashboards.
        </p>
        <p className="mt-3">
          If you find yourself saying &ldquo;I already knew transaction volume was up on Ethereum last
          week — I want to know whether that was a structural shift or just noise,&rdquo; this is built
          for you. If you want a buy signal, it is not.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The product&apos;s analytical foundation is a deterministic regime classification
          pipeline over AWS Public Blockchain Data. The pipeline produces daily Meta reference artifacts for
          four chains (Bitcoin, Ethereum, Arbitrum, Base) containing: a regime label drawn from a
          five-state vocabulary, a three-axis scorecard (Demand, Friction, Capacity) with 0–100
          scores derived from a tanh-compressed robust z-signal, a ranked driver set exposing the
          most salient metric-level evidence, a confidence score gating publication eligibility,
          and a determinism hash enabling full reproducibility auditing.
        </p>
        <p className="mt-3">
          The methodological choices are deliberate and documented. Robust z-score using
          median/MAD standardisation is used instead of mean/std because on-chain distributions
          are heavy-tailed and episodically punctuated — standard z-scores inflate the denominator
          under historical extremes and compress the signal in precisely the periods where it
          matters most. Percentile rank (pct_90d) is computed alongside z_robust because the two
          statistics are orthogonal: one is a distance measure, the other a rank measure, and they
          can diverge in informative ways in non-Gaussian distributions. The tanh compression
          `50 + 40 × tanh(z / 1.5)` on scorecard axes produces bounded, monotone scores that
          saturate gracefully rather than producing implausibly extreme readings under moderate
          signals.
        </p>
        <p className="mt-3">
          The confidence system is the feature that most differentiates this from comparable
          products. It is a composite evidence-strength scalar — not a return probability, not a
          directional forecast — that reflects both data completeness (null rates, coverage across
          the metric space) and classification margin (how strongly the evidence supports the
          specific published label versus the nearest alternative). Below 0.40, the label is forced
          to UNKNOWN/DEGRADED regardless of axis structure. Between 0.40 and 0.70, scorecard scores
          are pulled toward neutral (50) in proportion to the confidence deficit. This means the
          system publishes conservative, epistemically honest outputs rather than presenting
          spurious precision under thin evidence.
        </p>
        <p className="mt-3">
          Every published artifact is anchored by a determinism hash computed over the input data,
          threshold parameters, and methodology version. This means historical regime labels are
          tamper-evident: a label published on a specific date under a specific hash can be
          independently verified to be the output of a documented computation, not a retroactive
          reclassification. For backtesting regime-conditional strategies or validating the
          product&apos;s track record, this is the property that makes the data trustworthy in a
          way that narrative commentary cannot be.
        </p>
        <p className="mt-3">
          The subscriber API delivers authenticated access to the Gold, Derived, Meta, and Briefs artifact
          layers via a proxy endpoint that enforces chain, genre, window, and date-range
          entitlements server-side. Rate limiting is applied per account using a sliding window
          over Upstash Redis. API keys are stored as argon2id hashes and shown only once at
          creation. The current history depth is 400+ days and grows by one day with each daily
          pipeline run.
        </p>
        <p className="mt-3">
          The honest limitation: this is a daily publication, not a real-time feed. The intended
          use case is structural context — understanding whether a network is in a persistent
          regime or experiencing transient noise — not intraday execution. If your workflow
          requires sub-hourly data, this is not the right product. If your workflow requires a
          daily, documented, reproducible view of where four major blockchain networks stand
          relative to their own recent history, it is.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          Regime labels: <InlineCode>meta/&lt;chain&gt;/latest.json</InlineCode> →{" "}
          <InlineCode>status.label</InlineCode>
        </li>
        <li>
          Confidence: <InlineCode>confidence.confidence_score</InlineCode> · gate 0.40
        </li>
        <li>
          Determinism: <InlineCode>regime.determinism_hash</InlineCode>
        </li>
        <li>
          Subscriber API: <InlineCode>GET /api/v1/files/&lt;genre&gt;/&lt;chain&gt;/&lt;window&gt;/latest.json</InlineCode>
        </li>
        <li>
          History depth: 400+ days, growing daily
        </li>
      </ul>
    ),
  };
}
