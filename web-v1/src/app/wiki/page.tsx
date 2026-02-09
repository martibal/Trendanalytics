// src/app/wiki/page.tsx
// NOTE: Server component (no "use client") — pure content.
// Goal: per-metric definitions in Basic + Advanced, consistent mental model,
// and fast navigation for both amateurs and professionals.

import Link from "next/link";
import { METRIC_KEYS, requireMetric } from "@/lib/metrics/catalog";

type Entry = {
  id: string;
  label: string;
  whatBasic: string;
  howBasic: string;
  whyBasic: string;
  valueBasic: string;

  whatAdv: string;
  howAdv: string;
  whyAdv: string;
  valueAdv: string;

  anchors: {
    methodology: string;
  };
};

function Pill(props: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-ui-border bg-ui-bg/30 px-3 py-1 text-[11px] font-semibold text-ui-muted">
      {props.children}
    </span>
  );
}

function Card(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="ui-card ui-lift rounded-3xl border border-ui-border bg-ui-bg/20 p-6">
      <div className="text-sm font-semibold text-ui-text">{props.title}</div>
      <div className="mt-3 space-y-3 text-sm text-ui-muted">{props.children}</div>
    </div>
  );
}

function SectionTitle(props: { id: string; title: string; kicker?: string }) {
  return (
    <div className="scroll-mt-24" id={props.id}>
      {props.kicker ? <div className="text-xs font-semibold uppercase tracking-wide text-ui-faint">{props.kicker}</div> : null}
      <h2 className="mt-2 text-2xl font-semibold text-ui-text">{props.title}</h2>
    </div>
  );
}

function Math(props: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ui-border bg-black/25 p-4 text-[13px] text-ui-muted">
      <div className="font-mono leading-relaxed">{props.children}</div>
    </div>
  );
}

function BasicAdvanced(props: { basic: React.ReactNode; advanced: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-ui-border bg-ui-bg/15 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-ui-faint">Basic</div>
        <div className="mt-2 text-sm text-ui-muted">{props.basic}</div>
      </div>

      <details className="rounded-2xl border border-ui-border bg-ui-bg/10 p-4">
        <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wide text-ui-text">
          Advanced
        </summary>
        <div className="mt-3 space-y-3 text-sm text-ui-muted">{props.advanced}</div>
      </details>
    </div>
  );
}

function safeStr(x: any) {
  return typeof x === "string" && x.trim().length ? x.trim() : "—";
}

/**
 * Map the catalog into a stable wiki entry structure:
 * - What / How / Why / Value
 * - Basic vs Advanced
 * This matches the global documentation requirement.
 */
function metricToEntry(key: string): Entry {
  const m = requireMetric(key);

  const whatBasic = safeStr(m.doc?.what?.basic);
  const whatAdv = safeStr(m.doc?.what?.advanced);

  const howBasic = safeStr(m.doc?.how?.basic); // may not exist yet in all metrics
  const howAdv = safeStr(m.doc?.how?.advanced);

  const whyBasic = safeStr(m.doc?.why?.basic);
  const whyAdv = safeStr(m.doc?.why?.advanced);

  // "Value" is not always present in older catalog entries — provide a guardrailed fallback.
  const valueBasic = safeStr((m.doc as any)?.value?.basic ?? "What this metric helps you see, in plain terms.");
  const valueAdv = safeStr((m.doc as any)?.value?.advanced ?? "What this metric enables analytically (assumptions, caveats, and typical usage).");

  return {
    id: m.key,
    label: m.label,
    whatBasic,
    howBasic,
    whyBasic,
    valueBasic,
    whatAdv,
    howAdv,
    whyAdv,
    valueAdv,
    anchors: {
      methodology: m.anchors.methodology,
    },
  };
}

type ConceptEntry = {
  id: string;
  title: string;
  basic: React.ReactNode;
  advanced: React.ReactNode;
};

