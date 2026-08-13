import { getChainConfig, type ChainId } from "@/config/chains";
import { readStorageObject } from "@/lib/storage";

export type AnalystKitLabel =
  | "STABLE"
  | "HEATING"
  | "CONGESTED"
  | "CHEAP"
  | "UNKNOWN/DEGRADED";

type JsonRecord = Record<string, unknown>;

type MetaDriver = {
  metric?: string;
  name?: string;
  label?: string;
  axis?: string;
  trend?: string;
  current?: number | string;
  z_robust?: number | string;
  pct_90d?: number | string;
  momentum_7d_vs_30d?: number | string;
  informative?: boolean;
  direction?: string;
  value?: number | string;
  contribution?: number | string;
};

type MetaScore = number | { score?: number };

type MetaRow = {
  chain?: string;
  date?: string;
  updated_through?: string;
  status?: {
    label?: string;
    one_liner?: string;
  };
  regime?: {
    label?: string;
    asof_date?: string;
    drivers?: MetaDriver[];
    demand_score?: number;
    friction_score?: number;
    capacity_score?: number;
    determinism_hash?: string;
  };
  scorecard?: {
    demand?: MetaScore;
    friction?: MetaScore;
    capacity?: MetaScore;
    dimensions?: {
      demand?: MetaScore;
      friction?: MetaScore;
      capacity?: MetaScore;
    };
  };
  confidence?: {
    confidence_score?: number;
    data_quality_score?: number;
    label_confidence_score?: number;
    lag_days_vs_utc_today?: number;
    missing?: unknown;
  };
  methodology_version?: string;
  determinism_hash?: string;
};

export type AnalystKitCalendarRow = {
  observation_date: string;
  chain: ChainId;
  chain_label: string;
  regime: AnalystKitLabel;
  confidence_score: number | null;
  data_quality_score: number | null;
  label_confidence_score: number | null;
  freshness_lag_days: number | null;
  demand_score: number | null;
  friction_score: number | null;
  capacity_score: number | null;
  methodology_version: string;
  determinism_hash: string;
  one_liner: string;
  drivers: string;
};

export const ANALYST_KIT_CHAINS: ChainId[] = [
  "bitcoin",
  "ethereum",
  "arbitrum",
  "base",
];

export function isAnalystKitChain(value: string): value is ChainId {
  return ANALYST_KIT_CHAINS.includes(value as ChainId);
}

function arrayBufferToUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

async function readJson<T>(storagePath: string): Promise<T | null> {
  try {
    const result = await readStorageObject(storagePath);
    if (!result) return null;

    const raw = arrayBufferToUtf8(result.body);
    const parsed = JSON.parse(raw) as T;

    return parsed;
  } catch {
    return null;
  }
}

function normalizeLabel(raw: unknown): AnalystKitLabel {
  const upper = String(raw ?? "").toUpperCase();

  if (upper === "STABLE") return "STABLE";
  if (upper === "HEATING") return "HEATING";
  if (upper === "CONGESTED") return "CONGESTED";
  if (upper === "CHEAP") return "CHEAP";

  return "UNKNOWN/DEGRADED";
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function scoreValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object") {
    const score = (value as { score?: unknown }).score;
    return numberOrNull(score);
  }

  return null;
}

function rowDate(row: MetaRow): string {
  return row.date ?? row.updated_through ?? row.regime?.asof_date ?? "";
}

function driverField(name: string, value: unknown): string {
  return value == null || value === "" ? "" : `${name}=${String(value)}`;
}

function driverText(driver: MetaDriver): string {
  const label = driver.metric ?? driver.name ?? driver.label ?? "driver";
  const currentShape = [
    driverField("axis", driver.axis),
    driverField("trend", driver.trend),
    driverField("current", driver.current),
    driverField("z_robust", driver.z_robust),
    driverField("pct_90d", driver.pct_90d),
    driverField("momentum_7d_vs_30d", driver.momentum_7d_vs_30d),
    driver.informative == null ? "" : driverField("informative", driver.informative),
  ].filter(Boolean);

  if (currentShape.length > 0) {
    return `${label} ${currentShape.join(" ")}`.trim();
  }

  const direction = driver.direction ? ` ${driver.direction}` : "";
  const value = driver.value == null ? "" : `=${driver.value}`;
  const contribution = driver.contribution == null ? "" : ` contribution=${driver.contribution}`;

  return `${label}${direction}${value}${contribution}`.trim();
}

function driversText(row: MetaRow): string {
  const drivers = row.regime?.drivers;
  if (!Array.isArray(drivers) || drivers.length === 0) return "";

  return drivers.map(driverText).filter(Boolean).join("; ");
}

