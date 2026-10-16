-- 20261016000013_production_coupons_pricing_emails.sql
-- TripMate Production Coupons, Dynamic Pricing, Email Logs & Audit Trail

-- 1. COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  description text DEFAULT '',
  discount_type text NOT NULL CHECK (discount_type IN ('flat', 'percent')),
  discount_value numeric(12,2) NOT NULL CHECK (discount_value >= 0),
  min_order_amount numeric(12,2) NOT NULL DEFAULT 0,
  max_discount numeric(12,2),
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure case-insensitive uniqueness on coupon codes
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code_unique ON public.coupons (lower(code));

-- Seed default commercial coupon EXPLOREINDIA
INSERT INTO public.coupons (code, description, discount_type, discount_value, min_order_amount, is_active)
VALUES ('EXPLOREINDIA', 'Welcome ₹2,000 off on curated Rajasthan itineraries', 'flat', 2000.00, 0, true)
ON CONFLICT (lower(code)) DO UPDATE SET
  discount_value = 2000.00,
  is_active = true;

-- 2. EMAIL LOGS TABLE
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  template text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  related_trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  related_booking_ref text,
  sent_by text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'queued', 'failed')),
  provider_message_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id text NOT NULL,
  actor_name text NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  before jsonb,
  after jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Audit log immutability trigger
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Audit log entries are immutable and append-only.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_modification ON public.admin_audit_logs;
CREATE TRIGGER trg_prevent_audit_log_modification
  BEFORE UPDATE OR DELETE ON public.admin_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();

-- 4. UPDATE recalc_trip_total() TO READ FROM coupons AND pricing_config
CREATE OR REPLACE FUNCTION public.recalc_trip_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_id uuid;
  v_booking_kind text;
  v_hotel_subtotal numeric(12,2);
  v_vehicle_subtotal numeric(12,2);
  v_stops_subtotal numeric(12,2);
  v_subtotal numeric(12,2);
  v_service_fee numeric(12,2) := 0;
  v_tax numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_coupon text := NULL;
  v_existing_coupon text;
  v_total numeric(12,2);
  v_cfg record;
  v_coupon_rec record;
BEGIN
  v_trip_id := COALESCE(NEW.trip_id, OLD.trip_id);

  SELECT booking_kind, coupon_code INTO v_booking_kind, v_existing_coupon
  FROM public.trips
  WHERE id = v_trip_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT service_fee, gst_rate, demo_coupon_code, demo_coupon_discount
  INTO v_cfg
  FROM public.pricing_config
  WHERE id = 1;

  SELECT COALESCE(SUM(subtotal), 0) INTO v_hotel_subtotal FROM public.trip_hotels WHERE trip_id = v_trip_id;
  SELECT COALESCE(SUM(subtotal), 0) INTO v_vehicle_subtotal FROM public.trip_vehicles WHERE trip_id = v_trip_id;
  SELECT COALESCE(SUM(subtotal), 0) INTO v_stops_subtotal FROM public.trip_stops WHERE trip_id = v_trip_id;

  v_subtotal := v_hotel_subtotal + v_vehicle_subtotal + v_stops_subtotal;

  IF v_booking_kind = 'normal' THEN
    IF v_subtotal = 0 THEN
      v_service_fee := 0;
      v_tax := 0;
      v_discount := 0;
      v_coupon := NULL;
    ELSE
      v_service_fee := COALESCE(v_cfg.service_fee, 999.00);
      v_tax := ROUND(COALESCE(v_cfg.gst_rate, 0.1800) * (v_subtotal + v_service_fee), 0);

      -- Check if customer applied a coupon, or default to EXPLOREINDIA
      v_coupon := COALESCE(v_existing_coupon, v_cfg.demo_coupon_code, 'EXPLOREINDIA');

      -- Fetch active coupon rule from public.coupons
      SELECT * INTO v_coupon_rec
      FROM public.coupons
      WHERE lower(code) = lower(v_coupon)
        AND is_active = true
        AND (valid_until IS NULL OR valid_until > now());

      IF FOUND THEN
        IF v_subtotal >= v_coupon_rec.min_order_amount THEN
          IF v_coupon_rec.discount_type = 'flat' THEN
            v_discount := v_coupon_rec.discount_value;
          ELSE
            v_discount := ROUND((v_coupon_rec.discount_value / 100.0) * (v_subtotal + v_service_fee), 0);
          END IF;

          IF v_coupon_rec.max_discount IS NOT NULL THEN
            v_discount := LEAST(v_discount, v_coupon_rec.max_discount);
          END IF;

          v_discount := LEAST(v_discount, v_subtotal + v_service_fee + v_tax);
          v_coupon := v_coupon_rec.code;
        ELSE
          v_discount := 0;
        END IF;
      ELSIF lower(v_coupon) = 'exploreindia' THEN
        -- Fallback to default EXPLOREINDIA ₹2000 demo discount
        v_discount := LEAST(COALESCE(v_cfg.demo_coupon_discount, 2000.00), v_subtotal + v_service_fee + v_tax);
        v_coupon := 'EXPLOREINDIA';
      ELSE
        v_discount := 0;
      END IF;
    END IF;
  ELSE
    -- Commercial booking
    v_service_fee := 0;
    v_tax := ROUND(COALESCE(v_cfg.gst_rate, 0.1800) * v_subtotal, 0);
    v_discount := 0;
    v_coupon := NULL;
  END IF;

  v_total := v_subtotal + v_service_fee + v_tax - v_discount;

  UPDATE public.trips
  SET
    subtotal_amount = v_subtotal,
    service_fee = v_service_fee,
    tax_amount = v_tax,
    discount_amount = v_discount,
    coupon_code = v_coupon,
    total_amount = v_total
  WHERE id = v_trip_id;

  RETURN NULL;
