-- Migration 14: Unique constraint on payments(provider, provider_reference)
-- Enforces idempotency for payment gateways (Razorpay, Demo) per DAT-01.
-- Replaces partial unique index with a plain table UNIQUE constraint so Postgres can infer it during ON CONFLICT (provider, provider_reference).

DROP INDEX IF EXISTS public.idx_payments_provider_reference;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_payments_provider_reference'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT uq_payments_provider_reference UNIQUE (provider, provider_reference);
  END IF;
END $$;
