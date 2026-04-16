import Link from "next/link";
import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readStorageObject } from "@/lib/storage";
import { CHAIN_COLORS, regimeColor } from "@/lib/mobile/data";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import "server-only";

type MetaHistoryRow = {
  date?: string;
  status?: { label?: string; one_liner?: string };
  confidence?: { confidence_score?: number };
};

type ChainTrackSummary = {
  chain: ChainId;
  label: string;
  name: string;
  rows: Array<{ date: string; label: string | null; confidence: number | null; oneLiner: string | null }>;
  counts: Record<string, number>;
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

async function buildTrackSummary(chain: ChainId, label: string, name: string): Promise<ChainTrackSummary> {
  const data = await readPublishedJson<{ rows?: MetaHistoryRow[] }>(`data/published/v1/meta/${chain}/last30d.json`);
  const rows = (data?.rows ?? [])
    .filter((r) => typeof r.date === "string")
    .map((r) => ({
      date: r.date!,
      label: r.status?.label ?? null,
      confidence: typeof r.confidence?.confidence_score === "number" ? r.confidence.confidence_score : null,
      oneLiner: r.status?.one_liner ?? null,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    const key = row.label ?? "UNKNOWN/DEGRADED";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return { chain, label, name, rows, counts };
}

export default async function MobileTrackRecordPage() {
  const summaries = await Promise.all(CHAIN_LIST.map((chain) => buildTrackSummary(chain.id, chain.label, chain.name)));

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0E1A]">
      <header className="sticky top-0 z-10 border-b border-white/8 bg-[#0A0E1A]/95 px-4 pt-safe-top backdrop-blur-sm">
        <div className="py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">Track record</div>
              <div className="mt-0.5 text-[14px] font-bold text-white">What the model has actually been publishing</div>
            </div>
            <Link href="/track-record?view=desktop" className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold text-slate-200">
              Desktop
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 py-4 pb-24">
        <div className="rounded-3xl border border-cyan-500/15 bg-cyan-500/[0.04] p-4">
          <p className="text-[13px] leading-[1.75] text-slate-200">
            This is the mobile proof layer: recent labels, recent confidence, and enough history to show whether a condition persisted or just flickered for a day.
          </p>
        </div>

        {summaries.map((summary) => {
          const chainColor = CHAIN_COLORS[summary.chain];
          return (
            <section key={summary.chain} className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black" style={{ backgroundColor: `${chainColor}22`, color: chainColor, border: `1px solid ${chainColor}44` }}>
                    {summary.label}
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-white">{summary.name}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">Last 30 published days</div>
                  </div>
                </div>
                <Link href={`/mobile/chain/${summary.chain}`} className="text-[11px] font-semibold text-cyan-300">Open chain →</Link>
              </div>

              <div className="mobile-inline-scroll -mx-4 mt-3 overflow-x-auto px-4">
                <div className="flex gap-2">
                  {Object.entries(summary.counts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([label, count]) => {
                      const color = regimeColor(label);
                      return (
                        <span key={label} className="rounded-full px-2.5 py-1 text-[10px] font-bold whitespace-nowrap" style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}33` }}>
                          {label} · {count}
                        </span>
                      );
                    })}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {summary.rows.slice(0, 8).map((row) => {
                  const color = regimeColor(row.label);
                  return (
                    <div key={row.date} className="rounded-2xl border border-white/6 bg-black/15 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] text-slate-400">{row.date}</div>
                        <div className="rounded-md px-2 py-0.5 text-[10px] font-black" style={{ color, backgroundColor: `${color}18` }}>
                          {row.label ?? "—"}
                        </div>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">Confidence {typeof row.confidence === "number" ? row.confidence.toFixed(3) : "—"}</div>
                      {row.oneLiner ? <div className="mt-1 text-[11px] leading-[1.6] text-slate-300">{row.oneLiner}</div> : null}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      <MobileBottomNav active="track" />
    </div>
  );
}
