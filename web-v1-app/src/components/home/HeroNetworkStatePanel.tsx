"use client";

import type { CSSProperties } from "react";

import type { HomeLabel } from "./InteractiveHomeDashboard";

type HeroPanelSnapshot = {
  name: string;
  asOf: string;
  lag: string;
  regime: HomeLabel;
  confidence: string;
  confidenceValue: number | null;
  oneLiner: string;
};

function statusColor(label: HomeLabel) {
  if (label === "STABLE") return "var(--status-stable)";
  if (label === "CHEAP") return "var(--status-cheap)";
  if (label === "HEATING") return "var(--status-heating)";
  if (label === "CONGESTED") return "var(--status-congested)";
  return "var(--status-unknown)";
}

function confidenceDecimal(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "null";
  return value.toFixed(2);
}

export default function HeroNetworkStatePanel({ snapshot }: { snapshot: HeroPanelSnapshot }) {
  const statusStyle = { "--status-color": statusColor(snapshot.regime) } as CSSProperties;

  return (
    <>
      <aside className="ua3-hero-network-panel" aria-label="Today's network-state row">
        <p className="ua3-hero-panel-label">TODAY&apos;S NETWORK-STATE ROW</p>

        <div className="ua3-hero-panel-identity">
          <h2>{snapshot.name}</h2>
          <p>{snapshot.asOf} · {snapshot.lag}</p>
        </div>

        <div className="ua3-hero-panel-status-row">
          <span className="ua3-status-badge" style={statusStyle}>
            <span className="ua3-status-dot" />
            {snapshot.regime}
          </span>
          <p className="ua3-hero-panel-confidence">
            <span>confidence_score</span>
            <strong>{snapshot.confidence}</strong>
          </p>
        </div>

        <pre className="ua3-hero-panel-code" aria-label="Meta teaser fields">
          <code>
            <span className="ua3-json-property">regime</span><span className="ua3-json-punctuation">: </span><span className="ua3-json-string">&quot;{snapshot.regime}&quot;</span>{"\n"}
            <span className="ua3-json-property">confidence_score</span><span className="ua3-json-punctuation">: </span><span className="ua3-json-number">{confidenceDecimal(snapshot.confidenceValue)}</span>{"\n"}
            <span className="ua3-json-property">one_liner</span><span className="ua3-json-punctuation">: </span><span className="ua3-json-string ua3-json-oneliner">&quot;{snapshot.oneLiner}&quot;</span>
          </code>
        </pre>

        <div className="ua3-hero-panel-files">
          <p>Delivered as</p>
          <div aria-label="Delivered files">
            <span>Meta</span>
            <span>Gold</span>
            <span>Derived</span>
            <span>Briefs</span>
          </div>
        </div>

        <a className="ua3-hero-panel-link" href="#files-title">See all fields →</a>
      </aside>
      <style>{styles}</style>
    </>
  );
}

const styles = `
.ua3-hero-grid {
  grid-template-columns: minmax(0, 0.62fr) minmax(444px, 0.38fr) !important;
  gap: 80px !important;
}
.ua3-hero-glow {
  min-height: 420px !important;
  background: radial-gradient(circle at center, var(--accent-depth-glow), transparent 62%) !important;
}
.ua3-hero-network-panel {
  position: absolute;
  z-index: 5;
  top: 156px;
  right: max(64px, calc((100vw - 1440px) / 2 + 64px));
  width: min(380px, calc(100vw - 128px));
  max-width: 380px;
  border: 1px solid var(--border-emphasis);
  border-radius: 16px;
  background: rgba(16, 25, 28, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  padding: 28px 28px 24px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
}
.ua3-hero-panel-label,
.ua3-hero-panel-files > p {
  margin: 0;
  color: var(--text-tertiary);
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.ua3-hero-panel-identity {
  margin-top: 22px;
}
.ua3-hero-panel-identity h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0;
}
.ua3-hero-panel-identity p {
  margin: 4px 0 0;
  color: var(--text-tertiary);
  font-size: 13px;
  line-height: 1.5;
}
.ua3-hero-panel-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: 24px;
}
.ua3-hero-panel-confidence {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 8px;
  margin: 0;
  text-align: right;
  white-space: nowrap;
}
.ua3-hero-panel-confidence span {
  color: var(--text-tertiary);
  font-family: var(--mono);
  font-size: 12px;
  line-height: 1.4;
}
.ua3-hero-panel-confidence strong {
  color: var(--text-primary);
  font-family: var(--mono);
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}
.ua3-hero-panel-code {
  display: block;
  max-width: 100%;
  margin: 24px 0 0;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: #0A0C0E;
  padding: 16px;
  font-family: var(--mono);
  font-size: 13px;
  line-height: 1.5;
}
.ua3-hero-panel-code code {
  display: block;
  overflow: hidden;
  white-space: pre;
  text-overflow: ellipsis;
}
.ua3-json-property { color: #7DD3FC; }
.ua3-json-string { color: #86EFAC; }
.ua3-json-number { color: #FCD34D; }
.ua3-json-punctuation { color: #6B7280; }
.ua3-json-oneliner {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  vertical-align: bottom;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ua3-hero-panel-files {
  margin-top: 22px;
}
.ua3-hero-panel-files div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.ua3-hero-panel-files span {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
  padding: 4px 10px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.4;
}
.ua3-hero-panel-link {
  display: inline-flex;
  margin-top: 16px;
  color: var(--accent-action);
  font-size: 13px;
  line-height: 1.5;
  text-decoration: none;
}
@media (max-width: 1120px) {
  .ua3-hero-network-panel {
    display: none;
  }
  .ua3-hero-grid {
    grid-template-columns: 1fr !important;
    gap: 40px !important;
  }
}
@media (max-width: 767px) {
  .ua3-hero-network-panel {
    display: block;
    position: static;
    width: calc(100% - 32px);
    max-width: none;
    margin: -48px auto 48px;
  }
}
`;
