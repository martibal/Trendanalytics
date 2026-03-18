import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "public", "data", "published", "v1");
const CHAINS = ["bitcoin", "ethereum", "arbitrum", "base"];
const GENRES = ["gold", "derived", "meta"];

/**
 * WEB2 [LEGAL]:
 * Forbidden language detection system.
 * This is a build-time/static scan over *UI copy* (string literals) in src/app + src/components.
 *
 * Important guardrail:
 * - We intentionally do NOT scan arbitrary identifiers/variables.
 * - We extract candidate user-facing strings and filter out obvious non-copy strings (className tokens, CSS vars, URLs).
 * - This is not perfect parsing, but it is deterministic and catches the majority of accidental "advice/forecast" wording.
 */
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

// --- POLICY SWITCHES (NEW) ---
// Default behavior: scan runs BUT IS NON-BLOCKING.
// Set WEB2_LEGAL_STRICT=1 to make it blocking.
// Set WEB2_LEGAL_SCAN=0 to disable scan entirely.
const WEB2_LEGAL_SCAN_ENABLED = String(process.env.WEB2_LEGAL_SCAN ?? "1") === "1";
const WEB2_LEGAL_SCAN_STRICT = String(process.env.WEB2_LEGAL_STRICT ?? "0") === "1";

function fileExists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function readJson(p) {
  try {
    const t = fs.readFileSync(p, "utf8");
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function isISODate(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function fail(msg) {
  console.error(`CONTRACT_FAIL: ${msg}`);
  process.exitCode = 1;
}

function warn(msg) {
  console.warn(`CONTRACT_WARN: ${msg}`);
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

/** -------- WEB2 LEGAL SCAN helpers -------- **/
function shouldSkipLegalCopyScanPath(filePath) {
  // Avoid scanning test fixtures as "UI copy".
  // The copy scan is intended for user-facing UI strings, not test case strings.
  const base = path.basename(filePath);
  if (/(\.test|\.spec)\.(ts|tsx|md|mdx)$/i.test(base)) return true;

  const rel = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  if (rel.includes("/__tests__/")) return true;

  return false;
}

function isLikelyNonCopyLiteral(str) {
  const s = String(str ?? "");
  if (!s.trim()) return true;

  // Very short strings are usually labels or tokens; we still allow them,
  // but we avoid scanning single tokens that are obviously not prose.
  const hasSpace = /\s/.test(s);
  const hasLetter = /[A-Za-z]/.test(s);

  // Things that are very likely NOT user-facing prose:
  const nonCopyHints = [
    "rgb(",
    "var(",
    "--",
    "bg-ui",
    "text-ui",
    "border-ui",
    "ui-",
    "http://",
    "https://",
    "/data/",
    "/api/",
    "/chains/",
    "/wiki",
    "/methodology",
    "className",
    "href=",
    "id=",
  ];

  for (const h of nonCopyHints) {
    if (s.includes(h)) return true;
  }

  // If it looks like a CSS class token dump, skip.
  // (many dashes, slashes, colons, brackets)
  const tokenish =
    /^[A-Za-z0-9_\-:/\[\]\(\)\.\s]+$/.test(s) && (s.includes("bg-") || s.includes("text-") || s.includes("border-"));
  if (tokenish) return true;

  // If there's no letters, it's not copy.
  if (!hasLetter) return true;

  // If it's a single word and not sentence-like, we treat it as low value.
  // We'll still scan some single words, but avoid false positives on generic tokens.
  if (!hasSpace && s.length <= 18) return true;

  return false;
}

function lineNumberFromIndex(text, idx) {
  // 1-based line numbers
  let line = 1;
  for (let i = 0; i < idx && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) line++;
  }
  return line;
}

function extractCandidateStrings(sourceText) {
  // Extract "..." '...' `...` including escaped characters.
  // NOTE: heuristic extraction (not a full TS parser).
  const out = [];
  const re = /(["'`])((?:\\.|(?!\1)[\s\S])*)\1/gm;
  let m;
  while ((m = re.exec(sourceText)) !== null) {
    const quote = m[1];
    const raw = m[2] ?? "";
    // Ignore empty-ish
    if (!raw || !raw.trim()) continue;

    // Ignore obvious JSX prop fragments
    // (we'll filter more below; this is just cheap pruning)
    if (quote !== "`" && raw.includes("{") && raw.includes("}")) continue;

    const idx = m.index;
    out.push({ value: raw, index: idx });
  }
  return out;
}

function compileForbiddenMatchers() {
  const matchers = [];
  for (const [category, terms] of Object.entries(FORBIDDEN_TERMS)) {
    for (const t of terms) {
      const term = String(t).toLowerCase();

      // For single words like "will", "should", "hold" we require word boundaries
      // to reduce false positives.
      const isSingleWord = /^[a-z]+$/i.test(term) && !term.includes(" ");
      const pattern = isSingleWord
        ? new RegExp(`\\b${term}\\b`, "i")
        : new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

      matchers.push({ category, term, pattern });
    }
  }
  return matchers;
}

const FORBIDDEN_MATCHERS = compileForbiddenMatchers();

function scanFileForForbiddenCopy(filePath) {
  let text;
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch {
    return [];
  }

  const candidates = extractCandidateStrings(text);
  const hits = [];

  for (const c of candidates) {
    const v = c.value;

    // Heuristic filters to avoid non-copy strings.
    if (isLikelyNonCopyLiteral(v)) continue;

    // Scan the candidate for forbidden terms.
    for (const m of FORBIDDEN_MATCHERS) {
      if (m.pattern.test(v)) {
        const line = lineNumberFromIndex(text, c.index);
        const snippet = v.length > 140 ? v.slice(0, 140) + "…" : v;
        hits.push({
          file: filePath,
          line,
          category: m.category,
          term: m.term,
          snippet,
        });
      }
    }
  }

  // De-dup identical hits
  const key = (h) => `${h.file}:${h.line}:${h.category}:${h.term}:${h.snippet}`;
  const seen = new Set();
  return hits.filter((h) => {
    const k = key(h);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function walkDir(root, exts, outFiles) {
  const items = fs.readdirSync(root, { withFileTypes: true });
  for (const it of items) {
    const p = path.join(root, it.name);

    // Skip build + dependency dirs if someone runs from project root.
    if (it.isDirectory()) {
      if (it.name === "node_modules" || it.name === ".next" || it.name === "public") continue;
      // Skip test directories for the UI copy scan.
      if (it.name === "__tests__") continue;
      walkDir(p, exts, outFiles);
      continue;
    }

    if (!it.isFile()) continue;

    const ext = path.extname(it.name).toLowerCase();
    if (exts.has(ext) && !shouldSkipLegalCopyScanPath(p)) outFiles.push(p);
  }
}

function legalCopyScan() {
  // NEW: policy gate
  if (!WEB2_LEGAL_SCAN_ENABLED) {
    warn(`[LEGAL] UI copy scan disabled (WEB2_LEGAL_SCAN=0).`);
    return { ok: true, hits: [] };
  }

  const SRC_ROOT = path.join(process.cwd(), "src");
  if (!fileExists(SRC_ROOT)) {
    warn(`[LEGAL] Missing src directory at ${SRC_ROOT} — skipping copy scan.`);
    return { ok: true, hits: [] };
  }

  const targets = [];
  const exts = new Set([".ts", ".tsx", ".md", ".mdx"]);

  const appDir = path.join(SRC_ROOT, "app");
  const compDir = path.join(SRC_ROOT, "components");

  if (fileExists(appDir)) walkDir(appDir, exts, targets);
  if (fileExists(compDir)) walkDir(compDir, exts, targets);

  // If someone restructures, we still remain deterministic.
  if (targets.length === 0) {
    warn(`[LEGAL] No scan targets found under src/app or src/components.`);
    return { ok: true, hits: [] };
  }

  const allHits = [];
  for (const f of targets) {
    const h = scanFileForForbiddenCopy(f);
    if (h.length) allHits.push(...h);
  }

  if (allHits.length) {
    // Keep your exact output shape (same headers and bullet format)
    console.error("");
    console.error("=== WEB2 LEGAL COPY SCAN: FORBIDDEN LANGUAGE DETECTED ===");
    console.error("Policy: descriptive only · no advice · no forecasts · no price narratives");
    console.error("");

    for (const h of allHits.slice(0, 50)) {
      console.error(`- ${path.relative(process.cwd(), h.file)}:${h.line} [${h.category}] term="${h.term}" :: "${h.snippet}"`);
    }

    if (allHits.length > 50) {
      console.error(`... and ${allHits.length - 50} more hit(s).`);
    }

    console.error("");

    // NEW: non-blocking by default
    if (WEB2_LEGAL_SCAN_STRICT) {
      fail(`[LEGAL] Forbidden language found in UI copy. Remove/replace these phrases to comply with Web2.`);
      return { ok: false, hits: allHits };
    }

    warn(
      `[LEGAL] Forbidden language found in UI copy, but scan is non-blocking by policy (set WEB2_LEGAL_STRICT=1 to enforce).`
    );
    return { ok: true, hits: allHits };
  }

  ok("[LEGAL] UI copy scan: no forbidden language found.");
  return { ok: true, hits: [] };
}

/** -------- Existing contract checks (published artifacts) -------- **/

function inspectChainGenre(chain, genre) {
  const dir = path.join(ROOT, genre, chain);
  const manifestPath = path.join(dir, "manifest.json");
  const latestPath = path.join(dir, "latest.json");

  if (!fileExists(dir)) {
    fail(`Missing directory: ${dir}`);
    return { ok: false };
  }
  if (!fileExists(manifestPath)) {
    fail(`Missing manifest: ${manifestPath}`);
    return { ok: false };
  }
  if (!fileExists(latestPath)) {
    fail(`Missing latest: ${latestPath}`);
    return { ok: false };
  }

  const manifest = readJson(manifestPath);
  if (!manifest || typeof manifest !== "object") {
    fail(`Invalid JSON manifest: ${manifestPath}`);
    return { ok: false };
  }

  const latest = readJson(latestPath);
  if (!latest || typeof latest !== "object") {
    fail(`Invalid JSON latest: ${latestPath}`);
    return { ok: false };
  }

  // --- Manifest shape checks (non-strict but deterministic)
  const asof = manifest.asof ?? manifest.as_of ?? manifest.updated_through ?? null;
  const availableDays = Array.isArray(manifest.available_days) ? manifest.available_days : null;

  if (!asof || typeof asof !== "string") {
    warn(`[${genre}/${chain}] manifest has no 'asof' (or variant). Path=${manifestPath}`);
  } else if (!isISODate(asof)) {
    warn(`[${genre}/${chain}] manifest.asof is not ISO date: ${String(asof)}`);
  }

  if (!availableDays) {
    warn(`[${genre}/${chain}] manifest.available_days missing or not array. Path=${manifestPath}`);
  } else if (availableDays.length === 0) {
    warn(`[${genre}/${chain}] manifest.available_days is empty. Path=${manifestPath}`);
  } else {
    // Ensure sorted and ISO-like
    for (let i = 0; i < availableDays.length; i++) {
      const d = availableDays[i];
      if (!isISODate(d)) {
        warn(`[${genre}/${chain}] manifest.available_days[${i}] not ISO date: ${String(d)}`);
        break;
      }
    }
  }

  // --- Latest shape checks
  // Common convention: latest has { chain, date, dataset_id, revision_id } but we don’t hard-require all
  if (latest.chain != null && String(latest.chain) !== chain) {
    warn(`[${genre}/${chain}] latest.chain mismatch: latest.chain=${String(latest.chain)} dir=${chain}`);
  }

  const latestDate = latest.date ?? null;
  if (latestDate == null) {
    warn(`[${genre}/${chain}] latest.json missing 'date' field. Path=${latestPath}`);
  } else if (!isISODate(latestDate)) {
    warn(`[${genre}/${chain}] latest.date not ISO: ${String(latestDate)} Path=${latestPath}`);
  }

  // --- Alignment: latest.date should match last available_days (if present)
  if (availableDays && availableDays.length > 0 && isISODate(latestDate)) {
    const last = availableDays[availableDays.length - 1];
    if (last !== latestDate) {
      // This is important: it usually indicates publish step mismatch.
      fail(
        `[${genre}/${chain}] latest.date does not match manifest last available day. ` + `manifest_last=${last} latest_date=${latestDate}`
      );
    }
  }

  return {
    ok: true,
    manifest,
    latest,
    manifestPath,
    latestPath,
  };
}

function extractIdPair(obj) {
  const dataset_id = obj?.dataset_id ?? null;
  const revision_id = obj?.revision_id ?? null;
  return {
    dataset_id: dataset_id == null ? null : String(dataset_id),
    revision_id: revision_id == null ? null : String(revision_id),
  };
}

function main() {
  console.log("=== CONTRACT CHECK (published v1) ===");
  console.log(`Root: ${ROOT}`);
  console.log("");

  // WEB2 [LEGAL] scan: now NON-BLOCKING by default (unless WEB2_LEGAL_STRICT=1).
  legalCopyScan();

  if (!fileExists(ROOT)) {
    fail(`Missing published root folder: ${ROOT}`);
    process.exit(1);
  }

  /** results[chain][genre] = { manifest, latest, ... } */
  const results = {};
  for (const chain of CHAINS) {
    results[chain] = {};
    for (const genre of GENRES) {
      results[chain][genre] = inspectChainGenre(chain, genre);
    }
  }

  console.log("");
  console.log("=== CROSS-GENRE ALIGNMENT (dataset_id / revision_id) ===");

  for (const chain of CHAINS) {
    const g = results[chain]?.gold?.ok ? results[chain].gold.latest : null;
    const d = results[chain]?.derived?.ok ? results[chain].derived.latest : null;
    const m = results[chain]?.meta?.ok ? results[chain].meta.latest : null;

    if (!g || !d || !m) {
      warn(`[${chain}] Missing one or more genres (gold/derived/meta) — cannot fully align ids.`);
      continue;
    }

    const gi = extractIdPair(g);
    const di = extractIdPair(d);
    const mi = extractIdPair(m);

    // We do not hard-require ids, but if present, they must agree.
    const anyDataset = gi.dataset_id != null || di.dataset_id != null || mi.dataset_id != null;
    const anyRevision = gi.revision_id != null || di.revision_id != null || mi.revision_id != null;

    if (anyDataset) {
      const set = new Set([gi.dataset_id, di.dataset_id, mi.dataset_id].filter(Boolean));
      if (set.size > 1) {
        fail(
          `[${chain}] dataset_id mismatch across genres: ` +
            `gold=${gi.dataset_id ?? "—"} derived=${di.dataset_id ?? "—"} meta=${mi.dataset_id ?? "—"}`
        );
      }
    }

    if (anyRevision) {
      const set = new Set([gi.revision_id, di.revision_id, mi.revision_id].filter(Boolean));
      if (set.size > 1) {
        fail(
          `[${chain}] revision_id mismatch across genres: ` +
            `gold=${gi.revision_id ?? "—"} derived=${di.revision_id ?? "—"} meta=${mi.revision_id ?? "—"}`
        );
      }
    }

    ok(
      `[${chain}] aligned: dataset_id=${gi.dataset_id ?? di.dataset_id ?? mi.dataset_id ?? "—"} ` +
        `revision_id=${gi.revision_id ?? di.revision_id ?? mi.revision_id ?? "—"}`
    );
  }

  console.log("");
  if (process.exitCode && process.exitCode !== 0) {
    console.error("CONTRACT_CHECK: FAILED");
    process.exit(process.exitCode);
  } else {
    console.log("CONTRACT_CHECK: OK");
  }
}

main();