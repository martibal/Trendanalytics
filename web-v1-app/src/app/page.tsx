import type { ReactNode } from "react";

import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { readStorageObject } from "@/lib/storage";
import {
  whatIsUrdAtlasExplanation,
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
import Plans from "@/components/landing/Plans";
import { computeHistoryDepthDays } from "@/lib/historyDepth";
import ExploreGrid from "@/components/landing/ExploreGrid";
import UseCases from "@/components/landing/UseCases";
import MobileLanding from "@/components/mobile/MobileLanding";

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
  display_asof?: string | null;
  regime_asof?: string | null;
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

type LandingHero = {
  chain?: string;
  display_asof?: string;
  regime_asof?: string;
  asof?: {
    display?: string;
    latest_available?: string;
    gold?: string;
    derived?: string;
    meta?: string;
    meta_actual?: string;
    regime?: string;
  };
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
  return chain === "arbitrum" || chain === "base" ? 7 : 1;
}

function heroDisplayAsOf(hero?: LandingHero | null): string | null {
  return (
    hero?.display_asof ??
    hero?.asof?.display ??
    hero?.asof?.latest_available ??
    hero?.asof?.gold ??
    hero?.asof?.derived ??
    hero?.asof?.meta ??
    null
  );
}

function heroRegimeAsOf(hero?: LandingHero | null): string | null {
  return hero?.regime_asof ?? hero?.asof?.regime ?? hero?.asof?.meta_actual ?? null;
}

async function buildLandingHeroMap(): Promise<Map<string, LandingHero | null>> {
  const heroes = await Promise.all(
    CHAIN_LIST.map(async (chain) => {
      const hero = await readPublishedJson<LandingHero>(
        `data/published/v1/landing/${chain.id}/hero.json`,
      );
      return [chain.id, hero] as const;
    }),
  );

  return new Map(heroes);
}

function classifyStatus({
  chain,
  lagDays,
  asOf,
}: {
  chain: ChainId;
  lagDays: number | null;
  asOf: string | null;
}): StatusApiRow["status"] {
  if (!asOf || lagDays === null) return "unknown";
  const expected = expectedDelayDays(chain);
  if (lagDays <= expected) return "ok";
  if (lagDays <= expected + 2) return "warn";
  return "fail";
}

function withLandingHero(row: StatusApiRow, hero?: LandingHero | null): StatusApiRow {
  const displayAsOf = heroDisplayAsOf(hero);
  const regimeAsOf = heroRegimeAsOf(hero);
  const finalAsOf = displayAsOf ?? row.display_asof ?? row.as_of ?? null;
  const finalLag = displayAsOf ? lagDaysFromIsoDay(displayAsOf) : row.lag_days;

  return {
    ...row,
    as_of: finalAsOf,
    display_asof: displayAsOf ?? row.display_asof ?? null,
    regime_asof: regimeAsOf ?? row.regime_asof ?? null,
    lag_days: finalLag,
    status: classifyStatus({
      chain: row.chain as ChainId,
      lagDays: finalLag,
      asOf: finalAsOf,
    }),
  };
}

async function buildMetaFallbackRows(): Promise<StatusApiRow[]> {
  return Promise.all(
    CHAIN_LIST.map(async (chain) => {
      const meta = await readPublishedJson<MetaLatest>(
        `data/published/v1/meta/${chain.id}/latest.json`,
      );
      const asOf = meta?.date ?? meta?.updated_through ?? meta?.regime?.asof_date ?? null;
      const lagDays =
        typeof meta?.confidence?.lag_days_vs_utc_today === "number"
          ? meta.confidence.lag_days_vs_utc_today
          : lagDaysFromIsoDay(asOf ?? undefined);

      return {
        chain: chain.id,
        name: chain.name,
        label: chain.label,
        as_of: asOf,
        display_asof: null,
        regime_asof: meta?.regime?.asof_date ?? null,
        lag_days: lagDays,
        status: classifyStatus({ chain: chain.id, lagDays, asOf }),
        published_regime: meta?.status?.label ?? null,
        confidence_score:
          typeof meta?.confidence?.confidence_score === "number"
            ? meta.confidence.confidence_score
            : null,
        expected_delay_days: expectedDelayDays(chain.id),
      };
    }),
  );
}

function statusText(status: StatusApiRow["status"]) {
  if (status === "ok") return "OK";
  if (status === "warn") return "WARN";
  if (status === "fail") return "FAIL";
  return "UNKNOWN";
}

function statusTooltip(row: StatusApiRow) {
  const expected = row.expected_delay_days;
  const cadence = expected === 7 ? "about 7 days" : "about 1 day";

  if (!row.as_of || typeof row.lag_days !== "number") {
    return `${row.label} does not currently expose enough timing information on the landing surface to classify freshness confidently.`;
  }

  if (row.status === "ok") {
    return `${row.label} is currently within its expected publish cadence of ${cadence}. The latest published row is ${row.lag_days} day${row.lag_days === 1 ? "" : "s"} behind UTC today.`;
  }
  if (row.status === "warn") {
    return `${row.label} is slightly outside its expected publish cadence of ${cadence}. The latest published row is still shown with freshness context rather than hidden.`;
  }
  if (row.status === "fail") {
    return `${row.label} is materially outside its expected publish cadence of ${cadence}. The latest published row remains visible, but the freshness state should be read cautiously.`;
  }
  return `${row.label} is visible on the landing surface, but its freshness state cannot be classified from the current published metadata.`;
}

function publishedRegimeTooltip(row: StatusApiRow) {
  if (!row.published_regime) {
    return `${row.label} does not currently expose a published regime label on the landing surface.`;
  }

  const takeaway = rowTakeaway({
    status: row.status,
    publishedRegime: row.published_regime,
    confidenceScore: row.confidence_score,
  });

  return `${row.label} is currently published as ${row.published_regime}. ${takeaway}`;
}

function confidenceTooltip(row: StatusApiRow) {
  if (typeof row.confidence_score !== "number") {
    return `${row.label} does not currently expose a confidence score on the landing surface.`;
  }

  const band = confidenceBand(row.confidence_score);
  const value = fmtConfidence(row.confidence_score);

  if (band === "Good") {
    return `${row.label} currently publishes confidence ${value}, which falls in the Good band. The latest label is supported by comparatively stronger evidence quality.`;
  }
  if (band === "Caution") {
    return `${row.label} currently publishes confidence ${value}, which falls in the Caution band. The latest label is still visible, but should be read with more care than a high-confidence row.`;
  }
  if (band === "Degraded") {
    return `${row.label} currently publishes confidence ${value}, which is below the canonical 0.40 publication threshold. The row remains visible for traceability, but should be read as degraded.`;
  }
  return `${row.label} does not currently have a classifiable confidence band on the landing surface.`;
}

function asOfTooltip(row: StatusApiRow) {
  if (!row.as_of) {
    return `${row.label} does not currently expose an as-of date on the landing surface.`;
  }
  return `${row.label} is currently showing the latest published row with as-of date ${row.as_of}. This is the date the displayed regime and confidence context refer to.`;
}

function lagTooltip(row: StatusApiRow) {
  if (typeof row.lag_days !== "number") {
    return `${row.label} does not currently expose a lag value on the landing surface.`;
  }
  const expected = row.expected_delay_days;
  return `${row.label} is ${row.lag_days} day${row.lag_days === 1 ? "" : "s"} behind UTC today. Normal policy is about ${expected} day${expected === 1 ? "" : "s"} for this chain.`;
}

function toSurfaceRowDisplay(row: StatusApiRow): SurfaceRowDisplay {
  const band = confidenceBand(row.confidence_score);

  return {
    chain: row.chain,
    href: `/chains/${row.chain}`,
    label: row.label,
    name: row.name,
    status: row.status,
    statusText: statusText(row.status),
    statusClass: statusChipClass(row.status),
    statusTooltip: statusTooltip(row),
    publishedRegime: row.published_regime,
    publishedRegimeTooltip: publishedRegimeTooltip(row),
    confidenceValue: fmtConfidence(row.confidence_score),
    confidenceBand: band,
    confidenceClass: confidenceChipClass(band),
    confidenceTooltip: confidenceTooltip(row),
    asOf: fmtDate(row.display_asof ?? row.as_of),
    asOfTooltip: asOfTooltip(row),
    lagValue: row.lag_days !== null ? `${row.lag_days}d` : "—",
    lagTooltip: lagTooltip(row),
    takeaway: rowTakeaway({
      status: row.status,
      publishedRegime: row.published_regime,
      confidenceScore: row.confidence_score,
    }),
  };
}

function formatDataLoad(value: string | null | undefined): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${formatter.format(date)} Oslo time`;
}

export default async function HomePage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  const [landingPayload, statusPayload, metaFallbackRows, historyDepthDays, landingHeroMap] =
    await Promise.all([
      readPublishedJson<LandingApiResponse>("data/published/v1/landing/index.json"),
      readPublishedJson<StatusApiResponse>("data/published/v1/status/index.json"),
      buildMetaFallbackRows(),
      computeHistoryDepthDays().catch(() => null),
      buildLandingHeroMap(),
    ]);

  const landingChains = extractLandingChains(landingPayload);
  const statusRows =
    Array.isArray(statusPayload?.chains) && statusPayload.chains.length > 0
      ? statusPayload.chains.map((row) => withLandingHero(row, landingHeroMap.get(row.chain)))
      : [];

  const landingFallbackRows: StatusApiRow[] = CHAIN_LIST.map((chain) => {
    const landing = landingChains.find((r) => r.chain === chain.id);
    const hero = landingHeroMap.get(chain.id);
    const displayAsOf = heroDisplayAsOf(hero);
    const asOf = displayAsOf ?? landing?.as_of ?? null;
    const lagDays =
      displayAsOf !== null
        ? lagDaysFromIsoDay(asOf ?? undefined)
        : landing?.lag_days ?? lagDaysFromIsoDay(asOf ?? undefined);

    return {
      chain: chain.id,
      name: landing?.name ?? chain.name,
      label: landing?.label ?? chain.label,
      as_of: asOf,
      display_asof: displayAsOf,
      regime_asof: heroRegimeAsOf(hero),
      lag_days: lagDays,
      status: classifyStatus({ chain: chain.id, lagDays, asOf }),
      published_regime: landing?.status_label ?? null,
      confidence_score: landing?.confidence_score ?? null,
      expected_delay_days: expectedDelayDays(chain.id),
    };
  });

  const normalizedMetaFallbackRows = metaFallbackRows.map((row) =>
    withLandingHero(row, landingHeroMap.get(row.chain)),
  );

  const rows =
    statusRows.length > 0
      ? statusRows
      : metaFallbackRows.some(
          (r) =>
            r.published_regime !== null ||
            r.confidence_score !== null ||
            r.as_of !== null ||
            r.lag_days !== null,
        )
      ? normalizedMetaFallbackRows
      : landingFallbackRows;

  const displayRows = rows.map(toSurfaceRowDisplay);
  const whatIsExplain = whatIsUrdAtlasExplanation();
  const boundaryExplain = interpretationBoundaryExplanation();

  const lastDataLoad =
    formatDataLoad(statusPayload?.generated_at_utc) ??
    formatDataLoad(dataset?.published_at ?? null);

  return (
    <>
      <MobileLanding rows={displayRows} historyDepthDays={historyDepthDays} />

      <main className="relative mx-auto hidden max-w-[1200px] overflow-hidden px-6 py-10 lg:block">
        <div
          className="pointer-events-none absolute right-0 top-0 -z-10 h-[600px] w-[800px]"
          style={{
            background:
              "radial-gradient(ellipse 800px 600px at 100% 0%, rgba(0,212,255,0.07), transparent)",
          }}
        />

        <ModalStyles />

        <Hero
          historyDepthDays={historyDepthDays}
          rows={displayRows}
          lastDataLoad={lastDataLoad}
        />

        <div id="plans" className="mt-12">
          <Plans historyDepthDays={historyDepthDays} />
        </div>

        <div className="mt-12">
          <UseCases />
        </div>

        <div className="mt-12">
          <ExploreGrid />
        </div>

        <ExplainModal
          id="what-is-modal"
          title="What Urd Atlas is"
          subtitle="A narrow product with a specific job: classify whether current on-chain change still looks like noise or has started to persist like a structural shift."
          pair={whatIsExplain}
        />

        <ExplainModal
          id="boundary-modal"
          title="Interpretation boundary"
          subtitle="Urd Atlas is intentionally descriptive. It explains current network state, but it does not tell you what to do."
          pair={boundaryExplain}
        />
      </main>
    </>
  );
}