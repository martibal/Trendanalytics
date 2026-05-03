// src/app/track-record/page.tsx
import type { ReactNode } from "react";
import Link from "next/link";

import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { computeHistoryDepthDays } from "@/lib/historyDepth";
import { readStorageObject } from "@/lib/storage";
import ChainIcon from "@/components/ChainIcon";
import RegimeBadge from "@/components/RegimeBadge";
import RegimeTimeline from "@/components/track-record/RegimeTimeline";
import ConfidenceHistory from "@/components/track-record/ConfidenceHistory";
import TransitionMatrix from "@/components/track-record/TransitionMatrix";

import {
  whatIsTrackRecordExplanation,
  regimeMixExplanation,
  regimeTimelineExplanation,
  confidenceHistoryExplanation,
  transitionMatrixExplanation,
  historicalTableExplanation,
  revisionIdExplanation,
  trackRecordBoundaryExplanation,
} from "@/lib/content/trackRecordExplanations";

import ShortFullContent from "@/components/site/ShortFullContent";

import PageHero from "@/components/site/PageHero";
import { UrdContainer, UrdPage } from "@/components/site/UrdDesignSystem";

import "server-only";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MetaHistoryRow = {
  chain?: string;
  date?: string;
  updated_through?: string;
  methodology_version?: string;
  revision_id?: number;
  status?: { label?: string; one_liner?: string; color?: string };
  confidence?: {
    confidence_score?: number;
    lag_days_vs_utc_today?: number;
  };
  regime?: { asof_date?: string };
};

type MetaHistoryBundle =
  | MetaHistoryRow[]
  | { rows?: MetaHistoryRow[]; items?: MetaHistoryRow[]; data?: MetaHistoryRow[] };

type TrackRow = {
  chain: ChainId;
  chainLabel: string;
  chainName: string;
  date: string | null;
  asOf: string | null;
  regimeLabel: string | null;
  confidence: number | null;
  lagDays: number | null;
  methodologyVersion: string | null;
  revisionId: number | null;
  oneLiner: string | null;
};

type RegimeBucket =
  | "STABLE"
  | "HEATING"
  | "CONGESTED"
  | "UNKNOWN/DEGRADED"
  | "OTHER";

type ChainStackSummary = {
  chain: ChainId;
  chainLabel: string;
  chainName: string;
  total: number;
  stable: number;
  heating: number;
  congested: number;
  degraded: number;
  other: number;
};

type TrackRecordChainFilter = ChainId | "all";
type TrackRecordWindowFilter = 30 | 90;

type TrackRecordSearchParams = { chain?: string; window?: string };

type ChainArchiveSummary = {
  chain: ChainId;
  chainLabel: string;
  chainName: string;
  count: number | null;
  firstDate: string | null;
  lastDate: string | null;
};

// ---------------------------------------------------------------------------
// Shared UI primitives — identical to chain page and landing page
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

function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded border border-[#9db8d4] bg-[#f4f9ff] px-1 py-0.5 text-[#0d2447] text-xs">{children}</code>;
}

function MoreLink({ id, label = "More" }: { id: string; label?: string }) {
  return (
    <a
      href={`#${id}`}
      className="inline-flex items-center rounded-full border border-[#9db8d4] bg-[#eef6ff] px-3 py-1 text-xs font-black text-[#0d2447] hover:bg-white hover:text-blue-800"
    >
      {label}
    </a>
  );
}

