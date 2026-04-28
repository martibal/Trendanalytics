import Link from "next/link";
import type { ReactNode } from "react";
import {
  UrdCallout,
  UrdHero,
  UrdInlineCode,
  UrdPillLink,
  UrdSection,
  UrdTable,
  cx,
  urd,
} from "@/components/site/UrdDesignSystem";

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
  return <UrdInlineCode>{children}</UrdInlineCode>;
}

export function MethodologyHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return <UrdHero eyebrow="Urd Atlas methodology" title={title} summary={description} />;
}

export function MethodologyNav() {
  return (
    <nav className={urd.nav}>
      <div className={urd.navInner}>
        {NAV_ITEMS.map((item) => (
          <UrdPillLink key={item.href} href={item.href}>
            {item.label}
          </UrdPillLink>
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
    <UrdSection id={id} title={title}>
      {children}
    </UrdSection>
  );
}

export function Callout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return <UrdCallout title={title}>{children}</UrdCallout>;
}

export function WarningCallout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return <UrdCallout title={title} tone="warning">{children}</UrdCallout>;
}

export function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return <UrdTable headers={headers} rows={rows} />;
}

export function MethodologyPageShell({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-[#edf6ff] text-[#0a1d3a]">{children}</main>;
}

export function MethodologyContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("mx-auto max-w-6xl px-6 py-10", className)}>{children}</div>;
}

export function MethodologyLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-[#0d2447] underline decoration-[#9db8d4] underline-offset-4 hover:text-blue-800">
      {children}
    </Link>
  );
}
