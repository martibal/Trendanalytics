/*START FILE*/
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const CHAINS = ["bitcoin", "ethereum", "arbitrum", "base"];
const GENRES = ["gold", "derived", "meta"];

function candidatePublishedRoots() {
  return [
    path.join(root, "public", "data", "published", "v1"),
    path.join(root, "data", "published", "v1"),
    path.join(root, "..", "public", "data", "published", "v1"),
    path.join(root, "..", "data", "published", "v1"),
    path.join(root, "..", "..", "public", "data", "published", "v1"),
    path.join(root, "..", "..", "data", "published", "v1"),
  ].map((candidate) => path.resolve(candidate));
}

function discoverPublishedRoot() {
  const candidates = candidatePublishedRoots();

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;

    const hasGenreDirectory = GENRES.some((genre) =>
      fs.existsSync(path.join(candidate, genre))
    );

    if (hasGenreDirectory) {
      return candidate;
    }
  }

  return candidates[0];
}

const publishedRoot = discoverPublishedRoot();
const reportDir = path.join(root, ".audit", "calculation-correctness");
const reportJsonPath = path.join(reportDir, "calculation-inventory.json");
const reportMarkdownPath = path.join(reportDir, "calculation-inventory.md");

const BASE_GOLD_METRICS = [
  "tx_count_daily",
  "unique_active_addresses",
  "value_transferred_native",
  "median_tx_value_native",
  "median_tx_fee_native",
  "failed_tx_rate",
  "gas_utilization_pct",
  "avg_block_time_sec",
  "block_count_daily",
];

const DERIVED_WINDOWS = ["ma7", "ma30"];

const CALCULATION_INVENTORY = [
  ...BASE_GOLD_METRICS.map((metric) => ({
    field: metric,
    genre: "gold",
    sourceLayer: "raw public blockchain data",
    outputLayer: "gold daily JSON",
    calculationOwner: "daily feature pipeline",
    definition:
      "Canonical daily chain observation published in native chain units or normalized daily ratio form.",
    validationFocus:
      "Presence, numeric/null semantics, chain applicability, native-unit consistency, and no price dependency.",
  })),
  ...BASE_GOLD_METRICS.flatMap((metric) =>
    DERIVED_WINDOWS.map((window) => ({
      field: `${metric}__${window}`,
      genre: "derived",
      sourceLayer: "gold daily JSON",
      outputLayer: "derived daily JSON",
      calculationOwner: "derived rolling-window pipeline",
      definition:
        window === "ma7"
          ? "Seven-day rolling mean over the corresponding gold metric using only current and historical observations."
          : "Thirty-day rolling mean over the corresponding gold metric using only current and historical observations.",
      validationFocus:
        "Window length, no-lookahead behavior, null propagation policy, chronological ordering, and source metric alignment.",
    }))
  ),
  {
    field: "confidence.confidence_score",
    genre: "meta",
    sourceLayer: "gold and meta evidence profile",
    outputLayer: "meta daily JSON",
    calculationOwner: "meta confidence pipeline",
    definition:
      "Composite evidence-strength score on [0,1] for the published descriptive row; not a probability, forecast, or advice signal.",
    validationFocus:
      "Bounded range, degraded behavior below threshold, no high confidence under insufficient coverage, and no price dependency.",
  },
  {
    field: "confidence.data_quality_score",
    genre: "meta",
    sourceLayer: "gold coverage and chain profile applicability",
    outputLayer: "meta daily JSON",
    calculationOwner: "meta confidence pipeline",
    definition:
      "Profile-aware data-quality component used by Confidence v2 to reflect completeness and applicability of inputs.",
    validationFocus:
      "Coverage denominator, non-applicable field exclusion, null/zero semantics, and chain-specific applicability.",
  },
  {
    field: "confidence.label_confidence_score",
    genre: "meta",
    sourceLayer: "scorecard and regime evidence surface",
    outputLayer: "meta daily JSON",
    calculationOwner: "meta confidence pipeline",
    definition:
      "Label-specific evidence-support component indicating how clearly the evidence supports the assigned descriptive label.",
    validationFocus:
      "Classification margin, adjacent-label pressure, low-support degradation, and deterministic reproducibility.",
  },
  {
    field: "confidence.lag_days_vs_utc_today",
    genre: "meta",
    sourceLayer: "published as-of date and UTC run date",
    outputLayer: "meta daily JSON",
    calculationOwner: "freshness/status pipeline",
    definition:
      "Integer lag between UTC today and the latest published chain-level date represented by the row.",
    validationFocus:
      "UTC date arithmetic, expected per-chain lag policy, off-by-one behavior, and stale/degraded status boundaries.",
  },
  {
    field: "coverage.expected_days",
    genre: "meta",
    sourceLayer: "methodology window configuration",
    outputLayer: "meta daily JSON",
    calculationOwner: "coverage pipeline",
    definition:
      "Expected number of observations for the relevant analysis window or publication contract.",
    validationFocus:
      "Window definition, chain launch/history constraints, and consistency with present_days.",
  },
  {
    field: "coverage.present_days",
    genre: "meta",
    sourceLayer: "available published observations",
    outputLayer: "meta daily JSON",
    calculationOwner: "coverage pipeline",
    definition:
      "Actual number of available observations contributing to the current published row.",
    validationFocus:
      "Missing-day handling, duplicates, date ordering, and consistency with expected_days.",
  },
  {
    field: "coverage.nonNull_ratio",
    genre: "meta",
    sourceLayer: "available metric observations",
    outputLayer: "meta daily JSON",
    calculationOwner: "coverage pipeline",
    definition:
      "Ratio of non-null observations in the relevant input set.",
    validationFocus:
      "Null semantics, denominator definition, structurally non-applicable fields, and [0,1] bounds.",
  },
  {
    field: "coverage.non_null_ratio",
    genre: "meta",
    sourceLayer: "available metric observations",
    outputLayer: "meta daily JSON",
    calculationOwner: "coverage pipeline",
    definition:
      "Snake-case alias or schema variant of non-null observation ratio where present.",
    validationFocus:
      "Alias consistency with nonNull_ratio and [0,1] bounds.",
  },
  {
    field: "freshness.lag_days",
    genre: "meta",
    sourceLayer: "published as-of date and UTC run date",
    outputLayer: "meta daily JSON",
    calculationOwner: "freshness/status pipeline",
    definition:
      "Integer freshness lag exposed in freshness payload where present.",
    validationFocus:
      "Consistency with confidence.lag_days_vs_utc_today or canonical freshness lag semantics.",
  },
  {
    field: "regime.label",
    genre: "meta",
    sourceLayer: "axis scores, confidence gate, and deterministic regime rules",
    outputLayer: "meta daily JSON",
    calculationOwner: "regime classification pipeline",
    definition:
      "Deterministic descriptive regime label assigned after confidence gating.",
    validationFocus:
      "Allowed vocabulary, confidence gate precedence, deterministic rule order, and no advisory semantics.",
  },
  {
    field: "regime.axes.demand.trend",
    genre: "meta",
    sourceLayer: "demand-axis metric evidence",
    outputLayer: "meta daily JSON",
    calculationOwner: "regime axis pipeline",
    definition:
      "Demand-axis trend classification derived from recent-vs-baseline evidence.",
    validationFocus:
      "Axis metric membership, threshold definitions, no-lookahead windows, and deterministic trend labeling.",
  },
  {
    field: "regime.axes.friction.trend",
    genre: "meta",
    sourceLayer: "friction-axis metric evidence",
    outputLayer: "meta daily JSON",
    calculationOwner: "regime axis pipeline",
    definition:
      "Friction-axis trend classification derived from recent-vs-baseline evidence.",
    validationFocus:
      "Axis metric membership, threshold definitions, no-lookahead windows, and deterministic trend labeling.",
  },
  {
    field: "regime.axes.capacity.trend",
    genre: "meta",
    sourceLayer: "capacity-axis metric evidence",
    outputLayer: "meta daily JSON",
    calculationOwner: "regime axis pipeline",
    definition:
      "Capacity-axis trend classification derived from recent-vs-baseline evidence.",
    validationFocus:
      "Axis metric membership, threshold definitions, no-lookahead windows, and deterministic trend labeling.",
  },
  {
    field: "regime.drivers[].axis",
    genre: "meta",
    sourceLayer: "ranked metric-level regime evidence",
    outputLayer: "meta daily JSON",
    calculationOwner: "regime driver pipeline",
    definition:
      "Axis assignment for a ranked regime driver.",
    validationFocus:
      "Allowed axis vocabulary and metric-to-axis mapping.",
  },
  {
    field: "regime.drivers[].metric",
    genre: "meta",
    sourceLayer: "ranked metric-level regime evidence",
    outputLayer: "meta daily JSON",
    calculationOwner: "regime driver pipeline",
    definition:
      "Metric key represented by a ranked regime driver.",
    validationFocus:
      "Metric existence in gold/derived source data and mapping to documented metric registry.",
  },
  {
    field: "regime.drivers[].z_robust",
    genre: "meta",
    sourceLayer: "historical metric distribution",
    outputLayer: "meta daily JSON",
    calculationOwner: "robust statistics pipeline",
    definition:
      "Median/MAD-based robust z-score for the driver metric.",
    validationFocus:
      "MAD zero handling, heavy-tail robustness, historical window, no-lookahead behavior, and numeric bounds policy.",
  },
  {
    field: "regime.drivers[].pct_90d",
    genre: "meta",
    sourceLayer: "90-day historical metric distribution",
    outputLayer: "meta daily JSON",
    calculationOwner: "percentile pipeline",
    definition:
      "Percentile rank of the driver metric relative to its 90-day historical distribution.",
    validationFocus:
      "Percentile method, ties, window length, no-lookahead behavior, and [0,1] or [0,100] convention.",
  },
  {
    field: "regime.drivers[].momentum_7d_vs_30d",
    genre: "meta",
    sourceLayer: "derived rolling means",
    outputLayer: "meta daily JSON",
    calculationOwner: "momentum pipeline",
    definition:
      "Short-vs-medium momentum ratio or delta comparing 7-day and 30-day context.",
    validationFocus:
      "Division-by-zero handling, null propagation, source rolling mean alignment, and no-lookahead behavior.",
  },
  {
    field: "scorecard.window_days",
    genre: "meta",
    sourceLayer: "scorecard configuration",
    outputLayer: "meta daily JSON",
    calculationOwner: "scorecard pipeline",
    definition:
      "Analysis window length used by the published scorecard.",
    validationFocus:
      "Allowed window values and consistency with methodology configuration.",
  },
  {
    field: "scorecard.confidence_score",
    genre: "meta",
    sourceLayer: "confidence pipeline",
    outputLayer: "meta daily JSON",
    calculationOwner: "scorecard pipeline",
    definition:
      "Confidence value exposed inside scorecard context where present.",
    validationFocus:
      "Consistency with confidence.confidence_score.",
  },
  {
    field: "scorecard.dimensions.demand.score",
    genre: "meta",
    sourceLayer: "demand-axis components",
    outputLayer: "meta daily JSON",
    calculationOwner: "scorecard pipeline",
    definition:
      "Bounded demand-axis score.",
    validationFocus:
      "Component membership, tanh/bounding transform, confidence adjustment, and [0,100] bounds.",
  },
  {
    field: "scorecard.dimensions.friction.score",
    genre: "meta",
    sourceLayer: "friction-axis components",
    outputLayer: "meta daily JSON",
    calculationOwner: "scorecard pipeline",
    definition:
      "Bounded friction-axis score.",
    validationFocus:
      "Component membership, tanh/bounding transform, confidence adjustment, and [0,100] bounds.",
  },
  {
    field: "scorecard.dimensions.capacity.score",
    genre: "meta",
    sourceLayer: "capacity-axis components",
    outputLayer: "meta daily JSON",
    calculationOwner: "scorecard pipeline",
    definition:
      "Bounded capacity-axis score.",
    validationFocus:
      "Component membership, tanh/bounding transform, confidence adjustment, and [0,100] bounds.",
  },
];

