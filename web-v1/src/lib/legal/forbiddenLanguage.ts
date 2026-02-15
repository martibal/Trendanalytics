// src/lib/legal/forbiddenLanguage.ts
// [LEGAL] Forbidden language detection for user-facing narratives.
// IMPORTANT: This should be applied to generated summaries / interpretations,
// not to documentation pages (methodology/wiki), which may contain instructional language.

export type ForbiddenCategory = "predictive" | "advisory" | "sentiment" | "causal_price";

export type ForbiddenViolation = {
  category: ForbiddenCategory;
  term: string;
  severity: "CRITICAL";
  message: string;
  // Best-effort location info for debugging
  index: number;
  excerpt: string;
};

const FORBIDDEN_TERMS: Record<ForbiddenCategory, string[]> = {
  predictive: [
    "will",
    "should",
    "expect to",
    "likely to",
    "predicted",
    "forecasted",
    "anticipated",
    "projected",
    "going to",
    "about to",
    "set to",
    "poised to",
    "destined to",
  ],
  advisory: [
    "you should",
    "we recommend",
    "consider buying",
    "consider selling",
    "good time to",
    "opportunity",
    "favorable",
    "buy now",
    "sell now",
    "hold",
    "enter position",
    "exit position",
  ],
  sentiment: ["bullish", "bearish", "moon", "dump", "pump", "rekt", "fud", "fomo", "hopium"],
  causal_price: [
    "will affect price",
    "indicates price movement",
    "signals market direction",
    "suggests trend in value",
    "price will",
    "value will",
    "market will",
  ],
};

// Small helper: create a readable excerpt around the match for debugging.
function excerptAround(text: string, index: number, matchLen: number) {
  const start = Math.max(0, index - 28);
  const end = Math.min(text.length, index + matchLen + 28);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

export function scanForForbiddenLanguage(text: string) {
  const violations: ForbiddenViolation[] = [];
  const lower = (text ?? "").toLowerCase();

  (Object.keys(FORBIDDEN_TERMS) as ForbiddenCategory[]).forEach((category) => {
    for (const term of FORBIDDEN_TERMS[category]) {
      const needle = term.toLowerCase();
      // Find all occurrences (not just first) to avoid “hidden” violations.
      let fromIndex = 0;
      while (fromIndex < lower.length) {
        const idx = lower.indexOf(needle, fromIndex);
        if (idx === -1) break;

        violations.push({
          category,
          term,
          severity: "CRITICAL",
          message: `Forbidden ${category} language detected: "${term}"`,
          index: idx,
          excerpt: excerptAround(text, idx, needle.length),
        });

        fromIndex = idx + needle.length;
      }
    }
  });

  return {
    isCompliant: violations.length === 0,
    violations,
  };
}

/**
 * Throws on violations.
 * Use this in API routes that generate user-facing narrative strings.
 *
 * Example:
 *   validateNoForbiddenLanguage(summary.interpretation.basic, "summary.basic");
 */
export function validateNoForbiddenLanguage(text: string, context?: string) {
  const r = scanForForbiddenLanguage(text);

  if (!r.isCompliant) {
    const where = context ? ` (${context})` : "";
    const lines = r.violations
      .map((v) => `- ${v.message}${where}\n  at ${v.index}: ${JSON.stringify(v.excerpt)}`)
      .join("\n");

    // Throwing is intentional: hard-stop on legal policy violations for generated content.
    throw new Error(`LEGAL COMPLIANCE VIOLATION${where}:\n${lines}`);
  }

  return true as const;
}