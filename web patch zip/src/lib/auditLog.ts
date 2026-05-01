// src/lib/auditLog.ts
import "server-only";

import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export type AuditEventType =
  | "entitlement_forbidden"
  | "auth_failed"
  | "rate_limited"
  | "file_served"
  | "server_error";

export type LatencyBucket =
  | "lt_50ms"
  | "50_200ms"
  | "200_1000ms"
  | "gte_1000ms";

export type AuditLogEntry = {
  ts_utc: string;
  request_id: string;
  event_type: AuditEventType;
  path: string;
  method: string;
  status_code: number;
  latency_bucket: LatencyBucket;
  account_id: string | null;
  key_id: string | null;
  detail: string | null;
  chain: string | null;
  genre: string | null;
  window: string | null;
};

const AUDIT_LOG_DIR_ENV = "AUDIT_LOG_DIR";
const DEFAULT_AUDIT_LOG_DIR = path.join(process.cwd(), ".runtime-logs");
const DEFAULT_AUDIT_LOG_FILE = "audit.log";

function nowUtcIso(): string {
  return new Date().toISOString();
}

export function createRequestId(): string {
  return randomUUID();
}

export function getOrCreateRequestId(headers: Headers): string {
  const headerValue =
    headers.get("x-request-id")?.trim() ||
    headers.get("x-correlation-id")?.trim();

  if (headerValue) {
    return headerValue;
  }

  return createRequestId();
}

export function getLatencyBucket(startedAtMs: number, endedAtMs = Date.now()): LatencyBucket {
  const duration = Math.max(0, endedAtMs - startedAtMs);

  if (duration < 50) return "lt_50ms";
  if (duration < 200) return "50_200ms";
  if (duration < 1000) return "200_1000ms";
  return "gte_1000ms";
}

function sanitizeField(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return trimmed.slice(0, 256);
}

function getAuditLogDir(): string {
  const configured = process.env[AUDIT_LOG_DIR_ENV]?.trim();

  if (configured) {
    return configured;
  }

  return DEFAULT_AUDIT_LOG_DIR;
}

async function appendAuditLine(entry: AuditLogEntry): Promise<void> {
  const line = JSON.stringify(entry) + "\n";
  const dir = getAuditLogDir();
  const filePath = path.join(dir, DEFAULT_AUDIT_LOG_FILE);

  await fs.mkdir(dir, { recursive: true });
  await fs.appendFile(filePath, line, "utf8");
}

function emitAuditConsole(entry: AuditLogEntry): void {
  console.info("[AUDIT]", JSON.stringify(entry));
}

export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  emitAuditConsole(entry);

  try {
    await appendAuditLine(entry);
  } catch {
    // Intentionally do not throw from audit logging.
    // Console output above remains the minimum fallback in serverless/runtime environments.
  }
}

export type AuditLogInput = {
  requestId: string;
  eventType: AuditEventType;
  path: string;
  method: string;
  statusCode: number;
  startedAtMs: number;
  endedAtMs?: number;
  accountId?: string | null;
  keyId?: string | null;
  detail?: string | null;
  chain?: string | null;
  genre?: string | null;
  window?: string | null;
};

export async function logApiEvent(input: AuditLogInput): Promise<void> {
  const entry: AuditLogEntry = {
    ts_utc: nowUtcIso(),
    request_id: input.requestId,
    event_type: input.eventType,
    path: sanitizeField(input.path) ?? "/",
    method: sanitizeField(input.method) ?? "GET",
    status_code: input.statusCode,
    latency_bucket: getLatencyBucket(input.startedAtMs, input.endedAtMs),
    account_id: sanitizeField(input.accountId),
    key_id: sanitizeField(input.keyId),
    detail: sanitizeField(input.detail),
    chain: sanitizeField(input.chain),
    genre: sanitizeField(input.genre),
    window: sanitizeField(input.window),
  };

  await writeAuditLog(entry);
}