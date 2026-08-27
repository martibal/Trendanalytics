import Link from "next/link";

export const revalidate = 0;

export default function OperatorPage() {
  return (
    <main className="ua-page">
      <header className="hero border-b border-[var(--line)]"><div className="page-shell"><div className="eyebrow mb-4">Operator</div><h1 className="ua-h1">Who operates Urd Atlas</h1><p className="lead mt-4 max-w-3xl">Urd Atlas is operated from Norway by Martin Balstad through the registered legal operator identified below.</p></div></header>
      <div className="page-shell py-12 max-w-4xl space-y-10">
        <section><h2 className="ua-h3">Legal operator</h2><div className="mt-4 text-sm leading-7 text-[var(--ink2)]"><p><strong>MARTIN BALSTAD</strong></p><p>Organisation number 937 581 254</p><p>Norway</p><p className="mt-3">Support, billing, privacy and legal requests: <a href="mailto:support@urdatlas.com" className="text-link">support@urdatlas.com</a></p></div></section>
        <section><h2 className="ua-h3">Professional background</h2><div className="mt-4 space-y-3 text-sm leading-7 text-[var(--ink2)]"><p>The product is developed and operated by a data and analytics practitioner with professional experience from financial-services data, insight work and applied AI/data strategy. Urd Atlas is intentionally run as a focused reference-data product rather than presented as a larger research institution or advisory firm.</p><p>The operator is accountable for methodology changes, production publishing, access-control decisions, incident handling and customer-support escalation.</p></div></section>
        <section><h2 className="ua-h3">Product boundary</h2><p className="mt-4 text-sm leading-7 text-[var(--ink2)]">Urd Atlas publishes descriptive on-chain reference data. The operator does not provide investment advice, trading signals, portfolio management or forecasts through the service.</p></section>
        <section><h2 className="ua-h3">Verification paths</h2><p className="mt-4 text-sm leading-7 text-[var(--ink2)]">Technical buyers should verify the product through <Link href="/methodology" className="text-link">Methodology</Link>, <Link href="/validation" className="text-link">Validation</Link>, <Link href="/api-docs" className="text-link">API Docs</Link>, <Link href="/status" className="text-link">Status</Link> and the <Link href="/trust" className="text-link">Trust center</Link> rather than relying on biography alone.</p></section>
      </div>
    </main>
  );
}
