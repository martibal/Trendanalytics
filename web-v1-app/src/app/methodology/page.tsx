// src/app/methodology/page.tsx
import Link from "next/link";
import type { ReactNode } from "react";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { currentDataSource } from "@/lib/storage";
import "server-only";

// ─── Primitives ───────────────────────────────────────────────────────────────

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-slate-200">
      {children}
    </code>
  );
}

function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-3xl border p-6 shadow-sm">
      {eyebrow && (
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
          {eyebrow}
        </div>
      )}
      <h2 className="mt-1 text-2xl font-semibold text-white">{title}</h2>
      {subtitle && (
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">{subtitle}</p>
      )}
      <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300">{children}</div>
    </section>
  );
}

function Callout({ children, color = "cyan" }: { children: ReactNode; color?: "cyan" | "amber" | "emerald" }) {
  const s = {
    cyan: "border-cyan-500/20 bg-cyan-500/5",
    amber: "border-amber-500/20 bg-amber-500/5",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
  };
  return (
    <div className={`rounded-2xl border p-4 text-sm leading-7 text-slate-200 ${s[color]}`}>
      {children}
    </div>
  );
}

function ThresholdTable() {
  const rows = [
    { band: "Extreme high", pct: "≥ 95th percentile", z: "≥ +2.5", color: "text-red-400" },
    { band: "High", pct: "≥ 80th percentile", z: "≥ +1.5", color: "text-orange-300" },
    { band: "Normal", pct: "20th – 80th percentile", z: "−1.5 to +1.5", color: "text-slate-300" },
    { band: "Low", pct: "≤ 20th percentile", z: "≤ −1.5", color: "text-blue-300" },
    { band: "Extreme low", pct: "≤ 5th percentile", z: "≤ −2.5", color: "text-blue-400" },
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-2 pr-6 text-xs font-bold uppercase tracking-wider text-slate-500">Band</th>
            <th className="text-left py-2 pr-6 text-xs font-bold uppercase tracking-wider text-slate-500">Percentile (90d)</th>
            <th className="text-left py-2 text-xs font-bold uppercase tracking-wider text-slate-500">Robust z-score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.band} className="border-b border-white/5">
              <td className={`py-2 pr-6 font-semibold ${r.color}`}>{r.band}</td>
              <td className="py-2 pr-6 text-slate-300">{r.pct}</td>
              <td className="py-2 font-mono text-slate-300">{r.z}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RegimeTable() {
  const rows = [
    {
      label: "STABLE",
      color: "text-emerald-400",
      border: "border-emerald-500/20 bg-emerald-500/5",
      plain: "Conditions look broadly normal relative to recent history. No axis shows sustained unusual pressure.",
      technical: "Demand, Friction, and Capacity axes all within Normal bands, or mixed signals that do not meet HEATING, CONGESTED, or CHEAP thresholds. Confidence ≥ 0.40.",
    },
    {
      label: "HEATING",
      color: "text-yellow-300",
      border: "border-yellow-400/20 bg-yellow-400/5",
      plain: "Demand looks stronger than usual and the recent direction still points upward — activity appears to be building, not just spiking.",
      technical: "Demand axis in High band AND at least one relevant axis trend is HEATING (MA7 running ahead of MA30). Level alone is insufficient — requires directional persistence.",
    },
    {
      label: "CONGESTED",
      color: "text-red-400",
      border: "border-red-500/20 bg-red-500/5",
      plain: "The chain appears to be under real capacity pressure. Fees are elevated and blocks are filling up relative to this chain's own recent range.",
      technical: "Capacity or Friction axis in Extreme High band, OR combined pressure across multiple axes. Strongest evidence state. Typically coincides with high z-scores on fee and utilization metrics.",
    },
    {
      label: "CHEAP",
      color: "text-blue-400",
      border: "border-blue-500/20 bg-blue-500/5",
      plain: "Fees and demand are materially below this chain's recent norms. The network looks lightly loaded.",
      technical: "Demand and Friction axes both in Low or Extreme Low bands. Capacity looks unconstrained. MA7 running below MA30 on primary signals.",
    },
    {
      label: "UNKNOWN / DEGRADED",
      color: "text-slate-400",
      border: "border-white/10 bg-white/5",
      plain: "The published evidence is not strong enough to support a named label. This is shown instead of guessing.",
      technical: "Confidence score < 0.40. Triggered by missing data, coverage gaps, or insufficient signal quality. Never silently promoted to a named regime.",
    },
  ];

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label} className={`rounded-2xl border p-4 ${r.border}`}>
          <div className={`text-sm font-black uppercase tracking-wider ${r.color}`}>{r.label}</div>
          <div className="mt-2 grid gap-3 lg:grid-cols-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">In plain language</div>
              <p className="text-xs leading-5 text-slate-300">{r.plain}</p>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Technical condition</div>
              <p className="text-xs leading-5 text-slate-400">{r.technical}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MethodologyPage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  const supportedChains = Array.isArray(dataset?.chains)
    ? dataset.chains
    : Array.isArray(dataset?.supported_chains)
      ? dataset.supported_chains
      : [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">

      {/* Header */}
      <header className="mb-10">
        <div className="rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_40%)] p-8">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">Methodology</div>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">
            How the classification works
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
            A complete explanation of the pipeline — from raw blockchain data to published
            regime label. Written for both first-time readers and technical reviewers.
          </p>

          {/* Table of contents */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Contents</div>
            <div className="grid gap-1 sm:grid-cols-2 text-sm">
              {[
                ["#what-it-does", "1. What this product does"],
                ["#data-inputs", "2. Data inputs and sources"],
                ["#baseline", "3. The 180-day chain-relative baseline"],
                ["#z-score", "4. Robust z-score normalization"],
                ["#thresholds", "5. Banding thresholds"],
                ["#persistence", "6. Persistence filter"],
                ["#axes", "7. The three axes — Demand, Friction, Capacity"],
                ["#labels", "8. Regime labels — all five explained"],
                ["#confidence", "9. Confidence scoring and the publish gate"],
                ["#determinism", "10. Determinism hash and reproducibility"],
                ["#boundary", "11. Interpretation boundary"],
                ["#traceability", "12. Versioning and traceability"],
              ].map(([href, label]) => (
                <a key={href} href={href} className="text-cyan-200 hover:underline py-0.5">{label}</a>
              ))}
            </div>
          </div>

          {/* Dataset context */}
          <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-500">
            <span>Methodology version: <span className="text-slate-300">{dataset?.methodology_version ?? "v1.0"}</span></span>
            <span>Dataset: <span className="text-slate-300">{dataset?.version ?? "—"}</span></span>
            <span>Chains: <span className="text-slate-300">{supportedChains.length > 0 ? supportedChains.join(", ") : "bitcoin, ethereum, arbitrum, base"}</span></span>
          </div>
        </div>
      </header>

      <div className="grid gap-8">

        {/* 1. What it does */}
        <Section
          id="what-it-does"
          eyebrow="Chapter 1"
          title="What this product does"
          subtitle="The single question the pipeline tries to answer every day."
        >
          <p>
            Urd Atlas reads raw blockchain data every day and publishes an answer to one descriptive
            question: <strong className="text-white">does this chain currently look normal, or is something
            meaningfully changing relative to its own recent history?</strong>
          </p>
          <p>
            The answer is published as a regime label (STABLE, HEATING, CONGESTED, CHEAP, or
            UNKNOWN/DEGRADED), a confidence score, a three-axis scorecard, and a ranked set of driver
            signals showing which metrics are doing the explanatory work.
          </p>
          <Callout color="amber">
            <span className="font-semibold text-white">What this product is not:</span> it does not
            publish price data, forecasts, trade signals, or portfolio advice. Every output is
            strictly descriptive — it describes current on-chain network state relative to recent
            history. It does not tell you what to do about it.
          </Callout>
          <p>
            The classification is <strong className="text-white">chain-relative</strong>. HEATING on
            Ethereum means Ethereum is running hotter than Ethereum normally does — not hotter than
            Bitcoin. Each chain is evaluated against its own historical baseline, so labels are
            comparable within a chain over time, but not directly comparable across chains.
          </p>
        </Section>

        {/* 2. Data inputs */}
        <Section
          id="data-inputs"
          eyebrow="Chapter 2"
          title="Data inputs and sources"
          subtitle="What the pipeline reads, where it comes from, and what gets published as Gold JSON."
        >
          <p>
            The pipeline reads from <strong className="text-white">AWS Public Blockchain Data</strong> —
            a publicly available dataset of daily aggregated chain metrics. Every input is independently
            verifiable against any blockchain explorer.
          </p>

          <div className="rounded-2xl border bg-white/[0.02] p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Gold JSON fields — published daily per chain</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { field: "tx_count_daily", desc: "Total confirmed transactions per day" },
                { field: "median_tx_fee_native", desc: "Typical cost per transaction in native units" },
                { field: "gas_utilization_pct", desc: "Block fullness as % of capacity (EVM chains only)" },
                { field: "unique_active_addresses", desc: "Count of addresses active on the given day" },
                { field: "avg_block_time_sec", desc: "Average time between blocks in seconds" },
                { field: "failed_tx_rate", desc: "Share of transactions that failed (EVM chains)" },
                { field: "avg_gas_per_tx", desc: "Average gas units consumed per transaction" },
                { field: "median_gas_price", desc: "Typical gas price in native units" },
              ].map(({ field, desc }) => (
                <div key={field} className="flex gap-2">
                  <InlineCode>{field}</InlineCode>
                  <span className="text-xs text-slate-400">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <p>
            Not every field is published for every chain. Bitcoin does not use EVM gas semantics, so
            <InlineCode>gas_utilization_pct</InlineCode>, <InlineCode>failed_tx_rate</InlineCode>,
            and related fields are intentionally suppressed for BTC. Each chain has a profile that
            defines which metrics are active and which are hidden. This is documented in the
            chain-specific profile inside each Meta JSON artifact.
          </p>

          <Callout>
            <span className="font-semibold text-white">Gold JSON is the canonical source.</span>{" "}
            Meta and Derived are always built from Gold. If you want to verify any published
            classification, you can trace it back to the corresponding Gold artifact.
          </Callout>
        </Section>

        {/* 3. Baseline */}
        <Section
          id="baseline"
          eyebrow="Chapter 3"
          title="The 180-day chain-relative baseline"
          subtitle="Why the comparison window is 180 days and why it uses the chain's own history."
        >
          <p>
            Every metric is scored relative to a <strong className="text-white">rolling 180-day
            baseline</strong> — the 180 most recently published daily values for that metric on that
            chain. This window is long enough to capture meaningful seasonal and structural variation,
            but short enough that the baseline adapts as chain conditions evolve over months.
          </p>
          <p>
            The baseline is <strong className="text-white">chain-specific</strong>. Bitcoin's baseline
            is computed from Bitcoin's own 180-day history. Ethereum's baseline is computed from
            Ethereum's own 180-day history. There is no universal cross-chain benchmark.
            This is deliberate — it means a label of HEATING on Arbitrum reflects whether Arbitrum
            is unusually active for Arbitrum, not whether it is as busy as Ethereum.
          </p>

          <div className="rounded-2xl border bg-white/[0.02] p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Why 180 days specifically</div>
            <div className="grid gap-3 lg:grid-cols-3">
              {[
                { title: "Captures real cycles", desc: "180 days covers roughly two quarters — enough to include multiple network usage cycles without anchoring to a single event." },
                { title: "Adapts over time", desc: "A rolling window means the baseline shifts forward every day. A market event from 7 months ago gradually leaves the window." },
                { title: "Not too short", desc: "A 30-day baseline would be dominated by recent conditions and would produce excessively volatile regime changes." },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-white/6 bg-white/[0.02] p-4">
                  <div className="text-xs font-bold text-white mb-1">{item.title}</div>
                  <p className="text-xs leading-5 text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* 4. Z-score */}
        <Section
          id="z-score"
          eyebrow="Chapter 4"
          title="Robust z-score normalization"
          subtitle="How each metric is converted from a raw number into a comparable signal."
        >
          <p>
            Raw values are not directly comparable across metrics or chains. A transaction count of
            500,000 might be high for one chain and low for another. To make signals comparable,
            every metric is normalized using a <strong className="text-white">robust z-score</strong>
            based on the 180-day baseline.
          </p>

          <div className="rounded-2xl border bg-black/30 p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">The formula</div>
            <div className="font-mono text-sm text-cyan-300">
              z_robust = (x − median) / (MAD × 1.4826)
            </div>
            <div className="mt-4 grid gap-3 text-xs">
              {[
                { term: "x", def: "Today's observed value for the metric" },
                { term: "median", def: "The median of the 180-day baseline for this metric on this chain" },
                { term: "MAD", def: "Median Absolute Deviation — the median of |x − median| over the 180-day baseline" },
                { term: "1.4826", def: "Scaling constant that makes MAD comparable to standard deviation for normally distributed data" },
              ].map(({ term, def }) => (
                <div key={term} className="flex gap-3">
                  <code className="shrink-0 text-amber-300 w-20">{term}</code>
                  <span className="text-slate-400">{def}</span>
                </div>
              ))}
            </div>
          </div>

          <p>
            The use of <strong className="text-white">median and MAD</strong> instead of mean and
            standard deviation makes the normalization resistant to outliers. A single extreme day
            in the 180-day window will not distort the baseline significantly, because median and MAD
            are both robust to individual extreme values.
          </p>

          <p>
            The resulting z-score tells you: <em>how many scaled standard deviations is today's reading
            above or below the chain's own recent median?</em> A z-score of +2.0 means today's value is
            unusually high for this chain. A z-score of −1.5 means it is unusually low. Zero means it
            is exactly at the 180-day median.
          </p>

          <Callout>
            <span className="font-semibold text-white">A tanh compression is applied.</span>{" "}
            The raw z-score is compressed through a hyperbolic tangent function before being used in
            the scorecard. This keeps extreme outliers from dominating the composite score while
            preserving the sign and relative magnitude of signals.
          </Callout>
        </Section>

        {/* 5. Thresholds */}
        <Section
          id="thresholds"
          eyebrow="Chapter 5"
          title="Banding thresholds"
          subtitle="The canonical published values that define when a signal is considered High, Normal, or Low."
        >
          <p>
            After z-score normalization, each signal is assigned to a band based on two criteria:
            its <strong className="text-white">90-day percentile rank</strong> and its
            <strong className="text-white"> robust z-score</strong>. Both thresholds must be met
            for a band assignment.
          </p>

          <ThresholdTable />

          <p className="text-xs text-slate-500">
            These are the canonical default thresholds. They are published at{" "}
            <Link href="/thresholds" className="text-cyan-400 hover:underline">/thresholds</Link>{" "}
            and versioned in the methodology archive.
          </p>

          <Callout color="amber">
            <span className="font-semibold text-white">Both conditions must hold.</span>{" "}
            A metric must meet both the percentile threshold AND the z-score threshold to enter a
            band. Meeting only one is insufficient. This dual-gate reduces false band assignments
            caused by a single outlier in either measure.
          </Callout>
        </Section>

        {/* 6. Persistence filter */}
        <Section
          id="persistence"
          eyebrow="Chapter 6"
          title="The persistence filter"
          subtitle="Why a single-day spike does not become a regime change."
        >
          <p>
            Band assignments from a single day are not sufficient for a regime label. The pipeline
            applies a <strong className="text-white">persistence filter</strong> that requires a
            signal to persist across a minimum number of days before it contributes to a regime change.
          </p>

          <div className="rounded-2xl border bg-white/[0.02] p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">How persistence is measured</div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <div className="text-xs font-bold text-white mb-2">Minimum persistence days</div>
                <p className="text-xs leading-5 text-slate-400">
                  The canonical default is <strong className="text-white">3 days</strong>. A signal
                  must appear in the elevated band for at least 3 consecutive published days before
                  it is treated as a persistent condition.
                </p>
              </div>
              <div>
                <div className="text-xs font-bold text-white mb-2">MA7 vs MA30 momentum</div>
                <p className="text-xs leading-5 text-slate-400">
                  The 7-day moving average is compared to the 30-day moving average. When MA7 is
                  running ahead of MA30, the signal is directionally confirmed. This is the
                  "momentum" field in the published driver rows.
                </p>
              </div>
            </div>
          </div>

          <p>
            This means a single-day event — a flash spike in fees, an unusual block — will not
            by itself change the regime label. The model waits for the signal to appear consistently
            across multiple days and across the MA7/MA30 comparison before treating it as structural.
          </p>
          <p>
            The practical implication is that Urd Atlas regime labels are <strong className="text-white">
            deliberately lagging</strong>. They do not react to the first sign of change. They confirm
            that a change looks persistent before publishing it as a named regime. This is a feature,
            not a bug — it reduces false positives at the cost of some responsiveness.
          </p>
        </Section>

        {/* 7. Axes */}
        <Section
          id="axes"
          eyebrow="Chapter 7"
          title="The three axes — Demand, Friction, Capacity"
          subtitle="How individual metrics are grouped into dimensions before producing a regime label."
        >
          <p>
            Individual metric z-scores are grouped into three axes. Each axis aggregates the evidence
            from its assigned metrics into a composite score (0–100, where 50 is neutral) and an
            evidence band (Normal, High, Low, etc.).
          </p>

          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                axis: "Demand",
                color: "text-cyan-300",
                border: "border-cyan-500/20 bg-cyan-500/5",
                question: "How much usage pressure is the chain carrying?",
                metrics: ["tx_count_daily", "unique_active_addresses"],
                plain: "Demand is high when the chain is being used more than usual. It reflects how much activity the network is absorbing.",
                tech: "Primarily driven by tx_count_daily and unique_active_addresses. Both metrics must show elevated z-scores and percentiles for Demand to reach a high band.",
              },
              {
                axis: "Friction",
                color: "text-orange-300",
                border: "border-orange-500/20 bg-orange-500/5",
                question: "How costly or difficult is it to use the chain right now?",
                metrics: ["median_tx_fee_native", "failed_tx_rate"],
                plain: "Friction is high when it is expensive or unreliable to transact. Elevated fees and high failure rates both contribute.",
                tech: "Driven by median_tx_fee_native and failed_tx_rate (where published). For Bitcoin, fee burden is proxied differently since failed_tx_rate is not applicable.",
              },
              {
                axis: "Capacity",
                color: "text-purple-300",
                border: "border-purple-500/20 bg-purple-500/5",
                question: "How constrained is the chain relative to its own range?",
                metrics: ["gas_utilization_pct", "avg_block_time_sec"],
                plain: "Capacity is tight when blocks are nearly full or block production is becoming irregular. It reflects how close the chain is to its throughput ceiling.",
                tech: "For EVM chains, gas_utilization_pct is the primary signal. For Bitcoin, blocktime instability is used as a capacity proxy since gas utilization is not applicable.",
              },
            ].map((a) => (
              <div key={a.axis} className={`rounded-2xl border p-5 ${a.border}`}>
                <div className={`text-base font-bold ${a.color}`}>{a.axis}</div>
                <p className="mt-2 text-xs leading-5 text-slate-400 italic">{a.question}</p>
                <div className="mt-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Primary metrics</div>
                  <div className="flex flex-wrap gap-1">
                    {a.metrics.map((m) => <InlineCode key={m}>{m}</InlineCode>)}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Plain language</div>
                  <p className="text-xs leading-5 text-slate-300">{a.plain}</p>
                </div>
                <div className="mt-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Technical</div>
                  <p className="text-xs leading-5 text-slate-400">{a.tech}</p>
                </div>
              </div>
            ))}
          </div>

          <p>
            The scorecard score for each axis is normalized to 0–100 with 50 as neutral. A score
            above 50 means the axis looks more pressured or elevated than usual; below 50 means
            it looks softer. The score is pulled toward 50 when confidence is low — weak evidence
            should not produce extreme scorecard numbers.
          </p>
        </Section>

        {/* 8. Labels */}
        <Section
          id="labels"
          eyebrow="Chapter 8"
          title="Regime labels — all five explained"
          subtitle="What each label means, in plain language and in technical terms."
        >
          <RegimeTable />

          <Callout color="amber">
            <span className="font-semibold text-white">Labels are chain-relative and descriptive.</span>{" "}
            HEATING on Bitcoin means Bitcoin is running hotter than Bitcoin normally does. It says
            nothing about what Bitcoin's price will do. It is not a signal to buy, sell, or act.
            It is a description of the current network state relative to recent history.
          </Callout>
        </Section>

        {/* 9. Confidence */}
        <Section
          id="confidence"
          eyebrow="Chapter 9"
          title="Confidence scoring and the publish gate"
          subtitle="How the model decides whether the evidence is strong enough to publish a named label."
        >
          <p>
            Before any named regime label is published, the pipeline calculates a
            <strong className="text-white"> confidence score</strong> (0–1) that reflects the quality
            and sufficiency of the available evidence. If confidence falls below the publish gate,
            the model publishes <InlineCode>UNKNOWN/DEGRADED</InlineCode> instead of a named label.
          </p>

          <div className="rounded-2xl border bg-white/[0.02] p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Confidence components</div>
            <div className="space-y-2">
              {[
                { field: "current_row_coverage", desc: "What fraction of expected metrics are present in today's Gold row" },
                { field: "recent_metric_coverage", desc: "Coverage quality over the recent window, not just today" },
                { field: "history_depth", desc: "Whether the 180-day baseline has enough data to be reliable" },
                { field: "recent_density", desc: "How many of the recent days have published data (gaps reduce this)" },
                { field: "freshness_asof", desc: "How current the data is relative to the expected publication cadence" },
              ].map(({ field, desc }) => (
                <div key={field} className="flex gap-3 items-start">
                  <InlineCode>{field}</InlineCode>
                  <span className="text-xs leading-5 text-slate-400">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-white/[0.02] p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Confidence bands</div>
            <div className="space-y-2">
              {[
                { range: "≥ 0.70", label: "Good", color: "text-emerald-400", desc: "Strong evidence. Label is well-supported." },
                { range: "0.40 – 0.70", label: "Caution", color: "text-amber-300", desc: "Sufficient to publish, but read with more care. Some components are weaker." },
                { range: "< 0.40", label: "UNKNOWN/DEGRADED", color: "text-slate-400", desc: "Below the publish gate. No named label is published. This is shown instead." },
              ].map(({ range, label, color, desc }) => (
                <div key={range} className="flex items-start gap-4">
                  <span className="shrink-0 font-mono text-xs text-slate-400 w-20">{range}</span>
                  <span className={`shrink-0 text-xs font-bold w-36 ${color}`}>{label}</span>
                  <span className="text-xs text-slate-400">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <p>
            The confidence gate is one of the most important design decisions in the product. It means
            the model would rather say "I don't know" than publish a weak label as if it were strong
            evidence. A low-confidence state is informative in itself — it tells you that the current
            data does not support a firm classification.
          </p>
        </Section>

        {/* 10. Determinism hash */}
        <Section
          id="determinism"
          eyebrow="Chapter 10"
          title="Determinism hash and reproducibility"
          subtitle="How every published label is anchored to its exact inputs."
        >
          <p>
            Every published Meta artifact includes a <strong className="text-white">determinism
            hash</strong> — a SHA-256 fingerprint computed from the exact inputs that produced that
            day's classification. The hash is included in the JSON as{" "}
            <InlineCode>regime.determinism_hash</InlineCode>.
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-white/[0.02] p-4">
              <div className="text-xs font-bold text-white mb-2">What the hash covers</div>
              <ul className="text-xs leading-6 text-slate-400 list-disc pl-4">
                <li>The Gold input values used for that day</li>
                <li>The 180-day baseline used for normalization</li>
                <li>The threshold parameters in effect</li>
                <li>The methodology version</li>
              </ul>
            </div>
            <div className="rounded-2xl border bg-white/[0.02] p-4">
              <div className="text-xs font-bold text-white mb-2">What the hash enables</div>
              <ul className="text-xs leading-6 text-slate-400 list-disc pl-4">
                <li>Verify that a past label was not retroactively changed</li>
                <li>Confirm that two systems received the same published artifact</li>
                <li>Audit any past classification against the original inputs</li>
              </ul>
            </div>
          </div>

          <p>
            The Track Record page displays historical labels alongside their determinism hashes.
            Every past date in the archive can be checked — the label shown is what the pipeline
            actually published on that day, not a reconstruction.
          </p>
          <div className="mt-2">
            <Link href="/track-record" className="text-cyan-400 hover:underline text-sm">
              Browse the track record →
            </Link>
          </div>
        </Section>

        {/* 11. Boundary */}
        <Section
          id="boundary"
          eyebrow="Chapter 11"
          title="Interpretation boundary"
          subtitle="What the product is, and what it deliberately is not."
        >
          <p>
            Every output from Urd Atlas is <strong className="text-white">descriptive</strong>. The
            product describes current on-chain network state relative to recent history. It does not
            tell you what those conditions imply for prices, returns, or any other financial outcome.
          </p>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">What this product does</div>
              <ul className="text-xs leading-6 text-slate-300 list-disc pl-4">
                <li>Describes current network conditions relative to recent history</li>
                <li>Classifies conditions into a stable regime vocabulary</li>
                <li>Quantifies evidence quality through confidence scoring</li>
                <li>Shows which metrics are driving the current classification</li>
                <li>Maintains a verifiable historical record of published labels</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">What this product does not do</div>
              <ul className="text-xs leading-6 text-slate-300 list-disc pl-4">
                <li>Publish price data or price targets</li>
                <li>Forecast what conditions will look like tomorrow</li>
                <li>Recommend buying, selling, or any portfolio action</li>
                <li>Imply that a regime label predicts asset returns</li>
                <li>Recompute or adjust published outputs after the fact</li>
              </ul>
            </div>
          </div>

          <Callout>
            <span className="font-semibold text-white">The causal relationship between on-chain network state and asset price is contested.</span>{" "}
            HEATING on Ethereum does not imply a positive ETH return. Analysts who want to use
            regime context alongside price views are expected to do that synthesis themselves.
            This product does not do it on their behalf.
          </Callout>
        </Section>

        {/* 12. Traceability */}
        <Section
          id="traceability"
          eyebrow="Chapter 12"
          title="Versioning and traceability"
          subtitle="How methodology changes are documented and where to find historical definitions."
        >
          <p>
            When the methodology changes, the change is documented in the methodology version archive.
            Older definitions are preserved — they are never silently overwritten. If you are working
            with historical data, you can always find what the product's definitions were at the time
            of publication.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/methodology/previously", label: "Version archive", desc: "All past methodology versions and what changed" },
              { href: "/thresholds", label: "Threshold defaults", desc: "Current canonical threshold parameters" },
              { href: "/track-record", label: "Track record", desc: "Historical published labels with determinism hashes" },
              { href: "/glossary", label: "Glossary", desc: "Field-by-field definitions for every published term" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border bg-white/[0.02] p-4 transition hover:border-cyan-500/30 hover:bg-white/[0.04]"
              >
                <div className="text-sm font-semibold text-white">{item.label}</div>
                <div className="mt-1.5 text-xs leading-5 text-slate-400">{item.desc}</div>
              </Link>
            ))}
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.015] px-5 py-3 text-xs leading-6 text-slate-500">
            Dataset version: <span className="text-slate-300">{dataset?.version ?? "—"}</span>
            {" · "}
            Methodology: <span className="text-slate-300">{dataset?.methodology_version ?? "v1.0"}</span>
            {" · "}
            Source: <span className="text-slate-300">{currentDataSource()}</span>
          </div>
        </Section>

      </div>
    </main>
  );
}
