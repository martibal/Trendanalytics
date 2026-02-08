"use client";

import React, { useEffect, useMemo, useState } from "react";

type Chain = "bitcoin" | "ethereum" | "arbitrum" | "base";

type Notable = {
  metric: string;
  label: string;
  category: string;
  score: number;
  kind: Array<"Level" | "Trend" | "Volatility" | "DataQuality">;
  signals: {
    level: { label: "Low" | "Typical" | "Elevated" | "Extreme"; percentile: number | null; method: "meta_percentile" | "window_rank" };
    trend: { label: "Rising" | "Falling" | "Flat"; strength: "Weak" | "Moderate" | "Strong"; slope_ma30: number | null };
    volatility: { label: "Stable" | "Variable" | "Highly variable"; cv_daily: number | null };
    coverage: { expected_days: number; present_days: number; missing_days: string[]; nonNull_ratio: number };
    freshness: { asof: string; lag_days: number };
  };
  interpretation: { basic: string; advanced: string[] };
  caveats: string[];
  links: { methodology: string; wiki: string };
};

type ApiResponse = {
  dataset_id: string | null;
  revision_id: number | null;
  chain: Chain;
  window_days: number;
  start: string;
  end: string;
  freshness: { asof: string; lag_days: number };
  notables: Notable[];
  notes: string[];
};

function buildUrl(chain: Chain, windowDays: number, limit: number) {
  const sp = new URLSearchParams();
  sp.set("chain", chain);
  sp.set("window", String(windowDays));
  sp.set("limit", String(limit));
  return `/api/notables?${sp.toString()}`;
}

function Chip(props: { text: string; tone?: "neutral" | "warn" }) {
  const tone = props.tone ?? "neutral";
  const cls =
    tone === "warn"
      ? "border-amber-400/25 bg-amber-400/10 text-amber-100"
      : "border-white/10 bg-black/20 text-white/80";
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] ${cls}`}>{props.text}</span>;
}

export default function NotablesPage() {
  const [chain, setChain] = useState<Chain>("bitcoin");
  const [windowDays, setWindowDays] = useState<number>(30);
  const [limit, setLimit] = useState<number>(12);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const url = useMemo(() => buildUrl(chain, windowDays, limit), [chain, windowDays, limit]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(url);
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`HTTP ${res.status}: ${t}`);
        }
        const j = (await res.json()) as ApiResponse;
        if (!cancelled) {
          setData(j);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || "Failed to load notables.");
          setData(null);
          setLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 rounded-2xl border border-white/10 bg-black/20 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Notables</h1>
            <p className="mt-2 text-sm text-white/70">
              Descriptive flags for historically unusual, persistent changes. No prices, forecasts, or recommendations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs text-white/60">Chain</div>
            <select
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              value={chain}
              onChange={(e) => setChain(e.target.value as Chain)}
            >
              <option value="bitcoin">bitcoin</option>
              <option value="ethereum">ethereum</option>
              <option value="arbitrum">arbitrum</option>
              <option value="base">base</option>
            </select>

            <div className="text-xs text-white/60">Window</div>
            <select
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              value={String(windowDays)}
              onChange={(e) => setWindowDays(parseInt(e.target.value, 10))}
            >
              <option value="7">7d</option>
              <option value="30">30d</option>
              <option value="90">90d</option>
              <option value="180">180d</option>
              <option value="365">365d</option>
            </select>

            <div className="text-xs text-white/60">Limit</div>
            <select
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              value={String(limit)}
              onChange={(e) => setLimit(parseInt(e.target.value, 10))}
            >
              <option value="8">8</option>
              <option value="12">12</option>
              <option value="20">20</option>
            </select>
          </div>
        </div>

        {data ? (
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/70">
            <Chip text={`Window: ${data.start} → ${data.end}`} />
            <Chip text={`Freshness: as-of ${data.freshness.asof} (lag ${data.freshness.lag_days}d)`} tone={data.freshness.lag_days >= 7 ? "warn" : "neutral"} />
            {data.dataset_id ? <Chip text={`dataset_id: ${data.dataset_id}`} /> : null}
            {typeof data.revision_id === "number" ? <Chip text={`revision: ${data.revision_id}`} /> : null}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-white/70">Loading notables…</div>
      ) : err ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">{err}</div>
      ) : data && data.notables.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-white/70">
          No notables triggered for this chain and window. This can happen when signals are typical and/or coverage is limited.
        </div>
      ) : (
        <>
          {data ? (
            <section className="mb-8 rounded-2xl border border-white/10 bg-black/20 p-6">
              <h2 className="text-lg font-semibold text-white">Policy notes</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/75">
                {data.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2">
            {data!.notables.map((n) => (
              <article key={n.metric} className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-white/60">{n.category}</div>
                    <h3 className="mt-1 text-lg font-semibold text-white">{n.label}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {n.kind.map((k) => (
                        <Chip key={k} text={k} tone={k === "DataQuality" ? "warn" : "neutral"} />
                      ))}
                      <Chip text={`Score: ${n.score}`} />
                    </div>
                  </div>

                  <div className="text-right text-xs text-white/60">
                    <div>
                      Level: <span className="text-white/80">{n.signals.level.label}</span>
                      {n.signals.level.percentile !== null ? (
                        <span className="text-white/50"> (p{Math.round(n.signals.level.percentile)})</span>
                      ) : (
                        <span className="text-white/50"> (—)</span>
                      )}
                    </div>
                    <div>
                      Trend: <span className="text-white/80">{n.signals.trend.strength} {n.signals.trend.label}</span>
                    </div>
                    <div>
                      Vol: <span className="text-white/80">{n.signals.volatility.label}</span>
                    </div>
                    <div>
                      Coverage:{" "}
                      <span className="text-white/80">
                        {n.signals.coverage.present_days}/{n.signals.coverage.expected_days}
                      </span>
                      <span className="text-white/50"> · non-null {(n.signals.coverage.nonNull_ratio * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="text-[11px] uppercase tracking-wide text-white/50">Basic</div>
                  <div className="mt-2 text-sm text-white/85">{n.interpretation.basic}</div>

                  <details className="mt-3">
                    <summary className="cursor-pointer select-none text-xs font-semibold text-white/80">Advanced details</summary>
                    <div className="mt-2 space-y-1 text-xs text-white/70">
                      {n.interpretation.advanced.map((x, i) => (
                        <div key={i}>• {x}</div>
                      ))}

                      {n.caveats.length > 0 ? (
                        <div className="mt-2 rounded-lg border border-white/10 bg-white/5 p-2">
                          <div className="text-[11px] uppercase tracking-wide text-white/50">Caveats</div>
                          <div className="mt-1 space-y-1">
                            {n.caveats.map((c, i) => (
                              <div key={i}>- {c}</div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </details>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/70">
                  <a className="underline underline-offset-2 hover:text-white" href={n.links.methodology}>
                    Methodology
                  </a>
                  <a className="underline underline-offset-2 hover:text-white" href={n.links.wiki}>
                    Wiki
                  </a>
                  <span className="ml-auto font-mono text-[11px] text-white/50">{n.metric}</span>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </main>
  );
}