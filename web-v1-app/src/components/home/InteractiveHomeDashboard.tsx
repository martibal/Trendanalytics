"use client";

import Link from "next/link";
import Script from "next/script";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { HeroPanelSnapshot } from "./HeroNetworkStatePanel";

export type HomeLabel = "STABLE" | "HEATING" | "CONGESTED" | "CHEAP" | "UNKNOWN/DEGRADED";
export type Artifact = "Meta" | "Gold" | "Derived" | "Briefs";
type CheckoutPlan = "basic" | "pro";
type JsonPayload = unknown;
type ExampleKind = "high" | "low";
type InfoId = "regime" | "confidence" | "demand" | "friction" | "capacity" | "dataQuality" | "labelConfidence" | "dataLag";

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
  sourceDate: string;
  regime: HomeLabel;
  confidenceScore: number | null;
  dataQualityScore: number | null;
  labelConfidenceScore: number | null;
  demandScore: number | null;
  frictionScore: number | null;
  capacityScore: number | null;
  dataLag: string;
  oneLiner: string;
  fullPayload: JsonPayload;
};

type Props = {
  snapshots: HomeChainSnapshot[];
  lastRun: string;
  examples: { high: HomeConfidenceExample | null; low: HomeConfidenceExample | null };
  heroSnapshot?: HeroPanelSnapshot;
};

const info: Record<InfoId, { title: string; body: string }> = {
  regime: { title: "Regime / status", body: "The regime is the daily network-state label for a chain. It is produced from network activity, friction and capacity evidence. It is not a price view." },
  confidence: { title: "Confidence", body: "A combined evidence-strength score. It blends data quality with how clearly the observed evidence supports the published label. It is not a probability that the label is correct." },
  demand: { title: "Demand", body: "Demand describes how strong network activity looked compared with that network's own recent baseline." },
  friction: { title: "Friction", body: "Friction describes how difficult or costly the network was to use that day, using fee and failure evidence." },
  capacity: { title: "Capacity", body: "Capacity describes whether the network appeared to have usable room relative to current activity." },
  dataQuality: { title: "Data quality", body: "Completeness and freshness context for the raw evidence behind the row." },
  labelConfidence: { title: "Label confidence", body: "How clearly the evidence supports one published label instead of sitting between labels." },
  dataLag: { title: "Data lag", body: "How old the underlying observation is at publication time. BTC and ETH are normally T+1; ARB and Base are normally T+7." },
};

const artifacts: Array<{ name: Artifact; number: string; what: string; use: string }> = [
  { name: "Meta", number: "01", what: "Regime, confidence and score vector.", use: "The daily state row you join to your own data." },
  { name: "Gold", number: "02", what: "Daily measurements behind the state row.", use: "Inspect the raw evidence behind the label." },
  { name: "Derived", number: "03", what: "Moving averages and feature context.", use: "Use feature engineering without rebuilding it." },
  { name: "Briefs", number: "04", what: "Readable context from the same evidence.", use: "Drop the evidence into notes, reports and dashboards." },
];

const plans: Array<{ id: "free" | CheckoutPlan; name: string; price: string; summary: string; cta: string; recommended?: boolean }> = [
  { id: "free", name: "Free", price: "$0", summary: "Inspect the public sample pack and the published format before paying.", cta: "Download sample" },
  { id: "basic", name: "Basic", price: "$49/mo", summary: "One selected chain with authenticated daily delivery and 90 days of history on subscribe.", cta: "Start Basic", recommended: true },
  { id: "pro", name: "Pro", price: "$149/mo", summary: "All four chains with authenticated daily delivery and the full published history.", cta: "Start Pro" },
];

