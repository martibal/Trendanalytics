// src/components/dashboard/ApiKeyManagerClient.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ApiKeyRow = {
  id: string;
  label: string | null;
  prefix: string;
  last4: string | null;
  status: "active" | "suspended" | "revoked";
  createdAt: string | null;
  lastUsedAt: string | null;
  tier: string;
  entitledChain: string | null;
  maxWindowDays: number;
};

type CreatedKeyResponse = {
  secret: string;
  key: {
    id: string;
    label: string | null;
    prefix: string;
    last4: string | null;
    status: "active" | "suspended" | "revoked";
    createdAt: string;
  };
};

type ApiErrorResponse = {
  message?: string;
  detail?: string;
};

type Props = {
  authConfigured: boolean;
  isAuthenticated: boolean;
  hasLinkedAccount: boolean;
  subscriptionActive: boolean;
  initialKeys: ApiKeyRow[];
};

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return "message" in candidate || "detail" in candidate;
}

function apiKeyBadgeClass(status: ApiKeyRow["status"]) {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide";

  if (status === "active") {
    return `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-300`;
  }

  if (status === "suspended") {
    return `${base} border-amber-500/30 bg-amber-500/10 text-amber-300`;
  }

  return `${base} border-rose-500/30 bg-rose-500/10 text-rose-300`;
}

function mutedBadge(text: string) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {text}
    </span>
  );
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeCreatedKeyIntoRow(
  created: CreatedKeyResponse["key"],
  fallbackTier: string,
  fallbackEntitledChain: string | null,
  fallbackMaxWindowDays: number
): ApiKeyRow {
  return {
    id: created.id,
    label: created.label,
    prefix: created.prefix,
    last4: created.last4,
    status: created.status,
    createdAt: created.createdAt,
    lastUsedAt: null,
    tier: fallbackTier,
    entitledChain: fallbackEntitledChain,
    maxWindowDays: fallbackMaxWindowDays,
  };
}

