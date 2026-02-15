"use client";

import React, { useMemo, useState } from "react";
import { METRIC_CATALOG, type MetricCatalogEntry } from "@/lib/metrics/catalog";

type ExplainMode = "basic" | "advanced";
type Variant = "methodology" | "wiki";

function isNonEmpty(s: any) {
  return typeof s === "string" && s.trim().length > 0;
}

function pick(mode: ExplainMode, x: { basic?: string; advanced?: string } | undefined) {
  const v = mode === "basic" ? x?.basic : x?.advanced;
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : "—";
}

function Pill(props: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-ui-border bg-ui-bg/15 px-3 py-1 text-[11px] font-semibold text-ui-muted">
      {props.children}
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
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] ${cls}`}>
      <span className="text-ui-faint">{props.label}</span>
      <span className="font-mono text-ui-muted">{props.value}</span>
    </span>
  );
}

function completeness(entry: MetricCatalogEntry) {
  const doc = (entry as any)?.doc ?? {};
  const fields = [
    isNonEmpty(doc?.what?.basic),
    isNonEmpty(doc?.what?.advanced),
    isNonEmpty(doc?.how?.basic),
    isNonEmpty(doc?.how?.advanced),
    isNonEmpty(doc?.why?.basic),
    isNonEmpty(doc?.why?.advanced),
    isNonEmpty(doc?.value?.basic),
    isNonEmpty(doc?.value?.advanced),
  ];
  const ok = fields.reduce((a, b) => a + (b ? 1 : 0), 0);
  return { ok, total: fields.length };
}

function normalize(s: string) {
  return s.toLowerCase().trim();
}

function inText(hay: string, needle: string) {
  if (!needle) return true;
  return normalize(hay).includes(normalize(needle));
}

function entryText(e: MetricCatalogEntry) {
  const doc = (e as any)?.doc ?? {};
  const parts = [
    e.key,
    e.label ?? "",
    doc?.what?.basic ?? "",
    doc?.what?.advanced ?? "",
    doc?.how?.basic ?? "",
    doc?.how?.advanced ?? "",
    doc?.why?.basic ?? "",
    doc?.why?.advanced ?? "",
    doc?.value?.basic ?? "",
    doc?.value?.advanced ?? "",
    (e as any)?.unit ?? "",
    Array.isArray((e as any)?.tags) ? (e as any).tags.join(" ") : "",
    typeof (e as any)?.dimension === "string" ? (e as any).dimension : "",
  ];
  return parts.join(" | ");
}

function SectionCard(props: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-ui-border bg-ui-bg/12 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ui-faint">{props.title}</div>
      <div className="mt-2 text-sm text-ui-muted leading-relaxed">{props.body}</div>
    </div>
  );
}

function AnchorLink({ id }: { id: string }) {
  return (
    <a
      href={`#${id}`}
      className="rounded-full border border-ui-border bg-ui-bg/10 px-3 py-1 text-[11px] font-semibold text-ui-muted hover:bg-ui-bg/20"
      title="Copy-able anchor"
    >
      #{id}
    </a>
  );
}

function sortEntries(arr: MetricCatalogEntry[]) {
  return [...arr].sort((a, b) => (a.key ?? "").localeCompare(b.key ?? ""));
}

function inferDimension(e: MetricCatalogEntry): string {
  const d = (e as any)?.dimension;
  if (typeof d === "string" && d.trim()) return d.trim();
  const tags = (e as any)?.tags;
  if (Array.isArray(tags)) {
    const t = tags.map(String).map((x) => x.toLowerCase());
    if (t.includes("demand")) return "Demand";
    if (t.includes("friction")) return "Friction";
    if (t.includes("capacity")) return "Capacity";
    if (t.includes("throughput")) return "Throughput";
    if (t.includes("quality")) return "Quality";
  }
  return "Other";
}

function groupByDimension(entries: MetricCatalogEntry[]) {
  const groups = new Map<string, MetricCatalogEntry[]>();
  for (const e of entries) {
    const dim = inferDimension(e);
    const prev = groups.get(dim) ?? [];
    prev.push(e);
    groups.set(dim, prev);
  }
  // Stable dimension order
  const order = ["Demand", "Friction", "Capacity", "Throughput", "Quality", "Other"];
  const keys = Array.from(groups.keys()).sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return keys.map((k) => ({ title: k, items: sortEntries(groups.get(k) ?? []) }));
}

