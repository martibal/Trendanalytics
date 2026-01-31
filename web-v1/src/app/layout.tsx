import "./globals.css";
import type { Metadata } from "next";
import { AppShell } from "@/components/ui/AppShell";

export const metadata: Metadata = {
  title: "Blockchain Trends (Price-Agnostic)",
  description: "Descriptive, price-agnostic on-chain trend analytics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