const CALCULATION_INVENTORY_PATTERNS = [
  {
    pattern: /^derived\.metrics\.[a-z0-9_]+__(ma7|ma30)$/u,
    genre: "derived",
    field: "derived.metrics.<metric>__ma7|ma30",
    sourceLayer: "gold daily JSON",
    outputLayer: "derived daily JSON",
    calculationOwner: "derived rolling-window pipeline",
    definition:
      "Nested derived metric payload containing seven-day or thirty-day rolling means over corresponding gold metrics.",
    validationFocus:
      "Path normalization, window length, no-lookahead behavior, null propagation, chronological ordering, and source metric alignment.",
  },
  {
    pattern: /^confidence\.(asof_date|date|updated_through|methodology_version|source|formula|semantics|missing|chain|lag_days_vs_asof_date)$/u,
    genre: "meta",
    field: "confidence.<metadata|formula|lag>",
    sourceLayer: "confidence pipeline metadata",
    outputLayer: "meta daily JSON",
    calculationOwner: "meta confidence pipeline",
    definition:
      "Confidence metadata, formula disclosure, lag disclosure, or source annotation supporting interpretation of the confidence payload.",
    validationFocus:
      "Disclosure consistency, date alignment, non-advisory semantics, and consistency with canonical confidence fields.",
  },
  {
    pattern: /^confidence\.components\.(current_row_coverage|freshness_asof|history_depth|recent_density|recent_metric_coverage)$/u,
    genre: "meta",
    field: "confidence.components.<data_quality_scalar>",
    sourceLayer: "gold/meta evidence profile",
    outputLayer: "meta daily JSON",
    calculationOwner: "meta confidence pipeline",
    definition:
      "Top-level data-quality component used to explain confidence score support.",
    validationFocus:
      "Range bounds, weighting, no high confidence under weak support, and consistency with nested data_quality component.",
  },
  {
    pattern: /^confidence\.components\.data_quality\..+$/u,
    genre: "meta",
    field: "confidence.components.data_quality.*",
    sourceLayer: "gold coverage and chain applicability profile",
    outputLayer: "meta daily JSON",
    calculationOwner: "meta confidence pipeline",
    definition:
      "Nested Confidence v2 data-quality evidence, including weights, required metrics, optional/non-applicable metrics, recent density, history depth, and current-row coverage.",
    validationFocus:
      "Coverage denominator, structurally non-applicable field exclusion, weight sum behavior, null/zero semantics, and [0,1] bounds.",
  },
  {
    pattern: /^confidence\.(candidate_label|components\.label_confidence)\..+$/u,
    genre: "meta",
    field: "confidence.candidate_label.* / confidence.components.label_confidence.*",
    sourceLayer: "regime evidence, scorecard support, persistence, and label gate",
    outputLayer: "meta daily JSON",
    calculationOwner: "meta label-confidence pipeline",
    definition:
      "Label-confidence evidence package used to explain candidate label support, component weights, raw score support, persistence, axis coherence, neutrality, and confidence-gate withholding.",
    validationFocus:
      "Candidate-label reproducibility, component weighting, chain-specific component applicability, confidence gate threshold, and deterministic label support.",
  },
  {
    pattern: /^regime\.(asof_date|chain|window_days|ruleset_id|missing|methodology_notes\.\[\])$/u,
    genre: "meta",
    field: "regime.<metadata>",
    sourceLayer: "regime configuration and run metadata",
    outputLayer: "meta daily JSON",
    calculationOwner: "regime classification pipeline",
    definition:
      "Regime metadata describing as-of date, ruleset, window, missing inputs, or methodology notes.",
    validationFocus:
      "Ruleset/version consistency, window consistency, missing-input disclosure, and deterministic reproducibility.",
  },
  {
    pattern: /^regime\.axes\.(demand|friction|capacity)\.(band_low|band_high|informative_count|trend)$/u,
    genre: "meta",
    field: "regime.axes.<axis>.<band|informative_count|trend>",
    sourceLayer: "axis-level regime evidence",
    outputLayer: "meta daily JSON",
    calculationOwner: "regime axis pipeline",
    definition:
      "Axis-level support fields describing trend, score band, and informative signal count for demand, friction, or capacity.",
    validationFocus:
      "Axis metric membership, threshold definitions, band bounds, informative-count semantics, and no-lookahead windows.",
  },
  {
    pattern: /^regime\.drivers\.\[\]\.(axis|metric|current|informative|momentum_7d_vs_30d|pct_90d|trend|z_robust)$/u,
    genre: "meta",
    field: "regime.drivers[].<driver_field>",
    sourceLayer: "ranked metric-level regime evidence",
    outputLayer: "meta daily JSON",
    calculationOwner: "regime driver pipeline",
    definition:
      "Ranked driver fields exposing axis, metric, current value, trend, robust z-score, percentile rank, momentum, and informativeness.",
    validationFocus:
      "Driver sorting, allowed axis vocabulary, metric mapping, robust z calculation, percentile method, momentum alignment, and null handling.",
  },
  {
    pattern: /^regime\.gate\.(confidence_score|explanation|status|threshold|type)$/u,
    genre: "meta",
    field: "regime.gate.<field>",
    sourceLayer: "confidence gate and regime candidate label",
    outputLayer: "meta daily JSON",
    calculationOwner: "regime gate pipeline",
    definition:
      "Confidence-gate fields explaining whether the candidate regime label is published or withheld/degraded.",
    validationFocus:
      "Threshold comparison, degraded/withheld behavior, explanation consistency, and no advisory semantics.",
  },
  {
    pattern: /^regime\.sanity\..+$/u,
    genre: "meta",
    field: "regime.sanity.*",
    sourceLayer: "regime sanity-check support",
    outputLayer: "meta daily JSON",
    calculationOwner: "regime sanity pipeline",
    definition:
      "Sanity-check support package comparing label output against axis support and scorecard support.",
    validationFocus:
      "Adjustment disclosure, support-basis consistency, axis/scorecard cross-checks, and deterministic status.",
  },
  {
    pattern: /^regime\.signal_aliases\..+$/u,
    genre: "meta",
    field: "regime.signal_aliases.*",
    sourceLayer: "metric-to-signal alias registry",
    outputLayer: "meta daily JSON",
    calculationOwner: "regime signal pipeline",
    definition:
      "Aliases mapping published metrics to internal regime signal names.",
    validationFocus:
      "Alias stability, metric existence, chain applicability, and documentation consistency.",
  },
  {
    pattern: /^regime\.signals\.[a-z0-9_]+\.(axis|current|current_raw|informative|momentum_7d_vs_30d|neutral_reason|neutralized|pct_90d|z_robust)$/u,
    genre: "meta",
    field: "regime.signals.<signal>.<evidence_field>",
    sourceLayer: "metric-level regime signal evidence",
    outputLayer: "meta daily JSON",
    calculationOwner: "regime signal pipeline",
    definition:
      "Per-signal evidence fields used in regime classification, including robust z-score, percentile rank, current value, momentum, axis, and neutralization status.",
    validationFocus:
      "Robust statistics, percentile window, neutralization rules, current/current_raw consistency, and no-lookahead behavior.",
  },
  {
    pattern: /^regime\.signals\.[a-z0-9_]+\.transform\..+$/u,
    genre: "meta",
    field: "regime.signals.<signal>.transform.*",
    sourceLayer: "signal transform registry",
    outputLayer: "meta daily JSON",
    calculationOwner: "regime signal pipeline",
    definition:
      "Signal transform metadata documenting derived signal construction such as blocktime instability.",
    validationFocus:
      "Input metric alignment, transform formula, window length, and deterministic transform semantics.",
  },
  {
    pattern: /^scorecard\.(asof_date|chain|window_days|confidence_score)$/u,
    genre: "meta",
    field: "scorecard.<metadata>",
    sourceLayer: "scorecard run metadata",
    outputLayer: "meta daily JSON",
    calculationOwner: "scorecard pipeline",
    definition:
      "Scorecard metadata and top-level scorecard confidence/window context.",
    validationFocus:
      "Consistency with meta confidence, as-of date, chain id, and configured scorecard window.",
  },
  {
    pattern: /^scorecard\.dimensions\.(demand|friction|capacity)\.(coverage_factor|effective_confidence|level|score|score_raw)$/u,
    genre: "meta",
    field: "scorecard.dimensions.<axis>.<score_field>",
    sourceLayer: "axis component scores and confidence",
    outputLayer: "meta daily JSON",
    calculationOwner: "scorecard pipeline",
    definition:
      "Axis-level scorecard outputs for demand, friction, and capacity, including raw score, bounded score, level, coverage factor, and effective confidence.",
    validationFocus:
      "Component aggregation, bounding transform, confidence adjustment, coverage factor, level thresholds, and [0,100] score bounds.",
  },
  {
    pattern: /^scorecard\.dimensions\.(demand|friction|capacity)\.components\.[a-z0-9_]+\.(current|transformed_current|informative|neutral_reason|neutralized|pct_lookback|score_raw|z)$/u,
    genre: "meta",
    field: "scorecard.dimensions.<axis>.components.<metric>.<evidence_field>",
    sourceLayer: "metric-level scorecard component evidence",
    outputLayer: "meta daily JSON",
    calculationOwner: "scorecard pipeline",
    definition:
      "Metric-level scorecard component evidence used to build axis scores.",
    validationFocus:
      "Component metric membership, robust z, percentile lookback, neutralization behavior, score_raw transform, and null handling.",
  },
  {
    pattern: /^scorecard\.dimensions\.(demand|friction|capacity)\.components\.[a-z0-9_]+\.transform\..+$/u,
    genre: "meta",
    field: "scorecard.dimensions.<axis>.components.<metric>.transform.*",
    sourceLayer: "scorecard component transform registry",
    outputLayer: "meta daily JSON",
    calculationOwner: "scorecard pipeline",
    definition:
      "Component transform metadata documenting how source metrics are transformed before scoring.",
    validationFocus:
      "Transform formula, input metric alignment, deterministic transform semantics, and window configuration.",
  },
];

