import Link from "next/link";

import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { CHAIN_COLORS, regimeColor } from "@/lib/mobile/data";
import { readStorageObject } from "@/lib/storage";
import {
  MobileCard,
  MobileMetric,
  MobilePage,
  MobilePill,
  MobileSection,
} from "@/components/mobile/MobileShell";

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
    <MobilePage
      active="track-record"
      eyebrow="Mobile track record"
      title={<>Every published label, made readable on phone.</>}
      subtitle={
        <>
          The mobile track record shows what the pipeline actually published, including
          confidence and determinism anchors when available.
        </>
      }
      backHref="/mobile"
    >
      <MobileSection>
        <MobileCard tone="blue">
          <p className="text-[13px] leading-6 text-[#d7e8fb]">
            This is not a marketing reconstruction. Rows are read from the published Meta
            bundles. If historical rows are republished, determinism hashes and methodology
            context make that detectable.
          </p>
        </MobileCard>
      </MobileSection>

      <MobileSection eyebrow="Chains" title="Published history by chain.">
        <div className="space-y-4">
          {summaries.map((summary) => {
            const chainColor = CHAIN_COLORS[summary.chain];
            const dominantLabel = Object.entries(summary.counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

            return (
              <MobileCard key={summary.chain} className="p-0">
                <div className="flex items-center gap-3 border-b border-white/8 p-4">
                  <div
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[13px] font-black text-white"
                    style={{ backgroundColor: chainColor }}
                  >
                    {summary.label}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-black text-white">{summary.name}</div>
                    <div className="mt-0.5 text-[11px] text-[#9eb4cf]">
                      {summary.sourceWindow ? `${summary.sourceWindow}d published bundle` : "No bundle found"}
                    </div>
                  </div>
                  <Link href={`/mobile/chain/${summary.chain}`} className="text-[11px] font-black text-[#f5d386]">
                    Detail →
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-2 p-4">
                  <MobileMetric label="Dominant" value={dominantLabel ?? "—"} />
                  <MobileMetric label="Avg conf" value={summary.avgConfidence != null ? summary.avgConfidence.toFixed(3) : "—"} />
                  <MobileMetric label="Longest" value={`${summary.longestStreak.count}d`} sub={summary.longestStreak.label ?? "—"} />
                </div>

                <div className="border-t border-white/8 px-4 py-3">
                  <div className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-[#91a9c4]">
                    Distribution
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(summary.counts).sort((a, b) => b[1] - a[1]).map(([label, count]) => {
                      const color = regimeColor(label);
                      const pct = summary.rows.length ? Math.round((count / summary.rows.length) * 100) : 0;
                      return (
                        <span key={label} className="rounded-full border px-2.5 py-1 text-[10px] font-black" style={{ color, backgroundColor: `${color}18`, borderColor: `${color}33` }}>
                          {label.slice(0, 8)} · {count} ({pct}%)
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 border-t border-white/8 p-4">
                  <div className="text-[9px] font-black uppercase tracking-[0.16em] text-[#91a9c4]">
                    Recent rows
                  </div>
                  {summary.rows.slice(0, 10).map((row) => {
                    const color = regimeColor(row.label);
                    return (
                      <div key={row.date} className="rounded-2xl border border-white/8 bg-black/[0.12] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-[#9eb4cf]">{row.date}</span>
                          <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ color, backgroundColor: `${color}18` }}>
                            {row.label ?? "—"}
                          </span>
                          <span className="text-[10px] text-[#91a9c4]">{typeof row.confidence === "number" ? row.confidence.toFixed(3) : "—"}</span>
                        </div>
                        {row.oneLiner ? <div className="mt-2 text-[11px] leading-5 text-[#cfe0f4]">{row.oneLiner}</div> : null}
                        {row.hash ? <div className="mt-2 truncate font-mono text-[9px] text-[#6f829a]">#{row.hash}</div> : null}
                      </div>
                    );
                  })}
                </div>
              </MobileCard>
            );
          })}
        </div>
      </MobileSection>

      <MobileSection eyebrow="Read next" title="Open the mobile methodology.">
        <Link href="/mobile/methodology" className="block rounded-2xl border border-white/12 bg-white/[0.06] p-4 text-[13px] font-black text-white">
          Methodology and Confidence v2 →
        </Link>
      </MobileSection>
    </MobilePage>
  );
}