type ExplainPair = { basic: ReactNode; advanced: ReactNode };

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
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col rounded-3xl border border-[#b6cce3] bg-[#e7f1fb] shadow-2xl shadow-slate-950/30">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#c9d9ea] px-6 py-5">
          <div>
            <h3 className="text-2xl font-semibold text-[#0d2447]">{title}</h3>
            {subtitle ? (
              <div className="mt-2 text-sm leading-6 text-[#27476f]">{subtitle}</div>
            ) : null}
          </div>
          <a
            href="#"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#c9d9ea] bg-[#eef6ff] text-xl text-[#0d2447] hover:bg-white"
            aria-label="Close dialog"
          >
            ×
          </a>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-200">
                Basic
              </div>
              <div className="mt-3 text-sm leading-7 text-slate-100">{pair.basic}</div>
            </section>
            <details className="rounded-2xl border border-[#9db8d4] bg-cyan-500/5 p-5" open>
              <summary className="cursor-pointer list-none text-xs font-medium uppercase tracking-[0.14em] text-blue-700">
                Advanced
              </summary>
              <div className="mt-3 text-sm leading-7 text-slate-100">{pair.advanced}</div>
            </details>
          </div>
          {traceability ? (
            <div className="mt-4 rounded-2xl border border-[#c9d9ea] bg-[#eef6ff] p-5">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-[#27476f]">
                Traceability
              </div>
              <div className="mt-3 text-sm leading-7 text-[#0d2447]">{traceability}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data helpers (unchanged from original)
// ---------------------------------------------------------------------------

function arrayBufferToUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

async function readPublishedJson<T>(storagePath: string): Promise<T | null> {
  const result = await readStorageObject(storagePath);
  if (!result) return null;
  try {
    const raw = arrayBufferToUtf8(result.body);
    const json = JSON.parse(raw);
    if (!json || typeof json !== "object") return null;
    return json as T;
  } catch {
    return null;
  }
}

function extractRows(bundle: MetaHistoryBundle | null): MetaHistoryRow[] {
  if (!bundle) return [];
  if (Array.isArray(bundle)) return bundle;
  if (Array.isArray(bundle.rows)) return bundle.rows;
  if (Array.isArray(bundle.items)) return bundle.items;
  if (Array.isArray(bundle.data)) return bundle.data;
  return [];
}

function normalizeChain(value?: string): TrackRecordChainFilter {
  if (
    value === "bitcoin" ||
    value === "ethereum" ||
    value === "arbitrum" ||
    value === "base"
  ) {
    return value;
  }
  return "all";
}

function normalizeWindow(value?: string): TrackRecordWindowFilter {
  return Number(value) === 30 ? 30 : 90;
}

function fmtDate(value?: string | null) {
  return value && value.trim().length > 0 ? value : "—";
}

function fmtConfidence(value?: number | null) {
  return typeof value === "number" ? value.toFixed(3) : "—";
}

function confidenceBand(value?: number | null) {
  if (typeof value !== "number") return "—";
  if (value >= 0.7) return "Good";
  if (value >= 0.4) return "Caution";
  return "Degraded";
}

function bandClass(band: string) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium";
  if (band === "Good")
    return `${base} border-emerald-500/25 bg-emerald-500/10 text-emerald-300`;
  if (band === "Caution")
    return `${base} border-amber-500/25 bg-amber-500/10 text-amber-300`;
  if (band === "Degraded")
    return `${base} border-red-500/25 bg-red-500/10 text-red-300`;
  return `${base} border-[#c9d9ea] bg-[#eef6ff] text-[#27476f]`;
}

function toCsv(rows: TrackRow[]): string {
  const header = [
    "chain",
    "chain_label",
    "date",
    "as_of",
    "regime_label",
    "confidence_score",
    "lag_days",
    "methodology_version",
    "revision_id",
    "one_liner",
  ];
  const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.chain,
        row.chainLabel,
        row.date ?? "",
        row.asOf ?? "",
        row.regimeLabel ?? "",
        row.confidence !== null ? String(row.confidence) : "",
        row.lagDays !== null ? String(row.lagDays) : "",
        row.methodologyVersion ?? "",
        row.revisionId !== null ? String(row.revisionId) : "",
        row.oneLiner ?? "",
      ]
        .map(escapeCell)
        .join(",")
    ),
  ];
  return lines.join("\n");
}

