"use client";

import Link from "next/link";
import Script from "next/script";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import HeroNetworkStatePanel, { type HeroPanelSnapshot } from "./HeroNetworkStatePanel";

export type HomeLabel = "STABLE" | "HEATING" | "CONGESTED" | "CHEAP" | "UNKNOWN/DEGRADED";
export type Artifact = "Meta" | "Gold" | "Derived" | "Briefs";
type CheckoutPlan = "basic" | "pro";
type JsonPayload = unknown;
type ExampleKind = "high" | "low";

declare global {
  interface Window {
    Prism?: { highlightAllUnder?: (container: Element) => void };
  }
}

export type HomeChainSnapshot = {
  id: string;
  ticker: string;
  name: string;
  lag: string;
  regime: HomeLabel;
  confidence: string;
  confidenceValue: number | null;
  dataQuality: number | null;
  labelConfidence: number | null;
  asOf: string;
  oneLiner: string;
  demand: number | null;
  demandLabel: string;
  friction: number | null;
  frictionLabel: string;
  capacity: number | null;
  capacityLabel: string;
  methodologyVersion: string;
  artifacts: Record<Artifact, JsonPayload | null>;
};

export type HomeConfidenceExample = {
  kind: ExampleKind;
  chain: string;
  chainLabel: string;
  date: string;
  regime: HomeLabel;
  confidenceScore: number | null;
  dataQualityScore: number | null;
  labelConfidenceScore: number | null;
  demandScore: number | null;
  frictionScore: number | null;
  capacityScore: number | null;
  dataLag: string;
  oneLiner: string;
};

type Props = {
  snapshots: HomeChainSnapshot[];
  lastRun: string;
  examples: { high: HomeConfidenceExample | null; low: HomeConfidenceExample | null };
  heroSnapshot?: HeroPanelSnapshot;
};

type InfoId = "regime" | "confidence" | "demand" | "friction" | "capacity" | "dataQuality" | "labelConfidence" | "dataLag";

const info: Record<InfoId, { title: string; body: string }> = {
  regime: { title: "Regime / status", body: "The regime is the daily network-state label for a chain. It is produced from network activity, friction and capacity evidence. It is not a price view." },
  confidence: { title: "Confidence", body: "Headline reliability for the published row. It combines data quality with how clearly the row supports the published label." },
  demand: { title: "Demand", body: "Demand describes how strong network activity looked compared with that network&apos;s own recent baseline." },
  friction: { title: "Friction", body: "Friction describes how difficult or costly the network was to use that day, using fee and failure evidence." },
  capacity: { title: "Capacity", body: "Capacity describes whether the network appeared to have usable room relative to current activity." },
  dataQuality: { title: "Data quality", body: "Completeness and freshness context for the raw evidence behind the row." },
  labelConfidence: { title: "Label confidence", body: "How clearly the evidence supports one published label instead of sitting between labels." },
  dataLag: { title: "Data lag", body: "How old the underlying observation is at publication time. BTC and ETH are normally T+1; ARB and Base are normally T+7." },
};

const artifactCards: Array<{ name: Artifact; icon: string; what: string; use: string }> = [
  { name: "Meta", icon: "◎", what: "Regime, confidence and score vector.", use: "Use it as the daily state row you join to your own data." },
  { name: "Gold", icon: "▦", what: "Daily measurements behind the state row.", use: "Use it to inspect the raw evidence behind the label." },
  { name: "Derived", icon: "⌁", what: "Moving averages and feature context.", use: "Use it when you want feature engineering without rebuilding it." },
  { name: "Briefs", icon: "✦", what: "Readable context from the same evidence.", use: "Use it in reports, internal notes and dashboards." },
];

const plans: Array<{ id: "free" | CheckoutPlan; name: string; price: string; summary: string; cta: string; recommended?: boolean }> = [
  { id: "free", name: "Free", price: "$0", summary: "Inspect the public CSV and examples before paying.", cta: "Open free kit" },
  { id: "basic", name: "Basic", price: "$49/mo", summary: "Authenticated daily delivery for one selected chain.", cta: "Start Basic", recommended: true },
  { id: "pro", name: "Pro", price: "$149/mo", summary: "Authenticated daily delivery for all four chains.", cta: "Start Pro" },
];

const gettingStarted = [
  { number: "01", title: "A network regime, not a market regime", body: "STABLE, HEATING, CONGESTED and CHEAP describe observable network conditions. They do not describe price direction, investor risk or a trading view.", cta: "Read methodology →", href: "/methodology/reference", icon: "card" },
  { number: "02", title: "Evidence underneath the label", body: "Demand, Friction and Capacity summarize the network state, while confidence, drivers and Gold measurements show the evidence behind it.", cta: "See validation →", href: "/validation", icon: "plug" },
  { number: "03", title: "A row you can use immediately", body: "Join the daily state on date + chain, segment analysis by regime, filter on confidence, or use Briefs as reporting context.", cta: "See code example →", href: "/analyst-kit", icon: "code" },
] as const;

