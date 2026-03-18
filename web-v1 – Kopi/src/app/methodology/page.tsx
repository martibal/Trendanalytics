// src/app/methodology/page.tsx
// NOTE: Server component (no "use client") — pure content.
// Goal: Basic = pedagogical. Advanced = principled math + exact rules.

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

function MiniTOCLink(props: { href: string; children: React.ReactNode }) {
  return (
    <a className="underline underline-offset-4 hover:text-ui-text" href={props.href}>
      {props.children}
    </a>
  );
}

export default function MethodologyPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 rounded-3xl border border-ui-border bg-ui-bg/20 p-7">
        <div className="flex flex-wrap gap-2">
          <Pill>Descriptive only</Pill>
          <Pill>No prices</Pill>
          <Pill>No forecasts</Pill>
          <Pill>No advice</Pill>
          <Pill>Nulls are gaps</Pill>
          <Pill>Auditable artifacts</Pill>
        </div>

        <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-ui-text md:text-5xl">
          Methodology
        </h1>

        <p className="mt-4 max-w-3xl text-pretty text-base text-ui-muted md:text-lg">
          This product reports <span className="text-ui-text">what the data shows</span> — not instructions or recommendations.
          Every chart, label, and summary is produced by explicit, auditable rules. Missing values remain{" "}
          <span className="text-ui-text">null</span> and render as gaps (never zeros).
        </p>

        <div className="mt-6 flex flex-wrap gap-3 text-xs text-ui-faint">
          <Link className="underline underline-offset-4 hover:text-ui-text" href="/notables">
            Notables policy →
          </Link>
          <Link className="underline underline-offset-4 hover:text-ui-text" href="/wiki">
            Wiki →
          </Link>
          <Link className="underline underline-offset-4 hover:text-ui-text" href="/chains">
            Dashboards →
          </Link>
        </div>
      </div>

      {/* Web2 [LEGAL]: Inline descriptive-only disclaimer for methodology content. */}
      <div className="mb-10">
        <InlineDisclaimer variant="legal" />
      </div>

      {/* TOC */}
      <div className="mb-10 grid gap-4 md:grid-cols-2">
        <Card title="Quick navigation">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              <MiniTOCLink href="#mental-model">One mental model (Daily / MA7 / MA30 / Percentile)</MiniTOCLink>
            </li>
            <li>
              <MiniTOCLink href="#what-not">What we do NOT do</MiniTOCLink>
            </li>
            <li>
              <MiniTOCLink href="#artifacts">Published artifacts & versioning</MiniTOCLink>
            </li>
            <li>
              <MiniTOCLink href="#windows">Windows & slicing (critical rule)</MiniTOCLink>
            </li>
            <li>
              <MiniTOCLink href="#ma">Moving averages (MA7 / MA30)</MiniTOCLink>
            </li>
            <li>
              <MiniTOCLink href="#context">Context metrics (percentile, z, trend, volatility)</MiniTOCLink>
            </li>
            <li>
              <MiniTOCLink href="#quality">Coverage, missing days, freshness</MiniTOCLink>
            </li>
            <li>
              <MiniTOCLink href="#json">JSON / API layers (gold / derived / meta)</MiniTOCLink>
            </li>
            <li>
              <MiniTOCLink href="#wording">Wording guardrails</MiniTOCLink>
            </li>
          </ul>
        </Card>

        <Card title="Core principles">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              <span className="text-ui-text">No price series</span> anywhere (no charts, no recommendations, no advice).
            </li>
            <li>
              <span className="text-ui-text">Nulls stay null</span>. We do not interpolate missing days.
            </li>
            <li>
              <span className="text-ui-text">Every label is rule-based</span> and reproducible from published JSON.
            </li>
            <li>
              UI may change, but artifacts and definitions are versioned, documented, and auditable.
            </li>
          </ul>
        </Card>
      </div>

      <div className="space-y-12">
        {/* Mental model */}
        <section>
          <SectionTitle id="mental-model" title="One mental model" kicker="Required clarity" />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="The only interpretation lens we use (everywhere)">
              <BasicAdvanced
                basic={
                  <>
                    You only need four concepts to read this product:
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>
                        <span className="text-ui-text font-semibold">Daily</span> = the actual day&apos;s activity (can be noisy).
                      </li>
                      <li>
                        <span className="text-ui-text font-semibold">MA7</span> = the short-term regime (last-week baseline).
                      </li>
                      <li>
                        <span className="text-ui-text font-semibold">MA30</span> = the structural baseline (last-month baseline).
                      </li>
                      <li>
                        <span className="text-ui-text font-semibold">Percentile</span> = where today ranks versus historical values in the chosen window.
                      </li>
                    </ul>
                    The landing page is a 30-second scan using these four signals. Chain dashboards add depth, but do not change the lens.
                  </>
                }
                advanced={
                  <>
                    <div className="space-y-2">
                      <div className="text-ui-text font-semibold">Interpretation primitives</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        <li>
                          Daily vs MA7 describes one-day deviation from the short-term baseline: <span className="text-ui-text">“unusual day?”</span>
                        </li>
                        <li>
                          MA7 vs MA30 describes regime vs baseline: <span className="text-ui-text">“short-term above/below structural?”</span>
                        </li>
                        <li>
                          Percentile describes distribution position: <span className="text-ui-text">“how extreme within this window?”</span>
                        </li>
                      </ul>
                      <Math>
                        {"Δ(daily vs MA7) = (x_t − MA7_t) / |MA7_t|"} <br />
                        {"Δ(MA7 vs MA30) = (MA7_t − MA30_t) / |MA30_t|"} <br />
                        {"Percentile is a rank within a reference set (defined below)."}
                      </Math>
                    </div>
                  </>
                }
              />
            </Card>

            <Card title="How to scan in under 30 seconds">
              <BasicAdvanced
                basic={
                  <>
                    Scan for:
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>Is the percentile extreme (very high or very low)?</li>
                      <li>Is MA7 above or below MA30 (regime vs baseline)?</li>
                      <li>Is today far from MA7 (one-day anomaly)?</li>
                      <li>Is coverage solid and lag acceptable?</li>
                    </ul>
                  </>
                }
                advanced={
                  <>
                    This scan translates to a stable “trend context” vocabulary:
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>Percentile = distribution extremity.</li>
                      <li>MA7 vs MA30 = regime alignment.</li>
                      <li>Daily vs MA7 = event-like deviation.</li>
                      <li>Coverage/lag = robustness guardrail.</li>
                    </ul>
                  </>
                }
              />
            </Card>
          </div>
        </section>

        {/* What we do NOT do */}
        <section>
          <SectionTitle id="what-not" title="What we do NOT do" kicker="Hard constraints" />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="No price series anywhere">
              <BasicAdvanced
                basic={<>We do not display price charts, price-derived indicators, or price narratives.</>}
                advanced={
                  <>
                    This is enforced by content policy and code conventions. If a metric implies price or valuation, it is excluded from the platform.
                  </>
                }
              />
            </Card>

            <Card title="No advice / no forecasts">
              <BasicAdvanced
                basic={<>We do not say what you should do and we do not predict outcomes.</>}
                advanced={
                  <>
                    Wording is constrained. The build includes a legal copy scan that blocks predictive, advisory, sentiment, and price-causal language.
                  </>
                }
              />
            </Card>

            <Card title="No causal claims">
              <BasicAdvanced
                basic={<>We describe what is measured. We do not claim why it happened.</>}
                advanced={
                  <>
                    <div className="space-y-2">
                      <div>
                        The UI uses descriptive wording: “above baseline”, “below baseline”, “historically elevated”,
                        “unusually low/high in this window”.
                      </div>
                      <div>
                        It avoids causal framing: “because”, “driven by”, “signals”, “leads to”, “causes”.
                      </div>
                    </div>
                  </>
                }
              />
            </Card>

            <Card title="No black-box models">
              <BasicAdvanced
                basic={<>Everything shown can be explained and reproduced.</>}
                advanced={
                  <>
                    If a calculation cannot be fully explained with explicit formulas and assumptions, it is not shipped.
                  </>
                }
              />
            </Card>
          </div>
        </section>

        {/* Published artifacts & versioning */}
        <section>
          <SectionTitle id="artifacts" title="Published artifacts & versioning" kicker="Auditability" />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="Static artifacts are the source of truth">
              <BasicAdvanced
                basic={<>All charts and labels are derived from published JSON files.</>}
                advanced={
                  <>
                    The product ships auditable artifacts (gold / derived / meta) under a versioned path. UI changes do
                    not change what was published; revisions are explicit.
                  </>
                }
              />
            </Card>

            <Card title="dataset_id and revision_id">
              <BasicAdvanced
                basic={<>Every artifact set is labeled with identifiers so you can trace what you are looking at.</>}
                advanced={
                  <>
                    dataset_id and revision_id are displayed in the UI and present in exported JSON. They represent the
                    dataset partition and the pipeline revision for that publication.
                  </>
                }
              />
            </Card>

            <Card title="Publication layout">
              <BasicAdvanced
                basic={<>Artifacts are organized in a deterministic folder structure.</>}
                advanced={
                  <>
                    <div className="space-y-2">
                      <Math>
                        {"public/data/published/v1/{gold|derived|meta}/{chain}/..."} <br />
                        {"manifest.json defines availability and as-of."}
                      </Math>
                    </div>
                  </>
                }
              />
            </Card>

            <Card title="Versioning discipline">
              <BasicAdvanced
                basic={
                  <>
                    Definitions and computations are versioned. When changes happen, earlier definitions remain available in documentation.
                  </>
                }
                advanced={
                  <>
                    <div className="space-y-2">
                      <div>
                        Artifacts can carry identifiers like <span className="font-mono text-ui-text">dataset_id</span> and{" "}
                        <span className="font-mono text-ui-text">revision_id</span> to tie a UI view to a specific publish revision.
                      </div>
                      <div className="text-xs text-ui-faint">
                        The contract check script enforces alignment across gold/derived/meta where identifiers are present.
                      </div>
                    </div>
                  </>
                }
              />
            </Card>
          </div>
        </section>

        {/* Windows & slicing */}
        <section>
          <SectionTitle id="windows" title="Windows & slicing (critical rule)" kicker="Consistency" />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="The critical rule">
              <BasicAdvanced
                basic={
                  <>
                    All computations happen inside an explicit date window. If a day is missing, it stays missing.
                    We never fill missing values with zeros.
                  </>
                }
                advanced={
                  <>
                    <div className="space-y-2">
                      <div className="text-ui-text font-semibold">Slice first, then compute</div>
                      <div>
                        The series is sliced to the requested window (e.g., last 365 days aligned to manifest as-of). Derived metrics (MA, percentile, tags)
                        are computed on that slice using explicit null handling.
                      </div>
                      <Math>
                        {"Given gold series x(t) with nulls:"} <br />
                        {"slice = x(t) for t in [start, end]"} <br />
                        {"compute derived metrics on slice (exclude nulls with explicit minimum coverage rules)"}
                      </Math>
                    </div>
                  </>
                }
              />
            </Card>

            <Card title="Why this matters">
              <BasicAdvanced
                basic={
                  <>
                    Window consistency makes comparisons meaningful. Coverage and lag are surfaced so the user can judge whether the window is “thin” or “stale”.
                  </>
                }
                advanced={
                  <>
                    <div className="space-y-2">
                      <div>
                        When comparing chains, the UI makes the window explicit and exposes per-chain freshness/lag. If two chains have different as-of dates,
                        you are comparing different data horizons.
                      </div>
                    </div>
                  </>
                }
              />
            </Card>
          </div>
        </section>

        {/* Moving averages */}
        <section>
          <SectionTitle id="ma" title="Moving averages (MA7 / MA30)" kicker="Smoothing" />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="MA7 and MA30">
              <BasicAdvanced
                basic={
                  <>
                    MA7 is a last-week baseline. MA30 is a last-month baseline. They reduce noise so you can see regimes rather than spikes.
                  </>
                }
                advanced={
                  <>
                    <div className="space-y-2">
                      <div>
                        Rolling mean is computed on non-null values with a minimum coverage threshold. If coverage is insufficient, MA is null for that day.
                      </div>
                      <Math>
                        {"MA_k(t) uses last k calendar days."} <br />
                        {"V = non-null values in that window."} <br />
                        {"If |V| / k < minCoverage => MA_k(t) = null"} <br />
                        {"Else MA_k(t) = mean(V)"}
                      </Math>
                    </div>
                  </>
                }
              />
            </Card>

            <Card title="Why null handling matters">
              <BasicAdvanced
                basic={<>If data is missing, smoothing cannot pretend it exists. Nulls stay null, and the chart shows gaps.</>}
                advanced={
                  <>
                    <div className="space-y-2">
                      <div>
                        This prevents accidental “flatlines” that would appear if missing values were replaced by zeros. It also prevents overstated confidence
                        when coverage is low.
                      </div>
                    </div>
                  </>
                }
              />
            </Card>
          </div>
        </section>

        {/* Context metrics */}
        <section>
          <SectionTitle id="context" title="Context metrics (percentile, z, trend, volatility)" kicker="Positioning" />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="Percentile">
              <BasicAdvanced
                basic={
                  <>
                    Percentile tells you where today ranks versus historical values in the selected window. Higher percentile means the value is high relative
                    to that window’s history.
                  </>
                }
                advanced={
                  <>
                    <div className="space-y-2">
                      <div>
                        Percentile is computed over non-null values within the sliced window. If there are too few points, percentile is null.
                      </div>
                      <Math>
                        {"Given non-null values {v_1..v_N} and x_t:"} <br />
                        {"rank = number of values <= x_t"} <br />
                        {"pct = (rank - 1) / (N - 1)"} <br />
                        {"If N < minN => pct = null"}
                      </Math>
                    </div>
                  </>
                }
              />
            </Card>

            <Card title="Trend tags">
              <BasicAdvanced
                basic={
                  <>
                    Trend tags describe short-term baseline relative to long-term baseline (MA7 vs MA30) and whether today deviates from MA7. They do not imply prediction.
                  </>
                }
                advanced={
                  <>
                    <div className="space-y-2">
                      <div className="text-ui-text font-semibold">Example descriptive labels</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        <li>Short-term above baseline (MA7 &gt; MA30)</li>
                        <li>Short-term below baseline (MA7 &lt; MA30)</li>
                        <li>Unusual day versus MA7 (|daily − MA7| large)</li>
                      </ul>
                    </div>
                  </>
                }
              />
            </Card>

            <Card title="Volatility tags">
              <BasicAdvanced
                basic={
                  <>
                    Volatility tags describe variability in daily values relative to baselines inside the selected window, without implying forward-looking behavior.
                  </>
                }
                advanced={
                  <>
                    <div className="space-y-2">
                      <div>
                        Variability can be described using windowed dispersion (e.g., robust scale like median absolute deviation) computed on non-null values.
                      </div>
                      <div className="text-xs text-ui-faint">
                        Exact formulas are documented per metric in the Wiki (where used).
                      </div>
                    </div>
                  </>
                }
              />
            </Card>

            <Card title="Z-like scale (standardization)">
              <BasicAdvanced
                basic={
                  <>
                    A standardized score can express how far today is from the window’s typical value, in units of variability. It is purely descriptive.
                  </>
                }
                advanced={
                  <>
                    <div className="space-y-2">
                      <Math>
                        {"Example robust z:"} <br />
                        {"z = (x_t − median(window)) / (1.4826 * MAD(window))"} <br />
                        {"Computed on non-null values; if insufficient points => null."}
                      </Math>
                    </div>
                  </>
                }
              />
            </Card>
          </div>
        </section>

        {/* Coverage / missing / freshness */}
        <section>
          <SectionTitle id="quality" title="Coverage, missing days, freshness" kicker="Data quality" />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="Coverage and missing days">
              <BasicAdvanced
                basic={
                  <>
                    Coverage tells you how complete the selected window is. If coverage is low, we dampen interpretations and may hide optional panels
                    to avoid misleading visuals. Missing days are never filled.
                  </>
                }
                advanced={
                  <>
                    <Math>
                      {"expected_days = # UTC dates in [start, end]"} <br />
                      {"present_days = # rows present"} <br />
                      {"nonNull_ratio = (# non-null daily values) / expected_days"}
                    </Math>
                    <div className="text-xs text-ui-faint">
                      Optional panels can be hidden when nonNull_ratio falls below a fixed threshold (guardrail).
                    </div>
                  </>
                }
              />
            </Card>

            <Card title="Freshness / lag">
              <BasicAdvanced
                basic={
                  <>
                    “As-of” is the latest date available in the dataset. “Lag” is how many days behind today that is.
                    Some chains can lag more than others; we show it explicitly.
                  </>
                }
                advanced={
                  <>
                    <Math>
                      {"lag_days = (today_utc_date − asof_date)"} <br />
                      {"Displayed as: as-of YYYY-MM-DD (lag Nd)"}
                    </Math>
                    <div className="text-xs text-ui-faint">
                      Lag is descriptive; it becomes a product issue only if it violates published expectations.
                    </div>
                  </>
                }
              />
            </Card>
          </div>
        </section>

        {/* JSON / API */}
        <section>
          <SectionTitle id="json" title="JSON / API layers (gold / derived / meta)" kicker="For analysts & developers" />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="Gold (primary daily metrics)">
              <BasicAdvanced
                basic={
                  <>
                    <span className="text-ui-text font-semibold">Gold</span> is the primary daily dataset: one row per UTC day with raw chain metrics.
                    It is the source of truth for most charts.
                  </>
                }
                advanced={
                  <>
                    <div className="space-y-2">
                      <div className="text-ui-text font-semibold">Typical use</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        <li>Analyst: reproduce MA7/MA30 and baseline comparisons.</li>
                        <li>Developer: render charts or compute custom aggregates.</li>
                      </ul>
                      <Math>
                        {"Example (window fetch):"} <br />
                        {"GET /data/published/v1/gold/{chain}/last365d.json"} <br />
                        {"Then compute MA7/MA30 on the fetched series and slice for display."}
                      </Math>
                    </div>
                  </>
                }
              />
            </Card>

            <Card title="Derived (computed features)">
              <BasicAdvanced
                basic={
                  <>
                    <span className="text-ui-text font-semibold">Derived</span> contains computed features (like smoothing, standardized scores, ranks)
                    when we choose to publish them. It exists to make analytics fast and consistent across consumers.
                  </>
                }
                advanced={
                  <>
                    <div className="space-y-2">
                      <div className="text-ui-text font-semibold">Typical use</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        <li>Analyst: use published features to validate your independent calculations.</li>
                        <li>Developer: avoid re-computing expensive stats client-side.</li>
                      </ul>
                      <Math>
                        {"Example:"} <br />
                        {"GET /data/published/v1/derived/{chain}/last365d.json"} <br />
                        {"Use published fields like ma7/ma30/z/percentile when present."}
                      </Math>
                    </div>
                  </>
                }
              />
            </Card>

            <Card title="Meta (quality & freshness annotations)">
              <BasicAdvanced
                basic={
                  <>
                    <span className="text-ui-text font-semibold">Meta</span> contains audit and quality context:
                    missing days, coverage ratios, and lag/freshness. It helps users avoid reading thin or stale windows.
                  </>
                }
                advanced={
                  <>
                    <div className="space-y-2">
                      <div className="text-ui-text font-semibold">Typical use</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        <li>Analyst: enforce quality thresholds before running downstream stats.</li>
                        <li>Developer: show warnings, badges, or hide optional panels under low coverage.</li>
                      </ul>
                      <Math>
                        {"Example:"} <br />
                        {"GET /data/published/v1/meta/{chain}/manifest.json"} <br />
                        {"Read as-of, lag, and any coverage notes for the exported windows."}
                      </Math>
                    </div>
                  </>
                }
              />
            </Card>

            {/* ADDED (webekstra): Explicit mapping between scorecard component keys and regime signal keys */}
            <Card title="Scorecard components vs regime signals (aliases)">
              <BasicAdvanced
                basic={
                  <>
                    Some UI elements use compact component ids (for example in the Scorecard), while the regime engine publishes canonical
                    signal keys (under <span className="font-mono text-ui-text">meta.regime.signals</span>). These are mapped explicitly so you can
                    trace what is the “same thing” across surfaces.
                  </>
                }
                advanced={
                  <>
                    <div className="space-y-2">
                      <div className="text-ui-text font-semibold">Where the mapping lives</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        <li>
                          <span className="font-mono text-ui-text">contract.meta.regime.signal_aliases.defaults_by_profile</span>{" "}
                          (default alias map by profile)
                        </li>
                        <li>
                          <span className="font-mono text-ui-text">meta.regime.signal_aliases</span>{" "}
                          (emitted for a day when the target signal exists)
                        </li>
                      </ul>

                      <div className="text-ui-text font-semibold">Important nuance: transforms vs raw metrics</div>
                      <div>
                        Not every published signal is a raw “gold” metric. Some are deterministic transforms and may include{" "}
                        <span className="font-mono text-ui-text">transform</span> metadata and{" "}
                        <span className="font-mono text-ui-text">current_raw</span> to show the input metric used.
                      </div>

                      <Math>
                        {"Example:"} <br />
                        {"scorecard.dimensions.demand.components.tx_count"} <br />
                        {"↔ regime.signals.tx_count_daily"} <br />
                        <br />
                        {"scorecard.dimensions.capacity.components.blocktime_instability"} <br />
                        {"↔ regime.signals.blocktime_instability (a transform of avg_block_time_sec)"} <br />
                      </Math>

                      <div className="text-xs text-ui-faint">
                        This prevents “two universes” confusion: the Scorecard can be read as a view over the same evidence surface
                        used by axes and drivers, even when naming and transforms differ.
                      </div>
                    </div>
                  </>
                }
              />
            </Card>

            <Card title="Why three layers are valuable">
              <BasicAdvanced
                basic={
                  <>
                    Three layers let different users get value efficiently:
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>Gold: core numbers.</li>
                      <li>Derived: standardized features for faster analysis.</li>
                      <li>Meta: auditability and quality guardrails.</li>
                    </ul>
                  </>
                }
                advanced={
                  <>
                    <div className="space-y-2">
                      <div>
                        This separation keeps the system explainable: “primary measurements” are not mixed with “computed context” or “quality notes”.
                      </div>
                    </div>
                  </>
                }
              />
            </Card>
          </div>
        </section>

        {/* Wording */}
        <section>
          <SectionTitle id="wording" title="Wording guardrails" kicker="Policy" />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="Allowed vs not allowed language">
              <BasicAdvanced
                basic={
                  <>
                    We describe what is visible in the data: level, baseline comparisons, percentiles, variability, coverage, and lag.
                    We never provide recommendations.
                  </>
                }
                advanced={
                  <>
                    <ul className="list-disc space-y-1 pl-5">
                      <li>
                        <span className="text-ui-text">Allowed:</span> “MA7 is below MA30”, “today is in the 6th percentile”, “coverage is low”.
                      </li>
                      <li>
                        <span className="text-ui-text">Not allowed:</span> “sentiment labels”, “trade calls”, “valuation claims”, “directional predictions”.
                      </li>
                      <li>
                        <span className="text-ui-text">No causality:</span> we do not claim drivers unless it is purely a measurement/coverage explanation.
                      </li>
                    </ul>
                  </>
                }
              />
            </Card>

            <Card title="Where to go next">
              <BasicAdvanced
                basic={
                  <>
                    <ul className="list-disc space-y-1 pl-5">
                      <li>
                        For interpretation rules and highlighting:{" "}
                        <Link className="underline underline-offset-4 hover:text-ui-text" href="/notables">
                          Notables policy
                        </Link>
                      </li>
                      <li>
                        For per-metric definitions (what, how, why, value):{" "}
                        <Link className="underline underline-offset-4 hover:text-ui-text" href="/wiki">
                          Wiki
                        </Link>
                      </li>
                      <li>
                        For full dashboards:{" "}
                        <Link className="underline underline-offset-4 hover:text-ui-text" href="/chains">
                          Chains
                        </Link>
                      </li>
                    </ul>
                  </>
                }
                advanced={
                  <>
                    <div className="text-xs text-ui-faint">
                      This methodology page defines the global rules. The wiki defines metric-specific semantics. Notables defines highlighting and data-quality wording.
                    </div>
                  </>
                }
              />
            </Card>
          </div>

          <div className="mt-10 text-[11px] text-ui-faint">
            Descriptive only. No prices. No advice. No forecasts. No causality implied. Missing values render as gaps (null), never zeros.
          </div>
        </section>
      </div>
    </main>
  );
}