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
    title: "Start with the data you already have",
    src: "/landing-workflows/urd-atlas-mobile-workflow-1.png",
    alt:
      "Fictive example data showing an existing dataset before Urd Atlas regime context is joined.",
  },
  {
    number: "2",
    title: "Join in daily Urd Atlas regime data",
    src: "/landing-workflows/urd-atlas-mobile-workflow-2.png",
    alt:
      "Fictive example data showing Urd Atlas regime, confidence, and evidence fields joined by date and chain.",
  },
  {
    number: "3",
    title: "Segment, filter, and report by regime",
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
      <div className="ua-chain-card-top">
        <div className="ua-chain-title-row">
          <div className="ua-chain-icon">{CHAIN_SYMBOLS[state.chain]}</div>

          <div className="ua-chain-title-copy">
            <div className="ua-chain-name">{state.name}</div>
            <div className="ua-chain-date">
              {state.asOf ?? "—"} ·{" "}
              {state.lagDays != null ? `${state.lagDays}d lag` : "—"}
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

      {state.oneLiner ? (
        <p className="ua-chain-oneliner">{state.oneLiner}</p>
      ) : null}

      <div className="ua-chain-footer">
        <span>Open chain overview →</span>
        <span>Mobile surface</span>
      </div>
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
        className="ua-workflow-image-link"
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

          <div className="ua-workflow-open-badge">
            Click for larger image
          </div>
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
        href="#workflow-examples"
        className="ua-modal-backdrop"
        aria-label="Close enlarged workflow image"
      />

      <div className="ua-modal-panel">
        <div className="ua-modal-header">
          <div>
            <span>Fictive example data · workflow {index + 1}</span>
            <strong>{image.title}</strong>
          </div>

          <a href="#workflow-examples">Close</a>
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
          Pinch to zoom if your browser supports it, or rotate your phone for a
          wider view.
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  description,
  tone,
}: {
  name: string;
  price: string;
  description: string;
  tone: "plain" | "blue" | "violet";
}) {
  return (
    <div className={`ua-plan-card ua-plan-${tone}`}>
      <div>
        <strong>{name}</strong>
        <p>{description}</p>
      </div>

      <span>{price}</span>
    </div>
  );
}

