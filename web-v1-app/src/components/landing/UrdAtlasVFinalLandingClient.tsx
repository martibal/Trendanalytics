"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type JsonLayer = "gold" | "derived" | "meta" | "briefs";
type Label = "STABLE" | "HEATING" | "CONGESTED" | "CHEAP" | "UNKNOWN/DEGRADED";

// ---------------------------------------------------------------------------
// Public prop types — exported so page.tsx can import them
// ---------------------------------------------------------------------------

export type LandingChainData = {
  key: string;
  label: string;
  icon: string;
  fullName: string;
  chainId: string;
  regime: Label;
  confidence: string;
  oneLiner: string;
  path: number[];
};

export type LandingBriefPathPoint = {
  date: string;
  label: Label;
  isLatest?: boolean;
};

export type LandingBriefData = {
  title: string;
  headline: string;
  dominant: Label;
  confidence: string;
  changes: string;
  run: string;
  path: Array<Label | LandingBriefPathPoint>;
  plain: string;
};


type DatasetManifest = {
  published_at?: string;
  computed_at_utc?: string;
};

function formatUtcDate(value: string | undefined): string {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getPublishedAtDisplay(manifest: DatasetManifest | null): string {
  return formatUtcDate(manifest?.published_at ?? manifest?.computed_at_utc);
}

// ---------------------------------------------------------------------------
// JSON inspector options — reads the actual published latest.json files from
// /public/data/published/v1, not simplified marketing examples.
// ---------------------------------------------------------------------------

type JsonChain = "bitcoin" | "ethereum" | "arbitrum" | "base";
type JsonLoadState = "loading" | "ready" | "error";

const JSON_CHAIN_OPTIONS: Array<{ label: string; value: JsonChain }> = [
  { label: "BTC", value: "bitcoin" },
  { label: "ETH", value: "ethereum" },
  { label: "ARB", value: "arbitrum" },
  { label: "BASE", value: "base" },
];

const JSON_LAYER_OPTIONS: JsonLayer[] = ["gold", "derived", "meta", "briefs"];

const PRICE_STRIP_CSS = `
.ua-vf-section[id] {
  scroll-margin-top: 118px;
}

.ua-vf-price-strip {
  position: relative;
  z-index: 20;
  border-bottom: 1px solid var(--line);
  background:
    linear-gradient(90deg, rgba(196,146,48,.08), transparent 28%, transparent 72%, rgba(61,112,153,.08)),
    rgba(8,15,26,.90);
  backdrop-filter: blur(12px);
}

.ua-vf-price-strip-inner {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
  align-items: stretch;
  min-height: 56px;
}

.ua-vf-price-strip-item {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 13px 20px 13px 0;
  border-right: 1px solid var(--line);
}

.ua-vf-price-strip-item + .ua-vf-price-strip-item {
  padding-left: 20px;
}

.ua-vf-price-strip-label {
  color: var(--gold);
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: .16em;
  text-transform: uppercase;
  white-space: nowrap;
}

.ua-vf-price-strip-price {
  color: var(--gold);
  font-family: var(--serif);
  font-size: 22px;
  font-weight: 400;
  letter-spacing: -.025em;
  line-height: 1;
  white-space: nowrap;
}

.ua-vf-price-strip-price span {
  color: var(--ink2);
  font-family: var(--sans);
  font-size: 12px;
  letter-spacing: 0;
}

.ua-vf-price-strip-note {
  color: var(--ink3);
  font-size: 12px;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ua-vf-price-strip-more {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-left: 20px;
  color: var(--gold);
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: .14em;
  text-transform: uppercase;
  white-space: nowrap;
  transition: color .18s, transform .18s;
}

.ua-vf-price-strip-more:hover {
  color: var(--gold2);
  transform: translateY(-1px);
}

@media (max-width: 980px) {
  .ua-vf-price-strip-inner {
    display: flex;
    min-height: 58px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .ua-vf-price-strip-inner::-webkit-scrollbar {
    display: none;
  }

  .ua-vf-price-strip-item {
    grid-template-columns: auto auto;
    min-width: max-content;
    padding-right: 18px;
  }

  .ua-vf-price-strip-note {
    grid-column: 1 / -1;
    max-width: 210px;
  }

  .ua-vf-price-strip-more {
    min-width: max-content;
    padding-right: 2px;
  }
}

@media (max-width: 560px) {
  .ua-vf-price-strip-item {
    padding-left: 16px;
  }

  .ua-vf-price-strip-item:first-child {
    padding-left: 0;
  }
}
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function labelClass(label: Label): string {
  if (label === "STABLE") return "ua-vf-label--stable";
  if (label === "HEATING") return "ua-vf-label--heating";
  if (label === "CONGESTED") return "ua-vf-label--congested";
  if (label === "CHEAP") return "ua-vf-label--cheap";
  return "ua-vf-label--unknown";
}

function compactLabel(label: Label): string {
  if (label === "UNKNOWN/DEGRADED") return "UNKNOWN";
  return label;
}

function isBriefPathPoint(
  value: Label | LandingBriefPathPoint,
): value is LandingBriefPathPoint {
  return typeof value === "object" && value !== null && "label" in value;
}

function briefPathLabel(value: Label | LandingBriefPathPoint): Label {
  return isBriefPathPoint(value) ? value.label : value;
}

function briefPathDate(value: Label | LandingBriefPathPoint): string | null {
  if (!isBriefPathPoint(value)) return null;
  if (!value.date) return null;
  return value.date;
}

function briefPathIsLatest(
  value: Label | LandingBriefPathPoint,
  index: number,
  pathLength: number,
): boolean {
  if (isBriefPathPoint(value) && typeof value.isLatest === "boolean") {
    return value.isLatest;
  }

  return index === pathLength - 1;
}

function highlightJson(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/("(?:[^"\\]|\\.)*")(\s*:)/g, '<span class="ua-vf-jk">$1</span>$2')
    .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="ua-vf-js">$1</span>')
    .replace(/:\s*(-?\d[\d.e+\-]*)/gi, ': <span class="ua-vf-jn">$1</span>')
    .replace(/:\s*(null|true|false)/g, ': <span class="ua-vf-jb">$1</span>');
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const h = 28;
  const w = 80;

  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="ua-vf-spark">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChainLogo({ chainId }: { chainId: string }) {
  if (chainId === "bitcoin") {
    return (
      <svg className="ua-chain-logo-svg" viewBox="0 0 48 48" role="img" aria-label="Bitcoin logo">
        <circle cx="24" cy="24" r="22" fill="#F7931A" />
        <text
          x="24"
          y="31"
          textAnchor="middle"
          fontSize="22"
          fontWeight="700"
          fontFamily="Arial, Helvetica, sans-serif"
          fill="#FFFFFF"
        >
          ₿
        </text>
      </svg>
    );
  }

  if (chainId === "ethereum") {
    return (
      <svg className="ua-chain-logo-svg" viewBox="0 0 48 48" role="img" aria-label="Ethereum logo">
        <path d="M24 4 11 25 24 19.2 37 25 24 4Z" fill="#E7EDF3" />
        <path d="M24 4v15.2L37 25 24 4Z" fill="#9CAFC3" />
        <path d="M24 21.8 11 27.6 24 44 37 27.6 24 21.8Z" fill="#AAB8C8" />
        <path d="M24 21.8V44l13-16.4-13-5.8Z" fill="#6E8196" />
      </svg>
    );
  }

  if (chainId === "arbitrum") {
    return (
      <svg className="ua-chain-logo-svg" viewBox="0 0 48 48" role="img" aria-label="Arbitrum logo">
        <path
          d="M24 3.8 40.8 13.4v21.2L24 44.2 7.2 34.6V13.4L24 3.8Z"
          fill="#111E30"
          stroke="#69A7FF"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path d="M18 33.4 29.6 10.8h5L23.2 33.4H18Z" fill="#28A0F0" />
        <path d="M25.5 33.4 34.4 16.1h5L30.4 33.4h-4.9Z" fill="#FFFFFF" opacity="0.92" />
        <path d="M11.8 33.4 22.2 13.1h5L16.8 33.4h-5Z" fill="#1B4ADD" />
      </svg>
    );
  }

  if (chainId === "base") {
    return (
      <svg className="ua-chain-logo-svg" viewBox="0 0 48 48" role="img" aria-label="Base logo">
        <circle cx="24" cy="24" r="22" fill="#0052FF" />
        <circle cx="24" cy="24" r="10.5" fill="#FFFFFF" />
      </svg>
    );
  }

  return (
    <span className="ua-chain-logo-fallback" aria-hidden="true">
      •
    </span>
  );
}

function Reveal({
  children,
  forceVisible = false,
}: {
  children: ReactNode;
  forceVisible?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const isVisible = forceVisible || visible;

  useEffect(() => {
    const node = ref.current;
    if (!node || isVisible) return;

    const reveal = () => setVisible(true);

    const revealIfHashTargeted = () => {
      const id = window.location.hash.replace(/^#/, "");
      if (!id) return false;

      const target = document.getElementById(id);
      if (!target) return false;

      if (target.contains(node) || node.contains(target)) {
        reveal();
        return true;
      }

      return false;
    };

    if (revealIfHashTargeted()) return;

    if (!("IntersectionObserver" in window)) {
      reveal();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          reveal();
          observer.disconnect();
        }
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -12% 0px",
      },
    );

    observer.observe(node);

    const handleHashChange = () => {
      revealIfHashTargeted();
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [isVisible]);

  return (
    <div ref={ref} className={`ua-vf-reveal ${isVisible ? "is-visible" : ""}`}>
      {children}
    </div>
  );
}

function Price({
  title,
  price,
  period = "",
  note,
  features,
  cta,
  href,
}: {
  title: string;
  price: string;
  period?: string;
  note: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
}) {
  return (
    <article className="ua-vf-price-card is-featured">
      <h3>{title}</h3>
      <div className="ua-vf-price">
        {price} {period ? <span>{period}</span> : null}
      </div>
      <p>{note}</p>
      <ul>{features.map((f) => <li key={f}>{f}</li>)}</ul>
      <Link href={href} className="ua-vf-btn-primary">
        {cta}
      </Link>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  chains: LandingChainData[];
  briefs: Record<string, LandingBriefData>;
  updatedThrough: string;
  pipelineDays?: number;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UrdAtlasVFinalLandingClient({
  chains,
  briefs,
  updatedThrough,
  pipelineDays = 0,
}: Props) {
  const [progress, setProgress] = useState(0);
  const [miniVisible, setMiniVisible] = useState(false);
  const [briefChain, setBriefChain] = useState<string>(chains[0]?.key ?? "btc");
  const [jsonChain, setJsonChain] = useState<JsonChain>("bitcoin");
  const [jsonLayer, setJsonLayer] = useState<JsonLayer>("meta");
  const [selectedJson, setSelectedJson] = useState("{\n  \"loading\": true\n}");
  const [jsonLoadState, setJsonLoadState] = useState<JsonLoadState>("loading");
  const [modalOpen, setModalOpen] = useState(false);
  const [forcePricingReveal, setForcePricingReveal] = useState(false);
  const [lastRunDisplay, setLastRunDisplay] = useState("—");

  const pipelineDaysDisplay = Number.isFinite(pipelineDays) && pipelineDays > 0
    ? pipelineDays.toLocaleString("en-US")
    : "—";

  const selectedJsonPath = jsonLayer === "briefs"
    ? `briefs/chains/${jsonChain}/latest.json`
    : `${jsonLayer}/${jsonChain}/latest.json`;

  useEffect(() => {
    let cancelled = false;

    async function loadPublishedJson() {
      const path = `/data/published/v1/${selectedJsonPath}`;

      setJsonLoadState("loading");

      try {
        const response = await fetch(path, { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} while reading ${path}`);
        }

        const value = (await response.json()) as unknown;

        if (!cancelled) {
          setSelectedJson(JSON.stringify(value, null, 2));
          setJsonLoadState("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setSelectedJson(
            JSON.stringify(
              {
                error: "Could not load published JSON",
                path,
                detail: error instanceof Error ? error.message : String(error),
              },
              null,
              2,
            ),
          );
          setJsonLoadState("error");
        }
      }
    }

    void loadPublishedJson();

    return () => {
      cancelled = true;
    };
  }, [selectedJsonPath]);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setProgress((scrollTop / max) * 100);
      setMiniVisible(scrollTop > 420);
    };

    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDatasetManifest() {
      try {
        const response = await fetch("/data/published/v1/dataset.json", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const manifest = (await response.json()) as DatasetManifest;
        const nextLastRun = getPublishedAtDisplay(manifest);

        if (!cancelled && nextLastRun !== "—") {
          setLastRunDisplay(nextLastRun);
        }
      } catch {
        // Keep the dashboard honest: if the manifest cannot be read, do not
        // synthesize a fake run date from the browser clock.
      }
    }

    void loadDatasetManifest();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentBrief = briefs[briefChain] ?? Object.values(briefs)[0];

  return (
    <main className="ua-vf">
      <style dangerouslySetInnerHTML={{ __html: `
        .ua-vf-tour-hero-link {
          display: inline-flex;
          width: fit-content;
          margin-top: 2px;
          color: var(--gold) !important;
          border-bottom-color: rgba(196, 146, 48, 0.45) !important;
          font-size: 14px !important;
          font-weight: 800 !important;
          letter-spacing: 0.08em !important;
          text-transform: none;
          text-shadow: 0 0 18px rgba(196, 146, 48, 0.18);
        }

        .ua-vf-tour-hero-link:hover {
          color: var(--gold2) !important;
          border-bottom-color: rgba(196, 146, 48, 0.75) !important;
        }

        @media (max-width: 900px) {
          .ua-vf-tour-hero-link {
            font-size: 13px !important;
            letter-spacing: 0.05em !important;
          }
        }
      ` }} />
      <style dangerouslySetInnerHTML={{ __html: `
        .ua-vf-landing-super-title {
          margin: -58px auto 40px;
          max-width: 1120px;
          text-align: center;
          color: var(--gold) !important;
          font-family: var(--serif);
          font-size: clamp(36px, 4.05vw, 58px);
          font-weight: 400;
          line-height: 1.05;
          letter-spacing: -0.045em;
          text-wrap: balance;
        }

        .ua-vf-landing-super-title::after {
          content: "";
          display: block;
          width: min(100%, 1120px);
          height: 7px;
          margin: 34px auto 0;
          border-radius: 999px;
          background:
            radial-gradient(ellipse at center, rgba(196, 146, 48, 0.95) 0%, rgba(196, 146, 48, 0.58) 24%, rgba(196, 146, 48, 0.24) 52%, transparent 78%),
            linear-gradient(90deg, transparent 0%, rgba(196, 146, 48, 0.22) 15%, rgba(196, 146, 48, 0.58) 48%, rgba(196, 146, 48, 0.58) 52%, rgba(196, 146, 48, 0.22) 85%, transparent 100%);
          filter: drop-shadow(0 0 10px rgba(196, 146, 48, 0.16));
          opacity: 0.92;
        }

        .ua-vf-hero-grid {
          align-items: stretch !important;
        }

        .ua-vf-hero-copy {
          min-height: 430px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .ua-vf-hero-question {
          max-width: 650px;
          font-size: clamp(3.8px, 4.0vw, 64px) !important;
          line-height: 0.98 !important;
          letter-spacing: -0.066em !important;
        }

        @media (max-width: 900px) {
          .ua-vf-landing-super-title {
            margin: -18px auto 38px;
            font-size: clamp(24px, 7vw, 34px);
            line-height: 1.08;
          }

          .ua-vf-hero-copy {
            min-height: auto;
          }

          .ua-vf-hero-question {
            font-size: clamp(42px, 13vw, 62px) !important;
          }
        }
      ` }} />
      <style dangerouslySetInnerHTML={{ __html: `
        .ua-vf-hero-title-wrap {
          text-align: center;
          padding-top: clamp(4px, 1.2vw, 16px);
          padding-bottom: clamp(38px, 5.2vw, 72px);
        }

        $11060px;
          margin: 0 auto;
          color: var(--gold);
          font-family: var(--serif);
          font-size: clamp(28px, 4.2vw, 56px);
          font-weight: 400;
          letter-spacing: -0.042em;
          line-height: 1.02;
          text-wrap: balance;
          text-shadow:
            0 18px 56px rgba(0,0,0,.34),
            0 0 30px rgba(196,146,48,.16);
        }

        @media (max-width: 760px) {
          .ua-vf-hero-title-wrap {
            padding-top: 8px;
            padding-bottom: 30px;
          }

          .ua-vf-hero-top-title {
            font-size: clamp(30px, 4.55vw, 62px);
            line-height: 1;
            letter-spacing: -0.044em;
          }
        }
        .ua-vf-hero-grid-balanced {
          align-items: stretch !important;
        }

        .ua-vf-hero-grid-balanced .ua-vf-hero-copy {
          display: flex;
          min-height: 100%;
          flex-direction: column;
          justify-content: center;
        }

        $1610px;
          font-size: clamp(38px, 4.15vw, 62px);
          line-height: 1.05;
          letter-spacing: -0.032em;
        }

        $1610px;
        }

        @media (max-width: 980px) {
          .ua-vf-hero-grid-balanced {
            align-items: start !important;
          }

          .ua-vf-hero-grid-balanced .ua-vf-hero-copy {
            min-height: 0;
            justify-content: flex-start;
          }

          $11.05;
          }
        }
        .ua-chain-hero-row:hover { background: var(--surface3) !important; padding-left: 26px !important; }
        .ua-chain-hero-row::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: transparent; transition: background .2s; }
        .ua-chain-hero-row:hover::before { background: var(--gold); }
        .ua-chain-logo-mark { width: 44px; height: 44px; display: grid; place-items: center; border: 1px solid var(--line2); border-radius: 999px; background: rgba(232,224,208,.035); box-shadow: 0 0 0 1px rgba(232,224,208,.025), 0 10px 24px rgba(0,0,0,.18); }
        .ua-chain-logo-svg { width: 34px; height: 34px; display: block; filter: saturate(1.08) contrast(1.06); }
        .ua-chain-logo-name { font-family: var(--mono); font-size: 9.5px; font-weight: 500; letter-spacing: .06em; color: var(--gold); line-height: 1.15; text-align: center; }
        .ua-chain-logo-fallback { color: var(--gold); font-family: var(--mono); font-size: 20px; }
        .ua-vf-regime-path .ua-vf-path-token { display: inline-grid; grid-template-columns: 1fr; gap: 4px; align-items: start; min-width: 96px; padding-bottom: 7px; color: var(--gold); }
        .ua-vf-path-token b { color: var(--gold); font-family: var(--mono); font-size: 10px; font-weight: 500; letter-spacing: .04em; line-height: 1.1; text-transform: none; }
        .ua-vf-path-token i { color: var(--gold); font-family: var(--mono); font-size: 8px; font-style: normal; font-weight: 500; letter-spacing: .14em; line-height: 1; text-transform: uppercase; }
        .ua-vf-path-token strong { color: currentColor; font-family: var(--mono); font-size: 10px; font-weight: 600; letter-spacing: .08em; line-height: 1.1; text-transform: uppercase; }
        @media (max-width: 560px) {
          .ua-chain-hero-row { grid-template-columns: 64px minmax(0, 1fr) auto !important; gap: 0 12px !important; padding: 15px 16px !important; }
          .ua-chain-logo-mark { width: 38px; height: 38px; }
          .ua-chain-logo-svg { width: 30px; height: 30px; }
          .ua-chain-logo-name { font-size: 8.5px; letter-spacing: .04em; }
          .ua-chain-hero-row .ua-vf-spark { display: none; }
        }
      ` }} />
      <style dangerouslySetInnerHTML={{ __html: PRICE_STRIP_CSS }} />
      <div className="ua-vf-progress" style={{ width: `${progress}%` }} />

      <section className="ua-vf-price-strip" aria-label="Pricing summary">
        <div className="ua-vf-shell ua-vf-price-strip-inner">
          <div className="ua-vf-price-strip-item">
            <span className="ua-vf-price-strip-label">Free</span>
            <strong className="ua-vf-price-strip-price">$0</strong>
            <span className="ua-vf-price-strip-note">public context and sample JSON</span>
          </div>

          <div className="ua-vf-price-strip-item">
            <span className="ua-vf-price-strip-label">Single Chain</span>
            <strong className="ua-vf-price-strip-price">
              $49 <span>/mo</span>
            </strong>
            <span className="ua-vf-price-strip-note">one chain, full daily JSON</span>
          </div>

          <div className="ua-vf-price-strip-item">
            <span className="ua-vf-price-strip-label">Full Access</span>
            <strong className="ua-vf-price-strip-price">
              $149 <span>/mo</span>
            </strong>
            <span className="ua-vf-price-strip-note">all chains and cross-chain context</span>
          </div>

          <a
            href="#pricing"
            className="ua-vf-price-strip-more"
            onClick={() => setForcePricingReveal(true)}
          >
            See more ↓
          </a>
        </div>
      </section>

      {/* ── HERO ── */}
      <section className="ua-vf-hero" id="top">
        <div className="ua-vf-shell">
          <div className="ua-vf-landing-super-title">Urd Atlas - Daily network intelligence for Bitcoin, Ethereum, Arbitrum and Base</div>
        </div>
        <div className="ua-vf-shell ua-vf-hero-title-wrap ua-vf-reveal is-visible">
</div>

        <div className="ua-vf-shell ua-vf-hero-grid ua-vf-hero-grid-balanced" style={{ alignItems: "stretch" }}>
          <div className="ua-vf-hero-copy ua-vf-reveal is-visible">
            <h2 className="ua-vf-h1 ua-vf-hero-question">
              How busy has the blockchain network been <em>lately?</em>
            </h2>
            <p className="ua-vf-hero-question-copy" style={{ marginBottom: "24px" }}>
              Urd Atlas measures transaction activity, fee pressure and capacity across Bitcoin,
              Ethereum, Arbitrum and Base every day and publishes one verified, documented answer
              per chain. Know exactly whether each network has been running at its usual pace,
              building pressure, or easing off before you make your next move.
            </p>
            <div className="ua-vf-btn-row">
              <a href="#json" className="ua-vf-btn-primary">
                Inspect JSON
              </a>
              <a href="#brief" className="ua-vf-btn-primary">
                Read latest Brief
              </a>
              <Link href="/tour" className="ua-vf-text-link ua-vf-tour-hero-link">
                New to Urd Atlas? Take the quick tour →
              </Link>
            </div>
            <div className="ua-vf-trustline">
              <span>No price data</span>
              <span>No forecasts</span>
              <span>No recommendations</span>
            </div>

          </div>

          <aside style={{
            background: "var(--surface2)",
            border: "1px solid var(--line2)",
            borderTop: "2px solid var(--gold)",
            borderRadius: "5px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }} className="ua-vf-reveal is-visible">

            {/* ── Header ── */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--line)",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "12px",
              alignItems: "start",
            }}>
              <div>
                <div style={{
                  fontFamily: "var(--mono)",
                  fontSize: "9px",
                  fontWeight: 500,
                  letterSpacing: ".18em",
                  textTransform: "uppercase",
                  color: "var(--gold)",
                  marginBottom: "5px",
                }}>Network status · updated daily</div>
                <div style={{
                  fontFamily: "var(--serif)",
                  fontSize: "18px",
                  fontWeight: 400,
                  color: "var(--ink)",
                  lineHeight: 1.2,
                }}>Current regime across 4 chains</div>
                <div style={{
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  color: "var(--ink2)",
                  marginTop: "4px",
                }}>Click any chain to see full data →</div>
              </div>
              <div style={{
                textAlign: "right",
                display: "grid",
                gap: "10px",
              }}>
                <div>
                  <div style={{
                    fontFamily: "var(--mono)",
                    fontSize: "9px",
                    letterSpacing: ".12em",
                    textTransform: "uppercase",
                    color: "var(--ink3)",
                    marginBottom: "3px",
                  }}>Last run</div>
                  <div style={{
                    fontFamily: "var(--mono)",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--ink)",
                  }}>{lastRunDisplay}</div>
                </div>

                <div>
                  <div style={{
                    fontFamily: "var(--mono)",
                    fontSize: "9px",
                    letterSpacing: ".12em",
                    textTransform: "uppercase",
                    color: "var(--ink3)",
                    marginBottom: "3px",
                  }}>Data through</div>
                  <div style={{
                    fontFamily: "var(--mono)",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--ink)",
                  }}>{updatedThrough}</div>
                </div>
              </div>
            </div>

            {/* ── Chain rows ── */}
            <div style={{ flex: 1 }}>
              {chains.map((row) => {
                const regimeColor =
                  row.regime === "HEATING" ? "var(--c-heating)" :
                  row.regime === "CONGESTED" ? "var(--c-congested)" :
                  row.regime === "CHEAP" ? "var(--c-cheap)" :
                  row.regime === "UNKNOWN/DEGRADED" ? "var(--c-unknown)" :
                  "var(--c-stable)";

                const regimeMeaning: Record<string, string> = {
                  STABLE: "Normal, balanced conditions",
                  HEATING: "Activity building above baseline",
                  CONGESTED: "Elevated friction and pressure",
                  CHEAP: "Below-baseline friction",
                  "UNKNOWN/DEGRADED": "Insufficient data support",
                };

                return (
                  <Link
                    key={row.key}
                    href={`/chains/${row.chainId}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "76px minmax(0, 1fr) auto",
                      gap: "0 16px",
                      alignItems: "center",
                      padding: "16px 20px",
                      borderBottom: "1px solid var(--line)",
                      textDecoration: "none",
                      transition: "background .18s, padding-left .18s",
                      position: "relative",
                    }}
                    className="ua-chain-hero-row"
                  >
                    {/* Left: real chain logo + full name */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        minWidth: 0,
                      }}
                    >
                      <div className="ua-chain-logo-mark">
                        <ChainLogo chainId={row.chainId} />
                      </div>
                      <span className="ua-chain-logo-name">{row.fullName}</span>
                    </div>

                    {/* Middle: regime label + plain-English meaning */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontFamily: "var(--mono)",
                        fontSize: "14px",
                        fontWeight: 600,
                        letterSpacing: ".1em",
                        textTransform: "uppercase",
                        color: regimeColor,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "4px",
                      }}>
                        <span style={{
                          display: "inline-block",
                          width: "6px", height: "6px",
                          borderRadius: "50%",
                          background: regimeColor,
                          flexShrink: 0,
                        }} />
                        {compactLabel(row.regime)}
                      </div>
                      <div style={{
                        fontFamily: "var(--sans)",
                        fontSize: "12px",
                        color: "var(--ink)",
                        lineHeight: 1.45,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>{regimeMeaning[row.regime] ?? row.oneLiner}</div>
                    </div>

                    {/* Right: confidence + sparkline */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "1px" }}>
                        <span style={{
                          fontFamily: "var(--mono)",
                          fontSize: "18px",
                          fontWeight: 500,
                          color: "var(--ink)",
                          lineHeight: 1,
                        }}>{row.confidence}</span>
                        <span style={{
                          fontFamily: "var(--mono)",
                          fontSize: "8px",
                          letterSpacing: ".1em",
                          textTransform: "uppercase",
                          color: "var(--ink2)",
                        }}>confidence</span>
                      </div>
                      <Sparkline values={row.path} color={regimeColor} />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* ── Footer ── */}
            <div style={{
              padding: "10px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid var(--line)",
            }}>
              <span style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                color: "var(--ink2)",
                letterSpacing: ".1em",
                textTransform: "uppercase",
              }}>Daily · chain-relative</span>
              <div style={{ display: "flex", gap: "14px" }}>
                <Link href="/briefs" className="ua-vf-text-link">Weekly brief →</Link>
                <Link href="/track-record" className="ua-vf-text-link">History →</Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ── MINI NAV ── */}
      <nav className={`ua-vf-mini ${miniVisible ? "show" : ""}`}>
        <div className="ua-vf-mini-inner">
          <a href="#brief">Brief</a>
          <a href="#json">JSON</a>
          <a href="#methodology">Methodology</a>
          <a href="#pricing" onClick={() => setForcePricingReveal(true)}>
            Pricing
          </a>
        </div>
      </nav>

      {/* ── KPIs ── */}
      <section className="ua-vf-kpis">
        <div className="ua-vf-shell ua-vf-kpi-grid">
          <div className="ua-vf-kpi">
            <strong>{pipelineDaysDisplay}</strong>
            <span>published pipeline days</span>
          </div>
          <div className="ua-vf-kpi">
            <strong>4</strong>
            <span>chains covered</span>
          </div>
          <div className="ua-vf-kpi">
            <strong>v1</strong>
            <span>methodology version</span>
          </div>
          <div className="ua-vf-kpi">
            <strong>0</strong>
            <span>price fields</span>
          </div>
          <div className="ua-vf-kpi">
            <strong>Daily</strong>
            <span>not intraday</span>
          </div>
        </div>
      </section>

      {/* ── USE PATH ── */}
      <section className="ua-vf-section">
        <div className="ua-vf-shell">
          <Reveal>
            <div className="ua-vf-section-head">
              <div className="ua-vf-eyebrow">Use path</div>
              <div>
                <h2 className="ua-vf-h2">Two ways into the same published layer.</h2>
                <p className="ua-vf-section-lead">
                  The same daily data product supports a pipeline workflow and a direct reading
                  workflow.
                </p>
              </div>
            </div>

            <div className="ua-vf-path-grid">
              <div className="ua-vf-path">
                <h3>Have your own pipeline?</h3>
                <p>
                  Join Urd Atlas rows to your own daily rows by chain and date. Add regime,
                  confidence, drivers, and provenance to existing analysis.
                </p>
                <a className="ua-vf-text-link" href="#json">
                  Inspect JSON structure →
                </a>
              </div>

              <div className="ua-vf-path-divider" />

              <div className="ua-vf-path">
                <h3>No pipeline?</h3>
                <p>
                  Read published Briefs directly. The Briefs layer summarizes what changed, what
                  drove it, and how stable the latest label has been.
                </p>
                <a className="ua-vf-text-link" href="#brief">
                  Read the Brief preview →
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── BRIEF ── */}
      <section className="ua-vf-section" id="brief">
        <div className="ua-vf-shell">
          <Reveal>
            <div className="ua-vf-section-head">
              <div className="ua-vf-eyebrow">Brief preview</div>
              <div>
                <h2 className="ua-vf-h2">Readable context from the same deterministic labels.</h2>
                <p className="ua-vf-section-lead">
                  Briefs are the direct-use layer for users who want published context without
                  building their own pipeline.
                </p>
              </div>
            </div>

            <div className="ua-vf-brief-layout">
              <div>
                <div className="ua-vf-brief-tabs">
                  {chains.map((c) => (
                    <button
                      type="button"
                      key={c.key}
                      onClick={() => setBriefChain(c.key)}
                      className={`ua-vf-tab ${briefChain === c.key ? "is-active" : ""}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <p className="ua-vf-muted">
                  Switch chains to see how the same Brief structure carries different label paths
                  and confidence states.
                </p>
              </div>

              {currentBrief && (
                <article className="ua-vf-brief-doc">
                  <div className="ua-vf-meta-label">
                    {currentBrief.title} · latest 7 published days
                  </div>
                  <h3 className="ua-vf-brief-headline">{currentBrief.headline}</h3>

                  <div className="ua-vf-regime-path">
                    {currentBrief.path.map((point, index) => {
                      const label = briefPathLabel(point);
                      const dateLabel = briefPathDate(point) ?? `D${index + 1}`;
                      const isLatest = briefPathIsLatest(
                        point,
                        index,
                        currentBrief.path.length,
                      );

                      return (
                        <span
                          key={`${dateLabel}-${label}-${index}`}
                          className={`ua-vf-path-token ${labelClass(label)}`}
                        >
                          <b>{dateLabel}</b>
                          {isLatest ? <i>Latest</i> : null}
                          <strong>{compactLabel(label)}</strong>
                        </span>
                      );
                    })}
                  </div>

                  <p className="ua-vf-muted">{currentBrief.plain}</p>

                  <div className="ua-vf-brief-metrics">
                    <div className="ua-vf-brief-metric">
                      <strong className={labelClass(currentBrief.dominant)}>
                        {compactLabel(currentBrief.dominant)}
                      </strong>
                      <span>dominant label</span>
                    </div>
                    <div className="ua-vf-brief-metric">
                      <strong>{currentBrief.confidence}</strong>
                      <span>confidence score</span>
                    </div>
                    <div className="ua-vf-brief-metric">
                      <strong>{currentBrief.changes}</strong>
                      <span>label changes</span>
                    </div>
                    <div className="ua-vf-brief-metric">
                      <strong>{currentBrief.run}</strong>
                      <span>latest run days</span>
                    </div>
                  </div>
                </article>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── JSON INSPECTOR ── */}
      <section className="ua-vf-section" id="json">
        <div className="ua-vf-shell">
          <Reveal>
            <div className="ua-vf-section-head">
              <div className="ua-vf-eyebrow">JSON inspector</div>
              <div>
                <h2 className="ua-vf-h2">Inspect the complete file, not a marketing excerpt.</h2>
                <p className="ua-vf-section-lead">
                  Switch between the actual published latest Gold, Derived, Meta, and Briefs JSON files
                  for each supported chain.
                </p>
              </div>
            </div>

            <div className="ua-vf-json-layout">
              <aside className="ua-vf-json-side">
                <div className="ua-vf-meta-label">Chain</div>
                <div className="ua-vf-conf-tabs">
                  {JSON_CHAIN_OPTIONS.map((chain) => (
                    <button
                      type="button"
                      key={chain.value}
                      onClick={() => setJsonChain(chain.value)}
                      className={`ua-vf-tab ${jsonChain === chain.value ? "is-active" : ""}`}
                    >
                      {chain.label}
                    </button>
                  ))}
                </div>

                <div className="ua-vf-meta-label">Layer</div>
                <div className="ua-vf-json-tabs">
                  {JSON_LAYER_OPTIONS.map((layer) => (
                    <button
                      type="button"
                      key={layer}
                      onClick={() => setJsonLayer(layer)}
                      className={`ua-vf-tab ${jsonLayer === layer ? "is-active" : ""}`}
                    >
                      {layer}
                    </button>
                  ))}
                </div>

                <p className="ua-vf-json-note">
                  This inspector reads the actual published latest.json files from the same public
                  dataset path used by the application: {selectedJsonPath}.
                </p>

                <button
                  type="button"
                  className="ua-vf-btn-primary"
                  onClick={() => setModalOpen(true)}
                >
                  Open complete JSON
                </button>
              </aside>

              <div className="ua-vf-json-shell">
                <div className="ua-vf-code-toolbar">
                  <span>{selectedJsonPath}{jsonLoadState === "error" ? " · load error" : ""}</span>
                  <button
                    type="button"
                    className="ua-vf-text-link"
                    onClick={() => navigator.clipboard?.writeText(selectedJson)}
                    disabled={jsonLoadState === "loading"}
                  >
                    {jsonLoadState === "loading" ? "Loading…" : "Copy complete JSON"}
                  </button>
                </div>
                <pre
                  className="ua-vf-code"
                  dangerouslySetInnerHTML={{ __html: highlightJson(selectedJson) }}
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── METHODOLOGY ── */}
      <section className="ua-vf-section" id="methodology">
        <div className="ua-vf-shell">
          <Reveal>
            <div className="ua-vf-section-head">
              <div className="ua-vf-eyebrow">Trust</div>
              <div>
                <h2 className="ua-vf-h2">Built to be checked, not trusted blindly.</h2>
              </div>
            </div>

            <div className="ua-vf-trust-row">
              <div className="ua-vf-trust-item">
                <strong>Daily, not intraday</strong>
                <span>Daily cadence filters transient variance before labels are published.</span>
              </div>
              <div className="ua-vf-trust-item">
                <strong>No price data</strong>
                <span>Labels describe network conditions only.</span>
              </div>
              <div className="ua-vf-trust-item">
                <strong>Hash anchored</strong>
                <span>Every published row includes deterministic provenance.</span>
              </div>
              <div className="ua-vf-trust-item">
                <strong>UNKNOWN allowed</strong>
                <span>Weak evidence is not forced into strong labels.</span>
              </div>
              <div className="ua-vf-trust-item">
                <strong>Public samples</strong>
                <span>JSON structure can be inspected before subscribing.</span>
              </div>
            </div>

            <div className="ua-vf-faq ua-vf-faq-spaced">
              <details>
                <summary>Why daily, not intraday?</summary>
                <p>
                  Regime context is about structural network conditions. Intraday spikes are more
                  likely to reflect transient variance than durable state.
                </p>
              </details>
              <details>
                <summary>How are labels determined?</summary>
                <p>
                  Labels are derived from documented demand, friction, and capacity evidence with
                  deterministic rules and confidence gates.
                </p>
              </details>
              <details>
                <summary>Do labels use price data?</summary>
                <p>
                  No. Urd Atlas publishes network-condition reference data. Price data, forecasts,
                  and recommendations are excluded.
                </p>
              </details>
            </div>
          
            <div className="ua-vf-trust-row ua-vf-methodology-links" style={{ marginTop: "24px" }}>
              <Link
                href="/methodology"
                className="ua-vf-trust-item"
                style={{ textDecoration: "none" }}
              >
                <strong>How Urd Atlas works</strong>
                <span>Beginner-first overview of the path from public chain data to Gold, Derived, Meta, and Briefs JSON.</span>
              </Link>

              <Link
                href="/methodology/reference"
                className="ua-vf-trust-item"
                style={{ textDecoration: "none" }}
              >
                <strong>Methodology reference</strong>
                <span>Canonical public explanation of regime labels, confidence, scorecards, and interpretation boundaries.</span>
              </Link>

              <Link
                href="/methodology/fields"
                className="ua-vf-trust-item"
                style={{ textDecoration: "none" }}
              >
                <strong>Field dictionary</strong>
                <span>Lookup layer for JSON fields, Confidence v2 components, Briefs fields, and scorecard semantics.</span>
              </Link>

              <Link
                href="/methodology/changelog"
                className="ua-vf-trust-item"
                style={{ textDecoration: "none" }}
              >
                <strong>Methodology changelog</strong>
                <span>Documents the retroactive Confidence v2 rebuild and subscriber impact for cached Meta or Briefs files.</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="ua-vf-section" id="pricing">
        <div className="ua-vf-shell">
          <Reveal forceVisible={forcePricingReveal}>
            <div style={{ textAlign: "center", marginBottom: "40px" }}>
              <div className="ua-vf-eyebrow" style={{ marginBottom: "12px" }}>Pricing</div>
              <h2 className="ua-vf-h2">Simple access to the published layer.</h2>
            </div>

            <div className="ua-vf-pricing-grid">
              <Price
                title="Free"
                price="$0"
                note="Public charts, samples, limited history."
                cta="Start free"
                href="/status"
                features={["Public chain context", "Sample JSON", "Methodology docs"]}
              />

              <Price
                title="Single Chain"
                price="$49"
                period="/mo"
                note="One chain with full daily JSON."
                cta="Choose a chain"
                href="/api/v1/checkout?plan=basic"
                features={["Gold, Derived, Meta, Briefs", "Historical access", "Email support"]}
              />

              <Price
                title="Full Access"
                price="$149"
                period="/mo"
                note="All supported chains and cross-chain Briefs."
                cta="Get full access"
                href="/api/v1/checkout?plan=pro"
                featured
                features={["BTC, ETH, ARB, BASE", "Cross-chain Briefs", "Published archive"]}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── MODAL ── */}
      <div className={`ua-vf-modal ${modalOpen ? "is-open" : ""}`} role="dialog" aria-modal="true">
        <div className="ua-vf-modal-panel">
          <div className="ua-vf-modal-head">
            <div className="ua-vf-modal-title">
              Complete JSON · {selectedJsonPath}
            </div>
            <button className="ua-vf-modal-close" type="button" onClick={() => setModalOpen(false)}>
              Close
            </button>
          </div>
          <pre
            className="ua-vf-code"
            dangerouslySetInnerHTML={{ __html: highlightJson(selectedJson) }}
          />
        </div>
      </div>
    </main>
  );
}





