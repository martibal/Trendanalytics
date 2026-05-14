import Link from "next/link";
import type { ReactNode } from "react";

export const urd = {
  color: {
    page: "#080F1A",
    hero: "#0D1F35",
    heroAccent: "#C49230",
    text: "#E8E0D0",
    textStrong: "#E8E0D0",
    textBody: "#7A8A96",
    textMuted: "#3A4A57",
    border: "rgba(232,224,208,.07)",
    borderStrong: "rgba(232,224,208,.14)",
    surface: "#111E30",
    surfaceSoft: "#0D1F35",
    surfaceRaised: "#162840",
    inkStrong: "#E8E0D0",
    chartRaw: "#3D7099",
    chartMA7: "#C49230",
    chartMA30: "#2A6E7A",
    chartGrid: "rgba(232,224,208,.14)",
  },

  page: "ua-page min-h-screen bg-background text-foreground",
  container: "ua-page-shell py-12",

  heroOuter: "hero border-b border-[var(--line)]",
  heroContainer: "page-shell hero-grid",
  heroEyebrow: "eyebrow",
  heroTitle: "ua-h1 mt-5 max-w-5xl",
  heroHighlight: "text-[var(--gold2)] italic",
  heroSummary: "lead mt-6",

  section: "section",
  sectionTitle: "ua-h2",
  sectionBody: "mt-5 max-w-3xl text-[15px] leading-[1.78] text-[var(--ink2)]",

  nav: "mb-8 border-y border-[var(--line)] py-3",
  navInner: "flex min-w-max flex-wrap gap-5",
  navItem: "text-link",

  button: "btn-ghost",
  lightButton: "btn-ghost",

  code: "code-block inline-block px-2 py-1",

  tableWrap: "mt-5 overflow-x-auto border-y border-[var(--line)]",
  table: "w-full text-sm",
  tableHead: "border-b border-[var(--line)]",
  tableTh: "px-0 py-3 pr-6 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--gold)]",
  tableBody: "divide-y divide-[var(--line)]",
  tableTd: "px-0 py-4 pr-6 text-[var(--ink2)]",

  callout: "border-y border-[var(--line)] py-5",
  calloutTitle: "meta-label",
  calloutBody: "mt-3 max-w-3xl text-sm leading-7 text-[var(--ink2)]",

  warning: "border-y border-[var(--gold-line)] py-5",
  warningTitle: "meta-label text-[var(--gold)]",

  chartCard: "context-panel p-5 text-[var(--ink)]",
  chartPanel: "context-panel text-[var(--ink)]",

  landingChainCard: "interactive-row p-5",
  landingChainCardGlow: "hidden",
  landingChainCardOrb: "hidden",
  landingChainCardSheen: "hidden",
  landingChainCardContent: "relative z-10 flex h-full min-h-[246px] w-full flex-col",
  landingChainDriverPanel: "border-y border-[var(--line)] py-2 text-right",
  landingChainConfidencePanel: "mt-7 border-y border-[var(--line)] p-4",
  landingChainFooter: "mt-auto flex items-center justify-between gap-3 pt-6 text-[13px] text-[var(--ink2)]",

  modalOverlay: "absolute inset-0 bg-[rgba(8,15,26,.84)]",
  modalBackdrop: "absolute inset-0 bg-[rgba(8,15,26,.84)]",
  modalPanel: "modal-panel relative z-10 flex flex-col",
  modalHeader: "modal-head",
  modalTitle: "meta-label",
  modalSubtitle: "mt-2 text-sm leading-6 text-[var(--ink2)]",
  modalClose: "btn-ghost h-10 px-3",
  modalBody: "min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5",
  modalGrid: "grid gap-4 lg:grid-cols-2",
  modalInfoBox: "border-y border-[var(--line)] p-5 text-[var(--ink)]",
  modalInfoBoxAlt: "border-y border-[var(--line)] p-5 text-[var(--ink)]",
  modalInfoLabel: "meta-label",
  modalInfoBody: "mt-3 text-sm leading-7 text-[var(--ink2)]",
  modalBasicPanel: "border-y border-[var(--line)] p-5 text-[var(--ink)]",
  modalAdvancedPanel: "border-y border-[var(--line)] p-5 text-[var(--ink)]",
  modalKicker: "meta-label",
  infoPanel: "border-y border-[var(--line)] p-5 text-[var(--ink)]",
  infoPanelStrong: "border-y border-[var(--line)] p-5 text-[var(--ink)]",
  modalTraceBox: "mt-4 border-y border-[var(--line)] p-5 text-[var(--ink)]",
} as const;

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function UrdPage({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cx(urd.page, className)}>{children}</main>;
}

export function UrdContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(urd.container, className)}>{children}</div>;
}

export function UrdHero({ eyebrow, title, highlight, summary, children }: { eyebrow?: ReactNode; title: ReactNode; highlight?: ReactNode; summary?: ReactNode; children?: ReactNode }) {
  return (
    <section className={urd.heroOuter}>
      <div className={urd.heroContainer}>
        <div>
          {eyebrow ? <div className={urd.heroEyebrow}>{eyebrow}</div> : null}
          <h1 className={urd.heroTitle}>
            {title}
            {highlight ? <><br /><em className={urd.heroHighlight}>{highlight}</em></> : null}
          </h1>
          {summary ? <div className={urd.heroSummary}>{summary}</div> : null}
          {children ? <div className="mt-8">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}

export function UrdSection({ title, eyebrow, children, id, className }: { title?: ReactNode; eyebrow?: ReactNode; children: ReactNode; id?: string; className?: string }) {
  return (
    <section id={id} className={cx(urd.section, className)}>
      <div className="page-shell">
        <div className="section-head">
          <div>
            {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
            {title ? <h2 className={cx(urd.sectionTitle, eyebrow ? "mt-3" : undefined)}>{title}</h2> : null}
          </div>
          <div className={title || eyebrow ? urd.sectionBody : "text-sm leading-7 text-[var(--ink2)]"}>{children}</div>
        </div>
      </div>
    </section>
  );
}

export function UrdPillLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return <Link href={href} className={cx(urd.navItem, className)}>{children}</Link>;
}

export function UrdButtonLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return <Link href={href} className={cx(urd.button, className)}>{children}</Link>;
}

export function UrdInlineCode({ children }: { children: ReactNode }) {
  return <code className={urd.code}>{children}</code>;
}

export function UrdCallout({ title, children, tone = "info" }: { title?: ReactNode; children: ReactNode; tone?: "info" | "warning" }) {
  const isWarning = tone === "warning";
  return (
    <section className={isWarning ? urd.warning : urd.callout}>
      {title ? <h3 className={isWarning ? urd.warningTitle : urd.calloutTitle}>{title}</h3> : null}
      <div className={urd.calloutBody}>{children}</div>
    </section>
  );
}

export function UrdTable({ headers, rows }: { headers: ReactNode[]; rows: ReactNode[][] }) {
  return (
    <div className={urd.tableWrap}>
      <table className={urd.table}>
        <thead className={urd.tableHead}>
          <tr>{headers.map((header, i) => <th key={i} className={urd.tableTh}>{header}</th>)}</tr>
        </thead>
        <tbody className={urd.tableBody}>
          {rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className={urd.tableTd}>{cell}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

export function UrdCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("border-y border-[var(--line)] py-5", className)}>{children}</section>;
}

export function UrdDarkCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("context-panel p-5", className)}>{children}</section>;
}
