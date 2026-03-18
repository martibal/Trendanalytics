// src/app/chains/[chain]/ChainClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { MetricPanel } from "@/components/charts/MetricPanel";
import { ComputedRatioPanel } from "@/components/charts/ComputedRatioPanel";
import { ChainDiagnosticHeader } from "@/components/chains/ChainDiagnosticHeader";
import { ThresholdPanel } from "@/components/thresholds/ThresholdPanel";

// web6
import { TrustSection } from "@/components/trust/TrustSection";
import type { HistoryApiResponse } from "@/components/trust/types";

import type { MetaFile } from "@/lib/types";
import type { CustomRegimeResult } from "@/lib/customThresholds/evaluate";
import type { ThresholdConfigOverridesV1 } from "@/lib/customThresholds/schema";

type Chain = "bitcoin" | "ethereum" | "arbitrum" | "base";
type ExportManifestGenre = "gold" | "meta" | "derived";

/**
 * NOTE:
 * Repoet har to varianter av manifest-respons:
 * - { manifest: {...} } (f.eks. src/lib/data.ts og flere callsites)
 * - { data: {...} }     (eldre/alternativ implementasjon)
 * Vi støtter begge deterministisk: manifest > data.
 */
type ExportManifestResponse = {
  dataset_id: string | null;
  revision_id: number | null;
  chain: Chain;
  genre: ExportManifestGenre;

  // preferred
  manifest?: {
    asof?: string;
    available_days?: string[];
    [k: string]: unknown;
  } | null;

  // legacy / alternate
  data?: {
    asof?: string;
    available_days?: string[];
    [k: string]: unknown;
  } | null;
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

type ExportWindowResponse = {
  dataset_id: string | null;
  revision_id: number | null;
  chain: Chain;
  genre: "gold" | "meta" | "derived";
  window: string;
  data: unknown;
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

type AllowedWindow = 7 | 30 | 90 | 180 | 365;

function isAllowedWindow(n: number): n is AllowedWindow {
  return n === 7 || n === 30 || n === 90 || n === 180 || n === 365;
}

function clampWindowToExport(windowDays: number): AllowedWindow {
  if (isAllowedWindow(windowDays)) return windowDays;

  const allowed: AllowedWindow[] = [7, 30, 90, 180, 365];
  let best: AllowedWindow = 180;
  let bestDist = Infinity;

  for (const w of allowed) {
    const d = Math.abs(w - windowDays);
    if (d < bestDist) {
      best = w;
      bestDist = d;
    }
  }
  return best;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  if (Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function getString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length ? v : null;
}

function normalizeManifest(resp: ExportManifestResponse): NonNullable<ExportManifestResponse["manifest"]> | null {
  // prefer canonical field
  if (resp && resp.manifest && typeof resp.manifest === "object") return resp.manifest;
  // fallback for legacy shape
  if (resp && resp.data && typeof resp.data === "object") return resp.data;
  return null;
}

async function fetchManifest(chain: Chain, genre: ExportManifestGenre, signal?: AbortSignal): Promise<ExportManifestResponse> {
  const res = await fetch(`/api/export/manifest?chain=${chain}&genre=${genre}`, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`manifest ${genre} HTTP ${res.status}`);
  return (await res.json()) as ExportManifestResponse;
}

async function fetchNotables(chain: Chain, windowDays: number, signal?: AbortSignal): Promise<NotablesApiResponse> {
  const res = await fetch(`/api/notables?chain=${chain}&window_days=${windowDays}`, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`notables HTTP ${res.status}`);
  return (await res.json()) as NotablesApiResponse;
}

async function fetchMetaWindow(chain: Chain, windowDays: number, signal?: AbortSignal): Promise<MetaFile | null> {
  const w = clampWindowToExport(windowDays);
  const res = await fetch(`/api/export/window?chain=${chain}&genre=meta&window=${w}`, { signal, cache: "no-store" });
  if (!res.ok) return null;

  const j = (await res.json()) as ExportWindowResponse;
  const rec = asRecord(j?.data);
  if (!rec) return null;

  const chainStr = getString(rec["chain"]);
  if (!chainStr) return null;

  return j.data as MetaFile;
}

function readMetaAsof(meta: MetaFile | null): string | null {
  if (!meta) return null;
  const a = meta?.regime?.asof_date ?? meta?.confidence?.asof_date ?? null;
  return typeof a === "string" && a.trim().length ? a : null;
}

function safeParseJson<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function storageKeyEnabled(chain: Chain) {
  return `regime.custom.enabled.${chain}`;
}
function storageKeyOverrides(chain: Chain) {
  return `regime.custom.overrides.${chain}`;
}

type MetricDef =
  | { kind?: "raw"; metric: string; title: string; optional?: boolean }
  | {
      kind: "ratio";
      computedKey: string;
      title: string;
      numerator: string;
      denominator: string;
      optional?: boolean;
    };

/**
 * IMPORTANT:
 * These metric keys must exist in:
 * - public/data/published/v1/gold/<chain>/latest.json
 * - src/lib/metrics/catalog.ts (requireMetric)
 *
 * Current published set (union): 9 keys:
 * tx_count_daily, unique_active_addresses, value_transferred_native,
 * median_tx_fee_native, median_tx_value_native, failed_tx_rate,
 * gas_utilization_pct, block_count_daily, avg_block_time_sec
 */
const METRICS_BY_CHAIN: Record<Chain, { bullets: string[]; panels: MetricDef[] }> = {
  bitcoin: {
    bullets: [
      "Focus: activity, typical fees, and utilization context (descriptive-only).",
      "Use persistence (MA7/MA30) and historical context to distinguish noise vs durable shifts.",
      "No price data, no forecasts, no recommendations.",
    ],
    panels: [
      { metric: "tx_count_daily", title: "Transactions (daily)" },
      { metric: "unique_active_addresses", title: "Unique active addresses" },
      { metric: "value_transferred_native", title: "Value transferred (native)" },
      { metric: "median_tx_fee_native", title: "Median tx fee (native)" },
      { metric: "median_tx_value_native", title: "Median tx value (native)" },
      { metric: "failed_tx_rate", title: "Failed tx rate" },
      { metric: "gas_utilization_pct", title: "Utilization (%)" },
      { metric: "block_count_daily", title: "Blocks (daily)" },
      { metric: "avg_block_time_sec", title: "Avg block time (sec)" },
      {
        kind: "ratio",
        computedKey: "value_per_tx",
        title: "Value per transaction (native)",
        numerator: "value_transferred_native",
        denominator: "tx_count_daily",
        optional: true,
      },
    ],
  },
  ethereum: {
    bullets: [
      "Focus: activity, typical fees, and utilization context (descriptive-only).",
      "Use persistence (MA7/MA30) and historical context to distinguish noise vs durable shifts.",
      "No price data, no forecasts, no recommendations.",
    ],
    panels: [
      { metric: "tx_count_daily", title: "Transactions (daily)" },
      { metric: "unique_active_addresses", title: "Unique active addresses" },
      { metric: "value_transferred_native", title: "Value transferred (native)" },
      { metric: "median_tx_fee_native", title: "Median tx fee (native)" },
      { metric: "median_tx_value_native", title: "Median tx value (native)" },
      { metric: "failed_tx_rate", title: "Failed tx rate" },
      { metric: "gas_utilization_pct", title: "Utilization (%)" },
      { metric: "block_count_daily", title: "Blocks (daily)" },
      { metric: "avg_block_time_sec", title: "Avg block time (sec)" },
      {
        kind: "ratio",
        computedKey: "value_per_tx",
        title: "Value per transaction (native)",
        numerator: "value_transferred_native",
        denominator: "tx_count_daily",
        optional: true,
      },
    ],
  },
  arbitrum: {
    bullets: [
      "Focus: activity, typical fees, and utilization context (descriptive-only).",
      "Use persistence (MA7/MA30) and historical context to distinguish noise vs durable shifts.",
      "No price data, no forecasts, no recommendations.",
    ],
    panels: [
      { metric: "tx_count_daily", title: "Transactions (daily)" },
      { metric: "unique_active_addresses", title: "Unique active addresses" },
      { metric: "value_transferred_native", title: "Value transferred (native)" },
      { metric: "median_tx_fee_native", title: "Median tx fee (native)" },
      { metric: "median_tx_value_native", title: "Median tx value (native)" },
      { metric: "failed_tx_rate", title: "Failed tx rate" },
      { metric: "gas_utilization_pct", title: "Utilization (%)" },
      { metric: "block_count_daily", title: "Blocks (daily)" },
      { metric: "avg_block_time_sec", title: "Avg block time (sec)" },
      {
        kind: "ratio",
        computedKey: "value_per_tx",
        title: "Value per transaction (native)",
        numerator: "value_transferred_native",
        denominator: "tx_count_daily",
        optional: true,
      },
    ],
  },
  base: {
    bullets: [
      "Focus: activity, typical fees, and utilization context (descriptive-only).",
      "Use persistence (MA7/MA30) and historical context to distinguish noise vs durable shifts.",
      "No price data, no forecasts, no recommendations.",
    ],
    panels: [
      { metric: "tx_count_daily", title: "Transactions (daily)" },
      { metric: "unique_active_addresses", title: "Unique active addresses" },
      { metric: "value_transferred_native", title: "Value transferred (native)" },
      { metric: "median_tx_fee_native", title: "Median tx fee (native)" },
      { metric: "median_tx_value_native", title: "Median tx value (native)" },
      { metric: "failed_tx_rate", title: "Failed tx rate" },
      { metric: "gas_utilization_pct", title: "Utilization (%)" },
      { metric: "block_count_daily", title: "Blocks (daily)" },
      { metric: "avg_block_time_sec", title: "Avg block time (sec)" },
      {
        kind: "ratio",
        computedKey: "value_per_tx",
        title: "Value per transaction (native)",
        numerator: "value_transferred_native",
        denominator: "tx_count_daily",
        optional: true,
      },
    ],
  },
};

function maybePanel(p: MetricDef, meta: MetaFile | null): boolean {
  if (!p.optional) return true;
  if (!meta) return true;

  const metrics = (meta as unknown as { metrics?: unknown })?.metrics;
  if (Array.isArray(metrics)) {
    if (p.kind === "ratio") return true;
    return metrics.includes(p.metric);
  }
  return true;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">{children}</div>;
}

function ChipLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="ui-lift rounded-md border border-ui-border bg-ui-bg/15 px-3 py-2 font-mono text-[11px] font-semibold tracking-wide text-ui-muted hover:border-ui-border-soft hover:bg-ui-bg/20 hover:text-ui-text"
    >
      {label}
    </Link>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-6 rounded-lg border border-ui-border bg-[rgb(var(--tone-heat)/0.10)] p-4">
      <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--tone-heat)/0.95)]">{title}</div>
      <div className="mt-2 text-sm text-ui-muted">{body}</div>
    </div>
  );
}

