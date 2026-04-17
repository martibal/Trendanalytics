import { notFound } from "next/navigation";
import Link from "next/link";
import { CHAINS, type ChainId } from "@/config/chains";
import { readStorageObject } from "@/lib/storage";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import MobileChainChart from "@/components/mobile/MobileChainChart";
import {
  parseMobileChainState,
  regimeColor,
  regimeBg,
  CHAIN_COLORS,
} from "@/lib/mobile/data";
import "server-only";

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
      `data/published/v1/meta/${chain}/last${window}d.json`
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

function ScoreBar({
  label,
  score,
  color,
  description,
}: {
  label: string;
  score: number | null;
  color: string;
  description: string;
}) {
  const pct = typeof score === "number" ? Math.max(0, Math.min(100, score)) : 50;
  const isAbove50 = pct > 50;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <div>
          <span className="text-[12px] font-bold text-white">{label}</span>
          <span className="ml-2 text-[10px] text-slate-500">{description}</span>
        </div>
        <span className="ml-2 shrink-0 text-[12px] font-bold text-white">
          {typeof score === "number" ? Math.round(score) : "—"}
          <span className="text-[10px] font-normal text-slate-500">/100</span>
        </span>
      </div>
      <div className="relative h-2.5 w-full rounded-full bg-white/10">
        <div className="absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25" />
        <div
          className="absolute top-0 h-2.5 rounded-full transition-all duration-700"
          style={{
            left: isAbove50 ? "50%" : `${pct}%`,
            width: `${Math.abs(pct - 50)}%`,
            backgroundColor: isAbove50 ? color : "#3B82F6",
          }}
        />
      </div>
      <div className="mt-0.5 flex justify-between">
        <span className="text-[9px] text-slate-600">Low</span>
        <span className="text-[9px] text-slate-600">Neutral (50)</span>
        <span className="text-[9px] text-slate-600">High</span>
      </div>
    </div>
  );
}

function TrendArrow({ trend }: { trend: string | null }) {
  if (trend === "HEATING") return <span className="font-bold text-amber-300">↑</span>;
  if (trend === "COOLING") return <span className="font-bold text-blue-300">↓</span>;
  return <span className="text-slate-500">→</span>;
}

