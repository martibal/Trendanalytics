// src/app/mobile/dashboard/page.tsx
import Link from "next/link";
import type { ReactNode } from "react";

import ApiKeyManagerClient from "@/components/dashboard/ApiKeyManagerClient";
import {
  MobileCard,
  MobileMetric,
  MobilePage,
  MobilePill,
  MobilePrimaryLink,
  MobileSection,
} from "@/components/mobile/MobileShell";
import { getCurrentAccountView } from "@/lib/auth/account";
import { getPersistedApiKeyDisplayRows } from "@/lib/auth/apiKeys";

function EntitlementPill({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: "blue" | "gold" | "gray";
}) {
  return (
    <MobilePill tone={tone === "gold" ? "gold" : tone === "gray" ? "gray" : "blue"}>
      {children}
    </MobilePill>
  );
}

export default async function MobileDashboardPage() {
  const accountView = await getCurrentAccountView();
  const apiKeys = await getPersistedApiKeyDisplayRows(accountView.account?.accountId ?? null);

  const subscriptionActive =
    accountView.isAuthenticated &&
    accountView.snapshot.tier !== "public" &&
    accountView.snapshot.status === "active";

  return (
    <MobilePage
      active="dashboard"
      eyebrow="Mobile dashboard"
      title={<>Account and JSON access.</>}
      subtitle={
        <>
          Subscriber state, entitlement scope and API-key controls in the mobile
          surface. Data access still uses the same published JSON artifacts.
        </>
      }
      backHref="/mobile"
    >
      {!accountView.isAuthenticated ? (
        <MobileSection>
          <MobileCard tone="gold">
            <div className="text-[13px] font-black uppercase tracking-[0.16em] text-[#f5d386]">
              Sign in required
            </div>
            <p className="mt-3 text-[14px] font-semibold leading-6 text-[#f2dfbd]">
              Sign in to inspect your subscriber state, entitlement scope and API keys.
            </p>
            <div className="mt-4">
              <MobilePrimaryLink href="/sign-in?redirect_url=/mobile/dashboard">Sign in</MobilePrimaryLink>
            </div>
          </MobileCard>
        </MobileSection>
      ) : null}

      <MobileSection eyebrow="Entitlement" title="Current access state.">
        <MobileCard>
          <div className="flex flex-wrap items-center gap-2">
            <EntitlementPill tone={subscriptionActive ? "blue" : "gold"}>
              {subscriptionActive ? "Active" : "Inactive"}
            </EntitlementPill>
            <EntitlementPill tone="gray">{accountView.tierLabel}</EntitlementPill>
            <EntitlementPill tone="gray">{accountView.entitledChainLabel}</EntitlementPill>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <MobileMetric label="History" value={accountView.historyDepthLabel} />
            <MobileMetric label="API keys" value={apiKeys.length} />
          </div>
        </MobileCard>
      </MobileSection>

      <MobileSection eyebrow="API keys" title="Manage delivery credentials.">
        <MobileCard>
          <p className="mb-4 text-[12px] leading-6 text-[#d7e8fb]">
            Keys authorize access to the same Gold, Derived, Meta and Briefs JSON layers
            described in the mobile API reference.
          </p>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/[0.10] p-2">
            <ApiKeyManagerClient
              authConfigured={accountView.authConfigured}
              isAuthenticated={accountView.isAuthenticated}
              hasLinkedAccount={!!accountView.account?.accountId}
              subscriptionActive={subscriptionActive}
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
        </MobileCard>
      </MobileSection>

      <MobileSection eyebrow="Read next" title="Stay inside mobile docs.">
        <div className="grid gap-2">
          <Link href="/mobile/api-docs" className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 text-[13px] font-black text-white">
            Mobile API reference →
          </Link>
          <Link href="/mobile/plans" className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 text-[13px] font-black text-white">
            Mobile plans →
          </Link>
        </div>
      </MobileSection>
    </MobilePage>
  );
}
