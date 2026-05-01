"use client";

import { type ReactNode } from "react";

export default function ShortFullContent({
  fullContent,
}: {
  pageKey: string;
  shortTitle?: string;
  fullTitle?: string;
  summary: ReactNode;
  bullets?: ReactNode[];
  whyItMatters?: ReactNode;
  hint?: ReactNode;
  ctaLabel?: string;
  shortContent?: ReactNode;
  fullContent: ReactNode;
}) {
  return <div className="grid gap-6">{fullContent}</div>;
}