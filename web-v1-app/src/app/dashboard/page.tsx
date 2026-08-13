// src/app/dashboard/page.tsx
import { promises as fs } from "fs";
import path from "path";

import { Fragment, type ReactNode } from "react";

import Link from "next/link";

import { CHAIN_LIST, type ChainId } from "@/config/chains";
import ApiKeyManagerClient from "@/components/dashboard/ApiKeyManagerClient";
import { getCurrentAccountView } from "@/lib/auth/account";
import { getPersistedApiKeyDisplayRows } from "@/lib/auth/apiKeys";

type DashboardSubscriptionState = "not_connected" | "inactive" | "active";
type TokenTone = "ok" | "pending" | "quiet" | "blue" | "danger";

const dashboardCss = `
.ua-dashboard-page {
  --urd-border: var(--line2);
  --urd-border-soft: var(--line);
  --urd-panel: transparent;
  --urd-raised: transparent;
  --urd-text-strong: var(--ink);
  --urd-text-body: var(--ink2);
  --urd-text-muted: var(--ink3);
}

.ua-dashboard-page .ua-dashboard-hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  gap: 74px;
  align-items: end;
}

.ua-dashboard-page .ua-dashboard-meta {
  border-top: 1px solid var(--line2);
  display: grid;
  gap: 12px;
  padding-top: 18px;
}

.ua-dashboard-page .ua-dashboard-meta-row {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: 18px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 12px;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink2);
}

.ua-dashboard-page .ua-dashboard-meta-row strong {
  color: var(--gold);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.ua-dashboard-page .ua-dashboard-section-grid {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 64px;
  align-items: start;
}

.ua-dashboard-page .ua-dashboard-note {
  margin-top: 16px;
  font-family: var(--mono);
  font-size: 11px;
  line-height: 1.72;
  color: var(--ink3);
}

.ua-dashboard-page .ua-dashboard-data-stack {
  border-top: 1px solid var(--line);
}

.ua-dashboard-page .ua-dashboard-data-row {
  grid-template-columns: 190px minmax(0, 1fr) auto;
  gap: 28px;
}

.ua-dashboard-page .ua-dashboard-label {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: var(--gold);
}

.ua-dashboard-page .ua-dashboard-value {
  color: var(--ink);
  font-size: 15px;
}

.ua-dashboard-page .ua-dashboard-detail {
  margin-top: 3px;
  max-width: 680px;
  color: var(--ink2);
  font-size: 13px;
  line-height: 1.7;
}

.ua-dashboard-page .ua-dashboard-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.ua-dashboard-page .ua-dashboard-window-list {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  border-top: 1px solid var(--line);
  padding: 18px 0 2px;
}

.ua-dashboard-page .ua-dashboard-window {
  border-bottom: 2px solid var(--gold);
  color: var(--ink);
  font-family: var(--mono);
  font-size: 13px;
  padding-bottom: 4px;
}

.ua-dashboard-page .ua-dashboard-endpoint {
  border-top: 1px solid var(--line);
  color: var(--ink2);
  font-family: var(--mono);
  font-size: 12px;
  overflow-wrap: anywhere;
  padding: 18px 0;
}

.ua-dashboard-page .ua-dashboard-endpoint:last-child {
  border-bottom: 1px solid var(--line);
}

.ua-dashboard-page .ua-dashboard-endpoint span {
  color: var(--gold2);
}

.ua-dashboard-page .ua-dashboard-api-keys > section {
  background: transparent !important;
  border-left: 0 !important;
  border-right: 0 !important;
  border-radius: 0 !important;
  border-color: var(--line) !important;
  box-shadow: none !important;
  padding: 0 !important;
}

.ua-dashboard-page .ua-dashboard-api-keys form,
.ua-dashboard-page .ua-dashboard-api-keys [class*="rounded-3xl"],
.ua-dashboard-page .ua-dashboard-api-keys [class*="rounded-2xl"],
.ua-dashboard-page .ua-dashboard-api-keys [class*="rounded-xl"] {
  background: transparent !important;
  border-left: 0 !important;
  border-right: 0 !important;
  border-radius: 0 !important;
  border-color: var(--line) !important;
  box-shadow: none !important;
}

.ua-dashboard-page .ua-dashboard-api-keys h2 {
  color: var(--gold) !important;
  font-family: var(--mono) !important;
  font-size: 10px !important;
  font-weight: 500 !important;
  letter-spacing: .16em !important;
  line-height: 1.6 !important;
  text-transform: uppercase !important;
}

.ua-dashboard-page .ua-dashboard-api-keys p,
.ua-dashboard-page .ua-dashboard-api-keys li,
.ua-dashboard-page .ua-dashboard-api-keys label,
.ua-dashboard-page .ua-dashboard-api-keys div {
  color: inherit;
}

.ua-dashboard-page .ua-dashboard-api-keys input {
  background: var(--surface0) !important;
  border-color: var(--line2) !important;
  border-radius: var(--radius-sm) !important;
  color: var(--ink) !important;
}

.ua-dashboard-page .ua-dashboard-api-keys input::placeholder {
  color: var(--ink3) !important;
}

.ua-dashboard-page .ua-dashboard-api-keys button:not(:disabled) {
  background: var(--gold) !important;
  border-color: var(--gold) !important;
  border-radius: var(--radius-sm) !important;
  color: var(--surface0) !important;
}

.ua-dashboard-page .ua-dashboard-api-keys button:not(:disabled):hover {
  background: var(--gold2) !important;
  border-color: var(--gold2) !important;
}

@media (max-width: 880px) {
  .ua-dashboard-page .ua-dashboard-hero-grid,
  .ua-dashboard-page .ua-dashboard-section-grid,
  .ua-dashboard-page .ua-dashboard-data-row,
  .ua-dashboard-page .ua-dashboard-meta-row {
    grid-template-columns: 1fr;
  }

  .ua-dashboard-page .ua-dashboard-hero-grid,
  .ua-dashboard-page .ua-dashboard-section-grid {
    gap: 28px;
  }

  .ua-dashboard-page .ua-dashboard-data-row {
    gap: 7px;
  }

  .ua-dashboard-page .regime-token {
    justify-self: start;
  }
}
`;

