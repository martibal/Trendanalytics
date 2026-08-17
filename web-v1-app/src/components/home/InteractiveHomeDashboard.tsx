"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

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

const fileCopy: Record<Artifact, { label: string; purpose: string }> = {
  Meta: { label: "META / STATE ROW", purpose: "Regime, confidence, axes and provenance — the row joined on date + chain." },
  Gold: { label: "GOLD / EVIDENCE", purpose: "Daily chain measurements behind the published state." },
  Derived: { label: "DERIVED / CONTEXT", purpose: "Moving averages and normalized feature context." },
  Briefs: { label: "BRIEFS / READING", purpose: "Readable seven-day context generated from the same evidence." },
};

const regimeCopy: Record<Exclude<HomeLabel, "UNKNOWN/DEGRADED">, { x: number; y: number; line: string }> = {
  CHEAP: { x: 18, y: 18, line: "Low friction, without contradictory capacity pressure." },
  STABLE: { x: 35, y: 36, line: "No unusual network condition dominates the evidence." },
  HEATING: { x: 60, y: 62, line: "Activity is elevated and strengthening before pressure dominates." },
  CONGESTED: { x: 84, y: 82, line: "Material friction and capacity pressure dominate the observation." },
};

function numeric(value: number | null, fallback = 50) {
  if (value == null || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, value));
}

function pct(value: number | null) {
  return value == null || !Number.isFinite(value) ? "—" : `${Math.round(value * 100)}%`;
}

function rows(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-US").format(value)
    : "—";
}

function compactJson(value: JsonPayload) {
  const text = JSON.stringify(value ?? null, null, 2);
  return text.length > 1500 ? `${text.slice(0, 1500)}\n…` : text;
}

function statusColor(label: HomeLabel) {
  if (label === "STABLE") return "var(--mark-stable)";
  if (label === "HEATING") return "var(--mark-heating)";
  if (label === "CONGESTED") return "var(--mark-congested)";
  if (label === "CHEAP") return "var(--mark-cheap)";
  return "var(--ink-on-paper-dim)";
}

function chainStyle(chain: HomeChainSnapshot): CSSProperties {
  const score = chain.confidenceValue == null ? 0.4 : Math.max(0.2, chain.confidenceValue);
  return {
    "--ua4-grow": Math.max(0.18, score * score).toFixed(3),
    "--ua4-status": statusColor(chain.regime),
  } as CSSProperties;
}

function AxisPoint({ label, value, lane }: { label: string; value: number | null; lane: number }) {
  const position = numeric(value);
  return (
    <span
      className={`ua4-axis-point ua4-axis-point-${lane}`}
      style={{ left: `${position}%` }}
      aria-label={`${label}: ${value == null ? "not available" : value.toFixed(1)}`}
    >
      <i aria-hidden="true" />
      <b>{label}</b>
      <em>{value == null ? "—" : value.toFixed(1)}</em>
    </span>
  );
}

function Checkout({ plan, children }: { plan: "basic" | "pro"; children: string }) {
  return (
    <form action={`/api/v1/checkout?plan=${plan}`} method="post">
      <button className="ua4-table-action" type="submit">{children}</button>
    </form>
  );
}

function Rift() {
  return (
    <svg className="ua4-rift" viewBox="0 0 1000 8000" preserveAspectRatio="none" aria-hidden="true">
      <path d="M812 0 L808 260 L826 420 L792 610 L818 820 L785 1010 L801 1220 L774 1435 L799 1640 L760 1870 L792 2080 L748 2310 L775 2520 L733 2760 L759 2965 L716 3200 L744 3420 L701 3660 L728 3860 L686 4100 L719 4310 L674 4550 L708 4760 L661 5000 L696 5225 L650 5460 L682 5690 L636 5920 L669 6150 L623 6390 L657 6610 L611 6850 L648 7090 L603 7320 L640 7560 L596 7800 L610 8000" />
    </svg>
  );
}

