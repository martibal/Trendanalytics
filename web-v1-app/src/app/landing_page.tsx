// src/app/page.tsx
import type { ReactNode } from "react";
import Link from "next/link";

import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { currentDataSource, readStorageObject } from "@/lib/storage";
import RegimeBadge from "@/components/RegimeBadge";

import {
  whatIsTrendAnalyticsExplanation,
  regimeLabelExplanation,
  landingConfidenceExplanation,
  landingFreshnessExplanation,
  dataLayersExplanation,
  interpretationBoundaryExplanation,
  siteOrganisationExplanation,
  crossChainNotablesExplanation,
  subscriberSurfaceExplanation,
} from "@/lib/content/landingExplanations";

import "server-only";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LandingApiChain = {
  chain?: string;
  label?: string;
  name?: string;
  status_label?: string;
  one_liner?: string;
  confidence_score?: number | null;
  lag_days?: number | null;
  as_of?: string | null;
};

type LandingApiResponse =
  | { chains?: LandingApiChain[] }
  | { items?: LandingApiChain[] }
  | { data?: LandingApiChain[] };

type StatusApiRow = {
  chain: string;
  name: string;
  label: string;
  as_of: string | null;
  lag_days: number | null;
  status: "ok" | "warn" | "fail" | "unknown";
  published_regime: string | null;
  confidence_score: number | null;
  expected_delay_days: number;
};

type StatusApiResponse = {
  ok: boolean;
  generated_at_utc: string;
  data_source?: "local" | "s3";
  dataset?: {
    version?: string | null;
    published_at?: string | null;
    methodology_version?: string | null;
  } | null;
  chains?: StatusApiRow[];
};

type MetaLatest = {
  date?: string;
  updated_through?: string;
  confidence?: {
    lag_days_vs_utc_today?: number;
    confidence_score?: number;
  };
  status?: { label?: string; color?: string; one_liner?: string };
  regime?: { asof_date?: string };
  profile?: { label?: string };
};

