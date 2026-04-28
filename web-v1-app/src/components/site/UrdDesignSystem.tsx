import Image from "next/image";
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

  modalPanel:
    "relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col rounded-3xl border border-[#b6cce3] bg-[#e7f1fb] shadow-2xl shadow-slate-950/30",

  topHeader:
    "absolute inset-x-0 top-0 z-[80] bg-transparent text-white",
  topHeaderShell:
    "relative mx-auto flex h-[98px] w-full max-w-[1180px] items-end justify-between gap-7 px-5 pb-6 pt-11 sm:px-7 lg:px-8",
  topHeaderBrand:
    "inline-flex min-w-0 items-center text-white transition hover:opacity-90",
  brandText:
    "font-black uppercase tracking-[-0.04em] text-white",
  brandAccent:
    "ml-1.5 font-black uppercase tracking-[-0.04em] text-blue-400",
} as const;

export function UrdTreeLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={cx(
        "pointer-events-none relative inline-flex shrink-0 opacity-55",
        className ?? "h-12 w-12",
      )}
      aria-hidden="true"
    >
      <Image
        src="/web-bilder/ygg-transparent.png"
        alt=""
        width={64}
        height={64}
        sizes="32px"
        className="h-full w-full object-contain"
        priority={priority}
      />
    </span>
  );
}

export function UrdBrand({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const textSize = compact ? "text-[23px]" : "text-[23px]";
  const logoSize = compact ? "h-9 w-9" : "h-9 w-9";

  return (
    <span className={cx("relative inline-flex min-w-0 items-center gap-3 pr-3", className)}>
      <span className="relative z-10 inline-flex min-w-0 items-baseline">
        <span className={cx(textSize, urd.brandText)}>URD</span>
        <span className={cx(textSize, urd.brandAccent)}>ATLAS</span>
      </span>
      <UrdTreeLogo className={cx("relative z-0 -ml-0.5", logoSize)} priority={compact} />
    </span>
  );
}

export function UrdBrandLink({
  compact = false,
  onClick,
  className,
}: {
  compact?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link
      href="/"
      onClick={onClick}
      className={cx(urd.topHeaderBrand, className)}
      aria-label="Urd Atlas home"
    >
      <UrdBrand compact={compact} />
    </Link>
  );
}

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