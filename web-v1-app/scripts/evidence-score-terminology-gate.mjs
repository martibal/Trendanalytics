// Protect the public Evidence score naming/semantics contract without requiring
// customer copy to contain arbitrary literal marker phrases.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];

function read(relativePath) {
  const target = path.join(root, relativePath);
  if (!fs.existsSync(target)) {
    errors.push(`${relativePath}: missing`);
    return "";
  }
  return fs.readFileSync(target, "utf8");
}

const homePath = "src/components/home/InteractiveHomeDashboard.tsx";
const home = read(homePath);
if (home) {
  if (!/evidence score/iu.test(home)) errors.push(`${homePath}: missing Evidence score terminology`);
  if (!/uncalibrated/iu.test(home)) errors.push(`${homePath}: missing uncalibrated semantics`);
  if (!/not\s+(?:a|the)?\s*probability/iu.test(home)) errors.push(`${homePath}: missing non-probability interpretation`);
}

for (const relativePath of [
  "src/app/api/v1/landing/route.ts",
  "src/app/api/v1/summary/[chain]/route.ts",
]) {
  const content = read(relativePath);
  if (!content) continue;
  for (const marker of ["evidence_score", "probability_interpretation: false", "legacyConfidenceBand"]) {
    if (!content.includes(marker)) errors.push(`${relativePath}: missing marker ${marker}`);
  }
}

if (errors.length > 0) {
  console.error("Evidence-score terminology gate failed:");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("Evidence-score terminology gate passed.");
