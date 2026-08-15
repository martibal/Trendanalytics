import Link from "next/link";

import PageHero from "@/components/site/PageHero";
import {
  UrdButtonLink,
  UrdCallout,
  UrdCard,
  UrdContainer,
  UrdInlineCode,
  UrdPage,
  UrdSection,
} from "@/components/site/UrdDesignSystem";

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border border-[var(--urd-border-soft)] bg-[var(--urd-raised)] p-5 text-xs leading-6 text-[var(--urd-text-strong)]">
      <code>{children}</code>
    </pre>
  );
}

export default function GettingStartedCurrent() {
  return (
    <UrdPage>
      <PageHero
        eyebrow="API Docs"
        title="Getting started with the Urd Atlas JSON API"
        summary="Start with one authenticated file, then choose the history path that matches your subscription. Basic includes 90 days on one selected chain. Pro includes the full published history across all four chains."
      >
        <div className="flex flex-wrap gap-2">
          <UrdButtonLink href="/api-docs">← Back to API Docs</UrdButtonLink>
          <UrdButtonLink href="/api-docs/history">History access</UrdButtonLink>
          <UrdButtonLink href="/api-docs/schema">Schema reference</UrdButtonLink>
        </div>
      </PageHero>

      <UrdContainer>
        <div className="grid gap-6">
          <UrdSection eyebrow="First principles" title="What a paid subscription gives you">
            <p className="max-w-4xl text-sm leading-7 text-[var(--urd-text-body)]">
              Urd Atlas publishes four JSON genres: Gold, Derived, Meta and Briefs. Paid access lets your own tools retrieve those published artifacts with an <UrdInlineCode>X-API-Key</UrdInlineCode>. The API key is checked against the account&apos;s current subscription each time it is used.
            </p>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <UrdCard className="p-5">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Basic · $49/month</div>
                <h2 className="mt-2 text-xl font-semibold text-[var(--urd-text-strong)]">One selected chain · 90 days immediately</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--urd-text-body)]">
                  Basic includes authenticated daily delivery plus the latest, 7d, 30d and 90d bundle files for the selected chain. You do not have to wait 90 days after subscribing; the historical window is available immediately.
                </p>
              </UrdCard>
              <UrdCard className="p-5">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Pro · $149/month</div>
                <h2 className="mt-2 text-xl font-semibold text-[var(--urd-text-strong)]">All four chains · full published history immediately</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--urd-text-body)]">
                  Pro includes Bitcoin, Ethereum, Arbitrum and Base, the standard bundle windows through 365d, and the complete published archive. Full history is not capped at 365 days; it grows as new daily records are published.
                </p>
              </UrdCard>
            </div>
          </UrdSection>

          <UrdSection eyebrow="Step 1" title="Create an API key">
            <p className="max-w-4xl text-sm leading-7 text-[var(--urd-text-body)]">
              After checkout, open <Link href="/dashboard" className="font-semibold text-blue-700 underline">Dashboard</Link> and create an API key. Copy the full key when it is shown and store it like a password. Subscriber file delivery expects the key in the <UrdInlineCode>X-API-Key</UrdInlineCode> request header.
            </p>
          </UrdSection>

          <UrdSection eyebrow="Step 2" title="Fetch one current Meta file first">
            <p className="max-w-4xl text-sm leading-7 text-[var(--urd-text-body)]">
              Start with one current file before attempting history or automation. Meta is the shortest path to the daily regime label, confidence and drivers.
            </p>
            <div className="mt-4">
              <CodeBlock>{`curl -H "X-API-Key: YOUR_KEY" \\
  https://www.urdatlas.com/api/v1/files/meta/ethereum/latest.json`}</CodeBlock>
            </div>
            <UrdCallout tone="info">
              A successful request returns the published JSON object. If this works, authentication and chain scope are working; add history next.
            </UrdCallout>
          </UrdSection>

          <UrdSection eyebrow="Step 3" title="Bootstrap the history included with your plan">
            <div className="grid gap-4 lg:grid-cols-2">
              <UrdCard className="p-5">
                <h3 className="text-lg font-semibold text-[var(--urd-text-strong)]">Basic: fetch the 90-day bundle</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--urd-text-body)]">
                  Use the 90d bundle once to bootstrap your local dataset, then append the current <UrdInlineCode>latest.json</UrdInlineCode> file as new days are published.
                </p>
                <div className="mt-4">
                  <CodeBlock>{`curl -H "X-API-Key: YOUR_KEY" \\
  https://www.urdatlas.com/api/v1/files/meta/ethereum/90d/latest.json`}</CodeBlock>
                </div>
              </UrdCard>

              <UrdCard className="p-5">
                <h3 className="text-lg font-semibold text-[var(--urd-text-strong)]">Pro: discover and fetch the complete archive</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--urd-text-body)]">
                  Read the manifest for the genre and chain, then fetch whichever original daily artifacts your workflow needs. This avoids one ever-growing response and preserves the published day files 1:1.
                </p>
                <div className="mt-4">
                  <CodeBlock>{`# Discover published dates
curl -H "X-API-Key: YOUR_KEY" \\
  https://www.urdatlas.com/api/v1/files/meta/ethereum/manifest.json

# Fetch one published day
curl -H "X-API-Key: YOUR_KEY" \\
  https://www.urdatlas.com/api/v1/files/meta/ethereum/2024-12-01.json`}</CodeBlock>
                </div>
              </UrdCard>
            </div>
          </UrdSection>

          <UrdSection eyebrow="Paths" title="Available bundle windows">
            <div className="overflow-x-auto rounded-2xl border border-[var(--urd-border-soft)]">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b bg-[var(--urd-raised)]">
                  <tr>
                    <th className="px-4 py-3">Path token</th>
                    <th className="px-4 py-3">Meaning</th>
                    <th className="px-4 py-3">Available on</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--urd-text-body)]">
                  {[
                    ["latest", "Most recent published day", "Basic + Pro"],
                    ["7d", "Rolling 7-day bundle", "Basic + Pro"],
                    ["30d", "Rolling 30-day bundle", "Basic + Pro"],
                    ["90d", "Rolling 90-day bundle", "Basic + Pro"],
                    ["180d", "Rolling 180-day bundle", "Pro"],
                    ["365d", "Rolling 365-day bundle", "Pro"],
                    ["manifest.json + YYYY-MM-DD.json", "Complete published archive", "Pro"],
                  ].map(([token, meaning, plan]) => (
                    <tr key={token} className="border-b last:border-b-0">
                      <td className="px-4 py-3"><UrdInlineCode>{token}</UrdInlineCode></td>
                      <td className="px-4 py-3">{meaning}</td>
                      <td className="px-4 py-3">{plan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </UrdSection>

          <UrdSection eyebrow="Genres" title="Use the same access model across the published layers">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Meta", "Regime, confidence, status, scorecard and drivers."],
                ["Gold", "Canonical daily on-chain measurements."],
                ["Derived", "Published rolling and derived feature context."],
                ["Briefs", "Readable summaries generated from the published state layer."],
              ].map(([name, description]) => (
                <UrdCard key={name} className="p-5">
                  <h3 className="font-semibold text-[var(--urd-text-strong)]">{name}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--urd-text-body)]">{description}</p>
                </UrdCard>
              ))}
            </div>
            <p className="mt-4 text-sm leading-7 text-[var(--urd-text-body)]">
              Gold, Derived and Meta use <UrdInlineCode>/api/v1/files/[genre]/[chain]/...</UrdInlineCode>. Briefs use <UrdInlineCode>/api/v1/files/briefs/chains/[chain]/...</UrdInlineCode>.
            </p>
          </UrdSection>

          <UrdSection eyebrow="Daily operation" title="After the initial history bootstrap">
            <p className="max-w-4xl text-sm leading-7 text-[var(--urd-text-body)]">
              Urd Atlas publishes the new artifacts; your system fetches them. For normal daily ingestion, check the public <Link href="/status" className="font-semibold text-blue-700 underline">Status</Link> endpoint and fetch <UrdInlineCode>latest.json</UrdInlineCode> when a new published date appears. You do not need to redownload the entire history every day.
            </p>
          </UrdSection>

          <UrdSection eyebrow="Next" title="Continue with the technical references">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["/api-docs/history", "History access", "Exact Basic and Pro history paths."],
                ["/api-docs/schema", "Schema reference", "Field-level contract for published JSON."],
                ["/api-docs/samples", "Sample pack", "Real artifacts for testing parsing and joins."],
                ["/methodology/reference", "Methodology", "How the classification layer is produced."],
              ].map(([href, title, body]) => (
                <Link key={href} href={href} className="rounded-2xl border border-[var(--urd-border-soft)] bg-[var(--urd-raised)] p-4">
                  <div className="font-semibold text-[var(--urd-text-strong)]">{title}</div>
                  <div className="mt-2 text-sm leading-6 text-[var(--urd-text-body)]">{body}</div>
                </Link>
              ))}
            </div>
          </UrdSection>
        </div>
      </UrdContainer>
    </UrdPage>
  );
}
