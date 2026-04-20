import { InlineCode, MethodologyHeader, MethodologyNav, Section, SimpleTable } from "../_components";

const rows = [
  ["date", "Gold / Meta", "ISO date", "UTC calendar date represented by the row", "A"],
  ["chain", "Gold / Meta", "string", "Chain identifier: bitcoin, ethereum, arbitrum, base", "A"],
  ["tx_count_daily", "Gold", "integer", "Total confirmed transactions recorded for the UTC date", "B"],
  ["block_count_daily", "Gold", "integer", "Total blocks recorded for the UTC date", "B"],
  ["value_transferred_native", "Gold", "number", "Total native-denominated transfer value observed for the day", "B"],
  ["median_tx_value_native", "Gold", "number", "Median native-denominated transaction value for the day", "B"],
  ["median_tx_fee_native", "Gold", "number", "Median native-denominated fee burden per transaction for the day", "B"],
  ["failed_tx_rate", "Gold", "ratio or null", "Share of same-day transactions that failed where those semantics are meaningful and reliable", "B"],
  ["gas_utilization_pct", "Gold", "ratio or null", "Fraction of available execution capacity consumed during the day where that concept is meaningful and comparable", "B"],
  ["unique_active_addresses", "Gold", "integer", "Count of distinct same-day sender/recipient addresses after standard exclusions", "B"],
  ["avg_block_time_sec", "Gold", "number or null", "Typical inter-block interval behavior for the UTC day", "B"],
  ["<metric>__ma7", "Derived", "number", "7-day simple moving average of the corresponding Gold metric", "A"],
  ["<metric>__ma30", "Derived", "number", "30-day simple moving average of the corresponding Gold metric", "A"],
  ["derived.meta_confidence", "Derived", "object subset", "Confidence-related Meta fields copied into Derived for chart rendering", "A"],
  ["methodology_version", "Meta", "string", "Version identifier of the analytical methodology governing the row", "A"],
  ["updated_through", "Meta", "ISO date", "Most recent Gold observation date actually available to the Meta calculation", "A"],
  ["publish_lag_days_policy", "Meta", "integer", "Expected normal publication lag for the chain under current policy", "A"],
  ["confidence.confidence_score", "Meta", "0–1 number", "Top-line confidence for the published analytical state", "C"],
  ["confidence.data_quality_score", "Meta", "0–1 number", "Evidence-quality component of confidence", "C"],
  ["confidence.label_confidence_score", "Meta", "0–1 number", "Classification-clarity component of confidence", "C"],
  ["confidence.lag_days_vs_asof_date", "Meta", "integer", "Difference in whole UTC days between date and updated_through", "A"],
  ["confidence.lag_days_vs_utc_today", "Meta/UI", "integer", "Runtime freshness relative to the current UTC date when the row is read", "A (runtime)"],
  ["scorecard.dimensions.<axis>.score_raw", "Meta", "0–100 number", "Pre-confidence axis score before degradation", "C"],
  ["scorecard.dimensions.<axis>.score", "Meta", "0–100 number", "Confidence-degraded published axis score", "A/C"],
  ["scorecard.dimensions.<axis>.effective_confidence", "Meta", "0–1 number", "Axis-level effective confidence applied to the raw score", "C"],
  ["scorecard.dimensions.<axis>.coverage_factor", "Meta", "0–1 number", "Fraction of expected axis components available for the axis calculation", "C"],
  ["scorecard.dimensions.<axis>.level", "Meta", "string", "Public display band for the axis score", "A"],
  ["regime.label", "Meta", "string", "Published categorical regime state", "A"],
  ["regime.ruleset_id", "Meta", "string", "Versioned identifier of the active chain ruleset/profile", "A"],
  ["regime.drivers", "Meta", "array", "Top explanatory signals directionally consistent with the published label", "A/C"],
  ["regime.drivers[].z_robust", "Meta", "number", "Driver-level robust z-score computed from 180-day raw daily history", "C"],
  ["regime.determinism_hash", "Meta", "12-char hex string or null", "Canonical public integrity anchor for named regime rows", "A"],
  ["status.label", "Meta", "string", "Presentation-layer status label for display use", "A"],
  ["status.color", "Meta", "string", "Color family mapping for the status label", "A"],
  ["status.one_liner", "Meta", "string", "Short presentation summary of scorecard state", "A"],
] as const;

export default async function MethodologyFieldsPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <MethodologyHeader
        title="Field Dictionary"
        description="Field-by-field definitions for publicly meaningful Gold, Derived, and Meta outputs. Verification classes distinguish what can be recomputed from published artifacts alone and what must instead be checked against public chain evidence."
      />

      <MethodologyNav />

      <div className="grid gap-6">
        <Section title="How to use this page">
          <p>
            This page is the public field dictionary. It is intentionally more compact than the full methodology reference.
            Use it when you want to answer: what does this field mean, what layer owns it, and how should I verify or interpret it?
          </p>
          <p>
            Verification class <InlineCode>A</InlineCode> means directly reproducible from published artifacts. <InlineCode>B</InlineCode> means independently checkable against public chain evidence. <InlineCode>C</InlineCode> means publicly interpretable but not fully reconstructable.
          </p>
        </Section>

        <Section title="Public field dictionary">
          <SimpleTable
            headers={["Key", "Layer", "Type", "Meaning", "Verification"]}
            rows={rows.map((row) => [
              <InlineCode key={`${row[0]}-k`}>{row[0]}</InlineCode>,
              row[1],
              row[2],
              row[3],
              row[4],
            ])}
          />
        </Section>

        <Section title="Important notes">
          <ul className="list-disc pl-5">
            <li><InlineCode>avg_block_time_sec</InlineCode> should be read as a robust typical block interval measure, not as a promise of a simple arithmetic average.</li>
            <li><InlineCode>confidence.lag_days_vs_utc_today</InlineCode> is runtime freshness context and will change as calendar time advances.</li>
            <li><InlineCode>regime.determinism_hash</InlineCode> is the primary public integrity anchor for named regime rows because archived Meta rows do not currently publish a separate revision integer.</li>
          </ul>
        </Section>
      </div>
    </main>
  );
}
