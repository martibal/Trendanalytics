// src/app/dashboard/page.tsx
import Link from "next/link";
import { CHAIN_LIST } from "@/config/chains";
import { getCurrentAccountView } from "@/lib/auth/account";
import { getPersistedApiKeyDisplayRows } from "@/lib/auth/apiKeys";
import ApiKeyManagerClient from "@/components/dashboard/ApiKeyManagerClient";

type DashboardSubscriptionState = "not_connected" | "inactive" | "active";

function statusBadgeClass(status: DashboardSubscriptionState) {
  const base = "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium";
  if (status === "active") return `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-300`;
  if (status === "inactive") return `${base} border-amber-500/30 bg-amber-500/10 text-amber-300`;
  return `${base} border-border bg-muted text-muted-foreground`;
}

function code(path: string) {
  return <code className="rounded bg-muted px-1.5 py-0.5 text-[12px]">{path}</code>;
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
      detail: "Identity provider keys are not configured yet, so the subscriber lifecycle is only partially enabled.",
    };
  }

  if (!params.isAuthenticated) {
    return {
      label: "No authenticated session",
      detail: "The route is rendering safely, but there is no signed-in subscriber session attached to this request.",
    };
  }

  if (!params.accountId) {
    return {
      label: "Authenticated, account mapping incomplete",
      detail: "A signed-in user exists, but no linked subscriber account record is currently attached.",
    };
  }

  if (!params.stripeCustomerId || !params.stripeSubscriptionId) {
    return {
      label: "Account connected, billing incomplete",
      detail: "The subscriber account is present, but Stripe customer/subscription linkage is not fully connected yet.",
    };
  }

  if (params.tier === "public" || params.status !== "active") {
    return {
      label: "Connected, inactive entitlement",
      detail: "The account is linked, but active delivery entitlement is not currently available.",
    };
  }

  return {
    label: "Connected, active entitlement",
    detail: "The account, billing linkage, and entitlement snapshot are present for authenticated delivery scope.",
  };
}


function boolPill(value: boolean, yes = "yes", no = "no") {
  return value ? (
    <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-emerald-300">
      {yes}
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {no}
    </span>
  );
}