async function loadMetaRows(chain: ChainId): Promise<MetaRow[]> {
  const windows = ["last365d", "last180d", "last90d", "last30d", "last7d"];

  for (const window of windows) {
    const rows = await readJson<MetaRow[]>(`data/published/v1/meta/${chain}/${window}.json`);

    if (Array.isArray(rows) && rows.length > 0) {
      return rows
        .filter((row) => row && typeof row === "object" && rowDate(row))
        .sort((a, b) => rowDate(a).localeCompare(rowDate(b)));
    }
  }

  const latest = await readJson<MetaRow>(`data/published/v1/meta/${chain}/latest.json`);
  if (latest && rowDate(latest)) return [latest];

  return [];
}

export async function buildRegimeCalendarRows(chain: ChainId): Promise<AnalystKitCalendarRow[]> {
  const config = getChainConfig(chain);
  const rows = await loadMetaRows(chain);

  return rows.map((row) => ({
    observation_date: rowDate(row),
    chain,
    chain_label: config?.label ?? chain,
    regime: normalizeLabel(row.status?.label ?? row.regime?.label),
    confidence_score: numberOrNull(row.confidence?.confidence_score),
    data_quality_score: numberOrNull(row.confidence?.data_quality_score),
    label_confidence_score: numberOrNull(row.confidence?.label_confidence_score),
    freshness_lag_days: numberOrNull(row.confidence?.lag_days_vs_utc_today),
    demand_score:
      numberOrNull(row.regime?.demand_score)
      ?? scoreValue(row.scorecard?.dimensions?.demand)
      ?? scoreValue(row.scorecard?.demand),
    friction_score:
      numberOrNull(row.regime?.friction_score)
      ?? scoreValue(row.scorecard?.dimensions?.friction)
      ?? scoreValue(row.scorecard?.friction),
    capacity_score:
      numberOrNull(row.regime?.capacity_score)
      ?? scoreValue(row.scorecard?.dimensions?.capacity)
      ?? scoreValue(row.scorecard?.capacity),
    methodology_version: row.methodology_version ?? "",
    determinism_hash: row.regime?.determinism_hash ?? row.determinism_hash ?? "",
    one_liner: row.status?.one_liner ?? "",
    drivers: driversText(row),
  }));
}

function csvCell(value: string | number | null): string {
  if (value == null) return "";
  const raw = String(value);

  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }

  return raw;
}

export function regimeCalendarToCsv(rows: AnalystKitCalendarRow[]): string {
  const headers: Array<keyof AnalystKitCalendarRow> = [
    "observation_date",
    "chain",
    "chain_label",
    "regime",
    "confidence_score",
    "data_quality_score",
    "label_confidence_score",
    "freshness_lag_days",
    "demand_score",
    "friction_score",
    "capacity_score",
    "methodology_version",
    "determinism_hash",
    "one_liner",
    "drivers",
  ];

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n");
}

function labelSentence(label: AnalystKitLabel): string {
  if (label === "UNKNOWN/DEGRADED") return "unknown/degraded";
  return label.toLowerCase();
}

function confidenceLanguage(score: number | null): string {
  if (score == null) return "no published confidence score";
  return `published confidence score ${score.toFixed(3)}`;
}

export async function buildWeeklySummaryText(chain: ChainId): Promise<string> {
  const config = getChainConfig(chain);
  const rows = await buildRegimeCalendarRows(chain);
  const latest = rows.at(-1);
  const previous = rows.length > 1 ? rows.at(-2) : null;
  const latestWindow = rows.slice(-7);

  if (!latest) {
    return `${config?.name ?? chain} has no published Urd Atlas meta rows available for Analyst Kit export.`;
  }

  const changes = latestWindow.reduce((count, row, index, all) => {
    if (index === 0) return count;
    return row.regime === all[index - 1].regime ? count : count + 1;
  }, 0);

  const transition = previous && previous.regime !== latest.regime
    ? `The latest row changed from ${previous.regime} to ${latest.regime}.`
    : `The latest row remained ${latest.regime}.`;

  const drivers = latest.drivers ? ` Published drivers: ${latest.drivers}.` : "";
  const oneLiner = latest.one_liner ? ` ${latest.one_liner}` : "";

  return [
    `${config?.name ?? chain} was classified as ${latest.regime} for ${latest.observation_date}, with ${confidenceLanguage(latest.confidence_score)}.`,
    transition,
    `Across the latest ${latestWindow.length} published observations, the regime changed ${changes} time${changes === 1 ? "" : "s"}.`,
    "Use this as descriptive network-state context for analysis, reporting and model diagnostics; it is not an automated instruction or future-state guarantee.",
    `Plain-language state: ${config?.name ?? chain} looked ${labelSentence(latest.regime)} relative to its own published network-state methodology.${oneLiner}${drivers}`,
  ].join("\n\n");
}

