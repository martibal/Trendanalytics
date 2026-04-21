import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Fragment, type ReactNode } from "react";
import "./globals.css";
import SiteNavbar from "@/components/site/SiteNavbar";
import SiteFooter from "@/components/site/SiteFooter";
import ThemeProvider from "@/components/site/ThemeProvider";
import HashModalScrollManager from "@/components/site/HashModalScrollManager";

export const metadata: Metadata = {
  title: "Urd Atlas",
  description: "Descriptive on-chain regime context. No price. No forecasts. No recommendations.",
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
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <AuthProvider>
          <ThemeProvider>
            <HashModalScrollManager />
            <div className="flex min-h-dvh flex-col bg-background">
              <SiteNavbar />
              <div className="flex-1">
                <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
              </div>
              <SiteFooter />
            </div>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