export default function ApiKeyManagerClient({
  authConfigured,
  isAuthenticated,
  hasLinkedAccount,
  subscriptionActive,
  initialKeys,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [keys, setKeys] = useState<ApiKeyRow[]>(initialKeys);
  const [label, setLabel] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyKeyId, setBusyKeyId] = useState<string | null>(null);

  const activeOrSuspendedCount = useMemo(
    () => keys.filter((key) => key.status !== "revoked").length,
    [keys]
  );

  const canMutate =
    authConfigured &&
    isAuthenticated &&
    hasLinkedAccount &&
    subscriptionActive &&
    !isPending;

  const fallbackTier = keys[0]?.tier ?? "basic";
  const fallbackEntitledChain = keys[0]?.entitledChain ?? null;
  const fallbackMaxWindowDays = keys[0]?.maxWindowDays ?? 90;

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCreateError(null);
    setRevokeError(null);
    setCreatedSecret(null);
    setCopied(false);

    startTransition(async () => {
      try {
        const response = await fetch("/api/v1/keys", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            label: label.trim() || null,
          }),
        });

        const payload: unknown = await response.json();

        if (!response.ok) {
          const message =
            isApiErrorResponse(payload) && typeof payload.message === "string"
              ? payload.message
              : "API key creation failed.";
          const detail =
            isApiErrorResponse(payload) && typeof payload.detail === "string" && payload.detail.length > 0
              ? ` ${payload.detail}`
              : "";
          setCreateError(`${message}${detail}`);
          return;
        }

        const created = payload as CreatedKeyResponse;
        setCreatedSecret(created.secret);
        setLabel("");
        setKeys((current) => [
          normalizeCreatedKeyIntoRow(
            created.key,
            fallbackTier,
            fallbackEntitledChain,
            fallbackMaxWindowDays
          ),
          ...current,
        ]);

        router.refresh();
      } catch (error) {
        setCreateError(
          error instanceof Error ? error.message : "Unknown API key creation error."
        );
      }
    });
  }

  async function handleRevoke(keyId: string) {
    setCreateError(null);
    setRevokeError(null);
    setBusyKeyId(keyId);

    startTransition(async () => {
      try {
        const response = await fetch("/api/v1/keys", {
          method: "DELETE",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ keyId }),
        });

        const payload: unknown = await response.json();

        if (!response.ok) {
          const message =
            isApiErrorResponse(payload) && typeof payload.message === "string"
              ? payload.message
              : "API key revoke failed.";
          const detail =
            isApiErrorResponse(payload) && typeof payload.detail === "string" && payload.detail.length > 0
              ? ` ${payload.detail}`
              : "";
          setRevokeError(`${message}${detail}`);
          return;
        }

        setKeys((current) =>
          current.map((key) =>
            key.id === keyId ? { ...key, status: "revoked" } : key
          )
        );

        router.refresh();
      } catch (error) {
        setRevokeError(
          error instanceof Error ? error.message : "Unknown API key revoke error."
        );
      } finally {
        setBusyKeyId(null);
      }
    });
  }

  async function handleCopySecret() {
    if (!createdSecret) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdSecret);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="rounded-2xl border p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">API keys</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, rotate, and revoke delivery keys for authenticated JSON access.
            Secret values are shown exactly once at creation and only partial
            identifiers are displayed afterward.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mutedBadge("db-backed")}
          <span className="rounded-lg border px-3 py-2 text-sm text-muted-foreground">
            {activeOrSuspendedCount}/2 non-revoked keys
          </span>
        </div>
      </div>

      {!authConfigured ? (
        <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Clerk is not configured yet, so key mutations are unavailable in this environment.
        </div>
      ) : null}

      {authConfigured && !isAuthenticated ? (
        <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Sign in to create or revoke API keys.
        </div>
      ) : null}

      {authConfigured && isAuthenticated && !hasLinkedAccount ? (
        <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Your authenticated user is not yet linked to an account row, so key lifecycle actions are blocked.
        </div>
      ) : null}

      {authConfigured && isAuthenticated && hasLinkedAccount && !subscriptionActive ? (
        <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          An active subscription is required before API keys can be created.
        </div>
      ) : null}

      <form onSubmit={handleCreate} className="mt-5 rounded-xl border p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="api-key-label" className="text-sm font-medium">
              Key label
            </label>
            <input
              id="api-key-label"
              type="text"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Example: local dev / staging / laptop"
              maxLength={64}
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-0 transition placeholder:text-muted-foreground focus:border-foreground/30"
              disabled={!canMutate || activeOrSuspendedCount >= 2}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Optional label for identification in rotation workflows.
            </p>
          </div>

          <button
            type="submit"
            disabled={!canMutate || activeOrSuspendedCount >= 2}
            className={[
              "rounded-lg border px-3 py-2 text-sm transition",
              !canMutate || activeOrSuspendedCount >= 2
                ? "cursor-not-allowed text-muted-foreground opacity-60"
                : "text-foreground hover:bg-muted",
            ].join(" ")}
          >
            {isPending ? "Working..." : "Create API key"}
          </button>
        </div>

        {createError ? (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {createError}
          </div>
        ) : null}
      </form>

      {createdSecret ? (
        <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="text-sm font-medium text-emerald-200">
            New API key created
          </div>
          <p className="mt-2 text-sm text-emerald-100/90">
            Copy this secret now. It will not be shown again after you leave or refresh this state.
          </p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-emerald-500/20 bg-background/60 p-3 font-mono text-sm text-foreground">
            {createdSecret}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopySecret}
              className="rounded-lg border px-3 py-2 text-sm text-foreground transition hover:bg-background/80"
            >
              {copied ? "Copied" : "Copy secret"}
            </button>
            <span className="text-xs text-emerald-100/80">
              Store it in your integration before revoking any older key.
            </span>
          </div>
        </div>
      ) : null}

      {keys.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          No API keys are connected to this account yet.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {keys.map((keyRow) => (
            <div key={keyRow.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-foreground">
                    {keyRow.prefix}
                    ••••
                    {keyRow.last4 ?? "—"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Created: {formatDateTime(keyRow.createdAt)} · Last used:{" "}
                    {formatDateTime(keyRow.lastUsedAt)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Tier: {keyRow.tier} · Chain: {keyRow.entitledChain ?? "all"} · Max window:{" "}
                    {keyRow.maxWindowDays}d
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={apiKeyBadgeClass(keyRow.status)}>{keyRow.status}</span>
                  <button
                    type="button"
                    disabled={!canMutate || keyRow.status === "revoked"}
                    onClick={() => handleRevoke(keyRow.id)}
                    className={[
                      "rounded-lg border px-3 py-1.5 text-sm transition",
                      !canMutate || keyRow.status === "revoked"
                        ? "cursor-not-allowed text-muted-foreground opacity-60"
                        : "text-foreground hover:bg-muted",
                    ].join(" ")}
                  >
                    {busyKeyId === keyRow.id && isPending ? "Revoking..." : "Revoke"}
                  </button>
                </div>
              </div>

              {keyRow.label ? (
                <div className="mt-2 text-xs text-muted-foreground">Label: {keyRow.label}</div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {revokeError ? (
        <div className="mt-5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {revokeError}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border p-4 text-sm">
          <div className="font-medium">ACTIVE</div>
          <p className="mt-2 text-muted-foreground">
            Valid for authenticated file delivery within the account&apos;s entitlement scope.
          </p>
        </div>
        <div className="rounded-xl border p-4 text-sm">
          <div className="font-medium">SUSPENDED</div>
          <p className="mt-2 text-muted-foreground">
            Used for inactive subscription state. Key exists, but delivery is blocked.
          </p>
        </div>
        <div className="rounded-xl border p-4 text-sm">
          <div className="font-medium">REVOKED</div>
          <p className="mt-2 text-muted-foreground">
            Permanently disabled after user or admin revocation. Cannot be reactivated.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border p-4 text-sm text-muted-foreground">
        Only partial identifiers are displayed after creation. The full secret is intentionally not retrievable later.
      </div>
    </section>
  );
}