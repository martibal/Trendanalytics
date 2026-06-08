-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'StripeWebhookEventStatus'
  ) THEN
    CREATE TYPE "StripeWebhookEventStatus" AS ENUM ('processing', 'processed', 'ignored', 'failed');
  END IF;
END
$$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "stripe_webhook_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "stripe_event_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "status" "StripeWebhookEventStatus" NOT NULL,
  "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMPTZ(6),
  "error_code" TEXT,

  CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "stripe_webhook_events_stripe_event_id_key"
  ON "stripe_webhook_events"("stripe_event_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "stripe_webhook_events_event_type_idx"
  ON "stripe_webhook_events"("event_type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "stripe_webhook_events_status_idx"
  ON "stripe_webhook_events"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "stripe_webhook_events_received_at_idx"
  ON "stripe_webhook_events"("received_at");
