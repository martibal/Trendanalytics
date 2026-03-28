
// src/app/chains/[chain]/page.tsx
import type { ReactNode } from "react";

import Link from "next/link";
import { notFound } from "next/navigation";

import MetricLineChart, { type MetricPoint } from "@/components/MetricLineChart";
import RegimeBadge from "@/components/RegimeBadge";
import ChainIcon from "@/components/ChainIcon";
import ScoreGauge from "@/components/ui/ScoreGauge";
import StalenessBar from "@/components/ui/StalenessBar";
import WindowSelector from "@/components/ui/WindowSelector";
import { getChainConfig, type ChainId } from "@/config/chains";
import { getUnitLabel } from "@/config/units";
import { currentDataSource, readStorageObject } from "@/lib/storage";

import "server-only";

type Driver = {
  axis?: "demand" | "friction" | "capacity" | string;
  metric?: string;
  trend?: string;
  z_robust?: number;
  pct_90d?: number;
  momentum_7d_vs_30d?: number;
  current?: number;
};

type MetaLatest = {
  chain?: string;
  date?: string;
  updated_through?: string;
  methodology_version?: string;

  status?: { label?: string; one_liner?: string; color?: string };

  confidence?: {
    confidence_score?: number;
    date?: string;
    lag_days_vs_utc_today?: number;
    missing?: boolean;
    data_quality_score?: number;
    label_confidence_score?: number;
    semantics?: string;
  };

  regime?: {
    label?: string;
    asof_date?: string;
    determinism_hash?: string;
    window_days?: number;
    drivers?: Driver[];
  };

  scorecard?: {
    asof_date?: string;
    window_days?: number;
    confidence_score?: number;
    notes?: { interpretation?: string };
    dimensions?: {
      demand?: {
        score?: number;
        level?: string;
        coverage_factor?: number;
        effective_confidence?: number;
      };
      friction?: {
        score?: number;
        level?: string;
        coverage_factor?: number;
        effective_confidence?: number;
      };
      capacity?: {
        score?: number;
        level?: string;
        coverage_factor?: number;
        effective_confidence?: number;
      };
    };
  };

  profile?: {
    id?: string;
    label?: string;
    note?: string;
    hidden_metrics?: string[];
    type?: string;
  };

  [k: string]: unknown;
};

type DerivedRow = {
  chain?: string;
  date?: string;
  derived?: {
    metrics?: Record<string, unknown>;
    meta_confidence?: { confidence_score?: number };
    context_blocks?: unknown[];
  };
};

type GoldRow = Record<string, unknown> & { date?: string; chain?: string };

type ChainPageSearchParams = {
  window?: string;
};

type ExplainPair = {
  basic: ReactNode;
  advanced: ReactNode;
};

type ScorecardDimension = {
  score?: number;
  level?: string;
  coverage_factor?: number;
  effective_confidence?: number;
};