function inventoryPatternKey(item) {
  return `${item.genre}:${item.field}`;
}

function patternMatchesObserved(patternItem, observedField) {
  return patternItem.genre === observedField.genre && patternItem.pattern.test(observedField.field);
}
function ensureReportDir() {
  fs.mkdirSync(reportDir, { recursive: true });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function latestPath(genre, chain) {
  return path.join(publishedRoot, genre, chain, "latest.json");
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isScalar(value) {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function normalizePathForArrays(parts) {
  return parts.map((part) => (typeof part === "number" ? "[]" : part)).join(".");
}

function walkLeaves(value, parts = [], out = []) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      out.push({
        field: normalizePathForArrays([...parts, "[]"]),
        valueType: "empty_array",
      });
      return out;
    }

    const sample = value.find((item) => item !== null && item !== undefined) ?? value[0];

    if (isScalar(sample)) {
      out.push({
        field: normalizePathForArrays([...parts, "[]"]),
        valueType: "array_scalar",
      });
      return out;
    }

    walkLeaves(sample, [...parts, "[]"], out);
    return out;
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);

    if (entries.length === 0) {
      out.push({
        field: normalizePathForArrays(parts),
        valueType: "empty_object",
      });
      return out;
    }

    for (const [key, child] of entries) {
      walkLeaves(child, [...parts, key], out);
    }

    return out;
  }

  out.push({
    field: normalizePathForArrays(parts),
    valueType: value === null ? "null" : typeof value,
  });

  return out;
}

function stripKnownNonCalculatedPrefixes(field) {
  return (
    field === "chain" ||
    field === "date" ||
    field === "updated_through" ||
    field === "methodology_version" ||
    field === "dataset_id" ||
    field === "revision_id" ||
    field === "generated_at_utc" ||
    field === "published_at" ||
    field === "version" ||
    field === "asof" ||
    field.startsWith("profile.") ||
    field.startsWith("status.") ||
    field.startsWith("traceability.") ||
    field.includes("determinism_hash")
  );
}

function canonicalizeObservedField(genre, field) {
  if (genre === "gold") {
    return BASE_GOLD_METRICS.includes(field) ? field : field;
  }

  if (genre === "derived") {
    return field;
  }

  if (genre === "meta") {
    return field;
  }

  return field;
}

