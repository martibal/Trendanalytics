"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { HeroPanelSnapshot } from "./HeroNetworkStatePanel";
import HomeJsonFiles from "./HomeJsonFiles";
import { homeAxisNarrative } from "./homeAxisEvidence";

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
    short: "No stronger regime cleared the publication rules",
    detail: "the current axis evidence did not meet the profile-specific corroboration required for HEATING, CONGESTED or CHEAP",
  },
  HEATING: {
    short: "The profile-specific HEATING rule is met",
    detail: "the current axis evidence meets the profile-specific HEATING rule relative to this chain’s recent history",
  },
  CONGESTED: {
    short: "The profile-specific CONGESTED rule is met",
    detail: "the current friction and/or capacity evidence meets the profile-specific CONGESTED rule relative to this chain’s recent history",
  },
  CHEAP: {
    short: "The profile-specific CHEAP rule is met",
    detail: "the current low-friction evidence meets the profile-specific CHEAP rule relative to this chain’s recent history",
  },
  "UNKNOWN/DEGRADED": {
    short: "Evidence did not clear the publication gate",
    detail: "the available evidence did not support publishing one of the stronger named states",
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

function evidenceScoreCopy(chain: HomeChainSnapshot) {
  if (chain.confidenceValue == null) return "No Evidence score is available for this published observation.";
  return `The ${chain.confidence} Evidence score reflects ${evidenceLabel(chain.confidenceValue).toLowerCase()} support from data quality and label-specific evidence. It is an uncalibrated evidence-strength quantity, not the probability that the label is correct.`;
}

function sentenceCase(value: string) {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

function displayScore(value: number | null) {
  return value == null ? "—" : value.toFixed(1);
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
  if (!selectedChain) return null;

  return (
    <main className="ua6">
      <header className="ua6-site-nav">
        <div className="ua6-shell">
          <Link className="ua6-brand" href="/">URD ATLAS</Link>
          <nav className="ua6-nav-links" aria-label="Primary">
            <a href="#ua6-data">Data</a>
            <Link href="/validation">Validation</Link>
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
            <p>Urd Atlas publishes a deterministic daily network-state row for Bitcoin, Ethereum, Arbitrum and Base that you join to your own data by date and chain.</p>
            <p className="ua6-hero-sub">Each chain is evaluated against its own recent history. Stronger labels require corroborating demand, friction and capacity evidence; weak or non-informative evidence is withheld rather than forced into a dramatic state. Every row carries its Evidence score, methodology version and provenance.</p>
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
                      <small>Evidence {chain.confidence} · {chain.asOf}</small>
                    </span>
                    <span className="ua6-status-plus" aria-hidden="true">+</span>
                  </button>
                  {open ? (
                    <div className="ua6-status-detail">
                      <p>{chain.name} is currently <strong>{chain.regime}</strong>. {sentenceCase(regimeCopy[chain.regime].detail)}. {recentContext(recent, chain)} {evidenceScoreCopy(chain)} {chain.lag} publication.</p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <HomeJsonFiles chain={selectedChain.name} date={selectedChain.asOf} artifacts={selectedChain.artifacts} />

      <section className="ua6-classification" id="ua6-method">
        <div className="ua6-shell ua6-class-grid">
          <h2>How the latest {selectedChain.name} state is assembled</h2>
          <div className="ua6-class-copy">
            <p>The latest {selectedChain.name} observation is <strong>{selectedChain.regime}</strong> for {selectedChain.asOf}. {sentenceCase(regimeCopy[selectedChain.regime].detail)}. {evidenceScoreCopy(selectedChain)}</p>
            <div className="ua6-axis-lines">
              <div className="ua6-axis-line"><b>Demand</b><strong>{displayScore(selectedChain.demand)}</strong><span>{homeAxisNarrative(selectedChain.artifacts.Meta, "demand", selectedChain.demand)}</span></div>
              <div className="ua6-axis-line"><b>Friction</b><strong>{displayScore(selectedChain.friction)}</strong><span>{homeAxisNarrative(selectedChain.artifacts.Meta, "friction", selectedChain.friction)}</span></div>
              <div className="ua6-axis-line"><b>Capacity</b><strong>{displayScore(selectedChain.capacity)}</strong><span>{homeAxisNarrative(selectedChain.artifacts.Meta, "capacity", selectedChain.capacity)}</span></div>
            </div>
            <p><strong>How to read the rows:</strong> classifier bands and trend are the regime evidence. The numeric score beside each axis is a smoothed scorecard display value and can sit closer to neutral 50 without contradicting a HIGH/LOW classifier band.</p>
            <p><strong>Publication guardrail:</strong> HEATING, CONGESTED and CHEAP require their profile-specific corroborating axis evidence. Constant, near-constant or insufficient historical distributions cannot manufacture HIGH/LOW axis bands, and low evidence is published as UNKNOWN/DEGRADED rather than overstated.</p>
          </div>
        </div>
      </section>

      <section className="ua6-access" id="ua6-access">
        <div className="ua6-shell ua6-access-row">
          <div>
            <h2>Test the sample against data you already understand before adding recurring delivery.</h2>
            <p>Basic is $49 a month for one chain and Pro is $149 a month for all four. The public sample lets you check the schema and the date + chain join first.</p>
            <p>Validation now covers threshold sensitivity, analog-distance robustness, longer-baseline context, raw-source selection and conservative publication gates. Separate scheduled checks cross-check BTC/ETH transaction counts against an external series and probe Arbitrum/Base source schemas for upstream drift. These controls test consistency and drift; they are not a claim of objective ground truth.</p>
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
