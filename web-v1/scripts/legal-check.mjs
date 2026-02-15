// File: scripts/legal-check.mjs
import fs from "fs";
import path from "path";

const DEFAULT_EXTS = new Set([".js", ".jsx", ".ts", ".tsx", ".md", ".json"]);

// Directories to skip when scanning folders
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "out",
  "coverage",
]);

// Individual files to skip (relative to repo root, POSIX style)
const SKIP_FILES = new Set([
  "scripts/legal-check.mjs",
  "src/lib/legal/forbiddenLanguage.ts",
]);

// Web2-inspired forbidden terms (strict by design).
// NOTE: We apply word-boundary heuristics for short tokens like "will"/"hold" to reduce false positives.
const FORBIDDEN_TERMS = {
  predictive: [
    "will",
    "should",
    "expect to",
    "likely to",
    "predicted",
    "forecasted",
    "anticipated",
    "projected",
    "going to",
    "about to",
    "set to",
    "poised to",
    "destined to",
  ],
  advisory: [
    "you should",
    "we recommend",
    "consider buying",
    "consider selling",
    "good time to",
    "opportunity",
    "favorable",
    "buy now",
    "sell now",
    "hold",
    "enter position",
    "exit position",
  ],
  sentiment: ["bullish", "bearish", "moon", "dump", "pump", "rekt", "fud", "fomo", "hopium"],
  causal_price: [
    "will affect price",
    "indicates price movement",
    "signals market direction",
    "suggests trend in value",
    "price will",
    "value will",
    "market will",
  ],
};

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function isSkippedFile(absPath, rootDir) {
  const rel = toPosix(path.relative(rootDir, absPath));
  return SKIP_FILES.has(rel);
}

/**
 * Strip JS/TS comments while preserving anything inside strings/templates.
 * This avoids false positives from comments like "should", "will", etc.
 */
function stripJsTsComments(code) {
  let out = "";
  let i = 0;

  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;

  while (i < code.length) {
    const ch = code[i];
    const next = i + 1 < code.length ? code[i + 1] : "";

    // Handle string/template toggles (respect escapes)
    if (!inDouble && !inTemplate && ch === "'" && !inSingle) {
      inSingle = true;
      out += ch;
      i += 1;
      continue;
    }
    if (inSingle && ch === "'" && code[i - 1] !== "\\") {
      inSingle = false;
      out += ch;
      i += 1;
      continue;
    }

    if (!inSingle && !inTemplate && ch === '"' && !inDouble) {
      inDouble = true;
      out += ch;
      i += 1;
      continue;
    }
    if (inDouble && ch === '"' && code[i - 1] !== "\\") {
      inDouble = false;
      out += ch;
      i += 1;
      continue;
    }

    if (!inSingle && !inDouble && ch === "`") {
      // Toggle template literal (ignore nested ${} parsing; good enough for comment stripping)
      inTemplate = !inTemplate;
      out += ch;
      i += 1;
      continue;
    }

    // Only strip comments when not inside strings/templates
    if (!inSingle && !inDouble && !inTemplate) {
      // Line comment //
      if (ch === "/" && next === "/") {
        // Skip until newline, but keep newline
        while (i < code.length && code[i] !== "\n") i += 1;
        if (i < code.length && code[i] === "\n") {
          out += "\n";
          i += 1;
        }
        continue;
      }

      // Block comment /* ... */
      if (ch === "/" && next === "*") {
        i += 2;
        while (i < code.length) {
          if (code[i] === "*" && i + 1 < code.length && code[i + 1] === "/") {
            i += 2;
            break;
          }
          i += 1;
        }
        continue;
      }
    }

    out += ch;
    i += 1;
  }

  return out;
}

function shouldScanFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return DEFAULT_EXTS.has(ext);
}

function walkDir(dirPath, rootDir, acc = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dirPath, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP_DIRS.has(ent.name)) walkDir(full, rootDir, acc);
    } else if (ent.isFile()) {
      if (!shouldScanFile(full)) continue;
      if (isSkippedFile(full, rootDir)) continue;
      acc.push(full);
    }
  }
  return acc;
}

function buildRegex(term) {
  // For short tokens, enforce a word boundary.
  const shortToken = term.length <= 5;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (shortToken) return new RegExp(`\\b${escaped}\\b`, "gi");
  return new RegExp(escaped, "gi");
}

function scanText(text, fileExt) {
  // Strip comments only for code-like files
  const ext = fileExt.toLowerCase();
  if (ext === ".js" || ext === ".jsx" || ext === ".ts" || ext === ".tsx") {
    return stripJsTsComments(text);
  }
  return text;
}

function findViolations(text, filePath) {
  const ext = path.extname(filePath);
  const scanned = scanText(text, ext);
  const violations = [];

  // Track line/col for matches by scanning line by line.
  const lines = scanned.split(/\r?\n/);

  for (const [category, terms] of Object.entries(FORBIDDEN_TERMS)) {
    for (const term of terms) {
      const rx = buildRegex(term);

      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        let match;
        while ((match = rx.exec(line)) !== null) {
          violations.push({
            category,
            term,
            line: lineIdx + 1,
            col: match.index + 1,
            excerpt: line.trim().slice(0, 160),
          });
        }
      }
    }
  }

  return violations;
}

function main() {
  const rootDir = process.cwd();

  // Scan only src/ by default to focus on user-visible copy + docs.
  const targets = [path.join(rootDir, "src")];

  const files = [];
  for (const t of targets) {
    if (fs.existsSync(t)) walkDir(t, rootDir, files);
  }

  const allViolations = [];

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const v = findViolations(text, file);
    if (v.length) {
      allViolations.push({ file, violations: v });
    }
  }

  console.log(`LEGAL_CHECK: scanned ${files.length} file(s).`);

  if (allViolations.length === 0) {
    console.log("LEGAL_CHECK: OK (no forbidden terms detected).");
    process.exit(0);
  }

  console.log("LEGAL COMPLIANCE VIOLATION(S) DETECTED:\n");

  for (const item of allViolations) {
    const rel = path.relative(rootDir, item.file);
    console.log(`- ${rel}`);
    for (const v of item.violations) {
      console.log(`  [CRITICAL] ${v.category}: "${v.term}" at line ${v.line}, col ${v.col}`);
    }
    console.log("");
  }

  process.exit(2);
}

main();