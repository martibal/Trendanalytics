// src/app/api-docs/page.tsx
import Link from "next/link";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { currentDataSource } from "@/lib/storage";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function InlineCode({ children }: { children: string }) {
  return <code className="rounded bg-muted px-1 py-0.5">{children}</code>;
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border bg-muted/30 p-4 text-xs leading-6 text-foreground">
      <code>{children}</code>
    </pre>
  );
}

type PublicRoute = {
  path: string;
  description: string;
  notableFields?: string[];
};

const PUBLIC_ROUTES: PublicRoute[] = [
  {
    path: "/api/v1/status",
    description: "System freshness and chain-level publication status.",
    notableFields: ["dataset", "chains[]", "data_source"],
  },
  {
    path: "/api/v1/landing",
    description: "Landing page support payload for public overview cards.",
    notableFields: ["product_boundary", "chains[].confidence_band", "traceability.canonical_contract"],
  },
  {
    path: "/api/v1/glossary",
    description: "Glossary payload for public definitions and explanatory content.",
    notableFields: ["entry_count", "entries[].units", "traceability.source_mode"],
  },
  {
    path: "/api/v1/methodology/versions",
    description: "Published methodology versions for traceability.",
    notableFields: ["version_count", "versions[]", "traceability.canonical_contract"],
  },
  {
    path: "/api/v1/thresholds/defaults",
    description: "Published default thresholds and descriptive threshold context.",
    notableFields: ["group_count", "thresholds[]", "traceability.canonical_contract"],
  },
  {
    path: "/api/v1/units",
    description: "Units and presentation metadata for published metrics.",
    notableFields: ["known_chains", "units", "traceability.source_mode"],
  },
  {
    path: "/api/v1/summary/[chain]",
    description: "Per-chain summary endpoint used by public chain views.",
    notableFields: ["summary.confidence_band", "scorecard", "traceability.canonical_contract"],
  },
  {
    path: "/api/v1/whn/[chain]",
    description: "Per-chain “what’s happening now” descriptive endpoint.",
    notableFields: ["current_state.confidence_band", "whats_happening_now[]", "traceability.canonical_contract"],
  },
];

