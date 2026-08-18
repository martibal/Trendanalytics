"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

export type HomeLabel = "STABLE" | "HEATING" | "CONGESTED" | "CHEAP" | "UNKNOWN/DEGRADED";
export type Artifact = "Meta" | "Gold" | "Derived" | "Briefs";
export type JsonPayload = unknown;

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
  dateIso: string;
  asOf: string;
  oneLiner: string;
  demand: number | null;
  friction: number | null;
  capacity: number | null;
  methodologyVersion: string;
  artifacts: Record<Artifact, JsonPayload | null>;
};

export type HomeHistoryPoint = {
  chain: string;
  date: string;
  regime: HomeLabel;
  confidence: number | null;
  dataQuality: number | null;
  labelConfidence: number | null;
  oneLiner: string;
  demand: number | null;
  friction: number | null;
  capacity: number | null;
};

export type HomeConfidenceExample = HomeHistoryPoint & {
  kind: "high" | "low";
  chainLabel: string;
  dataLag: string;
  fullPayload: JsonPayload;
};

export type HeroSnapshot = {
  consecutiveRows: number | null;
  firstPublishedLabel: string | null;
  methodologyVersionLabel: string | null;
};

type Props = {
  snapshots: HomeChainSnapshot[];
  histories: Record<string, HomeHistoryPoint[]>;
  lastRun: string;
  examples: { high: HomeConfidenceExample | null; low: HomeConfidenceExample | null };
  heroSnapshot?: HeroSnapshot;
};

type SelectedObservation = { chain: string; date: string };

const artifactMeta: Record<Artifact, { file: string; line: string }> = {
  Meta: { file: "meta.json", line: "Regime, confidence, axes, drivers and provenance." },
  Gold: { file: "gold.json", line: "Normalized daily measurements behind the state." },
  Derived: { file: "derived.json", line: "Moving averages and contextual features." },
  Briefs: { file: "brief.json", line: "Readable context from the same evidence." },
};

const buildSteps = [
  "Source ingestion", "Schema normalization", "Chain-specific baselines", "Lag policy handling", "Derived feature engineering",
  "Classification rules", "Confidence gating", "Regression testing", "Versioning", "Daily publishing",
];