function MobileVisualStyles() {
  return (
    <style>{`
      .mobile-shell {
        background: #031329 !important;
        color: #f8fbff !important;
      }

      .mobile-shell main {
        margin-top: 0 !important;
        color: #f8fbff !important;
      }

      .mobile-shell header.sticky + main {
        margin-top: 0 !important;
      }

      .ua-mobile-v2,
      .ua-mobile-v2 * {
        box-sizing: border-box;
      }

      .ua-mobile-v2 {
        min-height: 100svh;
        overflow-x: hidden;
        background:
          radial-gradient(circle at 18% 4%, rgba(47, 124, 255, 0.24), transparent 28rem),
          radial-gradient(circle at 84% 28%, rgba(0, 224, 255, 0.10), transparent 22rem),
          linear-gradient(180deg, #020b17 0%, #031329 44%, #04101c 100%);
        color: #f8fbff;
        font-family: inherit;
      }

      .ua-shell-inner {
        min-height: 100svh;
        padding-bottom: 116px;
      }

      .ua-hero {
        position: relative;
        overflow: hidden;
        padding: calc(env(safe-area-inset-top) + 20px) 17px 38px;
        background:
          linear-gradient(180deg, rgba(2, 11, 23, 0.96) 0%, rgba(3, 19, 41, 0.94) 72%, rgba(4, 16, 28, 0.98) 100%);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      .ua-hero::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at 22% 20%, rgba(47, 124, 255, 0.20), transparent 24rem),
          linear-gradient(90deg, rgba(159, 232, 255, 0.06), transparent 42%);
      }

      .ua-topbar,
      .ua-hero-content {
        position: relative;
        z-index: 1;
      }

      .ua-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .ua-brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        color: #f8fbff;
        text-decoration: none;
      }

      .ua-brand-word {
        display: inline-flex;
        align-items: baseline;
        white-space: nowrap;
        font-size: 25px;
        line-height: 1;
        font-weight: 1000;
        letter-spacing: -0.055em;
      }

      .ua-brand-word span:first-child {
        color: #ffffff;
      }

      .ua-brand-word span:last-child {
        margin-left: 7px;
        color: #5aaeff;
      }

      .ua-brand img {
        width: 37px;
        height: 37px;
        object-fit: contain;
        opacity: 0.82;
      }

      .ua-menu-button {
        display: inline-flex;
        width: 56px;
        height: 56px;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(216, 233, 255, 0.18);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.03);
        color: #f8fbff;
        text-decoration: none;
        box-shadow: 0 16px 50px rgba(0, 0, 0, 0.24);
      }

      .ua-menu-lines,
      .ua-menu-lines::before,
      .ua-menu-lines::after {
        display: block;
        width: 18px;
        height: 2px;
        border-radius: 999px;
        background: #f8fbff;
      }

      .ua-menu-lines {
        position: relative;
      }

      .ua-menu-lines::before,
      .ua-menu-lines::after {
        content: "";
        position: absolute;
        left: 0;
      }

      .ua-menu-lines::before {
        top: -7px;
      }

      .ua-menu-lines::after {
        top: 7px;
      }

      .ua-hero-content {
        margin-top: 88px;
      }

      .ua-kicker {
        display: inline-flex;
        align-items: center;
        min-height: 34px;
        padding: 0 18px;
        border-radius: 999px;
        background: linear-gradient(180deg, rgba(47, 124, 255, 0.22), rgba(0, 224, 255, 0.12));
        color: #d9f3ff;
        font-size: 14px;
        font-weight: 1000;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        box-shadow: inset 0 0 0 1px rgba(159, 232, 255, 0.08);
      }

      .ua-hero-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: start;
        gap: 20px;
        margin-top: 30px;
      }

      .ua-hero-title {
        margin: 0;
        max-width: 480px;
        color: #ffffff;
        font-size: clamp(54px, 13.7vw, 78px);
        line-height: 1.13;
        font-weight: 1000;
        letter-spacing: -0.065em;
        text-wrap: balance;
        text-shadow: 0 8px 36px rgba(0, 0, 0, 0.35);
      }

      .ua-hero-title span {
        color: #2f8cff;
      }

      .ua-updated-card {
        width: 150px;
        margin-top: 24px;
        border-radius: 20px;
        background: #ffffff;
        color: #071019;
        padding: 17px 16px;
        text-align: center;
        box-shadow:
          0 22px 60px rgba(0, 0, 0, 0.28),
          inset 0 0 0 1px rgba(13, 36, 71, 0.08);
      }

      .ua-updated-card span {
        display: block;
        color: #1f7cff;
        font-size: 12px;
        font-weight: 1000;
        letter-spacing: 0.26em;
        text-transform: uppercase;
      }

      .ua-updated-card strong {
        display: block;
        margin-top: 9px;
        color: #071019;
        font-size: 16px;
        font-weight: 1000;
        letter-spacing: -0.02em;
      }

      .ua-hero-copy {
        margin: 34px 0 0;
        max-width: 620px;
        color: #f8fbff;
        font-size: 24px;
        line-height: 1.58;
        font-weight: 600;
        letter-spacing: -0.025em;
      }

      .ua-hero-actions {
        display: flex;
        gap: 18px;
        margin-top: 36px;
        overflow-x: auto;
        padding-bottom: 2px;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
      }

      .ua-hero-actions::-webkit-scrollbar {
        display: none;
      }

      .ua-primary-button,
      .ua-secondary-button {
        display: inline-flex;
        min-height: 72px;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        gap: 16px;
        border-radius: 22px;
        padding: 0 30px;
        text-decoration: none;
        font-size: 22px;
        font-weight: 1000;
        letter-spacing: -0.04em;
        white-space: nowrap;
      }

      .ua-primary-button {
        background: linear-gradient(180deg, #2f8cff 0%, #0d6efd 100%);
        color: #ffffff;
        box-shadow: 0 22px 70px rgba(13, 110, 253, 0.35);
      }

      .ua-secondary-button {
        border: 1px solid rgba(255, 255, 255, 0.72);
        background: rgba(255, 255, 255, 0.02);
        color: #ffffff;
      }

      .ua-arrow {
        font-size: 30px;
        line-height: 1;
      }

      .ua-external-icon {
        position: relative;
        width: 24px;
        height: 24px;
        border: 3px solid currentColor;
        border-top: 0;
        border-left: 0;
        opacity: 0.92;
      }

      .ua-external-icon::before {
        content: "";
        position: absolute;
        right: -3px;
        top: -3px;
        width: 16px;
        height: 16px;
        border-top: 3px solid currentColor;
        border-right: 3px solid currentColor;
      }

      .ua-content {
        padding: 0 17px 26px;
      }

      .ua-glance-card {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0;
        transform: translateY(-1px);
        overflow: hidden;
        border-radius: 28px;
        background: #ffffff;
        box-shadow: 0 28px 80px rgba(0, 0, 0, 0.24);
      }

      .ua-glance-cell {
        min-height: 150px;
        padding: 28px 26px;
      }

      .ua-glance-cell + .ua-glance-cell {
        border-left: 1px solid rgba(13, 36, 71, 0.10);
      }

      .ua-glance-label {
        display: block;
        color: #344b68;
        font-size: 13px;
        font-weight: 1000;
        letter-spacing: 0.24em;
        text-transform: uppercase;
      }

      .ua-glance-value {
        display: block;
        margin-top: 26px;
        color: #1478ff;
        font-size: 56px;
        line-height: 0.9;
        font-weight: 1000;
        letter-spacing: -0.055em;
      }

      .ua-glance-note {
        display: block;
        margin-top: 18px;
        color: #344b68;
        font-size: 19px;
        line-height: 1.2;
        font-weight: 800;
        letter-spacing: -0.035em;
      }

      .ua-section {
        margin-top: 34px;
      }

      .ua-section-header {
        margin-bottom: 20px;
      }

      .ua-section-kicker {
        color: #f8fbff;
        font-size: 15px;
        font-weight: 1000;
        letter-spacing: 0.25em;
        text-transform: uppercase;
      }

      .ua-section-title {
        margin: 12px 0 0;
        color: #ffffff;
        font-size: 38px;
        line-height: 1.05;
        font-weight: 1000;
        letter-spacing: -0.055em;
      }

      .ua-section-copy {
        margin: 13px 0 0;
        color: #d8e9ff;
        font-size: 18px;
        line-height: 1.56;
        font-weight: 650;
        letter-spacing: -0.025em;
      }

      .ua-chain-list {
        display: grid;
        gap: 18px;
      }

      .ua-chain-card {
        display: block;
        overflow: hidden;
        border: 1px solid color-mix(in srgb, var(--ua-regime) 82%, transparent);
        border-radius: 28px;
        padding: 28px;
        background:
          radial-gradient(circle at 10% 10%, color-mix(in srgb, var(--ua-regime) 18%, transparent), transparent 22rem),
          linear-gradient(145deg, color-mix(in srgb, var(--ua-regime) 16%, #031329 84%), #031329);
        color: #ffffff;
        text-decoration: none;
        box-shadow:
          0 26px 80px rgba(0, 0, 0, 0.32),
          inset 0 0 0 1px rgba(255, 255, 255, 0.02);
      }

      .ua-chain-card-top {
        display: flex;
        justify-content: space-between;
        gap: 18px;
      }

      .ua-chain-title-row {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 20px;
      }

      .ua-chain-icon {
        display: flex;
        width: 86px;
        height: 86px;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: var(--ua-chain);
        color: #ffffff;
        font-size: 48px;
        line-height: 1;
        font-weight: 1000;
        box-shadow: 0 22px 60px color-mix(in srgb, var(--ua-chain) 32%, transparent);
      }

      .ua-chain-title-copy {
        min-width: 0;
      }

      .ua-chain-name {
        color: #ffffff;
        font-size: 27px;
        line-height: 1.1;
        font-weight: 1000;
        letter-spacing: -0.045em;
      }

      .ua-chain-date {
        margin-top: 9px;
        color: #c9dcf3;
        font-size: 17px;
        line-height: 1.25;
        font-weight: 700;
        letter-spacing: -0.025em;
      }

      .ua-regime-pill {
        display: inline-flex;
        height: 44px;
        flex: 0 0 auto;
        align-items: center;
        border: 1px solid var(--ua-regime);
        border-radius: 999px;
        padding: 0 18px;
        background: color-mix(in srgb, var(--ua-regime) 13%, transparent);
        color: var(--ua-regime);
        font-size: 14px;
        font-weight: 1000;
        letter-spacing: 0.14em;
      }

      .ua-confidence-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin-top: 42px;
        color: var(--ua-regime);
        font-size: 17px;
        font-weight: 1000;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .ua-confidence-row strong {
        color: var(--ua-regime);
        font-size: 19px;
        letter-spacing: 0.08em;
      }

      .ua-confidence-track {
        overflow: hidden;
        height: 16px;
        margin-top: 18px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.88);
        box-shadow: inset 0 0 0 1px rgba(3, 19, 41, 0.18);
      }

      .ua-confidence-fill {
        height: 100%;
        border-radius: inherit;
        background: var(--ua-regime);
      }

      .ua-axis-line {
        margin: 34px 0 0;
        color: #ffffff;
        font-size: 20px;
        line-height: 1.45;
        font-weight: 700;
        letter-spacing: -0.03em;
      }

      .ua-chain-oneliner {
        margin: 16px 0 0;
        color: #d8e9ff;
        font-size: 16px;
        line-height: 1.55;
        font-weight: 650;
        letter-spacing: -0.02em;
      }

      .ua-chain-footer {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        margin-top: 34px;
        color: #5aaeff;
        font-size: 17px;
        font-weight: 900;
        letter-spacing: -0.03em;
      }

      .ua-chain-footer span:last-child {
        color: #9ab0cc;
        font-weight: 700;
      }

      .ua-workflow-shell {
        margin-top: 38px;
        border-radius: 32px;
        border: 1px solid rgba(216, 233, 255, 0.14);
        background:
          radial-gradient(circle at 8% 6%, rgba(47, 124, 255, 0.18), transparent 20rem),
          linear-gradient(180deg, rgba(7, 26, 49, 0.82), rgba(3, 19, 41, 0.96));
        padding: 24px 0 22px;
        box-shadow: 0 28px 90px rgba(0, 0, 0, 0.28);
      }

      .ua-workflow-intro {
        padding: 0 22px;
      }

      .ua-fictive-note {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        margin-top: 18px;
        border-radius: 999px;
        border: 1px solid rgba(159, 232, 255, 0.26);
        background: rgba(0, 224, 255, 0.08);
        color: #d9f3ff;
        padding: 10px 14px;
        font-size: 13px;
        line-height: 1.25;
        font-weight: 1000;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .ua-fictive-note span {
        display: inline-flex;
        width: 20px;
        height: 20px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        border: 1px solid #00e0ff;
        color: #00e0ff;
        font-size: 13px;
        font-weight: 1000;
      }

      .ua-workflow-list {
        display: grid;
        gap: 24px;
        margin-top: 24px;
        padding: 0 22px;
      }

      .ua-workflow-card {
        margin: 0;
      }

      .ua-workflow-image-link {
        display: block;
        overflow: hidden;
        border-radius: 25px;
        border: 1px solid rgba(216, 233, 255, 0.14);
        background: #06182d;
        box-shadow: 0 22px 70px rgba(0, 0, 0, 0.32);
      }

      .ua-workflow-image-wrap {
        position: relative;
        aspect-ratio: 16 / 10;
        width: 100%;
        background: #06182d;
      }

      .ua-workflow-image {
        object-fit: contain;
        padding: 0;
      }

      .ua-workflow-open-badge {
        position: absolute;
        right: 12px;
        bottom: 12px;
        z-index: 2;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.28);
        background: rgba(3, 19, 41, 0.88);
        color: #ffffff;
        padding: 9px 12px;
        font-size: 11px;
        line-height: 1;
        font-weight: 1000;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        box-shadow: 0 14px 36px rgba(0, 0, 0, 0.35);
      }

      .ua-workflow-caption {
        display: flex;
        align-items: center;
        gap: 13px;
        margin-top: 14px;
        color: #ffffff;
      }

      .ua-workflow-caption span {
        display: flex;
        width: 38px;
        height: 38px;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: #1478ff;
        color: #ffffff;
        font-size: 17px;
        font-weight: 1000;
      }

      .ua-workflow-caption strong {
        color: #ffffff;
        font-size: 17px;
        line-height: 1.25;
        font-weight: 1000;
        letter-spacing: -0.025em;
      }

      .ua-regime-strip {
        display: flex;
        gap: 9px;
        overflow-x: auto;
        margin-top: 24px;
        padding: 0 22px 5px;
        scrollbar-width: none;
      }

      .ua-regime-strip::-webkit-scrollbar {
        display: none;
      }

      .ua-regime-strip span {
        flex: 0 0 auto;
        border: 1px solid rgba(216, 233, 255, 0.18);
        border-radius: 999px;
        padding: 10px 13px;
        color: #f8fbff;
        background: rgba(255, 255, 255, 0.04);
        font-size: 12px;
        font-weight: 1000;
        letter-spacing: 0.08em;
      }

      .ua-plan-grid {
        display: grid;
        gap: 14px;
      }

      .ua-plan-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        border-radius: 24px;
        padding: 22px;
        color: #ffffff;
        box-shadow: 0 22px 70px rgba(0, 0, 0, 0.22);
      }

      .ua-plan-card strong {
        display: block;
        color: #ffffff;
        font-size: 21px;
        font-weight: 1000;
        letter-spacing: -0.04em;
      }

      .ua-plan-card p {
        margin: 8px 0 0;
        color: #d8e9ff;
        font-size: 15px;
        line-height: 1.45;
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      .ua-plan-card > span {
        flex: 0 0 auto;
        color: #ffffff;
        font-size: 24px;
        font-weight: 1000;
        letter-spacing: -0.045em;
      }

      .ua-plan-plain {
        border: 1px solid rgba(216, 233, 255, 0.16);
        background: rgba(255, 255, 255, 0.04);
      }

      .ua-plan-blue {
        border: 1px solid rgba(47, 140, 255, 0.46);
        background: linear-gradient(145deg, rgba(47, 140, 255, 0.26), rgba(3, 19, 41, 0.92));
      }

      .ua-plan-violet {
        border: 1px solid rgba(151, 113, 255, 0.46);
        background: linear-gradient(145deg, rgba(151, 113, 255, 0.25), rgba(3, 19, 41, 0.92));
      }

      .ua-mobile-note {
        margin-top: 34px;
        border-radius: 28px;
        border: 1px solid rgba(255, 211, 112, 0.34);
        background: linear-gradient(145deg, rgba(255, 211, 112, 0.14), rgba(3, 19, 41, 0.94));
        padding: 24px;
      }

      .ua-mobile-note strong {
        display: block;
        color: #ffe6a7;
        font-size: 15px;
        font-weight: 1000;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      .ua-mobile-note p {
        margin: 14px 0 0;
        color: #fff6db;
        font-size: 17px;
        line-height: 1.55;
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      .ua-mobile-note a {
        display: inline-flex;
        min-height: 50px;
        align-items: center;
        justify-content: center;
        margin-top: 20px;
        border-radius: 18px;
        background: #ffffff;
        color: #071019;
        padding: 0 22px;
        text-decoration: none;
        font-size: 15px;
        font-weight: 1000;
      }

      .ua-section-links {
        display: grid;
        gap: 12px;
        margin-top: 18px;
      }

      .ua-section-links a {
        display: flex;
        min-height: 56px;
        align-items: center;
        justify-content: space-between;
        border-radius: 20px;
        border: 1px solid rgba(216, 233, 255, 0.16);
        background: rgba(255, 255, 255, 0.04);
        color: #ffffff;
        padding: 0 18px;
        text-decoration: none;
        font-size: 16px;
        font-weight: 900;
        letter-spacing: -0.02em;
      }

      .ua-bottom-nav {
        position: fixed;
        z-index: 50;
        right: 0;
        bottom: 0;
        left: 0;
        padding-bottom: calc(env(safe-area-inset-bottom) + 9px);
        border-top: 1px solid rgba(13, 36, 71, 0.10);
        background: rgba(255, 255, 255, 0.97);
        box-shadow: 0 -20px 70px rgba(0, 0, 0, 0.24);
        backdrop-filter: blur(16px);
      }

      .ua-bottom-nav-inner {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        min-height: 86px;
      }

      .ua-bottom-nav a {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 8px;
        color: #293b54;
        text-decoration: none;
        font-size: 14px;
        font-weight: 900;
        letter-spacing: -0.02em;
      }

      .ua-bottom-nav a:first-child {
        color: #1478ff;
      }

      .ua-bottom-icon {
        display: block;
        width: 27px;
        height: 27px;
        position: relative;
      }

      .ua-icon-home {
        background: currentColor;
        clip-path: polygon(50% 0%, 100% 42%, 86% 42%, 86% 100%, 58% 100%, 58% 64%, 42% 64%, 42% 100%, 14% 100%, 14% 42%, 0% 42%);
      }

      .ua-icon-bars::before,
      .ua-icon-bars::after,
      .ua-icon-bars span {
        content: "";
        position: absolute;
        bottom: 0;
        width: 7px;
        border-radius: 999px 999px 0 0;
        background: currentColor;
      }

      .ua-icon-bars::before {
        left: 0;
        height: 13px;
      }

      .ua-icon-bars span {
        left: 10px;
        height: 22px;
      }

      .ua-icon-bars::after {
        right: 0;
        height: 27px;
      }

      .ua-icon-plans {
        border: 3px solid currentColor;
        border-radius: 5px;
      }

      .ua-icon-plans::before,
      .ua-icon-plans::after {
        content: "";
        position: absolute;
        left: 5px;
        right: 5px;
        height: 3px;
        border-radius: 999px;
        background: currentColor;
      }

      .ua-icon-plans::before {
        top: 7px;
      }

      .ua-icon-plans::after {
        top: 15px;
      }

      .ua-icon-account {
        border-radius: 999px 999px 45% 45%;
        background:
          radial-gradient(circle at 50% 28%, currentColor 0 25%, transparent 26%),
          radial-gradient(ellipse at 50% 92%, currentColor 0 44%, transparent 45%);
      }

      .ua-modal {
        pointer-events: none;
        position: fixed;
        inset: 0;
        z-index: 90;
        display: flex;
        align-items: stretch;
        justify-content: center;
        padding: 0;
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
        background: rgba(2, 11, 23, 0.92);
        backdrop-filter: blur(10px);
      }

      .ua-modal-panel {
        position: relative;
        z-index: 1;
        display: flex;
        width: 100%;
        max-width: 980px;
        height: 100svh;
        flex-direction: column;
        background: #020b17;
        box-shadow: 0 34px 120px rgba(0, 0, 0, 0.62);
      }

      .ua-modal-header {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: calc(env(safe-area-inset-top) + 14px) 16px 14px;
        border-bottom: 1px solid rgba(216, 233, 255, 0.12);
        background: rgba(3, 19, 41, 0.98);
      }

      .ua-modal-header span {
        display: block;
        color: #9fe8ff;
        font-size: 11px;
        font-weight: 1000;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .ua-modal-header strong {
        display: block;
        margin-top: 4px;
        color: #ffffff;
        font-size: 16px;
        font-weight: 1000;
        letter-spacing: -0.02em;
      }

      .ua-modal-header a {
        flex: 0 0 auto;
        border-radius: 999px;
        border: 1px solid rgba(216, 233, 255, 0.22);
        background: rgba(255, 255, 255, 0.06);
        color: #ffffff;
        padding: 10px 13px;
        text-decoration: none;
        font-size: 12px;
        font-weight: 1000;
      }

      .ua-modal-scroll {
        flex: 1 1 auto;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
        background: #020b17;
      }

      .ua-modal-image {
        position: relative;
        width: 100%;
        min-height: 76svh;
        background: #020b17;
      }

      .ua-modal-image .ua-workflow-image {
        object-fit: contain;
        padding: 8px;
      }

      .ua-modal-footer {
        flex: 0 0 auto;
        border-top: 1px solid rgba(216, 233, 255, 0.12);
        background: rgba(3, 19, 41, 0.98);
        color: #d8e9ff;
        padding: 12px 16px calc(env(safe-area-inset-bottom) + 12px);
        text-align: center;
        font-size: 12px;
        font-weight: 800;
        line-height: 1.35;
      }

      @media (max-width: 680px) {
        .ua-hero {
          padding-inline: 17px;
        }

        .ua-hero-grid {
          grid-template-columns: 1fr;
        }

        .ua-updated-card {
          position: absolute;
          top: 176px;
          right: 0;
          width: 150px;
        }

        .ua-hero-title {
          max-width: 360px;
          padding-right: 120px;
        }

        .ua-hero-copy {
          max-width: 365px;
          font-size: 18px;
          line-height: 1.55;
        }

        .ua-primary-button,
        .ua-secondary-button {
          min-height: 58px;
          border-radius: 18px;
          padding-inline: 22px;
          font-size: 17px;
        }

        .ua-external-icon {
          width: 19px;
          height: 19px;
          border-width: 2px;
        }

        .ua-external-icon::before {
          right: -2px;
          top: -2px;
          width: 13px;
          height: 13px;
          border-top-width: 2px;
          border-right-width: 2px;
        }

        .ua-glance-cell {
          min-height: 128px;
          padding: 22px 22px;
        }

        .ua-glance-value {
          font-size: 48px;
        }

        .ua-glance-note {
          font-size: 15px;
        }

        .ua-chain-card {
          padding: 24px;
        }

        .ua-chain-icon {
          width: 64px;
          height: 64px;
          font-size: 36px;
        }

        .ua-chain-name {
          font-size: 24px;
        }

        .ua-regime-pill {
          height: 38px;
          padding-inline: 13px;
          font-size: 12px;
        }

        .ua-axis-line {
          font-size: 17px;
        }

        .ua-chain-footer {
          font-size: 15px;
        }
      }

      @media (max-width: 430px) {
        .ua-brand-word {
          font-size: 21px;
        }

        .ua-brand img {
          width: 31px;
          height: 31px;
        }

        .ua-menu-button {
          width: 48px;
          height: 48px;
        }

        .ua-hero-content {
          margin-top: 74px;
        }

        .ua-kicker {
          min-height: 30px;
          padding-inline: 14px;
          font-size: 12px;
          letter-spacing: 0.22em;
        }

        .ua-updated-card {
          top: 154px;
          width: 118px;
          padding: 13px 11px;
          border-radius: 16px;
        }

        .ua-updated-card span {
          font-size: 10px;
        }

        .ua-updated-card strong {
          font-size: 13px;
        }

        .ua-hero-title {
          max-width: 330px;
          padding-right: 82px;
          font-size: 45px;
        }

        .ua-hero-copy {
          font-size: 15px;
        }

        .ua-hero-actions {
          gap: 12px;
        }

        .ua-primary-button,
        .ua-secondary-button {
          min-height: 48px;
          padding-inline: 18px;
          border-radius: 14px;
          font-size: 14px;
        }

        .ua-glance-cell {
          min-height: 108px;
          padding: 18px 19px;
        }

        .ua-glance-label {
          font-size: 10px;
        }

        .ua-glance-value {
          margin-top: 19px;
          font-size: 38px;
        }

        .ua-glance-note {
          margin-top: 11px;
          font-size: 12px;
        }

        .ua-section-title {
          font-size: 30px;
        }

        .ua-section-copy {
          font-size: 15px;
        }

        .ua-chain-card {
          padding: 18px;
        }

        .ua-chain-title-row {
          gap: 13px;
        }

        .ua-chain-icon {
          width: 48px;
          height: 48px;
          font-size: 29px;
        }

        .ua-chain-name {
          font-size: 19px;
        }

        .ua-chain-date {
          font-size: 12px;
        }

        .ua-regime-pill {
          height: 30px;
          padding-inline: 9px;
          font-size: 10px;
          letter-spacing: 0.08em;
        }

        .ua-confidence-row {
          margin-top: 30px;
          font-size: 13px;
        }

        .ua-confidence-row strong {
          font-size: 13px;
        }

        .ua-confidence-track {
          height: 10px;
        }

        .ua-axis-line {
          margin-top: 24px;
          font-size: 13px;
        }

        .ua-chain-oneliner {
          font-size: 12px;
        }

        .ua-chain-footer {
          margin-top: 24px;
          font-size: 12px;
        }

        .ua-workflow-list {
          gap: 18px;
          padding-inline: 14px;
        }

        .ua-workflow-shell {
          margin-inline: -4px;
        }

        .ua-fictive-note {
          align-items: flex-start;
          border-radius: 18px;
          font-size: 11px;
          letter-spacing: 0.06em;
        }

        .ua-workflow-open-badge {
          right: 8px;
          bottom: 8px;
          padding: 8px 10px;
          font-size: 9px;
          letter-spacing: 0.06em;
        }

        .ua-plan-card strong {
          font-size: 17px;
        }

        .ua-plan-card p {
          font-size: 12px;
        }

        .ua-plan-card > span {
          font-size: 19px;
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
    <div className="ua-mobile-v2">
      <MobileVisualStyles />

      <div className="ua-shell-inner">
        <section className="ua-hero">
          <div className="ua-topbar">
            <Link href="/" className="ua-brand" aria-label="Urd Atlas home">
              <span className="ua-brand-word">
                <span>URD</span>
                <span>ATLAS</span>
              </span>

              <img
                src="/web-bilder/ygg-transparent.png"
                alt=""
                aria-hidden="true"
              />
            </Link>

            <a
              href="#mobile-sections"
              className="ua-menu-button"
              aria-label="Jump to mobile sections"
            >
              <span className="ua-menu-lines" aria-hidden="true" />
            </a>
          </div>

          <div className="ua-hero-content">
            <div className="ua-kicker">Urd Atlas Mobile</div>

            <div className="ua-hero-grid">
              <h1 className="ua-hero-title">
                Blockchain regime reference data<span>.</span>
              </h1>

              <div className="ua-updated-card">
                <span>Updated</span>
                <strong>{publishedAt ?? "—"}</strong>
              </div>
            </div>

            <p className="ua-hero-copy">
              This is the simplified mobile experience. Desktop contains the
              full analytical workflow, methodology surface, and deeper data
              tooling.
            </p>

            <div className="ua-hero-actions">
              <Link href="/mobile/plans" className="ua-primary-button">
                View plans <span className="ua-arrow">›</span>
              </Link>

              <Link href="/?view=desktop" className="ua-secondary-button">
                Open desktop site <span className="ua-external-icon" />
              </Link>
            </div>
          </div>
        </section>

        <main className="ua-content">
          <section className="ua-glance-card" aria-label="Coverage at a glance">
            <div className="ua-glance-cell">
              <span className="ua-glance-label">Coverage at a glance</span>
              <span className="ua-glance-value">{historyDays ?? "—"}</span>
              <span className="ua-glance-note">
                published daily observations
              </span>
            </div>

            <div className="ua-glance-cell">
              <span className="ua-glance-label">Chains</span>
              <span className="ua-glance-value">4</span>
              <span className="ua-glance-note">BTC · ETH · ARB · BASE</span>
            </div>
          </section>

          <section id="current-chain-state" className="ua-section">
            <div className="ua-section-header">
              <div className="ua-section-kicker">Current chain state</div>
            </div>

            <div className="ua-chain-list">
              {states.map((state) => (
                <ChainCard key={state.chain} state={state} />
              ))}
            </div>
          </section>

          <section id="workflow-examples" className="ua-workflow-shell">
            <div className="ua-workflow-intro">
              <div className="ua-section-kicker">Workflow examples</div>

              <h2 className="ua-section-title">
                A regime column for the data you already have.
              </h2>

              <p className="ua-section-copy">
                Your data tells you what happened. Urd Atlas tells you what
                kind of blockchain day it was when it happened. Join by chain
                and date, then segment your own data by the published regime
                label.
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

            <div className="ua-regime-strip" aria-label="Urd Atlas regime labels">
              {REGIME_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </section>

          <section id="plans" className="ua-section">
            <div className="ua-section-header">
              <div className="ua-section-kicker">Subscription access</div>

              <h2 className="ua-section-title">
                Three active access levels.
              </h2>

              <p className="ua-section-copy">
                No separate full-history package is shown on mobile. The active
                entry points are Free, Single Chain, and Full Access.
              </p>
            </div>

            <div className="ua-plan-grid">
              <PlanCard
                name="Free"
                price="$0"
                tone="plain"
                description="Historical charts and public browsing."
              />

              <PlanCard
                name="Single Chain"
                price="$49"
                tone="blue"
                description="One blockchain. Gold, Derived, and Meta JSON access."
              />

              <PlanCard
                name="Full Access"
                price="$149"
                tone="violet"
                description="All supported chains. Full daily JSON access."
              />
            </div>
          </section>

          <section className="ua-mobile-note">
            <strong>Mobile limitations</strong>

            <p>
              This mobile surface is optimized for quick reading and account
              conversion. The full methodology, verification material, schema
              reference, and deeper analytical workflow are desktop-first.
            </p>

            <Link href="/?view=desktop">Open desktop experience</Link>
          </section>

          <section id="mobile-sections" className="ua-section">
            <div className="ua-section-header">
              <div className="ua-section-kicker">Mobile sections</div>
            </div>

            <div className="ua-section-links">
              <Link href="/mobile/track-record">
                Track record <span>→</span>
              </Link>

              <Link href="/mobile/plans">
                Plans <span>→</span>
              </Link>

              <Link href="/mobile/wiki">
                Wiki <span>→</span>
              </Link>

              <Link href="/dashboard">
                Account <span>→</span>
              </Link>
            </div>
          </section>
        </main>

        <nav className="ua-bottom-nav" aria-label="Mobile navigation">
          <div className="ua-bottom-nav-inner">
            <Link href="/mobile">
              <span className="ua-bottom-icon ua-icon-home" />
              Overview
            </Link>

            <a href="#current-chain-state">
              <span className="ua-bottom-icon ua-icon-bars">
                <span />
              </span>
              Chains
            </a>

            <Link href="/mobile/plans">
              <span className="ua-bottom-icon ua-icon-plans" />
              Plans
            </Link>

            <Link href="/dashboard">
              <span className="ua-bottom-icon ua-icon-account" />
              Account
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