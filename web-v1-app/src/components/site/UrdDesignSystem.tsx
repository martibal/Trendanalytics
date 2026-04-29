import Link from "next/link";
import type { ReactNode } from "react";

export const urd = {
  color: {
    page: "#edf6ff",
    hero: "#031329",
    heroAccent: "#2f7cff",
    text: "#0a1d3a",
    textStrong: "#0d2447",
    textBody: "#27476f",
    textMuted: "#557099",
    border: "#c9d9ea",
    borderStrong: "#9db8d4",
    surface: "#eaf3fb",
    surfaceSoft: "#e7f1fb",
    surfaceRaised: "#eef6ff",
  },

  page: "min-h-screen bg-[#edf6ff] text-[#0a1d3a]",
  container: "mx-auto max-w-6xl px-6 py-10",

  heroOuter: "relative overflow-hidden bg-[#031329] text-white",
  heroContainer:
    "relative mx-auto max-w-7xl px-6 pb-28 pt-24 sm:px-8 lg:px-10 lg:pb-32 lg:pt-28",
  heroEyebrow:
    "text-xs font-black uppercase tracking-[0.22em] text-cyan-300",
  heroTitle:
    "mt-7 max-w-5xl text-5xl font-black leading-[0.95] tracking-[-0.065em] text-white sm:text-6xl lg:text-7xl",
  heroHighlight: "text-[#2f7cff]",
  heroSummary:
    "mt-8 max-w-3xl text-xl font-black leading-9 text-white",

  section:
    "rounded-3xl border border-[#c9d9ea] bg-[#eaf3fb] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]",
  sectionTitle: "text-2xl font-black tracking-[-0.03em] text-[#0d2447]",
  sectionBody: "mt-4 text-sm font-medium leading-7 text-[#27476f]",

  nav: "mb-8 overflow-x-auto rounded-2xl border border-[#c9d9ea] bg-[#e7f1fb] p-3",
  navInner: "flex min-w-max flex-wrap gap-2",
  navItem:
    "rounded-full border border-[#9db8d4] bg-[#eef6ff] px-3 py-1.5 text-xs font-black text-[#0d2447] transition hover:bg-white hover:text-blue-800",

  button:
    "inline-flex items-center rounded-full border border-[#9db8d4] bg-[#eef6ff] px-3 py-1 text-xs font-black text-[#0d2447] transition hover:bg-white hover:text-blue-800",

  code:
    "rounded border border-[#9db8d4] bg-[#f4f9ff] px-1.5 py-0.5 font-mono text-xs font-bold text-[#0d2447]",

  tableWrap: "mt-5 overflow-x-auto rounded-2xl border border-[#b6cce3]",
  table: "w-full text-sm",
  tableHead: "bg-[#dceaf8]",
  tableTh:
    "px-4 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-[#203c63]",
  tableBody: "divide-y divide-[#b6cce3] bg-[#eaf3fb]",
  tableTd: "px-4 py-3 text-[#27476f]",

  callout: "rounded-2xl border border-blue-300 bg-[#e7f1fb] p-5",
  calloutTitle: "text-sm font-black text-blue-700",
  calloutBody: "mt-3 text-sm font-semibold leading-7 text-[#0d2447]",

  warning: "rounded-2xl border border-amber-400 bg-amber-50 p-5",
  warningTitle: "text-sm font-black text-amber-700",


  landingChainCard:
    "group relative isolate flex min-h-[286px] overflow-hidden rounded-[22px] border border-[#78a8d8] bg-[radial-gradient(circle_at_18%_10%,rgba(255,255,255,0.98)_0%,rgba(247,251,255,0.88)_24%,transparent_48%),linear-gradient(145deg,#f7fbff_0%,#dcecff_38%,#c1d9f1_100%)] p-5 text-[#071d3b] shadow-[inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-1px_0_rgba(73,112,153,0.15),0_18px_36px_rgba(8,34,71,0.15),0_3px_10px_rgba(8,34,71,0.08)] ring-1 ring-white/70 transition duration-200 hover:-translate-y-1 hover:border-[#4f91d8] hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),inset_0_-1px_0_rgba(73,112,153,0.16),0_24px_52px_rgba(8,34,71,0.22),0_8px_20px_rgba(47,124,255,0.16)]",
  landingChainCardGlow:
    "pointer-events-none absolute inset-x-6 top-0 z-0 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent",
  landingChainCardOrb:
    "pointer-events-none absolute -right-16 -top-16 z-0 h-44 w-44 rounded-full bg-[#2f7cff]/14 blur-2xl transition group-hover:bg-[#2f7cff]/22",
  landingChainCardSheen:
    "pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.42)_26%,transparent_52%)] opacity-0 transition duration-300 group-hover:translate-x-6 group-hover:opacity-100",
  landingChainCardContent:
    "relative z-10 flex h-full min-h-[246px] w-full flex-col",
  landingChainDriverPanel:
    "max-w-[178px] shrink-0 rounded-2xl border border-white/70 bg-white/48 px-3 py-2 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_8px_18px_rgba(8,34,71,0.08)] backdrop-blur-sm",
  landingChainConfidencePanel:
    "mt-7 rounded-2xl border border-[#9bc2e8] bg-white/42 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_8px_18px_rgba(8,34,71,0.07)]",
  landingChainFooter:
    "mt-auto flex items-center justify-between gap-3 pt-6 text-[13px] font-bold text-[#31577f]",

  modalPanel:
    "relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col rounded-3xl border border-[#b6cce3] bg-[#e7f1fb] shadow-2xl shadow-slate-950/30",
} as const;

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function UrdPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <main className={cx(urd.page, className)}>{children}</main>;
}

