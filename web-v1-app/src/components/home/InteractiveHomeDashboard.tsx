"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";

import type { HeroPanelSnapshot } from "./HeroNetworkStatePanel";

export type HomeLabel = "STABLE" | "HEATING" | "CONGESTED" | "CHEAP" | "UNKNOWN/DEGRADED";
export type Artifact = "Meta" | "Gold" | "Derived" | "Briefs";
type JsonPayload = unknown;

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
  kind: "high" | "low";
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

type HistoryRow = { date: string; label: HomeLabel; confidence: number | null };
type HistoryResponse = { chains?: Record<string, HistoryRow[]> };
type HistoryRange = 14 | 30 | 90;

const artifacts: Artifact[] = ["Meta", "Gold", "Derived", "Briefs"];
const ranges: HistoryRange[] = [14, 30, 90];

const artifactCopy: Record<Artifact, { title: string; short: string; explanation: string }> = {
  Meta: { title: "Meta", short: "The joinable classification layer.", explanation: "The daily state row: regime, confidence, drivers, axes and provenance. This is the layer you normally join on date + chain." },
  Gold: { title: "Gold", short: "Normalized daily chain measurements.", explanation: "The normalized measurements behind the published state, kept in a stable schema for analytical use." },
  Derived: { title: "Derived", short: "Contextual features and rolling baselines.", explanation: "Rolling averages and contextual features derived from Gold, used to compare a chain with its own recent history." },
  Briefs: { title: "Brief", short: "Readable context from the same evidence.", explanation: "A readable summary generated from the same published evidence. It adds interpretation without changing the underlying observation." },
};

const explanations: Record<string, { title: string; body: string }> = {
  CHEAP: { title: "CHEAP", body: "Network friction is low relative to this chain’s own recent history. It is useful context when fees, throughput or your own metrics change on the same date." },
  STABLE: { title: "STABLE", body: "Network conditions are broadly within this chain’s recent operating norms. This gives you a baseline when interpreting changes in your own data." },
  HEATING: { title: "HEATING", body: "Activity or operating pressure is building relative to this chain’s recent norm. Rising pressure can change the environment around fees, throughput and model behaviour." },
  CONGESTED: { title: "CONGESTED", body: "Friction and capacity pressure are elevated relative to this chain’s recent history. Congestion can materially change the environment around transactions and analytical observations." },
  "UNKNOWN/DEGRADED": { title: "UNKNOWN / DEGRADED", body: "The available evidence is too weak to support a stronger regime claim, so Urd Atlas withholds the classification instead of overstating it." },
  confidence: { title: "Confidence", body: "Confidence describes how strongly the available evidence supports the published classification. It is evidence strength, not the probability that the label is correct." },
  demand: { title: "Demand", body: "A chain-relative measure of activity pressure. Higher demand helps show when activity is moving away from the chain’s recent norm." },
  friction: { title: "Friction", body: "A chain-relative measure of transaction cost and congestion pressure. Lower friction is one of the main reasons a CHEAP regime can be published." },
  capacity: { title: "Capacity", body: "A chain-relative measure of operating pressure on the network. Elevated capacity pressure can support HEATING or CONGESTED conditions." },
};

function rows(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? new Intl.NumberFormat("en-US").format(value) : "—";
}

function compactJson(value: JsonPayload) {
  const text = JSON.stringify(value ?? null, null, 2);
  return text.length > 1800 ? `${text.slice(0, 1800)}\n…` : text;
}

function regimeY(label: HomeLabel) {
  if (label === "CONGESTED") return 58;
  if (label === "HEATING") return 158;
  if (label === "STABLE") return 282;
  if (label === "CHEAP") return 405;
  return 330;
}

function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

function InfoButton({ name, onOpen }: { name: string; onOpen: (name: string) => void }) {
  return <button type="button" className="ua5-info" aria-label={`Explain ${name}`} onClick={(event) => { event.stopPropagation(); onOpen(name); }}>i</button>;
}

