"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string };

const PRIMARY: Item[] = [
  { href: "/", label: "Home" },
  { href: "/chains", label: "Chains" },
  { href: "/notables", label: "Notables" }, // ← added
  { href: "/methodology", label: "Methodology" },
  { href: "/wiki", label: "Wiki" },
  { href: "/about", label: "About" },
];

const CHAINS: Item[] = [
  { href: "/chains/bitcoin", label: "Bitcoin" },
  { href: "/chains/ethereum", label: "Ethereum" },
  { href: "/chains/arbitrum", label: "Arbitrum" },
  { href: "/chains/base", label: "Base" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={[
        "rounded-full px-3 py-1 text-xs font-semibold transition",
        active
          ? "border border-ui-border bg-ui-bg/25 text-ui-text"
          : "border border-ui-border/70 bg-ui-bg/10 text-ui-muted hover:text-ui-text hover:border-ui-border hover:bg-ui-bg/15",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function Nav() {
  const pathname = usePathname() || "/";

  return (
    <div className="sticky top-0 z-50 border-b border-ui-border bg-ui-bg/35 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-3">
        {/* Primary */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 text-sm font-semibold text-ui-text">Trend Context</div>
          {PRIMARY.map((it) => (
            <NavLink key={it.href} href={it.href} label={it.label} active={isActive(pathname, it.href)} />
          ))}

          <div className="ml-auto text-[11px] text-ui-faint">Descriptive only · No prices · No forecasts</div>
        </div>

        {/* Chains quick links */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-[11px] uppercase tracking-wide text-ui-faint">Chains</div>
          {CHAINS.map((it) => (
            <NavLink key={it.href} href={it.href} label={it.label} active={isActive(pathname, it.href)} />
          ))}
        </div>
      </div>
    </div>
  );
}