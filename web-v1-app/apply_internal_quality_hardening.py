from pathlib import Path
import json
import sys

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()

FILES = {}

FILES["scripts/repo-hygiene-check.mjs"] = r"""
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const forbiddenPaths = [
  "chain_depth_bundle",
  "playwright-report",
  "test-results",
  ".runtime-logs",
  "coverage",
  "dist",
  "tmp",
  "chains_page.tsx",
  "MetricLineChart.tsx",
  "src/app/landing_page_v2.tsx",
  "src/app/track-record/track_record_page.tsx",
  "src/lib/chains/pageExplanations #U2013 Kopi.tsx",
];

const found = forbiddenPaths.filter((rel) => fs.existsSync(path.join(root, rel)));

if (found.length > 0) {
  console.error("Repo hygiene check failed. Remove these paths before launch:");
  for (const rel of found) console.error(` - ${rel}`);
  process.exit(1);
}

console.log("Repo hygiene check passed.");
"""

FILES["scripts/route-docs-sync-check.mjs"] = r"""
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function mustExist(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing required file: ${rel}`);
  }
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const requiredPages = [
  "src/app/page.tsx",
  "src/app/chains/[chain]/page.tsx",
  "src/app/chains/[chain]/history/page.tsx",
  "src/app/glossary/page.tsx",
  "src/app/api-docs/page.tsx",
  "src/app/thresholds/page.tsx",
  "src/app/track-record/page.tsx",
  "src/app/status/page.tsx",
  "src/app/about/page.tsx",
  "src/app/terms/page.tsx",
  "src/app/privacy/page.tsx",
  "src/app/dashboard/page.tsx",
];

for (const rel of requiredPages) mustExist(rel);

const requiredApiRoutes = [
  "src/app/api/v1/status/route.ts",
  "src/app/api/v1/landing/route.ts",
  "src/app/api/v1/glossary/route.ts",
  "src/app/api/v1/units/route.ts",
  "src/app/api/v1/methodology/versions/route.ts",
  "src/app/api/v1/thresholds/defaults/route.ts",
];

for (const rel of requiredApiRoutes) mustExist(rel);

const docs = read("src/app/api-docs/page.tsx");
const mustMention = [
  "/api/v1/status",
  "/api/v1/landing",
  "/api/v1/glossary",
  "/api/v1/units",
  "/api/v1/methodology/versions",
  "/api/v1/thresholds/defaults",
  "/chains/[chain]",
  "/chains/[chain]/history",
  "/glossary",
  "/track-record",
  "/thresholds",
  "/status",
  "/about",
];

const missingMentions = mustMention.filter((needle) => !docs.includes(needle));
if (missingMentions.length > 0) {
  console.error("API docs sync check failed. Missing route mentions:");
  for (const needle of missingMentions) console.error(` - ${needle}`);
  process.exit(1);
}

console.log("Route/docs sync check passed.");
"""

FILES["scripts/public-copy-guard.mjs"] = r"""
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const roots = [
  "src/app",
  "src/components",
  "src/lib/content",
  "src/lib/chains",
];

const skipIfPathIncludes = [
  `${path.sep}terms${path.sep}`,
  `${path.sep}privacy${path.sep}`,
  `${path.sep}dashboard${path.sep}`,
  ".test.",
];

const banned = [
  "bullish",
  "bearish",
  "buy now",
  "sell now",
  "price target",
  "moonshot",
  "guaranteed return",
  "will go up",
  "will go down",
  "likely to rise",
  "likely to fall",
  "not financial advice but",
  "entry point",
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|md|mdx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const offenders = [];

for (const rel of roots) {
  const dir = path.join(root, rel);
  for (const file of walk(dir)) {
    if (skipIfPathIncludes.some((needle) => file.includes(needle))) continue;
    const raw = fs.readFileSync(file, "utf8");
    const lower = raw.toLowerCase();
    for (const phrase of banned) {
      if (lower.includes(phrase)) {
        offenders.push({ file: path.relative(root, file), phrase });
      }
    }
  }
}

if (offenders.length > 0) {
  console.error("Public copy guard failed. Banned public-language phrases found:");
  for (const item of offenders) console.error(` - ${item.file} :: ${item.phrase}`);
  process.exit(1);
}

console.log("Public copy guard passed.");
"""

