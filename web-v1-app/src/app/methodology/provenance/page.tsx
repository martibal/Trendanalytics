import Link from "next/link";
import { Callout, InlineCode, MethodologyHeader, MethodologyNav, Section, SimpleTable } from "../_components";

export default async function MethodologyProvenancePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <MethodologyHeader
        title="Provenance & Revisions"
        description="The canonical public model for identifying archived rows, interpreting methodology_version, understanding determinism hashes, and reading revisions and corrections through time."
      />
      <MethodologyNav />
      <div className="grid gap-6">
        <Section title="Canonical public provenance model">
          <SimpleTable
            headers={["Concept", "Public meaning", "When it changes"]}
            rows={[
              [<InlineCode key="date">date</InlineCode>, <>The UTC day the published row describes.</>, <>Changes only if the row identity changes.</>],
              [<InlineCode key="updated">updated_through</InlineCode>, <>Most recent Gold observation actually available to the Meta calculation.</>, <>Changes when the effective freshest supporting row changes.</>],
              [<InlineCode key="mv">methodology_version</InlineCode>, <>The public analytical methodology version that governs interpretation.</>, <>Changes when field meaning or analytical semantics change materially.</>],
              [<InlineCode key="hash">regime.determinism_hash</InlineCode>, <>Named-row integrity anchor over the public regime payload.</>, <>Changes when the named regime payload changes.</>],
              [<>Dataset revision / published revision</>, <>Publication batch identity at the dataset layer.</>, <>Changes when a new publication batch is issued.</>],
            ]}
          />
        </Section>
        <Section title="How historical rows may change">
          <SimpleTable
            headers={["Change class", "Methodology bump?", "Historical rows changed?", "Subscriber action required?"]}
            rows={[
              ["Docs-only clarification", "No", "No", "No"],
              ["Pipeline rebuild without methodology change", "No", "Only if corrected archived artifacts are republished", "No, unless a correction notice says otherwise"],
              ["Methodology-breaking analytical change", "Yes", "Only if historical rows are explicitly recomputed and republished", "Yes — customers should treat pre- and post-bump outputs as version-distinct"],
              ["Retroactive correction / archival replacement", "Case-specific", "Yes, for affected rows only", "No for most use, but the correction note should be read"],
            ]}
          />
        </Section>
        <Callout title="Important consistency rule">
          Public pages should use the same provenance vocabulary: <InlineCode>date</InlineCode>, <InlineCode>updated_through</InlineCode>, <InlineCode>methodology_version</InlineCode>, dataset revision / published revision, and <InlineCode>regime.determinism_hash</InlineCode>. Runtime backend and storage paths are deployment details, not the primary public provenance truth.
        </Callout>
        <Section title="Where to read related public policies">
          <ul className="list-disc pl-5">
            <li><Link href="/methodology/integrity" className="underline">Release Integrity & Determinism</Link></li>
            <li><Link href="/methodology/changelog" className="underline">Methodology Changelog</Link></li>
            <li><Link href="/service" className="underline">Service Expectations, Support & Revisions</Link></li>
          </ul>
        </Section>
      </div>
    </main>
  );
}
