import { notFound } from "next/navigation";
import Link from "next/link";
import { CHAINS, type ChainId } from "@/config/chains";
import { readStorageObject } from "@/lib/storage";
import { auth } from "@clerk/nextjs/server";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import MobileChainChart from "@/components/mobile/MobileChainChart";
import {
  parseMobileChainState,
  regimeColor,
  regimeBg,
  CHAIN_COLORS,
} from "@/lib/mobile/data";
import "server-only";

type MetaHistoryRow = {
  date?: string;
  status?: { label?: string; one_liner?: string };
  regime?: { label?: string; determinism_hash?: string };
  confidence?: { confidence_score?: number };
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

async function buildHistoryRows(chain: ChainId, window: 30 | 90 | 180 | 365) {
  const data = await readPublishedJson<{ rows?: MetaHistoryRow[] }>(`data/published/v1/meta/${chain}/last${window}d.json`);
  const rows = data?.rows ?? [];
  return rows
    .filter((r) => typeof r.date === "string")
    .map((r) => ({
      date: r.date!,
      label: r.status?.label ?? r.regime?.label ?? null,
      confidence: typeof r.confidence?.confidence_score === "number" ? r.confidence.confidence_score : null,
      oneLiner: r.status?.one_liner ?? null,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function ScorePill({ label, score, color }: { label: string; score: number | null; color: string }) {
  const value = typeof score === "number" ? Math.round(score) : null;
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-1 text-[22px] font-black text-white">{value ?? "—"}</div>
      <div className="mt-2 h-2 w-full rounded-full bg-white/10">
        <div className="h-2 rounded-full" style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function DriverCard({
  metric,
  axis,
  trend,
  z,
  pct,
}: {
  metric: string;
  axis: string;
  trend: string | null;
  z: number | null;
  pct: number | null;
}) {
  return (
    <div className="min-w-[220px] rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-[12px] font-bold text-white">{metric}</div>
        <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{axis}</div>
      </div>
      <div className="mt-2 flex gap-3 text-[11px] text-slate-300">
        {trend ? <span>{trend}</span> : null}
        {z != null ? <span>z {z > 0 ? "+" : ""}{z.toFixed(2)}</span> : null}
        {pct != null ? <span>{Math.round(pct)}th pct</span> : null}
      </div>
    </div>
  );
}

export default async function MobileChainPage({
  params,
  searchParams,
}: {
  params: Promise<{ chain: string }>;
  searchParams?: Promise<{ w?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearch = searchParams ? await searchParams : {};
  const chainId = resolvedParams.chain as ChainId;
  const cfg = CHAINS[chainId];
  if (!cfg) notFound();

  const { userId } = await auth();
  const isSignedIn = !!userId;

  const rawW = resolvedSearch.w ?? "30";
  const requestedWindow = Number(rawW);
  const windowDays = ([30, 90, 180, 365] as const).includes(requestedWindow as 30 | 90 | 180 | 365)
    ? ((isSignedIn ? requestedWindow : 30) as 30 | 90 | 180 | 365)
    : 30;

  const [meta, historyRows] = await Promise.all([
    readPublishedJson<Record<string, unknown>>(`data/published/v1/meta/${chainId}/latest.json`),
    buildHistoryRows(chainId, windowDays),
  ]);

  const state = parseMobileChainState(chainId, cfg.label, cfg.name, meta as never);
  const color = regimeColor(state.regimeLabel);
  const bg = regimeBg(state.regimeLabel);
  const chainColor = CHAIN_COLORS[chainId];

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0E1A]">
      <header className="sticky top-0 z-20 border-b border-white/8 px-4 pt-safe-top backdrop-blur-sm" style={{ background: bg }}>
        <div className="py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/mobile" className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-sm text-slate-300">←</Link>
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black"
                style={{ backgroundColor: `${chainColor}22`, color: chainColor, border: `1px solid ${chainColor}44` }}
              >
                {cfg.label}
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-bold text-white">{cfg.name}</div>
                <div className="mt-0.5 text-[11px] text-slate-500">{state.asOf ?? "—"} · Lag {state.lagDays != null ? `${state.lagDays}d` : "—"}</div>
              </div>
            </div>
            <Link href={`/chains/${chainId}?view=desktop`} className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold text-slate-200">
              Desktop
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 py-4 pb-24">
        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Current published state</div>
              <div className="mt-1 text-[26px] font-black" style={{ color }}>{state.regimeLabel ?? "—"}</div>
              <div className="mt-1 text-[12px] text-slate-300">{state.oneLiner ?? cfg.subtitle}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-2 text-right">
              <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Confidence</div>
              <div className="mt-1 text-[24px] font-black text-white">{typeof state.confidenceScore === "number" ? state.confidenceScore.toFixed(3) : "—"}</div>
              <div className="mt-1 text-[11px]" style={{ color }}>{state.confidenceBand}</div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-3 gap-3">
          <ScorePill label="Demand" score={state.scorecard.demand?.score ?? null} color="#22c55e" />
          <ScorePill label="Friction" score={state.scorecard.friction?.score ?? null} color="#ef4444" />
          <ScorePill label="Capacity" score={state.scorecard.capacity?.score ?? null} color="#f97316" />
        </div>

        {state.drivers.length > 0 ? (
          <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Top drivers right now</div>
            <div className="mobile-inline-scroll -mx-4 overflow-x-auto px-4">
              <div className="flex gap-3">
                {state.drivers.map((d) => (
                  <DriverCard key={`${d.axis}-${d.metric}`} metric={d.metric} axis={d.axis} trend={d.trend} z={d.zRobust} pct={d.pct90d} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">History</div>
              <div className="mt-1 text-[12px] text-slate-400">Regime and confidence over the selected published window.</div>
            </div>
            <div className="mobile-inline-scroll overflow-x-auto">
              <div className="flex gap-1 rounded-full border border-white/8 bg-black/15 p-1">
                {[30, 90, 180, 365].map((w) => {
                  const isActive = windowDays === w;
                  const isLocked = !isSignedIn && w > 30;
                  return (
                    <Link
                      key={w}
                      href={isLocked ? "/mobile/plans" : `/mobile/chain/${chainId}?w=${w}`}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${isActive ? "bg-cyan-500/20 text-cyan-300" : isLocked ? "text-slate-600" : "text-slate-400"}`}
                    >
                      {w}d{isLocked ? " ↑" : ""}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <MobileChainChart rows={historyRows} chainColor={chainColor} />
          </div>
        </section>

        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Recent published labels</div>
              <div className="mt-1 text-[12px] text-slate-400">Most recent rows in the selected window.</div>
            </div>
            {state.determinismHash ? <div className="text-[10px] text-slate-500">Hash-anchored</div> : null}
          </div>

          <div className="space-y-2">
            {historyRows.slice(0, 12).map((row) => {
              const rowColor = regimeColor(row.label);
              return (
                <div key={row.date} className="rounded-2xl border border-white/6 bg-black/15 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] text-slate-400">{row.date}</div>
                    <div className="rounded-md px-2 py-0.5 text-[10px] font-black" style={{ color: rowColor, backgroundColor: `${rowColor}18` }}>
                      {row.label ?? "—"}
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">Confidence {typeof row.confidence === "number" ? row.confidence.toFixed(3) : "—"}</div>
                  {row.oneLiner ? <div className="mt-1 text-[11px] leading-[1.55] text-slate-300">{row.oneLiner}</div> : null}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <MobileBottomNav active="track" />
    </div>
  );
}
