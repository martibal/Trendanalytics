"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

const regimeCopy: Record<HomeLabel, { short: string; detail: string }> = {
  STABLE: {
    short: "Conditions are near the chain’s recent normal",
    detail: "conditions sit broadly inside the operating range that has been normal for this chain in its own recent history",
  },
  HEATING: {
    short: "Activity and operating pressure are building",
    detail: "activity or operating pressure is building relative to this chain’s own recent history",
  },
  CONGESTED: {
    short: "Fee and capacity pressure are elevated",
    detail: "friction and capacity evidence point to elevated network pressure relative to this chain’s own recent history",
  },
  CHEAP: {
    short: "Transaction friction is low",
    detail: "transaction friction is low relative to this chain’s own recent history",
  },
  "UNKNOWN/DEGRADED": {
    short: "Evidence is too weak for a reliable state",
    detail: "the available evidence is too weak to support one of the normal published states with enough confidence",
  },
};

function evidenceLabel(value: number | null) {
  if (value == null) return "Evidence unavailable";
  if (value >= 0.75) return "Strong evidence";
  if (value >= 0.45) return "Moderate evidence";
  return "Limited evidence";
}

function shortDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

function recentContext(rows: HistoryRow[], chain: HomeChainSnapshot) {
  const last = rows.slice(-7);
  if (!last.length) {
    return `The current ${chain.regime} observation is the latest published state available for ${chain.name}.`;
  }
  const first = last[0];
  const latest = last[last.length - 1];
  const latestCount = last.filter((row) => row.label === latest.label).length;
  if (last.every((row) => row.label === latest.label)) {
    return `${chain.name} has remained ${latest.label} across the last ${last.length} published observations. The latest reading continues that recent regime.`;
  }
  return `Across the last ${last.length} published observations, ${chain.name} moved from ${first.label} on ${shortDate(first.date)} to ${latest.label} on ${shortDate(latest.date)}. ${latest.label} appeared on ${latestCount} of those ${last.length} dates.`;
}

function confidenceCopy(chain: HomeChainSnapshot) {
  if (chain.confidenceValue == null) return "No confidence score is available for this published observation.";
  return `${chain.confidence} confidence reflects ${evidenceLabel(chain.confidenceValue).toLowerCase()} support in the available data for this published state.`;
}

