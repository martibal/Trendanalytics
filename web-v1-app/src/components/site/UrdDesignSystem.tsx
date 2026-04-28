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
    border: "#9db8d4",
    borderStrong: "#557099",
    surface: "#eaf3fb",
    surfaceSoft: "#d9eafb",
    surfaceRaised: "#f4f9ff",
    panel: "#dbeafa",
    panelStrong: "#cfe2f5",
    ink: "#0a1d3a",
    inkStrong: "#0d2447",
    inkBody: "#27476f",
    link: "#0b58ca",
    chipBg: "#dceaf8",
    infoPanel: "#d9eafb",
    infoPanelStrong: "#cfe2f5",
    chartPanel: "#d9eafb",
    chartPlot: "#f4f9ff",
    chartGrid: "#7fa3ca",
    chartRaw: "#b45309",
    chartMA7: "#0046c7",
    chartMA30: "#031329",
  },

  page: "urd-page min-h-screen bg-[#edf6ff] text-[#0a1d3a]",
  container: "mx-auto max-w-6xl px-6 py-10",

  heroOuter: "urd-hero relative overflow-hidden bg-[#031329] text-white",
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
    "rounded-3xl border border-[#86a9cc] bg-[#d2e4f6] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]",
  sectionTitle: "text-2xl font-black tracking-[-0.03em] text-[#0d2447]",
  sectionBody: "mt-4 text-sm font-medium leading-7 text-[#27476f]",

  nav: "mb-8 overflow-x-auto rounded-2xl border border-[#86a9cc] bg-[#d2e4f6] p-3",
  navInner: "flex min-w-max flex-wrap gap-2",
  navItem:
    "rounded-full border border-[#86a9cc] bg-[#f4f9ff] px-3 py-1.5 text-xs font-black text-[#0d2447] transition hover:bg-white hover:text-blue-800",

  button:
    "inline-flex items-center rounded-full border border-[#86a9cc] bg-[#f4f9ff] px-3 py-1 text-xs font-black text-[#0d2447] transition hover:bg-white hover:text-blue-800",

  code:
    "rounded border border-[#86a9cc] bg-[#f4f9ff] px-1.5 py-0.5 font-mono text-xs font-bold text-[#0d2447]",

  tableWrap: "mt-5 overflow-x-auto rounded-2xl border border-[#86a9cc]",
  table: "w-full text-sm",
  tableHead: "bg-[#bed8f0]",
  tableTh:
    "px-4 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-[#203c63]",
  tableBody: "divide-y divide-[#9db8d4] bg-[#f4f9ff]",
  tableTd: "px-4 py-3 font-medium text-[#27476f]",

  callout: "rounded-2xl border border-[#86a9cc] bg-[#d2e4f6] p-5",
  calloutTitle: "text-sm font-black text-blue-700",
  calloutBody: "mt-3 text-sm font-semibold leading-7 text-[#0d2447]",

  warning: "rounded-2xl border border-amber-400 bg-amber-50 p-5",
  warningTitle: "text-sm font-black text-amber-700",

  modalPanel:
    "relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col rounded-3xl border border-[#86a9cc] bg-[#d2e4f6] text-[#0a1d3a] shadow-2xl shadow-slate-950/30",

  card:
    "rounded-3xl border border-[#86a9cc] bg-[#d2e4f6] text-[#0a1d3a] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]",
  cardPadded:
    "rounded-3xl border border-[#86a9cc] bg-[#d2e4f6] p-6 text-[#0a1d3a] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]",
  subtlePanel:
    "rounded-2xl border border-[#86a9cc] bg-[#f4f9ff] text-[#0a1d3a]",
  darkOnLightText: "text-[#0a1d3a]",
  darkOnLightBody: "text-[#27476f]",
  darkOnLightMuted: "text-[#557099]",
  lightButton:
    "inline-flex items-center rounded-full border border-[#86a9cc] bg-[#f4f9ff] px-3 py-1 text-xs font-black text-[#0d2447] transition hover:bg-white hover:text-blue-800",
  chartCard:
    "rounded-2xl border border-[#86a9cc] bg-[#bed8f0] p-5 text-[#0a1d3a] shadow-sm",
  chartPanel:
    "rounded-xl border border-[#86a9cc] bg-[#f4f9ff] text-[#0a1d3a]",

  modalBackdrop:
    "absolute inset-0 bg-slate-950/80 backdrop-blur-sm",
  modalHeader:
    "flex shrink-0 items-start justify-between gap-4 border-b border-[#86a9cc] px-6 py-5",
  modalClose:
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#86a9cc] bg-[#f4f9ff] text-xl text-[#0d2447] hover:bg-white",
  modalGrid:
    "grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
  modalBasicPanel:
    "rounded-2xl border border-emerald-400 bg-emerald-50 p-5 text-[#0a1d3a]",
  modalAdvancedPanel:
    "rounded-2xl border border-[#86a9cc] bg-[#f4f9ff] p-5 text-[#0a1d3a]",
  modalKicker:
    "text-xs font-black uppercase tracking-[0.14em] text-blue-700",
  infoPanel:
    "rounded-2xl border border-[#86a9cc] bg-[#d2e4f6] p-4 text-[#0a1d3a]",
  infoPanelStrong:
    "rounded-2xl border border-[#86a9cc] bg-[#bed8f0] p-4 text-[#0a1d3a]",

  topHeader:
    "fixed inset-x-0 top-0 z-[120] border-b border-white/10 bg-[#031329]/96 text-white shadow-[0_10px_32px_rgba(0,0,0,0.22)] backdrop-blur-md",
  topHeaderShell:
    "relative mx-auto flex min-h-[96px] w-full max-w-[1260px] items-center justify-between gap-10 px-6 py-6 sm:px-8 lg:px-10",
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
        className ?? "h-8 w-8",
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
  const textSize = compact ? "text-[24px]" : "text-[25px]";
  const logoSize = compact ? "h-8 w-8" : "h-9 w-9";

  return (
    <span className={cx("relative inline-flex min-w-0 shrink-0 items-center gap-2.5 pr-6", className)}>
      <span className="relative z-10 inline-flex min-w-0 items-baseline">
        <span className={cx(textSize, urd.brandText)}>URD</span>
        <span className={cx(textSize, urd.brandAccent)}>ATLAS</span>
      </span>
      <UrdTreeLogo className={cx("relative z-0", logoSize)} priority={compact} />
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


const urdScopedCss = `
.urd-page {
  --urd-page: #edf6ff;
  --urd-hero: #031329;
  --urd-text: #0a1d3a;
  --urd-text-strong: #0d2447;
  --urd-text-body: #27476f;
  --urd-text-muted: #557099;
  --urd-border: #86a9cc;
  --urd-border-strong: #436889;
  --urd-panel: #d2e4f6;
  --urd-panel-strong: #bed8f0;
  --urd-panel-soft: #e2f0fc;
  --urd-raised: #f7fbff;
  --urd-link: #0b58ca;
}

.urd-page :not(.urd-hero):not(.urd-hero *):not(.urd-allow-light-text)[class*="text-white"],
.urd-page :not(.urd-hero):not(.urd-hero *):not(.urd-allow-light-text)[class*="text-slate-100"],
.urd-page :not(.urd-hero):not(.urd-hero *):not(.urd-allow-light-text)[class*="text-slate-200"],
.urd-page :not(.urd-hero):not(.urd-hero *):not(.urd-allow-light-text)[class*="text-cyan-100"],
.urd-page :not(.urd-hero):not(.urd-hero *):not(.urd-allow-light-text)[class*="text-cyan-200"] {
  color: var(--urd-text) !important;
}

.urd-page :not(.urd-hero):not(.urd-hero *) :is(h1,h2,h3,h4,strong,b,th)[class*="text-white"],
.urd-page :not(.urd-hero):not(.urd-hero *) :is(h1,h2,h3,h4,strong,b,th)[class*="text-slate"] {
  color: var(--urd-text-strong) !important;
}

.urd-page :not(.urd-hero):not(.urd-hero *) :is(p,li,td,dd,dt,span,div)[class*="text-white"],
.urd-page :not(.urd-hero):not(.urd-hero *) :is(p,li,td,dd,dt,span,div)[class*="text-slate"] {
  color: var(--urd-text-body) !important;
}

.urd-page :not(.urd-hero):not(.urd-hero *) :is(section,article,aside,div)[class*="rounded"][class*="border"]:not(.urd-no-panel):not([role="dialog"]):not([role="menu"]) {
  background-color: var(--urd-panel) !important;
  border-color: var(--urd-border) !important;
  color: var(--urd-text) !important;
}

.urd-page :not(.urd-hero):not(.urd-hero *) :is(section,article,aside,div)[class*="rounded"][class*="border"] :is(section,article,aside,div)[class*="rounded"][class*="border"]:not(.urd-no-panel):not([role="dialog"]):not([role="menu"]) {
  background-color: var(--urd-panel-strong) !important;
  border-color: var(--urd-border) !important;
}

.urd-page :not(.urd-hero):not(.urd-hero *) :is(code,kbd,samp) {
  background-color: var(--urd-raised) !important;
  border-color: var(--urd-border) !important;
  color: var(--urd-text-strong) !important;
}

.urd-page :not(.urd-hero):not(.urd-hero *) table {
  color: var(--urd-text) !important;
}

.urd-page :not(.urd-hero):not(.urd-hero *) thead {
  background-color: var(--urd-panel-strong) !important;
}
`;

export function UrdPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={cx(urd.page, className)}>
      <style dangerouslySetInnerHTML={{ __html: urdScopedCss }} />
      {children}
    </main>
  );
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

export function UrdCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cx(urd.cardPadded, className)}>{children}</div>;
}

export function UrdMoreLink({
  href,
  children = "More",
  className,
}: {
  href: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cx(urd.lightButton, className)}>
      {children}
    </Link>
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