END;
$$;

-- 5. CUSTOMER COUPON APPLY RPC
CREATE OR REPLACE FUNCTION public.customer_apply_coupon(
  p_trip_id uuid,
  p_coupon_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
  v_coupon record;
  v_discount numeric(12,2) := 0;
  v_tax numeric(12,2);
  v_total numeric(12,2);
BEGIN
  -- Verify caller owns trip or is service_role
  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Trip not found');
  END IF;

  IF auth.uid() IS NOT NULL AND v_trip.user_id <> auth.uid() AND NOT public.is_admin_jwt() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  IF v_trip.status NOT IN ('draft', 'pending_approval') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot apply coupon to confirmed or completed booking');
  END IF;

  -- Validate coupon
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE lower(code) = lower(p_coupon_code)
    AND is_active = true
    AND (valid_until IS NULL OR valid_until > now());

  IF NOT FOUND THEN
    -- Check demo fallback EXPLOREINDIA
    IF lower(p_coupon_code) = 'exploreindia' THEN
      UPDATE public.trips SET coupon_code = 'EXPLOREINDIA' WHERE id = p_trip_id;
      -- Trigger recalc via mock update or recalculation
      UPDATE public.trip_hotels SET updated_at = now() WHERE trip_id = p_trip_id;
      SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
      RETURN jsonb_build_object(
        'ok', true,
        'coupon_code', 'EXPLOREINDIA',
        'discount_amount', v_trip.discount_amount,
        'total_amount', v_trip.total_amount
      );
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or expired coupon code');
  END IF;

  IF v_trip.subtotal_amount < v_coupon.min_order_amount THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', format('Minimum order amount for %s is ₹%s', v_coupon.code, v_coupon.min_order_amount)
    );
  END IF;

  -- Apply coupon
  UPDATE public.trips
  SET coupon_code = v_coupon.code
  WHERE id = p_trip_id;

  -- Fire recalculation
  IF EXISTS (SELECT 1 FROM public.trip_hotels WHERE trip_id = p_trip_id) THEN
    UPDATE public.trip_hotels SET updated_at = now() WHERE trip_id = p_trip_id;
  ELSIF EXISTS (SELECT 1 FROM public.trip_vehicles WHERE trip_id = p_trip_id) THEN
    UPDATE public.trip_vehicles SET updated_at = now() WHERE trip_id = p_trip_id;
  ELSE
    -- Manual calculation if no child rows yet
    NULL;
  END IF;

  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;

  RETURN jsonb_build_object(
    'ok', true,
    'coupon_code', v_coupon.code,
    'discount_amount', v_trip.discount_amount,
    'total_amount', v_trip.total_amount
  );
END;
$$;

