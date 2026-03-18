// src/components/trust/RegimeStatsPanel.tsx
"use client";

import React, { useMemo } from "react";
import { PanelPurpose } from "@/components/info-boxes/PanelPurpose";

export type Verdict = "LIKELY_NOISE" | "STRUCTURAL_SHIFT" | "INSUFFICIENT_DATA";

export type RegimeHistoryPoint = {
  date: string; // YYYY-MM-DD
  label: string;
  verdict: Verdict;
  confidence_score: number | null;
  gate_status: string | null;
  drivers: Array<{ metric: string; axis?: string; band?: string; trend?: string }>;
  axes?: Record<string, { band_high: string; band_low: string; trend: string }>;
};

function isISODate(x: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(x);
}

function fmtPct(x01: number) {
  if (!Number.isFinite(x01)) return "—";
  return `${Math.round(x01 * 100)}%`;
}

function fmtInt(x: number) {
  if (!Number.isFinite(x)) return "—";
  return `${Math.round(x)}`;
}

function badgeTone(v: Verdict) {
  if (v === "LIKELY_NOISE") return "border-ui-ok/25 bg-ui-ok/10 text-ui-ok";
  if (v === "STRUCTURAL_SHIFT") return "border-ui-warn/25 bg-ui-warn/10 text-ui-warn";
  return "border-ui-border bg-ui-bg/20 text-ui-muted";
}

function StatCard(props: { title: string; value: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ui-border bg-ui-bg/10 p-4">
      <div className="text-[11px] uppercase tracking-wide text-ui-faint">{props.title}</div>
      <div className="mt-1 text-lg font-semibold text-ui-text tabular-nums">{props.value}</div>
      {props.subtitle ? <div className="mt-1 text-xs text-ui-muted">{props.subtitle}</div> : null}
    </div>
  );
}

function Pill(props: { label: string; value: React.ReactNode; tone?: string; title?: string }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold",
        props.tone ?? "border-ui-border bg-ui-bg/15 text-ui-muted",
      ].join(" ")}
      title={props.title}
    >
      <span className="text-ui-faint">{props.label}</span>
      <span className="font-mono text-ui-text tabular-nums">{props.value}</span>
    </span>
  );
}

type Streak = { verdict: Verdict; start: string; end: string; days: number };

function computeStreaks(pointsAsc: RegimeHistoryPoint[]): Streak[] {
  const out: Streak[] = [];
  if (!pointsAsc.length) return out;

  let cur: Streak = {
    verdict: pointsAsc[0].verdict,
    start: pointsAsc[0].date,
    end: pointsAsc[0].date,
    days: 1,
  };

  for (let i = 1; i < pointsAsc.length; i++) {
    const p = pointsAsc[i];
    if (p.verdict === cur.verdict) {
      cur.end = p.date;
      cur.days += 1;
    } else {
      out.push(cur);
      cur = { verdict: p.verdict, start: p.date, end: p.date, days: 1 };
    }
  }
  out.push(cur);
  return out;
}

function normalizeGate(x: string | null | undefined): string | null {
  if (!x) return null;
  const s = String(x).toUpperCase().trim();
  return s.length ? s : null;
}

