// src/lib/content/trackRecordExplanations.tsx
import type { ReactNode } from "react";

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
// What is the track record page
// ---------------------------------------------------------------------------

export function whatIsTrackRecordExplanation(): ExplainContent {
  return {
    title: "What is the Track Record page?",
    subtitle: "A plain-language and technical explanation of what you are looking at.",
    basic: (
      <>
        <p>
          The Track Record page shows you the history of what this site actually published about
          each blockchain — day by day, going back through the available data. Every row in the
          table is a real published label from a real date. Nothing has been adjusted or
          reconstructed after the fact.
        </p>
        <p className="mt-3">
          Think of it like an archive of daily weather reports. You can go back and see what the
          "forecast" said on any given day. You can see whether a network spent most of the last
          three months in a STABLE state or was frequently HEATING. You can see whether the
          labels were well-supported by data or whether confidence was often low.
        </p>
        <p className="mt-3">
          This matters because it lets you judge the product honestly. If you see that Ethereum was
          labelled HEATING for three weeks before fees visibly spiked, that is useful context. If
          you see that confidence was consistently Degraded during a period when the labels looked
          strong, you know to treat those labels more cautiously.
        </p>
        <p className="mt-3">
          The page does not tell you what to do with this history. It shows you what was published,
          clearly and without editorialising.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The Track Record page renders the canonical published history bundles for each chain —
          specifically the <InlineCode>meta/&lt;chain&gt;/last90d.json</InlineCode> artifacts.
          These are immutable published outputs of the regime classification pipeline, not
          recomputed or retroactively adjusted values. Each row corresponds to a single daily meta
          artifact identified by its as-of date, methodology_version, and determinism hash where applicable.
        </p>
        <p className="mt-3">
          The page serves three analytical functions. First, it provides a regime frequency
          distribution over the selected window, which characterises the base-rate of each state
          for a given chain and period. This is the appropriate denominator for evaluating how
          unusual any current regime reading is. Second, the regime timeline and confidence history
          visualisations expose persistence and transition structure — how long regimes lasted, how
          often they flipped, and whether confidence was systematically lower in certain regimes.
          Third, the transition matrix quantifies the empirical regime transition probability
          distribution under the current methodology, which is directly relevant for any
          regime-conditional strategy development.
        </p>
        <p className="mt-3">
          A critical interpretive caveat: historical confidence scores are evidence-strength
          measures attached to the published label on each date — they are not posterior
          probabilities of persistence, and they should not be interpreted as such. A row with
          confidence 0.85 does not mean the regime had an 85% probability of continuing; it means
          the published evidence on that date strongly supported the assigned label. The
          distinction matters for anyone attempting to build probabilistic models over this data.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          Source: <InlineCode>meta/&lt;chain&gt;/last90d.json</InlineCode>
        </li>
        <li>
          Fields: <InlineCode>status.label</InlineCode> ·{" "}
          <InlineCode>confidence.confidence_score</InlineCode> ·{" "}
          <InlineCode>methodology_version</InlineCode> · <InlineCode>regime.determinism_hash</InlineCode>
        </li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// Regime mix / stacked bar
// ---------------------------------------------------------------------------

export function regimeMixExplanation(windowDays: number): ExplainContent {
  return {
    title: "Cross-chain regime mix",
    subtitle: "What the stacked bars show and how to read them.",
    basic: (
      <>
        <p>
          The stacked bars give you a quick visual summary of how the last{" "}
          <span className="font-medium text-white">{windowDays} days</span> of published labels
          break down across regime types. Each coloured segment represents a portion of the total
          published days.
        </p>
        <p className="mt-3">
          A long green segment means the network spent most of that period in a STABLE state. A
          long yellow segment means it was frequently HEATING. The lengths of the segments are
          proportional to how many published days fell into each regime — they are not a forecast
          of what comes next.
        </p>
        <p className="mt-3">
          The most useful thing to notice is the <span className="font-medium text-white">
          proportion of degraded days</span>. If a large share of the published window is grey
          (UNKNOWN/DEGRADED), it means the data quality was insufficient to support a named label
          for much of that period. That context matters when you are trying to use historical
          labels to understand a chain&apos;s typical behaviour.
        </p>
        <p className="mt-3">
          This is a descriptive summary — it tells you what was published, not what was happening
          in markets or prices.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The regime mix bars are a frequency distribution of published regime labels over the
          selected window, expressed as a proportion of total published rows. Each segment width
          is <InlineCode>count(regime) / total_rows</InlineCode> for that chain and window. The
          "other" bucket captures any non-canonical labels that survived the pipeline without
          mapping to a standard vocabulary member — in a well-functioning pipeline this should be
          near zero.
        </p>
        <p className="mt-3">
          Reading the frequency distribution analytically: the regime mix is the empirical base
          rate of each state under the current methodology. If STABLE accounts for 70% of published
          days on Ethereum over 90 days, that is the empirical prior probability of seeing STABLE
          on any randomly selected day in that window. This is directly useful for calibrating
          how unusual a current HEATING or CONGESTED reading is relative to recent history.
        </p>
        <p className="mt-3">
          A high UNKNOWN/DEGRADED frequency is a data-quality diagnostic signal, not just a
          missing-data artefact. It indicates that the confidence gate fired frequently — meaning
          the underlying evidence surface was persistently thin, inconsistent, or incompletely
          covered. This can arise from AWS data availability issues, chain-specific reporting
          delays, or genuine instability in the metric space during that period. In either case,
          the presence of many degraded rows should reduce the interpretive weight placed on the
          non-degraded labels in the same window.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          Segment width: <InlineCode>count(label) / total_rows</InlineCode>
        </li>
        <li>
          Source: <InlineCode>status.label</InlineCode> per published daily row
        </li>
        <li>
          Window: last <InlineCode>{windowDays}</InlineCode> published rows per chain
        </li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// Regime timeline
// ---------------------------------------------------------------------------

export function regimeTimelineExplanation(): ExplainContent {
  return {
    title: "Regime Timeline",
    subtitle: "How to read the sequential label history.",
    basic: (
      <>
        <p>
          The regime timeline shows each published day as a coloured block, ordered from oldest
          to newest. Each block&apos;s colour represents the regime label for that day — green for
          STABLE, yellow for HEATING, red for CONGESTED, grey for UNKNOWN/DEGRADED.
        </p>
        <p className="mt-3">
          The most important thing to look for is <span className="font-medium text-white">
          runs of the same colour</span>. A long stretch of green blocks means the network was
          consistently STABLE across many published days — that is persistence. A rapid mix of
          different colours suggests the network was transitioning frequently, or that data quality
          was variable.
        </p>
        <p className="mt-3">
          Persistence matters because a regime that lasts for three weeks is much more meaningful
          than one that appears for a single day and then disappears. The timeline lets you see
          this pattern directly without having to read through a table of dates.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The regime timeline is a sequential visualisation of published label assignments,
          ordered ascending by as-of date. Its primary analytical utility is in exposing regime
          persistence and transition timing — properties that are invisible in aggregate frequency
          distributions but structurally important for understanding how the classification
          behaves in practice.
        </p>
        <p className="mt-3">
          Two properties are worth inspecting analytically. First, run length: how many
          consecutive days a given regime label persisted before transitioning. Long runs in a
          single regime indicate structural stability in the underlying metric space; short
          alternating runs may indicate the chain is near a classification boundary, where small
          metric movements flip the label without implying a genuine regime change. Second, the
          timing of transitions relative to confidence trajectory: if a transition from STABLE to
          HEATING coincides with a visible improvement in confidence score, it is more likely to
          reflect a genuine evidence shift than a noise-driven boundary crossing.
        </p>
        <p className="mt-3">
          Grey blocks (UNKNOWN/DEGRADED) in the timeline should be read as data voids, not as
          genuine regime labels. Their presence disrupts run-length inference for the adjacent
          named regimes — a run of STABLE days interrupted by a grey block does not necessarily
          imply a genuine transition to a new state; it may simply reflect a temporary data
          quality failure.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          Source: <InlineCode>status.label</InlineCode> per row, ordered by{" "}
          <InlineCode>date</InlineCode> ascending
        </li>
        <li>
          Confidence overlay from <InlineCode>confidence.confidence_score</InlineCode>
        </li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// Confidence history
// ---------------------------------------------------------------------------

export function confidenceHistoryExplanation(): ExplainContent {
  return {
    title: "Confidence History",
    subtitle: "How the evidence strength behind published labels changed over time.",
    basic: (
      <>
        <p>
          The confidence history chart shows how strong the data support was for each published
          label, day by day. The confidence score runs from 0 to 1 — higher is better supported.
        </p>
        <p className="mt-3">
          The three horizontal bands help you read the chart quickly:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium text-white">Above 0.70</span> — Good. The label is
            well-supported. Read it normally.
          </li>
          <li>
            <span className="font-medium text-white">Between 0.40 and 0.70</span> — Caution. The
            label is published but with reduced certainty. The scorecard scores were pulled toward
            neutral on these days.
          </li>
          <li>
            <span className="font-medium text-white">Below 0.40</span> — Degraded. The label is
            UNKNOWN/DEGRADED. The data was not sufficient to support a named regime.
          </li>
        </ul>
        <p className="mt-3">
          Periods where the line stays consistently above 0.70 mean the historical labels in that
          window are the most reliable. Periods where it dips below 0.40 frequently mean you
          should treat the labels from those periods with extra caution.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The confidence history chart exposes the temporal trajectory of the evidence-strength
          scalar over the selected window. It is the appropriate quality-weighting layer for any
          analysis that uses the historical regime labels — labels from high-confidence periods
          are more epistemically trustworthy than those from low-confidence periods, even if the
          labels themselves are identical.
        </p>
        <p className="mt-3">
          Three structural patterns are analytically informative. Persistent low confidence across
          a chain for an extended period typically indicates a systematic data availability problem
          — either AWS source data was incomplete, or a metric space change affected coverage.
          Sudden drops in confidence that recover quickly may indicate transient data quality
          events. Confidence that is systematically lower for one chain than others in the same
          period may reflect chain-specific reporting delays or metric coverage differences.
        </p>
        <p className="mt-3">
          For backtesting purposes, the confidence score is a necessary weighting factor. A naive
          backtest that treats all regime labels equally regardless of their confidence score will
          overweight UNKNOWN/DEGRADED periods (where no useful signal exists) and underweight
          high-confidence periods (where the signal is strongest). The correct approach is to
          condition the backtest on confidence band — ideally restricting analysis to rows where
          confidence exceeds the publication floor of 0.40, or better, restricting to the Good
          band (≥ 0.70) for highest-quality signal extraction.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          Source: <InlineCode>confidence.confidence_score</InlineCode> per row
        </li>
        <li>
          Bands: Good ≥ 0.70 · Caution 0.40–0.69 · Degraded &lt; 0.40
        </li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// Transition matrix
// ---------------------------------------------------------------------------

export function transitionMatrixExplanation(): ExplainContent {
  return {
    title: "Transition Matrix",
    subtitle: "How often the published regime changed from one state to another.",
    basic: (
      <>
        <p>
          The transition matrix shows how often the published regime moved from one state to
          another on consecutive days. Each cell tells you: given that yesterday&apos;s label was
          X, how often did today&apos;s label become Y?
        </p>
        <p className="mt-3">
          For example, if the STABLE → HEATING cell shows a count of 8, it means that out of all
          the days where the network was published as STABLE, it transitioned to HEATING on 8
          consecutive days within the selected window.
        </p>
        <p className="mt-3">
          The diagonal — cells where the regime stayed the same — tells you how often each regime
          was <span className="font-medium text-white">persistent</span>. A large number in the
          STABLE → STABLE cell means STABLE was a sticky state: once the network entered it, it
          tended to stay there for multiple days.
        </p>
        <p className="mt-3">
          This is useful for understanding the rhythm of the network. If CONGESTED → STABLE
          transitions are common, it suggests congestion periods are typically short. If
          HEATING → CONGESTED is rare, it suggests HEATING rarely escalates to full congestion
          in the historical data.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The transition matrix is an empirical first-order Markov transition count table over
          the published daily regime sequence, computed per chain and then aggregated across
          chains for the selected window. Each cell <InlineCode>M[i][j]</InlineCode> contains
          the count of consecutive day-pairs where the regime transitioned from state i to state
          j. The diagonal <InlineCode>M[i][i]</InlineCode> counts self-transitions (regime
          persistence).
        </p>
        <p className="mt-3">
          Dividing each row by its row sum gives the empirical transition probability matrix —
          the maximum-likelihood estimator of the transition probability under a first-order
          Markov assumption. This is the appropriate object for any regime-conditional strategy
          development: if you want to know the historical probability that HEATING is followed by
          CONGESTED, normalise the HEATING row and read off the CONGESTED column.
        </p>
        <p className="mt-3">
          Two methodological caveats apply. First, UNKNOWN/DEGRADED transitions contaminate the
          matrix in a non-trivial way. A STABLE → UNKNOWN/DEGRADED → HEATING sequence is recorded
          as two separate transitions (STABLE→DEGRADED and DEGRADED→HEATING), not as one
          STABLE→HEATING transition. If degraded periods are frequent, the transition matrix will
          overstate the centrality of UNKNOWN/DEGRADED as a hub state and understate direct
          transitions between named regimes. Filtering to high-confidence rows before computing
          the matrix is the appropriate correction. Second, the matrix pools transitions across
          all four chains when "all chains" is selected, which implicitly assumes chain homogeneity
          in transition dynamics — an assumption that may not hold, particularly between L1s and L2s.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          Built from consecutive day pairs ordered by <InlineCode>date</InlineCode> ascending,
          per chain
        </li>
        <li>
          Source: <InlineCode>status.label</InlineCode> per published row
        </li>
        <li>
          UNKNOWN/DEGRADED treated as a distinct state in transition counting
        </li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// How to read the historical table
// ---------------------------------------------------------------------------

export function historicalTableExplanation(): ExplainContent {
  return {
    title: "Historical regime table",
    subtitle: "What each column in the table means and how to interpret the rows.",
    basic: (
      <>
        <p>
          Each row in the table represents one published day for one chain. Here is what each
          column tells you:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <span className="font-medium text-white">Date</span> — the calendar date the row
            represents.
          </li>
          <li>
            <span className="font-medium text-white">Chain</span> — which blockchain the row
            is for.
          </li>
          <li>
            <span className="font-medium text-white">Regime</span> — the published label for
            that day: STABLE, HEATING, CONGESTED, CHEAP, or UNKNOWN/DEGRADED.
          </li>
          <li>
            <span className="font-medium text-white">Confidence</span> — how well-supported the
            label was by the available data. 0 to 1, where higher is better.
          </li>
          <li>
            <span className="font-medium text-white">Band</span> — a shorthand for confidence:
            Good (≥ 0.70), Caution (0.40–0.69), or Degraded (&lt; 0.40).
          </li>
          <li>
            <span className="font-medium text-white">Lag</span> — how many days old the data was
            relative to today when it was published. Usually 1 for Bitcoin and Ethereum, 7 for
            Arbitrum and Base.
          </li>
          <li>
            <span className="font-medium text-white">As of</span> — the exact date the data
            describes. This can differ slightly from the Date column in edge cases.
          </li>
          <li>
            <span className="font-medium text-white">Methodology</span> — the version of the
            model that produced this label. If methodology changed between rows, the labels are
            not directly comparable.
          </li>
          <li>
            <span className="font-medium text-white">Published context</span> — methodology version, updated-through, and named-row determinism hash where applicable.
          </li>
        </ul>
      </>
    ),
    advanced: (
      <>
        <p>
          The table renders a chronologically ordered slice of the published meta history bundle.
          Each row is a daily Meta artifact identified publicly by chain, date, methodology_version, and named-row determinism hash where applicable. Historical corrections should be understood through public revision notices and dataset-level provenance, not through a single required integer field.
        </p>
        <p className="mt-3">
          The methodology_version field is the critical comparability boundary. Rows with
          different methodology versions were produced under different classification rules and
          potentially different threshold parameters — naive comparison across a methodology
          version change boundary will conflate genuine network state changes with classification
          rule changes. The methodology changelog at <InlineCode>/methodology/changelog</InlineCode> documents all version transitions.
        </p>
        <p className="mt-3">
          The lag field deserves careful handling. A lag of 1 means the published row describes
          yesterday&apos;s network state. A lag of 7 (normal for ARB/BASE) means the row describes
          the state from a week ago. For any time-series analysis over this data, the correct
          temporal coordinate is the <InlineCode>as_of</InlineCode> date (the observation date),
          not the publication date. Using the publication date as the time index will introduce
          a systematic lag bias into any event study or regime-conditional analysis.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>
          Source: <InlineCode>meta/&lt;chain&gt;/last90d.json</InlineCode>
        </li>
        <li>
          Row identifier: (chain, date, methodology_version, determinism_hash where applicable)
        </li>
        <li>
          Temporal coordinate for analysis: <InlineCode>as_of</InlineCode> date, not publication
          date
        </li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// What revision_id means
// ---------------------------------------------------------------------------

export function revisionIdExplanation(): ExplainContent {
  return {
    title: "How archived rows are identified",
    subtitle: "Public provenance uses the fields actually present in the archive.",
    basic: (
      <>
        <p>
          Archived rows are identified publicly by <InlineCode>chain</InlineCode>, <InlineCode>date</InlineCode>, and <InlineCode>methodology_version</InlineCode>. Named regime rows add <InlineCode>regime.determinism_hash</InlineCode> as the public integrity anchor.
        </p>
        <p className="mt-3">
          This means you do not need a separate revision integer to verify that two people are looking at the same archived named regime row.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          Public provenance should be read through methodology_version, updated_through, dataset revision or publication batch context, and determinism_hash where applicable. This is the canonical public provenance model for archived Meta outputs.
        </p>
        <p className="mt-3">
          For reproducibility auditing, record the public identity tuple for the row in question, retrieve the same published artifact, and verify the determinism hash for named regime rows.
        </p>
      </>
    ),
    traceability: (
      <ul className="list-disc pl-5">
        <li>Fields: <InlineCode>chain</InlineCode>, <InlineCode>date</InlineCode>, <InlineCode>methodology_version</InlineCode></li>
        <li>Named rows: <InlineCode>regime.determinism_hash</InlineCode></li>
        <li>See also: <InlineCode>/methodology/provenance</InlineCode></li>
      </ul>
    ),
  };
}

// ---------------------------------------------------------------------------
// Interpretation boundary on track record
// ---------------------------------------------------------------------------

export function trackRecordBoundaryExplanation(): ExplainContent {
  return {
    title: "Interpretation boundary on this page",
    subtitle: "What this historical data is and is not.",
    basic: (
      <>
        <p>
          Everything on this page is a record of what was actually published on each day. It is
          not a backtest, not a reconstruction, and not a trading signal.
        </p>
        <p className="mt-3">
          A common mistake is to look at a period where a network was labelled HEATING and then
          look at what happened to prices afterwards and draw conclusions. This page does not
          support that kind of analysis because it deliberately does not include price data.
          Whether HEATING correlates with price movements is a separate research question that
          you would need to answer with your own price data.
        </p>
        <p className="mt-3">
          What this page does support: understanding how often each network is in each state,
          how persistent those states tend to be, how the transition between states works, and
          whether the evidence quality was consistent or variable across the period you are
          looking at.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The interpretation boundary on this page is an extension of the product-level boundary:
          no price data, no forecasts, no advisory outputs. In the context of historical regime
          data, this boundary has an additional specific implication — the track record must not
          be treated as a backtested strategy performance record.
        </p>
        <p className="mt-3">
          The regime labels published here are descriptive outputs of the meta layer at each
          date. They do not constitute signals in the trading strategy sense because: (1) they
          were not generated with a particular return objective in mind; (2) they are
          point-in-time published outputs that were available with a 1-7 day lag, not forward
          prices; and (3) the classification rules were not optimised against any outcome variable.
          Using these labels as the basis of a claimed backtest without those caveats would be
          methodologically inappropriate.
        </p>
        <p className="mt-3">
          The legitimate analytical uses of this data are: regime frequency analysis, persistence
          and transition characterisation, confidence quality assessment, methodology version
          impact analysis, and — combined with independently sourced price or flow data — 
          exploratory correlation research with appropriate statistical caveats.
        </p>
      </>
    ),
  };
}
