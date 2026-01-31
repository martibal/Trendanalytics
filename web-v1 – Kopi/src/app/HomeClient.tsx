// src/app/HomeClient.tsx
"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

type Chain = "bitcoin" | "ethereum" | "arbitrum" | "base";
type Genre = "gold" | "derived" | "meta";

type DatasetIndex = {
  dataset_id?: string;
  computed_at_utc?: string;
  methodology_version?: string;
  revision_id?: number;
  supported_chains?: Chain[];
  asof_by_genre_chain?: Record<Genre, Record<Chain, string>>;
};

type Manifest = {
  asof: string;
  available_days?: string[];
};

type DerivedRow = {
  date: string;
  derived?: {
    meta_confidence?: { confidence_score?: number };
  };
};

type ChainCard = {
  chain: Chain;
  asof_gold?: string;
  asof_derived?: string;
  asof_meta?: string;
  confidence_score?: number;
  manifest_gold?: Manifest;
  manifest_derived?: Manifest;
  manifest_meta?: Manifest;
};

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; dataset: DatasetIndex; cards: ChainCard[] }
  | { status: "error"; message: string; details?: string };

const CHAIN_LABEL: Record<Chain, string> = {
  bitcoin: "Bitcoin",
  ethereum: "Ethereum",
  arbitrum: "Arbitrum",
  base: "Base",
};

// Product policy expectation (descriptive only): what lag is "normal" given the pipeline.
const EXPECTED_LAG_DAYS: Record<Chain, number> = {
  bitcoin: 1,
  ethereum: 1,
  arbitrum: 7,
  base: 7,
};

