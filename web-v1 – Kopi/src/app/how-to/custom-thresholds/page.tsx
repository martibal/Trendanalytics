// src/app/how-to/custom-thresholds/page.tsx
// Server component – documentation / how-to page for custom thresholds.
// Descriptive only. No prices. No forecasts. No advice.

import Link from "next/link";
import InlineDisclaimer from "@/components/legal/InlineDisclaimer";

function Pill(props: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-ui-border bg-ui-bg/30 px-3 py-1 text-[11px] font-semibold text-ui-muted">
      {props.children}
    </span>
  );
}

function SectionTitle(props: { id: string; title: string; kicker?: string }) {
  return (
    <div className="scroll-mt-24" id={props.id}>
      {props.kicker ? (
        <div className="text-xs font-semibold uppercase tracking-wide text-ui-faint">{props.kicker}</div>
      ) : null}
      <h2 className="mt-2 text-2xl font-semibold text-ui-text">{props.title}</h2>
    </div>
  );
}

function Card(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-ui-border bg-ui-bg/20 p-6 ui-lift">
      <div className="text-sm font-semibold text-ui-text">{props.title}</div>
      <div className="mt-3 space-y-3 text-sm text-ui-muted">{props.children}</div>
    </div>
  );
}

function CodeBox(props: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ui-border bg-black/25 p-4 text-[13px] text-ui-muted">
      <div className="font-mono leading-relaxed whitespace-pre-wrap">{props.children}</div>
    </div>
  );
}

