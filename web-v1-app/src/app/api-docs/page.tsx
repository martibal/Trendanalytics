// src/app/api-docs/page.tsx
import type { ReactNode } from "react";
import Link from "next/link";

import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { currentDataSource } from "@/lib/storage";

import "server-only";

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

function ModalStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          .ta-modal { display: none; }
          .ta-modal:target { display: flex; }
        `,
      }}
    />
  );
}

function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>;
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border bg-black/30 p-5 text-xs leading-6 text-slate-200">
      <code>{children}</code>
    </pre>
  );
}

function MoreLink({ id, label = "More" }: { id: string; label?: string }) {
  return (
    <a
      href={`#${id}`}
      className="inline-flex items-center rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-xs font-medium text-cyan-200 hover:bg-cyan-500/10"
    >
      {label}
    </a>
  );
}

type ExplainPair = { basic: ReactNode; advanced: ReactNode; traceability?: ReactNode };

function ExplainModal({
  id,
  title,
  subtitle,
  pair,
}: {
  id: string;
  title: string;
  subtitle?: ReactNode;
  pair: ExplainPair;
}) {
  return (
    <div id={id} className="ta-modal fixed inset-0 z-[80] items-center justify-center p-4">
      <a href="#" className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" aria-label="Close dialog" />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col rounded-3xl border border-cyan-500/20 bg-[#071322] shadow-2xl shadow-cyan-950/40">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/8 px-6 py-5">
          <div>
            <h3 className="text-2xl font-semibold text-white">{title}</h3>
            {subtitle ? <div className="mt-2 text-sm leading-6 text-slate-300">{subtitle}</div> : null}
          </div>
          <a href="#" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-slate-200 hover:bg-white/10" aria-label="Close dialog">×</a>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-200">Basic</div>
              <div className="mt-3 text-sm leading-7 text-slate-100">{pair.basic}</div>
            </section>
            <details className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5" open>
              <summary className="cursor-pointer list-none text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">Advanced</summary>
              <div className="mt-3 text-sm leading-7 text-slate-100">{pair.advanced}</div>
            </details>
          </div>
          {pair.traceability ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-300">Traceability</div>
              <div className="mt-3 text-sm leading-7 text-slate-200">{pair.traceability}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route data
// ---------------------------------------------------------------------------

const PUBLIC_ROUTES = [
  {
    method: "GET",
    path: "/api/v1/status",
    auth: false,
    description: "Per-chain publication freshness, lag, and dataset version.",
    fields: ["ok", "chains[].status", "chains[].lag_days", "dataset.methodology_version"],
  },
  {
    method: "GET",
    path: "/api/v1/landing",
    auth: false,
    description: "Landing page snapshot — regime, confidence, and freshness across all chains.",
    fields: ["chains[].status_label", "chains[].confidence_score", "chains[].as_of"],
  },
  {
    method: "GET",
    path: "/api/v1/whn/[chain]",
    auth: false,
    description: "What's Happening Now — up to 5 anomaly signals per chain.",
    fields: ["whats_happening_now[].metric", "whats_happening_now[].z", "whats_happening_now[].severity"],
  },
  {
    method: "GET",
    path: "/api/v1/summary/[chain]",
    auth: false,
    description: "Per-chain regime summary with scorecard and drivers.",
    fields: ["summary.regime_label", "summary.confidence_band", "scorecard", "drivers[]"],
  },
  {
    method: "GET",
    path: "/api/v1/glossary",
    auth: false,
    description: "All published glossary entries with Basic and Advanced descriptions.",
    fields: ["entry_count", "entries[].key", "entries[].basic", "entries[].advanced"],
  },
  {
    method: "GET",
    path: "/api/v1/thresholds/defaults",
    auth: false,
    description: "Canonical default threshold values used by the published methodology.",
    fields: ["thresholds[].parameter", "thresholds[].default_value"],
  },
  {
    method: "GET",
    path: "/api/v1/methodology/versions",
    auth: false,
    description: "Published methodology version history.",
    fields: ["versions[].version", "versions[].published_at"],
  },
  {
    method: "GET",
    path: "/api/v1/units",
    auth: false,
    description: "Unit labels and display metadata per metric and chain.",
    fields: ["units.<chain>.<metric>.label", "units.<chain>.<metric>.native"],
  },
];

const AUTHENTICATED_ROUTES = [
  {
    method: "GET",
    path: "/api/v1/files/[genre]/[chain]/[window].json",
    auth: true,
    description: "Authenticated file delivery. Returns the requested published JSON artifact.",
    fields: ["(raw published JSON artifact — gold, meta, or derived)"],
  },
  {
    method: "POST",
    path: "/api/v1/keys",
    auth: true,
    description: "Create a new API key for the authenticated account.",
    fields: ["key (shown once)", "keyId", "prefix", "last4"],
  },
  {
    method: "DELETE",
    path: "/api/v1/keys",
    auth: true,
    description: "Revoke an existing API key.",
    fields: ["keyId"],
  },
  {
    method: "POST",
    path: "/api/v1/checkout",
    auth: true,
    description: "Initiate a Stripe Checkout session for Basic, Pro, or History Add-on.",
    fields: ["url (Stripe Checkout redirect URL)"],
  },
  {
    method: "POST",
    path: "/api/v1/checkout/portal",
    auth: true,
    description: "Create a Stripe Customer Portal session for subscription management.",
    fields: ["url (Stripe Portal redirect URL)"],
  },
];

// ---------------------------------------------------------------------------
// Explanations
// ---------------------------------------------------------------------------

const authExplain: ExplainPair = {
  basic: (
    <>
      <p>
        Most of the API is completely open — no key required. The public endpoints power the
        public pages of this site, and you can call them directly from any HTTP client.
      </p>
      <p className="mt-3">
        The only thing that requires authentication is downloading the actual JSON data files
        (the Gold, Meta, and Derived artifacts). Those are what you get with a subscription.
        To access them you send an API key in a request header, and the server checks your
        entitlements before returning the file.
      </p>
      <p className="mt-3">
        API keys are created from the{" "}
        <Link href="/dashboard" className="text-cyan-200 underline">dashboard</Link>{" "}
        after subscribing. Each key is shown only once when created. Store it somewhere safe —
        after that, only the last four characters are visible in the dashboard.
      </p>
    </>
  ),
  advanced: (
    <>
      <p>
        Authentication is via the <InlineCode>X-API-Key</InlineCode> request header. Keys
        are opaque random strings stored as argon2id hashes server-side — the raw key is
        never persisted. Only the prefix and last 4 characters are stored for identification.
      </p>
      <p className="mt-3">
        The authentication pipeline evaluates in order: key presence → key hash lookup →
        key status (ACTIVE / SUSPENDED / REVOKED) → subscription status → entitlement
        scope (chain, genre, window, date range) → rate limit. Each failure returns a
        distinct HTTP status and stable error code. A 403 always means valid key but
        out-of-scope request; a 401 always means authentication failure.
      </p>
      <p className="mt-3">
        Rate limiting is enforced per account across all keys (Basic: 60 req/min, Pro:
        300 req/min) using a sliding window over Upstash Redis, with an in-process
        fallback for degraded Redis conditions. The <InlineCode>Retry-After</InlineCode>{" "}
        header is always present on 429 responses.
      </p>
    </>
  ),
  traceability: (
    <ul className="list-disc pl-5">
      <li>Auth header: <InlineCode>X-API-Key: ta_live_xxxxxxxxx</InlineCode></li>
      <li>Key storage: argon2id hash only — raw key never persisted</li>
      <li>Rate limits: Basic 60 req/min · Pro 300 req/min (per account, sliding window)</li>
      <li>Key states: ACTIVE · SUSPENDED · REVOKED</li>
    </ul>
  ),
};

const entitlementsExplain: ExplainPair = {
  basic: (
    <>
      <p>
        Your subscription determines which files you can download. There are three
        dimensions to entitlements: which chains you can access, how far back in history
        you can go, and whether you get access to all four chains or just one.
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>
          <span className="font-medium text-white">Basic ($29/month)</span> — one chain of
          your choice, all three genres (Gold, Meta, Derived), up to 90 days of history.
        </li>
        <li>
          <span className="font-medium text-white">Pro ($79/month)</span> — all four chains,
          all genres, up to 365 days of history, custom threshold outputs.
        </li>
        <li>
          <span className="font-medium text-white">History Add-on ($149 once)</span> — full
          available history (400+ days, growing daily) for your entitled scope.
        </li>
      </ul>
      <p className="mt-3">
        If you request something outside your entitlement — a chain you have not subscribed
        to, a window deeper than your plan allows — you will get a 403 with a clear error
        code explaining exactly what was out of scope.
      </p>
    </>
  ),
  advanced: (
    <>
      <p>
        Entitlements are evaluated server-side on every request across four dimensions:
        chain, genre, window token, and date range. The entitlement snapshot is built from
        the subscription record at request time — there is no client-side caching of
        entitlement state.
      </p>
      <p className="mt-3">
        Window tokens map to history depth: <InlineCode>latest</InlineCode> (no history),{" "}
        <InlineCode>7d</InlineCode>, <InlineCode>30d</InlineCode>,{" "}
        <InlineCode>90d</InlineCode> (Basic ceiling), <InlineCode>180d</InlineCode>,{" "}
        <InlineCode>365d</InlineCode> (Pro ceiling). The History Add-on sets{" "}
        <InlineCode>historyUnlocked = true</InlineCode>, removing the depth constraint
        entirely for the entitled scope.
      </p>
      <p className="mt-3">
        Forbidden scope returns 403 (not 404) to explicitly signal entitlement enforcement
        rather than content absence. URL manipulation cannot grant access — all path
        components are validated against the entitlement snapshot before the storage backend
        is consulted.
      </p>
    </>
  ),
  traceability: (
    <ul className="list-disc pl-5">
      <li>Basic windows: <InlineCode>latest · 7d · 30d · 90d</InlineCode></li>
      <li>Pro windows: <InlineCode>latest · 7d · 30d · 90d · 180d · 365d</InlineCode></li>
      <li>History Add-on: <InlineCode>historyUnlocked = true</InlineCode> → full available history</li>
      <li>Forbidden scope: always 403, never 404</li>
      <li>All four genres available to both tiers: <InlineCode>gold · meta · derived</InlineCode></li>
    </ul>
  ),
};

const fileDeliveryExplain: ExplainPair = {
  basic: (
    <>
      <p>
        The file delivery endpoint is the core of the subscriber API. You send a request
        with your API key, specifying which chain, which data layer, and which time window
        you want. You get back a JSON file exactly as it was published by the pipeline.
      </p>
      <p className="mt-3">
        The URL structure is straightforward:
      </p>
      <CodeBlock>{`GET /api/v1/files/<genre>/<chain>/<window>.json

Examples:
  /api/v1/files/meta/bitcoin/latest.json
  /api/v1/files/gold/ethereum/last90d.json
  /api/v1/files/derived/arbitrum/last30d.json`}</CodeBlock>
      <p className="mt-3">
        The three genres are: <span className="font-medium text-white">gold</span> (raw
        daily observations), <span className="font-medium text-white">meta</span> (regime
        labels, scorecard, drivers, confidence), and{" "}
        <span className="font-medium text-white">derived</span> (smoothed MA7/MA30 series).
      </p>
    </>
  ),
  advanced: (
    <>
      <p>
        File delivery is a proxy endpoint — the server validates authentication and
        entitlements, then streams the requested artifact from the storage backend (S3 in
        production, local filesystem in development). The client receives the raw published
        JSON without server-side transformation.
      </p>
      <p className="mt-3">
        The storage path follows the canonical hierarchy:{" "}
        <InlineCode>data/published/v1/{"<genre>"}/ {"<chain>"}/{"<window>"}.json</InlineCode>.
        Window tokens map directly to file names: <InlineCode>latest.json</InlineCode>,{" "}
        <InlineCode>last7d.json</InlineCode>, <InlineCode>last30d.json</InlineCode>, etc.
        The <InlineCode>last90d.json</InlineCode> bundle contains an array of daily rows
        ordered by date; <InlineCode>latest.json</InlineCode> contains a single row.
      </p>
      <p className="mt-3">
        Response headers include entitlement metadata:{" "}
        <InlineCode>X-Entitlement-Tier</InlineCode>,{" "}
        <InlineCode>X-Entitlement-Window</InlineCode>,{" "}
        <InlineCode>X-RateLimit-Limit</InlineCode>,{" "}
        <InlineCode>X-RateLimit-Remaining</InlineCode>, and{" "}
        <InlineCode>X-RateLimit-Reset</InlineCode>. These allow programmatic monitoring
        of quota consumption without an additional API call.
      </p>
    </>
  ),
  traceability: (
    <ul className="list-disc pl-5">
      <li>Storage layout: <InlineCode>data/published/v1/{"<genre>"}/{"<chain>"}/{"<window>"}.json</InlineCode></li>
      <li>Window files: <InlineCode>latest · last7d · last30d · last90d · last180d · last365d</InlineCode></li>
      <li>Genres: <InlineCode>gold · meta · derived</InlineCode></li>
      <li>Chains: <InlineCode>bitcoin · ethereum · arbitrum · base</InlineCode></li>
    </ul>
  ),
};

const errorCodesExplain: ExplainPair = {
  basic: (
    <>
      <p>
        Every error response from the API is a JSON object with a <InlineCode>code</InlineCode>{" "}
        field that tells you exactly what went wrong. Here are the ones you will encounter:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>
          <span className="font-medium text-white">unauthenticated</span> (401) — your API
          key is missing, invalid, or has been revoked.
        </li>
        <li>
          <span className="font-medium text-white">forbidden</span> (403) — your key is
          valid but the request is outside your entitlement scope. The <InlineCode>detail</InlineCode>{" "}
          field tells you which dimension failed (chain, genre, window, or date range).
        </li>
        <li>
          <span className="font-medium text-white">rate_limited</span> (429) — you have
          exceeded your plan's request limit. Check the <InlineCode>Retry-After</InlineCode>{" "}
          header and wait before retrying.
        </li>
        <li>
          <span className="font-medium text-white">not_found</span> (404) — the requested
          file does not exist in the published dataset. Check your path.
        </li>
        <li>
          <span className="font-medium text-white">server_error</span> (500) — something
          went wrong on our side. Check the status page.
        </li>
      </ul>
    </>
  ),
  advanced: (
    <>
      <p>
        All error responses follow a consistent JSON envelope:{" "}
        <InlineCode>{"{ code, message, detail? }"}</InlineCode>. The{" "}
        <InlineCode>code</InlineCode> field is a stable machine-readable string suitable
        for programmatic handling. The <InlineCode>message</InlineCode> is a
        human-readable description. The optional <InlineCode>detail</InlineCode> provides
        additional context — for 403s this always specifies the entitlement dimension that
        was violated.
      </p>
      <p className="mt-3">
        The 403/404 distinction is intentional and security-relevant. A 404 means the
        file genuinely does not exist in the published dataset. A 403 means the file may
        exist but your entitlement does not cover it. This prevents entitlement probing
        via 404 responses.
      </p>
      <p className="mt-3">
        429 responses always include <InlineCode>Retry-After</InlineCode> (seconds until
        the window resets) and the standard rate limit headers. Repeated violations beyond
        the 429 threshold may trigger a cooldown period — the response envelope will
        indicate this via the <InlineCode>detail</InlineCode> field.
      </p>
    </>
  ),
  traceability: (
    <ul className="list-disc pl-5">
      <li>401: <InlineCode>unauthenticated</InlineCode> — key missing/invalid/revoked</li>
      <li>403: <InlineCode>forbidden</InlineCode> — entitlement violation (chain/genre/window/date)</li>
      <li>404: <InlineCode>not_found</InlineCode> — file absent from published dataset</li>
      <li>429: <InlineCode>rate_limited</InlineCode> — quota exceeded; Retry-After always present</li>
      <li>500: <InlineCode>server_error</InlineCode> — server-side failure</li>
    </ul>
  ),
};

const whnExplain: ExplainPair = {
  basic: (
    <>
      <p>
        The WHN (What's Happening Now) endpoint surfaces anomaly signals for a chain — the
        metrics that are currently behaving most unusually relative to their 30-day baseline.
        Up to five signals are returned, ranked by how unusual they are.
      </p>
      <p className="mt-3">
        Each signal tells you: which metric, how unusual it is (as a z-score), which
        direction (rising or falling), and how severe it is (medium or high). This is
        different from the driver list on chain pages — WHN uses a simpler standard z-score
        against a 30-day window, deliberately kept lightweight for fast anomaly detection.
      </p>
    </>
  ),
  advanced: (
    <>
      <p>
        WHN uses standard z-score (not MAD-based) against a 30-day lookback:{" "}
        <InlineCode>z = (x − mean_30d) / std_30d</InlineCode>. This is intentionally
        different from the regime engine's robust z-score. WHN is a fast anomaly surface,
        not a classification input — it uses a simpler statistic because it is optimised
        for responsiveness to short-term deviations, not distributional robustness.
      </p>
      <p className="mt-3">
        Severity thresholds: medium if <InlineCode>|z| ≥ 2.0</InlineCode>, high if{" "}
        <InlineCode>|z| ≥ 3.0</InlineCode>. A maximum of 5 signals are returned, sorted
        by <InlineCode>|z|</InlineCode> descending. This difference from{" "}
        <InlineCode>z_robust</InlineCode> in the driver set is documented in the glossary
        and should be understood before combining WHN signals with driver z-scores.
      </p>
    </>
  ),
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ApiDocsPage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <ModalStyles />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <header className="mb-10">
        <div className="rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_40%)] p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
                Developer reference
              </div>
              <h1 className="mt-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">
                API Docs
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-300">
                Machine-readable access to published Urd Atlas data. Most endpoints are
                public and require no key. Subscriber file delivery is authenticated and
                enforces entitlement scope per your plan.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <MoreLink id="auth-modal" label="How authentication works" />
                <MoreLink id="entitlements-modal" label="Entitlements and plans" />
                <MoreLink id="errors-modal" label="Error codes" />
                <Link
                  href="/dashboard"
                  className="inline-flex items-center rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20"
                >
                  Get an API key →
                </Link>
              </div>
            </div>

            {dataset ? (
              <div className="min-w-[200px] rounded-2xl border border-white/10 bg-black/10 px-4 py-4 text-xs text-slate-300">
                <div className="font-medium uppercase tracking-[0.12em] text-slate-400">Dataset</div>
                {dataset.version ? (
                  <div className="mt-2">Revision <span className="font-semibold text-white">{dataset.version}</span></div>
                ) : null}
                {dataset.methodology_version ? (
                  <div className="mt-1">Methodology <InlineCode>{dataset.methodology_version}</InlineCode></div>
                ) : null}
                <div className="mt-2 border-t border-white/10 pt-2 text-slate-400">
                  Source: <InlineCode>{currentDataSource()}</InlineCode>
                </div>
              </div>
            ) : null}
          </div>

          {/* Reading map */}
          <div className="mt-6 rounded-2xl border border-white/8 bg-white/3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                  On this page
                </div>
                <div className="mt-2 text-sm text-slate-100">
                  Public endpoints → Authenticated file delivery → Entitlement matrix → Error codes → Quick-start example
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Public endpoints ─────────────────────────────────────────────── */}
      <section className="mb-8 rounded-3xl border shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-5">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
              No key required
            </div>
            <h2 className="mt-1 text-3xl font-semibold">Public endpoints</h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
              All public endpoints are read-only, unauthenticated, and return descriptive
              published data. They power the public pages of this site and are available to
              any HTTP client.
            </p>
          </div>
        </div>

        <div className="divide-y divide-border">
          {PUBLIC_ROUTES.map((route) => (
            <div key={`${route.method}-${route.path}`} className="px-6 py-5 hover:bg-muted/10">
              <div className="flex flex-wrap items-start gap-3">
                <span className="mt-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-300">
                  {route.method}
                </span>
                <InlineCode>{route.path}</InlineCode>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{route.description}</p>
              {route.fields.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {route.fields.map((f) => (
                    <InlineCode key={f}>{f}</InlineCode>
                  ))}
                </div>
              ) : null}
              {route.path.includes("whn") ? (
                <div className="mt-2">
                  <MoreLink id="whn-modal" label="How WHN works" />
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="border-t px-6 py-4">
          <div className="text-xs text-muted-foreground">
            All public routes return{" "}
            <InlineCode>{"{ ok, generated_at_utc, data_source, dataset, ... }"}</InlineCode>{" "}
            at the top level.
          </div>
        </div>
      </section>

      {/* ── Authenticated file delivery ───────────────────────────────────── */}
      <section className="mb-8 rounded-3xl border shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-5">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
              Requires API key
            </div>
            <h2 className="mt-1 text-3xl font-semibold">Authenticated endpoints</h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
              Send your API key in the <InlineCode>X-API-Key</InlineCode> header.
              Entitlements are enforced per your subscription plan.
            </p>
          </div>
          <MoreLink id="file-delivery-modal" label="File delivery in depth" />
        </div>

        <div className="divide-y divide-border">
          {AUTHENTICATED_ROUTES.map((route) => (
            <div key={`${route.method}-${route.path}`} className="px-6 py-5 hover:bg-muted/10">
              <div className="flex flex-wrap items-start gap-3">
                <span className={`mt-0.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
                  route.method === "GET"
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                    : route.method === "POST"
                    ? "border-blue-500/25 bg-blue-500/10 text-blue-300"
                    : "border-red-500/25 bg-red-500/10 text-red-300"
                }`}>
                  {route.method}
                </span>
                <InlineCode>{route.path}</InlineCode>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{route.description}</p>
              {route.fields.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {route.fields.map((f) => (
                    <InlineCode key={f}>{f}</InlineCode>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* ── Entitlement matrix ───────────────────────────────────────────── */}
      <section className="mb-8 rounded-3xl border shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-5">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
              Access control
            </div>
            <h2 className="mt-1 text-3xl font-semibold">Entitlement matrix</h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
              What each plan can access via the file delivery API.
            </p>
          </div>
          <MoreLink id="entitlements-modal" label="Entitlements in depth" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Dimension</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Public (no key)</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-emerald-400">Basic · $29/mo</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-cyan-400">Pro · $79/mo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                {
                  dim: "Chains",
                  pub: "All 4 (UI only)",
                  basic: "1 chain (your choice)",
                  pro: "All 4 chains",
                },
                {
                  dim: "Genres",
                  pub: "—",
                  basic: "gold · meta · derived",
                  pro: "gold · meta · derived",
                },
                {
                  dim: "Windows",
                  pub: "—",
                  basic: "latest · 7d · 30d · 90d",
                  pro: "latest · 7d · 30d · 90d · 180d · 365d",
                },
                {
                  dim: "History depth",
                  pub: "—",
                  basic: "90 days",
                  pro: "365 days",
                },
                {
                  dim: "History Add-on",
                  pub: "—",
                  basic: "$149 once → full history",
                  pro: "$149 once → full history",
                },
                {
                  dim: "Rate limit",
                  pub: "—",
                  basic: "60 req/min",
                  pro: "300 req/min",
                },
                {
                  dim: "API keys",
                  pub: "—",
                  basic: "Up to 2",
                  pro: "Up to 2",
                },
                {
                  dim: "Custom threshold outputs",
                  pub: "—",
                  basic: "Local simulation only",
                  pro: "✓ identity-hashed JSON",
                },
              ].map((row) => (
                <tr key={row.dim} className="hover:bg-muted/10">
                  <td className="px-5 py-3 font-medium text-white">{row.dim}</td>
                  <td className="px-5 py-3 text-muted-foreground">{row.pub}</td>
                  <td className="px-5 py-3 text-slate-200">{row.basic}</td>
                  <td className="px-5 py-3 text-slate-200">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Response headers ─────────────────────────────────────────────── */}
      <section className="mb-8 rounded-3xl border p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
              Headers
            </div>
            <h2 className="mt-1 text-2xl font-semibold">Response headers</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Authenticated file delivery responses include these headers for programmatic
              monitoring.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            { header: "X-Account-Id", desc: "Account UUID for the authenticated request" },
            { header: "X-API-Key-Prefix", desc: "First characters of the key used" },
            { header: "X-Entitlement-Tier", desc: "basic or pro" },
            { header: "X-Entitlement-Window", desc: "Maximum window token for your plan" },
            { header: "X-RateLimit-Limit", desc: "Request limit per minute for your tier" },
            { header: "X-RateLimit-Remaining", desc: "Requests remaining in current window" },
            { header: "X-RateLimit-Reset", desc: "Unix timestamp when the window resets" },
            { header: "Retry-After", desc: "Seconds to wait — present only on 429" },
          ].map(({ header, desc }) => (
            <div key={header} className="rounded-2xl border bg-background/40 px-4 py-3">
              <div className="font-mono text-xs font-medium text-cyan-200">{header}</div>
              <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Schema reference call-out ─────────────────────────────────────── */}
      <section className="mb-8 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
              Before you subscribe
            </div>
            <h2 className="mt-1 text-2xl font-semibold text-white">
              See every field you will receive
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
              The JSON Schema Reference documents every field in every published file — Gold,
              Meta, and Derived — with Basic and Advanced explanations derived directly from
              the pipeline source code. Know exactly what a subscription delivers before you
              subscribe.
            </p>
          </div>
          <Link
            href="/api-docs/schema"
            className="shrink-0 inline-flex items-center rounded-full border border-cyan-400/40 bg-cyan-500/10 px-5 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20"
          >
            JSON Schema Reference →
          </Link>
        </div>
      </section>

      {/* ── Quick start ──────────────────────────────────────────────────── */}
      <section className="mb-8 rounded-3xl border p-6 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
          Quick start
        </div>
        <h2 className="mt-1 text-2xl font-semibold">First API call in 60 seconds</h2>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          No key needed for public endpoints. Check the current status of all chains:
        </p>

        <div className="mt-4 space-y-4">
          <CodeBlock>{`# Check current chain status (no key required)
curl https://urdatlas.com/api/v1/status

# Download the latest Ethereum meta artifact (requires Pro key)
curl -H "X-API-Key: ta_live_xxxxxxxxx" \\
  https://urdatlas.com/api/v1/files/meta/ethereum/latest.json

# Download 90 days of Bitcoin gold data (requires Basic or Pro key)
curl -H "X-API-Key: ta_live_xxxxxxxxx" \\
  https://urdatlas.com/api/v1/files/gold/bitcoin/last90d.json`}</CodeBlock>

          <div className="rounded-2xl border border-white/8 bg-white/3 p-4 text-sm leading-7 text-slate-300">
            <span className="font-medium text-white">Base URL:</span>{" "}
            <InlineCode>https://urdatlas.com</InlineCode> in production. Replace
            with <InlineCode>http://localhost:3000</InlineCode> for local development.
          </div>
        </div>
      </section>

      {/* ── Navigation strip ─────────────────────────────────────────────── */}
      <section className="mt-10 rounded-3xl border p-6 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">Related</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/dashboard", label: "Dashboard", desc: "Create and manage API keys" },
            { href: "/thresholds", label: "Thresholds", desc: "Custom threshold output reference" },
            { href: "/methodology", label: "Methodology", desc: "What the published fields mean" },
            { href: "/glossary", label: "Glossary", desc: "Field-level definitions" },
            { href: "/status", label: "Status", desc: "Pipeline health and freshness" },
            { href: "/terms", label: "Terms", desc: "Usage terms for API access" },
          ].map(({ href, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center justify-between rounded-2xl border bg-background/40 px-4 py-3 transition hover:border-cyan-500/30 hover:bg-muted/30"
            >
              <div>
                <div className="text-sm font-medium text-white">{label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
              </div>
              <span className="text-xs text-muted-foreground transition group-hover:text-cyan-200">→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Data contract ─────────────────────────────────────────────────── */}
      <details className="mt-8 rounded-2xl border p-5">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
          Contract and traceability
        </summary>
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          <div>This page documents the API as implemented. Routes, entitlement rules, and rate limits
            are enforced server-side and cannot be overridden by client-side behaviour.</div>
          <div>Dataset context: <InlineCode>data/published/v1/dataset.json</InlineCode></div>
          <div>Storage backend: <InlineCode>{currentDataSource()}</InlineCode></div>
          <div>Methodology version: <InlineCode>{dataset?.methodology_version ?? "—"}</InlineCode></div>
        </div>
      </details>

      {/* ── All modals ────────────────────────────────────────────────────── */}
      <ExplainModal
        id="auth-modal"
        title="How authentication works"
        subtitle="API keys, storage, and the request validation pipeline."
        pair={authExplain}
      />
      <ExplainModal
        id="entitlements-modal"
        title="Entitlements and plans"
        subtitle="What each subscription tier can access via the file delivery API."
        pair={entitlementsExplain}
      />
      <ExplainModal
        id="file-delivery-modal"
        title="File delivery in depth"
        subtitle="How the authenticated file endpoint works and what it returns."
        pair={fileDeliveryExplain}
      />
      <ExplainModal
        id="errors-modal"
        title="Error codes"
        subtitle="Every error the API can return and what each one means."
        pair={errorCodesExplain}
      />
      <ExplainModal
        id="whn-modal"
        title="What's Happening Now (WHN)"
        subtitle="How anomaly signals are computed and how they differ from driver z-scores."
        pair={whnExplain}
      />
    </main>
  );
}