function toUtcMidnightMs(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split("-").map((x) => Number(x));
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

function dayDiffUtc(aYyyyMmDd: string, bYyyyMmDd: string): number {
  // b - a (days)
  const a = toUtcMidnightMs(aYyyyMmDd);
  const b = toUtcMidnightMs(bYyyyMmDd);
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

function todayUtcYyyyMmDd(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fmtSci(x: number | undefined): string {
  if (typeof x !== "number" || !Number.isFinite(x)) return "—";
  // Keep it readable; these scores can be extremely small.
  return x.toExponential(3);
}

function badgeTone(args: { lagDays?: number; expected?: number }): string {
  const { lagDays, expected } = args;
  if (typeof lagDays !== "number" || !Number.isFinite(lagDays)) return "border-white/10 bg-white/5 text-white/80";
  if (typeof expected !== "number" || !Number.isFinite(expected)) return "border-white/10 bg-white/5 text-white/80";

  // Allow a small buffer beyond expectation.
  if (lagDays <= expected + 1) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
  if (lagDays <= expected + 5) return "border-yellow-500/30 bg-yellow-500/10 text-yellow-100";
  return "border-red-500/30 bg-red-500/10 text-red-100";
}

async function fetchJsonSafe<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} when fetching ${url}`);
  const raw = await res.text();
  // Defensive parsing for invalid tokens (NaN/Infinity). This mirrors the catalog loader.
  const sanitized = raw
    .replace(/\bNaN\b/g, "null")
    .replace(/\bInfinity\b/g, "null")
    .replace(/\b-Infinity\b/g, "null");
  return JSON.parse(sanitized) as T;
}

export default function HomeClient() {
  const baseUrl = useMemo(() => String(process.env.NEXT_PUBLIC_DATA_BASE_URL ?? "/data/published/v1"), []);

  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      try {
        const dataset = await fetchJsonSafe<DatasetIndex>(`${baseUrl}/dataset.json`);
        const supported = (dataset.supported_chains ?? ["bitcoin", "ethereum", "arbitrum", "base"]) as Chain[];

        const cards: ChainCard[] = await Promise.all(
          supported.map(async (chain) => {
            const [manifestGold, manifestDerived, manifestMeta] = await Promise.all([
              fetchJsonSafe<Manifest>(`${baseUrl}/gold/${chain}/manifest.json`),
              fetchJsonSafe<Manifest>(`${baseUrl}/derived/${chain}/manifest.json`),
              fetchJsonSafe<Manifest>(`${baseUrl}/meta/${chain}/manifest.json`).catch(() => null as unknown as Manifest),
            ]);

            // Confidence score is currently carried in derived last365d rows.
            const derivedRows = await fetchJsonSafe<DerivedRow[]>(`${baseUrl}/derived/${chain}/last365d.json`);
            const last = derivedRows.length ? derivedRows[derivedRows.length - 1] : null;
            const confidence = last?.derived?.meta_confidence?.confidence_score;

            return {
              chain,
              asof_gold: dataset.asof_by_genre_chain?.gold?.[chain],
              asof_derived: dataset.asof_by_genre_chain?.derived?.[chain],
              asof_meta: dataset.asof_by_genre_chain?.meta?.[chain],
              confidence_score: typeof confidence === "number" ? confidence : undefined,
              manifest_gold: manifestGold,
              manifest_derived: manifestDerived,
              manifest_meta: manifestMeta,
            };
          })
        );

        if (cancelled) return;
        setState({ status: "loaded", dataset, cards });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setState({ status: "error", message: "Failed to load published dataset index.", details: msg });
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  const utcToday = useMemo(() => todayUtcYyyyMmDd(), []);

  if (state.status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="text-sm text-white/70">Loading published dataset…</div>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h1 className="text-2xl font-semibold">Overview</h1>
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

  const { dataset, cards } = state;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div>
            <div className="text-sm text-white/60">CSS · descriptive on-chain trend analytics (no price)</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Overview</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/data-health"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              Data Health
            </Link>
            <Link
              href="/internal/catalog"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              Internal Catalog
            </Link>
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
            <div className="mt-1 text-sm text-white/90">
              {dataset.methodology_version ?? "—"}
              {typeof dataset.revision_id === "number" ? (
                <span className="text-white/60"> · rev {dataset.revision_id}</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold">Chains</h2>
              <div className="mt-1 text-sm text-white/60">
                Updated through is read from published manifests. Lag is shown vs <span className="font-mono">{utcToday}</span> (UTC).
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {cards.map((c) => {
              const asof = c.manifest_gold?.asof ?? c.asof_gold;
              const lagDays = asof ? dayDiffUtc(asof, utcToday) : undefined;
              const expected = EXPECTED_LAG_DAYS[c.chain];
              const tone = badgeTone({ lagDays, expected });

              return (
                <div key={c.chain} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs text-white/60">Chain</div>
                      <div className="mt-1 text-xl font-semibold tracking-tight">{CHAIN_LABEL[c.chain]}</div>
                      <div className="mt-2 text-sm text-white/60">
                        <span className="font-mono">updated_through</span>: <span className="font-mono text-white/90">{asof ?? "—"}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className={`rounded-full border px-3 py-1 text-xs ${tone}`}>
                        lag {typeof lagDays === "number" ? `${lagDays}d` : "—"} · expected {expected}d
                      </div>
                      <Link
                        href={`/chains/${c.chain}`}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                      >
                        Open analysis →
                      </Link>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xs text-white/60">meta_confidence (derived)</div>
                      <div className="mt-1 font-mono text-sm text-white/90">{fmtSci(c.confidence_score)}</div>
                      <div className="mt-2 text-xs text-white/50">
                        Descriptive gating signal. Low values should suppress notables and label regimes as withheld/unknown.
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xs text-white/60">Coverage (gold)</div>
                      <div className="mt-1 text-sm text-white/90">
                        {typeof c.manifest_gold?.available_days?.length === "number"
                          ? `${c.manifest_gold.available_days.length.toLocaleString()} days published`
                          : "—"}
                      </div>
                      <div className="mt-2 text-xs text-white/50">
                        Source: published manifest available_days; used to detect gaps and enforce minimum sample rules.
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-white/50">
                    Genres as-of (dataset index): gold {c.asof_gold ?? "—"} · derived {c.asof_derived ?? "—"} · meta {c.asof_meta ?? "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-white/50">
          This product is strictly descriptive (no price, no forecasts, no advice). All outputs must be explainable and versioned.
        </div>
      </footer>
    </div>
  );
}
