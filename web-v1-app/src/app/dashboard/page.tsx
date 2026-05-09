// src/app/dashboard/page.tsx
import type { ReactNode } from "react";

import { CHAIN_LIST } from "@/config/chains";
import ApiKeyManagerClient from "@/components/dashboard/ApiKeyManagerClient";
import PageHero from "@/components/site/PageHero";
import {
  UrdButtonLink,
  UrdCallout,
  UrdContainer,
  UrdInlineCode,
  UrdPage,
  UrdSection,
  cx,
} from "@/components/site/UrdDesignSystem";
import { getCurrentAccountView } from "@/lib/auth/account";
import { getPersistedApiKeyDisplayRows } from "@/lib/auth/apiKeys";

type DashboardSubscriptionState = "not_connected" | "inactive" | "active";

function statusBadgeClass(status: DashboardSubscriptionState) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black capitalize";
  if (status === "active") {
    return `${base} border-emerald-500 bg-emerald-50 text-emerald-700`;
  }
  if (status === "inactive") {
    return `${base} border-amber-400 bg-amber-50 text-amber-800`;
  }
  return `${base} border-[#9db8d4] bg-[#eef6ff] text-[#0d2447]`;
}

function code(path: string) {
  return <UrdInlineCode>{path}</UrdInlineCode>;
}

