// src/app/api-docs/schema/page.tsx
// JSON Schema Reference — complete field-level documentation for Gold, Meta, and Derived
// artifacts. This page exists to let potential subscribers understand exactly what they
// receive before subscribing.

import type { ReactNode } from "react";
import Link from "next/link";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { currentDataSource } from "@/lib/storage";

import "server-only";

// ---------------------------------------------------------------------------
// UI primitives
// ---------------------------------------------------------------------------

function ModalStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          .ta-modal { display: none; }
          .ta-modal:target { display: flex; }
        `,
      }}
    />
  );
}

function IC({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>;
}

function MoreLink({ id, label = "More" }: { id: string; label?: string }) {
  return (
    <a
      href={`#${id}`}
      className="inline-flex items-center rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-xs font-medium text-cyan-200 hover:bg-cyan-500/10"
    >
      {label}
    </a>
  );
}

type ExplainPair = { basic: ReactNode; advanced: ReactNode; traceability?: ReactNode };

function ExplainModal({ id, title, subtitle, pair }: {
  id: string; title: string; subtitle?: ReactNode; pair: ExplainPair;
}) {
  return (
    <div id={id} className="ta-modal fixed inset-0 z-[80] items-center justify-center p-4">
      <a href="#" className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" aria-label="Close dialog" />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col rounded-3xl border border-cyan-500/20 bg-[#071322] shadow-2xl shadow-cyan-950/40">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/8 px-6 py-5">
          <div>
            <h3 className="text-2xl font-semibold text-white">{title}</h3>
            {subtitle ? <div className="mt-2 text-sm leading-6 text-slate-300">{subtitle}</div> : null}
          </div>
          <a href="#" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-slate-200 hover:bg-white/10" aria-label="Close dialog">×</a>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-200">Basic</div>
              <div className="mt-3 text-sm leading-7 text-slate-100">{pair.basic}</div>
            </section>
            <details className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5" open>
              <summary className="cursor-pointer list-none text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">Advanced</summary>
              <div className="mt-3 text-sm leading-7 text-slate-100">{pair.advanced}</div>
            </details>
          </div>
          {pair.traceability ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-300">Traceability</div>
              <div className="mt-3 text-sm leading-7 text-slate-200">{pair.traceability}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field row component — the core reusable element of this page
// ---------------------------------------------------------------------------

type FieldRowProps = {
  field: string;
  type: string;
  nullable?: boolean;
  chains?: string;
  basic: ReactNode;
  advanced: ReactNode;
  traceability?: ReactNode;
};

function FieldRow({ field, type, nullable, chains, basic, advanced, traceability }: FieldRowProps) {
  const id = `field-${field.replace(/[^a-zA-Z0-9]/g, "-")}`;
  return (
    <div className="rounded-2xl border bg-background/30 hover:border-white/15 transition-colors">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <IC>{field}</IC>
          <span className="rounded-full border border-slate-500/25 bg-slate-500/10 px-2 py-0.5 font-mono text-[10px] text-slate-400">
            {type}
          </span>
          {nullable ? (
            <span className="rounded-full border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 text-[10px] text-amber-400">
              nullable
            </span>
          ) : null}
          {chains ? (
            <span className="rounded-full border border-purple-500/20 bg-purple-500/5 px-2 py-0.5 text-[10px] text-purple-300">
              {chains}
            </span>
          ) : null}
        </div>
        <MoreLink id={id} label="Explain" />
      </div>
      <div className="border-t border-white/5 px-5 py-3 text-sm text-muted-foreground">
        {basic}
      </div>
      <ExplainModal
        id={id}
        title={field}
        subtitle={<><IC>{type}</IC>{nullable ? " · nullable" : ""}{chains ? ` · ${chains}` : ""}</>}
        pair={{ basic, advanced, traceability }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SchemaPage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <ModalStyles />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <header className="mb-10">
        <div className="rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_40%)] p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <Link href="/api-docs" className="text-xs text-muted-foreground hover:text-cyan-200">
                  ← API Docs
                </Link>
              </div>
              <div className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
                What you actually get
              </div>
              <h1 className="mt-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">
                JSON Schema Reference
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-300">
                Every field in every published JSON file — defined at two levels. This page
                exists so you know exactly what a subscription delivers before you subscribe.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  { href: "#gold", label: "Gold" },
                  { href: "#meta", label: "Meta" },
                  { href: "#derived", label: "Derived" },
                ].map(({ href, label }) => (
                  <a
                    key={label}
                    href={href}
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-slate-200 hover:bg-white/10"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
            {dataset ? (
              <div className="min-w-[200px] rounded-2xl border border-white/10 bg-black/10 px-4 py-4 text-xs text-slate-300">
                <div className="font-medium uppercase tracking-[0.12em] text-slate-400">Dataset</div>
                {dataset.methodology_version ? (
                  <div className="mt-2">Methodology <IC>{dataset.methodology_version}</IC></div>
                ) : null}
                <div className="mt-2 border-t border-white/10 pt-2 text-slate-400">
                  Runtime backend: <IC>{currentDataSource()}</IC> <span className="text-slate-500">(deployment detail)</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-6 rounded-2xl border border-white/8 bg-white/3 p-4 text-sm text-slate-300">
            Each entry shows: the field name, type, whether it can be null, which chains it
            applies to, a plain-language description, and an <span className="text-cyan-200">Explain</span> button
            for full Basic + Advanced + Traceability detail.
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* GOLD                                                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section id="gold" className="mb-12 scroll-mt-8">
        <div className="mb-5 rounded-3xl border border-yellow-500/20 bg-yellow-500/5 p-6 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-yellow-300">Layer 1</div>
          <h2 className="mt-2 text-3xl font-semibold text-white">Gold</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            Raw daily aggregates from the blockchain — exactly what the network did on each
            day, in native units, with no statistical transformation applied. This is the
            authoritative source that all Meta and Derived computations are built from.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
            <IC>gold/&lt;chain&gt;/latest.json</IC>
            <IC>gold/&lt;chain&gt;/last90d.json</IC>
            <IC>gold/&lt;chain&gt;/YYYY-MM-DD.json</IC>
          </div>
        </div>

        <div className="space-y-3">
          <FieldRow
            field="date"
            type="string (YYYY-MM-DD)"
            basic="The calendar date this row represents. All metrics in the row are aggregated over this UTC day."
            advanced={<>The as-of date for all metrics in the row. Computed as a UTC calendar day. This is the temporal coordinate used for all downstream processing — z-score windows, percentile lookups, and moving average computations all anchor to this field. It is a string in ISO 8601 format (<IC>YYYY-MM-DD</IC>) rather than a timestamp to avoid timezone ambiguity.</>}
            traceability={<IC>feature_daily_agg.py → build_gold_timeseries.py → published JSON</IC>}
          />
          <FieldRow
            field="chain"
            type="string"
            basic={<>Which blockchain this row belongs to. One of <IC>bitcoin</IC>, <IC>ethereum</IC>, <IC>arbitrum</IC>, or <IC>base</IC>.</>}
            advanced="Canonical chain identifier used as a routing key across the entire published artifact hierarchy. The chain field determines which metric profile applies — BTC uses a UTXO profile that suppresses EVM-specific fields; ETH L1 exposes the full EVM surface; L2s use a rollup-specific profile."
          />
          <FieldRow
            field="tx_count_daily"
            type="number"
            nullable
            basic="The number of confirmed transactions on this chain for this day. The most direct measure of how busy the network was."
            advanced={<>Count of confirmed transactions from the AWS Public Blockchain Data transactions table for the given UTC day. On EVM chains this includes all transaction types; on Bitcoin this counts confirmed UTXO-model transactions. Used as the primary demand signal — feeds <IC>scorecard.dimensions.demand</IC> via log-normalised z-score.</>}
            traceability={<IC>feature_daily_agg.py → tx_count_daily</IC>}
          />
          <FieldRow
            field="block_count_daily"
            type="number"
            nullable
            basic="How many blocks were produced on this day. For most chains this is fairly stable (Bitcoin targets ~144/day). Deviations from the expected rate are more informative than the absolute value."
            advanced="Count of distinct blocks from the AWS blocks table for the given UTC day. Used as a denominator for avg_block_time_sec and as a throughput normaliser. On Bitcoin, consistent deviation from the ~144/day target can indicate hash rate changes or difficulty adjustment effects. On EVM chains with near-instant block times, this number is much larger."
            traceability={<IC>feature_daily_agg.py → block_count_daily</IC>}
          />
          <FieldRow
            field="value_transferred_native"
            type="number"
            nullable
            basic="The total amount of the chain's native currency that moved between addresses on this day, summed across all transactions."
            advanced="Sum of the best-available native value field from the AWS transactions table. Interpretation varies by chain — on Bitcoin this is the sum of UTXO outputs; on EVM chains it reflects msg.value transfers. This field has known semantic limitations: it includes protocol-level movements, smart contract interactions where value is not economically meaningful, and internal transfers. It should be used for trend context rather than as a precise economic volume measure."
            traceability={<IC>feature_daily_agg.py → value_transferred_native</IC>}
          />
          <FieldRow
            field="median_tx_value_native"
            type="number"
            nullable
            basic="The median (middle value) amount moved per transaction on this day, in native token units. Less distorted by very large outlier transactions than the average."
            advanced={<>P50 of the transaction value distribution for the day. Used as a denominator in <IC>fee_burden_proxy = median_tx_fee_native / median_tx_value_native</IC>, which normalises fee cost relative to the typical economic size of a transaction. On EVM chains where many transactions have zero msg.value (smart contract calls), this can be near zero and the fee burden proxy may not be meaningful — the pipeline handles this gracefully via null fallback.</>}
            traceability={<IC>feature_daily_agg.py → median_tx_value_native</IC>}
          />
          <FieldRow
            field="median_tx_fee_native"
            type="number"
            nullable
            basic="The typical fee paid per transaction on this day, in native token units. Median is used because a small number of very high-fee transactions would distort the average."
            advanced="P50 of the fee distribution for the day in native units. The primary friction input. On Ethereum, this reflects the median total fee (base + priority) post-EIP-1559. On Bitcoin, this is the median sat-denominated fee. The raw value in native units is published without conversion — unit interpretation depends on the chain."
            traceability={<IC>feature_daily_agg.py → median_tx_fee_native</IC>}
          />
          <FieldRow
            field="failed_tx_rate"
            type="number (0–1)"
            nullable
            chains="EVM only"
            basic="The fraction of transactions that failed on this day — attempted but did not complete successfully. Higher values indicate more execution friction."
            advanced={<>Mean of <IC>(receipt_status != 1)</IC> for EVM transactions. Always null for Bitcoin, which has no analogous on-chain failure concept under the UTXO model. A rising failed_tx_rate alongside elevated fees suggests the network is under genuine execution strain rather than merely high demand. Feeds <IC>scorecard.dimensions.friction</IC> alongside fee_burden_proxy.</>}
            traceability={<IC>feature_daily_agg.py → failed_tx_rate (EVM only)</IC>}
          />
          <FieldRow
            field="gas_utilization_pct"
            type="number (0–100)"
            nullable
            chains="ETH L1 only"
            basic="How full the Ethereum blocks were on average, expressed as a percentage of total gas capacity. 100% means every block was completely full."
            advanced={<>Mean of <IC>gas_used / gas_limit</IC> across all blocks for the day. Only meaningful for Ethereum L1 — hidden for Bitcoin (no gas model) and L2 chains (different capacity mechanics). Under EIP-1559, the target is 50% utilisation with a 2× burst ceiling. Values consistently above 50% indicate the base fee is rising; values near 100% indicate the network is running at its hard ceiling. The primary <IC>scorecard.dimensions.capacity</IC> input for ETH L1.</>}
            traceability={<IC>feature_daily_agg.py → gas_utilization_pct (ETH L1 only)</IC>}
          />
          <FieldRow
            field="unique_active_addresses"
            type="number"
            nullable
            chains="EVM in practice"
            basic="The number of distinct wallet addresses that sent or received a transaction on this day. A breadth-of-participation signal — how many different actors used the network."
            advanced={<>Count of unique addresses appearing in either the sender or recipient field of transactions for the day, excluding nulls. On EVM chains this is generally available; on Bitcoin the UTXO model makes address-level aggregation less reliable and this field is often null. Used alongside tx_count_daily in the demand axis — together they distinguish broad shallow usage from concentrated deep usage via the derived <IC>tx_per_user</IC> ratio.</>}
            traceability={<IC>feature_daily_agg.py → unique_active_addresses</IC>}
          />
          <FieldRow
            field="avg_block_time_sec"
            type="number"
            nullable
            basic="The average time between blocks on this day, in seconds. Bitcoin targets about 600 seconds (10 minutes). Ethereum targets about 12 seconds. Deviations from normal are more meaningful than the absolute value."
            advanced="Computed as (period duration in seconds) / block_count for the day. Used in the capacity axis not as a raw value but as input to a derived instability proxy: the pipeline computes how much the block time deviated from its own rolling median, then feeds that instability signal into the capacity scorecard. This avoids treating a slightly faster block time as uniformly better or worse — what matters is whether block production became erratic."
            traceability={<IC>feature_daily_agg.py → avg_block_time_sec → blocktime_instability (regime_engine.py)</IC>}
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* META                                                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section id="meta" className="mb-12 scroll-mt-8">
        <div className="mb-5 rounded-3xl border border-purple-500/20 bg-purple-500/5 p-6 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-purple-300">Layer 2</div>
          <h2 className="mt-2 text-3xl font-semibold text-white">Meta</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            The intelligence layer — regime classification, confidence scoring, three-axis
            scorecard, and ranked driver set. This is the primary product output and the
            layer most subscribers use for quantitative research.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
            <IC>meta/&lt;chain&gt;/latest.json</IC>
            <IC>meta/&lt;chain&gt;/last90d.json</IC>
            <IC>meta/&lt;chain&gt;/YYYY-MM-DD.json</IC>
          </div>
        </div>

        <div className="space-y-3">

          {/* Top-level */}
          <div className="rounded-2xl border border-white/8 bg-white/3 px-5 py-3">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Top-level fields</div>
          </div>

          <FieldRow field="date" type="string (YYYY-MM-DD)" basic="The as-of date this meta row describes." advanced="Canonical date field — matches the Gold row this meta output was computed over. Used as the primary key for row-level lookups and time-series ordering." />
          <FieldRow field="chain" type="string" basic={<>Which chain this row belongs to: <IC>bitcoin</IC>, <IC>ethereum</IC>, <IC>arbitrum</IC>, or <IC>base</IC>.</>} advanced="Chain identifier propagated from the Gold layer. Determines the metric profile applied during computation." />
          <FieldRow field="updated_through" type="string (YYYY-MM-DD)" nullable basic="The most recent Gold date whose data was included in this meta computation. Usually equal to date but may differ during partial rebuilds." advanced="The temporal ceiling of the evidence window used for this meta row. A date field rather than a timestamp to match the Gold schema convention. Critical for time-series analysis — use this as the observation date, not the pipeline run timestamp." />
          <FieldRow field="methodology_version" type="string" nullable basic="Which version of the analytical model produced this row. If methodology changes, this field changes." advanced={<>Version string identifying the pipeline methodology. Required for comparability analysis: rows with different methodology_version values may have been produced under different threshold parameters, metric definitions, or scoring formulas. Changes to this field are documented at <IC>/methodology/changelog</IC>.</>} />
          <FieldRow field="revision_id" type="number" nullable basic="This field is not currently part of the canonical public provenance model for archived Meta outputs. Public provenance is instead anchored in date, updated_through, methodology_version, dataset revision, and regime.determinism_hash where applicable." advanced="Public provenance should be read via methodology_version, updated_through, dataset revision, and regime.determinism_hash. Do not treat revision_id as the sole or required public traceability anchor." />

          {/* status */}
          <div className="rounded-2xl border border-white/8 bg-white/3 px-5 py-3">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">status — the published regime label</div>
          </div>

          <FieldRow field="status.label" type="string (enum)" basic={<>The headline regime label: <IC>STABLE</IC>, <IC>HEATING</IC>, <IC>CONGESTED</IC>, <IC>CHEAP</IC>, or <IC>UNKNOWN/DEGRADED</IC>. The top-line answer to &quot;what state is the network in right now?&quot;</>} advanced={<>Deterministic output of the regime classification rule tree, applied after confidence gating. Rule evaluation order: (1) <IC>confidence &lt; 0.40</IC> → UNKNOWN/DEGRADED; (2) Capacity EXTREME_HIGH or (Capacity HIGH and Friction HIGH) → CONGESTED; (3) Friction LOW and Capacity LOW → CHEAP; (4) Demand HIGH and any axis HEATING → HEATING; (5) default → STABLE. The UI reads this field directly — it never recomputes the label.</>} traceability={<IC>main.py → status object → status.label</IC>} />
          <FieldRow field="status.color" type="string (enum)" basic="A colour hint for the badge — green, yellow, red, blue, or gray — corresponding to the regime label." advanced="Maps 1:1 to status.label: STABLE=green, HEATING=yellow, CONGESTED=red, CHEAP=blue, UNKNOWN/DEGRADED=gray. UI presentation field only — no analytical meaning beyond label mapping." />
          <FieldRow field="status.one_liner" type="string" nullable basic="A short human-readable summary of the current state, e.g. 'Demand: High; Friction: Normal; Capacity: Normal'. Auto-generated by the pipeline." advanced="Pipeline-authored descriptive copy that compresses regime, scorecard levels, and chain context into one sentence ≤80 chars. Rendered directly on chain pages. Not an independent inference layer — it restates the scorecard levels in prose." />

          {/* confidence */}
          <div className="rounded-2xl border border-white/8 bg-white/3 px-5 py-3">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">confidence — evidence quality for this row</div>
          </div>

          <FieldRow field="confidence.confidence_score" type="number (0–1)" nullable basic="How well-supported the current regime label is by the available data. Think of it as the strength of the weather forecast — closer to 1 means stronger, more consistent evidence." advanced={<>Geometric mean of data_quality_score and label_confidence_score: <IC>√(dq × lc)</IC>. The geometric mean ensures weakness in either component suppresses the composite. Hard gate: if score &lt; 0.40 then status.label is forced to UNKNOWN/DEGRADED. Caution band 0.40–0.69: scorecard scores are degraded toward 50 via <IC>score = 50 + (score−50) × effective_confidence</IC>.</>} traceability={<IC>confidence.confidence_score</IC>} />
          <FieldRow field="confidence.data_quality_score" type="number (0–1)" nullable basic="The data completeness side of confidence — do we have enough complete, recent, consistent data to evaluate this chain right now?" advanced="Composite of metric_coverage (weighted non-null rate of chain-specific required fields), recent_density (observed days / expected days in the trailing window), and history_depth (sufficient historical depth for z-score and percentile computation). Weakness in data quality suppresses the full confidence score via the geometric mean." traceability={<IC>confidence.data_quality_score</IC>} />
          <FieldRow field="confidence.label_confidence_score" type="number (0–1)" nullable basic="The signal-clarity side of confidence — how sharply does the evidence point toward the specific label that was assigned, rather than toward an adjacent state?" advanced="For non-STABLE labels: reflects scorecard margin and driver support. For STABLE: rewards genuine neutrality — a chain with scores near 50 across all axes earns higher label confidence than one that merely lacks extreme readings. UNKNOWN/DEGRADED maps to 0. A materially lower label_confidence than data_quality indicates data is present but classification margin is thin." traceability={<IC>confidence.label_confidence_score</IC>} />
          <FieldRow field="confidence.lag_days_vs_utc_today" type="number" nullable basic="How many days old the current published data is relative to today. Bitcoin and Ethereum should be 1–2 days. Arbitrum and Base are expected to be around 7 days." advanced="Signed integer difference between UTC today (at page render) and the as-of date. Chain-specific policy: BTC/ETH expect 1-day lag; ARB/BASE expect 7-day lag. Staleness thresholds are calibrated relative to these expectations. Use as a freshness diagnostic — do not confuse with confidence_score, which is an evidence quality measure, not a recency measure." traceability={<IC>confidence.lag_days_vs_utc_today</IC>} />
          <FieldRow field="confidence.missing" type="boolean" nullable basic="True if the confidence layer could not be computed for this row. When true, treat the regime label as unreliable." advanced="Set to true when the pipeline cannot produce a meaningful confidence value — typically due to insufficient data coverage or a broken pipeline stage. When true, the UI should surface a degraded state rather than presenting a spurious confidence number." />
          <FieldRow field="confidence.semantics" type="string" basic={<>A machine-readable label of what the confidence score means. Currently always <IC>evidence_sufficiency_asof_date</IC>.</>} advanced="Exists to prevent semantic drift — as the confidence model evolves, this field signals what definition was in effect when the row was computed. Not intended for display; intended for programmatic consumers who need to distinguish confidence models across methodology versions." />

          {/* scorecard */}
          <div className="rounded-2xl border border-white/8 bg-white/3 px-5 py-3">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">scorecard.dimensions — three-axis structural decomposition</div>
          </div>

          <FieldRow field="scorecard.dimensions.demand.score" type="number (0–100)" basic="How strong current network usage looks relative to this chain's own recent history. 50 is neutral. Above 67 is High. Below 33 is Low." advanced={<>Computed as <IC>50 + 40 × tanh(z / 1.5)</IC> over the combined demand z-signal, then degraded toward 50 by <IC>effective_confidence = base_confidence × coverage_factor</IC>. Input metrics: tx_count_daily (log-normalised), unique_active_addresses, and tx_per_user ratio. Demand coverage factor is 3/3 when all inputs are present.</>} traceability={<IC>scorecard.dimensions.demand.score</IC>} />
          <FieldRow field="scorecard.dimensions.demand.level" type="string (enum)" basic={<>Qualitative band: <IC>High</IC> (score ≥ 67), <IC>Normal</IC> (34–66), or <IC>Low</IC> (≤ 33). Quick-read label for the score.</>} advanced="Discretisation of the continuous score. The regime engine uses these band values — not the raw score — in its classification rules. HEATING requires Demand = HIGH." />
          <FieldRow field="scorecard.dimensions.demand.coverage_factor" type="number (0–1)" basic="What fraction of the expected demand inputs were available for this row. 1.0 means all three inputs were present." advanced="Demand expects 3 components (tx_count, active_addresses, tx_per_user). coverage_factor = available / 3. Multiplied by base_confidence to produce effective_confidence for this axis. Low coverage pulls the demand score toward 50 to avoid over-interpretation." />
          <FieldRow field="scorecard.dimensions.demand.effective_confidence" type="number (0–1)" basic="The actual epistemic weight behind the demand score, combining overall confidence and how many demand inputs were available." advanced={<>Computed as <IC>base_confidence × coverage_factor</IC>. This is the value used to degrade the raw demand score toward 50. A demand score of 80 under effective_confidence 0.9 is much more assertive than the same score under effective_confidence 0.3.</>} />
          <FieldRow field="scorecard.dimensions.friction.score" type="number (0–100)" basic="How expensive or difficult it currently is to use this chain relative to its own history. Above 67 means fees and friction are elevated. Below 33 means it is cheap and smooth." advanced="Input metrics: fee_burden_proxy (median_tx_fee / median_tx_value) and failed_tx_rate. Both are log-normalised and z-scored before aggregation. CONGESTED requires Friction HIGH alongside Capacity HIGH. CHEAP requires Friction LOW." traceability={<IC>scorecard.dimensions.friction.score</IC>} />
          <FieldRow field="scorecard.dimensions.friction.coverage_factor" type="number (0–1)" basic="What fraction of the expected friction inputs were available. 1.0 means both fee burden and failed transaction rate were present." advanced="Friction expects 2 components. On Bitcoin, failed_tx_rate is always null (no EVM failure concept), so Bitcoin friction coverage is structurally capped at 0.5 for that component. The pipeline handles this gracefully — Bitcoin's friction profile only uses the fee component." />
          <FieldRow field="scorecard.dimensions.capacity.score" type="number (0–100)" basic="How close the network is to its operational limits. High means stretched. Low means plenty of room. The specific metrics used depend on which chain — Bitcoin, Ethereum, and L2s each use different capacity proxies." advanced="Input metrics vary by chain profile: ETH L1 uses gas_utilization_pct and blocktime_instability; BTC uses blocktime_instability only (no gas); L2s use capacity_util_pct and blocktime_instability. The chain-specific profile prevents L1 gas semantics from being applied to non-L1 chains." traceability={<IC>scorecard.dimensions.capacity.score</IC>} />

          {/* regime */}
          <div className="rounded-2xl border border-white/8 bg-white/3 px-5 py-3">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">regime — classification evidence and reproducibility</div>
          </div>

          <FieldRow field="regime.label" type="string (enum)" basic={<>Redundant copy of <IC>status.label</IC>. The primary field is status.label; regime.label is kept for historical compatibility.</>} advanced="Fallback field used when status.label is unavailable. The UI resolution order is: status.label → regime.label → UNKNOWN/DEGRADED. In well-formed rows both are identical." />
          <FieldRow field="regime.asof_date" type="string (YYYY-MM-DD)" nullable basic="The date the regime classification was computed for. Typically identical to date." advanced="The temporal anchor of the regime computation, distinct from the pipeline run timestamp. Used in the asof resolution hierarchy alongside updated_through." />
          <FieldRow field="regime.determinism_hash" type="string (12-char hex)" basic="A fingerprint for this classification. If the hash matches, the label was produced by the same inputs and methodology. If it changes, something changed." advanced={<>SHA-256 of the canonical JSON serialisation of (chain, label, asof_date, drivers, window_days), truncated to 12 hex characters. Computed as <IC>stable_sha256_12(json_dumps_canonical(det_payload))</IC>. Enables tamper detection: retroactive reclassification of a historical label would produce a different hash. Use this for backtesting integrity validation.</>} traceability={<IC>regime.determinism_hash</IC>} />
          <FieldRow field="regime.window_days" type="number" basic="How many days of historical data were used in the computation — the lookback window." advanced="The rolling window used for z-score baselines, percentile rank computation, and moving averages. Typically 7 days for the current row computation (most sensitive to recent conditions), though longer windows are used internally for percentile rank (90 days) and z-score baseline (180 days)." />
          <FieldRow
            field="regime.drivers[]"
            type="array of objects"
            basic="The list of metrics that most strongly explain why the current regime label was assigned. Each driver shows how unusual that metric is right now and in which direction."
            advanced="Ranked subset of the full evidence surface, ordered by a composite driver score: weight × (|z_robust| + 0.75 × |pct_dist| + 0.50 × |momentum|). Only the top drivers that are label-consistent are surfaced. Absence from the driver list does not mean a metric was uninformative — it means it ranked below the display threshold."
          />
          <FieldRow field="regime.drivers[].metric" type="string" basic="The name of the metric being described, e.g. tx_count_daily or median_tx_fee_native." advanced="Canonical metric key matching the Gold field name. For derived signals like blocktime_instability or fee_burden_proxy, the key identifies the computed signal rather than a raw Gold field." />
          <FieldRow field="regime.drivers[].axis" type="string (enum)" basic={<>Which scorecard axis this driver belongs to: <IC>demand</IC>, <IC>friction</IC>, or <IC>capacity</IC>.</>} advanced="The axis assignment reflects the metric's role in the scorecard, not just its statistical properties. A metric with a high z-score assigned to demand tells you demand is the primary driver of the current state — not that the metric happens to be elevated." />
          <FieldRow field="regime.drivers[].z_robust" type="number" basic="How unusual the current reading is relative to recent history. 0 means perfectly normal. ±2 means notably unusual. ±3+ means very rare." advanced={<>MAD-based robust z-score: <IC>0.6745 × (x − median) / MAD</IC>. The 0.6745 factor makes it asymptotically equivalent to a standard z-score under Gaussian assumptions while inheriting outlier robustness. Fallback: if MAD=0 use standard z; if std=0 return 0.</>} />
          <FieldRow field="regime.drivers[].pct_90d" type="number (0–100)" basic="Where today's value ranks in the last 90 days. 95 means it's higher than 95% of recent days. 5 means it's lower than 95% of recent days." advanced="Empirical percentile rank of the current observation within the trailing 90-day sample. Minimum 30 non-null observations required; suppressed otherwise. Orthogonal to z_robust: pct answers 'where does this sit in the recent distribution?' while z answers 'how many robust standard deviations from the median?'" />
          <FieldRow field="regime.drivers[].momentum_7d_vs_30d" type="number" basic="Whether the metric is accelerating (positive) or decelerating (negative) compared to its recent baseline. Near zero means no clear direction." advanced={<>Defined as <IC>z_robust(mean_7d) − z_robust(mean_30d)</IC>. Removes level effects by standardising both windows against the same 180-day baseline before differencing. Threshold: ≥ 0.15 is HEATING trend; ≤ −0.15 is COOLING; otherwise FLAT.</>} />
          <FieldRow field="regime.drivers[].current" type="number" nullable basic="The raw observed value of this metric on the as-of date, in native units." advanced="Direct observation from the Gold layer carried into the driver row for auditability. Allows downstream consumers to verify that z-scores and percentiles are computed over a sensible underlying level. Required for cross-validation against independent data sources." />
          <FieldRow field="regime.drivers[].trend" type="string (enum)" basic={<><IC>HEATING</IC> (momentum ≥ 0.15), <IC>COOLING</IC> (≤ −0.15), or <IC>FLAT</IC>.</>} advanced="Categorical summary of momentum_7d_vs_30d. Used in regime rule evaluation — HEATING label requires at least one axis driver showing HEATING trend alongside Demand HIGH." />
          <FieldRow field="regime.drivers[].band" type="string (enum)" basic={<>Which band this metric is in: <IC>EXTREME_HIGH</IC>, <IC>HIGH</IC>, <IC>NORMAL</IC>, <IC>LOW</IC>, or <IC>EXTREME_LOW</IC>.</>} advanced="Result of the dual-criterion band classification: HIGH if pct_90d ≥ 80 OR z_robust ≥ 1.5; EXTREME_HIGH if pct_90d ≥ 95 OR z_robust ≥ 2.5; LOW if pct_90d ≤ 20 OR z_robust ≤ −1.5; EXTREME_LOW if pct_90d ≤ 5 OR z_robust ≤ −2.5; otherwise NORMAL." />

          {/* regime.axes */}
          <FieldRow
            field="regime.axes.demand / friction / capacity"
            type="object"
            basic="A per-axis summary showing whether each dimension is currently elevated, depressed, or normal, and whether it is trending up or down."
            advanced={<>Each axis object contains <IC>band_high</IC> (NORMAL/HIGH/EXTREME_HIGH), <IC>band_low</IC> (NORMAL/LOW/EXTREME_LOW), and <IC>trend</IC> (HEATING/FLAT/COOLING). These are computed as aggregates over the axis&apos;s driver signals rather than from a single metric. Used internally in regime rule evaluation.</>}
          />

          {/* profile */}
          <FieldRow
            field="profile"
            type="object"
            basic="Information about which chain type profile was applied during computation — determines which metrics are used and which are hidden."
            advanced={<>Contains <IC>type</IC> (btc/eth_l1/l2), <IC>label</IC>, <IC>hidden_metrics[]</IC> (metrics suppressed for this chain type), <IC>capacity_proxy</IC> (which metrics proxy capacity for this chain), and an optional <IC>note</IC>. The profile field makes chain-specific behaviour explicit in the published artifact rather than requiring consumers to know which metrics apply to which chains.</>}
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* DERIVED                                                           */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section id="derived" className="mb-12 scroll-mt-8">
        <div className="mb-5 rounded-3xl border border-blue-500/20 bg-blue-500/5 p-6 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-blue-300">Layer 3</div>
          <h2 className="mt-2 text-3xl font-semibold text-white">Derived</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            Smoothed rolling averages of Gold metrics — 7-day (MA7) and 30-day (MA30) —
            used to draw the trend charts on chain pages. Useful for distinguishing
            brief spikes from sustained structural changes.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
            <IC>derived/&lt;chain&gt;/latest.json</IC>
            <IC>derived/&lt;chain&gt;/last90d.json</IC>
            <IC>derived/&lt;chain&gt;/YYYY-MM-DD.json</IC>
          </div>
        </div>

        <div className="space-y-3">
          <FieldRow field="date" type="string (YYYY-MM-DD)" basic="The as-of date this derived row describes. Matches the corresponding Gold row." advanced="Temporal anchor for all derived values in this row. All moving averages are computed as backward-looking windows terminating at this date." />
          <FieldRow field="chain" type="string" basic="Which chain this row belongs to." advanced="Propagated from Gold. Determines which metrics are present in the derived.metrics object for this row." />
          <FieldRow
            field="derived.metrics.&lt;metric&gt;__ma7"
            type="number"
            nullable
            basic="The 7-day rolling average of the named metric, ending on this row's date. Smoother than the daily value — useful for seeing the short-term trend direction without day-to-day noise."
            advanced={<>Arithmetic mean over the last 7 non-null observations of the corresponding Gold metric, computed with min_periods=1 (so early rows in the series still get a value, just with a smaller window). Naming convention: <IC>tx_count_daily__ma7</IC>, <IC>median_tx_fee_native__ma7</IC>, etc. All numeric Gold fields get both MA7 and MA30 variants. The 7-day window is the short-horizon smoother used for momentum calculation in the regime engine.</>}
            traceability={<IC>derived.metrics.&lt;metric&gt;__ma7</IC>}
          />
          <FieldRow
            field="derived.metrics.&lt;metric&gt;__ma30"
            type="number"
            nullable
            basic="The 30-day rolling average of the named metric. A slower-moving baseline that shows the broader trend. When the MA7 rises above the MA30 and stays there, that is a meaningful signal."
            advanced={<>Arithmetic mean over the last 30 non-null observations, with min_periods=1. The 30-day window is the medium-horizon baseline used in momentum computation: <IC>momentum_7d_vs_30d = z_robust(mean_7d) − z_robust(mean_30d)</IC>. For chart reading, the MA30 slope over the visible window is the most reliable indicator of structural regime change — short spikes in MA7 above MA30 without sustained elevation are typically noise.</>}
            traceability={<IC>derived.metrics.&lt;metric&gt;__ma30</IC>}
          />
          <FieldRow
            field="derived.meta_confidence"
            type="object"
            nullable
            basic="A copy of the confidence score from the corresponding Meta row, included in Derived for convenience so chart rendering code can access confidence without loading a separate file."
            advanced="Contains confidence_score (same value as meta.confidence.confidence_score for this date). Published alongside the derived metrics so UI components that render charts with confidence overlays do not require a separate Meta fetch."
          />
          <FieldRow
            field="derived.context_blocks"
            type="array"
            basic="Historical analog periods for context — currently empty in all published data. This field is reserved for a future feature and should be ignored for now."
            advanced="Placeholder for the analog engine output (compute_analogs_and_forward_stats). The analog engine is implemented in the pipeline but context_blocks are not yet populated in published artifacts. When the feature ships, this array will contain historical periods whose on-chain signature most closely resembled the current state, along with forward statistics for each analog period."
          />
        </div>
      </section>

      {/* ── Navigation strip ─────────────────────────────────────────────── */}
      <section className="mt-10 rounded-3xl border p-6 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">Related</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/api-docs", label: "API Docs", desc: "Endpoints and authentication" },
            { href: "/glossary", label: "Glossary", desc: "All terms defined at two levels" },
            { href: "/methodology", label: "Methodology", desc: "How the model works" },
            { href: "/thresholds", label: "Thresholds", desc: "Classification parameters" },
          ].map(({ href, label, desc }) => (
            <Link key={href} href={href} className="group flex items-center justify-between rounded-2xl border bg-background/40 px-4 py-3 transition hover:border-cyan-500/30 hover:bg-muted/30">
              <div>
                <div className="text-sm font-medium text-white">{label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
              </div>
              <span className="text-xs text-muted-foreground transition group-hover:text-cyan-200">→</span>
            </Link>
          ))}
        </div>
      </section>

      <details className="mt-8 rounded-2xl border p-5">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
          Data contract and traceability
        </summary>
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          <div>Gold source: <IC>feature_daily_agg.py → build_gold_timeseries.py → published JSON</IC></div>
          <div>Meta source: <IC>main.py (regime_engine + market_scorecard + confidence) → published JSON</IC></div>
          <div>Derived source: <IC>publish_artifacts.py (rolling_mean, windows=[7,30]) → published JSON</IC></div>
          <div>Methodology version: <IC>{dataset?.methodology_version ?? "—"}</IC></div>
        </div>
      </details>
    </main>
  );
}