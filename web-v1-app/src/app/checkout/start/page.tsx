import Link from "next/link";

export const dynamic = "force-dynamic";

type SearchParamsValue = string | string[] | undefined;
type CheckoutPlan = "basic" | "pro";

type CheckoutStartPageProps = {
  searchParams?: Promise<Record<string, SearchParamsValue>>;
};

function normalizePlan(value: SearchParamsValue): CheckoutPlan | null {
  const raw = Array.isArray(value) ? value[0] : value;

  if (raw === "basic" || raw === "single-chain" || raw === "single_chain") {
    return "basic";
  }

  if (raw === "pro" || raw === "research") {
    return "pro";
  }

  return null;
}

function planLabel(plan: CheckoutPlan): string {
  return plan === "basic" ? "Single Chain" : "Research";
}

function planDescription(plan: CheckoutPlan): string {
  if (plan === "basic") {
    return "Continue to Stripe Checkout to select one chain and start the Single Chain subscription.";
  }

  return "Continue to Stripe Checkout to start the Research subscription.";
}

export default async function CheckoutStartPage({ searchParams }: CheckoutStartPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const plan = normalizePlan(resolvedSearchParams.plan);
  const checkoutAction = plan ? `/api/v1/checkout?plan=${plan}` : null;

  return (
    <main style={{ minHeight: "calc(100vh - 88px)", display: "grid", placeItems: "center", padding: "96px 24px", background: "radial-gradient(circle at 50% 0%, rgba(196,146,48,.10), transparent 34%), var(--surface0)" }}>
      <section style={{ width: "min(100%, 680px)", border: "1px solid var(--line)", borderRadius: "8px", background: "linear-gradient(180deg, rgba(196,146,48,.075), rgba(17,30,48,.64) 48%, rgba(8,15,26,.92))", boxShadow: "0 24px 72px rgba(0,0,0,.26)", padding: "34px" }}>
        <div style={{ marginBottom: "14px", color: "var(--gold)", fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase" }}>Checkout continuation</div>
        <h1 style={{ margin: "0 0 14px", color: "var(--ink)", fontFamily: "var(--serif)", fontSize: "clamp(38px, 5vw, 58px)", fontWeight: 400, letterSpacing: "-.045em", lineHeight: 1 }}>Continue to checkout</h1>
        {plan && checkoutAction ? (
          <>
            <p style={{ margin: "0 0 26px", maxWidth: "52ch", color: "var(--ink2)", fontSize: "15px", lineHeight: 1.65 }}>You are signed in. Continue with the {planLabel(plan)} plan. {planDescription(plan)}</p>
            <form action={checkoutAction} method="post" style={{ margin: 0 }}>
              <button type="submit" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: "44px", padding: "0 18px", border: 0, borderRadius: "4px", background: "var(--gold)", color: "#061322", cursor: "pointer", fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" }}>Continue to Stripe Checkout</button>
            </form>
          </>
        ) : (
          <>
            <p style={{ margin: "0 0 26px", maxWidth: "52ch", color: "var(--ink2)", fontSize: "15px", lineHeight: 1.65 }}>The checkout plan is missing or invalid. Return to pricing and choose a plan again.</p>
            <Link href="/#pricing" style={{ color: "var(--gold)", fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" }}>Return to pricing</Link>
          </>
        )}
      </section>
    </main>
  );
}