export default function CustomThresholdsHowToPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 rounded-3xl border border-ui-border bg-ui-bg/20 p-7">
        <div className="flex flex-wrap gap-2">
          <Pill>Client-side overlay</Pill>
          <Pill>Non-canonical</Pill>
          <Pill>Deterministic</Pill>
          <Pill>Descriptive only</Pill>
        </div>

        <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-ui-text md:text-5xl">
          Custom thresholds – how to use
        </h1>

        <p className="mt-4 max-w-3xl text-pretty text-base text-ui-muted md:text-lg">
          Custom thresholds allow you to re-classify a canonical META snapshot using your own gating and band
          definitions. This is a <span className="text-ui-text">client-side overlay</span> and does not modify published
          artifacts.
        </p>

        <div className="mt-6 flex flex-wrap gap-3 text-xs text-ui-faint">
          <Link className="underline underline-offset-4 hover:text-ui-text" href="/chains">
            Dashboards →
          </Link>
          <Link className="underline underline-offset-4 hover:text-ui-text" href="/methodology/regime">
            Regime methodology →
          </Link>
        </div>
      </div>

      <div className="mb-10">
        <InlineDisclaimer variant="legal" />
      </div>

      <div className="space-y-12">
        {/* Concept */}
        <section>
          <SectionTitle id="concept" title="Conceptual model" kicker="What this feature is" />

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="Canonical vs custom">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <span className="text-ui-text font-semibold">Canonical META</span> is produced by the pipeline and
                  published under
                  <code className="mx-1 font-mono">/data/published/v1/meta/&lt;chain&gt;</code>.
                </li>
                <li>
                  <span className="text-ui-text font-semibold">Custom thresholds</span> are evaluated via the API
                  endpoint
                  <code className="mx-1 font-mono">/api/regime/custom</code>.
                </li>
                <li>Canonical files remain unchanged. The overlay exists only in the API response and UI state.</li>
              </ul>
            </Card>

            <Card title="When to use">
              <ul className="list-disc space-y-2 pl-5">
                <li>You require a stricter (or looser) confidence gate.</li>
                <li>You want different band cutoffs for extreme deviations.</li>
                <li>You need deterministic, shareable configurations.</li>
              </ul>
            </Card>
          </div>
        </section>

        {/* Copy/paste examples (web6 §5.1) */}
        <section>
          <SectionTitle id="copy-paste" title="Copy/paste examples" kicker="Practical validation flow" />

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <Card title="1) Fetch canonical META (for a date)">
              <p>
                Canonical META is the source-of-truth input for both the website and any custom overlay. You can fetch the
                published day-json via export.
              </p>
              <CodeBox>
{`# Canonical META day-json (published)
curl -s "http://localhost:3000/api/export/daily?chain=ethereum&genre=meta&date=2026-01-15" | jq

# Extract identity anchors (reproducibility)
curl -s "http://localhost:3000/api/export/daily?chain=ethereum&genre=meta&date=2026-01-15" \\
  | jq '{dataset_id, revision_id, label: .regime.label, gate: .regime.gate, confidence: .confidence}'`}
              </CodeBox>

              <p className="text-xs text-ui-faint">
                Tip: if you’re auditing UI behavior, pin your checks to <span className="font-mono">dataset_id</span> /
                <span className="font-mono">revision_id</span>.
              </p>
            </Card>

            <Card title="2) Evaluate custom thresholds (overlay)">
              <p>
                Provide partial overrides under <code className="font-mono">config</code>. The API returns canonical +
                effective config + custom result side-by-side.
              </p>
              <CodeBox>
{`# Custom thresholds (overlay) – does NOT modify published artifacts
curl -s -X POST "http://localhost:3000/api/regime/custom?chain=ethereum&date=2026-01-15" \\
  -H "Content-Type: application/json" \\
  -d '{
    "config": {
      "version": "v1",
      "gate": { "confidence_threshold": 0.55 },
      "trend": { "eps": 0.02 },
      "band": { "extreme_high": { "z": 2.5 } }
    }
  }' | jq`}
              </CodeBox>

              <p className="text-xs text-ui-faint">
                Integrity rule: custom evaluation is an alternative view. Canonical gating may withhold classification
                when inputs are insufficient.
              </p>
            </Card>

            <Card title="3) Fetch regime history (timeline validation)">
              <p>
                Use history to validate persistence vs flips across 400+ days, and to pick dates for deeper inspection.
                This is a compressed timeline payload.
              </p>
              <CodeBox>
{`# 450d compressed timeline
curl -s "http://localhost:3000/api/regime/history?chain=ethereum&days=450" \\
  | jq '{count, range, sample_first: .points[0], sample_last: .points[-1]}'`}
              </CodeBox>

              <p className="text-xs text-ui-faint">
                From the dashboard you can jump directly to the trust section via <span className="font-mono">/chains/&lt;chain&gt;#trust</span>.
              </p>
            </Card>
          </div>
        </section>

        {/* Signals glossary (web6 §5.1) */}
        <section>
          <SectionTitle id="signals" title="Signals glossary" kicker="pct / z / momentum (simple definitions)" />

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="pct (percentile)">
              <p>
                A percentile places today’s signal relative to a historical window. Higher percentiles mean “higher than a
                larger share of historical days” (distribution context only).
              </p>
              <ul className="list-disc space-y-2 pl-5 text-sm">
                <li>
                  Example: <span className="font-mono">pct_90d = 92</span> means today is higher than ~92% of days in the
                  reference window (for that signal).
                </li>
                <li>Percentiles are descriptive; they do not imply causality or prediction.</li>
              </ul>
            </Card>

            <Card title="z (robust z-score)">
              <p>
                A robust z-score summarizes how far today is from a typical level in “standard deviation units”, using a
                robust estimator. Larger absolute values indicate more unusual deviations.
              </p>
              <ul className="list-disc space-y-2 pl-5 text-sm">
                <li>
                  Example: <span className="font-mono">z_robust = 2.3</span> indicates a meaningfully unusual deviation
                  relative to the signal’s history.
                </li>
                <li>z is descriptive context; it is not a forecast.</li>
              </ul>
            </Card>

            <Card title="momentum (short vs structural)">
              <p>
                Momentum compares short-term vs structural behavior (e.g., last-week vs last-month). It is used as
                descriptive trend context.
              </p>
              <ul className="list-disc space-y-2 pl-5 text-sm">
                <li>
                  Example: <span className="font-mono">momentum_7d_vs_30d</span> captures divergence between MA7 and MA30
                  for a signal.
                </li>
                <li>This is context for persistence, not a trading signal.</li>
              </ul>
            </Card>

            <Card title="Where these appear">
              <p>
                These fields typically appear inside canonical META under{" "}
                <code className="font-mono">meta.regime.signals</code> for metric-keyed signals.
              </p>
              <CodeBox>
{`# Inspect signal keys for a day (schema may evolve)
curl -s "http://localhost:3000/api/export/daily?chain=ethereum&genre=meta&date=2026-01-15" \\
  | jq '.regime.signals | keys | .[0:20]'`}
              </CodeBox>
              <p className="text-xs text-ui-faint">
                Note: exact keys and transforms can evolve with the published contract; treat the contract as the parser anchor.
              </p>
            </Card>
          </div>
        </section>

        {/* API usage */}
        <section>
          <SectionTitle id="api" title="API usage" kicker="Programmatic access" />

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="GET (defaults only)">
              <p>Uses default threshold configuration (no overrides).</p>

              <CodeBox>{`GET /api/regime/custom?chain=ethereum&date=2026-01-15`}</CodeBox>
            </Card>

            <Card title="POST (with overrides)">
              <p>
                Provide partial overrides under <code>config</code>.
              </p>

              <CodeBox>
{`POST /api/regime/custom?chain=ethereum&date=2026-01-15
Content-Type: application/json

{
  "config": {
    "version": "v1",
    "gate": {
      "confidence_threshold": 0.55
    },
    "trend": {
      "eps": 0.02
    },
    "band": {
      "extreme_high": { "z": 2.5 }
    }
  }
}`}
              </CodeBox>
            </Card>
          </div>
        </section>

        {/* Response shape */}
        <section>
          <SectionTitle id="response" title="Response structure" kicker="Deterministic output" />

          <Card title="Key fields">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <code className="font-mono">canonical</code>: canonical regime label and determinism hash.
              </li>
              <li>
                <code className="font-mono">identity.canonical_hash</code>: stable identity of the underlying META
                snapshot.
              </li>
              <li>
                <code className="font-mono">identity.custom_hash</code>: stable identity of the custom evaluation.
              </li>
              <li>
                <code className="font-mono">threshold_config.effective</code>: merged config (defaults + overrides).
              </li>
              <li>
                <code className="font-mono">custom.label</code>: custom regime label.
              </li>
            </ul>

            <p className="text-xs text-ui-faint">All hashes are SHA-256 over a stable, sorted JSON representation.</p>
          </Card>
        </section>

        {/* Determinism */}
        <section>
          <SectionTitle id="determinism" title="Determinism & reproducibility" kicker="Auditability" />

          <Card title="Identity hashes">
            <ul className="list-disc space-y-2 pl-5">
              <li>Canonical identity depends on chain, date, and META snapshot.</li>
              <li>Custom identity additionally depends on the effective threshold configuration and evaluation result.</li>
              <li>Identical inputs always produce identical hashes.</li>
            </ul>
          </Card>
        </section>
      </div>

      {/* Footer */}
      <section className="mt-10 pb-6">
        <div className="rounded-3xl border border-ui-border bg-ui-bg/15 p-6 ui-lift">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Pill>Descriptive only</Pill>
              <Pill>No prices</Pill>
              <Pill>No forecasts</Pill>
              <Pill>No advice</Pill>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-ui-faint">
              <Link href="/chains" className="underline underline-offset-4 hover:text-ui-text">
                Dashboards →
              </Link>
              <Link href="/methodology/regime" className="underline underline-offset-4 hover:text-ui-text">
                Regime methodology →
              </Link>
            </div>

            <div className="text-xs text-ui-faint">Descriptive only · No prices · No forecasts · No advice</div>
          </div>
        </div>
      </section>
    </main>
  );
}