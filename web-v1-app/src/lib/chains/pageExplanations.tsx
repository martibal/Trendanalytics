import type { ReactNode } from "react";

export type ConfidenceBand = "Good" | "Caution" | "Degraded" | "—";

export type ExplainContent = {
  title: string;
  subtitle?: ReactNode;
  basic: ReactNode;
  advanced: ReactNode;
  traceability?: ReactNode;
  raw?: unknown;
};

export type ConfidenceNoticeCopy = {
  tone: "caution" | "degraded";
  title: string;
  body: string;
};

function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5">{children}</code>;
}

function safe(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim().length > 0 ? v : fallback;
}

function fmtNumber(v: unknown, digits = 3): string {
  return typeof v === "number" && Number.isFinite(v) ? v.toFixed(digits) : "—";
}

// ---------------------------------------------------------------------------
// Confidence notice copy
// ---------------------------------------------------------------------------

export function getConfidenceNoticeCopy(
  band: ConfidenceBand
): ConfidenceNoticeCopy | null {
  if (band === "Caution") {
    return {
      tone: "caution",
      title: "Reduced confidence",
      body:
        "Think of confidence like the strength of a weather forecast. Right now the forecast is possible but not crisp — it is based on thinner or less consistent evidence than usual. The regime label is still shown, but treat it as a rough guide rather than a firm reading until you have checked the scorecard and driver details below.",
    };
  }

  if (band === "Degraded") {
    return {
      tone: "degraded",
      title: "Degraded confidence",
      body:
        "The data supporting the current state is below the minimum quality bar the model requires to publish a clean regime label. The row is still shown so you can see what data does exist, but you should treat the visible state as unreliable — closer to 'we don't have a strong read right now' than to any named regime.",
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Chain profile
// ---------------------------------------------------------------------------

export function chainProfileExplanation(
  chainId: string,
  displayName: string,
  profileNote?: string | null
): ExplainContent {
  const chain = safe(chainId, "<chain>");
  const note =
    typeof profileNote === "string" && profileNote.trim().length > 0
      ? profileNote
      : null;

  const basicMap: Record<string, ReactNode> = {
    bitcoin: (
      <>
        <p>
          Bitcoin is the oldest and simplest of the four networks shown here. You can think of it as
          a global shared ledger where people send BTC to each other. It does not run apps or smart
          contracts — it just records value transfers, reliably and slowly, about once every ten
          minutes per block.
        </p>
        <p className="mt-3">
          Because Bitcoin works so differently from the others, this page does not try to squeeze it
          into the same mould. Instead of looking at "gas" (a concept that only applies to Ethereum
          and its siblings), it focuses on how many transactions people are making, how much they are
          paying to get included in a block, and whether blocks are arriving on their normal schedule.
          Those three things together tell you whether Bitcoin is quiet, warming up, or under
          competition for space.
        </p>
      </>
    ),
    ethereum: (
      <>
        <p>
          Ethereum is the foundation for most decentralised apps, tokens, and financial protocols you
          have probably heard of. Unlike Bitcoin, it does not just move value — it runs code. When you
          use a decentralised exchange, mint an NFT, or interact with a lending protocol, that usually
          happens on Ethereum or one of the networks built on top of it.
        </p>
        <p className="mt-3">
          All that activity has a cost, called gas. Gas is the fee you pay to run your transaction on
          Ethereum's shared computer. When the network is busy, gas prices rise because many people
          are competing for the same limited block space. This page watches transaction demand, gas
          costs, block fullness, and active users to tell you whether Ethereum currently looks calm,
          heating up, or congested.
        </p>
      </>
    ),
    arbitrum: (
      <>
        <p>
          Arbitrum is built on top of Ethereum. Think of it as a faster, cheaper lane that still uses
          Ethereum as its security backbone. Transactions happen on Arbitrum first, then get bundled
          together and settled on Ethereum in batches — that is why fees are much lower.
        </p>
        <p className="mt-3">
          Because it is a different type of network, some of the metrics that matter for Ethereum do
          not translate directly to Arbitrum. This page therefore uses a tailored set of signals that
          make sense for how Arbitrum actually works, rather than forcing Ethereum-style readings onto
          a network with different mechanics.
        </p>
      </>
    ),
    base: (
      <>
        <p>
          Base is also built on top of Ethereum, using the same technical foundation as Optimism. It
          was launched by Coinbase and has grown quickly, hosting a wide range of apps and a large
          user base attracted by its low fees.
        </p>
        <p className="mt-3">
          Like Arbitrum, Base bundles transactions and settles them on Ethereum, which keeps user fees
          low most of the time. The page focuses on the signals that are meaningful for this type of
          network — activity levels, fee friction, and throughput — while skipping metrics that only
          make sense on Ethereum mainnet.
        </p>
      </>
    ),
  };

  const advancedMap: Record<string, ReactNode> = {
    bitcoin: (
      <>
        <p>
          Bitcoin is classified as a UTXO-model settlement chain. Unlike EVM chains, it does not
          expose gas-utilization, failed-transaction rates, or smart-contract execution metrics. The
          appropriate analytic surface is therefore block-space competition, mempool pressure (where
          observable), fee dynamics, and block-production cadence.
        </p>
        <p className="mt-3">
          Capacity on Bitcoin is proxied through block-time instability and fee response rather than
          through a utilization ratio, because Bitcoin's block-size limit is a soft constraint
          mediated by fee competition rather than a hard gas ceiling. This means the
          demand–friction–capacity triangle is structurally different here: friction and capacity are
          more tightly coupled than on EVM chains, since fee pressure both signals demand intensity
          and proxies blockspace tightness simultaneously.
        </p>
        <p className="mt-3">
          Methodologically, this has a practical consequence: z-score and percentile signals derived
          from Bitcoin fee metrics carry a richer dual interpretation than their EVM counterparts.
          Elevated median fee on BTC is both a friction indicator and a capacity pressure indicator,
          which is why the driver decomposition for Bitcoin should be read with that coupling in mind
          rather than treating the axes as fully independent.
        </p>
      </>
    ),
    ethereum: (
      <>
        <p>
          ETH L1 is the canonical EVM execution environment. Its fee mechanism (EIP-1559) introduces
          a base fee that adjusts per block in response to utilization against a target of 50% gas
          usage, with the ability to surge to 2× target block size transiently. This design means gas
          utilization is an informative, low-lag capacity pressure signal — unlike Bitcoin, where
          block fullness must be inferred indirectly.
        </p>
        <p className="mt-3">
          The demand–friction–capacity triangle is most cleanly separable on Ethereum of the four
          chains on this page. Demand can be isolated in transaction count and active address metrics;
          friction is cleanly visible in median fee and failed-transaction rate; capacity is directly
          observable in gas utilization against the target. That triangular decomposition is why
          Ethereum serves as the reference profile for the scorecard structure.
        </p>
        <p className="mt-3">
          One methodological subtlety: EIP-1559's base-fee adjustment mechanism means fee volatility
          on Ethereum is structurally lower than on pre-1559 chains or on Bitcoin, because the
          protocol absorbs short-run spikes via the 2× burst capacity. Interpreting median fee in
          isolation can therefore understate true blockspace tightness during brief congestion
          episodes. The gas utilization and failed-transaction signals are correctives for this.
        </p>
      </>
    ),
    arbitrum: (
      <>
        <p>
          Arbitrum is an optimistic rollup. Its transaction lifecycle has two economically distinct
          stages: L2 execution (sequenced locally, very cheap) and L1 data availability and settlement
          (batched calldata posted to Ethereum, which inherits L1 gas cost). The fee experienced by a
          user is a composite of both, and the relative weight of each component changes with L1 gas
          conditions — meaning Arbitrum fees can rise for reasons entirely exogenous to L2 demand.
        </p>
        <p className="mt-3">
          This has a direct methodological implication: interpreting Arbitrum friction through
          median-fee alone risks conflating L2 execution pressure with L1 settlement cost. The page
          therefore suppresses direct gas-utilization metrics (which are semantically misaligned to
          L2 execution) and instead emphasises throughput-relative measures and fee-level context.
          The goal is to isolate L2-endogenous demand and friction signals from the L1-exogenous
          component where possible.
        </p>
        <p className="mt-3">
          Arbitrum's sequencer architecture also means block production is not subject to the same
          probabilistic timing as L1 proof-of-work or proof-of-stake chains. Block-time signals
          therefore carry different information content here than on Bitcoin or Ethereum mainnet and
          must be interpreted as throughput proxies rather than as consensus-pressure indicators.
        </p>
      </>
    ),
    base: (
      <>
        <p>
          Base is an OP Stack rollup with the same fundamental architecture as Arbitrum: optimistic
          execution with L1 Ethereum as the data availability and settlement layer. Its fee structure
          is similarly two-dimensional — local L2 execution cost plus L1 data publishing cost — and
          the relative weight of those components responds to L1 gas conditions in real time.
        </p>
        <p className="mt-3">
          One distinction from Arbitrum that matters analytically: Base has a larger and faster-growing
          retail user base, which means its activity distribution is less dominated by sophisticated
          DeFi protocols and more mixed with high-frequency low-value transactions. This can produce
          median-fee and active-address dynamics that differ structurally from Arbitrum even under
          similar L2 utilization conditions.
        </p>
        <p className="mt-3">
          Like Arbitrum, the page suppresses L1-native capacity metrics that would be semantically
          misleading in the L2 context. The operative analytic questions for Base are: is L2-side
          demand rising relative to Base's own recent history, is friction rising for reasons that
          look L2-endogenous, and is throughput showing signs of tightness — rather than attempting
          to read Base through an ETH L1 lens.
        </p>
      </>
    ),
  };

  return {
    title: `${displayName} profile`,
    subtitle:
      "What this chain is, what makes it distinct, and why the page emphasises the metrics it does.",
    basic: (
      <>
        <p>
          {basicMap[chain] ?? (
            <>
              This page gives a product-specific reading of the chain&apos;s recent operating state.
            </>
          )}
        </p>
        {note ? (
          <p className="mt-3">
            Note from the published data:{" "}
            <span className="font-medium text-foreground">{note}</span>
          </p>
        ) : null}
      </>
    ),
    advanced: (
      <>
        <p>
          {advancedMap[chain] ?? (
            <>
              The chain profile determines which metrics are emphasised, which are hidden, and which
              operational caveats govern interpretation of the scorecard and driver set.
            </>
          )}
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          <InlineCode>meta/&lt;chain&gt;/latest.json</InlineCode> →{" "}
          <InlineCode>profile</InlineCode>
        </li>
        <li>
          <InlineCode>profile.hidden_metrics</InlineCode>
        </li>
        <li>
          <InlineCode>profile.note</InlineCode>
        </li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// Interpretation map / reading order
// ---------------------------------------------------------------------------

export function interpretationMapExplanation(): ExplainContent {
  return {
    title: "How to read this page",
    subtitle:
      "A suggested reading order so you know where to start and what each section contributes.",
    basic: (
      <>
        <p>
          This page has a lot of information, but it is designed to be read in layers — you do not
          need to understand everything at once.
        </p>
        <p className="mt-3">
          <span className="font-medium text-white">Start at the top.</span> The five summary cards
          give you the headline: what state is the chain in, how much do we trust that reading, and
          how old is the data? If the data is very old or confidence is low, keep that in mind before
          reading too much into the rest.
        </p>
        <p className="mt-3">
          <span className="font-medium text-white">Then look at the charts.</span> They show you
          whether recent changes look like a brief blip or a sustained shift. A spike that disappears
          in two days is very different from a trend that has been building for three weeks.
        </p>
        <p className="mt-3">
          <span className="font-medium text-white">Then read the scorecard.</span> It breaks the
          headline state into three parts: how strong demand looks, how expensive or difficult
          activity looks, and how stretched the network looks from a capacity perspective.
        </p>
        <p className="mt-3">
          <span className="font-medium text-white">Finally, check the drivers.</span> These are the
          specific metrics that most strongly explain why the current state looks the way it does.
          They are the evidence behind the headline.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The page is structured as a progressive interpretation stack. The intended reading order is:
          freshness → confidence → regime → scorecard → drivers → charts → traceability. This
          ordering is deliberate and methodologically motivated.
        </p>
        <p className="mt-3">
          Freshness and confidence are epistemic preconditions. Before investing interpretive effort
          in any metric, the reader should have established that the row is sufficiently recent and
          that the evidence quality is above the publication floor. A high-magnitude driver signal in
          a degraded-confidence, stale row is misleading if read without that context.
        </p>
        <p className="mt-3">
          Regime should be read next as a compressed state summary, not as a prediction. It encodes
          the model&apos;s top-level classification given the full evidence surface, axis structure,
          and confidence gate. The scorecard then provides the structural decomposition of that
          classification — it reveals which axes are driving the label and whether the regime is
          driven by a single dominant axis or by coincident pressure across multiple dimensions.
        </p>
        <p className="mt-3">
          Drivers expose the most salient metric-level evidence within the scorecard axes. They should
          be interpreted as a ranked explanatory subset, not as a complete factor inventory. Charts
          then provide the temporal context that scalars cannot: persistence, transition timing, and
          the shape of recent drift. Traceability fields anchor the entire stack to the published
          contract and allow full reproducibility auditing.
        </p>
      </>
    ),
  };
}

// ---------------------------------------------------------------------------
// Regime
// ---------------------------------------------------------------------------

export function regimeExplanation(label?: unknown): ExplainContent {
  const safeLabel = safe(label, "UNKNOWN/DEGRADED");

  const labelDescriptions: Record<string, ReactNode> = {
    STABLE: (
      <p className="mt-3">
        <span className="font-medium text-white">STABLE</span> means nothing unusual is standing out
        right now. The chain looks roughly normal compared to its own recent history — not
        particularly busy, not particularly quiet, not particularly expensive. It is a neutral reading,
        not a good or bad one.
      </p>
    ),
    HEATING: (
      <p className="mt-3">
        <span className="font-medium text-white">HEATING</span> means demand is running above recent
        normal, and at least one part of the network is showing signs of acceleration. Think of it as
        the chain warming up — more people are using it and the trend is moving in that direction.
        It does not mean it is congested yet.
      </p>
    ),
    CONGESTED: (
      <p className="mt-3">
        <span className="font-medium text-white">CONGESTED</span> means the network is under
        significant pressure. Either capacity looks extremely stretched, or both costs and capacity
        are elevated at the same time. This is when you typically see fees rise noticeably and
        transactions take longer or become more expensive to prioritise.
      </p>
    ),
    CHEAP: (
      <p className="mt-3">
        <span className="font-medium text-white">CHEAP</span> means both friction and capacity
        pressure look low relative to recent history. Fees are down, the network is not stretched,
        and transactions tend to be easy and inexpensive. This is often a quiet period for the
        network.
      </p>
    ),
    "UNKNOWN/DEGRADED": (
      <p className="mt-3">
        <span className="font-medium text-white">UNKNOWN/DEGRADED</span> means the model does not
        have enough confidence in the current data to assign a named state. The raw data may still be
        shown, but you should not rely on the regime label as a meaningful signal until confidence
        recovers.
      </p>
    ),
  };

  return {
    title: `Published regime: ${safeLabel}`,
    subtitle: "The headline state shown for the chain right now.",
    basic: (
      <>
        <p>
          A blockchain network is not always in the same condition. Sometimes it is quiet and cheap.
          Sometimes it is flooded with activity and fees are high. The regime label is a single word
          that summarises what kind of condition the network is currently in, based on its own recent
          history.
        </p>
        {labelDescriptions[safeLabel] ?? labelDescriptions["UNKNOWN/DEGRADED"]}
        <p className="mt-3">
          The label is not a prediction of what will happen next. It is a description of what the
          latest available data currently shows, nothing more.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The regime label is a deterministic output of the meta layer, not a browser-side heuristic.
          It is derived by applying the canonical threshold rules to the published axis scores after
          confidence gating. The classification logic is: CONGESTED if capacity is EXTREME_HIGH or
          (capacity HIGH and friction HIGH); CHEAP if friction LOW and capacity LOW; HEATING if demand
          HIGH and at least one axis trend is HEATING; STABLE if none of the above conditions hold;
          UNKNOWN/DEGRADED if confidence_score is below the canonical gate (default 0.40).
        </p>
        <p className="mt-3">
          Two properties of this classification scheme are worth noting analytically. First, it is
          threshold-based rather than probabilistic, which means small changes in an axis score near a
          threshold boundary can flip the label without implying a large change in the underlying
          data. The scorecard provides continuous scores precisely for this reason — they reveal how
          close to or far from the boundaries the current state is. Second, the confidence gate is
          applied before label assignment, which means a high-signal but low-confidence row is
          forced to UNKNOWN/DEGRADED regardless of axis structure. This is a deliberate epistemological
          guardrail: the model does not publish strong labels under weak evidence.
        </p>
        <p className="mt-3">
          The current label <span className="font-medium">{safeLabel}</span> should therefore be read
          as: the published meta layer has determined, under the current methodology version, chain
          profile, and confidence gate, that the present axis configuration most closely corresponds
          to this qualitative state. It is a deterministic compression of the state vector, not a
          distributional summary or a forecast.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          <InlineCode>meta/&lt;chain&gt;/latest.json</InlineCode>
        </li>
        <li>
          <InlineCode>status.label</InlineCode>
        </li>
        <li>
          <InlineCode>regime.label</InlineCode>
        </li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// Confidence
// ---------------------------------------------------------------------------

export function confidenceExplanation(
  confidenceScore?: unknown,
  dataQualityScore?: unknown,
  labelConfidenceScore?: unknown
): ExplainContent {
  return {
    title: "Confidence",
    subtitle: "How much evidential support the current published state has.",
    basic: (
      <>
        <p>
          Imagine you are reading a weather forecast. A forecast that is based on many consistent
          sensor readings from the past week is more reliable than one based on a single reading from
          three days ago. Confidence works the same way here.
        </p>
        <p className="mt-3">
          The confidence score — a number between 0 and 1 — tells you how well-supported the current
          regime label is by the available data. A score close to 1 means the model has lots of
          consistent, recent evidence pointing in the same direction. A score close to 0 means the
          evidence is thin, missing, or inconsistent, and the label should be taken with a grain of
          salt.
        </p>
        <p className="mt-3">
          Confidence does not tell you whether the chain is doing well or badly. It tells you how
          much to trust the description you are seeing.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          Confidence is a composite evidence-strength scalar defined over the current published row.
          It is not a Bayesian posterior probability of regime persistence, and it is not a forecast
          of future state. It should be interpreted as a data-quality-weighted measure of how
          strongly the current evidence surface supports the visible classification.
        </p>
        <p className="mt-3">
          Where the decomposition is available, two sub-scores are informative. The{" "}
          <InlineCode>data_quality_score</InlineCode> reflects the raw sufficiency and completeness
          of the underlying evidence — null rates, out-of-range values, coverage across the metric
          space. The <InlineCode>label_confidence_score</InlineCode> reflects how strongly the
          available evidence supports the specific published label as opposed to an adjacent label.
          A materially lower label-support term relative to the quality term indicates that data is
          present and well-formed, but the classification margin is narrow — the model is not
          choosing the label with high separation from the nearest alternative.
        </p>
        <p className="mt-3">
          The canonical gate is 0.40. Below this threshold the published label is forced to
          UNKNOWN/DEGRADED regardless of axis structure, because the model treats the evidence as
          insufficient to support a named classification. The Caution band (0.40–0.69) signals that
          the label is publishable but that the margin is reduced: scores are pulled toward 50 (the
          uninformative prior) proportional to how far confidence sits below the Good threshold of
          0.70. This degradation toward neutral is a deliberate epistemic design choice — it prevents
          the scorecard from expressing strong directional reads under weak support.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          confidence_score: <InlineCode>{fmtNumber(confidenceScore)}</InlineCode>
        </li>
        <li>
          data_quality_score: <InlineCode>{fmtNumber(dataQualityScore)}</InlineCode>
        </li>
        <li>
          label_confidence_score: <InlineCode>{fmtNumber(labelConfidenceScore)}</InlineCode>
        </li>
      </ul>
    ),
    raw: { confidenceScore, dataQualityScore, labelConfidenceScore },
  };
}

// ---------------------------------------------------------------------------
// As-of date
// ---------------------------------------------------------------------------

export function asOfExplanation(asOf?: unknown): ExplainContent {
  return {
    title: "Data as of",
    subtitle: "The effective date of the currently displayed state.",
    basic: (
      <>
        <p>
          Blockchains produce data constantly, but this site updates once a day and some networks
          have a built-in delay before data is ready to publish. "Data as of" tells you the exact
          date the current information represents.
        </p>
        <p className="mt-3">
          Think of it like a newspaper date. You might be reading it on Tuesday, but it describes
          what the world looked like on Monday. All the numbers, charts, and labels on this page
          describe the chain as it was on that specific date — not necessarily as it is right now.
        </p>
        <p className="mt-3">
          This is important to keep in mind especially for fast-moving markets. If the date shown is
          a few days old, something could have changed since then that the page does not yet reflect.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The as-of date is the temporal coordinate of the current state vector. It is resolved from
          the canonical hierarchy of date fields in the published meta row and is an immutable
          property of the published contract — it is not a browser clock artifact and not an
          approximation.
        </p>
        <p className="mt-3">
          Operationally, the as-of date matters for three distinct reasons. First, it establishes the
          temporal scope of all statistics visible on the page: z-scores, percentile ranks, and
          moving averages are all computed relative to historical windows that terminate at this date.
          Second, it is a required input to lag computation — the observable lag is the difference
          between today&apos;s UTC date and this field. Third, it is a reproducibility anchor: given
          the same as-of date, the same methodology version, and the same published inputs, the meta
          output should be exactly reproducible. The as-of date is therefore part of the provenance
          layer, not a cosmetic label.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          Resolved as-of: <InlineCode>{safe(asOf, "—")}</InlineCode>
        </li>
        <li>
          <InlineCode>updated_through</InlineCode>
        </li>
        <li>
          <InlineCode>regime.asof_date</InlineCode>
        </li>
        <li>
          <InlineCode>scorecard.asof_date</InlineCode>
        </li>
        <li>
          <InlineCode>confidence.date</InlineCode>
        </li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// Lag
// ---------------------------------------------------------------------------

export function lagExplanation(lagDays?: unknown, chainId?: unknown): ExplainContent {
  const chain = safe(chainId, "<chain>");
  return {
    title: "Observed lag",
    subtitle: "How far behind today the current published row is.",
    basic: (
      <>
        <p>
          Lag is simply how many days old the current data is. If it says "1d", the data is from
          yesterday. If it says "7d", the data is from a week ago.
        </p>
        <p className="mt-3">
          Bitcoin and Ethereum update with a 1-day lag — the information you see is from yesterday.
          Arbitrum and Base update with a 7-day lag by design, because their data takes longer to
          process. That is normal and expected for those networks.
        </p>
        <p className="mt-3">
          Lag is separate from confidence. A dataset can be very recent but still have poor quality
          data behind it. Or it can be a week old but be highly consistent and well-supported. You
          need to look at both to get the full picture.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          Observed lag is read from <InlineCode>confidence.lag_days_vs_utc_today</InlineCode> and
          represents the signed integer difference between the current UTC date and the published
          as-of date. It is a freshness-state field, not a quality field, and the two must not be
          conflated.
        </p>
        <p className="mt-3">
          The distinction matters for interpretation because lag and confidence encode structurally
          different failure modes. High lag indicates that the published row is temporally distant
          from the present, which degrades interpretive relevance but not necessarily internal
          coherence. Low confidence indicates that the evidence surface is weak, incomplete, or
          inconsistent, which degrades the reliability of the classification regardless of recency.
          A fresh but thin row can be more misleading than a slightly stale but well-supported one.
        </p>
        <p className="mt-3">
          The per-chain lag policy (BTC/ETH: expected 1d; ARB/BASE: expected 7d) is a product-level
          publication cadence decision, not a data failure. The staleness thresholds — soft warn at
          2d/10d, hard fail at 4d/15d — are calibrated relative to expected lag, not relative to
          zero. Displaying raw lag without this policy context risks misclassifying a normal ARB/BASE
          row as stale.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          Chain: <InlineCode>{chain}</InlineCode>
        </li>
        <li>
          Observed lag:{" "}
          <InlineCode>
            {typeof lagDays === "number" ? `${String(lagDays)}d` : "—"}
          </InlineCode>
        </li>
        <li>
          <InlineCode>confidence.lag_days_vs_utc_today</InlineCode>
        </li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

export function determinismExplanation(hash?: unknown, windowDays?: unknown): ExplainContent {
  return {
    title: "Determinism",
    subtitle: "Reproducibility metadata for the visible state.",
    basic: (
      <>
        <p>
          The hash shown here is like a fingerprint for the calculation that produced today&apos;s
          regime label. If you see the same hash again tomorrow, it means the result came from
          exactly the same inputs and methodology as today.
        </p>
        <p className="mt-3">
          For most visitors this is mainly a trust signal: it means what you are seeing was not
          produced ad hoc in the browser, but by a documented, repeatable process that can be
          audited. If someone claims the label was different on a particular date, the hash can be
          used to verify that claim against the original published output.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The determinism hash is a reproducibility anchor for the published meta output. It is
          computed as a hash over the material inputs to the regime classification — typically
          including the canonical input data, the threshold parameters, the methodology version, and
          the chain profile — such that any change in inputs or parameters would produce a different
          hash.
        </p>
        <p className="mt-3">
          Its primary analytic use is reproducibility verification: given the same hash, the same
          published input files, and the same methodology version, the classification output should be
          exactly recoverable. This is especially relevant for backtesting and track-record
          validation, where distinguishing a canonical historical label from a retconned one is
          critical. The hash provides a tamper-evident timestamp on the published state, not just a
          label string that could be silently revised.
        </p>
        <p className="mt-3">
          Window days must be read alongside the hash because the classification is window-dependent.
          The same chain on the same date under a different window may produce a different axis
          configuration and potentially a different regime label. The hash therefore implicitly
          encodes the window as part of the computation context.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          determinism_hash: <InlineCode>{safe(hash, "—")}</InlineCode>
        </li>
        <li>
          window_days:{" "}
          <InlineCode>
            {typeof windowDays === "number" ? String(windowDays) : "—"}
          </InlineCode>
        </li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// Scorecard overview
// ---------------------------------------------------------------------------

export function scorecardOverviewExplanation(chainId?: unknown): ExplainContent {
  const chain = safe(chainId, "<chain>");
  return {
    title: "Scorecard",
    subtitle:
      "Structural decomposition of the current state into Demand, Friction, and Capacity.",
    basic: (
      <>
        <p>
          The regime label — HEATING, CONGESTED, etc. — gives you a single word for the current
          state. The scorecard breaks that down into three separate readings so you can see which part
          of the network is actually driving it.
        </p>
        <p className="mt-3">
          <span className="font-medium text-white">Demand</span> tells you how much people are using
          the network right now compared to recent history. High demand means a lot of transactions
          and active users. Low demand means it is quiet.
        </p>
        <p className="mt-3">
          <span className="font-medium text-white">Friction</span> tells you how expensive or
          difficult it is to transact. High friction means fees are elevated or transactions are
          failing more often. Low friction means it is cheap and smooth.
        </p>
        <p className="mt-3">
          <span className="font-medium text-white">Capacity</span> tells you how stretched the
          network is from an infrastructure perspective. High capacity pressure means the network is
          close to its limits. Low capacity pressure means there is plenty of room.
        </p>
        <p className="mt-3">
          All three scores are relative to this chain&apos;s own recent history, not compared to
          other blockchains.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The scorecard is the structural layer of the meta output. Its role is to expose the
          axis-level state decomposition that underlies the top-line regime label. Two regime rows
          can share the same label while having materially different internal compositions — for
          example, a HEATING label driven entirely by demand with flat friction is structurally
          different from one driven by coincident demand and capacity pressure. The scorecard makes
          that distinction visible.
        </p>
        <p className="mt-3">
          Each axis score is computed on a 0–100 scale via the mapping{" "}
          <InlineCode>50 + 40 × tanh(z / 1.5)</InlineCode>, where z is the combined robust z-signal
          for that axis. This mapping is bounded, monotone, and centred at 50 under z = 0, with
          saturation behaviour at the extremes. The tanh scale parameter (1.5) determines how quickly
          the score saturates: at z = 1.5, score ≈ 70; at z = 3.0, score ≈ 90. This prevents the
          scorecard from expressing implausibly extreme readings under moderate signals.
        </p>
        <p className="mt-3">
          The coverage factor and effective confidence per axis are the appropriate epistemic
          qualifiers on the score. Coverage factor reflects how many of the expected metric inputs
          for that axis are available and non-null. Effective confidence is the product of coverage
          factor and the global confidence score. A high-scoring axis with low effective confidence
          should be read as directionally suggestive but not well-supported — the score has been
          pulled toward 50 (neutral) in proportion to the confidence deficit. The UI is contract-bound
          to display these qualifiers for {chain} rather than presenting only the headline score.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          <InlineCode>meta/{chain}/latest.json</InlineCode>
        </li>
        <li>
          <InlineCode>scorecard.dimensions.demand</InlineCode>
        </li>
        <li>
          <InlineCode>scorecard.dimensions.friction</InlineCode>
        </li>
        <li>
          <InlineCode>scorecard.dimensions.capacity</InlineCode>
        </li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// Scorecard axis
// ---------------------------------------------------------------------------

export function scorecardAxisExplanation(
  axis?: unknown,
  level?: unknown,
  score?: unknown,
  coverageFactor?: unknown,
  effectiveConfidence?: unknown
): ExplainContent {
  const safeAxis = safe(axis, "Axis");
  const safeLevel = safe(level, "unknown");

  const axisBasicDescriptions: Record<string, ReactNode> = {
    demand: (
      <>
        <p>
          Demand measures how much people are actually using the network right now — transactions,
          active addresses, and overall throughput — compared to what has been normal over the recent
          past.
        </p>
        <p className="mt-3">
          A high demand score means the network is seeing notably strong usage. A low demand score
          means it is quiet. A score around 50 means usage looks roughly normal. The score says
          nothing about whether that is good or bad — it is just a description of current activity
          relative to recent history.
        </p>
      </>
    ),
    friction: (
      <>
        <p>
          Friction measures how costly or difficult it currently is to use the network — mainly
          through fees, but also through how often transactions fail when the network is overloaded.
        </p>
        <p className="mt-3">
          A high friction score means fees are elevated and transacting is more expensive than usual.
          A low friction score means fees are low and it is cheap to use the network. Friction often
          rises when demand rises, because more people competing for the same space drives prices up
          — but not always, which is why it is tracked separately from demand.
        </p>
      </>
    ),
    capacity: (
      <>
        <p>
          Capacity measures how close the network is to its operational limits — how full blocks are,
          or how much headroom there is before things start to slow down or become more expensive.
        </p>
        <p className="mt-3">
          High capacity pressure means the network is stretched. Low capacity pressure means there is
          plenty of room. Even when demand is moderate, capacity can become a bottleneck if blocks
          fill up consistently — which is when you tend to see fees start rising in anticipation.
        </p>
      </>
    ),
  };

  const axisAdvancedDescriptions: Record<string, ReactNode> = {
    demand: (
      <>
        <p>
          The demand axis aggregates robust z-signals from usage-proxying metrics — primarily
          transaction count and unique active addresses, with chain-specific weighting. Its 0–100
          score reflects how far the current demand state sits above or below the chain&apos;s own
          historical centre, compressed through the tanh mapping.
        </p>
        <p className="mt-3">
          Analytically, the demand axis is the most cleanly interpretable of the three because its
          input metrics are less susceptible to protocol-level distortion than friction or capacity
          metrics. Transaction count is a direct throughput observable; active addresses are a
          participation observable. Neither is directly manipulable by fee mechanism design, which
          means the demand signal is relatively stable across protocol upgrades and fee mechanism
          changes that might otherwise contaminate friction or capacity readings.
        </p>
        <p className="mt-3">
          The main caveat is that transaction count can be inflated by high-frequency low-value
          activity (e.g., NFT minting campaigns, airdrop hunting) in ways that decouple it from
          economically meaningful demand. The presence of unique address metrics provides a partial
          corrective, but mechanically driven address generation can dilute that signal too. The
          driver decomposition below the scorecard is the appropriate place to interrogate which
          specific metrics are doing the most work in the current demand reading.
        </p>
      </>
    ),
    friction: (
      <>
        <p>
          The friction axis aggregates signals from cost and failure metrics — primarily median
          transaction fee and, where available for EVM chains, failed-transaction rate. Its score
          reflects how far current friction conditions sit above or below the chain&apos;s own
          historical friction centre.
        </p>
        <p className="mt-3">
          The friction axis has a structural interaction with the demand and capacity axes that
          requires care in interpretation. On chains with dynamic fee mechanisms (EIP-1559 on
          Ethereum), base fee adjusts algorithmically in response to utilization. This means friction
          can rise rapidly when capacity pressure builds, creating apparent simultaneity in the
          friction and capacity signals. On chains without such mechanisms (Bitcoin, pre-1559
          Ethereum), friction is determined more purely by competitive bidding, which produces
          different lead-lag dynamics between demand, friction, and capacity.
        </p>
        <p className="mt-3">
          Methodologically, a high friction score with low demand and low capacity scores is the
          diagnostic signature of an exogenous fee shock rather than organic congestion. Such cases —
          protocol-level anomalies, large single-actor fee events, or data artefacts — are worth
          flagging when reading the driver decomposition, because the scorecard cannot distinguish
          them from genuinely elevated systemic friction without additional context.
        </p>
      </>
    ),
    capacity: (
      <>
        <p>
          The capacity axis measures the proximity of the chain&apos;s current throughput to its
          operational ceiling. On Ethereum L1, the primary input is gas utilization against the
          target (EIP-1559 mechanism). On Bitcoin, capacity is proxied through block-time instability
          and fee dynamics, since there is no direct gas-utilization observable. On L2 networks, the
          capacity signal is derived from L2-appropriate throughput proxies rather than L1 gas
          semantics.
        </p>
        <p className="mt-3">
          The capacity axis is arguably the most chain-type-sensitive of the three, which is why the
          chain profile layer matters most here. Applying an ETH L1 gas-utilization interpretation to
          an L2 or Bitcoin would produce a semantically invalid signal. The hidden-metrics rule exists
          precisely to prevent that: metrics that would be misleading for a given chain type are
          excluded from the axis entirely rather than being shown as zero or null.
        </p>
        <p className="mt-3">
          From an analytic standpoint, the capacity axis is most useful when read in conjunction with
          the demand axis. Coincident high capacity and high demand is the canonical congestion
          signature. High capacity with low demand is unusual and may indicate block-level data
          artefacts or protocol anomalies worth investigating in the driver detail. Low capacity with
          high demand can indicate that the network is absorbing growth without yet showing strain —
          a potentially transitional state.
        </p>
      </>
    ),
  };

  const axisKey = safeAxis.toLowerCase();

  return {
    title: `${safeAxis} axis`,
    subtitle: "What this dimension measures and how to interpret its current state.",
    basic: (
      <>
        {axisBasicDescriptions[axisKey] ?? (
          <p>
            {safeAxis} is one of three structural lenses the scorecard uses to break down the
            chain&apos;s current state. The score runs from 0 to 100, where 50 is normal relative
            to recent history, higher means elevated, and lower means depressed.
          </p>
        )}
        <p className="mt-3">
          The current level for this axis is{" "}
          <span className="font-medium text-white">{safeLevel}</span>, which corresponds to a score
          of <span className="font-medium text-white">{fmtNumber(score, 0)}</span> out of 100.
        </p>
      </>
    ),
    advanced: (
      <>
        {axisAdvancedDescriptions[axisKey] ?? (
          <p>
            The {safeAxis} axis is a published continuous score derived from the robust z-signals of
            its contributing metrics, mapped through the canonical tanh compression. Coverage factor
            and effective confidence qualify the score for epistemic weight.
          </p>
        )}
        <p className="mt-3">
          Coverage factor of{" "}
          <span className="font-medium">{fmtNumber(coverageFactor)}</span> and effective confidence
          of <span className="font-medium">{fmtNumber(effectiveConfidence)}</span> are the
          appropriate epistemic qualifiers. If effective confidence is materially below the global
          confidence score, it indicates that the coverage of input metrics for this axis is
          contributing to the overall confidence deficit rather than the global data surface.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          level: <InlineCode>{safeLevel}</InlineCode>
        </li>
        <li>
          score: <InlineCode>{fmtNumber(score, 0)}</InlineCode>
        </li>
        <li>
          coverage_factor: <InlineCode>{fmtNumber(coverageFactor)}</InlineCode>
        </li>
        <li>
          effective_confidence: <InlineCode>{fmtNumber(effectiveConfidence)}</InlineCode>
        </li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// Drivers overview
// ---------------------------------------------------------------------------

export function driversOverviewExplanation(chainId?: unknown): ExplainContent {
  const chain = safe(chainId, "<chain>");
  return {
    title: "Drivers",
    subtitle: "The strongest visible explanatory rows behind the current regime.",
    basic: (
      <>
        <p>
          If the regime label tells you <em>what</em> state the network is in, drivers tell you{" "}
          <em>why</em>. They are the specific metrics that are currently standing out most strongly
          relative to recent history, and therefore doing the most work in producing the current
          label.
        </p>
        <p className="mt-3">
          Think of drivers like symptoms in a medical diagnosis. The diagnosis (regime) is the
          conclusion, but the symptoms (drivers) show you which specific signals led the model there.
          If transaction count is a driver, it means transaction count is currently unusually high or
          low. If fees are a driver, fees are notably different from recent normal.
        </p>
        <p className="mt-3">
          Drivers are sorted by how strongly they stand out, so the most prominent one is always at
          the top.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          Driver rows are published explanatory artefacts from the meta layer, ranked by{" "}
          <InlineCode>|z_robust|</InlineCode> descending. They expose the highest-salience metric
          evidence within the current meta row for {chain}.
        </p>
        <p className="mt-3">
          Three properties of the driver set are analytically important. First, it is a ranked
          published subset — not every metric the model evaluated is visible. Absence from the driver
          list does not imply a metric is uninformative; it implies it ranked below the display
          threshold under the current axis structure. Second, the driver set is not independent
          across rows: adjacent metrics (e.g., transaction count and active addresses) are often
          collinear, and seeing both in the driver list implies reinforcing rather than diversified
          evidence. Third, the axis labels on each driver row indicate which scorecard dimension that
          driver primarily contributes to — they are the linking mechanism between the metric-level
          evidence and the axis-level structure.
        </p>
        <p className="mt-3">
          The correct interpretive posture is to treat the driver set as a compressed explanatory
          projection of the regime, not as a complete factor decomposition. If the driver set looks
          thin or internally inconsistent relative to the visible regime label, that is a useful
          diagnostic signal worth checking against the confidence and coverage fields.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          <InlineCode>meta/{chain}/latest.json</InlineCode>
        </li>
        <li>
          <InlineCode>regime.drivers[]</InlineCode>
        </li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// Driver metric
// ---------------------------------------------------------------------------

export function driverMetricExplanation(
  metric?: unknown,
  axis?: unknown,
  chainId?: unknown
): ExplainContent {
  const m = safe(metric, "metric");
  const a = safe(axis, "axis");
  const c = safe(chainId, "<chain>");

  const metricBasicDescriptions: Record<string, string> = {
    tx_count_daily:
      "This counts how many confirmed transactions happened on the network in a single day. More transactions means more people are using the network. It is the most direct measure of how busy the network is.",
    block_count_daily:
      "This counts how many blocks of transactions were produced in a day. For most chains this is roughly constant, so deviations from normal are interesting — they can signal changes in how the network is producing blocks.",
    value_transferred_native:
      "This is the total amount of the chain's native currency that moved between addresses in a day. It captures the economic volume flowing through the network, though it must be interpreted carefully because it includes both meaningful transfers and technical artefacts.",
    median_tx_fee_native:
      "This is the typical (middle value) fee paid per transaction on that day, in the network's own currency. When fees rise, it usually means competition for space is increasing. When fees fall, the network is less congested.",
    failed_tx_rate:
      "This measures what percentage of transactions failed — meaning they were attempted but did not complete successfully. A rising failure rate often indicates the network is under stress and not all requests can be processed.",
    gas_utilization_pct:
      "This measures how full the blocks are, as a percentage of total available gas capacity. Blocks that are consistently close to 100% full indicate the network is running near its limits. Blocks that are less full indicate there is room to spare.",
    unique_active_addresses:
      "This counts how many unique wallet addresses sent or received transactions in a day. It is a measure of how many distinct participants are actively using the network — a proxy for user engagement.",
    avg_block_time_sec:
      "This measures the average time between blocks. For Bitcoin, the target is about 10 minutes. Faster or slower block times can indicate changes in mining activity or network stability.",
  };

  return {
    title: m,
    subtitle: `Why ${m} appears in the current driver list.`,
    basic: (
      <>
        <p>
          {metricBasicDescriptions[m] ??
            `This metric is visible because it is currently one of the strongest signals explaining the chain's state relative to its own recent history.`}
        </p>
        <p className="mt-3">
          It has been identified as a{" "}
          <span className="font-medium text-white">{a}</span> signal — meaning it is primarily
          contributing to the {a} part of the scorecard.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The presence of <InlineCode>{m}</InlineCode> in the driver set for {c} indicates that its
          current <InlineCode>z_robust</InlineCode> ranks sufficiently high in the{" "}
          <InlineCode>|z_robust|</InlineCode>-sorted driver set to survive the display threshold.
          The axis assignment (<InlineCode>{a}</InlineCode>) reflects the meta layer&apos;s
          classification of which scorecard dimension this metric primarily informs.
        </p>
        <p className="mt-3">
          Two interpretive cautions apply. First, high salience in the driver set is a necessary but
          not sufficient condition for structural regime relevance: a metric can produce a high
          z_robust through short-lived noise while the broader MA30 and momentum structure remains
          flat. The chart and momentum fields on this driver row are the appropriate correctives.
          Second, the driver row represents the metric&apos;s contribution to the current published
          row only — it does not imply the metric will remain prominent in subsequent publications.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          metric: <InlineCode>{m}</InlineCode>
        </li>
        <li>
          axis: <InlineCode>{a}</InlineCode>
        </li>
        <li>
          <InlineCode>regime.drivers[]</InlineCode>
        </li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// Driver stat (z, pct, momentum, current)
// ---------------------------------------------------------------------------

export function driverStatExplanation(
  kind?: unknown,
  value?: unknown,
  metric?: unknown
): ExplainContent {
  const k = safe(kind, "statistic");
  const m = safe(metric, "metric");

  const statContent: Record<
    string,
    { title: string; subtitle: string; basic: ReactNode; advanced: ReactNode }
  > = {
    z: {
      title: `Robust z-score for ${m}`,
      subtitle: "How unusual the current reading is relative to recent history.",
      basic: (
        <>
          <p>
            The z-score is a measure of how far the current reading is from what has been normal
            recently. You can think of it like a distance measurement in units of "typical variation."
          </p>
          <p className="mt-3">
            A z-score of 0 means perfectly normal. A z-score of +2 means the metric is running
            about twice as far above normal as it typically varies. A z-score of −2 means it is
            running well below normal.
          </p>
          <p className="mt-3">
            The current value is{" "}
            <span className="font-medium text-white">{fmtNumber(value, 2)}</span>. Values above{" "}
            <span className="font-medium text-white">+1.5</span> or below{" "}
            <span className="font-medium text-white">−1.5</span> are considered notable.
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            <InlineCode>z_robust</InlineCode> is the MAD-standardised distance of the current
            observation from the rolling historical median, defined as{" "}
            <InlineCode>0.6745 × (x − median) / MAD</InlineCode>. The 0.6745 scaling factor makes
            the statistic asymptotically equivalent to a standard z-score under Gaussian assumptions,
            preserving familiar magnitude interpretations while inheriting the outlier robustness of
            the MAD estimator.
          </p>
          <p className="mt-3">
            The MAD-based form is appropriate here because on-chain metric distributions are often
            heavy-tailed or episodically punctuated by extreme events (congestion spikes, protocol
            upgrades, market dislocations) that would bias a mean/std z-score upward in the
            denominator, artificially compressing the signal. By using the median and MAD, the
            statistic preserves sensitivity to moderate structural shifts while being less susceptible
            to denominator inflation from historical extremes.
          </p>
          <p className="mt-3">
            Fallback behaviour: if MAD = 0 (degenerate distribution, e.g., a perfectly flat series),
            the pipeline falls back to standard z-score. If std = 0 as well, the value is set to 0.
            The current value is{" "}
            <span className="font-medium">{fmtNumber(value, 2)}</span>. The threshold for HIGH
            classification is z_robust ≥ 1.5 (or pct_90d ≥ 80); EXTREME_HIGH is ≥ 2.5 (or pct ≥ 90).
          </p>
        </>
      ),
    },
    pct: {
      title: `90-day percentile for ${m}`,
      subtitle: "Where today's reading sits inside the recent 90-day range.",
      basic: (
        <>
          <p>
            The percentile tells you where today&apos;s reading ranks compared to the last 90 days
            of data. It works exactly like a percentile score on a test.
          </p>
          <p className="mt-3">
            A percentile of <span className="font-medium text-white">90%</span> means today&apos;s
            reading is higher than 90 out of the last 100 days of data. A percentile of{" "}
            <span className="font-medium text-white">10%</span> means it is lower than almost all
            recent days.
          </p>
          <p className="mt-3">
            The current value is{" "}
            <span className="font-medium text-white">{fmtNumber(value, 1)}%</span>. Above 80% is
            considered high; below 20% is considered low.
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            <InlineCode>pct_90d</InlineCode> is the empirical percentile rank of the current
            observation within the trailing 90-day sample, defined as the proportion of historical
            values ≤ current value, scaled to [0, 100]. A minimum of 30 non-null observations is
            required; below that threshold the statistic is suppressed rather than approximated.
          </p>
          <p className="mt-3">
            Percentile rank is a positional statistic, not a distance statistic. It is complementary
            to z_robust rather than redundant with it. z_robust answers "how many robust standard
            deviations away from the median is this reading?" — a distance question. pct_90d answers
            "what fraction of the recent empirical distribution does this reading exceed?" — a rank
            question. The two can diverge in meaningful ways: a reading can be at the 95th percentile
            of a compressed distribution while having a modest z_robust, or vice versa in a
            fat-tailed distribution.
          </p>
          <p className="mt-3">
            Using both statistics in the driver row ensures that neither distributional shape nor
            extreme values alone can dominate the salience signal. The HIGH threshold (pct ≥ 80,
            z ≥ 1.5) is a union condition — either criterion is sufficient — which means the driver
            can be flagged as notable even when one statistic is uninformative due to distributional
            degeneracy.
          </p>
        </>
      ),
    },
    mom: {
      title: `Momentum (7d vs 30d) for ${m}`,
      subtitle: "Whether the short-term trend is accelerating or decelerating.",
      basic: (
        <>
          <p>
            Momentum tells you whether the metric is currently trending upward or downward compared
            to a slightly longer baseline. Think of it as the direction of travel, not the current
            position.
          </p>
          <p className="mt-3">
            A <span className="font-medium text-white">positive</span> momentum value means the
            most recent week looks stronger than the broader recent month. The metric is picking up.
            A <span className="font-medium text-white">negative</span> value means the recent week
            is weaker than the recent month. The metric is fading.
          </p>
          <p className="mt-3">
            A value near zero means there is no meaningful short-term acceleration in either
            direction. The current value is{" "}
            <span className="font-medium text-white">{fmtNumber(value, 3)}</span>.
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            <InlineCode>momentum_7d_vs_30d</InlineCode> is defined as{" "}
            <InlineCode>z_robust(mean_7d) − z_robust(mean_30d)</InlineCode>, where both means are
            computed over their respective trailing windows and then robustly standardised against
            the same 180-day historical baseline. The result is a dimensionless acceleration
            statistic: positive values indicate the short-horizon robust z exceeds the medium-horizon
            robust z, negative values indicate the opposite.
          </p>
          <p className="mt-3">
            The construction is deliberate. By expressing both windows in the same robust-z units
            before differencing, the statistic removes level effects — it does not matter whether
            the metric is in fee units or transaction counts. What remains is a pure direction-of-drift
            signal that is comparable across unlike metrics on a common scale. This is why momentum
            is useful for driver ranking and regime classification: it adds information orthogonal to
            both z_robust (level) and pct_90d (rank).
          </p>
          <p className="mt-3">
            The threshold for a HEATING trend classification is momentum ≥ 0.15; COOLING is ≤ −0.15.
            Values in the (−0.15, 0.15) range are classified as FLAT. These thresholds are calibrated
            to suppress noise from short-run sampling variance while remaining responsive to
            genuinely accelerating conditions. The current value is{" "}
            <span className="font-medium">{fmtNumber(value, 3)}</span>.
          </p>
        </>
      ),
    },
    current: {
      title: `Current raw value for ${m}`,
      subtitle: "The latest observed level in native units.",
      basic: (
        <>
          <p>
            This is the actual measured number from the most recent published day — in the
            metric&apos;s own units, with no conversion or normalisation applied.
          </p>
          <p className="mt-3">
            It is useful because it gives you the concrete, real-world figure behind all the
            percentages and scores. If median fee is 0.0003 ETH, that is what users were actually
            paying. If transaction count is 1.2 million, that is how many transactions the network
            processed.
          </p>
          <p className="mt-3">
            On its own, the raw value can be hard to interpret without context. That is why the
            z-score and percentile are shown alongside it — they tell you whether that raw number is
            high, low, or normal relative to recent history.
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            The current value is the direct terminal observation carried from the gold layer into the
            driver row — the raw metric value at the as-of date, in native units, with no frontend
            normalisation or scaling applied. It exists for auditability: it allows the reader to
            verify that the standardised statistics are being computed over a sensible observed level
            rather than an artefactual one.
          </p>
          <p className="mt-3">
            The current raw value should not be read as the primary analytical quantity. The four
            driver statistics answer distinct questions: z_robust (how many robust standard
            deviations from the median?), pct_90d (what empirical percentile rank?), momentum (is
            the short-horizon z accelerating above the medium-horizon z?), and current (what is the
            actual underlying quantity?). These are not interchangeable. Reading only current value
            without the standardised context discards the historical distributional information that
            gives it interpretive meaning.
          </p>
          <p className="mt-3">
            The specific utility of the raw value is in cross-referencing with external sources —
            blockchain explorers, alternative data vendors — where the same metric in native units
            can be verified independently. This is part of the traceability contract: the page
            publishes the anchor quantity so the reader can audit the standardisation chain from raw
            observation to regime classification.
          </p>
        </>
      ),
    },
  };

  const content = statContent[k] ?? {
    title: `${k} for ${m}`,
    subtitle: "How this driver statistic should be interpreted.",
    basic: (
      <p>
        This statistic characterises one aspect of why the metric is currently notable. It should be
        read together with the other driver fields, not in isolation.
      </p>
    ),
    advanced: (
      <p>
        Driver statistics are published explanatory fields. Each captures a different property of the
        metric&apos;s current state — magnitude, rank, direction, or level — and they are designed
        to be interpreted jointly rather than hierarchically.
      </p>
    ),
  };

  return {
    title: content.title,
    subtitle: content.subtitle,
    basic: content.basic,
    advanced: content.advanced,
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          kind: <InlineCode>{k}</InlineCode>
        </li>
        <li>
          metric: <InlineCode>{m}</InlineCode>
        </li>
        <li>
          displayed value:{" "}
          <InlineCode>
            {typeof value === "number" ? String(value) : safe(value, "—")}
          </InlineCode>
        </li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// Chart explanations
// ---------------------------------------------------------------------------

export function chartHowToReadExplanation(
  metric?: unknown,
  windowDays?: unknown,
  unitLabel?: unknown
): ExplainContent {
  const m = safe(metric, "metric");
  const w = typeof windowDays === "number" ? windowDays : null;
  const unit = safe(unitLabel, "native units");

  return {
    title: `How to read ${m}`,
    subtitle: "What the three lines mean and how to use them together.",
    basic: (
      <>
        <p>
          The chart shows three versions of the same metric over the selected time window. They are
          not three different things — they are three different views of the same underlying data,
          each smoothed to a different degree.
        </p>
        <p className="mt-3">
          <span className="font-medium text-white">The raw line</span> (thin, lower opacity) shows
          exactly what happened each day. It is the most detailed but also the noisiest — single-day
          spikes and drops are visible here.
        </p>
        <p className="mt-3">
          <span className="font-medium text-white">MA7</span> is the 7-day moving average. It
          smooths out the last week of data, giving you a cleaner view of recent short-term trends
          without the day-to-day noise.
        </p>
        <p className="mt-3">
          <span className="font-medium text-white">MA30</span> is the 30-day moving average. It
          smooths out a full month, giving you the broader trend direction. When MA7 rises above MA30
          and stays there, that is usually a meaningful signal that something has genuinely shifted —
          not just a one-day event.
        </p>
        {w ? (
          <p className="mt-3">
            You are currently looking at the last{" "}
            <span className="font-medium text-white">{w} days</span>. Values are in{" "}
            <span className="font-medium text-white">{unit}</span>.
          </p>
        ) : null}
      </>
    ),
    advanced: (
      <>
        <p>
          The chart renders three series: the raw daily observation from the gold layer, the 7-day
          arithmetic moving average from the derived layer (<InlineCode>__ma7</InlineCode>), and the
          30-day arithmetic moving average (<InlineCode>__ma30</InlineCode>). MA7 and MA30 are
          computed over the last 7 and 30 non-null days respectively, with{" "}
          <InlineCode>connectNulls = false</InlineCode> — gaps in data produce visible breaks in the
          line rather than interpolated fills, which preserves honest representation of data
          availability.
        </p>
        <p className="mt-3">
          The analytically correct posture for reading this chart is relational and shape-based
          rather than pointwise. The four structural features worth attending to are: (1) the
          amplitude of raw-series volatility relative to the MA7 envelope, which characterises
          day-to-day noise; (2) the sign and magnitude of the MA7 − MA30 gap, which is the visual
          analogue of the momentum statistic; (3) the slope of MA30 over the visible window, which
          characterises the medium-term trend direction; and (4) where the current endpoint sits
          relative to the visible range, which provides eyeball context for the pct_90d statistic.
        </p>
        <p className="mt-3">
          A regime-relevant chart pattern is not a single spike in the raw series. It is a sustained
          elevation of MA7 above MA30 that persists for multiple weeks, ideally with an upward slope
          in MA30 as well. A spike that reverts within 3–5 days is more consistent with noise or a
          transient event than with a structural regime shift. This distinction is exactly what the{" "}
          <InlineCode>momentum_7d_vs_30d</InlineCode> statistic is designed to formalise.{" "}
          {w ? (
            <>
              At the current {w}-day window, {w >= 180 ? "MA30 trends are clearly visible and the window is wide enough to identify multi-month structural shifts." : w >= 90 ? "MA30 provides a meaningful baseline and short-term deviations from it are interpretable." : "MA30 provides limited history but MA7 movements relative to it are still informative for recent dynamics."}
            </>
          ) : null}
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          metric: <InlineCode>{m}</InlineCode>
        </li>
        <li>
          window_days:{" "}
          <InlineCode>{w !== null ? String(w) : "—"}</InlineCode>
        </li>
        <li>
          units: <InlineCode>{unit}</InlineCode>
        </li>
        <li>
          <InlineCode>gold/&lt;chain&gt;/lastNd.json</InlineCode> +{" "}
          <InlineCode>derived/&lt;chain&gt;/lastNd.json</InlineCode>
        </li>
      </ul>
    ),
  };
}

export function chartWhyShownExplanation(metric?: unknown, chainId?: unknown): ExplainContent {
  const m = safe(metric, "metric");
  const c = safe(chainId, "<chain>");

  return {
    title: `Why ${m} is shown`,
    subtitle: "Why this metric earned a chart on this page.",
    basic: (
      <>
        <p>
          Not every metric gets a chart. The page selects the metrics that are currently most useful
          for understanding what the chain is doing.
        </p>
        <p className="mt-3">
          <InlineCode>{m}</InlineCode> is shown either because it is one of the strongest driver
          signals right now — meaning it is actively contributing to the current regime label — or
          because it is one of the core context metrics that are always shown for this chain to give
          you a complete picture.
        </p>
        <p className="mt-3">
          If it is a driver metric, it means the model specifically identified it as currently
          notable. If it is a context metric, it is there because understanding this chain without
          it would leave an important gap.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          Chart visibility on the page follows a two-stage selection logic. First, metrics that
          appear in the current driver set are promoted to the chart section because they are actively
          explanatory of the visible regime for {c}. Second, chain-specific default metrics fill
          remaining slots to provide structural context even when those metrics are not currently
          notable. The combined set is then filtered against the chain&apos;s hidden-metrics list,
          ensuring that chain-type-inappropriate signals are never rendered regardless of their
          driver rank.
        </p>
        <p className="mt-3">
          The practical implication is that the visible chart set is not static across time. As the
          driver composition changes with each daily publication, the primary chart slots rotate to
          reflect the currently explanatory metric surface. Persistent presence of a metric in the
          chart section across multiple days therefore indicates sustained driver salience, which is
          itself an interpretive signal about the stability of the current regime.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          metric: <InlineCode>{m}</InlineCode>
        </li>
        <li>
          chain: <InlineCode>{c}</InlineCode>
        </li>
      </ul>
    ),
  };
}