function clamp(value: number | null, fallback = 50) {
  if (value == null || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, value));
}
function pct(value: number | null) { return value == null ? "—" : `${Math.round(value * 100)}%`; }
function score(value: number | null) { return value == null ? "—" : value.toFixed(1); }
function prettyDate(value: string) {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
function artifactUrl(artifact: Artifact, chain: string, date: string) {
  if (artifact === "Briefs") return `/data/published/v1/briefs/chains/${chain}/${date}.json`;
  return `/data/published/v1/${artifact.toLowerCase()}/${chain}/${date}.json`;
}
function statusClass(label: HomeLabel) {
  return `ua5-status ua5-status-${label === "UNKNOWN/DEGRADED" ? "unknown" : label.toLowerCase()}`;
}
function compact(value: unknown) {
  const raw = JSON.stringify(value ?? null, null, 2);
  return raw.length > 2400 ? `${raw.slice(0, 2400)}\n…` : raw;
}

function Checkout({ plan, children }: { plan: "basic" | "pro"; children: string }) {
  return <form action={`/api/v1/checkout?plan=${plan}`} method="post"><button className="ua5-action-link" type="submit">{children}</button></form>;
}

function ObservationReadout({ chain, point, compactMode = false }: { chain: HomeChainSnapshot; point: HomeHistoryPoint; compactMode?: boolean }) {
  return (
    <div className={`ua5-observation ${compactMode ? "ua5-observation-compact" : ""}`}>
      <div className="ua5-observation-top">
        <span>{chain.name.toUpperCase()}</span><span>{prettyDate(point.date).toUpperCase()}</span>
      </div>
      <div className="ua5-observation-regime"><span className={statusClass(point.regime)}>{point.regime}</span><strong>{pct(point.confidence)}</strong><small>confidence</small></div>
      <div className="ua5-observation-axes">
        <span><b>Demand</b><em>{score(point.demand)}</em></span>
        <span><b>Friction</b><em>{score(point.friction)}</em></span>
        <span><b>Capacity</b><em>{score(point.capacity)}</em></span>
      </div>
    </div>
  );
}

function Axis({ label, value }: { label: string; value: number | null }) {
  const position = clamp(value);
  return (
    <div className="ua5-ruler" aria-label={`${label}: ${value == null ? "not available" : value.toFixed(1)} out of 100`}>
      <div className="ua5-ruler-meta"><span>{label}</span><strong>{score(value)}</strong></div>
      <div className="ua5-ruler-track"><i style={{ "--ua5-position": `${position}%` } as CSSProperties} /><div className="ua5-ruler-ticks"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div></div>
    </div>
  );
}

function Timeline({ histories, snapshots, selected, onSelect }: { histories: Record<string, HomeHistoryPoint[]>; snapshots: HomeChainSnapshot[]; selected: SelectedObservation; onSelect: (value: SelectedObservation) => void }) {
  const allDates = useMemo(() => Array.from(new Set(Object.values(histories).flat().map((p) => p.date))).sort(), [histories]);
  const [cursorIndex, setCursorIndex] = useState(Math.max(0, allDates.indexOf(selected.date)));
  const [focusChain, setFocusChain] = useState(Math.max(0, snapshots.findIndex((c) => c.id === selected.chain)));
  const root = useRef<HTMLDivElement>(null);
  const cursorDate = allDates[cursorIndex] ?? selected.date;

  const choose = (chainIndex = focusChain) => {
    const chain = snapshots[chainIndex] ?? snapshots[0];
    if (chain && cursorDate) onSelect({ chain: chain.id, date: cursorDate });
  };
  const moveToFraction = (fraction: number) => {
    if (!allDates.length) return;
    setCursorIndex(Math.max(0, Math.min(allDates.length - 1, Math.round(fraction * (allDates.length - 1)))));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); setCursorIndex((v) => Math.max(0, v - 1)); }
    if (event.key === "ArrowRight") { event.preventDefault(); setCursorIndex((v) => Math.min(allDates.length - 1, v + 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setFocusChain((v) => Math.max(0, v - 1)); }
    if (event.key === "ArrowDown") { event.preventDefault(); setFocusChain((v) => Math.min(snapshots.length - 1, v + 1)); }
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(); }
  };
  const pointerMove = (clientX: number) => {
    const box = root.current?.getBoundingClientRect(); if (!box) return;
    moveToFraction(Math.max(0, Math.min(1, (clientX - box.left) / box.width)));
  };

  return (
    <div className="ua5-timeline" ref={root} tabIndex={0} onKeyDown={onKeyDown} onPointerMove={(e) => { if (e.pointerType === "mouse" || e.buttons === 1) pointerMove(e.clientX); }} aria-label="Historical regime explorer. Use arrow keys to move date and chain, Enter to select.">
      <div className="ua5-timeline-date">{prettyDate(cursorDate)}</div>
      <div className="ua5-timeline-cursor" style={{ left: `${allDates.length <= 1 ? 100 : (cursorIndex / (allDates.length - 1)) * 100}%` }} aria-hidden="true" />
      {snapshots.map((chain, chainIndex) => {
        const points = histories[chain.id] ?? [];
        return <button key={chain.id} type="button" className={`ua5-lane ${chainIndex === focusChain ? "is-focused" : ""}`} onClick={() => { setFocusChain(chainIndex); choose(chainIndex); }}>
          <span className="ua5-lane-name">{chain.ticker}</span>
          <span className="ua5-lane-track">{points.map((point) => <i key={point.date} className={`ua5-segment ua5-segment-${point.regime === "UNKNOWN/DEGRADED" ? "unknown" : point.regime.toLowerCase()}`} title={`${point.date}: ${point.regime}`} />)}</span>
        </button>;
      })}
      <p className="ua5-timeline-help">Scrub date · ↑↓ chain · Enter selects observation</p>
    </div>
  );
}

