// src/app/data-health/DataHealthClient.tsx
"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

type Chain = "bitcoin" | "ethereum" | "arbitrum" | "base";
type Genre = "gold" | "derived" | "meta";

type DatasetIndex = {
  supported_chains?: Chain[];
  computed_at_utc?: string;
  dataset_id?: string;
  methodology_version?: string;
};

type Manifest = {
  asof: string;
  available_days?: string[];
};

type HealthRow = {
  chain: Chain;
  genre: Genre;
  asof?: string;
  available_days?: number;
  last30_missing_days?: number;
  last30_gap_spans?: number;
};

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; dataset: DatasetIndex; rows: HealthRow[] }
  | { status: "error"; message: string; details?: string };

const CHAINS: Chain[] = ["bitcoin", "ethereum", "arbitrum", "base"];
const GENRES: Genre[] = ["gold", "derived", "meta"];

function toUtcMidnightMs(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split("-").map((x) => Number(x));
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

function yyyyMmDdFromUtcMs(ms: number): string {
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayUtcYyyyMmDd(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function lastNDaysSet(utcToday: string, n: number): Set<string> {
  const end = toUtcMidnightMs(utcToday);
  const out = new Set<string>();
  for (let i = 0; i < n; i++) {
    out.add(yyyyMmDdFromUtcMs(end - i * 24 * 60 * 60 * 1000));
  }
  return out;
}

function computeLast30Gaps(params: { availableDays: string[]; utcToday: string }): { missing: number; spans: number } {
  const { availableDays, utcToday } = params;
  const window = lastNDaysSet(utcToday, 30);
  const avail = new Set(availableDays);

  const days = Array.from(window).sort(); // oldest->newest
  let missing = 0;
  let spans = 0;
  let inGap = false;

  for (const day of days) {
    const ok = avail.has(day);
    if (!ok) {
      missing += 1;
      if (!inGap) {
        spans += 1;
        inGap = true;
      }
    } else {
      inGap = false;
    }
  }

  return { missing, spans };
}

async function fetchJsonSafe<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} for ${url}${text ? ` — ${text.slice(0, 180)}` : ""}`);
  }
  return (await res.json()) as T;
}

function toneForMissing(missing?: number): string {
  if (typeof missing !== "number") return "border-white/10 text-white/70 bg-black/20";
  if (missing === 0) return "border-emerald-400/30 text-emerald-200 bg-emerald-500/10";
  if (missing <= 2) return "border-yellow-400/30 text-yellow-200 bg-yellow-500/10";
  return "border-red-400/30 text-red-200 bg-red-500/10";
}

export default function DataHealthClient() {
  const baseUrl = useMemo(() => String(process.env.NEXT_PUBLIC_DATA_BASE_URL ?? "/data/published/v1"), []);
  const utcToday = useMemo(() => todayUtcYyyyMmDd(), []);

  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      try {
        const dataset = await fetchJsonSafe<DatasetIndex>(`${baseUrl}/dataset.json`);
        const chains = (dataset.supported_chains ?? CHAINS) as Chain[];

        const rows: HealthRow[] = [];

        for (const chain of chains) {
          for (const genre of GENRES) {
            const manifestUrl = `${baseUrl}/${genre}/${chain}/manifest.json`;
            const manifest = await fetchJsonSafe<Manifest>(manifestUrl);
            const availableDays = manifest.available_days ?? [];
            const { missing, spans } = computeLast30Gaps({ availableDays, utcToday });

            rows.push({
              chain,
              genre,
              asof: manifest.asof,
              available_days: availableDays.length,
              last30_missing_days: missing,
              last30_gap_spans: spans,
            });
          }
        }

        if (cancelled) return;
        setState({ status: "loaded", dataset, rows });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setState({ status: "error", message: "Failed to compute data health from published manifests.", details: msg });
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [baseUrl, utcToday]);

  if (state.status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="text-sm text-white/70">Computing data health…</div>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Data Health</h1>
            <Link href="/" className="text-sm text-white/70 hover:text-white">
              ← Back to Overview
            </Link>
          </div>
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <div className="text-sm font-medium">{state.message}</div>
            {state.details ? (
              <pre className="mt-3 overflow-auto rounded-xl bg-black/30 p-3 text-xs text-white/80">{state.details}</pre>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const { dataset, rows } = state;

  const rowsSorted = [...rows].sort((a, b) => {
    const k1 = `${a.chain}:${a.genre}`;
    const k2 = `${b.chain}:${b.genre}`;
    return k1.localeCompare(k2);
  });

  // IMPORTANT: no hooks here (prevents hook-order errors)
  const byChain = (() => {
    const m: Record<Chain, Partial<Record<Genre, HealthRow>>> = {
      bitcoin: {},
      ethereum: {},
      arbitrum: {},
      base: {},
    };
    for (const r of rowsSorted) {
      m[r.chain][r.genre] = r;
    }
    return m;
  })();

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-4 px-6 py-6">
          <div>
            <div className="text-sm text-white/60">CSS · descriptive on-chain trend analytics (no price)</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Data Health</h1>
            <div className="mt-2 text-sm text-white/60">
              Built from published <span className="font-mono">manifest.json</span> files. Window: last 30 calendar days (UTC).
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Link
              href="/"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              ← Overview
            </Link>

            <details className="hidden md:block rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <summary className="cursor-pointer select-none text-xs text-white/70">How to read (Advanced)</summary>
              <div className="mt-2 space-y-1 text-xs text-white/70">
                <div>
                  This page reports <span className="text-white/85">freshness</span>, <span className="text-white/85">coverage</span>, and{" "}
                  <span className="text-white/85">publish gaps</span> for datasets used elsewhere in the product.
                </div>
                <div>Missing days indicate ingestion lag or publish gaps. Gap spans count consecutive missing sequences.</div>
                <div>Downstream UI uses these signals + meta confidence to gate interpretive outputs (withheld/unknown).</div>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-white/60">Dataset ID</div>
            <div className="mt-1 font-mono text-sm text-white/90">{dataset.dataset_id ?? "—"}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-white/60">Computed at (UTC)</div>
            <div className="mt-1 font-mono text-sm text-white/90">{dataset.computed_at_utc ?? "—"}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-white/60">Methodology</div>
            <div className="mt-1 text-sm text-white/90">{dataset.methodology_version ?? "—"}</div>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
          <div className="bg-white/5 px-5 py-4">
            <div className="text-sm font-semibold">Manifest coverage summary</div>
            <div className="mt-1 text-xs text-white/60">
              UTC today: <span className="font-mono">{utcToday}</span>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {CHAINS.map((chain) => (
                <div key={chain} className="rounded-2xl border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div>
                      <div className="text-sm font-semibold capitalize">{chain}</div>
                      <div className="text-xs text-white/60">gold · derived · meta</div>
                    </div>
                  </div>

                  <div className="divide-y divide-white/10">
                    {GENRES.map((genre) => {
                      const r = byChain[chain][genre];
                      const tone = toneForMissing(r?.last30_missing_days);

                      return (
                        <div key={`${chain}:${genre}`} className="px-5 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="text-xs uppercase tracking-wider text-white/50">{genre}</div>
                              <div className="mt-1 text-sm text-white/90">
                                asof <span className="font-mono">{r?.asof ?? "—"}</span>
                                <span className="text-white/50"> · </span>
                                available_days{" "}
                                <span className="font-mono">
                                  {typeof r?.available_days === "number" ? r.available_days.toLocaleString() : "—"}
                                </span>
                              </div>
                            </div>

                            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${tone}`}>
                              last30 missing: {typeof r?.last30_missing_days === "number" ? r.last30_missing_days : "—"}
                              <span className="text-white/50">·</span>
                              gap spans: {typeof r?.last30_gap_spans === "number" ? r.last30_gap_spans : "—"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold">Interpretation rules (descriptive)</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/70">
            <li>
              <span className="font-medium text-white/80">Missing days</span> in the last 30 calendar days indicate either ingestion lag or publish gaps.
            </li>
            <li>
              <span className="font-medium text-white/80">Gap spans</span> count consecutive missing sequences; one long gap is typically more operationally significant than scattered single-day misses.
            </li>
            <li>Downstream UI should use these signals + meta confidence to gate notables/regimes (withheld/unknown).</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
