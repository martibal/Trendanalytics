// src/app/mobile/dashboard/page.tsx
import Link from "next/link";
import type { ReactNode } from "react";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import MobileRouteMenu from "@/components/mobile/MobileRouteMenu";
import { getCurrentAccountView } from "@/lib/auth/account";
import { getPersistedApiKeyDisplayRows } from "@/lib/auth/apiKeys";
import ApiKeyManagerClient from "@/components/dashboard/ApiKeyManagerClient";

function Pill({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "orange" | "silver" }) {
  const cls =
    tone === "orange"
      ? "border-orange-300/35 bg-orange-300/12 text-orange-100"
      : tone === "silver"
        ? "border-slate-200/18 bg-white/8 text-slate-100"
        : "border-sky-300/28 bg-sky-300/10 text-sky-100";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${cls}`}>{children}</span>;
}

export default async function MobileDashboardPage() {
  const accountView = await getCurrentAccountView();
  const apiKeys = await getPersistedApiKeyDisplayRows(accountView.account?.accountId ?? null);

  const subscriptionActive =
    accountView.isAuthenticated &&
    accountView.snapshot.tier !== "public" &&
    accountView.snapshot.status === "active";

  return (
    <div className="min-h-screen bg-[#040b14] text-white">
      <style>{`
        .mobile-dashboard {
          min-height: 100svh;
          background:
            radial-gradient(circle at 20% -8%, rgba(126,208,255,0.20), transparent 18rem),
            radial-gradient(circle at 92% 0%, rgba(255,154,74,0.12), transparent 16rem),
            linear-gradient(180deg, #040b14 0%, #071425 100%);
          --urd-panel: rgba(255,255,255,0.075);
          --urd-raised: rgba(255,255,255,0.09);
          --urd-border: rgba(201,226,255,0.18);
          --urd-border-soft: rgba(201,226,255,0.12);
          --urd-text-strong: #f8fbff;
          --urd-text-body: #d7e8fb;
          --urd-text-muted: #9db8d7;
        }
        .mobile-dashboard-card {
          border: 1px solid rgba(201,226,255,0.14);
          border-radius: 24px;
          background: linear-gradient(145deg, rgba(255,255,255,0.11), rgba(255,255,255,0.04));
          box-shadow: 0 22px 64px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.08);
        }
      `}</style>

      <div className="mobile-dashboard min-h-screen pb-28">
        <header className="px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
          <div className="flex items-center justify-between gap-3">
            <Link href="/mobile" className="text-[20px] font-black tracking-[-0.04em] text-white">
              Urd Atlas
            </Link>
            <MobileRouteMenu />
          </div>

          <div className="mt-8">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-200">Mobile dashboard</div>
            <h1 className="mt-2 text-[34px] font-black leading-none tracking-[-0.06em] text-white">
              Account and JSON access.
            </h1>
            <p className="mt-3 max-w-md text-[14px] font-semibold leading-6 text-slate-300">
              Subscriber state, entitlement scope and API-key controls in the mobile surface.
            </p>
          </div>
        </header>

        <main className="space-y-5 px-4 py-5">
          {!accountView.isAuthenticated ? (
            <section className="mobile-dashboard-card p-5">
              <div className="text-[13px] font-black uppercase tracking-[0.16em] text-sky-200">Sign in required</div>
              <p className="mt-3 text-[14px] font-semibold leading-6 text-slate-200">
                Sign in to inspect your subscriber state, entitlement scope and API keys.
              </p>
              <Link href="/sign-in" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-gradient-to-b from-[#ffae63] to-[#ff7d2f] px-5 text-[13px] font-black text-[#09111d]">
                Sign in
              </Link>
            </section>
          ) : null}

          <section className="mobile-dashboard-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={subscriptionActive ? "blue" : "orange"}>
                {subscriptionActive ? "Active" : "Inactive"}
              </Pill>
              <Pill tone="silver">{accountView.tierLabel}</Pill>
              <Pill tone="silver">{accountView.entitledChainLabel}</Pill>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">History</div>
                <div className="mt-2 text-[18px] font-black text-white">{accountView.historyDepthLabel}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">API keys</div>
                <div className="mt-2 text-[18px] font-black text-white">{apiKeys.length}</div>
              </div>
            </div>
          </section>

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
        </main>

        <MobileBottomNav active="dashboard" />
      </div>
    </div>
  );
}