const CONCEPTS: ConceptEntry[] = [
  {
    id: "mental-model",
    title: "One mental model (Daily / MA7 / MA30 / Percentile)",
    basic: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <span className="text-ui-text font-semibold">Daily</span> = the actual day’s activity (noisy).
        </li>
        <li>
          <span className="text-ui-text font-semibold">MA7</span> = short-term regime (last-week baseline).
        </li>
        <li>
          <span className="text-ui-text font-semibold">MA30</span> = structural baseline (last-month baseline).
        </li>
        <li>
          <span className="text-ui-text font-semibold">Percentile</span> = where today ranks versus historical values in the chosen window.
        </li>
      </ul>
    ),
    advanced: (
      <Math>
        {"MA_n(t) = (1/n) · Σ_{i=0..n-1} x_{t-i}"} <br />
        {"Δ(daily vs MA7) = (x_t − MA7_t) / |MA7_t|"} <br />
        {"Δ(MA7 vs MA30) = (MA7_t − MA30_t) / |MA30_t|"} <br />
        {"percentile(x_t) = (# {v ≤ x_t}) / N  over a defined reference set"}
      </Math>
    ),
  },
  {
    id: "moving-averages",
    title: "Moving averages (MA7 / MA30)",
    basic: (
      <>
        A moving average smooths daily noise by averaging recent days. MA7 is short-term smoothing; MA30 is the broader baseline.
        Comparing MA7 vs MA30 helps you see whether the short-term regime sits above or below the structural baseline.
      </>
    ),
    advanced: (
      <>
        <Math>
          {"MA_n(t) = (1/n) · Σ_{i=0..n-1} x_{t-i}"} <br />
          {"Defined only when all n inputs are non-null; otherwise MA_n(t) = null."}
        </Math>
        <div className="text-xs text-ui-faint">
          We intentionally avoid “partial window” averages because they change the meaning of MA_n.
        </div>
      </>
    ),
  },
  {
    id: "percentile",
    title: "Percentile",
    basic: (
      <>
        Percentile tells you how unusual today is compared with other days in the selected window.
        Example: 90th percentile means today is higher than most days in the window.
      </>
    ),
    advanced: (
      <>
        <Math>
          {"Given V = {x_i} (non-null) in the reference window:"} <br />
          {"percentile(x_t) = ( # { v ∈ V : v ≤ x_t } ) / |V|"} <br />
          {"Reported as 0..100. Null when |V| is too small."}
        </Math>
      </>
    ),
  },
  {
    id: "coverage",
    title: "Coverage & missing days",
    basic: (
      <>
        Coverage tells you whether the selected window has complete data. Missing days are not treated as zero.
        If coverage is low, interpretations should be treated as less robust.
      </>
    ),
    advanced: (
      <>
        <Math>
          {"expected_days = # UTC dates in [start, end]"} <br />
          {"present_days = # rows present"} <br />
          {"missing_days = expected_days − present_days (with explicit date list)"} <br />
          {"nonNull_ratio = (# non-null daily values) / expected_days"}
        </Math>
      </>
    ),
  },
  {
    id: "freshness",
    title: "Freshness / lag",
    basic: <>Freshness tells you how up-to-date the dataset is (as-of date and lag). Different chains can legitimately have different lags.</>,
    advanced: (
      <>
        <Math>
          {"lag_days = (today_utc_date − asof_date)"} <br />
          {"Displayed as: as-of YYYY-MM-DD (lag Nd)"}
        </Math>
      </>
    ),
  },
  {
    id: "z-score",
    title: "Z-score (standardized deviation)",
    basic: (
      <>
        Z-score expresses how far a value is from the mean in standard deviation units.
        It helps compare “unusualness” across metrics with different units.
      </>
    ),
    advanced: (
      <>
        <Math>
          {"z_t = (x_t − μ) / σ"} <br />
          {"μ = mean(V),  σ = stdev(V),  V = non-null values in the reference window"} <br />
          {"If σ is ~0 or sample too small → z is null."}
        </Math>
      </>
    ),
  },
];

