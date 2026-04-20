import Link from "next/link";
import {
  Callout,
  InlineCode,
  MethodologyHeader,
  MethodologyNav,
  Section,
  SimpleTable,
  TinyLabel,
} from "./_components";

const hubCards = [
  {
    href: "/methodology/reference",
    title: "Public Methodology Reference",
    body: "The canonical public explanation of how Gold, Derived, and Meta should be read.",
  },
  {
    href: "/methodology/fields",
    title: "Field Dictionary",
    body: "Field-by-field definitions with layer, unit, interpretation, and verification class.",
  },
  {
    href: "/methodology/verification",
    title: "Verification & Evidence Pack",
    body: "Worked examples for MA7, determinism hash, and confidence gate behavior.",
  },
  {
    href: "/methodology/freshness",
    title: "Publication Freshness Policy",
    body: "Expected lag, soft warnings, hard failures, and the difference between freshness and confidence.",
  },
  {
    href: "/methodology/boundaries",
    title: "Limitations & Boundaries",
    body: "What the product does not do and what the public methodology intentionally does not disclose.",
  },
  {
    href: "/methodology/changelog",
    title: "Methodology Changelog",
    body: "Versioned changes to public field meaning, score meaning, and interpretation rules.",
  },
  {
    href: "/methodology/integrity",
    title: "Release Integrity & Determinism",
    body: "How archived rows are identified and how determinism hashes should be understood.",
  },
  {
    href: "/methodology/ai-controls",
    title: "AI Use & Quality Controls",
    body: "How trust is anchored in methodology, release controls, and deterministic checks rather than authorship claims.",
  },
];

export default async function MethodologyPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <MethodologyHeader
        title="Methodology"
        description="This section is the public trust layer for Urd Atlas. It explains what the product publishes, how published numbers should be read, what can be verified from published artifacts, and where the public boundary ends."
      />

      <MethodologyNav />

      <div className="grid gap-6">
        <Section title="How to read this section first">
          <p>
            The most important distinction is between three artifact layers: <strong>Gold</strong>,{" "}
            <strong>Derived</strong>, and <strong>Meta</strong>. Gold is the daily observation layer.
            Derived is the trend layer built from Gold. Meta is the interpretation layer that
            publishes regime, confidence, scorecard state, driver attribution, and freshness context.
          </p>
          <p>
            If you are new to the product, read the pages in this order: <Link href="/methodology/reference" className="underline">Reference</Link>,{" "}
            <Link href="/methodology/fields" className="underline">Fields</Link>, and{" "}
            <Link href="/methodology/verification" className="underline">Verification</Link>.
          </p>
          <Callout title="Descriptive-only boundary">
            Urd Atlas explains what published chain conditions look like relative to recent history.
            It does not publish price targets, trading advice, or portfolio instructions.
          </Callout>
        </Section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {hubCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-2xl border p-5 shadow-sm transition hover:border-cyan-500/30 hover:bg-muted/20"
            >
              <TinyLabel>Methodology module</TinyLabel>
              <h2 className="mt-2 text-lg font-semibold tracking-tight">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.body}</p>
            </Link>
          ))}
        </section>

        <Section title="Public artifact model">
          <SimpleTable
            headers={["Layer", "What it is", "What it is for"]}
            rows={[
              [
                <strong key="gold">Gold</strong>,
                <>Daily observation layer with direct daily aggregates or robust daily summaries.</>,
                <>Explains what the chain looked like on that UTC day.</>,
              ],
              [
                <strong key="derived">Derived</strong>,
                <>Trend layer built deterministically from Gold.</>,
                <>Explains how the raw daily state looks when smoothed across short and medium windows.</>,
              ],
              [
                <strong key="meta">Meta</strong>,
                <>Interpretation layer with regime, confidence, scorecard, drivers, and freshness context.</>,
                <>Explains how Urd Atlas classifies the current state and what evidence supports that classification.</>,
              ],
            ]}
          />
        </Section>

        <Section title="Verification classes">
          <p>
            Public methodology references use three verification classes to distinguish what a customer
            can test directly from published files and what must instead be checked against public chain evidence.
          </p>
          <SimpleTable
            headers={["Class", "Meaning"]}
            rows={[
              [
                <InlineCode key="a">A</InlineCode>,
                <>Directly reproducible from published artifacts alone.</>,
              ],
              [
                <InlineCode key="b">B</InlineCode>,
                <>Independently checkable against public chain evidence, but not reproducible from Urd Atlas files alone.</>,
              ],
              [
                <InlineCode key="c">C</InlineCode>,
                <>Publicly interpretable and stable in meaning, but not published with enough detail to replicate the full internal implementation.</>,
              ],
            ]}
          />
          <p>
            This distinction is intentional. Public methodology is designed to make the product auditable in meaning,
            not reconstructable in implementation.
          </p>
        </Section>

        <Section title="Public row identity">
          <p>
            Urd Atlas does not currently publish a separate revision integer in archived Meta artifacts.
            Public row identity is therefore anchored in the fields that are actually present in the archive.
          </p>
          <ul className="list-disc pl-5">
            <li>
              For all Meta rows: <InlineCode>chain</InlineCode>, <InlineCode>date</InlineCode>, and{" "}
              <InlineCode>methodology_version</InlineCode>
            </li>
            <li>
              For named regime rows: <InlineCode>regime.determinism_hash</InlineCode> is the canonical public integrity anchor
            </li>
            <li>
              For <InlineCode>UNKNOWN/DEGRADED</InlineCode> rows: public identity is anchored in{" "}
              <InlineCode>updated_through</InlineCode>, <InlineCode>confidence.confidence_score</InlineCode>, and{" "}
              <InlineCode>status.label</InlineCode>
            </li>
          </ul>
        </Section>

        <Section title="Where this sits relative to the rest of the site">
          <p>
            The methodology section is the trust layer. The <Link href="/api-docs" className="underline">API Docs</Link> explain routes and file access.
            The <Link href="/glossary" className="underline">Glossary</Link> defines terms. The chain pages show the latest published state.
            This section explains how those layers fit together and how a serious reader should validate what they see.
          </p>
        </Section>
      </div>
    </main>
  );
}
