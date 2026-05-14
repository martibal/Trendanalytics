// ═══════════════════════════════════════════════════════════════════════════
// CHAIN PAGE VISUAL FIXES
// Apply to: app/chains/[chain]/page.tsx  AND  app/chains/page.tsx
//
// These are surgical replacements. All data logic stays unchanged.
// Copy-paste each replacement into the correct location.
// ═══════════════════════════════════════════════════════════════════════════

// ─── 1. InlineCode ───────────────────────────────────────────────────────────
// FIND:
//   function InlineCode({ children }: { children: React.ReactNode }) {
//     return <code className="rounded border border-[#9db8d4] ...">
// REPLACE WITH:
function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="code-block inline-block px-2 py-0.5 text-[12px]">
      {children}
    </code>
  );
}

// ─── 2. MoreLink ─────────────────────────────────────────────────────────────
// FIND:
//   function MoreLink({ id, label = "More" }: { id: string; label?: string }) {
//     return (
//       <a href={`#${id}`} className="inline-flex items-center rounded-full border border-[#9db8d4] bg-[#eef6ff] ...">
// REPLACE WITH:
function MoreLink({ id, label = "More" }: { id: string; label?: string }) {
  return (
    <a href={`#${id}`} className="text-link">
      {label} →
    </a>
  );
}

// ─── 3. HeroInfoCard ─────────────────────────────────────────────────────────
// FIND:
//   function HeroInfoCard({ label, value, children, }: { ... }) {
//     return (
//       <div className="rounded-2xl border border-white/15 bg-white/[0.075] p-4 shadow-[...] backdrop-blur">
// REPLACE WITH:
function HeroInfoCard({
  label,
  value,
  children,
}: {
  label: string;
  value: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="fact-item">
      <strong>{label}</strong>
      <div className="mt-2 text-[var(--ink)] font-mono text-[13px] font-medium leading-snug break-words min-h-[28px]">
        {value}
      </div>
      {children ? (
        <div className="mt-2 text-[11px] leading-5 text-[var(--ink3)]">
          {children}
        </div>
      ) : null}
    </div>
  );
}

