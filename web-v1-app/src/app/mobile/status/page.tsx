import Link from "next/link";
import { CHAIN_LIST } from "@/config/chains";
import { readStorageObject } from "@/lib/storage";
import { readDatasetManifest } from "@/lib/dataset";
import { computeHistoryDepthDays } from "@/lib/historyDepth";
import { parseMobileChainState, type MobileChainState } from "@/lib/mobile/data";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
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

async function buildChainStates(): Promise<MobileChainState[]> {
  return Promise.all(
    CHAIN_LIST.map(async (chain) => {
      const meta = await readPublishedJson<Record<string, unknown>>(
        `data/published/v1/meta/${chain.id}/latest.json`
      );
      return parseMobileChainState(chain.id, chain.label, chain.name, meta as never);
    })
  );
}

function FreshnessChip({ status }: { status: string }) {
  if (status === "ok") {
    return <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">On schedule</span>;
  }
  if (status === "warn") {
    return <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">Delayed</span>;
  }
  if (status === "fail") {
    return <span className="rounded-full border border-red-400/20 bg-red-400/10 px-2 py-0.5 text-[10px] font-bold text-red-300">Stale</span>;
  }
  return <span className="rounded-full border border-slate-500/20 bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold text-slate-400">Unknown</span>;
}

export default async function MobileStatusPage() {
  const [states, dataset, historyDays] = await Promise.all([
    buildChainStates(),
    readDatasetManifest(),
    computeHistoryDepthDays(),
  ]);

  const publishedAt = dataset?.published_at?.slice(0, 10) ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0E1A]">
      <header className="sticky top-0 z-10 border-b border-white/8 bg-[#0A0E1A]/95 px-4 pt-safe-top backdrop-blur-sm">
        <div className="flex items-center gap-3 py-3">
          <Link href="/mobile" className="pr-1 text-lg text-slate-400">←</Link>
          <div>
            <div className="text-[14px] font-bold text-white">Status</div>
            <div className="text-[10px] text-slate-500">Freshness and current publish state</div>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 py-4 pb-24">
        <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/5 px-4 py-3">
          <p className="text-[11px] leading-[1.65] text-slate-200">
            This mobile status page is a simplified freshness view. It shows the current published row per chain and whether data appears on schedule.
          </p>
          <a href="/status?view=desktop" className="mt-2 inline-block text-[11px] font-semibold text-cyan-300">
            Open full desktop status page →
          </a>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Dataset</div>
          <div className="mt-2 text-[18px] font-bold text-white">{publishedAt ?? "—"}</div>
          <div className="mt-1 text-[11px] text-slate-400">{historyDays ?? "—"} published days</div>
        </div>

        <div className="space-y-3">
          {states.map((state) => (
            <div key={state.chain} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-bold text-white">{state.name}</div>
                  <div className="mt-0.5 text-[10px] text-slate-500">
                    {state.asOf ?? "—"} · Lag {state.lagDays != null ? `${state.lagDays}d` : "—"}
                  </div>
                </div>
                <FreshnessChip status={state.freshnessStatus} />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="rounded-lg px-2.5 py-1 text-[10px] font-black tracking-wider" style={{
                  color: state.regimeLabel ? "#E5E7EB" : "#94A3B8",
                  backgroundColor: "rgba(255,255,255,0.06)",
                }}>
                  {state.regimeLabel ?? "—"}
                </div>
                <div className="text-[11px] text-slate-400">
                  Confidence {typeof state.confidenceScore === "number" ? state.confidenceScore.toFixed(3) : "—"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <MobileBottomNav active="overview" />
    </div>
  );
}
