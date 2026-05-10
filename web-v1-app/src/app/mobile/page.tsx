// src/app/mobile/page.tsx

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readDatasetManifest } from "@/lib/dataset";
import { computeHistoryDepthDays } from "@/lib/historyDepth";
import {
  CHAIN_COLORS,
  mobileFreshness,
  parseMobileChainState,
  regimeColor,
  type MobileChainState,
} from "@/lib/mobile/data";
import { readStorageObject } from "@/lib/storage";

import "server-only";

type LandingHero = {
  display_asof?: string;
  asof?: {
    display?: string;
    latest_available?: string;
    gold?: string;
    derived?: string;
    meta?: string;
  };
};

const WORKFLOW_IMAGES = [
  {
    number: "1",
    title: "Start with your data",
    src: "/landing-workflows/urd-atlas-mobile-workflow-1.png",
    alt:
      "Fictive example data showing an existing dataset before Urd Atlas regime context is joined.",
  },
  {
    number: "2",
    title: "Join Urd Atlas JSON",
    src: "/landing-workflows/urd-atlas-mobile-workflow-2.png",
    alt:
      "Fictive example data showing Urd Atlas regime, confidence, and evidence fields joined by date and chain.",
  },
  {
    number: "3",
    title: "Analyze by regime",
    src: "/landing-workflows/urd-atlas-mobile-workflow-3.png",
    alt:
      "Fictive example downstream analysis using Urd Atlas regime labels to segment, filter, and report by network condition.",
  },
];

const REGIME_LABELS = [
  "STABLE",
  "HEATING",
  "CONGESTED",
  "CHEAP",
  "UNKNOWN/DEGRADED",
] as const;

const CHAIN_SYMBOLS: Record<ChainId, string> = {
  bitcoin: "₿",
  ethereum: "Ξ",
  arbitrum: "A",
  base: "B",
};

function arrayBufferToUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

async function readPublishedJson<T>(path: string): Promise<T | null> {
  const result = await readStorageObject(path);

  if (!result) return null;

  try {
    return JSON.parse(arrayBufferToUtf8(result.body)) as T;
  } catch {
    return null;
  }
}

function heroDisplayAsOf(hero?: LandingHero | null): string | null {
  return (
    hero?.display_asof ??
    hero?.asof?.display ??
    hero?.asof?.latest_available ??
    null
  );
}

function lagDaysFromIsoDay(date?: string | null): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const [y, m, d] = date.split("-").map(Number);
  const asOfMs = Date.UTC(y, m - 1, d);

  const now = new Date();
  const todayMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );

  const diff = todayMs - asOfMs;

  return diff >= 0 ? Math.floor(diff / 86400000) : null;
}

async function buildChainStates(): Promise<MobileChainState[]> {
  return Promise.all(
    CHAIN_LIST.map(async (chain) => {
      const [meta, hero] = await Promise.all([
        readPublishedJson<Record<string, unknown>>(
          `data/published/v1/meta/${chain.id}/latest.json`
        ),
        readPublishedJson<LandingHero>(
          `data/published/v1/landing/${chain.id}/hero.json`
        ),
      ]);

      const parsed = parseMobileChainState(
        chain.id,
        chain.label,
        chain.name,
        meta as never
      );

      const displayAsOf = heroDisplayAsOf(hero);

      if (!displayAsOf) return parsed;

      const lagDays = lagDaysFromIsoDay(displayAsOf);

      return {
        ...parsed,
        asOf: displayAsOf,
        lagDays,
        freshnessStatus: mobileFreshness(chain.id as ChainId, lagDays),
      };
    })
  );
}

function formatPublishedDate(publishedAt?: string | null): string | null {
  if (!publishedAt) return null;

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Oslo",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(publishedAt));
}