export default function InteractiveHomeDashboard({ snapshots, lastRun, examples, heroSnapshot }: Props) {
  const [selectedChainId, setSelectedChainId] = useState(snapshots[0]?.id ?? "bitcoin");
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact>("Meta");
  const [exampleKind, setExampleKind] = useState<"high" | "low">("high");
  const [jsonOpen, setJsonOpen] = useState(false);

  const selectedChain = snapshots.find((chain) => chain.id === selectedChainId) ?? snapshots[0];
  const selectedExample = exampleKind === "high" ? examples.high : examples.low;
  const jsonPayload = useMemo(() => {
    if (!selectedChain) return null;
    if (selectedArtifact === "Meta" && selectedExample) return selectedExample.fullPayload;
    return selectedChain.artifacts[selectedArtifact];
  }, [selectedArtifact, selectedChain, selectedExample]);

  if (!selectedChain) return null;

  const observationNumber = rows(heroSnapshot?.consecutiveRows);
  const methodology = heroSnapshot?.methodologyVersionLabel ?? selectedChain.methodologyVersion ?? "—";
  const firstPublished = heroSnapshot?.firstPublishedLabel ?? "1 Dec 2024";

  return (
    <main className="ua4">
      <Rift />

      <section className="ua4-section ua4-ground ua4-hero" data-testid="ua4-hero" aria-labelledby="ua4-hero-title">
        <span className="ua4-ref">§01</span>
        <div className="ua4-hero-copy">
          <p className="ua4-micro">OBSERVATION LOG · ENTRY {observationNumber}</p>
          <h1 id="ua4-hero-title">Know whether Tuesday was you — or the network.</h1>
          <p className="ua4-hero-line">Urd Atlas publishes one versioned daily observation per chain — regime, confidence, evidence — so you can separate a real network shift from ordinary noise.</p>
          <a className="ua4-primary" href="/api/v1/sample-pack" download>Inspect the sample pack</a>
          <p className="ua4-footnote">Bitcoin · Ethereum · Arbitrum · Base — no price data, no forecasts, no recommendations</p>
        </div>
      </section>

      <section className="ua4-section ua4-paper ua4-journal" aria-labelledby="ua4-value-title">
        <span className="ua4-ref">§02</span>
        <div className="ua4-journal-head">
          <p className="ua4-micro">THE PRACTICAL QUESTION</p>
          <h2 id="ua4-value-title">A daily chain-state row, joinable on date + chain.</h2>
        </div>
        <div className="ua4-journal-ledger">
          <article><span>01 / MODEL ERROR</span><div><h3>Your model&apos;s error rate doubled on Tuesday.</h3><p>Before changing the model, check whether the chain itself moved into a different operating state.</p></div></article>
          <article><span>02 / JOIN KEY</span><div><h3>Add the network context to that date.</h3><p>Join <code>regime</code> and <code>confidence_score</code> on date + chain. The classification layer arrives as data, not as another dashboard to interpret.</p></div></article>
          <article><span>03 / EVIDENCE</span><div><h3>Keep the explanation attached.</h3><p>Drivers, measurements and confidence travel with the row, so you can investigate the shift instead of guessing at it.</p></div></article>
        </div>
      </section>

      <section className="ua4-section ua4-ground ua4-dataset" aria-labelledby="ua4-dataset-title">
        <span className="ua4-ref">§03</span>
        <div className="ua4-dataset-heading"><p className="ua4-micro">PROOF / PUBLISHED DATASET</p><h2 id="ua4-dataset-title">Dataset at a glance.</h2></div>
        <div className="ua4-stair" aria-label="Dataset proof">
          <div className="ua4-stair-line" aria-hidden="true" />
          <article className="ua4-step ua4-step-a"><strong>{observationNumber}</strong><p>consecutive daily rows</p><span>Published since {firstPublished}, no gaps</span></article>
          <article className="ua4-step ua4-step-b"><strong>4</strong><p>chains covered</p><span>Bitcoin · Ethereum · Arbitrum · Base</span></article>
          <article className="ua4-step ua4-step-c"><strong>{methodology}</strong><p>methodology</p><span>Deterministic, versioned, never silently rewritten</span></article>
        </div>
      </section>

      <section className="ua4-section ua4-paper ua4-state" id="today-status" aria-labelledby="ua4-state-title">
        <span className="ua4-ref">§04</span>
        <div className="ua4-state-head">
          <div><p className="ua4-micro">LIVE PRODUCT / LAST RUN {lastRun}</p><h2 id="ua4-state-title">Today&apos;s published network state.</h2></div>
          <p>Width follows confidence. Select a chain to inspect the underlying observation.</p>
        </div>

        <div className="ua4-confidence-strip" role="group" aria-label="Confidence-weighted chain timeline" data-testid="ua4-state-strip">
          {snapshots.map((chain) => (
            <button
              key={chain.id}
              type="button"
              data-chain={chain.id}
              aria-pressed={chain.id === selectedChainId}
              className="ua4-chain-slice"
              style={chainStyle(chain)}
              onClick={() => setSelectedChainId(chain.id)}
            >
              <span className="ua4-chain-name">{chain.name}</span>
              <span className="ua4-chain-meta">{chain.asOf} · {chain.lag}</span>
              <span className="ua4-chain-status">{chain.regime}</span>
              <strong>{chain.confidence}</strong>
              <small>confidence</small>
            </button>
          ))}
        </div>

        <div className="ua4-observation">
          <div className="ua4-observation-copy">
            <p className="ua4-micro">{selectedChain.ticker} / SELECTED OBSERVATION</p>
            <h3>{selectedChain.name} · {selectedChain.regime}</h3>
            <p>{selectedChain.oneLiner}</p>
            <dl>
              <div><dt>Data quality</dt><dd>{pct(selectedChain.dataQuality)}</dd></div>
              <div><dt>Label confidence</dt><dd>{pct(selectedChain.labelConfidence)}</dd></div>
              <div><dt>Data lag</dt><dd>{selectedChain.lag}</dd></div>
            </dl>
          </div>
          <div className="ua4-axis" aria-label="Demand, friction and capacity on a shared zero to one hundred scale">
            <div className="ua4-axis-track" aria-hidden="true" />
            <AxisPoint label="Demand" value={selectedChain.demand} lane={1} />
            <AxisPoint label="Friction" value={selectedChain.friction} lane={2} />
            <AxisPoint label="Capacity" value={selectedChain.capacity} lane={3} />
            <div className="ua4-axis-ticks" aria-hidden="true"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
          </div>
        </div>
      </section>

      <section className="ua4-section ua4-ground ua4-files" aria-labelledby="ua4-files-title">
        <span className="ua4-ref">§05</span>
        <div className="ua4-files-head"><p className="ua4-micro">DELIVERED FILES</p><h2 id="ua4-files-title">Four layers, four different jobs.</h2><p>All share the same date + chain key.</p></div>
        <div className="ua4-files-scroll">
          <div className="ua4-files-stage" data-testid="ua4-files-stage">
            {(["Meta", "Gold", "Derived", "Briefs"] as Artifact[]).map((name) => (
              <button
                key={name}
                type="button"
                className={`ua4-file ua4-file-${name.toLowerCase()} ${selectedArtifact === name ? "ua4-file-active" : ""}`}
                aria-pressed={selectedArtifact === name}
                onClick={() => setSelectedArtifact(name)}
              >
                <span>{fileCopy[name].label}</span>
                <strong>{name}</strong>
                <p>{fileCopy[name].purpose}</p>
              </button>
            ))}
            <div className="ua4-json-preview">
              <div className="ua4-json-head">
                <span>{selectedArtifact} / {exampleKind.toUpperCase()} CONFIDENCE EXAMPLE</span>
                <div>
                  <button type="button" aria-pressed={exampleKind === "high"} onClick={() => setExampleKind("high")}>high</button>
                  <button type="button" aria-pressed={exampleKind === "low"} onClick={() => setExampleKind("low")}>low</button>
                </div>
              </div>
              <pre><code>{compactJson(jsonPayload)}</code></pre>
              <button className="ua4-json-open" type="button" aria-haspopup="dialog" onClick={() => setJsonOpen(true)}>View complete JSON →</button>
            </div>
          </div>
        </div>
      </section>

      <section className="ua4-section ua4-paper ua4-reading" aria-labelledby="ua4-reading-title">
        <span className="ua4-ref">§06</span>
        <div className="ua4-reading-head"><p className="ua4-micro">INTERPRETATION / TWO AXES</p><h2 id="ua4-reading-title">Read the regime as a position, not a badge.</h2></div>
        <div className="ua4-regime-plane" role="img" aria-label="Regime map with Friction on the horizontal axis and Capacity pressure on the vertical axis">
          <span className="ua4-y-title">CAPACITY PRESSURE ↑</span>
          <span className="ua4-x-title">FRICTION →</span>
          <span className="ua4-plane-x" aria-hidden="true" />
          <span className="ua4-plane-y" aria-hidden="true" />
          {(Object.entries(regimeCopy) as [Exclude<HomeLabel, "UNKNOWN/DEGRADED">, (typeof regimeCopy)[Exclude<HomeLabel, "UNKNOWN/DEGRADED">]][]).map(([label, item]) => (
            <div key={label} className={`ua4-regime-point ua4-regime-${label.toLowerCase()}`} style={{ left: `${item.x}%`, bottom: `${item.y}%` }}>
              <i aria-hidden="true" />
              <strong>{label}</strong>
              <p>{item.line}</p>
            </div>
          ))}
        </div>

        <div className="ua4-confidence-venn">
          <div className="ua4-circle ua4-circle-data"><span>DATA QUALITY</span></div>
          <div className="ua4-circle ua4-circle-label"><span>LABEL CONFIDENCE</span></div>
          <div className="ua4-overlap"><strong>COMBINED<br />CONFIDENCE</strong><small>sqrt(data quality × label confidence)</small></div>
          <p>Confidence measures evidence strength, not probability. Below 0.40, the stronger regime claim is withheld as UNKNOWN/DEGRADED.</p>
        </div>
        <Link className="ua4-text-link" href="/methodology/reference">Read the chain-specific methodology →</Link>
      </section>

      <section className="ua4-section ua4-ground ua4-build" aria-labelledby="ua4-build-title">
        <span className="ua4-ref">§07</span>
        <div className="ua4-build-head"><p className="ua4-micro">BUILD OR BUY</p><h2 id="ua4-build-title">The classification layer is the part you do not have to maintain.</h2></div>
        <div className="ua4-scale-illustration" role="img" aria-label="Balance scale comparing the work of building the classification layer with buying Urd Atlas">
          <svg viewBox="0 0 1000 520" aria-hidden="true">
            <line x1="500" y1="185" x2="500" y2="425" className="ua4-scale-post" />
            <path d="M450 430 L550 430 L500 340 Z" className="ua4-scale-base" />
            <line x1="180" y1="120" x2="820" y2="210" className="ua4-scale-beam" />
            <circle cx="500" cy="165" r="18" className="ua4-scale-pivot" />
            <line x1="180" y1="120" x2="180" y2="260" className="ua4-scale-rope" />
            <line x1="820" y1="210" x2="820" y2="330" className="ua4-scale-rope" />
            <path d="M65 262 Q180 315 295 262" className="ua4-scale-pan" />
            <path d="M705 332 Q820 385 935 332" className="ua4-scale-pan" />
          </svg>
          <div className="ua4-build-weights">
            <span>INGESTION + NORMALIZATION</span>
            <span>CHAIN-SPECIFIC METHODOLOGY</span>
            <span>VALIDATION + MAINTENANCE</span>
          </div>
          <div className="ua4-buy-weight"><span>FINISHED DAILY LAYER</span><strong>$49/mo</strong><small>Basic · one chain</small></div>
        </div>
        <p className="ua4-build-note">Build means sourcing four chains, normalizing schemas, maintaining historical baselines, confidence gates, classification rules and regression tests. Buy means joining the published row.</p>
      </section>

      <section className="ua4-section ua4-paper ua4-pricing" id="pricing" aria-labelledby="ua4-pricing-title">
        <span className="ua4-ref">§08</span>
        <div className="ua4-pricing-head"><p className="ua4-micro">ACCESS / DECISION TABLE</p><h2 id="ua4-pricing-title">Choose the amount of history and chain coverage you need.</h2></div>
        <div className="ua4-table-wrap">
          <table className="ua4-pricing-table" data-testid="ua4-pricing-table">
            <thead>
              <tr><th scope="col">Access</th><th scope="col">Free</th><th scope="col" className="ua4-basic-col">Basic</th><th scope="col">Pro</th></tr>
            </thead>
            <tbody>
              <tr><th scope="row">Price</th><td>$0</td><td className="ua4-basic-col">$49/mo</td><td>$149/mo</td></tr>
              <tr><th scope="row">Chain coverage</th><td>Sample pack</td><td className="ua4-basic-col">1 selected chain</td><td>All 4 chains</td></tr>
              <tr><th scope="row">History on subscribe</th><td>Curated examples</td><td className="ua4-basic-col">90 days</td><td>Full published history</td></tr>
              <tr><th scope="row">Daily authenticated delivery</th><td>—</td><td className="ua4-basic-col">Included</td><td>Included</td></tr>
              <tr className="ua4-action-row">
                <th scope="row">Start</th>
                <td><a className="ua4-table-action" href="/api/v1/sample-pack" download>Download sample</a></td>
                <td className="ua4-basic-col"><Checkout plan="basic">Start Basic</Checkout></td>
                <td><Checkout plan="pro">Start Pro</Checkout></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {jsonOpen ? (
        <div className="ua4-modal-backdrop" onClick={() => setJsonOpen(false)}>
          <div className="ua4-modal" role="dialog" aria-modal="true" aria-labelledby="ua4-json-title" onClick={(event) => event.stopPropagation()}>
            <header><div><p className="ua4-micro">COMPLETE PUBLISHED JSON</p><h2 id="ua4-json-title">{selectedArtifact} · {selectedChain.name}</h2></div><button type="button" onClick={() => setJsonOpen(false)}>Close</button></header>
            <pre><code>{JSON.stringify(jsonPayload ?? null, null, 2)}</code></pre>
          </div>
        </div>
      ) : null}
    </main>
  );
}
