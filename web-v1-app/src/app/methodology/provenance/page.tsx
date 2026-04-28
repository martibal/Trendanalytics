import ShortFullContent from "@/components/site/ShortFullContent";
import Link from "next/link";
import {
  Callout,
  InlineCode,
  MethodologyContent,
  MethodologyHeader,
  MethodologyNav,
  MethodologyPageShell,
  Section,
  SimpleTable,
} from "../_components";

export default async function MethodologyProvenancePage() {
  return (
    <MethodologyPageShell>
      <MethodologyHeader
        title="Provenance & Revisions"
        description="The canonical public model for identifying archived rows, interpreting methodology_version, understanding determinism hashes, and reading revisions and corrections through time."
      />
      <MethodologyContent>
        <MethodologyNav />
        <ShortFullContent
          pageKey="methodology-provenance"
          summary={<>This page gives the canonical public model for how to identify a published row and understand what changed through time.</>}
          bullets={[
            <>Public provenance is anchored in date, updated_through, methodology_version, published revision, and regime.determinism_hash.</>,
            <>Docs-only edits, rebuilds, methodology changes, and historical corrections are distinct change classes and should be interpreted differently.</>,
            <>Runtime backend and storage paths are deployment details, not the main public provenance truth.</>,
          ]}
          whyItMatters={<>Users should be able to tell quickly whether an observed difference is just documentation, a rebuild, a methodology shift, or a real archival correction.</>}
          fullContent={
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
                  <li><Link href="/methodology/integrity" className="font-semibold text-[#0d2447] underline decoration-[#9db8d4] underline-offset-4 hover:text-blue-800">Release Integrity & Determinism</Link></li>
                  <li><Link href="/methodology/changelog" className="font-semibold text-[#0d2447] underline decoration-[#9db8d4] underline-offset-4 hover:text-blue-800">Methodology Changelog</Link></li>
                  <li><Link href="/service" className="font-semibold text-[#0d2447] underline decoration-[#9db8d4] underline-offset-4 hover:text-blue-800">Service Expectations, Support & Revisions</Link></li>
                </ul>
              </Section>
            </div>
          }
        />
      </MethodologyContent>
    </MethodologyPageShell>
  );
}
