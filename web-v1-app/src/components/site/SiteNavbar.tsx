// src/components/site/SiteNavbar.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

type ThemeMode = "dark" | "light";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/chains", label: "Chains" },
  { href: "/status", label: "Status" },
  { href: "/methodology", label: "Methodology" },
  { href: "/glossary", label: "Glossary" },
  { href: "/thresholds", label: "Thresholds" },
  { href: "/api-docs", label: "API Docs" },
] as const;

const STORAGE_KEY = "ta-theme";
const CLERK_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;

  if (mode === "light") {
    root.classList.remove("dark");
  } else {
    root.classList.add("dark");
  }

  window.localStorage.setItem(STORAGE_KEY, mode);
}

function readStoredTheme(): ThemeMode {
  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return "dark";
}

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  return readStoredTheme();
}

function AuthAwareDesktopLink() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <span className="hidden rounded-lg border px-3 py-2 text-sm text-muted-foreground sm:inline-flex">
        Account
      </span>
    );
  }

  if (isSignedIn) {
    return (
      <Link
        href="/dashboard"
        className="hidden rounded-lg border px-3 py-2 text-sm text-foreground transition hover:bg-muted sm:inline-flex"
      >
        Dashboard
      </Link>
    );
  }

  return (
    <Link
      href="/sign-in"
      className="hidden rounded-lg border px-3 py-2 text-sm text-foreground transition hover:bg-muted sm:inline-flex"
    >
      Sign In
    </Link>
  );
}

function AuthAwareMobileLink() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <span className="text-sm text-muted-foreground">Account</span>;
  }

  if (isSignedIn) {
    return (
      <Link
        href="/dashboard"
        className="text-sm text-muted-foreground transition hover:text-foreground"
      >
        Dashboard
      </Link>
    );
  }

  return (
    <Link
      href="/sign-in"
      className="text-sm text-muted-foreground transition hover:text-foreground"
    >
      Sign In
    </Link>
  );
}

function FallbackDesktopLink() {
  return (
    <Link
      href="/sign-in"
      className="hidden rounded-lg border px-3 py-2 text-sm text-foreground transition hover:bg-muted sm:inline-flex"
    >
      Sign In
    </Link>
  );
}

function FallbackMobileLink() {
  return (
    <Link
      href="/sign-in"
      className="text-sm text-muted-foreground transition hover:text-foreground"
    >
      Sign In
    </Link>
  );
}

export default function SiteNavbar() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggleTheme() {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  }

  return (
    <header className="border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex min-w-0 items-center gap-6">
          <Link
            href="/"
            className="shrink-0 text-sm font-semibold tracking-wide text-foreground hover:opacity-80"
          >
            TrendAnalytics
          </Link>

          <nav
            aria-label="Primary"
            className="hidden min-w-0 flex-wrap items-center gap-4 md:flex"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground transition hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {CLERK_CONFIGURED ? <AuthAwareDesktopLink /> : <FallbackDesktopLink />}

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="inline-flex min-w-[98px] items-center justify-center rounded-lg border px-3 py-2 text-sm text-foreground transition hover:bg-muted"
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </div>

      <div className="border-t border-border/60 md:hidden">
        <nav
          aria-label="Primary mobile"
          className="mx-auto flex w-full max-w-6xl flex-wrap gap-x-4 gap-y-2 px-6 py-3"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}

          {CLERK_CONFIGURED ? <AuthAwareMobileLink /> : <FallbackMobileLink />}
        </nav>
      </div>
    </header>
  );
}