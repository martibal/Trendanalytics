// src/app/mobile/page.tsx
import Link from "next/link";
import type { ReactNode } from "react";

import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readDatasetManifest } from "@/lib/dataset";
import { computeHistoryDepthDays } from "@/lib/historyDepth";
import {
  CHAIN_COLORS,
  mobileFreshness,
  parseMobileChainState,
  regimeColor,
  type MobileChainState,
} from "@/lib/mobile/data";
import { readStorageObject } from "@/lib/storage";
import {
  MobileCard,
  MobileMetric,
  MobilePage,
  MobilePill,
  MobilePrimaryLink,
  MobileSection,
} from "@/components/mobile/MobileShell";

import "server-only";

type LandingHero = {
  display_asof?: string;
  asof?: {
    display?: string;
    latest_available?: string;
    gold?: string;
    derived?: string;
    meta?: string;
  };
};

type BriefJson = {
  brief?: {
    headline?: string;
    plain?: string;
  };
  headline?: string;
  plain?: string;
  window?: {
    updated_through?: string;
    start?: string;
    end?: string;
  };
  confidence?: {
    average?: number;
    latest?: number;
    confidence_score?: number;
  };
  regime_path?: {
    dominant_label?: string;
    latest_label?: string;
    changes?: number;
    latest_run_days?: number;
  };
};

type MobileBriefState = {
  chain: ChainId;
  label: string;
  headline: string;
  plain: string;
  dominant: string;
  confidence: number | null;
  updatedThrough: string | null;
};

const CHAIN_SYMBOLS: Record<ChainId, string> = {
  bitcoin: "₿",
  ethereum: "Ξ",
  arbitrum: "A",
  base: "B",
};

function arrayBufferToUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

async function readPublishedJson<T>(path: string): Promise<T | null> {
  const result = await readStorageObject(path);
  if (!result) return null;

  try {
    return JSON.parse(arrayBufferToUtf8(result.body)) as T;
  } catch {
    return null;
  }
}

function heroDisplayAsOf(hero?: LandingHero | null): string | null {
  return (
    hero?.display_asof ??
    hero?.asof?.display ??
    hero?.asof?.latest_available ??
    null
  );
}

function lagDaysFromIsoDay(date?: string | null): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const [y, m, d] = date.split("-").map(Number);
  const asOfMs = Date.UTC(y, m - 1, d);
  const now = new Date();
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diff = todayMs - asOfMs;

  return diff >= 0 ? Math.floor(diff / 86400000) : null;
}

async function buildChainStates(): Promise<MobileChainState[]> {
  return Promise.all(
    CHAIN_LIST.map(async (chain) => {
      const [meta, hero] = await Promise.all([
        readPublishedJson<Record<string, unknown>>(`data/published/v1/meta/${chain.id}/latest.json`),
        readPublishedJson<LandingHero>(`data/published/v1/landing/${chain.id}/hero.json`),
      ]);

      const parsed = parseMobileChainState(chain.id, chain.label, chain.name, meta as never);
      const displayAsOf = heroDisplayAsOf(hero);

      if (!displayAsOf) return parsed;

      const lagDays = lagDaysFromIsoDay(displayAsOf);
      return {
        ...parsed,
        asOf: displayAsOf,
        lagDays,
        freshnessStatus: mobileFreshness(chain.id as ChainId, lagDays),
      };
    }),
  );
}

async function buildBriefs(): Promise<MobileBriefState[]> {
  return Promise.all(
    CHAIN_LIST.map(async (chain) => {
      const brief = await readPublishedJson<BriefJson>(`data/published/v1/briefs/chains/${chain.id}/latest.json`);
      const confidence =
        typeof brief?.confidence?.latest === "number"
          ? brief.confidence.latest
          : typeof brief?.confidence?.average === "number"
            ? brief.confidence.average
            : typeof brief?.confidence?.confidence_score === "number"
              ? brief.confidence.confidence_score
              : null;

      return {
        chain: chain.id,
        label: chain.label,
        headline:
          brief?.brief?.headline ??
          brief?.headline ??
          `${chain.label} Brief is published from the latest Meta context.`,
        plain:
          brief?.brief?.plain ??
          brief?.plain ??
          "Open the chain page to inspect the latest regime, confidence, drivers, and traceability.",
        dominant: brief?.regime_path?.dominant_label ?? brief?.regime_path?.latest_label ?? "—",
        confidence,
        updatedThrough: brief?.window?.updated_through ?? brief?.window?.end ?? null,
      };
    }),
  );
}

function formatPublishedDate(publishedAt?: string | null): string | null {
  if (!publishedAt) return null;

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Oslo",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(publishedAt));
}