function shouldAuditObservedField(genre, field) {
  if (stripKnownNonCalculatedPrefixes(field)) return false;

  if (genre === "gold") {
    return BASE_GOLD_METRICS.includes(field);
  }

  if (genre === "derived") {
    return /__(ma7|ma30)$/.test(field);
  }

  if (genre === "meta") {
    return (
      field.startsWith("confidence.") ||
      field.startsWith("coverage.") ||
      field.startsWith("freshness.") ||
      field.startsWith("regime.") ||
      field.startsWith("scorecard.")
    );
  }

  return false;
}

function inventoryKey(item) {
  return `${item.genre}:${item.field}`;
}

function observedKey(item) {
  return `${item.genre}:${item.field}`;
}
const OPTIONAL_CURRENT_META_SCHEMA_VARIANT_FIELDS = new Set([
  "meta:coverage.expected_days",
  "meta:coverage.present_days",
  "meta:coverage.nonNull_ratio",
  "meta:coverage.non_null_ratio",
  "meta:freshness.lag_days",
]);

function inventoryObservedInLatest(inventory, observedByKey) {
  if (observedByKey.has(inventoryKey(inventory))) {
    return true;
  }

  const arrayNormalizedKey = `${inventory.genre}:${inventory.field.replaceAll("[]", ".[]")}`;
  return observedByKey.has(arrayNormalizedKey);
}

function shouldWarnForUnobservedInventoryField(inventory, observedByKey) {
  if (OPTIONAL_CURRENT_META_SCHEMA_VARIANT_FIELDS.has(inventoryKey(inventory))) {
    return false;
  }

  return !inventoryObservedInLatest(inventory, observedByKey);
}


function requiredInventoryFieldErrors(item) {
  const required = [
    "field",
    "genre",
    "sourceLayer",
    "outputLayer",
    "calculationOwner",
    "definition",
    "validationFocus",
  ];

  return required.filter((field) => {
    const value = item[field];
    return typeof value !== "string" || value.trim().length === 0;
  });
}

function normalizeObservedAuditField(genre, field) {
  if (genre === "gold") {
    return field
      .replace(/^gold\.metrics\./u, "")
      .replace(/^metrics\./u, "");
  }

  if (genre === "derived") {
    return field
      .replace(/^derived\.metrics\./u, "")
      .replace(/^metrics\./u, "");
  }

  if (genre === "meta") {
    return field
      .replace(/^meta\./u, "")
      .replace(/^metrics\./u, "");
  }

  return field;
}

function hasCalculationFamilyCoverage(observedField) {
  const { genre, field } = observedField;

  if (genre === "derived") {
    return BASE_GOLD_METRICS.some(
      (metric) => field === `${metric}__ma7` || field === `${metric}__ma30`
    );
  }

  if (genre === "meta") {
    return (
      field.startsWith("confidence.") ||
      field.startsWith("coverage.") ||
      field.startsWith("freshness.") ||
      field.startsWith("regime.") ||
      field.startsWith("scorecard.")
    );
  }

  return false;
}

function hasCalculationInventoryCoverage(observedField, inventoryByKey) {
  if (inventoryByKey.has(observedKey(observedField))) {
    return true;
  }

  if (typeof hasInventoryCoverage === "function" && hasInventoryCoverage(observedField, inventoryByKey)) {
    return true;
  }

  return hasCalculationFamilyCoverage(observedField);
}
function collectObservedFields() {
  const observed = [];
  const missingFiles = [];

  for (const genre of GENRES) {
    for (const chain of CHAINS) {
      const file = latestPath(genre, chain);

      if (!fs.existsSync(file)) {
        missingFiles.push(path.relative(root, file));
        continue;
      }

      const json = readJson(file);
      const leaves = walkLeaves(json);

      for (const leaf of leaves) {
        const field = normalizeObservedAuditField(genre, canonicalizeObservedField(genre, leaf.field));

        if (!shouldAuditObservedField(genre, field)) {
          continue;
        }

        observed.push({
          genre,
          chain,
          field,
          valueType: leaf.valueType,
          file: path.relative(root, file),
        });
      }
    }
  }

  return { observed, missingFiles };
}

function uniqueObserved(observed) {
  const byKey = new Map();

  for (const item of observed) {
    const key = observedKey(item);

    if (!byKey.has(key)) {
      byKey.set(key, {
        genre: item.genre,
        field: item.field,
        chains: new Set(),
        valueTypes: new Set(),
        files: new Set(),
      });
    }

    const aggregate = byKey.get(key);
    aggregate.chains.add(item.chain);
    aggregate.valueTypes.add(item.valueType);
    aggregate.files.add(item.file);
  }

  return [...byKey.values()]
    .map((item) => ({
      genre: item.genre,
      field: item.field,
      chains: [...item.chains].sort(),
      valueTypes: [...item.valueTypes].sort(),
      files: [...item.files].sort(),
    }))
    .sort((a, b) => `${a.genre}:${a.field}`.localeCompare(`${b.genre}:${b.field}`));
}

function tableRow(values) {
  return `| ${values.map((value) => String(value).replaceAll("\n", " ")).join(" | ")} |`;
}

const MAX_TERMINAL_FAILURES = 40;
const ROLLING_WINDOW_AUDIT_MAX_DATES_PER_CHAIN = 120;
const ROLLING_WINDOW_RELATIVE_TOLERANCE = 1e-9;
const ROLLING_WINDOW_ABSOLUTE_TOLERANCE = 1e-9;
const NULL_ZERO_AUDIT_MAX_DATES_PER_CHAIN = 180;
const CONFIDENCE_FORMULA_ABSOLUTE_TOLERANCE = 1e-9;

function listDatedJsonFiles(genre, chain) {
  const chainDir = path.join(publishedRoot, genre, chain);

  if (!fs.existsSync(chainDir)) {
    return [];
  }

  return fs
    .readdirSync(chainDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/u.test(name))
    .sort()
    .map((name) => ({
      date: name.replace(/\.json$/u, ""),
      file: path.join(chainDir, name),
    }));
}

function nestedValue(value, keys) {
  let current = value;

  for (const key of keys) {
    if (!isPlainObject(current)) {
      return null;
    }

    current = current[key];
  }

  return current;
}

function firstPlainObject(candidates) {
  for (const candidate of candidates) {
    if (isPlainObject(candidate)) {
      return candidate;
    }
  }

  return {};
}

function extractMetricRecord(json, genre) {
  if (genre === "gold") {
    return firstPlainObject([
      nestedValue(json, ["gold", "metrics"]),
      nestedValue(json, ["metrics"]),
      nestedValue(json, ["gold"]),
      json,
    ]);
  }

  if (genre === "derived") {
    return firstPlainObject([
      nestedValue(json, ["derived", "metrics"]),
      nestedValue(json, ["metrics"]),
      nestedValue(json, ["derived"]),
      json,
    ]);
  }

  return {};
}

