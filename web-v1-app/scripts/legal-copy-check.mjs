import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = [
  "src/app/terms/page.tsx",
  "src/app/privacy/page.tsx",
];

const banned = [
  /draft legal structure/i,
  /draft privacy structure/i,
  /replace with final approved legal text before launch/i,
  /must approve the final/i,
  /before launch as part of the final legal\/privacy review/i,
  /final legal content remains a Product Owner \/ legal deliverable before launch/i,
  /final legal wording remains a Product Owner \/ legal deliverable before launch/i,
];

let failed = false;
for (const file of files) {
  const full = path.join(root, file);
  const text = readFileSync(full, "utf8");
  for (const pattern of banned) {
    if (pattern.test(text)) {
      console.error(`Legal copy check failed in ${file}: ${pattern}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log("Legal copy check passed.");
