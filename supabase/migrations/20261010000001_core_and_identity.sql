-- Migration 1: Core extensions, sequences, updated_at helper, identity and pricing config
-- Source of truth: DATABASE.md §0 and §1

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Sequences for human-readable references
CREATE SEQUENCE IF NOT EXISTS booking_ref_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1;

-- Helper function to maintain updated_at on (U) tables
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Table: profiles (U)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Trigger to create profile on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = CASE 
      WHEN profiles.full_name = '' THEN EXCLUDED.full_name 
      ELSE profiles.full_name 
    END,
    email = COALESCE(EXCLUDED.email, profiles.email),
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Table: companies (U)
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  gst_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Table: company_members
CREATE TABLE IF NOT EXISTS public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  employee_id text,
  department text,
  designation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, profile_id)
);

-- Table: policies
CREATE TABLE IF NOT EXISTS public.policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('hotel', 'vehicle', 'approval')),
  rule_text text NOT NULL,
  limit_value numeric(12,2) CHECK (limit_value >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: pricing_config (single row)
CREATE TABLE IF NOT EXISTS public.pricing_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  service_fee numeric(12,2) NOT NULL DEFAULT 999 CHECK (service_fee >= 0),
  gst_rate numeric(5,4) NOT NULL DEFAULT 0.18 CHECK (gst_rate BETWEEN 0 AND 1),
  demo_coupon_code text DEFAULT 'EXPLOREINDIA',
  demo_coupon_discount numeric(12,2) NOT NULL DEFAULT 2000 CHECK (demo_coupon_discount >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed single row if not exists
INSERT INTO public.pricing_config (id, service_fee, gst_rate, demo_coupon_code, demo_coupon_discount)
VALUES (1, 999, 0.18, 'EXPLOREINDIA', 2000)
ON CONFLICT (id) DO NOTHING;
