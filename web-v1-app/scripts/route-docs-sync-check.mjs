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
