import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const MAX_SAMPLES = 12;
const GIT_MAX_BUFFER_BYTES = 64 * 1024 * 1024;
const POLICY_FILE = "web-v1-app/scripts/repo-hygiene-check.mjs";

function findRepoRoot(startDir) {
  let current = path.resolve(startDir);

  while (true) {
    if (fs.existsSync(path.join(current, ".git"))) {
      return current;
    }

    const parent = path.dirname(current);

    if (parent === current) {
      throw new Error(`Could not find Git repository root from ${startDir}`);
    }

    current = parent;
  }
}

const repoRoot = findRepoRoot(process.cwd());
const webAppRoot = path.join(repoRoot, "web-v1-app");

function runGit(args, options = {}) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: options.encoding ?? "utf8",
    maxBuffer: options.maxBuffer ?? GIT_MAX_BUFFER_BYTES,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function readTrackedFiles() {
  const output = execFileSync("git", ["ls-files", "-z"], {
    cwd: repoRoot,
    maxBuffer: GIT_MAX_BUFFER_BYTES,
    stdio: ["ignore", "pipe", "pipe"],
  });

  return output
    .toString("utf8")
    .split("\0")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.replaceAll("\\", "/"))
    .sort((a, b) => a.localeCompare(b));
}

function gitGrepLiteral(literal) {
  try {
    const output = runGit([
      "grep",
      "-n",
      "--",
      literal,
      ".",
      ":(exclude)web-v1/**",
      ":(exclude)zippet/**",
      ":(exclude)data/**",
    ]);

    return output
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    if (typeof error?.status === "number" && error.status === 1) {
      return [];
    }

    throw error;
  }
}

function excludePolicyFile(lines) {
  return lines.filter((line) => !line.replaceAll("\\", "/").startsWith(`${POLICY_FILE}:`));
}

