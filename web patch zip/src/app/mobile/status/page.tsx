import Link from "next/link";
import { CHAIN_LIST } from "@/config/chains";
import { readStorageObject } from "@/lib/storage";
import { readDatasetManifest } from "@/lib/dataset";
import { computeHistoryDepthDays } from "@/lib/historyDepth";
import { parseMobileChainState, regimeColor, CHAIN_COLORS, type MobileChainState } from "@/lib/mobile/data";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
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
  const map = {
    ok: { label: "On schedule", cls: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" },
    warn: { label: "Delayed", cls: "border-amber-400/20 bg-amber-400/10 text-amber-300" },
    fail: { label: "Stale", cls: "border-red-400/20 bg-red-400/10 text-red-300" },
    unknown: { label: "Unknown", cls: "border-slate-500/20 bg-slate-500/10 text-slate-400" },
  };
  const s = map[status as keyof typeof map] ?? map.unknown;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${s.cls}`}>
      {s.label}
    </span>
  );
}

const FRESHNESS_EXPLANATION = [
  { status: "On schedule", color: "#00FF88", desc: "Data arrived within the chain's expected publication cadence." },
  { status: "Delayed", color: "#FFD700", desc: "Data is later than usual but within the soft-warning boundary." },
  { status: "Stale", color: "#FF4444", desc: "Data has exceeded the hard-fail threshold for this chain." },
];

const CADENCE_NOTES = [
  { chain: "BTC / ETH", expected: "~1 day", note: "Expected to publish daily. Lag over 2 days triggers a warning." },
  { chain: "ARB / BASE", expected: "~7 days", note: "L2 chains publish on a slower cadence by design. 7-day lag is normal, not a problem." },
];

export default async function MobileStatusPage() {
  const [states, dataset, historyDays] = await Promise.all([
    buildChainStates(),
    readDatasetManifest(),
    computeHistoryDepthDays(),
  ]);

  const publishedAt = dataset?.published_at?.slice(0, 10) ?? null;
  const allOk = states.every(s => s.freshnessStatus === "ok");

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0E1A]">
      <header className="sticky top-0 z-10 border-b border-white/8 bg-[#0A0E1A]/95 px-4 pt-safe-top backdrop-blur-sm">
        <div className="flex items-center gap-3 py-3">
          <Link href="/mobile" className="pr-1 text-lg text-slate-400">←</Link>
          <div className="flex-1">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">Status</div>
            <div className="text-[14px] font-bold text-white">Pipeline and freshness</div>
          </div>
          <Link href="/status?view=desktop" className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold text-slate-200">
            Full ↗
          </Link>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 py-4 pb-24">

        {/* Overall status banner */}
        <section
          className={`rounded-3xl border p-5 ${allOk ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5"}`}
        >
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3 shrink-0">
              {allOk && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-50" />}
              <span className={`relative inline-flex h-3 w-3 rounded-full ${allOk ? "bg-emerald-400" : "bg-amber-400"}`} />
            </div>
            <div>
              <div className={`text-[13px] font-bold ${allOk ? "text-emerald-200" : "text-amber-200"}`}>
                {allOk ? "All chains on schedule" : "Some chains delayed"}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Dataset published {publishedAt ?? "—"} · {historyDays ?? "—"} total days
              </div>
            </div>
          </div>
        </section>

        {/* Per-chain status */}
        <section>
          <div className="mb-2.5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Current state per chain
          </div>
          <div className="space-y-2.5">
            {states.map((state) => {
              const chainColor = CHAIN_COLORS[state.chain];
              const color = regimeColor(state.regimeLabel);
              return (
                <Link
                  key={state.chain}
                  href={`/mobile/chain/${state.chain}`}
                  className="block rounded-2xl border border-white/8 bg-white/[0.03] p-4 active:bg-white/[0.05]"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black"
                      style={{ backgroundColor: `${chainColor}22`, color: chainColor }}
                    >
                      {state.label}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[13px] font-bold text-white">{state.name}</div>
                        <FreshnessChip status={state.freshnessStatus} />
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-500">
                        {state.asOf ?? "—"} · {state.lagDays != null ? `${state.lagDays}d lag` : "—"}
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <span
                          className="rounded-md px-2 py-0.5 text-[10px] font-black tracking-wide"
                          style={{ color, backgroundColor: `${color}18` }}
                        >
                          {state.regimeLabel ?? "—"}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Confidence {typeof state.confidenceScore === "number" ? state.confidenceScore.toFixed(3) : "—"}
                          {state.confidenceBand && ` · ${state.confidenceBand}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Freshness states explained */}
        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            What freshness states mean
          </div>
          <div className="space-y-2.5">
            {FRESHNESS_EXPLANATION.map(({ status, color, desc }) => (
              <div key={status} className="flex items-start gap-3">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <div>
                  <span className="text-[11px] font-bold text-white">{status}</span>
                  <span className="ml-2 text-[11px] text-slate-400">{desc}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-slate-600 leading-[1.6]">
            Freshness and confidence are different. A row can be on schedule but still low-confidence. A row can be delayed but still mathematically valid when it arrives.
          </p>
        </section>

        {/* Publication cadence */}
        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Expected publication cadence
          </div>
          <div className="space-y-2.5">
            {CADENCE_NOTES.map((n) => (
              <div key={n.chain} className="rounded-xl border border-white/6 bg-black/10 px-3 py-3">
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="text-[12px] font-bold text-white">{n.chain}</span>
                  <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                    {n.expected}
                  </span>
                </div>
                <p className="text-[11px] leading-[1.6] text-slate-400">{n.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-white/5 bg-black/10 px-3 py-2.5">
            <div className="text-[10px] text-slate-500">Expected refresh windows</div>
            <div className="text-[12px] font-bold text-white mt-0.5">~09:00 and ~21:00 Europe/Oslo</div>
          </div>
        </section>

        {/* Dataset context */}
        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Dataset context
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/6 bg-black/10 px-3 py-3">
              <div className="text-[10px] text-slate-600">Published</div>
              <div className="text-[15px] font-bold text-white mt-0.5">{publishedAt ?? "—"}</div>
            </div>
            <div className="rounded-xl border border-white/6 bg-black/10 px-3 py-3">
              <div className="text-[10px] text-slate-600">Total days</div>
              <div className="text-[15px] font-bold text-white mt-0.5">{historyDays ?? "—"}</div>
            </div>
            <div className="rounded-xl border border-white/6 bg-black/10 px-3 py-3">
              <div className="text-[10px] text-slate-600">Methodology</div>
              <div className="text-[15px] font-bold text-white mt-0.5">v1</div>
            </div>
            <div className="rounded-xl border border-white/6 bg-black/10 px-3 py-3">
              <div className="text-[10px] text-slate-600">Chains</div>
              <div className="text-[15px] font-bold text-white mt-0.5">4</div>
            </div>
          </div>
        </section>
      </main>

      <MobileBottomNav active="overview" />
    </div>
  );
}