export function buildFeatureSchema(): JsonRecord {
  return {
    name: "urd_atlas_network_state_daily",
    grain: "one row per chain per observation_date",
    primary_key: ["chain", "observation_date"],
    recommended_join_key: ["chain", "observation_date"],
    point_in_time_note:
      "For historical simulation or decision review, join using the row's availability timestamp once point-in-time/vintage exports are enabled. Do not assume the observation_date was available before publication.",
    fields: [
      { name: "observation_date", type: "date", use: "Date the network state describes." },
      { name: "chain", type: "string", use: "Canonical chain id: bitcoin, ethereum, arbitrum or base." },
      { name: "chain_label", type: "string", use: "Display label for the chain, such as BTC or ETH." },
      { name: "regime", type: "category", use: "Human-readable network-state label." },
      { name: "confidence_score", type: "float", use: "Quality/evidence gate; not a probability of an external outcome." },
      { name: "data_quality_score", type: "float", use: "Data availability and pipeline quality component when published." },
      { name: "label_confidence_score", type: "float", use: "Evidence strength for the chosen label when published." },
      { name: "freshness_lag_days", type: "integer", use: "Lag versus UTC today when published." },
      { name: "demand_score", type: "float", use: "Continuous demand component; often more useful than the label for ML." },
      { name: "friction_score", type: "float", use: "Continuous friction/cost component." },
      { name: "capacity_score", type: "float", use: "Continuous capacity/stress component." },
      { name: "methodology_version", type: "string", use: "Methodology identifier for reproducibility." },
      { name: "determinism_hash", type: "string", use: "Hash anchor for deterministic artifact verification when published." },
      { name: "one_liner", type: "string", use: "Short descriptive summary for reports and dashboards." },
      { name: "drivers", type: "string", use: "Semicolon-separated current driver evidence (metric plus available axis/trend/value diagnostics) for human review." },
    ],
    safe_uses: [
      "reporting context",
      "dashboard annotation",
      "regime-conditioned model evaluation",
      "confidence filtering",
      "research segmentation",
      "feature-store ingestion",
    ],
    unsafe_uses: [
      "real-time action trigger",
      "automated decision without human review",
      "external outcome guarantee",
      "guaranteed congestion prediction",
    ],
  };
}

export function buildStarterNotebook(): JsonRecord {
  return {
    cells: [
      {
        cell_type: "markdown",
        metadata: {},
        source: [
          "# Urd Atlas Analyst Kit starter notebook\n",
          "\n",
          "Load a public Urd Atlas regime calendar CSV, merge it with your own daily metrics, and summarize your metric by blockchain network state.\n",
        ],
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          "import pandas as pd\n",
          "\n",
          "chain = 'ethereum'  # bitcoin, ethereum, arbitrum, base\n",
          "urd_url = f'https://urdatlas.com/api/v1/analyst-kit/{chain}/regime-calendar'\n",
          "urd = pd.read_csv(urd_url)\n",
          "urd.tail()\n",
        ],
      },
      {
        cell_type: "markdown",
        metadata: {},
        source: [
          "## Merge with your own data\n",
          "Your file should have at least `date`, `chain`, and one metric column.\n",
        ],
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          "my_data = pd.read_csv('my_protocol_metrics.csv')\n",
          "\n",
          "df = my_data.merge(\n",
          "    urd[['observation_date', 'chain', 'regime', 'confidence_score']],\n",
          "    left_on=['date', 'chain'],\n",
          "    right_on=['observation_date', 'chain'],\n",
          "    how='left',\n",
          ")\n",
          "\n",
          "df.head()\n",
        ],
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          "metric = 'daily_active_users'  # change this to your metric\n",
          "# 0.40 is the publication gate; 0.70 below is an optional stricter analyst filter.\n",
          "summary = (\n",
          "    df[df['confidence_score'] >= 0.70]\n",
          "    .groupby('regime')\n",
          "    .agg(days=('date', 'count'), average_metric=(metric, 'mean'), median_metric=(metric, 'median'))\n",
          "    .sort_values('days', ascending=False)\n",
          ")\n",
          "\n",
          "summary\n",
        ],
      },
      {
        cell_type: "markdown",
        metadata: {},
        source: [
          "## Interpretation rule\n",
          "Urd Atlas is descriptive network-state context. Treat this as a segmentation and diagnostic layer, not an automated instruction or future-state guarantee.\n",
        ],
      },
    ],
    metadata: {
      kernelspec: {
        display_name: "Python 3",
        language: "python",
        name: "python3",
      },
      language_info: {
        name: "python",
        pycodemirror_mode: { name: "ipython", version: 3 },
        version: "3.x",
      },
    },
    nbformat: 4,
    nbformat_minor: 5,
  };
}
