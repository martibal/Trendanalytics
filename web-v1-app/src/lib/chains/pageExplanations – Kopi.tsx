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

export function getConfidenceNoticeCopy(
  band: ConfidenceBand
): ConfidenceNoticeCopy | null {
  if (band === "Caution") {
    return {
      tone: "caution",
      title: "Reduced confidence",
      body:
        "Confidence is moderate rather than strong. The state remains readable, but it should be interpreted together with lag, scorecard coverage, and the visible driver evidence instead of being treated as a clean high-conviction classification.",
    };
  }

  if (band === "Degraded") {
    return {
      tone: "degraded",
      title: "Degraded confidence",
      body:
        "Confidence is below the canonical support floor. The row is still shown for transparency and traceability, but the state should be treated as weakly supported and potentially closer to UNKNOWN/DEGRADED than to a clean regime read.",
    };
  }

  return null;
}

export function chainProfileExplanation(
  chainId: string,
  displayName: string,
  profileNote?: string | null
): ExplainContent {
  const chain = safe(chainId, "<chain>");
  const note = typeof profileNote === "string" && profileNote.trim().length > 0 ? profileNote : null;

  const basicMap: Record<string, ReactNode> = {
    bitcoin: (
      <>
        Bitcoin is the original base-layer blockchain. It is mainly used as a settlement
        network for BTC transfers, so the page focuses on transaction demand, fees, and
        block-production pressure rather than EVM-style gas semantics.
      </>
    ),
    ethereum: (
      <>
        Ethereum is a general-purpose smart-contract chain. It carries both value transfer
        and application activity, so the page pays close attention to transaction demand,
        active usage, fees, and gas-based capacity pressure.
      </>
    ),
    arbitrum: (
      <>
        Arbitrum is an Ethereum Layer 2. It inherits parts of its economics from Ethereum
        but has its own user activity, fee behavior, and burst patterns, so the page reads
        it as an L2 rather than as an L1 copy.
      </>
    ),
    base: (
      <>
        Base is an Ethereum Layer 2. It is assessed through user activity, fee friction,
        and L2-specific throughput behavior, while avoiding L1-only interpretations that do
        not transfer cleanly to rollup environments.
      </>
    ),
  };

  const advancedMap: Record<string, ReactNode> = {
    bitcoin: (
      <>
        BTC is treated as a non-EVM chain. That means the UI should not imply gas-utilization
        or failed-transaction semantics that belong to Ethereum-style execution environments.
        Capacity is therefore proxied through block-production timing and fee pressure rather
        than through gas saturation. When BTC looks stressed, the interpretation is usually
        about settlement demand competing for limited blockspace, not about smart-contract
        execution congestion.
      </>
    ),
    ethereum: (
      <>
        ETH L1 is an execution chain where demand, fee pressure, and gas utilization interact
        directly. In practice, that makes Ethereum one of the clearest places to interpret the
        demand–friction–capacity triangle: user activity can rise, gas can tighten, and fees can
        transmit that pressure quickly. The chain page therefore treats Ethereum as the canonical
        example of an L1 where capacity friction is visible in both usage and fee terms.
      </>
    ),
    arbitrum: (
      <>
        Arbitrum is handled as an L2 profile rather than as ETH L1. Some L1-native metrics are
        hidden because they would overstate certainty or imply the wrong mechanism. The more
        useful reading is whether L2 user demand, observed fee friction, and throughput-related
        proxies are changing relative to Arbitrum’s own recent history. The interpretation should
        remain chain-relative, not copied from Ethereum’s gas model.
      </>
    ),
    base: (
      <>
        Base is also treated as an L2 profile. The page should therefore emphasize demand and
        friction as experienced by Base users, while handling capacity through L2-appropriate
        proxies instead of L1 gas semantics. This matters because a rollup can look “busy” or
        “cheap” for reasons that are operationally real for users but not identical to Ethereum
        mainnet pressure.
      </>
    ),
  };

  return {
    title: `${displayName} profile`,
    subtitle: "What this chain is, what makes it distinct, and why the page emphasizes the metrics it does.",
    basic: (
      <>
        <p>{basicMap[chain] ?? <>This page gives a product-specific reading of the chain’s recent operating state.</>}</p>
        {note ? (
          <p>
            The published profile note for this chain is: <span className="font-medium text-foreground">{note}</span>
          </p>
        ) : null}
      </>
    ),
    advanced: (
      <>
        <p>{advancedMap[chain] ?? <>The chain profile determines which metrics are emphasized, which are hidden, and which operational caveats matter when reading the scorecard and driver set.</>}</p>
        <p>
          In methodological terms, the page is not trying to make all chains look identical. It is
          trying to produce a comparable descriptive surface while respecting chain-specific semantics.
          That is why hidden metrics, capacity proxies, and explanation text must vary by chain type.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li><InlineCode>meta/&lt;chain&gt;/latest.json</InlineCode> → <InlineCode>profile</InlineCode></li>
        <li><InlineCode>profile.hidden_metrics</InlineCode></li>
        <li><InlineCode>profile.note</InlineCode></li>
      </ul>
    ),
  };
}

