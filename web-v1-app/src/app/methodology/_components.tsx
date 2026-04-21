import Link from "next/link";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/methodology", label: "Overview" },
  { href: "/methodology/reference", label: "Reference" },
  { href: "/methodology/fields", label: "Fields" },
  { href: "/methodology/verification", label: "Verification" },
  { href: "/methodology/freshness", label: "Freshness" },
  { href: "/methodology/boundaries", label: "Boundaries" },
  { href: "/methodology/changelog", label: "Changelog" },
  { href: "/methodology/integrity", label: "Integrity" },
  { href: "/methodology/ai-controls", label: "AI controls" },
];

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.92em] text-foreground">
      {children}
    </code>
  );
}

export function MethodologyHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-8 border-b border-border pb-6">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
        Urd Atlas methodology
      </div>
      <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
        {description}
      </p>
    </header>
  );
}

export function MethodologyNav() {
  return (
    <nav className="mb-8 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex min-w-max flex-wrap gap-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-cyan-400/40 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function Section({
  title,
  children,
  id,
}: {
  title: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-slate-300">{children}</div>
    </section>
  );
}

export function Callout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
      <div className="text-sm font-semibold text-cyan-200">{title}</div>
      <div className="mt-2 space-y-3 text-sm leading-7 text-slate-300">{children}</div>
    </div>
  );
}

export function WarningCallout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4">
      <div className="text-sm font-semibold text-amber-200">{title}</div>
      <div className="mt-2 space-y-3 text-sm leading-7 text-slate-300">{children}</div>
    </div>
  );
}

export function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="min-w-full border-collapse text-left text-sm text-slate-300">
        <thead className="bg-white/5 text-xs uppercase tracking-[0.14em] text-slate-400">
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b border-white/10 px-4 py-3 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="align-top">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="border-b border-white/5 px-4 py-3 last:border-b-0">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
