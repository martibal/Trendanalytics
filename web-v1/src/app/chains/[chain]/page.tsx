// src/app/chains/[chain]/page.tsx
import ChainClient from "./ChainClient";
import { headers } from "next/headers";
import Link from "next/link";

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
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-ui-border bg-ui-bg/20 p-7 ui-lift">
          <div className="text-xs font-semibold uppercase tracking-wide text-ui-faint">
            Chain
          </div>
          <h1 className="mt-2 text-3xl font-semibold capitalize text-ui-text">
            {chain}
          </h1>
          <p className="mt-3 text-sm text-ui-muted">
            Unknown chain (not in published landing index).
          </p>

          <div className="mt-5 flex flex-wrap gap-3 text-xs text-ui-faint">
            <Link
              href="/chains"
              className="underline underline-offset-4 hover:text-ui-text"
            >
              Back to chains →
            </Link>
            <Link
              href="/methodology"
              className="underline underline-offset-4 hover:text-ui-text"
            >
              Methodology →
            </Link>
            <Link
              href="/notables"
              className="underline underline-offset-4 hover:text-ui-text"
            >
              Notables policy →
            </Link>
          </div>

          <div className="mt-6 text-[11px] text-ui-faint">
            Descriptive only · No prices · No forecasts · No advice
          </div>
        </div>
      </main>
    );
  }

  // 2) hero.json for chain
  const hero = await fetchJson(`${PUBLISHED_PATH}/${card.hero_file}`);

  return (
    <main className="space-y-10">
      {/* Main dashboard */}
      <ChainClient chain={chain} hero={hero} />

      {/* Notables section (policy links) — aligned with dashboard width */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-10">
        <div className="rounded-3xl border border-ui-border bg-ui-bg/15 p-6 ui-lift">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-ui-border bg-ui-bg/20 px-3 py-1 text-[11px] font-semibold text-ui-muted">
                Descriptive only
              </span>
              <span className="inline-flex items-center rounded-full border border-ui-border bg-ui-bg/20 px-3 py-1 text-[11px] font-semibold text-ui-muted">
                No prices
              </span>
              <span className="inline-flex items-center rounded-full border border-ui-border bg-ui-bg/20 px-3 py-1 text-[11px] font-semibold text-ui-muted">
                No advice
              </span>
            </div>

            <h2 className="text-2xl font-semibold text-ui-text">Notables</h2>

            <p className="text-sm text-ui-muted">
              Notables are{" "}
              <span className="text-ui-text">descriptive signals</span> about
              data quality, persistence, and unusual values. They explain{" "}
              <em>why</em> something is highlighted — never what to do.
            </p>

            <ul className="list-disc space-y-2 pl-5 text-sm text-ui-muted">
              <li>
                <span className="text-ui-text">Missing days:</span> shown when
                published dates are absent in the selected window.
              </li>
              <li>
                <span className="text-ui-text">Coverage warnings:</span>{" "}
                triggered when non-null coverage falls below threshold.
              </li>
              <li>
                <span className="text-ui-text">Freshness / lag:</span> always
                shown using manifest as-of vs today.
              </li>
              <li>
                <span className="text-ui-text">Level & trend:</span> contextual
                labels based on historical reference windows.
              </li>
            </ul>

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-ui-faint">
              <Link
                href="/notables#data-quality"
                className="underline underline-offset-4 hover:text-ui-text"
              >
                Data quality rules
              </Link>
              <Link
                href="/notables#statistical"
                className="underline underline-offset-4 hover:text-ui-text"
              >
                Statistical notables
              </Link>
              <Link
                href="/notables#wording"
                className="underline underline-offset-4 hover:text-ui-text"
              >
                Wording policy
              </Link>
              <Link
                href="/notables"
                className="underline underline-offset-4 hover:text-ui-text"
              >
                Full Notables policy →
              </Link>
            </div>

            <div className="mt-3 text-xs text-ui-faint">
              Descriptive only · No prices · No forecasts · No advice
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}