export function RegimeStatsPanel(props: {
  points: RegimeHistoryPoint[];
  title?: string;
  id?: string;
}) {
  const safePoints = useMemo(() => {
    const arr = Array.isArray(props.points) ? props.points.filter((p) => p && isISODate(p.date)) : [];
    arr.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return arr;
  }, [props.points]);

  const stats = useMemo(() => {
    const n = safePoints.length;
    if (!n) {
      return {
        n: 0,
        start: null as string | null,
        end: null as string | null,
        flips: 0,
        flipRate: 0,
        counts: { LIKELY_NOISE: 0, STRUCTURAL_SHIFT: 0, INSUFFICIENT_DATA: 0 } as Record<Verdict, number>,
        insufficientShare: 0,
        gateDegradedShare: 0,
        longest: null as Streak | null,
        longestNoise: null as Streak | null,
        longestShift: null as Streak | null,
        longestInsufficient: null as Streak | null,
      };
    }

    const counts: Record<Verdict, number> = {
      LIKELY_NOISE: 0,
      STRUCTURAL_SHIFT: 0,
      INSUFFICIENT_DATA: 0,
    };

    let flips = 0;
    for (let i = 0; i < n; i++) {
      const v = safePoints[i].verdict;
      counts[v] += 1;
      if (i > 0 && safePoints[i - 1].verdict !== v) flips += 1;
    }

    const insufficientShare = counts.INSUFFICIENT_DATA / n;

    // Gate degraded share: days where gate_status is DEGRADED/BLOCKED/UNKNOWN (best-effort)
    let degraded = 0;
    for (const p of safePoints) {
      const g = normalizeGate(p.gate_status);
      if (g === "DEGRADED" || g === "BLOCKED" || g === "UNKNOWN") degraded += 1;
    }
    const gateDegradedShare = degraded / n;

    const streaks = computeStreaks(safePoints);
    let longest: Streak | null = null;
    let longestNoise: Streak | null = null;
    let longestShift: Streak | null = null;
    let longestInsufficient: Streak | null = null;

    for (const s of streaks) {
      if (!longest || s.days > longest.days) longest = s;
      if (s.verdict === "LIKELY_NOISE" && (!longestNoise || s.days > longestNoise.days)) longestNoise = s;
      if (s.verdict === "STRUCTURAL_SHIFT" && (!longestShift || s.days > longestShift.days)) longestShift = s;
      if (s.verdict === "INSUFFICIENT_DATA" && (!longestInsufficient || s.days > longestInsufficient.days))
        longestInsufficient = s;
    }

    // Flip-rate: flips per day over transitions (n-1). Interpretable as "how often it changes".
    const denom = Math.max(1, n - 1);
    const flipRate = flips / denom;

    return {
      n,
      start: safePoints[0].date,
      end: safePoints[n - 1].date,
      flips,
      flipRate,
      counts,
      insufficientShare,
      gateDegradedShare,
      longest,
      longestNoise,
      longestShift,
      longestInsufficient,
    };
  }, [safePoints]);

  return (
    <section id={props.id} className="rounded-2xl border border-ui-border bg-ui-bg/10 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm font-semibold text-ui-text">{props.title ?? "History stats"}</div>
          <div className="mt-1 text-xs text-ui-muted">
            Range:{" "}
            <span className="font-mono text-ui-text">{stats.start ?? "—"}</span> →{" "}
            <span className="font-mono text-ui-text">{stats.end ?? "—"}</span>{" "}
            <span className="text-ui-faint">({stats.n} days)</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <Pill
            label="flip rate"
            value={stats.n ? fmtPct(stats.flipRate) : "—"}
            title="Share of day-to-day transitions where the verdict changed (flips / (N-1))."
          />
          <Pill
            label="insufficient"
            value={stats.n ? fmtPct(stats.insufficientShare) : "—"}
            title="Share of days where verdict is withheld due to insufficient inputs / gating."
          />
          <Pill
            label="gate degraded"
            value={stats.n ? fmtPct(stats.gateDegradedShare) : "—"}
            title="Share of days with gate_status in {DEGRADED, BLOCKED, UNKNOWN} when provided."
          />
        </div>
      </div>

      <PanelPurpose
        className="mt-3"
        whatThisShows={
          "Summary statistics over the historical regime timeline: how often the verdict changes (flip rate), " +
          "how long regimes persist (streaks), and how frequently classification is withheld (insufficient / degraded gating)."
        }
        commonlyUsedFor={[
          "Quantifying regime stability vs frequent flips (noise filtering at the regime level).",
          "Comparing chains or time ranges by persistence and withholding rate (data-quality impact).",
          "Finding long stretches to inspect drivers and context during stable vs shifting periods.",
        ]}
      />

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard
          title="Total flips"
          value={stats.n ? fmtInt(stats.flips) : "—"}
          subtitle="Count of day-to-day verdict changes across the range."
        />
        <StatCard
          title="Longest streak (any verdict)"
          value={stats.longest ? `${stats.longest.days}d` : "—"}
          subtitle={
            stats.longest ? (
              <>
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] ${badgeTone(stats.longest.verdict)}`}>
                  <span className="text-ui-faint">Verdict</span>
                  <span className="text-ui-text">{stats.longest.verdict.replaceAll("_", " ").toLowerCase()}</span>
                </span>
                <span className="ml-2 font-mono text-ui-faint">
                  {stats.longest.start} → {stats.longest.end}
                </span>
              </>
            ) : null
          }
        />
        <StatCard
          title="Insufficient days"
          value={stats.n ? `${stats.counts.INSUFFICIENT_DATA}` : "—"}
          subtitle="Days where classification is withheld due to gating/inputs."
        />
      </div>

      <div className="mt-4 rounded-2xl border border-ui-border bg-ui-bg/10 p-4">
        <div className="text-[11px] uppercase tracking-wide text-ui-faint">Verdict distribution</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill
            label="likely noise"
            value={`${stats.counts.LIKELY_NOISE} (${stats.n ? fmtPct(stats.counts.LIKELY_NOISE / stats.n) : "—"})`}
            tone={badgeTone("LIKELY_NOISE")}
          />
          <Pill
            label="structural shift"
            value={`${stats.counts.STRUCTURAL_SHIFT} (${stats.n ? fmtPct(stats.counts.STRUCTURAL_SHIFT / stats.n) : "—"})`}
            tone={badgeTone("STRUCTURAL_SHIFT")}
          />
          <Pill
            label="insufficient"
            value={`${stats.counts.INSUFFICIENT_DATA} (${stats.n ? fmtPct(stats.counts.INSUFFICIENT_DATA / stats.n) : "—"})`}
            tone={badgeTone("INSUFFICIENT_DATA")}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatCard
            title="Longest noise streak"
            value={stats.longestNoise ? `${stats.longestNoise.days}d` : "—"}
            subtitle={stats.longestNoise ? `${stats.longestNoise.start} → ${stats.longestNoise.end}` : null}
          />
          <StatCard
            title="Longest shift streak"
            value={stats.longestShift ? `${stats.longestShift.days}d` : "—"}
            subtitle={stats.longestShift ? `${stats.longestShift.start} → ${stats.longestShift.end}` : null}
          />
          <StatCard
            title="Longest insufficient streak"
            value={stats.longestInsufficient ? `${stats.longestInsufficient.days}d` : "—"}
            subtitle={stats.longestInsufficient ? `${stats.longestInsufficient.start} → ${stats.longestInsufficient.end}` : null}
          />
        </div>

        <div className="mt-3 text-[11px] text-ui-faint">
          Notes: flip rate is computed on verdict changes only (not label text). Gating stats use gate_status when present.
        </div>
      </div>
    </section>
  );
}