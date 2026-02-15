"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MetricTriLineChart } from "@/components/charts/MetricTriLineChart";
import { getMetric, metricLinks } from "@/lib/metrics/catalog";

type Chain = "bitcoin" | "ethereum" | "arbitrum" | "base";

type SeriesRow = {
  date: string;
  daily: number | null;
  ma7: number | null;
  ma30: number | null;
  confidence: number | null;
  z: number | null;
  percentile: number | null;
  ma_source?: "derived" | "fallback_computed";
};

type SeriesResponse = {
  dataset_id: string | null;
  revision_id: string | null;
  chain: Chain;
  metric: string;
  start: string;
  end: string;
  rows: SeriesRow[];
  coverage: {
    expected_days: number;
    present_days: number;
    missing_days: string[];
    nonNull_ratio: number;
  };
  freshness: {
    asof: string;
    lag_days: number;
  };
};

type TriSeriesPoint = {
  date: string;
  daily: number | null;
  ma7: number | null;
  ma30: number | null;
  confidence?: number | null;
  z?: number | null;
  percentile?: number | null;
};

function buildUrl(path: string, params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") sp.set(k, v);
  }
  return `${path}?${sp.toString()}`;
}

function fmtCompact(x: unknown) {
  if (x == null) return "—";
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";

  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  if (abs > 0 && abs < 1) return n.toFixed(6);
  return n.toFixed(2);
}

function fmtZ(z: number | null) {
  if (z == null || !Number.isFinite(z)) return "—";
  const s = z.toFixed(2);
  return z >= 0 ? `+${s}` : s;
}

function zLabel(z: number | null) {
  if (z == null || !Number.isFinite(z)) return null;
  const a = Math.abs(z);
  if (a >= 3) return "Extremely unusual";
  if (a >= 2) return "Very unusual";
  if (a >= 1) return "Somewhat unusual";
  return "Within typical range";
}

function PercentileCopy({ p }: { p: number | null | undefined }) {
  if (p == null || !Number.isFinite(p)) return <span className="text-ui-muted">—</span>;
  const pct = Math.max(0, Math.min(100, Math.round(p)));
  const below = 100 - pct;
  return (
    <span className="text-ui-muted">
      Today ranks in the <span className="font-semibold text-ui-text">{pct}th</span> percentile{" "}
      <span className="text-ui-faint">(lower than ~{below}% of days in this window)</span>.
    </span>
  );
}