function sentenceCase(value: string) {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

function displayScore(value: number | null) {
  return value == null ? "—" : value.toFixed(1);
}

function axisReading(axis: "Demand" | "Friction" | "Capacity", value: number | null, chain: HomeChainSnapshot) {
  if (value == null) {
    return `No display score is available for ${axis.toLowerCase()} in this ${chain.name} observation.`;
  }
  const position = value >= 65 ? "above" : value <= 35 ? "below" : "near";
  if (axis === "Demand") {
    return `The display score sits ${position} the neutral midpoint of 50 for ${chain.name}. Higher values describe hotter usage relative to the chain’s own history.`;
  }
  if (axis === "Friction") {
    return `The display score sits ${position} the neutral midpoint of 50 for ${chain.name}. Higher values describe greater cost or transaction-failure pressure in the smoothed scorecard.`;
  }
  return `The display score sits ${position} the neutral midpoint of 50 for ${chain.name}. Higher values describe tighter capacity pressure in the smoothed scorecard.`;
}

export default function InteractiveHomeDashboard({ snapshots }: Props) {
  const [history, setHistory] = useState<Record<string, HistoryRow[]>>({});
  const [openState, setOpenState] = useState<string | null>(null);
  const [selectedChainId, setSelectedChainId] = useState(snapshots[0]?.id ?? "bitcoin");

  useEffect(() => {
    let alive = true;
    fetch("/api/v1/home-history", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<HistoryResponse> : Promise.reject())
      .then((payload) => {
        if (alive && payload.chains) setHistory(payload.chains);
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const latestRows = useMemo(
    () => snapshots.map((chain) => ({ chain, recent: history[chain.id] ?? [] })),
    [snapshots, history],
  );

  const selectedChain = snapshots.find((chain) => chain.id === selectedChainId) ?? snapshots[0];
  const metaChain = snapshots[0];

  if (!selectedChain || !metaChain) return null;

  return (
    <main className="ua6">
      <header className="ua6-site-nav">
        <div className="ua6-shell">
          <Link className="ua6-brand" href="/">URD ATLAS</Link>
          <nav className="ua6-nav-links" aria-label="Primary">
            <a href="#ua6-data">Data</a>
            <Link href="/methodology/reference">Methodology</Link>
            <Link href="/plans">Pricing</Link>
            <a href="/api/v1/sample-pack" download>Inspect sample</a>
          </nav>
        </div>
      </header>

      <section className="ua6-hero">
        <div className="ua6-shell ua6-hero-grid">
          <div className="ua6-hero-copy">
            <h1>Urd Atlas</h1>
            <p>Urd Atlas publishes the daily network state of Bitcoin, Ethereum, Arbitrum and Base as one row you join to your own data by date and chain.</p>
            <p className="ua6-hero-sub">Each chain is evaluated against its own recent history. The published state carries the evidence strength and provenance needed to trace the classification later.</p>
            <div className="ua6-hero-actions">
              <a href="/api/v1/sample-pack" download>Inspect free sample</a>
              <a href="#ua6-data">See the published structure</a>
            </div>
          </div>

          <div className="ua6-status-stack" aria-label="Latest published network states">
            {latestRows.map(({ chain, recent }) => {
              const open = openState === chain.id;
              return (
                <div className="ua6-status-unit" key={chain.id}>
                  <button
                    type="button"
                    className="ua6-status-button"
                    aria-expanded={open}
                    onClick={() => {
                      setSelectedChainId(chain.id);
                      setOpenState(open ? null : chain.id);
                    }}
                  >
                    <span className="ua6-status-chain">{chain.ticker}</span>
                    <span className="ua6-status-main">
                      <b>{chain.regime}</b>
                      <small>{regimeCopy[chain.regime].short}</small>
                    </span>
                    <span className="ua6-status-meta">
                      <b>{evidenceLabel(chain.confidenceValue)}</b>
                      <small>{chain.confidence} · {chain.asOf}</small>
                    </span>
                    <span className="ua6-status-plus" aria-hidden="true">+</span>
                  </button>
                  {open ? (
                    <div className="ua6-status-detail">
                      <p>
                        {chain.name} is currently <strong>{chain.regime}</strong>. {sentenceCase(regimeCopy[chain.regime].detail)}. {recentContext(recent, chain)} {confidenceCopy(chain)} {chain.lag} publication.
                      </p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="ua6-join" id="ua6-data">
        <div className="ua6-shell ua6-join-grid">
          <div className="ua6-join-copy">
            <h2>Read your own metric beside the network state from the same day</h2>
            <p>When a model error, failed-transaction rate, user metric or research series moves, the Urd Atlas row gives that observation a dated record of what the chain was doing at the same time, so the network&apos;s conditions are right there in the same table.</p>
          </div>
          <div className="ua6-specimen">
            <div className="ua6-specimen-head"><span>Example join</span><span>DATE + CHAIN</span></div>
            <div className="ua6-data-table" role="table" aria-label="Illustrative join example">
              <div className="ua6-data-row ua6-data-head" role="row"><span>Date</span><span>Your metric</span><span>Network state</span><span>Evidence</span></div>
              <div className="ua6-data-row" role="row"><span>18 Aug</span><span>2.1%</span><span>STABLE</span><span>Strong</span></div>
              <div className="ua6-data-row" role="row"><span>19 Aug</span><span>2.2%</span><span>HEATING</span><span>Strong</span></div>
              <div className="ua6-data-row" role="row"><span>20 Aug</span><span className="ua6-emph">4.3%</span><span className="ua6-emph">CONGESTED</span><span>Strong</span></div>
            </div>
            <p className="ua6-reading">If a model error doubles on 20 Aug during a move into CONGESTED, the chain itself belongs in the investigation. The same error during an ordinary STABLE day would point the first review toward the model, application or data feed.</p>
          </div>
        </div>
      </section>

      <section className="ua6-meta">
        <div className="ua6-shell">
          <div className="ua6-meta-head">
            <h2>The daily Meta row is the part most workflows use</h2>
            <p>The published classification stays compact enough to join directly to a table. Every field needed to audit it later stays attached to the same row.</p>
          </div>
          <div className="ua6-meta-layout">
            <div className="ua6-meta-record" aria-label={`Latest ${metaChain.name} Meta observation`}>
              <div className="ua6-meta-line"><span>chain</span><b>{metaChain.id}</b><small>{metaChain.asOf}</small></div>
              <div className="ua6-meta-line"><span>regime</span><b>{metaChain.regime}</b><small>{regimeCopy[metaChain.regime].short.toLowerCase()}</small></div>
              <div className="ua6-meta-line"><span>confidence</span><b>{metaChain.confidenceValue == null ? "—" : metaChain.confidenceValue.toFixed(3)}</b><small>{evidenceLabel(metaChain.confidenceValue).toLowerCase()}</small></div>
              <div className="ua6-meta-line"><span>demand</span><b>{displayScore(metaChain.demand)}</b><small>{metaChain.demandLabel.toLowerCase()}</small></div>
              <div className="ua6-meta-line"><span>friction</span><b>{displayScore(metaChain.friction)}</b><small>{metaChain.frictionLabel.toLowerCase()}</small></div>
              <div className="ua6-meta-line"><span>capacity</span><b>{displayScore(metaChain.capacity)}</b><small>{metaChain.capacityLabel.toLowerCase()}</small></div>
              <div className="ua6-meta-line"><span>methodology</span><b>{metaChain.methodologyVersion}</b><small>deterministic publication</small></div>
            </div>
            <div className="ua6-layers">
              <div className="ua6-layer"><b>Gold</b><p>The normalized daily measurements that form the analytical base for each supported chain.</p></div>
              <div className="ua6-layer"><b>Derived</b><p>The rolling history used to judge how unusual the latest observation is for that chain.</p></div>
              <div className="ua6-layer"><b>Brief</b><p>A readable account generated from the same published state when the full analytical payload is unnecessary.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="ua6-classification" id="ua6-method">
        <div className="ua6-shell ua6-class-grid">
          <h2>How the latest {selectedChain.name} state is assembled</h2>
          <div className="ua6-class-copy">
            <p>The latest {selectedChain.name} observation is <strong>{selectedChain.regime}</strong> for {selectedChain.asOf}. {sentenceCase(regimeCopy[selectedChain.regime].detail)}. {confidenceCopy(selectedChain)}</p>
            <div className="ua6-axis-lines">
              <div className="ua6-axis-line"><b>Demand</b><strong>{displayScore(selectedChain.demand)}</strong><span>{axisReading("Demand", selectedChain.demand, selectedChain)}</span></div>
              <div className="ua6-axis-line"><b>Friction</b><strong>{displayScore(selectedChain.friction)}</strong><span>{axisReading("Friction", selectedChain.friction, selectedChain)}</span></div>
              <div className="ua6-axis-line"><b>Capacity</b><strong>{displayScore(selectedChain.capacity)}</strong><span>{axisReading("Capacity", selectedChain.capacity, selectedChain)}</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="ua6-access" id="ua6-access">
        <div className="ua6-shell ua6-access-row">
          <div>
            <h2>Test the sample against data you already understand before adding recurring delivery.</h2>
            <p>Single Chain is $49 a month and Research is $149 a month. The public sample lets you check the schema and the date + chain join first.</p>
          </div>
          <div className="ua6-access-links">
            <a href="/api/v1/sample-pack" download>Inspect sample</a>
            <Link href="/validation">Validation</Link>
            <Link href="/methodology/reference">Methodology</Link>
            <Link href="/api-docs">API docs</Link>
            <Link href="/plans">Pricing</Link>
          </div>
        </div>
      </section>

      <footer className="ua6-footer">
        <span>URD ATLAS · ON-CHAIN REFERENCE DATA</span>
        <span>BTC · ETH · ARB · BASE</span>
      </footer>
    </main>
  );
}