export function interpretationMapExplanation(): ExplainContent {
  return {
    title: "How to read the page",
    subtitle: "A compact reading order so users know where to start and what each layer contributes.",
    basic: (
      <>
        <p>
          Start with the top summary cards: they tell you the published regime, how much support the
          reading has, and how fresh the current row is.
        </p>
        <p>
          Then move to the charts to see whether the recent movement looks brief or persistent.
          After that, use Scorecard for structure and Drivers for the “because” behind the state.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The intended reading order is regime → confidence/freshness → charts → scorecard →
          drivers → traceability. That order is deliberate. It prevents the user from over-reading
          one metric before they understand the state classification, the evidence strength, and the
          freshness context in which that metric is being shown.
        </p>
        <p>
          In other words, the page is designed as a progressive interpretation stack. Top cards say
          what the model is publishing. Charts show temporal shape. Scorecard gives structural axis
          decomposition. Drivers provide explanatory evidence. Traceability then anchors everything
          back to the published contract.
        </p>
      </>
    ),
  };
}

export function regimeExplanation(label?: unknown): ExplainContent {
  const safeLabel = safe(label, "UNKNOWN/DEGRADED");
  return {
    title: `Published regime: ${safeLabel}`,
    subtitle: "The headline state shown for the chain right now.",
    basic: (
      <>
        <p>
          Regime is the page’s top-level label for the chain’s current operating state. It is meant
          to answer the question: “What kind of environment does this chain currently look like?”
        </p>
        <p>
          Different labels point to different combinations of demand, friction, and capacity. The
          point is not to predict what happens next, but to describe what kind of state the latest
          published evidence most strongly supports.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The regime label is a published classification from the meta layer, not a browser-side
          heuristic. The frontend should render the canonical label from the published contract
          rather than infer one from charts or visible metrics. This matters because the visible UI
          is only a slice of the full published evidence surface.
        </p>
        <p>
          Conceptually, regime is a deterministic compression of the current state vector. It tells
          the user which qualitative region the chain occupies after the model reconciles scorecard
          structure, driver evidence, and confidence gating. It is therefore an output of the meta
          layer, not a standalone metric.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li><InlineCode>meta/&lt;chain&gt;/latest.json</InlineCode></li>
        <li><InlineCode>status.label</InlineCode></li>
        <li><InlineCode>regime.label</InlineCode></li>
      </ul>
    ),
  };
}

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
          Confidence tells you how much support the page currently has for the visible state.
          It does not tell you whether the state is good or bad, and it does not predict the future.
        </p>
        <p>
          A higher value means the current classification has stronger backing from the available
          data. A lower value means you should read the regime more cautiously and pay extra
          attention to lag, coverage, and missingness.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          Confidence is an evidence-strength scalar, not a directional forecast and not a Bayesian
          probability of persistence. The canonical field is <InlineCode>confidence.confidence_score</InlineCode>.
          It should be interpreted as support for the currently published state conditional on the
          current published evidence surface.
        </p>
        <p>
          Where available, <InlineCode>data_quality_score</InlineCode> and{" "}
          <InlineCode>label_confidence_score</InlineCode> provide a useful decomposition. The former
          speaks more to raw sufficiency and completeness of evidence; the latter speaks more to
          how strongly that evidence supports the exact visible label. A materially lower label-support
          term than quality term is a sign that the data may be present but classification margin is thinner.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>confidence_score: <InlineCode>{fmtNumber(confidenceScore)}</InlineCode></li>
        <li>data_quality_score: <InlineCode>{fmtNumber(dataQualityScore)}</InlineCode></li>
        <li>label_confidence_score: <InlineCode>{fmtNumber(labelConfidenceScore)}</InlineCode></li>
      </ul>
    ),
    raw: { confidenceScore, dataQualityScore, labelConfidenceScore },
  };
}

