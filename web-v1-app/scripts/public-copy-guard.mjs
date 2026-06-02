/*START FILE*/
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const scanRoots = [
  "src/app",
  "src/components",
  "src/lib",
  "docs",
  "public/data/published/v1",
  "public/data/samples",
  "public/samples",
];

const allowedExtensions = /\.(ts|tsx|md|mdx|json)$/i;

const skipDirectoryNames = new Set([
  ".git",
  ".next",
  "node_modules",
  "coverage",
  "dist",
  "out",
  "playwright-report",
  "test-results",
]);

const skipIfPathIncludes = [
  `${path.sep}__tests__${path.sep}`,
  `${path.sep}fixtures${path.sep}`,
  ".test.",
  ".spec.",
];

const boundaryContextPatterns = [
  /\b(no|not|never|without|excluded|excludes|exclude|avoids|avoid|does not|do not|cannot|must not|is not|are not|not intended|not designed|not a|absence of)\b/i,
  /\b(disclaimer|limitation|boundary|prohibited|excluded capability|not provided|not offered)\b/i,
  /\b(no price data|no forecasts|no recommendations|no investment advice)\b/i,
];

const rules = [
  {
    id: "A-001-PRICE-MARKET-LANGUAGE",
    auditItem: "A-001",
    severity: "blocker",
    description:
      "Market-price language must not appear as a product capability or user-facing interpretation.",
    allowWhenBoundaryContext: true,
    patterns: [
      /\b(?:btc|bitcoin|eth|ethereum|arb|arbitrum|base)\s+price\b/gi,
      /\bmarket\s+price\b/gi,
      /\bprice\s+(?:movement|trend|action|target|forecast|prediction|outcome)\b/gi,
      /\b(?:predict|forecast|project|estimate)s?\s+(?:the\s+)?(?:future\s+)?price\b/gi,
      /\bfuture\s+price\b/gi,
    ],
  },
  {
    id: "A-002-PRICE-DERIVED-METRIC",
    auditItem: "A-002",
    severity: "blocker",
    description:
      "Price-derived metrics must not appear in metric catalogs, APIs, public JSON, or public methodology as active product outputs.",
    allowWhenBoundaryContext: true,
    patterns: [
      /\b(?:price_return|log_return|simple_return|daily_return|weekly_return|monthly_return|return_pct|returns_pct)\b/gi,
      /\b(?:drawdown|sharpe|sortino)\b/gi,
      /\b(?:market_cap|market\s+cap|valuation)\b/gi,
      /\b(?:price_correlation|correlation_to_price|correlation\s+to\s+price)\b/gi,
      /\b(?:price|market)\s+volatility\b/gi,
      /["'`](?:alpha|beta)["'`]\s*:/gi,
      /\b(?:alpha|beta)\s+(?:metric|factor|coefficient|exposure)\b/gi,
    ],
  },
  {
    id: "A-003-PREDICTIVE-LANGUAGE",
    auditItem: "A-003",
    severity: "blocker",
    description:
      "Public copy must remain historical and observational, not predictive.",
    allowWhenBoundaryContext: true,
    patterns: [
      /\b(?:will|is\s+likely\s+to|likely\s+to|expected\s+to)\s+(?:rise|fall|increase|decrease|pump|dump|go\s+up|go\s+down)\b/gi,
      /\b(?:forecast|predict|prediction|projection|projected|upcoming)\s+(?:market|price|return|move|movement|trend|outcome)\b/gi,
      /\b(?:future|next)\s+(?:market|price|return|move|movement|trend|outcome)\b/gi,
      /\bsoon\s+(?:increase|decrease|rise|fall|pump|dump)\b/gi,
    ],
  },
  {
    id: "A-004-INVESTMENT-ADVICE",
    auditItem: "A-004",
    severity: "blocker",
    description:
      "The product must not tell users what to buy, sell, hold, accumulate, enter, or exit.",
    allowWhenBoundaryContext: true,
    patterns: [
      /\b(?:buy|sell|hold|accumulate)\s+(?:btc|bitcoin|eth|ethereum|arb|arbitrum|base|crypto|token|asset|now)\b/gi,
      /\b(?:investor|trader|user|subscriber)s?\s+should\s+(?:buy|sell|hold|accumulate|enter|exit)\b/gi,
      /\b(?:entry|exit)\s+(?:point|signal|zone|timing|level)\b/gi,
      /\b(?:bullish|bearish|undervalued|overvalued)\b/gi,
      /\b(?:trading|investment)\s+opportunit(?:y|ies)\b/gi,
      /\bguaranteed\s+return\b/gi,
    ],
  },
  {
    id: "A-005-REGIME-LABEL-BOUNDARY",
    auditItem: "A-005",
    severity: "blocker",
    description:
      "Regime labels and explanations must describe observed network conditions only.",
    allowWhenBoundaryContext: true,
    patterns: [
      /\b(?:buy|sell|hold|accumulate)\s+signal\b/gi,
      /\b(?:profit|return|alpha)\s+signal\b/gi,
      /\b(?:market|price)\s+signal\b/gi,
      /\b(?:good|bad)\s+time\s+to\s+(?:buy|sell|enter|exit)\b/gi,
    ],
  },
  {
    id: "A-006-CONFIDENCE-OVERCLAIM",
    auditItem: "A-006",
    severity: "blocker",
    description:
      "Confidence must not imply correctness, certainty, completeness, or investment safety.",
    allowWhenBoundaryContext: true,
    patterns: [
      /\bconfidence\s+(?:means|proves|guarantees|confirms|ensures)\b.{0,100}\b(?:correct|accurate|true|safe|complete|certain)\b/gi,
      /\b(?:high|strong)\s+confidence\b.{0,100}\b(?:means|proves|guarantees|confirms|ensures)\b/gi,
      /\b(?:guaranteed|certain|risk-free|failsafe)\s+(?:accuracy|correctness|signal|output|result)\b/gi,
    ],
  },
  {
    id: "A-007-NOTABLES-OBSERVATIONAL-ONLY",
    auditItem: "A-007",
    severity: "blocker",
    description:
      "Notables must describe observed conditions only, not tell users how to act.",
    allowWhenBoundaryContext: true,
    patterns: [
      /\bnotable\b.{0,120}\b(?:buy|sell|hold|accumulate|enter|exit)\b/gi,
      /\b(?:because|therefore)\s+(?:you|investors|traders|subscribers)\s+should\b/gi,
      /\b(?:actionable|tradeable|tradable)\s+(?:signal|setup|opportunity|insight)\b/gi,
    ],
  },
  {
    id: "A-009-LIMITATION-DISCLOSURE",
    auditItem: "A-009",
    severity: "warning",
    description:
      "Pages should visibly preserve product-boundary disclosures: no price data, no forecasts, no recommendations, and confidence/coverage limitations.",
    allowWhenBoundaryContext: false,
    patterns: [],
  },
  {
    id: "A-010-USER-INTERPRETATION-BOUNDARY",
    auditItem: "A-010",
    severity: "blocker",
    description:
      "A reasonable user must not infer that the product predicts markets or tells them what move to make.",
    allowWhenBoundaryContext: true,
    patterns: [
      /\bbefore\s+you\s+make\s+your\s+next\s+move\b/gi,
      /\bmake\s+(?:your|the)\s+next\s+(?:move|trade|investment)\b/gi,
      /\bdecide\s+when\s+to\s+(?:buy|sell|enter|exit)\b/gi,
      /\b(?:market|price)\s+edge\b/gi,
      /\b(?:beat|outperform)\s+the\s+market\b/gi,
    ],
  },
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (skipDirectoryNames.has(entry.name)) continue;
      walk(full, out);
      continue;
    }

    if (entry.isFile() && allowedExtensions.test(entry.name)) {
      out.push(full);
    }
  }

  return out;
}

