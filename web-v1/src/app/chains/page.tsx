export default function ChainsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Chains</h1>
      <p className="mt-2 text-white/70">Chain diagnostics will live here.</p>

      {/* optional anchor targets so /chains#bitcoin scrolls */}
      <div id="bitcoin" className="mt-10 scroll-mt-24" />
      <div id="ethereum" className="mt-10 scroll-mt-24" />
      <div id="arbitrum" className="mt-10 scroll-mt-24" />
      <div id="base" className="mt-10 scroll-mt-24" />
    </main>
  );
}