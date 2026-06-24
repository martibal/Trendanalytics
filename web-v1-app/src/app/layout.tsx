import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Fragment, type ReactNode } from "react";

import SiteFooter from "@/components/site/SiteFooter";
import HashModalScrollManager from "@/components/site/HashModalScrollManager";
import SiteNavbar from "@/components/site/SiteNavbar";
import ThemeProvider from "@/components/site/ThemeProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Urd Atlas",
  description: "On-chain reference data for BTC, ETH, ARB, and BASE. No price data. No forecasts. No recommendations.",
};

function AuthProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return <Fragment>{children}</Fragment>;
  }

  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&family=IBM+Plex+Mono:wght@300;400;500&family=Inter:wght@300;400;500&display=swap"
        />
      </head>
      <body className="min-h-dvh overflow-x-hidden bg-background text-foreground antialiased">
        <AuthProvider>
          <ThemeProvider>
            <HashModalScrollManager />
            <div className="flex min-h-dvh flex-col bg-background">
              <SiteNavbar />
              <div className="flex-1 w-full">{children}</div>
              <SiteFooter />
            </div>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}