function formatAxisLevel(value?: string | null): string {
  if (!value) return "—";

  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function confidenceText(score: number | null): string {
  return typeof score === "number" ? score.toFixed(3) : "—";
}

function ChainCard({ state }: { state: MobileChainState }) {
  const label = state.regimeLabel ?? "UNKNOWN/DEGRADED";
  const color = regimeColor(label);
  const chainColor = CHAIN_COLORS[state.chain];
  const demand = formatAxisLevel(state.scorecard?.demand?.level);
  const friction = formatAxisLevel(state.scorecard?.friction?.level);
  const capacity = formatAxisLevel(state.scorecard?.capacity?.level);

  return (
    <Link href={`/mobile/chain/${state.chain}`} className="block no-underline">
      <MobileCard className="p-0">
        <div className="flex items-center gap-3 border-b border-white/8 p-4">
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[22px] font-black text-white shadow-[0_16px_38px_rgba(0,0,0,0.22)]"
            style={{ backgroundColor: chainColor }}
          >
            {CHAIN_SYMBOLS[state.chain]}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-black text-white">{state.name}</div>
            <div className="mt-0.5 text-[11px] font-semibold text-[#9eb4cf]">
              {state.asOf ?? "—"}
              {state.lagDays != null ? ` · ${state.lagDays}d lag` : ""}
            </div>
          </div>

          <span
            className="rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em]"
            style={{ color, borderColor: `${color}55`, backgroundColor: `${color}18` }}
          >
            {label === "UNKNOWN/DEGRADED" ? "UNKNOWN" : label}
          </span>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#91a9c4]">
              Confidence v2
            </span>
            <strong className="text-[14px] font-black" style={{ color }}>
              {confidenceText(state.confidenceScore)}
            </strong>
          </div>

          <p className="mt-3 text-[12px] leading-5 text-[#d7e8fb]">
            {state.oneLiner ?? `Demand ${demand}; Friction ${friction}; Capacity ${capacity}.`}
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <MobileMetric label="Demand" value={demand} />
            <MobileMetric label="Friction" value={friction} />
            <MobileMetric label="Capacity" value={capacity} />
          </div>
        </div>
      </MobileCard>
    </Link>
  );
}

function BriefCard({ brief }: { brief: MobileBriefState }) {
  return (
    <MobileCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c49230]">
            {brief.label} Brief
          </div>
          <h3 className="mt-2 text-[17px] font-black leading-[1.12] tracking-[-0.04em] text-white">
            {brief.headline}
          </h3>
        </div>
        <MobilePill tone="gold">{brief.dominant}</MobilePill>
      </div>
      <p className="mt-3 text-[12px] leading-6 text-[#d7e8fb]">{brief.plain}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <MobileMetric label="Confidence" value={confidenceText(brief.confidence)} />
        <MobileMetric label="Updated through" value={brief.updatedThrough ?? "—"} />
      </div>
    </MobileCard>
  );
}

function ProcessStep({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <MobileCard className="p-4">
      <div className="flex gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#c49230]/32 bg-[#c49230]/12 text-[10px] font-black text-[#f5d386]">
          {n}
        </div>
        <div>
          <div className="text-[13px] font-black text-white">{title}</div>
          <div className="mt-1 text-[12px] leading-6 text-[#cfe0f4]">{children}</div>
        </div>
      </div>
    </MobileCard>
  );
}

function ProductExplanation() {
  return (
    <MobileCard tone="gold">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f5d386]">
        What the product is
      </div>
      <p className="mt-3 text-[13px] font-semibold leading-6 text-[#eef7ff]">
        Urd Atlas takes public raw blockchain datasets from AWS, ingests them into
        a daily pipeline, and computes descriptive network-state reference data.
      </p>
      <p className="mt-3 text-[12px] leading-6 text-[#cfe0f4]">
        The output is published JSON: <strong>Gold</strong> for measurements,{" "}
        <strong>Derived</strong> for trend context, <strong>Meta</strong> for regime
        and confidence, and <strong>Briefs</strong> for readable summaries. You can read
        the files directly for network interpretation or join them into your own
        existing pipeline by chain and date.
      </p>
    </MobileCard>
  );
}

