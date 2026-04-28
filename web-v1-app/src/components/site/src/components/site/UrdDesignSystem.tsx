import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export const urd = {
  color: {
    page: "#e8f2fb",
    hero: "#031329",
    heroAccent: "#2f7cff",
    text: "#071d3b",
    textStrong: "#082247",
    textBody: "#24466f",
    textMuted: "#4f6f96",
    border: "#7fa8cf",
    borderStrong: "#4f6f96",
    surface: "#dbeaf7",
    surfaceSoft: "#d4e6f6",
    surfaceRaised: "#f7fbff",
    panel: "#dbeafa",
    panelStrong: "#c5dcef",
    ink: "#071d3b",
    inkStrong: "#082247",
    inkBody: "#24466f",
    link: "#0a55c2",
    chipBg: "#dceaf8",
    infoPanel: "#d4e6f6",
    infoPanelStrong: "#c5dcef",
    chartPanel: "#d4e6f6",
    chartPlot: "#f7fbff",
    chartGrid: "#7fa3ca",
    chartRaw: "#9a5a00",
    chartMA7: "#003fbd",
    chartMA30: "#031329",
  },

  page: "urd-page min-h-screen bg-[#e8f2fb] text-[#071d3b]",
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
    "rounded-3xl border border-[#7fa8cf] bg-gradient-to-br from-[#dbeaf7] via-[#d4e6f6] to-[#c9e0f2] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_18px_44px_rgba(15,47,91,0.12)]",
  sectionTitle: "text-2xl font-black tracking-[-0.03em] text-[#082247]",
  sectionBody: "mt-4 text-sm font-medium leading-7 text-[#24466f]",

  nav: "mb-8 overflow-x-auto rounded-2xl border border-[#7fa8cf] bg-[#d4e6f6] p-3",
  navInner: "flex min-w-max flex-wrap gap-2",
  navItem:
    "rounded-full border border-[#7fa8cf] bg-[#f7fbff] px-3 py-1.5 text-xs font-black text-[#082247] transition hover:bg-white hover:text-blue-800",

  button:
    "inline-flex items-center rounded-full border border-[#7fa8cf] bg-[#f7fbff] px-3 py-1 text-xs font-black text-[#082247] transition hover:bg-white hover:text-blue-800",

  code:
    "rounded border border-[#7fa8cf] bg-[#f7fbff] px-1.5 py-0.5 font-mono text-xs font-bold text-[#082247]",

  tableWrap: "mt-5 overflow-x-auto rounded-2xl border border-[#7fa8cf]",
  table: "w-full text-sm",
  tableHead: "bg-[#c5dcef]",
  tableTh:
    "px-4 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-[#203c63]",
  tableBody: "divide-y divide-[#7fa8cf] bg-[#f7fbff]",
  tableTd: "px-4 py-3 font-medium text-[#24466f]",

  callout: "rounded-2xl border border-[#7fa8cf] bg-[#d4e6f6] p-5",
  calloutTitle: "text-sm font-black text-blue-700",
  calloutBody: "mt-3 text-sm font-semibold leading-7 text-[#082247]",

  warning: "rounded-2xl border border-amber-400 bg-amber-50 p-5",
  warningTitle: "text-sm font-black text-amber-700",

  modalPanel:
    "relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col rounded-3xl border border-[#7fa8cf] bg-[#d4e6f6] text-[#071d3b] shadow-2xl shadow-slate-950/30",

  card:
    "rounded-3xl border border-[#7fa8cf] bg-[#d4e6f6] text-[#071d3b] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]",
  cardPadded:
    "rounded-3xl border border-[#7fa8cf] bg-[#d4e6f6] p-6 text-[#071d3b] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]",
  subtlePanel:
    "rounded-2xl border border-[#7fa8cf] bg-[#f7fbff] text-[#071d3b]",
  darkOnLightText: "text-[#071d3b]",
  darkOnLightBody: "text-[#24466f]",
  darkOnLightMuted: "text-[#4f6f96]",
  lightButton:
    "inline-flex items-center rounded-full border border-[#7fa8cf] bg-[#f7fbff] px-3 py-1 text-xs font-black text-[#082247] transition hover:bg-white hover:text-blue-800",
  chartCard:
    "rounded-2xl border border-[#7fa8cf] bg-[#c5dcef] p-5 text-[#071d3b] shadow-sm",
  chartPanel:
    "rounded-xl border border-[#7fa8cf] bg-[#f7fbff] text-[#071d3b]",

  modalBackdrop:
    "absolute inset-0 bg-slate-950/80 backdrop-blur-sm",
  modalHeader:
    "flex shrink-0 items-start justify-between gap-4 border-b border-[#7fa8cf] px-6 py-5",
  modalClose:
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#7fa8cf] bg-[#f7fbff] text-xl text-[#082247] hover:bg-white",
  modalGrid:
    "grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
  modalBasicPanel:
    "rounded-2xl border border-emerald-400 bg-emerald-50 p-5 text-[#071d3b]",
  modalAdvancedPanel:
    "rounded-2xl border border-[#7fa8cf] bg-[#f7fbff] p-5 text-[#071d3b]",
  modalKicker:
    "text-xs font-black uppercase tracking-[0.14em] text-blue-700",
  infoPanel:
    "rounded-2xl border border-[#7fa8cf] bg-[#d4e6f6] p-4 text-[#071d3b]",
  infoPanelStrong:
    "rounded-2xl border border-[#7fa8cf] bg-[#c5dcef] p-4 text-[#071d3b]",

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

  landingChainCard:
    "group relative isolate flex min-h-[292px] overflow-hidden rounded-[24px] border border-[#5f96cc] bg-[radial-gradient(circle_at_17%_9%,rgba(255,255,255,0.98)_0%,rgba(241,248,255,0.92)_22%,transparent_46%),radial-gradient(circle_at_86%_14%,rgba(47,124,255,0.24)_0%,rgba(47,124,255,0.10)_26%,transparent_54%),linear-gradient(145deg,#f9fcff_0%,#d7eaff_33%,#b7d5f0_68%,#9dc1e5_100%)] p-5 text-[#071d3b] shadow-[inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_0_rgba(55,97,143,0.22),0_24px_48px_rgba(8,34,71,0.22),0_8px_18px_rgba(8,34,71,0.12)] ring-1 ring-white/80 transition duration-200 hover:-translate-y-1.5 hover:scale-[1.012] hover:border-[#2f7cff] hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_0_rgba(55,97,143,0.24),0_32px_66px_rgba(8,34,71,0.30),0_12px_28px_rgba(47,124,255,0.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f7cff]",
  landingChainCardGlow:
    "pointer-events-none absolute inset-x-5 top-0 z-0 h-[2px] bg-gradient-to-r from-transparent via-white/95 to-transparent",
  landingChainCardOrb:
    "pointer-events-none absolute -right-14 -top-16 z-0 h-52 w-52 rounded-full bg-[#2f7cff]/24 blur-2xl transition duration-300 group-hover:bg-[#2f7cff]/34",
  landingChainCardSheen:
    "pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.52)_24%,transparent_50%)] opacity-0 transition duration-300 group-hover:translate-x-8 group-hover:opacity-100",
  landingChainCardContent:
    "relative z-10 flex h-full min-h-[252px] w-full flex-col",
  landingChainDriverPanel:
    "max-w-[182px] shrink-0 rounded-2xl border border-[#75a9db] bg-[linear-gradient(145deg,rgba(255,255,255,0.82)_0%,rgba(223,238,253,0.76)_100%)] px-3 py-2 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_10px_22px_rgba(8,34,71,0.13)] backdrop-blur-sm",
  landingChainConfidencePanel:
    "mt-7 rounded-2xl border border-[#6f9fcd] bg-[linear-gradient(145deg,rgba(255,255,255,0.76)_0%,rgba(219,235,251,0.72)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_12px_24px_rgba(8,34,71,0.12)]",
  landingChainFooter:
    "mt-auto flex items-center justify-between gap-3 pt-6 text-[13px] font-black text-[#24466f]",
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
  --urd-page: #e8f2fb;
  --urd-hero: #031329;
  --urd-text: #071d3b;
  --urd-text-strong: #082247;
  --urd-text-body: #24466f;
  --urd-text-muted: #4f6f96;
  --urd-border: #7fa8cf;
  --urd-border-strong: #486f97;
  --urd-panel: #d4e6f6;
  --urd-panel-mid: #cfe2f4;
  --urd-panel-strong: #c5dcef;
  --urd-panel-soft: #e5f1fb;
  --urd-raised: #f7fbff;
  --urd-link: #0a55c2;
  background:
    radial-gradient(circle at 16% 0%, rgba(255,255,255,0.82), transparent 32rem),
    linear-gradient(180deg, #e8f2fb 0%, #eaf4fc 42%, #e3eef8 100%);
}

.urd-page :not(.urd-hero):not(.urd-hero *):not(.urd-allow-light-text)[class*="text-white"],
.urd-page :not(.urd-hero):not(.urd-hero *):not(.urd-allow-light-text)[class*="text-slate-50"],
.urd-page :not(.urd-hero):not(.urd-hero *):not(.urd-allow-light-text)[class*="text-slate-100"],
.urd-page :not(.urd-hero):not(.urd-hero *):not(.urd-allow-light-text)[class*="text-slate-200"],
.urd-page :not(.urd-hero):not(.urd-hero *):not(.urd-allow-light-text)[class*="text-cyan-50"],
.urd-page :not(.urd-hero):not(.urd-hero *):not(.urd-allow-light-text)[class*="text-cyan-100"],
.urd-page :not(.urd-hero):not(.urd-hero *):not(.urd-allow-light-text)[class*="text-cyan-200"],
.urd-page :not(.urd-hero):not(.urd-hero *):not(.urd-allow-light-text)[class*="text-sky-50"],
.urd-page :not(.urd-hero):not(.urd-hero *):not(.urd-allow-light-text)[class*="text-sky-100"],
.urd-page :not(.urd-hero):not(.urd-hero *):not(.urd-allow-light-text)[class*="text-sky-200"],
.urd-page :not(.urd-hero):not(.urd-hero *):not(.urd-allow-light-text)[class*="text-blue-100"],
.urd-page :not(.urd-hero):not(.urd-hero *):not(.urd-allow-light-text)[class*="text-blue-200"] {
  color: var(--urd-text-body) !important;
}

.urd-page :not(.urd-hero):not(.urd-hero *) :is(h1,h2,h3,h4,strong,b,th)[class*="text-white"],
.urd-page :not(.urd-hero):not(.urd-hero *) :is(h1,h2,h3,h4,strong,b,th)[class*="text-slate"],
.urd-page :not(.urd-hero):not(.urd-hero *) :is(h1,h2,h3,h4,strong,b,th)[class*="text-cyan"],
.urd-page :not(.urd-hero):not(.urd-hero *) :is(h1,h2,h3,h4,strong,b,th)[class*="text-sky"] {
  color: var(--urd-text-strong) !important;
}

.urd-page :not(.urd-hero):not(.urd-hero *) a:not(.urd-allow-light-text) {
  color: var(--urd-link);
}

.urd-page :not(.urd-hero):not(.urd-hero *) :is(section,article,aside,div)[class*="rounded"][class*="border"]:not(.urd-no-panel):not([role="dialog"]):not([role="menu"]) {
  background-color: var(--urd-panel) !important;
  background-image: linear-gradient(135deg, #dcebf8 0%, #d4e6f6 50%, #c8dff2 100%) !important;
  border-color: var(--urd-border) !important;
  color: var(--urd-text) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.78), 0 16px 36px rgba(15,47,91,0.10) !important;
}

.urd-page :not(.urd-hero):not(.urd-hero *) :is(section,article,aside,div)[class*="rounded"][class*="border"] :is(section,article,aside,div)[class*="rounded"][class*="border"]:not(.urd-no-panel):not([role="dialog"]):not([role="menu"]) {
  background-color: var(--urd-panel-strong) !important;
  background-image: linear-gradient(135deg, #d1e4f5 0%, #c6ddf0 100%) !important;
  border-color: #76a1c8 !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.72), 0 10px 24px rgba(15,47,91,0.08) !important;
}

.urd-page :not(.urd-hero):not(.urd-hero *) :is(section,article,aside,div)[class*="rounded"][class*="border"] :is(section,article,aside,div)[class*="rounded"][class*="border"] :is(section,article,aside,div)[class*="rounded"][class*="border"]:not(.urd-no-panel):not([role="dialog"]):not([role="menu"]) {
  background-color: var(--urd-raised) !important;
  background-image: linear-gradient(135deg, #f7fbff 0%, #eaf4fd 100%) !important;
}

.urd-page :not(.urd-hero):not(.urd-hero *) :is(code,kbd,samp) {
  background-color: var(--urd-raised) !important;
  border: 1px solid var(--urd-border) !important;
  color: var(--urd-text-strong) !important;
}

.urd-page :not(.urd-hero):not(.urd-hero *) table {
  color: var(--urd-text) !important;
}

.urd-page :not(.urd-hero):not(.urd-hero *) thead {
  background-color: var(--urd-panel-strong) !important;
}

.urd-page :not(.urd-hero):not(.urd-hero *) tbody {
  background-color: var(--urd-raised) !important;
}

.urd-page :not(.urd-hero):not(.urd-hero *) th,
.urd-page :not(.urd-hero):not(.urd-hero *) td {
  border-color: #91b2d1 !important;
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
        <div className="text-xs font-black uppercase tracking-[0.14em] text-[#4f6f96]">
          {eyebrow}
        </div>
      ) : null}

      {title ? (
        <h2 className={cx(urd.sectionTitle, eyebrow ? "mt-1" : undefined)}>
          {title}
        </h2>
      ) : null}

      <div className={title || eyebrow ? urd.sectionBody : "text-sm font-medium leading-7 text-[#24466f]"}>
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