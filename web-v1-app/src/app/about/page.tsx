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
  { name: "Gold", tag: "raw daily observations", path: "gold/<chain>/<date>.json", desc: "Canonical daily network metrics: transaction counts, fees, gas usage, block times, block counts, and active-address observations where available." },
  { name: "Meta", tag: "regime interpretation", path: "meta/<chain>/latest.json", desc: "The main product output: regime label, confidence, scorecard, drivers, publication context, and methodology/version anchors." },
  { name: "Derived", tag: "trend series", path: "derived/<chain>/<date>.json", desc: "Moving-average series built from Gold data, primarily MA7 and MA30 values used for smoothed trend context." },
  { name: "Briefs", tag: "readable summaries", path: "briefs/chains/<chain>/latest.json", desc: "Short descriptive JSON summaries of latest regime context, generated from Meta and guarded against predictive or advisory language." },
];

const exploreLinks = [
  { href: "/chains", label: "Chains", desc: "Current regime state across BTC, ETH, ARB, and BASE" },
  { href: "/status", label: "Status", desc: "Publication freshness and data availability" },
  { href: "/track-record", label: "Track record", desc: "Historical labels and archive context" },
  { href: "/thresholds", label: "Thresholds", desc: "Classification bands and rule surfaces" },
  { href: "/glossary", label: "Glossary", desc: "Metric and methodology definitions" },
  { href: "/api-docs", label: "API docs", desc: "JSON access, schema, and workflows" },
];

export default async function AboutPage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  return (
    <main className="ua-page">

      {/* ── Hero ── */}
      <header className="hero border-b border-[var(--line)]">
        <div className="page-shell">
          <div className="eyebrow mb-4">About Urd Atlas</div>
          <h1 className="ua-h1">Blockchain regime data, <em>stripped down to evidence.</em></h1>
          <p className="lead mt-4 max-w-2xl">
            Urd Atlas is a deterministic, explainable context layer for Bitcoin, Ethereum,
            Arbitrum, and Base. It answers one narrow question: is current network activity
            normal noise, or a persistent change in regime?
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/chains" className="btn-ghost">See current regimes →</Link>
            <Link href="/methodology" className="text-link">Methodology →</Link>
          </div>
        </div>
      </header>

      <div className="page-shell py-12 space-y-16">

        {/* ── What it does ── */}
        <section>
          <div className="section-head mb-8">
            <div>
              <div className="eyebrow mb-3">Mandate</div>
              <h2 className="ua-h2">Separate regime from noise</h2>
            </div>
            <p className="text-sm leading-7 text-[var(--ink2)] max-w-xl">
              A narrow daily context layer for BTC, ETH, ARB, and BASE. It classifies persistent
              network-state changes without mixing in price, forecasts, or advice.
            </p>
          </div>

          <div className="fact-row" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            {[
              { label: "Labels", value: "STABLE · HEATING · CONGESTED · CHEAP" },
              { label: "Axes", value: "Demand · Friction · Capacity" },
              { label: "Gate", value: "Confidence-gated labels" },
              { label: "Evidence", value: "Ranked drivers per day" },
            ].map(({ label, value }) => (
              <div key={label} className="fact-item">
                <strong>{label}</strong>
                <div className="mt-2 text-sm text-[var(--ink2)] leading-6">{value}</div>
              </div>
            ))}
          </div>

          <div className="border-t border-[var(--line)] pt-8 mt-8">
            <p className="text-[var(--ink2)] text-sm leading-7 max-w-3xl">
              Blockchains produce enormous amounts of data every day. Transaction counts, fees,
              block times, gas usage — all of it is public. But raw numbers are hard to interpret.
              Is a spike in transactions meaningful or will it reverse tomorrow? Is a fee increase
              a regime shift or just noise from a single application?
            </p>
            <p className="text-[var(--ink2)] text-sm leading-7 max-w-3xl mt-4">
              Urd Atlas answers by comparing each chain&apos;s current metrics against its own recent
              history, applying a documented classification model, and publishing a daily descriptive
              label along with the full breakdown of why that label was assigned.
            </p>
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
              The product describes observed on-chain conditions. It does not tell users what
              to buy, sell, hold, expect, or forecast.
            </p>
          </div>

          <div className="grid gap-0 md:grid-cols-2">
            {[
              { label: "No price data", desc: "If you want to combine regime state with price, you bring your own price data." },
              { label: "No forecasts", desc: "The model describes the current state. It makes no claim about what will happen next." },
              { label: "No trading signals", desc: "CONGESTED is not a sell signal. CHEAP is not a buy signal." },
              { label: "No opaque outputs", desc: "Every number can be traced back to source artifact, formula, and methodology version." },
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
              The product is not a dashboard first and a data service second. The on-chain
              reference data is the product surface. The website explains, previews, and
              contextualizes what subscribers can consume directly.
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

        {/* ── Transparency ── */}
        <section className="border-t border-[var(--line)] pt-10">
          <div className="section-head mb-8">
            <div>
              <div className="eyebrow mb-3">Trust layer</div>
              <h2 className="ua-h2">Methodology first</h2>
            </div>
            <p className="text-sm leading-7 text-[var(--ink2)] max-w-xl">
              Every output is tied to a published method, a source artifact, and a versioned data
              contract. The aim is reproducibility, not narrative commentary.
            </p>
          </div>

          <div className="fact-row" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            {[
              { label: "Thresholds", value: "Published openly" },
              { label: "Versions", value: "Methodology versioned" },
              { label: "Hashes", value: "Determinism-anchored" },
              { label: "Explanations", value: "Basic + Advanced" },
            ].map(({ label, value }) => (
              <div key={label} className="fact-item">
                <strong>{label}</strong>
                <div className="mt-2 text-sm text-[var(--ink2)]">{value}</div>
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
                the analytical layer: daily aggregation, robust historical context, regime
                classification, confidence gating, and published reference data JSON.
              </p>
              <p className="text-sm leading-7 text-[var(--ink2)] max-w-xl mt-4">
                The distinction matters: the raw data is public. The product value is the
                standardized, documented, reproducible interpretation layer built on top of it.
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
          <div className="eyebrow mb-6">Explore the product</div>
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

