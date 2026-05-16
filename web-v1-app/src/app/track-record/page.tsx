// src/app/track-record/page.tsx
import React from "react";
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

import "server-only";

export const revalidate = 0;

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
// UI primitives
// ---------------------------------------------------------------------------

function ModalStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `.ta-modal { display: none; } .ta-modal:target { display: flex; }` }} />
  );
}

function InlineCode({ children }: { children: ReactNode }) {
  return <code className="code-block inline-block px-2 py-0.5 text-[12px]">{children}</code>;
}

function MoreLink({ id, label = "More" }: { id: string; label?: string }) {
  return <a href={`#${id}`} className="text-link">{label} →</a>;
}

type ExplainPair = { basic: ReactNode; advanced: ReactNode };

function ExplainModal({ id, title, subtitle, pair, traceability }: {
  id: string; title: string; subtitle?: ReactNode;
  pair: ExplainPair; traceability?: ReactNode;
}) {
  return (
    <div id={id} className="ta-modal fixed inset-0 z-[80] items-center justify-center p-4">
      <a href="#" className="absolute inset-0 bg-[rgba(8,15,26,.84)]" aria-label="Close dialog" />
      <div className="modal-panel relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden">
        <div className="modal-head shrink-0">
          <div>
            <h3 className="ua-h3 text-[var(--ink)]">{title}</h3>
            {subtitle ? <div className="mt-2 text-sm leading-6 text-[var(--ink2)]">{subtitle}</div> : null}
          </div>
          <a href="#" className="btn-ghost h-10 px-3 shrink-0" aria-label="Close dialog">×</a>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5">
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="border-t-2 border-[var(--c-stable)] pt-4">
              <div className="eyebrow mb-3">Basic</div>
              <div className="text-sm leading-7 text-[var(--ink2)]">{pair.basic}</div>
            </section>
            <details className="border-t-2 border-[var(--gold)] pt-4">
              <summary className="eyebrow cursor-pointer mb-3">Advanced</summary>
              <div className="text-sm leading-7 text-[var(--ink2)]">{pair.advanced}</div>
            </details>
          </div>
          {traceability ? (
            <div className="mt-6 border-t border-[var(--line)] pt-5">
              <div className="eyebrow mb-3">Traceability</div>
              <div className="text-sm leading-7 text-[var(--ink2)]">{traceability}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data helpers
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
  } catch { return null; }
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
  if (value === "bitcoin" || value === "ethereum" || value === "arbitrum" || value === "base") return value;
  return "all";
}

function normalizeWindow(value?: string): TrackRecordWindowFilter {
  return Number(value) === 30 ? 30 : 90;
}

function fmtDate(value?: string | null) { return value && value.trim().length > 0 ? value : "—"; }
function fmtConfidence(value?: number | null) { return typeof value === "number" ? value.toFixed(3) : "—"; }

function confidenceBand(value?: number | null) {
  if (typeof value !== "number") return "—";
  if (value >= 0.7) return "Good";
  if (value >= 0.4) return "Caution";
  return "Degraded";
}

function bandClass(band: string) {
  if (band === "Good") return "status-stable";
  if (band === "Caution") return "status-heating";
  if (band === "Degraded") return "status-congested";
  return "status-unknown";
}

function toCsv(rows: TrackRow[]): string {
  const header = ["chain","chain_label","date","as_of","regime_label","confidence_score","lag_days","methodology_version","revision_id","one_liner"];
  const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return [
    header.join(","),
    ...rows.map((row) => [
      row.chain, row.chainLabel, row.date ?? "", row.asOf ?? "",
      row.regimeLabel ?? "", row.confidence !== null ? String(row.confidence) : "",
      row.lagDays !== null ? String(row.lagDays) : "", row.methodologyVersion ?? "",
      row.revisionId !== null ? String(row.revisionId) : "", row.oneLiner ?? "",
    ].map(escapeCell).join(",")),
  ].join("\n");
}

function csvDownloadHref(rows: TrackRow[]): string {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(toCsv(rows))}`;
}

function buildTrackRecordHref(chain: TrackRecordChainFilter, window: TrackRecordWindowFilter): string {
  return `/track-record?chain=${chain}&window=${window}`;
}

async function readChainHistory(chain: ChainId): Promise<TrackRow[]> {
  const bundle = await readPublishedJson<MetaHistoryBundle>(`data/published/v1/meta/${chain}/last90d.json`);
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
      confidence: typeof row.confidence?.confidence_score === "number" ? row.confidence.confidence_score : null,
      lagDays: typeof row.confidence?.lag_days_vs_utc_today === "number" ? row.confidence.lag_days_vs_utc_today : null,
      methodologyVersion: row.methodology_version ?? null,
      revisionId: typeof row.revision_id === "number" ? row.revision_id : null,
      oneLiner: row.status?.one_liner ?? null,
    }));
}

async function readChainArchiveSummary(chain: ChainId): Promise<ChainArchiveSummary> {
  const chainCfg = CHAIN_LIST.find((item) => item.id === chain);
  const manifest = await readPublishedJson<{
    available_days?: string[]; available_dates?: string[];
    dates?: string[]; available_days_count?: number;
  }>(`data/published/v1/meta/${chain}/manifest.json`);
  const dates = manifest?.available_days ?? manifest?.available_dates ?? manifest?.dates ?? [];
  const normalizedDates = Array.isArray(dates) ? dates.filter((v): v is string => typeof v === "string" && v.length > 0).sort() : [];
  const count = normalizedDates.length > 0 ? normalizedDates.length
    : typeof manifest?.available_days_count === "number" && manifest.available_days_count > 0
      ? manifest.available_days_count : null;
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
    return { chain: chainCfg.id, chainLabel: chainCfg.label, chainName: chainCfg.name, total: chainRows.length, ...counts };
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
    const da = a.date ?? ""; const db = b.date ?? "";
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
      transitions.push({ from: ordered[i - 1]?.regimeLabel ?? "UNKNOWN/DEGRADED", to: ordered[i]?.regimeLabel ?? "UNKNOWN/DEGRADED" });
    }
  }
  return transitions;
}

function StackLegendItem({ label, count, total, bucket }: { label: string; count: number; total: number; bucket: RegimeBucket }) {
  const colors: Record<RegimeBucket, string> = {
    STABLE: "var(--c-stable)", HEATING: "var(--c-heating)",
    CONGESTED: "var(--c-congested)", "UNKNOWN/DEGRADED": "var(--c-unknown)", OTHER: "var(--ink3)",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--ink2)" }}>
      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: colors[bucket], flexShrink: 0, display: "inline-block" }} />
      <span>{label}</span>
      <span style={{ fontFamily: "var(--mono)", color: "var(--ink)" }}>{count} ({formatPct(count, total)})</span>
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
  const resolvedSearchParams: TrackRecordSearchParams = searchParams ? await searchParams : {};
  const selectedChain = normalizeChain(resolvedSearchParams.chain);
  const selectedWindow = normalizeWindow(resolvedSearchParams.window);
  const chainIds: ChainId[] = selectedChain === "all" ? ["bitcoin", "ethereum", "arbitrum", "base"] : [selectedChain];

  const [allRows, archiveSummaries, historyDepthDays] = await Promise.all([
    Promise.all(chainIds.map(readChainHistory)).then((rows) => rows.flat()),
    Promise.all(chainIds.map(readChainArchiveSummary)),
    computeHistoryDepthDays().catch(() => null),
  ]);

  const sortedRows = allRows.sort((a, b) => {
    const da = a.date ?? ""; const db = b.date ?? "";
    if (da !== db) return db.localeCompare(da);
    return a.chain.localeCompare(b.chain);
  });

  const filteredRows = sortedRows.slice(0, selectedWindow * chainIds.length);
  const totalArchiveRows = archiveSummaries.reduce((sum, item) => sum + (item.count ?? 0), 0);
  const earliestArchiveDate = archiveSummaries.map((item) => item.firstDate).filter((v): v is string => Boolean(v)).sort()[0] ?? null;
  const latestArchiveDate = archiveSummaries.map((item) => item.lastDate).filter((v): v is string => Boolean(v)).sort().slice(-1)[0] ?? null;
  const pipelineRunDays = typeof historyDepthDays === "number" && Number.isFinite(historyDepthDays) ? historyDepthDays.toLocaleString("en-GB") : "—";
  const hasAnyRevisionId = filteredRows.some((row) => row.revisionId !== null && row.revisionId !== undefined);
  const visualRows = sortRowsAscending(filteredRows);
  const transitions = buildTransitionsByChain(filteredRows);
  const csvHref = csvDownloadHref(filteredRows);

  const stableCount = filteredRows.filter((r) => r.regimeLabel === "STABLE").length;
  const heatingCount = filteredRows.filter((r) => r.regimeLabel === "HEATING").length;
  const congestedCount = filteredRows.filter((r) => r.regimeLabel === "CONGESTED").length;
  const degradedCount = filteredRows.filter((r) => r.regimeLabel === "UNKNOWN/DEGRADED").length;

  const chainStackSummaries = buildChainStackSummaries(filteredRows).filter((item) => selectedChain === "all" ? true : item.chain === selectedChain);
  const overallStackSummary = buildOverallStackSummary(filteredRows);

  const whatIsExplain = whatIsTrackRecordExplanation();
  const regimeMixExplain = regimeMixExplanation(selectedWindow);
  const timelineExplain = regimeTimelineExplanation();
  const confidenceExplain = confidenceHistoryExplanation();
  const matrixExplain = transitionMatrixExplanation();
  const tableExplain = historicalTableExplanation();
  const revisionExplain = revisionIdExplanation();
  const boundaryExplain = trackRecordBoundaryExplanation();

  return (
    <main className="ua-page">
      <ModalStyles />

      {/* ── Hero ── */}
      <header className="hero border-b border-[var(--line)]">
        <div className="page-shell">
          <div className="eyebrow mb-4">Historical record</div>
          <h1 className="ua-h1">Track Record</h1>
          <p className="lead mt-4 max-w-2xl">
            A public log of every regime label and confidence score this product has published,
            day by day. What you see here is what was actually published — not reconstructed,
            not adjusted, not a backtest.
          </p>

          <div className="fact-row mt-8" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            <div className="fact-item">
              <strong>Published days</strong>
              <div className="mt-2 font-mono text-[22px] text-[var(--ink)]">{pipelineRunDays}</div>
              <div className="mt-1 text-[11px] text-[var(--ink3)]">since inception</div>
            </div>
            <div className="fact-item">
              <strong>Archive rows</strong>
              <div className="mt-2 font-mono text-[22px] text-[var(--ink)]">{totalArchiveRows || "—"}</div>
              <div className="mt-1 text-[11px] text-[var(--ink3)]">visible rows</div>
            </div>
            <div className="fact-item">
              <strong>First published</strong>
              <div className="mt-2 font-mono text-[13px] text-[var(--ink)]">{earliestArchiveDate ?? "—"}</div>
            </div>
            <div className="fact-item">
              <strong>Latest published</strong>
              <div className="mt-2 font-mono text-[13px] text-[var(--ink)]">{latestArchiveDate ?? "—"}</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <MoreLink id="what-is-modal" label="What is this page?" />
            <MoreLink id="boundary-modal" label="Interpretation boundary" />
            <Link href="/methodology" className="text-link">Methodology →</Link>
          </div>
        </div>
      </header>

      <div className="page-shell py-12">
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "56px", alignItems: "start" }}>

          {/* ── Sticky sidenav ── */}
          <div style={{ position: "sticky", top: "86px", alignSelf: "start" }}>
            <div className="eyebrow mb-4">On this page</div>
            {[
              { href: "#inception", label: "Archive summary" },
              { href: "#filters", label: "Filters" },
              { href: "#regime-mix", label: "Regime mix" },
              { href: "#timeline", label: "Timeline" },
              { href: "#confidence", label: "Confidence" },
              { href: "#matrix", label: "Transitions" },
              { href: "#table", label: "Full table" },
            ].map(({ href, label }) => (
              <a key={href} href={href} className="ua-vf-side-link" style={{
                display: "block",
                fontFamily: "var(--mono)",
                fontSize: "10px",
                letterSpacing: ".13em",
                textTransform: "uppercase",
                color: "var(--ink2)",
                padding: "8px 0",
                borderBottom: "1px solid var(--line)",
              }}>
                {label}
              </a>
            ))}
          </div>

          {/* ── Main content ── */}
          <div className="track-record-content">
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

        {/* ── Since inception ── */}
        <section id="inception" className="border-t border-[var(--line)] pt-8 pb-10">
          <div className="section-head mb-6">
            <div>
              <div className="eyebrow mb-3">Since inception</div>
              <h2 className="ua-h2">Public archive summary</h2>
            </div>
            <p className="text-sm leading-7 text-[var(--ink2)] max-w-xl">
              The interactive views below focus on 30d and 90d windows for quick analysis. This
              summary shows the longer publication record behind the product.
            </p>
          </div>

          <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-4">
            {archiveSummaries.map((summary) => (
              <div key={summary.chain} className="border-t border-r border-[var(--line)] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ChainIcon chain={summary.chain} className="h-8 w-8 text-xs" label={`${summary.chainLabel} icon`} />
                  <div>
                    <div className="text-[var(--ink)] text-sm font-medium">{summary.chainName}</div>
                    <div className="eyebrow">{summary.chainLabel}</div>
                  </div>
                </div>
                <div className="font-mono text-[28px] text-[var(--ink)]">{summary.count ?? "—"}</div>
                <div className="eyebrow mt-1 mb-3">Published days</div>
                <div className="text-[12px] text-[var(--ink3)]">
                  <div>First <InlineCode>{summary.firstDate ?? "—"}</InlineCode></div>
                  <div className="mt-1">Latest <InlineCode>{summary.lastDate ?? "—"}</InlineCode></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Filters ── */}
        <section id="filters" className="border-t border-[var(--line)] pt-8 pb-10">
          <div className="flex flex-wrap items-start justify-between gap-6 mb-6">
            <div>
              <div className="eyebrow mb-4">Filters</div>
              <div className="flex flex-wrap gap-2 mb-3">
                {([
                  { key: "all" as const, label: "All chains" },
                  { key: "bitcoin" as const, label: "Bitcoin" },
                  { key: "ethereum" as const, label: "Ethereum" },
                  { key: "arbitrum" as const, label: "Arbitrum" },
                  { key: "base" as const, label: "Base" },
                ] as const).map((option) => (
                  <Link key={option.key} href={buildTrackRecordHref(option.key, selectedWindow)}
                    className={`ua-vf-tab ${selectedChain === option.key ? "is-active" : ""}`}>
                    {option.label}
                  </Link>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {([30, 90] as const).map((w) => (
                  <Link key={w} href={buildTrackRecordHref(selectedChain, w)}
                    className={`ua-vf-tab ${selectedWindow === w ? "is-active" : ""}`}>
                    {w}d
                  </Link>
                ))}
              </div>
            </div>
            <a href={csvHref} download={`urdatlas-track-record-${selectedChain}-${selectedWindow}d.csv`}
              className="btn-ghost">
              Export CSV →
            </a>
          </div>

          <div className="fact-row" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            {[
              { label: "Stable", count: stableCount, cls: "status-stable" },
              { label: "Heating", count: heatingCount, cls: "status-heating" },
              { label: "Congested", count: congestedCount, cls: "status-congested" },
              { label: "Degraded", count: degradedCount, cls: "status-unknown" },
            ].map(({ label, count, cls }) => (
              <div key={label} className="fact-item">
                <strong>{label} rows</strong>
                <div className={`mt-2 font-mono text-[22px] ${cls}`}>{count}</div>
                <div className="mt-1 text-[11px] text-[var(--ink3)]">{formatPct(count, filteredRows.length)} of window</div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-sm text-[var(--ink2)] max-w-3xl">
            These counts show how many published rows in the selected{" "}
            <span className="text-[var(--ink)]">{selectedWindow}-day window</span> fell into
            each regime bucket. They describe frequency of published labels, not whether one
            regime is better or worse than another.
          </p>
        </section>

        {/* ── Regime mix ── */}
        <section id="regime-mix" className="border-t border-[var(--line)] pt-8 pb-10">
          <div className="section-head mb-8">
            <div>
              <div className="eyebrow mb-3">Distribution</div>
              <h2 className="ua-h2">Cross-chain regime mix</h2>
              <MoreLink id="regime-mix-modal" />
            </div>
            <p className="text-sm leading-7 text-[var(--ink2)] max-w-xl">
              Stacked bars show how often each published regime appeared in the selected window.
              Longer segments mean more published days in that state.
            </p>
          </div>

          {/* Overall bar */}
          <div className="border-t border-[var(--line)] pt-6 pb-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <div className="text-[var(--ink)] text-sm font-medium">Overall — all visible chains</div>
                <div className="text-[11px] text-[var(--ink3)] mt-1">
                  Aggregate across {selectedChain === "all" ? "all four chains" : "the selected chain"} for the last {selectedWindow} published daily rows
                </div>
              </div>
              <div className="font-mono text-[11px] text-[var(--ink3)]">
                Total rows: <span className="text-[var(--ink)]">{overallStackSummary.total}</span>
              </div>
            </div>
            <div style={{ height: "12px", width: "100%", overflow: "hidden", borderRadius: "2px", display: "flex", background: "var(--surface2)" }}>
              {([
                { bucket: "STABLE" as const, count: overallStackSummary.stable },
                { bucket: "HEATING" as const, count: overallStackSummary.heating },
                { bucket: "CONGESTED" as const, count: overallStackSummary.congested },
                { bucket: "UNKNOWN/DEGRADED" as const, count: overallStackSummary.degraded },
                { bucket: "OTHER" as const, count: overallStackSummary.other },
              ]).map(({ bucket, count }) => (
                <div key={bucket} className={stackSegmentClass(bucket)}
                  style={{ width: `${pct(count, overallStackSummary.total)}%` }} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              <StackLegendItem label="Stable" count={overallStackSummary.stable} total={overallStackSummary.total} bucket="STABLE" />
              <StackLegendItem label="Heating" count={overallStackSummary.heating} total={overallStackSummary.total} bucket="HEATING" />
              <StackLegendItem label="Congested" count={overallStackSummary.congested} total={overallStackSummary.total} bucket="CONGESTED" />
              <StackLegendItem label="Unknown / Degraded" count={overallStackSummary.degraded} total={overallStackSummary.total} bucket="UNKNOWN/DEGRADED" />
            </div>
          </div>

          {/* Per-chain bars */}
          <div className="grid gap-0">
            {chainStackSummaries.map((summary) => (
              <div key={summary.chain} className="border-t border-[var(--line)] pt-5 pb-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <ChainIcon chain={summary.chain} className="h-7 w-7 text-xs" label={`${summary.chainLabel} icon`} />
                    <div>
                      <div className="text-sm text-[var(--ink)] font-medium">{summary.chainName}</div>
                      <div className="eyebrow">{summary.chainLabel}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[11px] text-[var(--ink3)]">Rows: <span className="text-[var(--ink)]">{summary.total}</span></span>
                    <Link href={`/chains/${summary.chain}/history`} className="text-link">Full history →</Link>
                  </div>
                </div>
                <div style={{ height: "10px", width: "100%", overflow: "hidden", borderRadius: "2px", display: "flex", background: "var(--surface2)" }}>
                  {([
                    { bucket: "STABLE" as const, count: summary.stable },
                    { bucket: "HEATING" as const, count: summary.heating },
                    { bucket: "CONGESTED" as const, count: summary.congested },
                    { bucket: "UNKNOWN/DEGRADED" as const, count: summary.degraded },
                  ]).map(({ bucket, count }) => (
                    <div key={bucket} className={stackSegmentClass(bucket)} style={{ width: `${pct(count, summary.total)}%` }} />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                  <StackLegendItem label="Stable" count={summary.stable} total={summary.total} bucket="STABLE" />
                  <StackLegendItem label="Heating" count={summary.heating} total={summary.total} bucket="HEATING" />
                  <StackLegendItem label="Congested" count={summary.congested} total={summary.total} bucket="CONGESTED" />
                  <StackLegendItem label="Unknown / Degraded" count={summary.degraded} total={summary.total} bucket="UNKNOWN/DEGRADED" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 font-mono text-[10px] text-[var(--ink3)]">
            Source: <InlineCode>{selectedChain === "all" ? "meta/<chain>/last90d.json" : `meta/${selectedChain}/last90d.json`}</InlineCode>
          </div>
        </section>

        {/* ── Timeline ── */}
        {visualRows.length > 0 && (
          <section id="timeline" className="border-t border-[var(--line)] pt-8 pb-10">
            <div className="section-head mb-8">
              <div>
                <div className="eyebrow mb-3">Sequential view</div>
                <h2 className="ua-h2">Regime Timeline</h2>
                <MoreLink id="timeline-modal" />
              </div>
              <p className="text-sm leading-7 text-[var(--ink2)] max-w-xl">
                Each block is one published day. Look for long runs of the same colour — they show persistence.
                Frequent colour changes show instability or transitions.
              </p>
            </div>
            <div style={{ "--urd-text-body": "var(--ink2)", "--urd-text-strong": "var(--ink)" } as React.CSSProperties}>
            <RegimeTimeline entries={visualRows.map((r) => ({
              date: r.date ?? "",
              regime: r.regimeLabel ?? "UNKNOWN/DEGRADED",
              confidence: r.confidence,
            }))} />
            </div>
          </section>
        )}

        {/* ── Confidence history ── */}
        {filteredRows.length > 0 && (
          <section id="confidence" className="border-t border-[var(--line)] pt-8 pb-10">
            <div className="section-head mb-8">
              <div>
                <div className="eyebrow mb-3">Confidence over time</div>
                <h2 className="ua-h2">Confidence History</h2>
                <MoreLink id="confidence-modal" />
              </div>
              <p className="text-sm leading-7 text-[var(--ink2)] max-w-xl">
                Confidence score plotted day by day. Low confidence periods show when the evidence
                base was insufficient for a strong label.
              </p>
            </div>
            <ConfidenceHistory points={filteredRows.map((r) => ({
              date: r.date ?? "",
              confidence: r.confidence,
            }))} />
          </section>
        )}

        {/* ── Transition matrix ── */}
        {transitions.length > 0 && (
          <section id="matrix" className="border-t border-[var(--line)] pt-8 pb-10">
            <div className="section-head mb-8">
              <div>
                <div className="eyebrow mb-3">Regime transitions</div>
                <h2 className="ua-h2">Transition Matrix</h2>
                <MoreLink id="matrix-modal" />
              </div>
              <p className="text-sm leading-7 text-[var(--ink2)] max-w-xl">
                How often does each regime transition to each other regime? Rows are the "from" state,
                columns are the "to" state.
              </p>
            </div>
            <TransitionMatrix transitions={transitions} />
          </section>
        )}

        {/* ── Full table ── */}
        <section id="table" className="border-t border-[var(--line)] pt-8 pb-10">
          <div className="section-head mb-8">
            <div>
              <div className="eyebrow mb-3">Row-level data</div>
              <h2 className="ua-h2">Historical table</h2>
              <MoreLink id="table-modal" />
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={csvHref} download={`urdatlas-track-record-${selectedChain}-${selectedWindow}d.csv`} className="btn-ghost">
                Export CSV →
              </a>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <p className="text-sm text-[var(--ink2)]">No rows available for the selected filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)]">
                    {["Date", "Chain", "Regime", "Confidence", "Band", "Lag", "As of", "Version", ...(hasAnyRevisionId ? ["Revision"] : [])].map((h) => (
                      <th key={h} className="px-0 py-3 pr-5 text-left font-mono text-[10px] font-medium uppercase tracking-[.16em] text-[var(--gold)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => {
                    const band = confidenceBand(row.confidence);
                    return (
                      <tr key={`${row.chain}-${row.date ?? index}`} className="border-b border-[var(--line)] hover:bg-[var(--surface3)] transition-colors">
                        <td className="px-0 py-3 pr-5 font-mono text-[12px] text-[var(--ink)]">{fmtDate(row.date)}</td>
                        <td className="px-0 py-3 pr-5">
                          <Link href={`/chains/${row.chain}`} className="flex items-center gap-2 text-link">
                            <ChainIcon chain={row.chain} className="h-5 w-5 text-xs" label={`${row.chainLabel} icon`} />
                            <span>{row.chainLabel}</span>
                          </Link>
                        </td>
                        <td className="px-0 py-3 pr-5">
                          {row.regimeLabel ? <RegimeBadge label={row.regimeLabel} /> : <span className="text-[var(--ink3)]">—</span>}
                        </td>
                        <td className="px-0 py-3 pr-5 font-mono text-[12px] text-[var(--ink)]">{fmtConfidence(row.confidence)}</td>
                        <td className="px-0 py-3 pr-5">
                          <span className={`regime-token ${bandClass(band)}`}>{band}</span>
                        </td>
                        <td className="px-0 py-3 pr-5 font-mono text-[12px] text-[var(--ink2)]">{row.lagDays !== null ? `${row.lagDays}d` : "—"}</td>
                        <td className="px-0 py-3 pr-5 font-mono text-[12px] text-[var(--ink2)]">{fmtDate(row.asOf)}</td>
                        <td className="px-0 py-3 pr-5 font-mono text-[12px] text-[var(--ink2)]">{row.methodologyVersion ?? dataset?.methodology_version ?? "—"}</td>
                        {hasAnyRevisionId ? (
                          <td className="px-0 py-3 font-mono text-[12px] text-[var(--ink2)]">{row.revisionId ?? "—"}</td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 font-mono text-[10px] text-[var(--ink3)]">
            Displayed rows: {filteredRows.length} · Source: <InlineCode>{selectedChain === "all" ? "meta/<chain>/last90d.json" : `meta/${selectedChain}/last90d.json`}</InlineCode>
          </div>
        </section>

        {/* ── Related ── */}
        <section className="border-t border-[var(--line)] pt-8 pb-10">
          <div className="eyebrow mb-6">Related</div>
          <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/chains", label: "Chains", desc: "Current regime for each network" },
              { href: "/status", label: "Status", desc: "Pipeline and freshness health" },
              { href: "/methodology", label: "Methodology", desc: "How labels are computed" },
              { href: "/glossary", label: "Glossary", desc: "Definitions for every term" },
            ].map(({ href, label, desc }) => (
              <Link key={href} href={href} className="data-row pr-6" style={{ display: "block", padding: "16px 24px 16px 0" }}>
                <div className="text-[var(--ink)] text-sm font-medium">{label}</div>
                <div className="mt-1 text-[11px] text-[var(--ink3)]">{desc}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Data contract ── */}
        <details className="border-t border-[var(--line)] pt-6">
          <summary className="eyebrow cursor-pointer">Data contract and traceability</summary>
          <div className="mt-4 space-y-2 text-sm text-[var(--ink2)]">
            <div>History bundles: <InlineCode>{selectedChain === "all" ? "data/published/v1/meta/<chain>/last90d.json" : `data/published/v1/meta/${selectedChain}/last90d.json`}</InlineCode></div>
            <div>30d / 90d refers to published daily rows per visible chain, not calendar months of recomputed history.</div>
            <div>Since-inception coverage is taken from the per-chain published manifest, while the interactive visual layer reads the canonical 30d / 90d history bundles for speed.</div>
            <div>Public provenance model: <InlineCode>date</InlineCode> · <InlineCode>updated_through</InlineCode> · <InlineCode>methodology_version</InlineCode> · dataset revision · <InlineCode>regime.determinism_hash</InlineCode></div>
          </div>
        </details>

            </>
          }
        />
      </div>

          </div>
        </div>
      {/* ── Modals ── */}
      <ExplainModal id="what-is-modal" title={whatIsExplain.title} subtitle={whatIsExplain.subtitle} pair={{ basic: whatIsExplain.basic, advanced: whatIsExplain.advanced }} traceability={whatIsExplain.traceability} />
      <ExplainModal id="regime-mix-modal" title={regimeMixExplain.title} subtitle={regimeMixExplain.subtitle} pair={{ basic: regimeMixExplain.basic, advanced: regimeMixExplain.advanced }} traceability={regimeMixExplain.traceability} />
      <ExplainModal id="timeline-modal" title={timelineExplain.title} subtitle={timelineExplain.subtitle} pair={{ basic: timelineExplain.basic, advanced: timelineExplain.advanced }} traceability={timelineExplain.traceability} />
      <ExplainModal id="confidence-modal" title={confidenceExplain.title} subtitle={confidenceExplain.subtitle} pair={{ basic: confidenceExplain.basic, advanced: confidenceExplain.advanced }} traceability={confidenceExplain.traceability} />
      <ExplainModal id="matrix-modal" title={matrixExplain.title} subtitle={matrixExplain.subtitle} pair={{ basic: matrixExplain.basic, advanced: matrixExplain.advanced }} traceability={matrixExplain.traceability} />
      <ExplainModal id="table-modal" title={tableExplain.title} subtitle={tableExplain.subtitle} pair={{ basic: tableExplain.basic, advanced: tableExplain.advanced }} traceability={tableExplain.traceability} />
      <ExplainModal id="revision-modal" title={revisionExplain.title} subtitle={revisionExplain.subtitle} pair={{ basic: revisionExplain.basic, advanced: revisionExplain.advanced }} traceability={revisionExplain.traceability} />
      <ExplainModal id="boundary-modal" title={boundaryExplain.title} subtitle={boundaryExplain.subtitle} pair={{ basic: boundaryExplain.basic, advanced: boundaryExplain.advanced }} />
    </main>
  );
}
