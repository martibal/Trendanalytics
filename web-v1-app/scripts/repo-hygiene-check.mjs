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
