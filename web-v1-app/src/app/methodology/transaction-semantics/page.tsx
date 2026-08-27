export const revalidate = 0;

export default function TransactionSemanticsPage() {
  return (
    <main className="ua-page">
      <header className="hero border-b border-[var(--line)]"><div className="page-shell"><div className="eyebrow mb-4">Methodology</div><h1 className="ua-h1">Transaction aggregation semantics</h1><p className="lead mt-4 max-w-3xl">How failed transactions and chain-specific transaction semantics are treated in the published daily aggregates.</p></div></header>
      <div className="page-shell py-12 max-w-5xl space-y-10 text-sm leading-7 text-[var(--ink2)]">
        <section><h2 className="ua-h3 text-[var(--ink)]">Bitcoin</h2><p className="mt-3">Bitcoin is treated as a UTXO chain. The EVM concept of an execution transaction that consumes gas and returns a failed receipt is structurally not applicable. <code>failed_tx_rate</code>, EVM gas utilization and EVM receipt-status semantics are therefore null/not-applicable for Bitcoin rather than coerced to zero.</p></section>
        <section><h2 className="ua-h3 text-[var(--ink)]">Ethereum L1</h2><p className="mt-3"><code>tx_count_daily</code> describes the source-day transaction population represented in the daily aggregate; failed Ethereum transactions remain transactions and are not removed merely because execution did not succeed. <code>failed_tx_rate</code> separately exposes the share of that transaction population whose execution status is unsuccessful when receipt status is available.</p><p className="mt-3">Fee/friction aggregates are derived from the applicable transaction/receipt fee inputs and failed transactions are not silently rewritten as zero-cost activity. A failed execution can still consume gas and incur a fee. Missing receipt/status evidence remains missing rather than being treated as success or failure by assumption.</p><p className="mt-3"><code>failed_tx_rate</code> is currently an Ethereum-L1 Friction input. It is not a Bitcoin metric and it is not currently used as a public L2 regime/scorecard input while L2 failure semantics remain under validation.</p></section>
        <section><h2 className="ua-h3 text-[var(--ink)]">Arbitrum and Base</h2><p className="mt-3">L2 transaction, fee and capacity fields use the chain-specific public L2 evidence surface. Fields whose L1/Ethereum semantics cannot be carried over safely are structurally excluded or presentation-hidden rather than treated as equivalent by name.</p></section>
        <section><h2 className="ua-h3 text-[var(--ink)]">Null and denominator rule</h2><p className="mt-3">A missing required input is represented as <code>null</code>/missing evidence and can lower data-quality support. It is never silently converted to zero solely to keep an aggregate numeric. Any denominator used for a rate must come from observations for which the corresponding status/measurement is meaningfully available.</p></section>
      </div>
    </main>
  );
}
