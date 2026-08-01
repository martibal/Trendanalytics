// src/app/about/page.tsx
import type { ReactNode } from "react";
import Link from "next/link";

import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import "server-only";

export const revalidate = 0;

function InlineCode({ children }: { children: ReactNode }) {
  return <code className="code-block inline-block px-2 py-0.5 text-[12px]">{children}</code>;
}

const dataLayers = [
  {
    name: "Gold",
    tag: "daily observations",
    path: "gold/<chain>/<date>.json",
    desc: "Canonical daily network metrics: transaction counts, fees, gas usage, block times, block counts, and active-address observations where available.",
  },
  {
    name: "Meta",
    tag: "network-state layer",
    path: "meta/<chain>/latest.json",
    desc: "The main product output: regime label, confidence, scorecard state, drivers, publication context, and methodology/version anchors.",
  },
  {
    name: "Derived",
    tag: "trend context",
    path: "derived/<chain>/<date>.json",
    desc: "Moving-average series built from Gold data, primarily MA7 and MA30 values used for smoothed trend context.",
  },
  {
    name: "Briefs",
    tag: "readable summaries",
    path: "briefs/chains/<chain>/latest.json",
    desc: "Short descriptive JSON summaries of latest regime context, generated from Meta and guarded against predictive or advisory language.",
  },
];

const audienceCards = [
  {
    label: "Research analysts",
    desc: "Use a regime calendar and weekly context layer when writing reports, comparing protocols, or explaining unusual observations.",
  },
  {
    label: "Protocol and app teams",
    desc: "Separate project-specific activity from chain-wide network state before interpreting growth, support load, latency, or usage changes.",
  },
  {
    label: "Data and model teams",
    desc: "Add a deterministic point-in-time feature to internal tables without maintaining a bespoke chain-classification pipeline.",
  },
];

const operatingPrinciples = [
  {
    label: "Joinable before beautiful",
    desc: "The core object is a daily row keyed by observation date and chain. Dashboards explain it; the data product is the row.",
  },
  {
    label: "Evidence before interpretation",
    desc: "Every label is paired with confidence, component scores, drivers, methodology version, and publication metadata.",
  },
  {
    label: "Bounded by design",
    desc: "Urd Atlas describes observed network state. It does not provide instructions, forecasts, or portfolio recommendations.",
  },
  {
    label: "Useful without infrastructure",
    desc: "Explorer and Analyst Kit give value before a team decides to integrate subscriber artifacts into production systems.",
  },
];

const exploreLinks = [
  { href: "/explorer", label: "Explorer", desc: "Read the latest network state, confidence and freshness without setup" },
  { href: "/analyst-kit", label: "Analyst Kit", desc: "Open CSV calendars, summaries, schema and a starter notebook" },
  { href: "/validation", label: "Validation", desc: "Inspect class balance, transitions and confidence coverage" },
  { href: "/workflows", label: "Workflows", desc: "See how the data joins to reports, dashboards and models" },
  { href: "/api-docs", label: "API docs", desc: "Use public checks and authenticated artifact delivery" },
  { href: "/status", label: "Status", desc: "Publication freshness and current operational state" },
];