function clampPercent(value: number | null) {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function pct(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${clampPercent(value)}%`;
}

function metric(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(1);
}

function prettyJson(value: JsonPayload) {
  return JSON.stringify(value ?? null, null, 2);
}

function compactJson(value: JsonPayload) {
  return prettyJson(value).slice(0, 1200);
}

function previewPayload(selectedArtifact: Artifact, selectedExample: HomeConfidenceExample | null, chain: HomeChainSnapshot) {
  if (selectedArtifact === "Meta" && selectedExample) {
    return {
      chain: selectedExample.chain,
      date: selectedExample.date,
      regime: selectedExample.regime,
      confidence_score: selectedExample.confidenceScore,
      data_quality_score: selectedExample.dataQualityScore,
      label_confidence_score: selectedExample.labelConfidenceScore,
      demand_score: selectedExample.demandScore,
      friction_score: selectedExample.frictionScore,
      capacity_score: selectedExample.capacityScore,
      data_lag: selectedExample.dataLag,
      one_liner: selectedExample.oneLiner,
    };
  }
  return chain.artifacts[selectedArtifact];
}

function statusColor(label: HomeLabel) {
  if (label === "STABLE") return "var(--status-stable)";
  if (label === "CHEAP") return "var(--status-cheap)";
  if (label === "HEATING") return "var(--status-heating)";
  if (label === "CONGESTED") return "var(--status-congested)";
  return "var(--status-unknown)";
}

function toneStyle(label: HomeLabel): CSSProperties {
  return { "--status-color": statusColor(label) } as CSSProperties;
}

function LucideIcon({ name }: { name: "card" | "plug" | "code" }) {
  if (name === "card") {
    return <svg className="ua3-step-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M2 10h20M6 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  }
  if (name === "plug") {
    return <svg className="ua3-step-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 22v-5M9 8V2M15 8V2M7 8h10v4a5 5 0 0 1-10 0V8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  return <svg className="ua3-step-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m16 18 6-6-6-6M8 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function FieldCode({ children }: { children: string }) {
  return <code className="ua3-value-field">{children}</code>;
}

function HeroValueStrip() {
  return (
    <div className="ua3-value-wrap">
      <p className="ua3-value-title">What can you use the regime for?</p>
      <div className="ua3-value-strip" aria-label="Practical uses">
        <div className="ua3-value-column">
          <h2>Put network context beside your own metrics.</h2>
          <p>Join <FieldCode>regime</FieldCode> and <FieldCode>confidence_score</FieldCode> on date + chain. If one of your own metrics changes sharply, check whether it coincided with an unusual network state before you assume the cause sits inside your own system.</p>
        </div>
        <div className="ua3-value-column">
          <h2>Segment analysis by the kind of network day.</h2>
          <p>Compare your own observations across <FieldCode>STABLE</FieldCode>, <FieldCode>HEATING</FieldCode>, <FieldCode>CONGESTED</FieldCode> and <FieldCode>CHEAP</FieldCode> periods instead of treating every blockchain day as equivalent.</p>
        </div>
        <div className="ua3-value-column">
          <h2>Explain what accompanied a network change.</h2>
          <p>Use Briefs, drivers and the underlying measurements to summarize the network conditions that accompanied a fee, activity or capacity change — without turning that evidence into a causal or predictive claim.</p>
        </div>
      </div>
    </div>
  );
}

function InfoButton({ id, activeInfo, setActiveInfo }: { id: InfoId; activeInfo: InfoId | null; setActiveInfo: (value: InfoId | null) => void }) {
  const open = activeInfo === id;
  return (
    <span className="ua3-info">
      <button type="button" aria-label={`Explain ${info[id].title}`} aria-expanded={open} onClick={(event) => { event.stopPropagation(); setActiveInfo(open ? null : id); }} className="ua3-info-button">?</button>
      {open ? (
        <span className="ua3-info-popover" role="dialog" aria-label={info[id].title}>
          <button type="button" aria-label="Close explanation" className="ua3-info-close" onClick={(event) => { event.stopPropagation(); setActiveInfo(null); }}>×</button>
          <span className="ua3-info-title">{info[id].title}</span>
          <span className="ua3-info-body">{info[id].body}</span>
        </span>
      ) : null}
    </span>
  );
}

function StatusBadge({ label, activeInfo, setActiveInfo }: { label: HomeLabel; activeInfo?: InfoId | null; setActiveInfo?: (value: InfoId | null) => void }) {
  return (
    <span className="ua3-status-badge" style={toneStyle(label)}>
      <span className="ua3-status-dot" />
      {label}
      {activeInfo !== undefined && setActiveInfo ? <InfoButton id="regime" activeInfo={activeInfo} setActiveInfo={setActiveInfo} /> : null}
    </span>
  );
}

function ProgressBar({ value }: { value: number | null }) {
  const width = clampPercent(value);
  return <div className="ua3-progress"><div className="ua3-progress-fill" style={{ width: `${width}%` }} /></div>;
}

function Sparkline() {
  return <svg aria-hidden="true" viewBox="0 0 120 34" className="ua3-sparkline"><path d="M2 24 L14 22 L25 16 L36 18 L48 9 L60 22 L73 17 L86 23 L99 11 L118 13" fill="none" stroke="var(--accent-action)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><path d="M2 24 L14 22 L25 16 L36 18 L48 9 L60 22 L73 17 L86 23 L99 11 L118 13" fill="none" stroke="var(--accent-action)" strokeOpacity="0.18" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ConfidenceGauge({ chain, activeInfo, setActiveInfo }: { chain: HomeChainSnapshot; activeInfo: InfoId | null; setActiveInfo: (value: InfoId | null) => void }) {
  const percent = clampPercent(chain.confidenceValue);
  return (
    <div className="ua3-confidence-block">
      <div className="ua3-gauge" style={{ "--pct": `${percent}%` } as CSSProperties}>
        <div className="ua3-gauge-inner">
          <span className="ua3-gauge-value">{chain.confidence}</span>
          <span className="ua3-gauge-label">Confidence</span>
          <InfoButton id="confidence" activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
        </div>
      </div>
      <div className="ua3-confidence-text"><p className="ua3-label">Headline reliability</p><p>Use confidence to decide how much weight to place on the published row.</p></div>
    </div>
  );
}

function SecondaryMetric({ id, label, value, activeInfo, setActiveInfo }: { id: InfoId; label: string; value: number | null; activeInfo: InfoId | null; setActiveInfo: (value: InfoId | null) => void }) {
  return <div className="ua3-metric-card"><div className="ua3-metric-head"><p className="ua3-label">{label}</p><InfoButton id={id} activeInfo={activeInfo} setActiveInfo={setActiveInfo} /></div><p className="ua3-data-medium">{metric(value)}</p><ProgressBar value={value == null ? null : value / 100} /></div>;
}

function TertiaryMetric({ id, label, value, activeInfo, setActiveInfo }: { id: InfoId; label: string; value: string; activeInfo: InfoId | null; setActiveInfo: (value: InfoId | null) => void }) {
  return <div className="ua3-mini-card"><div className="ua3-metric-head"><p className="ua3-label">{label}</p><InfoButton id={id} activeInfo={activeInfo} setActiveInfo={setActiveInfo} /></div><p className="ua3-data-small">{value}</p></div>;
}

function CheckoutButton({ plan, children }: { plan: CheckoutPlan; children: string }) {
  return <form action={`/api/v1/checkout?plan=${plan}`} method="post" className="ua3-form"><button type="submit" className="ua3-button ua3-button-primary ua3-button-full">{children}</button></form>;
}

function JsonBlock({ payload, prismReady, complete = false }: { payload: JsonPayload; prismReady: boolean; complete?: boolean }) {
  const containerRef = useRef<HTMLPreElement | null>(null);
  const jsonText = complete ? prettyJson(payload) : compactJson(payload);
  useEffect(() => { if (containerRef.current) window.Prism?.highlightAllUnder?.(containerRef.current); }, [jsonText, prismReady]);
  return <pre ref={containerRef} className={complete ? "ua3-json ua3-json-complete" : "ua3-json"}><code className="language-json">{jsonText}</code></pre>;
}

function toHeroPanelSnapshot(chain: HomeChainSnapshot): HeroPanelSnapshot {
  return {
    name: chain.name,
    asOf: chain.asOf,
    lag: chain.lag,
    regime: chain.regime,
    confidence: chain.confidence,
    confidenceValue: chain.confidenceValue,
    oneLiner: chain.oneLiner,
  };
}

export default function InteractiveHomeDashboard({ snapshots, lastRun, examples, heroSnapshot }: Props) {
  const [selectedChainId, setSelectedChainId] = useState(snapshots[0]?.id ?? "bitcoin");
  const [activeInfo, setActiveInfo] = useState<InfoId | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact>("Meta");
  const [exampleKind, setExampleKind] = useState<ExampleKind>("high");
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [prismReady, setPrismReady] = useState(false);

  const selectedChain = snapshots.find((snapshot) => snapshot.id === selectedChainId) ?? snapshots[0];
  const selectedExample = exampleKind === "high" ? examples.high : examples.low;
  const preview = useMemo(() => (selectedChain ? previewPayload(selectedArtifact, selectedExample, selectedChain) : null), [selectedArtifact, selectedChain, selectedExample]);
  const completeJson = useMemo(() => (selectedChain ? selectedChain.artifacts[selectedArtifact] : null), [selectedArtifact, selectedChain]);
  const ethereumSnapshot = snapshots.find((snapshot) => snapshot.id === "ethereum") ?? snapshots[1] ?? selectedChain;
  const heroPanelSnapshot = heroSnapshot ?? (ethereumSnapshot ? toHeroPanelSnapshot(ethereumSnapshot) : null);

  useEffect(() => {
    if (!activeInfo) return;
    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Element && !target.closest(".ua3-info")) setActiveInfo(null);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [activeInfo]);

  useEffect(() => {
    if (!modalOpen) return;
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") setModalOpen(false); }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [modalOpen]);

  async function copyModalJson() {
    try {
      await navigator.clipboard?.writeText(prettyJson(completeJson));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { setCopied(false); }
  }

  if (!selectedChain) return null;

  return (
    <main className="ua3">
      <Script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js" strategy="afterInteractive" onLoad={() => setPrismReady(true)} />
      <Script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-json.min.js" strategy="afterInteractive" onLoad={() => setPrismReady(true)} />

      <section className="ua3-section ua3-hero" aria-labelledby="hero-title">
        <div className="ua3-wrap ua3-hero-grid">
          <div className="ua3-hero-left">
            <p className="ua3-category">DAILY NETWORK-STATE CLASSIFICATION</p>
            <h1 id="hero-title" className="ua3-display">One daily network regime for Bitcoin, Ethereum, Arbitrum and Base — with the evidence underneath.</h1>
            <p className="ua3-body ua3-hero-copy">Urd Atlas classifies how the network behaved relative to its own recent history: STABLE, HEATING, CONGESTED or CHEAP. It is a network regime, not a market regime.</p>
            <HeroValueStrip />
            <div className="ua3-compliance-row" aria-label="Product boundary"><span className="ua3-compliance-pill">No price data</span><span className="ua3-compliance-pill">No forecasts</span><span className="ua3-compliance-pill">No recommendations</span></div>
            <p className="ua3-body-small">Transparent rules, chain-aware methodology and empirical robustness checks. <Link href="/validation">See the validation evidence →</Link></p>
            <a href="#today-status" className="ua3-button ua3-button-primary">See today&apos;s network state →</a>
          </div>
          <div className="ua3-hero-glow" aria-label="Hero network-state row preview">
            {heroPanelSnapshot ? <HeroNetworkStatePanel snapshot={heroPanelSnapshot} /> : null}
          </div>
        </div>
      </section>

      <div className="ua3-transition" aria-hidden="true" />

      <section className="ua3-section ua3-start" aria-labelledby="start-title"><div className="ua3-wrap"><h2 id="start-title" className="ua3-step-title">What you are buying.</h2><div className="ua3-start-grid">{gettingStarted.map((step) => <article key={step.number} className="ua3-card ua3-step-card"><p className="ua3-step-number">{step.number}</p><div className="ua3-step-heading"><LucideIcon name={step.icon} /><h3>{step.title}</h3></div><p className="ua3-body-small">{step.body}</p><Link href={step.href} className="ua3-button ua3-button-quiet">{step.cta}</Link></article>)}</div></div></section>

      <div className="ua3-transition" aria-hidden="true" />

      <section id="today-status" className="ua3-section ua3-status" aria-labelledby="status-title"><div className="ua3-wrap"><div className="ua3-section-head"><div><p className="ua3-label ua3-step-label">Published network state</p><h2 id="status-title" className="ua3-step-title">Today&apos;s state — four chains, updated {lastRun}.</h2></div><p className="ua3-body-small ua3-help-copy">Tap any term marked with ? to see a plain-language explanation.</p></div><div className="ua3-chain-grid">{snapshots.map((chain) => { const active = chain.id === selectedChainId; return <button key={chain.id} data-chain={chain.id} type="button" onClick={() => setSelectedChainId(chain.id)} className={active ? "ua3-card ua3-chain-card ua3-chain-card-active" : "ua3-card ua3-chain-card"} style={toneStyle(chain.regime)}><div className="ua3-chain-top"><div><p className="ua3-label">{chain.ticker}</p><h3>{chain.name}</h3></div><StatusBadge label={chain.regime} /></div><div className="ua3-chain-bottom"><div><p className="ua3-data-medium">{chain.confidence}</p><p className="ua3-body-small">confidence</p></div><Sparkline /></div></button>; })}</div><div className="ua3-detail-panel"><div className="ua3-card ua3-detail-summary"><div className="ua3-detail-head"><div><p className="ua3-label">{selectedChain.ticker} · {selectedChain.asOf} · {selectedChain.lag}</p><h3>{selectedChain.name}</h3></div><StatusBadge label={selectedChain.regime} activeInfo={activeInfo} setActiveInfo={setActiveInfo} /></div><p className="ua3-body-small ua3-one-liner">{selectedChain.oneLiner}</p><ConfidenceGauge chain={selectedChain} activeInfo={activeInfo} setActiveInfo={setActiveInfo} /></div><div className="ua3-status-metrics"><div className="ua3-secondary-grid"><SecondaryMetric id="demand" label="Demand" value={selectedChain.demand} activeInfo={activeInfo} setActiveInfo={setActiveInfo} /><SecondaryMetric id="friction" label="Friction" value={selectedChain.friction} activeInfo={activeInfo} setActiveInfo={setActiveInfo} /><SecondaryMetric id="capacity" label="Capacity" value={selectedChain.capacity} activeInfo={activeInfo} setActiveInfo={setActiveInfo} /></div><div className="ua3-tertiary-grid"><TertiaryMetric id="dataQuality" label="Data quality" value={pct(selectedChain.dataQuality)} activeInfo={activeInfo} setActiveInfo={setActiveInfo} /><TertiaryMetric id="labelConfidence" label="Label confidence" value={pct(selectedChain.labelConfidence)} activeInfo={activeInfo} setActiveInfo={setActiveInfo} /><TertiaryMetric id="dataLag" label="Data lag" value={selectedChain.lag} activeInfo={activeInfo} setActiveInfo={setActiveInfo} /></div></div></div></div></section>

      <div className="ua3-transition" aria-hidden="true" />

      <section className="ua3-section ua3-files" aria-labelledby="files-title"><div className="ua3-wrap ua3-files-grid"><div><p className="ua3-label ua3-step-label">Delivered evidence</p><h2 id="files-title" className="ua3-step-title">One daily row. Four delivered files.</h2><p className="ua3-body">Each layer has the same date and chain key, so it can be inspected by humans or joined into a workflow.</p></div><div className="ua3-artifact-grid">{artifactCards.map((artifact) => <button key={artifact.name} type="button" onClick={() => setSelectedArtifact(artifact.name)} className={selectedArtifact === artifact.name ? "ua3-card ua3-artifact-card ua3-artifact-card-active" : "ua3-card ua3-artifact-card"}><span className="ua3-artifact-icon">{artifact.icon}</span><h3>{artifact.name}</h3><p className="ua3-body-small">{artifact.what}</p><p className="ua3-card-note">{artifact.use}</p></button>)}</div></div><div className="ua3-wrap ua3-preview-panel"><div><p className="ua3-label">Example preview</p><div className="ua3-toggle-row" aria-label="Confidence example selector">{(["high", "low"] as const).map((kind) => <button key={kind} type="button" onClick={() => setExampleKind(kind)} className={exampleKind === kind ? "ua3-toggle ua3-toggle-active" : "ua3-toggle"}>{kind} confidence</button>)}</div><p className="ua3-body-small">Switch the confidence example, then inspect how the selected JSON layer changes.</p></div><div><JsonBlock payload={preview} prismReady={prismReady} /><button type="button" className="ua3-button ua3-button-quiet ua3-json-open" onClick={() => setModalOpen(true)}>View complete JSON →</button></div></div></section>

      <div className="ua3-transition" aria-hidden="true" />

      <section className="ua3-section ua3-start" aria-labelledby="build-buy-title">
        <div className="ua3-wrap">
          <p className="ua3-label ua3-step-label">Build or buy</p>
          <h2 id="build-buy-title" className="ua3-step-title">You could build this yourself. The question is whether you should.</h2>
          <p className="ua3-body">The alternative to Urd Atlas is not raw data alone. It is the ingestion, normalization, chain-specific feature work, historical baselines, classification rules, confidence logic and ongoing maintenance needed to turn that raw data into a dependable daily state row.</p>
          <div className="ua3-start-grid" style={{ marginTop: 32 }}>
            <article className="ua3-card ua3-step-card">
              <p className="ua3-step-number">01</p>
              <div className="ua3-step-heading"><LucideIcon name="plug" /><h3>Build and maintain the data layer</h3></div>
              <p className="ua3-body-small">Source four different chains, handle schema differences, aggregate daily measurements, validate freshness and keep the pipeline running when source data changes.</p>
            </article>
            <article className="ua3-card ua3-step-card">
              <p className="ua3-step-number">02</p>
              <div className="ua3-step-heading"><LucideIcon name="code" /><h3>Define and validate the methodology</h3></div>
              <p className="ua3-body-small">Choose chain-aware proxies, historical baselines, regime thresholds, confidence gates and validation tests — then version the method when it changes.</p>
            </article>
            <article className="ua3-card ua3-step-card">
              <p className="ua3-step-number">03</p>
              <div className="ua3-step-heading"><LucideIcon name="card" /><h3>Or connect the finished layer</h3></div>
              <p className="ua3-body-small">Basic is $49/month for one chain. Pro is $149/month for all four. If recreating and maintaining the same layer costs more than a small amount of analyst or engineering time, buying is cheaper.</p>
              <Link href="#pricing" className="ua3-button ua3-button-quiet">Compare plans →</Link>
            </article>
          </div>
        </div>
      </section>

      <div className="ua3-transition" aria-hidden="true" />

      <section id="pricing" className="ua3-section ua3-pricing" aria-labelledby="pricing-title"><div className="ua3-wrap"><p className="ua3-label ua3-step-label">Plans</p><h2 id="pricing-title" className="ua3-step-title">Pricing.</h2><div className="ua3-plan-grid">{plans.map((plan) => <article key={plan.id} className={plan.recommended ? "ua3-card ua3-plan-card ua3-plan-card-recommended" : "ua3-card ua3-plan-card"}><div className="ua3-plan-head"><h3>{plan.name}</h3>{plan.recommended ? <span className="ua3-plan-badge">Recommended start</span> : null}</div><p className="ua3-plan-price">{plan.price}</p><p className="ua3-body-small">{plan.summary}</p>{plan.id === "free" ? <Link href="/analyst-kit" className="ua3-button ua3-button-quiet ua3-button-full">{plan.cta}</Link> : <CheckoutButton plan={plan.id}>{plan.cta}</CheckoutButton>}</article>)}</div><p className="ua3-card-note ua3-pricing-note">Chain access is priced as delivery and access, not as a claim that every chain has identical variation.</p></div></section>

      <div className="ua3-transition" aria-hidden="true" />

      {modalOpen ? <div className="ua3-modal-backdrop" role="dialog" aria-modal="true" aria-label="Complete JSON preview" onClick={() => setModalOpen(false)}><div className="ua3-modal" onClick={(event) => event.stopPropagation()}><div className="ua3-modal-head"><div><p className="ua3-label">Complete JSON</p><h2>{selectedArtifact} latest.json</h2></div><div className="ua3-modal-actions"><button type="button" className="ua3-button ua3-button-quiet" onClick={copyModalJson}>{copied ? "Copied" : "Copy to clipboard"}</button><button type="button" className="ua3-button ua3-button-primary" onClick={() => setModalOpen(false)}>Close</button></div></div><JsonBlock payload={completeJson} prismReady={prismReady} complete /></div></div> : null}

      <style>{ua3Styles}</style>
    </main>
  );
}

const ua3Styles = `
.ua3 { --radius-card: 12px; --radius-badge: 6px; --radius-button: 999px; min-height: 100vh; background: var(--bg-base); color: var(--text-primary); overflow: hidden; }
.ua3-wrap { width: min(1440px, calc(100% - 48px)); margin: 0 auto; }
.ua3-hero .ua3-wrap { width: min(1312px, calc(100% - 128px)); }
.ua3-section { padding: 96px 0; }
.ua3-hero { padding: 80px 0; min-height: auto; display: block; background: radial-gradient(circle at 78% 42%, var(--accent-depth-glow), transparent 44%), var(--bg-base); }
.ua3-start { background: linear-gradient(rgba(16, 224, 160, 0.03), rgba(16, 224, 160, 0.03)), var(--bg-base); }
.ua3-status { background: var(--bg-base); }
.ua3-files { background: linear-gradient(rgba(76, 110, 245, 0.04), rgba(76, 110, 245, 0.04)), var(--bg-base); }
.ua3-pricing { background: linear-gradient(rgba(245, 247, 248, 0.02), rgba(245, 247, 248, 0.02)), var(--bg-base); }
.ua3-transition { height: 1px; width: 100%; background: linear-gradient(to bottom, transparent 0%, var(--accent-depth-line) 50%, transparent 100%); opacity: 0.4; }
.ua3-hero-grid { display: grid; grid-template-columns: minmax(0, 760px) minmax(380px, 1fr); align-items: stretch; gap: 80px; }
.ua3-hero-left { min-width: 0; }
.ua3-hero-glow { display: flex; align-items: center; justify-content: center; min-width: 0; min-height: 100%; background: radial-gradient(circle at center, var(--accent-depth-glow), transparent 62%); }
.ua3-category { display: inline-flex; align-items: center; border-radius: var(--radius-badge); padding: 4px 10px; border: 1px solid rgba(16, 224, 160, 0.3); background: rgba(16, 224, 160, 0.12); color: var(--accent-action); font-size: 11px; font-weight: 500; line-height: 1.4; letter-spacing: 0.06em; text-transform: uppercase; font-family: var(--mono); }
.ua3-display { max-width: 860px; margin: 24px 0 0; color: var(--text-primary); font-size: 52px; font-weight: 600; line-height: 1.1; letter-spacing: -0.045em; }
.ua3-step-title { margin: 0; color: var(--text-primary); font-size: 36px; font-weight: 600; line-height: 1.2; letter-spacing: -0.035em; }
.ua3 h3 { margin: 0; color: var(--text-primary); font-size: 22px; font-weight: 600; line-height: 1.3; letter-spacing: -0.02em; }
.ua3-body { max-width: 720px; margin: 24px 0 0; color: var(--text-secondary); font-size: 16px; font-weight: 400; line-height: 1.5; }
.ua3-body-small { margin: 16px 0 0; color: var(--text-secondary); font-size: 14px; font-weight: 400; line-height: 1.5; }
.ua3-label { margin: 0; color: var(--text-tertiary); font-family: var(--mono); font-size: 11px; font-weight: 500; line-height: 1.4; letter-spacing: 0.06em; text-transform: uppercase; }
.ua3-step-label { margin-bottom: 12px; color: var(--accent-action); }
.ua3-hero-copy { max-width: 640px; }
.ua3-value-wrap { padding: 32px 0; margin-top: 40px; margin-bottom: 40px; border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); }
.ua3-value-title { margin: 0 0 18px; color: var(--text-primary); font-size: 16px; font-weight: 600; line-height: 1.5; }
.ua3-value-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
.ua3-value-column h2 { margin: 0 0 8px; color: var(--text-primary); font-size: 16px; font-weight: 600; line-height: 1.5; letter-spacing: 0; }
.ua3-value-column p { margin: 0; color: var(--text-secondary); font-size: 14px; font-weight: 400; line-height: 1.5; }
.ua3-value-field { font-family: var(--mono); font-size: 13px; color: #7DD3FC; background: rgba(125, 211, 252, 0.08); padding: 1px 5px; border-radius: 4px; }
.ua3-compliance-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
.ua3-compliance-pill { border-radius: 20px; padding: 6px 14px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.04); color: var(--text-secondary); font-family: var(--mono); font-size: 11px; line-height: 1.4; letter-spacing: 0.06em; text-transform: uppercase; }
.ua3-button { display: inline-flex; align-items: center; justify-content: center; width: fit-content; border-radius: var(--radius-button); padding: 12px 18px; font-family: var(--mono); font-size: 11px; font-weight: 700; line-height: 1.4; letter-spacing: 0.06em; text-transform: uppercase; text-decoration: none; transition: transform .2s ease, background-color .2s ease, border-color .2s ease; cursor: pointer; }
.ua3-button:hover { transform: translateY(-1px); }
.ua3-button-primary { margin-top: 32px; border: 1px solid var(--accent-action); background: var(--accent-action); color: var(--accent-action-text); }
.ua3-button-primary:hover { background: var(--accent-action-hover); border-color: var(--accent-action-hover); }
.ua3-button-quiet { margin-top: 24px; border: 1px solid var(--border-subtle); background: rgba(255,255,255,0.04); color: var(--text-primary); }
.ua3-button-full { width: 100%; }
.ua3-card { border: 1px solid var(--border-subtle); border-radius: var(--radius-card); background: var(--bg-elevated-1); }
.ua3-start-grid, .ua3-chain-grid, .ua3-plan-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin-top: 32px; }
.ua3-chain-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.ua3-step-card, .ua3-plan-card { padding: 24px; }
.ua3-step-number { margin: 0; color: var(--accent-action); font-family: var(--mono); font-size: 12px; }
.ua3-step-heading { display: flex; align-items: center; gap: 12px; margin-top: 18px; }
.ua3-step-icon { width: 22px; height: 22px; color: var(--accent-action); }
.ua3-section-head { display: flex; align-items: end; justify-content: space-between; gap: 48px; }
.ua3-help-copy { max-width: 320px; }
.ua3-chain-card { padding: 22px; text-align: left; cursor: pointer; }
.ua3-chain-card-active { border-color: var(--status-color); box-shadow: 0 0 0 1px color-mix(in srgb, var(--status-color) 45%, transparent), 0 24px 64px rgba(0,0,0,0.26); }
.ua3-chain-top, .ua3-chain-bottom, .ua3-detail-head, .ua3-metric-head, .ua3-plan-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.ua3-chain-bottom { align-items: end; margin-top: 34px; }
.ua3-status-badge { display: inline-flex; align-items: center; gap: 7px; border-radius: 999px; padding: 5px 10px; border: 1px solid color-mix(in srgb, var(--status-color) 48%, transparent); background: color-mix(in srgb, var(--status-color) 16%, transparent); color: var(--status-color); font-family: var(--mono); font-size: 11px; font-weight: 700; line-height: 1.4; letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; }
.ua3-status-dot { width: 7px; height: 7px; border-radius: 999px; background: currentColor; box-shadow: 0 0 14px currentColor; }
.ua3-data-medium { margin: 16px 0 0; color: var(--text-primary); font-size: 28px; font-weight: 700; line-height: 1; }
.ua3-data-small { margin: 16px 0 0; color: var(--text-primary); font-size: 22px; font-weight: 700; line-height: 1; }
.ua3-sparkline { width: 118px; max-width: 44%; height: auto; opacity: .9; }
.ua3-detail-panel { display: grid; grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr); gap: 20px; margin-top: 24px; padding: 24px; border: 1px solid var(--border-subtle); border-radius: 20px; background: rgba(255,255,255,0.03); }
.ua3-detail-summary { padding: 24px; }
.ua3-one-liner { margin-top: 28px; max-width: 520px; }
.ua3-confidence-block { display: flex; align-items: center; gap: 20px; margin-top: 32px; }
.ua3-gauge { width: 138px; height: 138px; flex: 0 0 auto; border-radius: 999px; background: conic-gradient(var(--accent-action) var(--pct), rgba(255,255,255,0.08) 0); padding: 10px; }
.ua3-gauge-inner { display: grid; place-items: center; align-content: center; height: 100%; border-radius: 999px; background: var(--bg-elevated-1); text-align: center; }
.ua3-gauge-value { color: var(--text-primary); font-size: 32px; font-weight: 700; line-height: 1; }
.ua3-gauge-label { margin-top: 8px; color: var(--text-tertiary); font-family: var(--mono); font-size: 11px; line-height: 1.4; letter-spacing: 0.06em; text-transform: uppercase; }
.ua3-confidence-text p:last-child { margin: 8px 0 0; color: var(--text-secondary); font-size: 14px; line-height: 1.5; }
.ua3-status-metrics { display: grid; gap: 16px; }
.ua3-secondary-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 16px; }
.ua3-tertiary-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 16px; }
.ua3-metric-card, .ua3-mini-card { padding: 20px; border: 1px solid var(--border-subtle); border-radius: 14px; background: var(--bg-elevated-2); }
.ua3-mini-card { background: rgba(255,255,255,0.035); }
.ua3-progress { height: 6px; margin-top: 22px; border-radius: 999px; background: rgba(255,255,255,0.08); overflow: hidden; }
.ua3-progress-fill { height: 100%; border-radius: inherit; background: var(--accent-action); }
.ua3-info { position: relative; display: inline-flex; }
.ua3-info-button, .ua3-info-close { display: inline-grid; place-items: center; width: 20px; height: 20px; border: 1px solid var(--border-subtle); border-radius: 999px; background: rgba(255,255,255,0.06); color: var(--text-secondary); font: inherit; cursor: pointer; }
.ua3-info-popover { position: absolute; z-index: 50; top: calc(100% + 10px); right: 0; width: min(300px, calc(100vw - 32px)); padding: 18px; border: 1px solid var(--border-emphasis); border-radius: 14px; background: var(--bg-elevated-2); box-shadow: 0 24px 64px rgba(0,0,0,0.45); color: var(--text-secondary); }
.ua3-info-close { position: absolute; top: 10px; right: 10px; }
.ua3-info-title { display: block; padding-right: 28px; color: var(--text-primary); font-weight: 700; }
.ua3-info-body { display: block; margin-top: 8px; font-size: 13px; line-height: 1.5; }
.ua3-files-grid { display: grid; grid-template-columns: minmax(0, 0.75fr) minmax(0, 1.25fr); gap: 48px; }
.ua3-artifact-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 14px; }
.ua3-artifact-card { padding: 20px; text-align: left; cursor: pointer; }
.ua3-artifact-card-active { border-color: var(--accent-action); background: var(--bg-elevated-2); }
.ua3-artifact-icon { display: inline-flex; margin-bottom: 18px; color: var(--accent-action); font-size: 22px; }
.ua3-card-note { margin: 16px 0 0; color: var(--text-tertiary); font-size: 13px; line-height: 1.45; }
.ua3-preview-panel { display: grid; grid-template-columns: minmax(260px, .6fr) minmax(0, 1.4fr); gap: 32px; margin-top: 32px; padding: 24px; border: 1px solid var(--border-subtle); border-radius: 18px; background: rgba(255,255,255,0.03); }
.ua3-toggle-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
.ua3-toggle { border: 1px solid var(--border-subtle); border-radius: 999px; background: transparent; color: var(--text-secondary); padding: 8px 12px; font-family: var(--mono); font-size: 11px; text-transform: uppercase; cursor: pointer; }
.ua3-toggle-active { border-color: var(--accent-action); color: var(--accent-action); background: rgba(16,224,160,.08); }
.ua3-json { margin: 0; min-height: 320px; max-height: 520px; overflow: auto; border: 1px solid var(--border-subtle); border-radius: 8px; background: #0A0C0E; padding: 18px; color: var(--text-secondary); font-family: var(--mono); font-size: 13px; line-height: 1.55; }
.ua3-json-complete { max-height: 70vh; }
.ua3-json .token.property { color: #7DD3FC; }
.ua3-json .token.string { color: #86EFAC; }
.ua3-json .token.number, .ua3-json .token.boolean, .ua3-json .token.null { color: #FCD34D; }
.ua3-json .token.punctuation, .ua3-json .token.operator { color: #6B7280; }
.ua3-json-open { margin-top: 16px; }
.ua3-plan-card-recommended { transform: scale(1.03); border-color: var(--accent-action); background: var(--bg-elevated-2); box-shadow: 0 24px 64px rgba(16,224,160,.14); }
.ua3-plan-badge { border: 1px solid var(--accent-action); border-radius: 999px; padding: 5px 10px; color: var(--accent-action); font-family: var(--mono); font-size: 10px; text-transform: uppercase; }
.ua3-plan-price { margin: 28px 0 0; color: var(--text-primary); font-size: 40px; font-weight: 700; line-height: 1; }
.ua3-pricing-note { max-width: 760px; }
.ua3-form { margin: 0; }
.ua3-modal-backdrop { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 24px; background: rgba(0,0,0,.7); }
.ua3-modal { width: min(800px, 100%); max-height: calc(100vh - 48px); overflow: hidden; border: 1px solid var(--border-emphasis); border-radius: 16px; background: var(--bg-base); padding: 22px; box-shadow: 0 32px 100px rgba(0,0,0,.6); }
.ua3-modal-head { display: flex; align-items: start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.ua3-modal-head h2 { margin: 6px 0 0; font-size: 24px; }
.ua3-modal-actions { display: flex; gap: 10px; }
@media (max-width: 1120px) {
  .ua3-hero .ua3-wrap { width: min(1000px, calc(100% - 48px)); }
  .ua3-hero-grid { grid-template-columns: 1fr; gap: 44px; }
  .ua3-hero-glow { justify-content: flex-start; min-height: auto; }
  .ua3-start-grid, .ua3-chain-grid, .ua3-plan-grid, .ua3-secondary-grid, .ua3-tertiary-grid, .ua3-artifact-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .ua3-detail-panel, .ua3-files-grid, .ua3-preview-panel { grid-template-columns: 1fr; }
}
@media (max-width: 767px) {
  .ua3-wrap, .ua3-hero .ua3-wrap { width: calc(100% - 32px); }
  .ua3-section { padding: 64px 0; }
  .ua3-hero { padding: 64px 0; }
  .ua3-display { font-size: 40px; }
  .ua3-step-title { font-size: 30px; }
  .ua3-value-strip { grid-template-columns: 1fr; gap: 24px; }
  .ua3-start-grid, .ua3-chain-grid, .ua3-plan-grid, .ua3-secondary-grid, .ua3-tertiary-grid, .ua3-artifact-grid { grid-template-columns: 1fr; }
  .ua3-section-head, .ua3-modal-head, .ua3-modal-actions, .ua3-confidence-block { flex-direction: column; align-items: flex-start; }
  .ua3-gauge { width: 128px; height: 128px; }
  .ua3-plan-card-recommended { transform: none; }
}
`;