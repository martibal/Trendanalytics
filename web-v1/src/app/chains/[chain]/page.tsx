// src/app/chains/[chain]/page.tsx
import ChainClient from "./ChainClient";
import { headers } from "next/headers";

const PUBLISHED_PATH = "/data/published/v1";

function getBaseUrl() {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) throw new Error("Missing Host header");
  return `${proto}://${host}`;
}

async function fetchJson(path: string) {
  const base = getBaseUrl();
  const url = `${base}${path}`; // <-- ABSOLUTE URL
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

export default async function ChainPage({ params }: { params: { chain: string } }) {
  const chain = (params.chain || "").toLowerCase();

  // 1) landing index -> find hero_file for this chain
  const landingIndex = await fetchJson(`${PUBLISHED_PATH}/landing/index.json`);
  const card = (landingIndex.cards || []).find(
    (c: any) => (c.chain || "").toLowerCase() === chain
  );

  if (!card?.hero_file) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-semibold capitalize">{chain}</h1>
        <p className="mt-2 text-white/70">Unknown chain (not in published landing index).</p>
      </main>
    );
  }

  // 2) hero.json for chain
  const hero = await fetchJson(`${PUBLISHED_PATH}/${card.hero_file}`);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <ChainClient chain={chain} hero={hero} />
    </main>
  );
}