const regimeExplainers: Array<{ label: Exclude<HomeLabel, "UNKNOWN/DEGRADED">; plain: string; evidence: string }> = [
  { label: "STABLE", plain: "No unusual network condition dominates the evidence.", evidence: "Demand, Friction and Capacity do not combine strongly enough to trigger another regime." },
  { label: "HEATING", plain: "Network activity is unusually elevated and still strengthening.", evidence: "High Demand plus a heating trend; Ethereum can also use its defined calldata corroboration path." },
  { label: "CONGESTED", plain: "The network is under material usage or capacity pressure.", evidence: "Typically high Friction together with high Capacity pressure; Ethereum/L2 also allow an extreme-capacity heating path." },
  { label: "CHEAP", plain: "Using the network is unusually inexpensive without contradictory capacity pressure.", evidence: "Low Friction while Capacity is not simultaneously high enough to veto the classification." },
];

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
  if (label === "STABLE") return "var(--signal-stable)";
  if (label === "CHEAP") return "var(--signal-cheap)";
  if (label === "HEATING") return "var(--signal-heating)";
  if (label === "CONGESTED") return "var(--signal-congested)";
  return "var(--signal-unknown)";
}

function toneStyle(label: HomeLabel): CSSProperties {
  return { "--status-color": statusColor(label) } as CSSProperties;
}

function SignatureLine({ className = "" }: { className?: string }) {
  return (
    <svg className={`ua-signature ${className}`} viewBox="0 0 1200 90" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 52 C72 48 93 60 143 54 C198 47 220 51 267 49 C311 47 328 18 346 68 C365 14 382 74 403 45 C431 48 462 54 503 50 C553 45 583 57 627 53 C681 49 704 52 749 46 C781 42 795 63 812 34 C829 66 844 24 865 52 C909 55 953 46 1001 50 C1064 56 1114 44 1200 51" />
    </svg>
  );
}

function SpecimenIcon({ type }: { type: Artifact }) {
  if (type === "Meta") return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="9"/><path d="M16 5v22M5 16h22"/></svg>;
  if (type === "Gold") return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 8h22v16H5zM11 8v16M21 8v16M5 14h22M5 20h22"/></svg>;
  if (type === "Derived") return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 23c5 0 6-14 12-14s7 14 12 14M4 16h24"/></svg>;
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 25V7h18v18H7zM11 12h10M11 16h10M11 20h6"/></svg>;
}

function InfoButton({ id, activeInfo, setActiveInfo }: { id: InfoId; activeInfo: InfoId | null; setActiveInfo: (value: InfoId | null) => void }) {
  const open = activeInfo === id;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const popoverId = `ua3-info-${id}`;
  const closeAndRestoreFocus = useCallback(() => {
    setActiveInfo(null);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, [setActiveInfo]);

  useEffect(() => {
    if (open) window.setTimeout(() => closeRef.current?.focus(), 0);
  }, [open]);

  return (
    <span className="ua-info">
      <button ref={triggerRef} type="button" aria-label={`Explain ${info[id].title}`} aria-expanded={open} aria-controls={popoverId} onClick={(event) => { event.stopPropagation(); open ? closeAndRestoreFocus() : setActiveInfo(id); }} className="ua-info-trigger">?</button>
      {open ? (
        <span id={popoverId} className="ua-info-popover" role="dialog" aria-label={info[id].title}>
          <button ref={closeRef} type="button" aria-label="Close explanation" className="ua-info-close" onClick={(event) => { event.stopPropagation(); closeAndRestoreFocus(); }}>×</button>
          <strong>{info[id].title}</strong>
          <span>{info[id].body}</span>
        </span>
      ) : null}
    </span>
  );
}

function StatusMark({ label }: { label: HomeLabel }) {
  return <span className="ua-status-mark" style={toneStyle(label)}><span />{label}</span>;
}

function InstrumentScale({ chain, activeInfo, setActiveInfo }: { chain: HomeChainSnapshot; activeInfo: InfoId | null; setActiveInfo: (value: InfoId | null) => void }) {
  const values = [
    { id: "demand" as const, label: "Demand", value: chain.demand },
    { id: "friction" as const, label: "Friction", value: chain.friction },
    { id: "capacity" as const, label: "Capacity", value: chain.capacity },
  ];
  return (
    <div className="ua-instrument" aria-label="Demand, friction and capacity on one shared scale">
      <div className="ua-instrument-scale" aria-hidden="true"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
      <div className="ua-instrument-track">
        {values.map((item) => {
          const position = item.value == null ? 50 : Math.max(0, Math.min(100, item.value));
          return <span key={item.id} className={`ua-needle ua-needle-${item.id}`} style={{ left: `${position}%` }} aria-hidden="true" />;
        })}
      </div>
      <div className="ua-instrument-readings">
        {values.map((item) => <div key={item.id}><p className="ua-micro">{item.label} <InfoButton id={item.id} activeInfo={activeInfo} setActiveInfo={setActiveInfo} /></p><strong>{metric(item.value)}</strong></div>)}
      </div>
    </div>
  );
}

function CheckoutButton({ plan, children }: { plan: CheckoutPlan; children: string }) {
  return <form action={`/api/v1/checkout?plan=${plan}`} method="post" className="ua-form"><button type="submit" className="ua-action ua-action-filled">{children}</button></form>;
}

function JsonBlock({ payload, prismReady, complete = false }: { payload: JsonPayload; prismReady: boolean; complete?: boolean }) {
  const containerRef = useRef<HTMLPreElement | null>(null);
  const jsonText = complete ? prettyJson(payload) : compactJson(payload);
  useEffect(() => { if (containerRef.current) window.Prism?.highlightAllUnder?.(containerRef.current); }, [jsonText, prismReady]);
  return <pre ref={containerRef} tabIndex={complete ? 0 : undefined} className={complete ? "ua3-json ua3-json-complete" : "ua3-json"}><code className="language-json">{jsonText}</code></pre>;
}

function JsonTree({ payload, prismReady }: { payload: JsonPayload; prismReady: boolean }) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return <JsonBlock payload={payload} prismReady={prismReady} complete />;
  return <div className="ua-json-tree" aria-label="Full published JSON tree">{Object.entries(payload as Record<string, unknown>).map(([key, value]) => <details key={key}><summary><span>{key}</span><small>{Array.isArray(value) ? `array · ${value.length}` : value && typeof value === "object" ? "object" : typeof value}</small></summary><JsonBlock payload={value} prismReady={prismReady} complete /></details>)}</div>;
}

