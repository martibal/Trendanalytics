// src/lib/utils/formatters.ts

export type CompactNumberOptions = {
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
};

export type PercentOptions = {
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  inputIsFraction?: boolean;
};

export type DateTimeOptions = {
  includeTime?: boolean;
  locale?: string;
};

function normalizeCompactNumberSuffix(value: string): string {
  return value
    .replace(/k$/g, "K")
    .replace(/m$/g, "M")
    .replace(/b$/g, "B")
    .replace(/t$/g, "T");
}

export function formatCompactNumber(
  value: number | null | undefined,
  options: CompactNumberOptions = {}
): string {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) {
    return "—";
  }

  const absoluteValue = Math.abs(value);

  const inferredMaximumFractionDigits =
    absoluteValue >= 1_000_000 || absoluteValue < 1_000 ? 1 : absoluteValue >= 10_000 ? 0 : 1;

  const {
    maximumFractionDigits = inferredMaximumFractionDigits,
    minimumFractionDigits = 0,
  } = options;

  const formatted = new Intl.NumberFormat("en-GB", {
    notation: "compact",
    maximumFractionDigits,
    minimumFractionDigits,
  }).format(value);

  return normalizeCompactNumberSuffix(formatted);
}

export function formatInteger(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatNumber(
  value: number | null | undefined,
  maximumFractionDigits = 2
): string {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits,
  }).format(value);
}

export function formatPercent(
  value: number | null | undefined,
  options: PercentOptions = {}
): string {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) {
    return "—";
  }

  const {
    maximumFractionDigits = 1,
    minimumFractionDigits = 0,
    inputIsFraction = false,
  } = options;

  const normalized = inputIsFraction ? value : value / 100;

  return new Intl.NumberFormat("en-GB", {
    style: "percent",
    maximumFractionDigits,
    minimumFractionDigits,
  }).format(normalized);
}

export function formatSignedPercent(
  value: number | null | undefined,
  options: PercentOptions = {}
): string {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) {
    return "—";
  }

  const formatted = formatPercent(value, options);

  if (formatted === "—") {
    return formatted;
  }

  if (value > 0) {
    return `+${formatted}`;
  }

  return formatted;
}

export function formatDateUtc(
  value: string | Date | null | undefined,
  options: DateTimeOptions = {}
): string {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const { includeTime = false, locale = "en-GB" } = options;

  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "2-digit",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  }).format(date);
}

export function formatIsoDate(value: string | Date | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toISOString().slice(0, 10);
}

export function formatWindowLabel(windowToken: string | null | undefined): string {
  if (!windowToken) {
    return "—";
  }

  if (windowToken === "latest") {
    return "Latest";
  }

  const match = /^(\d+)d$/i.exec(windowToken.trim());

  if (!match) {
    return windowToken;
  }

  return `${match[1]} days`;
}

export function formatDurationDays(days: number | null | undefined): string {
  if (days == null || Number.isNaN(days) || !Number.isFinite(days)) {
    return "—";
  }

  if (days <= 0) {
    return "0 days";
  }

  if (days === 1) {
    return "1 day";
  }

  return `${Math.round(days)} days`;
}

export function formatLast4(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "—";
  }

  return trimmed.slice(-4);
}