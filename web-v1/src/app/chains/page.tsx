// src/app/chains/page.tsx
"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

type ChainSlug = "bitcoin" | "ethereum" | "arbitrum" | "base";

type Chain = {
  slug: ChainSlug;
  name: string;
  tagline: string;
  bullets: string[];
};

const CHAINS: Chain[] = [
  {
    slug: "bitcoin",
    name: "Bitcoin",
    tagline: "Settlement cadence and throughput (no price proxies).",
    bullets: ["Core activity & block output", "Fees (native units)", "Reliability diagnostics"],
  },
  {
    slug: "ethereum",
    name: "Ethereum",
    tagline: "Execution conditions and demand vs capacity (descriptive only).",
    bullets: ["Gas utilization (when available)", "Fees (native units)", "Reliability & activity breadth"],
  },
  {
    slug: "arbitrum",
    name: "Arbitrum",
    tagline: "L2 throughput and execution diagnostics with delayed feed labeling.",
    bullets: ["Throughput & activity", "Fees (native units)", "Optional reliability metrics (coverage-gated)"],
  },
  {
    slug: "base",
    name: "Base",
    tagline: "L2 throughput and execution diagnostics with delayed feed labeling.",
    bullets: ["Throughput & activity", "Fees (native units)", "Optional reliability metrics (coverage-gated)"],
  },
];

type ManifestExport = {
  dataset_id: string | null;
  revision_id: string | null;
  chain: ChainSlug;
  genre: "gold" | "meta" | "derived";
  manifest: {
    asof?: string;
    available_days?: string[];
    [k: string]: any;
  };
};

function Card(props: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur">
      {props.children}
    </div>
  );
}

function buildUrl(path: string, params: Record<string, string>) {
  const sp = new URLSearchParams(params);
  return `${path}?${sp.toString()}`;
}

function isValidISODate(s: string | null | undefined) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function resolveAsof(man: ManifestExport): string | null {
  const asof = man?.manifest?.asof;
  if (isValidISODate(asof)) return asof as string;

  const days = man?.manifest?.available_days;
  const last = Array.isArray(days) && days.length ? days[days.length - 1] : null;
  if (isValidISODate(last)) return last as string;

  return null;
}

function utcTodayISO() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function diffDaysUTC(aISO: string, bISO: string): number {
  const [ay, am, ad] = aISO.split("-").map((x) => parseInt(x, 10));
  const [by, bm, bd] = bISO.split("-").map((x) => parseInt(x, 10));
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.round((a - b) / (24 * 60 * 60 * 1000));
}

