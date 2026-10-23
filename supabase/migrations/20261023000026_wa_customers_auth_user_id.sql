-- Migration 26: Add auth_user_id to wa_customers to link WhatsApp OTP logins with Supabase auth.users
ALTER TABLE public.wa_customers 
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wa_customers_auth_user ON public.wa_customers(auth_user_id);