export function CatalogDocsClient(props: { variant: Variant }) {
  const [mode, setMode] = useState<ExplainMode>("basic");
  const [q, setQ] = useState<string>("");
  const [grouped, setGrouped] = useState<boolean>(true);
  const [onlyIncomplete, setOnlyIncomplete] = useState<boolean>(false);

  const all = useMemo(() => {
    const arr = Array.isArray(METRIC_CATALOG) ? METRIC_CATALOG : [];
    return sortEntries(arr as MetricCatalogEntry[]);
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim();
    const out: MetricCatalogEntry[] = [];

    for (const e of all) {
      if (onlyIncomplete) {
        const c = completeness(e);
        if (c.ok >= c.total) continue;
      }

      if (!needle) {
        out.push(e);
        continue;
      }

      const hay = entryText(e);
      if (inText(hay, needle)) out.push(e);
    }

    return out;
  }, [all, q, onlyIncomplete]);

  const groups = useMemo(() => groupByDimension(filtered), [filtered]);

  const pageTitle = props.variant === "methodology" ? "Methodology" : "Wiki";
  const pageSubtitle =
    props.variant === "methodology"
      ? "Computation, definitions, and auditability. Rendered directly from the metric catalog."
      : "Concepts and definitions for every metric. Rendered directly from the metric catalog.";

  const sectionPlan =
    props.variant === "methodology"
      ? ([
          { k: "How is it computed?", pick: (e: MetricCatalogEntry) => pick(mode, e.doc?.how) },
          { k: "What is it?", pick: (e: MetricCatalogEntry) => pick(mode, e.doc?.what) },
          { k: "Why is it included?", pick: (e: MetricCatalogEntry) => pick(mode, e.doc?.why) },
          { k: "What value does it give you?", pick: (e: MetricCatalogEntry) => pick(mode, e.doc?.value) },
        ] as const)
      : ([
          { k: "What is it?", pick: (e: MetricCatalogEntry) => pick(mode, e.doc?.what) },
          { k: "Why is it included?", pick: (e: MetricCatalogEntry) => pick(mode, e.doc?.why) },
          { k: "What value does it give you?", pick: (e: MetricCatalogEntry) => pick(mode, e.doc?.value) },
          { k: "How is it computed?", pick: (e: MetricCatalogEntry) => pick(mode, e.doc?.how) },
        ] as const);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-8 rounded-3xl border border-ui-border bg-ui-bg/20 p-7 ui-lift">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Pill>Descriptive only</Pill>
              <Pill>No prices</Pill>
              <Pill>No forecasts</Pill>
              <Pill>No advice</Pill>
            </div>

            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-ui-text md:text-5xl">{pageTitle}</h1>
            <p className="mt-3 max-w-3xl text-pretty text-base text-ui-muted md:text-lg">{pageSubtitle}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Chip label="metrics" value={`${filtered.length}`} />
              <Chip label="mode" value={mode} />
              <Chip label="grouped" value={grouped ? "yes" : "no"} />
              <Chip label="only incomplete" value={onlyIncomplete ? "yes" : "no"} tone={onlyIncomplete ? "warn" : "neutral"} />
            </div>
          </div>

          <div className="mt-2 flex w-full flex-col gap-3 md:mt-0 md:w-[420px] md:items-end">
            <div className="flex w-full items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search metrics (key, label, docs)…"
                className="w-full rounded-2xl border border-ui-border bg-ui-bg/15 px-4 py-3 text-sm text-ui-text outline-none focus:ring-2 focus:ring-ui-accent/30"
              />
              <button
                type="button"
                className="shrink-0 rounded-2xl border border-ui-border bg-ui-bg/10 px-4 py-3 text-sm font-semibold text-ui-muted hover:bg-ui-bg/20"
                onClick={() => setQ("")}
              >
                Clear
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-ui-border bg-ui-bg/10 px-3 py-1 text-[11px] font-semibold text-ui-muted hover:bg-ui-bg/20"
                onClick={() => setMode((m) => (m === "basic" ? "advanced" : "basic"))}
              >
                {mode === "basic" ? "Basic" : "Advanced"}
              </button>

              <button
                type="button"
                className="rounded-full border border-ui-border bg-ui-bg/10 px-3 py-1 text-[11px] font-semibold text-ui-muted hover:bg-ui-bg/20"
                onClick={() => setGrouped((g) => !g)}
              >
                {grouped ? "Grouped" : "Flat"}
              </button>

              <button
                type="button"
                className="rounded-full border border-ui-border bg-ui-bg/10 px-3 py-1 text-[11px] font-semibold text-ui-muted hover:bg-ui-bg/20"
                onClick={() => setOnlyIncomplete((v) => !v)}
              >
                {onlyIncomplete ? "Showing incomplete" : "All metrics"}
              </button>
            </div>

            <div className="text-[11px] text-ui-faint text-right">
              Tip: each metric section has a stable anchor (<span className="font-mono text-ui-muted">#metric_key</span>).
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-ui-border bg-ui-bg/15 p-7 text-ui-muted">No metrics match your search.</div>
      ) : grouped ? (
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g.title} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-ui-text">{g.title}</h2>
                <div className="text-xs text-ui-faint">{g.items.length} metrics</div>
              </div>
              <div className="space-y-6">
                {g.items.map((e) => (
                  <MetricDocEntry key={e.key} entry={e} mode={mode} sectionPlan={sectionPlan} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {filtered.map((e) => (
            <MetricDocEntry key={e.key} entry={e} mode={mode} sectionPlan={sectionPlan} />
          ))}
        </div>
      )}

      <div className="mt-10 rounded-3xl border border-ui-border bg-ui-bg/15 p-6">
        <div className="text-sm font-semibold text-ui-text">Versioning (“Previously”)</div>
        <div className="mt-2 text-sm text-ui-muted leading-relaxed">
          This page renders from the metric catalog. When a definition or computation changes, keep the old text under a
          <span className="font-mono text-ui-text"> previously</span> field in the catalog entry, and render it here as an
          expandable section. (Catalog schema can be extended without changing this page’s contract.)
        </div>
        <div className="mt-3 text-[11px] text-ui-faint">Descriptive only · No prices · No forecasts · No advice</div>
      </div>
    </div>
  );
}