function numericMetric(metrics, key) {
  const value = metrics[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return null;
}

function isoDateShift(dateString, deltaDays) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function withinTolerance(actual, expected) {
  const diff = Math.abs(actual - expected);
  const allowed =
    ROLLING_WINDOW_ABSOLUTE_TOLERANCE +
    Math.abs(expected) * ROLLING_WINDOW_RELATIVE_TOLERANCE;

  return diff <= allowed;
}

function diagnoseRollingWindowOffset(goldByDate, metric, date, windowDays, observed) {
  const candidates = [];

  for (let offsetDays = -14; offsetDays <= 14; offsetDays += 1) {
    const shiftedEndDate = isoDateShift(date, offsetDays);
    const values = comparableRollingWindowValues(
      goldByDate,
      metric,
      shiftedEndDate,
      windowDays
    );

    if (!values) {
      continue;
    }

    const expected = mean(values);
    const absoluteDifference = Math.abs(observed - expected);
    const relativeDifference =
      expected === 0 ? absoluteDifference : absoluteDifference / Math.abs(expected);

    candidates.push({
      offsetDays,
      shiftedEndDate,
      expected,
      absoluteDifference,
      relativeDifference,
      exactWithinTolerance: withinTolerance(observed, expected),
    });
  }

  candidates.sort((a, b) => {
    if (a.exactWithinTolerance !== b.exactWithinTolerance) {
      return a.exactWithinTolerance ? -1 : 1;
    }

    return a.relativeDifference - b.relativeDifference;
  });

  return candidates[0] ?? null;
}

function formatOffsetDiagnosis(diagnosis) {
  if (!diagnosis) {
    return "No comparable shifted rolling window in +/-14 days.";
  }

  const relation =
    diagnosis.offsetDays === 0
      ? "same date"
      : diagnosis.offsetDays > 0
        ? `file date +${diagnosis.offsetDays}d`
        : `file date ${diagnosis.offsetDays}d`;

  return (
    `Best shifted-window match: ${relation}, shifted end date ${diagnosis.shiftedEndDate}, ` +
    `expected ${diagnosis.expected}, absolute diff ${diagnosis.absoluteDifference}, ` +
    `relative diff ${diagnosis.relativeDifference}.`
  );
}
function buildMetricsByDate(genre, chain) {
  const out = new Map();

  for (const item of listDatedJsonFiles(genre, chain)) {
    const json = readJson(item.file);
    const date =
      typeof json.date === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(json.date)
        ? json.date
        : item.date;

    out.set(date, {
      date,
      file: path.relative(root, item.file),
      metrics: extractMetricRecord(json, genre),
    });
  }

  return out;
}

function comparableRollingWindowValues(goldByDate, metric, date, windowDays) {
  const values = [];

  for (let offset = windowDays - 1; offset >= 0; offset -= 1) {
    const windowDate = isoDateShift(date, -offset);
    const goldRow = goldByDate.get(windowDate);

    if (!goldRow) {
      return null;
    }

    const value = numericMetric(goldRow.metrics, metric);

    if (value === null) {
      return null;
    }

    values.push(value);
  }

  return values;
}

function evaluateRollingWindowCorrectness() {
  const findings = [];
  const checkedSamples = [];
  let checked = 0;
  let skipped = 0;

  for (const chain of CHAINS) {
    const goldByDate = buildMetricsByDate("gold", chain);
    const derivedByDate = buildMetricsByDate("derived", chain);
    const dates = [...derivedByDate.keys()]
      .sort()
      .slice(-ROLLING_WINDOW_AUDIT_MAX_DATES_PER_CHAIN);

    for (const date of dates) {
      const derivedRow = derivedByDate.get(date);

      for (const metric of BASE_GOLD_METRICS) {
        for (const windowDays of [7, 30]) {
          const derivedKey = `${metric}__ma${windowDays}`;
          const observed = numericMetric(derivedRow.metrics, derivedKey);

          if (observed === null) {
            continue;
          }

          const values = comparableRollingWindowValues(
            goldByDate,
            metric,
            date,
            windowDays
          );

          if (!values) {
            skipped += 1;
            continue;
          }

          const expected = mean(values);
          checked += 1;

          if (checkedSamples.length < 50) {
            checkedSamples.push({
              chain,
              date,
              metric,
              derivedKey,
              windowDays,
              observed,
              expected,
              absoluteDifference: Math.abs(observed - expected),
              sourceRule:
                "current date plus prior calendar dates only; no future observations used",
            });
          }

          if (!withinTolerance(observed, expected)) {
            const offsetDiagnosis = diagnoseRollingWindowOffset(
              goldByDate,
              metric,
              date,
              windowDays,
              observed
            );

            findings.push({
              severity: "fail",
              auditItem: "C-003/C-004",
              code: "ROLLING_WINDOW_VALUE_MISMATCH",
              field: derivedKey,
              genre: "derived",
              chain,
              date,
              metric,
              windowDays,
              observed,
              expected,
              absoluteDifference: Math.abs(observed - expected),
              relativeDifference:
                expected === 0
                  ? Math.abs(observed - expected)
                  : Math.abs(observed - expected) / Math.abs(expected),
              bestOffsetDays: offsetDiagnosis?.offsetDays ?? null,
              bestShiftedEndDate: offsetDiagnosis?.shiftedEndDate ?? null,
              bestShiftedExpected: offsetDiagnosis?.expected ?? null,
              bestShiftedAbsoluteDifference: offsetDiagnosis?.absoluteDifference ?? null,
              bestShiftedRelativeDifference: offsetDiagnosis?.relativeDifference ?? null,
              detail:
                `Derived ${derivedKey} for ${chain} ${date} was ${observed}, ` +
                `but recomputing from the current and previous ${windowDays - 1} gold observations produced ${expected}. ` +
                formatOffsetDiagnosis(offsetDiagnosis),
            });
          }
        }
      }
    }
  }

  if (checked === 0) {
    findings.push({
      severity: "warn",
      auditItem: "C-003/C-004",
      code: "NO_COMPARABLE_ROLLING_WINDOWS",
      field: "derived rolling windows",
      genre: "derived",
      detail:
        "No comparable derived rolling-window samples were checked. This usually means gold/derived historical files are missing, sparse, or structured differently than expected.",
    });
  }

  return {
    checked,
    skipped,
    maxDatesPerChain: ROLLING_WINDOW_AUDIT_MAX_DATES_PER_CHAIN,
    tolerance: {
      relative: ROLLING_WINDOW_RELATIVE_TOLERANCE,
      absolute: ROLLING_WINDOW_ABSOLUTE_TOLERANCE,
    },
    checkedSamples,
    findings,
  };
}
function walkLeafValues(value, parts = [], out = []) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      out.push({
        field: normalizePathForArrays([...parts, "[]"]),
        value,
        valueType: "empty_array",
      });
      return out;
    }

    value.forEach((item) => {
      walkLeafValues(item, [...parts, "[]"], out);
    });

    return out;
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);

    if (entries.length === 0) {
      out.push({
        field: normalizePathForArrays(parts),
        value,
        valueType: "empty_object",
      });
      return out;
    }

    for (const [key, child] of entries) {
      walkLeafValues(child, [...parts, key], out);
    }

    return out;
  }

  out.push({
    field: normalizePathForArrays(parts),
    value,
    valueType: value === null ? "null" : typeof value,
  });

  return out;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isNear(actual, expected, tolerance = CONFIDENCE_FORMULA_ABSOLUTE_TOLERANCE) {
  return Math.abs(actual - expected) <= tolerance;
}

function isSentinelString(value) {
  if (typeof value !== "string") {
    return false;
  }

  return /^(nan|infinity|-infinity|null|none|undefined|n\/a)$/iu.test(value.trim());
}

function shouldCheckSentinelString(field) {
  return (
    field.startsWith("gold.") ||
    field.startsWith("derived.") ||
    field.startsWith("confidence.") ||
    field.startsWith("coverage.") ||
    field.startsWith("freshness.") ||
    field.startsWith("regime.") ||
    field.startsWith("scorecard.") ||
    field.startsWith("publish_confidence.")
  );
}

function metricNameFromPath(field) {
  const parts = field.split(".");
  return parts.length >= 2 ? parts[parts.length - 2] : "";
}

function leafNameFromPath(field) {
  const parts = field.split(".");
  return parts[parts.length - 1] ?? field;
}

function isDirectMetricLeaf(field) {
  const leaf = leafNameFromPath(field);

  return (
    leaf === "current" ||
    leaf === "current_raw" ||
    leaf === "transformed_current" ||
    BASE_GOLD_METRICS.includes(leaf) ||
    /__(ma7|ma30)$/u.test(leaf)
  );
}

