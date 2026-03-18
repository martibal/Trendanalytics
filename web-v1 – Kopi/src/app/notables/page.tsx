// src/app/notables/page.tsx
// Server component – describes the Notables policy (descriptive-only anomaly surfacing)

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
        <div className="text-xs font-semibold uppercase tracking-wide text-ui-faint">
          {props.kicker}
        </div>
      ) : null}
      <h2 className="mt-2 text-2xl font-semibold text-ui-text">
        {props.title}
      </h2>
    </div>
  );
}

function Card(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-ui-border bg-ui-bg/20 p-6 ui-lift">
      <div className="text-sm font-semibold text-ui-text">{props.title}</div>
      <div className="mt-3 space-y-3 text-sm text-ui-muted">
        {props.children}
      </div>
    </div>
  );
}

function CodeBox(props: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ui-border bg-black/25 p-4 text-[13px] text-ui-muted">
      <div className="font-mono leading-relaxed whitespace-pre-wrap">
        {props.children}
      </div>
    </div>
  );
}

export default function NotablesPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 rounded-3xl border border-ui-border bg-ui-bg/20 p-7">
        <div className="flex flex-wrap gap-2">
          <Pill>Descriptive only</Pill>
          <Pill>No prices</Pill>
          <Pill>No forecasts</Pill>
          <Pill>No advice</Pill>
          <Pill>Audit-friendly</Pill>
        </div>

        <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-ui-text md:text-5xl">
          Notables policy
        </h1>

        <p className="mt-4 max-w-3xl text-pretty text-base text-ui-muted md:text-lg">
          Notables are descriptive highlights of statistically meaningful
          deviations relative to historical context. They are not signals,
          recommendations, or forecasts.
        </p>

        <div className="mt-6 flex flex-wrap gap-3 text-xs text-ui-faint">
          <Link
            className="underline underline-offset-4 hover:text-ui-text"
            href="/chains"
          >
            Dashboards →
          </Link>
          <Link
            className="underline underline-offset-4 hover:text-ui-text"
            href="/methodology"
          >
            Methodology →
          </Link>
        </div>
      </div>

      <div className="mb-10">
        <InlineDisclaimer variant="legal" />
      </div>

      <div className="space-y-12">
        {/* Definition */}
        <section>
          <SectionTitle
            id="definition"
            title="Definition"
            kicker="What a Notable is"
          />

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="Core idea">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  A Notable surfaces when a metric meaningfully deviates from
                  its historical distribution.
                </li>
                <li>
                  The deviation must exceed predefined statistical thresholds.
                </li>
                <li>
                  The description is strictly descriptive and contextual.
                </li>
              </ul>
            </Card>

            <Card title="What it is not">
              <ul className="list-disc space-y-2 pl-5">
                <li>Not a trading signal.</li>
                <li>Not a forward-looking claim.</li>
                <li>Not advice or recommendation.</li>
              </ul>
            </Card>
          </div>
        </section>

        {/* Statistical basis */}
        <section>
          <SectionTitle
            id="statistics"
            title="Statistical basis"
            kicker="Historical context"
          />

          <Card title="Deviation logic (illustrative)">
            <p>
              A metric may be flagged when its standardized deviation exceeds a
              robust z-score or percentile threshold.
            </p>

            <CodeBox>
{`if abs(z_robust) >= 2.0:
    flag = "extreme deviation"
elif abs(z_robust) >= 1.0:
    flag = "mild deviation"
else:
    flag = None`}
            </CodeBox>

            <p className="text-xs text-ui-faint">
              Thresholds are versioned and documented. Exact logic is chain and
              metric specific.
            </p>
          </Card>
        </section>

        {/* Persistence */}
        <section>
          <SectionTitle
            id="persistence"
            title="Persistence requirement"
            kicker="Noise filtering"
          />

          <Card title="Why persistence matters">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Single-day spikes may be noise; multi-day persistence increases
                contextual relevance.
              </li>
              <li>
                Notables may require a minimum duration above threshold before
                display.
              </li>
              <li>
                The goal is robustness, not sensitivity.
              </li>
            </ul>
          </Card>
        </section>

        {/* Two-level explanation */}
        <section>
          <SectionTitle
            id="explanation"
            title="Explanation levels"
            kicker="Basic & Advanced"
          />

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="Basic">
              <p>
                Short description of the deviation and its historical context,
                written in plain language.
              </p>
            </Card>

            <Card title="Advanced">
              <p>
                Includes statistical values (e.g., percentile rank, robust
                z-score, window length) for audit and reproducibility.
              </p>
            </Card>
          </div>
        </section>

        {/* Governance */}
        <section>
          <SectionTitle
            id="governance"
            title="Governance & versioning"
            kicker="Change management"
          />

          <Card title="Version control">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                All threshold changes are versioned and documented.
              </li>
              <li>
                Historical definitions remain accessible for transparency.
              </li>
              <li>
                No retroactive rewriting of past Notables.
              </li>
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
              <Link
                href="/chains"
                className="underline underline-offset-4 hover:text-ui-text"
              >
                Dashboards →
              </Link>
              <Link
                href="/methodology"
                className="underline underline-offset-4 hover:text-ui-text"
              >
                Methodology →
              </Link>
            </div>

            <div className="text-xs text-ui-faint">
              Descriptive only · No prices · No forecasts · No advice
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}