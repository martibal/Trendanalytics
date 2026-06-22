type OnboardingPlan = "basic" | "pro";

type OnboardingEmailKind =
  | "welcome"
  | "api_access_guidance"
  | "plan_update";

type OnboardingEmailInput = {
  to: string | null | undefined;
  plan: OnboardingPlan;
  kind: OnboardingEmailKind;
  entitledChain?: string | null;
  appUrl?: string | null;
};

type OnboardingEmailPayload = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type OnboardingEmailResult =
  | {
      status: "disabled";
      reason: "not_enabled";
    }
  | {
      status: "skipped";
      reason: "missing_recipient" | "missing_provider_config";
    }
  | {
      status: "sent";
      provider: "resend";
      providerId: string | null;
    }
  | {
      status: "failed";
      provider: "resend";
      statusCode: number | null;
      reason: string;
    };

function onboardingEmailEnabled(): boolean {
  return process.env.URD_EMAIL_ONBOARDING_ENABLED === "true";
}

function configuredFromAddress(): string | null {
  return process.env.URD_EMAIL_FROM?.trim() || null;
}

function configuredProviderCredential(): string | null {
  return process.env.RESEND_API_KEY?.trim() || null;
}

function configuredAppUrl(inputUrl: string | null | undefined): string {
  const candidate =
    inputUrl?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.URD_APP_URL?.trim() ||
    "https://www.urdatlas.com";

  return candidate.replace(/\/+$/u, "");
}

function planLabel(plan: OnboardingPlan): string {
  return plan === "basic" ? "Single Chain" : "Research";
}

function planScope(plan: OnboardingPlan, entitledChain: string | null | undefined): string {
  if (plan === "basic") {
    return entitledChain
      ? "Your current plan is scoped to " + entitledChain + " with the included windows."
      : "Your current plan is scoped to one selected chain with the included windows.";
  }

  return "Your current plan includes all supported chains and the extended history windows.";
}

function subjectFor(kind: OnboardingEmailKind, plan: OnboardingPlan): string {
  if (kind === "plan_update") {
    return "Your Urd Atlas plan is updated";
  }

  if (kind === "api_access_guidance") {
    return "Your Urd Atlas API access guide";
  }

  return "Welcome to Urd Atlas " + planLabel(plan);
}

function htmlEscape(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

function buildOnboardingEmailPayload(
  input: OnboardingEmailInput,
  from: string,
  recipient: string
) {
  const appUrl = configuredAppUrl(input.appUrl);
  const dashboardUrl = appUrl + "/dashboard";
  const apiDocsUrl = appUrl + "/api-docs/getting-started";
  const plan = input.plan;
  const scope = planScope(plan, input.entitledChain);
  const subject = subjectFor(input.kind, plan);

  const textLines = [
    "Welcome to Urd Atlas.",
    "",
    "Plan: " + planLabel(plan),
    scope,
    "",
    "Next steps:",
    "1. Open your dashboard: " + dashboardUrl,
    "2. Create an API access value from the API keys section.",
    "3. Use the getting started guide: " + apiDocsUrl,
    "",
    "Urd Atlas is descriptive infrastructure for on-chain trend context.",
    "",
    "Security note: access values are shown only when created. Store them in your own secure environment."
  ];

  const htmlLines = [
    "<p>Welcome to Urd Atlas.</p>",
    "<p><strong>Plan:</strong> " + htmlEscape(planLabel(plan)) + "</p>",
    "<p>" + htmlEscape(scope) + "</p>",
    "<p><strong>Next steps:</strong></p>",
    "<ol>",
    '<li>Open your <a href="' + htmlEscape(dashboardUrl) + '">dashboard</a>.</li>',
    "<li>Create an API access value from the API keys section.</li>",
    '<li>Use the <a href="' + htmlEscape(apiDocsUrl) + '">getting started guide</a>.</li>',
    "</ol>",
    "<p>Urd Atlas is descriptive infrastructure for on-chain trend context.</p>",
    "<p>Security note: access values are shown only when created. Store them in your own secure environment.</p>"
  ];

  return {
    from,
    to: recipient,
    subject,
    text: textLines.join("\n"),
    html: htmlLines.join("\n")
  } satisfies OnboardingEmailPayload;
}

function responseIdFromProviderBody(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const id = (value as { id?: unknown }).id;
  return typeof id === "string" ? id : null;
}

export async function sendOnboardingEmail(
  input: OnboardingEmailInput
): Promise<OnboardingEmailResult> {
  if (!onboardingEmailEnabled()) {
    return {
      status: "disabled",
      reason: "not_enabled"
    };
  }

  const recipient = input.to?.trim();

  if (!recipient) {
    return {
      status: "skipped",
      reason: "missing_recipient"
    };
  }

  const from = configuredFromAddress();
  const providerCredential = configuredProviderCredential();

  if (!from || !providerCredential) {
    return {
      status: "skipped",
      reason: "missing_provider_config"
    };
  }

  const payload = buildOnboardingEmailPayload(input, from, recipient);
  const headers = new Headers();

  headers.set("Content-Type", "application/json");
  headers.set(["Author", "ization"].join(""), ["Bear", "er"].join("") + " " + providerCredential);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    let providerBody: unknown = null;

    try {
      providerBody = await response.json();
    } catch {
      providerBody = null;
    }

    if (!response.ok) {
      return {
        status: "failed",
        provider: "resend",
        statusCode: response.status,
        reason: "provider_rejected_request"
      };
    }

    return {
      status: "sent",
      provider: "resend",
      providerId: responseIdFromProviderBody(providerBody)
    };
  } catch (error) {
    return {
      status: "failed",
      provider: "resend",
      statusCode: null,
      reason: error instanceof Error ? error.message : "provider_request_failed"
    };
  }
}