function countByTopLevel(files) {
  const counts = new Map();

  for (const file of files) {
    const topLevel = file.includes("/") ? file.split("/", 1)[0] : file;
    counts.set(topLevel, (counts.get(topLevel) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function takeSamples(values) {
  return values.slice(0, MAX_SAMPLES);
}

function addRuleIssue(issues, trackedFiles, rule) {
  const matches = trackedFiles.filter(rule.match);

  if (matches.length === 0) {
    return;
  }

  issues.push({
    id: rule.id,
    title: rule.title,
    count: matches.length,
    action: rule.action,
    samples: takeSamples(matches),
  });
}

function addSyntheticIssue(issues, issue) {
  if (issue.count === 0) {
    return;
  }

  issues.push({
    ...issue,
    samples: takeSamples(issue.samples),
  });
}

function printIssueGroup(label, issues) {
  if (issues.length === 0) {
    console.log(`${label}: none`);
    return;
  }

  console.log(`${label}: ${issues.length}`);

  for (const issue of issues) {
    console.log("");
    console.log(`[${issue.id}] ${issue.title}`);
    console.log(`Count: ${issue.count}`);
    console.log(`Action: ${issue.action}`);

    if (issue.samples.length > 0) {
      console.log("Samples:");
      for (const sample of issue.samples) {
        console.log(`  - ${sample}`);
      }
    }
  }
}

function printTopLevelSummary(topLevelCounts) {
  console.log("Tracked top-level entries:");
  for (const entry of topLevelCounts) {
    console.log(`  ${String(entry.count).padStart(6, " ")}  ${entry.name}`);
  }
}

const trackedFiles = readTrackedFiles();

const errors = [];
const warnings = [];

if (!fs.existsSync(webAppRoot)) {
  errors.push({
    id: "MISSING_ACTIVE_WEB_APP",
    title: "Active web app root is missing.",
    count: 1,
    action: "Restore web-v1-app or update the repo hygiene policy to the new active app root.",
    samples: ["web-v1-app"],
  });
}

const errorRules = [
  {
    id: "LEGACY_WEB_V1_TRACKED",
    title: "Legacy web-v1 tree is tracked in Git.",
    match: (file) => file === "web-v1" || file.startsWith("web-v1/"),
    action:
      "Confirm no active runtime depends on web-v1, then remove it with git rm -r web-v1 in a dedicated cleanup step.",
  },
  {
    id: "LEGACY_ZIPPET_TRACKED",
    title: "Legacy zippet tree is tracked in Git.",
    match: (file) => file === "zippet" || file.startsWith("zippet/"),
    action:
      "Confirm it is only an old extracted/copy tree, then remove it with git rm -r zippet in a dedicated cleanup step.",
  },
  {
    id: "ROOT_JUNK_ENTRY_TRACKED",
    title: "Known root junk file or directory is tracked in Git.",
    match: (file) =>
      ["pd.DataFrame", "python", "t"].includes(file) ||
      file === "reports" ||
      file.startsWith("reports/"),
    action:
      "Remove these from Git in a dedicated cleanup step. They are not source, config, docs, or reproducible product artifacts.",
  },
  {
    id: "ROOT_PACKAGE_LOCK_STUB_TRACKED",
    title: "Root package-lock.json is tracked outside the active app.",
    match: (file) => file === "package-lock.json",
    action:
      "Remove the root package-lock.json if the active Node project is web-v1-app/package.json.",
  },
];

const warningRules = [
  {
    id: "CANONICAL_DATA_TRACKED",
    title: "Canonical published data is tracked in Git.",
    match: (file) => file === "data" || file.startsWith("data/"),
    action:
      "Keep this visible for now, but resolve under the data-out-of-git checklist step before final production hardening.",
  },
  {
    id: "ROOT_ORPHAN_PAGE_TRACKED",
    title: "Orphan page-like source file is tracked at repo root.",
    match: (file) => ["api-docs-page.tsx", "getting-started-page.tsx"].includes(file),
    action:
      "Move into the active app if still needed, otherwise remove or archive outside the repo.",
  },
  {
    id: "ROOT_ARCHIVE_DOCUMENT_TRACKED",
    title: "Archive/reference document is tracked at repo root.",
    match: (file) =>
      [
        "cloud_prod_architecture_master_spec_v3.docx",
        "TrendAnalytics_Avklaringer_v1.0.docx",
        "STYRINGSDOKUMENT_BLOCKCHAIN_ANALYTICS.md",
      ].includes(file),
    action:
      "Move durable documentation under docs/ or archive one-off planning material outside the repository.",
  },
];

for (const rule of errorRules) {
  addRuleIssue(errors, trackedFiles, rule);
}

for (const rule of warningRules) {
  addRuleIssue(warnings, trackedFiles, rule);
}

const legacyWebReferenceLines = excludePolicyFile(
  gitGrepLiteral("web-v1").filter((line) => /web-v1(?!-app)/u.test(line)),
);

addSyntheticIssue(warnings, {
  id: "LEGACY_WEB_V1_REFERENCE",
  title: "Active tracked files still reference legacy web-v1.",
  count: legacyWebReferenceLines.length,
  action:
    "Review these references before deleting web-v1. Keep deliberate compatibility fallbacks only if documented.",
  samples: legacyWebReferenceLines,
});

const zippetReferenceLines = excludePolicyFile(gitGrepLiteral("zippet"));

addSyntheticIssue(warnings, {
  id: "LEGACY_ZIPPET_REFERENCE",
  title: "Active tracked files still reference zippet.",
  count: zippetReferenceLines.length,
  action:
    "Review these references before deleting zippet. There should normally be no active dependency on zippet.",
  samples: zippetReferenceLines,
});

console.log("Repo hygiene audit");
console.log("==================");
console.log(`Repo root: ${repoRoot}`);
console.log(`Active app root: ${webAppRoot}`);
console.log(`Tracked files: ${trackedFiles.length}`);
console.log("");

printTopLevelSummary(countByTopLevel(trackedFiles));
console.log("");

printIssueGroup("Errors", errors);
console.log("");
printIssueGroup("Warnings", warnings);
console.log("");

if (errors.length > 0) {
  console.error(
    `Repo hygiene check failed with ${errors.length} error group(s). Resolve these before treating repo hygiene as complete.`,
  );
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn(
    `Repo hygiene check passed with ${warnings.length} warning group(s). These should be resolved before final hardening is complete.`,
  );
  process.exit(0);
}

console.log("Repo hygiene check passed with no warnings.");