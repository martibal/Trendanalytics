#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(webRoot, "..");
const reportDir = path.join(webRoot, ".audit", "pipeline-determinism");
const reportPath = path.join(reportDir, "pipeline-determinism-inventory.md");

const calculationCriticalPaths = [
  "pipeline/src/build_gold_timeseries.py",
  "pipeline/src/build_gold_weekly.py",
  "pipeline/src/feature_daily_agg.py",
  "pipeline/tools/export_derived_json_history.py",
  "pipeline/tools/export_meta_json.py",
  "pipeline/tools/export_meta_json_history.py",
];

const publicationBoundaryPaths = [
  "pipeline/tools/publish_artifacts.py",
  "pipeline/tools/regenerate_json_safe.py",
  "pipeline/tools/rebuild_windows_from_dayfiles.py",
  "pipeline/tools/sync_gold_json_history.py",
  "pipeline/tools/probe_source_freshness.py",
  "pipeline/tools/validate_meta_methodology_safety.py",
  "pipeline/tools/validate_published_dataset.py",
];

const hardFailPatterns = [
  { id: "datetime.now", regex: /\b(?:datetime|dt)\.datetime\.now\s*\(/ },
  { id: "datetime.utcnow", regex: /\b(?:datetime|dt)\.datetime\.utcnow\s*\(/ },
  { id: "date.today", regex: /\b(?:datetime|dt)\.date\.today\s*\(/ },
  { id: "time.time", regex: /\btime\.time\s*\(/ },
  { id: "random", regex: /\b(?:random\.random|random\.randint|random\.choice|random\.shuffle|random\.sample|np\.random)\s*\(/ },
  { id: "uuid", regex: /\buuid\.(?:uuid1|uuid4)\s*\(/ },
];

const reviewPatterns = [
  { id: "sort_values", regex: /\.sort_values\s*\(/ },
  { id: "sorted", regex: /\bsorted\s*\(/ },
  { id: "in_place_sort", regex: /\.sort\s*\(/ },
  { id: "methodology_version", regex: /\bmethodology_version\b|\bMETHODOLOGY_VERSION\b/i },
  { id: "revision_id", regex: /\brevision_id\b/i },
  { id: "dataset_id", regex: /\bdataset_id\b/i },
];

function toRepoPath(absolutePath) {
  return path.relative(repoRoot, absolutePath).replaceAll(path.sep, "/");
}

function readFile(repoPath) {
  const absolutePath = path.join(repoRoot, repoPath);
  if (!fs.existsSync(absolutePath)) {
    return { repoPath, absolutePath, exists: false, content: "", sha256: null };
  }

  const content = fs.readFileSync(absolutePath, "utf8");
  const sha256 = crypto.createHash("sha256").update(content).digest("hex");
  return { repoPath, absolutePath, exists: true, content, sha256 };
}

function scanLines(file, patterns) {
  const matches = [];
  const lines = file.content.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const pattern of patterns) {
      if (pattern.regex.test(line)) {
        matches.push({
          pattern: pattern.id,
          lineNumber: index + 1,
          line: line.trim(),
        });
      }
    }
  });

  return matches;
}

function formatMatches(matches) {
  if (matches.length === 0) {
    return "None";
  }

  return matches
    .map((match) => `- line ${match.lineNumber}: ${match.pattern} -> \`${match.line.replaceAll("`", "\\`")}\``)
    .join("\n");
}

const criticalFiles = calculationCriticalPaths.map(readFile);
const boundaryFiles = publicationBoundaryPaths.map(readFile);
const allFiles = [...criticalFiles, ...boundaryFiles];

const missingFiles = allFiles.filter((file) => !file.exists);
const hardFailures = [];
const reviewFindings = [];

for (const file of criticalFiles) {
  if (!file.exists) {
    continue;
  }

  const blockingMatches = scanLines(file, hardFailPatterns);
  const reviewMatches = scanLines(file, reviewPatterns);

  if (blockingMatches.length > 0) {
    hardFailures.push({ file, matches: blockingMatches });
  }

  reviewFindings.push({ file, matches: reviewMatches });
}

fs.mkdirSync(reportDir, { recursive: true });

const report = [
  "# Pipeline determinism inventory",
  "",
  `Generated at UTC: ${new Date().toISOString()}`,
  "",
  "## Scope",
  "",
  "This inventory is the first guardrail for P4.1 determinism work. It does not yet prove full bit-for-bit reproducibility. It records the calculation-critical files that must be covered by the later golden-fixture pipeline test, and it fails on hidden runtime-time or random sources in that calculation path.",
  "",
  "## Calculation-critical files",
  "",
  ...criticalFiles.map((file) => `- \`${file.repoPath}\` - ${file.exists ? `sha256 \`${file.sha256}\`` : "MISSING"}`),
  "",
  "## Publication-boundary files tracked for later fixture coverage",
  "",
  ...boundaryFiles.map((file) => `- \`${file.repoPath}\` - ${file.exists ? `sha256 \`${file.sha256}\`` : "MISSING"}`),
  "",
  "## Hard-fail nondeterminism patterns",
  "",
  hardFailures.length === 0
    ? "No hard-fail nondeterminism patterns were found in calculation-critical files."
    : hardFailures
        .map((finding) => `### ${finding.file.repoPath}\n\n${formatMatches(finding.matches)}`)
        .join("\n\n"),
  "",
  "## Review-only determinism signals",
  "",
  ...reviewFindings.flatMap((finding) => [
    `### ${finding.file.repoPath}`,
    "",
    formatMatches(finding.matches),
    "",
  ]),
  "## Result",
  "",
  missingFiles.length === 0 && hardFailures.length === 0
    ? "PASS: all inventory files exist, and no hard-fail nondeterminism patterns were found in calculation-critical files."
    : "FAIL: missing files or hard-fail nondeterminism patterns require review.",
  "",
].join("\n");

fs.writeFileSync(reportPath, report, "utf8");

console.log("Pipeline determinism inventory completed.");
console.log(`Report: ${toRepoPath(reportPath)}`);
console.log(`Calculation-critical files: ${criticalFiles.length}`);
console.log(`Publication-boundary files: ${boundaryFiles.length}`);
console.log(`Missing files: ${missingFiles.length}`);
console.log(`Hard failures: ${hardFailures.reduce((sum, finding) => sum + finding.matches.length, 0)}`);

if (missingFiles.length > 0) {
  for (const file of missingFiles) {
    console.error(`Missing required determinism inventory file: ${file.repoPath}`);
  }
}

if (hardFailures.length > 0) {
  for (const finding of hardFailures) {
    console.error(`Nondeterminism candidates in ${finding.file.repoPath}:`);
    for (const match of finding.matches) {
      console.error(`  line ${match.lineNumber}: ${match.pattern}: ${match.line}`);
    }
  }
}

if (missingFiles.length > 0 || hardFailures.length > 0) {
  process.exitCode = 1;
}
