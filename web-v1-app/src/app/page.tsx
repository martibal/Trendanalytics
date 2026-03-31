import type { ReactNode } from "react";

import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { currentDataSource, readStorageObject } from "@/lib/storage";
import {
  whatIsTrendAnalyticsExplanation,
  interpretationBoundaryExplanation,
} from "@/lib/content/landingExplanations";
import {
  confidenceBand,
  confidenceChipClass,
  fmtConfidence,
  fmtDate,
  rowTakeaway,
  statusChipClass,
  type SurfaceRowDisplay,
} from "@/lib/landingSurface";
import Hero from "@/components/landing/Hero";
import LiveChains from "@/components/landing/LiveChains";
import Plans from "@/components/landing/Plans";
import SurfaceStatus from "@/components/landing/SurfaceStatus";
import TrustGrid from "@/components/landing/TrustGrid";
import JsonLayers from "@/components/landing/JsonLayers";
import ExploreGrid from "@/components/landing/ExploreGrid";
import DataContractDetails from "@/components/landing/DataContractDetails";

import "server-only";

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

function ExplainModal({
  id,
  title,
  subtitle,
  pair,
}: {
  id: string;
  title: string;
  subtitle?: ReactNode;
  pair: { basic: ReactNode; advanced: ReactNode };
}) {
  return (
    <div id={id} className="ta-modal fixed inset-0 z-[80] items-center justify-center p-4">
      <a
        href="#"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        aria-label="Close dialog"
      />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col rounded-3xl border border-cyan-500/20 bg-[#071322] shadow-2xl shadow-cyan-950/40">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/8 px-6 py-5">
          <div>
            <h3 className="text-2xl font-semibold text-white">{title}</h3>
            {subtitle ? <div className="mt-2 text-sm leading-6 text-slate-300">{subtitle}</div> : null}
          </div>
          <a
            href="#"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-slate-200 hover:bg-white/10"
            aria-label="Close dialog"
          >
            ×
          </a>
        </div>

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
        </div>
      </div>
    </div>
  );
}

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

function buildSurfaceStatus(rows: StatusApiRow[]) {
  const items: { title: string; body: string }[] = [];

  const degraded = rows.filter(
    (r) => typeof r.confidence_score === "number" && r.confidence_score < 0.4
  );
  if (degraded.length > 0) {
    items.push({
      title: "Confidence below publication threshold",
      body: `${degraded.map((r) => r.label).join(", ")} currently publish confidence below the canonical 0.40 threshold. These states remain visible for traceability, but should be read as UNKNOWN/DEGRADED.`,
    });
  }

  const delayed = rows.filter((r) => r.status === "warn" || r.status === "fail");
  if (delayed.length > 0) {
    items.push({
      title: "Freshness outside expected policy",
      body: `${delayed.map((r) => r.label).join(", ")} are currently outside their expected publish schedule. The latest publication is still shown with the correct freshness context.`,
    });
  }

  const l2s = rows.filter((r) => r.chain === "arbitrum" || r.chain === "base");
  if (l2s.length > 0) {
    items.push({
      title: "Layer-2 feeds use seven-day policy lag",
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

function toSurfaceRowDisplay(row: StatusApiRow): SurfaceRowDisplay {
  const band = confidenceBand(row.confidence_score);
  return {
    chain: row.chain,
    href: `/chains/${row.chain}`,
    label: row.label,
    name: row.name,
    status: row.status,
    statusClass: statusChipClass(row.status),
    publishedRegime: row.published_regime,
    confidenceValue: fmtConfidence(row.confidence_score),
    confidenceBand: band,
    confidenceClass: confidenceChipClass(band),
    asOf: fmtDate(row.as_of),
    lagValue: row.lag_days !== null ? `${row.lag_days}d` : "—",
    takeaway: rowTakeaway({
      status: row.status,
      publishedRegime: row.published_regime,
      confidenceScore: row.confidence_score,
    }),
  };
}

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

  const landingFallbackRows: StatusApiRow[] = CHAIN_LIST.map((chain) => {
    const landing = landingChains.find((r) => r.chain === chain.id);
    return {
      chain: chain.id,
      name: landing?.name ?? chain.name,
      label: landing?.label ?? chain.label,
      as_of: landing?.as_of ?? null,
      lag_days: landing?.lag_days ?? null,
      status: "unknown",
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

  const displayRows = rows.map(toSurfaceRowDisplay);
  const surfaceStatus = buildSurfaceStatus(rows);
  const whatIsExplain = whatIsTrendAnalyticsExplanation();
  const boundaryExplain = interpretationBoundaryExplanation();

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <ModalStyles />

      <Hero rows={displayRows} />
      <LiveChains rows={displayRows} />
      <div className="mt-10">
        <Plans />
      </div>
      <JsonLayers />
      <SurfaceStatus items={surfaceStatus} />
      <TrustGrid />
      <ExploreGrid />
      <DataContractDetails dataset={dataset} dataSource={currentDataSource()} />

      <ExplainModal
        id="what-is-modal"
        title="What TrendAnalytics is"
        subtitle="A narrow product with a specific job: classify whether current on-chain change still looks like noise or has started to persist like a structural shift."
        pair={whatIsExplain}
      />

      <ExplainModal
        id="boundary-modal"
        title="Interpretation boundary"
        subtitle="TrendAnalytics is intentionally descriptive. It explains current network state, but it does not tell you what to do."
        pair={boundaryExplain}
      />
    </main>
  );
}