export default async function AboutPage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  return (
    <main className="ua-page">
      {/* ── Hero ── */}
      <header className="hero border-b border-[var(--line)]">
        <div className="page-shell">
          <div className="eyebrow mb-4">About Urd Atlas</div>
          <h1 className="ua-h1">A network-state layer for the work analysts already do.</h1>
          <p className="lead mt-4 max-w-3xl">
            Urd Atlas turns public blockchain activity into daily, versioned reference data:
            a regime label, confidence score, component scores, drivers, and publication metadata
            that can be read in a browser, opened as CSV, or joined to internal workflows.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/explorer" className="btn-ghost">Read current state →</Link>
            <Link href="/analyst-kit" className="btn-ghost">Use Analyst Kit →</Link>
            <Link href="/methodology" className="text-link">Methodology →</Link>
          </div>
        </div>
      </header>

      <div className="page-shell py-12 space-y-16">
        {/* ── Positioning ── */}
        <section>
          <div className="section-head mb-8">
            <div>
              <div className="eyebrow mb-3">Mandate</div>
              <h2 className="ua-h2">Make chain conditions explicit</h2>
            </div>
            <p className="text-sm leading-7 text-[var(--ink2)] max-w-xl">
              Most analysis already has dates and chains. Urd Atlas adds the missing context layer:
              what kind of network state surrounded the observation.
            </p>
          </div>

          <div className="fact-row" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            {[
              { label: "Labels", value: "STABLE · HEATING · CONGESTED · CHEAP" },
              { label: "Axes", value: "Demand · Friction · Capacity" },
              { label: "Gate", value: "Confidence-visible rows" },
              { label: "Evidence", value: "Drivers and metadata" },
            ].map(({ label, value }) => (
              <div key={label} className="fact-item">
                <strong>{label}</strong>
                <div className="mt-2 text-sm text-[var(--ink2)] leading-6">{value}</div>
              </div>
            ))}
          </div>

          <div className="border-t border-[var(--line)] pt-8 mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div className="eyebrow mb-3">Problem</div>
              <h3 className="ua-h3">Raw on-chain metrics are observable, but not immediately interpretable.</h3>
            </div>
            <div className="space-y-4 text-[var(--ink2)] text-sm leading-7">
              <p>
                Transaction counts, fees, gas usage, block times and activity metrics are public,
                but a raw spike or drop does not tell a team whether the whole chain was in a different
                state that day.
              </p>
              <p>
                Urd Atlas compares each chain against its own recent history, classifies the network-state
                row, and publishes a compact reference layer that can be joined to the data a user already has.
              </p>
            </div>
          </div>
        </section>

        {/* ── Who it is for ── */}
        <section className="border-t border-[var(--line)] pt-10">
          <div className="section-head mb-8">
            <div>
              <div className="eyebrow mb-3">Who uses it</div>
              <h2 className="ua-h2">Built for analysis, reporting and data systems</h2>
            </div>
            <p className="text-sm leading-7 text-[var(--ink2)] max-w-xl">
              The same published row can support a no-pipeline analyst, a technical evaluator,
              or a production data team. The access path changes; the reference data stays the same.
            </p>
          </div>

          <div className="grid gap-0 md:grid-cols-3">
            {audienceCards.map(({ label, desc }) => (
              <div key={label} className="data-row pr-8" style={{ display: "block", padding: "18px 32px 18px 0" }}>
                <div className="text-[var(--ink)] text-sm font-medium mb-1">{label}</div>
                <div className="text-[var(--ink2)] text-sm leading-6">{desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── What it does not do ── */}
        <section className="border-t border-[var(--line)] pt-10">
          <div className="section-head mb-8">
            <div>
              <div className="eyebrow mb-3">Boundary</div>
              <h2 className="ua-h2">Strictly descriptive</h2>
            </div>
            <p className="text-sm leading-7 text-[var(--ink2)] max-w-xl">
              The product describes observed on-chain conditions. It does not make future-state claims
              or tell users what action to take.
            </p>
          </div>

          <div className="grid gap-0 md:grid-cols-2">
            {[
              { label: "No price data", desc: "Users can combine Urd Atlas with their own datasets, but price is not an active product output." },
              { label: "No forecasts", desc: "The model describes the current published state. It makes no claim about what will happen next." },
              { label: "No instruction layer", desc: "A regime label is context for analysis, not an automated action rule." },
              { label: "No opaque outputs", desc: "Published rows carry methodology, confidence and traceability metadata so users can inspect the basis for interpretation." },
            ].map(({ label, desc }) => (
              <div key={label} className="data-row pr-8" style={{ display: "block", padding: "18px 32px 18px 0" }}>
                <div className="text-[var(--ink)] text-sm font-medium mb-1">{label}</div>
                <div className="text-[var(--ink2)] text-sm leading-6">{desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Data layers ── */}
        <section className="border-t border-[var(--line)] pt-10">
          <div className="section-head mb-8">
            <div>
              <div className="eyebrow mb-3">Data contract</div>
              <h2 className="ua-h2">Four published JSON layers</h2>
            </div>
            <p className="text-sm leading-7 text-[var(--ink2)] max-w-xl">
              The website explains and previews the product, but the durable surface is the data contract:
              JSON artifacts keyed by chain, date, version and methodology.
            </p>
          </div>

          <div className="grid gap-0 md:grid-cols-2">
            {dataLayers.map((layer) => (
              <div key={layer.name} className="border-t border-[var(--line)] pt-6 pb-6 pr-8">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="ua-h3">{layer.name}</h3>
                  <span className="font-mono text-[9px] uppercase tracking-[.1em] text-[var(--gold)] border border-[var(--gold-line)] px-2 py-0.5 rounded-[2px]">{layer.tag}</span>
                </div>
                <p className="text-sm leading-7 text-[var(--ink2)] mb-3">{layer.desc}</p>
                <InlineCode>{layer.path}</InlineCode>
              </div>
            ))}
          </div>
        </section>

        {/* ── Operating principles ── */}
        <section className="border-t border-[var(--line)] pt-10">
          <div className="section-head mb-8">
            <div>
              <div className="eyebrow mb-3">Product principles</div>
              <h2 className="ua-h2">Why this is a reference layer, not just a dashboard</h2>
            </div>
            <p className="text-sm leading-7 text-[var(--ink2)] max-w-xl">
              Urd Atlas is designed to be used downstream: in reports, notebooks, data warehouses,
              model evaluation, dashboard annotation and workflow monitoring.
            </p>
          </div>

          <div className="grid gap-0 md:grid-cols-2">
            {operatingPrinciples.map(({ label, desc }) => (
              <div key={label} className="data-row pr-8" style={{ display: "block", padding: "18px 32px 18px 0" }}>
                <div className="text-[var(--ink)] text-sm font-medium mb-1">{label}</div>
                <div className="text-[var(--ink2)] text-sm leading-6">{desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Source data ── */}
        <section className="border-t border-[var(--line)] pt-10">
          <div className="section-head mb-6">
            <div>
              <div className="eyebrow mb-3">Source data</div>
              <h2 className="ua-h2">Built on public blockchain data</h2>
            </div>
            <div>
              <p className="text-sm leading-7 text-[var(--ink2)] max-w-xl">
                The underlying chain data comes from AWS Public Blockchain Data. Urd Atlas adds
                the analytical layer: daily aggregation, historical context, regime classification,
                confidence gating, and published reference-data JSON.
              </p>
              <p className="text-sm leading-7 text-[var(--ink2)] max-w-xl mt-4">
                The distinction matters: the raw data is public. The product value is the standardized,
                documented and reproducible interpretation layer built on top of it.
              </p>
            </div>
          </div>
        </section>

        {/* ── Dataset context ── */}
        {dataset && (
          <section className="border-t border-[var(--line)] pt-8">
            <div className="eyebrow mb-4">Dataset context</div>
            <div className="fact-row" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
              {dataset.version ? (
                <div className="fact-item">
                  <strong>Published revision</strong>
                  <div className="mt-2 font-mono text-[16px] text-[var(--ink)]">{dataset.version}</div>
                </div>
              ) : null}
              {dataset.methodology_version ? (
                <div className="fact-item">
                  <strong>Methodology version</strong>
                  <div className="mt-2"><InlineCode>{dataset.methodology_version}</InlineCode></div>
                </div>
              ) : null}
              <div className="fact-item">
                <strong>Product mode</strong>
                <div className="mt-2 font-mono text-[13px] text-[var(--c-stable)]">descriptive</div>
              </div>
            </div>
          </section>
        )}

        {/* ── Explore ── */}
        <section className="border-t border-[var(--line)] pt-10">
          <div className="eyebrow mb-6">Start here</div>
          <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
            {exploreLinks.map(({ href, label, desc }) => (
              <Link key={href} href={href} className="data-row pr-6" style={{ display: "block", padding: "16px 24px 16px 0" }}>
                <div className="text-[var(--ink)] text-sm font-medium">{label}</div>
                <div className="mt-1 text-[11px] text-[var(--ink3)]">{desc}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Data contract ── */}
        <details className="border-t border-[var(--line)] pt-6">
          <summary className="eyebrow cursor-pointer">Data contract and traceability anchors</summary>
          <div className="mt-4 space-y-2 text-sm text-[var(--ink2)]">
            <div>Public provenance anchors: date / updated_through / methodology_version / published revision / regime.determinism_hash</div>
            <div>Current published revision: <InlineCode>{dataset?.version ?? "—"}</InlineCode></div>
            <div>Methodology version: <InlineCode>{dataset?.methodology_version ?? "—"}</InlineCode></div>
          </div>
        </details>
      </div>
    </main>
  );
}
