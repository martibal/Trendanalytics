import { readStorageObject } from "@/lib/storage";

function arrayBufferToUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

export async function computeHistoryDepthDays(): Promise<number | null> {
  const manifest = await readStorageObject("data/published/v1/meta/ethereum/manifest.json");
  if (!manifest) return null;

  try {
    const raw = arrayBufferToUtf8(manifest.body);
    const json = JSON.parse(raw) as {
      available_days?: string[];
      available_dates?: string[];
      dates?: string[];
      available_days_count?: number;
    };

    const dates = json.available_days ?? json.available_dates ?? json.dates ?? [];
    if (Array.isArray(dates) && dates.length > 0) return dates.length;
    if (typeof json.available_days_count === "number" && json.available_days_count > 0) {
      return json.available_days_count;
    }
    return null;
  } catch {
    return null;
  }
}