export default async function MobileOverviewPage() {
  const [states, briefs, dataset, historyDays] = await Promise.all([
    buildChainStates(),
    buildBriefs(),
    readDatasetManifest(),
    computeHistoryDepthDays(),
  ]);

  const publishedAt = formatPublishedDate(dataset?.published_at);

  return (
    <MobilePage
      active="overview"
      eyebrow="Urd Atlas"
      title={<>Daily network-state JSON for BTC, ETH, ARB and BASE.</>}
      subtitle={
        <>
          Published reference data for interpreting blockchain network conditions.
          No price data, no forecasts, no recommendations.
        </>
      }
      showTopMenu={false}
      actions={
        <div className="grid grid-cols-2 gap-2">
          <MobilePrimaryLink href="#product">What it is</MobilePrimaryLink>
          <Link
            href="#states"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/14 bg-white/[0.075] px-4 text-[13px] font-black text-white active:scale-[0.99]"
          >
            Latest states
          </Link>
        </div>
      }
    >
      <MobileSection>
        <div className="grid grid-cols-3 gap-2">
          <MobileMetric label="Updated" value={publishedAt ?? "—"} />
          <MobileMetric label="History" value={historyDays ?? "—"} />
          <MobileMetric label="Chains" value="4" />
        </div>
      </MobileSection>

      <MobileSection id="product">
        <ProductExplanation />
      </MobileSection>

      <MobileSection id="states" eyebrow="Latest states" title="One current regime per chain.">
        <div className="space-y-3">
          {states.map((state) => (
            <ChainCard key={state.chain} state={state} />
          ))}
        </div>
      </MobileSection>

      <MobileSection id="briefs" eyebrow="Briefs" title="Readable context from the same Meta evidence.">
        <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-semibold text-[#9eb4cf]">
          <span>Swipe sideways to read all chains.</span>
          <span className="text-[#f5d386]">BTC · ETH · ARB · BASE →</span>
        </div>
        <div className="flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {briefs.map((brief) => (
            <div key={brief.chain} className="min-w-[86%] snap-center">
              <BriefCard brief={brief} />
            </div>
          ))}
        </div>
      </MobileSection>

      <MobileSection eyebrow="How it works" title="From AWS raw data to published files.">
        <div className="space-y-3">
          <ProcessStep n="01" title="Ingest public raw data">
            Public blockchain datasets are read into the internal pipeline. Raw source
            rows are not redistributed.
          </ProcessStep>
          <ProcessStep n="02" title="Compute daily network features">
            The pipeline aggregates activity, fee pressure, block timing, utilization,
            and other chain-specific evidence into daily measurements.
          </ProcessStep>
          <ProcessStep n="03" title="Publish JSON layers">
            Gold records measurements, Derived adds trend context, Meta publishes regime
            and confidence, and Briefs summarize the latest state for direct reading.
          </ProcessStep>
          <ProcessStep n="04" title="Use it directly or join it">
            Read the JSON as a standalone network-state product, or join it to your own
            data on <strong>chain + date</strong> as an external regime/context layer.
          </ProcessStep>
        </div>
      </MobileSection>

      <MobileSection eyebrow="Trust model" title="Confidence v2 is visible, not hidden.">
        <MobileCard tone="blue">
          <p className="text-[12px] leading-6 text-[#d7e8fb]">
            Confidence combines two checks: whether the relevant data for this chain is
            complete enough, and whether the evidence clearly supports the specific label.
          </p>
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/[0.16] p-3">
            <code className="block text-center font-mono text-[12px] text-[#f5d386]">
              sqrt(data_quality_score × label_confidence_score)
            </code>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-[#9eb4cf]">
            Bitcoin is not penalized for Ethereum-only fields. L2 freshness is judged
            against L2 policy. Weak evidence can still publish UNKNOWN/DEGRADED.
          </p>
        </MobileCard>
      </MobileSection>

      <MobileSection eyebrow="Continue" title="Go deeper when you need it.">
        <div className="grid gap-2">
          <Link href="/mobile/api-docs" className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 text-[13px] font-black text-white">
            JSON / API reference →
          </Link>
          <Link href="/mobile/methodology" className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 text-[13px] font-black text-white">
            Methodology →
          </Link>
          <Link href="/mobile/track-record" className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 text-[13px] font-black text-white">
            Track record →
          </Link>
          <Link href="/mobile/plans" className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 text-[13px] font-black text-white">
            Plans →
          </Link>
        </div>
      </MobileSection>

      <MobileSection>
        <div className="rounded-2xl border border-white/10 bg-black/[0.10] px-4 py-3 text-center text-[11px] leading-5 text-[#9eb4cf]">
          Simplified mobile view. For the full desktop experience, open{" "}
          <Link href="/" className="font-black text-[#f5d386] underline decoration-[#c49230]/35 underline-offset-4">
            urdatlas.com
          </Link>{" "}
          on a larger screen.
        </div>
      </MobileSection>
    </MobilePage>
  );
}
