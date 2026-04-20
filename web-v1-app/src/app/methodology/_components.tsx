import Link from "next/link";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { currentDataSource } from "@/lib/storage";

export function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.92em]">{children}</code>;
}

export function Section({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="rounded-2xl border p-6 shadow-sm">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

export function Callout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">{title}</div>
      <div className="mt-2 text-sm leading-7 text-slate-200">{children}</div>
    </div>
  );
}

export function TinyLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">{children}</div>
  );
}

export async function PublishedContextCard() {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  return (
    <div className="rounded-2xl border px-4 py-4 text-sm shadow-sm">
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Published context</div>
      <div className="mt-2 font-medium text-foreground">Dataset: {dataset?.version ?? "—"}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Methodology: {dataset?.methodology_version ?? "—"}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">Data source: {currentDataSource()}</div>
    </div>
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
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
      </div>
      <PublishedContextCard />
    </header>
  );
}

export function MethodologyNav() {
  const links = [
    ["Overview", "/methodology"],
    ["Reference", "/methodology/reference"],
    ["Fields", "/methodology/fields"],
    ["Verification", "/methodology/verification"],
    ["Freshness", "/methodology/freshness"],
    ["Boundaries", "/methodology/boundaries"],
    ["Changelog", "/methodology/changelog"],
    ["Integrity", "/methodology/integrity"],
    ["AI controls", "/methodology/ai-controls"],
    ["Previously", "/methodology/previously"],
  ] as const;

  return (
    <nav className="mb-8 flex flex-wrap gap-2">
      {links.map(([label, href]) => (
        <Link
          key={href}
          href={href}
          className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-muted/40 text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-b-0 align-top">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 leading-6 text-muted-foreground">
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