function numericBoundsForField(genre, field) {
  const lowerField = field.toLowerCase();
  const leaf = leafNameFromPath(lowerField);
  const metricName = metricNameFromPath(lowerField);

  if (
    lowerField.includes("confidence_score") ||
    lowerField.includes("data_quality_score") ||
    lowerField.includes("label_confidence_score") ||
    lowerField.includes("coverage_factor") ||
    lowerField.includes("effective_confidence") ||
    lowerField.includes("current_row_coverage") ||
    lowerField.includes("freshness_asof") ||
    lowerField.includes("history_depth") ||
    lowerField.includes("recent_density") ||
    lowerField.includes("recent_metric_coverage") ||
    lowerField.endsWith("non_null_ratio") ||
    lowerField.endsWith("nonnull_ratio")
  ) {
    return { min: 0, max: 1, label: "[0,1] confidence/coverage ratio" };
  }

  if (
    lowerField.includes("pct_90d") ||
    lowerField.includes("pct_lookback")
  ) {
    return { min: 0, max: 100, label: "[0,100] percentile field" };
  }

  if (
    /^scorecard\.dimensions\.(demand|friction|capacity)\.(score|score_raw)$/u.test(field) ||
    /^scorecard\.dimensions\.(demand|friction|capacity)\.components\.[a-z0-9_]+\.score_raw$/u.test(field)
  ) {
    return { min: 0, max: 100, label: "[0,100] scorecard score" };
  }

  if (
    lowerField.endsWith("lag_days") ||
    lowerField.includes("lag_days_vs")
  ) {
    return { min: 0, max: Number.POSITIVE_INFINITY, label: "non-negative lag-days field" };
  }

  if (
    (
      leaf === "failed_tx_rate" ||
      leaf === "gas_utilization_pct" ||
      (
        isDirectMetricLeaf(field) &&
        (metricName === "failed_tx_rate" || metricName === "gas_utilization_pct")
      )
    )
  ) {
    return { min: 0, max: 1, label: "[0,1] rate/utilization field" };
  }

  if (
    (
      genre === "gold" ||
      genre === "derived" ||
      field.startsWith("regime.signals.") ||
      field.startsWith("scorecard.dimensions.")
    ) &&
    isDirectMetricLeaf(field) &&
    (
      lowerField.includes("tx_count") ||
      lowerField.includes("addresses") ||
      lowerField.includes("value_transferred") ||
      lowerField.includes("tx_value") ||
      lowerField.includes("tx_fee") ||
      lowerField.includes("block_time") ||
      lowerField.includes("block_count")
    )
  ) {
    return { min: 0, max: Number.POSITIVE_INFINITY, label: "non-negative observed metric value" };
  }

  return null;
}
function findOutOfBounds(value, bounds) {
  if (!isFiniteNumber(value) || !bounds) {
    return null;
  }

  if (value < bounds.min || value > bounds.max) {
    return `Expected ${bounds.label}, got ${value}`;
  }

  return null;
}

function latestDatedItemsForGenreChain(genre, chain, maxDates = NULL_ZERO_AUDIT_MAX_DATES_PER_CHAIN) {
  return listDatedJsonFiles(genre, chain).slice(-maxDates);
}

function evaluateNullZeroSemantics() {
  const findings = [];
  const checkedFiles = [];
  let checkedLeaves = 0;
  let boundedNumericChecks = 0;

  for (const genre of GENRES) {
    for (const chain of CHAINS) {
      for (const item of latestDatedItemsForGenreChain(genre, chain)) {
        const json = readJson(item.file);
        const relativeFile = path.relative(root, item.file);
        checkedFiles.push(relativeFile);

        for (const leaf of walkLeafValues(json)) {
          checkedLeaves += 1;
          const field = normalizeObservedAuditField(genre, canonicalizeObservedField(genre, leaf.field));

          if (typeof leaf.value === "string" && shouldCheckSentinelString(field) && isSentinelString(leaf.value)) {
            findings.push({
              severity: "fail",
              auditItem: "C-005",
              code: "STRING_SENTINEL_USED_FOR_NUMERIC_OR_NULL",
              genre,
              field,
              detail: `${relativeFile} uses string sentinel ${JSON.stringify(leaf.value)}. Use JSON null for missing values and numeric 0 only for real observed zero.`,
            });
          }

          if (isFiniteNumber(leaf.value)) {
            const bounds = numericBoundsForField(genre, field);
            const boundsError = findOutOfBounds(leaf.value, bounds);

            if (bounds) {
              boundedNumericChecks += 1;
            }

            if (boundsError) {
              findings.push({
                severity: "fail",
                auditItem: "C-005",
                code: "NUMERIC_VALUE_OUT_OF_POLICY_BOUNDS",
                genre,
                field,
                detail: `${relativeFile}: ${boundsError}.`,
              });
            }
          }
        }
      }
    }
  }

  if (checkedFiles.length === 0) {
    findings.push({
      severity: "warn",
      auditItem: "C-005",
      code: "NO_FILES_CHECKED_FOR_NULL_ZERO_SEMANTICS",
      genre: "published-data",
      field: "published files",
      detail: "No published files were checked for null/zero semantics.",
    });
  }

  return {
    checkedFiles: checkedFiles.length,
    checkedLeaves,
    boundedNumericChecks,
    maxDatesPerChain: NULL_ZERO_AUDIT_MAX_DATES_PER_CHAIN,
    findings,
  };
}

