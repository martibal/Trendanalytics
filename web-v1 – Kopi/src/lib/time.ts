export function daysBetweenUtc(dateA: string, dateB: string): number {
  // dateA/dateB are "YYYY-MM-DD"
  const a = new Date(`${dateA}T00:00:00Z`).getTime();
  const b = new Date(`${dateB}T00:00:00Z`).getTime();
  const diffMs = a - b;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}
