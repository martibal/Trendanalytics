// src/app/glossary/page.tsx
import type { ReactNode } from "react";
import Link from "next/link";

import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { currentDataSource } from "@/lib/storage";
import GlossaryIndexClient from "@/components/glossary/GlossaryIndexClient";
import { GLOSSARY_ENTRIES, type GlossaryEntry as CanonicalGlossaryEntry } from "@/data/glossary";

type SearchParams = { q?: string };

// ---------------------------------------------------------------------------
// Shared UI primitives — identical to chain page, landing page, track record
// ---------------------------------------------------------------------------

function ModalStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          .ta-modal { display: none; }
          .ta-modal:target { display: flex; }
        `,
      }}
    />
  );
}

function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 text-xs">{children}</code>;
}

function MoreLink({ id, label = "More" }: { id: string; label?: string }) {
  return (
    <a
      href={`#${id}`}
      className="inline-flex items-center rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-xs font-medium text-cyan-200 hover:bg-cyan-500/10"
    >
      {label}
    </a>
  );
}

type ExplainPair = { basic: ReactNode; advanced: ReactNode };

function ExplainModal({
  id,
  title,
  subtitle,
  pair,
  traceability,
}: {
  id: string;
  title: string;
  subtitle?: ReactNode;
  pair: ExplainPair;
  traceability?: ReactNode;
}) {
  return (
    <div id={id} className="ta-modal fixed inset-0 z-[80] items-center justify-center p-4">
      <a
        href="#"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        aria-label="Close dialog"
      />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col rounded-3xl border border-cyan-500/20 bg-[#071322] shadow-2xl shadow-cyan-950/40">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/8 px-6 py-5">
          <div>
            <h3 className="text-2xl font-semibold text-white">{title}</h3>
            {subtitle ? (
              <div className="mt-2 text-sm leading-6 text-slate-300">{subtitle}</div>
            ) : null}
          </div>
          <a
            href="#"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-slate-200 hover:bg-white/10"
            aria-label="Close dialog"
          >
            ×
          </a>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-200">
                Basic
              </div>
              <div className="mt-3 text-sm leading-7 text-slate-100">{pair.basic}</div>
            </section>
            <details className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5" open>
              <summary className="cursor-pointer list-none text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                Advanced
              </summary>
              <div className="mt-3 text-sm leading-7 text-slate-100">{pair.advanced}</div>
            </details>
          </div>
          {traceability ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-300">
                Traceability
              </div>
              <div className="mt-3 text-sm leading-7 text-slate-200">{traceability}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline explanations (no separate file needed — glossary page IS the
// definitions surface so explanations live here)
// ---------------------------------------------------------------------------

const howToUseExplain: ExplainPair = {
  basic: (
    <>
      <p>
        The glossary is an alphabetical index of every term this product uses. If you see a
        word on a chain page, a regime label, or a JSON field that you do not recognise, this
        is where to look it up.
      </p>
      <p className="mt-3">
        Every entry has two explanations. The{" "}
        <span className="font-medium text-white">Basic</span> explanation is written for
        someone who has never heard of blockchain before — plain language, intuitive analogies,
        no assumed knowledge. The{" "}
        <span className="font-medium text-white">Advanced</span> explanation is written for
        analysts, quants, and developers who want to understand the exact methodological role
        of the term.
      </p>
      <p className="mt-3">
        A good reading order if you are new: start with the Regime category (the five state
        labels), then Confidence (how much to trust each label), then Scorecard (how the label
        is broken down into three parts), then Drivers (why the label looks the way it does),
        and finally Freshness and Metadata when you want to understand the data provenance.
      </p>
    </>
  ),
  advanced: (
    <>
      <p>
        The glossary is the definitions layer of the product&apos;s documentation stack. It
        sits below the Methodology page (which explains the model logic) and above the
        individual chain pages (which show the model outputs in real time). Its function is
        to make every published field, concept, and term traceable to an exact methodological
        meaning.
      </p>
      <p className="mt-3">
        Each entry maps a term to its canonical JSON field path, source artifact, units, and
        two-level description. The field path is particularly important for API subscribers:
        it is the authoritative mapping between the human-readable term and the machine-readable
        contract, and it should be used as the primary reference when writing code against the
        published JSON.
      </p>
      <p className="mt-3">
        The category taxonomy (regime, confidence, scorecard, drivers, charts, freshness,
        metadata) mirrors the logical layers of the meta artifact. Reading the glossary in
        category order maps directly onto the structure of the published meta JSON and the
        information architecture of the chain pages.
      </p>
    </>
  ),
};

const categoryGuideExplain: ExplainPair = {
  basic: (
    <>
      <p>
        Terms are grouped into seven categories. Here is what each one covers:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>
          <span className="font-medium text-white">Regime</span> — the five published state
          labels (STABLE, HEATING, CONGESTED, CHEAP, UNKNOWN/DEGRADED) and related terms.
          This is the headline output of the product.
        </li>
        <li>
          <span className="font-medium text-white">Confidence</span> — terms that explain how
          much you should trust the current label. Confidence is about evidence strength, not
          about whether the label is correct or incorrect in some deeper sense.
        </li>
        <li>
          <span className="font-medium text-white">Scorecard</span> — terms for the three-axis
          breakdown of the current state: Demand, Friction, and Capacity. The scorecard is the
          structural layer between raw metrics and the headline label.
        </li>
        <li>
          <span className="font-medium text-white">Drivers</span> — terms that explain which
          specific metrics are currently doing the most work in producing the visible label. The
          z-score, percentile, and momentum terms live here.
        </li>
        <li>
          <span className="font-medium text-white">Charts</span> — terms related to how the
          time-series visualisations on chain pages should be read, including MA7, MA30, and
          window selection.
        </li>
        <li>
          <span className="font-medium text-white">Freshness</span> — terms related to how old
          the data is, publication lag policy, and what staleness means for each chain.
        </li>
        <li>
          <span className="font-medium text-white">Metadata</span> — terms related to
          traceability: revision ID, determinism hash, methodology version, and source paths.
        </li>
      </ul>
    </>
  ),
  advanced: (
    <>
      <p>
        The seven categories map directly onto structural layers of the published meta artifact
        and the regime classification pipeline:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>
          <span className="font-medium text-white">Regime</span> — terminal outputs of the
          classification function: <InlineCode>status.label</InlineCode>,{" "}
          <InlineCode>status.color</InlineCode>, <InlineCode>status.one_liner</InlineCode>.
        </li>
        <li>
          <span className="font-medium text-white">Confidence</span> — the evidence-strength
          layer: <InlineCode>confidence.confidence_score</InlineCode>,{" "}
          <InlineCode>confidence.data_quality_score</InlineCode>,{" "}
          <InlineCode>confidence.label_confidence_score</InlineCode>,{" "}
          <InlineCode>publish_confidence.eligible</InlineCode>.
        </li>
        <li>
          <span className="font-medium text-white">Scorecard</span> — the axis decomposition
          layer: <InlineCode>scorecard.dimensions.demand</InlineCode>,{" "}
          <InlineCode>scorecard.dimensions.friction</InlineCode>,{" "}
          <InlineCode>scorecard.dimensions.capacity</InlineCode>, with score, level,
          coverage_factor, and effective_confidence per axis.
        </li>
        <li>
          <span className="font-medium text-white">Drivers</span> — the metric-level evidence
          layer: <InlineCode>regime.drivers[]</InlineCode> with z_robust, pct_90d,
          momentum_7d_vs_30d, current, axis, and trend per driver row.
        </li>
        <li>
          <span className="font-medium text-white">Charts</span> — derived layer: gold series
          plus <InlineCode>derived.metrics.*__ma7</InlineCode> and{" "}
          <InlineCode>derived.metrics.*__ma30</InlineCode>.
        </li>
        <li>
          <span className="font-medium text-white">Freshness</span> —{" "}
          <InlineCode>confidence.lag_days_vs_utc_today</InlineCode>, publication cadence
          policy (BTC/ETH 1d, ARB/BASE 7d), and staleness thresholds.
        </li>
        <li>
          <span className="font-medium text-white">Metadata</span> —{" "}
          <InlineCode>revision_id</InlineCode>,{" "}
          <InlineCode>regime.determinism_hash</InlineCode>,{" "}
          <InlineCode>methodology_version</InlineCode>, dataset manifest fields.
        </li>
      </ul>
    </>
  ),
};

const interpretationBoundaryExplain: ExplainPair = {
  basic: (
    <>
      <p>
        Every definition in this glossary describes what a term means in the context of this
        product&apos;s descriptive, published outputs. No definition implies that you should
        buy, sell, or do anything with your money based on what you read here.
      </p>
      <p className="mt-3">
        The glossary explains what the product is saying — not what you should do with that
        information. That distinction is fundamental: a HEATING label describes the network,
        it does not recommend an action.
      </p>
      <p className="mt-3">
        If a definition ever sounds like it is telling you what will happen next in markets,
        that is a misreading. The correct reading is always descriptive: this is the current
        state of the network relative to its own recent history, nothing more.
      </p>
    </>
  ),
  advanced: (
    <>
      <p>
        The interpretation boundary is enforced at the data contract level, not merely at the
        UI level. No published field contains price data, return forecasts, or advisory signals.
        All outputs are strictly conditional on the current on-chain evidence surface and the
        current methodology version.
      </p>
      <p className="mt-3">
        For glossary definitions specifically, this means: all definitions must remain
        traceable to published artifacts, all definitions must avoid causal claims the data
        cannot support, and all definitions must clearly distinguish descriptive state
        classification from predictive inference. A glossary definition that implies "when
        HEATING, price usually rises" would be a boundary violation — not because it is
        necessarily false, but because the product does not publish the data to support or
        refute that claim.
      </p>
      <p className="mt-3">
        The correct epistemic posture is: use glossary definitions to understand published
        fields, use chain pages to observe current published state, use track record to
        observe historical published state, and bring your own external data and analytical
        framework if you want to combine this context with price or positioning analysis.
      </p>
    </>
  ),
};

const searchTipsExplain: ExplainPair = {
  basic: (
    <>
      <p>
        The search box matches against term names, descriptions, and field paths. Here are
        the most useful things to search for:
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5">
        <li>A regime label you saw on a chain page — try <strong>HEATING</strong> or <strong>STABLE</strong></li>
        <li>A concept you want to understand — try <strong>confidence</strong> or <strong>scorecard</strong></li>
        <li>A JSON field name from the API — try <strong>z_robust</strong> or <strong>lag_days</strong></li>
        <li>A category to browse — use the Category dropdown instead of the search box</li>
      </ul>
      <p className="mt-3">
        The Category filter is often faster than searching if you know roughly what kind of
        term you are looking for. Use Regime for state labels, Drivers for the statistical
        fields, Freshness for lag-related terms.
      </p>
    </>
  ),
  advanced: (
    <>
      <p>
        Search matches against a concatenated haystack of key, label, category, basic
        description, advanced description, units, sourcePath, and fieldPath — all lowercased,
        substring matched. This means you can search by JSON field path directly (e.g.
        <InlineCode>regime.drivers</InlineCode>) or by partial field name (e.g.{" "}
        <InlineCode>pct_90d</InlineCode>) and retrieve the relevant entry.
      </p>
      <p className="mt-3">
        For API subscribers building integrations, the most efficient workflow is to search
        by the exact field path you are consuming from the JSON and use the Advanced
        description as the authoritative contract documentation for that field. The
        sourcePath and fieldPath fields in each entry are the normative machine-readable
        reference — they should be used in preference to the human-readable label when
        writing code.
      </p>
    </>
  ),
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function GlossaryPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const dataset: DatasetManifest | null = await readDatasetManifest();
  const resolvedSearchParams: SearchParams = searchParams ? await searchParams : {};
  const query = (resolvedSearchParams.q ?? "").trim();

  // Read directly from the canonical TypeScript source — no API round-trip,
  // no missing-file risk, guaranteed to have full descriptions.
  const entries: CanonicalGlossaryEntry[] = [...GLOSSARY_ENTRIES].sort((a, b) => {
    const ac = a.category.localeCompare(b.category);
    if (ac !== 0) return ac;
    return a.label.localeCompare(b.label);
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <ModalStyles />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <header className="mb-10">
        <div className="rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_40%)] p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
                Definitions
              </div>
              <h1 className="mt-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Glossary
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-300">
                Every term, field, and concept this product publishes — defined at two levels.
                Plain language for new readers. Full methodological depth for analysts and
                developers.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <MoreLink id="how-to-use-modal" label="How to use this page" />
                <MoreLink id="categories-modal" label="What the categories mean" />
                <MoreLink id="search-tips-modal" label="Search tips" />
                <Link
                  href="/methodology"
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-white/10"
                >
                  Methodology
                </Link>
              </div>
            </div>

            {dataset ? (
              <div className="min-w-[200px] rounded-2xl border border-white/10 bg-black/10 px-4 py-4 text-xs text-slate-300">
                <div className="font-medium uppercase tracking-[0.12em] text-slate-400">
                  Dataset
                </div>
                {dataset.version ? (
                  <div className="mt-2">
                    Revision{" "}
                    <span className="font-semibold text-white">{dataset.version}</span>
                  </div>
                ) : null}
                {dataset.methodology_version ? (
                  <div className="mt-1">
                    Methodology{" "}
                    <InlineCode>{dataset.methodology_version}</InlineCode>
                  </div>
                ) : null}
                <div className="mt-2 border-t border-white/10 pt-2 text-slate-400">
                  Source: <InlineCode>{currentDataSource()}</InlineCode>
                </div>
              </div>
            ) : null}
          </div>

          {/* Category quick-nav */}
          <div className="mt-6 rounded-2xl border border-white/8 bg-white/3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                  Seven categories
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { label: "Regime", q: "regime" },
                    { label: "Confidence", q: "confidence" },
                    { label: "Scorecard", q: "scorecard" },
                    { label: "Drivers", q: "driver" },
                    { label: "Charts", q: "chart" },
                    { label: "Freshness", q: "lag" },
                    { label: "Metadata", q: "revision" },
                  ].map(({ label, q }) => (
                    <Link
                      key={q}
                      href={`/glossary?q=${q}`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
              <MoreLink id="categories-modal" label="What these mean" />
            </div>
          </div>
        </div>
      </header>

      {/* ── Entry count orientation strip ────────────────────────────────── */}
      <section className="mb-8 rounded-3xl border p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
              Coverage
            </div>
            <h2 className="mt-1 text-2xl font-semibold">
              {entries.length > 0 ? (
                <>
                  <span className="text-white">{entries.length}</span>{" "}
                  <span className="text-muted-foreground text-xl font-normal">
                    published definitions across 7 categories
                  </span>
                </>
              ) : (
                "Loading definitions…"
              )}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              Each entry maps a term to its canonical JSON field, its methodological role, and
              two levels of explanation. All definitions are descriptive — no entry implies a
              recommendation or a forecast.
            </p>
          </div>
          <MoreLink id="boundary-modal" label="Interpretation boundary" />
        </div>

        {/* Summary counts per category */}
        {entries.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {(
              [
                "regime",
                "confidence",
                "scorecard",
                "drivers",
                "charts",
                "freshness",
                "metadata",
              ] as const
            ).map((cat) => {
              const count = entries.filter((e) => e.category === cat).length;
              if (count === 0) return null;
              const labels: Record<string, string> = {
                regime: "Regime",
                confidence: "Confidence",
                scorecard: "Scorecard",
                drivers: "Drivers",
                charts: "Charts",
                freshness: "Freshness",
                metadata: "Metadata",
              };
              return (
                <Link
                  key={cat}
                  href={`/glossary?q=${cat}`}
                  className="group rounded-2xl border bg-background/40 px-4 py-2.5 transition hover:border-cyan-500/30 hover:bg-muted/30"
                >
                  <div className="text-xs font-medium uppercase tracking-[0.12em] text-cyan-200">
                    {labels[cat]}
                  </div>
                  <div className="mt-1 text-xl font-semibold text-white">{count}</div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </section>

      {/* ── Lookup / search ───────────────────────────────────────────────── */}
      <section className="mb-2">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
              Search
            </div>
            <h2 className="mt-1 text-3xl font-semibold">Look up a term</h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
              Search by term name, JSON field path, description keyword, or use the category
              filter to browse a specific layer.
              {query.length > 0 ? (
                <>
                  {" "}Showing results for{" "}
                  <span className="font-medium text-white">&quot;{query}&quot;</span>.
                </>
              ) : null}
            </p>
          </div>
          <MoreLink id="search-tips-modal" label="Search tips" />
        </div>

        <GlossaryIndexClient entries={entries} initialQuery={query} />
      </section>

      {/* ── Navigation strip ─────────────────────────────────────────────── */}
      <section className="mt-10 rounded-3xl border p-6 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
          Related
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/methodology", label: "Methodology", desc: "How the model works end to end" },
            { href: "/methodology/previously", label: "Previous methodology", desc: "Historical versions and changes" },
            { href: "/thresholds", label: "Thresholds", desc: "Canonical classification parameters" },
            { href: "/chains", label: "Chains", desc: "Current regime for each network" },
            { href: "/track-record", label: "Track Record", desc: "Historical label archive" },
            { href: "/api-docs", label: "API Docs", desc: "Subscriber file delivery contract" },
          ].map(({ href, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center justify-between rounded-2xl border bg-background/40 px-4 py-3 transition hover:border-cyan-500/30 hover:bg-muted/30"
            >
              <div>
                <div className="text-sm font-medium text-white">{label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
              </div>
              <span className="text-xs text-muted-foreground transition group-hover:text-cyan-200">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Data contract ─────────────────────────────────────────────────── */}
      <details className="mt-8 rounded-2xl border p-5">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
          Data contract and traceability
        </summary>
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          <div>
            Source route: <InlineCode>/api/v1/glossary</InlineCode>
          </div>
          <div>
            Data source: <InlineCode>{currentDataSource()}</InlineCode>
          </div>
          <div>
            Definitions are product-specific. They explain how terms are used in
            TrendAnalytics, not how every analytics product in crypto or finance necessarily
            uses the same word.
          </div>
          <div>
            The glossary is aligned with methodology version{" "}
            <InlineCode>{dataset?.methodology_version ?? "—"}</InlineCode>. If methodology
            changes, definitions may be updated and prior versions remain visible at{" "}
            <Link href="/methodology/previously" className="underline hover:text-foreground">
              /methodology/previously
            </Link>
            .
          </div>
        </div>
      </details>

      {/* ── All modals ────────────────────────────────────────────────────── */}
      <ExplainModal
        id="how-to-use-modal"
        title="How to use the glossary"
        subtitle="A guide for new readers and returning analysts."
        pair={howToUseExplain}
      />

      <ExplainModal
        id="categories-modal"
        title="What the seven categories mean"
        subtitle="A map of the glossary taxonomy and the published artifact layers it covers."
        pair={categoryGuideExplain}
        traceability={
          <ul className="list-disc pl-5">
            <li>Category filter maps directly to <InlineCode>entry.category</InlineCode></li>
            <li>Categories mirror the logical layers of <InlineCode>meta/&lt;chain&gt;/latest.json</InlineCode></li>
          </ul>
        }
      />

      <ExplainModal
        id="boundary-modal"
        title="Interpretation boundary"
        subtitle="What glossary definitions are and are not."
        pair={interpretationBoundaryExplain}
      />

      <ExplainModal
        id="search-tips-modal"
        title="Search and filter tips"
        subtitle="How to find what you are looking for quickly."
        pair={searchTipsExplain}
        traceability={
          <ul className="list-disc pl-5">
            <li>Search matches: key · label · category · basic · advanced · units · sourcePath · fieldPath</li>
            <li>Category filter: exact match on <InlineCode>entry.category</InlineCode></li>
            <li>Quick-links in the hero use <InlineCode>?q=</InlineCode> URL param — bookmark any filtered view</li>
          </ul>
        }
      />
    </main>
  );
}
