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
  try { return JSON.parse(arrayBufferToUtf8(result.body)) as T; }
  catch { return null; }
}

type MetaHistoryRow = {
  date?: string;
  status?: { label?: string; one_liner?: string };
  regime?: { label?: string; determinism_hash?: string };
  confidence?: { confidence_score?: number };
};

async function buildHistoryRows(chain: ChainId, window: 30 | 90) {
  const data = await readPublishedJson<{ rows?: MetaHistoryRow[] }>(
    `data/published/v1/meta/${chain}/last${window}d.json`
  );
  return (data?.rows ?? [])
    .filter((r) => typeof r.date === "string")
    .map((r) => ({
      date: r.date!,
      label: r.status?.label ?? r.regime?.label ?? null,
      confidence: typeof r.confidence?.confidence_score === "number" ? r.confidence.confidence_score : null,
      oneLiner: r.status?.one_liner ?? null,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function ScoreBar({ label, score, color, description }: {
  label: string; score: number | null; color: string; description: string;
}) {
  const pct = typeof score === "number" ? Math.max(0, Math.min(100, score)) : 50;
  const isAbove50 = pct > 50;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div>
          <span className="text-[12px] font-bold text-white">{label}</span>
          <span className="ml-2 text-[10px] text-slate-500">{description}</span>
        </div>
        <span className="text-[12px] font-bold text-white shrink-0 ml-2">
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
  if (trend === "HEATING") return <span className="text-amber-300 font-bold">↑</span>;
  if (trend === "COOLING") return <span className="text-blue-300 font-bold">↓</span>;
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

  const [meta, historyRows] = await Promise.all([
    readPublishedJson<Record<string, unknown>>(
      `data/published/v1/meta/${chainId}/latest.json`
    ),
    buildHistoryRows(chainId, 30),
  ]);

  const state = parseMobileChainState(chainId, cfg.label, cfg.name, meta as never);
  const color = regimeColor(state.regimeLabel);
  const bg = regimeBg(state.regimeLabel);
  const chainColor = CHAIN_COLORS[chainId];

  // Distribution from history
  const counts = historyRows.reduce<Record<string, number>>((acc, r) => {
    const k = r.label ?? "UNKNOWN/DEGRADED";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  const avgConf = historyRows.filter(r => r.confidence != null).length > 0
    ? historyRows.filter(r => r.confidence != null).reduce((a, r) => a + r.confidence!, 0)
      / historyRows.filter(r => r.confidence != null).length
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0E1A]">
      <header
        className="sticky top-0 z-10 border-b border-white/8 px-4 pt-safe-top backdrop-blur-sm"
        style={{ background: bg }}
      >
        <div className="flex items-center gap-3 py-3">
          <Link href="/mobile" className="pr-1 text-lg text-slate-400">←</Link>
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black"
            style={{ backgroundColor: `${chainColor}22`, color: chainColor }}
          >
            {cfg.label}
          </div>
          <div className="flex-1 min-w-0">
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

        {/* What this chain is */}
        {cfg.subtitle && (
          <section className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1.5">
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

        {/* Confidence + label */}
        <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Current confidence</div>
              <div className="text-[32px] font-black text-white leading-none">
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

        {/* Scorecard */}
        <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 space-y-5">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Scorecard — 0 to 100, 50 is neutral
          </div>
          <ScoreBar label="Demand" score={state.scorecard.demand?.score ?? null} color="#00FF88"
            description="Usage pressure" />
          <ScoreBar label="Friction" score={state.scorecard.friction?.score ?? null} color="#FF4444"
            description="Cost + failure" />
          <ScoreBar label="Capacity" score={state.scorecard.capacity?.score ?? null} color="#FF4444"
            description="Block fullness" />
          <p className="text-[10px] text-slate-600 leading-[1.6]">
            Scores above 50 mean the axis looks more pressured than usual. Below 50 means softer than usual. Low confidence pulls scores toward 50.
          </p>
        </section>

        {/* Drivers */}
        {state.drivers.length > 0 && (
          <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              Driver attribution — why this label
            </div>
            <div className="space-y-3">
              {state.drivers.map((d) => (
                <div key={d.metric} className="rounded-xl border border-white/6 bg-black/10 p-3">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <code className="text-[11px] font-mono font-bold text-white">{d.metric}</code>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">{d.axis}</span>
                      <TrendArrow trend={d.trend} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {d.zRobust != null && (
                      <div>
                        <div className="text-[9px] text-slate-600">z-score</div>
                        <div className="text-[12px] font-bold text-white">
                          {d.zRobust > 0 ? "+" : ""}{d.zRobust.toFixed(2)}
                        </div>
                      </div>
                    )}
                    {d.pct90d != null && (
                      <div>
                        <div className="text-[9px] text-slate-600">Percentile</div>
                        <div className="text-[12px] font-bold text-white">{Math.round(d.pct90d)}th</div>
                      </div>
                    )}
                    {d.momentum != null && (
                      <div>
                        <div className="text-[9px] text-slate-600">MA7 vs MA30</div>
                        <div className={`text-[12px] font-bold ${d.momentum > 0 ? "text-amber-300" : "text-blue-300"}`}>
                          {d.momentum > 0 ? "+" : ""}{d.momentum.toFixed(3)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-slate-600 leading-[1.6]">
              z-score: how far above/below the chain's 180-day median. Percentile: where today sits in the last 90 days. MA7 vs MA30: whether the short-term trend is running above or below medium-term.
            </p>
          </section>
        )}

        {/* History chart */}
        <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              30-day history
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-3 rounded-full" style={{ backgroundColor: chainColor }} />
              <span className="text-[10px] text-slate-500">Regime over time</span>
            </div>
          </div>
          <MobileChainChart rows={historyRows} chainColor={chainColor} />
          <p className="mt-3 text-[10px] text-slate-600 leading-[1.6]">
            Tap any point on the chart to see the label and confidence for that date.
          </p>
        </section>

        {/* 30-day stats */}
        <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            30-day summary
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-xl border border-white/6 bg-black/10 p-3 text-center">
              <div className="text-[10px] text-slate-600">Avg confidence</div>
              <div className="text-[18px] font-black text-white mt-0.5">
                {avgConf != null ? avgConf.toFixed(3) : "—"}
              </div>
            </div>
            <div className="rounded-xl border border-white/6 bg-black/10 p-3 text-center">
              <div className="text-[10px] text-slate-600">Days in period</div>
              <div className="text-[18px] font-black text-white mt-0.5">{historyRows.length}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([label, count]) => {
              const c = regimeColor(label);
              const pct = Math.round((count / historyRows.length) * 100);
              return (
                <span key={label} className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                  style={{ color: c, backgroundColor: `${c}18`, border: `1px solid ${c}33` }}>
                  {label.slice(0, 6)} · {count} ({pct}%)
                </span>
              );
            })}
          </div>
        </section>

        {/* Published labels list */}
        <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Published labels
          </div>
          <div className="max-h-96 space-y-1.5 overflow-y-auto">
            {historyRows.slice(0, 60).map((row) => {
              const rc = regimeColor(row.label);
              return (
                <div key={row.date} className="flex items-center gap-3 border-b border-white/5 py-2 last:border-0">
                  <span className="w-24 shrink-0 text-[11px] text-slate-500">{row.date}</span>
                  <span
                    className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-black tracking-wide"
                    style={{ color: rc, backgroundColor: `${rc}18` }}
                  >
                    {row.label ?? "—"}
                  </span>
                  <span className="text-[10px] text-slate-600 flex-1 truncate">
                    {typeof row.confidence === "number" ? row.confidence.toFixed(3) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Determinism hash */}
        {state.determinismHash && (
          <section className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
            <div className="text-[10px] text-slate-600 mb-1.5">Latest determinism hash</div>
            <code className="break-all font-mono text-[10px] text-slate-400">{state.determinismHash}</code>
            <p className="mt-2 text-[10px] text-slate-600 leading-[1.5]">
              SHA-256 fingerprint of the exact inputs used to produce this label. Verify any past label at urdatlas.com/track-record.
            </p>
          </section>
        )}

        {/* Primer caveats if exists */}
        {cfg.primer?.caveats && cfg.primer.caveats.length > 0 && (
          <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="mb-2.5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              Chain-specific notes
            </div>
            <div className="space-y-2">
              {cfg.primer.caveats.map((caveat) => (
                <div key={caveat} className="flex items-start gap-2.5">
                  <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/60" />
                  <span className="text-[12px] leading-[1.65] text-slate-300">{caveat}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* API CTA */}
        <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-4">
          <div className="text-[12px] font-bold text-white mb-1">Get JSON access for {cfg.label}</div>
          <p className="text-[11px] text-slate-400 mb-3">
            Subscribe to receive daily Gold, Meta, and Derived files via API.
            90-day history on Basic, 365 days on Pro.
          </p>
          <Link href="/mobile/plans" className="inline-block rounded-full bg-cyan-400 px-5 py-2 text-[12px] font-black text-[#06111b]">
            See plans →
          </Link>
        </div>
      </main>

      <MobileBottomNav active={CHAIN_NAV_KEY[chainId] ?? "overview"} />
    </div>
  );
}
