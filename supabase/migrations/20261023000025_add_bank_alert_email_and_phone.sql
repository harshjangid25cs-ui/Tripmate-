-- Migration 20261023000025_add_bank_alert_email_and_phone.sql
-- Adds configurable Bank Alert Email and Bank Mobile Phone to pricing_config

ALTER TABLE public.pricing_config
  ADD COLUMN IF NOT EXISTS bank_alert_email text NOT NULL DEFAULT 'tripmateoffical007@gmail.com',
  ADD COLUMN IF NOT EXISTS bank_alert_phone text NOT NULL DEFAULT '9664340734';

-- Ensure row 1 has valid defaults
UPDATE public.pricing_config
SET 
  bank_alert_email = COALESCE(bank_alert_email, 'tripmateoffical007@gmail.com'),
  bank_alert_phone = COALESCE(bank_alert_phone, '9664340734')
WHERE id = 1;
