// src/app/mobile/layout.tsx
// Mobile shell layout — PWA meta, viewport, safe areas

import "./mobile.css";
import type { ReactNode } from "react";
import PwaRegister from "@/components/mobile/PwaRegister";

export const metadata = {
  title: "Urd Atlas",
  description: "Daily on-chain regime classification for BTC, ETH, ARB, and BASE",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Urd Atlas",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
};

export default function MobileLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* PWA meta tags (injected into <head> by Next.js metadata) */}
      <div className="mobile-shell">
        {children}
        <PwaRegister />
      </div>
    </>
  );
}