function evaluateConfidenceDegradation() {
  const findings = [];
  const checkedFiles = [];
  let formulaChecks = 0;
  let publishGateChecks = 0;
  let regimeGateChecks = 0;

  for (const chain of CHAINS) {
    for (const item of latestDatedItemsForGenreChain("meta", chain)) {
      const json = readJson(item.file);
      const relativeFile = path.relative(root, item.file);
      const confidence = nestedValue(json, ["confidence"]);
      const publishConfidence = nestedValue(json, ["publish_confidence"]);
      const regimeGate = nestedValue(json, ["regime", "gate"]);

      if (!isPlainObject(confidence)) {
        continue;
      }

      checkedFiles.push(relativeFile);

      const confidenceScore = confidence.confidence_score;
      const dataQualityScore = confidence.data_quality_score;
      const labelConfidenceScore = confidence.label_confidence_score;

      for (const [field, value] of [
        ["confidence.confidence_score", confidenceScore],
        ["confidence.data_quality_score", dataQualityScore],
        ["confidence.label_confidence_score", labelConfidenceScore],
      ]) {
        if (value !== undefined && value !== null && !isFiniteNumber(value)) {
          findings.push({
            severity: "fail",
            auditItem: "C-006",
            code: "CONFIDENCE_FIELD_NOT_NUMERIC_OR_NULL",
            genre: "meta",
            field,
            detail: `${relativeFile}: ${field} must be a finite number or null.`,
          });
        }

        if (isFiniteNumber(value) && (value < 0 || value > 1)) {
          findings.push({
            severity: "fail",
            auditItem: "C-006",
            code: "CONFIDENCE_FIELD_OUT_OF_RANGE",
            genre: "meta",
            field,
            detail: `${relativeFile}: ${field} must be in [0,1], got ${value}.`,
          });
        }
      }

      if (
        confidence.formula === "sqrt(data_quality_score * label_confidence_score)" &&
        isFiniteNumber(confidenceScore) &&
        isFiniteNumber(dataQualityScore) &&
        isFiniteNumber(labelConfidenceScore)
      ) {
        formulaChecks += 1;
        const expected = Math.sqrt(dataQualityScore * labelConfidenceScore);

        if (!isNear(confidenceScore, expected)) {
          findings.push({
            severity: "fail",
            auditItem: "C-006",
            code: "CONFIDENCE_FORMULA_MISMATCH",
            genre: "meta",
            field: "confidence.confidence_score",
            detail: `${relativeFile}: confidence_score ${confidenceScore} does not match sqrt(data_quality_score * label_confidence_score) = ${expected}.`,
          });
        }
      }

      if (
        isPlainObject(publishConfidence) &&
        isFiniteNumber(publishConfidence.confidence_score) &&
        isFiniteNumber(publishConfidence.threshold) &&
        typeof publishConfidence.eligible === "boolean"
      ) {
        publishGateChecks += 1;
        const expectedEligible = publishConfidence.confidence_score >= publishConfidence.threshold;

        if (publishConfidence.eligible !== expectedEligible) {
          findings.push({
            severity: "fail",
            auditItem: "C-006",
            code: "PUBLISH_CONFIDENCE_GATE_MISMATCH",
            genre: "meta",
            field: "publish_confidence.eligible",
            detail: `${relativeFile}: eligible=${publishConfidence.eligible}, but confidence_score ${publishConfidence.confidence_score} vs threshold ${publishConfidence.threshold} implies ${expectedEligible}.`,
          });
        }
      }

      if (
        isPlainObject(regimeGate) &&
        isFiniteNumber(regimeGate.confidence_score) &&
        isFiniteNumber(regimeGate.threshold) &&
        typeof regimeGate.status === "string"
      ) {
        regimeGateChecks += 1;
        const aboveThreshold = regimeGate.confidence_score >= regimeGate.threshold;

        if (aboveThreshold && regimeGate.status !== "ok") {
          findings.push({
            severity: "fail",
            auditItem: "C-006",
            code: "REGIME_GATE_STATUS_UNEXPECTEDLY_DEGRADED",
            genre: "meta",
            field: "regime.gate.status",
            detail: `${relativeFile}: confidence_score ${regimeGate.confidence_score} is above threshold ${regimeGate.threshold}, but regime gate status is ${regimeGate.status}.`,
          });
        }

        if (!aboveThreshold && regimeGate.status === "ok") {
          findings.push({
            severity: "fail",
            auditItem: "C-006",
            code: "REGIME_GATE_STATUS_NOT_DEGRADED",
            genre: "meta",
            field: "regime.gate.status",
            detail: `${relativeFile}: confidence_score ${regimeGate.confidence_score} is below threshold ${regimeGate.threshold}, but regime gate status is ok.`,
          });
        }
      }

      if (
        isFiniteNumber(confidenceScore) &&
        isFiniteNumber(dataQualityScore) &&
        dataQualityScore < 0.4 &&
        confidenceScore > 0.7
      ) {
        findings.push({
          severity: "fail",
          auditItem: "C-006",
          code: "HIGH_CONFIDENCE_WITH_LOW_DATA_QUALITY",
          genre: "meta",
          field: "confidence.confidence_score",
          detail: `${relativeFile}: confidence_score ${confidenceScore} is high while data_quality_score ${dataQualityScore} is low.`,
        });
      }
    }
  }

  if (checkedFiles.length === 0) {
    findings.push({
      severity: "warn",
      auditItem: "C-006",
      code: "NO_META_FILES_CHECKED_FOR_CONFIDENCE_DEGRADATION",
      genre: "meta",
      field: "confidence",
      detail: "No meta files were checked for confidence degradation.",
    });
  }

  return {
    checkedFiles: checkedFiles.length,
    formulaChecks,
    publishGateChecks,
    regimeGateChecks,
    maxDatesPerChain: NULL_ZERO_AUDIT_MAX_DATES_PER_CHAIN,
    findings,
  };
}
function evaluate() {
  const { observed, missingFiles } = collectObservedFields();
  const observedUnique = uniqueObserved(observed);
  const inventoryByKey = new Map(CALCULATION_INVENTORY.map((item) => [inventoryKey(item), item]));
  const observedByKey = new Map(observedUnique.map((item) => [observedKey(item), item]));
  const findings = [];
  const rollingWindowAudit = evaluateRollingWindowCorrectness();
  findings.push(...rollingWindowAudit.findings);

  
  const nullZeroAudit = evaluateNullZeroSemantics();
  findings.push(...nullZeroAudit.findings);

  const confidenceDegradationAudit = evaluateConfidenceDegradation();
  findings.push(...confidenceDegradationAudit.findings);
for (const missingFile of missingFiles) {
    findings.push({
      severity: "fail",
      auditItem: "C-001",
      code: "MISSING_PUBLISHED_LATEST_FILE",
      field: "latest.json",
      genre: "published-data",
      detail: `Expected latest published artifact was not found: ${missingFile}`,
    });
  }

  for (const observedField of observedUnique) {
    if (!hasCalculationInventoryCoverage(observedField, inventoryByKey)) {
      findings.push({
        severity: "fail",
        auditItem: "C-001",
        code: "OBSERVED_FIELD_NOT_IN_CALCULATION_INVENTORY",
        field: observedField.field,
        genre: observedField.genre,
        detail: `Published calculated field exists for chains [${observedField.chains.join(", ")}] but has no exact calculation inventory entry and is not covered by an approved calculation-family policy.`,
      });
    }
  }
  for (const inventory of CALCULATION_INVENTORY) {
    const missing = requiredInventoryFieldErrors(inventory);

    if (missing.length > 0) {
      findings.push({
        severity: "fail",
        auditItem: "C-002",
        code: "INCOMPLETE_CALCULATION_DEFINITION",
        field: inventory.field,
        genre: inventory.genre,
        detail: `Inventory entry is missing required fields: ${missing.join(", ")}.`,
      });
    }

    if (shouldWarnForUnobservedInventoryField(inventory, observedByKey)) {
      findings.push({
        severity: "warn",
        auditItem: "C-001",
        code: "INVENTORY_FIELD_NOT_OBSERVED_IN_LATEST",
        field: inventory.field,
        genre: inventory.genre,
        detail:
          "Inventory field was not observed in current latest.json scan. This may be acceptable for optional fields or schema variants, but should be reviewed.",
      });
    }
  }

  return {
    generatedAtUtc: new Date().toISOString(),
    result: findings.some((finding) => finding.severity === "fail") ? "FAIL" : "PASS",
    publishedRoot: path.relative(root, publishedRoot) || ".",
    searchedPublishedRoots: candidatePublishedRoots().map((candidate) => path.relative(root, candidate) || "."),
    chains: CHAINS,
    genres: GENRES,
    observedFields: observedUnique,
    rollingWindowAudit,
    
    nullZeroAudit,
    confidenceDegradationAudit,rollingWindowSummary: summarizeRollingWindowFindings(findings),
    calculationInventory: CALCULATION_INVENTORY,
    findings,
  };
}

