import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const offenders = [
  ".runtime-logs",
  "playwright-report",
  "test-results",
  "tsconfig.tsbuildinfo",
  "MetricLineChart.tsx",
  "chains_page.tsx",
];

const present = offenders.filter((entry) => existsSync(path.join(root, entry)));

if (present.length > 0) {
  console.error("Repository hygiene check failed. Remove committed generated or duplicate files:");
  for (const entry of present) console.error(` - ${entry}`);
  process.exit(1);
}

console.log("Repository hygiene check passed.");
