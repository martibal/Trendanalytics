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
      <aside className="ua3-hero-network-panel" data-panel-kind="dataset-glance" aria-label="Dataset at a glance">
        <p className="ua3-hero-panel-label">DATASET AT A GLANCE</p>

        <div className="ua3-hero-panel-lines" role="group" aria-label="Dataset summary">
          <div className="ua3-hero-panel-line">
            <p className="ua3-hero-panel-stat">{formatRows(snapshot.consecutiveRows)}</p>
            <p>{sinceLine(snapshot.firstPublishedLabel)}</p>
          </div>

          <div className="ua3-hero-panel-line">
            <p className="ua3-hero-panel-stat">4 chains covered</p>
            <p>Bitcoin · Ethereum · Arbitrum · Base</p>
          </div>

          <div className="ua3-hero-panel-line">
            <p className="ua3-hero-panel-stat">Deterministic, versioned</p>
            <p>{methodologyLine(snapshot.methodologyVersionLabel)}</p>
          </div>
        </div>

        <div className="ua3-hero-panel-offer" role="group" aria-label="How to evaluate Urd Atlas">
          <p className="ua3-hero-panel-offer-label">INSPECT BEFORE YOU BUY</p>
          <div className="ua3-hero-panel-price-row">
            <strong>$49</strong>
            <span>/ month</span>
          </div>
          <p className="ua3-hero-panel-offer-copy">Basic starts at $49/month for one selected chain. Download the free sample pack first: a real 14-day Ethereum + Arbitrum history across Meta, Gold, Derived and Briefs, plus high/lower-confidence examples and a runnable join quickstart.</p>
          <a href="/api/v1/sample-pack" className="ua3-hero-panel-primary ua-home-focus" download>Download free sample pack</a>
          <div className="ua3-hero-panel-secondary-actions">
            <a href="#today-status" className="ua-home-focus">See today&apos;s published state →</a>
          </div>
        </div>
      </aside>
      <style>{styles}</style>
    </>
  );
}

const styles = `
.ua3 > .ua3-transition { display: none; }
.ua3 > .ua3-section:not(.ua3-hero) {
  border-top: 1px solid var(--accent-depth-line);
}
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
.ua3-hero-panel-label,
.ua3-hero-panel-offer-label {
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
.ua3-hero-panel-stat {
  margin: 0;
  color: var(--text-primary);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.02em;
}
.ua3-hero-panel-line > p:not(.ua3-hero-panel-stat) {
  margin: 4px 0 0;
  color: var(--text-tertiary);
  font-size: 13px;
  line-height: 1.5;
}
.ua3-hero-panel-offer {
  margin-top: 12px;
  padding-top: 22px;
  border-top: 1px solid var(--border-emphasis);
}
.ua3-hero-panel-offer-label {
  color: var(--accent-action);
}
.ua3-hero-panel-price-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 10px;
}
.ua3-hero-panel-price-row strong {
  color: var(--text-primary);
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.03em;
}
.ua3-hero-panel-price-row span {
  color: var(--text-tertiary);
  font-size: 13px;
}
.ua3-hero-panel-offer-copy {
  margin: 12px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.55;
}
.ua3-hero-panel-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 18px;
  border: 1px solid var(--accent-action);
  border-radius: 999px;
  background: var(--accent-action);
  color: var(--accent-action-text);
  padding: 12px 16px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  transition: transform .2s ease, background-color .2s ease, border-color .2s ease;
}
.ua3-hero-panel-primary:hover {
  transform: translateY(-1px);
  background: var(--accent-action-hover);
  border-color: var(--accent-action-hover);
}
.ua3-hero-panel-secondary-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-top: 14px;
}
.ua3-hero-panel-secondary-actions a {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
  text-decoration: none;
}
.ua3-hero-panel-secondary-actions a:hover {
  color: var(--accent-action);
}
@media (prefers-reduced-motion: reduce) {
  .ua3-hero-panel-primary {
    transition: none !important;
  }
  .ua3-hero-panel-primary:hover {
    transform: none !important;
  }
}
@media (max-width: 767px) {
  .ua3-hero-network-panel {
    width: 100%;
    max-width: none;
  }
}
`;