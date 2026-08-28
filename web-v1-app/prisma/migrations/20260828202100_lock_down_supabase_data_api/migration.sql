-- Urd Atlas uses Prisma/server-side Postgres access, not Supabase Data API table access.
-- Keep customer/account/billing tables closed to anon/authenticated PostgREST roles.

ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public._prisma_migrations,
  public.accounts,
  public.api_keys,
  public.custom_outputs,
  public.stripe_webhook_events,
  public.subscriptions
FROM anon, authenticated, public;

REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, public;
