-- Migration 23: WhatsApp OTP Authentication
-- Tables: wa_customers, wa_otp_challenges, wa_sessions
-- Functions: wa_issue_otp, wa_verify_otp

CREATE TABLE IF NOT EXISTS public.wa_customers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile            text NOT NULL UNIQUE CHECK (mobile ~ '^[6-9][0-9]{9}$'),
  name              text,
  email             text UNIQUE,
  status            text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','BANNED')),
  is_phone_verified boolean NOT NULL DEFAULT false,
  last_login_at     timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wa_otp_challenges (
  mobile        text PRIMARY KEY,
  code_hash     text NOT NULL,
  expires_at    timestamptz NOT NULL,
  attempts      int NOT NULL DEFAULT 0,
  last_sent_at  timestamptz NOT NULL DEFAULT now(),
  signup_name   text,
  signup_email  text
);

CREATE TABLE IF NOT EXISTS public.wa_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid NOT NULL REFERENCES public.wa_customers(id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  expires_at   timestamptz NOT NULL,
  revoked      boolean NOT NULL DEFAULT false,
  ip_address   text,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wa_sessions_customer_idx ON public.wa_sessions (customer_id);

ALTER TABLE public.wa_customers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_otp_challenges  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_sessions        ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.wa_customers, public.wa_otp_challenges, public.wa_sessions FROM anon, authenticated;

-- Atomic issue + resend cooldown. Returns false if still inside the cooldown.
CREATE OR REPLACE FUNCTION public.wa_issue_otp(
  p_mobile text, p_code_hash text,
  p_ttl_seconds int DEFAULT 300, p_cooldown_seconds int DEFAULT 30,
  p_name text DEFAULT null, p_email text DEFAULT null
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_mobile text;
BEGIN
  INSERT INTO public.wa_otp_challenges AS c
    (mobile, code_hash, expires_at, attempts, last_sent_at, signup_name, signup_email)
  VALUES
    (p_mobile, p_code_hash, now() + make_interval(secs => p_ttl_seconds), 0, now(), p_name, p_email)
  ON CONFLICT (mobile) DO UPDATE
    SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0,
        last_sent_at = now(), signup_name = excluded.signup_name, signup_email = excluded.signup_email
    WHERE c.last_sent_at <= now() - make_interval(secs => p_cooldown_seconds)
  RETURNING c.mobile INTO v_mobile;
  RETURN v_mobile IS NOT NULL;
END $$;

-- Atomic verify. Row lock makes the attempt budget race-proof under concurrent requests
CREATE OR REPLACE FUNCTION public.wa_verify_otp(
  p_mobile text, p_code_hash text, p_max_attempts int DEFAULT 5
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c public.wa_otp_challenges%rowtype;
BEGIN
  SELECT * INTO c FROM public.wa_otp_challenges WHERE mobile = p_mobile FOR UPDATE;
  IF NOT FOUND OR c.code_hash = '' THEN 
    RETURN jsonb_build_object('status','none'); 
  END IF;
  
  IF c.expires_at < now() THEN
    UPDATE public.wa_otp_challenges SET code_hash = '', attempts = 0, expires_at = now() - interval '1 second' WHERE mobile = p_mobile;
    RETURN jsonb_build_object('status','expired');
  END IF;
  
  IF c.attempts >= p_max_attempts THEN
    UPDATE public.wa_otp_challenges SET code_hash = '', expires_at = now() - interval '1 second' WHERE mobile = p_mobile;
    RETURN jsonb_build_object('status','locked');
  END IF;
  
  IF c.code_hash != p_code_hash THEN
    UPDATE public.wa_otp_challenges SET attempts = attempts + 1 WHERE mobile = p_mobile;
    RETURN jsonb_build_object('status','invalid');
  END IF;
  
  UPDATE public.wa_otp_challenges SET code_hash = '', attempts = 0, expires_at = now() - interval '1 second' WHERE mobile = p_mobile;
  RETURN jsonb_build_object('status','ok','name',c.signup_name,'email',c.signup_email);
END $$;

REVOKE ALL ON FUNCTION public.wa_issue_otp(text,text,int,int,text,text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.wa_verify_otp(text,text,int)             FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_issue_otp(text,text,int,int,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wa_verify_otp(text,text,int)             TO service_role;
