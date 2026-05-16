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
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import MobileRouteMenu from "@/components/mobile/MobileRouteMenu";

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
    title: "Your dataset",
    src: "/landing-workflows/urd-atlas-mobile-workflow-1.png",
    alt:
      "Fictive example data showing an external dataset before Urd Atlas regime context is joined.",
  },
  {
    number: "2",
    title: "Join Urd Atlas",
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

const REGIME_EXPLAINERS = [
  {
    label: "STABLE",
    text: "Normal network conditions relative to recent history.",
  },
  {
    label: "HEATING",
    text: "Activity is elevated and trend-confirmed. The short-term trend must run ahead of the medium-term baseline.",
  },
  {
    label: "CONGESTED",
    text: "Friction, fees, failed transactions, or utilization are elevated enough to mark congestion.",
  },
  {
    label: "CHEAP",
    text: "Friction is unusually low relative to the chain’s own history.",
  },
  {
    label: "UNKNOWN/DEGRADED",
    text: "Available evidence is not sufficient for a confident regime label.",
  },
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
  const demand = formatAxisLevel(state.scorecard?.demand?.level);
  const friction = formatAxisLevel(state.scorecard?.friction?.level);
  const capacity = formatAxisLevel(state.scorecard?.capacity?.level);

  return (
    <Link
      href={`/mobile/chain/${state.chain}`}
      className="ua-chain-row"
      style={style}
    >
      <div className="ua-chain-row-top">
        <div className="ua-chain-token">{CHAIN_SYMBOLS[state.chain]}</div>

        <div className="ua-chain-copy">
          <strong>{state.name}</strong>
          <span>
            {state.asOf ?? "—"}
            {state.lagDays != null ? ` · ${state.lagDays}d lag` : ""}
          </span>
        </div>

        <div className="ua-regime-pill">{label}</div>
      </div>

      <div className="ua-chain-meter-line">
        <span>Confidence</span>
        <strong>
          {typeof state.confidenceScore === "number"
            ? state.confidenceScore.toFixed(3)
            : "—"}
        </strong>
      </div>

      <div className="ua-chain-meter">
        <div style={{ width: `${confidencePct}%` }} />
      </div>

      <p>
        Demand {demand} · Friction {friction} · Capacity {capacity}
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
        className="ua-workflow-image-link"
        aria-label={`${image.title}. Open larger workflow image.`}
      >
        <div className="ua-workflow-image-wrap">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="92vw"
            className="ua-workflow-image"
            priority={index === 0}
          />

          <div className="ua-workflow-badge">Tap to enlarge</div>
        </div>
      </a>

      <figcaption>
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
          <div className="ua-modal-image-stage">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="1448px"
              className="ua-modal-image"
              priority={index === 0}
            />
          </div>
        </div>

        <div className="ua-modal-foot">
          Pan the image sideways. Rotate your phone for the widest view.
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  text,
  tone,
}: {
  name: string;
  price: string;
  text: string;
  tone: "plain" | "blue" | "orange";
}) {
  return (
    <Link href="/mobile/plans" className={`ua-plan ua-plan-${tone}`}>
      <div>
        <strong>{name}</strong>
        <span>{text}</span>
      </div>

      <b>{price}</b>
    </Link>
  );
}

function MobileStyles() {
  return (
    <style>{`
      .ua-mobile,
      .ua-mobile * {
        box-sizing: border-box;
      }

      .ua-mobile {
        min-height: 100svh;
        overflow-x: hidden;
        background:
          radial-gradient(circle at 18% -5%, rgba(77, 158, 255, 0.28), transparent 18rem),
          radial-gradient(circle at 92% 8%, rgba(255, 149, 64, 0.13), transparent 16rem),
          linear-gradient(180deg, #040b14 0%, #071425 42%, #091a2e 100%);
        color: #edf7ff;
        font-family: inherit;
      }

      .ua-page {
        min-height: 100svh;
        padding-bottom: 96px;
      }

      .ua-hero {
        position: relative;
        isolation: isolate;
        overflow: hidden;
        padding: calc(env(safe-area-inset-top) + 16px) 16px 22px;
      }

      .ua-hero::before {
        content: "";
        position: absolute;
        inset: 0;
        z-index: -2;
        background:
          linear-gradient(145deg, rgba(255,255,255,0.09), transparent 30%),
          repeating-linear-gradient(
            115deg,
            rgba(255,255,255,0.025) 0,
            rgba(255,255,255,0.025) 1px,
            transparent 1px,
            transparent 20px
          );
        opacity: 0.7;
      }

      .ua-hero::after {
        content: "";
        position: absolute;
        right: -78px;
        top: -92px;
        z-index: -1;
        width: 230px;
        height: 230px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(255, 149, 64, 0.22), transparent 60%);
        filter: blur(10px);
      }

      .ua-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .ua-brand {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        color: #ffffff;
        text-decoration: none;
      }

      .ua-brand img {
        width: 30px;
        height: 30px;
        object-fit: contain;
        filter:
          drop-shadow(0 0 12px rgba(81, 178, 255, 0.45))
          drop-shadow(0 8px 18px rgba(0, 0, 0, 0.32));
      }

      .ua-brand span {
        color: #ffffff;
        font-size: 20px;
        font-weight: 1000;
        letter-spacing: -0.045em;
      }

      .ua-hero-body {
        margin-top: 28px;
      }

      .ua-kicker {
        display: inline-flex;
        min-height: 26px;
        align-items: center;
        border: 1px solid rgba(126, 204, 255, 0.18);
        border-radius: 999px;
        background: linear-gradient(180deg, rgba(126,204,255,0.14), rgba(126,204,255,0.045));
        color: #bfe9ff;
        padding: 0 10px;
        font-size: 9px;
        font-weight: 1000;
        letter-spacing: 0.19em;
        text-transform: uppercase;
      }

      .ua-title {
        margin: 11px 0 0;
        max-width: 380px;
        color: #ffffff;
        font-size: 37px;
        line-height: 1.01;
        font-weight: 1000;
        letter-spacing: -0.071em;
        text-shadow:
          0 14px 40px rgba(0,0,0,0.45),
          0 0 32px rgba(81,178,255,0.12);
      }

      .ua-title span {
        color: #ff9a4a;
      }

      .ua-copy {
        margin: 12px 0 0;
        max-width: 400px;
        color: #d9eaff;
        font-size: 14px;
        line-height: 1.5;
        font-weight: 650;
        letter-spacing: -0.02em;
      }

      .ua-hero-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 17px;
      }

      .ua-hero-actions a {
        display: inline-flex;
        min-height: 46px;
        align-items: center;
        justify-content: center;
        border-radius: 16px;
        text-decoration: none;
        font-size: 13px;
        font-weight: 1000;
      }

      .ua-hero-actions a:first-child {
        background: linear-gradient(180deg, #ffae63 0%, #ff7d2f 100%);
        color: #09111d;
        box-shadow: 0 18px 48px rgba(255, 125, 47, 0.26), inset 0 1px 0 rgba(255,255,255,0.32);
      }

      .ua-hero-actions a:last-child {
        border: 1px solid rgba(201,226,255,0.18);
        background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.045));
        color: #ffffff;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.11);
      }

      .ua-hero-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-top: 18px;
      }

      .ua-stat {
        border: 1px solid rgba(201, 226, 255, 0.13);
        border-radius: 17px;
        background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.045));
        padding: 11px 10px;
        box-shadow: 0 14px 36px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.10);
      }

      .ua-stat span {
        display: block;
        color: #9db8d7;
        font-size: 9px;
        font-weight: 1000;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .ua-stat strong {
        display: block;
        margin-top: 7px;
        color: #f8fbff;
        font-size: 15px;
        line-height: 1;
        font-weight: 1000;
      }

      .ua-main {
        padding: 10px 16px 22px;
      }

      .ua-section {
        position: relative;
        padding: 20px 0;
      }

      .ua-section + .ua-section::before {
        content: "";
        position: absolute;
        top: 0;
        right: 8px;
        left: 8px;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(201,226,255,0.18), rgba(255,154,74,0.20), transparent);
      }

      .ua-section-head {
        margin-bottom: 12px;
      }

      .ua-section-label {
        color: #7ed0ff;
        font-size: 10px;
        font-weight: 1000;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      .ua-section-title {
        margin: 7px 0 0;
        color: #ffffff;
        font-size: 24px;
        line-height: 1.04;
        font-weight: 1000;
        letter-spacing: -0.061em;
      }

      .ua-section-copy {
        margin: 8px 0 0;
        color: #c8ddf5;
        font-size: 13px;
        line-height: 1.45;
        font-weight: 680;
      }

      .ua-fictive-note {
        display: flex;
        align-items: flex-start;
        gap: 7px;
        margin-top: 12px;
        border: 1px solid rgba(126, 208, 255, 0.16);
        border-radius: 16px;
        background: linear-gradient(180deg, rgba(126,208,255,0.115), rgba(126,208,255,0.045));
        color: #d9f2ff;
        padding: 10px 11px;
        font-size: 11px;
        line-height: 1.32;
        font-weight: 850;
        box-shadow: 0 12px 34px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.08);
      }

      .ua-fictive-note span {
        display: inline-flex;
        width: 17px;
        height: 17px;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: #7ed0ff;
        color: #071936;
        font-size: 11px;
        font-weight: 1000;
      }

      .ua-workflow-scroll {
        display: flex;
        gap: 14px;
        overflow-x: auto;
        margin: 15px -16px 0;
        padding: 0 16px 4px;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
      }

      .ua-workflow-scroll::-webkit-scrollbar {
        display: none;
      }

      .ua-workflow-card {
        flex: 0 0 92%;
        margin: 0;
        scroll-snap-align: center;
      }

      .ua-workflow-image-link {
        display: block;
        overflow: hidden;
        border: 1px solid rgba(201,226,255,0.14);
        border-radius: 23px;
        background: radial-gradient(circle at 20% 0%, rgba(126,208,255,0.14), transparent 12rem), #06101f;
        box-shadow: 0 24px 72px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.08);
      }

      .ua-workflow-image-wrap {
        position: relative;
        width: 100%;
        aspect-ratio: 4 / 3;
        background: #06101f;
      }

      .ua-workflow-image {
        object-fit: contain;
        padding: 0;
      }

      .ua-workflow-badge {
        position: absolute;
        right: 9px;
        bottom: 9px;
        z-index: 2;
        border: 1px solid rgba(255,255,255,0.16);
        border-radius: 999px;
        background: rgba(4, 11, 20, 0.88);
        color: #ffffff;
        padding: 8px 10px;
        font-size: 9px;
        line-height: 1;
        font-weight: 1000;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        box-shadow: 0 12px 32px rgba(0,0,0,0.34);
      }

      .ua-workflow-card figcaption {
        display: flex;
        align-items: center;
        gap: 9px;
        margin-top: 9px;
      }

      .ua-workflow-card figcaption span {
        display: flex;
        width: 26px;
        height: 26px;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: linear-gradient(180deg, #ffae63, #ff7d2f);
        color: #09111d;
        font-size: 11px;
        font-weight: 1000;
        box-shadow: 0 10px 24px rgba(255,125,47,0.20);
      }

      .ua-workflow-card figcaption strong {
        color: #f8fbff;
        font-size: 13px;
        line-height: 1.2;
        font-weight: 1000;
      }

      .ua-chain-grid {
        display: grid;
        gap: 10px;
        margin-top: 13px;
      }

      .ua-chain-row {
        position: relative;
        display: block;
        overflow: hidden;
        border: 1px solid color-mix(in srgb, var(--ua-regime) 44%, rgba(201,226,255,0.14));
        border-radius: 22px;
        background:
          radial-gradient(circle at 6% 0%, color-mix(in srgb, var(--ua-regime) 18%, transparent), transparent 13rem),
          linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025)),
          #061325;
        color: #ffffff;
        padding: 13px;
        text-decoration: none;
        box-shadow: 0 20px 58px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.08);
      }

      .ua-chain-row-top {
        display: grid;
        grid-template-columns: 40px 1fr auto;
        gap: 10px;
        align-items: center;
      }

      .ua-chain-token {
        display: flex;
        width: 40px;
        height: 40px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: var(--ua-chain);
        color: #ffffff;
        font-size: 23px;
        font-weight: 1000;
        box-shadow: 0 13px 30px color-mix(in srgb, var(--ua-chain) 34%, transparent), inset 0 1px 0 rgba(255,255,255,0.2);
      }

      .ua-chain-copy strong {
        display: block;
        color: #ffffff;
        font-size: 15px;
        line-height: 1.1;
        font-weight: 1000;
      }

      .ua-chain-copy span {
        display: block;
        margin-top: 3px;
        color: #adc6e3;
        font-size: 11px;
        font-weight: 800;
      }

      .ua-regime-pill {
        display: inline-flex;
        min-height: 26px;
        align-items: center;
        border: 1px solid var(--ua-regime);
        border-radius: 999px;
        background: color-mix(in srgb, var(--ua-regime) 12%, transparent);
        color: var(--ua-regime);
        padding: 0 8px;
        font-size: 9px;
        font-weight: 1000;
        letter-spacing: 0.07em;
      }

      .ua-chain-meter-line {
        display: flex;
        justify-content: space-between;
        margin-top: 12px;
        color: #a9c1dd;
        font-size: 9px;
        font-weight: 1000;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .ua-chain-meter-line strong {
        color: var(--ua-regime);
        font-size: 11px;
      }

      .ua-chain-meter {
        overflow: hidden;
        height: 7px;
        margin-top: 7px;
        border-radius: 999px;
        background: rgba(255,255,255,0.16);
        box-shadow: inset 0 1px 2px rgba(0,0,0,0.25);
      }

      .ua-chain-meter div {
        height: 100%;
        border-radius: inherit;
        background: var(--ua-regime);
        box-shadow: 0 0 18px color-mix(in srgb, var(--ua-regime) 45%, transparent);
      }

      .ua-chain-row p {
        margin: 9px 0 0;
        color: #d7e8fb;
        font-size: 11px;
        line-height: 1.35;
        font-weight: 750;
      }

      .ua-terms {
        display: grid;
        gap: 8px;
        margin-top: 13px;
      }

      .ua-term {
        border-bottom: 1px solid rgba(201,226,255,0.11);
        padding-bottom: 8px;
      }

      .ua-term:last-child {
        border-bottom: 0;
        padding-bottom: 0;
      }

      .ua-term summary {
        display: flex;
        min-height: 32px;
        align-items: center;
        justify-content: space-between;
        color: #f8fbff;
        cursor: pointer;
        list-style: none;
        font-size: 12px;
        font-weight: 1000;
        letter-spacing: 0.05em;
      }

      .ua-term summary::-webkit-details-marker {
        display: none;
      }

      .ua-term summary::after {
        content: "+";
        color: #ff9a4a;
        font-size: 16px;
        font-weight: 1000;
      }

      .ua-term[open] summary::after {
        content: "–";
      }

      .ua-term p {
        margin: 2px 0 0;
        color: #c8ddf5;
        font-size: 12px;
        line-height: 1.4;
        font-weight: 680;
      }

      .ua-pipeline {
        position: relative;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 6px;
        margin-top: 14px;
      }

      .ua-pipeline::before {
        content: "";
        position: absolute;
        top: 24px;
        right: 12px;
        left: 12px;
        height: 1px;
        background: linear-gradient(90deg, #7ed0ff, #ff9a4a);
        opacity: 0.4;
      }

      .ua-pipe-step {
        position: relative;
        z-index: 1;
        border: 1px solid rgba(201,226,255,0.13);
        border-radius: 15px;
        background: linear-gradient(180deg, rgba(255,255,255,0.11), rgba(255,255,255,0.04));
        padding: 10px 6px;
        text-align: center;
        box-shadow: 0 12px 32px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.08);
      }

      .ua-pipe-step strong {
        display: block;
        color: #7ed0ff;
        font-size: 11px;
        line-height: 1;
        font-weight: 1000;
      }

      .ua-pipe-step span {
        display: block;
        margin-top: 5px;
        color: #adc6e3;
        font-size: 9px;
        line-height: 1.2;
        font-weight: 850;
      }

      .ua-plan-grid {
        display: grid;
        gap: 10px;
        margin-top: 14px;
      }

      .ua-plan {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        border: 1px solid rgba(201,226,255,0.13);
        border-radius: 20px;
        background: linear-gradient(145deg, rgba(255,255,255,0.115), rgba(255,255,255,0.04));
        color: #f8fbff;
        padding: 13px;
        text-decoration: none;
        box-shadow: 0 18px 50px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.09);
      }

      .ua-plan strong {
        display: block;
        color: #ffffff;
        font-size: 15px;
        font-weight: 1000;
      }

      .ua-plan span {
        display: block;
        margin-top: 3px;
        color: #c8ddf5;
        font-size: 11px;
        line-height: 1.3;
        font-weight: 750;
      }

      .ua-plan b {
        color: #7ed0ff;
        font-size: 17px;
        font-weight: 1000;
      }

      .ua-plan-blue {
        border-color: rgba(126,208,255,0.22);
        background: radial-gradient(circle at 0% 0%, rgba(126,208,255,0.16), transparent 9rem), linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04));
      }

      .ua-plan-orange {
        border-color: rgba(255,154,74,0.26);
        background: radial-gradient(circle at 0% 0%, rgba(255,154,74,0.17), transparent 9rem), linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04));
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
        background: rgba(4, 11, 20, 0.94);
        backdrop-filter: blur(12px);
      }

      .ua-modal-panel {
        position: relative;
        z-index: 1;
        display: flex;
        width: 100%;
        height: 100svh;
        flex-direction: column;
        background: radial-gradient(circle at 16% 0%, rgba(126,208,255,0.12), transparent 18rem), #040b14;
      }

      .ua-modal-header {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: calc(env(safe-area-inset-top) + 12px) 14px 12px;
        border-bottom: 1px solid rgba(201,226,255,0.10);
        background: rgba(4, 11, 20, 0.88);
        backdrop-filter: blur(18px);
      }

      .ua-modal-header span {
        display: block;
        color: #7ed0ff;
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
        border: 1px solid rgba(201,226,255,0.16);
        background: rgba(255,255,255,0.08);
        color: #ffffff;
        padding: 9px 12px;
        text-decoration: none;
        font-size: 12px;
        font-weight: 1000;
      }

      .ua-modal-scroll {
        flex: 1 1 auto;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-x pan-y;
      }

      .ua-modal-image-stage {
        position: relative;
        width: 1448px;
        height: 1086px;
        max-width: none;
        background: #040b14;
      }

      .ua-modal-image {
        object-fit: contain;
        padding: 10px;
      }

      .ua-modal-foot {
        flex: 0 0 auto;
        border-top: 1px solid rgba(201,226,255,0.10);
        background: rgba(4, 11, 20, 0.88);
        color: #c8ddf5;
        padding: 10px 14px calc(env(safe-area-inset-bottom) + 10px);
        text-align: center;
        font-size: 12px;
        line-height: 1.35;
        font-weight: 800;
      }

      @media (min-width: 720px) {
        .ua-hero,
        .ua-main {
          max-width: 720px;
          margin-inline: auto;
        }

        .ua-modal-panel {
          max-width: 1100px;
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
    <div className="ua-mobile">
      <MobileStyles />

      <div className="ua-page">
        <header className="ua-hero">
          <div className="ua-topbar">
            <Link
              href="/mobile"
              className="ua-brand"
              aria-label="Urd Atlas mobile home"
            >
              <img
                src="/web-bilder/ygg-transparent.png"
                alt=""
                aria-hidden="true"
              />
              <span>Urd Atlas</span>
            </Link>

            <MobileRouteMenu />
          </div>

          <section className="ua-hero-body">
            <div className="ua-kicker">Mobile product overview</div>

            <h1 className="ua-title">
              Daily regime labels for blockchain data<span>.</span>
            </h1>

            <p className="ua-copy">
              Urd Atlas publishes daily Gold, Derived, Meta, and Briefs JSON per chain:
              regime label, confidence, evidence, and provenance fields joined
              by chain and date.
            </p>

            <div className="ua-hero-actions">
              <a href="#workflow">See workflow</a>
              <Link href="/mobile/plans">View plans</Link>
            </div>

            <div className="ua-hero-stats">
              <div className="ua-stat">
                <span>Updated</span>
                <strong>{publishedAt ?? "—"}</strong>
              </div>

              <div className="ua-stat">
                <span>History</span>
                <strong>{historyDays ?? "—"}</strong>
              </div>

              <div className="ua-stat">
                <span>Chains</span>
                <strong>4</strong>
              </div>
            </div>
          </section>
        </header>

        <main className="ua-main">
          <section id="workflow" className="ua-section">
            <div className="ua-section-head">
              <div className="ua-section-label">Workflow</div>
              <h2 className="ua-section-title">What the data is used for.</h2>
              <p className="ua-section-copy">
                Attach Urd Atlas to your own dataset and analyze results through
                the regime column.
              </p>

              <div className="ua-fictive-note">
                <span>i</span>
                The data shown in these images is fictive example data.
              </div>
            </div>

            <div className="ua-workflow-scroll">
              {WORKFLOW_IMAGES.map((image, index) => (
                <WorkflowCard key={image.src} image={image} index={index} />
              ))}
            </div>
          </section>

          <section id="chains" className="ua-section">
            <div className="ua-section-head">
              <div className="ua-section-label">Latest labels</div>
              <h2 className="ua-section-title">Four chain states.</h2>
            </div>

            <div className="ua-chain-grid">
              {states.map((state) => (
                <ChainCard key={state.chain} state={state} />
              ))}
            </div>
          </section>

          <section id="terms" className="ua-section">
            <div className="ua-section-head">
              <div className="ua-section-label">Terms</div>
              <h2 className="ua-section-title">How labels should be read.</h2>
              <p className="ua-section-copy">
                Labels are descriptive regime classifications based on chain
                evidence, not recommendations or price signals.
              </p>
            </div>

            <div className="ua-terms">
              {REGIME_EXPLAINERS.map((item, index) => (
                <details key={item.label} className="ua-term" open={index === 0}>
                  <summary>{item.label}</summary>
                  <p>{item.text}</p>
                </details>
              ))}
            </div>
          </section>

          <section id="json-pipeline" className="ua-section">
            <div className="ua-section-head">
              <div className="ua-section-label">JSON pipeline</div>
              <h2 className="ua-section-title">From data to files.</h2>
              <p className="ua-section-copy">
                Daily chain data is reduced into transparent Gold, Derived and
                Meta JSON outputs.
              </p>
            </div>

            <div className="ua-pipeline" aria-label="Urd Atlas JSON pipeline">
              <div className="ua-pipe-step">
                <strong>RAW</strong>
                <span>source</span>
              </div>

              <div className="ua-pipe-step">
                <strong>Gold</strong>
                <span>daily</span>
              </div>

              <div className="ua-pipe-step">
                <strong>Derived</strong>
                <span>trends</span>
              </div>

              <div className="ua-pipe-step">
                <strong>Meta</strong>
                <span>label</span>
              </div>

              <div className="ua-pipe-step">
                <strong>JSON</strong>
                <span>API</span>
              </div>
            </div>
          </section>

          <section id="plans" className="ua-section">
            <div className="ua-section-head">
              <div className="ua-section-label">Plans</div>
              <h2 className="ua-section-title">Active access levels.</h2>
            </div>

            <div className="ua-plan-grid">
              <PlanCard
                name="Free"
                price="$0"
                tone="plain"
                text="Historical charts and public browsing."
              />

              <PlanCard
                name="Single Chain"
                price="$49"
                tone="blue"
                text="One chain. Gold, Derived, Meta, and Briefs JSON."
              />

              <PlanCard
                name="Full Access"
                price="$149"
                tone="orange"
                text="All supported chains. Full JSON access."
              />
            </div>
          </section>
        </main>

        <MobileBottomNav active="overview" />
      </div>

      {WORKFLOW_IMAGES.map((image, index) => (
        <WorkflowModal key={`${image.src}-modal`} image={image} index={index} />
      ))}
    </div>
  );
}
