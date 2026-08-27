import Link from "next/link";

export const revalidate = 0;

const breaking = [
  "Removing or renaming an existing response field or endpoint path.",
  "Changing a field type, unit, null meaning, required/optional status, or array/object shape incompatibly.",
  "Changing the semantic meaning of a regime label, score, date, evidence component or published artifact in a way existing consumers could misinterpret.",
  "Changing authentication requirements or entitlement scope for an existing documented subscriber path incompatibly.",
  "Changing a closed enum in a way an existing compliant parser is not expected to accept.",
];
const nonBreaking = [
  "Adding an optional field whose absence remains valid for older clients.",
  "Adding a new endpoint without changing an existing one.",
  "Documentation corrections that do not change the data contract.",
  "Operational fixes that preserve documented field semantics and compatibility.",
];

export default function VersioningPage() {
  return (
    <main className="ua-page">
      <header className="hero border-b border-[var(--line)]"><div className="page-shell"><div className="eyebrow mb-4">API Docs</div><h1 className="ua-h1">Versioning and breaking changes</h1><p className="lead mt-4 max-w-3xl">How Urd Atlas separates compatible additions, methodology changes and breaking API/schema changes.</p></div></header>
      <div className="page-shell py-12 max-w-4xl space-y-10">
        <section><h2 className="ua-h3">Artifact identity</h2><p className="mt-4 text-sm leading-7 text-[var(--ink2)]">Published artifacts carry a layer <code>schema_version</code>. Meta rows additionally carry <code>methodology_version</code> and named regime rows carry <code>regime.determinism_hash</code>. Dataset manifests expose the active published schema families and publication revision.</p></section>
        <section><h2 className="ua-h3">Breaking changes</h2><ul className="mt-4 list-disc pl-5 space-y-2 text-sm leading-7 text-[var(--ink2)]">{breaking.map(v=><li key={v}>{v}</li>)}</ul></section>
        <section><h2 className="ua-h3">Non-breaking changes</h2><ul className="mt-4 list-disc pl-5 space-y-2 text-sm leading-7 text-[var(--ink2)]">{nonBreaking.map(v=><li key={v}>{v}</li>)}</ul></section>
        <section><h2 className="ua-h3">Notice policy</h2><div className="mt-4 space-y-3 text-sm leading-7 text-[var(--ink2)]"><p>Urd Atlas targets at least <strong>30 calendar days&apos; public notice</strong> before a planned breaking API or schema change takes effect. Notice should identify the affected paths/fields, migration action, effective date and whether historical artifacts are republished.</p><p>Critical security, legal, corruption-repair or data-integrity fixes may require a shorter notice period. Those exceptions must be documented in the public changelog as soon as safely practical and must not be described as ordinary planned compatibility changes.</p></div></section>
        <section><h2 className="ua-h3">Methodology changes</h2><p className="mt-4 text-sm leading-7 text-[var(--ink2)]">A methodology-breaking analytical change is version-distinct even if the JSON shape itself remains parse-compatible. Customers comparing historical outputs should use <code>methodology_version</code>, schema version and provenance fields together. See the <Link href="/methodology/changelog" className="text-link">Methodology Changelog</Link>.</p></section>
      </div>
    </main>
  );
}