function csvDownloadHref(rows: TrackRow[]): string {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(toCsv(rows))}`;
}

function buildTrackRecordHref(
  chain: TrackRecordChainFilter,
  window: TrackRecordWindowFilter
): string {
  return `/track-record?chain=${chain}&window=${window}`;
}

async function readChainHistory(chain: ChainId): Promise<TrackRow[]> {
  const storagePath = `data/published/v1/meta/${chain}/last90d.json`;
  const bundle = await readPublishedJson<MetaHistoryBundle>(storagePath);
  const rows = extractRows(bundle);
  const chainCfg = CHAIN_LIST.find((item) => item.id === chain);
  return rows
    .filter((row) => typeof row.date === "string")
    .map((row) => ({
      chain,
      chainLabel: chainCfg?.label ?? chain.toUpperCase(),
      chainName: chainCfg?.name ?? chain,
      date: row.date ?? null,
      asOf: row.updated_through ?? row.regime?.asof_date ?? null,
      regimeLabel: row.status?.label ?? null,
      confidence:
        typeof row.confidence?.confidence_score === "number"
          ? row.confidence.confidence_score
          : null,
      lagDays:
        typeof row.confidence?.lag_days_vs_utc_today === "number"
          ? row.confidence.lag_days_vs_utc_today
          : null,
      methodologyVersion: row.methodology_version ?? null,
      revisionId:
        typeof row.revision_id === "number" ? row.revision_id : null,
      oneLiner: row.status?.one_liner ?? null,
    }));
}

async function readChainArchiveSummary(chain: ChainId): Promise<ChainArchiveSummary> {
  const chainCfg = CHAIN_LIST.find((item) => item.id === chain);
  const manifest = await readPublishedJson<{
    available_days?: string[];
    available_dates?: string[];
    dates?: string[];
    available_days_count?: number;
  }>(`data/published/v1/meta/${chain}/manifest.json`);

  const dates = manifest?.available_days ?? manifest?.available_dates ?? manifest?.dates ?? [];
  const normalizedDates = Array.isArray(dates)
    ? dates.filter((value): value is string => typeof value === "string" && value.length > 0).sort()
    : [];
  const count =
    normalizedDates.length > 0
      ? normalizedDates.length
      : typeof manifest?.available_days_count === "number" && manifest.available_days_count > 0
        ? manifest.available_days_count
        : null;

  return {
    chain,
    chainLabel: chainCfg?.label ?? chain.toUpperCase(),
    chainName: chainCfg?.name ?? chain,
    count,
    firstDate: normalizedDates[0] ?? null,
    lastDate: normalizedDates[normalizedDates.length - 1] ?? null,
  };
}

function toRegimeBucket(label: string | null): RegimeBucket {
  if (label === "STABLE") return "STABLE";
  if (label === "HEATING") return "HEATING";
  if (label === "CONGESTED") return "CONGESTED";
  if (label === "UNKNOWN/DEGRADED") return "UNKNOWN/DEGRADED";
  return "OTHER";
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

function formatPct(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function stackSegmentClass(bucket: RegimeBucket): string {
  if (bucket === "STABLE") return "bg-regime-stable";
  if (bucket === "HEATING") return "bg-regime-heating";
  if (bucket === "CONGESTED") return "bg-regime-congested";
  if (bucket === "UNKNOWN/DEGRADED") return "bg-regime-unknown";
  return "bg-sky-400";
}

function buildChainStackSummaries(rows: TrackRow[]): ChainStackSummary[] {
  return CHAIN_LIST.map((chainCfg) => {
    const chainRows = rows.filter((row) => row.chain === chainCfg.id);
    const counts = chainRows.reduce(
      (acc, row) => {
        const b = toRegimeBucket(row.regimeLabel);
        if (b === "STABLE") acc.stable += 1;
        else if (b === "HEATING") acc.heating += 1;
        else if (b === "CONGESTED") acc.congested += 1;
        else if (b === "UNKNOWN/DEGRADED") acc.degraded += 1;
        else acc.other += 1;
        return acc;
      },
      { stable: 0, heating: 0, congested: 0, degraded: 0, other: 0 }
    );
    return {
      chain: chainCfg.id,
      chainLabel: chainCfg.label,
      chainName: chainCfg.name,
      total: chainRows.length,
      ...counts,
    };
  });
}

function buildOverallStackSummary(rows: TrackRow[]) {
  return rows.reduce(
    (acc, row) => {
      const b = toRegimeBucket(row.regimeLabel);
      acc.total += 1;
      if (b === "STABLE") acc.stable += 1;
      else if (b === "HEATING") acc.heating += 1;
      else if (b === "CONGESTED") acc.congested += 1;
      else if (b === "UNKNOWN/DEGRADED") acc.degraded += 1;
      else acc.other += 1;
      return acc;
    },
    { total: 0, stable: 0, heating: 0, congested: 0, degraded: 0, other: 0 }
  );
}

function sortRowsAscending(rows: TrackRow[]): TrackRow[] {
  return [...rows].sort((a, b) => {
    const da = a.date ?? "";
    const db = b.date ?? "";
    if (da !== db) return da.localeCompare(db);
    return a.chain.localeCompare(b.chain);
  });
}

function buildTransitionsByChain(rows: TrackRow[]): Array<{ from: string; to: string }> {
  const rowsByChain = new Map<ChainId, TrackRow[]>();
  for (const row of rows) {
    const existing = rowsByChain.get(row.chain);
    if (existing) existing.push(row);
    else rowsByChain.set(row.chain, [row]);
  }
  const transitions: Array<{ from: string; to: string }> = [];
  for (const chainRows of rowsByChain.values()) {
    const ordered = sortRowsAscending(chainRows);
    for (let i = 1; i < ordered.length; i += 1) {
      transitions.push({
        from: ordered[i - 1]?.regimeLabel ?? "UNKNOWN/DEGRADED",
        to: ordered[i]?.regimeLabel ?? "UNKNOWN/DEGRADED",
      });
    }
  }
  return transitions;
}

function StackLegendItem({
  label,
  count,
  total,
  bucket,
}: {
  label: string;
  count: number;
  total: number;
  bucket: RegimeBucket;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-[#27476f]">
      <span
        className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${stackSegmentClass(bucket)}`}
      />
      <span>{label}</span>
      <span className="font-medium text-[#0d2447]">
        {count} ({formatPct(count, total)})
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TrackRecordPage({
  searchParams,
}: {
  searchParams?: Promise<TrackRecordSearchParams>;
}) {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  const resolvedSearchParams: TrackRecordSearchParams = searchParams
    ? await searchParams
    : {};

  const selectedChain = normalizeChain(resolvedSearchParams.chain);
  const selectedWindow = normalizeWindow(resolvedSearchParams.window);

  const chainIds: ChainId[] =
    selectedChain === "all"
      ? ["bitcoin", "ethereum", "arbitrum", "base"]
      : [selectedChain];

  const [allRows, archiveSummaries, historyDepthDays] = await Promise.all([
    Promise.all(chainIds.map(readChainHistory)).then((rows) => rows.flat()),
    Promise.all(chainIds.map(readChainArchiveSummary)),
    computeHistoryDepthDays().catch(() => null),
  ]);

  const sortedRows = allRows
    .sort((a, b) => {
      const da = a.date ?? "";
      const db = b.date ?? "";
      if (da !== db) return db.localeCompare(da);
      return a.chain.localeCompare(b.chain);
    });

  const filteredRows = sortedRows.slice(0, selectedWindow * chainIds.length);
  const totalArchiveRows = archiveSummaries.reduce((sum, item) => sum + (item.count ?? 0), 0);
  const earliestArchiveDate = archiveSummaries
    .map((item) => item.firstDate)
    .filter((value): value is string => Boolean(value))
    .sort()[0] ?? null;
  const latestArchiveDate = archiveSummaries
    .map((item) => item.lastDate)
    .filter((value): value is string => Boolean(value))
    .sort()
    .slice(-1)[0] ?? null;
  const pipelineRunDays =
    typeof historyDepthDays === "number" && Number.isFinite(historyDepthDays)
      ? historyDepthDays.toLocaleString("en-GB")
      : "—";
  const hasAnyRevisionId = filteredRows.some(
    (row) => row.revisionId !== null && row.revisionId !== undefined
  );
  const timelineRows = [...filteredRows];
  const visualRows = sortRowsAscending(filteredRows);
  const transitions = buildTransitionsByChain(filteredRows);
  const csvHref = csvDownloadHref(filteredRows);

  const stableCount = filteredRows.filter((r) => r.regimeLabel === "STABLE").length;
  const heatingCount = filteredRows.filter((r) => r.regimeLabel === "HEATING").length;
  const congestedCount = filteredRows.filter((r) => r.regimeLabel === "CONGESTED").length;
  const degradedCount = filteredRows.filter((r) => r.regimeLabel === "UNKNOWN/DEGRADED").length;

  const chainStackSummaries = buildChainStackSummaries(filteredRows).filter((item) =>
    selectedChain === "all" ? true : item.chain === selectedChain
  );
  const overallStackSummary = buildOverallStackSummary(filteredRows);

  // Pre-resolve explanations server-side
  const whatIsExplain = whatIsTrackRecordExplanation();
  const regimeMixExplain = regimeMixExplanation(selectedWindow);
  const timelineExplain = regimeTimelineExplanation();
  const confidenceExplain = confidenceHistoryExplanation();
  const matrixExplain = transitionMatrixExplanation();
  const tableExplain = historicalTableExplanation();
  const revisionExplain = revisionIdExplanation();
  const boundaryExplain = trackRecordBoundaryExplanation();

  return (
    <UrdPage>
      <PageHero
        eyebrow="Historical record"
        title="Track Record"
        summary="Published regime labels, confidence, revisions, transitions, and chain-level history, shown as a traceable descriptive record."
      />

      <UrdContainer className="py-10">
      <ModalStyles />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="mb-10 rounded-3xl border border-[#c9d9ea] bg-[#eaf3fb] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
        <div className="rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_40%)] p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-blue-700">
                Historical record
              </div>
              <h1 className="mt-3 text-4xl font-semibold leading-tight text-[#0d2447] sm:text-5xl">
                Track Record
              </h1>
              <p className="mt-4 text-lg leading-8 text-[#27476f]">
                A public log of every regime label and confidence score this product has published,
                day by day. What you see here is what was actually published — not reconstructed,
                not adjusted, not a backtest.
              </p>
              <div className="mt-5 rounded-2xl border border-[#9db8d4] bg-[#f4f9ff] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-blue-700">
                  Compliance reference
                </div>
                <p className="mt-2 text-base font-semibold leading-7 text-[#0d2447]">
                  Every label, every confidence score, every determinism hash this product has
                  ever published. {pipelineRunDays !== "—" ? `${pipelineRunDays} days, four chains` : "Four chains"},
                  fully reproducible. This is your compliance reference — verifiable,
                  version-stamped, and never retroactively altered.
                </p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <MoreLink id="what-is-modal" label="What is this page?" />
                <MoreLink id="boundary-modal" label="Interpretation boundary" />
                <Link
                  href="/methodology"
                  className="inline-flex items-center rounded-full border border-[#c9d9ea] bg-[#eef6ff] px-3 py-1 text-xs font-medium text-[#0d2447] hover:bg-white"
                >
                  Methodology
                </Link>
              </div>
            </div>

            {dataset ? (
              <div className="min-w-[200px] rounded-2xl border border-[#c9d9ea] bg-[#eef6ff] px-4 py-4 text-xs text-[#27476f]">
                <div className="font-medium uppercase tracking-[0.12em] text-[#557099]">
                  Dataset
                </div>
                {dataset.version ? (
                  <div className="mt-2">
                    Revision{" "}
                    <span className="font-semibold text-[#0d2447]">{dataset.version}</span>
                  </div>
                ) : null}
                {dataset.published_at ? (
                  <div className="mt-1">
                    Published{" "}
                    <span className="font-semibold text-[#0d2447]">
                      {dataset.published_at.slice(0, 10)}
                    </span>
                  </div>
                ) : null}
                {dataset.methodology_version ? (
                  <div className="mt-1">
                    Methodology{" "}
                    <InlineCode>{dataset.methodology_version}</InlineCode>
                  </div>
                ) : null}
                <div className="mt-2 border-t border-[#c9d9ea] pt-2 text-[#557099]">
                  Public provenance uses <InlineCode>date</InlineCode>, <InlineCode>updated_through</InlineCode>, <InlineCode>methodology_version</InlineCode>, dataset revision, and <InlineCode>regime.determinism_hash</InlineCode>.
                </div>
              </div>
            ) : null}
          </div>

          {/* Reading map */}
          <div className="mt-6 rounded-2xl border border-[#c9d9ea] bg-white/3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-blue-700">
                  How to read this page
                </div>
                <div className="mt-2 text-sm text-slate-100">
                  Regime mix → Timeline → Confidence history → Transition matrix → Full table
                </div>
              </div>
              <MoreLink id="what-is-modal" label="Full explanation" />
            </div>
          </div>
        </div>
      </section>

      <ShortFullContent
        pageKey="track-record"
        summary={<>This page shows what Urd Atlas actually published through time. It is an archive view, not a reconstructed backtest.</>}
        bullets={[
          <>Use it to inspect regime continuity, confidence history, transitions, and archive depth for each chain.</>,
          <>The key trust property is that historical outputs are shown as published, not silently recomputed for presentation.</>,
          <>Short windows are for quick inspection. The since-inception summary is for archive continuity and operational trust.</>,
        ]}
        whyItMatters={<>A skeptical buyer should be able to understand in seconds that this page is evidence of real published history, not a marketing chart.</>}
        fullContent={
          <>
      {/* ── Since inception summary ────────────────────────────────────────── */}
      <section className="mb-8 rounded-3xl border p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-blue-700">
              Since inception
            </div>
            <h2 className="mt-1 text-3xl font-semibold">Public archive summary</h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-[#27476f]">
              The interactive views below focus on 30d and 90d windows for quick analysis. This
              summary shows the longer publication record behind the product so a buyer can see
              both short-window behaviour and long-running operational continuity on the same page.
            </p>
          </div>
          <div className="rounded-2xl border border-[#c9d9ea] bg-[#eef6ff] px-4 py-4 text-xs text-[#27476f]">
            <div className="font-medium uppercase tracking-[0.12em] text-[#557099]">Archive overview</div>
            <div className="mt-2">Visible rows since inception <span className="font-semibold text-[#0d2447]">{totalArchiveRows || "—"}</span></div>
            <div className="mt-1">First published day <InlineCode>{earliestArchiveDate ?? "—"}</InlineCode></div>
            <div className="mt-1">Latest published day <InlineCode>{latestArchiveDate ?? "—"}</InlineCode></div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {archiveSummaries.map((summary) => (
            <div key={summary.chain} className="rounded-2xl border border-[#c9d9ea] bg-[#eef6ff] p-5">
              <div className="flex items-center gap-3">
                <ChainIcon chain={summary.chain} className="h-8 w-8 text-xs" label={`${summary.chainLabel} icon`} />
                <div>
                  <div className="text-sm font-medium text-[#0d2447]">{summary.chainName}</div>
                  <div className="text-xs text-[#27476f]">{summary.chainLabel}</div>
                </div>
              </div>
              <div className="mt-4 text-2xl font-semibold text-[#0d2447]">{summary.count ?? "—"}</div>
              <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Published days since inception</div>
              <div className="mt-3 space-y-1 text-xs text-[#27476f]">
                <div>First row <InlineCode>{summary.firstDate ?? "—"}</InlineCode></div>
                <div>Latest row <InlineCode>{summary.lastDate ?? "—"}</InlineCode></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Filters and summary counts ────────────────────────────────────── */}
      <section className="mb-8 rounded-3xl border p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-blue-700">
              Filters
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(
                [
                  { key: "all" as const, label: "All chains" },
                  { key: "bitcoin" as const, label: "Bitcoin" },
                  { key: "ethereum" as const, label: "Ethereum" },
                  { key: "arbitrum" as const, label: "Arbitrum" },
                  { key: "base" as const, label: "Base" },
                ] as const
              ).map((option) => {
                const active = selectedChain === option.key;
                return (
                  <Link
                    key={option.key}
                    href={buildTrackRecordHref(option.key, selectedWindow)}
                    className={[
                      "rounded-full border px-4 py-1.5 text-sm transition",
                      active
                        ? "border-cyan-500/40 bg-cyan-500/10 text-blue-700"
                        : "border-[#c9d9ea] bg-transparent text-[#27476f] hover:text-[#0d2447]",
                    ].join(" ")}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {([30, 90] as const).map((w) => {
                const active = selectedWindow === w;
                return (
                  <Link
                    key={w}
                    href={buildTrackRecordHref(selectedChain, w)}
                    className={[
                      "rounded-full border px-4 py-1.5 text-sm transition",
                      active
                        ? "border-cyan-500/40 bg-cyan-500/10 text-blue-700"
                        : "border-[#c9d9ea] bg-transparent text-[#27476f] hover:text-[#0d2447]",
                    ].join(" ")}
                  >
                    {w}d
                  </Link>
                );
              })}
            </div>
          </div>

          <a
            href={csvHref}
            download={`urdatlas-track-record-${selectedChain}-${selectedWindow}d.csv`}
            className="inline-flex items-center rounded-full border border-[#c9d9ea] bg-[#eef6ff] px-4 py-1.5 text-xs font-medium text-[#0d2447] hover:bg-white"
          >
            Export CSV →
          </a>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Stable", count: stableCount, color: "text-emerald-300" },
            { label: "Heating", count: heatingCount, color: "text-amber-300" },
            { label: "Congested", count: congestedCount, color: "text-red-300" },
            { label: "Degraded", count: degradedCount, color: "text-[#557099]" },
          ].map(({ label, count, color }) => (
            <div key={label} className="rounded-2xl border p-4 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-[#27476f]">
                {label} rows
              </div>
              <div className={`mt-2 text-3xl font-semibold ${color}`}>{count}</div>
              <div className="mt-1 text-xs text-[#27476f]">
                {formatPct(count, filteredRows.length)} of window
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-[#c9d9ea] bg-white/3 p-4 text-sm leading-7 text-[#27476f]">
          These counts show how many published rows in the selected{" "}
          <span className="font-medium text-[#0d2447]">{selectedWindow}-day window</span> fell into
          each regime bucket. They describe frequency of published labels — not whether one
          regime is better or worse than another. The since-inception summary above is the
          long-horizon trust signal; the 30d / 90d controls below are the short-horizon reading tools.
        </div>
      </section>

      {/* ── Regime mix ───────────────────────────────────────────────────── */}
      <section className="mb-8 rounded-3xl border p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-blue-700">
              Distribution
            </div>
            <h2 className="mt-1 text-3xl font-semibold">Cross-chain regime mix</h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-[#27476f]">
              Stacked bars show how often each published regime appeared in the selected window.
              Longer segments mean more published days in that state.
            </p>
          </div>
          <MoreLink id="regime-mix-modal" />
        </div>

        {/* Overall bar */}
        <div className="mt-6 rounded-2xl border p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-[#0d2447]">Overall — all visible chains</div>
              <div className="mt-1 text-xs text-[#27476f]">
                Aggregate across{" "}
                {selectedChain === "all" ? "all four chains" : "the selected chain"} for the last{" "}
                {selectedWindow} published daily rows
              </div>
            </div>
            <div className="text-sm text-[#27476f]">
              Total rows:{" "}
              <span className="font-medium text-[#0d2447]">{overallStackSummary.total}</span>
            </div>
          </div>

          <div className="mt-4 h-5 w-full overflow-hidden rounded-full border bg-[#eef6ff]">
            <div className="flex h-full w-full">
              {(
                [
                  { bucket: "STABLE" as const, count: overallStackSummary.stable },
                  { bucket: "HEATING" as const, count: overallStackSummary.heating },
                  { bucket: "CONGESTED" as const, count: overallStackSummary.congested },
                  { bucket: "UNKNOWN/DEGRADED" as const, count: overallStackSummary.degraded },
                  { bucket: "OTHER" as const, count: overallStackSummary.other },
                ] as const
              ).map(({ bucket, count }) => (
                <div
                  key={bucket}
                  className={stackSegmentClass(bucket)}
                  style={{ width: `${pct(count, overallStackSummary.total)}%` }}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            <StackLegendItem label="Stable" count={overallStackSummary.stable} total={overallStackSummary.total} bucket="STABLE" />
            <StackLegendItem label="Heating" count={overallStackSummary.heating} total={overallStackSummary.total} bucket="HEATING" />
            <StackLegendItem label="Congested" count={overallStackSummary.congested} total={overallStackSummary.total} bucket="CONGESTED" />
            <StackLegendItem label="Unknown / Degraded" count={overallStackSummary.degraded} total={overallStackSummary.total} bucket="UNKNOWN/DEGRADED" />
            <StackLegendItem label="Other" count={overallStackSummary.other} total={overallStackSummary.total} bucket="OTHER" />
          </div>
        </div>

        {/* Per-chain bars */}
        <div className="mt-4 grid gap-4">
          {chainStackSummaries.map((summary) => (
            <div key={summary.chain} className="rounded-2xl border border-[#c9d9ea] bg-[#eef6ff] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ChainIcon chain={summary.chain} className="h-8 w-8 text-xs" label={`${summary.chainLabel} icon`} />
                  <div>
                    <div className="text-sm font-medium text-[#0d2447]">{summary.chainName}</div>
                    <div className="text-xs text-[#27476f]">{summary.chainLabel}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-[#27476f]">
                    Rows: <span className="font-medium text-[#0d2447]">{summary.total}</span>
                  </div>
                  <Link
                    href={`/chains/${summary.chain}/history`}
                    className="text-xs text-blue-700 hover:underline"
                  >
                    Full history →
                  </Link>
                </div>
              </div>

              <div className="mt-4 h-5 w-full overflow-hidden rounded-full border bg-[#eef6ff]">
                <div className="flex h-full w-full">
                  {(
                    [
                      { bucket: "STABLE" as const, count: summary.stable },
                      { bucket: "HEATING" as const, count: summary.heating },
                      { bucket: "CONGESTED" as const, count: summary.congested },
                      { bucket: "UNKNOWN/DEGRADED" as const, count: summary.degraded },
                      { bucket: "OTHER" as const, count: summary.other },
                    ] as const
                  ).map(({ bucket, count }) => (
                    <div
                      key={bucket}
                      className={stackSegmentClass(bucket)}
                      style={{ width: `${pct(count, summary.total)}%` }}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                <StackLegendItem label="Stable" count={summary.stable} total={summary.total} bucket="STABLE" />
                <StackLegendItem label="Heating" count={summary.heating} total={summary.total} bucket="HEATING" />
                <StackLegendItem label="Congested" count={summary.congested} total={summary.total} bucket="CONGESTED" />
                <StackLegendItem label="Unknown / Degraded" count={summary.degraded} total={summary.total} bucket="UNKNOWN/DEGRADED" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-xs text-[#27476f]">
          Source:{" "}
          <InlineCode>
            {selectedChain === "all"
              ? "meta/<chain>/last90d.json"
              : `meta/${selectedChain}/last90d.json`}
          </InlineCode>
        </div>
      </section>

      {/* ── Regime Timeline ───────────────────────────────────────────────── */}
      {visualRows.length > 0 && (
        <section className="mb-8 rounded-3xl border p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-blue-700">
                Sequential view
              </div>
              <h2 className="mt-1 text-3xl font-semibold">Regime Timeline</h2>
              <p className="mt-2 max-w-4xl text-sm leading-7 text-[#27476f]">
                Each block is one published day. Look for long runs of the same colour — they show
                persistence. Frequent colour changes show instability or transitions.
              </p>
            </div>
            <MoreLink id="timeline-modal" />
          </div>
          <div className="mt-6">
            <RegimeTimeline
              entries={timelineRows.map((r) => ({
                date: r.date ?? "",
                regime: r.regimeLabel ?? "UNKNOWN/DEGRADED",
                confidence: r.confidence,
              }))}
            />
          </div>
        </section>
      )}

      {/* ── Confidence History ────────────────────────────────────────────── */}
      {visualRows.length > 1 && (
        <section className="mb-8 rounded-3xl border p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-blue-700">
                Evidence quality over time
              </div>
              <h2 className="mt-1 text-3xl font-semibold">Confidence History</h2>
              <p className="mt-2 max-w-4xl text-sm leading-7 text-[#27476f]">
                How much evidential support backed the published labels on each day. Labels from
                periods above 0.70 are the most reliable. Below 0.40, the label is UNKNOWN/DEGRADED.
              </p>
            </div>
            <MoreLink id="confidence-modal" />
          </div>
          <div className="mt-6">
            <ConfidenceHistory
              points={visualRows.map((r) => ({
                date: r.date ?? "",
                confidence: r.confidence,
              }))}
            />
          </div>
        </section>
      )}

      {/* ── Transition Matrix ─────────────────────────────────────────────── */}
      {transitions.length > 0 && (
        <section className="mb-8 rounded-3xl border p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-blue-700">
                State changes
              </div>
              <h2 className="mt-1 text-3xl font-semibold">Transition Matrix</h2>
              <p className="mt-2 max-w-4xl text-sm leading-7 text-[#27476f]">
                How often each regime transitioned to another on consecutive published days. The
                diagonal shows persistence — how often a regime stayed the same.
              </p>
            </div>
            <MoreLink id="matrix-modal" />
          </div>
          <div className="mt-6">
            <TransitionMatrix transitions={transitions} />
          </div>
        </section>
      )}

      {/* ── Historical table ──────────────────────────────────────────────── */}
      <section className="mb-8 rounded-3xl border shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-5">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-blue-700">
              Full record
            </div>
            <h2 className="mt-1 text-3xl font-semibold">Historical regime table</h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-[#27476f]">
              Every published daily row in the selected window. Confidence is evidence strength
              for that day&apos;s label — not a forecast of what came next.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <MoreLink id="table-modal" label="How to read the table" />
            <MoreLink id="revision-modal" label="How are archived rows identified?" />
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="px-6 py-8 text-sm text-[#27476f]">
            No published history rows were available for the selected chain and window.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-[#dceaf8] text-left text-[#27476f]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Chain</th>
                  <th className="px-4 py-3">Regime</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Band</th>
                  <th className="px-4 py-3">Lag</th>
                  <th className="px-4 py-3">As of</th>
                  <th className="px-4 py-3">Methodology</th>
                  {hasAnyRevisionId ? (
                    <th className="px-4 py-3">Revision</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => {
                  const band = confidenceBand(row.confidence);
                  return (
                    <tr
                      key={`${row.chain}-${row.date ?? "row"}-${index}`}
                      className="border-b last:border-b-0 hover:bg-[#eef6ff]/20"
                    >
                      <td className="px-4 py-3 font-mono text-xs">{fmtDate(row.date)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/chains/${row.chain}/history`}
                          className="inline-flex items-center gap-2 hover:text-blue-700"
                        >
                          <ChainIcon chain={row.chain} className="h-6 w-6 text-xs" label={`${row.chainLabel} icon`} />
                          <span>{row.chainLabel}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {row.regimeLabel ? (
                          <RegimeBadge label={row.regimeLabel} />
                        ) : (
                          <span className="text-[#27476f]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {fmtConfidence(row.confidence)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={bandClass(band)}>{band}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {row.lagDays !== null ? `${row.lagDays}d` : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{fmtDate(row.asOf)}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {row.methodologyVersion ?? dataset?.methodology_version ?? "—"}
                      </td>
                      {hasAnyRevisionId ? (
                        <td className="px-4 py-3 font-mono text-xs">
                          {row.revisionId ?? "—"}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t px-6 py-3 text-xs text-[#27476f]">
          <span>Displayed rows: {filteredRows.length} · </span>
          Source:{" "}
          <InlineCode>
            {selectedChain === "all"
              ? "meta/<chain>/last90d.json"
              : `meta/${selectedChain}/last90d.json`}
          </InlineCode>
        </div>
      </section>

      {/* ── Navigation strip ─────────────────────────────────────────────── */}
      <section className="mt-10 rounded-3xl border p-6 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-blue-700">
          Related
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/chains", label: "Chains", desc: "Current regime for each network" },
            { href: "/status", label: "Status", desc: "Pipeline and freshness health" },
            { href: "/methodology", label: "Methodology", desc: "How labels are computed" },
            { href: "/glossary", label: "Glossary", desc: "Definitions for every term" },
          ].map(({ href, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center justify-between rounded-2xl border bg-background/40 px-4 py-3 transition hover:border-cyan-500/30 hover:bg-[#eef6ff]/30"
            >
              <div>
                <div className="text-sm font-medium text-[#0d2447]">{label}</div>
                <div className="mt-0.5 text-xs text-[#27476f]">{desc}</div>
              </div>
              <span className="text-xs text-[#27476f] transition group-hover:text-blue-700">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Data contract ─────────────────────────────────────────────────── */}
      <details className="mt-8 rounded-2xl border p-5">
        <summary className="cursor-pointer text-sm font-medium text-[#27476f] hover:text-[#0d2447]">
          Data contract and traceability
        </summary>
        <div className="mt-4 grid gap-2 text-sm text-[#27476f]">
          <div>
            History bundles: <InlineCode>{selectedChain === "all" ? "data/published/v1/meta/&lt;chain&gt;/last90d.json" : `data/published/v1/meta/${selectedChain}/last90d.json`}</InlineCode>
          </div>
          <div>
            30d / 90d refers to published daily rows per visible chain, not calendar months
            of recomputed history.
          </div>
          <div>Since-inception coverage is taken from the per-chain published manifest, while the interactive visual layer reads the canonical 30d / 90d history bundles for speed.</div>
          <div>Public provenance model: <InlineCode>date</InlineCode> · <InlineCode>updated_through</InlineCode> · <InlineCode>methodology_version</InlineCode> · dataset revision · <InlineCode>regime.determinism_hash</InlineCode></div>
          <div>
            The correct temporal coordinate for time-series analysis is the <InlineCode>as_of</InlineCode> date (observation date), not the publication date.
          </div>
        </div>
      </details>

          </>
        }
      />

      {/* ── All modals ────────────────────────────────────────────────────── */}
      <ExplainModal
        id="what-is-modal"
        title={whatIsExplain.title}
        subtitle={whatIsExplain.subtitle}
        pair={{ basic: whatIsExplain.basic, advanced: whatIsExplain.advanced }}
        traceability={whatIsExplain.traceability}
      />
      <ExplainModal
        id="regime-mix-modal"
        title={regimeMixExplain.title}
        subtitle={regimeMixExplain.subtitle}
        pair={{ basic: regimeMixExplain.basic, advanced: regimeMixExplain.advanced }}
        traceability={regimeMixExplain.traceability}
      />
      <ExplainModal
        id="timeline-modal"
        title={timelineExplain.title}
        subtitle={timelineExplain.subtitle}
        pair={{ basic: timelineExplain.basic, advanced: timelineExplain.advanced }}
        traceability={timelineExplain.traceability}
      />
      <ExplainModal
        id="confidence-modal"
        title={confidenceExplain.title}
        subtitle={confidenceExplain.subtitle}
        pair={{ basic: confidenceExplain.basic, advanced: confidenceExplain.advanced }}
        traceability={confidenceExplain.traceability}
      />
      <ExplainModal
        id="matrix-modal"
        title={matrixExplain.title}
        subtitle={matrixExplain.subtitle}
        pair={{ basic: matrixExplain.basic, advanced: matrixExplain.advanced }}
        traceability={matrixExplain.traceability}
      />
      <ExplainModal
        id="table-modal"
        title={tableExplain.title}
        subtitle={tableExplain.subtitle}
        pair={{ basic: tableExplain.basic, advanced: tableExplain.advanced }}
        traceability={tableExplain.traceability}
      />
      <ExplainModal
        id="revision-modal"
        title={revisionExplain.title}
        subtitle={revisionExplain.subtitle}
        pair={{ basic: revisionExplain.basic, advanced: revisionExplain.advanced }}
        traceability={revisionExplain.traceability}
      />
      <ExplainModal
        id="boundary-modal"
        title={boundaryExplain.title}
        subtitle={boundaryExplain.subtitle}
        pair={{ basic: boundaryExplain.basic, advanced: boundaryExplain.advanced }}
      />
      </UrdContainer>
    </UrdPage>
  );
}