export default function WikiPage() {
  const metricEntries = METRIC_KEYS.map((k) => metricToEntry(String(k)));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 rounded-3xl border border-ui-border bg-ui-bg/20 p-7">
        <div className="flex flex-wrap gap-2">
          <Pill>Definitions</Pill>
          <Pill>Basic + Advanced</Pill>
          <Pill>Auditable</Pill>
          <Pill>No prices</Pill>
          <Pill>No advice</Pill>
        </div>

        <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-ui-text md:text-5xl">Wiki</h1>
        <p className="mt-4 max-w-3xl text-pretty text-base text-ui-muted md:text-lg">
          Metric definitions and platform concepts. Each entry explains{" "}
          <span className="text-ui-text">what</span> it is,{" "}
          <span className="text-ui-text">how</span> it is computed,{" "}
          <span className="text-ui-text">why</span> it is included, and the{" "}
          <span className="text-ui-text">value</span> it provides — in both Basic and Advanced form.
        </p>

        <div className="mt-6 flex flex-wrap gap-3 text-xs text-ui-faint">
          <Link className="underline underline-offset-4 hover:text-ui-text" href="/methodology">
            Methodology →
          </Link>
          <Link className="underline underline-offset-4 hover:text-ui-text" href="/notables">
            Notables policy →
          </Link>
          <Link className="underline underline-offset-4 hover:text-ui-text" href="/chains">
            Dashboards →
          </Link>
        </div>
      </div>

      {/* Quick navigation */}
      <div className="mb-10 grid gap-4 md:grid-cols-2">
        <Card title="Quick navigation">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              <a className="underline underline-offset-4 hover:text-ui-text" href="#concepts">
                Concepts (global)
              </a>
            </li>
            <li>
              <a className="underline underline-offset-4 hover:text-ui-text" href="#metrics">
                Metrics (per key)
              </a>
            </li>
            <li>
              <a className="underline underline-offset-4 hover:text-ui-text" href="#reading">
                How to read the platform
              </a>
            </li>
          </ul>
        </Card>

        <Card title="Core mental model">
          <div className="text-sm">
            Daily = noisy day-to-day signal · MA7 = short-term regime · MA30 = structural baseline · Percentile = historical placement
          </div>
          <div className="mt-3 text-xs text-ui-faint">
            This same mental model is used on landing tiles, chain dashboards, and in methodology.
          </div>
        </Card>
      </div>

      <div className="space-y-12">
        {/* Concepts */}
        <section>
          <SectionTitle id="concepts" title="Concepts" kicker="Global definitions" />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {CONCEPTS.map((c) => (
              <Card key={c.id} title={c.title}>
                <BasicAdvanced basic={c.basic} advanced={c.advanced} />
                <div className="pt-1 text-xs text-ui-faint">
                  Anchor:{" "}
                  <a className="underline underline-offset-4 hover:text-ui-text" href={`#${c.id}`}>
                    #{c.id}
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* How to read */}
        <section>
          <SectionTitle id="reading" title="How to read the platform" kicker="Practical usage" />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="Landing (30-second scan)">
              <BasicAdvanced
                basic={
                  <ol className="list-decimal space-y-1 pl-5">
                    <li>MA7 vs MA30: short-term regime vs structural baseline.</li>
                    <li>Daily vs MA7: one-day deviation vs short-term norm.</li>
                    <li>Percentile: whether today is extreme or typical within the selected window.</li>
                    <li>Click through for deeper context and audit signals.</li>
                  </ol>
                }
                advanced={
                  <>
                    <div>
                      The landing page intentionally focuses on the four primitives and avoids raw links/coverage detail to keep the scan fast.
                    </div>
                    <div className="text-xs text-ui-faint">
                      Dashboards expose data-quality and reproducibility links; wiki defines semantics; methodology defines global rules.
                    </div>
                  </>
                }
              />
            </Card>

            <Card title="Dashboards (audit & depth)">
              <BasicAdvanced
                basic={
                  <>
                    Use dashboards when you want detail: coverage, lag, missing days, and additional metrics. These are still descriptive.
                  </>
                }
                advanced={
                  <>
                    <div>
                      Professionals can reproduce charts from the exported JSON artifacts (gold/derived/meta) using the documented rules.
                    </div>
                    <Math>
                      {"1) Fetch reference series (e.g., last365d)."} <br />
                      {"2) Compute MA/context stats on reference series."} <br />
                      {"3) Slice display window last."}
                    </Math>
                  </>
                }
              />
            </Card>
          </div>
        </section>

        {/* Metrics */}
        <section>
          <SectionTitle id="metrics" title="Metrics" kicker="Per key" />
          <div className="mt-6 rounded-3xl border border-ui-border bg-ui-bg/15 p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-sm font-semibold text-ui-text">Metric index</div>
                <div className="mt-1 text-xs text-ui-faint">
                  Each metric has a stable anchor: <span className="font-mono text-ui-muted">/wiki#&lt;metric_key&gt;</span>
                </div>
              </div>
              <div className="text-xs text-ui-faint">
                Tip: each metric links back to its methodology anchor for the global computation rules.
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {metricEntries.map((e) => (
                <Link
                  key={e.id}
                  href={`#${e.id}`}
                  className="rounded-2xl border border-ui-border bg-ui-bg/20 p-4 text-sm text-ui-muted hover:bg-ui-bg/30 hover:text-ui-text"
                >
                  <div className="font-mono text-xs text-ui-faint">{e.id}</div>
                  <div className="mt-1 font-semibold text-ui-text">{e.label}</div>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-8 space-y-6">
            {metricEntries.map((e) => (
              <section key={e.id} id={e.id} className="rounded-3xl border border-ui-border bg-ui-bg/15 p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-ui-text">{e.label}</h3>
                    <div className="mt-1 text-xs text-ui-faint">
                      Key: <span className="font-mono text-ui-muted">{e.id}</span>
                    </div>
                    <div className="mt-2 text-xs text-ui-faint">
                      See methodology:{" "}
                      <Link className="underline underline-offset-4 hover:text-ui-text" href={e.anchors.methodology}>
                        {e.anchors.methodology}
                      </Link>
                    </div>
                  </div>

                  <a
                    className="self-start rounded-full border border-ui-border bg-ui-bg/30 px-3 py-1 text-xs text-ui-muted hover:text-ui-text"
                    href={`#${e.id}`}
                  >
                    #{e.id}
                  </a>
                </div>

                <div className="mt-5 grid gap-6 md:grid-cols-2">
                  {/* Basic */}
                  <div className="space-y-3 rounded-2xl border border-ui-border bg-ui-bg/10 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-ui-faint">Basic</div>

                    <div className="space-y-2 text-sm text-ui-muted">
                      <div>
                        <div className="text-xs font-semibold text-ui-text">What it is</div>
                        <div className="mt-1">{e.whatBasic}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-ui-text">How it’s computed</div>
                        <div className="mt-1">{e.howBasic}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-ui-text">Why it’s included</div>
                        <div className="mt-1">{e.whyBasic}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-ui-text">Value to the user</div>
                        <div className="mt-1">{e.valueBasic}</div>
                      </div>
                    </div>
                  </div>

                  {/* Advanced */}
                  <div className="space-y-3 rounded-2xl border border-ui-border bg-ui-bg/10 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-ui-faint">Advanced</div>

                    <div className="space-y-2 text-sm text-ui-muted">
                      <div>
                        <div className="text-xs font-semibold text-ui-text">What it is</div>
                        <div className="mt-1">{e.whatAdv}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-ui-text">How it’s computed</div>
                        <div className="mt-1">{e.howAdv}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-ui-text">Why it’s included</div>
                        <div className="mt-1">{e.whyAdv}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-ui-text">Value to the user</div>
                        <div className="mt-1">{e.valueAdv}</div>
                      </div>
                    </div>

                    <div className="pt-1 text-[11px] text-ui-faint">
                      If any of these fields show “—”, the metric is missing a required documentation block in the catalog.
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-xs text-ui-faint">
                  <Link className="underline underline-offset-4 hover:text-ui-text" href="#mental-model">
                    Daily / MA7 / MA30 / Percentile
                  </Link>
                  <Link className="underline underline-offset-4 hover:text-ui-text" href="#coverage">
                    Coverage
                  </Link>
                  <Link className="underline underline-offset-4 hover:text-ui-text" href="#freshness">
                    Freshness
                  </Link>
                  <Link className="underline underline-offset-4 hover:text-ui-text" href="#moving-averages">
                    Moving averages
                  </Link>
                </div>
              </section>
            ))}
          </div>
        </section>

        <div className="mt-10 text-[11px] text-ui-faint">
          Descriptive only. No prices. No advice. No forecasts. Missing values render as gaps (null), never zeros.
        </div>
      </div>
    </main>
  );
}