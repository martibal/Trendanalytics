/*START FILE*/
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const roots = [
  "src/app",
  "src/components",
  "src/lib/content",
  "src/lib/chains",
];

const skipIfPathIncludes = [
  `${path.sep}terms${path.sep}`,
  `${path.sep}privacy${path.sep}`,
  ".test.",
  ".spec.",
];

const banned = [
  "bullish",
  "bearish",
  "buy now",
  "sell now",
  "price target",
  "moonshot",
  "guaranteed return",
  "will go up",
  "will go down",
  "likely to rise",
  "likely to fall",
  "entry point",
];

const allowedByPath = new Map([
  [
    path.normalize("src/app/methodology/page.tsx"),
    new Set([
      "price target",
      "bullish",
      "bearish",
      "buy now",
      "sell now",
      "entry point",
    ]),
  ],
  [
    path.normalize("src/app/sign-in/[[...sign-in]]/page.tsx"),
    new Set([
      "price target",
      "bullish",
      "bearish",
      "buy now",
      "sell now",
      "entry point",
    ]),
  ],
]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx|md|mdx)$/.test(entry.name)) {
      out.push(full);
    }
  }

  return out;
}

const offenders = [];

for (const rel of roots) {
  const dir = path.join(root, rel);

  for (const file of walk(dir)) {
    const relative = path.normalize(path.relative(root, file));

    if (skipIfPathIncludes.some((needle) => relative.includes(needle))) {
      continue;
    }

    const raw = fs.readFileSync(file, "utf8");
    const lower = raw.toLowerCase();
    const allowed = allowedByPath.get(relative) ?? new Set();

    for (const phrase of banned) {
      if (allowed.has(phrase)) continue;

      if (lower.includes(phrase)) {
        offenders.push({ file: relative, phrase });
      }
    }
  }
}

if (offenders.length > 0) {
  console.error("Public copy guard failed. Banned public-language phrases found:");
  for (const item of offenders) {
    console.error(` - ${item.file} :: ${item.phrase}`);
  }
  process.exit(1);
}

console.log("Public copy guard passed.");
/*END FILE*/