export default async function ApiDocsPage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">API Docs</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Machine-readable access to TrendAnalytics published artifacts. Public endpoints support
              the public website; authenticated file delivery supports subscriber access to published
              JSON artifacts within entitlement scope.
            </p>
          </div>

          <div className="rounded-xl border px-4 py-3 text-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Published context
            </div>
            <div className="mt-1 font-medium text-foreground">
              Dataset: {dataset?.version ?? "—"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Methodology: {dataset?.methodology_version ?? "—"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Data source: {currentDataSource()}
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6">
        <Section title="Public vs authenticated access">
          <p>
            The public site uses public, read-only v1 endpoints and published public artifacts. Those
            routes are intended to support public pages such as status, glossary, methodology, chain
            summaries, and related descriptive UI.
          </p>
          <p>
            Subscriber file delivery is separate. It is provided through an authenticated route that
            enforces API key validity, entitlement scope, rate limits, and published-file availability.
          </p>
        </Section>

        <Section title="Public v1 response contract">
          <p>
            Public v1 routes should expose published artifacts and descriptive documentation, not hidden
            runtime model state. Across the public surface, consumers should expect recurring top-level
            fields such as <InlineCode>ok</InlineCode>, <InlineCode>generated_at_utc</InlineCode>,{" "}
            <InlineCode>data_source</InlineCode>, <InlineCode>dataset</InlineCode>, and often{" "}
            <InlineCode>traceability</InlineCode>.
          </p>
          <p>
            Where relevant, routes now also expose <InlineCode>canonical_contract</InlineCode> blocks so
            consumers can see whether a route is using published meta latest, module fallback, route-defined
            defaults, or other explicit source boundaries.
          </p>
        </Section>

        <Section title="Authentication model">
          <p>
            Authenticated file delivery requires a valid API key supplied via the{" "}
            <InlineCode>X-API-Key</InlineCode> request header.
          </p>
          <p>
            Requests are checked against the account’s entitlement scope, including plan tier, chain,
            window depth, and any additional history scope where applicable.
          </p>
          <p>
            The service distinguishes between authentication failure, entitlement failure, missing
            files, and rate limiting.
          </p>
        </Section>

        <Section title="Authenticated file delivery route">
          <p>Canonical route:</p>
          <CodeBlock>{`GET /api/v1/files/[...path]`}</CodeBlock>

          <p>Canonical published storage layout:</p>
          <CodeBlock>{`/data/published/v1/<genre>/<chain>/<window-or-file>`}</CodeBlock>

          <p>Supported genres include:</p>
          <ul className="list-disc pl-5">
            <li><InlineCode>gold</InlineCode></li>
            <li><InlineCode>meta</InlineCode></li>
            <li><InlineCode>derived</InlineCode></li>
          </ul>

          <p>Supported chains currently include:</p>
          <ul className="list-disc pl-5">
            <li><InlineCode>bitcoin</InlineCode></li>
            <li><InlineCode>ethereum</InlineCode></li>
            <li><InlineCode>arbitrum</InlineCode></li>
            <li><InlineCode>base</InlineCode></li>
          </ul>
        </Section>

        <Section title="Authenticated request example">
          <CodeBlock>{`curl -i \\
  -H "X-API-Key: ta_live_xxxxxxxxx" \\
  http://localhost:3000/api/v1/files/meta/bitcoin/90d/latest.json`}</CodeBlock>

          <p>
            The API key is evaluated first. If authentication succeeds, the request is then checked
            against chain entitlement, window entitlement, and file availability.
          </p>
        </Section>

        <Section title="Response semantics">
          <ul className="list-disc pl-5">
            <li>
              <InlineCode>200 OK</InlineCode>: the published file exists and is inside entitlement scope.
            </li>
            <li>
              <InlineCode>401 Unauthorized</InlineCode>: missing, invalid, or revoked API key.
            </li>
            <li>
              <InlineCode>403 Forbidden</InlineCode>: valid key, but request exceeds entitlement scope
              or key/subscription is suspended/inactive.
            </li>
            <li>
              <InlineCode>404 Not Found</InlineCode>: the requested published file path does not exist.
            </li>
            <li>
              <InlineCode>429 Too Many Requests</InlineCode>: authenticated rate limit exceeded for the account tier.
            </li>
          </ul>
        </Section>

        <Section title="Important headers">
          <p>The authenticated file route may return metadata headers such as:</p>
          <ul className="list-disc pl-5">
            <li><InlineCode>X-Account-Id</InlineCode></li>
            <li><InlineCode>X-API-Key-Prefix</InlineCode></li>
            <li><InlineCode>X-Entitlement-Tier</InlineCode></li>
            <li><InlineCode>X-Entitlement-Window</InlineCode></li>
            <li><InlineCode>X-RateLimit-Limit</InlineCode></li>
            <li><InlineCode>X-RateLimit-Remaining</InlineCode></li>
            <li><InlineCode>X-RateLimit-Reset</InlineCode></li>
            <li><InlineCode>Retry-After</InlineCode> when rate-limited</li>
            <li><InlineCode>X-Data-Source</InlineCode></li>
            <li><InlineCode>X-Storage-Backend</InlineCode></li>
          </ul>
        </Section>

        <Section title="Public v1 endpoints">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Notable fields</th>
                </tr>
              </thead>
              <tbody>
                {PUBLIC_ROUTES.map((route) => (
                  <tr key={route.path} className="border-b last:border-b-0 align-top">
                    <td className="px-4 py-3">
                      <InlineCode>{route.path}</InlineCode>
                    </td>
                    <td className="px-4 py-3">{route.description}</td>
                    <td className="px-4 py-3">
                      {route.notableFields && route.notableFields.length > 0 ? (
                        <ul className="list-disc pl-5">
                          {route.notableFields.map((field) => (
                            <li key={field}>
                              <InlineCode>{field}</InlineCode>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Public route examples">
          <CodeBlock>{`GET /api/v1/landing
GET /api/v1/status
GET /api/v1/glossary
GET /api/v1/methodology/versions
GET /api/v1/thresholds/defaults
GET /api/v1/units
GET /api/v1/summary/bitcoin
GET /api/v1/whn/bitcoin`}</CodeBlock>

          <p>
            Public routes are read-only and descriptive. They should help clients understand the current
            published state, methodology version, freshness context, explanation layers, and supporting metadata.
          </p>
        </Section>

        <Section title="Checkout and billing routes">
          <p>Subscriber billing flow is initiated through:</p>
          <ul className="list-disc pl-5">
            <li><InlineCode>POST /api/v1/checkout</InlineCode></li>
            <li><InlineCode>POST /api/v1/webhook</InlineCode></li>
          </ul>
          <p>
            These routes support subscriber plan purchase and Stripe webhook processing. They are part
            of the subscriber system, not the public descriptive website surface.
          </p>
        </Section>

        <Section title="Contract boundaries">
          <p>
            The API is designed around published artifacts. Public routes and authenticated file
            delivery should expose published data, not runtime recomputation of hidden model state.
          </p>
          <p>
            Consumers should treat methodology version, freshness, revision state, chain-specific
            lag, and explicit traceability metadata as part of the interpretation contract.
          </p>
          <p>
            Public routes in this version also increasingly expose route-level{" "}
            <InlineCode>traceability.canonical_contract</InlineCode> blocks so consumers can see the
            intended source-of-truth boundary directly in each response.
          </p>
        </Section>

        <Section title="Related pages">
          <ul className="list-disc pl-5">
            <li>
              <Link href="/dashboard" className="underline">
                /dashboard
              </Link>
            </li>
            <li>
              <Link href="/status" className="underline">
                /status
              </Link>
            </li>
            <li>
              <Link href="/methodology" className="underline">
                /methodology
              </Link>
            </li>
            <li>
              <Link href="/glossary" className="underline">
                /glossary
              </Link>
            </li>
            <li>
              <Link href="/terms" className="underline">
                /terms
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="underline">
                /privacy
              </Link>
            </li>
          </ul>
        </Section>

        <section className="rounded-xl border p-6 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">Traceability</div>
          <p className="mt-2">
            This page documents the current product-facing API contract as implemented in the web
            application. It should remain aligned with route protection, entitlement logic, rate
            limiting, published storage layout, public v1 route contracts, and subscriber billing flow.
          </p>
        </section>
      </div>
    </main>
  );
}