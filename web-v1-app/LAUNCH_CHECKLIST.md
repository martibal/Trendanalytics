# Launch Checklist — Urd Atlas

Alle trinn må være på plass før `npm run build && deploy`.

---

## 1. Stripe — opprett produkter og priser

Logg inn på [dashboard.stripe.com](https://dashboard.stripe.com) og opprett:

| Produkt       | Type         | Pris     | Env-variabel              |
|---------------|--------------|----------|---------------------------|
| Basic         | Subscription | $29/mo   | `STRIPE_PRICE_BASIC`      |
| Pro           | Subscription | $79/mo   | `STRIPE_PRICE_PRO`        |
| History Addon | One-time     | (valgfri)| `STRIPE_PRICE_HISTORY_ADDON` |

Kopier **Price ID** (starter med `price_`) inn i `.env`:

```env
STRIPE_SECRET_KEY=<stripe-live-secret-key>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-signing-secret>
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_HISTORY_ADDON=price_...
```

## 2. Stripe Webhook

I Stripe Dashboard → Developers → Webhooks → Add endpoint:

- **URL:** `https://yourdomain.com/api/v1/webhook`
- **Events å lytte på:**
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

Kopier **Signing secret** til `STRIPE_WEBHOOK_SECRET`.

## 3. Clerk — autentisering

Logg inn på [dashboard.clerk.com](https://dashboard.clerk.com):

1. Opprett en applikasjon
2. Kopier nøkler til `.env`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=<clerk-live-secret-key>
```

3. I Clerk Dashboard → Redirects:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in: `/dashboard`
   - After sign-up: `/dashboard`

## 4. Database — Supabase / PostgreSQL

1. Opprett en PostgreSQL-database (Supabase anbefales)
2. Kopier connection strings til `.env`:

```env
DATABASE_URL=<production-transaction-pooler-url>
DIRECT_URL=<production-direct-database-url>
```

3. Kjør migrasjoner:

```bash
npx prisma migrate deploy
```

## 5. AWS S3 — datakilde

```env
DATA_SOURCE=s3
S3_BUCKET=urdatlas-data
S3_REGION=eu-west-1
S3_PREFIX=published/v1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=<aws-secret-access-key-if-used>
```

## 6. Upstash Redis — rate limiting

Opprett en database på [upstash.com](https://upstash.com):

```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=<upstash-rest-token>
```

## 7. App miljø

```env
NEXT_PUBLIC_APP_ENV=production
```

## 8. Filer som er endret — erstatt i prosjektet

| Fil (output)              | Erstatter                                              |
|---------------------------|--------------------------------------------------------|
| `landing.ts`              | `src/lib/landing.ts`                                   |
| `Hero.tsx`                | `src/components/landing/Hero.tsx`                      |
| `Plans.tsx`               | `src/components/landing/Plans.tsx`                     |
| `CheckoutButton.tsx`      | `src/components/landing/CheckoutButton.tsx` (ny fil)   |
| `checkout_route.ts`       | `src/app/api/v1/checkout/route.ts`                     |
| `HeroSidePanels.tsx`      | `src/components/landing/HeroSidePanels.tsx`            |
| `LiveChains.tsx`          | `src/components/landing/LiveChains.tsx`                |
| `ExploreGrid.tsx`         | `src/components/landing/ExploreGrid.tsx`               |

## 9. Bygg og test lokalt

```bash
npm run build
npm run start
```

Sjekk:
- [ ] Forsiden laster uten feil
- [ ] "See plans" → chain-picker for Basic, direkte checkout for Pro
- [ ] Uten innlogging → videre til /sign-up
- [ ] Stripe checkout åpner
- [ ] Etter betaling → /dashboard?checkout=success
- [ ] Dashboard viser aktiv plan og API-nøkkel
- [ ] Webhook mottas og setter subscription.status = active i DB

## 10. Deploy

```bash
# Vercel
vercel --prod

# Eller
npm run build && <din deploy-kommando>
```

---

## Brukerflyten etter launch

```
Besøker forsiden
  → Leser hero, regime-labels, JSON-beskrivelse
  → Scroller til #plans
  → Klikker "Start Basic" eller "Start Pro"
    → Ikke innlogget? → /sign-up → tilbake til /#plans
    → Basic: velger chain (BTC/ETH/ARB/BASE) → Stripe checkout
    → Pro: direkte til Stripe checkout
  → Betaler
  → /dashboard?checkout=success
  → Ser aktiv plan, entitlet kjede, API-nøkkel
  → Bruker API-nøkkel til å hente JSON
```

---

## Tillegg: Nye filer fra denne runden

| Fil (output)                  | Destinasjon                                                |
|-------------------------------|------------------------------------------------------------|
| `middleware.ts`               | `src/middleware.ts` (ny fil — KRITISK)                     |
| `CheckoutSuccessBanner.tsx`   | `src/components/dashboard/CheckoutSuccessBanner.tsx` (ny) |
| `.env.production.template`    | Rot av prosjektet — fyll inn og rename til `.env`          |

## Dashboard — legg til CheckoutSuccessBanner

I `src/app/dashboard/page.tsx`, legg til import og komponent øverst i `<main>`:

```tsx
import { Suspense } from "react";
import CheckoutSuccessBanner from "@/components/dashboard/CheckoutSuccessBanner";

// Inne i return, første barn av <main>:
<Suspense fallback={null}>
  <CheckoutSuccessBanner />
</Suspense>
```

## Middleware — kritisk for sikkerhet

`src/middleware.ts` er **ny og nødvendig**. Uten den er `/dashboard` og `/api/v1/checkout` åpne for alle. Filen beskytter:
- `/dashboard` — krever innlogging
- `/api/v1/checkout` — krever innlogging  
- `/api/v1/keys` — krever innlogging
- `/api/v1/files` — krever innlogging (API-nøkkel-validering skjer inne i routen)

## Stripe — viktig om Basic-plan og chain

Checkout-routen sender nå `entitled_chain` fra body (valgt i chain-picker) som Stripe metadata.
Webhook-en plukker dette opp og setter `entitledChain` på subscription-raden i databasen.
Dette er det som styrer hvilken chain en Basic-subscriber kan hente JSON for.

**Test-sekvens etter deploy:**
1. Opprett bruker → `/dashboard` → ser "Account connected, billing incomplete"
2. Gå til `/#plans` → klikk "Start Basic" → velg ETH → Stripe checkout
3. Bruk Stripe test-kort `4242 4242 4242 4242`
4. Returnerer til `/dashboard?checkout=success` → grønn banner
5. Refresh → ser aktiv plan, ETH som entitled chain, kan opprette API-nøkkel

