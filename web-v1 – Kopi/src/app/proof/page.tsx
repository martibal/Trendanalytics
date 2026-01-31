"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  type Chain,
  CHAINS,
  getChainProfile,
  orderedMetricKeysForChain,
  metricTitleForChain,
  metricUnitForChain,
  metricFormatForChain,
  metricExplainForChain,
} from "@/lib/metricRegistry";

type Dataset = {
  dataset_id: string;
  revision_id: number;
  methodology_version: string;
  computed_at_utc: string;
  supported_chains: string[];
  supported_genres: string[];
  windows_supported: number[];
  notes?: string[];
};

type Manifest = {
  dataset_id: string;
  revision_id: number;
  methodology_version: string;
  computed_at_utc: string;
  chain: string;
  genre: string;
  schema_version: string;
  asof: string;
  windows_supported: number[];
  files: {
    latest: string;
    windows: Record<string, string>;
  };
};

type Row = Record<string, any>;

const GENRES = ["meta", "gold", "derived"] as const;

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_DATA_BASE_URL || "/data/published/v1").replace(/\/$/, "");
}

function isDayStem(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toUtcDayNumber(yyyyMmDd: string): number | null {
  if (typeof yyyyMmDd !== "string") return null;
  const s = yyyyMmDd.trim();
  if (!isDayStem(s)) return null;
  const t = Date.parse(`${s}T00:00:00Z`);
  if (!Number.isFinite(t)) return null;
  return Math.floor(t / (1000 * 60 * 60 * 24));
}

function analyzeDateSequence(dates: string[]): {
  total: number;
  unique: number;
  first: string | null;
  last: string | null;
  duplicates: number;
  invalid: number;
  jumps: Array<{ from: string; to: string; gapDays: number }>;
  maxGapDays: number;
} {
  const cleaned = (dates ?? [])
    .map((d) => (typeof d === "string" ? d.trim() : ""))
    .filter((d) => d.length > 0);

  const parsed = cleaned
    .map((d) => ({ d, n: toUtcDayNumber(d) }))
    .filter((x) => x.n !== null) as Array<{ d: string; n: number }>;

  const invalid = cleaned.length - parsed.length;
  parsed.sort((a, b) => a.n - b.n);

  const uniqueArr: Array<{ d: string; n: number }> = [];
  let duplicates = 0;
  for (let i = 0; i < parsed.length; i++) {
    const prev = uniqueArr[uniqueArr.length - 1];
    if (prev && prev.n === parsed[i].n) {
      duplicates++;
      continue;
    }
    uniqueArr.push(parsed[i]);
  }

  const first = uniqueArr.length ? uniqueArr[0].d : null;
  const last = uniqueArr.length ? uniqueArr[uniqueArr.length - 1].d : null;

  const jumps: Array<{ from: string; to: string; gapDays: number }> = [];
  let maxGapDays = 0;

  for (let i = 1; i < uniqueArr.length; i++) {
    const a = uniqueArr[i - 1];
    const b = uniqueArr[i];
    const delta = b.n - a.n;
    if (delta > 1) {
      const gapDays = delta - 1;
      jumps.push({ from: a.d, to: b.d, gapDays });
      if (gapDays > maxGapDays) maxGapDays = gapDays;
    }
  }

  return {
    total: dates.length,
    unique: uniqueArr.length,
    first,
    last,
    duplicates,
    invalid,
    jumps,
    maxGapDays,
  };
}

function toNumberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function buildSparklinePoints(values: Array<number | null>, width = 900, height = 140): string {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return "";
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;

  const coords: string[] = [];
  const n = values.length;
  for (let i = 0; i < n; i++) {
    const v = values[i];
    if (v === null) continue;
    const x = (i / (n - 1)) * width;
    const y = height - ((v - min) / range) * height;
    coords.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return coords.join(" ");
}

function daysBetweenUtc(aYmd: string, bYmd: string): number | null {
  const a = toUtcDayNumber(aYmd);
  const b = toUtcDayNumber(bYmd);
  if (a === null || b === null) return null;
  return a - b;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}`);
  return (await res.json()) as T;
}

function metricKeysFromWindow(windowRows: Row[]): string[] {
  const first = windowRows?.[0] ?? {};
  return Object.keys(first)
    .filter((k) => k !== "date" && k !== "chain")
    .sort((a, b) => a.localeCompare(b));
}

function formatValue(
  chain: Chain,
  metricKey: string,
  value: number | null
): { text: string; unitLabel: string } {
  const unit = metricUnitForChain(chain, metricKey);
  const fmt = metricFormatForChain(chain, metricKey);

  if (value === null) return { text: "n/a", unitLabel: unit };

  if (unit === "pct") {
    const pctIsFraction = fmt?.pctIsFraction ?? true;
    const decimals = fmt?.decimals ?? 2;
    const v = pctIsFraction ? value * 100 : value;
    return { text: `${v.toFixed(decimals)}%`, unitLabel: "pct" };
  }

  const decimals =
    fmt?.decimals ??
    (unit === "count" ? 0 : unit === "sec" ? 2 : unit === "native" ? 6 : 2);

  // Simple thousand grouping for readability; do not do anything fancy.
  const fixed = value.toFixed(decimals);
  const [a, b] = fixed.split(".");
  const grouped = a.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return { text: b ? `${grouped}.${b}` : grouped, unitLabel: unit };
}

function isSupportedChain(x: string): x is Chain {
  return x === "bitcoin" || x === "ethereum" || x === "arbitrum" || x === "base";
}

export default function ProofPage() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [datasetErr, setDatasetErr] = useState<string | null>(null);

  const [chain, setChain] = useState<Chain>("ethereum");
  const [windowDays, setWindowDays] = useState<number>(365);

  const [manifests, setManifests] = useState<Record<string, Manifest | null>>({
    meta: null,
    gold: null,
    derived: null,
  });
  const [latest, setLatest] = useState<Record<string, any>>({ meta: null, gold: null, derived: null });

  const [goldWindow, setGoldWindow] = useState<Row[]>([]);
  const [windowErr, setWindowErr] = useState<string | null>(null);

  const [metricKeysRaw, setMetricKeysRaw] = useState<string[]>([]);
  const [metricKeysOrdered, setMetricKeysOrdered] = useState<string[]>([]);
  const [metric, setMetric] = useState<string>("unique_active_addresses");

  const [explainMode, setExplainMode] = useState<"basic" | "advanced">("basic");

  const nowUtc = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Load dataset.json once, then apply chain defaults
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await fetchJson<Dataset>(`${baseUrl()}/dataset.json`);
        if (!alive) return;
        setDataset(d);
        setDatasetErr(null);

        // choose first supported chain if current not supported
        const supported = (d.supported_chains ?? []).filter(isSupportedChain);
        const initialChain: Chain = supported.includes(chain) ? chain : (supported[0] ?? "ethereum");
        setChain(initialChain);

        // apply chain defaults for window + metric
        const profile = getChainProfile(initialChain);
        const windows = (d.windows_supported ?? []).slice().sort((a, b) => a - b);
        const preferredWindow = windows.includes(profile.defaults.windowDays)
          ? profile.defaults.windowDays
          : (windows[windows.length - 1] ?? profile.defaults.windowDays);

        setWindowDays(preferredWindow);
        setMetric(profile.defaults.metricKey);
      } catch (e: any) {
        if (!alive) return;
        setDatasetErr(e?.message ?? String(e));
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load manifests + latest + gold window whenever chain/windowDays changes
  useEffect(() => {
    let alive = true;
    setWindowErr(null);

    (async () => {
      try {
        const [mMeta, mGold, mDerived] = await Promise.all([
          fetchJson<Manifest>(`${baseUrl()}/meta/${chain}/manifest.json`).catch(() => null),
          fetchJson<Manifest>(`${baseUrl()}/gold/${chain}/manifest.json`).catch(() => null),
          fetchJson<Manifest>(`${baseUrl()}/derived/${chain}/manifest.json`).catch(() => null),
        ]);
        if (!alive) return;
        setManifests({ meta: mMeta, gold: mGold, derived: mDerived });

        const [lMeta, lGold, lDerived] = await Promise.all([
          fetchJson<any>(`${baseUrl()}/meta/${chain}/latest.json`).catch(() => null),
          fetchJson<any>(`${baseUrl()}/gold/${chain}/latest.json`).catch(() => null),
          fetchJson<any>(`${baseUrl()}/derived/${chain}/latest.json`).catch(() => null),
        ]);
        if (!alive) return;
        setLatest({ meta: lMeta, gold: lGold, derived: lDerived });

        const w = await fetchJson<Row[]>(`${baseUrl()}/gold/${chain}/last${windowDays}d.json`);
        if (!alive) return;

        setGoldWindow(w);
        setWindowErr(null);

        const keys = metricKeysFromWindow(w);
        setMetricKeysRaw(keys);

        const ordered = orderedMetricKeysForChain(chain, keys);
        setMetricKeysOrdered(ordered);

        // Ensure selected metric exists + not hidden; else use chain default if present in data
        if (!ordered.includes(metric)) {
          const profile = getChainProfile(chain);
          const fallback = ordered.includes(profile.defaults.metricKey)
            ? profile.defaults.metricKey
            : ordered[0] ?? profile.defaults.metricKey;
          setMetric(fallback);
        }
      } catch (e: any) {
        if (!alive) return;
        setWindowErr(e?.message ?? String(e));
        setGoldWindow([]);
        setMetricKeysRaw([]);
        setMetricKeysOrdered([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [chain, windowDays]); // metric managed inside

  const analysis = useMemo(() => {
    const dates = goldWindow.map((r) => (typeof r.date === "string" ? r.date : "")).filter(Boolean);
    return analyzeDateSequence(dates as string[]);
  }, [goldWindow]);

  const metricValues = useMemo(
    () => goldWindow.map((r) => toNumberOrNull(r?.[metric])),
    [goldWindow, metric]
  );

  const seriesStats = useMemo(() => {
    const nums = metricValues.filter((v): v is number => v !== null);
    const total = metricValues.length;
    const nonNull = nums.length;
    const nullCount = total - nonNull;
    const nullRate = total ? nullCount / total : 0;

    const min = nums.length ? Math.min(...nums) : null;
    const max = nums.length ? Math.max(...nums) : null;
    const last = nums.length ? nums[nums.length - 1] : null;

    return { total, nonNull, nullCount, nullRate, min, max, last };
  }, [metricValues]);

  const points = useMemo(() => buildSparklinePoints(metricValues), [metricValues]);

  const strictOk = useMemo(() => {
    const windowOk = analysis.unique === windowDays;
    const continuityOk = analysis.jumps.length === 0;
    return { windowOk, continuityOk, pass: windowOk && continuityOk };
  }, [analysis, windowDays]);

  const asof = useMemo(() => {
    const a = {
      meta: manifests.meta?.asof ?? "n/a",
      gold: manifests.gold?.asof ?? "n/a",
      derived: manifests.derived?.asof ?? "n/a",
    };
    const lag = {
      meta: a.meta === "n/a" ? null : daysBetweenUtc(nowUtc, a.meta),
      gold: a.gold === "n/a" ? null : daysBetweenUtc(nowUtc, a.gold),
      derived: a.derived === "n/a" ? null : daysBetweenUtc(nowUtc, a.derived),
    };
    return { a, lag };
  }, [manifests, nowUtc]);

  const metricTitle = useMemo(() => metricTitleForChain(chain, metric), [chain, metric]);
  const metricUnit = useMemo(() => metricUnitForChain(chain, metric), [chain, metric]);

  const explain = useMemo(() => metricExplainForChain(chain, metric), [chain, metric]);
  const chainProfile = useMemo(() => getChainProfile(chain), [chain]);

  const minFmt = useMemo(() => formatValue(chain, metric, seriesStats.min), [chain, metric, seriesStats.min]);
  const maxFmt = useMemo(() => formatValue(chain, metric, seriesStats.max), [chain, metric, seriesStats.max]);
  const lastFmt = useMemo(() => formatValue(chain, metric, seriesStats.last), [chain, metric, seriesStats.last]);

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Proof</h1>
        <p className="text-sm opacity-80">
          Data health & coverage. Source: <code>{baseUrl()}</code>
        </p>
      </header>

      <section className="rounded-2xl border p-4 space-y-2">
        {datasetErr ? (
          <div className="text-sm">
            <div className="font-medium text-red-600">Failed to load dataset.json</div>
            <div className="font-mono text-xs whitespace-pre-wrap mt-1">{datasetErr}</div>
          </div>
        ) : dataset ? (
          <>
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <div className="opacity-70">dataset_id</div>
                <div className="font-mono">{dataset.dataset_id}</div>
              </div>
              <div>
                <div className="opacity-70">revision_id</div>
                <div className="font-mono">{dataset.revision_id}</div>
              </div>
              <div>
                <div className="opacity-70">computed_at_utc</div>
                <div className="font-mono">{dataset.computed_at_utc}</div>
              </div>
              <div>
                <div className="opacity-70">today (UTC)</div>
                <div className="font-mono">{nowUtc}</div>
              </div>
            </div>

            {dataset.notes?.length ? (
              <div className="text-sm opacity-80">
                <div className="font-medium mb-1">notes</div>
                <ul className="list-disc pl-5 space-y-1">
                  {dataset.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <div className="text-sm opacity-70">Loading dataset…</div>
        )}
      </section>

      <section className="rounded-2xl border p-4 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <div className="text-xl font-semibold">
              {chainProfile.label} <span className="opacity-70 text-base">({chain})</span>
            </div>
            <div className="text-sm opacity-80">
              asof meta/gold/derived:{" "}
              <span className="font-mono">
                {asof.a.meta} / {asof.a.gold} / {asof.a.derived}
              </span>
            </div>
            <div className="text-sm opacity-80">
              lag days (UTC):{" "}
              <span className="font-mono">
                {asof.lag.meta ?? "n/a"} / {asof.lag.gold ?? "n/a"} / {asof.lag.derived ?? "n/a"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              <div className="opacity-70 mb-1">chain</div>
              <select
                className="border rounded-lg px-2 py-1 text-sm"
                value={chain}
                onChange={(e) => {
                  const next = e.target.value;
                  if (isSupportedChain(next)) {
                    setChain(next);
                    // apply chain default metric immediately; window stays as chosen
                    setMetric(getChainProfile(next).defaults.metricKey);
                  }
                }}
              >
                {(dataset?.supported_chains ?? Object.keys(CHAINS)).filter(isSupportedChain).map((c) => (
                  <option key={c} value={c}>
                    {CHAINS[c].label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <div className="opacity-70 mb-1">window</div>
              <select
                className="border rounded-lg px-2 py-1 text-sm"
                value={windowDays}
                onChange={(e) => setWindowDays(parseInt(e.target.value, 10))}
                disabled={!dataset}
              >
                {(dataset?.windows_supported ?? [7, 30, 90, 180, 365])
                  .slice()
                  .sort((a, b) => a - b)
                  .map((w) => (
                    <option key={w} value={w}>
                      last{w}d
                    </option>
                  ))}
              </select>
            </label>

            <label className="text-sm min-w-[320px]">
              <div className="opacity-70 mb-1">metric (gold)</div>
              <select
                className="border rounded-lg px-2 py-1 text-sm w-full"
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                disabled={!metricKeysOrdered.length}
              >
                {metricKeysOrdered.length ? (
                  metricKeysOrdered.map((k) => (
                    <option key={k} value={k}>
                      {metricTitleForChain(chain, k)} ({k})
                    </option>
                  ))
                ) : (
                  <option value={metric}>Loading…</option>
                )}
              </select>
            </label>

            <label className="text-sm">
              <div className="opacity-70 mb-1">explain</div>
              <select
                className="border rounded-lg px-2 py-1 text-sm"
                value={explainMode}
                onChange={(e) => setExplainMode(e.target.value as "basic" | "advanced")}
              >
                <option value="basic">Basic</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-xl border p-3 space-y-2">
          <div className="text-sm font-medium">Chain context</div>
          <p className="text-sm opacity-80">
            {explainMode === "basic" ? chainProfile.interpretation.basic : chainProfile.interpretation.advanced}
          </p>
        </div>

        {windowErr ? (
          <div className="text-sm">
            <div className="font-medium text-red-600">Failed to load window payload</div>
            <div className="font-mono text-xs whitespace-pre-wrap mt-1">{windowErr}</div>
          </div>
        ) : null}

        <div className="rounded-xl border p-3 space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-sm font-medium">
                {metricTitle} <span className="opacity-70">·</span>{" "}
                <span className="font-mono opacity-80">{metric}</span>{" "}
                <span className="opacity-70">· unit:</span>{" "}
                <span className="font-mono opacity-80">{metricUnit}</span>
              </div>
              <div className="text-xs opacity-80">
                window: last{windowDays}d · rows: <span className="font-mono">{seriesStats.total}</span> · non-null:{" "}
                <span className="font-mono">{seriesStats.nonNull}</span> · null:{" "}
                <span className="font-mono">{seriesStats.nullCount}</span> · null-rate:{" "}
                <span className="font-mono">{(seriesStats.nullRate * 100).toFixed(1)}%</span>
              </div>
            </div>

            <div className="text-xs opacity-80">
              min/max/last:{" "}
              <span className="font-mono">
                {minFmt.text} / {maxFmt.text} / {lastFmt.text}
              </span>
            </div>
          </div>

          {explain ? (
            <div className="rounded-lg border p-2 text-sm">
              <div className="font-medium mb-1">Explanation ({explainMode})</div>
              <p className="opacity-80">{explainMode === "basic" ? explain.basic : explain.advanced}</p>
            </div>
          ) : null}

          <div className="rounded-lg border p-2">
            <div className="text-xs font-medium">
              STRICT DATE COVERAGE CHECK: <span className="font-mono">{strictOk.pass ? "PASS" : "FAIL"}</span>
            </div>

            <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs opacity-80">
              <div>
                expected rows: <span className="font-mono">{windowDays}</span> · unique dates:{" "}
                <span className="font-mono">{analysis.unique}</span> · windowOk:{" "}
                <span className="font-mono">{String(strictOk.windowOk)}</span>
              </div>
              <div>
                first/last:{" "}
                <span className="font-mono">
                  {analysis.first ?? "n/a"} → {analysis.last ?? "n/a"}
                </span>
              </div>
              <div>
                invalid dates: <span className="font-mono">{analysis.invalid}</span> · duplicates:{" "}
                <span className="font-mono">{analysis.duplicates}</span>
              </div>
              <div>
                jumps: <span className="font-mono">{analysis.jumps.length}</span> · max gap days:{" "}
                <span className="font-mono">{analysis.maxGapDays}</span> · continuityOk:{" "}
                <span className="font-mono">{String(strictOk.continuityOk)}</span>
              </div>
            </div>

            {analysis.jumps.length ? (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium">show jump details</summary>
                <div className="mt-2 space-y-1">
                  {analysis.jumps.slice(0, 8).map((j, i) => (
                    <div key={i} className="text-xs">
                      <span className="font-mono">{j.from}</span> → <span className="font-mono">{j.to}</span> (
                      <span className="font-mono">{j.gapDays}</span> missing days)
                    </div>
                  ))}
                  {analysis.jumps.length > 8 ? (
                    <div className="text-xs opacity-70">… {analysis.jumps.length - 8} more</div>
                  ) : null}
                </div>
              </details>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <svg viewBox="0 0 900 140" width="900" height="140" className="block">
              <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} opacity="0.9" />
            </svg>
          </div>

          <div className="text-xs opacity-70">
            {analysis.first ? (
              <span className="font-mono">
                first: {analysis.first} · last: {analysis.last}
              </span>
            ) : (
              <span className="font-mono">no dates</span>
            )}
          </div>

          <details className="rounded-lg border p-2">
            <summary className="cursor-pointer text-xs font-medium">debug: keys in window</summary>
            <div className="mt-2 text-xs opacity-80 space-y-1">
              <div>
                raw keys: <span className="font-mono">{metricKeysRaw.length}</span>
              </div>
              <div>
                ordered keys (chain-aware): <span className="font-mono">{metricKeysOrdered.length}</span>
              </div>
              <pre className="text-xs overflow-auto max-h-40 bg-black/5 rounded-lg p-2">
                {JSON.stringify(metricKeysOrdered, null, 2)}
              </pre>
            </div>
          </details>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {GENRES.map((g) => (
            <div key={g} className="rounded-xl border p-3">
              <div className="text-sm font-medium mb-2">{g} latest</div>
              <pre className="text-xs overflow-auto max-h-64 bg-black/5 rounded-lg p-2">
                {JSON.stringify(latest[g] ?? null, null, 2)}
              </pre>
            </div>
          ))}
        </div>

        <details className="rounded-xl border p-3">
          <summary className="cursor-pointer text-sm font-medium">manifests</summary>
          <pre className="text-xs overflow-auto max-h-64 bg-black/5 rounded-lg p-2 mt-2">
            {JSON.stringify(manifests, null, 2)}
          </pre>
        </details>
      </section>
    </main>
  );
}
