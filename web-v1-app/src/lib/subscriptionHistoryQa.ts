import type { QaEntry } from "@/lib/qa";

export const subscriptionHistoryQa: QaEntry = {
  id: "subscription-history-access",
  category: "JSON and Subscription",
  question: "How much history do I get when I subscribe?",
  basic: [
    "Basic gives immediate access to 90 days of history on your selected chain. Pro gives immediate access to the full published history — every published day since 1 December 2024, and growing — across all four chains. Both continue with daily delivery going forward.",
    "The free sample pack gives you 14 days to test the join itself. The subscription tiers give you enough history to evaluate whether the pattern holds for your own use case.",
  ],
  advanced: [
    "Basic is scoped to one selected chain and its latest 90 days. Pro is scoped to all four chains and can enumerate the published history through each chain's manifest, then retrieve the actual published day files across the available archive.",
    "The free sample pack is deliberately small enough to test integration mechanics. Subscriber history is the larger evidence surface for regime-conditioned analysis, validation, and testing against your own downstream metrics.",
  ],
};
