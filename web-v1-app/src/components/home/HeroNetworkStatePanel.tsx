"use client";

export type HeroPanelSnapshot = {
  consecutiveRows?: number | null;
  firstPublishedLabel?: string | null;
  methodologyVersionLabel?: string | null;
  name?: string;
  asOf?: string;
  lag?: string;
  regime?: string;
  confidence?: string;
  confidenceValue?: number | null;
  oneLiner?: string;
};

function formatRows(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "Daily rows published since Dec 2024";
  }
  return `${new Intl.NumberFormat("en-US").format(value)} consecutive daily rows`;
}

function sinceLine(value: string | null | undefined) {
  if (!value) return "Published since Dec 2024, no gaps";
  return `Published since ${value}, no gaps`;
}

function methodologyLine(value: string | null | undefined) {
  if (!value) return "Methodology version tracked — history never silently rewritten";
  return `Methodology ${value} — history never silently rewritten`;
}

export default function HeroNetworkStatePanel({ snapshot }: { snapshot: HeroPanelSnapshot }) {
  return (
    <>
      <aside className="ua3-hero-network-panel" aria-label="Dataset at a glance">
        <p className="ua3-hero-panel-label">DATASET AT A GLANCE</p>

        <div className="ua3-hero-panel-lines" aria-label="Dataset summary">
          <div className="ua3-hero-panel-line">
            <h2>{formatRows(snapshot.consecutiveRows)}</h2>
            <p>{sinceLine(snapshot.firstPublishedLabel)}</p>
          </div>

          <div className="ua3-hero-panel-line">
            <h2>4 chains covered</h2>
            <p>Bitcoin · Ethereum · Arbitrum · Base</p>
          </div>

          <div className="ua3-hero-panel-line">
            <h2>Deterministic, versioned</h2>
            <p>{methodologyLine(snapshot.methodologyVersionLabel)}</p>
          </div>
        </div>

        <a className="ua3-hero-panel-link" href="/methodology">
          See the full methodology →
        </a>
      </aside>
      <style>{styles}</style>
    </>
  );
}

const styles = `
.ua3-hero-network-panel {
  width: 100%;
  max-width: 380px;
  border: 1px solid var(--border-emphasis);
  border-radius: 16px;
  background: rgba(16, 25, 28, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  padding: 28px 28px 24px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
}
.ua3-hero-panel-label {
  margin: 0;
  color: var(--text-tertiary);
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.ua3-hero-panel-lines {
  margin-top: 20px;
}
.ua3-hero-panel-line {
  padding: 16px 0;
}
.ua3-hero-panel-line + .ua3-hero-panel-line {
  border-top: 1px solid var(--border-subtle);
}
.ua3-hero-panel-line h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.02em;
}
.ua3-hero-panel-line p {
  margin: 4px 0 0;
  color: var(--text-tertiary);
  font-size: 13px;
  line-height: 1.5;
}
.ua3-hero-panel-link {
  display: inline-flex;
  margin-top: 16px;
  color: var(--accent-action);
  font-size: 13px;
  line-height: 1.5;
  text-decoration: none;
}
@media (max-width: 767px) {
  .ua3-hero-network-panel {
    width: 100%;
    max-width: none;
  }
}
`;
