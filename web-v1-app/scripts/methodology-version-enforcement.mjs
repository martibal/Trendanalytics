import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const WEB_ROOT = path.resolve(process.cwd());
const REPO_ROOT = path.resolve(WEB_ROOT, "..");

const MANIFEST_REL = "pipeline/methodology-version.json";
const GOLDEN_FIXTURE_REL = "web-v1-app/scripts/pipeline-golden-fixture.mjs";
const REPORT_REL = "web-v1-app/.audit/methodology-version/methodology-version-enforcement.md";

function repoPath(relativePath) {
  return path.join(REPO_ROOT, ...relativePath.split("/"));
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(repoPath(relativePath), "utf-8"));
}

function runGit(args, { allowFailure = false } = {}) {
  const result = spawnSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    stdio: "pipe",
  });

  if (result.status !== 0 && !allowFailure) {
    throw new Error(
      [
        `git ${args.join(" ")} failed with status ${result.status}`,
        "--- stdout ---",
        result.stdout || "",
        "--- stderr ---",
        result.stderr || "",
      ].join("\n"),
    );
  }

  return result;
}

function changedFilesAgainstBase() {
  const baseRef = process.env.GITHUB_BASE_REF || "main";

  runGit(["fetch", "--no-tags", "--depth=50", "origin", baseRef], { allowFailure: true });

  const ranges = [`origin/${baseRef}...HEAD`, `${baseRef}...HEAD`];

  for (const range of ranges) {
    const result = runGit(["diff", "--name-only", "--diff-filter=ACMRT", range], { allowFailure: true });
    if (result.status === 0) {
      return result.stdout
        .split(/\r?\n/u)
        .map((line) => normalizePath(line.trim()))
        .filter(Boolean);
    }
  }

  return [];
}

function matchesPattern(filePath, pattern) {
  const normalizedFile = normalizePath(filePath);
  const normalizedPattern = normalizePath(pattern);

  if (normalizedPattern.endsWith("/**")) {
    const prefix = normalizedPattern.slice(0, -3);
    return normalizedFile === prefix || normalizedFile.startsWith(`${prefix}/`);
  }

  if (normalizedPattern.endsWith("/*")) {
    const prefix = normalizedPattern.slice(0, -2);
    if (!normalizedFile.startsWith(`${prefix}/`)) {
      return false;
    }
    return !normalizedFile.slice(prefix.length + 1).includes("/");
  }

  return normalizedFile === normalizedPattern;
}

function unique(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function extractExpectedGoldenDigest() {
  const content = fs.readFileSync(repoPath(GOLDEN_FIXTURE_REL), "utf-8");
  const match = content.match(/const\s+EXPECTED_GOLDEN_FIXTURE_DIGEST\s*=\s*"([a-f0-9]{64})";/u);
  return match ? match[1] : null;
}

function writeReport({ manifest, changedFiles, outputAffectingChanges, acknowledgementChanges, errors }) {
  const reportPath = repoPath(REPORT_REL);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });

  fs.writeFileSync(
    reportPath,
    [
      "# Methodology version enforcement",
      "",
      `Methodology version: ${manifest.methodology_version}`,
      `Golden fixture digest: ${manifest.golden_fixture_digest}`,
      "",
      "## Changed files",
      ...(changedFiles.length ? changedFiles.map((file) => `- ${file}`) : ["None"]),
      "",
      "## Output-affecting changes",
      ...(outputAffectingChanges.length ? outputAffectingChanges.map((file) => `- ${file}`) : ["None"]),
      "",
      "## Acknowledgement changes",
      ...(acknowledgementChanges.length ? acknowledgementChanges.map((file) => `- ${file}`) : ["None"]),
      "",
      "## Result",
      errors.length ? "FAIL" : "PASS",
      "",
      ...errors.map((error) => `- ${error}`),
      "",
    ].join("\n"),
    "utf-8",
  );
}

const errors = [];
const manifest = readJson(MANIFEST_REL);

if (!manifest.methodology_version || !/^\d+\.\d+(?:\.\d+)?$/u.test(manifest.methodology_version)) {
  errors.push("methodology_version must be present and semver-like, for example 1.1 or 1.1.0.");
}

if (!manifest.golden_fixture_digest || !/^[a-f0-9]{64}$/u.test(manifest.golden_fixture_digest)) {
  errors.push("golden_fixture_digest must be a lowercase sha256 digest.");
}

const expectedDigest = extractExpectedGoldenDigest();
if (!expectedDigest) {
  errors.push(`Could not find EXPECTED_GOLDEN_FIXTURE_DIGEST in ${GOLDEN_FIXTURE_REL}.`);
} else if (expectedDigest !== manifest.golden_fixture_digest) {
  errors.push(
    `Golden fixture digest mismatch: manifest has ${manifest.golden_fixture_digest}, fixture has ${expectedDigest}.`,
  );
}

const changedFiles = unique(changedFilesAgainstBase());
const outputPatterns = Array.isArray(manifest.output_affecting_paths) ? manifest.output_affecting_paths : [];
const acknowledgementPatterns = Array.isArray(manifest.policy?.acknowledgement_paths)
  ? manifest.policy.acknowledgement_paths
  : [MANIFEST_REL, GOLDEN_FIXTURE_REL];

const outputAffectingChanges = changedFiles.filter((file) =>
  outputPatterns.some((pattern) => matchesPattern(file, pattern)),
);

const acknowledgementChanges = changedFiles.filter((file) =>
  acknowledgementPatterns.some((pattern) => matchesPattern(file, pattern)),
);

if (outputAffectingChanges.length > 0 && acknowledgementChanges.length === 0) {
  errors.push(
    [
      "Output-affecting calculation files changed without a methodology/version acknowledgement.",
      "Update pipeline/methodology-version.json or update the golden fixture expected output/digest.",
    ].join(" "),
  );
}

writeReport({ manifest, changedFiles, outputAffectingChanges, acknowledgementChanges, errors });

if (errors.length > 0) {
  console.error("Methodology version enforcement failed.");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  console.error(`Report: ${REPORT_REL}`);
  process.exit(1);
}

console.log("Methodology version enforcement passed.");
console.log(`Changed files: ${changedFiles.length}`);
console.log(`Output-affecting changes: ${outputAffectingChanges.length}`);
console.log(`Acknowledgement changes: ${acknowledgementChanges.length}`);
console.log(`Report: ${REPORT_REL}`);