function normalizeRel(file) {
  return path.normalize(path.relative(root, file));
}

function shouldSkip(relative) {
  return skipIfPathIncludes.some((needle) => relative.includes(needle));
}

function hasBoundaryContext(raw, index, length) {
  const start = Math.max(0, index - 180);
  const end = Math.min(raw.length, index + length + 180);
  const context = raw.slice(start, end);

  return boundaryContextPatterns.some((pattern) => pattern.test(context));
}

function getLineColumn(raw, index) {
  const before = raw.slice(0, index);
  const lines = before.split(/\r?\n/);
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function snippet(raw, index, length) {
  const start = Math.max(0, index - 90);
  const end = Math.min(raw.length, index + length + 90);

  return raw
    .slice(start, end)
    .replace(/\s+/g, " ")
    .trim();
}

function collectFiles() {
  const files = [];

  for (const rel of scanRoots) {
    const absolute = path.join(root, rel);
    files.push(...walk(absolute));
  }

  return [...new Set(files)].sort((a, b) => a.localeCompare(b));
}

function matchRule(rule, relative, raw) {
  const hits = [];

  for (const pattern of rule.patterns) {
    const flags = pattern.flags.includes("g")
      ? pattern.flags
      : `${pattern.flags}g`;
    const re = new RegExp(pattern.source, flags);

    for (const match of raw.matchAll(re)) {
      const text = match[0] ?? "";
      const index = match.index ?? 0;

      if (
        rule.allowWhenBoundaryContext &&
        hasBoundaryContext(raw, index, text.length)
      ) {
        continue;
      }

      const loc = getLineColumn(raw, index);

      hits.push({
        auditItem: rule.auditItem,
        ruleId: rule.id,
        severity: rule.severity,
        description: rule.description,
        file: relative,
        line: loc.line,
        column: loc.column,
        match: text,
        snippet: snippet(raw, index, text.length),
      });
    }
  }

  return hits;
}

function checkRequiredDisclosures(files) {
  const requiredSurfaces = [
    {
      auditItem: "A-009",
      name: "landing",
      files: [
        path.normalize("src/app/page.tsx"),
        path.normalize("src/components/landing/UrdAtlasVFinalLandingClient.tsx"),
        path.normalize("src/components/landing/WhoThisIsFor.tsx"),
        path.normalize("src/lib/content/landingExplanations.tsx"),
      ],
      required: [/no price data/i, /no forecasts/i, /no recommendations/i],
    },
    {
      auditItem: "A-009",
      name: "api-docs",
      files: [path.normalize("src/app/api-docs/page.tsx")],
      required: [/no price data/i, /no forecasts/i, /investment advice/i],
    },
    {
      auditItem: "A-009",
      name: "methodology",
      files: [path.normalize("src/app/methodology/page.tsx")],
      required: [/no price data/i, /no forecasts/i, /coverage/i],
    },
  ];

  const availableByRel = new Map(files.map((file) => [normalizeRel(file), file]));
  const findings = [];

  for (const surface of requiredSurfaces) {
    const existingFiles = surface.files
      .map((file) => ({ relative: file, absolute: availableByRel.get(file) }))
      .filter((item) => Boolean(item.absolute));

    if (existingFiles.length === 0) {
      findings.push({
        auditItem: surface.auditItem,
        ruleId: "A-009-MISSING-DISCLOSURE-SURFACE",
        severity: "warning",
        description:
          "Expected disclosure source files were not found while checking visible limitation disclosure.",
        file: surface.files.join(", "),
        line: 1,
        column: 1,
        match: surface.name,
        snippet: "Expected page or component files missing or not included in scan roots.",
      });
      continue;
    }

    const combinedRaw = existingFiles
      .map((item) => fs.readFileSync(item.absolute, "utf8"))
      .join("\n\n");

    for (const required of surface.required) {
      if (!required.test(combinedRaw)) {
        findings.push({
          auditItem: surface.auditItem,
          ruleId: "A-009-MISSING-DISCLOSURE-TEXT",
          severity: "warning",
          description:
            "Expected product-boundary disclosure text was not found on a key public surface.",
          file: surface.files.join(", "),
          line: 1,
          column: 1,
          match: String(required),
          snippet: `Missing expected disclosure pattern for ${surface.name}: ${required}`,
        });
      }
    }
  }

  return findings;
}

const files = collectFiles();
const findings = [];

for (const file of files) {
  const relative = normalizeRel(file);

  if (shouldSkip(relative)) continue;

  const raw = fs.readFileSync(file, "utf8");

  for (const rule of rules) {
    findings.push(...matchRule(rule, relative, raw));
  }
}

findings.push(...checkRequiredDisclosures(files));

const blockers = findings.filter((finding) => finding.severity === "blocker");
const warnings = findings.filter((finding) => finding.severity === "warning");

if (findings.length > 0) {
  console.error("Public copy guard found product-boundary audit findings:");
  console.error("");

  for (const finding of findings) {
    console.error(
      `[${finding.severity.toUpperCase()}] ${finding.auditItem} ${finding.ruleId}`
    );
    console.error(`File: ${finding.file}:${finding.line}:${finding.column}`);
    console.error(`Match: ${finding.match}`);
    console.error(`Reason: ${finding.description}`);
    console.error(`Context: ${finding.snippet}`);
    console.error("");
  }
}

if (blockers.length > 0) {
  console.error(
    `Public copy guard failed with ${blockers.length} blocker(s) and ${warnings.length} warning(s).`
  );
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn(`Public copy guard passed with ${warnings.length} warning(s).`);
  process.exit(0);
}

console.log(
  `Public copy guard passed. Scanned ${files.length} file(s) across product-boundary rules A-001 through A-010.`
);
/*END FILE*/