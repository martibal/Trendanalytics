import Link from "next/link";
import { notFound } from "next/navigation";

import MobileChainChart from "@/components/mobile/MobileChainChart";
import {
  MobileCard,
  MobileMetric,
  MobilePage,
  MobilePill,
  MobileSection,
} from "@/components/mobile/MobileShell";
import { CHAINS, type ChainId } from "@/config/chains";
import {
  CHAIN_COLORS,
  parseMobileChainState,
  regimeColor,
} from "@/lib/mobile/data";
import { readStorageObject } from "@/lib/storage";

import "server-only";

type MetaHistoryRow = {
  date?: string;
  status?: { label?: string; one_liner?: string };
  regime?: { label?: string; determinism_hash?: string };
  confidence?: { confidence_score?: number };
};

type HistoryBundle =
  | MetaHistoryRow[]
  | {
      rows?: MetaHistoryRow[];
      items?: MetaHistoryRow[];
      data?: MetaHistoryRow[];
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

function extractHistoryRows(bundle: HistoryBundle | null): MetaHistoryRow[] {
  if (!bundle) return [];
  if (Array.isArray(bundle)) return bundle;
  if (Array.isArray(bundle.rows)) return bundle.rows;
  if (Array.isArray(bundle.items)) return bundle.items;
  if (Array.isArray(bundle.data)) return bundle.data;
  return [];
}

async function buildHistoryRows(chain: ChainId) {
  const candidateWindows = [30, 90, 365] as const;

  for (const window of candidateWindows) {
    const bundle = await readPublishedJson<HistoryBundle>(
      `data/published/v1/meta/${chain}/last${window}d.json`,
    );
    const rows = extractHistoryRows(bundle)
      .filter((r) => typeof r.date === "string")
      .map((r) => ({
        date: r.date!,
        label: r.status?.label ?? r.regime?.label ?? null,
        confidence:
          typeof r.confidence?.confidence_score === "number"
            ? r.confidence.confidence_score
            : null,
        oneLiner: r.status?.one_liner ?? null,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (rows.length > 0) {
      return { rows, sourceWindow: window };
    }
  }

  return {
    rows: [] as Array<{
      date: string;
      label: string | null;
      confidence: number | null;
      oneLiner: string | null;
    }>,
    sourceWindow: null as 30 | 90 | 365 | null,
  };
}

function formatAxisLevel(value?: string | null): string {
  if (!value) return "—";
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function confidenceText(score: number | null): string {
  return typeof score === "number" ? score.toFixed(3) : "—";
}

function TrendArrow({ trend }: { trend: string | null }) {
  if (trend === "HEATING") return <span className="font-black text-amber-200">↑</span>;
  if (trend === "COOLING") return <span className="font-black text-sky-200">↓</span>;
  return <span className="text-slate-400">→</span>;
}

const CHAIN_NAV_KEY: Record<ChainId, string> = {
  bitcoin: "btc",
  ethereum: "eth",
  arbitrum: "arb",
  base: "base",
};

export default async function MobileChainPage({
  params,
}: {
  params: Promise<{ chain: string }>;
}) {
  const resolvedParams = await params;
  const chainId = resolvedParams.chain as ChainId;
  const cfg = CHAINS[chainId];

  if (!cfg) notFound();

  const [meta, brief, history] = await Promise.all([
    readPublishedJson<Record<string, unknown>>(`data/published/v1/meta/${chainId}/latest.json`),
    readPublishedJson<BriefJson>(`data/published/v1/briefs/chains/${chainId}/latest.json`),
    buildHistoryRows(chainId),
  ]);

  const state = parseMobileChainState(chainId, cfg.label, cfg.name, meta as never);
  const historyRows = history.rows;
  const color = regimeColor(state.regimeLabel);
  const chainColor = CHAIN_COLORS[chainId];

  const confidenceValues = historyRows
    .filter((r) => r.confidence != null)
    .map((r) => r.confidence as number);
  const avgConf =
    confidenceValues.length > 0
      ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
      : null;

  const dominantBrief = brief?.regime_path?.dominant_label ?? brief?.regime_path?.latest_label ?? state.regimeLabel ?? "—";
  const briefConfidence =
    typeof brief?.confidence?.latest === "number"
      ? brief.confidence.latest
      : typeof brief?.confidence?.average === "number"
        ? brief.confidence.average
        : typeof brief?.confidence?.confidence_score === "number"
          ? brief.confidence.confidence_score
          : state.confidenceScore;

  return (
    <MobilePage
      active={CHAIN_NAV_KEY[chainId]}
      eyebrow={`${cfg.label} mobile chain page`}
      title={<>{cfg.name}: latest status, Brief and chain context.</>}
      subtitle={cfg.subtitle}
      backHref="/mobile"
    >
      <MobileSection>
        <MobileCard className="p-0">
          <div className="flex items-center gap-3 border-b border-white/8 p-4">
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-[18px] font-black text-white"
              style={{ backgroundColor: chainColor }}
            >
              {cfg.label}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c49230]">
                Latest Meta state
              </div>
              <div className="mt-1 text-[18px] font-black text-white">{state.regimeLabel ?? "—"}</div>
              <div className="mt-0.5 text-[11px] text-[#9eb4cf]">
                {state.asOf ?? "—"} {state.lagDays != null ? `· ${state.lagDays}d lag` : ""}
              </div>
            </div>
            <MobilePill tone={state.confidenceBand === "Good" ? "green" : state.confidenceBand === "Degraded" ? "red" : "gold"}>
              {state.confidenceBand}
            </MobilePill>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-2 gap-2">
              <MobileMetric label="Confidence v2" value={confidenceText(state.confidenceScore)} />
              <MobileMetric label="Determinism" value={state.determinismHash ? state.determinismHash.slice(0, 8) : "—"} />
            </div>

            {state.oneLiner ? (
              <p className="mt-4 text-[13px] leading-6 text-[#d7e8fb]">{state.oneLiner}</p>
            ) : null}
          </div>
        </MobileCard>
      </MobileSection>

      <MobileSection eyebrow="Latest Brief" title="Readable summary from the same Meta evidence.">
        <MobileCard tone="gold">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-[17px] font-black leading-[1.12] tracking-[-0.04em] text-white">
              {brief?.brief?.headline ?? brief?.headline ?? `${cfg.label} Brief`}
            </h2>
            <MobilePill tone="gold">{dominantBrief}</MobilePill>
          </div>
          <p className="mt-3 text-[12px] leading-6 text-[#f2dfbd]">
            {brief?.brief?.plain ?? brief?.plain ?? "Brief data was not found for this chain."}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <MobileMetric label="Brief confidence" value={confidenceText(briefConfidence ?? null)} />
            <MobileMetric label="Updated through" value={brief?.window?.updated_through ?? brief?.window?.end ?? state.asOf ?? "—"} />
          </div>
        </MobileCard>
      </MobileSection>

      <MobileSection eyebrow="Chain profile" title={`Why ${cfg.label} behaves differently.`}>
        <MobileCard>
          <p className="text-[13px] leading-6 text-[#d7e8fb]">
            {cfg.primer?.whatMakesItDifferent ?? cfg.note ?? cfg.subtitle}
          </p>
          {cfg.primer?.whyUsersCare ? (
            <p className="mt-3 text-[12px] leading-6 text-[#9eb4cf]">{cfg.primer.whyUsersCare}</p>
          ) : null}

          {cfg.primer?.primaryDrivers?.length ? (
            <div className="mt-4 space-y-2">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c49230]">
                What to watch
              </div>
              {cfg.primer.primaryDrivers.map((driver) => (
                <div key={driver} className="rounded-2xl border border-white/10 bg-black/[0.12] px-3 py-2 text-[12px] leading-5 text-[#cfe0f4]">
                  {driver}
                </div>
              ))}
            </div>
          ) : null}
        </MobileCard>
      </MobileSection>

      <MobileSection eyebrow="Scorecard" title="Demand, friction and capacity.">
        <MobileCard>
          <div className="grid grid-cols-3 gap-2">
            <MobileMetric label="Demand" value={formatAxisLevel(state.scorecard.demand?.level)} sub={state.scorecard.demand?.score != null ? `${Math.round(state.scorecard.demand.score)}/100` : "—"} />
            <MobileMetric label="Friction" value={formatAxisLevel(state.scorecard.friction?.level)} sub={state.scorecard.friction?.score != null ? `${Math.round(state.scorecard.friction.score)}/100` : "—"} />
            <MobileMetric label="Capacity" value={formatAxisLevel(state.scorecard.capacity?.level)} sub={state.scorecard.capacity?.score != null ? `${Math.round(state.scorecard.capacity.score)}/100` : "—"} />
          </div>
          <p className="mt-4 text-[11px] leading-5 text-[#9eb4cf]">
            Scores are chain-relative. 50 is neutral. Low confidence pulls display
            scores toward 50; Confidence v2 itself is published separately.
          </p>
        </MobileCard>
      </MobileSection>

      {state.drivers.length > 0 ? (
        <MobileSection eyebrow="Drivers" title="Why this label was supported.">
          <div className="space-y-2">
            {state.drivers.map((driver) => (
              <MobileCard key={`${driver.axis}-${driver.metric}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-black text-white">{driver.metric}</div>
                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#91a9c4]">
                      {driver.axis}
                    </div>
                  </div>
                  <TrendArrow trend={driver.trend} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-[#cfe0f4]">
                  {driver.zRobust != null ? <span>z {driver.zRobust > 0 ? "+" : ""}{driver.zRobust.toFixed(2)}</span> : null}
                  {driver.pct90d != null ? <span>{Math.round(driver.pct90d)}th pct</span> : null}
                  {driver.momentum != null ? <span>mom {driver.momentum > 0 ? "+" : ""}{driver.momentum.toFixed(2)}</span> : null}
                </div>
              </MobileCard>
            ))}
          </div>
        </MobileSection>
      ) : null}

      <MobileSection eyebrow="History" title="Recent published label path.">
        <MobileCard>
          <div className="mb-3 flex items-center justify-between gap-3">
            <MobilePill tone="blue">{history.sourceWindow ? `${history.sourceWindow}d` : "No bundle"}</MobilePill>
            <div className="text-[11px] font-semibold text-[#9eb4cf]">
              {avgConf != null ? `avg confidence ${avgConf.toFixed(3)}` : "avg confidence —"}
            </div>
          </div>

          <MobileChainChart rows={historyRows} chainColor={chainColor} />

          <p className="mt-3 text-[11px] leading-5 text-[#9eb4cf]">
            Showing {historyRows.length} published rows from the first available mobile bundle.
          </p>
        </MobileCard>
      </MobileSection>

      <MobileSection eyebrow="Mobile links" title="Continue without leaving mobile.">
        <div className="grid gap-2">
          <Link href="/mobile/api-docs" className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 text-[13px] font-black text-white">
            JSON / API reference →
          </Link>
          <Link href="/mobile/methodology" className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 text-[13px] font-black text-white">
            Methodology →
          </Link>
          <Link href="/mobile/plans" className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 text-[13px] font-black text-white">
            Plans →
          </Link>
        </div>
      </MobileSection>
    </MobilePage>
  );
}
