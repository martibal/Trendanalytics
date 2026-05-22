// src/app/api/v1/glossary/route.ts
import { NextResponse } from "next/server";
import { enforcePreAuthRateLimit } from "@/lib/security/preAuthRateLimit";
import { readDatasetManifest } from "@/lib/dataset";
import { loadGlossaryApiEntries } from "@/lib/glossary/entries";

export const revalidate = 300;

export async function GET(request: Request) {
  const preAuthRateLimit = await enforcePreAuthRateLimit(request, "public-read-api");

  if (!preAuthRateLimit.ok) {
    return preAuthRateLimit.response;
  }

  const dataset = await readDatasetManifest();

  const entries = await loadGlossaryApiEntries();

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
      entry_count: entries.length,
      entries,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
      },
    }
  );
}
