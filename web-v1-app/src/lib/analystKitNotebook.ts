type JsonRecord = Record<string, unknown>;

function markdownCell(source: string[]): JsonRecord {
  return {
    cell_type: "markdown",
    metadata: {},
    source,
  };
}

function codeCell(source: string[]): JsonRecord {
  return {
    cell_type: "code",
    execution_count: null,
    metadata: {},
    outputs: [],
    source,
  };
}

export function buildRunnableStarterNotebook(): JsonRecord {
  return {
    cells: [
      markdownCell([
        "# Urd Atlas Analyst Kit starter notebook\n",
        "\n",
        "Run this notebook without any private infrastructure. It loads a public Urd Atlas regime calendar, builds a small example metrics table, joins on date and chain, then summarizes the example metric by network state.\n",
      ]),
      codeCell([
        "import pandas as pd\n",
        "\n",
        "chain = 'ethereum'  # bitcoin, ethereum, arbitrum, base\n",
        "urd_url = f'https://urdatlas.com/api/v1/analyst-kit/{chain}/regime-calendar'\n",
        "urd = pd.read_csv(urd_url)\n",
        "urd.tail()\n",
      ]),
      markdownCell([
        "## Build a runnable example dataset\n",
        "The example below creates synthetic daily app metrics from the dates available in Urd Atlas. Replace this cell with your own CSV once the workflow is clear.\n",
      ]),
      codeCell([
        "example_dates = urd[['observation_date', 'chain']].tail(30).copy()\n",
        "example_dates['daily_active_users'] = [100 + (i % 7) * 8 for i in range(len(example_dates))]\n",
        "example_dates['support_tickets'] = [12 + (i % 5) for i in range(len(example_dates))]\n",
        "my_data = example_dates.rename(columns={'observation_date': 'date'})\n",
        "my_data.head()\n",
      ]),
      markdownCell([
        "## Join Urd Atlas to your daily metrics\n",
        "The grain is one row per chain per observation date. For production decision simulation, use point-in-time availability when that export is enabled. For reporting and exploratory analysis, this simple date-and-chain join is the fastest starting point.\n",
      ]),
      codeCell([
        "df = my_data.merge(\n",
        "    urd[['observation_date', 'chain', 'regime', 'confidence_score', 'demand_score', 'friction_score', 'capacity_score']],\n",
        "    left_on=['date', 'chain'],\n",
        "    right_on=['observation_date', 'chain'],\n",
        "    how='left',\n",
        ")\n",
        "\n",
        "df.tail()\n",
      ]),
      markdownCell([
        "## Choose a confidence filter, then summarize by network state\n",
        "Urd Atlas uses 0.40 as the publication confidence gate. The 0.70 filter below is an intentionally stricter analyst-selected example, not the Urd Atlas publication gate. Confidence is evidence strength, not a probability of an external outcome.\n",
      ]),
      codeCell([
        "# Optional downstream filter: stricter than the 0.40 publication gate.\n",
        "usable = df[df['confidence_score'] >= 0.70].copy()\n",
        "\n",
        "summary = (\n",
        "    usable.groupby('regime')\n",
        "    .agg(\n",
        "        days=('date', 'count'),\n",
        "        avg_daily_active_users=('daily_active_users', 'mean'),\n",
        "        avg_support_tickets=('support_tickets', 'mean'),\n",
        "        avg_demand_score=('demand_score', 'mean'),\n",
        "    )\n",
        "    .sort_values('days', ascending=False)\n",
        ")\n",
        "\n",
        "summary\n",
      ]),
      markdownCell([
        "## Replace the example with your own file\n",
        "Your file should have at least `date`, `chain`, and one or more daily metrics.\n",
      ]),
      codeCell([
        "# Uncomment and adapt when you are ready to use your own file.\n",
        "# my_data = pd.read_csv('my_daily_metrics.csv')\n",
        "# my_data.head()\n",
      ]),
      markdownCell([
        "## Export the joined table and summary\n",
        "These files can be used in a report, spreadsheet, BI tool, or internal review.\n",
      ]),
      codeCell([
        "df.to_csv('my_metrics_with_urd_network_state.csv', index=False)\n",
        "summary.to_csv('my_metrics_by_urd_network_state.csv')\n",
      ]),
      markdownCell([
        "## Interpretation boundary\n",
        "Urd Atlas is descriptive network-state context. Treat this as a segmentation, reporting, and diagnostic layer, not an automated instruction or future-state guarantee.\n",
      ]),
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
