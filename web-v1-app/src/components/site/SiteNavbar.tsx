"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton, useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";

import { CHAIN_LIST } from "@/config/chains";
import { UrdBrandLink, urd } from "@/components/site/UrdDesignSystem";

const DESKTOP_ITEMS = [
  { href: "/status", label: "Status" },
  { href: "/track-record", label: "Track Record" },
  { href: "/thresholds", label: "Thresholds" },
  { href: "/glossary", label: "Glossary" },
  { href: "/api-docs", label: "API Docs" },
  { href: "/methodology", label: "Methodology" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
] as const;


const HOME_ITEMS = [
  { href: "/chains", label: "Chains" },
  { href: "/status", label: "Status" },
  { href: "/track-record", label: "Track Record" },
  { href: "/thresholds", label: "Thresholds" },
  { href: "/glossary", label: "Glossary" },
  { href: "/api-docs", label: "API Docs" },
  { href: "/methodology", label: "Methodology" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
] as const;

const CLERK_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function navLinkClass(active: boolean) {
  return [
    "inline-flex h-10 items-center rounded-full px-4 text-sm font-medium transition-colors",
    active
      ? "border border-cyan-400/20 bg-cyan-400/10 text-white"
      : "text-slate-300 hover:bg-white/[0.05] hover:text-white",
  ].join(" ");
}

function AuthAwareActions({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const { isLoaded, isSignedIn } = useAuth();

  const dashboardClass = mobile
    ? "inline-flex items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-white"
    : "inline-flex h-11 items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 text-sm font-semibold text-white transition hover:bg-cyan-400/16";

  const secondaryClass = mobile
    ? "inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-200"
    : "inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.03] px-5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]";

  if (!isLoaded) {
    return <span className={secondaryClass}>Account</span>;
  }

  if (!isSignedIn) {
    return (
      <>
        <Link href="/dashboard" className={dashboardClass} onClick={onNavigate}>
          Dashboard
        </Link>
        <Link href="/sign-in" className={secondaryClass} onClick={onNavigate}>
          Log in
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href="/dashboard" className={dashboardClass} onClick={onNavigate}>
        Dashboard
      </Link>
      <SignOutButton redirectUrl="/">
        <button type="button" className={secondaryClass} onClick={onNavigate}>
          Log out
        </button>
      </SignOutButton>
    </>
  );
}

function SiteNavbarInner({ pathname }: { pathname: string | null }) {
  const [chainsOpen, setChainsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const chainsRef = useRef<HTMLDivElement | null>(null);

  function closeMenus() {
    setChainsOpen(false);
    setMobileOpen(false);
  }

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!chainsRef.current) return;
      if (!chainsRef.current.contains(event.target as Node)) {
        setChainsOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenus();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <header className={urd.topHeader}>
      <div className={urd.topHeaderShell}>
        <UrdBrandLink compact onClick={closeMenus} />

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {HOME_ITEMS.map((item) => {
            if (item.href === "/chains") {
              return (
                <div key={item.href} ref={chainsRef} className="relative">
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={chainsOpen}
                    onClick={() => setChainsOpen((prev) => !prev)}
                    className="inline-flex items-center text-[12px] font-extrabold text-white/90 transition hover:text-white"
                  >
                    Chains
                    <span className="ml-1.5 text-[10px] text-white/55">▾</span>
                  </button>

                  {chainsOpen ? (
                    <div
                      role="menu"
                      aria-label="Chains"
                      className="absolute left-0 top-8 z-[120] min-w-[250px] rounded-2xl border border-white/10 bg-[#07111d]/98 p-2 shadow-[0_22px_60px_rgba(0,0,0,0.45)] backdrop-blur-md"
                    >
                      <Link
                        href="/chains"
                        onClick={closeMenus}
                        className="block rounded-xl px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.05]"
                      >
                        All chains overview
                      </Link>
                      <div className="my-2 h-px bg-white/8" />
                      {CHAIN_LIST.map((chain) => (
                        <Link
                          key={chain.id}
                          href={`/chains/${chain.id}`}
                          onClick={closeMenus}
                          className="block rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                        >
                          {chain.label} · {chain.name}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenus}
                className="text-[12px] font-extrabold text-white/90 transition hover:text-white"
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          {CLERK_CONFIGURED ? (
            <AuthAwareActions />
          ) : (
            <>
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center rounded-[8px] bg-blue-600 px-5 text-[12px] font-extrabold text-white shadow-[0_12px_26px_rgba(37,99,235,0.28)] transition hover:bg-blue-700"
              >
                Dashboard
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex h-10 items-center rounded-[8px] border border-white/12 bg-white/[0.04] px-5 text-[12px] font-extrabold text-white transition hover:bg-white/[0.08]"
              >
                Log in
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((prev) => !prev)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-white/12 bg-white/[0.04] text-lg text-white transition hover:bg-white/[0.08] sm:hidden"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {mobileOpen ? (
        <div className="relative border-t border-white/8 bg-[#031329] px-5 pb-5 sm:hidden">
          <div className="grid gap-2">
            {HOME_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenus}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.05] hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 grid gap-2">
              {CLERK_CONFIGURED ? (
                <AuthAwareActions mobile onNavigate={closeMenus} />
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    onClick={closeMenus}
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/sign-in"
                    onClick={closeMenus}
                    className="inline-flex items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm font-extrabold text-white"
                  >
                    Log in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export default function SiteNavbar() {
  const pathname = usePathname();
  return <SiteNavbarInner pathname={pathname} />;
}