function capabilityRows() {
  return [
    {
      tier: "Single Chain",
      chains: "1 entitled chain",
      windows: "latest, 7d, 30d, 90d",
      history: "90 days",
      custom: "No",
    },
    {
      tier: "Research",
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

function boolPill(value: boolean, yes = "yes", no = "no") {
  return value ? (
    <span className="inline-flex items-center rounded-full border border-emerald-500 bg-emerald-50 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-emerald-700">
      {yes}
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-[#9db8d4] bg-[#eef6ff] px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-[#557099]">
      {no}
    </span>
  );
}

function SmallMetric({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#c9d9ea] bg-[#eef6ff] p-4">
      <div className="text-xs font-black uppercase tracking-[0.12em] text-[#557099]">
        {label}
      </div>
      <div className="mt-2 text-lg font-black text-[#0d2447]">{children}</div>
    </div>
  );
}

function AccountRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <p>
      <span className="font-black text-[#0d2447]">{label}: </span>
      <span className="text-[#27476f]">{value}</span>
    </p>
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

  const hasBillingPortalAccess = Boolean(accountView.account?.stripeCustomerId);

  if (accountView.authConfigured && !accountView.isAuthenticated) {
    return (
      <UrdPage>
        <PageHero
          eyebrow="Subscriber area"
          title="Dashboard"
          highlight="Sign in to see your account"
          summary="The dashboard is the subscriber control surface for account state, API keys, entitlement-aware JSON delivery, and billing context."
        >
          <div className="max-w-3xl rounded-3xl border border-white/15 bg-white/10 p-5 text-sm font-semibold leading-7 text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
              Account access
            </div>
            <div className="mt-2 text-base font-black text-white">
              Sign in to inspect your subscriber state
            </div>
            <p className="mt-2">
              Your dashboard shows the account, entitlement, API-key, and delivery settings used by
              authenticated reference-data access.
            </p>
          </div>
        </PageHero>

        <UrdContainer className="space-y-8">
          <UrdSection title="Sign in to see your account">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr]">
              <div className="space-y-4 text-sm font-semibold leading-7 text-[#27476f]">
                <p>
                  This dashboard is the authenticated workspace for subscribers. Once signed in,
                  it shows your plan, entitled chains, history depth, allowed delivery windows,
                  API keys, and billing-linkage state.
                </p>
                <p>
                  Public methodology pages, status pages, and documentation remain available
                  without signing in. Account-specific delivery controls are shown only after an
                  authenticated session is present.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <UrdButtonLink href="/sign-in">Sign in</UrdButtonLink>
                  <UrdButtonLink href="/api-docs">Read API docs</UrdButtonLink>
                </div>
              </div>

              <div className="rounded-2xl border border-[#c9d9ea] bg-[#eef6ff] p-4">
                <div className="text-sm font-black text-[#0d2447]">What the dashboard does</div>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-semibold leading-7 text-[#27476f]">
                  <li>Shows the subscriber account and entitlement snapshot used by file delivery.</li>
                  <li>Displays entitled chains, history depth, and allowed JSON delivery windows.</li>
                  <li>Provides API-key lifecycle controls for authenticated reference-data access.</li>
                  <li>Separates subscriber delivery from the public descriptive website.</li>
                </ul>
              </div>
            </div>
          </UrdSection>

          <UrdSection title="Public resources">
            <div className="flex flex-wrap gap-3 text-sm">
              <UrdButtonLink href="/status">Public status</UrdButtonLink>
              <UrdButtonLink href="/methodology">Methodology</UrdButtonLink>
              <UrdButtonLink href="/thresholds">Threshold simulator</UrdButtonLink>
            </div>
          </UrdSection>
        </UrdContainer>
      </UrdPage>
    );
  }

  const allowedWindows = [
    accountView.snapshot.maxWindowDays >= 0 ? "latest" : null,
    accountView.snapshot.maxWindowDays >= 7 ? "7d" : null,
    accountView.snapshot.maxWindowDays >= 30 ? "30d" : null,
    accountView.snapshot.maxWindowDays >= 90 ? "90d" : null,
    accountView.snapshot.maxWindowDays >= 180 ? "180d" : null,
    accountView.snapshot.maxWindowDays >= 365 ? "365d" : null,
  ].filter((value): value is string => !!value);

  return (
    <UrdPage>
      <PageHero
        eyebrow="Subscriber area"
        title="Dashboard"
        highlight="JSON delivery control surface"
        summary="This is the authenticated subscriber surface for JSON delivery, entitlement inspection, account context, and API key lifecycle. It is intentionally separate from the public descriptive website."
      >
        <div className="max-w-3xl rounded-3xl border border-white/15 bg-white/10 p-5 text-sm font-semibold leading-7 text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
            Subscriber boundary
          </div>
          <div className="mt-2 text-base font-black text-white">
            Public site and subscriber delivery are separate surfaces
          </div>
          <p className="mt-2">
            Dashboard state should mirror the same server-side entitlement model used by file delivery.
          </p>
        </div>
      </PageHero>

      <UrdContainer className="space-y-8">
        {!accountView.authConfigured ? (
          <UrdCallout title="Dashboard shell is available" tone="warning">
            <p>
              Dashboard shell is available, but Clerk environment variables are not configured yet.
            </p>
            <p className="mt-2">
              The route renders safely during development before identity is connected. Once Clerk keys
              are configured, this route becomes the authenticated subscriber area.
            </p>
          </UrdCallout>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <UrdSection title="Lifecycle snapshot">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="max-w-2xl">
                Current identity, billing-linkage, and entitlement readiness for this account surface.
              </p>
              <span className={statusBadgeClass(subscriptionState)}>
                {subscriptionState.replace("_", " ")}
              </span>
            </div>

            <div className="mt-5 rounded-2xl border border-[#c9d9ea] bg-[#eef6ff] p-4">
              <div className="text-sm font-black text-[#0d2447]">{lifecycleState.label}</div>
              <p className="mt-2 text-sm font-semibold leading-7 text-[#27476f]">
                {lifecycleState.detail}
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SmallMetric label="Auth configured">{boolPill(accountView.authConfigured)}</SmallMetric>
              <SmallMetric label="Authenticated session">{boolPill(accountView.isAuthenticated)}</SmallMetric>
              <SmallMetric label="Account linked">{boolPill(!!accountView.account?.accountId)}</SmallMetric>
              <SmallMetric label="Billing linked">
                {boolPill(
                  !!accountView.account?.stripeCustomerId &&
                    !!accountView.account?.stripeSubscriptionId,
                )}
              </SmallMetric>
            </div>
          </UrdSection>

          <UrdSection title="Current account model">
            <div className="space-y-3 text-sm font-semibold leading-7">
              <AccountRow label="Account ID" value={accountView.account?.accountId ?? "No linked account"} />
              <AccountRow label="Stripe customer" value={accountView.account?.stripeCustomerId ?? "Not connected"} />
              <AccountRow label="Stripe subscription" value={accountView.account?.stripeSubscriptionId ?? "Not connected"} />
              <AccountRow label="Tier label" value={accountView.tierLabel} />
              <AccountRow label="Entitled chain label" value={accountView.entitledChainLabel} />
              <AccountRow label="History label" value={accountView.historyDepthLabel} />
              <AccountRow label="API keys linked to account" value={apiKeys.length} />
            </div>

            <div className="mt-5 rounded-2xl border border-[#c9d9ea] bg-[#eef6ff] p-4 text-sm font-semibold leading-7 text-[#27476f]">
              This dashboard is intentionally bound to the same server-side account and entitlement
              model used by authenticated file delivery.
            </div>
          </UrdSection>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <UrdSection title="Subscription snapshot">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="max-w-2xl">
                  Current entitlement surface for this account. Values come from the shared account
                  model that is also used by billing sync and authenticated file-delivery routes.
                </p>
                <span className={statusBadgeClass(subscriptionState)}>
                  {subscriptionState.replace("_", " ")}
                </span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SmallMetric label="Tier">{accountView.tierLabel}</SmallMetric>
                <SmallMetric label="Entitled chain">{entitledChain}</SmallMetric>
                <SmallMetric label="Max window">{maxWindow}</SmallMetric>
                <SmallMetric label="History depth">{accountView.historyDepthLabel}</SmallMetric>
              </div>

              <div className="mt-5 rounded-2xl border border-[#c9d9ea] bg-[#eef6ff] p-4">
                <div className="text-sm font-black text-[#0d2447]">Allowed windows</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {allowedWindows.length > 0 ? (
                    allowedWindows.map((window) => (
                      <span
                        key={window}
                        className="inline-flex items-center rounded-full border border-emerald-500 bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700"
                      >
                        {window}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm font-semibold text-[#557099]">
                      No windows currently available
                    </span>
                  )}
                </div>
                <p className="mt-3 text-xs font-semibold leading-6 text-[#557099]">
                  These window rules define what the account should be allowed to request through the
                  authenticated file endpoint.
                </p>
              </div>

              <div className="mt-5 rounded-2xl border border-[#c9d9ea] bg-[#eef6ff] p-4">
                <div className="text-sm font-black text-[#0d2447]">Entitled chains</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CHAIN_LIST.map((chain) => {
                    const entitled = accountView.snapshot.allowedChains.includes(chain.id);
                    return (
                      <span
                        key={chain.id}
                        className={cx(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-black",
                          entitled
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-[#9db8d4] bg-[#edf6ff] text-[#557099]",
                        )}
                      >
                        <span aria-hidden="true">{chain.icon}</span>
                        <span>{chain.name}</span>
                      </span>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs font-semibold leading-6 text-[#557099]">
                  Normative rule: Single Chain is limited to one entitled chain; Research covers all four chains.
                </p>
              </div>
            </UrdSection>

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

            <UrdSection title="Example delivery paths">
              <p>
                These examples document the target usage pattern for the authenticated file endpoint.
                They are examples only; entitlement enforcement is implemented in the file-delivery route.
              </p>

              <div className="mt-5 space-y-3 text-sm">
                <div className="rounded-2xl border border-[#c9d9ea] bg-[#eef6ff] p-4">
                  <div className="font-black text-[#0d2447]">Example curl</div>
                  <div className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-[#c9d9ea] bg-[#f4f9ff] p-3 font-mono text-sm font-bold text-[#0d2447]">
                    {`curl -H "X-API-Key: ta_live_xxxxxxxxx" http://localhost:3000/api/v1/files/meta/bitcoin/90d/latest.json`}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#c9d9ea] bg-[#eef6ff] p-4">
                  <div className="font-black text-[#0d2447]">Canonical example paths</div>
                  <div className="mt-3 space-y-2 text-[#27476f]">
                    <div>{code("/api/v1/files/gold/bitcoin/30d/latest.json")}</div>
                    <div>{code("/api/v1/files/meta/ethereum/90d/latest.json")}</div>
                    <div>{code("/api/v1/files/derived/base/365d/latest.json")}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#c9d9ea] bg-[#eef6ff] p-4">
                  <div className="font-black text-[#0d2447]">Server-side enforcement boundary</div>
                  <ul className="mt-2 list-disc pl-5 font-semibold leading-7 text-[#27476f]">
                    <li>Chain entitlement must match the subscriber tier.</li>
                    <li>Window entitlement must not exceed the allowed depth for the plan.</li>
                    <li>History depth must respect plan plus any history add-on.</li>
                    <li>Forbidden scope returns 403, not 404.</li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-[#c9d9ea] bg-[#eef6ff] p-4">
                  <div className="font-black text-[#0d2447]">Traceability</div>
                  <ul className="mt-2 list-disc pl-5 font-semibold leading-7 text-[#27476f]">
                    <li>Dashboard state is derived from the shared account snapshot.</li>
                    <li>API key rows come from the same server-side key source used by delivery validation.</li>
                    <li>Lifecycle UI is now wired for create/revoke against the DB-backed key route.</li>
                  </ul>
                </div>
              </div>
            </UrdSection>
          </div>

          <aside className="space-y-6">
            <UrdSection title="Plan matrix">
              <div className="space-y-3">
                {capabilityRows().map((row) => (
                  <div key={row.tier} className="rounded-2xl border border-[#c9d9ea] bg-[#eef6ff] p-4 text-sm">
                    <div className="font-black text-[#0d2447]">{row.tier}</div>
                    <div className="mt-2 grid gap-1 font-semibold leading-7 text-[#27476f]">
                      <div><span className="font-black text-[#0d2447]">Chains:</span> {row.chains}</div>
                      <div><span className="font-black text-[#0d2447]">Windows:</span> {row.windows}</div>
                      <div><span className="font-black text-[#0d2447]">History:</span> {row.history}</div>
                      <div><span className="font-black text-[#0d2447]">Custom outputs:</span> {row.custom}</div>
                    </div>
                  </div>
                ))}
              </div>
            </UrdSection>

            <UrdSection title="Billing management">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p>
                  Manage your subscription, payment method, invoices, and cancellation directly through
                  Stripe Customer Portal. Stripe remains the billing source of truth; Urd Atlas mirrors
                  subscription state through webhook-synced entitlements.
                </p>
                <span className={statusBadgeClass(hasBillingPortalAccess ? "active" : "inactive")}>
                  {hasBillingPortalAccess ? "active" : "inactive"}
                </span>
              </div>

              <div className="mt-4 space-y-3 text-sm font-semibold leading-7 text-[#27476f]">
                {hasBillingPortalAccess ? (
                  <>
                    <p>
                      Opening billing management sends you to Stripe&apos;s hosted portal. Cancellation,
                      payment-method changes, and invoice access happen there, then Stripe webhooks
                      update this dashboard automatically.
                    </p>

                    <form action="/api/v1/checkout/portal" method="post">
                      <button
                        type="submit"
                        className="inline-flex rounded-full border border-[#0b5cff] bg-[#0b5cff] px-4 py-2 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#084bd1]"
                      >
                        Manage billing
                      </button>
                    </form>

                    <div className="rounded-2xl border border-[#c9d9ea] bg-[#eef6ff] p-4 font-semibold text-[#27476f]">
                      Standard cancellations should be initiated through Stripe Customer Portal. Manual
                      admin intervention is only needed for support cases, refunds, or failed syncs.
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      Billing management becomes available after checkout has created and linked a Stripe
                      customer for this account.
                    </p>

                    <div className="rounded-2xl border border-amber-400 bg-amber-50 p-4 font-semibold text-amber-900">
                      No Stripe customer is connected to this account yet. Subscribe first, then return
                      here to manage billing, invoices, and cancellation through Stripe.
                    </div>
                  </>
                )}
              </div>
            </UrdSection>

            <UrdSection title="Quick links">
              <div className="flex flex-wrap gap-3 text-sm">
                <UrdButtonLink href="/api-docs">API docs</UrdButtonLink>
                <UrdButtonLink href="/status">Public status</UrdButtonLink>
                <UrdButtonLink href="/methodology">Methodology</UrdButtonLink>
                <UrdButtonLink href="/thresholds">Threshold simulator</UrdButtonLink>
              </div>
            </UrdSection>
          </aside>
        </section>
      </UrdContainer>
    </UrdPage>
  );
}
