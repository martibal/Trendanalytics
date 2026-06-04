#!/usr/bin/env node
/*START FILE*/
import { spawnSync } from "node:child_process";
import process from "node:process";

const args = new Set(process.argv.slice(2));
const skipBuild = args.has("--skip-build");

const steps = [
  {
    name: "Product boundary audit",
    command: "npm",
    args: ["run", "check:public-copy-guard"],
  },
  {
    name: "Calculation correctness audit",
    command: "npm",
    args: ["run", "check:calculation-correctness"],
  },
  {
    name: "Publication integrity audit",
    command: "npm",
    args: ["run", "check:publication-integrity"],
  },
  {
    name: "API contract audit",
    command: "npm",
    args: ["run", "check:api-contract"],
  },
  ...(skipBuild
    ? []
    : [
        {
          name: "Production build",
          command: "npm",
          args: ["run", "build"],
        },
      ]),
];

function nowIso() {
  return new Date().toISOString();
}

console.log("");
console.log("=== Audit gate runner ===");
console.log(`Started at UTC: ${nowIso()}`);
console.log(`Build step: ${skipBuild ? "skipped" : "included"}`);
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
    console.error("Do not commit or push until this gate is green.");
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