type DashboardAuditLogEntry = {
  ts_utc: string;
  event_type: string;
  path: string;
  method: string;
  status_code: number;
  latency_bucket: string;
  account_id: string | null;
  key_id: string | null;
  detail: string | null;
  chain: string | null;
  genre: string | null;
  window: string | null;
};

type DashboardUsageEventRow = {
  id: string;
  label: string;
  detail: string;
  status: string;
  tone: TokenTone;
};

type DashboardUsageSummaryRow = {
  label: string;
  detail: string;
  token: string;
  tone: TokenTone;
};

type DashboardUsageSummary = {
  dailyQuotaLabel: string;
  dailyQuotaDetail: string;
  dailyQuotaToken: string;
  dailyQuotaTone: TokenTone;
  rateLimitLabel: string;
  rateLimitDetail: string;
  latestRequestLabel: string;
  latestRequestDetail: string;
  latestRequestTone: TokenTone;
  lastKeyUseLabel: string;
  lastKeyUseDetail: string;
  statusRows: DashboardUsageSummaryRow[];
  recentEvents: DashboardUsageEventRow[];
};

const DEFAULT_AUDIT_LOG_DIR = path.join(process.cwd(), ".runtime-logs");
const DEFAULT_AUDIT_LOG_FILE = "audit.log";
const RECENT_USAGE_EVENT_LIMIT = 5;
const RECENT_USAGE_READ_LIMIT = 5_000;

function numericEnv(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? "", 10);

  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.floor(value);
}

function quotaLimitForTier(tier: "public" | "basic" | "pro"): number {
  if (tier === "pro") return numericEnv("PRO_DAILY_API_QUOTA", 5_000);
  if (tier === "basic") return numericEnv("BASIC_DAILY_API_QUOTA", 500);
  return 0;
}

function perMinuteLimitForTier(tier: "public" | "basic" | "pro"): number {
  if (tier === "pro") return 300;
  if (tier === "basic") return 60;
  return 0;
}

function currentUtcDayPrefix(): string {
  return new Date().toISOString().slice(0, 10);
}

function getAuditLogPath(): string {
  const configured = process.env.AUDIT_LOG_DIR?.trim();
  const dir = configured || DEFAULT_AUDIT_LOG_DIR;

  return path.join(dir, DEFAULT_AUDIT_LOG_FILE);
}

function parseAuditLogLine(line: string): DashboardAuditLogEntry | null {
  if (!line.trim()) return null;

  try {
    const parsed = JSON.parse(line) as Partial<DashboardAuditLogEntry>;

    if (
      typeof parsed.ts_utc !== "string" ||
      typeof parsed.event_type !== "string" ||
      typeof parsed.path !== "string" ||
      typeof parsed.method !== "string" ||
      typeof parsed.status_code !== "number"
    ) {
      return null;
    }

    return {
      ts_utc: parsed.ts_utc,
      event_type: parsed.event_type,
      path: parsed.path,
      method: parsed.method,
      status_code: parsed.status_code,
      latency_bucket:
        typeof parsed.latency_bucket === "string" ? parsed.latency_bucket : "unknown",
      account_id: typeof parsed.account_id === "string" ? parsed.account_id : null,
      key_id: typeof parsed.key_id === "string" ? parsed.key_id : null,
      detail: typeof parsed.detail === "string" ? parsed.detail : null,
      chain: typeof parsed.chain === "string" ? parsed.chain : null,
      genre: typeof parsed.genre === "string" ? parsed.genre : null,
      window: typeof parsed.window === "string" ? parsed.window : null,
    };
  } catch {
    return null;
  }
}

function eventTone(eventType: string, statusCode: number): TokenTone {
  if (statusCode >= 500 || eventType === "server_error") return "danger";
  if (statusCode === 429 || eventType === "rate_limited") return "danger";
  if (statusCode === 401 || statusCode === 403 || eventType === "auth_failed") return "pending";
  if (statusCode >= 200 && statusCode < 300) return "ok";
  return "quiet";
}