export function asOfExplanation(asOf?: unknown): ExplainContent {
  return {
    title: "Data as of",
    subtitle: "The effective date of the currently displayed state.",
    basic: (
      <>
        <p>
          “Data as of” tells you which date the current row actually represents. It is the date you
          should keep in mind when interpreting all visible numbers on the page.
        </p>
        <p>
          This is important because different chains can update on different cadences. The page is
          descriptive, so the user must always know exactly how current the visible row is.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The as-of date is a contract field used to anchor interpretation. It is not a runtime guess
          and not a browser clock artifact. The frontend resolves it from the published meta row using
          the canonical hierarchy of available date fields.
        </p>
        <p>
          Operationally, this is the temporal coordinate of the visible state vector. It is therefore
          part of traceability, reproducibility, and freshness governance, not a cosmetic timestamp.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>Resolved as-of: <InlineCode>{safe(asOf, "—")}</InlineCode></li>
        <li><InlineCode>updated_through</InlineCode></li>
        <li><InlineCode>regime.asof_date</InlineCode></li>
        <li><InlineCode>scorecard.asof_date</InlineCode></li>
        <li><InlineCode>confidence.date</InlineCode></li>
      </ul>
    ),
  };
}

export function lagExplanation(lagDays?: unknown, chainId?: unknown): ExplainContent {
  const chain = safe(chainId, "<chain>");
  return {
    title: "Observed lag",
    subtitle: "How far behind today the current published row is.",
    basic: (
      <>
        <p>
          Lag measures freshness. It tells you how many days old the currently shown row is relative
          to today. That is different from confidence: a row can be fresh but weakly supported, or old
          but still internally coherent.
        </p>
        <p>
          You should use lag to judge recency, not validity by itself.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          Lag is a freshness-state field, usually read from{" "}
          <InlineCode>confidence.lag_days_vs_utc_today</InlineCode>. It should not be merged
          conceptually with confidence because the two encode different failure modes: recency drift
          versus evidence weakness.
        </p>
        <p>
          This distinction matters especially for cross-chain comparison. A chain may have a higher
          expected publish lag by policy and still be behaving normally relative to its own cadence.
          That is why the UI must present lag explicitly rather than hiding it inside a single warning badge.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>Chain: <InlineCode>{chain}</InlineCode></li>
        <li>Observed lag: <InlineCode>{typeof lagDays === "number" ? String(lagDays) : "—"}</InlineCode></li>
        <li><InlineCode>confidence.lag_days_vs_utc_today</InlineCode></li>
      </ul>
    ),
  };
}

export function determinismExplanation(hash?: unknown, windowDays?: unknown): ExplainContent {
  return {
    title: "Determinism",
    subtitle: "Reproducibility metadata for the visible state.",
    basic: (
      <>
        <p>
          Determinism shows that the visible regime belongs to a stable published run context rather
          than to something improvised in the browser.
        </p>
        <p>
          For most users this is mainly a trust signal: the state is tied to a concrete published
          calculation context and can be audited later if needed.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The determinism hash is a reproducibility anchor. It indicates that the visible regime is
          associated with a fixed published computation context rather than with unstable client-side
          logic. In methodology terms, it helps separate canonical output from presentation-layer formatting.
        </p>
        <p>
          Window days should be read with the hash because the same chain can have different descriptive
          slices under different windows. Determinism therefore belongs to the provenance layer of the UI:
          it tells the user what kind of published state object they are looking at.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>determinism_hash: <InlineCode>{safe(hash, "—")}</InlineCode></li>
        <li>window_days: <InlineCode>{typeof windowDays === "number" ? String(windowDays) : "—"}</InlineCode></li>
      </ul>
    ),
  };
}