FILES["scripts/launch-readiness-check.mjs"] = r"""
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const mustExist = [
  "src/config/units.ts",
  "src/components/ui/StalenessBar.tsx",
  "src/components/ui/ScoreGauge.tsx",
  "src/components/RegimeBadge.tsx",
  "src/components/ExplainModal.tsx",
  "src/app/chains/loading.tsx",
  "src/app/chains/[chain]/loading.tsx",
  "src/app/glossary/loading.tsx",
  "src/app/track-record/loading.tsx",
  "src/app/status/page.tsx",
  "src/app/about/page.tsx",
  "src/app/api-docs/page.tsx",
  "src/app/track-record/page.tsx",
];

for (const rel of mustExist) {
  if (!exists(rel)) {
    console.error(`Launch-readiness check failed. Missing file: ${rel}`);
    process.exit(1);
  }
}

const scanRoots = ["src/app", "src/lib"];
const localhostHits = [];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

for (const rel of scanRoots) {
  for (const file of walk(path.join(root, rel))) {
    const raw = fs.readFileSync(file, "utf8");
    if (raw.includes("http://localhost:3000")) {
      localhostHits.push(path.relative(root, file));
    }
  }
}

if (localhostHits.length > 0) {
  console.error("Launch-readiness check failed. Hard-coded localhost references found:");
  for (const rel of localhostHits) console.error(` - ${rel}`);
  process.exit(1);
}

const about = read("src/app/about/page.tsx");
const apiDocs = read("src/app/api-docs/page.tsx");
const trackRecord = read("src/app/track-record/page.tsx");

for (const [name, raw] of [
  ["about", about],
  ["api-docs", apiDocs],
  ["track-record", trackRecord],
]) {
  if (!raw.includes("methodology_version") && !raw.includes("Methodology version")) {
    console.error(`Launch-readiness check failed. ${name} page does not appear to expose methodology version context.`);
    process.exit(1);
  }
}

console.log("Launch-readiness check passed.");
"""

FILES[".github/workflows/test.yml"] = r"""
name: test

on:
  pull_request:
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: |
          if [ -f package-lock.json ]; then
            npm ci
          else
            npm install
          fi

      - name: Repo hygiene
        run: npm run check:repo-hygiene

      - name: Route/docs sync
        run: npm run check:route-docs-sync

      - name: Launch-readiness checks
        run: npm run check:launch-readiness

      - name: Public copy guard
        run: npm run check:public-copy-guard

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Unit tests
        run: npm run test

      - name: Build
        run: npm run build
"""

FILES["docs/INTERNAL_LAUNCH_CHECKLIST.md"] = r"""
# Internal Launch Checklist (Web-Only)

This checklist is intentionally limited to code and web-surface quality.
It does not replace external validation of Stripe, Vercel, Supabase, webhooks, or production entitlement flows.

## Required green commands

```bash
npm run check:repo-hygiene
npm run check:route-docs-sync
npm run check:launch-readiness
npm run check:public-copy-guard
npm run lint
npm run typecheck
npm run test
npm run build
```

## What these checks prove

- Repo does not contain known artifact folders and accidental duplicate source files.
- Required public pages and support API routes exist.
- API docs mention the required public/support routes.
- Public copy does not drift into forecasting or advisory phrasing.
- Major public surfaces required for launch are still present.
- Hard-coded localhost self-fetch does not exist in `src/app` or `src/lib`.
- Methodology-version context still appears on core public trust surfaces.

## Still requires human verification

- Mobile/responsive behavior
- Keyboard/focus behavior in browser
- Modal behavior
- Lighthouse / real browser performance
- Production data freshness
- Billing and entitlement flows
"""

def write(rel, content):
    dest = ROOT / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(content.lstrip("\n"), encoding="utf-8")

for rel, content in FILES.items():
    write(rel, content)

pkg_path = ROOT / "package.json"
if not pkg_path.exists():
    raise SystemExit(f"package.json not found: {pkg_path}")

pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
scripts = pkg.setdefault("scripts", {})
scripts["check:repo-hygiene"] = "node scripts/repo-hygiene-check.mjs"
scripts["check:route-docs-sync"] = "node scripts/route-docs-sync-check.mjs"
scripts["check:launch-readiness"] = "node scripts/launch-readiness-check.mjs"
scripts["check:public-copy-guard"] = "node scripts/public-copy-guard.mjs"
scripts["qa:internal-launch"] = (
    "npm run check:repo-hygiene && "
    "npm run check:route-docs-sync && "
    "npm run check:launch-readiness && "
    "npm run check:public-copy-guard && "
    "npm run lint && "
    "npm run typecheck && "
    "npm run test && "
    "npm run build"
)

pkg_path.write_text(json.dumps(pkg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

print("Applied internal quality hardening patch.")
print(f"Root: {ROOT}")
print("Created/updated:")
for rel in [
    "package.json",
    "scripts/repo-hygiene-check.mjs",
    "scripts/route-docs-sync-check.mjs",
    "scripts/launch-readiness-check.mjs",
    "scripts/public-copy-guard.mjs",
    ".github/workflows/test.yml",
    "docs/INTERNAL_LAUNCH_CHECKLIST.md",
]:
    print(f" - {rel}")