function MetricDocEntry(props: {
  entry: MetricCatalogEntry;
  mode: ExplainMode;
  sectionPlan: ReadonlyArray<{ k: string; pick: (e: MetricCatalogEntry) => string }>;
}) {
  const c = completeness(props.entry);
  const isIncomplete = c.ok < c.total;

  const dim = inferDimension(props.entry);
  const unit = (props.entry as any)?.unit;
  const tags = Array.isArray((props.entry as any)?.tags) ? ((props.entry as any).tags as any[]).map(String) : [];

  return (
    <section id={props.entry.key} className="rounded-3xl border border-ui-border bg-ui-bg/20 p-6 ui-lift">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill>{props.entry.key}</Pill>
            <Pill>{dim}</Pill>
            {unit ? <Pill>unit: {String(unit)}</Pill> : null}
            {isIncomplete ? <Chip label="docs" value={`${c.ok}/${c.total}`} tone="warn" /> : <Chip label="docs" value="8/8" />}
          </div>

          <div className="mt-3 text-xl font-semibold text-ui-text">{props.entry.label ?? props.entry.key}</div>
          {tags.length ? (
            <div className="mt-1 text-xs text-ui-faint">
              tags: <span className="text-ui-muted">{tags.join(", ")}</span>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <AnchorLink id={props.entry.key} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {props.sectionPlan.map((s) => (
          <SectionCard key={s.k} title={s.k} body={s.pick(props.entry)} />
        ))}
      </div>

      {/* Optional: previously (if present in catalog) */}
      {(() => {
        const prev = (props.entry as any)?.previously;
        if (!prev || typeof prev !== "object") return null;

        const hasAny =
          isNonEmpty(prev?.what?.basic) ||
          isNonEmpty(prev?.what?.advanced) ||
          isNonEmpty(prev?.how?.basic) ||
          isNonEmpty(prev?.how?.advanced) ||
          isNonEmpty(prev?.why?.basic) ||
          isNonEmpty(prev?.why?.advanced) ||
          isNonEmpty(prev?.value?.basic) ||
          isNonEmpty(prev?.value?.advanced);

        if (!hasAny) return null;

        return (
          <details className="mt-5 rounded-2xl border border-ui-border bg-ui-bg/12 p-4">
            <summary className="cursor-pointer select-none text-sm font-semibold text-ui-text">
              Previously (older definition / computation)
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <SectionCard title="Previously: What" body={pick(props.mode, prev?.what)} />
              <SectionCard title="Previously: How" body={pick(props.mode, prev?.how)} />
              <SectionCard title="Previously: Why" body={pick(props.mode, prev?.why)} />
              <SectionCard title="Previously: Value" body={pick(props.mode, prev?.value)} />
            </div>
            <div className="mt-2 text-[11px] text-ui-faint">Older content is retained for auditability.</div>
          </details>
        );
      })()}
    </section>
  );
}