export function scorecardOverviewExplanation(chainId?: unknown): ExplainContent {
  const chain = safe(chainId, "<chain>");
  return {
    title: "Scorecard",
    subtitle: "Structural decomposition of the current state into Demand, Friction, and Capacity.",
    basic: (
      <>
        <p>
          The scorecard helps you break the chain’s current state into three lenses instead of trying
          to understand everything from one headline label.
        </p>
        <p>
          Demand tells you how strong current usage looks. Friction tells you how costly or difficult
          activity currently looks. Capacity tells you whether the chain seems balanced or stretched from
          a throughput perspective.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The scorecard is the structural layer of the meta output. It is designed to expose axis-level
          state even when the top-line regime is unchanged. That matters because two rows can share a
          regime label while having materially different internal composition across demand, friction,
          and capacity.
        </p>
        <p>
          Frontend rendering should remain contract-faithful: the UI is expected to display published axis
          scores, published qualitative levels, coverage factors, and effective confidence from the meta row,
          not re-estimate them. This keeps the presentation layer deterministic and auditable for {chain}.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li><InlineCode>meta/{chain}/latest.json</InlineCode></li>
        <li><InlineCode>scorecard.dimensions.demand</InlineCode></li>
        <li><InlineCode>scorecard.dimensions.friction</InlineCode></li>
        <li><InlineCode>scorecard.dimensions.capacity</InlineCode></li>
      </ul>
    ),
  };
}

export function scorecardAxisExplanation(
  axis?: unknown,
  level?: unknown,
  score?: unknown,
  coverageFactor?: unknown,
  effectiveConfidence?: unknown
): ExplainContent {
  const safeAxis = safe(axis, "Axis");
  const safeLevel = safe(level, "unknown");
  return {
    title: `${safeAxis} axis`,
    subtitle: "What this dimension means and how to interpret its current state.",
    basic: (
      <>
        <p>
          {safeAxis} is one lens in the scorecard. The score gives a compact 0–100 reading and the
          level label translates that score into plain language.
        </p>
        <p>
          “Normal” means normal relative to this chain’s own recent history, not necessarily normal
          versus every other chain in crypto.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          Each scorecard axis is a published continuous score plus a published discretized level. The
          score is useful for seeing magnitude; the level is useful for fast reading and UI consistency.
          Coverage factor and effective confidence are there so the reader can distinguish “high-looking”
          from “well-supported high-looking.”
        </p>
        <p>
          Methodologically, axis-level interpretation should remain chain-relative and window-aware. The
          frontend should therefore resist any temptation to compare raw axis values across chains as if
          they were standardized cross-sectional factors. Their role here is descriptive within a chain,
          not universal across every network.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>level: <InlineCode>{safeLevel}</InlineCode></li>
        <li>score: <InlineCode>{fmtNumber(score, 0)}</InlineCode></li>
        <li>coverage_factor: <InlineCode>{fmtNumber(coverageFactor)}</InlineCode></li>
        <li>effective_confidence: <InlineCode>{fmtNumber(effectiveConfidence)}</InlineCode></li>
      </ul>
    ),
  };
}

export function driversOverviewExplanation(chainId?: unknown): ExplainContent {
  const chain = safe(chainId, "<chain>");
  return {
    title: "Drivers",
    subtitle: "The strongest visible explanatory rows behind the current regime.",
    basic: (
      <>
        <p>
          Drivers answer the question: “Why does the current state look like this?” They list the
          metrics that currently stand out most strongly relative to recent history.
        </p>
        <p>
          That makes this section the explanatory complement to the top-line regime and the scorecard.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          Drivers are published evidence rows, not hand-written commentary. They are meant to expose
          a compact explanatory surface from the broader metric universe in the meta row for {chain}.
        </p>
        <p>
          The important technical point is that visible drivers are a ranked published subset. They
          are not the same thing as “every metric the model looked at,” and they should not be read
          as a complete factor inventory. They are the most salient explanatory rows that survived the
          meta layer’s publication logic.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li><InlineCode>meta/{chain}/latest.json</InlineCode></li>
        <li><InlineCode>regime.drivers[]</InlineCode></li>
      </ul>
    ),
  };
}

