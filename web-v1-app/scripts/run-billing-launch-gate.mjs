#!/usr/bin/env node
/*START FILE*/
import { spawnSync } from "node:child_process";
import process from "node:process";

const steps = [
  {
    name: "Prisma schema validation",
    command: "npx",
    args: ["prisma", "validate"],
  },
  {
    name: "Prisma Client generation",
    command: "npx",
    args: ["prisma", "generate"],
  },
  {
    name: "Audit gates and production build",
    command: "npm",
    args: ["run", "check:audit-gates"],
  },
];

function nowIso() {
  return new Date().toISOString();
}

console.log("");
console.log("=== Billing launch gate ===");
console.log(`Started at UTC: ${nowIso()}`);
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
    console.error(`Billing launch gate failed during: ${step.name}`);
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error("");
    console.error(`Billing launch gate stopped at red gate: ${step.name}`);
    console.error(`Exit code: ${result.status}`);
    console.error("");
    console.error("Do not commit, push, or enable live checkout traffic until this gate is green.");
    process.exit(result.status ?? 1);
  }

  console.log("");
  console.log(`<<< PASS: ${step.name}`);
}

const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);

console.log("");
console.log("=== Billing launch gate passed ===");
console.log(`Finished at UTC: ${nowIso()}`);
console.log(`Elapsed: ${elapsedSeconds}s`);
console.log("");
/*END FILE*/