function Checkout({ plan, children }: { plan: "basic" | "pro"; children: string }) {
  return <form action={`/api/v1/checkout?plan=${plan}`} method="post"><button className="ua5-plan-link" type="submit">{children}</button></form>;
}

export default function InteractiveHomeDashboard({ snapshots, lastRun, heroSnapshot }: Props) {
  const [selectedChainId, setSelectedChainId] = useState(snapshots[0]?.id ?? "bitcoin");
  const [history, setHistory] = useState<Record<string, HistoryRow[]>>({});
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);
  const [historyRange, setHistoryRange] = useState<HistoryRange>(14);
  const [showContext, setShowContext] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact>("Meta");
  const [jsonOpen, setJsonOpen] = useState(false);
  const [explainer, setExplainer] = useState<string | null>(null);
  const chartRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/v1/home-history", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<HistoryResponse> : Promise.reject())
      .then((payload) => { if (alive && payload.chains) setHistory(payload.chains); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const selectedChain = snapshots.find((chain) => chain.id === selectedChainId) ?? snapshots[0];
  if (!selectedChain) return null;

  const selectedHistory = history[selectedChainId] ?? [];
  const visibleHistory = selectedHistory.slice(-historyRange);
  const selectedPointIndex = selectedHistoryIndex == null
    ? Math.max(0, visibleHistory.length - 1)
    : Math.min(selectedHistoryIndex, Math.max(0, visibleHistory.length - 1));
  const selectedPoint = visibleHistory[selectedPointIndex] ?? null;
  const graphPoints = visibleHistory.length < 2 ? "" : visibleHistory.map((row, index) => `${((index / (visibleHistory.length - 1)) * 960).toFixed(1)},${regimeY(row.label)}`).join(" ");
  const cursorX = visibleHistory.length > 1 ? (selectedPointIndex / (visibleHistory.length - 1)) * 100 : 100;
  const displayRegime = selectedPoint?.label ?? selectedChain.regime;
  const displayConfidence = selectedPoint?.confidence == null ? selectedChain.confidence : `${Math.round(selectedPoint.confidence * 100)}%`;
  const displayDate = selectedPoint?.date ? formatShortDate(selectedPoint.date) : selectedChain.asOf;
  const observationNumber = rows(heroSnapshot?.consecutiveRows);
  const jsonPayload = selectedChain.artifacts[selectedArtifact];
  const activeExplanation = explainer ? explanations[explainer] : null;

  function selectChain(id: string) {
    setSelectedChainId(id);
    setSelectedHistoryIndex(null);
  }

  function selectRange(range: HistoryRange) {
    setHistoryRange(range);
    setSelectedHistoryIndex(null);
  }

  function handleGraphClick(event: MouseEvent<SVGSVGElement>) {
    if (visibleHistory.length < 2 || !chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    setSelectedHistoryIndex(Math.round(ratio * (visibleHistory.length - 1)));
  }

  return <main className="ua5">
    <section className="ua5-state-strip" aria-label="Latest network state">
      <span className="ua5-state-title">Latest network state</span>
      <div className="ua5-state-scroll">
        {snapshots.map((chain) => <div key={chain.id} className={`ua5-state-item ua5-status-${chain.regime.toLowerCase().replace("/", "-")}`}>
          <button type="button" className="ua5-state-select" aria-pressed={selectedChainId === chain.id} onClick={() => selectChain(chain.id)}><strong>{chain.ticker}</strong><span>{chain.regime}</span><small>{chain.confidence}</small></button>
          <InfoButton name={chain.regime} onOpen={setExplainer} />
        </div>)}
        <span className="ua5-state-meta"><strong>Last run</strong><span>{lastRun}</span></span>
      </div>
    </section>

    <section className="ua5-hero">
      <div className="ua5-shell ua5-hero-grid">
        <div className="ua5-hero-copy">
          <p className="ua5-kicker">Daily blockchain network-state reference data</p>
          <h1>Know the network conditions behind your data.</h1>
          <p className="ua5-hero-dek">One classified observation per chain and date for Bitcoin, Ethereum, Arbitrum and Base.</p>
          <p className="ua5-hero-plain"><strong>Join Urd Atlas to the data you already use.</strong> Each row adds a regime, confidence, evidence and provenance so you can see whether a change in your own metric happened alongside a change in network conditions.</p>
          <div className="ua5-hero-actions"><a className="ua5-primary" href="/api/v1/sample-pack" download>Inspect free sample</a><a className="ua5-text-action" href="#why">See how it helps</a></div>
        </div>
        <div className="ua5-chart-wrap">
          <div className="ua5-chart-controls">
            <div className="ua5-chain-tabs" role="group" aria-label="Select chain">{snapshots.map((chain) => <button key={chain.id} type="button" className={chain.id === selectedChainId ? "is-active" : ""} onClick={() => selectChain(chain.id)}>{chain.ticker}</button>)}</div>
            <div className="ua5-range-tabs" role="group" aria-label="Select history range">{ranges.map((range) => <button key={range} type="button" className={historyRange === range ? "is-active" : ""} onClick={() => selectRange(range)}>{range}D</button>)}</div>
          </div>
          <svg ref={chartRef} className="ua5-chart" viewBox="0 0 960 470" preserveAspectRatio="none" onClick={handleGraphClick} aria-label={`${selectedChain.name} regime history`}>
            {[90, 190, 310, 430].map((y) => <line key={y} x1="0" y1={y} x2="960" y2={y} className="ua5-gridline" />)}
            {[192, 384, 576, 768].map((x) => <line key={x} x1={x} y1="0" x2={x} y2="470" className="ua5-gridline" />)}
            <text x="0" y="22" className="ua5-axis-label">CONGESTED</text><text x="0" y="122" className="ua5-axis-label">HEATING</text><text x="0" y="246" className="ua5-axis-label">STABLE</text><text x="0" y="369" className="ua5-axis-label">CHEAP</text>
            {graphPoints ? <polyline points={graphPoints} className="ua5-history-line" /> : null}
            {visibleHistory.length > 1 ? <><line x1={`${cursorX}%`} y1="0" x2={`${cursorX}%`} y2="470" className="ua5-cursor" /><circle cx={`${cursorX}%`} cy={regimeY(displayRegime)} r="6" className="ua5-cursor-dot" /></> : null}
          </svg>
          <div className="ua5-chart-note"><small>{selectedChain.name.toUpperCase()} · {displayDate}</small><strong>{displayRegime} <InfoButton name={displayRegime} onOpen={setExplainer} /></strong><p>{selectedPoint ? explanations[displayRegime]?.body : selectedChain.oneLiner}</p><span>{displayConfidence} confidence <InfoButton name="confidence" onOpen={setExplainer} /></span></div>
          <p className="ua5-chart-caption">Select a point on the line to inspect the published state for that date.</p>
        </div>
      </div>
      <div className="ua5-shell ua5-facts"><span><strong>1 row</strong> per chain + date</span><span><strong>4 chains</strong> BTC · ETH · ARB · BASE</span><span><strong>4 layers</strong> Meta · Gold · Derived · Brief</span><span><strong>{observationNumber}</strong> published Bitcoin days</span></div>
    </section>

    <section id="why" className="ua5-light-section"><div className="ua5-shell">
      <div className="ua5-heading-pair"><h2>Your data can show the anomaly. Urd Atlas shows the environment around it.</h2><p>Nothing in your existing dataset is replaced. Urd Atlas attaches a network-state observation to the same date and chain.</p></div>
      <div className={`ua5-data-scene ${showContext ? "is-expanded" : ""}`}><h3>Your data</h3><p>Click once. The Urd Atlas fields expand into each date.</p><div className="ua5-data-table">
        <div className="ua5-data-row ua5-data-head"><span>Date</span><span>Model error</span><span className="ua5-added">Regime</span><span className="ua5-added">Confidence</span></div>
        {[["14 Aug", "2.1%", "STABLE", "88%"], ["15 Aug", "2.0%", "STABLE", "91%"], ["16 Aug", "4.3%", "CHEAP", "92%"]].map((row) => <div className="ua5-data-row" key={row[0]}><span data-label="Date">{row[0]}</span><span data-label="Model error">{row[1]}</span><span data-label="Regime" className="ua5-added">{row[2]}</span><span data-label="Confidence" className="ua5-added">{row[3]}</span></div>)}
      </div><button className="ua5-context-button" type="button" onClick={() => setShowContext((value) => !value)}>{showContext ? "Remove Urd Atlas fields" : "Add Urd Atlas fields"}</button><p className="ua5-data-conclusion">Now you know the anomaly coincided with a different network regime. That does not prove causality — it tells you where to investigate.</p></div>
    </div></section>

    <section id="product" className="ua5-product"><div className="ua5-shell">
      <div className="ua5-heading-pair ua5-heading-dark"><h2>Inspect the product, not a marketing illustration.</h2><p>The visible state stays simple. Every score and data layer remains available when you want to go deeper.</p></div>
      <div className="ua5-product-grid"><div className="ua5-observation"><small>PUBLISHED NETWORK STATE · {selectedChain.name.toUpperCase()} · {selectedChain.asOf}</small><h3>{selectedChain.regime} <InfoButton name={selectedChain.regime} onOpen={setExplainer} /></h3><p>{selectedChain.oneLiner}</p>
        {([['demand', selectedChain.demand], ['friction', selectedChain.friction], ['capacity', selectedChain.capacity]] as const).map(([name, value]) => <div className="ua5-metric" key={name}><label>{name} <InfoButton name={name} onOpen={setExplainer} /></label><span><i style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} /></span><b>{value == null ? "—" : value.toFixed(1)}</b></div>)}
        <div className="ua5-metric"><label>confidence <InfoButton name="confidence" onOpen={setExplainer} /></label><span><i style={{ width: `${Math.round((selectedChain.confidenceValue ?? 0) * 100)}%` }} /></span><b>{selectedChain.confidence}</b></div>
      </div><div className="ua5-files"><div className="ua5-file-tabs">{artifacts.map((artifact) => <span className="ua5-file-tab-wrap" key={artifact}><button type="button" className={artifact === selectedArtifact ? "is-active" : ""} onClick={() => setSelectedArtifact(artifact)}>{artifactCopy[artifact].title}</button><InfoButton name={`artifact-${artifact}`} onOpen={setExplainer} /></span>)}<button className="ua5-full-json" type="button" onClick={() => setJsonOpen(true)}>View full JSON</button></div><div className="ua5-file-meta"><span>{selectedChain.id} / latest / {selectedArtifact.toLowerCase()}.json</span><span>method {selectedChain.methodologyVersion}</span></div><pre className="ua5-code"><code>{compactJson(jsonPayload)}</code></pre><p className="ua5-file-purpose">{artifactCopy[selectedArtifact].short}</p></div></div>
    </div></section>

    <section className="ua5-light-section ua5-detail-section"><div className="ua5-shell"><div className="ua5-heading-pair"><h2>Open only the detail you need.</h2><p>The page stays concise. Method, confidence and integration details expand in place.</p></div><div className="ua5-details"><details><summary>How the classification is produced <span>Expand</span></summary><p>Daily measurements are normalized against chain-relative baselines. Demand, friction and capacity are scored, confidence is gated, and the published observation is versioned and hash-anchored.</p></details><details><summary>Why confidence can be low <span>Expand</span></summary><p>Confidence measures evidence strength. It is not the probability that a label is correct. Weak evidence can result in UNKNOWN / DEGRADED instead of an overstated claim.</p></details><details><summary>How the data enters your workflow <span>Expand</span></summary><p>Join on date + chain. Keep your own model or reporting data and add Urd Atlas as a reference layer beside it.</p></details><details><summary>What the subscription replaces <span>Expand</span></summary><p>Ingestion, normalization, chain baselines, lag handling, derived features, confidence rules, testing, versioning and daily publication are maintained upstream.</p></details></div><Link className="ua5-method-link" href="/methodology/reference">Read the full methodology →</Link></div></section>

    <section className="ua5-value-band"><div className="ua5-shell"><div className="ua5-heading-pair"><h2>The subscription replaces a maintenance problem.</h2><p>You can build the classification layer internally. The commercial question is whether maintaining it is worth more to you than the subscription price.</p></div><div className="ua5-value-grid"><div className="ua5-pipeline">{["Source ingestion", "Schema normalization", "Chain-relative baselines", "Lag-policy handling", "Derived features", "Classification", "Confidence gating", "Regression testing", "Versioning + hash", "Daily delivery"].map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, "0")}</span><b>{item}</b><em>{index < 3 ? "ongoing" : index === 3 ? "chain specific" : "operational"}</em></div>)}</div><div className="ua5-price-note"><small>The alternative</small><h3>Join one published row.</h3><strong>$49</strong><span>per month · Basic · one chain</span></div></div></div></section>

    <section id="pricing" className="ua5-pricing"><div className="ua5-shell"><div className="ua5-heading-pair"><h2>Pay for the coverage you need.</h2><p>Inspect the schema free. Use one chain for $49. Use all four chains and the full published history for $149.</p></div><div className="ua5-plans"><div><h3>Free</h3><p>Representative sample files for inspecting the schema and testing the join.</p><strong>$0</strong><a href="/api/v1/sample-pack" download>Inspect sample</a></div><div><h3>Basic</h3><p>One selected chain, 90 days of history, daily delivery and all four data layers.</p><strong>$49/mo</strong><Checkout plan="basic">Start Basic</Checkout></div><div><h3>Pro</h3><p>Bitcoin, Ethereum, Arbitrum and Base with full published history.</p><strong>$149/mo</strong><Checkout plan="pro">Start Pro</Checkout></div></div></div></section>

    <section className="ua5-final"><div className="ua5-shell ua5-final-grid"><h2>When the network changes, your data should know.</h2><div><p>Give every supported chain and date a network-state reference you can inspect, reproduce and join.</p><a href="/api/v1/sample-pack" download>Inspect the sample</a></div></div></section>

    {jsonOpen ? <div className="ua5-modal-backdrop" onClick={() => setJsonOpen(false)}><div className="ua5-modal" role="dialog" aria-modal="true" aria-label="Complete published JSON" onClick={(event) => event.stopPropagation()}><header><div><small>COMPLETE PUBLISHED JSON</small><h2>{artifactCopy[selectedArtifact].title} · {selectedChain.name}</h2></div><button type="button" onClick={() => setJsonOpen(false)}>Close</button></header><div className="ua5-modal-tabs">{artifacts.map((artifact) => <button key={artifact} type="button" className={artifact === selectedArtifact ? "is-active" : ""} onClick={() => setSelectedArtifact(artifact)}>{artifactCopy[artifact].title}</button>)}</div><pre><code>{JSON.stringify(selectedChain.artifacts[selectedArtifact] ?? null, null, 2)}</code></pre></div></div> : null}

    {activeExplanation || explainer?.startsWith("artifact-") ? <aside className="ua5-explainer" role="dialog"><button type="button" onClick={() => setExplainer(null)}>×</button>{explainer?.startsWith("artifact-") ? <><strong>{artifactCopy[explainer.replace("artifact-", "") as Artifact].title}</strong><p>{artifactCopy[explainer.replace("artifact-", "") as Artifact].explanation}</p></> : activeExplanation ? <><strong>{activeExplanation.title}</strong><p>{activeExplanation.body}</p></> : null}</aside> : null}
  </main>;
}