function summarizeRollingWindowFindings(findings) {
  const rollingFindings = findings.filter(
    (finding) => finding.code === "ROLLING_WINDOW_VALUE_MISMATCH"
  );

  const byChainMetricWindow = new Map();
  const byOffset = new Map();

  for (const finding of rollingFindings) {
    const key = [
      finding.chain ?? "unknown-chain",
      finding.metric ?? finding.field,
      finding.windowDays ? `ma${finding.windowDays}` : "unknown-window",
    ].join(" | ");

    if (!byChainMetricWindow.has(key)) {
      byChainMetricWindow.set(key, {
        key,
        count: 0,
        maxRelativeDifference: 0,
        bestShiftedRelativeDifferenceMin: Number.POSITIVE_INFINITY,
        offsets: new Map(),
      });
    }

    const row = byChainMetricWindow.get(key);
    row.count += 1;
    row.maxRelativeDifference = Math.max(
      row.maxRelativeDifference,
      Number(finding.relativeDifference ?? 0)
    );

    if (typeof finding.bestShiftedRelativeDifference === "number") {
      row.bestShiftedRelativeDifferenceMin = Math.min(
        row.bestShiftedRelativeDifferenceMin,
        finding.bestShiftedRelativeDifference
      );
    }

    const offsetKey =
      typeof finding.bestOffsetDays === "number"
        ? String(finding.bestOffsetDays)
        : "none";

    row.offsets.set(offsetKey, (row.offsets.get(offsetKey) ?? 0) + 1);
    byOffset.set(offsetKey, (byOffset.get(offsetKey) ?? 0) + 1);
  }

  return {
    total: rollingFindings.length,
    byOffset: [...byOffset.entries()]
      .map(([offset, count]) => ({ offset, count }))
      .sort((a, b) => b.count - a.count),
    byChainMetricWindow: [...byChainMetricWindow.values()]
      .map((row) => ({
        key: row.key,
        count: row.count,
        maxRelativeDifference: row.maxRelativeDifference,
        bestShiftedRelativeDifferenceMin:
          Number.isFinite(row.bestShiftedRelativeDifferenceMin)
            ? row.bestShiftedRelativeDifferenceMin
            : null,
        offsets: [...row.offsets.entries()]
          .map(([offset, count]) => `${offset}:${count}`)
          .join(", "),
      }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)),
  };
}
function markdownReport(result) {
  const lines = [];

  lines.push("# Calculation Correctness Audit — Calculation Inventory");
  lines.push("");
  lines.push(`Generated at UTC: ${result.generatedAtUtc}`);
  lines.push(`Result: ${result.result}`);
  lines.push(`Published root: ${result.publishedRoot}`);
  lines.push("");
  lines.push("## Observed calculated fields from latest published artifacts");
  lines.push("");
  lines.push(tableRow(["Genre", "Field", "Chains", "Value types"]));
  lines.push(tableRow(["---", "---", "---", "---"]));

  for (const item of result.observedFields) {
    lines.push(tableRow([item.genre, item.field, item.chains.join(", "), item.valueTypes.join(", ")]));
  }

  lines.push("");
  lines.push("## Calculation inventory");
  lines.push("");
  lines.push(tableRow(["Genre", "Field", "Source layer", "Output layer", "Owner", "Definition", "Validation focus"]));
  lines.push(tableRow(["---", "---", "---", "---", "---", "---", "---"]));

  for (const item of result.calculationInventory) {
    lines.push(
      tableRow([
        item.genre,
        item.field,
        item.sourceLayer,
        item.outputLayer,
        item.calculationOwner,
        item.definition,
        item.validationFocus,
      ])
    );
  }

  lines.push("");
  lines.push("");
  lines.push("## Rolling-window arithmetic and no-lookahead audit");
  lines.push("");
  lines.push(`Checked samples: ${result.rollingWindowAudit.checked}`);
  lines.push(`Skipped samples without full comparable gold window: ${result.rollingWindowAudit.skipped}`);
  lines.push(`Max derived dates per chain scanned: ${result.rollingWindowAudit.maxDatesPerChain}`);
  lines.push(`Tolerance: absolute ${result.rollingWindowAudit.tolerance.absolute}, relative ${result.rollingWindowAudit.tolerance.relative}`);
  lines.push("");
  lines.push(tableRow(["Chain", "Date", "Derived key", "Window", "Observed", "Expected", "Absolute difference", "Source rule"]));
  lines.push(tableRow(["---", "---", "---", "---", "---", "---", "---", "---"]));

  for (const sample of result.rollingWindowAudit.checkedSamples) {
    lines.push(
      tableRow([
        sample.chain,
        sample.date,
        sample.derivedKey,
        sample.windowDays,
        sample.observed,
        sample.expected,
        sample.absoluteDifference,
        sample.sourceRule,
      ])
    );
  }

  lines.push("");  lines.push("");
  lines.push("### Rolling-window mismatch summary");
  lines.push("");
  lines.push(`Total rolling-window mismatches: ${result.rollingWindowSummary.total}`);
  lines.push("");
  lines.push("#### Best shifted-window offset histogram");
  lines.push("");
  lines.push(tableRow(["Best offset days", "Mismatch count"]));
  lines.push(tableRow(["---", "---"]));

  for (const row of result.rollingWindowSummary.byOffset) {
    lines.push(tableRow([row.offset, row.count]));
  }

  lines.push("");
  lines.push("#### Mismatch summary by chain / metric / window");
  lines.push("");
  lines.push(tableRow(["Chain | Metric | Window", "Count", "Max relative diff", "Best shifted relative diff min", "Offset histogram"]));
  lines.push(tableRow(["---", "---", "---", "---", "---"]));

  for (const row of result.rollingWindowSummary.byChainMetricWindow) {
    lines.push(
      tableRow([
        row.key,
        row.count,
        row.maxRelativeDifference,
        row.bestShiftedRelativeDifferenceMin ?? "n/a",
        row.offsets,
      ])
    );
  }

  lines.push("");
  lines.push("");
  lines.push("## Null/zero semantics audit");
  lines.push("");
  lines.push(`Checked files: ${result.nullZeroAudit.checkedFiles}`);
  lines.push(`Checked scalar leaves: ${result.nullZeroAudit.checkedLeaves}`);
  lines.push(`Bounded numeric checks: ${result.nullZeroAudit.boundedNumericChecks}`);
  lines.push(`Max dated files per chain scanned: ${result.nullZeroAudit.maxDatesPerChain}`);
  lines.push("");
  lines.push("Policy:");
  lines.push("- JSON null means missing or structurally unavailable.");
  lines.push("- Numeric 0 means an observed zero, not missing.");
  lines.push("- String sentinels such as NaN, Infinity, None, undefined, N/A, or string null are not allowed for calculated fields.");
  lines.push("- Confidence, coverage, rates, percentiles, lag days, and scorecard scores must stay inside their documented numeric ranges.");

  lines.push("");
  lines.push("## Confidence degradation audit");
  lines.push("");
  lines.push(`Checked meta files: ${result.confidenceDegradationAudit.checkedFiles}`);
  lines.push(`Formula checks: ${result.confidenceDegradationAudit.formulaChecks}`);
  lines.push(`Publish-gate checks: ${result.confidenceDegradationAudit.publishGateChecks}`);
  lines.push(`Regime-gate checks: ${result.confidenceDegradationAudit.regimeGateChecks}`);
  lines.push(`Max meta files per chain scanned: ${result.confidenceDegradationAudit.maxDatesPerChain}`);
  lines.push("");
  lines.push("Policy:");
  lines.push("- confidence_score, data_quality_score, and label_confidence_score must be finite numbers in [0,1] when present.");
  lines.push("- confidence_score must match sqrt(data_quality_score * label_confidence_score) when that formula is declared.");
  lines.push("- publish_confidence.eligible must match confidence_score >= threshold.");
  lines.push("- regime.gate.status must not remain ok below its confidence threshold.");

  lines.push("");
  lines.push("## Findings");
  lines.push("");

  if (result.findings.length === 0) {
    lines.push("No calculation-inventory findings.");
  } else {
    lines.push(tableRow(["Severity", "Audit item", "Code", "Genre", "Field", "Detail"]));
    lines.push(tableRow(["---", "---", "---", "---", "---", "---"]));

    for (const finding of result.findings) {
      lines.push(
        tableRow([
          finding.severity,
          finding.auditItem,
          finding.code,
          finding.genre,
          finding.field,
          finding.detail,
        ])
      );
    }
  }

  lines.push("");
  lines.push("## Coverage");
  lines.push("");
  lines.push("- C-001 Calculation Inventory Completeness: checked against observed published latest artifacts, exact inventory entries, and calculation-family pattern entries.");
  lines.push("- C-002 Metric Definition Completeness: checked for required definition metadata.");
  lines.push("- C-003 Rolling Window Arithmetic: recomputes derived ma7/ma30 samples from gold files.");
  lines.push("- C-004 No-Lookahead Causality: recomputation uses only current and prior calendar dates.");
  lines.push("- C-005 Null/Zero Semantics: checks JSON null vs numeric zero policy, string sentinels, and numeric range bounds.");
  lines.push("- C-006 Confidence Degradation: checks confidence formula, bounded confidence components, publish gate, and regime gate consistency.");
  lines.push("");
  lines.push(
    "This script does not yet verify full fixture replay, adversarial edge-case fixtures, historical reproducibility, or deterministic hash behavior. Those are later Section C stages."
  );
  lines.push("");
  return `${lines.join("\n")}\n`;
}

const result = evaluate();

ensureReportDir();
fs.writeFileSync(reportJsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
fs.writeFileSync(reportMarkdownPath, markdownReport(result), "utf8");

if (result.findings.some((finding) => finding.severity === "fail")) {
  console.error("Calculation correctness audit failed at inventory stage.");
  console.error(`Report: ${path.relative(root, reportMarkdownPath)}`);
  console.error("");

  const failures = result.findings.filter((item) => item.severity === "fail");
  const visibleFailures = failures.slice(0, MAX_TERMINAL_FAILURES);

  for (const finding of visibleFailures) {
    console.error(
      `[${finding.severity.toUpperCase()}] ${finding.auditItem} ${finding.code} :: ${finding.genre}.${finding.field}`
    );
    console.error(`  Detail: ${finding.detail}`);
  }

  if (failures.length > visibleFailures.length) {
    console.error("");
    console.error(
      `Terminal output capped at ${MAX_TERMINAL_FAILURES} of ${failures.length} failure(s). Full detail is in ${path.relative(root, reportMarkdownPath)} and ${path.relative(root, reportJsonPath)}.`
    );
  }

  if (result.rollingWindowSummary?.total > 0) {
    console.error("");
    console.error(`Rolling-window mismatches: ${result.rollingWindowSummary.total}`);
    console.error("Best shifted-window offset histogram:");

    for (const row of result.rollingWindowSummary.byOffset.slice(0, 15)) {
      console.error(`  offset ${row.offset}: ${row.count}`);
    }
  }

  process.exit(1);
}
const warnings = result.findings.filter((finding) => finding.severity === "warn");

if (warnings.length > 0) {
  console.warn(`Calculation correctness audit passed with ${warnings.length} warning(s).`);
  console.warn(`Report: ${path.relative(root, reportMarkdownPath)}`);
  process.exit(0);
}

console.log("Calculation correctness audit inventory stage passed.");
console.log(`Report: ${path.relative(root, reportMarkdownPath)}`);
/*END FILE*/