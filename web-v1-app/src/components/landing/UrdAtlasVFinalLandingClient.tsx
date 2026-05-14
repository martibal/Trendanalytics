"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type ChainKey = "btc" | "eth" | "arb" | "base";
type JsonLayer = "gold" | "derived" | "meta";
type ConfidenceMode = "high" | "degraded";
type Label = "STABLE" | "HEATING" | "CONGESTED" | "CHEAP" | "UNKNOWN/DEGRADED";

// ---------------------------------------------------------------------------
// Public prop types — exported so page.tsx can import them
// ---------------------------------------------------------------------------

export type LandingChainData = {
  key: string;
  label: string;
  icon: string;
  fullName: string;
  chainId: string;
  regime: Label;
  confidence: string;
  oneLiner: string;
  path: number[];
};

export type LandingBriefData = {
  title: string;
  headline: string;
  dominant: Label;
  confidence: string;
  changes: string;
  run: string;
  path: Label[];
  plain: string;
};

// ---------------------------------------------------------------------------
// Static JSON examples (these are intentionally static — they are
// documentation/illustration, not live data)
// ---------------------------------------------------------------------------

const JSON_EXAMPLES: Record<ConfidenceMode, Record<JsonLayer, string>> = {
  high: {
    gold: "{\r\n  \"avg_block_time_sec\": 501.5470588235294,\r\n  \"block_count_daily\": 171,\r\n  \"chain\": \"bitcoin\",\r\n  \"date\": \"2025-08-04\",\r\n  \"failed_tx_rate\": null,\r\n  \"gas_utilization_pct\": null,\r\n  \"median_tx_fee_native\": 2.58e-06,\r\n  \"median_tx_value_native\": 0.0009438,\r\n  \"tx_count_daily\": 443301,\r\n  \"unique_active_addresses\": null,\r\n  \"value_transferred_native\": 683513.1045116399\r\n}",
    derived: "{\r\n  \"chain\": \"bitcoin\",\r\n  \"date\": \"2025-08-04\",\r\n  \"derived\": {\r\n    \"metrics\": {\r\n      \"avg_block_time_sec__ma30\": 581.33,\r\n      \"avg_block_time_sec__ma7\": 593.48,\r\n      \"tx_count_daily__ma30\": 419160.8,\r\n      \"tx_count_daily__ma7\": 385202.3\r\n    }\r\n  }\r\n}",
    meta: "{\r\n  \"chain\": \"bitcoin\",\r\n  \"date\": \"2025-08-04\",\r\n  \"status\": {\r\n    \"label\": \"HEATING\",\r\n    \"one_liner\": \"Demand: Normal; Friction: Normal; Capacity: Balanced\"\r\n  },\r\n  \"confidence\": {\r\n    \"confidence_score\": 0.881\r\n  },\r\n  \"regime\": {\r\n    \"label\": \"HEATING\",\r\n    \"determinism_hash\": \"643bad760b4a\"\r\n  }\r\n}",
  },
  degraded: {
    gold: "{\r\n  \"avg_block_time_sec\": 12.10,\r\n  \"block_count_daily\": 7138.0,\r\n  \"chain\": \"ethereum\",\r\n  \"date\": \"2025-10-31\",\r\n  \"failed_tx_rate\": 0.00993,\r\n  \"gas_utilization_pct\": 0.505,\r\n  \"median_tx_fee_native\": 21365980740280.0,\r\n  \"tx_count_daily\": 1639231.0,\r\n  \"unique_active_addresses\": 626214.0\r\n}",
    derived: "{\r\n  \"chain\": \"ethereum\",\r\n  \"date\": \"2025-10-31\",\r\n  \"derived\": {\r\n    \"meta_confidence\": {\r\n      \"confidence_score\": 7.09e-06\r\n    },\r\n    \"metrics\": {\r\n      \"tx_count_daily__ma30\": 1543554.5,\r\n      \"tx_count_daily__ma7\": 1518639.6\r\n    }\r\n  }\r\n}",
    meta: "{\r\n  \"chain\": \"ethereum\",\r\n  \"date\": \"2025-10-31\",\r\n  \"status\": {\r\n    \"label\": \"UNKNOWN/DEGRADED\",\r\n    \"one_liner\": \"Evidence support is insufficient for a confident label.\"\r\n  },\r\n  \"confidence\": {\r\n    \"confidence_score\": 0.031\r\n  },\r\n  \"regime\": {\r\n    \"label\": \"UNKNOWN/DEGRADED\",\r\n    \"determinism_hash\": \"5cb1a90073aa\"\r\n  }\r\n}",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function labelClass(label: Label): string {
  if (label === "STABLE") return "ua-vf-label--stable";
  if (label === "HEATING") return "ua-vf-label--heating";
  if (label === "CONGESTED") return "ua-vf-label--congested";
  if (label === "CHEAP") return "ua-vf-label--cheap";
  return "ua-vf-label--unknown";
}

function compactLabel(label: Label): string {
  if (label === "UNKNOWN/DEGRADED") return "UNKNOWN";
  return label;
}

function highlightJson(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/("(?:[^"\\]|\\.)*")(\s*:)/g, '<span class="ua-vf-jk">$1</span>$2')
    .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="ua-vf-js">$1</span>')
    .replace(/:\s*(-?\d[\d.e+\-]*)/gi, ': <span class="ua-vf-jn">$1</span>')
    .replace(/:\s*(null|true|false)/g, ': <span class="ua-vf-jb">$1</span>');
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const h = 28;
  const w = 80;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="ua-vf-spark">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Reveal({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    const el = document.querySelector(".ua-vf-reveal-sentinel-" + Math.random().toString(36).slice(2));
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <div className={`ua-vf-reveal ${visible ? "is-visible" : ""}`}>{children}</div>;
}

function Price({
  title, price, period = "", note, features, cta, href, featured = false,
}: {
  title: string; price: string; period?: string; note: string;
  features: string[]; cta: string; href: string; featured?: boolean;
}) {
  return (
    <article className={`ua-vf-price-card ${featured ? "is-featured" : ""}`}>
      <h3>{title}</h3>
      <div className="ua-vf-price">{price} {period ? <span>{period}</span> : null}</div>
      <p>{note}</p>
      <ul>{features.map((f) => <li key={f}>{f}</li>)}</ul>
      <Link href={href} className={featured ? "ua-vf-btn-primary" : "ua-vf-btn-ghost"}>{cta}</Link>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  chains: LandingChainData[];
  briefs: Record<string, LandingBriefData>;
  updatedThrough: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UrdAtlasVFinalLandingClient({ chains, briefs, updatedThrough }: Props) {
  const [progress, setProgress] = useState(0);
  const [miniVisible, setMiniVisible] = useState(false);
  const [briefChain, setBriefChain] = useState<string>(chains[0]?.key ?? "btc");
  const [jsonLayer, setJsonLayer] = useState<JsonLayer>("meta");
  const [confidenceMode, setConfidenceMode] = useState<ConfidenceMode>("high");
  const [modalOpen, setModalOpen] = useState(false);

  const selectedJson = useMemo(
    () => JSON_EXAMPLES[confidenceMode][jsonLayer] ?? "",
    [confidenceMode, jsonLayer]
  );

  useEffect(() => {
    const revealItems = document.querySelectorAll(".ua-vf-reveal");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("is-visible"); }),
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setProgress((scrollTop / max) * 100);
      setMiniVisible(scrollTop > 420);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const currentBrief = briefs[briefChain] ?? Object.values(briefs)[0];

  return (
    <main className="ua-vf">
      <div className="ua-vf-progress" style={{ width: `${progress}%` }} />

      {/* ── HERO ── */}
      <section className="ua-vf-hero" id="top">
        <div className="ua-vf-shell ua-vf-hero-grid">
          <div className="ua-vf-hero-copy ua-vf-reveal is-visible">
            <div className="ua-vf-eyebrow">Daily on-chain reference data</div>
            <h1 className="ua-vf-h1">Separate blockchain <em>noise</em> from structural change.</h1>
            <p>Daily Gold, Derived, Meta, and Brief JSON for BTC, ETH, ARB, and BASE. Use it directly, or join regime context to your own data by chain and date.</p>
            <div className="ua-vf-btn-row">
              <a href="#json" className="ua-vf-btn-primary">Inspect JSON</a>
              <a href="#brief" className="ua-vf-btn-ghost">Read latest Brief</a>
              <Link href="/tour" className="ua-vf-text-link">New to Urd Atlas? Take the quick tour →</Link>
            </div>
            <div className="ua-vf-trustline">
              <span>No price data</span><span>No forecasts</span><span>No recommendations</span>
            </div>
          </div>

          <aside className="ua-vf-context-panel ua-vf-reveal is-visible">
            <div className="ua-vf-panel-head">
              <div>
                <div className="ua-vf-panel-title">Latest Published Context</div>
                <div className="ua-vf-muted ua-vf-mono">chain-relative, not price-relative</div>
              </div>
              <div className="ua-vf-panel-date">
                Updated through<br />{updatedThrough}
              </div>
            </div>
            <div className="ua-vf-chain-list">
              {chains.map((row) => (
                <Link
                  key={row.key}
                  href={`/chains/${row.chainId}`}
                  className="ua-vf-chain-row"
                >
                  <div className="ua-vf-chain-icon">{row.icon}</div>
                  <div className="ua-vf-chain-short">{row.label}</div>
                  <div>
                    <span className={`ua-vf-label ${labelClass(row.regime)}`}>{compactLabel(row.regime)}</span>
                    <span className="ua-vf-row-one-liner">{row.oneLiner}</span>
                  </div>
                  <div className="ua-vf-conf">{row.confidence}</div>
                  <Sparkline
                    values={row.path}
                    color={
                      row.regime === "HEATING" ? "var(--c-heating)" :
                      row.regime === "CHEAP" ? "var(--c-cheap)" :
                      row.regime === "UNKNOWN/DEGRADED" ? "var(--c-unknown)" :
                      "var(--c-stable)"
                    }
                  />
                </Link>
              ))}
            </div>
            <div className="ua-vf-context-foot">
              <span>Daily cadence</span>
              <div className="ua-vf-context-links">
                <Link href="/briefs" className="ua-vf-text-link">Read weekly brief →</Link>
                <Link href="/track-record" className="ua-vf-text-link">View history →</Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ── MINI NAV ── */}
      <nav className={`ua-vf-mini ${miniVisible ? "show" : ""}`}>
        <div className="ua-vf-mini-inner">
          <a href="#brief">Brief</a>
          <a href="#json">JSON</a>
          <a href="#methodology">Methodology</a>
          <a href="#pricing">Pricing</a>
        </div>
      </nav>

      {/* ── KPIs ── */}
      <section className="ua-vf-kpis">
        <div className="ua-vf-shell ua-vf-kpi-grid">
          <div className="ua-vf-kpi"><strong>526</strong><span>published pipeline days</span></div>
          <div className="ua-vf-kpi"><strong>4</strong><span>chains covered</span></div>
          <div className="ua-vf-kpi"><strong>v1</strong><span>methodology version</span></div>
          <div className="ua-vf-kpi"><strong>0</strong><span>price fields</span></div>
          <div className="ua-vf-kpi"><strong>Daily</strong><span>not intraday</span></div>
        </div>
      </section>

      {/* ── USE PATH ── */}
      <section className="ua-vf-section">
        <div className="ua-vf-shell">
          <Reveal>
            <div className="ua-vf-section-head">
              <div className="ua-vf-eyebrow">Use path</div>
              <div>
                <h2 className="ua-vf-h2">Two ways into the same published layer.</h2>
                <p className="ua-vf-section-lead">The same daily data product supports a pipeline workflow and a direct reading workflow.</p>
              </div>
            </div>
            <div className="ua-vf-path-grid">
              <div className="ua-vf-path">
                <h3>Have your own pipeline?</h3>
                <p>Join Urd Atlas rows to your own daily rows by chain and date. Add regime, confidence, drivers, and provenance to existing analysis.</p>
                <a className="ua-vf-text-link" href="#json">Inspect JSON structure →</a>
              </div>
              <div className="ua-vf-path-divider" />
              <div className="ua-vf-path">
                <h3>No pipeline?</h3>
                <p>Read published Briefs directly. The Brief layer summarizes what changed, what drove it, and how stable the latest label has been.</p>
                <a className="ua-vf-text-link" href="#brief">Read the Brief preview →</a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── BRIEF ── */}
      <section className="ua-vf-section" id="brief">
        <div className="ua-vf-shell">
          <Reveal>
            <div className="ua-vf-section-head">
              <div className="ua-vf-eyebrow">Brief preview</div>
              <div>
                <h2 className="ua-vf-h2">Readable context from the same deterministic labels.</h2>
                <p className="ua-vf-section-lead">Briefs are the direct-use layer for users who want published context without building their own pipeline.</p>
              </div>
            </div>
            <div className="ua-vf-brief-layout">
              <div>
                <div className="ua-vf-brief-tabs">
                  {chains.map((c) => (
                    <button
                      type="button"
                      key={c.key}
                      onClick={() => setBriefChain(c.key)}
                      className={`ua-vf-tab ${briefChain === c.key ? "is-active" : ""}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <p className="ua-vf-muted">Switch chains to see how the same Brief structure carries different label paths and confidence states.</p>
              </div>
              {currentBrief && (
                <article className="ua-vf-brief-doc">
                  <div className="ua-vf-meta-label">{currentBrief.title} · latest 7 published days</div>
                  <h3 className="ua-vf-brief-headline">{currentBrief.headline}</h3>
                  <div className="ua-vf-regime-path">
                    {currentBrief.path.map((label, index) => (
                      <span key={`${label}-${index}`} className={labelClass(label)}>
                        D{index + 1} {compactLabel(label)}
                      </span>
                    ))}
                  </div>
                  <p className="ua-vf-muted">{currentBrief.plain}</p>
                  <div className="ua-vf-brief-metrics">
                    <div className="ua-vf-brief-metric">
                      <strong className={labelClass(currentBrief.dominant)}>{compactLabel(currentBrief.dominant)}</strong>
                      <span>dominant label</span>
                    </div>
                    <div className="ua-vf-brief-metric">
                      <strong>{currentBrief.confidence}</strong>
                      <span>confidence score</span>
                    </div>
                    <div className="ua-vf-brief-metric">
                      <strong>{currentBrief.changes}</strong>
                      <span>label changes</span>
                    </div>
                    <div className="ua-vf-brief-metric">
                      <strong>{currentBrief.run}</strong>
                      <span>latest run days</span>
                    </div>
                  </div>
                </article>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── JSON INSPECTOR ── */}
      <section className="ua-vf-section" id="json">
        <div className="ua-vf-shell">
          <Reveal>
            <div className="ua-vf-section-head">
              <div className="ua-vf-eyebrow">JSON inspector</div>
              <div>
                <h2 className="ua-vf-h2">Inspect the complete file, not a marketing excerpt.</h2>
                <p className="ua-vf-section-lead">Switch between complete high-confidence and degraded Gold, Derived, and Meta files from the v1 archive.</p>
              </div>
            </div>
            <div className="ua-vf-json-layout">
              <aside className="ua-vf-json-side">
                <div className="ua-vf-meta-label">Confidence example</div>
                <div className="ua-vf-conf-tabs">
                  <button type="button" onClick={() => setConfidenceMode("high")} className={`ua-vf-tab ${confidenceMode === "high" ? "is-active" : ""}`}>High confidence</button>
                  <button type="button" onClick={() => setConfidenceMode("degraded")} className={`ua-vf-tab ${confidenceMode === "degraded" ? "is-active" : ""}`}>Degraded</button>
                </div>
                <div className="ua-vf-meta-label">Layer</div>
                <div className="ua-vf-json-tabs">
                  {(["gold", "derived", "meta"] as JsonLayer[]).map((layer) => (
                    <button type="button" key={layer} onClick={() => setJsonLayer(layer)} className={`ua-vf-tab ${jsonLayer === layer ? "is-active" : ""}`}>{layer}</button>
                  ))}
                </div>
                <p className="ua-vf-json-note">These examples are from the published v1 archive and illustrate the schema structure.</p>
                <button type="button" className="ua-vf-btn-primary" onClick={() => setModalOpen(true)}>Open complete JSON</button>
              </aside>
              <div className="ua-vf-json-shell">
                <div className="ua-vf-code-toolbar">
                  <span>{confidenceMode}/{jsonLayer}.json</span>
                  <button type="button" className="ua-vf-text-link" onClick={() => navigator.clipboard?.writeText(selectedJson)}>Copy complete JSON</button>
                </div>
                <pre className="ua-vf-code" dangerouslySetInnerHTML={{ __html: highlightJson(selectedJson) }} />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── METHODOLOGY ── */}
      <section className="ua-vf-section" id="methodology">
        <div className="ua-vf-shell">
          <Reveal>
            <div className="ua-vf-section-head">
              <div className="ua-vf-eyebrow">Trust</div>
              <div><h2 className="ua-vf-h2">Built to be checked, not trusted blindly.</h2></div>
            </div>
            <div className="ua-vf-trust-row">
              <div className="ua-vf-trust-item"><strong>Daily, not intraday</strong><span>Daily cadence filters transient variance before labels are published.</span></div>
              <div className="ua-vf-trust-item"><strong>No price data</strong><span>Labels describe network conditions only.</span></div>
              <div className="ua-vf-trust-item"><strong>Hash anchored</strong><span>Every published row includes deterministic provenance.</span></div>
              <div className="ua-vf-trust-item"><strong>UNKNOWN allowed</strong><span>Weak evidence is not forced into strong labels.</span></div>
              <div className="ua-vf-trust-item"><strong>Public samples</strong><span>JSON structure can be inspected before subscribing.</span></div>
            </div>
            <div className="ua-vf-faq ua-vf-faq-spaced">
              <details><summary>Why daily, not intraday?</summary><p>Regime context is about structural network conditions. Intraday spikes are more likely to reflect transient variance than durable state.</p></details>
              <details><summary>How are labels determined?</summary><p>Labels are derived from documented demand, friction, and capacity evidence with deterministic rules and confidence gates.</p></details>
              <details><summary>Do labels use price data?</summary><p>No. Urd Atlas publishes network-condition reference data. Price data, forecasts, and recommendations are excluded.</p></details>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="ua-vf-section" id="pricing">
        <div className="ua-vf-shell">
          <Reveal>
            <div className="ua-vf-section-head">
              <div className="ua-vf-eyebrow">Pricing</div>
              <div><h2 className="ua-vf-h2">Simple access to the published layer.</h2></div>
            </div>
            <div className="ua-vf-pricing-grid">
              <Price title="Free" price="$0" note="Public charts, samples, limited history." cta="Start free" href="/status" features={["Public chain context", "Sample JSON", "Methodology docs"]} />
              <Price title="Single Chain" price="$49" period="/mo" note="One chain with full daily JSON." cta="Choose a chain" href="/api/v1/checkout?plan=basic" features={["Gold, Derived, Meta, Brief", "Historical access", "Email support"]} />
              <Price title="Full Access" price="$149" period="/mo" note="All supported chains and cross-chain Briefs." cta="Get full access" href="/api/v1/checkout?plan=pro" featured features={["BTC, ETH, ARB, BASE", "Cross-chain Briefs", "Published archive"]} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── MODAL ── */}
      <div className={`ua-vf-modal ${modalOpen ? "is-open" : ""}`} role="dialog" aria-modal="true">
        <div className="ua-vf-modal-panel">
          <div className="ua-vf-modal-head">
            <div className="ua-vf-modal-title">Complete JSON · {confidenceMode}/{jsonLayer}</div>
            <button className="ua-vf-modal-close" type="button" onClick={() => setModalOpen(false)}>Close</button>
          </div>
          <pre className="ua-vf-code" dangerouslySetInnerHTML={{ __html: highlightJson(selectedJson) }} />
        </div>
      </div>
    </main>
  );
}
