"use client";

import React, { useMemo, useState } from "react";
import type { MetricCatalogEntry } from "@/lib/metrics/catalog";

type ExplainMode = "basic" | "advanced";

function SectionCard(props: {
  title: string;
  body: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ui-border bg-ui-bg/15 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-ui-faint">
          {props.title}
        </div>
        {props.badge ? props.badge : null}
      </div>
      <div className="mt-2 text-sm text-ui-muted leading-relaxed">{props.body}</div>
    </div>
  );
}

function Badge(props: { tone?: "neutral" | "warn"; children: React.ReactNode }) {
  const tone = props.tone ?? "neutral";
  const cls =
    tone === "warn"
      ? "border-ui-border bg-[rgb(var(--bad)/0.10)] text-ui-text"
      : "border-ui-border bg-ui-bg/15 text-ui-muted";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${cls}`}>
      {props.children}
    </span>
  );
}

function pick(mode: ExplainMode, x: { basic?: string; advanced?: string } | undefined) {
  const v = mode === "basic" ? x?.basic : x?.advanced;
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : "—";
}

function isNonEmpty(x: any) {
  return typeof x === "string" && x.trim().length > 0;
}

export function MetricDocBox(props: {
  metric: MetricCatalogEntry;
  defaultMode?: ExplainMode;
  className?: string;
}) {
  const [mode, setMode] = useState<ExplainMode>(props.defaultMode ?? "basic");

  const completeness = useMemo(() => {
    const doc = props.metric?.doc as any;

    const fields: Array<{ k: string; ok: boolean }> = [
      { k: "what.basic", ok: isNonEmpty(doc?.what?.basic) },
      { k: "what.advanced", ok: isNonEmpty(doc?.what?.advanced) },
      { k: "how.basic", ok: isNonEmpty(doc?.how?.basic) },
      { k: "how.advanced", ok: isNonEmpty(doc?.how?.advanced) },
      { k: "why.basic", ok: isNonEmpty(doc?.why?.basic) },
      { k: "why.advanced", ok: isNonEmpty(doc?.why?.advanced) },
      { k: "value.basic", ok: isNonEmpty(doc?.value?.basic) },
      { k: "value.advanced", ok: isNonEmpty(doc?.value?.advanced) },
    ];

    const okCount = fields.reduce((a, f) => a + (f.ok ? 1 : 0), 0);
    const total = fields.length;
    const ratio = total ? okCount / total : 0;

    const missing = fields.filter((f) => !f.ok).map((f) => f.k);

    return { okCount, total, ratio, missing };
  }, [props.metric]);

  const badgeTone = completeness.ratio < 1 ? "warn" : "neutral";
  const badgeText =
    completeness.ratio < 1
      ? `Doc incomplete (${completeness.okCount}/${completeness.total})`
      : "Doc complete (8/8)";

  return (
    <div className={props.className ?? ""}>
      <div className="flex flex-col gap-3 rounded-3xl border border-ui-border bg-ui-bg/10 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ui-text">Metric documentation</div>
            <div className="mt-1 text-xs text-ui-faint">
              Required fields: <span className="text-ui-muted">What / How / Why / Value</span> (Basic + Advanced).
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={badgeTone}>{badgeText}</Badge>

            <button
              type="button"
              className="rounded-full border border-ui-border bg-ui-bg/10 px-3 py-1 text-[11px] font-semibold text-ui-muted hover:bg-ui-bg/20"
              onClick={() => setMode((m) => (m === "basic" ? "advanced" : "basic"))}
            >
              {mode === "basic" ? "Basic" : "Advanced"}
            </button>
          </div>
        </div>

        {completeness.ratio < 1 && completeness.missing.length ? (
          <details className="rounded-2xl border border-ui-border bg-ui-bg/10 p-3">
            <summary className="cursor-pointer select-none text-xs font-semibold text-ui-text">
              Missing doc fields ({completeness.missing.length})
            </summary>
            <div className="mt-2 text-xs text-ui-muted leading-relaxed">
              {completeness.missing.map((k) => (
                <div key={k}>• {k}</div>
              ))}
            </div>
          </details>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <SectionCard title="What is it?" body={pick(mode, props.metric.doc?.what)} />
          <SectionCard title="How is it computed?" body={pick(mode, props.metric.doc?.how)} />
          <SectionCard title="Why is it included?" body={pick(mode, props.metric.doc?.why)} />
          <SectionCard title="What value does it give you?" body={pick(mode, props.metric.doc?.value)} />
        </div>

        <div className="text-[11px] text-ui-faint leading-relaxed">
          Guardrail: documentation is descriptive-only. No prices, no forecasts, no advice.
        </div>
      </div>
    </div>
  );
}