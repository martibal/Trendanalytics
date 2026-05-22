// src/app/api/v1/methodology/versions/route.ts
import { NextResponse } from "next/server";
import { enforcePreAuthRateLimit } from "@/lib/security/preAuthRateLimit";
import { readDatasetManifest } from "@/lib/dataset";

export const revalidate = 300;

type MethodologyVersionRow = {
  version: string;
  status: "current" | "historical";
  label: string;
  summary: string;
  published_with_dataset_version: string | null;
  published_at: string | null;
};

export async function GET(request: Request) {
  const preAuthRateLimit = await enforcePreAuthRateLimit(request, "public-read-api");

  if (!preAuthRateLimit.ok) {
    return preAuthRateLimit.response;
  }

  const dataset = await readDatasetManifest();

  const currentVersion =
    typeof dataset?.methodology_version === "string" && dataset.methodology_version.trim().length > 0
      ? dataset.methodology_version
      : "v1";

  const rows: MethodologyVersionRow[] = [
    {
      version: currentVersion,
      status: "current",
      label: `Methodology ${currentVersion}`,
      summary:
        "Current published descriptive methodology used by the public site and published artifacts.",
      published_with_dataset_version:
        typeof dataset?.version === "string" ? dataset.version : null,
      published_at:
        typeof dataset?.published_at === "string" ? dataset.published_at : null,
    },
  ];

  return NextResponse.json(
    {
      ok: true,
      generated_at_utc: new Date().toISOString(),
      dataset: dataset
        ? {
            version: dataset.version ?? null,
            published_at: dataset.published_at ?? null,
            methodology_version: dataset.methodology_version ?? null,
          }
        : null,
      version_count: rows.length,
      versions: rows,
      traceability: {
        source_mode: "dataset_manifest",
        canonical_contract: {
          current_methodology_from_dataset_manifest: true,
          historical_versions_embeddable: true,
          runtime_repair: false,
        },
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
      },
    }
  );
}