function lagLabel(chain: ChainSlug, lagDays: number | null): string {
  if (chain === "arbitrum" || chain === "base") return "Delayed feed (≈ 1 week)";
  if (lagDays !== null && lagDays <= 2) return "Near-real-time (daily)";
  if (lagDays !== null) return `Delayed feed (lag ${lagDays}d)`;
  return "Freshness unknown";
}

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url} HTTP ${r.status}`);
  return (await r.json()) as T;
}

type Trust = {
  loading: boolean;
  error: string | null;
  asof: string | null;
  lagDays: number | null;
  lagText: string;
  dataset_id: string | null;
  revision_id: string | null;
};

export default function ChainsIndexPage() {
  const [trust, setTrust] = useState<Record<ChainSlug, Trust>>(() => {
    const init: any = {};
    for (const c of CHAINS) {
      init[c.slug] = {
        loading: true,
        error: null,
        asof: null,
        lagDays: null,
        lagText: "Loading…",
        dataset_id: null,
        revision_id: null,
      };
    }
    return init;
  });

  useEffect(() => {
    let cancelled = false;

    async function loadOne(chain: ChainSlug) {
      try {
        const url = buildUrl("/api/export/manifest", { chain, genre: "gold" });
        const res = await fetchJson<ManifestExport>(url);

        const asofResolved = resolveAsof(res);
        const today = utcTodayISO();
        const lagDays = asofResolved ? Math.max(0, diffDaysUTC(today, asofResolved)) : null;

        if (!cancelled) {
          setTrust((prev) => ({
            ...prev,
            [chain]: {
              loading: false,
              error: null,
              asof: asofResolved,
              lagDays,
              lagText: lagLabel(chain, lagDays),
              dataset_id: res.dataset_id ?? null,
              revision_id: res.revision_id ?? null,
            },
          }));
        }
      } catch (e: any) {
        if (!cancelled) {
          setTrust((prev) => ({
            ...prev,
            [chain]: {
              ...prev[chain],
              loading: false,
              error: e?.message || "Failed to load manifest",
              lagText: "Manifest unavailable",
            },
          }));
        }
      }
    }

    for (const c of CHAINS) loadOne(c.slug);

    return () => {
      cancelled = true;
    };
  }, []);

  const chainCards = useMemo(() => {
    return CHAINS.map((c) => {
      const t = trust[c.slug];
      const asof = t.asof;

      const rawDaily = asof ? buildUrl("/api/export/daily", { chain: c.slug, genre: "gold", date: asof }) : null;
      const rawWindow = buildUrl("/api/export/window", { chain: c.slug, genre: "gold", window: "365" });
      const rawManifest = buildUrl("/api/export/manifest", { chain: c.slug, genre: "gold" });

      return { ...c, trust: t, rawDaily, rawWindow, rawManifest };
    });
  }, [trust]);

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold text-white">Chains</h1>
        <p className="text-sm text-white/70">
          Dashboards for each chain use a fixed metric set and show descriptive context (Level / Trend / Stability).
          Optional metrics are hidden deterministically when coverage is insufficient.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {chainCards.map((c) => (
          <Card key={c.slug}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-white">{c.name}</div>
                <div className="mt-1 text-sm text-white/70">{c.tagline}</div>
              </div>

              <Link
                href={`/chains/${c.slug}`}
                className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white/80 hover:border-white/20 hover:text-white"
              >
                Open →
              </Link>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/70">
              {c.trust.loading ? (
                <div>Loading manifest…</div>
              ) : c.trust.error ? (
                <div className="text-red-200">Manifest error: {c.trust.error}</div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    as-of <span className="font-mono text-white/85">{c.trust.asof ?? "—"}</span>{" "}
                    <span className="text-white/50">· {c.trust.lagText}</span>
                  </div>
                  <div className="font-mono text-[10px] text-white/45">
                    {c.trust.dataset_id ?? "—"} · rev {c.trust.revision_id ?? "—"}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/70">
              <span className="text-white/50">Raw exports:</span>

              {c.rawDaily ? (
                <a className="underline underline-offset-4 hover:text-white" href={c.rawDaily} target="_blank" rel="noreferrer">
                  gold daily (as-of)
                </a>
              ) : (
                <span className="text-white/40">gold daily (as-of)</span>
              )}

              <a className="underline underline-offset-4 hover:text-white" href={c.rawWindow} target="_blank" rel="noreferrer">
                gold last365d
              </a>

              <a className="underline underline-offset-4 hover:text-white" href={c.rawManifest} target="_blank" rel="noreferrer">
                gold manifest
              </a>
            </div>

            <ul className="mt-4 space-y-2 text-sm text-white/70">
              {c.bullets.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-white/40">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/70">
              <Link className="underline underline-offset-4 hover:text-white" href={`/chains/${c.slug}`}>
                Dashboard
              </Link>
              <Link className="underline underline-offset-4 hover:text-white" href="/methodology">
                Methodology
              </Link>
              <Link className="underline underline-offset-4 hover:text-white" href="/wiki">
                Wiki
              </Link>
              <Link className="underline underline-offset-4 hover:text-white" href="/about">
                About / contract
              </Link>
            </div>
          </Card>
        ))}
      </section>

      <footer className="pb-6 text-xs text-white/50">
        Descriptive only · No prices · No forecasts · Auditable via dataset_id and revision_id
      </footer>
    </main>
  );
}