// ─── 4. ExplainModal ─────────────────────────────────────────────────────────
// FIND the function starting with:
//   function ExplainModal({ id, title, subtitle, pair, traceability, }: { ... }) {
//     return (
//       <div id={id} className="ta-modal fixed inset-0 z-[80] ...">
//         <a href="#" className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" .../>
//         <div className="relative z-10 ... rounded-3xl border border-[#b6cce3] bg-[#e7f1fb] ...">
// REPLACE WITH:
function ExplainModal({
  id,
  title,
  subtitle,
  pair,
  traceability,
}: {
  id: string;
  title: string;
  subtitle?: React.ReactNode;
  pair: { basic: React.ReactNode; advanced: React.ReactNode };
  traceability?: React.ReactNode;
}) {
  return (
    <div id={id} className="ta-modal fixed inset-0 z-[80] items-center justify-center p-4">
      <a href="#" className="absolute inset-0 bg-[rgba(8,15,26,.84)]" aria-label="Close dialog" />
      <div className="modal-panel relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden">
        <div className="modal-head shrink-0">
          <div>
            <h3 className="ua-h3 text-[var(--ink)]">{title}</h3>
            {subtitle ? <div className="mt-2 text-sm leading-6 text-[var(--ink2)]">{subtitle}</div> : null}
          </div>
          <a href="#" className="btn-ghost h-10 px-3 shrink-0" aria-label="Close dialog">×</a>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5">
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="border-t-2 border-[var(--c-stable)] pt-4">
              <div className="eyebrow mb-3">Basic</div>
              <div className="text-sm leading-7 text-[var(--ink2)]">{pair.basic}</div>
            </section>
            <details className="border-t-2 border-[var(--gold)] pt-4">
              <summary className="eyebrow cursor-pointer mb-3">Advanced</summary>
              <div className="text-sm leading-7 text-[var(--ink2)]">{pair.advanced}</div>
            </details>
          </div>
          {traceability ? (
            <div className="mt-6 border-t border-[var(--line)] pt-5">
              <div className="eyebrow mb-3">Traceability</div>
              <div className="text-sm leading-7 text-[var(--ink2)]">{traceability}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── 5. HeroInfoCard grid wrapper ────────────────────────────────────────────
// In the ChainPage return JSX, find:
//   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
//     <HeroInfoCard ...
// REPLACE className with:
//   <div className="fact-row mt-8" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
//     <HeroInfoCard ...

// ─── 6. Outer page wrapper ───────────────────────────────────────────────────
// FIND:
//   return (
//     <UrdPage>
//       <PageHero
//         eyebrow="Chain analysis"
//         title={displayName}
//         summary="Latest published reference row..."
//       >
//         {confNotice ? (...) : null}
//         <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
//           ... HeroInfoCards ...
//         </div>
//       </PageHero>
//       <UrdContainer>
//         ... content ...
//       </UrdContainer>
//     </UrdPage>
//   );
//
// REPLACE WITH:
//   return (
//     <main className="ua-page">
//       <header className="hero border-b border-[var(--line)]">
//         <div className="page-shell">
//           <div className="eyebrow mb-4">Chain analysis</div>
//           <h1 className="ua-h1">{displayName}</h1>
//           <p className="lead mt-4">Latest published reference row for this chain: regime, confidence, freshness, determinism, drivers, and metric history.</p>
//           {confNotice ? (
//             <div className="mt-6 border-l-2 border-[var(--c-heating)] pl-5 py-2">
//               <div className="eyebrow text-[var(--c-heating)] mb-1">{confNotice.title}</div>
//               <p className="text-sm text-[var(--ink2)]">{confNotice.body}</p>
//             </div>
//           ) : null}
//           <div className="fact-row mt-8" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
//             ... HeroInfoCards unchanged ...
//           </div>
//         </div>
//       </header>
//       <div className="page-shell py-12">
//         ... all existing content unchanged ...
//       </div>
//     </main>
//   );

// ─── 7. Section cards inside content ─────────────────────────────────────────
// For every instance of the pattern:
//   <div className="rounded-3xl border border-[var(--urd-border-soft)] bg-[var(--urd-panel)] p-6 shadow-[...]">
//     <div className="text-sm text-[var(--urd-text-body)]">Label</div>
//     <div className="mt-4 text-3xl font-semibold">Value</div>
//     ...
//   </div>
//
// REPLACE className with:
//   <div className="border-t border-[var(--line)] pt-5">
//     <div className="eyebrow mb-3">Label</div>
//     <div className="mt-2 font-mono text-[22px] text-[var(--ink)]">Value</div>
//     ...
//   </div>

// ─── 8. Driver/WHN cards ─────────────────────────────────────────────────────
// For every:
//   <div className="rounded-xl border p-6 shadow-sm">
// REPLACE className with:
//   <div className="data-row py-5" style={{ display: "block" }}>

// ─── 9. Scorecard / grid info cards ──────────────────────────────────────────
// For every:
//   <div className="rounded-xl border border-[var(--urd-border-soft)] bg-[var(--urd-raised)] p-4">
// REPLACE className with:
//   <div className="border-t border-[var(--line)] pt-4 pb-4">

// ─── 10. Section headers ─────────────────────────────────────────────────────
// For every:
//   <h2 className="text-lg font-medium">Some section title</h2>
//   <h2 className="mb-3 text-lg font-medium">Some section title</h2>
// REPLACE className with:
//   <h2 className="ua-h3 mb-4">

// ─── 11. Upsell / CTA strip at bottom ────────────────────────────────────────
// FIND any:
//   <div className="... rounded-2xl border border-cyan-500/15 bg-cyan-500/5 ...">
// REPLACE className with:
//   <div className="border-y border-[var(--line)] py-6 flex flex-wrap items-center justify-between gap-6">
// And replace any cyan button inside with:
//   <Link href="..." className="btn-primary">...</Link>
// And any secondary button with:
//   <Link href="..." className="btn-ghost">...</Link>
