// src/app/methodology/page.tsx
// NOTE: Server component (no "use client") — pure content.
// Goal: Basic = pedagogical. Advanced = principled math + exact rules.

import Link from "next/link";

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
          This product reports <span className="text-ui-text">what the data shows</span> — not what anyone should do.
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
              <span className="text-ui-text">No price series</span> anywhere (no charts, no “should”, no advice).
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
                        <span className="text-ui-text font-semibold">Daily</span> = the actual day’s activity (can be noisy).
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
                    Fast scan:
                    <ol className="mt-2 list-decimal space-y-1 pl-5">
                      <li>
                        Check <span className="text-ui-text font-semibold">MA7 vs MA30</span>: is the short-term baseline above or below the structural baseline?
                      </li>
                      <li>
                        Check <span className="text-ui-text font-semibold">Daily vs MA7</span>: is today unusually high/low versus the last-week norm?
                      </li>
                      <li>
                        Use <span className="text-ui-text font-semibold">Percentile</span>: is today extreme or typical in the selected window?
                      </li>
                      <li>
                        If something looks odd, click through to the chain dashboard for coverage/lag details and deeper context.
                      </li>
                    </ol>
                  </>
                }
                advanced={
                  <>
                    <div className="text-xs text-ui-faint">
                      Landing intentionally suppresses raw links and quality diagnostics. Dashboards reveal them for audit and deeper analysis.
                    </div>
                  </>
                }
              />
            </Card>
          </div>
        </section>

        {/* What we do NOT do */}
        <section>
          <SectionTitle id="what-not" title="What this product does NOT do" kicker="Trust requirement" />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="Explicit exclusions (non-negotiable)">
              <BasicAdvanced
                basic={
                  <>
                    We deliberately do not include:
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li><span className="text-ui-text font-semibold">No prices</span>, no price charts, no “value narratives”.</li>
                      <li><span className="text-ui-text font-semibold">No forecasts</span> (no predictions of future behavior).</li>
                      <li><span className="text-ui-text font-semibold">No advice</span> (“buy/sell”, “bullish/bearish”, “should”).</li>
                      <li><span className="text-ui-text font-semibold">No causality</span> claims (we don’t assert drivers).</li>
                    </ul>
                    You get descriptive context and auditability — not recommendations.
                  </>
                }
                advanced={
                  <>
                    <div className="space-y-2">
                      <div>Language constraints (enforced in UI + content):</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        <li>We use descriptive terms: “above baseline”, “below baseline”, “high percentile”, “low coverage”.</li>
                        <li>We avoid normative/causal terms: “bullish”, “undervalued”, “should”, “because X happened”.</li>
                      </ul>
                      <div className="text-xs text-ui-faint">
                        Exceptions: we may explain data quality (coverage/lag/missing days) because that is about measurement, not market behavior.
                      </div>
                    </div>
                  </>
                }
              />
            </Card>

            <Card title="Why we exclude these things">
              <BasicAdvanced
                basic={
                  <>
                    Many dashboards become noisy because they mix signal with price narratives and calls to action.
                    Our goal is the opposite: stable trend context that stays useful even when you don’t watch the market every day.
                  </>
                }
                advanced={
                  <>
                    <div className="space-y-2">
                      <div>
                        The product is designed to be auditable: every displayed number must be reproducible from published artifacts.
                        Forecasting or “advice” language typically breaks that auditability and increases model risk.
                      </div>
                    </div>
                  </>
                }
              />
            </Card>
          </div>
        </section>

        {/* Artifacts */}
        <section>
          <SectionTitle id="artifacts" title="Published artifacts & versioning" kicker="Auditability" />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="What is published">
              <BasicAdvanced
                basic={
                  <>
                    Each chain publishes JSON artifacts under{" "}
                    <span className="font-mono text-ui-text">/data/published/v1</span>. The UI reads these artifacts.
                    Every artifact includes an <span className="font-mono text-ui-text">as-of</span> date and a revision identifier so you can audit exactly what you are seeing.
                  </>
                }
                advanced={
                  <>
                    <div className="space-y-2">
                      <div>
                        Artifact families:
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          <li><span className="font-mono text-ui-text">gold</span>: primary daily chain metrics (price-agnostic).</li>
                          <li><span className="font-mono text-ui-text">derived</span>: computed features (e.g., MA, z, percentiles) when published.</li>
                          <li><span className="font-mono text-ui-text">meta</span>: coverage, lag, data-quality annotations.</li>
                          <li><span className="font-mono text-ui-text">landing</span>: landing metadata (charts, supported windows, defaults).</li>
                        </ul>
                      </div>
                      <div>
                        Versioning rules:
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          <li>Any definition change increments a version and is documented (including “Previously”).</li>
                          <li>UI wording must reference definitions, not ad-hoc phrasing.</li>
                        </ul>
                      </div>
                    </div>
                  </>
                }
              />
            </Card>

            <Card title="How to audit a chart">
              <BasicAdvanced
                basic={
                  <>
                    On a chain page, you can open the raw artifacts behind each chart. Audit by checking:{" "}
                    <span className="text-ui-text">window</span>, <span className="text-ui-text">coverage</span>, and{" "}
                    <span className="text-ui-text">as-of/lag</span>.
                  </>
                }
                advanced={
                  <>
                    <div className="space-y-2">
                      <div>Reproducibility checklist:</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        <li>Identify metric key (e.g., <span className="font-mono text-ui-text">tx_count_daily</span>).</li>
                        <li>Fetch reference window (typically <span className="font-mono text-ui-text">last365d</span>).</li>
                        <li>Compute MA and context metrics on the reference series.</li>
                        <li>Slice the display window last (prevents edge artifacts).</li>
                      </ul>
                    </div>
                  </>
                }
              />
            </Card>
          </div>
        </section>

        {/* Windows & slicing */}
        <section>
          <SectionTitle id="windows" title="Windows & slicing (critical rule)" kicker="UI integrity" />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="Displayed window vs reference window">
              <BasicAdvanced
                basic={
                  <>
                    You can view last 7d/30d/90d/180d/365d. But smoothing (MA7/MA30) should be computed on a longer{" "}
                    reference window so lines don’t disappear at the start when you zoom in.
                  </>
                }
                advanced={
                  <>
                    <div className="space-y-3">
                      <div className="text-ui-text font-semibold">Critical rule</div>
                      <div>
                        Compute rolling statistics on the <span className="text-ui-text">reference</span> series{" "}
                        (e.g., last365d), then slice to the user’s chosen window.
                      </div>
                      <Math>
                        {"Let R be reference series (e.g., 365 days). Let W be display slice (e.g., 90 days)."} <br />
                        {"Compute MA_k on R: MA_k(R)."} <br />
                        {"Display: slice(daily(R), W) and slice(MA_k(R), W)."}
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
                    If you compute MA30 only on last90d, the first ~29 days can’t have a 30-day mean. The MA30 line starts late and looks “broken”.
                    Using a longer reference window makes MA lines continuous across the whole visible slice.
                  </>
                }
                advanced={
                  <>
                    <Math>
                      {"MA30_t requires {x_{t-29}, …, x_t}."} <br />
                      {"If the series begins at t0, then MA30 exists only for t ≥ t0+29."}
                    </Math>
                    <div className="text-xs text-ui-faint">
                      Larger reference windows reduce “edge effects” when switching windows.
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
            <Card title="What MA7 and MA30 represent">
              <BasicAdvanced
                basic={
                  <>
                    <span className="text-ui-text font-semibold">MA7</span> is the short-term regime (roughly “this week”).
                    <span className="text-ui-text font-semibold"> MA30</span> is the structural baseline (roughly “this month”).
                    Comparing them helps you see whether recent activity sits above or below the broader baseline.
                  </>
                }
                advanced={
                  <>
                    <Math>
                      {"MA_n(t) = (1/n) · Σ_{i=0..n-1} x_{t-i}"} <br />
                      {"Defined only when all n inputs are non-null (otherwise null)."}
                    </Math>
                    <div className="text-xs text-ui-faint">
                      We do not “partially average” fewer points, because that changes the meaning of MA_n.
                    </div>
                  </>
                }
              />
            </Card>

            <Card title="Percent deltas shown under charts">
              <BasicAdvanced
                basic={
                  <>
                    Under charts we show deltas like “Daily is -25% vs MA7”. This means today is 25% lower than the last-week baseline.
                    It’s a descriptive distance-from-baseline indicator — not a prediction.
                  </>
                }
                advanced={
                  <>
                    <Math>
                      {"Δ(daily vs MA7) = (x_t − MA7_t) / |MA7_t|"} <br />
                      {"Δ(MA7 vs MA30) = (MA7_t − MA30_t) / |MA30_t|"} <br />
                      {"If the denominator is 0 or null → delta is null."}
                    </Math>
                  </>
                }
              />
            </Card>
          </div>
        </section>

        {/* Context metrics */}
        <section>
          <SectionTitle id="context" title="Context metrics" kicker="Interpretation (descriptive)" />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="Percentile (distribution context)">
              <BasicAdvanced
                basic={
                  <>
                    Percentile tells you where today’s daily value sits compared with other daily values in the selected window.
                    Example: “6th percentile” means today is lower than most days in this window.
                  </>
                }
                advanced={
                  <>
                    <Math>
                      {"Given values V = {x_i} in the reference window (non-null only):"} <br />
                      {"percentile(x_t) = ( # { v ∈ V : v ≤ x_t } ) / |V|"} <br />
                      {"Reported as 0..100. Null if too few non-null points."}
                    </Math>
                    <div className="text-xs text-ui-faint">
                      Percentile is distribution position, not a forecast.
                    </div>
                  </>
                }
              />
            </Card>

            <Card title="Z-score (standardized deviation)">
              <BasicAdvanced
                basic={
                  <>
                    Z-score expresses how far a value is from the mean, measured in standard deviations.
                    It helps compare “unusualness” across metrics with different units.
                  </>
                }
                advanced={
                  <>
                    <Math>
                      {"z_t = (x_t − μ) / σ"} <br />
                      {"μ = mean(V),  σ = stdev(V),  V = non-null values in the reference window"} <br />
                      {"If σ is ~0 or sample too small → z is null (guardrail)."}
                    </Math>
                  </>
                }
              />
            </Card>

            <Card title="Trend (Rising / Flat / Falling)">
              <BasicAdvanced
                basic={
                  <>
                    Trend is estimated from smoothed movement (usually MA30). It describes persistent drift, not daily noise.
                  </>
                }
                advanced={
                  <>
                    <Math>
                      {"Fit a line to MA30 over time: MA30_t ≈ a + b·t"} <br />
                      {"If b > +τ → Rising; if b < −τ → Falling; else Flat"} <br />
                      {"Strength buckets use |b| relative to typical scale."}
                    </Math>
                    <div className="text-xs text-ui-faint">
                      Exact thresholds (τ) are fixed and documented per model version.
                    </div>
                  </>
                }
              />
            </Card>

            <Card title="Volatility (Coefficient of Variation)">
              <BasicAdvanced
                basic={
                  <>
                    Volatility describes how noisy daily values are relative to their typical level. “Highly variable” means large swings are common.
                  </>
                }
                advanced={
                  <>
                    <Math>
                      {"CV = σ / |μ|"} <br />
                      {"σ = stdev(daily),  μ = mean(daily)  (over the reference window)"} <br />
                      {"Bucket CV into labels using fixed thresholds."}
                    </Math>
                  </>
                }
              />
            </Card>
          </div>
        </section>

        {/* Coverage & freshness */}
        <section>
          <SectionTitle id="quality" title="Coverage, missing days, freshness" kicker="Data quality" />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="Coverage & missing days">
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
                        <span className="text-ui-text">Not allowed:</span> “bullish”, “buy/sell”, “undervalued”, “will go up”.
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