function formatAxisLevel(value?: string | null): string {
  if (!value) return "—";

  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function clampPct(value: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;

  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function ChainCard({ state }: { state: MobileChainState }) {
  const label = state.regimeLabel ?? "UNKNOWN/DEGRADED";
  const color = regimeColor(label);
  const chainColor = CHAIN_COLORS[state.chain];

  const style = {
    "--ua-regime": color,
    "--ua-chain": chainColor,
  } as CSSProperties;

  const confidencePct = clampPct(state.confidenceScore);

  const demand = formatAxisLevel(state.scorecard.demand?.level);
  const friction = formatAxisLevel(state.scorecard.friction?.level);
  const capacity = formatAxisLevel(state.scorecard.capacity?.level);

  return (
    <Link
      href={`/mobile/chain/${state.chain}`}
      className="ua-chain-card"
      style={style}
    >
      <div className="ua-chain-top">
        <div className="ua-chain-left">
          <div className="ua-chain-icon">{CHAIN_SYMBOLS[state.chain]}</div>

          <div className="ua-chain-copy">
            <div className="ua-chain-name">{state.name}</div>
            <div className="ua-chain-date">
              {state.asOf ?? "—"}
              {state.lagDays != null ? ` · ${state.lagDays}d lag` : ""}
            </div>
          </div>
        </div>

        <div className="ua-regime-pill">{label}</div>
      </div>

      <div className="ua-confidence-row">
        <span>Confidence</span>
        <strong>
          {typeof state.confidenceScore === "number"
            ? state.confidenceScore.toFixed(3)
            : "—"}
        </strong>
      </div>

      <div className="ua-confidence-track">
        <div
          className="ua-confidence-fill"
          style={{ width: `${confidencePct}%` }}
        />
      </div>

      <p className="ua-axis-line">
        Demand: {demand} · Friction: {friction} · Capacity: {capacity}
      </p>
    </Link>
  );
}

function WorkflowCard({
  image,
  index,
}: {
  image: (typeof WORKFLOW_IMAGES)[number];
  index: number;
}) {
  return (
    <figure className="ua-workflow-card">
      <a
        href={`#workflow-image-${index + 1}`}
        className="ua-workflow-link"
        aria-label={`${image.title}. Open larger workflow image.`}
      >
        <div className="ua-workflow-image-wrap">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 720px) 92vw, 680px"
            className="ua-workflow-image"
            priority={index === 0}
          />

          <div className="ua-workflow-badge">Tap to enlarge</div>
        </div>
      </a>

      <figcaption className="ua-workflow-caption">
        <span>{image.number}</span>
        <strong>{image.title}</strong>
      </figcaption>
    </figure>
  );
}

function WorkflowModal({
  image,
  index,
}: {
  image: (typeof WORKFLOW_IMAGES)[number];
  index: number;
}) {
  return (
    <div id={`workflow-image-${index + 1}`} className="ua-modal">
      <a
        href="#workflow"
        className="ua-modal-backdrop"
        aria-label="Close enlarged workflow image"
      />

      <div className="ua-modal-panel">
        <div className="ua-modal-header">
          <div>
            <span>Fictive example data · workflow {index + 1}</span>
            <strong>{image.title}</strong>
          </div>

          <a href="#workflow">Close</a>
        </div>

        <div className="ua-modal-scroll">
          <div className="ua-modal-image">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="100vw"
              className="ua-workflow-image"
            />
          </div>
        </div>

        <div className="ua-modal-footer">
          Rotate your phone for the widest view.
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  description,
  href,
  tone,
}: {
  name: string;
  price: string;
  description: string;
  href: string;
  tone: "plain" | "blue" | "violet";
}) {
  return (
    <Link href={href} className={`ua-plan-card ua-plan-${tone}`}>
      <div>
        <strong>{name}</strong>
        <p>{description}</p>
      </div>

      <span>{price}</span>
    </Link>
  );
}

function MobileVisualStyles() {
  return (
    <style>{`
      .mobile-shell {
        background: #071019 !important;
        color: #f8fbff !important;
      }

      .mobile-shell main {
        margin-top: 0 !important;
      }

      .ua-mobile-compact,
      .ua-mobile-compact * {
        box-sizing: border-box;
      }

      .ua-mobile-compact {
        min-height: 100svh;
        overflow-x: hidden;
        background:
          radial-gradient(circle at 20% 0%, rgba(37, 99, 235, 0.22), transparent 19rem),
          linear-gradient(180deg, #071019 0%, #081725 44%, #f3f8ff 44%, #f3f8ff 100%);
        color: #f8fbff;
        font-family: inherit;
      }

      .ua-shell {
        min-height: 100svh;
        padding-bottom: 96px;
      }

      .ua-top {
        padding: calc(env(safe-area-inset-top) + 16px) 16px 24px;
      }

      .ua-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }

      .ua-brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        color: #ffffff;
        text-decoration: none;
      }

      .ua-brand img {
        width: 30px;
        height: 30px;
        object-fit: contain;
        opacity: 0.9;
      }

      .ua-brand-word {
        font-size: 20px;
        line-height: 1;
        font-weight: 1000;
        letter-spacing: -0.045em;
      }

      .ua-desktop-link {
        display: inline-flex;
        min-height: 38px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        background: rgba(255, 255, 255, 0.06);
        color: #eaf5ff;
        padding: 0 12px;
        text-decoration: none;
        font-size: 12px;
        font-weight: 900;
      }

      .ua-hero {
        margin-top: 26px;
      }

      .ua-kicker {
        color: #9fe8ff;
        font-size: 11px;
        font-weight: 1000;
        letter-spacing: 0.22em;
        text-transform: uppercase;
      }

      .ua-title {
        margin: 12px 0 0;
        max-width: 390px;
        color: #ffffff;
        font-size: 38px;
        line-height: 1.04;
        font-weight: 1000;
        letter-spacing: -0.065em;
      }

      .ua-title span {
        color: #2f8cff;
      }

      .ua-copy {
        margin: 16px 0 0;
        max-width: 390px;
        color: #dcecff;
        font-size: 15px;
        line-height: 1.55;
        font-weight: 650;
        letter-spacing: -0.02em;
      }

      .ua-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
      }

      .ua-primary,
      .ua-secondary {
        display: inline-flex;
        min-height: 48px;
        flex: 1 1 0;
        align-items: center;
        justify-content: center;
        border-radius: 16px;
        text-decoration: none;
        font-size: 14px;
        font-weight: 1000;
        letter-spacing: -0.02em;
      }

      .ua-primary {
        background: linear-gradient(180deg, #2f8cff 0%, #0d6efd 100%);
        color: #ffffff;
        box-shadow: 0 18px 44px rgba(13, 110, 253, 0.28);
      }

      .ua-secondary {
        border: 1px solid rgba(255, 255, 255, 0.18);
        background: rgba(255, 255, 255, 0.06);
        color: #ffffff;
      }

      .ua-status-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 22px;
      }

      .ua-status-box {
        border-radius: 20px;
        background: #ffffff;
        color: #071019;
        padding: 16px;
        box-shadow: 0 20px 55px rgba(0, 0, 0, 0.22);
      }

      .ua-status-box span {
        display: block;
        color: #52657d;
        font-size: 10px;
        font-weight: 1000;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      .ua-status-box strong {
        display: block;
        margin-top: 10px;
        color: #1478ff;
        font-size: 28px;
        line-height: 1;
        font-weight: 1000;
        letter-spacing: -0.055em;
      }

      .ua-status-box p {
        margin: 7px 0 0;
        color: #344b68;
        font-size: 11px;
        line-height: 1.35;
        font-weight: 800;
      }

      .ua-main {
        padding: 22px 16px 24px;
        color: #071019;
      }

      .ua-section {
        margin-top: 24px;
      }

      .ua-section:first-child {
        margin-top: 0;
      }

      .ua-section-head {
        margin-bottom: 12px;
      }

      .ua-section-label {
        color: #245b99;
        font-size: 11px;
        font-weight: 1000;
        letter-spacing: 0.2em;
        text-transform: uppercase;
      }

      .ua-section-title {
        margin: 7px 0 0;
        color: #071936;
        font-size: 24px;
        line-height: 1.08;
        font-weight: 1000;
        letter-spacing: -0.055em;
      }

      .ua-section-copy {
        margin: 9px 0 0;
        color: #405672;
        font-size: 14px;
        line-height: 1.5;
        font-weight: 650;
        letter-spacing: -0.02em;
      }

      .ua-chain-list {
        display: grid;
        gap: 10px;
      }

      .ua-chain-card {
        display: block;
        border: 1px solid color-mix(in srgb, var(--ua-regime) 55%, rgba(7, 25, 54, 0.18));
        border-radius: 22px;
        background:
          radial-gradient(circle at 8% 0%, color-mix(in srgb, var(--ua-regime) 16%, transparent), transparent 15rem),
          #ffffff;
        color: #071936;
        padding: 15px;
        text-decoration: none;
        box-shadow: 0 16px 40px rgba(7, 25, 54, 0.08);
      }

      .ua-chain-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .ua-chain-left {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 11px;
      }

      .ua-chain-icon {
        display: flex;
        width: 42px;
        height: 42px;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: var(--ua-chain);
        color: #ffffff;
        font-size: 24px;
        font-weight: 1000;
      }

      .ua-chain-copy {
        min-width: 0;
      }

      .ua-chain-name {
        color: #071936;
        font-size: 16px;
        line-height: 1.1;
        font-weight: 1000;
        letter-spacing: -0.035em;
      }

      .ua-chain-date {
        margin-top: 4px;
        color: #52657d;
        font-size: 12px;
        line-height: 1.25;
        font-weight: 750;
      }

      .ua-regime-pill {
        display: inline-flex;
        min-height: 28px;
        flex: 0 0 auto;
        align-items: center;
        border-radius: 999px;
        border: 1px solid var(--ua-regime);
        background: color-mix(in srgb, var(--ua-regime) 10%, transparent);
        color: var(--ua-regime);
        padding: 0 9px;
        font-size: 9px;
        font-weight: 1000;
        letter-spacing: 0.08em;
      }

      .ua-confidence-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 15px;
        color: #52657d;
        font-size: 10px;
        font-weight: 1000;
        letter-spacing: 0.13em;
        text-transform: uppercase;
      }

      .ua-confidence-row strong {
        color: var(--ua-regime);
        font-size: 12px;
        letter-spacing: 0.04em;
      }

      .ua-confidence-track {
        overflow: hidden;
        height: 8px;
        margin-top: 8px;
        border-radius: 999px;
        background: #d9e6f5;
      }

      .ua-confidence-fill {
        height: 100%;
        border-radius: inherit;
        background: var(--ua-regime);
      }

      .ua-axis-line {
        margin: 12px 0 0;
        color: #263a54;
        font-size: 12px;
        line-height: 1.45;
        font-weight: 750;
      }

      .ua-product-card,
      .ua-workflow-shell,
      .ua-plans-shell,
      .ua-links-shell {
        border-radius: 24px;
        background: #ffffff;
        padding: 18px;
        box-shadow: 0 16px 40px rgba(7, 25, 54, 0.08);
      }

      .ua-product-grid {
        display: grid;
        gap: 10px;
        margin-top: 14px;
      }

      .ua-product-row {
        display: grid;
        grid-template-columns: 72px 1fr;
        gap: 12px;
        border-top: 1px solid #e1ebf7;
        padding-top: 12px;
      }

      .ua-product-row:first-child {
        border-top: 0;
        padding-top: 0;
      }

      .ua-product-row strong {
        color: #1478ff;
        font-size: 12px;
        font-weight: 1000;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .ua-product-row span {
        color: #263a54;
        font-size: 13px;
        line-height: 1.45;
        font-weight: 700;
      }

      .ua-workflow-shell {
        overflow: hidden;
        padding: 0;
      }

      .ua-workflow-intro {
        padding: 18px 18px 0;
      }

      .ua-fictive-note {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-top: 12px;
        border-radius: 16px;
        border: 1px solid #cfe8ff;
        background: #eef8ff;
        color: #185f9f;
        padding: 10px 11px;
        font-size: 11px;
        line-height: 1.35;
        font-weight: 900;
      }

      .ua-fictive-note span {
        display: inline-flex;
        width: 17px;
        height: 17px;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: #1478ff;
        color: #ffffff;
        font-size: 11px;
        font-weight: 1000;
      }

      .ua-workflow-list {
        display: grid;
        gap: 16px;
        margin-top: 16px;
        padding: 0 12px 16px;
      }

      .ua-workflow-card {
        margin: 0;
      }

      .ua-workflow-link {
        display: block;
        overflow: hidden;
        border-radius: 18px;
        border: 1px solid #d7e5f5;
        background: #071936;
        text-decoration: none;
      }

      .ua-workflow-image-wrap {
        position: relative;
        aspect-ratio: 16 / 10;
        width: 100%;
        background: #071936;
      }

      .ua-workflow-image {
        object-fit: contain;
        padding: 0;
      }

      .ua-workflow-badge {
        position: absolute;
        right: 8px;
        bottom: 8px;
        z-index: 2;
        border-radius: 999px;
        background: rgba(7, 25, 54, 0.9);
        color: #ffffff;
        padding: 7px 9px;
        font-size: 9px;
        line-height: 1;
        font-weight: 1000;
        letter-spacing: 0.07em;
        text-transform: uppercase;
      }

      .ua-workflow-caption {
        display: flex;
        align-items: center;
        gap: 9px;
        margin-top: 8px;
        color: #071936;
      }

      .ua-workflow-caption span {
        display: flex;
        width: 26px;
        height: 26px;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: #1478ff;
        color: #ffffff;
        font-size: 12px;
        font-weight: 1000;
      }

      .ua-workflow-caption strong {
        color: #071936;
        font-size: 13px;
        line-height: 1.2;
        font-weight: 1000;
        letter-spacing: -0.02em;
      }

      .ua-regime-strip {
        display: flex;
        gap: 7px;
        overflow-x: auto;
        padding: 0 18px 18px;
        scrollbar-width: none;
      }

      .ua-regime-strip::-webkit-scrollbar {
        display: none;
      }

      .ua-regime-strip span {
        flex: 0 0 auto;
        border-radius: 999px;
        border: 1px solid #d7e5f5;
        background: #f3f8ff;
        color: #263a54;
        padding: 8px 10px;
        font-size: 10px;
        font-weight: 1000;
        letter-spacing: 0.06em;
      }

      .ua-plan-grid {
        display: grid;
        gap: 10px;
        margin-top: 14px;
      }

      .ua-plan-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        border-radius: 18px;
        padding: 15px;
        color: #071936;
        text-decoration: none;
      }

      .ua-plan-card strong {
        display: block;
        color: #071936;
        font-size: 16px;
        line-height: 1.1;
        font-weight: 1000;
        letter-spacing: -0.035em;
      }

      .ua-plan-card p {
        margin: 5px 0 0;
        color: #52657d;
        font-size: 12px;
        line-height: 1.35;
        font-weight: 750;
      }

      .ua-plan-card > span {
        flex: 0 0 auto;
        color: #1478ff;
        font-size: 18px;
        font-weight: 1000;
        letter-spacing: -0.04em;
      }

      .ua-plan-plain {
        border: 1px solid #d7e5f5;
        background: #f7fbff;
      }

      .ua-plan-blue {
        border: 1px solid #9dccff;
        background: #eaf4ff;
      }

      .ua-plan-violet {
        border: 1px solid #c8b9ff;
        background: #f2efff;
      }

      .ua-links {
        display: grid;
        gap: 9px;
        margin-top: 12px;
      }

      .ua-links a {
        display: flex;
        min-height: 48px;
        align-items: center;
        justify-content: space-between;
        border-radius: 16px;
        border: 1px solid #d7e5f5;
        background: #f7fbff;
        color: #071936;
        padding: 0 14px;
        text-decoration: none;
        font-size: 14px;
        font-weight: 900;
      }

      .ua-bottom-nav {
        position: fixed;
        z-index: 50;
        right: 0;
        bottom: 0;
        left: 0;
        padding-bottom: calc(env(safe-area-inset-bottom) + 8px);
        border-top: 1px solid rgba(7, 25, 54, 0.1);
        background: rgba(255, 255, 255, 0.97);
        box-shadow: 0 -16px 44px rgba(7, 25, 54, 0.16);
        backdrop-filter: blur(16px);
      }

      .ua-bottom-nav-inner {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        min-height: 72px;
      }

      .ua-bottom-nav a {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 6px;
        color: #405672;
        text-decoration: none;
        font-size: 12px;
        font-weight: 900;
      }

      .ua-bottom-nav a:first-child {
        color: #1478ff;
      }

      .ua-bottom-dot {
        width: 18px;
        height: 18px;
        border-radius: 6px;
        background: currentColor;
        opacity: 0.9;
      }

      .ua-modal {
        pointer-events: none;
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: stretch;
        justify-content: center;
        opacity: 0;
        transition: opacity 160ms ease;
      }

      .ua-modal:target {
        pointer-events: auto;
        opacity: 1;
      }

      .ua-modal-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(7, 16, 25, 0.92);
        backdrop-filter: blur(10px);
      }

      .ua-modal-panel {
        position: relative;
        z-index: 1;
        display: flex;
        width: 100%;
        height: 100svh;
        flex-direction: column;
        background: #071019;
      }

      .ua-modal-header {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: calc(env(safe-area-inset-top) + 12px) 14px 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: #071019;
      }

      .ua-modal-header span {
        display: block;
        color: #9fe8ff;
        font-size: 10px;
        font-weight: 1000;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .ua-modal-header strong {
        display: block;
        margin-top: 3px;
        color: #ffffff;
        font-size: 14px;
        line-height: 1.2;
        font-weight: 1000;
      }

      .ua-modal-header a {
        flex: 0 0 auto;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        background: rgba(255, 255, 255, 0.08);
        color: #ffffff;
        padding: 9px 12px;
        text-decoration: none;
        font-size: 12px;
        font-weight: 1000;
      }

      .ua-modal-scroll {
        flex: 1 1 auto;
        overflow: auto;
        background: #071019;
        -webkit-overflow-scrolling: touch;
      }

      .ua-modal-image {
        position: relative;
        width: 100%;
        min-height: 78svh;
        background: #071019;
      }

      .ua-modal-image .ua-workflow-image {
        object-fit: contain;
        padding: 8px;
      }

      .ua-modal-footer {
        flex: 0 0 auto;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        background: #071019;
        color: #dcecff;
        padding: 11px 14px calc(env(safe-area-inset-bottom) + 11px);
        text-align: center;
        font-size: 12px;
        line-height: 1.35;
        font-weight: 800;
      }

      @media (min-width: 720px) {
        .ua-mobile-compact {
          background:
            radial-gradient(circle at 20% 0%, rgba(37, 99, 235, 0.2), transparent 28rem),
            linear-gradient(180deg, #071019 0%, #081725 360px, #f3f8ff 360px, #f3f8ff 100%);
        }

        .ua-top,
        .ua-main {
          max-width: 720px;
          margin-inline: auto;
        }

        .ua-title {
          font-size: 46px;
        }

        .ua-copy {
          font-size: 17px;
        }
      }
    `}</style>
  );
}

export default async function MobileOverviewPage() {
  const [states, dataset, historyDays] = await Promise.all([
    buildChainStates(),
    readDatasetManifest(),
    computeHistoryDepthDays(),
  ]);

  const publishedAt = formatPublishedDate(dataset?.published_at);

  return (
    <div className="ua-mobile-compact">
      <MobileVisualStyles />

      <div className="ua-shell">
        <header className="ua-top">
          <div className="ua-topbar">
            <Link href="/" className="ua-brand" aria-label="Urd Atlas home">
              <img
                src="/web-bilder/ygg-transparent.png"
                alt=""
                aria-hidden="true"
              />
              <span className="ua-brand-word">Urd Atlas</span>
            </Link>

            <Link href="/?view=desktop" className="ua-desktop-link">
              Full site
            </Link>
          </div>

          <section className="ua-hero">
            <div className="ua-kicker">Mobile overview</div>

            <h1 className="ua-title">
              Daily blockchain regime data<span>.</span>
            </h1>

            <p className="ua-copy">
              Urd Atlas publishes daily Gold, Derived, and Meta JSON per chain:
              regime label, confidence, evidence, and provenance fields that
              can be joined to your own data by chain and date.
            </p>

            <div className="ua-actions">
              <Link href="/mobile/plans" className="ua-primary">
                View plans
              </Link>

              <a href="#workflow" className="ua-secondary">
                See workflow
              </a>
            </div>

            <div className="ua-status-row">
              <div className="ua-status-box">
                <span>Updated</span>
                <strong>{publishedAt ?? "—"}</strong>
                <p>latest publication</p>
              </div>

              <div className="ua-status-box">
                <span>Coverage</span>
                <strong>{historyDays ?? "—"}</strong>
                <p>published daily observations</p>
              </div>
            </div>
          </section>
        </header>

        <main className="ua-main">
          <section id="chains" className="ua-section">
            <div className="ua-section-head">
              <div className="ua-section-label">Current chain state</div>
              <h2 className="ua-section-title">Latest regime labels.</h2>
            </div>

            <div className="ua-chain-list">
              {states.map((state) => (
                <ChainCard key={state.chain} state={state} />
              ))}
            </div>
          </section>

          <section className="ua-section">
            <div className="ua-product-card">
              <div className="ua-section-label">Product</div>

              <h2 className="ua-section-title">
                Reference data, not a trading signal.
              </h2>

              <p className="ua-section-copy">
                The output is daily blockchain regime context. It describes
                network conditions; it does not provide investment advice,
                forecasts, or price signals.
              </p>

              <div className="ua-product-grid">
                <div className="ua-product-row">
                  <strong>Gold</strong>
                  <span>Daily measured blockchain fields per chain.</span>
                </div>

                <div className="ua-product-row">
                  <strong>Derived</strong>
                  <span>Transparent trend calculations such as MA7 and MA30.</span>
                </div>

                <div className="ua-product-row">
                  <strong>Meta</strong>
                  <span>
                    Regime label, confidence, drivers, and determinism hash.
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section id="workflow" className="ua-section">
            <div className="ua-workflow-shell">
              <div className="ua-workflow-intro">
                <div className="ua-section-label">Workflow</div>

                <h2 className="ua-section-title">
                  Join by chain and date.
                </h2>

                <p className="ua-section-copy">
                  Use Urd Atlas as a regime column on top of the data you
                  already analyze.
                </p>

                <div className="ua-fictive-note">
                  <span>i</span>
                  The data shown in these images is fictive example data.
                </div>
              </div>

              <div className="ua-workflow-list">
                {WORKFLOW_IMAGES.map((image, index) => (
                  <WorkflowCard
                    key={image.src}
                    image={image}
                    index={index}
                  />
                ))}
              </div>

              <div
                className="ua-regime-strip"
                aria-label="Urd Atlas regime labels"
              >
                {REGIME_LABELS.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            </div>
          </section>

          <section id="plans" className="ua-section">
            <div className="ua-plans-shell">
              <div className="ua-section-label">Plans</div>

              <h2 className="ua-section-title">
                Three active access levels.
              </h2>

              <p className="ua-section-copy">
                Free gives public browsing. Paid plans unlock daily JSON access.
              </p>

              <div className="ua-plan-grid">
                <PlanCard
                  name="Free"
                  price="$0"
                  tone="plain"
                  href="/mobile/plans"
                  description="Historical charts and public browsing."
                />

                <PlanCard
                  name="Single Chain"
                  price="$49"
                  tone="blue"
                  href="/mobile/plans"
                  description="One blockchain. Gold, Derived, and Meta JSON."
                />

                <PlanCard
                  name="Full Access"
                  price="$149"
                  tone="violet"
                  href="/mobile/plans"
                  description="All supported chains. Full daily JSON access."
                />
              </div>
            </div>
          </section>

          <section className="ua-section">
            <div className="ua-links-shell">
              <div className="ua-section-label">More</div>

              <div className="ua-links">
                <Link href="/mobile/track-record">
                  Track record <span>→</span>
                </Link>

                <Link href="/mobile/wiki">
                  Mobile wiki <span>→</span>
                </Link>

                <Link href="/dashboard">
                  Account <span>→</span>
                </Link>

                <Link href="/?view=desktop">
                  Full desktop site <span>→</span>
                </Link>
              </div>
            </div>
          </section>
        </main>

        <nav className="ua-bottom-nav" aria-label="Mobile navigation">
          <div className="ua-bottom-nav-inner">
            <Link href="/mobile">
              <span className="ua-bottom-dot" />
              Home
            </Link>

            <a href="#chains">
              <span className="ua-bottom-dot" />
              Chains
            </a>

            <a href="#workflow">
              <span className="ua-bottom-dot" />
              Workflow
            </a>

            <Link href="/mobile/plans">
              <span className="ua-bottom-dot" />
              Plans
            </Link>
          </div>
        </nav>
      </div>

      {WORKFLOW_IMAGES.map((image, index) => (
        <WorkflowModal key={`${image.src}-modal`} image={image} index={index} />
      ))}
    </div>
  );
}