async function readPublishedJson<T>(storagePath: string): Promise<T | null> {
  const result = await readStorageObject(storagePath);

  if (!result) return null;

  try {
    const raw = new TextDecoder("utf-8").decode(new Uint8Array(result.body));
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5">{children}</code>;
}

function ModalStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          .ta-modal {
            display: none;
          }
          .ta-modal:target {
            display: flex;
          }
        `,
      }}
    />
  );
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

function ExplainModal({
  id,
  title,
  subtitle,
  pair,
  traceability,
}: {
  id: string;
  title: string;
  subtitle?: ReactNode;
  pair: ExplainPair;
  traceability?: ReactNode;
}) {
  return (
    <div id={id} className="ta-modal fixed inset-0 z-[80] items-center justify-center p-4">
      <a
        href="#"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        aria-label="Close dialog"
      />
      <div className="relative z-10 max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-cyan-500/20 bg-[#071322] p-6 shadow-2xl shadow-cyan-950/40">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold text-white">{title}</h3>
            {subtitle ? (
              <div className="mt-2 text-sm leading-6 text-slate-300">{subtitle}</div>
            ) : null}
          </div>
          <a
            href="#"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-slate-200 hover:bg-white/10"
            aria-label="Close dialog"
          >
            ×
          </a>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-200">
              Basic
            </div>
            <div className="mt-3 text-sm leading-7 text-slate-100">{pair.basic}</div>
          </section>

          <details className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5" open>
            <summary className="cursor-pointer list-none text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
              Advanced
            </summary>
            <div className="mt-3 text-sm leading-7 text-slate-100">{pair.advanced}</div>
          </details>
        </div>

        {traceability ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-300">
              Traceability
            </div>
            <div className="mt-3 text-sm leading-7 text-slate-200">{traceability}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function fmtDate(d?: string) {
  return d ?? "—";
}

function fmtNum(v?: number, digits = 3) {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  return v.toFixed(digits);
}

function fmtScore100(v?: number) {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  return v.toFixed(0);
}

function fmtPct0to100(v?: number) {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  return `${v.toFixed(1)}%`;
}

function confidenceBand(v?: number) {
  if (typeof v !== "number") return "—";
  if (v >= 0.7) return "Good";
  if (v >= 0.4) return "Caution";
  return "Degraded";
}

function pillClass(kind: "neutral" | "good" | "warn" | "bad") {
  const base = "rounded-full border px-2.5 py-1 text-xs";
  if (kind === "good") {
    return `${base} border-emerald-500/25 bg-emerald-500/10 text-emerald-200`;
  }
  if (kind === "warn") {
    return `${base} border-amber-500/25 bg-amber-500/10 text-amber-200`;
  }
  if (kind === "bad") {
    return `${base} border-rose-500/25 bg-rose-500/10 text-rose-200`;
  }
  return `${base} border-border bg-muted/50 text-foreground`;
}

function confidencePill(v?: number) {
  const b = confidenceBand(v);
  if (b === "Good") return pillClass("good");
  if (b === "Caution") return pillClass("warn");
  if (b === "Degraded") return pillClass("bad");
  return pillClass("neutral");
}

function confidenceNotice(v?: number) {
  const band = confidenceBand(v);

  if (band === "Caution") {
    return {
      tone: "caution" as const,
      title: "Reduced confidence",
      body:
        "Confidence is reduced due to thinner or less internally consistent support. The current label remains visible, but the page is telling you not to lean too heavily on it without checking the rest of the evidence.",
    };
  }

  if (band === "Degraded") {
    return {
      tone: "degraded" as const,
      title: "Degraded confidence",
      body:
        "Confidence is below the canonical gate. That means the current row should be treated as UNKNOWN/DEGRADED even if some visible metrics still look notable.",
    };
  }

  return null;
}

function confidenceNoticeClass(tone: "caution" | "degraded") {
  return tone === "degraded"
    ? "border-slate-400/35 bg-slate-500/12 text-slate-50"
    : "border-amber-500/30 bg-amber-500/12 text-amber-50";
}

function confidenceNoticeMetaClass(tone: "caution" | "degraded") {
  return tone === "degraded" ? "text-slate-200/85" : "text-amber-100/85";
}

function sortDrivers(drivers: Driver[]) {
  return [...drivers].sort((a, b) => {
    const za = Math.abs(a.z_robust ?? 0);
    const zb = Math.abs(b.z_robust ?? 0);
    return zb - za;
  });
}

function guessMetricKeysForChain(chain: string): string[] {
  switch (chain) {
    case "bitcoin":
      return [
        "tx_count_daily",
        "median_tx_fee_native",
        "avg_block_time_sec",
        "block_count_daily",
      ];
    case "ethereum":
      return [
        "tx_count_daily",
        "median_tx_fee_native",
        "gas_utilization_pct",
        "unique_active_addresses",
      ];
    default:
      return [
        "tx_count_daily",
        "median_tx_fee_native",
        "gas_utilization_pct",
        "avg_block_time_sec",
      ];
  }
}

function toNumberOrNull(v: unknown): number | null {
  if (typeof v === "number") return Number.isNaN(v) ? null : v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function parseIsoDayToUtcMs(d: unknown): number | null {
  if (typeof d !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const [y, m, day] = d.split("-").map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day)) {
    return null;
  }
  return Date.UTC(y, m - 1, day);
}

function utcMsToIsoDay(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildDerivedByDate(rows: DerivedRow[]) {
  const m = new Map<string, DerivedRow>();
  for (const r of rows) {
    if (typeof r.date === "string") m.set(r.date, r);
  }
  return m;
}

function buildGoldByDate(rows: GoldRow[]) {
  const m = new Map<string, GoldRow>();
  for (const r of rows) {
    if (typeof r.date === "string") m.set(r.date, r);
  }
  return m;
}

function maxDateMsFromRows<T extends { date?: string }>(rows: T[]): number | null {
  let max: number | null = null;
  for (const r of rows) {
    const ms = parseIsoDayToUtcMs(r.date);
    if (typeof ms !== "number") continue;
    if (max === null || ms > max) max = ms;
  }
  return max;
}

function computeBoundsFromMax(maxMs: number, days: number) {
  const minMs = maxMs - (days - 1) * 24 * 60 * 60 * 1000;
  return { minMs, maxMs };
}

function listDays(bounds: { minMs: number; maxMs: number }): string[] {
  const out: string[] = [];
  for (let ms = bounds.minMs; ms <= bounds.maxMs; ms += 24 * 60 * 60 * 1000) {
    out.push(utcMsToIsoDay(ms));
  }
  return out;
}

function withinBounds(date: string, bounds: { minMs: number; maxMs: number }) {
  const ms = parseIsoDayToUtcMs(date);
  if (ms === null) return false;
  return ms >= bounds.minMs && ms <= bounds.maxMs;
}

function readGoldMetric(row: GoldRow | undefined, metric: string): number | null {
  if (!row) return null;

  const direct = toNumberOrNull(row[metric]);
  if (direct !== null) return direct;

  const nestedCandidates: unknown[] = [];

  const metrics = asRecord(row.metrics);
  if (metrics) nestedCandidates.push(metrics[metric]);

  const gold = asRecord(row.gold);
  const goldMetrics = gold ? asRecord(gold.metrics) : null;
  if (goldMetrics) nestedCandidates.push(goldMetrics[metric]);

  const features = asRecord(row.features);
  if (features) nestedCandidates.push(features[metric]);

  const data = asRecord(row.data);
  if (data) nestedCandidates.push(data[metric]);

  const values = asRecord(row.values);
  if (values) nestedCandidates.push(values[metric]);

  for (const v of nestedCandidates) {
    const n = toNumberOrNull(v);
    if (n !== null) return n;
  }

  return null;
}

function buildObservedDates(params: {
  bounds: { minMs: number; maxMs: number };
  derivedByDate: Map<string, DerivedRow>;
  goldByDate: Map<string, GoldRow>;
}) {
  const { bounds, derivedByDate, goldByDate } = params;
  const set = new Set<string>();

  for (const key of derivedByDate.keys()) {
    if (withinBounds(key, bounds)) set.add(key);
  }

  for (const key of goldByDate.keys()) {
    if (withinBounds(key, bounds)) set.add(key);
  }

  return Array.from(set).sort();
}

function buildChartDataObserved(params: {
  bounds: { minMs: number; maxMs: number };
  derivedByDate: Map<string, DerivedRow>;
  goldByDate: Map<string, GoldRow>;
  metric: string;
}): MetricPoint[] {
  const { bounds, derivedByDate, goldByDate, metric } = params;
  const dates = buildObservedDates({ bounds, derivedByDate, goldByDate });
  const ma7Key = `${metric}__ma7`;
  const ma30Key = `${metric}__ma30`;

  return dates.map((date) => {
    const drow = derivedByDate.get(date);
    const metrics: Record<string, unknown> = drow?.derived?.metrics ?? {};
    const grow = goldByDate.get(date);

    return {
      date,
      value: readGoldMetric(grow, metric),
      ma7: toNumberOrNull(metrics[ma7Key]),
      ma30: toNumberOrNull(metrics[ma30Key]),
    };
  });
}

function normalizeWindow(q?: string): 30 | 90 | 180 | 365 {
  const n = Number(q);
  if (n === 30 || n === 90 || n === 180 || n === 365) return n;
  return 365;
}

function safeId(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function chainProfileCopy(chainId: ChainId): ExplainPair {
  switch (chainId) {
    case "bitcoin":
      return {
        basic: (
          <>
            <p>
              Bitcoin is the original settlement-focused chain. It does not expose the same
              EVM-style execution and gas fields as Ethereum-like networks, so the site reads BTC
              mainly through transaction throughput, fee pressure, and block-timing context.
            </p>
            <p className="mt-3">
              In plain language: on Bitcoin, pressure often shows up as competition for block space,
              fee changes, and confirmation pacing, rather than smart-contract execution metrics.
            </p>
          </>
        ),
        advanced: (
          <>
            <p>
              BTC is handled as a UTXO-style profile. That means the most informative descriptive
              evidence is transaction count, fee level, and block-time/throughput pacing rather than
              EVM-specific fields such as gas utilization or failed transaction semantics.
            </p>
            <p className="mt-3">
              The practical consequence is that Demand on BTC often leans heavily on transaction
              throughput; Friction leans heavily on fee behavior; and Capacity leans more on timing
              and throughput constraint proxies than on execution-capacity fields used on EVM chains.
            </p>
          </>
        ),
      };
    case "ethereum":
      return {
        basic: (
          <>
            <p>
              Ethereum is a general-purpose execution chain. That means the page can read it through
              both user activity and execution tightness: transactions, fees, gas usage, and block
              timing all matter.
            </p>
            <p className="mt-3">
              In practice, Ethereum can look busy because more people are using it, because execution
              is tighter, or both at once. That is why the page separates Demand, Friction, and
              Capacity instead of collapsing everything into one number.
            </p>
          </>
        ),
        advanced: (
          <>
            <p>
              ETH exposes a richer execution surface than BTC. Demand can be read from throughput and
              active usage; Friction from fee and failure behavior; Capacity from gas utilization and
              block pacing. This allows a more structured decomposition of “busy”, “expensive”, and
              “tight”.
            </p>
            <p className="mt-3">
              The model remains descriptive: it does not infer intent or value. It asks only how the
              current observable state compares with the chain’s own recent baseline.
            </p>
          </>
        ),
      };
    default:
      return {
        basic: (
          <>
            <p>
              This is an Ethereum-style L2. The chain is interpreted through usage, fee behavior, and
              execution tightness, but the readings must also be understood in the context of a
              rollup-style network rather than a base-layer chain.
            </p>
            <p className="mt-3">
              In plain language: throughput may look strong while fees stay moderate, or fees may
              change for reasons that are specific to the L2 environment. That is why the site
              explains each metric separately instead of assuming one universal meaning.
            </p>
          </>
        ),
        advanced: (
          <>
            <p>
              For L2s such as Arbitrum and Base, interpretation stays descriptive and chain-specific.
              Execution fields remain useful, but the practical meaning of fee pressure, throughput,
              and capacity cannot simply be copied from ETH L1 or BTC.
            </p>
            <p className="mt-3">
              The chain page therefore emphasizes the published chain profile and visible metric-level
              evidence instead of assuming one cross-chain economic interpretation for every field.
            </p>
          </>
        ),
      };
  }
}

function regimeExplanation(label: string): ExplainPair {
  return {
    basic: (
      <>
        <p>
          Regime is the page’s top-line descriptive state. It is meant to answer one fast question:
          what does the chain currently look like relative to its own recent history?
        </p>
        <p className="mt-3">
          <span className="font-medium">Heating</span> means the chain looks hotter than its own recent
          baseline. That usually means stronger activity pressure, tighter conditions, or both, but it
          does not automatically mean the chain is fully constrained.
        </p>
        <p className="mt-3">
          The regime is useful because it gives the user a fast summary before diving into the
          scorecard, drivers, and charts.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The UI reads the canonical regime directly from <InlineCode>meta.status.label</InlineCode>.
          It does not recompute the label in the browser. The label is a deterministic published
          output that depends on axis conditions and the confidence gate.
        </p>
        <p className="mt-3">
          The canonical threshold family distinguishes among STABLE, HEATING, CONGESTED, CHEAP, and
          UNKNOWN/DEGRADED. UNKNOWN/DEGRADED is a confidence gate first: if confidence falls below the
          canonical threshold, the label should be treated as degraded regardless of other signals.
        </p>
        <p className="mt-3">
          Your current visible label is <span className="font-medium">{label}</span>. That label should
          be read as a descriptive state summary, not as a price, return, or recommendation signal.
        </p>
      </>
    ),
  };
}

function confidenceExplanation(conf?: number, dataQuality?: number, labelSupport?: number): ExplainPair {
  const band = confidenceBand(conf);
  return {
    basic: (
      <>
        <p>
          Confidence is the product’s evidence-strength score for the current published label. It does
          not tell you what will happen next. It tells you how well-supported the current descriptive
          reading is by the available published evidence.
        </p>
        <p className="mt-3">
          Higher confidence means the label rests on fuller and more internally consistent support.
          Lower confidence means the page is warning you not to over-read the label.
        </p>
        <p className="mt-3">
          The visible band is <span className="font-medium">{band}</span>. In the current row, the
          published confidence is <span className="font-medium">{fmtNum(conf, 3)}</span>.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          Confidence is published, not recomputed in the UI. In the current payload it is accompanied
          by component-level support such as <InlineCode>data_quality_score</InlineCode> and
          <InlineCode> label_confidence_score</InlineCode> when available.
        </p>
        <p className="mt-3">
          Read the current score as a synthesis of “how complete/usable is the row?” and “how stable
          or well-supported is the current label by the visible evidence?”. In this row, data quality
          is <span className="font-medium">{fmtNum(dataQuality, 3)}</span> and label support is{" "}
          <span className="font-medium">{fmtNum(labelSupport, 3)}</span>.
        </p>
        <p className="mt-3">
          The UI tiering is intentionally simple: Good at higher confidence, Caution in the middle
          band, and Degraded below the canonical gate.
        </p>
      </>
    ),
  };
}

function asOfExplanation(asOf?: string): ExplainPair {
  return {
    basic: (
      <>
        <p>
          “Data as of” tells you the latest chain-level date behind the visible state. It is one of
          the first things to check before interpreting any label or chart.
        </p>
        <p className="mt-3">
          In plain language: before asking “what does the chain look like?”, first ask “how fresh is
          the row I am looking at?”. The current visible as-of date is{" "}
          <span className="font-medium">{fmtDate(asOf)}</span>.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The page surfaces the latest available published date from the canonical meta bundle. It is
          not a browser-side recomputation and it should be read together with lag.
        </p>
        <p className="mt-3">
          As-of is useful because a perfectly interpretable label can still be operationally old. That
          is why freshness and confidence are separated instead of collapsed into one number.
        </p>
      </>
    ),
  };
}

function lagExplanation(lag?: number): ExplainPair {
  return {
    basic: (
      <>
        <p>
          Observed lag tells you how many days behind today this chain currently is. Lag is shown
          separately from confidence so “old” is not confused with “weakly supported”.
        </p>
        <p className="mt-3">
          The current observed lag is <span className="font-medium">{typeof lag === "number" ? `${lag}d` : "—"}</span>.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          Lag is an operational freshness measure, not an interpretive quality score. A row can be
          fresh but weakly supported, or slightly stale but still internally coherent. The page keeps
          these ideas separate on purpose.
        </p>
        <p className="mt-3">
          Use lag to judge timeliness; use confidence to judge evidentiary support.
        </p>
      </>
    ),
  };
}

function determinismExplanation(hash?: string, windowDays?: number): ExplainPair {
  return {
    basic: (
      <>
        <p>
          Determinism is the page’s reproducibility handle. It tells a technical reader that the
          visible state belongs to a stable published calculation context, not to a hidden browser-side
          reinterpretation.
        </p>
        <p className="mt-3">
          The hash is a compact identity for that published context. The window-days value shows which
          time window the canonical reading belongs to.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The UI reads <InlineCode>regime.determinism_hash</InlineCode> and the published window
          directly from the canonical payload. The purpose is auditability and reproducibility: the
          same published input state should map to the same visible descriptive output.
        </p>
        <p className="mt-3">
          Current hash: <InlineCode>{hash ?? "—"}</InlineCode>. Current window:{" "}
          <InlineCode>{String(windowDays ?? "—")}</InlineCode>.
        </p>
      </>
    ),
  };
}

function readOrderExplanation(): ExplainPair {
  return {
    basic: (
      <>
        <p>
          The recommended reading order is simple: first check freshness and confidence, then read the
          regime label, then open the scorecard and drivers, and only after that use the charts to put
          the current reading into visible historical context.
        </p>
        <p className="mt-3">
          The point is to stop the user from jumping straight to line movement without first knowing
          whether the row is fresh and how strongly supported the current label is.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          This order mirrors the product’s internal hierarchy of evidence. Freshness and confidence are
          gating checks; regime is the compressed descriptive summary; scorecard and drivers explain the
          decomposition; charts are the visual context layer.
        </p>
        <p className="mt-3">
          In other words, the page is meant to move from “can I trust and place this row?” to “what is
          it saying?” to “what visible evidence is carrying the reading?”.
        </p>
      </>
    ),
  };
}

function scorecardAxisExplanation(axis: "demand" | "friction" | "capacity", dim?: ScorecardDimension): ExplainPair {
  if (axis === "demand") {
    return {
      basic: (
        <>
          <p>
            Demand describes usage pressure: how much on-chain activity the chain currently seems to be
            carrying relative to its own recent history.
          </p>
          <p className="mt-3">
            “Normal” means normal versus this chain’s own recent baseline, not normal versus every
            chain in crypto.
          </p>
          <p className="mt-3">
            The current published score is <span className="font-medium">{fmtScore100(dim?.score)}</span>/100.
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            Demand is a published axis-level summary, not a single metric. It aggregates the visible
            demand-side evidence into a 0–100 descriptive score, then surfaces a qualitative level
            label to keep the page readable.
          </p>
          <p className="mt-3">
            Coverage factor tells you how much of the expected evidence is actually present for that
            axis. Effective confidence shows how much support the score still has after coverage and
            confidence penalties are taken into account.
          </p>
          <p className="mt-3">
            Current coverage: <span className="font-medium">{fmtNum(dim?.coverage_factor, 3)}</span>. Effective
            confidence: <span className="font-medium">{fmtNum(dim?.effective_confidence, 3)}</span>.
          </p>
        </>
      ),
    };
  }

  if (axis === "friction") {
    return {
      basic: (
        <>
          <p>
            Friction describes cost, execution difficulty, or tightness-of-use: how expensive or hard
            the chain currently looks relative to itself.
          </p>
          <p className="mt-3">
            A chain can be busy without looking especially costly, and it can look costly without
            looking maximally busy. That is why Friction is separated from Demand.
          </p>
          <p className="mt-3">
            The current published score is <span className="font-medium">{fmtScore100(dim?.score)}</span>/100.
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            Friction is the product’s axis-level read on execution tightness or cost burden. On
            Ethereum-style networks it often leans on fee and failure semantics; on Bitcoin-style
            profiles it leans more on fee and pacing proxies.
          </p>
          <p className="mt-3">
            The important methodological point is that Friction is an interpretable published summary,
            not a hidden latent factor. It tells you whether usage currently looks easy, normal, or
            tight relative to recent history.
          </p>
          <p className="mt-3">
            Current coverage: <span className="font-medium">{fmtNum(dim?.coverage_factor, 3)}</span>. Effective
            confidence: <span className="font-medium">{fmtNum(dim?.effective_confidence, 3)}</span>.
          </p>
        </>
      ),
    };
  }

  return {
    basic: (
      <>
        <p>
          Capacity describes how constrained or unconstrained the chain currently looks relative to its
          own recent baseline.
        </p>
        <p className="mt-3">
          “Balanced” means balanced versus the chain’s own recent history, not some universal
          network-capacity standard.
        </p>
        <p className="mt-3">
          The current published score is <span className="font-medium">{fmtScore100(dim?.score)}</span>/100.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          Capacity is meant to answer a slightly different question from Demand: not just “how much
          usage is there?”, but “how tight or roomy does the chain currently look while carrying that
          usage?”.
        </p>
        <p className="mt-3">
          On execution chains this often leans on utilization and pacing fields; on Bitcoin-style
          profiles it leans more on timing and throughput proxies. The resulting score remains
          descriptive and chain-relative.
        </p>
        <p className="mt-3">
          Current coverage: <span className="font-medium">{fmtNum(dim?.coverage_factor, 3)}</span>. Effective
          confidence: <span className="font-medium">{fmtNum(dim?.effective_confidence, 3)}</span>.
        </p>
      </>
    ),
  };
}

function metricReasonExplanation(metric: string, axis?: string): ExplainPair {
  return {
    basic: (
      <>
        <p>
          This metric is visible because it currently helps explain the page’s descriptive reading. A
          metric being shown here means it is doing real explanatory work right now.
        </p>
        <p className="mt-3">
          That does not mean the whole model uses only this one metric. It means this row currently
          stands out enough to deserve attention in the evidence layer.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The UI surfaces currently relevant metrics from the published driver ranking in{" "}
          <InlineCode>regime.drivers[]</InlineCode>, then supplements with chain-specific defaults so
          the chart layer stays readable even when the currently strongest drivers change.
        </p>
        <p className="mt-3">
          Metric: <InlineCode>{metric}</InlineCode>. Axis: <InlineCode>{axis ?? "—"}</InlineCode>.
        </p>
      </>
    ),
  };
}

function chartReadExplanation(metric: string, windowDays: number, unitLabel?: string): ExplainPair {
  return {
    basic: (
      <>
        <p>
          Read the raw line for day-to-day movement, MA7 for short smoothing, and MA30 for the broader
          recent baseline.
        </p>
        <p className="mt-3">
          On a {windowDays}d view, very short swings often matter less than the direction and shape of
          MA30. Units for this chart are <span className="font-medium">{unitLabel ?? "not specified"}</span>.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The chart deliberately separates raw observations from two smoothed series. MA7 helps expose
          short-horizon drift; MA30 acts as the broader recent baseline used for contextual reading.
        </p>
        <p className="mt-3">
          For metric <InlineCode>{metric}</InlineCode>, the useful advanced reading is not one single
          spike but the relationship among raw noise, MA7 excursion, and MA30 slope over the selected
          window.
        </p>
      </>
    ),
  };
}

function statExplanation(kind: "z" | "pct" | "mom" | "current", value?: number): ExplainPair {
  if (kind === "z") {
    return {
      basic: (
        <>
          <p>
            Robust z-score tells you how unusual the current reading looks relative to the metric’s own
            recent typical range.
          </p>
          <p className="mt-3">
            Larger absolute values mean the metric stands out more strongly. The current value is{" "}
            <span className="font-medium">{fmtNum(value, 2)}</span>.
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            <InlineCode>z_robust</InlineCode> is a robust standardized distance. It is designed to
            express unusualness relative to the metric’s recent baseline while being less dominated by
            extreme outliers than a plain mean-and-standard-deviation z-score.
          </p>
          <p className="mt-3">
            In the UI it is an evidence-strength measure for anomaly ranking, not a forecast input.
          </p>
        </>
      ),
    };
  }

  if (kind === "pct") {
    return {
      basic: (
        <>
          <p>
            90-day percentile tells you where today’s reading sits inside the recent 90-day range.
          </p>
          <p className="mt-3">
            High percentile means near the top of recent observations; low percentile means near the
            bottom. The current value is <span className="font-medium">{fmtPct0to100(value)}</span>.
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            <InlineCode>pct_90d</InlineCode> is a positional statistic. Unlike z-score, it does not tell
            you standardized distance; it tells you rank position within the recent distribution.
          </p>
          <p className="mt-3">
            It is useful because it complements z_robust: one number speaks to rank in range, the
            other to unusualness relative to recent typical behavior.
          </p>
        </>
      ),
    };
  }

  if (kind === "mom") {
    return {
      basic: (
        <>
          <p>
            Momentum (7d vs 30d) compares the short-term signal with the broader recent baseline.
          </p>
          <p className="mt-3">
            Positive values mean the short-term level is running above the longer recent trend; negative
            values mean it is running below it. The current value is{" "}
            <span className="font-medium">{fmtNum(value, 3)}</span>.
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            <InlineCode>momentum_7d_vs_30d</InlineCode> is a short-versus-broader baseline comparison.
            It is useful because a metric can be high in level but already cooling in short-term slope,
            or low in level but beginning to heat.
          </p>
          <p className="mt-3">
            In other words, percentile and z tell you where the metric is; momentum tells you how the
            shorter horizon is leaning relative to the broader recent context.
          </p>
        </>
      ),
    };
  }

  return {
    basic: (
      <>
        <p>
          Current value is the visible latest raw reading for this metric in its native units.
        </p>
        <p className="mt-3">
          It is useful because it shows the actual level behind the summaries and classifications.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The current raw value is surfaced for auditability. It lets a technical reader connect the
          driver row back to the actual latest observation rather than relying only on rank- or
          standardization-based summaries.
        </p>
        <p className="mt-3">
          Use it together with units, percentile, and z_robust, not in isolation.
        </p>
      </>
    ),
  };
}

function labelForMetric(metric: string) {
  return metric;
}

function topLineMetricNote(chainId: ChainId, metric: string): ReactNode {
  if (chainId === "bitcoin" && metric === "tx_count_daily") {
    return (
      <>
        Confirmed transactions per day are a primary demand signal on Bitcoin because they show how much
        confirmed block-space usage the chain is carrying.
      </>
    );
  }

  if (metric === "median_tx_fee_native") {
    return (
      <>
        Median transaction fee in native units is a direct friction indicator: it helps show how costly
        transacting currently looks on this chain.
      </>
    );
  }

  if (metric === "avg_block_time_sec") {
    return (
      <>
        Average time between blocks is a timing and pacing proxy. It helps the user judge whether the
        chain currently looks smooth, slow, or constrained in block production terms.
      </>
    );
  }

  if (metric === "gas_utilization_pct") {
    return (
      <>
        Gas utilization is a capacity proxy on EVM-style chains. It helps show how full the chain
        currently looks relative to recent norms.
      </>
    );
  }

  return <>This metric is shown because it currently helps explain the chain’s descriptive reading.</>;
}

export default async function ChainPage({
  params,
  searchParams,
}: {
  params: Promise<{ chain: string }>;
  searchParams?: Promise<ChainPageSearchParams>;
}) {
  const { chain } = await params;
  if (!chain) return notFound();

  const cfg = getChainConfig(chain as ChainId);
  if (!cfg) return notFound();

  const chainId = cfg.id;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedWindow = normalizeWindow(resolvedSearchParams?.window);
  const effectiveWindowDays = requestedWindow;

  const metaPath = `meta/${chainId}/latest.json`;
  const goldPath = `gold/${chainId}/last${effectiveWindowDays}d.json`;
  const derivedPath = `derived/${chainId}/last${effectiveWindowDays}d.json`;

  const [meta, goldPayload, derivedPayload] = await Promise.all([
    readPublishedJson<MetaLatest>(metaPath),
    readPublishedJson<GoldRow[] | { rows?: GoldRow[] }>(goldPath),
    readPublishedJson<DerivedRow[] | { rows?: DerivedRow[] }>(derivedPath),
  ]);

  if (!meta) return notFound();

  const goldRows = Array.isArray(goldPayload)
    ? goldPayload
    : Array.isArray(goldPayload?.rows)
      ? goldPayload.rows
      : [];
  const derivedRows = Array.isArray(derivedPayload)
    ? derivedPayload
    : Array.isArray(derivedPayload?.rows)
      ? derivedPayload.rows
      : [];

  const maxDerived = maxDateMsFromRows(derivedRows);
  const maxGold = maxDateMsFromRows(goldRows);
  const maxFromMeta = parseIsoDayToUtcMs(
    meta.updated_through ??
      meta.regime?.asof_date ??
      meta.scorecard?.asof_date ??
      meta.date
  );
  const maxMs = maxDerived ?? maxGold ?? maxFromMeta;
  if (maxMs === null) return notFound();

  const bounds = computeBoundsFromMax(maxMs, effectiveWindowDays);
  const dayList = listDays(bounds);

  const derivedByDate = buildDerivedByDate(derivedRows);
  const goldByDate = buildGoldByDate(goldRows);

  const missingDays = dayList.filter(
    (d) => !derivedByDate.has(d) || !goldByDate.has(d)
  );
  if (missingDays.length > 0) {
    const dailyResults = await Promise.all(
      missingDays.map(async (d) => {
        const [dr, gr] = await Promise.all([
          derivedByDate.has(d)
            ? Promise.resolve(null)
            : readPublishedJson<DerivedRow>(`derived/${chainId}/${d}.json`),
          goldByDate.has(d)
            ? Promise.resolve(null)
            : readPublishedJson<GoldRow>(`gold/${chainId}/${d}.json`),
        ]);
        return { date: d, derived: dr, gold: gr };
      })
    );

    for (const { date, derived: dr, gold: gr } of dailyResults) {
      if (dr && typeof dr.date === "string") derivedByDate.set(date, dr);
      if (gr && typeof (gr as GoldRow).date === "string") goldByDate.set(date, gr as GoldRow);
    }
  }

  const displayName = meta.profile?.label ?? cfg.name;
  const asOf =
    meta.updated_through ??
    meta.regime?.asof_date ??
    meta.scorecard?.asof_date ??
    meta.date ??
    meta.confidence?.date;

  const regimeLabel = meta.status?.label ?? meta.regime?.label ?? "UNKNOWN";
  const oneLiner = meta.status?.one_liner;

  const conf = meta.confidence?.confidence_score;
  const confBand = confidenceBand(conf);
  const confNotice = confidenceNotice(conf);

  const driversAll = Array.isArray(meta.regime?.drivers)
    ? sortDrivers(meta.regime.drivers)
    : [];
  const topDrivers = driversAll.slice(0, 4);

  const dims = meta.scorecard?.dimensions;

  const hidden = new Set(
    (meta.profile?.hidden_metrics ?? cfg.hiddenMetrics ?? []).map(String)
  );
  const driverMetrics = driversAll
    .map((d) => d.metric)
    .filter((m): m is string => typeof m === "string");
  const defaults = guessMetricKeysForChain(chainId);

  const candidates = Array.from(new Set([...driverMetrics, ...defaults]))
    .filter((m) => !hidden.has(m))
    .slice(0, 4);

  const charts = candidates
    .filter((metric) => {
      const data = buildChartDataObserved({ bounds, derivedByDate, goldByDate, metric });
      return data.some((point) => point.value !== null || point.ma7 !== null || point.ma30 !== null);
    })
    .map((metric) => {
      const metricDriver = driversAll.find((d) => d.metric === metric);
      return {
        metric,
        axis: metricDriver?.axis,
        unitLabel: getUnitLabel(chainId, metric) ?? undefined,
        data: buildChartDataObserved({ bounds, derivedByDate, goldByDate, metric }),
      };
    });

  const windowOptions = [
    { key: "30", label: "30d", href: `/chains/${chainId}?window=30` },
    { key: "90", label: "90d", href: `/chains/${chainId}?window=90` },
    { key: "180", label: "180d", href: `/chains/${chainId}?window=180` },
    { key: "365", label: "365d", href: `/chains/${chainId}?window=365` },
  ];

  const chainProfilePair = chainProfileCopy(chainId);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <ModalStyles />

      <StalenessBar
        chain={chainId}
        lagDays={meta.confidence?.lag_days_vs_utc_today}
        asOfDate={asOf}
        confidenceScore={conf}
      />

      {confNotice ? (
        <section className={`mb-6 rounded-2xl border px-5 py-4 text-sm ${confidenceNoticeClass(confNotice.tone)}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-medium">{confNotice.title}</div>
              <p className={`mt-1 max-w-3xl ${confidenceNoticeMetaClass(confNotice.tone)}`}>
                {confNotice.body}
              </p>
            </div>
            <div className={`text-xs ${confidenceNoticeMetaClass(confNotice.tone)}`}>
              Source: <InlineCode>confidence.confidence_score</InlineCode>
              {typeof conf === "number" ? (
                <>
                  {" "}· Current value <span className="font-medium text-white">{conf.toFixed(3)}</span>
                </>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <header className="mb-8 space-y-5">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_40%)] p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <ChainIcon
                    chain={chainId}
                    className="h-10 w-10 text-base"
                    label={`${displayName} icon`}
                  />
                  <div className="min-w-0">
                    <h1 className="truncate text-3xl font-semibold">{displayName}</h1>
                    <div className="mt-1 text-sm text-muted-foreground">{cfg.subtitle}</div>
                  </div>
                </div>

                <div className="mt-5 max-w-3xl text-base leading-8 text-slate-100">
                  {chainProfilePair.basic}
                </div>
              </div>

              <div className="shrink-0">
                <RegimeBadge label={regimeLabel} statusColor={meta.status?.color} />
              </div>
            </div>

            {oneLiner ? (
              <div className="mt-5 rounded-2xl border bg-muted/20 p-4">
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Current summary
                </div>
                <div className="mt-2 text-sm font-medium leading-7 text-foreground">{oneLiner}</div>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <Link href={`/chains/${chainId}/history`} className="rounded-full border px-4 py-2 hover:text-foreground">
                View history
              </Link>
              <Link href="/methodology" className="hover:text-foreground hover:underline">
                Methodology
              </Link>
              <span>·</span>
              <Link href="/glossary" className="hover:text-foreground hover:underline">
                Glossary
              </Link>
              <span>·</span>
              <Link href="/thresholds" className="hover:text-foreground hover:underline">
                Thresholds
              </Link>
            </div>
          </div>

          <aside className="rounded-3xl border p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                Chain profile
              </div>
              <MoreLink id={`profile-${chainId}`} />
            </div>
            <div className="mt-4 text-sm leading-7 text-slate-100">
              {chainId === "bitcoin"
                ? "BTC is different because it does not expose the same execution and gas fields as Ethereum-style chains."
                : "This page uses a chain-specific profile so each chain is explained through the metrics that actually make descriptive sense for that network."}
            </div>
            <div className="mt-4 rounded-2xl border bg-muted/20 p-4 text-sm leading-7 text-slate-200">
              This page therefore emphasizes the visible evidence that is most useful for understanding
              how busy, costly, or constrained the chain currently looks.
            </div>
          </aside>
        </section>

        <section className="rounded-2xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                Fast interpretation map
              </div>
              <div className="mt-2 text-sm text-slate-100">
                Freshness → Confidence → Regime → Scorecard → Drivers → Charts
              </div>
            </div>
            <MoreLink id={`read-order-${chainId}`} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-5">
          <div className="rounded-2xl border p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                Published regime
              </div>
              <MoreLink id={`regime-${chainId}`} />
            </div>
            <div className="mt-4">
              <RegimeBadge label={regimeLabel} statusColor={meta.status?.color} />
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-100">
              Top-line descriptive state for the current published row.
            </p>
          </div>

          <div className="rounded-2xl border p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                Confidence
              </div>
              <div className="flex items-center gap-2">
                <span className={confidencePill(conf)}>{confBand}</span>
                <MoreLink id={`confidence-${chainId}`} />
              </div>
            </div>
            <div className="mt-4 text-5xl font-semibold">{typeof conf === "number" ? conf.toFixed(3) : "—"}</div>
            <div className="mt-4 text-sm leading-7 text-slate-100">
              Data quality {fmtNum(meta.confidence?.data_quality_score, 3)} · Label support{" "}
              {fmtNum(meta.confidence?.label_confidence_score, 3)}
            </div>
          </div>

          <div className="rounded-2xl border p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                Data as of
              </div>
              <MoreLink id={`asof-${chainId}`} />
            </div>
            <div className="mt-4 break-words text-5xl font-semibold leading-none">
              {fmtDate(asOf)}
            </div>
            <div className="mt-4 text-sm leading-7 text-slate-100">
              Check this before interpreting any label too strongly.
            </div>
          </div>

          <div className="rounded-2xl border p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                Observed lag
              </div>
              <MoreLink id={`lag-${chainId}`} />
            </div>
            <div className="mt-4 text-5xl font-semibold">
              {typeof meta.confidence?.lag_days_vs_utc_today === "number"
                ? `${meta.confidence.lag_days_vs_utc_today}d`
                : "—"}
            </div>
            <div className="mt-4 text-sm leading-7 text-slate-100">
              Freshness is shown separately from confidence.
            </div>
          </div>

          <div className="rounded-2xl border p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                Determinism
              </div>
              <MoreLink id={`determinism-${chainId}`} />
            </div>
            <div className="mt-4 break-all text-base font-semibold">
              {meta.regime?.determinism_hash ?? "—"}
            </div>
            <div className="mt-4 text-sm leading-7 text-slate-100">
              Window days: <span className="font-medium">{meta.regime?.window_days ?? meta.scorecard?.window_days ?? "—"}</span>
            </div>
          </div>
        </section>
      </header>

      <section className="mt-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
              Top of page
            </div>
            <h2 className="mt-1 text-3xl font-semibold">Live signal view</h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
              The first visual layer should answer two questions fast: what state the chain is in right
              now, and what the recent metric shape looks like. Deeper explanation stays collapsed until
              the user asks for it.
            </p>
          </div>

          <WindowSelector
            activeKey={String(requestedWindow)}
            options={windowOptions}
            ariaLabel="Chart window selector"
          />
        </div>

        {!derivedPayload ? (
          <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
            No derived source found at <InlineCode>{derivedPath}</InlineCode>.
          </div>
        ) : charts.length === 0 ? (
          <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
            Derived loaded from <InlineCode>{derivedPath}</InlineCode>, but no chartable series were
            found for the selected metrics.
          </div>
        ) : (
          <div className="space-y-6">
            {charts.map((c, index) => (
              <section key={c.metric} className="rounded-3xl border p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                      Chart {index + 1}
                    </div>
                    <h3 className="mt-2 text-2xl font-semibold">{labelForMetric(c.metric)}</h3>
                    <div className="mt-2 text-sm leading-7 text-muted-foreground">
                      {topLineMetricNote(chainId, c.metric)}
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Window {effectiveWindowDays}d · Units {c.unitLabel ?? "—"}
                  </div>
                </div>

                <div className="mt-4">
                  <MetricLineChart
                    title={c.metric}
                    subtitle={`MA: ${derivedPath} · Raw: ${goldPath} · Window: ${utcMsToIsoDay(bounds.minMs)} → ${utcMsToIsoDay(bounds.maxMs)} (${effectiveWindowDays} calendar days)`}
                    unitLabel={c.unitLabel}
                    data={c.data}
                    windowDays={effectiveWindowDays}
                  />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-base font-medium">How to read this chart</div>
                      <MoreLink id={`chart-read-${safeId(chainId)}-${safeId(c.metric)}`} />
                    </div>
                    <div className="mt-2 text-sm leading-7 text-slate-100">
                      Use raw for day-to-day movement, MA7 for short smoothing, and MA30 for broader
                      baseline.
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-base font-medium">Why {c.metric} is shown</div>
                      <MoreLink id={`chart-why-${safeId(chainId)}-${safeId(c.metric)}`} />
                    </div>
                    <div className="mt-2 text-sm leading-7 text-slate-100">
                      This metric is visible because it currently helps explain the descriptive reading.
                    </div>
                  </div>
                </div>

                <ExplainModal
                  id={`chart-read-${safeId(chainId)}-${safeId(c.metric)}`}
                  title={`How to read ${c.metric}`}
                  subtitle={
                    <>
                      Window <InlineCode>{String(effectiveWindowDays)}d</InlineCode> · Units{" "}
                      <InlineCode>{c.unitLabel ?? "—"}</InlineCode>
                    </>
                  }
                  pair={chartReadExplanation(c.metric, effectiveWindowDays, c.unitLabel)}
                  traceability={
                    <ul className="list-disc pl-5">
                      <li>Derived path: <InlineCode>{derivedPath}</InlineCode></li>
                      <li>Gold path: <InlineCode>{goldPath}</InlineCode></li>
                      <li>Metric key: <InlineCode>{c.metric}</InlineCode></li>
                    </ul>
                  }
                />

                <ExplainModal
                  id={`chart-why-${safeId(chainId)}-${safeId(c.metric)}`}
                  title={`Why ${c.metric} is shown`}
                  subtitle={<>This popup explains why the chart is present on the page.</>}
                  pair={metricReasonExplanation(c.metric, c.axis)}
                  traceability={
                    <ul className="list-disc pl-5">
                      <li>Metric: <InlineCode>{c.metric}</InlineCode></li>
                      <li>Axis: <InlineCode>{c.axis ?? "—"}</InlineCode></li>
                      <li>Visible chart source window: <InlineCode>{`${effectiveWindowDays}d`}</InlineCode></li>
                    </ul>
                  }
                />
              </section>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
          Deeper decomposition
        </div>
        <h2 className="mt-1 text-3xl font-semibold">Scorecard</h2>
        <p className="mt-2 max-w-5xl text-sm leading-7 text-muted-foreground">
          The scorecard breaks the present state into Demand, Friction, and Capacity. This is where
          the user should go when the top-line regime label feels too compressed or too blunt.
        </p>

        {meta.scorecard?.notes?.interpretation ? (
          <div className="mt-4 rounded-2xl border p-5 text-sm leading-7 text-slate-100">
            <span className="font-medium text-white">Published interpretation note:</span>{" "}
            {meta.scorecard.notes.interpretation}
          </div>
        ) : null}

        {!dims ? (
          <div className="mt-4 rounded-2xl border p-6 text-sm text-muted-foreground">
            No scorecard dimensions found in <InlineCode>scorecard.dimensions</InlineCode>.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {[
              { key: "demand" as const, label: "Demand", dim: dims.demand },
              { key: "friction" as const, label: "Friction", dim: dims.friction },
              { key: "capacity" as const, label: "Capacity", dim: dims.capacity },
            ].map(({ key, label, dim }) => {
              const modalId = `scorecard-${safeId(chainId)}-${key}`;
              return (
                <div key={key} className="rounded-3xl border p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">{label}</div>
                    <div className="flex items-center gap-2">
                      <span className={pillClass("neutral")}>{dim?.level ?? "—"}</span>
                      <MoreLink id={modalId} />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-center">
                    {typeof dim?.score === "number" && Number.isFinite(dim.score) ? (
                      <ScoreGauge score={dim.score} label={label} note={String(dim.level ?? "—")} />
                    ) : (
                      <div className="py-10 text-sm text-muted-foreground">Score not available</div>
                    )}
                  </div>

                  <div className="mt-3 text-center text-2xl font-semibold">
                    {fmtScore100(dim?.score)}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">/ 100</span>
                  </div>

                  <div className="mt-4 text-sm leading-7 text-slate-100">
                    Coverage: {fmtNum(dim?.coverage_factor, 3)} · Effective conf:{" "}
                    {fmtNum(dim?.effective_confidence, 3)}
                  </div>

                  <ExplainModal
                    id={modalId}
                    title={`What ${label} means`}
                    subtitle={
                      <>
                        Source <InlineCode>{`scorecard.dimensions.${key}`}</InlineCode> · Current level{" "}
                        <InlineCode>{dim?.level ?? "—"}</InlineCode>
                      </>
                    }
                    pair={scorecardAxisExplanation(key, dim)}
                    traceability={
                      <ul className="list-disc pl-5">
                        <li>Source: <InlineCode>{`meta/${chainId}/latest.json`}</InlineCode></li>
                        <li>Field: <InlineCode>{`scorecard.dimensions.${key}`}</InlineCode></li>
                        <li>Coverage factor: <InlineCode>{fmtNum(dim?.coverage_factor, 3)}</InlineCode></li>
                        <li>Effective confidence: <InlineCode>{fmtNum(dim?.effective_confidence, 3)}</InlineCode></li>
                      </ul>
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-3xl font-semibold">Drivers</h2>
        <p className="mt-2 max-w-5xl text-sm leading-7 text-muted-foreground">
          Drivers are the “because” behind the visible regime. They show which published metrics are
          currently doing the most work in explaining the present state.
        </p>

        {topDrivers.length === 0 ? (
          <div className="mt-4 rounded-2xl border p-6 text-sm text-muted-foreground">
            No drivers found in <InlineCode>regime.drivers[]</InlineCode>.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {topDrivers.map((d, index) => {
              const metricId = safeId(d.metric ?? `driver-${index}`);
              return (
                <section key={`${d.metric ?? "driver"}-${index}`} className="rounded-3xl border p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm uppercase tracking-[0.14em] text-muted-foreground">
                        {d.axis ?? "—"}
                      </div>
                      <h3 className="mt-2 text-2xl font-semibold">{d.metric ?? "—"}</h3>
                    </div>
                    <span className={pillClass("good")}>{d.trend ?? "—"}</span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          z robust
                        </div>
                        <MoreLink id={`driver-z-${metricId}`} />
                      </div>
                      <div className="mt-3 text-3xl font-semibold">{fmtNum(d.z_robust, 2)}</div>
                    </div>

                    <div className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          90d percentile
                        </div>
                        <MoreLink id={`driver-pct-${metricId}`} />
                      </div>
                      <div className="mt-3 text-3xl font-semibold">{fmtPct0to100(d.pct_90d)}</div>
                    </div>

                    <div className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Momentum 7d vs 30d
                        </div>
                        <MoreLink id={`driver-mom-${metricId}`} />
                      </div>
                      <div className="mt-3 text-3xl font-semibold">{fmtNum(d.momentum_7d_vs_30d, 3)}</div>
                    </div>

                    <div className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Current value
                        </div>
                        <MoreLink id={`driver-current-${metricId}`} />
                      </div>
                      <div className="mt-3 text-3xl font-semibold">
                        {typeof d.current === "number" ? String(d.current) : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-base font-medium">Why {d.metric ?? "this metric"} is shown here</div>
                      <MoreLink id={`driver-why-${metricId}`} />
                    </div>
                    <div className="mt-2 text-sm leading-7 text-slate-100">
                      This row is being used as visible evidence for the current descriptive state.
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-muted-foreground">
                    Source: <InlineCode>{`meta/${chainId}/latest.json`}</InlineCode> →{" "}
                    <InlineCode>regime.drivers[]</InlineCode>
                  </div>

                  <ExplainModal
                    id={`driver-z-${metricId}`}
                    title={`Robust z-score for ${d.metric ?? "metric"}`}
                    pair={statExplanation("z", d.z_robust)}
                    traceability={<div>Field: <InlineCode>regime.drivers[].z_robust</InlineCode></div>}
                  />
                  <ExplainModal
                    id={`driver-pct-${metricId}`}
                    title={`90-day percentile for ${d.metric ?? "metric"}`}
                    pair={statExplanation("pct", d.pct_90d)}
                    traceability={<div>Field: <InlineCode>regime.drivers[].pct_90d</InlineCode></div>}
                  />
                  <ExplainModal
                    id={`driver-mom-${metricId}`}
                    title={`Momentum (7d vs 30d) for ${d.metric ?? "metric"}`}
                    pair={statExplanation("mom", d.momentum_7d_vs_30d)}
                    traceability={<div>Field: <InlineCode>regime.drivers[].momentum_7d_vs_30d</InlineCode></div>}
                  />
                  <ExplainModal
                    id={`driver-current-${metricId}`}
                    title={`Current raw value for ${d.metric ?? "metric"}`}
                    pair={statExplanation("current", d.current)}
                    traceability={<div>Field: <InlineCode>regime.drivers[].current</InlineCode></div>}
                  />
                  <ExplainModal
                    id={`driver-why-${metricId}`}
                    title={`Why ${d.metric ?? "this metric"} is shown`}
                    subtitle={
                      <>
                        Axis <InlineCode>{d.axis ?? "—"}</InlineCode> · Trend <InlineCode>{d.trend ?? "—"}</InlineCode>
                      </>
                    }
                    pair={metricReasonExplanation(d.metric ?? "metric", d.axis)}
                    traceability={
                      <ul className="list-disc pl-5">
                        <li>Source: <InlineCode>{`meta/${chainId}/latest.json`}</InlineCode></li>
                        <li>Field: <InlineCode>regime.drivers[]</InlineCode></li>
                        <li>Metric: <InlineCode>{d.metric ?? "—"}</InlineCode></li>
                      </ul>
                    }
                  />
                </section>
              );
            })}
          </div>
        )}
      </section>

      <details className="mt-10 rounded-2xl border p-5">
        <summary className="cursor-pointer text-sm font-medium">Data contract & traceability</summary>
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          <div>Data source: <InlineCode>{currentDataSource()}</InlineCode></div>
          <div>Meta path: <InlineCode>{metaPath}</InlineCode></div>
          <div>Gold path: <InlineCode>{goldPath}</InlineCode></div>
          <div>Derived path: <InlineCode>{derivedPath}</InlineCode></div>
          <div>Runtime chart points use observed published dates inside the selected window.</div>
          <div>Daily-file supplementation is preserved when a published window bundle is incomplete.</div>
        </div>
      </details>

      <ExplainModal
        id={`profile-${chainId}`}
        title={`${displayName} chain profile`}
        subtitle={<>Why this chain is interpreted the way it is on this page.</>}
        pair={chainProfilePair}
        traceability={
          <ul className="list-disc pl-5">
            <li>Chain id: <InlineCode>{chainId}</InlineCode></li>
            <li>Published profile label: <InlineCode>{meta.profile?.label ?? displayName}</InlineCode></li>
            {meta.profile?.note ? (
              <li>Published profile note: <InlineCode>{meta.profile.note}</InlineCode></li>
            ) : null}
          </ul>
        }
      />

      <ExplainModal
        id={`read-order-${chainId}`}
        title="Why this reading order is recommended"
        pair={readOrderExplanation()}
        traceability={
          <ul className="list-disc pl-5">
            <li>Freshness source: <InlineCode>confidence.lag_days_vs_utc_today</InlineCode></li>
            <li>Confidence source: <InlineCode>confidence.confidence_score</InlineCode></li>
            <li>Regime source: <InlineCode>status.label</InlineCode></li>
            <li>Scorecard source: <InlineCode>scorecard.dimensions.*</InlineCode></li>
            <li>Drivers source: <InlineCode>regime.drivers[]</InlineCode></li>
          </ul>
        }
      />

      <ExplainModal
        id={`regime-${chainId}`}
        title="What regime means"
        subtitle={<>Current visible label: <InlineCode>{regimeLabel}</InlineCode></>}
        pair={regimeExplanation(regimeLabel)}
        traceability={
          <ul className="list-disc pl-5">
            <li>Source: <InlineCode>{`meta/${chainId}/latest.json`}</InlineCode></li>
            <li>Field: <InlineCode>status.label</InlineCode></li>
            <li>Published one-liner: <InlineCode>{oneLiner ?? "—"}</InlineCode></li>
          </ul>
        }
      />

      <ExplainModal
        id={`confidence-${chainId}`}
        title="What confidence means"
        subtitle={<>Current visible band: <InlineCode>{confBand}</InlineCode></>}
        pair={confidenceExplanation(conf, meta.confidence?.data_quality_score, meta.confidence?.label_confidence_score)}
        traceability={
          <ul className="list-disc pl-5">
            <li>Source: <InlineCode>{`meta/${chainId}/latest.json`}</InlineCode></li>
            <li>Field: <InlineCode>confidence.confidence_score</InlineCode></li>
            <li>Data quality: <InlineCode>{fmtNum(meta.confidence?.data_quality_score, 3)}</InlineCode></li>
            <li>Label support: <InlineCode>{fmtNum(meta.confidence?.label_confidence_score, 3)}</InlineCode></li>
          </ul>
        }
      />

      <ExplainModal
        id={`asof-${chainId}`}
        title="What data as-of means"
        pair={asOfExplanation(asOf)}
        traceability={
          <ul className="list-disc pl-5">
            <li>Visible date: <InlineCode>{fmtDate(asOf)}</InlineCode></li>
            <li>Meta path: <InlineCode>{metaPath}</InlineCode></li>
          </ul>
        }
      />

      <ExplainModal
        id={`lag-${chainId}`}
        title="What observed lag means"
        pair={lagExplanation(meta.confidence?.lag_days_vs_utc_today)}
        traceability={
          <ul className="list-disc pl-5">
            <li>Field: <InlineCode>confidence.lag_days_vs_utc_today</InlineCode></li>
            <li>Current value: <InlineCode>{typeof meta.confidence?.lag_days_vs_utc_today === "number" ? `${meta.confidence.lag_days_vs_utc_today}d` : "—"}</InlineCode></li>
          </ul>
        }
      />

      <ExplainModal
        id={`determinism-${chainId}`}
        title="What determinism means"
        pair={determinismExplanation(meta.regime?.determinism_hash, meta.regime?.window_days ?? meta.scorecard?.window_days)}
        traceability={
          <ul className="list-disc pl-5">
            <li>Field: <InlineCode>regime.determinism_hash</InlineCode></li>
            <li>Hash: <InlineCode>{meta.regime?.determinism_hash ?? "—"}</InlineCode></li>
            <li>Window days: <InlineCode>{String(meta.regime?.window_days ?? meta.scorecard?.window_days ?? "—")}</InlineCode></li>
          </ul>
        }
      />
    </main>
  );
}
