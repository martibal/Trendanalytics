import Link from "next/link";
import PageHero from "@/components/site/PageHero";
import { UrdButtonLink, UrdCard, UrdContainer, UrdInlineCode, UrdPage, UrdSection } from "@/components/site/UrdDesignSystem";

function Code({ children }: { children: string }) { return <pre className="overflow-x-auto rounded-2xl border border-[var(--urd-border-soft)] bg-[var(--urd-raised)] p-5 text-xs leading-6 text-[var(--urd-text-strong)]"><code>{children}</code></pre>; }

export default function ApiHistoryPage() {
  return (
    <UrdPage>
      <PageHero eyebrow="API Docs" title="Historical access" summary="History is available immediately when a paid subscription becomes active. Single Chain includes 90 days on the selected chain. Research includes the full published history across Bitcoin, Ethereum, Arbitrum and Base.">
        <div className="flex flex-wrap gap-2"><UrdButtonLink href="/api-docs">← Back to API Docs</UrdButtonLink><UrdButtonLink href="/api-docs/getting-started">Getting started</UrdButtonLink></div>
      </PageHero>
      <UrdContainer><div className="grid gap-6">
        <UrdSection eyebrow="Entitlements" title="What each plan can retrieve">
          <div className="grid gap-4 lg:grid-cols-2">
            <UrdCard className="p-5"><div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Single Chain · $49/month</div><h2 className="mt-2 text-xl font-semibold text-[var(--urd-text-strong)]">90 days · one selected chain</h2><p className="mt-3 text-sm leading-7 text-[var(--urd-text-body)]">Single Chain gives immediate authenticated access to the latest, 7d, 30d and 90d bundle files for Gold, Derived and Meta on the selected chain, plus the latest per-chain Briefs file.</p><div className="mt-4"><Code>{`curl -H "X-API-Key: YOUR_KEY" \\
  https://www.urdatlas.com/api/v1/files/meta/ethereum/90d/latest.json`}</Code></div></UrdCard>
            <UrdCard className="p-5"><div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Research · $149/month</div><h2 className="mt-2 text-xl font-semibold text-[var(--urd-text-strong)]">Full published history · all four chains</h2><p className="mt-3 text-sm leading-7 text-[var(--urd-text-body)]">Research includes the standard bundle windows through 365d and also unlocks the complete published archive. The archive grows as new daily records are published; it is not capped at a fixed number of days.</p><div className="mt-4"><Code>{`# Discover every published Meta date
curl -H "X-API-Key: YOUR_KEY" \\
  https://www.urdatlas.com/api/v1/files/meta/ethereum/manifest.json

# Fetch one original published day file
curl -H "X-API-Key: YOUR_KEY" \\
  https://www.urdatlas.com/api/v1/files/meta/ethereum/2024-12-01.json`}</Code></div></UrdCard>
          </div>
        </UrdSection>
        <UrdSection eyebrow="Archive model" title="Manifest first, then original day files"><p className="max-w-4xl text-sm leading-7 text-[var(--urd-text-body)]">Full history is deliberately exposed as the published manifest plus individual day files rather than one ever-growing response. This preserves the same versioned artifacts used elsewhere in Urd Atlas and lets an ingestion job fetch only the dates it is missing.</p><div className="mt-4 grid gap-4 lg:grid-cols-2"><UrdCard className="p-5"><h3 className="font-semibold text-[var(--urd-text-strong)]">Gold / Derived / Meta</h3><div className="mt-3 space-y-2 text-sm text-[var(--urd-text-body)]"><div><UrdInlineCode>/api/v1/files/meta/bitcoin/manifest.json</UrdInlineCode></div><div><UrdInlineCode>/api/v1/files/meta/bitcoin/YYYY-MM-DD.json</UrdInlineCode></div></div></UrdCard><UrdCard className="p-5"><h3 className="font-semibold text-[var(--urd-text-strong)]">Briefs</h3><div className="mt-3 space-y-2 text-sm text-[var(--urd-text-body)]"><div><UrdInlineCode>/api/v1/files/briefs/chains/bitcoin/manifest.json</UrdInlineCode></div><div><UrdInlineCode>/api/v1/files/briefs/chains/bitcoin/YYYY-MM-DD.json</UrdInlineCode></div></div></UrdCard></div></UrdSection>
        <UrdSection eyebrow="Practical use" title="Bootstrap once, then ingest daily"><p className="max-w-4xl text-sm leading-7 text-[var(--urd-text-body)]">A new Single Chain subscriber can bootstrap with the 90d bundle and then append <UrdInlineCode>latest.json</UrdInlineCode> each day. A Research subscriber can bootstrap the complete archive by reading each genre manifest and downloading the published dates required by the workflow, then continue with daily delivery.</p><p className="mt-4 text-sm leading-7 text-[var(--urd-text-body)]">Need the field contract as well? <Link href="/api-docs/schema" className="font-semibold text-blue-700 underline">Open the schema reference →</Link></p></UrdSection>
      </div></UrdContainer>
    </UrdPage>
  );
}
