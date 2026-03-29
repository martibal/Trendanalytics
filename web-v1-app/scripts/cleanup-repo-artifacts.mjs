import { rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const targets = [
  ".runtime-logs",
  "playwright-report",
  "test-results",
  "tsconfig.tsbuildinfo",
  "MetricLineChart.tsx",
  "chains_page.tsx",
];

for (const target of targets) {
  const full = path.join(root, target);
  try {
    rmSync(full, { recursive: true, force: true });
    console.log(`Removed ${target}`);
  } catch (error) {
    console.error(`Failed to remove ${target}:`, error);
    process.exitCode = 1;
  }
}