function formatRows(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? new Intl.NumberFormat("en-US").format(value) : "—";
}

export default function InteractiveHomeDashboard({ snapshots, lastRun, examples, heroSnapshot }: Props) {
  const [selectedChainId, setSelectedChainId] = useState(snapshots[0]?.id ?? "bitcoin");
  const [activeInfo, setActiveInfo] = useState<InfoId | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact>("Meta");
  const [exampleKind, setExampleKind] = useState<ExampleKind>("high");
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [prismReady, setPrismReady] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const modalTriggerRef = useRef<HTMLButtonElement | null>(null);

  const selectedChain = snapshots.find((snapshot) => snapshot.id === selectedChainId) ?? snapshots[0];
  const selectedExample = exampleKind === "high" ? examples.high : examples.low;
  const preview = useMemo(() => (selectedChain ? previewPayload(selectedArtifact, selectedExample, selectedChain) : null), [selectedArtifact, selectedChain, selectedExample]);
  const completeJson = useMemo(() => {
    if (!selectedChain) return null;
    if (selectedArtifact === "Meta" && selectedExample?.fullPayload) return selectedExample.fullPayload;
    return selectedChain.artifacts[selectedArtifact];
  }, [selectedArtifact, selectedChain, selectedExample]);
  const completeTitle = selectedArtifact === "Meta" && selectedExample ? `Meta ${selectedExample.sourceDate}.json` : `${selectedArtifact} latest.json`;

  const closeModal = useCallback(() => {
    setModalOpen(false);
    window.setTimeout(() => modalTriggerRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".ua3-section"));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add("ua-visible"); });
    }, { threshold: 0.08 });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!activeInfo) return;
    const close = (event: PointerEvent) => { if (event.target instanceof Element && !event.target.closest(".ua-info")) setActiveInfo(null); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [activeInfo]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeModal(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen, closeModal]);

  async function copyModalJson() {
    try {
      await navigator.clipboard?.writeText(prettyJson(completeJson));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { setCopied(false); }
  }

  if (!selectedChain) return null;

  const observationNumber = formatRows(heroSnapshot?.consecutiveRows);
  const methodologyVersion = heroSnapshot?.methodologyVersionLabel ?? selectedChain.methodologyVersion ?? "—";

  return (
    <main className="ua3">
      <Script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js" strategy="afterInteractive" onLoad={() => setPrismReady(true)} />
      <Script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-json.min.js" strategy="afterInteractive" onLoad={() => setPrismReady(true)} />

      <section className="ua3-section ua-night ua-hero ua-visible" aria-labelledby="hero-title">
        <SignatureLine className="ua-hero-trace" />
        <div className="ua-shell ua-hero-inner">
          <p className="ua-micro">DAILY OBSERVATION · NO {observationNumber}</p>
          <h1 id="hero-title">Add a daily network-regime column to the blockchain data you already use.</h1>
          <p className="ua-lede">Urd Atlas publishes one versioned observation per chain — regime, confidence and evidence — so analysts can separate a network-state shift from ordinary noise without maintaining the classification layer themselves.</p>
          <a href="/api/v1/sample-pack" className="ua-action ua-action-instrument" download>Inspect the sample pack</a>
          <p className="ua-boundary">Bitcoin · Ethereum · Arbitrum · Base · No price data · No forecasts · No recommendations</p>
        </div>
      </section>

      <SignatureLine className="ua-divider" />

      <section className="ua3-section ua-paper ua-value" aria-labelledby="value-title">
        <div className="ua-shell ua-paper-inset">
          <p className="ua-micro">A PRACTICAL QUESTION</p>
          <h2 id="value-title">When Tuesday changes, ask whether the network changed with it.</h2>
          <div className="ua-editorial-ledger">
            <article><p className="ua-field">01 / MODEL ERROR</p><div><h3>Your model&apos;s error rate doubled on Tuesday.</h3><p>Before changing the model, check whether the chain itself moved into a different operating state.</p></div></article>
            <article><p className="ua-field">02 / JOIN KEY</p><div><h3>Add network context to that date.</h3><p>Join <code>regime</code> and <code>confidence_score</code> on date + chain and inspect whether Tuesday was STABLE, HEATING, CONGESTED or CHEAP.</p></div></article>
            <article><p className="ua-field">03 / EXPLANATION</p><div><h3>Keep the evidence attached.</h3><p>Confidence, drivers and underlying measurements stay with the row so the change can be investigated instead of guessed at.</p></div></article>
          </div>
        </div>
      </section>

      <SignatureLine className="ua-divider ua-divider-invert" />

      <section className="ua3-section ua-night ua-dataset" aria-labelledby="dataset-title">
        <SignatureLine className="ua-dataset-trace" />
        <div className="ua-dataset-frame">
          <div className="ua-dataset-heading"><p className="ua-micro">SPECIMEN / DATASET</p><h2 id="dataset-title">Dataset at a glance.</h2></div>
          <div className="ua-dataset-fact"><strong>{observationNumber}</strong><div><p>consecutive daily rows</p><span>Published since {heroSnapshot?.firstPublishedLabel ?? "Dec 2024"}, no gaps</span></div></div>
          <div className="ua-dataset-fact"><strong>4</strong><div><p>chains covered</p><span>Bitcoin · Ethereum · Arbitrum · Base</span></div></div>
          <div className="ua-dataset-fact"><strong>{methodologyVersion}</strong><div><p>methodology</p><span>Deterministic and versioned; history is never silently rewritten</span></div></div>
        </div>
      </section>

      <SignatureLine className="ua-divider" />

      <section id="today-status" className="ua3-section ua-paper ua-state" aria-labelledby="status-title">
        <div className="ua-shell ua-paper-inset">
          <div className="ua-section-heading"><div><p className="ua-micro">PUBLISHED NETWORK STATE</p><h2 id="status-title">Today&apos;s state — updated {lastRun}.</h2></div><p>Select a specimen to inspect the observation.</p></div>
          <div className="ua-specimen-strip" role="group" aria-label="Chain selector">
            {snapshots.map((chain) => {
              const active = chain.id === selectedChainId;
              return <button key={chain.id} data-chain={chain.id} type="button" aria-pressed={active} onClick={() => setSelectedChainId(chain.id)} className={active ? "ua-specimen-tag ua-specimen-active" : "ua-specimen-tag"} style={toneStyle(chain.regime)}><span className="ua-micro">{chain.ticker}</span><strong>{chain.name}</strong><span className="ua-specimen-date">{chain.asOf} · {chain.lag}</span><StatusMark label={chain.regime} /><span className="ua-specimen-confidence">{chain.confidence} confidence</span></button>;
            })}
          </div>
          <div className="ua-observation-sheet">
            <div className="ua-observation-summary">
              <p className="ua-micro">SELECTED OBSERVATION / {selectedChain.ticker}</p>
              <div className="ua-observation-title"><h3>{selectedChain.name}</h3><StatusMark label={selectedChain.regime} /></div>
              <p>{selectedChain.oneLiner}</p>
              <div className="ua-confidence-readout"><div><strong>{selectedChain.confidence}</strong><span>headline confidence</span></div><InfoButton id="confidence" activeInfo={activeInfo} setActiveInfo={setActiveInfo} /></div>
              <div className="ua-quality-ledger"><span>Data quality <b>{pct(selectedChain.dataQuality)}</b> <InfoButton id="dataQuality" activeInfo={activeInfo} setActiveInfo={setActiveInfo} /></span><span>Label confidence <b>{pct(selectedChain.labelConfidence)}</b> <InfoButton id="labelConfidence" activeInfo={activeInfo} setActiveInfo={setActiveInfo} /></span><span>Data lag <b>{selectedChain.lag}</b> <InfoButton id="dataLag" activeInfo={activeInfo} setActiveInfo={setActiveInfo} /></span></div>
            </div>
            <InstrumentScale chain={selectedChain} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
          </div>
        </div>
      </section>

      <SignatureLine className="ua-divider ua-divider-invert" />

      <section className="ua3-section ua-night ua-files" aria-labelledby="files-title">
        <div className="ua-shell">
          <div className="ua-section-heading"><div><p className="ua-micro">DELIVERED EVIDENCE</p><h2 id="files-title">One daily row. Four delivered files.</h2></div><p>Each layer carries the same date + chain key.</p></div>
          <div className="ua-artifact-strip" role="group" aria-label="Artifact selector">
            {artifacts.map((artifact) => <button key={artifact.name} type="button" aria-pressed={selectedArtifact === artifact.name} onClick={() => setSelectedArtifact(artifact.name)} className={selectedArtifact === artifact.name ? "ua-artifact ua-artifact-active" : "ua-artifact"}><span className="ua-artifact-number">{artifact.number}</span><SpecimenIcon type={artifact.name} /><h3>{artifact.name}</h3><p>{artifact.what}</p><small>{artifact.use}</small></button>)}
          </div>
          <div className="ua-json-layout">
            <div className="ua-json-controls"><p className="ua-micro">EXAMPLE PREVIEW</p><div className="ua-segmented">{(["high", "low"] as const).map((kind) => <button key={kind} type="button" aria-pressed={exampleKind === kind} onClick={() => setExampleKind(kind)} className={exampleKind === kind ? "ua-segment-active" : ""}>{kind} confidence</button>)}</div><p>Switch the confidence example, then inspect the selected layer.</p><button ref={modalTriggerRef} type="button" aria-haspopup="dialog" className="ua-text-action" onClick={() => setModalOpen(true)}>View complete JSON →</button></div>
            <JsonBlock payload={preview} prismReady={prismReady} />
          </div>
        </div>
      </section>

      <SignatureLine className="ua-divider" />

      <section className="ua3-section ua-paper ua-reading" aria-labelledby="reading-title">
        <div className="ua-shell ua-paper-inset">
          <p className="ua-micro">FIELD NOTES / INTERPRETATION</p>
          <h2 id="reading-title">How to read the label and confidence.</h2>
          <div className="ua-field-journal">
            {regimeExplainers.map((item, index) => <article key={item.label}><span className="ua-journal-number">0{index + 1}</span><div><StatusMark label={item.label} /><h3>{item.plain}</h3><p>{item.evidence}</p></div></article>)}
            <article><span className="ua-journal-number">05</span><div><p className="ua-micro">CONFIDENCE</p><h3>Evidence strength — not probability.</h3><p>Headline confidence is <code>sqrt(data quality × label confidence)</code>. If the combined score falls below 0.40, Urd Atlas withholds the stronger regime claim and publishes UNKNOWN/DEGRADED.</p></div></article>
          </div>
          <p className="ua-reading-note"><strong>Demand</strong> = activity · <strong>Friction</strong> = cost/failure burden · <strong>Capacity</strong> = pressure on usable network room. <Link href="/methodology/reference">See the exact chain-specific rules →</Link></p>
        </div>
      </section>

      <SignatureLine className="ua-divider ua-divider-invert" />

      <section className="ua3-section ua-night ua-build" aria-labelledby="build-title">
        <div className="ua-shell">
          <p className="ua-micro">BUILD OR BUY</p>
          <h2 id="build-title">You could build this yourself. The question is whether you should.</h2>
          <p className="ua-lede ua-build-lede">The alternative is ingestion, normalization, chain-specific feature work, historical baselines, classification rules, confidence logic and ongoing maintenance.</p>
          <div className="ua-flow">
            <article><span>01</span><h3>Build the data layer</h3><p>Source four chains, normalize schemas, aggregate daily measurements and keep the pipeline healthy.</p></article>
            <div className="ua-flow-line"><SignatureLine /></div>
            <article><span>02</span><h3>Define the methodology</h3><p>Choose chain-aware proxies, baselines, thresholds, confidence gates and validation tests.</p></article>
            <div className="ua-flow-line"><SignatureLine /></div>
            <article><span>03</span><h3>Or connect the finished layer</h3><p>Join one versioned row per day and keep the evidence attached.</p><Link href="#pricing" className="ua-text-action">Compare plans →</Link></article>
          </div>
        </div>
      </section>

      <SignatureLine className="ua-divider" />

      <section id="pricing" className="ua3-section ua-paper ua-pricing" aria-labelledby="pricing-title">
        <div className="ua-shell ua-paper-inset">
          <p className="ua-micro">ACCESS / PLANS</p>
          <h2 id="pricing-title">Choose the access level that matches your workflow.</h2>
          <div className="ua-price-table">
            {plans.map((plan) => <article key={plan.id} className={plan.recommended ? "ua-price-row ua-price-recommended" : "ua-price-row"}><div><span className="ua-micro">{plan.recommended ? "RECOMMENDED START" : "PLAN"}</span><h3>{plan.name}</h3></div><strong>{plan.price}</strong><p>{plan.summary}</p><div>{plan.id === "free" ? <a href="/api/v1/sample-pack" className="ua-action ua-action-outline" download>{plan.cta}</a> : <CheckoutButton plan={plan.id}>{plan.cta}</CheckoutButton>}</div></article>)}
          </div>
          <p className="ua-price-note">Start with the smallest plan that fits the number of chains you actually use. Chain access is priced as delivery and access, not as a claim that every chain has identical variation.</p>
        </div>
      </section>

      {modalOpen ? <div className="ua-modal-backdrop" onClick={closeModal}><div ref={modalRef} tabIndex={-1} className="ua-modal" role="dialog" aria-modal="true" aria-labelledby="json-modal-title" onClick={(event) => event.stopPropagation()}><div className="ua-modal-head"><div><p className="ua-micro">COMPLETE PUBLISHED JSON</p><h2 id="json-modal-title">{completeTitle}</h2></div><div><button type="button" className="ua-action ua-action-outline" onClick={copyModalJson}>{copied ? "Copied" : "Copy"}</button><button type="button" autoFocus className="ua-action ua-action-filled" onClick={closeModal}>Close</button></div></div><JsonTree payload={completeJson} prismReady={prismReady} /></div></div> : null}
    </main>
  );
}
