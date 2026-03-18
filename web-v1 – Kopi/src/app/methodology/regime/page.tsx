// src/app/methodology/regime/page.tsx
// NOTE: Server component (no "use client") — pure content.
// Goal: Explain the canonical verdict mapping + the “why” surface (drivers/axes) in Basic/Advanced.
// Constraints: Descriptive only. No prices. No forecasts. No advice.

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
    <div className="ui-card ui-lift rounded-3xl border border-ui-border bg-ui-bg/20 p-6">
      <div className="text-sm font-semibold text-ui-text">{props.title}</div>
      <div className="mt-3 space-y-3 text-sm text-ui-muted">{props.children}</div>
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

function MonoBox(props: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ui-border bg-black/25 p-4 text-[13px] text-ui-muted">
      <div className="font-mono leading-relaxed">{props.children}</div>
    </div>
  );
}

function MiniTOCLink(props: { href: string; children: React.ReactNode }) {
  return (
    <a className="underline underline-offset-4 hover:text-ui-text" href={props.href}>
      {props.children}
    </a>
  );
}

export default function RegimeMethodologyPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 rounded-3xl border border-ui-border bg-ui-bg/20 p-7">
        <div className="flex flex-wrap gap-2">
          <Pill>Descriptive only</Pill>
          <Pill>No prices</Pill>
          <Pill>No forecasts</Pill>
          <Pill>No advice</Pill>
          <Pill>Canonical META</Pill>
          <Pill>Explicit gating</Pill>
        </div>

        <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-ui-text md:text-5xl">
          Regime methodology
        </h1>

        <p className="mt-4 max-w-3xl text-pretty text-base text-ui-muted md:text-lg">
          This page explains how the product derives a canonical{" "}
          <span className="text-ui-text">noise vs structural</span> verdict from{" "}
          <span className="text-ui-text">META</span> (regime + confidence gate), and how the UI produces short, descriptive{" "}
          <span className="text-ui-text">“why”</span> text using drivers and axes.
        </p>

        <div className="mt-6 flex flex-wrap gap-3 text-xs text-ui-faint">
          <Link className="underline underline-offset-4 hover:text-ui-text" href="/chains">
            Dashboards →
          </Link>
          <Link className="underline underline-offset-4 hover:text-ui-text" href="/how-to/custom-thresholds">
            Custom thresholds (how-to) →
          </Link>
          <Link className="underline underline-offset-4 hover:text-ui-text" href="/methodology">
            Full methodology →
          </Link>
        </div>
      </div>

      {/* Legal disclaimer */}
      <div className="mb-10">
        <InlineDisclaimer variant="legal" />
      </div>

      {/* TOC */}
      <div className="mb-10 grid gap-4 md:grid-cols-2">
        <Card title="Quick navigation">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              <MiniTOCLink href="#verdict">Verdict mapping (canonical)</MiniTOCLink>
            </li>
            <li>
              <MiniTOCLink href="#gating">Confidence & gate</MiniTOCLink>
            </li>
            <li>
              <MiniTOCLink href="#why">“Why” explanations (drivers + axes)</MiniTOCLink>
            </li>
            <li>
              <MiniTOCLink href="#custom">Custom thresholds (non-canonical overlay)</MiniTOCLink>
            </li>
          </ul>
        </Card>

        <Card title="Core commitments">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              The product is <span className="text-ui-text">descriptive</span>: it reports what the data shows.
            </li>
            <li>
              Verdicts are <span className="text-ui-text">rule-based</span> and reproducible from published JSON.
            </li>
            <li>
              When confidence is weak, the UI displays{" "}
              <span className="text-ui-text">Insufficient data</span> rather than guessing.
            </li>
          </ul>
        </Card>
      </div>

      <div className="space-y-12">
        {/* Verdict mapping */}
        <section>
          <SectionTitle id="verdict" title="Canonical verdict mapping" kicker="Rule-based classification" />

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="What the verdict means">
              <BasicAdvanced
                basic={
                  <>
                    Each chain has a canonical META regime label (e.g., <span className="text-ui-text">STABLE</span>). The UI
                    converts that label into one of three user-facing verdicts:
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>
                        <span className="text-ui-text font-semibold">Likely noise</span>
                      </li>
                      <li>
                        <span className="text-ui-text font-semibold">Structural shift</span>
                      </li>
                      <li>
                        <span className="text-ui-text font-semibold">Insufficient data</span>
                      </li>
                    </ul>
                    The conversion is deterministic and does not depend on price or predictions.
                  </>
                }
                advanced={
                  <>
                    <div className="space-y-2">
                      <div className="text-ui-text font-semibold">Canonical mapping (exact)</div>
                      <MonoBox>
                        {"If meta.missing === true → Insufficient data"} <br />
                        {'Else if meta.regime.gate.status ∈ { "BLOCKED","DEGRADED","UNKNOWN" } → Insufficient data'} <br />
                        {"Else if (no gate field) and confidence_score < gating_threshold → Insufficient data"} <br />
                        <br />
                        {'Else if label === "STABLE" → Likely noise'} <br />
                        {'Else if label ∈ {"HEATING","CONGESTED","CHEAP"} → Structural shift'} <br />
                        {"Else → Insufficient data (no guessing)"}
                      </MonoBox>
                      <div className="text-xs text-ui-faint">
                        The UI always shows the underlying canonical regime label as a secondary field (for audit).
                      </div>
                    </div>
                  </>
                }
              />
            </Card>

            <Card title="Why there is an “Insufficient data” verdict">
              <BasicAdvanced
                basic={
                  <>
                    Some days do not have enough coverage, or the underlying data quality is degraded. In those cases we show{" "}
                    <span className="text-ui-text">Insufficient data</span> rather than implying certainty.
                    The UI also shows{" "}
                    <span className="text-ui-text">confidence, gate status, and threshold used</span> explicitly so you can
                    see why a verdict is blocked.
                  </>
                }
                advanced={
                  <>
                    “Insufficient data” is not a market claim. It is a diagnostic outcome that means the regime label is{" "}
                    <span className="text-ui-text">not eligible</span> for interpretation under the canonical gate rules. This is
                    treated as a first-class state, not an error, and it is surfaced consistently across landing, /chains, and
                    chain dashboards.
                  </>
                }
              />
            </Card>
          </div>
        </section>

        {/* Gating */}
        <section>
          <SectionTitle id="gating" title="Confidence and gate" kicker="Eligibility for interpretation" />

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="Basic mental model">
              <BasicAdvanced
                basic={
                  <>
                    Think of the confidence gate as a <span className="text-ui-text">minimum data quality bar</span>. If the bar is
                    not met, the UI does not interpret the regime label. When the bar is met, the regime label becomes eligible
                    for the canonical verdict mapping above.
                  </>
                }
                advanced={
                  <>
                    <div className="space-y-2">
                      <div className="text-ui-text font-semibold">Fields shown in the UI</div>
                      <ul className="list-disc space-y-1 pl-5">
                        <li>
                          <span className="text-ui-text">confidence_score</span> (from META)
                        </li>
                        <li>
                          <span className="text-ui-text">gate status</span> (future schema: BLOCKED/DEGRADED/UNKNOWN/OK)
                        </li>
                        <li>
                          <span className="text-ui-text">threshold used</span> (from contract / gating config)
                        </li>
                      </ul>
                      <div className="text-xs text-ui-faint">
                        The product prefers explicit gate fields when present; otherwise it falls back to confidence vs threshold.
                      </div>
                    </div>
                  </>
                }
              />
            </Card>

            <Card title="Gating is not a “verdict modifier”">
              <BasicAdvanced
                basic={
                  <>
                    Gating does not make a verdict “more bullish” or “more bearish.” It only determines whether the data supports
                    a regime interpretation at all. If gating fails, the UI states{" "}
                    <span className="text-ui-text">Insufficient data</span>.
                  </>
                }
                advanced={
                  <>
                    This separation is intentional:
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>Gating is about data sufficiency and eligibility.</li>
                      <li>Regime label mapping is about descriptive classification.</li>
                    </ul>
                    The UI makes both layers explicit to avoid implied conclusions.
                  </>
                }
              />
            </Card>
          </div>
        </section>

        {/* Why explanations */}
        <section>
          <SectionTitle id="why" title="“Why” explanations" kicker="Drivers and axes" />

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="Basic: short “why” text">
              <BasicAdvanced
                basic={
                  <>
                    The UI produces 1–2 sentences using the top drivers and axes from META:
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>
                        <span className="text-ui-text font-semibold">Drivers</span> highlight which metrics contributed most.
                      </li>
                      <li>
                        <span className="text-ui-text font-semibold">Axes</span> summarize the shape of the regime (e.g., level vs
                        trend bands).
                      </li>
                    </ul>
                    This is descriptive context: it explains what moved, not what to do.
                  </>
                }
                advanced={
                  <>
                    Basic “why” is built from a small, bounded set of META fields:
                    <MonoBox>
                      {"Use meta.regime.drivers (top 1–3) + meta.regime.axes"} <br />
                      {"Emit 1–2 sentences; no tables; no normative words."}
                    </MonoBox>
                    The aim is consistent interpretability and low cognitive load.
                  </>
                }
              />
            </Card>

            <Card title="Advanced: show the numbers behind drivers/axes">
              <BasicAdvanced
                basic={
                  <>
                    Advanced mode shows the driver stats and axis states that were used. If those fields are missing, Advanced mode
                    does not invent values — it simply shows what is present.
                  </>
                }
                advanced={
                  <>
                    Advanced “why” surfaces a compact set of stats when available:
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>
                        Driver stats: <span className="text-ui-text">pct_90d</span>,{" "}
                        <span className="text-ui-text">z_robust</span>,{" "}
                        <span className="text-ui-text">momentum_7d_vs_30d</span>
                      </li>
                      <li>
                        Axes: bands and trend states (as provided by META)
                      </li>
                    </ul>
                    This keeps the UI auditable without implying conclusions.
                  </>
                }
              />
            </Card>
          </div>
        </section>

        {/* Custom thresholds */}
        <section>
          <SectionTitle id="custom" title="Custom thresholds" kicker="User-defined overlay (non-canonical)" />

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="What custom thresholds are (and are not)">
              <BasicAdvanced
                basic={
                  <>
                    Custom thresholds let you re-classify the canonical META snapshot with your own gating/band settings. This is a{" "}
                    <span className="text-ui-text">client-side overlay</span> that does not change published artifacts.
                  </>
                }
                advanced={
                  <>
                    <div className="space-y-2">
                      <div className="text-ui-text font-semibold">Important constraints</div>
                      <ul className="list-disc space-y-1 pl-5">
                        <li>Canonical META files are unchanged.</li>
                        <li>The overlay is computed via the custom regime API endpoint.</li>
                        <li>UI shows both canonical and custom identity hashes for traceability.</li>
                      </ul>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs">
                        <Link className="underline underline-offset-4 hover:text-ui-text" href="/how-to/custom-thresholds">
                          How to use custom thresholds →
                        </Link>
                        <Link className="underline underline-offset-4 hover:text-ui-text" href="/chains">
                          Go to dashboards →
                        </Link>
                      </div>
                    </div>
                  </>
                }
              />
            </Card>

            <Card title="Why this exists">
              <BasicAdvanced
                basic={
                  <>
                    Different users want different definitions of “strong enough” evidence for regime interpretation. Custom
                    thresholds make those definitions explicit and shareable — without changing the canonical dataset.
                  </>
                }
                advanced={
                  <>
                    The custom overlay is designed to be deterministic and auditable:
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>Overrides are merged with a default config (versioned).</li>
                      <li>Responses include identity hashes so you can compare runs.</li>
                      <li>When gating fails, the overlay reports insufficient data rather than guessing.</li>
                    </ul>
                  </>
                }
              />
            </Card>
          </div>
        </section>
      </div>

      {/* Footer links */}
      <section className="mt-10 pb-6">
        <div className="rounded-3xl border border-ui-border bg-ui-bg/15 p-6 ui-lift">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-ui-border bg-ui-bg/20 px-3 py-1 text-[11px] font-semibold text-ui-muted">
                Descriptive only
              </span>
              <span className="inline-flex items-center rounded-full border border-ui-border bg-ui-bg/20 px-3 py-1 text-[11px] font-semibold text-ui-muted">
                No prices
              </span>
              <span className="inline-flex items-center rounded-full border border-ui-border bg-ui-bg/20 px-3 py-1 text-[11px] font-semibold text-ui-muted">
                No advice
              </span>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-ui-faint">
              <Link href="/chains" className="underline underline-offset-4 hover:text-ui-text">
                Dashboards →
              </Link>
              <Link href="/how-to/custom-thresholds" className="underline underline-offset-4 hover:text-ui-text">
                Custom thresholds how-to →
              </Link>
              <Link href="/methodology" className="underline underline-offset-4 hover:text-ui-text">
                Full methodology →
              </Link>
            </div>

            <div className="text-xs text-ui-faint">Descriptive only · No prices · No forecasts · No advice</div>
          </div>
        </div>
      </section>
    </main>
  );
}