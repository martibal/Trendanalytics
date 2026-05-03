// src/components/landing/GetStarted.tsx
// Compact collapsible section — no "use client" needed, uses native <details>
import Link from "next/link";

const STEPS = [
  {
    n: "01",
    title: "Download the sample pack",
    value: "Real Gold, Derived, and Meta reference data from published days — including one UNKNOWN/DEGRADED row. This is exactly what the API delivers daily.",
    actions: [
      { label: "Download zip →", href: "/sample-pack/urd-atlas-public-sample-pack.zip", primary: true },
      { label: "Browse files", href: "/api-docs/samples", primary: false },
    ],
  },
  {
    n: "02",
    title: "Run the quickstart script",
    value: "Prints regime label, confidence, drivers, and scorecard for ETH. Shows a concrete regime-conditioned split against your own data. Full integration simulation before you subscribe.",
    code: "python urd_atlas_quickstart.py",
    actions: [
      { label: "Download urd_atlas_quickstart.py →", href: "/sample-pack/urd_atlas_quickstart.py", primary: true },
    ],
  },
  {
    n: "03",
    title: "Inspect the chain pages",
    value: "Regime history, confidence curve, and driver attribution visualised. Same data as the API — evaluate whether the signal looks meaningful against your own reference points.",
    actions: [
      { label: "BTC →", href: "/chains/bitcoin", primary: false },
      { label: "ETH →", href: "/chains/ethereum", primary: false },
      { label: "ARB →", href: "/chains/arbitrum", primary: false },
      { label: "BASE →", href: "/chains/base", primary: false },
    ],
  },
  {
    n: "04",
    title: "Read the schema and service policy",
    value: "Every Gold, Derived, and Meta reference field is documented before you subscribe. The service policy covers publish cadence, AWS upstream dependency, and reply target.",
    actions: [
      { label: "JSON Schema →", href: "/api-docs/schema", primary: false },
      { label: "Service policy →", href: "/service", primary: false },
      { label: "Methodology →", href: "/methodology", primary: false },
    ],
  },
] as const;

export default function GetStarted() {
  return (
    <details className="group mb-10 rounded-2xl border border-white/7 bg-[#080F1C]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 select-none">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-500">
            Pre-purchase due diligence
          </span>
          <span className="text-[13px] font-semibold text-white">
            Get started in 15 minutes — without subscribing.
          </span>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-slate-500 transition group-open:hidden">
          Show →
        </span>
        <span className="shrink-0 hidden font-mono text-[11px] text-slate-500 group-open:inline">
          Hide ↑
        </span>
      </summary>

      <div className="border-t border-white/6 px-6 pb-6 pt-5">
        <p className="mb-6 max-w-[60ch] text-[13px] leading-[1.75] text-slate-500">
          Download the sample pack, run the script, and inspect the chain pages.
          You should be able to evaluate whether this fits your workflow before seeing a payment page.
        </p>

        <div className="grid gap-3 lg:grid-cols-2">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="rounded-xl border border-white/6 bg-white/[0.02] p-4"
            >
              <div className="mb-2 flex items-center gap-2.5">
                <span className="font-mono text-[10px] font-bold text-cyan-500/70">{step.n}</span>
                <span className="text-[13px] font-semibold text-white">{step.title}</span>
              </div>
              <p className="mb-3 text-[12px] leading-[1.7] text-slate-500">{step.value}</p>

              {"code" in step && step.code && (
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/6 bg-black/30 px-3 py-2">
                  <span className="font-mono text-[10px] text-slate-600">$</span>
                  <code className="font-mono text-[11px] text-slate-300">{step.code}</code>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {step.actions.map((action) =>
                  action.href.startsWith("/sample-pack") ? (
                    <a
                      key={action.label}
                      href={action.href}
                      className={
                        action.primary
                          ? "inline-flex items-center rounded-lg bg-cyan-400 px-4 py-1.5 font-mono text-[11px] font-bold text-[#04080F] transition hover:opacity-90"
                          : "inline-flex items-center rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] text-slate-400 transition hover:text-slate-200"
                      }
                    >
                      {action.label}
                    </a>
                  ) : (
                    <Link
                      key={action.label}
                      href={action.href}
                      className={
                        action.primary
                          ? "inline-flex items-center rounded-lg bg-cyan-400 px-4 py-1.5 font-mono text-[11px] font-bold text-[#04080F] transition hover:opacity-90"
                          : "inline-flex items-center rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] text-slate-400 transition hover:text-slate-200"
                      }
                    >
                      {action.label}
                    </Link>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
