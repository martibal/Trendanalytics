// src/app/api-docs/page.tsx
import type { ReactNode } from "react";
import Link from "next/link";

import PageHero from "@/components/site/PageHero";
import ShortFullContent from "@/components/site/ShortFullContent";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";

const PUBLIC_ENDPOINTS: Array<[string, string, string]> = [
  ["GET", "/api/v1/status", "Per-chain freshness, lag, and publication context."],
  ["GET", "/api/v1/landing", "Landing snapshot across chains."],
  ["GET", "/api/v1/summary/[chain]", "Chain summary with regime, scorecard, and drivers."],
  ["GET", "/api/v1/glossary", "Public glossary payload."],
  ["GET", "/api/v1/thresholds/defaults", "Canonical default threshold values."],
  ["GET", "/api/v1/methodology/versions", "Published methodology version history."],
];

const AUTH_ENDPOINTS: Array<[string, string, string]> = [
  ["GET", "/api/v1/files/[genre]/[chain]/[window]/latest.json", "Authenticated file delivery for subscriber artifacts."],
  ["POST", "/api/v1/keys", "Create a new API key from the dashboard."],
  ["DELETE", "/api/v1/keys", "Revoke a stored API key."],
  ["POST", "/api/v1/checkout", "Checkout endpoint — documented, but billing is inactive until business registration is complete."],
  ["POST", "/api/v1/checkout/portal", "Customer portal endpoint — documented, but billing is inactive until business registration is complete."],
];

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-[#cfe0f1] px-1.5 py-0.5 font-mono text-xs font-semibold text-[#0d2447]">
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border border-[#0d2a4d]/30 bg-[#031329] p-5 text-xs leading-6 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <code>{children}</code>
    </pre>
  );
}