export function UrdContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cx(urd.container, className)}>{children}</div>;
}

export function UrdHero({
  eyebrow,
  title,
  highlight,
  summary,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  highlight?: ReactNode;
  summary?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className={urd.heroOuter}>
      <div className={urd.heroContainer}>
        {eyebrow ? <div className={urd.heroEyebrow}>{eyebrow}</div> : null}

        <h1 className={urd.heroTitle}>
          {title}
          {highlight ? (
            <>
              <br />
              <span className={urd.heroHighlight}>{highlight}</span>
            </>
          ) : null}
        </h1>

        {summary ? <div className={urd.heroSummary}>{summary}</div> : null}

        {children ? <div className="mt-10">{children}</div> : null}
      </div>
    </section>
  );
}

export function UrdSection({
  title,
  eyebrow,
  children,
  id,
  className,
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={cx(urd.section, className)}>
      {eyebrow ? (
        <div className="text-xs font-black uppercase tracking-[0.14em] text-[#557099]">
          {eyebrow}
        </div>
      ) : null}

      {title ? (
        <h2 className={cx(urd.sectionTitle, eyebrow ? "mt-1" : undefined)}>
          {title}
        </h2>
      ) : null}

      <div className={title || eyebrow ? urd.sectionBody : "text-sm font-medium leading-7 text-[#27476f]"}>
        {children}
      </div>
    </section>
  );
}

export function UrdPillLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cx(urd.navItem, className)}>
      {children}
    </Link>
  );
}

export function UrdButtonLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cx(urd.button, className)}>
      {children}
    </Link>
  );
}

export function UrdInlineCode({ children }: { children: ReactNode }) {
  return <code className={urd.code}>{children}</code>;
}

export function UrdCallout({
  title,
  children,
  tone = "info",
}: {
  title?: ReactNode;
  children: ReactNode;
  tone?: "info" | "warning";
}) {
  const isWarning = tone === "warning";

  return (
    <section className={isWarning ? urd.warning : urd.callout}>
      {title ? (
        <h3 className={isWarning ? urd.warningTitle : urd.calloutTitle}>
          {title}
        </h3>
      ) : null}
      <div className={urd.calloutBody}>{children}</div>
    </section>
  );
}

export function UrdTable({
  headers,
  rows,
}: {
  headers: ReactNode[];
  rows: ReactNode[][];
}) {
  return (
    <div className={urd.tableWrap}>
      <table className={urd.table}>
        <thead className={urd.tableHead}>
          <tr>
            {headers.map((header, i) => (
              <th key={i} className={urd.tableTh}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={urd.tableBody}>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className={urd.tableTd}>
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

export function UrdDarkCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-[26px] border border-white/8 bg-[#031329] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.32)]",
        className,
      )}
    >
      {children}
    </section>
  );
}