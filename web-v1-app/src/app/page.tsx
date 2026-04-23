import React, { type ReactNode } from "react";
import Link from "next/link";

import { CHAIN_LIST, type ChainId } from "@/config/chains";
import MobileLanding from "@/components/mobile/MobileLanding";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { computeHistoryDepthDays } from "@/lib/historyDepth";
import {
  confidenceBand,
  confidenceChipClass,
  fmtConfidence,
  fmtDate,
  rowTakeaway,
  statusChipClass,
  type SurfaceRowDisplay,
} from "@/lib/landingSurface";
import { readStorageObject } from "@/lib/storage";

import "server-only";

type LandingApiChain = {
  chain?: string;
  label?: string;
  name?: string;
  status_label?: string;
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
  status?: { label?: string };
  regime?: { asof_date?: string };
};

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
      const hero = await readPublishedJson<LandingHero>(`data/published/v1/landing/${chain.id}/hero.json`);
      return [chain.id, hero] as const;
    }),
  );

  return new Map(heroes);
}

function classifyStatus(params: {
  chain: ChainId;
  lagDays: number | null;
  asOf: string | null;
}): StatusApiRow["status"] {
  const { chain, lagDays, asOf } = params;
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
      const meta = await readPublishedJson<MetaLatest>(`data/published/v1/meta/${chain.id}/latest.json`);
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
    statusTooltip: "",
    publishedRegime: row.published_regime,
    publishedRegimeTooltip: "",
    confidenceValue: fmtConfidence(row.confidence_score),
    confidenceBand: band,
    confidenceClass: confidenceChipClass(band),
    confidenceTooltip: "",
    asOf: fmtDate(row.display_asof ?? row.as_of),
    asOfTooltip: "",
    lagValue: row.lag_days !== null ? `${row.lag_days}d` : "—",
    lagTooltip: "",
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

function shellClassName(extra?: string) {
  return `mx-auto w-full max-w-[1560px] px-8 sm:px-10 xl:px-14 2xl:px-20 ${extra ?? ""}`.trim();
}

function SectionShell(props: { children: ReactNode; className?: string }) {
  return <div className={shellClassName(props.className)}>{props.children}</div>;
}

const CHAIN_ICON_STYLES: Record<string, React.CSSProperties> = {
  bitcoin: {
    background: "linear-gradient(180deg, rgba(247,147,26,0.96), rgba(219,122,0,0.94))",
    borderColor: "rgba(247,147,26,0.2)",
  },
  ethereum: {
    background: "linear-gradient(180deg, rgba(93,102,130,0.9), rgba(63,72,98,0.94))",
    borderColor: "rgba(148,163,184,0.16)",
  },
  arbitrum: {
    background: "linear-gradient(180deg, rgba(60,87,123,0.94), rgba(34,56,88,0.96))",
    borderColor: "rgba(96,165,250,0.16)",
  },
  base: {
    background: "linear-gradient(180deg, rgba(244,246,252,0.95), rgba(228,232,241,0.95))",
    borderColor: "rgba(255,255,255,0.2)",
  },
};

const CHAIN_ABBR: Record<string, string> = {
  bitcoin: "₿",
  ethereum: "Ξ",
  arbitrum: "ARB",
  base: "—",
};

function ChainIcon({ chain, label }: { chain: string; label: string }) {
  const isBase = chain === "base";
  const style = CHAIN_ICON_STYLES[chain];
  const abbr = CHAIN_ABBR[chain] ?? label.slice(0, 3).toUpperCase();

  return (
    <span
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
        isBase ? "text-[#165DFF]" : "text-white"
      }`}
      style={style ?? { background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" }}
      aria-hidden="true"
    >
      {abbr}
    </span>
  );
}

function numericConfidence(row: SurfaceRowDisplay): number | null {
  const raw = Number.parseFloat(row.confidenceValue);
  if (!Number.isFinite(raw)) return null;
  return Math.max(0, Math.min(100, Math.round(raw * 100)));
}

function filledDotCount(score: number | null): number {
  if (score === null) return 0;
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  if (score > 0) return 1;
  return 0;
}

function regimeTextClass(regime: string | null | undefined): string {
  const value = (regime ?? "").toUpperCase();
  if (value === "STABLE") return "text-[#2F6BFF]";
  if (value === "CONGESTED") return "text-[#FF5D7A]";
  if (value === "HEATING") return "text-amber-300";
  if (value === "CHEAP") return "text-sky-300";
  return "text-slate-300";
}

function confidenceDotClass(regime: string | null | undefined, filled: boolean): string {
  if (!filled) return "bg-white/12";

  const value = (regime ?? "").toUpperCase();
  if (value === "STABLE") return "bg-[#2F6BFF]";
  if (value === "CONGESTED") return "bg-[#FF5D7A]";
  if (value === "HEATING") return "bg-amber-300";
  if (value === "CHEAP") return "bg-sky-300";
  return "bg-slate-300";
}

function ConfidenceDots(props: { regime: string | null | undefined; score: number | null }) {
  const filled = filledDotCount(props.score);

  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={`h-3 w-3 rounded-full ${confidenceDotClass(props.regime, index < filled)}`}
        />
      ))}
    </div>
  );
}

function FeatureIconDocument() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 3.5h6.5L18 8v12a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M13.5 3.5V8H18" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 12.5h6M9 16h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function FeatureIconDatabase() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="5.5" rx="6.5" ry="2.75" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 5.5v6c0 1.52 2.91 2.75 6.5 2.75s6.5-1.23 6.5-2.75v-6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 11.5v6c0 1.52 2.91 2.75 6.5 2.75s6.5-1.23 6.5-2.75v-6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function FeatureIconTarget() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function FeatureItem(props: {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={`grid min-w-0 grid-cols-[48px_minmax(0,1fr)] items-start gap-5 ${props.className ?? ""}`}>
      <span className="mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#2F6BFF]/18 text-[#2F6BFF]">
        {props.icon}
      </span>
      <div className="min-w-0">
        <div className="text-[28px] font-medium tracking-[-0.03em] text-white">{props.title}</div>
        <p className="mt-3 max-w-[320px] text-[17px] leading-8 text-slate-400">{props.description}</p>
      </div>
    </div>
  );
}

function LayerBlock(props: {
  title: string;
  subtitle: string;
  titleClassName?: string;
  className?: string;
}) {
  return (
    <div className={`min-w-0 py-4 ${props.className ?? ""}`}>
      <div className={`text-[78px] font-semibold leading-[0.94] tracking-[-0.06em] ${props.titleClassName ?? "text-white"}`}>
        {props.title}
      </div>
      <div className="mt-4 text-[19px] leading-8 text-slate-400">{props.subtitle}</div>
    </div>
  );
}

function PricingCard(props: {
  plan: string;
  price: string;
  note: string;
  href: string;
  cta: string;
  badge?: string;
}) {
  return (
    <div className="flex min-h-[260px] flex-col rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(10,16,28,0.95),rgba(6,10,20,0.98))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
      <div className="flex min-h-[34px] items-start justify-between gap-3">
        <div className="text-[28px] font-medium tracking-[-0.03em] text-white">{props.plan}</div>
        {props.badge ? (
          <span className="rounded-full bg-[#2F6BFF] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
            {props.badge}
          </span>
        ) : null}
      </div>

      <div className="mt-8 flex items-end gap-2">
        <span className="text-[84px] font-semibold leading-none tracking-[-0.08em] text-white">{props.price}</span>
        {props.price !== "Custom" ? <span className="pb-3 text-[26px] text-slate-400">/mo</span> : null}
      </div>

      <p className="mt-5 max-w-[260px] text-[19px] leading-8 text-slate-400">{props.note}</p>

      <Link
        href={props.href}
        className="mt-auto inline-flex h-14 items-center rounded-full border border-white/10 px-6 text-[16px] font-medium text-white transition hover:border-white/18 hover:bg-white/[0.04]"
      >
        {props.cta}
      </Link>
    </div>
  );
}

function LiveStatePanel(props: { rows: SurfaceRowDisplay[]; updatedLabel: string }) {
  const topRows = props.rows.slice(0, 4);

  return (
    <div className="relative rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,17,30,0.94),rgba(8,12,22,0.98))] p-7 shadow-[0_36px_120px_rgba(0,0,0,0.24)] backdrop-blur-md xl:p-8">
      <div className="mb-6 flex items-center gap-4 text-[17px] text-slate-400">
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-full bg-[#2F6BFF]" />
          <span className="font-medium uppercase tracking-[0.22em] text-[#2F6BFF]">Live</span>
        </div>
        <span>{props.updatedLabel}</span>
      </div>

      <div className="overflow-hidden rounded-[26px] border border-white/8 bg-black/10">
        {topRows.map((row, index) => {
          const score = numericConfidence(row);
          const regime = (row.publishedRegime ?? "UNKNOWN").toUpperCase();

          return (
            <Link
              key={row.chain}
              href={row.href}
              className={`grid items-center gap-5 px-6 py-5 transition hover:bg-white/[0.025] ${
                index < topRows.length - 1 ? "border-b border-white/8" : ""
              } grid-cols-[minmax(0,1.45fr)_auto_minmax(110px,auto)]`}
            >
              <div className="flex min-w-0 items-center gap-4">
                <ChainIcon chain={row.chain} label={row.label} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-[28px] font-medium tracking-[-0.04em] text-white">{row.label}</span>
                    <span className={`text-[20px] font-medium tracking-[-0.02em] ${regimeTextClass(regime)}`}>
                      {regime}
                    </span>
                  </div>
                  <div className="mt-1 text-[16px] text-slate-500">{row.name}</div>
                </div>
              </div>

              <ConfidenceDots regime={regime} score={score} />

              <div className="text-right">
                <div className="text-[34px] font-medium tracking-[-0.05em] text-white">
                  {score !== null ? `${score}%` : "—"}
                </div>
                <div className="mt-1 text-[15px] text-slate-500">{row.asOf}</div>
              </div>
            </Link>
          );
        })}

        <div className="grid grid-cols-3 gap-4 border-t border-white/8 px-6 py-4 text-[12px] font-medium uppercase tracking-[0.22em] text-slate-500">
          <div>Network</div>
          <div className="text-center">Regime</div>
          <div className="text-right">Confidence</div>
        </div>
      </div>
    </div>
  );
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
    const landing = landingChains.find((row) => row.chain === chain.id);
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
          (row) =>
            row.published_regime !== null ||
            row.confidence_score !== null ||
            row.as_of !== null ||
            row.lag_days !== null,
        )
      ? normalizedMetaFallbackRows
      : landingFallbackRows;

  const displayRows = rows.map(toSurfaceRowDisplay);
  const publishedDays =
    typeof historyDepthDays === "number" && Number.isFinite(historyDepthDays)
      ? historyDepthDays.toLocaleString("en-GB")
      : "—";
  const lastDataLoad =
    formatDataLoad(statusPayload?.generated_at_utc) ?? formatDataLoad(dataset?.published_at ?? null) ?? "Updated daily";

  return (
    <>
      <MobileLanding rows={displayRows} historyDepthDays={historyDepthDays} lastUpdatedLabel={lastDataLoad} />

      <div className="hidden bg-[#04070d] text-white lg:block">
        <div className="relative overflow-hidden border-b border-white/6 bg-[radial-gradient(circle_at_20%_12%,rgba(39,96,255,0.12),transparent_28%),radial-gradient(circle_at_82%_14%,rgba(39,96,255,0.08),transparent_30%),linear-gradient(180deg,#050912_0%,#03060d_100%)]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.22] [background:linear-gradient(90deg,transparent_0%,rgba(43,90,255,0.08)_50%,transparent_100%)]" />
          <div className="pointer-events-none absolute inset-y-0 left-[29%] w-px bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.05),transparent)]" />

          <SectionShell className="relative py-20 xl:py-24 2xl:py-28">
            <div className="grid items-start gap-16 xl:grid-cols-[minmax(0,0.96fr)_minmax(640px,0.9fr)] xl:gap-20">
              <div className="max-w-[760px] pt-6 xl:pt-10">
                <h1 className="max-w-[780px] text-[6.15rem] font-medium leading-[0.92] tracking-[-0.08em] text-white xl:text-[6.75rem] 2xl:text-[7.45rem]">
                  Separate
                  <br />
                  blockchain noise
                  <br />
                  from <span className="text-[#2F6BFF]">structural</span>
                  <br />
                  <span className="text-[#2F6BFF]">change.</span>
                </h1>

                <p className="mt-10 max-w-[560px] text-[22px] leading-[1.8] text-slate-300">
                  Daily JSON for BTC, ETH, ARB, and BASE — with regime, confidence, and drivers.
                </p>

                <div className="mt-12 flex flex-wrap gap-5">
                  <Link
                    href="/status"
                    className="inline-flex h-16 items-center rounded-full bg-[#2F6BFF] px-8 text-[17px] font-medium text-white transition hover:bg-[#2458d9]"
                  >
                    See the product →
                  </Link>
                  <Link
                    href="/api-docs/schema"
                    className="inline-flex h-16 items-center rounded-full border border-white/12 px-8 text-[17px] font-medium text-white transition hover:border-white/18 hover:bg-white/[0.04]"
                  >
                    View schema →
                  </Link>
                </div>
              </div>

              <div className="relative pt-8 xl:pt-10">
                <div className="pointer-events-none absolute -left-12 top-24 h-[380px] w-[720px] rounded-[999px] bg-[radial-gradient(ellipse_at_center,rgba(24,76,255,0.18),rgba(8,18,36,0)_72%)] blur-3xl" />
                <LiveStatePanel rows={displayRows} updatedLabel={lastDataLoad} />
              </div>
            </div>
          </SectionShell>
        </div>

        <section className="border-b border-white/6 bg-[#04070d]">
          <SectionShell className="py-16 xl:py-20">
            <div className="grid gap-10 xl:grid-cols-3 xl:gap-12">
              <FeatureItem
                icon={<FeatureIconDocument />}
                title="Daily JSON"
                description="Structured, consistent data published for direct consumption."
                className="xl:border-r xl:border-white/8 xl:pr-12"
              />
              <FeatureItem
                icon={<FeatureIconDatabase />}
                title="Inspectable archive"
                description={`Historical data you can query and verify across ${publishedDays} published days.`}
                className="xl:border-r xl:border-white/8 xl:px-12"
              />
              <FeatureItem
                icon={<FeatureIconTarget />}
                title="Confidence-aware classification"
                description="Regimes and signals paired with confidence, lag, and traceable context."
                className="xl:pl-12"
              />
            </div>
          </SectionShell>
        </section>

        <section className="border-b border-white/6 bg-[#04070d]">
          <SectionShell className="py-16 xl:py-20">
            <div className="grid gap-10 xl:grid-cols-3 xl:gap-12">
              <LayerBlock
                title="Gold."
                subtitle="Raw on-chain facts."
                className="xl:border-r xl:border-white/8 xl:pr-12"
              />
              <LayerBlock
                title="Meta."
                subtitle="Urd Atlas core."
                titleClassName="text-[#2F6BFF]"
                className="xl:border-r xl:border-white/8 xl:px-12"
              />
              <LayerBlock
                title="Derived."
                subtitle="Signals that compound."
                className="xl:pl-12"
              />
            </div>
          </SectionShell>
        </section>

        <section className="bg-[#04070d]">
          <SectionShell className="py-16 xl:py-20 2xl:pb-24">
            <div className="grid gap-8 xl:grid-cols-3 xl:gap-10">
              <PricingCard
                plan="Free"
                price="$0"
                note="Explore daily JSON and inspect the public surface before subscribing."
                href="/status"
                cta="Browse public surface"
              />
              <PricingCard
                plan="Basic"
                price="$29"
                note="Access the Meta layer for one chain with a calmer research workflow and API delivery."
                href="/dashboard"
                cta="Start Basic"
                badge="Most popular"
              />
              <PricingCard
                plan="Pro"
                price="$79"
                note="Full multi-chain access for serious builders who want broader coverage and longer history."
                href="/dashboard"
                cta="Start Pro"
              />
            </div>
          </SectionShell>
        </section>
      </div>
    </>
  );
}