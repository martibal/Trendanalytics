"use client";

import { useState } from "react";

export default function EndpointCopyButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function copyEndpoint() {
    const origin = window.location.origin;
    const value = `${origin}${path}`;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copyEndpoint}
      className="rounded-full border border-border px-3 py-2 text-xs font-medium hover:bg-card"
      aria-label={`Copy ${path}`}
    >
      {copied ? "Copied" : "Copy URL"}
    </button>
  );
}
