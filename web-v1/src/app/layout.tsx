import type { Metadata } from "next";
import "./globals.css";
import { Inter, Geist_Mono } from "next/font/google";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-primary",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "CSS",
  description: "Descriptive on-chain trend analytics (no price).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
