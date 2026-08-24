// This file is intentionally small: it protects the public naming contract for REQ-04.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [
  ["src/components/home/InteractiveHomeDashboard.tsx", ["evidence score", "Evidence ", "probability calibration"]],
  ["src/app/api/v1/landing/route.ts", ["evidence_score", "probability_interpretation: false", "legacyConfidenceBand"]],
  ["src/app/api/v1/summary/[chain]/route.ts", ["evidence_score", "probability_interpretation: false", "legacyConfidenceBand"]],
];

const errors = [];
for (const [relativePath, markers] of checks) {
  const target = path.join(root, relativePath);
  if (!fs.existsSync(target)) {
    errors.push(`${relativePath}: missing`);
    continue;
  }
  const content = fs.readFileSync(target, "utf8");
  for (const marker of markers) {
    if (!content.includes(marker)) errors.push(`${relativePath}: missing marker ${marker}`);
  }
}

if (errors.length > 0) {
  console.error("Evidence-score terminology gate failed:");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("Evidence-score terminology gate passed.");
