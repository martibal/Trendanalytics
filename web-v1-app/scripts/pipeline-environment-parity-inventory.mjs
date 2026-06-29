#!/usr/bin/env node
/*START FILE*/
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const WEB_ROOT = process.cwd();
const REPO_ROOT = path.resolve(WEB_ROOT, "..");
const PIPELINE_ROOT = path.join(REPO_ROOT, "pipeline");
const REPORT_PATH = path.join(WEB_ROOT, ".audit", "pipeline-environment-parity", "pipeline-environment-parity-inventory.md");

const REQUIRED_FILES = [
  "pipeline/tools/full_pipeline.ps1",
  "pipeline/tools/sync_web_data.ps1",
];

const NATIVE_PARITY_CANDIDATES = [
  "pipeline/tools/full_pipeline.py",
  "pipeline/tools/run_pipeline.py",
  "pipeline/tools/full_pipeline.sh",
  "pipeline/tools/run_pipeline.sh",
  "pipeline/README.md",
];

const WINDOWS_ONLY_PATTERNS = [
  {
    id: "powershell-entrypoint",
    pattern: /(^|\n)\s*param\s*\(/m,
    description: "PowerShell param block",
  },
  {
    id: "powershell-strict-mode",
    pattern: /Set-StrictMode\b/,
    description: "PowerShell strict-mode dependency",
  },
  {
    id: "powershell-last-exit-code",
    pattern: /\$LASTEXITCODE\b/,
    description: "PowerShell LASTEXITCODE process-status handling",
  },
  {
    id: "powershell-join-path",
    pattern: /\bJoin-Path\b/,
    description: "PowerShell path construction",
  },
  {
    id: "windows-path-literal",
    pattern: /['"][^'"]*\\[^'"]*['"]/,
    description: "Windows-style path separator literal",
  },
  {
    id: "robocopy",
    pattern: /\brobocopy\b/i,
    description: "Windows robocopy dependency",
  },
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf-8");
}

function relativePath(filePath) {
  return path.relative(REPO_ROOT, filePath).replaceAll(path.sep, "/");
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function listFiles(rootDir, predicate) {
  const out = [];

  function walk(dirPath) {
    if (!fs.existsSync(dirPath)) {
      return;
    }

    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "__pycache__" || entry.name === ".pytest_cache") {
          continue;
        }
        walk(fullPath);
        continue;
      }

      if (entry.isFile() && predicate(fullPath)) {
        out.push(fullPath);
      }
    }
  }

  walk(rootDir);
  return out.sort((a, b) => relativePath(a).localeCompare(relativePath(b)));
}

function collectPatternHits(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const hits = [];

  for (const item of WINDOWS_ONLY_PATTERNS) {
    if (item.pattern.test(content)) {
      hits.push(item);
    }
  }

  return hits;
}

function readPackageScriptNames() {
  const packageJsonPath = path.join(WEB_ROOT, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  return Object.keys(packageJson.scripts || {}).sort();
}

function writeReport({ ps1Files, candidateFiles, hitsByFile, scripts }) {
  const lines = [
    "# Pipeline environment parity inventory",
    "",
    "## Result",
    "",
    "Status: PASS",
    "",
    "This is an inventory gate. It intentionally makes the current platform-coupling visible without claiming Linux-native orchestration is complete.",
    "",
    "## Required pipeline entrypoints",
    "",
  ];

  for (const required of REQUIRED_FILES) {
    lines.push(`- ${required}: ${fs.existsSync(path.join(REPO_ROOT, required)) ? "present" : "missing"}`);
  }

  lines.push("");
  lines.push("## Native parity candidates");
  lines.push("");

  if (candidateFiles.length === 0) {
    lines.push("- None found yet.");
  } else {
    for (const candidate of candidateFiles) {
      lines.push(`- ${relativePath(candidate)}`);
    }
  }

  lines.push("");
  lines.push("## PowerShell files under pipeline/");
  lines.push("");

  if (ps1Files.length === 0) {
    lines.push("- None found.");
  } else {
    for (const filePath of ps1Files) {
      lines.push(`- ${relativePath(filePath)}`);
    }
  }

  lines.push("");
  lines.push("## Windows / PowerShell coupling");
  lines.push("");

  for (const filePath of ps1Files) {
    const rel = relativePath(filePath);
    const hits = hitsByFile.get(filePath) || [];
    lines.push(`### ${rel}`);
    lines.push("");

    if (hits.length === 0) {
      lines.push("- No configured coupling patterns matched.");
    } else {
      for (const hit of hits) {
        lines.push(`- ${hit.id}: ${hit.description}`);
      }
    }

    lines.push("");
  }

  lines.push("## Required next slices");
  lines.push("");
  lines.push("- Add a Linux-native or Python pipeline entrypoint that can run the same orchestration contract as `pipeline/tools/full_pipeline.ps1`.");
  lines.push("- Replace or bypass `sync_web_data.ps1` / `robocopy` with a cross-platform mirror operation.");
  lines.push("- Add CI coverage for the native entrypoint before removing this inventory-only classification.");
  lines.push("");
  lines.push("## Related package scripts");
  lines.push("");
  lines.push(`- check:pipeline-environment-parity: ${scripts.includes("check:pipeline-environment-parity") ? "present" : "missing"}`);
  lines.push("");

  writeFile(REPORT_PATH, `${lines.join("\n")}\n`);
}

for (const required of REQUIRED_FILES) {
  assertCondition(fs.existsSync(path.join(REPO_ROOT, required)), `Missing required inventory target: ${required}`);
}

const ps1Files = listFiles(PIPELINE_ROOT, (filePath) => filePath.toLowerCase().endsWith(".ps1"));
const candidateFiles = NATIVE_PARITY_CANDIDATES
  .map((candidate) => path.join(REPO_ROOT, candidate))
  .filter((candidate) => fs.existsSync(candidate));

const hitsByFile = new Map();
for (const filePath of ps1Files) {
  hitsByFile.set(filePath, collectPatternHits(filePath));
}

const scripts = readPackageScriptNames();

assertCondition(ps1Files.length > 0, "Pipeline parity inventory must see at least one PowerShell pipeline file");
assertCondition(
  hitsByFile.get(path.join(REPO_ROOT, "pipeline/tools/full_pipeline.ps1"))?.length > 0,
  "full_pipeline.ps1 must remain classified until a native entrypoint replaces it",
);
assertCondition(
  hitsByFile.get(path.join(REPO_ROOT, "pipeline/tools/sync_web_data.ps1"))?.some((hit) => hit.id === "robocopy"),
  "sync_web_data.ps1 robocopy dependency must remain visible until replaced",
);

writeReport({ ps1Files, candidateFiles, hitsByFile, scripts });

console.log("Pipeline environment parity inventory gate passed.");
console.log(`PowerShell pipeline files: ${ps1Files.length}`);
console.log(`Native parity candidates: ${candidateFiles.length}`);
console.log(`Report: ${path.relative(WEB_ROOT, REPORT_PATH)}`);
/*END FILE*/
