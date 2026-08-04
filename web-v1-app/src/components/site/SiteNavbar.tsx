"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton, useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";

import { CHAIN_LIST } from "@/config/chains";

const DESKTOP_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/api-docs", label: "API" },
  { href: "/methodology", label: "Docs" },
  { href: "/plans", label: "Plans" },
] as const;

const MOBILE_SECONDARY_ITEMS = [
  { href: "/explorer", label: "Explorer" },
  { href: "/analyst-kit", label: "Analyst Kit" },
  { href: "/workflows", label: "Workflows" },
  { href: "/validation", label: "Validation" },
  { href: "/status", label: "Status" },
  { href: "/about", label: "About" },
  { href: "/track-record", label: "Track Record" },
  { href: "/thresholds", label: "Thresholds" },
  { href: "/glossary", label: "Glossary" },
  { href: "/faq", label: "FAQ" },
] as const;

const CLERK_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const primaryCtaClass = "inline-flex items-center justify-center rounded-full border border-white/70 bg-white px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-black transition hover:-translate-y-0.5 hover:bg-zinc-200";
const secondaryAuthClass = "inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-300 transition hover:border-white/24 hover:text-white";

function navLinkClass(active: boolean) {
  return ["ua-site-link", active ? "active" : ""].filter(Boolean).join(" ");
}

function GetStartedLink({ onNavigate, mobile = false }: { onNavigate?: () => void; mobile?: boolean }) {
  return (
    <Link href="/start" onClick={onNavigate} className={mobile ? "btn-primary" : primaryCtaClass}>
      Get Started
    </Link>
  );
}

function AuthAwareActions({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const dashboardClass = mobile ? "btn-ghost" : secondaryAuthClass;
  const secondaryClass = mobile ? "text-link" : secondaryAuthClass;

  if (!isLoaded) return <span className={secondaryClass}>Account</span>;

  if (!isSignedIn) {
    return <Link href="/sign-in" className={secondaryClass} onClick={onNavigate}>Log in</Link>;
  }

  return (
    <>
      <Link href="/dashboard" className={dashboardClass} onClick={onNavigate}>Dashboard</Link>
      <SignOutButton redirectUrl="/">
        <button type="button" className={secondaryClass} onClick={onNavigate}>Log out</button>
      </SignOutButton>
    </>
  );
}

function SiteNavbarInner({ pathname }: { pathname: string | null }) {
  const [chainsOpen, setChainsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const chainsRef = useRef<HTMLDivElement | null>(null);
  const isChainsActive = pathname === "/chains" || pathname?.startsWith("/chains/");

  function closeMenus() {
    setChainsOpen(false);
    setMobileOpen(false);
  }

  useEffect(() => {
    function onScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!chainsRef.current) return;
      if (!chainsRef.current.contains(event.target as Node)) setChainsOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenus();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <header className="ua-site-nav">
      <div className="progress" style={{ width: `${progress}%` }} />
      <div className="ua-site-nav-inner">
        <Link href="/" onClick={closeMenus} className="ua-site-brand" aria-label="Urd Atlas home">
          <img className="ua-site-brand-mark" src="/web-bilder/ygg-transparent.png" alt="" aria-hidden="true" />
          <span>URD ATLAS</span>
        </Link>

        <nav aria-label="Primary" className="ua-site-links">
          {DESKTOP_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} onClick={closeMenus} className={navLinkClass(Boolean(active))}>{item.label}</Link>;
          })}
          <div ref={chainsRef} className="relative">
            <button type="button" aria-haspopup="menu" aria-expanded={chainsOpen} onClick={() => setChainsOpen((prev) => !prev)} className={navLinkClass(Boolean(isChainsActive))}>
              Chains
            </button>
            {chainsOpen ? (
              <div role="menu" aria-label="Chains" className="context-panel absolute left-0 top-11 z-[90] min-w-[260px] p-3">
                <Link href="/chains" onClick={closeMenus} className="data-row block">All chains overview</Link>
                {CHAIN_LIST.map((chain) => (
                  <Link key={chain.id} href={`/chains/${chain.id}`} onClick={closeMenus} className="data-row block">
                    {chain.label} · {chain.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </nav>

        <div className="ua-site-actions">
          {CLERK_CONFIGURED ? <AuthAwareActions /> : <Link href="/sign-in" className={secondaryAuthClass}>Log in</Link>}
          <GetStartedLink />
        </div>

        <button type="button" aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((prev) => !prev)} className="ua-mobile-toggle">
          {mobileOpen ? "Close" : "Menu"}
        </button>
      </div>

      <div className={`ua-mobile-menu ${mobileOpen ? "is-open" : ""}`}>
        {DESKTOP_ITEMS.map((item) => <Link key={item.href} href={item.href} onClick={closeMenus} className="ua-site-link">{item.label}</Link>)}
        <Link href="/chains" onClick={closeMenus} className="ua-site-link">Chains</Link>
        {MOBILE_SECONDARY_ITEMS.map((item) => <Link key={item.href} href={item.href} onClick={closeMenus} className="ua-site-link">{item.label}</Link>)}
        <div className="flex flex-wrap gap-3 pt-2">
          {CLERK_CONFIGURED ? <AuthAwareActions mobile onNavigate={closeMenus} /> : <Link href="/sign-in" onClick={closeMenus} className="text-link">Log in</Link>}
          <GetStartedLink mobile onNavigate={closeMenus} />
        </div>
      </div>
    </header>
  );
}

export default function SiteNavbar() {
  return <SiteNavbarInner pathname={usePathname()} />;
}
