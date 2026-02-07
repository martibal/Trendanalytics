"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MetricPanel } from "@/components/charts/MetricPanel";

type Chain = "bitcoin" | "ethereum" | "arbitrum" | "base";

type ExportManifestResponse = {
  dataset_id: string | null;
  revision_id: number | null;
  chain: Chain;
  genre: "gold" | "meta" | "derived";
  data: {
    asof?: string;
    available_days?: string[];
    [k: string]: any;
  };
};

type LandingHeroFileMaybe = {
  dataset_id?: string;
  revision_id?: number;
  windows_supported?: number[];
  asof?: Record<string, string>;
};

function isValidISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toISODateUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return toISODateUTC(dt);
}

function parseChain(s: string): Chain {
  const v = (s || "").toLowerCase();
  if (v === "bitcoin" || v === "ethereum" || v === "arbitrum" || v === "base") return v;
  return "bitcoin";
}

function capitalize(s: string) {
  return s ? s.slice(0, 1).toUpperCase() + s.slice(1) : s;
}

function clampWindowDays(n: number, supported: number[]) {
  if (!Number.isFinite(n)) return supported[0] ?? 30;
  if (!supported.length) return n;
  if (supported.includes(n)) return n;

  let best = supported[0];
  let bestDist = Math.abs(best - n);
  for (const w of supported) {
    const d = Math.abs(w - n);
    if (d < bestDist) {
      best = w;
      bestDist = d;
    }
  }
  return best;
}

type MetricDef = {
  metric: string;
  title: string;
  optional?: boolean;
};

type ChainMetricLayout = {
  bullets: string[];
  groups: Array<{ title: string; items: MetricDef[] }>;
};

const METRICS_BY_CHAIN: Record<Chain, ChainMetricLayout> = {
  bitcoin: {
    bullets: [
      "Settlement cadence and throughput, observed via activity and block production.",
      "Fee pressure as a descriptive execution-cost signal (no price proxies).",
      "Reliability diagnostics from block timing and output.",
    ],
    groups: [
      { title: "Core Activity", items: [{ metric: "tx_count_daily", title: "Daily transactions" }, { metric: "unique_active_addresses", title: "Active addresses", optional: true }] },
      { title: "Execution & Cost", items: [{ metric: "median_tx_fee_native", title: "Median transaction fee (native)" }] },
      { title: "Reliability", items: [{ metric: "avg_block_time_sec", title: "Average block time (seconds)" }, { metric: "block_count_daily", title: "Blocks per day" }] },
      { title: "Value / Throughput", items: [{ metric: "value_transferred_native", title: "Value transferred (native)", optional: true }, { metric: "median_tx_value_native", title: "Median transaction value (native)", optional: true }] },
    ],
  },
  ethereum: {
    bullets: [
      "Execution conditions and demand, with utilization as a capacity-pressure signal.",
      "Cost and reliability diagnostics (descriptive; no forecasts or advice).",
      "Participation breadth and throughput where coverage supports it.",
    ],
    groups: [
      { title: "Core Activity", items: [{ metric: "tx_count_daily", title: "Daily transactions" }, { metric: "unique_active_addresses", title: "Active addresses", optional: true }] },
      { title: "Execution & Cost", items: [{ metric: "gas_utilization_pct", title: "Gas utilization" }, { metric: "median_tx_fee_native", title: "Median transaction fee (native)" }, { metric: "failed_tx_rate", title: "Failed transaction rate", optional: true }] },
      { title: "Reliability", items: [{ metric: "avg_block_time_sec", title: "Average block time (seconds)" }, { metric: "block_count_daily", title: "Blocks per day", optional: true }] },
      { title: "Value / Throughput", items: [{ metric: "value_transferred_native", title: "Value transferred (native)", optional: true }, { metric: "median_tx_value_native", title: "Median transaction value (native)", optional: true }] },
    ],
  },
  arbitrum: {
    bullets: [
      "Rollup usage and demand, interpreted with explicit indexing lag/coverage.",
      "User-facing cost and capacity pressure in native units (no price proxies).",
      "Operational regularity signals to detect persistent changes, not spikes.",
    ],
    groups: [
      { title: "Core Activity", items: [{ metric: "tx_count_daily", title: "Daily transactions" }, { metric: "unique_active_addresses", title: "Active addresses", optional: true }] },
      { title: "Execution & Cost", items: [{ metric: "gas_utilization_pct", title: "Gas utilization", optional: true }, { metric: "median_tx_fee_native", title: "Median transaction fee (native)" }, { metric: "failed_tx_rate", title: "Failed transaction rate", optional: true }] },
      { title: "Reliability", items: [{ metric: "avg_block_time_sec", title: "Average block time (seconds)", optional: true }, { metric: "block_count_daily", title: "Blocks per day", optional: true }] },
      { title: "Value / Throughput", items: [{ metric: "value_transferred_native", title: "Value transferred (native)", optional: true }, { metric: "median_tx_value_native", title: "Median transaction value (native)", optional: true }] },
    ],
  },
  base: {
    bullets: [
      "Consumer-style usage signals and capacity context, without any price data.",
      "Cost and reliability metrics used as descriptive friction/health proxies.",
      "Throughput context (value transferred) where coverage supports it.",
    ],
    groups: [
      { title: "Core Activity", items: [{ metric: "tx_count_daily", title: "Daily transactions" }, { metric: "unique_active_addresses", title: "Active addresses", optional: true }] },
      { title: "Execution & Cost", items: [{ metric: "gas_utilization_pct", title: "Gas utilization", optional: true }, { metric: "median_tx_fee_native", title: "Median transaction fee (native)" }, { metric: "failed_tx_rate", title: "Failed transaction rate", optional: true }] },
      { title: "Reliability", items: [{ metric: "avg_block_time_sec", title: "Average block time (seconds)", optional: true }, { metric: "block_count_daily", title: "Blocks per day", optional: true }] },
      { title: "Value / Throughput", items: [{ metric: "value_transferred_native", title: "Value transferred (native)", optional: true }, { metric: "median_tx_value_native", title: "Median transaction value (native)", optional: true }] },
    ],
  },
};

