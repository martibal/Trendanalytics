export const revalidate = 0;

export default function SecurityReportingPage() {
  return (
    <main className="ua-page">
      <header className="hero border-b border-[var(--line)]"><div className="page-shell"><div className="eyebrow mb-4">Security</div><h1 className="ua-h1">Responsible disclosure</h1><p className="lead mt-4 max-w-3xl">Report suspected security vulnerabilities privately so they can be investigated and fixed without exposing customers or the service to unnecessary risk.</p></div></header>
      <div className="page-shell py-12 max-w-4xl space-y-8 text-sm leading-7 text-[var(--ink2)]">
        <section><h2 className="ua-h3 text-[var(--ink)]">Contact</h2><p className="mt-3">Send security reports to <a href="mailto:support@urdatlas.com?subject=Security%20report" className="text-link">support@urdatlas.com</a> with the subject line <strong>Security report</strong>. A dedicated security mailbox may replace this address later; this page is the canonical current contact.</p></section>
        <section><h2 className="ua-h3 text-[var(--ink)]">Include</h2><p className="mt-3">Describe the affected URL or component, reproduction steps, expected versus observed behavior, impact, and any non-sensitive evidence needed to reproduce the issue. Include your contact details if you want follow-up.</p></section>
        <section><h2 className="ua-h3 text-[var(--ink)]">Safe testing boundary</h2><p className="mt-3">Do not access or alter another customer&apos;s data, do not perform denial-of-service or high-volume testing, do not use social engineering, do not persist after obtaining sufficient proof, and do not publish sensitive details before Urd Atlas has had a reasonable opportunity to investigate and remediate.</p></section>
        <section><h2 className="ua-h3 text-[var(--ink)]">Response target</h2><p className="mt-3">Urd Atlas aims to acknowledge a credible security report within 3 business days and will provide follow-up based on severity and reproducibility. This is a response target rather than a contractual SLA.</p></section>
        <section><h2 className="ua-h3 text-[var(--ink)]">Good-faith research</h2><p className="mt-3">Good-faith research that stays within the boundaries above and is reported privately will not be treated as an attempt to bypass normal access controls solely because the researcher identified a vulnerability. This statement does not authorize illegal activity or testing against third-party infrastructure outside Urd Atlas&apos; control.</p></section>
      </div>
    </main>
  );
}
