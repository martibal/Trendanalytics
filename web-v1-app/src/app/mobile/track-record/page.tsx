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
  regime?: { determinism_hash?: string };
};

type HistoryBundle =
  | MetaHistoryRow[]
  | {
      rows?: MetaHistoryRow[];
      items?: MetaHistoryRow[];
      data?: MetaHistoryRow[];
    };

type ChainTrackSummary = {
  chain: ChainId;
  label: string;
  name: string;
  rows: Array<{
    date: string;
    label: string | null;
    confidence: number | null;
    oneLiner: string | null;
    hash: string | null;
  }>;
  counts: Record<string, number>;
  avgConfidence: number | null;
  longestStreak: { label: string | null; count: number };
  sourceWindow: 30 | 90 | 365 | null;
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

function extractRows(bundle: HistoryBundle | null): MetaHistoryRow[] {
  if (!bundle) return [];
  if (Array.isArray(bundle)) return bundle;
  if (Array.isArray(bundle.rows)) return bundle.rows;
  if (Array.isArray(bundle.items)) return bundle.items;
  if (Array.isArray(bundle.data)) return bundle.data;
  return [];
}

async function buildTrackSummary(chain: ChainId, label: string, name: string): Promise<ChainTrackSummary> {
  const windows = [30, 90, 365] as const;

  let rows: ChainTrackSummary["rows"] = [];
  let sourceWindow: 30 | 90 | 365 | null = null;

  for (const window of windows) {
    const bundle = await readPublishedJson<HistoryBundle>(`data/published/v1/meta/${chain}/last${window}d.json`);
    const extracted = extractRows(bundle)
      .filter((r) => typeof r.date === "string")
      .map((r) => ({
        date: r.date!,
        label: r.status?.label ?? null,
        confidence: typeof r.confidence?.confidence_score === "number" ? r.confidence.confidence_score : null,
        oneLiner: r.status?.one_liner ?? null,
        hash: r.regime?.determinism_hash ?? null,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    if (extracted.length > 0) {
      rows = extracted;
      sourceWindow = window;
      break;
    }
  }

  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    const key = row.label ?? "UNKNOWN/DEGRADED";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const confValues = rows.filter((r) => r.confidence !== null).map((r) => r.confidence as number);
  const avgConfidence = confValues.length > 0 ? confValues.reduce((a, b) => a + b, 0) / confValues.length : null;

  let longestStreak = { label: null as string | null, count: 0 };
  let currentStreak = { label: null as string | null, count: 0 };
  for (const row of [...rows].reverse()) {
    if (row.label === currentStreak.label) {
      currentStreak.count++;
    } else {
      if (currentStreak.count > longestStreak.count) longestStreak = { ...currentStreak };
      currentStreak = { label: row.label, count: 1 };
    }
  }
  if (currentStreak.count > longestStreak.count) longestStreak = { ...currentStreak };

  return { chain, label, name, rows, counts, avgConfidence, longestStreak, sourceWindow };
}

export default async function MobileTrackRecordPage() {
  const summaries = await Promise.all(CHAIN_LIST.map((chain) => buildTrackSummary(chain.id, chain.label, chain.name)));

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0E1A]">
      <header className="sticky top-0 z-10 border-b border-white/8 bg-[#0A0E1A]/95 px-4 pt-safe-top backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 py-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">Track record</div>
            <div className="mt-0.5 text-[14px] font-bold text-white">What was actually published</div>
          </div>
          <Link href="/track-record?view=desktop" className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold text-slate-200">
            Full archive ↗
          </Link>
        </div>
      </header>

      <main className="flex-1 space-y-5 px-4 py-4 pb-24">
        <section className="rounded-3xl border border-cyan-500/15 bg-cyan-500/[0.05] p-5">
          <p className="text-[13px] leading-[1.75] text-slate-100">
            Every label shown here is what the pipeline actually published on that date — not a reconstruction.
            Each row is anchored by a determinism hash that makes retroactive changes detectable.
          </p>
          <p className="mt-2.5 text-[12px] leading-[1.7] text-slate-400">
            Showing the first available mobile bundle per chain (30d preferred, then 90d or 365d when needed).
          </p>
        </section>

        {summaries.map((summary) => {
          const chainColor = CHAIN_COLORS[summary.chain];
          const dominantLabel = Object.entries(summary.counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

          return (
            <section key={summary.chain} className="rounded-3xl border border-white/8 bg-white/[0.03]">
              <div className="flex items-center gap-3 border-b border-white/6 p-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black"
                  style={{ backgroundColor: `${chainColor}22`, color: chainColor, border: `1px solid ${chainColor}44` }}
                >
                  {summary.label}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold text-white">{summary.name}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {summary.sourceWindow ? `${summary.sourceWindow}d published bundle` : "No bundle found"}
                  </div>
                </div>
                <Link href={`/mobile/chain/${summary.chain}`} className="shrink-0 text-[11px] font-semibold text-cyan-300">
                  Detail →
                </Link>
              </div>

              <div className="grid grid-cols-3 divide-x divide-white/6 border-b border-white/6">
                <div className="p-3 text-center">
                  <div className="text-[10px] text-slate-600">Dominant</div>
                  <div className="mt-1 text-[10px] font-black tracking-wide" style={{ color: regimeColor(dominantLabel) }}>
                    {dominantLabel ?? "—"}
                  </div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-[10px] text-slate-600">Avg confidence</div>
                  <div className="mt-1 text-[12px] font-bold text-white">
                    {summary.avgConfidence != null ? summary.avgConfidence.toFixed(3) : "—"}
                  </div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-[10px] text-slate-600">Longest streak</div>
                  <div className="mt-1 text-[11px] font-bold text-white">
                    {summary.longestStreak.count}d
                    <span className="ml-1 text-[9px] text-slate-500">{summary.longestStreak.label?.slice(0, 4) ?? ""}</span>
                  </div>
                </div>
              </div>

              <div className="border-b border-white/6 px-4 py-3">
                <div className="mb-2 text-[9px] uppercase tracking-wider text-slate-600">Distribution</div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(summary.counts).sort((a, b) => b[1] - a[1]).map(([label, count]) => {
                    const color = regimeColor(label);
                    const pct = summary.rows.length ? Math.round((count / summary.rows.length) * 100) : 0;
                    return (
                      <span key={label} className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}33` }}>
                        {label.slice(0, 7)} · {count} ({pct}%)
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5 p-4">
                <div className="mb-2 text-[9px] uppercase tracking-wider text-slate-600">Recent labels</div>
                {summary.rows.slice(0, 15).map((row) => {
                  const color = regimeColor(row.label);
                  return (
                    <div key={row.date} className="rounded-xl border border-white/5 bg-black/10 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="w-24 shrink-0 text-[11px] text-slate-400">{row.date}</span>
                        <span className="rounded-md px-2 py-0.5 text-[10px] font-black tracking-wide" style={{ color, backgroundColor: `${color}18` }}>
                          {row.label ?? "—"}
                        </span>
                        <span className="shrink-0 text-[10px] text-slate-600">{typeof row.confidence === "number" ? row.confidence.toFixed(3) : "—"}</span>
                      </div>
                      {row.oneLiner && <div className="mt-1.5 text-[11px] leading-[1.55] text-slate-400">{row.oneLiner}</div>}
                      {row.hash && <div className="mt-1 truncate font-mono text-[9px] text-slate-700">#{row.hash.slice(0, 16)}</div>}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      <MobileBottomNav active="overview" />
    </div>
  );
}
