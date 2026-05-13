"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton, useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";

import { CHAIN_LIST } from "@/config/chains";

const DESKTOP_ITEMS = [
  { href: "/status", label: "Status" },
  { href: "/track-record", label: "Track Record" },
  { href: "/thresholds", label: "Thresholds" },
  { href: "/glossary", label: "Glossary" },
  { href: "/faq", label: "FAQ" },
  { href: "/api-docs", label: "API Docs" },
  { href: "/methodology", label: "Methodology" },
] as const;

const CLERK_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function navLinkClass(active: boolean) {
  return ["ua-site-link", active ? "active" : ""].filter(Boolean).join(" ");
}

function AuthAwareActions({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const dashboardClass = mobile ? "btn-ghost" : "btn-ghost";
  const secondaryClass = mobile ? "text-link" : "text-link";

  if (!isLoaded) return <span className={secondaryClass}>Account</span>;

  if (!isSignedIn) {
    return (
      <>
        <Link href="/dashboard" className={dashboardClass} onClick={onNavigate}>Dashboard</Link>
        <Link href="/sign-in" className={secondaryClass} onClick={onNavigate}>Log in</Link>
      </>
    );
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
          <span className="ua-site-brand-mark" aria-hidden="true">ᚢ</span>
          <span>URD ATLAS</span>
        </Link>

        <nav aria-label="Primary" className="ua-site-links">
          <div ref={chainsRef} className="relative">
            <button type="button" aria-haspopup="menu" aria-expanded={chainsOpen} onClick={() => setChainsOpen((prev) => !prev)} className={navLinkClass(Boolean(isChainsActive))}>
              Chains ·
            </button>
            {chainsOpen ? (
              <div role="menu" aria-label="Chains" className="context-panel absolute left-0 top-9 z-[90] min-w-[260px] p-3">
                <Link href="/chains" onClick={closeMenus} className="data-row block">All chains overview</Link>
                {CHAIN_LIST.map((chain) => (
                  <Link key={chain.id} href={`/chains/${chain.id}`} onClick={closeMenus} className="data-row block">
                    {chain.label} · {chain.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          {DESKTOP_ITEMS.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} onClick={closeMenus} className={navLinkClass(Boolean(active))}>{item.label}</Link>;
          })}
        </nav>

        <div className="ua-site-actions">{CLERK_CONFIGURED ? <AuthAwareActions /> : <><Link href="/dashboard" className="btn-ghost">Dashboard</Link><Link href="/sign-in" className="text-link">Log in</Link></>}</div>

        <button type="button" aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((prev) => !prev)} className="ua-mobile-toggle">
          {mobileOpen ? "Close" : "Menu"}
        </button>
      </div>

      <div className={`ua-mobile-menu ${mobileOpen ? "is-open" : ""}`}>
        <Link href="/chains" onClick={closeMenus} className="ua-site-link">Chains</Link>
        {DESKTOP_ITEMS.map((item) => <Link key={item.href} href={item.href} onClick={closeMenus} className="ua-site-link">{item.label}</Link>)}
        <div className="flex flex-wrap gap-3 pt-2">{CLERK_CONFIGURED ? <AuthAwareActions mobile onNavigate={closeMenus} /> : <><Link href="/dashboard" onClick={closeMenus} className="btn-ghost">Dashboard</Link><Link href="/sign-in" onClick={closeMenus} className="text-link">Log in</Link></>}</div>
      </div>
    </header>
  );
}

export default function SiteNavbar() {
  return <SiteNavbarInner pathname={usePathname()} />;
}