function Chip(props: { label: string; value: string; tone?: "neutral" | "warn" }) {
  const tone = props.tone ?? "neutral";
  const cls =
    tone === "warn"
      ? "border-ui-border bg-[rgb(var(--bad)/0.10)] text-ui-text"
      : "border-ui-border bg-ui-bg/15 text-ui-muted";

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] ${cls}`}>
      <span className="text-ui-faint">{props.label}</span>
      <span className="font-mono tabular-nums text-ui-muted">{props.value}</span>
    </div>
  );
}

function rollingMean(vals: (number | null)[], win: number): (number | null)[] {
  const out: (number | null)[] = new Array(vals.length).fill(null);
  if (win <= 1) return vals.slice();

  let sum = 0;
  let count = 0;
  const q: (number | null)[] = [];

  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    q.push(v);

    if (typeof v === "number" && Number.isFinite(v)) {
      sum += v;
      count += 1;
    }

    if (q.length > win) {
      const old = q.shift()!;
      if (typeof old === "number" && Number.isFinite(old)) {
        sum -= old;
        count -= 1;
      }
    }

    if (q.length === win && count === win) out[i] = sum / win;
  }

  return out;
}

function percentileOf(values: number[], x: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= x) lo = mid + 1;
    else hi = mid;
  }
  const rank = lo / sorted.length; // fraction <= x
  return Math.max(0, Math.min(1, rank));
}

function meanAndStdev(xs: number[]) {
  if (xs.length < 2) return { mean: null as number | null, stdev: null as number | null };
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const varr = xs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (xs.length - 1);
  return { mean, stdev: Math.sqrt(varr) };
}

function minConf(a: number | null | undefined, b: number | null | undefined): number | null {
  const x = typeof a === "number" && Number.isFinite(a) ? a : null;
  const y = typeof b === "number" && Number.isFinite(b) ? b : null;
  if (x == null && y == null) return null;
  if (x == null) return y;
  if (y == null) return x;
  return Math.min(x, y);
}

function ratioSafe(n: number | null, d: number | null): number | null {
  if (n == null || d == null) return null;
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
  return n / d;
}

function coverageFromSeries(points: TriSeriesPoint[]) {
  const expected = points.length;
  let present = 0;
  for (const p of points) {
    const v = p.daily;
    if (typeof v === "number" && Number.isFinite(v)) present += 1;
  }
  return {
    expected_days: expected,
    present_days: present,
    nonNull_ratio: expected ? present / expected : 0,
  };
}

export function ComputedRatioPanel(props: {
  chain: Chain;

  numeratorMetric: string;
  denominatorMetric: string;

  computedKey: string; // e.g. "tx_per_user"
  title: string;
  subtitle?: string;

  start: string; // YYYY-MM-DD
  end?: string;

  hideIfLowCoverage?: boolean;
}) {
  const numeratorKnown = Boolean(getMetric(props.numeratorMetric));
  const denominatorKnown = Boolean(getMetric(props.denominatorMetric));

  const [numSeries, setNumSeries] = useState<SeriesResponse | null>(null);
  const [denSeries, setDenSeries] = useState<SeriesResponse | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const numUrl = useMemo(() => {
    return buildUrl("/api/series", {
      chain: props.chain,
      metric: props.numeratorMetric,
      start: props.start,
      end: props.end,
    });
  }, [props.chain, props.numeratorMetric, props.start, props.end]);

  const denUrl = useMemo(() => {
    return buildUrl("/api/series", {
      chain: props.chain,
      metric: props.denominatorMetric,
      start: props.start,
      end: props.end,
    });
  }, [props.chain, props.denominatorMetric, props.start, props.end]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!numeratorKnown || !denominatorKnown) {
        setLoading(false);
        setErr(
          `Unknown/undocumented metric key(s): ${!numeratorKnown ? props.numeratorMetric : ""} ${!denominatorKnown ? props.denominatorMetric : ""}`.trim()
        );
        setNumSeries(null);
        setDenSeries(null);
        return;
      }

      setLoading(true);
      setErr(null);

      try {
        const [aRes, bRes] = await Promise.all([fetch(numUrl), fetch(denUrl)]);
        if (!aRes.ok) throw new Error(`series(numerator) HTTP ${aRes.status}`);
        if (!bRes.ok) throw new Error(`series(denominator) HTTP ${bRes.status}`);

        const aJson = (await aRes.json()) as SeriesResponse;
        const bJson = (await bRes.json()) as SeriesResponse;

        if (!cancelled) {
          setNumSeries(aJson);
          setDenSeries(bJson);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || "Failed to load computed ratio panel.");
          setNumSeries(null);
          setDenSeries(null);
          setLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [numUrl, denUrl, numeratorKnown, denominatorKnown, props.numeratorMetric, props.denominatorMetric]);

  const computed = useMemo(() => {
    const a = numSeries?.rows ?? [];
    const b = denSeries?.rows ?? [];

    if (!a.length || !b.length) {
      return {
        points: [] as TriSeriesPoint[],
        latest: null as TriSeriesPoint | null,
        coverage: { expected_days: 0, present_days: 0, nonNull_ratio: 0 },
        freshness: null as { asof: string; lag_days: number } | null,
        dataset_id: numSeries?.dataset_id ?? denSeries?.dataset_id ?? null,
        revision_id: numSeries?.revision_id ?? denSeries?.revision_id ?? null,
      };
    }

    // Align by date (defensive)
    const bByDate = new Map<string, SeriesRow>();
    for (const r of b) bByDate.set(r.date, r);

    const outDaily: (number | null)[] = [];
    const dates: string[] = [];
    const confs: (number | null)[] = [];

    for (const ra of a) {
      const rb = bByDate.get(ra.date);
      if (!rb) continue;

      const r = ratioSafe(ra.daily ?? null, rb.daily ?? null);
      dates.push(ra.date);
      outDaily.push(r);

      confs.push(minConf(ra.confidence, rb.confidence));
    }

    const ma7 = rollingMean(outDaily, 7);
    const ma30 = rollingMean(outDaily, 30);

    const xs = outDaily.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const { mean, stdev } = meanAndStdev(xs);

    const pts: TriSeriesPoint[] = dates.map((date, i) => {
      const d = outDaily[i] ?? null;
      const z =
        d != null && mean != null && stdev != null && Number.isFinite(d) && Number.isFinite(mean) && Number.isFinite(stdev) && stdev !== 0
          ? (d - mean) / stdev
          : null;

      const pct01 = d != null ? percentileOf(xs, d) : null;
      const percentile = pct01 == null ? null : pct01 * 100;

      return {
        date,
        daily: d,
        ma7: ma7[i] ?? null,
        ma30: ma30[i] ?? null,
        confidence: confs[i] ?? null,
        z,
        percentile,
      };
    });

    const latest = pts.length ? pts[pts.length - 1] : null;

    const coverage = coverageFromSeries(pts);

    // Freshness: use numerator freshness as primary reference (both should be aligned anyway)
    const freshness = numSeries?.freshness ?? denSeries?.freshness ?? null;

    return {
      points: pts,
      latest,
      coverage,
      freshness,
      dataset_id: numSeries?.dataset_id ?? denSeries?.dataset_id ?? null,
      revision_id: numSeries?.revision_id ?? denSeries?.revision_id ?? null,
    };
  }, [numSeries, denSeries]);

  // Hide if requested and coverage is weak
  const shouldHide = useMemo(() => {
    if (!props.hideIfLowCoverage) return false;
    const ratio = computed.coverage.nonNull_ratio;
    return ratio < 0.55;
  }, [props.hideIfLowCoverage, computed.coverage.nonNull_ratio]);

  const hrefs = useMemo(() => {
    const a = metricLinks(props.numeratorMetric);
    const b = metricLinks(props.denominatorMetric);
    // Prefer methodology/wiki of numerator if available, fallback to denominator
    return {
      methodologyHref: a?.methodologyHref ?? b?.methodologyHref,
      wikiHref: a?.wikiHref ?? b?.wikiHref,
    };
  }, [props.numeratorMetric, props.denominatorMetric]);

  if (shouldHide) return null;

  const latest = computed.latest;

  return (
    <section className="rounded-3xl border border-ui-border bg-ui-bg/20 p-6 ui-lift">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Chip label="Metric" value={props.computedKey} />
            <Chip
              label="Coverage"
              value={`${computed.coverage.present_days}/${computed.coverage.expected_days} (${Math.round(computed.coverage.nonNull_ratio * 100)}%)`}
              tone={computed.coverage.nonNull_ratio < 0.8 ? "warn" : "neutral"}
            />
            {computed.freshness?.asof ? <Chip label="as-of" value={computed.freshness.asof} /> : null}
            {typeof computed.freshness?.lag_days === "number" ? <Chip label="lag" value={`${computed.freshness.lag_days}d`} /> : null}
          </div>

          <h3 className="mt-3 text-xl font-semibold text-ui-text">{props.title}</h3>
          {props.subtitle ? <p className="mt-1 text-sm text-ui-muted">{props.subtitle}</p> : null}

          <div className="mt-2 text-xs text-ui-faint">
            Computed as <span className="font-mono text-ui-muted">{props.numeratorMetric}</span> /{" "}
            <span className="font-mono text-ui-muted">{props.denominatorMetric}</span>. Descriptive only.
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {hrefs.methodologyHref ? (
            <a
              className="rounded-full border border-ui-border bg-ui-bg/10 px-3 py-1 text-[11px] font-semibold text-ui-muted hover:bg-ui-bg/20"
              href={hrefs.methodologyHref}
            >
              Methodology →
            </a>
          ) : null}
          {hrefs.wikiHref ? (
            <a
              className="rounded-full border border-ui-border bg-ui-bg/10 px-3 py-1 text-[11px] font-semibold text-ui-muted hover:bg-ui-bg/20"
              href={hrefs.wikiHref}
            >
              Wiki →
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="flex h-[360px] items-center justify-center text-sm text-ui-faint">Loading…</div>
        ) : err ? (
          <div className="rounded-2xl border border-ui-border bg-ui-bg/15 p-4 text-sm text-ui-muted">{err}</div>
        ) : (
          <MetricTriLineChart data={computed.points} />
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-ui-border bg-ui-bg/15 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-ui-faint">Latest read</div>

        {latest ? (
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-ui-border/20 bg-ui-bg/10 p-3">
              <div className="text-[11px] text-ui-faint">Daily</div>
              <div className="mt-1 text-base font-semibold text-ui-text">{fmtCompact(latest.daily)}</div>
            </div>
            <div className="rounded-2xl border border-ui-border/20 bg-ui-bg/10 p-3">
              <div className="text-[11px] text-ui-faint">MA7</div>
              <div className="mt-1 text-base font-semibold text-ui-text">{fmtCompact(latest.ma7)}</div>
            </div>
            <div className="rounded-2xl border border-ui-border/20 bg-ui-bg/10 p-3">
              <div className="text-[11px] text-ui-faint">MA30</div>
              <div className="mt-1 text-base font-semibold text-ui-text">{fmtCompact(latest.ma30)}</div>
            </div>
            <div className="rounded-2xl border border-ui-border/20 bg-ui-bg/10 p-3">
              <div className="text-[11px] text-ui-faint">Z-score</div>
              <div className="mt-1 text-base font-semibold text-ui-text">{fmtZ(latest.z ?? null)}</div>
              <div className="mt-1 text-[11px] text-ui-faint">{zLabel(latest.z ?? null) ?? "—"}</div>
            </div>
          </div>
        ) : (
          <div className="mt-2 text-sm text-ui-muted">—</div>
        )}

        <div className="mt-3 text-sm">
          <PercentileCopy p={latest?.percentile} />
        </div>

        <div className="mt-2 text-[11px] text-ui-faint">Descriptive only · No prices · No forecasts · No advice</div>
      </div>
    </section>
  );
}