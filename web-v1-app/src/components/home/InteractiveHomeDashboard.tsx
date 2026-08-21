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
    detail: "network conditions are broadly inside the operating range that has been normal for this chain in its own recent history",
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
    return `${chain.name} has remained ${latest.label} across the last ${last.length} published observations, so the latest reading continues the same recent regime.`;
  }

  return `Across the last ${last.length} published observations, ${chain.name} moved from ${first.label} on ${shortDate(first.date)} to ${latest.label} on ${shortDate(latest.date)}, with ${latest.label} appearing on ${latestCount} of those ${last.length} dates.`;
}

function confidenceCopy(chain: HomeChainSnapshot) {
  if (chain.confidenceValue == null) return "No confidence score is available for this published observation.";
  return `${chain.confidence} confidence describes the strength of the evidence supporting the published state, so it should be read as an evidence-quality measure rather than as a probability that the label is correct.`;
}

export default function InteractiveHomeDashboard({ snapshots, lastRun }: Props) {
  const [history, setHistory] = useState<Record<string, HistoryRow[]>>({});
  const [openState, setOpenState] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/v1/home-history", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<HistoryResponse> : Promise.reject())
      .then((payload) => {
        if (alive && payload.chains) setHistory(payload.chains);
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, []);

  const latestRows = useMemo(
    () => snapshots.map((chain) => ({ chain, recent: history[chain.id] ?? [] })),
    [snapshots, history],
  );

  return (
    <main className="ua6">
      <section className="ua6-hero">
        <div className="ua6-shell ua6-hero-grid">
          <div className="ua6-hero-copy">
            <h1>Urd Atlas</h1>
            <p>
              Urd Atlas records the daily network state of Bitcoin, Ethereum, Arbitrum and Base, so when
              something changes in your own data you can read that change alongside whether the chain itself
              was operating normally, building pressure, becoming congested or moving into unusually
              low-friction conditions.
            </p>
            <p className="ua6-hero-sub">
              Each classification is made against that chain’s own recent history and is published with the
              evidence strength behind it, which means the label can be used as a compact daily reference
              without hiding how firmly the data supports the result.
            </p>
            <div className="ua6-hero-actions">
              <a href="/api/v1/sample-pack" download>Inspect free sample</a>
              <a href="#ua6-data">See what you receive</a>
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
                    onClick={() => setOpenState(open ? null : chain.id)}
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
                        {chain.name} is currently <strong>{chain.regime}</strong> because {regimeCopy[chain.regime].detail}; {" "}
                        {recentContext(recent, chain)} {confidenceCopy(chain)} <span>{chain.lag} publication.</span>
                      </p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        <div className="ua6-photo-note">Landscape photograph · Unsplash source · cropped for layout</div>
      </section>

      <section className="ua6-join" id="ua6-data">
        <div className="ua6-shell ua6-join-layout">
          <div className="ua6-join-intro">
            <h2>How the network state sits beside the data you already use</h2>
            <p>
              When model error, support tickets, failed transactions or user activity changes, adding the
              network state for the same date gives you another piece of evidence to work with, because a
              movement that occurs during ordinary chain conditions deserves a different investigation from
              one that arrives while the underlying network is also changing.
            </p>
          </div>

          <div className="ua6-specimen">
            <div className="ua6-specimen-head">
              <span>Example join</span>
              <span>DATE + CHAIN</span>
            </div>
            <div className="ua6-table" role="table" aria-label="Example date and chain join">
              <div className="ua6-table-row ua6-table-head" role="row">
                <span>Date</span><span>Your metric</span><span>Network state</span><span>Evidence</span>
              </div>
              <div className="ua6-table-row" role="row">
                <span>18 Aug</span><span>2.1%</span><span>STABLE</span><span>Strong</span>
              </div>
              <div className="ua6-table-row" role="row">
                <span>19 Aug</span><span>2.2%</span><span>HEATING</span><span>Strong</span>
              </div>
              <div className="ua6-table-row" role="row">
                <span>20 Aug</span><span className="ua6-emph">4.3%</span><span className="ua6-emph">CONGESTED</span><span>Strong</span>
              </div>
            </div>
            <p className="ua6-reading">
              If a model error doubles on 20 Aug, the first place to look depends partly on what the chain
              was doing that day: a STABLE state points you back toward the model, the application or the
              data feed, while a simultaneous move into HEATING or CONGESTED gives you a reason to include
              the network itself in the investigation.
            </p>
          </div>
        </div>
      </section>

      <section className="ua6-provenance">
        <div className="ua6-shell">
          <div className="ua6-provenance-head">
            <h2>The daily state is the part you join, while the published layers behind it preserve the evidence.</h2>
            <p>
              For most analysis the Meta row is enough, because that is where the regime, evidence strength
              and drivers live, while Gold and Derived remain available whenever you need to inspect the
              normalized measurements and the historical context that produced the classification.
            </p>
          </div>

          <div className="ua6-layer-track">
            <div className="ua6-layer">
              <b>Meta</b>
              <span>The joinable daily state with regime, confidence, demand, friction, capacity, drivers, freshness and provenance.</span>
            </div>
            <div className="ua6-layer">
              <b>Gold</b>
              <span>The normalized daily chain measurements that provide the stable analytical base for each supported network.</span>
            </div>
            <div className="ua6-layer">
              <b>Derived</b>
              <span>The rolling 7-day, 30-day and related historical context used to decide what is unusual for that particular chain.</span>
            </div>
            <div className="ua6-layer">
              <b>Briefs</b>
              <span>A readable summary drawn from the same published evidence when the full analytical payload is unnecessary.</span>
            </div>
          </div>

          <div className="ua6-layer-notes">
            <p>
              Because the date, methodology version, freshness information and deterministic identity travel
              with every published row, an observation that ends up in a model-monitoring table, report or
              warehouse can still be traced months later to the method and evidence that produced it.
            </p>
            <p>
              BTC and ETH currently publish at T+1, while Arbitrum and Base use the 7-day L2 publication
              policy, so the intended use is descriptive analysis, reporting and monitoring rather than
              real-time instruction.
            </p>
          </div>
        </div>
      </section>

      <section className="ua6-regimes" id="ua6-method">
        <div className="ua6-shell ua6-regime-grid">
          <h2>What the state is describing</h2>
          <div>
            <p>
              The classification brings together demand for activity, friction around getting transactions
              through and pressure on available capacity, with every chain judged against its own recent
              history rather than against another network.
            </p>
            <div className="ua6-regime-lines">
              <div><b>STABLE</b><span>Conditions sit broadly inside the chain’s recent operating range.</span></div>
              <div><b>HEATING</b><span>Activity or operating pressure is building relative to recent conditions.</span></div>
              <div><b>CONGESTED</b><span>Friction and capacity evidence point to elevated network pressure.</span></div>
              <div><b>CHEAP</b><span>Transaction friction is unusually low for that chain.</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="ua6-access" id="ua6-access">
        <div className="ua6-shell ua6-access-row">
          <div>
            <h2>Test the sample against data you already understand before deciding whether you need recurring delivery.</h2>
            <p>
              Single Chain is $49 a month and Research is $149 a month, while the public sample is there so
              the schema and date + chain join can be checked first.
            </p>
            <small>Last successful pipeline run: {lastRun}</small>
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
    </main>
  );
}
