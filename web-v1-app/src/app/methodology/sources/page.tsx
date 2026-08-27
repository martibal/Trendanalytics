import Link from "next/link";

export const revalidate = 0;

const sources = [
  ["Bitcoin", "AWS Public Blockchain Data — Bitcoin", "Blocks and transactions used to build Bitcoin-specific daily aggregates. Bitcoin is treated as a UTXO chain; EVM gas/execution fields are structurally non-applicable."],
  ["Ethereum", "AWS Public Blockchain Data — Ethereum", "Blocks, transactions and receipt/execution fields used for Ethereum L1 activity, fee, failure and gas-utilization aggregates."],
  ["Arbitrum", "AWS Public Blockchain Data — Arbitrum", "L2 blocks/transactions and the source fields available for the published L2 activity, fee, breadth and capacity-utilization surface."],
  ["Base", "AWS Public Blockchain Data — Base", "L2 blocks/transactions and the source fields available for the published L2 activity, fee, breadth and capacity-utilization surface."],
] as const;

const decisions = [
  ["New source day is complete enough for required metrics", "Build Gold → Derived → Meta → Briefs and publish after validation."],
  ["No newer upstream source day exists", "Do not fabricate a new observation. Keep the latest published row and expose freshness/lag on Status."],
  ["Required evidence is absent or insufficient", "Represent missing values as null, reduce data-quality/evidence support and withhold a normal named state as UNKNOWN/DEGRADED when the publication gate is not met."],
  ["A chain is not active in an incremental run", "Preserve the current canonical published history for that chain; an inactive chain must not be rolled back by stale staging data."],
  ["Source listing/check is unavailable", "Treat the source check as unavailable rather than claiming the source is current. Preserve the last valid publication and surface operational/freshness state."],
  ["Late-arriving source data becomes available", "A later scheduled run can ingest it. Publication dates remain observation dates, not the time the upstream provider happened to expose the file."],
  ["Upstream/canonical data is later found incorrect", "Regenerate the affected artifact(s), preserve version/provenance evidence, and publish a correction/changelog entry stating whether customers should re-pull cached rows."],
] as const;

export default function SourcesPage() {
  return (
    <main className="ua-page">
      <header className="hero border-b border-[var(--line)]"><div className="page-shell"><div className="eyebrow mb-4">Methodology</div><h1 className="ua-h1">Source data and source-day policy</h1><p className="lead mt-4 max-w-3xl">The canonical observation source, independent validation role and the publication decision when upstream data is late, missing or incomplete.</p></div></header>
      <div className="page-shell py-12 max-w-6xl space-y-12">
        <section><h2 className="ua-h3">Canonical upstream source</h2><p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--ink2)]">Urd Atlas uses AWS Public Blockchain Data as the canonical upstream blockchain-data provider for all four supported chains. Urd Atlas then performs its own daily aggregation, chain-specific normalization, derived transforms, classification and publication. Coin Metrics Community is used as an independent cross-check for selected Bitcoin/Ethereum observations; it is not substituted as the canonical production input.</p><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead><tr className="border-b border-[var(--line)]"><th className="py-3 pr-5">Chain</th><th className="py-3 pr-5">Canonical dataset family</th><th className="py-3">Use</th></tr></thead><tbody>{sources.map(([chain,source,use])=><tr key={chain} className="border-b border-[var(--line)] align-top"><td className="py-4 pr-5 font-medium">{chain}</td><td className="py-4 pr-5">{source}</td><td className="py-4 text-[var(--ink2)]">{use}</td></tr>)}</tbody></table></div></section>
        <section><h2 className="ua-h3">What is intentionally not public</h2><p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--ink2)]">The public trust layer identifies the provider, chain dataset family, field meaning and published transformations. Exact internal object paths, parquet layouts, source-repair joins, cache paths and implementation details that would reconstruct the private ingestion pipeline are not part of the customer contract. This does not change which upstream provider/dataset family the published observations come from.</p></section>
        <section><h2 className="ua-h3">Source-day decision matrix</h2><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b border-[var(--line)]"><th className="py-3 pr-6">Condition</th><th className="py-3">Publication behavior</th></tr></thead><tbody>{decisions.map(([condition,action])=><tr key={condition} className="border-b border-[var(--line)] align-top"><td className="py-4 pr-6 font-medium">{condition}</td><td className="py-4 text-[var(--ink2)]">{action}</td></tr>)}</tbody></table></div></section>
        <section><h2 className="ua-h3">Freshness policy</h2><p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--ink2)]">Expected public lag is approximately one day for Bitcoin/Ethereum and seven days for Arbitrum/Base. Freshness is separate from Evidence score: a row can be on schedule and still weakly supported, or delayed while remaining the mathematically valid latest available state. See <Link href="/methodology/freshness" className="text-link">Publication Freshness Policy</Link> and <Link href="/status" className="text-link">Status</Link>.</p></section>
      </div>
    </main>
  );
}
