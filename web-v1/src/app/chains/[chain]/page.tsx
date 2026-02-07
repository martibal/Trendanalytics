// src/app/chains/[chain]/page.tsx
import ChainClient from "./ChainClient";
import { headers } from "next/headers";

const PUBLISHED_PATH = "/data/published/v1";

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) throw new Error("Missing Host header");
  return `${proto}://${host}`;
}

async function fetchJson(path: string) {
  const base = await getBaseUrl();
  const url = `${base}${path}`; // <-- ABSOLUTE URL
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

export default async function ChainPage({
  params,
}: {
  params: Promise<{ chain: string }>;
}) {
  const { chain: chainParam } = await params;
  const chain = (chainParam || "").toLowerCase();

  // 1) landing index -> find hero_file for this chain
  const landingIndex = await fetchJson(`${PUBLISHED_PATH}/landing/index.json`);
  const card = (landingIndex.cards || []).find(
    (c: any) => (c.chain || "").toLowerCase() === chain
  );

  if (!card?.hero_file) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-semibold capitalize">{chain}</h1>
        <p className="mt-2 text-white/70">
          Unknown chain (not in published landing index).
        </p>
      </main>
    );
  }

  // 2) hero.json for chain
  const hero = await fetchJson(`${PUBLISHED_PATH}/${card.hero_file}`);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-10">
      <ChainClient chain={chain} hero={hero} />

      {/* Notables section (policy links) */}
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-white">Notables</h2>

          <p className="text-sm text-white/70">
            Notables are <span className="text-white/85">descriptive signals</span>{" "}
            about data quality, persistence, and unusual values. They explain{" "}
            <em>why</em> something is highlighted — never what to do.
          </p>

          <ul className="list-disc space-y-2 pl-5 text-sm text-white/70">
            <li>
              <span className="text-white/85">Missing days:</span> shown when
              published dates are absent in the selected window.
            </li>
            <li>
              <span className="text-white/85">Coverage warnings:</span> triggered
              when non-null coverage falls below threshold.
            </li>
            <li>
              <span className="text-white/85">Freshness / lag:</span> always
              shown using manifest as-of vs today.
            </li>
            <li>
              <span className="text-white/85">Level & trend:</span> contextual
              labels based on historical reference windows.
            </li>
          </ul>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/70">
            <a
              href="/notables#data-quality"
              className="underline underline-offset-4 hover:text-white"
            >
              Data quality rules
            </a>
            <a
              href="/notables#statistical"
              className="underline underline-offset-4 hover:text-white"
            >
              Statistical notables
            </a>
            <a
              href="/notables#wording"
              className="underline underline-offset-4 hover:text-white"
            >
              Wording policy
            </a>
            <a
              href="/notables"
              className="underline underline-offset-4 hover:text-white"
            >
              Full Notables policy →
            </a>
          </div>

          <div className="mt-3 text-xs text-white/50">
            Descriptive only · No prices · No forecasts · No advice
          </div>
        </div>
      </section>
    </main>
  );
}