-- 6. ADMIN RPCs: COUPONS & PRICING
CREATE OR REPLACE FUNCTION public.admin_upsert_coupon(
  p_code text,
  p_description text,
  p_discount_type text,
  p_discount_value numeric,
  p_min_order_amount numeric,
  p_max_discount numeric DEFAULT NULL,
  p_usage_limit integer DEFAULT NULL,
  p_is_active boolean DEFAULT true,
  p_valid_until timestamptz DEFAULT NULL,
  p_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon_id uuid;
  v_rec record;
BEGIN
  IF NOT public.is_admin_jwt() THEN
    RAISE EXCEPTION 'Access denied: Administrator privileges required';
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE public.coupons
    SET
      code = upper(trim(p_code)),
      description = COALESCE(p_description, ''),
      discount_type = p_discount_type,
      discount_value = p_discount_value,
      min_order_amount = COALESCE(p_min_order_amount, 0),
      max_discount = p_max_discount,
      usage_limit = p_usage_limit,
      is_active = p_is_active,
      valid_until = p_valid_until,
      updated_at = now()
    WHERE id = p_id
    RETURNING * INTO v_rec;
    v_coupon_id := p_id;
  ELSE
    INSERT INTO public.coupons (
      code, description, discount_type, discount_value, min_order_amount,
      max_discount, usage_limit, is_active, valid_until
    ) VALUES (
      upper(trim(p_code)), COALESCE(p_description, ''), p_discount_type, p_discount_value,
      COALESCE(p_min_order_amount, 0), p_max_discount, p_usage_limit, p_is_active, p_valid_until
    )
    ON CONFLICT (lower(code)) DO UPDATE SET
      description = EXCLUDED.description,
      discount_type = EXCLUDED.discount_type,
      discount_value = EXCLUDED.discount_value,
      min_order_amount = EXCLUDED.min_order_amount,
      max_discount = EXCLUDED.max_discount,
      usage_limit = EXCLUDED.usage_limit,
      is_active = EXCLUDED.is_active,
      valid_until = EXCLUDED.valid_until,
      updated_at = now()
    RETURNING * INTO v_rec;
    v_coupon_id := v_rec.id;
  END IF;

  RETURN to_jsonb(v_rec);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_toggle_coupon_active(
  p_id uuid,
  p_is_active boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec record;
BEGIN
  IF NOT public.is_admin_jwt() THEN
    RAISE EXCEPTION 'Access denied: Administrator privileges required';
  END IF;

  UPDATE public.coupons
  SET is_active = p_is_active, updated_at = now()
  WHERE id = p_id
  RETURNING * INTO v_rec;

  RETURN to_jsonb(v_rec);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_pricing_config(
  p_service_fee numeric,
  p_gst_rate numeric,
  p_demo_coupon_code text DEFAULT 'EXPLOREINDIA',
  p_demo_coupon_discount numeric DEFAULT 2000.00
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec record;
BEGIN
  IF NOT public.is_admin_jwt() THEN
    RAISE EXCEPTION 'Access denied: Administrator privileges required';
  END IF;

  UPDATE public.pricing_config
  SET
    service_fee = p_service_fee,
    gst_rate = p_gst_rate,
    demo_coupon_code = COALESCE(p_demo_coupon_code, demo_coupon_code),
    demo_coupon_discount = COALESCE(p_demo_coupon_discount, demo_coupon_discount)
  WHERE id = 1
  RETURNING * INTO v_rec;

  RETURN to_jsonb(v_rec);
END;
$$;

-- 7. RLS POLICIES
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Coupons RLS
CREATE POLICY "Public read active coupons" ON public.coupons
  FOR SELECT USING (is_active = true OR public.is_admin_jwt());

CREATE POLICY "Admin write coupons" ON public.coupons
  FOR ALL USING (public.is_admin_jwt());

-- Email logs RLS
CREATE POLICY "Admin read write email logs" ON public.email_logs
  FOR ALL USING (public.is_admin_jwt());

-- Audit logs RLS
CREATE POLICY "Admin read write audit logs" ON public.admin_audit_logs
  FOR SELECT USING (public.is_admin_jwt());

CREATE POLICY "Admin insert audit logs" ON public.admin_audit_logs
  FOR INSERT WITH CHECK (public.is_admin_jwt());

-- 8. REPLICA IDENTITY FULL & REALTIME PUBLICATION
ALTER TABLE public.coupons REPLICA IDENTITY FULL;
ALTER TABLE public.pricing_config REPLICA IDENTITY FULL;
ALTER TABLE public.email_logs REPLICA IDENTITY FULL;
ALTER TABLE public.admin_audit_logs REPLICA IDENTITY FULL;

DO $$
DECLARE
  t text;
  tables_to_add text[] := ARRAY[
    'coupons',
    'pricing_config',
    'email_logs',
    'admin_audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables_to_add LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
