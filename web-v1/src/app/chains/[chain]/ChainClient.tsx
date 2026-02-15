"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MetricPanel } from "@/components/charts/MetricPanel";
import { ComputedRatioPanel } from "@/components/charts/ComputedRatioPanel";
import { ChainDiagnosticHeader } from "@/components/chains/ChainDiagnosticHeader";

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

type NotablesApiResponse = {
  dataset_id: string | null;
  revision_id: number | null;

  chain: Chain;
  window_days: number;
  start: string;
  end: string;

  freshness: { asof: string; lag_days: number };

  notables: Array<{
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
  }>;

  notes: string[];
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

type MetricDef =
  | { kind?: "raw"; metric: string; title: string; optional?: boolean }
  | {
      kind: "ratio";
      computedKey: string;
      title: string;
      optional?: boolean;
      numerator: string;
      denominator: string;
      subtitle?: string;
    };

type ChainMetricLayout = {
  bullets: string[];
  groups: Array<{ title: string; items: MetricDef[] }>;
};

/**
 * Taxonomy alignment to web2 chainProfiles:
 * - BTC primary: value_transferred_native, median_tx_value_native, avg_block_time_sec
 * - BTC secondary: tx_count_daily, median_tx_fee_native
 * - ETH primary: gas_utilization_pct, failed_tx_rate, median_tx_fee_native
 * - ETH secondary: tx_count_daily, unique_active_addresses, value_transferred_native
 * - ARB primary: tx_count_daily, unique_active_addresses, failed_tx_rate
 * - ARB secondary: gas_utilization_pct, median_tx_fee_native
 * - BASE primary: tx_count_daily, unique_active_addresses, tx_per_user (computed)
 * - BASE secondary: failed_tx_rate, gas_utilization_pct
 */
const METRICS_BY_CHAIN: Record<Chain, ChainMetricLayout> = {
  bitcoin: {
    bullets: [
      "Bitcoin is optimized for high-value settlement; value metrics matter more than transaction count.",
      "Fees are described as settlement friction (no price inference).",
      "Block timing provides an explicit network-health baseline (target ~600s).",
    ],
    groups: [
      {
        title: "Demand (Settlement Activity)",
        items: [
          { metric: "value_transferred_native", title: "Value transferred (native)" },
          { metric: "median_tx_value_native", title: "Median transaction value (native)" },
        ],
      },
      {
        title: "Capacity (Production Baseline)",
        items: [{ metric: "avg_block_time_sec", title: "Average block time (seconds)" }],
      },
      {
        title: "Friction (Cost to Settle)",
        items: [{ metric: "median_tx_fee_native", title: "Median transaction fee (native)" }],
      },
      {
        title: "Throughput (Context)",
        items: [{ metric: "tx_count_daily", title: "Daily transactions", optional: true }],
      },
    ],
  },

  ethereum: {
    bullets: [
      "Ethereum is capacity-constrained; utilization and failure rate describe congestion pressure.",
      "Fees are a descriptive friction signal (no forecasting, no advice).",
      "Demand breadth is shown via transactions and active addresses where coverage supports it.",
    ],
    groups: [
      {
        title: "Capacity (Blockspace Pressure)",
        items: [{ metric: "gas_utilization_pct", title: "Gas utilization" }],
      },
      {
        title: "Friction (Execution Cost & Failure)",
        items: [
          { metric: "failed_tx_rate", title: "Failed transaction rate" },
          { metric: "median_tx_fee_native", title: "Median transaction fee (native)" },
        ],
      },
      {
        title: "Demand (Usage)",
        items: [
          { metric: "tx_count_daily", title: "Daily transactions" },
          { metric: "unique_active_addresses", title: "Active addresses" },
        ],
      },
      {
        title: "Throughput (Economic Activity)",
        items: [{ metric: "value_transferred_native", title: "Value transferred (native)", optional: true }],
      },
    ],
  },

  arbitrum: {
    bullets: [
      "Arbitrum is a high-throughput execution layer; high tx counts can occur when adoption is strong.",
      "Service quality is tracked via failed transaction rate (lower values indicate fewer failed executions).",
      "Fees are described as execution friction; spikes are flagged as unusual conditions (descriptive only).",
    ],
    groups: [
      {
        title: "Demand (Usage Scale)",
        items: [
          { metric: "tx_count_daily", title: "Daily transactions" },
          { metric: "unique_active_addresses", title: "Active addresses" },
        ],
      },
      {
        title: "Capacity (Service Quality)",
        items: [{ metric: "failed_tx_rate", title: "Failed transaction rate" }],
      },
      {
        title: "Friction (Typical Cost)",
        items: [{ metric: "median_tx_fee_native", title: "Median transaction fee (native)" }],
      },
      {
        title: "Diagnostics (Completeness)",
        items: [{ metric: "gas_utilization_pct", title: "Gas utilization", optional: true }],
      },
    ],
  },

  base: {
    bullets: [
      "Base is newer in the dataset; growth and engagement depth matter more than absolute level.",
      "Transactions per user is a direct engagement-depth proxy (computed, not forecast).",
      "Capacity headroom and failure rate help explain whether onboarding demand is being handled cleanly.",
    ],
    groups: [
      {
        title: "Demand (Adoption & Engagement)",
        items: [
          { metric: "tx_count_daily", title: "Daily transactions" },
          { metric: "unique_active_addresses", title: "Active addresses" },
          {
            kind: "ratio",
            computedKey: "tx_per_user",
            title: "Transactions per user",
            subtitle: "Computed as tx_count_daily / unique_active_addresses",
            numerator: "tx_count_daily",
            denominator: "unique_active_addresses",
          },
        ],
      },
      {
        title: "Friction (User Experience)",
        items: [{ metric: "failed_tx_rate", title: "Failed transaction rate" }],
      },
      {
        title: "Capacity (Headroom)",
        items: [{ metric: "gas_utilization_pct", title: "Gas utilization", optional: true }],
      },
    ],
  },
};

async function fetchGoldManifest(chain: Chain, signal?: AbortSignal): Promise<ExportManifestResponse> {
  const res = await fetch(`/api/export/manifest?chain=${chain}&genre=gold`, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`manifest ${res.status}`);
  return (await res.json()) as ExportManifestResponse;
}

async function fetchNotables(chain: Chain, windowDays: number, signal?: AbortSignal): Promise<NotablesApiResponse> {
  const res = await fetch(`/api/notables?chain=${chain}&window=${windowDays}&limit=8`, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`notables ${res.status}`);
  return (await res.json()) as NotablesApiResponse;
}

function Pill(props: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-ui-border bg-ui-bg/20 px-3 py-1 text-[11px] font-semibold text-ui-muted">
      {props.children}
    </span>
  );
}

