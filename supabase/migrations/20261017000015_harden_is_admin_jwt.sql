-- Migration 15: Harden is_admin_jwt() to check app_metadata.role
-- Eliminates email pattern matching (LIKE '%@tripmate.in') to prevent privilege escalation per SEC-04.

CREATE OR REPLACE FUNCTION public.is_admin_jwt()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims jsonb;
  v_jwt jsonb;
BEGIN
  -- 1. Check service_role key claims (SUPABASE_SERVICE_ROLE_KEY)
  BEGIN
    v_claims := coalesce(current_setting('request.jwt.claims', true)::jsonb, '{}'::jsonb);
    IF v_claims ->> 'role' = 'service_role' THEN
      RETURN true;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Fall through to auth.jwt() check
  END;

  -- 2. Check Supabase Auth JWT app_metadata.role (tamper-proof, set via server only)
  BEGIN
    v_jwt := auth.jwt();
    IF v_jwt IS NOT NULL THEN
      IF (v_jwt -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin') THEN
        RETURN true;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Context unavailable
  END;

  RETURN false;
END;
$$;

-- How to grant the admin role to an operator account safely:
-- UPDATE auth.users 
-- SET raw_app_meta_data = raw_app_meta_data || '{"role": "super_admin"}'::jsonb 
-- WHERE email = 'YOUR_EMAIL@DOMAIN.COM';