export function driverMetricExplanation(metric?: unknown, axis?: unknown, chainId?: unknown): ExplainContent {
  const m = safe(metric, "metric");
  const a = safe(axis, "axis");
  const c = safe(chainId, "<chain>");
  return {
    title: m,
    subtitle: `Why ${m} appears in the current driver list.`,
    basic: (
      <>
        <p>
          This metric appears here because it is one of the clearest visible pieces of evidence
          helping explain the chain’s current state.
        </p>
        <p>
          The axis label tells you which part of the scorecard this metric is mainly helping to explain.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          A driver row is a published explanatory row from the meta layer. If {m} is visible for {c},
          it means the current meta output considers it salient enough to help explain the present state,
          especially in the {a} context.
        </p>
        <p>
          Importantly, this is a visibility decision over a published evidence surface. The row should
          therefore be interpreted as a prioritized explanatory artifact, not as the only relevant metric
          and not as an invitation to ignore the broader scorecard structure.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>metric: <InlineCode>{m}</InlineCode></li>
        <li>axis: <InlineCode>{a}</InlineCode></li>
        <li><InlineCode>regime.drivers[]</InlineCode></li>
      </ul>
    ),
  };
}

export function driverStatExplanation(kind?: unknown, value?: unknown, metric?: unknown): ExplainContent {
  const k = safe(kind, "statistic");
  const m = safe(metric, "metric");
  return {
    title: `${k} for ${m}`,
    subtitle: "How this driver statistic should be interpreted.",
    basic: (
      <>
        <p>
          This number is one part of the evidence for why the metric is currently treated as notable.
          It should be read together with the other driver numbers, not by itself.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          Driver statistics are explanatory fields attached to the published driver row. They are
          not independent signal products. Their proper role is to characterize how unusual, elevated,
          accelerating, or currently large the metric looks relative to the current historical reference set.
        </p>
        <p>
          In rigorous reading, no one statistic should dominate interpretation mechanically. Robust
          magnitude, percentile position, short-vs-medium momentum, and current value each describe
          a different aspect of the metric’s state, and the page should let the user inspect them
          without confusing them for interchangeable quantities.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>kind: <InlineCode>{k}</InlineCode></li>
        <li>metric: <InlineCode>{m}</InlineCode></li>
        <li>displayed value: <InlineCode>{typeof value === "number" ? String(value) : safe(value, "—")}</InlineCode></li>
      </ul>
    ),
  };
}

export function chartHowToReadExplanation(
  metric?: unknown,
  windowDays?: unknown,
  unitLabel?: unknown
): ExplainContent {
  const m = safe(metric, "metric");
  return {
    title: `How to read ${m}`,
    subtitle: "What the three lines mean and how to read them together.",
    basic: (
      <>
        <p>
          The raw line shows day-by-day movement. MA7 smooths the last week, and MA30 smooths the
          last month. Looking at all three together helps you tell the difference between a brief
          spike and a broader trend.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          These chart cards are descriptive overlays of published raw and derived series. In analytic
          terms, the raw line preserves high-frequency daily variation, MA7 acts as a short-horizon
          smoother, and MA30 acts as a lower-frequency baseline. The visual gap between them is often
          more informative than any single line by itself.
        </p>
        <p>
          A technically careful reader should treat the chart as a shape-reading surface rather than as
          a formal test statistic. The card is designed to show regime context, persistence, and recent
          directional structure without collapsing everything into one scalar.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>metric: <InlineCode>{m}</InlineCode></li>
        <li>window_days: <InlineCode>{typeof windowDays === "number" ? String(windowDays) : "—"}</InlineCode></li>
        <li>units: <InlineCode>{safe(unitLabel, "—")}</InlineCode></li>
        <li><InlineCode>gold/&lt;chain&gt;/lastNd.json</InlineCode> + <InlineCode>derived/&lt;chain&gt;/lastNd.json</InlineCode></li>
      </ul>
    ),
  };
}

export function chartWhyShownExplanation(metric?: unknown, chainId?: unknown): ExplainContent {
  const m = safe(metric, "metric");
  const c = safe(chainId, "<chain>");
  return {
    title: `Why ${m} is shown`,
    subtitle: "Why this metric earned space on the chain page.",
    basic: (
      <>
        <p>
          This metric is shown because it is either currently important in the driver set or it is one
          of the core context metrics the page uses to help users understand the chain’s recent behavior.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          Metric visibility on the page is a presentation choice over the published data contract.
          The chain page prioritizes metrics that are currently explanatory, then supplements them with a
          small set of stable context metrics. This prevents the page from becoming a flat dump while
          still preserving enough structure to interpret the visible regime for {c}.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>metric: <InlineCode>{m}</InlineCode></li>
        <li>chain: <InlineCode>{c}</InlineCode></li>
      </ul>
    ),
  };
}
