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

    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }

  return out;
}

function isTestFile(rel) {
  return (
    /\.(test|spec)\.(ts|tsx)$/.test(rel) ||
    rel.includes(`${path.sep}__tests__${path.sep}`)
  );
}

const localhostAllowlist = new Set([
  path.normalize("src/app/api-docs/page.tsx"),
  path.normalize("src/app/dashboard/page.tsx"),
]);

for (const rel of scanRoots) {
  for (const file of walk(path.join(root, rel))) {
    const relative = path.normalize(path.relative(root, file));

    if (isTestFile(relative)) continue;
    if (localhostAllowlist.has(relative)) continue;

    const raw = fs.readFileSync(file, "utf8");

    if (raw.includes("http://localhost:3000")) {
      localhostHits.push(relative);
    }
  }
}

if (localhostHits.length > 0) {
  console.error(
    "Launch-readiness check failed. Hard-coded localhost references found:"
  );
  for (const rel of localhostHits) {
    console.error(` - ${rel}`);
  }
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
  if (
    !raw.includes("methodology_version") &&
    !raw.includes("Methodology version")
  ) {
    console.error(
      `Launch-readiness check failed. ${name} page does not appear to expose methodology version context.`
    );
    process.exit(1);
  }
}

console.log("Launch-readiness check passed.");