export default function EditorialReferenceInstrument({ snapshots, histories, lastRun, examples, heroSnapshot }: Props) {
  const defaultChain = snapshots.find((c) => c.id === "bitcoin") ?? snapshots[0];
  const defaultSelected = { chain: defaultChain?.id ?? "bitcoin", date: defaultChain?.dateIso ?? "" };
  const [selected, setSelected] = useState<SelectedObservation>(defaultSelected);
  const [contextAdded, setContextAdded] = useState(false);
  const [artifact, setArtifact] = useState<Artifact>("Meta");
  const [artifactPayload, setArtifactPayload] = useState<unknown>(defaultChain?.artifacts.Meta ?? null);
  const [confidenceMode, setConfidenceMode] = useState<"high" | "low">("high");
  const [integration, setIntegration] = useState<"sql" | "python" | "api">("sql");
  const [openDriver, setOpenDriver] = useState<number | null>(null);

  const selectedChain = snapshots.find((c) => c.id === selected.chain) ?? defaultChain;
  const selectedPoint = (histories[selected.chain] ?? []).find((p) => p.date === selected.date) ?? (selectedChain ? {
    chain: selectedChain.id, date: selectedChain.dateIso, regime: selectedChain.regime, confidence: selectedChain.confidenceValue,
    dataQuality: selectedChain.dataQuality, labelConfidence: selectedChain.labelConfidence, oneLiner: selectedChain.oneLiner,
    demand: selectedChain.demand, friction: selectedChain.friction, capacity: selectedChain.capacity,
  } : null);
  const confidenceExample = confidenceMode === "high" ? examples.high : examples.low;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chain = params.get("chain"); const date = params.get("date");
    if (chain && date && snapshots.some((c) => c.id === chain) && (histories[chain] ?? []).some((p) => p.date === date)) {
      queueMicrotask(() => setSelected({ chain, date }));
    }
    const pop = () => { const p = new URLSearchParams(window.location.search); const c = p.get("chain"); const d = p.get("date"); if (c && d && snapshots.some((s) => s.id === c)) setSelected({ chain: c, date: d }); };
    window.addEventListener("popstate", pop); return () => window.removeEventListener("popstate", pop);
  }, [histories, snapshots]);

  const selectObservation = (value: SelectedObservation) => {
    setSelected(value);
    const url = new URL(window.location.href); url.searchParams.set("chain", value.chain); url.searchParams.set("date", value.date); window.history.pushState({}, "", url);
  };

  useEffect(() => {
    if (!selectedChain || !selected.date) return;
    const latest = selected.date === selectedChain.dateIso ? selectedChain.artifacts[artifact] : null;
    if (latest) {
      queueMicrotask(() => setArtifactPayload(latest));
      return;
    }
    let cancelled = false;
    fetch(artifactUrl(artifact, selected.chain, selected.date)).then((r) => r.ok ? r.json() : null).then((payload) => { if (!cancelled) setArtifactPayload(payload); }).catch(() => { if (!cancelled) setArtifactPayload(null); });
    return () => { cancelled = true; };
  }, [artifact, selected, selectedChain]);

  if (!selectedChain || !selectedPoint) return null;
  const observationNumber = heroSnapshot?.consecutiveRows ?? null;
  const drivers = Array.isArray((artifactPayload as { regime?: { drivers?: unknown[] } } | null)?.regime?.drivers) ? ((artifactPayload as { regime?: { drivers?: unknown[] } }).regime?.drivers ?? []) : [];
  const sampleRows = [
    { date: "14 Aug", error: "2.1%", regime: "STABLE", confidence: "88%" },
    { date: "15 Aug", error: "2.0%", regime: "STABLE", confidence: "91%" },
    { date: "16 Aug", error: "4.3%", regime: "CHEAP", confidence: "92%" },
  ];
  const integrationCode = {
    sql: "SELECT m.*, u.regime, u.confidence\nFROM model_results m\nLEFT JOIN urd_atlas_daily u\n  ON m.date = u.date\n AND m.chain = u.chain;",
    python: "joined = model_results.merge(\n    urd_atlas[[\"date\", \"chain\", \"regime\", \"confidence\"]],\n    on=[\"date\", \"chain\"], how=\"left\"\n)",
    api: "GET /v1/meta/bitcoin/2026-08-16\n\n# Join response fields on date + chain",
  };

  return <main className="ua5">
    <section className="ua5-zone ua5-dark ua5-hero" aria-labelledby="ua5-title">
      <div className="ua5-shell ua5-hero-grid"><div className="ua5-hero-copy"><p className="ua5-kicker">§01 / LIVE OBSERVATION</p><h1 id="ua5-title">Know whether Tuesday was you — or the network.</h1><p className="ua5-lead">Daily blockchain regime reference data for Bitcoin, Ethereum, Arbitrum and Base. Join one observation per chain and date to the data you already use.</p><a className="ua5-primary" href="/api/v1/sample-pack" download>Inspect the sample pack</a></div><div><ObservationReadout chain={selectedChain} point={selectedPoint} /><div className="ua5-chain-switch" aria-label="Select blockchain">{snapshots.map((chain) => <button key={chain.id} type="button" aria-pressed={selected.chain === chain.id} onClick={() => selectObservation({ chain: chain.id, date: chain.dateIso })}>{chain.ticker}</button>)}</div></div></div>
    </section>

    <section className="ua5-zone ua5-dark ua5-context" aria-labelledby="ua5-context-title"><div className="ua5-shell ua5-context-grid"><header><p className="ua5-kicker">§02 / WHY IT MATTERS</p><h2 id="ua5-context-title">Your metric changed. What else changed that day?</h2></header><div className="ua5-context-demo"><table><thead><tr><th>Date</th><th>Model error</th>{contextAdded && <><th>Network state</th><th>Confidence</th></>}</tr></thead><tbody>{sampleRows.map((row) => <tr key={row.date}><td>{row.date}</td><td>{row.error}</td>{contextAdded && <><td>{row.regime}</td><td>{row.confidence}</td></>}</tr>)}</tbody></table>{!contextAdded && <button type="button" className="ua5-secondary" onClick={() => setContextAdded(true)}>Add network context</button>}{contextAdded && <p className="ua5-context-conclusion">Your model changed on the same date the network entered a different operating regime.</p>}<small>Illustrative example — model_error is a synthetic metric standing in for your own data.</small></div></div></section>

    <section className="ua5-zone ua5-dark ua5-history" aria-labelledby="ua5-history-title"><div className="ua5-shell"><div className="ua5-section-head"><p className="ua5-kicker">§03 / HISTORICAL REGIME EXPLORER</p><h2 id="ua5-history-title">Four chains. One classification language.</h2><p>Move across actual published history, then select the observation you want to inspect.</p></div><Timeline key={`${selected.chain}:${selected.date}`} histories={histories} snapshots={snapshots} selected={selected} onSelect={selectObservation} /></div></section>

    <section className="ua5-zone ua5-dark ua5-anatomy" aria-labelledby="ua5-anatomy-title"><div className="ua5-shell ua5-anatomy-grid"><header><p className="ua5-kicker">§04 / OBSERVATION ANATOMY</p><h2 id="ua5-anatomy-title">Why did it classify this date this way?</h2></header><div className="ua5-anatomy-copy"><span className={statusClass(selectedPoint.regime)}>{selectedPoint.regime}</span><p>{selectedPoint.oneLiner}</p><div className="ua5-drivers">{drivers.slice(0, 4).map((driver, i) => <button key={i} type="button" onClick={() => setOpenDriver(openDriver === i ? null : i)}>Driver {String(i + 1).padStart(2, "0")}{openDriver === i && <small>{typeof driver === "string" ? driver : JSON.stringify(driver)}</small>}</button>)}</div></div><div className="ua5-rulers"><Axis label="Demand" value={selectedPoint.demand} /><Axis label="Friction" value={selectedPoint.friction} /><Axis label="Capacity" value={selectedPoint.capacity} /></div></div></section>

    <section className="ua5-zone ua5-dark ua5-confidence" aria-labelledby="ua5-confidence-title"><div className="ua5-shell ua5-confidence-shell"><p className="ua5-kicker">§05 / CONFIDENCE</p><h2 id="ua5-confidence-title">Confidence is evidence strength — not probability.</h2><div className="ua5-two-way"><button aria-pressed={confidenceMode === "high"} onClick={() => setConfidenceMode("high")}>High confidence</button><button aria-pressed={confidenceMode === "low"} onClick={() => setConfidenceMode("low")}>Degraded</button></div>{confidenceExample ? <div className="ua5-confidence-example"><div><span>{confidenceExample.chainLabel} · {prettyDate(confidenceExample.date)}</span><strong>{pct(confidenceExample.confidence)}</strong><span className={statusClass(confidenceExample.regime)}>{confidenceExample.regime}</span></div><p>{confidenceExample.oneLiner}</p><code>sqrt(data_quality × label_confidence)</code></div> : null}</div></section>

    <section className="ua5-zone ua5-dark ua5-artifacts" aria-labelledby="ua5-artifacts-title"><div className="ua5-shell"><div className="ua5-section-head"><p className="ua5-kicker">§06 / ARTIFACT EXPLORER</p><h2 id="ua5-artifacts-title">The same observation, four representations.</h2></div><div className="ua5-artifact-layout"><nav aria-label="Artifact representation">{(Object.keys(artifactMeta) as Artifact[]).map((name) => <button key={name} aria-pressed={artifact === name} onClick={() => setArtifact(name)}><span>{artifactMeta[name].file}</span><small>{artifactMeta[name].line}</small></button>)}</nav><div className="ua5-code"><div className="ua5-code-head"><span>{selected.chain}/{selected.date}/{artifactMeta[artifact].file}</span><span>same date + chain</span></div><pre><code>{compact(artifactPayload)}</code></pre></div></div></div></section>

    <section className="ua5-zone ua5-paper ua5-trust" aria-labelledby="ua5-trust-title"><div className="ua5-shell"><p className="ua5-kicker">§07 / PROVENANCE</p><h2 id="ua5-trust-title">Built to be referenced, not silently revised.</h2><div className="ua5-trust-ledger"><div className="ua5-trust-primary"><strong>{observationNumber ?? "—"}</strong><span>consecutive published Bitcoin days</span><small>from {heroSnapshot?.firstPublishedLabel ?? "1 Dec 2024"}</small></div><dl><div><dt>Coverage</dt><dd>4 chains</dd></div><div><dt>Methodology</dt><dd>{heroSnapshot?.methodologyVersionLabel ?? selectedChain.methodologyVersion}</dd></div><div><dt>Publication rule</dt><dd>Published observations are never silently rewritten.</dd></div></dl></div></div></section>

    <section className="ua5-zone ua5-paper ua5-build" aria-labelledby="ua5-build-title"><div className="ua5-shell"><p className="ua5-kicker">§08 / BUILD VS BUY</p><h2 id="ua5-build-title">What are you paying not to maintain?</h2><div className="ua5-build-compare"><div><h3>What you&apos;d maintain</h3>{buildSteps.map((step) => <span key={step}>{step}</span>)}</div><div className="ua5-get"><h3>What you get</h3><p>One versioned daily reference layer.</p><strong>$49/month</strong><small>Basic · one chain</small></div></div></div></section>

    <section className="ua5-zone ua5-dark ua5-integration" aria-labelledby="ua5-integration-title"><div className="ua5-shell"><p className="ua5-kicker">§09 / INTEGRATION</p><h2 id="ua5-integration-title">A regime column for the data you already have.</h2><div className="ua5-code-tabs">{(["sql", "python", "api"] as const).map((name) => <button key={name} aria-pressed={integration === name} onClick={() => setIntegration(name)}>{name.toUpperCase()}</button>)}</div><div className="ua5-integration-grid"><pre><code>{integrationCode[integration]}</code></pre><div className="ua5-before-after"><table><caption>Before</caption><tbody><tr><th>date</th><th>chain</th><th>model_error</th></tr><tr><td>2026-08-16</td><td>bitcoin</td><td>4.3%</td></tr></tbody></table><table><caption>After</caption><tbody><tr><th>date</th><th>chain</th><th>model_error</th><th>regime</th><th>confidence</th></tr><tr><td>2026-08-16</td><td>bitcoin</td><td>4.3%</td><td>CHEAP</td><td>0.92</td></tr></tbody></table></div></div><small className="ua5-fixture-note">Illustrative example — model_error is synthetic. Urd Atlas fields demonstrate the date + chain join.</small></div></section>

    <section className="ua5-zone ua5-paper ua5-sample" aria-labelledby="ua5-sample-title"><div className="ua5-shell ua5-sample-grid"><header><p className="ua5-kicker">§10 / SAMPLE PACK</p><h2 id="ua5-sample-title">Inspect the files before you pay.</h2><p>The download contains representative published artifacts and a quickstart so you can test the integration path first.</p><a className="ua5-primary ua5-primary-paper" href="/api/v1/sample-pack" download>Download sample pack</a></header><pre className="ua5-filetree"><code>urd-atlas-sample/\n├── bitcoin/\n│   ├── meta/\n│   ├── gold/\n│   └── derived/\n├── ethereum/\n├── quickstart.py\n└── FIELD_GUIDE.md</code></pre></div></section>

    <section className="ua5-zone ua5-paper ua5-pricing" id="pricing" aria-labelledby="ua5-pricing-title"><div className="ua5-shell"><p className="ua5-kicker">§11 / ACCESS</p><h2 id="ua5-pricing-title">Choose the amount of history and chain coverage you need.</h2><div className="ua5-price-ledger"><div className="ua5-price-head"><span>Plan</span><span>Price</span><span>Coverage</span><span>History</span></div><div><strong>Free</strong><span>$0</span><span>Sample files</span><span>For inspecting the format before you decide.</span></div><div><strong>Basic</strong><span>$49/mo</span><span>1 selected chain</span><span>90 days · for one-chain operational use.</span></div><div><strong>Pro</strong><span>$149/mo</span><span>All 4 chains</span><span>Full published history · for cross-chain analysis.</span></div></div><p className="ua5-pricing-note">Sample: enough to test the join. Subscriptions provide operating history for actual use.</p></div></section>

    <section className="ua5-zone ua5-paper ua5-subscribe" aria-labelledby="ua5-subscribe-title"><div className="ua5-shell ua5-subscribe-inner"><ObservationReadout chain={selectedChain} point={selectedPoint} compactMode /><h2 id="ua5-subscribe-title">Add the next observation to your data.</h2><div className="ua5-subscribe-list"><div><span><b>Basic</b><small>one chain · $49/month</small></span><Checkout plan="basic">Start Basic</Checkout></div><div><span><b>Pro</b><small>all four chains · $149/month</small></span><Checkout plan="pro">Start Pro</Checkout></div></div><Link href="/api/v1/sample-pack" className="ua5-not-ready">Not ready? Inspect the sample.</Link></div></section>
    <p className="ua5-run">Last pipeline publication: {lastRun}</p>
  </main>;
}
