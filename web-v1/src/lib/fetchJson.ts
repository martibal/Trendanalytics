// src/lib/fetchJson.ts
export class HttpError extends Error {
  status: number;
  url: string;

  constructor(status: number, url: string, message?: string) {
    super(message ?? `HTTP ${status} for ${url}`);
    this.status = status;
    this.url = url;
  }
}

/**
 * Strict JSON disallows NaN/Infinity. Some pipeline exports may still contain them.
 * This helper sanitizes those tokens to null before parsing.
 *
 * NOTE: This is a UI safety net. The correct fix is: never emit NaN in JSON.
 */
function sanitizeNonJsonNumbers(raw: string): string {
  // Replace bare NaN/Infinity/-Infinity tokens with null
  // This is conservative: it only targets standalone tokens (word boundaries).
  return raw
    .replace(/\bNaN\b/g, "null")
    .replace(/\bInfinity\b/g, "null")
    .replace(/\b-Infinity\b/g, "null");
}

export async function fetchJsonLenient<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new HttpError(res.status, url, txt || `HTTP ${res.status}`);
  }

  const raw = await res.text();
  const sanitized = sanitizeNonJsonNumbers(raw);

  try {
    return JSON.parse(sanitized) as T;
  } catch (e: any) {
    // Make debugging much easier
    const msg = `Failed to parse JSON from ${url}: ${e?.message ?? e}`;
    throw new Error(msg);
  }
}