function DimPill(props: { label: string; value: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-ui-border bg-ui-bg/15 px-3 py-1 text-[11px]">
      <span className="text-ui-faint">{props.label}</span>
      <span className="font-mono text-ui-muted">{props.value}</span>
    </span>
  );
}

function KindPill({ k }: { k: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-ui-border bg-ui-bg/10 px-2 py-0.5 text-[10px] font-semibold text-ui-faint">
      {k}
    </span>
  );
}

function fmtMaybePct(p: number | null) {
  if (p === null || !Number.isFinite(p)) return "—";
  return `p${Math.round(p)}`;
}

export default function ChainClient(props: { chain: string; hero?: LandingHeroFileMaybe }) {
  const chain = parseChain(props.chain);

  const fallbackWindows = useMemo(() => {
    const w = props.hero?.windows_supported;
    const arr = Array.isArray(w) ? w.filter((x) => typeof x === "number" && x > 0) : [];
    const uniq = Array.from(new Set(arr));
    return uniq.length ? uniq : [7, 30, 90, 180, 365];
  }, [props.hero?.windows_supported]);

  const [windowDays, setWindowDays] = useState<number>(() => clampWindowDays(180, fallbackWindows));

  const [asofGold, setAsofGold] = useState<string | null>(() => {
    const fromHero = props.hero?.asof?.gold;
    return fromHero && isValidISODate(fromHero) ? fromHero : null;
  });
  const [datasetId, setDatasetId] = useState<string | null>(props.hero?.dataset_id ?? null);
  const [revisionId, setRevisionId] = useState<number | null>(
    typeof props.hero?.revision_id === "number" ? props.hero!.revision_id : null
  );

  const [notables, setNotables] = useState<NotablesApiResponse | null>(null);
  const [notablesError, setNotablesError] = useState<string | null>(null);

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
        if (cancelled) return;
        setAsofGold((prev) => prev);
      }
    }

    run();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [chain]);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    async function run() {
      try {
        setNotablesError(null);
        const r = await fetchNotables(chain, windowDays, ac.signal);
        if (cancelled) return;
        setNotables(r);
      } catch (e: any) {
        if (cancelled) return;
        setNotables(null);
        setNotablesError(e?.message || "notables failed");
      }
    }

    run();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [chain, windowDays]);

  const endISO = useMemo(() => (asofGold && isValidISODate(asofGold) ? asofGold : toISODateUTC(new Date())), [asofGold]);
  const startISO = useMemo(() => addDaysISO(endISO, -(windowDays - 1)), [endISO, windowDays]);
  const layout = METRICS_BY_CHAIN[chain];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      {/* Header shell (web2 dashboard style) */}
      <div className="mb-8 rounded-3xl border border-ui-border bg-ui-bg/20 p-7 ui-lift">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Pill>Descriptive only</Pill>
              <Pill>No prices</Pill>
              <Pill>No forecasts</Pill>
              <Pill>No advice</Pill>
            </div>

            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-ui-text md:text-5xl">
              {capitalize(chain)}
            </h1>
            <p className="mt-3 max-w-3xl text-pretty text-base text-ui-muted md:text-lg">
              {capitalize(chain)} — trend context and audit-ready diagnostics (price-agnostic).
            </p>

            <ul className="mt-5 space-y-1 text-sm text-ui-muted">
              {layout.bullets.map((b, i) => (
                <li key={i}>
                  <span className="text-ui-faint">•</span> {b}
                </li>
              ))}
            </ul>

            {/* Global mental model */}
            <div className="mt-6 rounded-2xl border border-ui-border bg-ui-bg/15 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-ui-faint">How to read every chart</div>
              <div className="mt-3 grid gap-2 text-sm text-ui-muted md:grid-cols-4">
                <div>
                  <span className="font-semibold text-ui-text">Daily</span> = raw day-to-day activity (noise)
                </div>
                <div>
                  <span className="font-semibold text-ui-text">MA7</span> = short-term regime (last week)
                </div>
                <div>
                  <span className="font-semibold text-ui-text">MA30</span> = structural baseline (last month)
                </div>
                <div>
                  <span className="font-semibold text-ui-text">Percentile</span> = historical placement (context)
                </div>
              </div>
              <div className="mt-2 text-xs text-ui-faint">
                Missing values render as gaps (null), never zeros. Labels are descriptive summaries only.
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3 text-xs text-ui-faint">
              <Link className="underline underline-offset-4 hover:text-ui-text" href="/chains">
                Chains →
              </Link>
              <Link className="underline underline-offset-4 hover:text-ui-text" href="/methodology">
                Methodology →
              </Link>
              <Link className="underline underline-offset-4 hover:text-ui-text" href="/wiki">
                Wiki →
              </Link>
              <Link className="underline underline-offset-4 hover:text-ui-text" href="/notables">
                Notables policy →
              </Link>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-2 flex shrink-0 flex-col items-end gap-3 md:mt-0">
            <div className="flex items-center gap-3">
              <div className="text-xs text-ui-faint">Window</div>
              <select
                className="rounded-xl border border-ui-border bg-ui-bg/20 px-3 py-2 text-sm text-ui-text outline-none focus:ring-2 focus:ring-ui-accent/30"
                value={windowDays}
                onChange={(e) => setWindowDays(clampWindowDays(Number(e.target.value), fallbackWindows))}
              >
                {fallbackWindows.map((w) => (
                  <option key={w} value={w}>
                    {w}d
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <DimPill
                label="Window"
                value={
                  <>
                    {startISO} → {endISO}
                  </>
                }
              />
              {asofGold ? <DimPill label="as-of" value={asofGold} /> : null}
              {datasetId ? <DimPill label="dataset_id" value={datasetId} /> : null}
              {typeof revisionId === "number" ? <DimPill label="revision" value={revisionId} /> : null}
            </div>

            <div className="text-[11px] text-ui-faint">Descriptive only · No prices · No forecasts · No advice</div>
          </div>
        </div>
      </div>

      {/* ✅ Web2: chain-level regime context + narrative summary */}
      <ChainDiagnosticHeader chain={chain} windowDays={windowDays} start={startISO} end={endISO} />

      {/* ✅ Web2: Notables (top flags) */}
      <div className="mt-8 rounded-3xl border border-ui-border bg-ui-bg/20 p-7 ui-lift">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-ui-faint">Notables</div>
            <h2 className="mt-2 text-2xl font-semibold text-ui-text">Descriptive flags for the selected window</h2>
            <p className="mt-2 max-w-3xl text-sm text-ui-muted">
              These are rule-based flags driven by level (percentile), trend (MA30 slope), volatility, and explicit data-quality checks.
              They are descriptive summaries only.
            </p>
          </div>

          <div className="mt-2 flex flex-wrap justify-end gap-2 md:mt-0">
            {notables?.freshness?.asof ? <DimPill label="notables as-of" value={notables.freshness.asof} /> : null}
            {typeof notables?.freshness?.lag_days === "number" ? <DimPill label="lag" value={`${notables.freshness.lag_days}d`} /> : null}
          </div>
        </div>

        {notablesError ? (
          <div className="mt-5 rounded-2xl border border-ui-border bg-ui-bg/15 p-4 text-sm text-ui-muted">
            Notables could not be loaded. ({notablesError})
          </div>
        ) : !notables ? (
          <div className="mt-5 rounded-2xl border border-ui-border bg-ui-bg/15 p-4 text-sm text-ui-muted">
            Loading notables…
          </div>
        ) : notables.notables.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-ui-border bg-ui-bg/15 p-4 text-sm text-ui-muted">
            No notables available for this snapshot.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4">
            {notables.notables.map((n) => (
              <div key={n.metric} className="rounded-2xl border border-ui-border bg-ui-bg/15 p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ui-text">{n.label}</div>
                    <div className="mt-1 text-xs text-ui-faint">
                      <span className="font-mono">{n.metric}</span> · {n.category}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {n.kind.map((k) => (
                      <KindPill key={k} k={k} />
                    ))}
                  </div>
                </div>

                <div className="mt-3 text-sm text-ui-muted">{n.interpretation.basic}</div>

                <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-ui-faint">
                  <span className="rounded-full border border-ui-border bg-ui-bg/10 px-2 py-0.5">
                    Level: {n.signals.level.label} {fmtMaybePct(n.signals.level.percentile)}
                  </span>
                  <span className="rounded-full border border-ui-border bg-ui-bg/10 px-2 py-0.5">
                    Trend: {n.signals.trend.strength} {n.signals.trend.label}
                  </span>
                  <span className="rounded-full border border-ui-border bg-ui-bg/10 px-2 py-0.5">
                    Variability: {n.signals.volatility.label}
                  </span>
                  <span className="rounded-full border border-ui-border bg-ui-bg/10 px-2 py-0.5">
                    Coverage: {n.signals.coverage.present_days}/{n.signals.coverage.expected_days} (
                    {Math.round(n.signals.coverage.nonNull_ratio * 100)}%)
                  </span>
                </div>

                {n.caveats.length ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-ui-faint">
                    {n.caveats.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-3 text-xs text-ui-faint">
                  <a className="underline underline-offset-4 hover:text-ui-text" href={n.links.methodology}>
                    Methodology →
                  </a>
                  <a className="underline underline-offset-4 hover:text-ui-text" href={n.links.wiki}>
                    Wiki →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {notables?.notes?.length ? (
          <div className="mt-6 rounded-2xl border border-ui-border bg-ui-bg/10 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ui-faint">Notes</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ui-faint">
              {notables.notes.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* Vertical stacking for metric panels */}
      <div className="mt-10 space-y-12">
        {layout.groups.map((g) => (
          <section key={g.title} className="space-y-4">
            <h2 className="text-xl font-semibold text-ui-text">{g.title}</h2>

            <div className="grid grid-cols-1 gap-6">
              {g.items.map((it) => {
                if ((it as any).kind === "ratio") {
                  const r = it as Extract<MetricDef, { kind: "ratio" }>;
                  return (
                    <ComputedRatioPanel
                      key={r.computedKey}
                      chain={chain}
                      computedKey={r.computedKey}
                      title={r.title}
                      subtitle={r.subtitle}
                      numeratorMetric={r.numerator}
                      denominatorMetric={r.denominator}
                      start={startISO}
                      end={endISO}
                      hideIfLowCoverage={Boolean(r.optional)}
                    />
                  );
                }

                const m = it as Extract<MetricDef, { metric: string }>;
                return (
                  <MetricPanel
                    key={m.metric}
                    chain={chain}
                    metric={m.metric}
                    start={startISO}
                    end={endISO}
                    title={m.title}
                    hideIfLowCoverage={Boolean(m.optional)}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}