const CHAIN_NAV_KEY: Record<ChainId, string> = {
  bitcoin: "btc",
  ethereum: "eth",
  arbitrum: "overview",
  base: "overview",
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

  const [meta, history] = await Promise.all([
    readPublishedJson<Record<string, unknown>>(
      `data/published/v1/meta/${chainId}/latest.json`
    ),
    buildHistoryRows(chainId),
  ]);

  const historyRows = history.rows;
  const state = parseMobileChainState(chainId, cfg.label, cfg.name, meta as never);
  const color = regimeColor(state.regimeLabel);
  const bg = regimeBg(state.regimeLabel);
  const chainColor = CHAIN_COLORS[chainId];

  const counts = historyRows.reduce<Record<string, number>>((acc, r) => {
    const k = r.label ?? "UNKNOWN/DEGRADED";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  const confidenceValues = historyRows
    .filter((r) => r.confidence != null)
    .map((r) => r.confidence as number);
  const avgConf =
    confidenceValues.length > 0
      ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
      : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0E1A]">
      <header
        className="sticky top-0 z-10 border-b border-white/8 px-4 pt-safe-top backdrop-blur-sm"
        style={{ background: bg }}
      >
        <div className="flex items-center gap-3 py-3">
          <Link href="/mobile" className="pr-1 text-lg text-slate-400">
            ←
          </Link>
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black"
            style={{ backgroundColor: `${chainColor}22`, color: chainColor }}
          >
            {cfg.label}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold text-white">{cfg.name}</div>
            <div className="text-[10px] text-slate-400">
              {state.asOf ?? "—"} · {state.lagDays != null ? `${state.lagDays}d lag` : "—"}
            </div>
          </div>
          <div
            className="shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-black tracking-wider"
            style={{ color, backgroundColor: `${color}22`, border: `1px solid ${color}44` }}
          >
            {state.regimeLabel ?? "—"}
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 py-4 pb-24">
        {cfg.subtitle && (
          <section className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              About {cfg.label}
            </div>
            <p className="text-[12px] leading-[1.7] text-slate-300">{cfg.subtitle}</p>
            {cfg.primer?.whatMakesItDifferent && (
              <p className="mt-2 text-[11px] leading-[1.65] text-slate-500">
                {cfg.primer.whatMakesItDifferent}
              </p>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">Current confidence</div>
              <div className="text-[32px] font-black leading-none text-white">
                {typeof state.confidenceScore === "number" ? state.confidenceScore.toFixed(3) : "—"}
              </div>
            </div>
            <div className="text-right">
              <div
                className="rounded-xl px-3 py-1.5 text-[11px] font-bold"
                style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}33` }}
              >
                {state.confidenceBand}
              </div>
              <div className="mt-1.5 text-[10px] text-slate-500">
                {state.confidenceBand === "Good" && "Strong evidence"}
                {state.confidenceBand === "Caution" && "Read with care"}
                {state.confidenceBand === "Degraded" && "Below publish gate"}
              </div>
            </div>
          </div>

          <div className="h-1.5 w-full rounded-full bg-white/10">
            <div
              className="h-1.5 rounded-full"
              style={{
                width: `${Math.round((state.confidenceScore ?? 0) * 100)}%`,
                backgroundColor: color,
              }}
            />
          </div>

          {state.oneLiner && (
            <p className="mt-3 text-[12px] leading-[1.65] text-slate-300">{state.oneLiner}</p>
          )}
        </section>

        <section className="space-y-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Scorecard — 0 to 100, 50 is neutral
          </div>
          <ScoreBar label="Demand" score={state.scorecard.demand?.score ?? null} color="#00FF88" description="Usage pressure" />
          <ScoreBar label="Friction" score={state.scorecard.friction?.score ?? null} color="#FF4444" description="Cost + failure" />
          <ScoreBar label="Capacity" score={state.scorecard.capacity?.score ?? null} color="#FF4444" description="Block fullness" />
          <p className="text-[10px] leading-[1.6] text-slate-600">
            Scores above 50 mean the axis looks more pressured than usual. Below 50 means softer than usual. Low confidence pulls scores toward 50.
          </p>
        </section>

        {state.drivers.length > 0 && (
          <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              Driver attribution — why this label
            </div>
            <div className="space-y-3">
              {state.drivers.map((d) => (
                <div key={d.metric} className="rounded-xl border border-white/6 bg-black/10 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-bold text-white">{d.metric}</div>
                      <div className="mt-0.5 text-[10px] text-slate-500">{d.axis}</div>
                    </div>
                    <TrendArrow trend={d.trend} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
                    {d.zRobust != null && <span>z {d.zRobust > 0 ? "+" : ""}{d.zRobust.toFixed(2)}</span>}
                    {d.pct90d != null && <span>{Math.round(d.pct90d)}th pct</span>}
                    {d.momentum != null && <span>mom {d.momentum > 0 ? "+" : ""}{d.momentum.toFixed(2)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              History
            </div>
            <div className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-[10px] font-bold text-cyan-300">
              {history.sourceWindow ? `${history.sourceWindow}d published view` : "No bundle"}
            </div>
          </div>

          <MobileChainChart rows={historyRows} chainColor={chainColor} />

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              {historyRows.length > 0
                ? `Showing ${historyRows.length} published rows${avgConf != null ? ` · avg confidence ${avgConf.toFixed(3)}` : ""}`
                : "No published history rows were found for this mobile chart."}
            </span>
          </div>
        </section>

        {historyRows.length > 0 && (
          <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              Label distribution
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(counts)
                .sort((a, b) => b[1] - a[1])
                .map(([label, count]) => {
                  const chipColor = regimeColor(label);
                  const pct = Math.round((count / historyRows.length) * 100);
                  return (
                    <span
                      key={label}
                      className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                      style={{
                        color: chipColor,
                        backgroundColor: `${chipColor}18`,
                        border: `1px solid ${chipColor}33`,
                      }}
                    >
                      {label.slice(0, 10)} · {count} ({pct}%)
                    </span>
                  );
                })}
            </div>
          </section>
        )}

        {state.determinismHash && (
          <div className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
            <div className="mb-1 text-[10px] text-slate-600">Determinism hash</div>
            <div className="break-all font-mono text-[11px] text-slate-400">
              {state.determinismHash}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 px-4 py-3 text-center">
          <div className="text-[11px] text-slate-400">Want JSON access for {cfg.label}?</div>
          <Link href="/mobile/plans" className="mt-1 inline-block text-[12px] font-semibold text-cyan-400">
            View mobile plans →
          </Link>
        </div>
      </main>

      <MobileBottomNav active={CHAIN_NAV_KEY[chainId]} />
    </div>
  );
}