function eventLabel(eventType: string): string {
  return eventType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusSummaryLabel(eventType: string, statusCode: number): string {
  return `${eventLabel(eventType)} (${statusCode})`;
}

function latestKeyUse(apiKeys: Array<{ lastUsedAt: string | null }>): string | null {
  const timestamps = apiKeys
    .map((key) => key.lastUsedAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) return null;

  return new Date(Math.max(...timestamps)).toISOString();
}

async function loadAccountAuditEvents(accountId: string | null): Promise<DashboardAuditLogEntry[]> {
  if (!accountId) return [];

  try {
    const raw = await fs.readFile(getAuditLogPath(), "utf8");
    const lines = raw.split(/\r?\n/).slice(-RECENT_USAGE_READ_LIMIT);

    return lines
      .map(parseAuditLogLine)
      .filter((entry): entry is DashboardAuditLogEntry => Boolean(entry))
      .filter((entry) => entry.account_id === accountId)
      .sort((a, b) => new Date(b.ts_utc).getTime() - new Date(a.ts_utc).getTime());
  } catch {
    return [];
  }
}

async function buildDashboardUsageSummary(params: {
  accountId: string | null;
  tier: "public" | "basic" | "pro";
  status: "active" | "inactive";
  apiKeys: Array<{ lastUsedAt: string | null }>;
}): Promise<DashboardUsageSummary> {
  const quotaLimit = quotaLimitForTier(params.tier);
  const perMinuteLimit = perMinuteLimitForTier(params.tier);
  const active = params.status === "active" && params.tier !== "public";
  const auditEvents = await loadAccountAuditEvents(params.accountId);
  const today = currentUtcDayPrefix();
  const todayEvents = auditEvents.filter((event) => event.ts_utc.startsWith(today));
  const quotaRemaining = quotaLimit > 0 ? Math.max(0, quotaLimit - todayEvents.length) : 0;
  const latestEvent = auditEvents[0] ?? null;
  const lastKeyUseAt = latestKeyUse(params.apiKeys);

  const statusCounts = new Map<string, { count: number; eventType: string; statusCode: number }>();

  for (const event of auditEvents.slice(0, 100)) {
    const key = `${event.event_type}:${event.status_code}`;
    const existing = statusCounts.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      statusCounts.set(key, {
        count: 1,
        eventType: event.event_type,
        statusCode: event.status_code,
      });
    }
  }

  const statusRows = [...statusCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map((row) => ({
      label: statusSummaryLabel(row.eventType, row.statusCode),
      detail: `${row.count} recent recorded event${row.count === 1 ? "" : "s"} for this account.`,
      token: String(row.count),
      tone: eventTone(row.eventType, row.statusCode),
    }));

  return {
    dailyQuotaLabel: active
      ? `${todayEvents.length} recorded today / ${quotaLimit} daily allowance`
      : "No active delivery quota",
    dailyQuotaDetail: active
      ? `Remaining today: ${quotaRemaining}. Per-request response headers remain the source of truth for current quota state.`
      : "Daily quota applies after an active paid entitlement is linked to this account.",
    dailyQuotaToken: active ? `${quotaRemaining} left` : "inactive",
    dailyQuotaTone: !active ? "quiet" : quotaRemaining > 0 ? "ok" : "danger",
    rateLimitLabel: active
      ? `${perMinuteLimit} authenticated file requests per minute`
      : "No active rate-limit tier",
    rateLimitDetail: active
      ? "Rate-limit and daily quota enforcement happen server-side before file delivery."
      : "Rate-limit tier becomes active with a paid entitlement.",
    latestRequestLabel: latestEvent
      ? statusSummaryLabel(latestEvent.event_type, latestEvent.status_code)
      : "No recent recorded API requests",
    latestRequestDetail: latestEvent
      ? `${formatDateTime(latestEvent.ts_utc)} Â· ${latestEvent.method} ${latestEvent.path}`
      : "The dashboard only reads safe operational metadata. Full API key values are never shown here.",
    latestRequestTone: latestEvent ? eventTone(latestEvent.event_type, latestEvent.status_code) : "quiet",
    lastKeyUseLabel: lastKeyUseAt ? formatDateTime(lastKeyUseAt) : "No recorded key use",
    lastKeyUseDetail: "Derived from the persisted key metadata already shown in the key lifecycle section.",
    statusRows,
    recentEvents: auditEvents.slice(0, RECENT_USAGE_EVENT_LIMIT).map((event) => ({
      id: `${event.ts_utc}:${event.event_type}:${event.status_code}:${event.path}`,
      label: `${event.method} ${event.path}`,
      detail: `${formatDateTime(event.ts_utc)} Â· ${event.latency_bucket}${
        event.chain || event.genre || event.window
          ? ` Â· ${[event.chain, event.genre, event.window].filter(Boolean).join(" / ")}`
          : ""
      }`,
      status: statusSummaryLabel(event.event_type, event.status_code),
      tone: eventTone(event.event_type, event.status_code),
    })),
  };
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function capabilityRows() {
  return [
    {
      tier: "Basic",
      chains: "1 entitled chain",
      windows: "latest, 7d, 30d, 90d",
      history: "90 days",
      custom: "No",
    },
    {
      tier: "Pro",
      chains: "All 4 chains",
      windows: "latest, 7d, 30d, 90d, 180d, 365d",
      history: "365 days",
      custom: "Yes",
    },
  ];
}

type DashboardEndpointExample = {
  label: string;
  path: string;
  detail: string;
};

function deliveryChainIds(params: {
  tier: "public" | "basic" | "pro";
  entitledChain: string | null | undefined;
}): ChainId[] {
  if (params.tier === "pro") {
    return CHAIN_LIST.map((chain) => chain.id);
  }

  if (
    params.tier === "basic" &&
    params.entitledChain &&
    CHAIN_LIST.some((chain) => chain.id === params.entitledChain)
  ) {
    return [params.entitledChain as ChainId];
  }

  return [];
}

function dashboardEndpointReferenceNote(params: {
  tier: "public" | "basic" | "pro";
  status: "active" | "inactive";
}) {
  if (params.tier === "public" || params.status !== "active") {
    return "Endpoint examples appear after an active subscription is linked to this account. Entitlement enforcement remains server-side on the authenticated file route.";
  }

  if (params.tier === "pro") {
    return "Examples are generated from this account's active Pro entitlement: all supported chains and delivery windows up to 365d.";
  }

  return "Examples are generated from this account's active Basic entitlement: the selected chain and delivery windows up to 90d.";
}

function dashboardEndpointExamples(params: {
  tier: "public" | "basic" | "pro";
  entitledChain: string | null | undefined;
  maxWindowDays: number;
}): DashboardEndpointExample[] {
  const chains = deliveryChainIds({
    tier: params.tier,
    entitledChain: params.entitledChain,
  });

  const primaryChain = chains[0];

  if (!primaryChain) {
    return [];
  }

  const examples: DashboardEndpointExample[] = [
    {
      label: "Latest Meta",
      path: `/api/v1/files/meta/${primaryChain}/latest.json`,
      detail: "Current Meta snapshot for this account's entitled delivery scope.",
    },
    {
      label: "90-day Derived",
      path: `/api/v1/files/derived/${primaryChain}/90d/latest.json`,
      detail: "90-day Derived window within the active subscription boundary.",
    },
  ];

  if (params.maxWindowDays >= 180) {
    examples.push({
      label: "180-day Meta",
      path: `/api/v1/files/meta/${primaryChain}/180d/latest.json`,
      detail: "Pro-only 180-day Meta window for the current entitlement.",
    });
  }

  if (params.maxWindowDays >= 365) {
    examples.push({
      label: "365-day Gold",
      path: `/api/v1/files/gold/${primaryChain}/365d/latest.json`,
      detail: "Pro-only 365-day Gold window for the current entitlement.",
    });
  }

  if (params.tier === "pro") {
    const secondaryChain = chains.find((chain) => chain !== primaryChain);

    if (secondaryChain) {
      examples.push({
        label: "Second chain latest",
        path: `/api/v1/files/meta/${secondaryChain}/latest.json`,
        detail: "Pro keys can use the same API key across all supported chains.",
      });
    }
  }

  return examples.slice(0, 4);
}

function deriveSubscriptionState(params: {
  authConfigured: boolean;
  isAuthenticated: boolean;
  tier: "public" | "basic" | "pro";
  status: "active" | "inactive";
}): DashboardSubscriptionState {
  if (!params.authConfigured) return "not_connected";
  if (!params.isAuthenticated) return "inactive";
  if (params.tier === "public") return "inactive";
  if (params.status !== "active") return "inactive";
  return "active";
}

function deriveLifecycleState(params: {
  authConfigured: boolean;
  isAuthenticated: boolean;
  accountId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  tier: "public" | "basic" | "pro";
  status: "active" | "inactive";
}) {
  if (!params.authConfigured) {
    return {
      label: "Auth not configured",
      detail:
        "Identity provider keys are not configured yet, so the subscriber lifecycle is only partially enabled.",
    };
  }

  if (!params.isAuthenticated) {
    return {
      label: "No authenticated session",
      detail:
        "The route is rendering safely, but there is no signed-in subscriber session attached to this request.",
    };
  }

  if (!params.accountId) {
    return {
      label: "Authenticated, account mapping incomplete",
      detail:
        "A signed-in user exists, but no linked subscriber account record is currently attached.",
    };
  }

  if (!params.stripeCustomerId || !params.stripeSubscriptionId) {
    return {
      label: "Account connected, billing incomplete",
      detail:
        "The subscriber account is present, but Stripe customer/subscription linkage is not fully connected yet.",
    };
  }

  if (params.tier === "public" || params.status !== "active") {
    return {
      label: "Connected, inactive entitlement",
      detail:
        "The account is linked, but active delivery entitlement is not currently available.",
    };
  }

  return {
    label: "Connected, active entitlement",
    detail:
      "The account, billing linkage, and entitlement snapshot are present for authenticated delivery scope.",
  };
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "â€”";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function tokenToneForState(status: DashboardSubscriptionState): TokenTone {
  if (status === "active") return "ok";
  if (status === "inactive") return "pending";
  return "quiet";
}

function tokenClass(tone: TokenTone) {
  return cx(
    "regime-token justify-self-end whitespace-nowrap",
    tone === "ok" && "label-stable",
    tone === "pending" && "label-heating",
    tone === "blue" && "label-cheap",
    tone === "danger" && "label-congested",
    tone === "quiet" && "label-unknown",
  );
}

function Token({ children, tone }: { children: ReactNode; tone: TokenTone }) {
  return <span className={tokenClass(tone)}>{children}</span>;
}

function boolToken(value: boolean, yes = "yes", no = "no") {
  return <Token tone={value ? "ok" : "quiet"}>{value ? yes : no}</Token>;
}

function Section({
  eyebrow,
  title,
  note,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  note: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section">
      <div className="page-shell ua-dashboard-section-grid">
        <aside>
          <div className="eyebrow">{eyebrow}</div>
          <h2 className="mt-3">{title}</h2>
          <p className="ua-dashboard-note">{note}</p>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

function DataStack({ children }: { children: ReactNode }) {
  return <div className="ua-dashboard-data-stack">{children}</div>;
}

function DataRow({
  label,
  value,
  detail,
  token,
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  token?: ReactNode;
}) {
  return (
    <div className="data-row ua-dashboard-data-row">
      <div className="ua-dashboard-label">{label}</div>
      <div className="min-w-0">
        <div className="ua-dashboard-value">{value}</div>
        {detail ? <p className="ua-dashboard-detail">{detail}</p> : null}
      </div>
      {token ? token : null}
    </div>
  );
}

function GoldLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="btn-primary">
      {children}
    </Link>
  );
}

function GoldSubmitButton({ children }: { children: ReactNode }) {
  return (
    <button type="submit" className="btn-primary">
      {children}
    </button>
  );
}

function CodePath({ children }: { children: ReactNode }) {
  return <code className="code-block inline-block px-2 py-1">{children}</code>;
}

export default async function DashboardPage() {
  const accountView = await getCurrentAccountView();
  const apiKeys = await getPersistedApiKeyDisplayRows(
    accountView.account?.accountId ?? null,
  );

  const usageSummary = await buildDashboardUsageSummary({
    accountId: accountView.account?.accountId ?? null,
    tier: accountView.snapshot.tier,
    status: accountView.snapshot.status,
    apiKeys,
  });

  const subscriptionState = deriveSubscriptionState({
    authConfigured: accountView.authConfigured,
    isAuthenticated: accountView.isAuthenticated,
    tier: accountView.snapshot.tier,
    status: accountView.snapshot.status,
  });

  const lifecycleState = deriveLifecycleState({
    authConfigured: accountView.authConfigured,
    isAuthenticated: accountView.isAuthenticated,
    accountId: accountView.account?.accountId ?? null,
    stripeCustomerId: accountView.account?.stripeCustomerId ?? null,
    stripeSubscriptionId: accountView.account?.stripeSubscriptionId ?? null,
    tier: accountView.snapshot.tier,
    status: accountView.snapshot.status,
  });

  const entitledChain =
    accountView.snapshot.tier === "pro"
      ? "All chains"
      : accountView.snapshot.entitledChain ?? "Not set";

  const maxWindow =
    accountView.snapshot.maxWindowDays > 0
      ? `${accountView.snapshot.maxWindowDays}d`
      : "Not set";

  const hasBillingPortalAccess = Boolean(accountView.account?.stripeCustomerId);

  const allowedWindows = [
    accountView.snapshot.maxWindowDays >= 0 ? "latest" : null,
    accountView.snapshot.maxWindowDays >= 7 ? "7d" : null,
    accountView.snapshot.maxWindowDays >= 30 ? "30d" : null,
    accountView.snapshot.maxWindowDays >= 90 ? "90d" : null,
    accountView.snapshot.maxWindowDays >= 180 ? "180d" : null,
    accountView.snapshot.maxWindowDays >= 365 ? "365d" : null,
  ].filter((value): value is string => !!value);

  const endpointExamples = dashboardEndpointExamples({
    tier: accountView.snapshot.tier,
    entitledChain: accountView.snapshot.entitledChain,
    maxWindowDays: accountView.snapshot.maxWindowDays,
  });

  const endpointReferenceNote = dashboardEndpointReferenceNote({
    tier: accountView.snapshot.tier,
    status: accountView.snapshot.status,
  });

  if (accountView.authConfigured && !accountView.isAuthenticated) {
    return (
      <main className="ua-page ua-dashboard-page min-h-screen bg-background text-foreground">
        <style dangerouslySetInnerHTML={{ __html: dashboardCss }} />

        <header className="hero border-b border-[var(--line)]">
          <div className="page-shell ua-dashboard-hero-grid">
            <div>
              <div className="eyebrow">Subscriber area</div>
              <h1 className="mt-5 max-w-5xl">
                Dashboard<br />
                <em>Sign in to see your account</em>
              </h1>
              <p className="lead mt-6">
                The dashboard is the subscriber control surface for account state,
                API keys, entitlement-aware JSON delivery, and billing context.
              </p>
              <div className="ua-dashboard-actions">
                <GoldLink href="/sign-in">Sign in</GoldLink>
                <GoldLink href="/api-docs">Read API docs</GoldLink>
              </div>
            </div>

            <div className="ua-dashboard-meta" aria-label="Dashboard access summary">
              <div className="ua-dashboard-meta-row">
                <strong>Access</strong>
                <span>Authentication required</span>
              </div>
              <div className="ua-dashboard-meta-row">
                <strong>Surface</strong>
                <span>Subscriber account, API keys, billing portal</span>
              </div>
              <div className="ua-dashboard-meta-row">
                <strong>Boundary</strong>
                <span>Public methodology and status pages remain available without sign-in.</span>
              </div>
            </div>
          </div>
        </header>

        <Section
          eyebrow="01 / Access"
          title="Sign in first"
          note="Account-specific delivery controls are shown only after an authenticated session is present."
        >
          <DataStack>
            <DataRow
              label="Session"
              value="No authenticated session"
              detail="Once signed in, this page shows your plan, entitled chains, history depth, allowed delivery windows, API keys, and billing linkage state."
              token={<Token tone="pending">required</Token>}
            />
            <DataRow
              label="Public resources"
              value="Documentation remains available"
              detail="Methodology, thresholds, status, and API documentation can still be read without account access."
              token={<Token tone="ok">open</Token>}
            />
          </DataStack>

          <div className="ua-dashboard-actions">
            <GoldLink href="/status">Public status</GoldLink>
            <GoldLink href="/methodology">Methodology</GoldLink>
            <GoldLink href="/thresholds">Threshold simulator</GoldLink>
          </div>
        </Section>
      </main>
    );
  }

  return (
    <main className="ua-page ua-dashboard-page min-h-screen bg-background text-foreground">
      <style dangerouslySetInnerHTML={{ __html: dashboardCss }} />

      <header className="hero border-b border-[var(--line)]">
        <div className="page-shell ua-dashboard-hero-grid">
          <div>
            <div className="eyebrow">Subscriber area</div>
            <h1 className="mt-5 max-w-5xl">
              Dashboard<br />
              <em>as delivery state</em>.
            </h1>
            <p className="lead mt-6">
              Account, entitlement, API-key, and billing context for authenticated JSON delivery.
              No decorative control panels; just the current subscriber state expressed in the same
              calm data-language as the public reference pages.
            </p>
            <div className="ua-dashboard-actions">
              <GoldLink href="/api-docs">Read API docs</GoldLink>
              <GoldLink href="/status">Public status</GoldLink>
            </div>
          </div>

          <div className="ua-dashboard-meta" aria-label="Current account summary">
            <div className="ua-dashboard-meta-row">
              <strong>Lifecycle</strong>
              <span>{lifecycleState.label}</span>
            </div>
            <div className="ua-dashboard-meta-row">
              <strong>Plan</strong>
              <span>{accountView.tierLabel}</span>
            </div>
            <div className="ua-dashboard-meta-row">
              <strong>Delivery</strong>
              <span>Gold, Derived, Meta, and Briefs JSON</span>
            </div>
            <div className="ua-dashboard-meta-row">
              <strong>Boundary</strong>
              <span>Subscriber surface; public method pages remain separate.</span>
            </div>
          </div>
        </div>
      </header>

      {!accountView.authConfigured ? (
        <Section
          eyebrow="Environment"
          title="Dashboard shell"
          note="This state is expected only before identity keys are connected in an environment."
        >
          <DataStack>
            <DataRow
              label="Auth configured"
              value="Clerk environment variables are not configured yet"
              detail="The route renders safely during development before identity is connected. Once Clerk keys are configured, this route becomes the authenticated subscriber area."
              token={<Token tone="pending">partial</Token>}
            />
          </DataStack>
        </Section>
      ) : null}

      <Section
        eyebrow="01 / Lifecycle"
        title="Account state"
        note="Identity, account mapping, billing linkage, and entitlement readiness."
      >
        <DataStack>
          <DataRow
            label="Status"
            value={lifecycleState.label}
            detail={lifecycleState.detail}
            token={
              <Token tone={tokenToneForState(subscriptionState)}>
                {subscriptionState.replace("_", " ")}
              </Token>
            }
          />
          <DataRow
            label="Auth configured"
            value="Identity provider configuration"
            detail="The dashboard checks whether the identity provider keys are available for the current environment."
            token={boolToken(accountView.authConfigured)}
          />
          <DataRow
            label="Session"
            value="Authenticated user session"
            detail="Server-side account state can be resolved for this request only when the user is signed in."
            token={boolToken(accountView.isAuthenticated, "active", "none")}
          />
          <DataRow
            label="Account mapping"
            value={accountView.account?.accountId ?? "No linked account"}
            detail="This account ID is the server-side link between authentication, billing, API keys, and file delivery."
            token={boolToken(!!accountView.account?.accountId, "linked", "missing")}
          />
          <DataRow
            label="Billing linkage"
            value={
              accountView.account?.stripeCustomerId && accountView.account?.stripeSubscriptionId
                ? "Stripe customer and subscription linked"
                : "Billing linkage incomplete"
            }
            detail="Stripe remains the billing source of truth; Urd Atlas mirrors subscription state through webhook-synced entitlements."
            token={boolToken(
              !!accountView.account?.stripeCustomerId &&
                !!accountView.account?.stripeSubscriptionId,
              "linked",
              "pending",
            )}
          />
        </DataStack>
      </Section>

      <Section
        eyebrow="02 / Entitlement"
        title="Delivery scope"
        note="The same entitlement snapshot should govern dashboard display and authenticated JSON access."
      >
        <DataStack>
          <DataRow
            label="Tier"
            value={accountView.tierLabel}
            detail="Plan tier currently reflected by the server-side account snapshot."
            token={<Token tone={subscriptionState === "active" ? "ok" : "pending"}>{accountView.snapshot.status}</Token>}
          />
          <DataRow
            label="Entitled chain"
            value={entitledChain}
            detail="Basic accounts are scoped to one chain; Pro accounts cover all four chains."
            token={<Token tone={accountView.snapshot.allowedChains.length > 0 ? "ok" : "quiet"}>{accountView.entitledChainLabel}</Token>}
          />
          <DataRow
            label="History depth"
            value={accountView.historyDepthLabel}
            detail="Accessible historical window from the authenticated delivery endpoint."
            token={<Token tone={accountView.snapshot.maxWindowDays > 0 ? "blue" : "quiet"}>{maxWindow}</Token>}
          />
          <DataRow
            label="API keys"
            value={`${apiKeys.length} linked to account`}
            detail="Only partial identifiers are shown after creation; the full secret is displayed once."
            token={<Token tone={apiKeys.length > 0 ? "ok" : "pending"}>{apiKeys.length}</Token>}
          />
        </DataStack>

        <div className="ua-dashboard-window-list" aria-label="Allowed delivery windows">
          {allowedWindows.length > 0 ? (
            allowedWindows.map((window) => (
              <span key={window} className="ua-dashboard-window">
                {window}
              </span>
            ))
          ) : (
            <span className="ua-dashboard-window">No windows currently available</span>
          )}
        </div>
      </Section>

      <Section
        eyebrow="03 / Chains"
        title="Entitled chains"
        note="Chain access is displayed as rows because this is account state rather than marketing content."
      >
        <DataStack>
          {CHAIN_LIST.map((chain) => {
            const entitled = accountView.snapshot.allowedChains.includes(chain.id);
            return (
              <Fragment key={chain.id}>
                <DataRow
                  label={chain.name}
                  value={
                    <span className="inline-flex items-center gap-3">
                      <span aria-hidden="true" className="text-[var(--gold2)]">
                        {chain.icon}
                      </span>
                      <span>{chain.name}</span>
                    </span>
                  }
                  detail={
                    entitled
                      ? "Gold, Derived, Meta, and Briefs JSON delivery is enabled for this chain."
                      : "This chain is outside the current entitlement scope."
                  }
                  token={<Token tone={entitled ? "ok" : "quiet"}>{entitled ? "enabled" : "not included"}</Token>}
                />
              </Fragment>
            );
          })}
        </DataStack>
      </Section>

      <Section
        eyebrow="04 / API keys"
        title="Key lifecycle"
        note="Create, rotate, and revoke delivery keys for authenticated JSON access."
      >
        <div className="ua-dashboard-api-keys">
          <ApiKeyManagerClient
            authConfigured={accountView.authConfigured}
            isAuthenticated={accountView.isAuthenticated}
            hasLinkedAccount={!!accountView.account?.accountId}
            subscriptionActive={subscriptionState === "active"}
            initialKeys={apiKeys.map((keyRow) => ({
              id: keyRow.id,
              label: keyRow.label,
              prefix: keyRow.prefix,
              last4: keyRow.last4,
              status:
                keyRow.status === "active" ||
                keyRow.status === "suspended" ||
                keyRow.status === "revoked"
                  ? keyRow.status
                  : "revoked",
              createdAt: keyRow.createdAt,
              lastUsedAt: keyRow.lastUsedAt,
              tier: keyRow.tier,
              entitledChain: keyRow.entitledChain,
              maxWindowDays: keyRow.maxWindowDays,
            }))}
          />
        </div>
      </Section>

      <Section
        eyebrow="05 / Usage"
        title="Usage and limits"
        note="Safe operational metadata for authenticated JSON delivery: recorded usage, daily quota, rate-limit tier, last key use, and recent request outcomes."
      >
        <DataStack>
          <DataRow
            label="Daily quota"
            value={usageSummary.dailyQuotaLabel}
            detail={usageSummary.dailyQuotaDetail}
            token={<Token tone={usageSummary.dailyQuotaTone}>{usageSummary.dailyQuotaToken}</Token>}
          />
          <DataRow
            label="Rate-limit tier"
            value={usageSummary.rateLimitLabel}
            detail={usageSummary.rateLimitDetail}
            token={<Token tone={subscriptionState === "active" ? "blue" : "quiet"}>{accountView.tierLabel}</Token>}
          />
          <DataRow
            label="Last key use"
            value={usageSummary.lastKeyUseLabel}
            detail={usageSummary.lastKeyUseDetail}
            token={<Token tone={usageSummary.lastKeyUseLabel === "No recorded key use" ? "quiet" : "ok"}>last used</Token>}
          />
          <DataRow
            label="Latest request"
            value={usageSummary.latestRequestLabel}
            detail={usageSummary.latestRequestDetail}
            token={<Token tone={usageSummary.latestRequestTone}>latest</Token>}
          />
        </DataStack>

        <div className="mt-6">
          {usageSummary.statusRows.length > 0 ? (
            <DataStack>
              {usageSummary.statusRows.map((row) => (
                <DataRow
                  key={row.label}
                  label={row.label}
                  value={row.detail}
                  token={<Token tone={row.tone}>{row.token}</Token>}
                />
              ))}
            </DataStack>
          ) : (
            <div className="ua-dashboard-endpoint">
              <span>No recent request summary</span>
              <p className="ua-dashboard-detail">
                Recent request status appears after authenticated file delivery has recorded events for this account.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6">
          {usageSummary.recentEvents.length > 0 ? (
            usageSummary.recentEvents.map((event) => (
              <div key={event.id} className="ua-dashboard-endpoint">
                <span>{event.status}</span> {event.label}
                <p className="ua-dashboard-detail">{event.detail}</p>
              </div>
            ))
          ) : (
            <div className="ua-dashboard-endpoint">
              <span>No recent requests</span>
              <p className="ua-dashboard-detail">
                Only safe request metadata is summarized here. Full delivery key values are never displayed.
              </p>
            </div>
          )}
        </div>
      </Section>
      <Section
        eyebrow="06 / Billing"
        title="Manage subscription"
        note="Subscription cancellation, upgrades, payment methods, and invoices should stay self-serve through Stripe Customer Portal."
      >
        <DataStack>
          <DataRow
            label="Portal access"
            value={hasBillingPortalAccess ? "Stripe Customer Portal available" : "Stripe Customer Portal not available yet"}
            detail={
              hasBillingPortalAccess
                ? "Opening subscription management sends you to Stripe's hosted portal. Cancellation, plan changes, payment-method changes, and invoices happen there."
                : "Billing management becomes available after checkout has created and linked a Stripe customer for this account."
            }
            token={<Token tone={hasBillingPortalAccess ? "ok" : "pending"}>{hasBillingPortalAccess ? "available" : "pending"}</Token>}
          />
          <DataRow
            label="Billing source"
            value="Stripe remains source of truth"
            detail="Urd Atlas mirrors subscription status from Stripe through webhook-synced entitlements."
            token={<Token tone="blue">webhook synced</Token>}
          />
          <DataRow
            label="Current period end"
            value={formatDateTime(accountView.account?.currentPeriodEnd)}
            detail="Displayed when Stripe has supplied a current subscription period end for the account."
            token={<Token tone={accountView.account?.currentPeriodEnd ? "blue" : "quiet"}>{accountView.account?.currentPeriodEnd ? "set" : "not set"}</Token>}
          />
        </DataStack>

        <div className="ua-dashboard-actions">
          {hasBillingPortalAccess ? (
            <form action="/api/v1/checkout/portal" method="post">
              <GoldSubmitButton>Manage subscription</GoldSubmitButton>
            </form>
          ) : (
            <GoldLink href="/#plans">Choose a plan</GoldLink>
          )}
        </div>
      </Section>

      <Section
        eyebrow="07 / Plan matrix"
        title="Capability reference"
        note="A compact reference for how entitlement scope maps to delivery windows and history depth."
      >
        <DataStack>
          {capabilityRows().map((row) => (
            <Fragment key={row.tier}>
              <DataRow
                label={row.tier}
                value={`${row.chains} Â· ${row.history}`}
                detail={`Windows: ${row.windows}. Custom outputs: ${row.custom}.`}
                token={<Token tone={row.tier === accountView.tierLabel ? "ok" : "quiet"}>{row.tier === accountView.tierLabel ? "current" : "reference"}</Token>}
              />
            </Fragment>
          ))}
        </DataStack>
      </Section>

      <Section
        eyebrow="08 / Delivery paths"
        title="Endpoint reference"
        note={endpointReferenceNote}
      >
        <div>
          {endpointExamples.length > 0 ? (
            endpointExamples.map((example) => (
              <div key={example.path} className="ua-dashboard-endpoint">
                <span>GET</span> {example.path}
                <p className="ua-dashboard-detail">{example.detail}</p>
              </div>
            ))
          ) : (
            <div className="ua-dashboard-endpoint">
              <span>Pending</span> Active subscription required before account-specific examples can be shown.
            </div>
          )}
        </div>

        <div className="mt-6 space-y-3 text-sm leading-7 text-[var(--ink2)]">
          <p>
            Header for these examples: <CodePath>X-API-Key: your_active_dashboard_key</CodePath>
          </p>
          <p>
            Examples only. Entitlement enforcement remains server-side on the authenticated file route. Dashboard endpoint examples state that server-side entitlement enforcement remains authoritative. Delivery validation still enforces chain entitlement, window depth, and subscription state.
            Forbidden scope should return 403 rather than pretending the file does not exist.
          </p>
        </div>

        <div className="ua-dashboard-actions">
          <GoldLink href="/api-docs/schema">Schema reference</GoldLink>
          <GoldLink href="/api-docs/workflows">Common workflows</GoldLink>
          <GoldLink href="/status">Public status</GoldLink>
        </div>
      </Section>
    </main>
  );
}