async function fetchGoldManifest(chain: Chain, signal?: AbortSignal): Promise<ExportManifestResponse> {
  const res = await fetch(`/api/export/manifest?chain=${chain}&genre=gold`, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`manifest ${res.status}`);
  return (await res.json()) as ExportManifestResponse;
}

export default function ChainClient(props: { chain: string; hero?: LandingHeroFileMaybe }) {
  const chain = parseChain(props.chain);

  // Window options (fallback), can be refined later if you publish supported windows.
  const fallbackWindows = useMemo(() => [7, 30, 90, 180, 365], []);

  // Default per spec: 180d; clamp to available options.
  const [windowDays, setWindowDays] = useState<number>(() => clampWindowDays(180, fallbackWindows));

  // As-of / audit (prefer passed hero if present; otherwise fetch manifest)
  const [asofGold, setAsofGold] = useState<string | null>(() => {
    const fromHero = props.hero?.asof?.gold;
    return fromHero && isValidISODate(fromHero) ? fromHero : null;
  });
  const [datasetId, setDatasetId] = useState<string | null>(props.hero?.dataset_id ?? null);
  const [revisionId, setRevisionId] = useState<number | null>(typeof props.hero?.revision_id === "number" ? props.hero!.revision_id : null);

  // IMPORTANT: No landing_hero.json fetch anymore. Only manifest.
  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    async function run() {
      try {
        const m = await fetchGoldManifest(chain, ac.signal);
        if (cancelled) return;

        const a = m?.data?.asof;
        setAsofGold(a && isValidISODate(a) ? a : null);
        setDatasetId(m.dataset_id ?? null);
        setRevisionId(typeof m.revision_id === "number" ? m.revision_id : null);
      } catch {
        // non-fatal: page can still render; panels can use end fallback.
        if (cancelled) return;
        setAsofGold((prev) => prev); // keep prior if any
      }
    }

    run();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [chain]);

  const endISO = useMemo(() => (asofGold && isValidISODate(asofGold) ? asofGold : toISODateUTC(new Date())), [asofGold]);

  // Derived window start, inclusive.
  const startISO = useMemo(() => addDaysISO(endISO, -(windowDays - 1)), [endISO, windowDays]);

  const layout = METRICS_BY_CHAIN[chain];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 rounded-2xl border border-white/10 bg-black/20 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">{capitalize(chain)}</h1>
            <p className="mt-2 text-sm text-white/70">
              {capitalize(chain)} — Trends & context (price-agnostic)
            </p>

            <ul className="mt-4 space-y-1 text-sm text-white/70">
              {layout.bullets.map((b, i) => (
                <li key={i}>• {b}</li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex items-center gap-3 md:mt-0">
            <div className="text-xs text-white/60">Window</div>
            <select
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              value={windowDays}
              onChange={(e) => setWindowDays(clampWindowDays(Number(e.target.value), fallbackWindows))}
            >
              {fallbackWindows.map((w) => (
                <option key={w} value={w}>
                  {w}d
                </option>
              ))}
            </select>
            {asofGold && <div className="text-xs text-white/60">as-of {asofGold}</div>}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/70">
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
            Window: <span className="font-mono text-white/85">{startISO}</span> →{" "}
            <span className="font-mono text-white/85">{endISO}</span>
          </span>
          {datasetId ? (
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
              dataset_id: <span className="font-mono text-white/85">{datasetId}</span>
            </span>
          ) : null}
          {typeof revisionId === "number" ? (
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
              revision: <span className="font-mono text-white/85">{revisionId}</span>
            </span>
          ) : null}
        </div>

        <div className="mt-3 text-xs text-white/50">Descriptive only · No prices · No forecasts · No advice</div>
      </div>

      <div className="space-y-10">
        {layout.groups.map((g) => (
          <section key={g.title} className="space-y-4">
            <h2 className="text-xl font-semibold text-white">{g.title}</h2>

            <div className="grid gap-6 md:grid-cols-2">
              {g.items.map((it) => (
                <MetricPanel
                  key={it.metric}
                  chain={chain}
                  metric={it.metric}
                  start={startISO}
                  end={endISO}
                  title={it.title}
                  hideIfLowCoverage={Boolean(it.optional)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}