function HeroButton({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "inline-flex items-center rounded-full border border-blue-200/70 bg-[#d8e9fb] px-4 py-2 text-sm font-extrabold text-[#031329] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition hover:border-white hover:bg-white"
          : "inline-flex items-center rounded-full border border-white/15 bg-white/[0.05] px-4 py-2 text-sm font-extrabold text-white/88 transition hover:bg-white/[0.09] hover:text-white"
      }
    >
      {children}
    </Link>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#b6cce3] bg-[#e7f1fb] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
      <h2 className="text-xl font-black tracking-[-0.025em] text-[#0d2447]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function EndpointTable({
  rows,
}: {
  rows: Array<[string, string, string]>;
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-[#8fb0d1] bg-[#e7f1fb]">
      <table className="w-full text-left text-sm text-[#0d2447]">
        <thead className="border-b border-[#8fb0d1] bg-[#cfe0f1] text-xs font-black uppercase tracking-[0.08em] text-[#0d2447]">
          <tr>
            <th className="px-4 py-3">Method</th>
            <th className="px-4 py-3">Path</th>
            <th className="px-4 py-3">Purpose</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([method, path, description]) => (
            <tr
              key={path}
              className="border-b border-[#9db8d4] align-top last:border-b-0 hover:bg-[#dceaf8]"
            >
              <td className="px-4 py-3 font-mono text-xs font-black text-[#0d2447]">
                {method}
              </td>
              <td className="px-4 py-3">
                <InlineCode>{path}</InlineCode>
              </td>
              <td className="px-4 py-3 leading-6 text-[#27476f]">
                {description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ApiDocsPage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  return (
    <main className="min-h-screen bg-[#edf6ff] text-[#0a1d3a]">
      <PageHero
        eyebrow="API documentation"
        title="API Docs"
        summary="Authenticate once, fetch published JSON artifacts directly, and use the methodology and sample pack to validate exactly what the product delivers."
      >
        <div className="flex flex-wrap gap-2">
          <HeroButton href="/api-docs/getting-started" primary>
            Getting started
          </HeroButton>
          <HeroButton href="/api-docs/schema">Schema reference</HeroButton>
          <HeroButton href="/api-docs/samples">Public sample pack</HeroButton>
          <HeroButton href="/api-docs/workflows">Common workflows</HeroButton>
        </div>

        <div className="mt-6 max-w-[460px] rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-4 text-xs text-white/78">
          <div className="font-black uppercase tracking-[0.12em] text-blue-200">
            Published context
          </div>
          <div className="mt-2">
            Published revision{" "}
            <span className="font-semibold text-white">
              {dataset?.version ?? "—"}
            </span>
          </div>
          <div className="mt-1">
            Methodology{" "}
            <span className="font-semibold text-white">
              {dataset?.methodology_version ?? "—"}
            </span>
          </div>
          <div className="mt-2 text-white/62">
            Public provenance is anchored in date, updated_through,
            methodology_version, published revision, and regime.determinism_hash.
          </div>
        </div>
      </PageHero>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <ShortFullContent
          pageKey="api-docs"
          summary={
            <>
              Use this page to see what the API delivers, what you should inspect
              before buying, and where to go first.
            </>
          }
          bullets={[
            <>
              Start with <strong>Getting started</strong> if you want the fastest
              route from zero to your first pull.
            </>,
            <>
              Open <strong>Public sample pack</strong> to inspect real JSON
              artifacts before subscribing.
            </>,
            <>
              Use <strong>Schema reference</strong> when you need exact parsing
              and field structure.
            </>,
            <>
              Use <strong>Common workflows</strong> when you want to see how
              analysts and dashboards actually use the data.
            </>,
          ]}
          whyItMatters={
            <>
              A technical buyer should immediately know where to start, what the
              API returns, and how to validate the product before purchase.
            </>
          }
          fullContent={
            <div className="grid gap-6">
              <Card title="Before you buy">
                <div className="mt-4 grid gap-4 text-sm leading-7 text-[#27476f] lg:grid-cols-3">
                  <div className="rounded-xl border border-[#9db8d4] bg-[#dceaf8] p-4">
                    <div className="font-black text-[#0d2447]">
                      1. Download sample artifacts
                    </div>
                    <p className="mt-2">
                      Use the{" "}
                      <Link
                        href="/api-docs/samples"
                        className="font-semibold text-[#0d2447] underline"
                      >
                        public sample pack
                      </Link>{" "}
                      to inspect real Gold, Derived, and Meta files.
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#9db8d4] bg-[#dceaf8] p-4">
                    <div className="font-black text-[#0d2447]">
                      2. Validate methodology and provenance
                    </div>
                    <p className="mt-2">
                      Use the{" "}
                      <Link
                        href="/methodology/reference"
                        className="font-semibold text-[#0d2447] underline"
                      >
                        reference
                      </Link>
                      ,{" "}
                      <Link
                        href="/methodology/verification"
                        className="font-semibold text-[#0d2447] underline"
                      >
                        verification pack
                      </Link>
                      , and{" "}
                      <Link
                        href="/methodology/provenance"
                        className="font-semibold text-[#0d2447] underline"
                      >
                        provenance page
                      </Link>
                      .
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#9db8d4] bg-[#dceaf8] p-4">
                    <div className="font-black text-[#0d2447]">
                      3. See operational expectations
                    </div>
                    <p className="mt-2">
                      Read the{" "}
                      <Link
                        href="/service"
                        className="font-semibold text-[#0d2447] underline"
                      >
                        service expectations and revision policy
                      </Link>{" "}
                      before subscribing.
                    </p>
                  </div>
                </div>
              </Card>

              <Card title="Authentication model">
                <p className="mt-4 text-sm leading-7 text-[#27476f]">
                  Public endpoints require no key. Authenticated file delivery
                  uses <InlineCode>X-API-Key</InlineCode>. Keys are created from
                  the dashboard after purchase. Billing endpoints remain
                  documented but inactive until business registration is
                  completed.
                </p>

                <div className="mt-5">
                  <CodeBlock>
                    {`curl -H "X-API-Key: ta_live_xxxxxxxxx" https://www.urdatlas.com/api/v1/files/meta/bitcoin/90d/latest.json`}
                  </CodeBlock>
                </div>
              </Card>

              <Card title="Public endpoints">
                <EndpointTable rows={PUBLIC_ENDPOINTS} />
              </Card>

              <Card title="Authenticated endpoints">
                <EndpointTable rows={AUTH_ENDPOINTS} />
              </Card>
            </div>
          }
        />
      </div>
    </main>
  );
}