export default async function DashboardPage() {
  const accountView = await getCurrentAccountView();
  const apiKeys = await getPersistedApiKeyDisplayRows(accountView.account?.accountId ?? null);

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

  const billingTemporarilyDisabled = true;

  const allowedWindows = [
    accountView.snapshot.maxWindowDays >= 0 ? "latest" : null,
    accountView.snapshot.maxWindowDays >= 7 ? "7d" : null,
    accountView.snapshot.maxWindowDays >= 30 ? "30d" : null,
    accountView.snapshot.maxWindowDays >= 90 ? "90d" : null,
    accountView.snapshot.maxWindowDays >= 180 ? "180d" : null,
    accountView.snapshot.maxWindowDays >= 365 ? "365d" : null,
  ].filter((value): value is string => !!value);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Subscriber area</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              This is the authenticated subscriber surface for JSON delivery, entitlement inspection,
              account context, and API key lifecycle. It is intentionally separate from the public
              descriptive website.
            </p>
          </div>

          <div className="rounded-xl border px-4 py-3 text-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Subscriber boundary
            </div>
            <div className="mt-1 font-medium text-foreground">
              Public site and subscriber delivery are separate surfaces
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Dashboard state should mirror the same server-side entitlement model used by file delivery.
            </div>
          </div>
        </div>
      </header>

      {!accountView.authConfigured ? (
        <section className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <div className="text-sm font-medium text-amber-200">
            Dashboard shell is available, but Clerk environment variables are not configured yet.
          </div>
          <p className="mt-2 text-sm text-amber-100/90">
            The route renders safely during development before identity is connected. Once Clerk keys
            are configured, this route becomes the authenticated subscriber area.
          </p>
        </section>
      ) : null}

      <section className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Lifecycle snapshot</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Current identity, billing-linkage, and entitlement readiness for this account surface.
              </p>
            </div>
            <span className={statusBadgeClass(subscriptionState)}>
              {subscriptionState.replace("_", " ")}
            </span>
          </div>

          <div className="mt-5 rounded-xl border p-4">
            <div className="text-sm font-medium">{lifecycleState.label}</div>
            <p className="mt-2 text-sm text-muted-foreground">{lifecycleState.detail}</p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Auth configured</div>
              <div className="mt-2">{boolPill(accountView.authConfigured)}</div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Authenticated session</div>
              <div className="mt-2">{boolPill(accountView.isAuthenticated)}</div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Account linked</div>
              <div className="mt-2">{boolPill(!!accountView.account?.accountId)}</div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Billing linked</div>
              <div className="mt-2">
                {boolPill(!!accountView.account?.stripeCustomerId && !!accountView.account?.stripeSubscriptionId)}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border p-6">
          <h2 className="text-lg font-semibold">Current account model</h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>
              Account ID:{" "}
              <span className="text-foreground">
                {accountView.account?.accountId ?? "No linked account"}
              </span>
            </p>
            <p>
              Stripe customer:{" "}
              <span className="text-foreground">
                {accountView.account?.stripeCustomerId ?? "Not connected"}
              </span>
            </p>
            <p>
              Stripe subscription:{" "}
              <span className="text-foreground">
                {accountView.account?.stripeSubscriptionId ?? "Not connected"}
              </span>
            </p>
            <p>
              Tier label:{" "}
              <span className="text-foreground">{accountView.tierLabel}</span>
            </p>
            <p>
              Entitled chain label:{" "}
              <span className="text-foreground">{accountView.entitledChainLabel}</span>
            </p>
            <p>
              History label:{" "}
              <span className="text-foreground">{accountView.historyDepthLabel}</span>
            </p>
            <p>
              API keys linked to account:{" "}
              <span className="text-foreground">{apiKeys.length}</span>
            </p>
          </div>

          <div className="mt-5 rounded-xl border p-4 text-sm text-muted-foreground">
            This dashboard is intentionally bound to the same server-side account and entitlement
            model used by authenticated file delivery.
          </div>
        </section>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Subscription snapshot</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Current entitlement surface for this account. Values come from the shared account
                  model that is also used by billing sync and authenticated file-delivery routes.
                </p>
              </div>
              <span className={statusBadgeClass(subscriptionState)}>
                {subscriptionState.replace("_", " ")}
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Tier</div>
                <div className="mt-2 text-lg font-semibold">{accountView.tierLabel}</div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Entitled chain</div>
                <div className="mt-2 text-lg font-semibold">{entitledChain}</div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Max window</div>
                <div className="mt-2 text-lg font-semibold">{maxWindow}</div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">History depth</div>
                <div className="mt-2 text-lg font-semibold">{accountView.historyDepthLabel}</div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border p-4">
              <div className="text-sm font-medium">Allowed windows</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {allowedWindows.length > 0 ? (
                  allowedWindows.map((window) => (
                    <span
                      key={window}
                      className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300"
                    >
                      {window}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No windows currently available</span>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                These window rules define what the account should be allowed to request through the
                authenticated file endpoint.
              </p>
            </div>

            <div className="mt-5 rounded-xl border p-4">
              <div className="text-sm font-medium">Entitled chains</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {CHAIN_LIST.map((chain) => {
                  const entitled = accountView.snapshot.allowedChains.includes(chain.id);
                  return (
                    <span
                      key={chain.id}
                      className={[
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm",
                        entitled
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border-border bg-background text-muted-foreground",
                      ].join(" ")}
                    >
                      <span aria-hidden="true">{chain.icon}</span>
                      <span>{chain.name}</span>
                    </span>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Normative rule: Basic is limited to one entitled chain; Pro covers all four chains.
              </p>
            </div>
          </section>

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

          <section className="rounded-2xl border p-6">
            <h2 className="text-lg font-semibold">Example delivery paths</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These examples document the target usage pattern for the authenticated file endpoint.
              They are examples only; entitlement enforcement is implemented in the file-delivery route.
            </p>

            <div className="mt-5 space-y-3 text-sm">
              <div className="rounded-xl border p-4">
                <div className="font-medium">Example curl</div>
                <div className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-muted-foreground">
                  {`curl -H "X-API-Key: ta_live_xxxxxxxxx" http://localhost:3000/api/v1/files/meta/bitcoin/90d/latest.json`}
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="font-medium">Canonical example paths</div>
                <div className="mt-3 space-y-2 text-muted-foreground">
                  <div>{code("/api/v1/files/gold/bitcoin/30d/latest.json")}</div>
                  <div>{code("/api/v1/files/meta/ethereum/90d/latest.json")}</div>
                  <div>{code("/api/v1/files/derived/base/365d/latest.json")}</div>
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="font-medium">Server-side enforcement boundary</div>
                <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                  <li>Chain entitlement must match the subscriber tier.</li>
                  <li>Window entitlement must not exceed the allowed depth for the plan.</li>
                  <li>History depth must respect plan plus any history add-on.</li>
                  <li>Forbidden scope returns 403, not 404.</li>
                </ul>
              </div>

              <div className="rounded-xl border p-4">
                <div className="font-medium">Traceability</div>
                <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                  <li>Dashboard state is derived from the shared account snapshot.</li>
                  <li>API key rows come from the same server-side key source used by delivery validation.</li>
                  <li>Lifecycle UI is now wired for create/revoke against the DB-backed key route.</li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border p-6">
            <h2 className="text-lg font-semibold">Plan matrix</h2>
            <div className="mt-4 space-y-3">
              {capabilityRows().map((row) => (
                <div key={row.tier} className="rounded-xl border p-4 text-sm">
                  <div className="font-medium">{row.tier}</div>
                  <div className="mt-2 grid gap-1 text-muted-foreground">
                    <div><span className="text-foreground">Chains:</span> {row.chains}</div>
                    <div><span className="text-foreground">Windows:</span> {row.windows}</div>
                    <div><span className="text-foreground">History:</span> {row.history}</div>
                    <div><span className="text-foreground">Custom outputs:</span> {row.custom}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Billing management</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Payments are temporarily disabled while business registration and production billing
                  setup are being completed.
                </p>
              </div>
              <span className={statusBadgeClass(billingTemporarilyDisabled ? "inactive" : "active")}>
                inactive
              </span>
            </div>

            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>
                Billing links, Stripe checkout, and the customer portal are intentionally unavailable
                in this pre-launch state.
              </p>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100/90">
                Payments will be re-enabled once business registration, bank account setup, and enabled
                Stripe configuration are complete.
              </div>
            </div>
          </section>

          <section className="rounded-2xl border p-6">
            <h2 className="text-lg font-semibold">Quick links</h2>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link className="rounded-lg border px-3 py-2 hover:bg-muted" href="/api-docs">
                API docs
              </Link>
              <Link className="rounded-lg border px-3 py-2 hover:bg-muted" href="/status">
                Public status
              </Link>
              <Link className="rounded-lg border px-3 py-2 hover:bg-muted" href="/methodology">
                Methodology
              </Link>
              <Link className="rounded-lg border px-3 py-2 hover:bg-muted" href="/thresholds">
                Threshold simulator
              </Link>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}