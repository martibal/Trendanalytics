#!/usr/bin/env node
/*START FILE*/
import { spawnSync } from "node:child_process";
import process from "node:process";

const args = new Set(process.argv.slice(2));
const skipBuild = args.has("--skip-build");
const isDailyPublish = process.env.GITHUB_WORKFLOW === "Daily Pipeline Publish";

const auditSteps = [
  {
    name: "Product boundary audit",
    command: "npm",
    args: ["run", "check:public-copy-guard"],
  },
  {
    name: "API contract audit",
    command: "npm",
    args: ["run", "check:api-contract"],
  },
  {
    name: "Field Dictionary sync",
    command: "npm",
    args: ["run", "check:field-dictionary-sync"],
  },
  {
    name: "Calculation correctness audit",
    command: "npm",
    args: ["run", "check:calculation-correctness"],
  },
  {
    name: "Published JSON schema contract",
    command: "npm",
    args: ["run", "check:published-json-schemas"],
  },
  {
    name: "Published atomicity / replay gate",
    command: "npm",
    args: ["run", "check:published-atomicity"],
  },
  {
    name: "Source failure handling gate",
    command: "npm",
    args: ["run", "check:source-failure-handling"],
  },
  {
    name: "Timeout / retry policy gate",
    command: "npm",
    args: ["run", "check:timeout-retry-policy"],
  },
  {
    name: "Native pipeline command",
    command: "npm",
    args: ["run", "check:native-pipeline"],
  },
  {
    name: "Pipeline environment parity inventory",
    command: "npm",
    args: ["run", "check:pipeline-environment-parity"],
  },
  {
    name: "Native unit publication sanity",
    command: "python",
    args: ["../pipeline/tools/validate_native_units.py", "--published-root", "../data/published/v1"],
  },
  {
    name: "Publication integrity audit",
    command: "npm",
    args: ["run", "check:publication-integrity"],
  },
];

const dailyExcludedNames = new Set([
  "Product boundary audit",
  "API contract audit",
  "Field Dictionary sync",
]);

const steps = isDailyPublish
  ? auditSteps.filter((step) => !dailyExcludedNames.has(step.name))
  : [
      ...auditSteps,
      ...(skipBuild ? [] : [{ name: "Production build", command: "npm", args: ["run", "build"] }]),
    ];

function nowIso() {
  return new Date().toISOString();
}

console.log("");
console.log("=== Audit gate runner ===");
console.log(`Started at UTC: ${nowIso()}`);
console.log(`Mode: ${isDailyPublish ? "daily publication critical-path" : "full repository audit"}`);
if (isDailyPublish) {
  console.log("Build step: skipped (daily publication critical-path)");
  console.log("Web/API inventory checks remain CI concerns and cannot block a valid data publication.");
} else {
  console.log(`Build step: ${skipBuild ? "skipped" : "included"}`);
}
console.log("");

const startedAt = Date.now();

for (const [index, step] of steps.entries()) {
  const label = `${index + 1}/${steps.length} ${step.name}`;
  console.log("");
  console.log(`>>> ${label}`);
  console.log(`>>> ${step.command} ${step.args.join(" ")}`);
  console.log("");

  const result = spawnSync(step.command, step.args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    console.error("");
    console.error(`Audit gate runner failed during: ${step.name}`);
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error("");
    console.error(`Audit gate runner stopped at red gate: ${step.name}`);
    console.error(`Exit code: ${result.status}`);
    console.error("");
    console.error(
      isDailyPublish
        ? "Published-data push remains blocked until this publication-critical gate is green."
        : "Do not commit or push until this gate is green.",
    );
    process.exit(result.status ?? 1);
  }

  console.log("");
  console.log(`<<< PASS: ${step.name}`);
}

const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log("");
console.log("=== Audit gate runner passed ===");
console.log(`Finished at UTC: ${nowIso()}`);
console.log(`Elapsed: ${elapsedSeconds}s`);
console.log("");
/*END FILE*/