export default function ChainClient(props: { chain: string; hero?: LandingHeroFileMaybe }) {
  const chain = parseChain(props.chain);

  // web5: custom thresholds
  const [customEnabled, setCustomEnabled] = useState<boolean>(false);
  const [customOverrides, setCustomOverrides] = useState<ThresholdConfigOverridesV1>({});
  const [customResult, setCustomResult] = useState<CustomRegimeResult | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);

  const [thresholdPanelOpen, setThresholdPanelOpen] = useState<boolean>(false);

  const [canonicalMeta, setCanonicalMeta] = useState<MetaFile | null>(null);
  const [canonicalMetaError, setCanonicalMetaError] = useState<string | null>(null);

  // web6: regime history
  const [regimeHistory, setRegimeHistory] = useState<HistoryApiResponse | null>(null);
  const [regimeHistoryError, setRegimeHistoryError] = useState<string | null>(null);

  const fallbackWindows = useMemo(() => {
    const w = props.hero?.windows_supported;
    const arr = Array.isArray(w) ? w.filter((x) => typeof x === "number" && x > 0) : [];
    const uniq = Array.from(new Set(arr));
    return uniq.length ? uniq : [7, 30, 90, 180, 365];
  }, [props.hero?.windows_supported]);

  const [windowDays, setWindowDays] = useState<number>(() => clampWindowDays(180, fallbackWindows));

  useEffect(() => {
    setWindowDays((prev) => clampWindowDays(prev, fallbackWindows));
  }, [fallbackWindows]);

  // hydrate localStorage
  useEffect(() => {
    const keyEnabled = storageKeyEnabled(chain);
    const keyOverrides = storageKeyOverrides(chain);

    const rawEnabled = typeof window !== "undefined" ? window.localStorage.getItem(keyEnabled) : null;
    const rawOverrides = typeof window !== "undefined" ? window.localStorage.getItem(keyOverrides) : null;

    if (rawEnabled === null) setCustomEnabled(false);
    else setCustomEnabled(Boolean(safeParseJson<boolean>(rawEnabled)));

    if (!rawOverrides) setCustomOverrides({});
    else {
      const parsed = safeParseJson<ThresholdConfigOverridesV1>(rawOverrides);
      setCustomOverrides((parsed && typeof parsed === "object" ? parsed : {}) as ThresholdConfigOverridesV1);
    }
  }, [chain]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKeyEnabled(chain), JSON.stringify(customEnabled));
  }, [chain, customEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKeyOverrides(chain), JSON.stringify(customOverrides ?? {}));
  }, [chain, customOverrides]);

  const [availableDaysGold, setAvailableDaysGold] = useState<string[] | null>(null);
  const [availableDaysMeta, setAvailableDaysMeta] = useState<string[] | null>(null);
  const [availableDaysDerived, setAvailableDaysDerived] = useState<string[] | null>(null);

  const [asofGold, setAsofGold] = useState<string | null>(props.hero?.asof?.gold ?? null);
  const [asofMeta, setAsofMeta] = useState<string | null>(props.hero?.asof?.meta ?? null);
  const [asofDerived, setAsofDerived] = useState<string | null>(props.hero?.asof?.derived ?? null);

  const [manifestError, setManifestError] = useState<string | null>(null);

  const [notables, setNotables] = useState<NotablesApiResponse | null>(null);
  const [notablesError, setNotablesError] = useState<string | null>(null);

  // Fetch manifests
  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    async function run() {
      try {
        setManifestError(null);
        const [g, m, d] = await Promise.all([
          fetchManifest(chain, "gold", ac.signal),
          fetchManifest(chain, "meta", ac.signal),
          fetchManifest(chain, "derived", ac.signal),
        ]);

        if (cancelled) return;

        const gMan = normalizeManifest(g);
        const mMan = normalizeManifest(m);
        const dMan = normalizeManifest(d);

        setAvailableDaysGold((gMan?.available_days as string[]) ?? null);
        setAvailableDaysMeta((mMan?.available_days as string[]) ?? null);
        setAvailableDaysDerived((dMan?.available_days as string[]) ?? null);

        setAsofGold((gMan?.asof as string) ?? null);
        setAsofMeta((mMan?.asof as string) ?? null);
        setAsofDerived((dMan?.asof as string) ?? null);
      } catch (e: unknown) {
        if (cancelled) return;
        setManifestError(e instanceof Error ? e.message : String(e));
      }
    }

    run();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [chain]);

  // compute canonical asof + start/end for panels
  const canonicalAsof = useMemo(() => {
    const a = asofMeta ?? asofGold ?? asofDerived ?? null;
    return a && isValidISODate(a) ? a : null;
  }, [asofMeta, asofGold, asofDerived]);

  const endISO = useMemo(() => canonicalAsof ?? toISODateUTC(new Date()), [canonicalAsof]);
  const startISO = useMemo(() => addDaysISO(endISO, -windowDays + 1), [endISO, windowDays]);

  const chainDef = METRICS_BY_CHAIN[chain];

  // Fetch notables
  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    async function run() {
      try {
        setNotablesError(null);
        const n = await fetchNotables(chain, windowDays, ac.signal);
        if (cancelled) return;
        setNotables(n);
      } catch (e: unknown) {
        if (cancelled) return;
        setNotables(null);
        setNotablesError(e instanceof Error ? e.message : String(e));
      }
    }

    run();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [chain, windowDays]);

  // Fetch canonical META (window)
  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    async function run() {
      try {
        setCanonicalMetaError(null);
        const m = await fetchMetaWindow(chain, windowDays, ac.signal);
        if (cancelled) return;
        setCanonicalMeta(m);
      } catch (e: unknown) {
        if (cancelled) return;
        setCanonicalMeta(null);
        setCanonicalMetaError(e instanceof Error ? e.message : String(e));
      }
    }

    run();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [chain, windowDays]);

  // Fetch regime history (web6)
  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    async function run() {
      try {
        setRegimeHistoryError(null);
        const res = await fetch(`/api/regime/history?chain=${chain}&days=450`, { signal: ac.signal, cache: "no-store" });
        if (!res.ok) throw new Error(`regime history HTTP ${res.status}`);
        const j = (await res.json()) as HistoryApiResponse;
        if (cancelled) return;
        setRegimeHistory(j);
      } catch (e: unknown) {
        if (cancelled) return;
        setRegimeHistory(null);
        setRegimeHistoryError(e instanceof Error ? e.message : "Failed to load regime history.");
      }
    }

    run();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [chain]);

  // NOTE: Keep your existing custom regime apply flow (evaluate) as-is in your codebase.
  // This component keeps state slots for the feature, but does not implement the apply flow here.

  const displayedMetaAsof = useMemo(() => readMetaAsof(canonicalMeta), [canonicalMeta]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8">
      <ChainDiagnosticHeader
        chain={chain}
        windowDays={windowDays}
        start={startISO}
        end={endISO}
        canonicalMeta={canonicalMeta}
        customResult={customResult}
        customEnabled={customEnabled}
        onOpenThresholdPanel={() => setThresholdPanelOpen(true)}
      />

      {/* Chain intro (HTML parity: explain + why + guardrails) */}
      <section className="mt-6 ui-card p-6 ui-lift">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <Eyebrow>What this dashboard is</Eyebrow>
            <h2 className="mt-2 text-xl font-semibold text-ui-text">Descriptive on-chain regime context</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ui-muted">
              This dashboard shows metric-level context for the selected window. It is designed to help distinguish persistent shifts
              from short-lived noise using MA7/MA30 and distribution context. No prices, no forecasts, no advice.
            </p>

            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-ui-muted">
              {chainDef.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>

            <div className="mt-5 flex flex-wrap gap-2">
              <ChipLink href="/methodology" label="Methodology" />
              <ChipLink href="/wiki" label="Metric dictionary" />
              <ChipLink href="/notables" label="Notables policy" />
              <ChipLink href="/how-to/custom-thresholds" label="Custom thresholds" />
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 md:w-[340px]">
            <div className="ui-inset p-3">
              <Eyebrow>As-of (meta)</Eyebrow>
              <div className="mt-1 font-mono text-xs text-ui-muted">{displayedMetaAsof ?? canonicalAsof ?? "—"}</div>
            </div>
            <div className="ui-inset p-3">
              <Eyebrow>Window</Eyebrow>
              <div className="mt-1 text-xs text-ui-muted">
                <span className="font-mono text-ui-text">{windowDays}</span> days
                <div className="mt-1 text-[11px] text-ui-faint">
                  <span className="font-mono text-ui-muted">{startISO}</span> → <span className="font-mono text-ui-muted">{endISO}</span>
                </div>
              </div>
            </div>
            <div className="ui-inset p-3">
              <Eyebrow>Freshness</Eyebrow>
              <div className="mt-1 text-xs text-ui-muted">
                gold <span className="font-mono text-ui-text">{asofGold ?? "—"}</span>
                <div className="mt-1 text-[11px] text-ui-faint">
                  meta <span className="font-mono text-ui-muted">{asofMeta ?? "—"}</span> · derived{" "}
                  <span className="font-mono text-ui-muted">{asofDerived ?? "—"}</span>
                </div>
              </div>
            </div>
            <div className="ui-inset p-3">
              <Eyebrow>Coverage</Eyebrow>
              <div className="mt-1 text-[11px] text-ui-faint">
                gold days: <span className="font-mono text-ui-muted">{availableDaysGold?.length ?? "—"}</span>
              </div>
              <div className="mt-1 text-[11px] text-ui-faint">
                meta days: <span className="font-mono text-ui-muted">{availableDaysMeta?.length ?? "—"}</span>
              </div>
              <div className="mt-1 text-[11px] text-ui-faint">
                derived days: <span className="font-mono text-ui-muted">{availableDaysDerived?.length ?? "—"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-ui-border bg-ui-bg/10 px-4 py-3 text-[11px] text-ui-faint">
          Guardrails: descriptive-only · no prices · no advice · missing values render as gaps (null), never zeros.
        </div>
      </section>

      {/* Threshold panel (repo API) */}
      {thresholdPanelOpen ? (
        <ThresholdPanel
          chain={chain}
          date={canonicalAsof}
          enabled={customEnabled}
          onChangeEnabled={setCustomEnabled}
          overrides={customOverrides}
          onChangeOverrides={setCustomOverrides}
          onClose={() => setThresholdPanelOpen(false)}
        />
      ) : null}

      {/* Notices / errors */}
      {manifestError ? <Notice title="Manifest failed" body={manifestError} /> : null}
      {canonicalMetaError ? <Notice title="META window failed" body={canonicalMetaError} /> : null}
      {customError ? <Notice title="Custom regime failed" body={customError} /> : null}

      {/* Panels */}
      <div className="mt-10 space-y-6">
        {chainDef.panels
          .filter((p) => maybePanel(p, canonicalMeta))
          .map((p) => {
            if ((p as any).kind === "ratio") {
              const r = p as Extract<MetricDef, { kind: "ratio" }>;
              return (
                <ComputedRatioPanel
                  key={r.computedKey}
                  chain={chain}
                  computedKey={r.computedKey}
                  title={r.title}
                  numeratorMetric={r.numerator}
                  denominatorMetric={r.denominator}
                  start={startISO}
                  end={endISO}
                />
              );
            }

            const m = p as Extract<MetricDef, { metric: string }>;
            return <MetricPanel key={m.metric} chain={chain} metric={m.metric} title={m.title} start={startISO} end={endISO} />;
          })}
      </div>

      {/* web6: Trust & validation */}
      {regimeHistoryError ? (
        <section className="mt-12">
          <div className="ui-card p-6 ui-lift">
            <div className="text-sm text-ui-muted">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--tone-heat)/0.95)]">
                Trust & validation blocked
              </span>
              <div className="mt-2">Failed to load regime history: {regimeHistoryError}</div>
            </div>
          </div>
        </section>
      ) : null}

      {!regimeHistoryError && !regimeHistory ? (
        <section className="mt-12">
          <div className="ui-card p-6 ui-lift">
            <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">Trust & validation</div>
            <div className="mt-2 text-sm text-ui-muted">Loading trust & validation…</div>
          </div>
        </section>
      ) : null}

      {regimeHistory?.points?.length ? <TrustSection chain={chain} points={regimeHistory.points} /> : null}

      {/* Notables */}
      <section className="mt-12">
        <div className="ui-card p-6 ui-lift">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Eyebrow>Notables</Eyebrow>
              <h2 className="mt-2 text-2xl font-semibold text-ui-text">Highlights (descriptive)</h2>
              <div className="mt-2 text-sm text-ui-muted">Highlights are based on historical deviation + persistence, not short-lived spikes.</div>
            </div>
          </div>

          {notablesError ? (
            <div className="mt-4 rounded-lg border border-ui-border bg-[rgb(var(--tone-heat)/0.10)] p-4 text-sm text-ui-muted">
              {notablesError}
            </div>
          ) : !notables ? (
            <div className="mt-4 ui-inset p-4 text-sm text-ui-muted">Loading notables…</div>
          ) : notables.notables?.length ? (
            <div className="mt-6 space-y-3">
              {notables.notables.map((n) => (
                <div key={`${n.metric}-${n.label}`} className="ui-inset p-4">
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm font-semibold text-ui-text">{n.label}</div>
                    <div className="text-[11px] text-ui-faint">
                      <span className="font-mono text-ui-muted">{n.metric}</span>
                      <span className="mx-2 text-ui-faint">·</span>
                      Score <span className="font-mono text-ui-muted">{n.score.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mt-2 text-sm text-ui-muted">{n.interpretation?.basic}</div>

                  {n.interpretation?.advanced?.length ? (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-[12px] text-ui-faint">
                      {n.interpretation.advanced.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  ) : null}

                  {n.caveats?.length ? (
                    <div className="mt-3 rounded-lg border border-ui-border bg-ui-bg/10 p-3">
                      <Eyebrow>Caveats</Eyebrow>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-ui-faint">
                        {n.caveats.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                    <Link
                      className="ui-lift rounded-md border border-ui-border bg-ui-bg/15 px-3 py-2 font-mono text-[11px] font-semibold tracking-wide text-ui-muted hover:border-ui-border-soft hover:bg-ui-bg/20 hover:text-ui-text"
                      href={n.links.methodology}
                    >
                      Methodology
                    </Link>
                    <Link
                      className="ui-lift rounded-md border border-ui-border bg-ui-bg/15 px-3 py-2 font-mono text-[11px] font-semibold tracking-wide text-ui-muted hover:border-ui-border-soft hover:bg-ui-bg/20 hover:text-ui-text"
                      href={n.links.wiki}
                    >
                      Wiki
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 ui-inset p-4 text-sm text-ui-muted">No notables returned.</div>
          )}
        </div>
      </section>
    </div>
  );
}