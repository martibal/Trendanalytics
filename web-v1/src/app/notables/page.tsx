// src/app/notables/page.tsx
import Link from "next/link";

function Card(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur">
      <div className="text-lg font-semibold text-white">{props.title}</div>
      <div className="mt-3 text-sm text-white/70">{props.children}</div>
    </div>
  );
}

function H2(props: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={props.id} className="scroll-mt-28 text-2xl font-semibold text-white">
      {props.children}
    </h2>
  );
}

function CodeInline(props: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-black/30 px-1 py-0.5 text-xs text-white/80">
      {props.children}
    </code>
  );
}

export default function NotablesPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10">
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold text-white">Notables policy</h1>
        <p className="text-sm text-white/70">
          “Notables” are <span className="text-white/85">descriptive flags</span> that call out data quality signals and
          statistically unusual values. They are deterministic, auditable, and never phrased as advice.
        </p>

        <div className="flex flex-wrap gap-3 text-xs text-white/70">
          <Link className="underline underline-offset-4 hover:text-white" href="/methodology">
            Methodology
          </Link>
          <Link className="underline underline-offset-4 hover:text-white" href="/wiki">
            Wiki
          </Link>
          <Link className="underline underline-offset-4 hover:text-white" href="/chains">
            Chains
          </Link>
          <Link className="underline underline-offset-4 hover:text-white" href="/about">
            About / contract
          </Link>
        </div>
      </header>

      <section className="space-y-4">
        <H2 id="principles">Principles</H2>
        <Card title="Basic">
          <ul className="list-disc space-y-2 pl-5">
            <li>Notables describe what the data shows (missingness, lag, unusual values).</li>
            <li>Notables never say what you should do.</li>
            <li>Notables always depend on explicit windows and historical references.</li>
          </ul>
        </Card>

        <Card title="Advanced">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Notables are generated from deterministic thresholds applied to fields returned by{" "}
              <CodeInline>/api/series</CodeInline> and <CodeInline>/api/summary</CodeInline>.
            </li>
            <li>
              The manifest is the source of truth for date existence; missing days are not inferred.
            </li>
            <li>
              Optional metrics can be hidden deterministically if non-null coverage is below threshold.
            </li>
          </ul>
        </Card>
      </section>

      <section className="space-y-4">
        <H2 id="data-quality">Data quality notables</H2>

        <Card title="Missing days">
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Basic</div>
              <p className="mt-2">
                If the selected window contains dates that are absent from the published dataset, we show a “missing days” notable.
              </p>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Advanced</div>
              <p className="mt-2">
                Rule: if <CodeInline>coverage.missing_days.length &gt; 0</CodeInline>, show “missing days = N”.
                Missing days come from the manifest and expected-day enumeration, not interpolation.
              </p>
              <p className="mt-2">
                Source: <CodeInline>/api/series</CodeInline> → <CodeInline>coverage.missing_days</CodeInline>.
              </p>
            </div>
          </div>
        </Card>

        <Card title="Low coverage (non-null ratio)">
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Basic</div>
              <p className="mt-2">
                If too many values are null in the selected window, we warn that coverage is low. Optional metrics may be hidden entirely.
              </p>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Advanced</div>
              <p className="mt-2">
                Rule: compute <CodeInline>coverage.nonNull_ratio</CodeInline> over the window.
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  If <CodeInline>nonNull_ratio &lt; 0.70</CodeInline> and the panel is marked optional → hide the metric panel deterministically.
                </li>
                <li>
                  If <CodeInline>nonNull_ratio &lt; 0.70</CodeInline> and the panel is not optional → show a warning notable.
                </li>
              </ul>
              <p className="mt-2">
                Source: <CodeInline>/api/series</CodeInline> → <CodeInline>coverage.nonNull_ratio</CodeInline>.
              </p>
            </div>
          </div>
        </Card>

        <Card title="Delayed feed / freshness lag">
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Basic</div>
              <p className="mt-2">
                We always show the dataset’s as-of date and how many days it lags behind today.
              </p>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Advanced</div>
              <p className="mt-2">
                Rule: display <CodeInline>freshness.asof</CodeInline> and <CodeInline>freshness.lag_days</CodeInline>.
                The lag is computed from today vs manifest as-of. For some feeds (e.g., certain L2s), lag may be ~1 week.
              </p>
              <p className="mt-2">
                Source: <CodeInline>/api/series</CodeInline> → <CodeInline>freshness</CodeInline>.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <H2 id="statistical">Statistical notables</H2>

        <Card title="Percentile / level flags">
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Basic</div>
              <p className="mt-2">
                Level labels (Low/Typical/Elevated/Extreme) indicate where the latest value sits relative to historical context.
              </p>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Advanced</div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>If a meta percentile exists, it is used as the reference for level classification.</li>
                <li>Otherwise, a rank-based percentile may be computed from last365d history.</li>
                <li>Cutoffs: ≤20 Low, 20–80 Typical, 80–95 Elevated, ≥95 Extreme.</li>
              </ul>
              <p className="mt-2">
                Source: <CodeInline>/api/summary</CodeInline> → <CodeInline>level</CodeInline>.
              </p>
            </div>
          </div>
        </Card>

        <Card title="Z-score flags (when available)">
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Basic</div>
              <p className="mt-2">
                When the dataset provides z-scores, unusually high or low values can be flagged descriptively.
              </p>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Advanced</div>
              <p className="mt-2">
                If meta z-score is present for the latest day, it may be displayed in tooltips and used as a notable input.
                A typical descriptive threshold is |z| ≥ 2 (unusual) and |z| ≥ 3 (extreme), but the dataset may define
                different thresholds; the UI must stay aligned with dataset documentation if specified.
              </p>
              <p className="mt-2">
                Source: <CodeInline>/api/series</CodeInline> rows → <CodeInline>z</CodeInline> (when available).
              </p>
            </div>
          </div>
        </Card>

        <Card title="Persistence (trend notables)">
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Basic</div>
              <p className="mt-2">
                We prefer persistent movement over single-day spikes. Trend labels summarize sustained direction over the window.
              </p>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Advanced</div>
              <p className="mt-2">
                Trend is computed from MA30 slope over the selected window. Strength labels are magnitude-based.
                Notables may emphasize strong trends rather than transient daily deviations.
              </p>
              <p className="mt-2">
                Source: <CodeInline>/api/summary</CodeInline> → <CodeInline>trend</CodeInline>.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <H2 id="wording">Wording policy</H2>
        <Card title="Allowed language">
          <ul className="list-disc space-y-2 pl-5">
            <li>“Higher than typical”, “lower than typical”, “rising”, “falling”, “more variable”.</li>
            <li>“Data is delayed”, “coverage is low”, “missing days present”.</li>
            <li>“Historically, similar combinations have coincided with …” (only if fully documented and non-advisory).</li>
          </ul>
        </Card>

        <Card title="Disallowed language">
          <ul className="list-disc space-y-2 pl-5">
            <li>Any recommendation or instruction (“buy/sell”, “should”, “must”, “opportunity”, “risk-on”).</li>
            <li>Any prediction (“will rise”, “about to”, “next week”).</li>
            <li>Any price framing or price-proxy framing.</li>
          </ul>
        </Card>
      </section>

      <footer className="pb-10 text-xs text-white/50">
        Notables are descriptive only. No prices · No forecasts · No advice.
      </footer>
    </main>
  );
}