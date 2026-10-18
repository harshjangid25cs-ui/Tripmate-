-- Migration: Fix is_admin_jwt() email allowlist & stamp app_metadata for existing admin accounts
-- Timestamp: 20261019000016
-- Purpose:
--   1. Update public.is_admin_jwt() to accept:
--      a) service_role JWT
--      b) app_metadata.role IN ('admin', 'super_admin')  ← tamper-proof, primary check
--      c) Hardcoded allowlist of admin emails              ← fallback for accounts not yet stamped
--      d) @tripmate.in domain emails                       ← wildcard for all operators
--   2. Stamp app_metadata.role = 'super_admin' for any existing auth.users rows
--      matching the allowlist (idempotent COALESCE merge, never overwrites other keys).

-- ============================================================
-- 1. UPDATE is_admin_jwt()
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_jwt()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims jsonb;
  v_jwt    jsonb;
  v_email  text;
  v_role   text;
BEGIN
  -- CHECK 1: service_role key → always allow (used by server-side admin client)
  BEGIN
    v_claims := coalesce(current_setting('request.jwt.claims', true)::jsonb, '{}'::jsonb);
    IF v_claims ->> 'role' = 'service_role' THEN
      RETURN true;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Fall through
  END;

  -- CHECK 2 & 3 & 4: Supabase Auth JWT
  BEGIN
    v_jwt := auth.jwt();
    IF v_jwt IS NULL THEN
      RETURN false;
    END IF;

    -- 2. Tamper-proof app_metadata.role (set via service_role only)
    v_role := coalesce(v_jwt -> 'app_metadata' ->> 'role', '');
    IF v_role IN ('admin', 'super_admin') THEN
      RETURN true;
    END IF;

    -- 3. Hardcoded email allowlist + @tripmate.in domain (fallback for un-stamped accounts)
    v_email := lower(coalesce(v_jwt ->> 'email', ''));
    IF v_email IN (
      'tripmateoffical007@gmail.com',
      'superadmin@tripmate.in',
      'ops@tripmate.in',
      'catalog@tripmate.in',
      'finance@tripmate.in',
      'support@tripmate.in'
    ) THEN
      RETURN true;
    END IF;

    -- 4. @tripmate.in domain wildcard
    IF v_email LIKE '%@tripmate.in' THEN
      RETURN true;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- JWT context unavailable
  END;

  RETURN false;
END;
$$;

-- ============================================================
-- 2. STAMP app_metadata.role = 'super_admin' FOR EXISTING USERS
--    Uses COALESCE to merge — never overwrites unrelated keys.
--    Confirms email if not yet confirmed.
-- ============================================================
UPDATE auth.users
SET
  raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || '{"role": "super_admin", "admin_role": "super_admin"}'::jsonb,
  email_confirmed_at = coalesce(email_confirmed_at, now())
WHERE
  lower(email) IN (
    'tripmateoffical007@gmail.com',
    'superadmin@tripmate.in',
    'ops@tripmate.in',
    'catalog@tripmate.in',
    'finance@tripmate.in',
    'support@tripmate.in'
  );

-- Also update anyone with a @tripmate.in email who isn't already stamped
UPDATE auth.users
SET
  raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || '{"role": "super_admin", "admin_role": "super_admin"}'::jsonb,
  email_confirmed_at = coalesce(email_confirmed_at, now())
WHERE
  lower(email) LIKE '%@tripmate.in'
  AND (
    raw_app_meta_data IS NULL
    OR (raw_app_meta_data ->> 'role') IS NULL
    OR (raw_app_meta_data ->> 'role') NOT IN ('admin', 'super_admin')
  );
