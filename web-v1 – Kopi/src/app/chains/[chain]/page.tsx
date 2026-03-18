// src/app/chains/[chain]/page.tsx
import Link from "next/link";
import { headers } from "next/headers";
import type * as React from "react";

import ChainClient from "./ChainClient";
import { CustomRegimePanel } from "@/components/custom/CustomRegimePanel";

const PUBLISHED_PATH = "/data/published/v1";

const CHAINS = ["bitcoin", "ethereum", "arbitrum", "base"] as const;
type ChainId = (typeof CHAINS)[number];

function isChainId(x: string): x is ChainId {
  return (CHAINS as readonly string[]).includes(x);
}

type LandingCard = {
  chain: string;
  hero_file: string;
};

type LandingIndex = {
  cards: LandingCard[];
};

type ChainClientProps = React.ComponentProps<typeof ChainClient>;
type Hero = ChainClientProps["hero"];

async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) throw new Error("Missing Host header");
  return `${proto}://${host}`;
}

async function fetchJson<T>(path: string): Promise<T> {
  const base = await getBaseUrl();
  const url = `${base}${path}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return (await res.json()) as T;
}

export default async function ChainPage({
  params,
}: {
  params: Promise<{ chain: string }>;
}) {
  const { chain: chainParam } = await params;
  const chain = String(chainParam ?? "").toLowerCase();

  const landingIndex = await fetchJson<LandingIndex>(`${PUBLISHED_PATH}/landing/index.json`);
  const cards = Array.isArray(landingIndex?.cards) ? landingIndex.cards : [];
  const card = cards.find((c) => String(c.chain ?? "").toLowerCase() === chain);

  if (!card?.hero_file) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-ui-border bg-ui-bg/20 p-7 ui-lift">
          <div className="text-xs font-semibold uppercase tracking-wide text-ui-faint">Chain</div>
          <h1 className="mt-2 text-3xl font-semibold capitalize text-ui-text">{chain || "unknown"}</h1>

          <div className="mt-3 text-sm text-ui-muted">
            Unknown chain. Available:{" "}
            {CHAINS.map((c, i) => (
              <span key={c}>
                <Link className="underline hover:opacity-80" href={`/chains/${c}`}>
                  {c}
                </Link>
                {i < CHAINS.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const hero = await fetchJson<Hero>(`${PUBLISHED_PATH}/${card.hero_file}`);

  // Deterministic fallback: if route param is invalid, default to bitcoin.
  const chainId: ChainId = isChainId(chain) ? chain : "bitcoin";

  return (
    <main className="min-h-screen">
      <ChainClient chain={chainId} hero={hero} />
      <div className="mx-auto w-full max-w-6xl px-4 pb-20">
        <CustomRegimePanel chain={chainId} date={null} />
      </div>
    </main>
  );
}