// ---------------------------------------------------------------------------
// Shared UI primitives — exact copies from chain page
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
  return <code className="rounded bg-muted px-1 py-0.5 text-xs">{children}</code>;
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
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col rounded-3xl border border-cyan-500/20 bg-[#071322] shadow-2xl shadow-cyan-950/40">
        {/* Sticky header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/8 px-6 py-5">
          <div>
            <h3 className="text-2xl font-semibold text-white">{title}</h3>
            {subtitle ? (
              <div className="mt-2 text-sm leading-6 text-slate-300">{subtitle}</div>
            ) : null}
          </div>
          <a
            href="#"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-slate-200 hover:bg-white/10"
            aria-label="Close dialog"
          >
            ×
          </a>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
  } catch {
    return null;
  }
}

function extractLandingChains(payload: LandingApiResponse | null): LandingApiChain[] {
  if (!payload) return [];
  if (Array.isArray((payload as { chains?: LandingApiChain[] }).chains)) {
    return (payload as { chains?: LandingApiChain[] }).chains ?? [];
  }
  if (Array.isArray((payload as { items?: LandingApiChain[] }).items)) {
    return (payload as { items?: LandingApiChain[] }).items ?? [];
  }
  if (Array.isArray((payload as { data?: LandingApiChain[] }).data)) {
    return (payload as { data?: LandingApiChain[] }).data ?? [];
  }
  return [];
}

function confidenceBand(value?: number | null) {
  if (typeof value !== "number") return "Unknown";
  if (value >= 0.7) return "Good";
  if (value >= 0.4) return "Caution";
  return "Degraded";
}

function fmtDate(value?: string | null) {
  return value && value.trim().length > 0 ? value : "—";
}

function fmtConfidence(value?: number | null) {
  return typeof value === "number" ? value.toFixed(3) : "—";
}

function parseIsoDayToUtcMs(date?: string): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d);
  return Number.isFinite(ms) ? ms : null;
}

function utcTodayMs(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function lagDaysFromIsoDay(date?: string): number | null {
  const asOfMs = parseIsoDayToUtcMs(date);
  if (asOfMs === null) return null;
  const diff = utcTodayMs() - asOfMs;
  return Math.max(0, Math.floor(diff / 86400000));
}

function expectedDelayDays(chain: ChainId): number {
  return chain === "arbitrum" || chain === "base" ? 7 : 0;
}

function classifyStatus(params: {
  chain: ChainId;
  lagDays: number | null;
  asOf?: string | null;
}): "ok" | "warn" | "fail" | "unknown" {
  const { chain, lagDays, asOf } = params;
  if (!asOf || typeof lagDays !== "number") return "unknown";
  const exp = expectedDelayDays(chain);
  if (lagDays <= exp) return "ok";
  if (lagDays <= exp + 2) return "warn";
  return "fail";
}

async function buildMetaFallbackRows(): Promise<StatusApiRow[]> {
  return Promise.all(
    CHAIN_LIST.map(async (chain) => {
      const metaPath = `data/published/v1/meta/${chain.id}/latest.json`;
      const meta = await readPublishedJson<MetaLatest>(metaPath);
      const asOf = meta?.updated_through ?? meta?.regime?.asof_date ?? meta?.date ?? null;
      const lagDays =
        typeof meta?.confidence?.lag_days_vs_utc_today === "number"
          ? meta.confidence.lag_days_vs_utc_today
          : lagDaysFromIsoDay(asOf ?? undefined);
      return {
        chain: chain.id,
        name: meta?.profile?.label ?? chain.name,
        label: chain.label,
        as_of: asOf,
        lag_days: lagDays,
        status: classifyStatus({ chain: chain.id, lagDays, asOf }),
        published_regime: meta?.status?.label ?? null,
        confidence_score:
          typeof meta?.confidence?.confidence_score === "number"
            ? meta.confidence.confidence_score
            : null,
        expected_delay_days: expectedDelayDays(chain.id),
      };
    })
  );
}

function buildNotables(rows: StatusApiRow[]) {
  const items: { title: string; body: string }[] = [];

  const degraded = rows.filter(
    (r) => typeof r.confidence_score === "number" && r.confidence_score < 0.4
  );
  if (degraded.length > 0) {
    items.push({
      title: "Confidence is degraded on part of the surface",
      body: `${degraded.map((r) => r.label).join(", ")} currently publish confidence below the canonical 0.40 threshold. These states remain visible for traceability, but should be read as UNKNOWN/DEGRADED.`,
    });
  }

  const delayed = rows.filter((r) => r.status === "warn" || r.status === "fail");
  if (delayed.length > 0) {
    items.push({
      title: "Freshness requires attention",
      body: `${delayed.map((r) => r.label).join(", ")} are currently outside their expected publish schedule. The latest publication is still shown with the correct freshness context.`,
    });
  }

  const l2s = rows.filter((r) => r.chain === "arbitrum" || r.chain === "base");
  if (l2s.length > 0) {
    items.push({
      title: "L2 publication cadence is intentionally different",
      body: "Arbitrum and Base are published with a roughly seven-day delay by design. A larger lag does not automatically imply a broken feed — it must be judged against the chain-specific policy.",
    });
  }

  if (items.length === 0) {
    items.push({
      title: "All supported chains have current published context",
      body: "The landing surface can show regime, confidence, and freshness context across all four supported chains using the latest published artifacts.",
    });
  }

  return items.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Status and confidence chip helpers
// ---------------------------------------------------------------------------

function statusChipClass(status?: string | null) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide";
  if (status === "ok")
    return `${base} border-emerald-500/25 bg-emerald-500/10 text-emerald-300`;
  if (status === "warn")
    return `${base} border-amber-500/25 bg-amber-500/10 text-amber-300`;
  if (status === "fail")
    return `${base} border-red-500/25 bg-red-500/10 text-red-300`;
  return `${base} border-border bg-muted text-muted-foreground`;
}

function confidenceChipClass(band: string) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium";
  if (band === "Good")
    return `${base} border-emerald-500/25 bg-emerald-500/10 text-emerald-300`;
  if (band === "Caution")
    return `${base} border-amber-500/25 bg-amber-500/10 text-amber-300`;
  if (band === "Degraded")
    return `${base} border-red-500/25 bg-red-500/10 text-red-300`;
  return `${base} border-border bg-muted text-muted-foreground`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function HomePage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  const [landingPayload, statusPayload, metaFallbackRows] = await Promise.all([
    readPublishedJson<LandingApiResponse>("data/published/v1/landing/index.json"),
    readPublishedJson<StatusApiResponse>("data/published/v1/status/index.json"),
    buildMetaFallbackRows(),
  ]);

  const landingChains = extractLandingChains(landingPayload);
  const statusRows =
    Array.isArray(statusPayload?.chains) && statusPayload.chains.length > 0
      ? statusPayload.chains
      : [];

  const landingFallbackRows = CHAIN_LIST.map((chain) => {
    const landing = landingChains.find((r) => r.chain === chain.id);
    return {
      chain: chain.id,
      name: landing?.name ?? chain.name,
      label: landing?.label ?? chain.label,
      as_of: landing?.as_of ?? null,
      lag_days: landing?.lag_days ?? null,
      status: "unknown" as const,
      published_regime: landing?.status_label ?? null,
      confidence_score: landing?.confidence_score ?? null,
      expected_delay_days: expectedDelayDays(chain.id),
    };
  });

  const rows =
    statusRows.length > 0
      ? statusRows
      : metaFallbackRows.some(
          (r) =>
            r.published_regime !== null ||
            r.confidence_score !== null ||
            r.as_of !== null ||
            r.lag_days !== null
        )
      ? metaFallbackRows
      : landingFallbackRows;

  const notables = buildNotables(rows);

  // Pre-resolve all explanation content server-side
  const whatIsExplain = whatIsTrendAnalyticsExplanation();
  const regimeLabelExplain = regimeLabelExplanation();
  const confidenceExplain = landingConfidenceExplanation();
  const freshnessExplain = landingFreshnessExplanation();
  const dataLayersExplain = dataLayersExplanation();
  const boundaryExplain = interpretationBoundaryExplanation();
  const siteOrgExplain = siteOrganisationExplanation();
  const notablesExplain = crossChainNotablesExplanation();
  const subscriberExplain = subscriberSurfaceExplanation();

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <ModalStyles />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <header className="mb-10">
        <div className="rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_40%)] p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
                On-chain regime intelligence
              </div>
              <h1 className="mt-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">
                TrendAnalytics
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-300">
                Deterministic, explainable regime context for Bitcoin, Ethereum, Arbitrum, and Base.
                Published daily. No price data. No forecasts. No hidden guidance.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <MoreLink id="what-is-modal" label="What is this?" />
                <MoreLink id="boundary-modal" label="Interpretation boundary" />
                <Link
                  href="/methodology"
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-white/10"
                >
                  Methodology
                </Link>
                <Link
                  href="/glossary"
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-white/10"
                >
                  Glossary
                </Link>
              </div>
            </div>

            {dataset ? (
              <div className="min-w-[200px] rounded-2xl border border-white/10 bg-black/10 px-4 py-4 text-xs text-slate-300">
                <div className="font-medium uppercase tracking-[0.12em] text-slate-400">
                  Dataset
                </div>
                {dataset.version ? (
                  <div className="mt-2">
                    Revision{" "}
                    <span className="font-semibold text-white">{dataset.version}</span>
                  </div>
                ) : null}
                {dataset.published_at ? (
                  <div className="mt-1">
                    Published{" "}
                    <span className="font-semibold text-white">
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
                <div className="mt-2 border-t border-white/10 pt-2 text-slate-400">
                  Source: <InlineCode>{currentDataSource()}</InlineCode>
                </div>
              </div>
            ) : null}
          </div>

          {/* Fast interpretation map — mirrors chain page pattern */}
          <div className="mt-6 rounded-2xl border border-white/8 bg-white/3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                  How to read this page
                </div>
                <div className="mt-2 text-sm text-slate-100">
                  Chain cards → Notables → Regime labels → Confidence → Freshness
                </div>
              </div>
              <MoreLink id="site-org-modal" label="Site guide" />
            </div>
          </div>
        </div>
      </header>

      {/* ── Chain cards ───────────────────────────────────────────────────── */}
      <section className="mt-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
              Current snapshot
            </div>
            <h2 className="mt-1 text-3xl font-semibold">Supported chains</h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
              Current published regime, confidence, and freshness for each of the four supported
              networks. Click any card to open the full chain analysis page.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <MoreLink id="regime-label-modal" label="What do the labels mean?" />
            <MoreLink id="confidence-modal" label="What is confidence?" />
            <MoreLink id="freshness-modal" label="What is lag?" />
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {rows.map((row) => {
            const band = confidenceBand(row.confidence_score);
            return (
              <Link
                key={row.chain}
                href={`/chains/${row.chain}`}
                className="group rounded-3xl border bg-card p-5 shadow-sm transition hover:border-cyan-500/30 hover:bg-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-2xl font-semibold tracking-tight text-white">
                      {row.label}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {row.name}
                    </div>
                  </div>
                  <span className={statusChipClass(row.status)}>{row.status}</span>
                </div>

                <div className="mt-5">
                  <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                    Published regime
                  </div>
                  <div className="mt-3">
                    {row.published_regime ? (
                      <RegimeBadge label={row.published_regime} />
                    ) : (
                      <span className="text-sm text-muted-foreground">No published label</span>
                    )}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border bg-background/50 p-3">
                  <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Confidence
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="text-2xl font-semibold text-white">
                      {fmtConfidence(row.confidence_score)}
                    </div>
                    <span className={confidenceChipClass(band)}>{band}</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border bg-background/40 p-3">
                    <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      As of
                    </div>
                    <div className="mt-1 text-sm font-medium text-white">
                      {fmtDate(row.as_of)}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-background/40 p-3">
                    <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Lag
                    </div>
                    <div className="mt-1 text-sm font-medium text-white">
                      {row.lag_days !== null ? `${row.lag_days}d` : "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-xs text-muted-foreground transition group-hover:text-cyan-200">
                  Open full analysis →
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Cross-chain notables ──────────────────────────────────────────── */}
      {notables.length > 0 ? (
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                Cross-chain
              </div>
              <h2 className="mt-1 text-3xl font-semibold">Notables</h2>
              <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
                Observations worth your attention across the full surface right now.
              </p>
            </div>
            <MoreLink id="notables-modal" label="What are notables?" />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {notables.map((item, i) => (
              <div key={i} className="rounded-3xl border p-5 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                  Notable {i + 1}
                </div>
                <h3 className="mt-2 text-base font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Orientation grid ─────────────────────────────────────────────── */}
      <section className="mt-10">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
          Orientation
        </div>
        <h2 className="mt-1 text-3xl font-semibold">Understand what you are looking at</h2>
        <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
          Each card below explains a core concept. Click More to open a full explanation with both
          a plain-language and a technical version.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">

          {/* Regime labels */}
          <div className="rounded-3xl border p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                Regime labels
              </div>
              <MoreLink id="regime-label-modal" />
            </div>
            <h3 className="mt-3 text-xl font-semibold">STABLE · HEATING · CONGESTED · CHEAP</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Five possible states that describe the current operating condition of each chain
              relative to its own recent history. Click More to understand what each label means
              and exactly how it is derived.
            </p>
          </div>

          {/* Confidence */}
          <div className="rounded-3xl border p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                Confidence
              </div>
              <MoreLink id="confidence-modal" />
            </div>
            <h3 className="mt-3 text-xl font-semibold">Good · Caution · Degraded</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Every label comes with an evidence-strength score. The three bands tell you how much
              to trust what you are reading. Click More to understand the difference between
              confidence and freshness.
            </p>
          </div>

          {/* Freshness */}
          <div className="rounded-3xl border p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                Freshness and lag
              </div>
              <MoreLink id="freshness-modal" />
            </div>
            <h3 className="mt-3 text-xl font-semibold">As-of date · Observed lag</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Data is published daily with chain-specific delays. Bitcoin and Ethereum update with
              roughly a 1-day lag. Arbitrum and Base update with roughly a 7-day lag by design.
            </p>
          </div>

          {/* Data layers */}
          <div className="rounded-3xl border p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                Data layers
              </div>
              <MoreLink id="data-layers-modal" />
            </div>
            <h3 className="mt-3 text-xl font-semibold">Gold · Meta · Derived</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Three published layers — raw observations, regime intelligence, and smoothed trends.
              Each one builds on the previous and can be downloaded by subscribers.
            </p>
          </div>

          {/* Interpretation boundary */}
          <div className="rounded-3xl border p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                What we do not do
              </div>
              <MoreLink id="boundary-modal" />
            </div>
            <h3 className="mt-3 text-xl font-semibold">No price. No forecasts. No signals.</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              This is a deliberate design decision, not a limitation. Click More for the full
              explanation of why the interpretation boundary is drawn where it is.
            </p>
          </div>

          {/* Subscriber surface */}
          <div className="rounded-3xl border p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                Subscriber access
              </div>
              <MoreLink id="subscriber-modal" />
            </div>
            <h3 className="mt-3 text-xl font-semibold">Data API and file downloads</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              The public pages are free and require no account. A subscription adds direct JSON
              file access for analysts and developers who want to work with the raw data.
            </p>
            <div className="mt-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/10"
              >
                Go to dashboard →
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ── Site navigation strip ─────────────────────────────────────────── */}
      <section className="mt-10 rounded-3xl border p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
              Explore
            </div>
            <h2 className="mt-1 text-2xl font-semibold">Where to go next</h2>
          </div>
          <MoreLink id="site-org-modal" label="Full site guide" />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/chains", label: "Chains", desc: "Full analysis for each network" },
            { href: "/track-record", label: "Track Record", desc: "Historical regime log" },
            { href: "/thresholds", label: "Thresholds", desc: "Simulate custom parameters" },
            { href: "/glossary", label: "Glossary", desc: "Definitions for every term" },
            { href: "/methodology", label: "Methodology", desc: "Full technical documentation" },
            { href: "/status", label: "System Status", desc: "Pipeline and freshness health" },
          ].map(({ href, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center justify-between rounded-2xl border bg-background/40 px-4 py-3 transition hover:border-cyan-500/30 hover:bg-muted/30"
            >
              <div>
                <div className="text-sm font-medium text-white">{label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
              </div>
              <span className="text-xs text-muted-foreground transition group-hover:text-cyan-200">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Data contract strip ───────────────────────────────────────────── */}
      <details className="mt-10 rounded-2xl border p-5">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
          Data contract and traceability
        </summary>
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          <div>
            Data source: <InlineCode>{currentDataSource()}</InlineCode>
          </div>
          <div>
            Dataset manifest:{" "}
            <InlineCode>data/published/v1/dataset.json</InlineCode>
          </div>
          <div>
            Chain cards prefer published status index, then per-chain meta/latest.json, then landing
            index as final fallback.
          </div>
          {dataset?.published_at ? (
            <div>
              Last published: <InlineCode>{dataset.published_at}</InlineCode>
            </div>
          ) : null}
        </div>
      </details>

      {/* ── All modals ────────────────────────────────────────────────────── */}

      <ExplainModal
        id="what-is-modal"
        title={whatIsExplain.title}
        subtitle={whatIsExplain.subtitle}
        pair={{ basic: whatIsExplain.basic, advanced: whatIsExplain.advanced }}
        traceability={whatIsExplain.traceability}
      />

      <ExplainModal
        id="regime-label-modal"
        title={regimeLabelExplain.title}
        subtitle={regimeLabelExplain.subtitle}
        pair={{ basic: regimeLabelExplain.basic, advanced: regimeLabelExplain.advanced }}
        traceability={regimeLabelExplain.traceability}
      />

      <ExplainModal
        id="confidence-modal"
        title={confidenceExplain.title}
        subtitle={confidenceExplain.subtitle}
        pair={{ basic: confidenceExplain.basic, advanced: confidenceExplain.advanced }}
        traceability={confidenceExplain.traceability}
      />

      <ExplainModal
        id="freshness-modal"
        title={freshnessExplain.title}
        subtitle={freshnessExplain.subtitle}
        pair={{ basic: freshnessExplain.basic, advanced: freshnessExplain.advanced }}
        traceability={freshnessExplain.traceability}
      />

      <ExplainModal
        id="data-layers-modal"
        title={dataLayersExplain.title}
        subtitle={dataLayersExplain.subtitle}
        pair={{ basic: dataLayersExplain.basic, advanced: dataLayersExplain.advanced }}
        traceability={dataLayersExplain.traceability}
      />

      <ExplainModal
        id="boundary-modal"
        title={boundaryExplain.title}
        subtitle={boundaryExplain.subtitle}
        pair={{ basic: boundaryExplain.basic, advanced: boundaryExplain.advanced }}
        traceability={boundaryExplain.traceability}
      />

      <ExplainModal
        id="site-org-modal"
        title={siteOrgExplain.title}
        subtitle={siteOrgExplain.subtitle}
        pair={{ basic: siteOrgExplain.basic, advanced: siteOrgExplain.advanced }}
        traceability={siteOrgExplain.traceability}
      />

      <ExplainModal
        id="notables-modal"
        title={notablesExplain.title}
        subtitle={notablesExplain.subtitle}
        pair={{ basic: notablesExplain.basic, advanced: notablesExplain.advanced }}
        traceability={notablesExplain.traceability}
      />

      <ExplainModal
        id="subscriber-modal"
        title={subscriberExplain.title}
        subtitle={subscriberExplain.subtitle}
        pair={{ basic: subscriberExplain.basic, advanced: subscriberExplain.advanced }}
        traceability={subscriberExplain.traceability}
      />
    </main>
  );
}
