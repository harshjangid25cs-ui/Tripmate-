-- Migration 18: Fix UPI Config Real-Time Sync, Persistence, RLS & Publication
-- Guarantees live merchant UPI synchronization between Superadmin and Customer Checkout

-- 1. ADD updated_at AND ENSURE STRICT SCHEMAS ON public.pricing_config
ALTER TABLE public.pricing_config
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS merchant_upi_vpa text NOT NULL DEFAULT 'tripmate@upi',
  ADD COLUMN IF NOT EXISTS merchant_payee_name text NOT NULL DEFAULT 'TripMate Travels',
  ADD COLUMN IF NOT EXISTS active_payment_gateway text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS upi_auto_confirm boolean NOT NULL DEFAULT true;

-- Helper trigger for automatic updated_at maintenance
DROP TRIGGER IF EXISTS trg_pricing_config_updated_at ON public.pricing_config;
CREATE TRIGGER trg_pricing_config_updated_at
  BEFORE UPDATE ON public.pricing_config
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Add merchant_vpa audit tracking to public.payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS merchant_vpa text;

-- Ensure canonical singleton row (id = 1) exists with defaults
INSERT INTO public.pricing_config (
  id,
  service_fee,
  gst_rate,
  demo_coupon_code,
  demo_coupon_discount,
  merchant_upi_vpa,
  merchant_payee_name,
  active_payment_gateway,
  upi_auto_confirm,
  updated_at
)
VALUES (
  1,
  999.00,
  0.18,
  'EXPLOREINDIA',
  2000.00,
  'tripmate@upi',
  'TripMate Travels',
  'auto',
  true,
  now()
)
ON CONFLICT (id) DO UPDATE SET
  merchant_upi_vpa = COALESCE(public.pricing_config.merchant_upi_vpa, 'tripmate@upi'),
  merchant_payee_name = COALESCE(public.pricing_config.merchant_payee_name, 'TripMate Travels'),
  active_payment_gateway = COALESCE(public.pricing_config.active_payment_gateway, 'auto'),
  upi_auto_confirm = COALESCE(public.pricing_config.upi_auto_confirm, true),
  updated_at = now();

-- 2. REWRITE public.admin_update_pricing_config RPC
CREATE OR REPLACE FUNCTION public.admin_update_pricing_config(
  p_service_fee numeric,
  p_gst_rate numeric,
  p_demo_coupon_code text DEFAULT 'EXPLOREINDIA',
  p_demo_coupon_discount numeric DEFAULT 2000.00,
  p_merchant_upi_vpa text DEFAULT NULL,
  p_merchant_payee_name text DEFAULT NULL,
  p_active_payment_gateway text DEFAULT NULL,
  p_upi_auto_confirm boolean DEFAULT NULL,
  p_reason text DEFAULT NULL
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
    service_fee = COALESCE(p_service_fee, service_fee),
    gst_rate = COALESCE(p_gst_rate, gst_rate),
    demo_coupon_code = COALESCE(p_demo_coupon_code, demo_coupon_code),
    demo_coupon_discount = COALESCE(p_demo_coupon_discount, demo_coupon_discount),
    merchant_upi_vpa = COALESCE(NULLIF(trim(p_merchant_upi_vpa), ''), merchant_upi_vpa),
    merchant_payee_name = COALESCE(NULLIF(trim(p_merchant_payee_name), ''), merchant_payee_name),
    active_payment_gateway = COALESCE(p_active_payment_gateway, active_payment_gateway),
    upi_auto_confirm = COALESCE(p_upi_auto_confirm, upi_auto_confirm),
    updated_at = now()
  WHERE id = 1
  RETURNING * INTO v_rec;

  IF v_rec IS NULL THEN
    INSERT INTO public.pricing_config (
      id,
      service_fee,
      gst_rate,
      demo_coupon_code,
      demo_coupon_discount,
      merchant_upi_vpa,
      merchant_payee_name,
      active_payment_gateway,
      upi_auto_confirm,
      updated_at
    )
    VALUES (
      1,
      COALESCE(p_service_fee, 999.00),
      COALESCE(p_gst_rate, 0.18),
      COALESCE(p_demo_coupon_code, 'EXPLOREINDIA'),
      COALESCE(p_demo_coupon_discount, 2000.00),
      COALESCE(NULLIF(trim(p_merchant_upi_vpa), ''), 'tripmate@upi'),
      COALESCE(NULLIF(trim(p_merchant_payee_name), ''), 'TripMate Travels'),
      COALESCE(p_active_payment_gateway, 'auto'),
      COALESCE(p_upi_auto_confirm, true),
      now()
    )
    RETURNING * INTO v_rec;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'data', to_jsonb(v_rec),
    'id', v_rec.id,
    'service_fee', v_rec.service_fee,
    'gst_rate', v_rec.gst_rate,
    'demo_coupon_code', v_rec.demo_coupon_code,
    'demo_coupon_discount', v_rec.demo_coupon_discount,
    'merchant_upi_vpa', v_rec.merchant_upi_vpa,
    'merchant_payee_name', v_rec.merchant_payee_name,
    'active_payment_gateway', v_rec.active_payment_gateway,
    'upi_auto_confirm', v_rec.upi_auto_confirm,
    'updated_at', v_rec.updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_pricing_config(numeric, numeric, text, numeric, text, text, text, boolean, text) TO authenticated, service_role;

-- 3. REWRITE submit_direct_upi_payment TO CAPTURE ACTIVE MERCHANT VPA
CREATE OR REPLACE FUNCTION public.submit_direct_upi_payment(
  p_trip_id uuid,
  p_utr_number text,
  p_payer_vpa text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
  v_payment_id uuid;
  v_clean_utr text;
  v_invoice_number text;
  v_active_merchant_vpa text;
BEGIN
  v_clean_utr := trim(p_utr_number);

  -- 1. Validate exactly 12 numeric digits
  IF v_clean_utr !~ '^\d{12}$' THEN
    RAISE EXCEPTION 'Invalid UTR format. UTR must be exactly 12 numeric digits (e.g. 429183746512).';
  END IF;

  -- 2. Verify uniqueness of UTR across all bookings (idempotent / anti-replay guard)
  IF EXISTS (SELECT 1 FROM public.payments WHERE utr_number = v_clean_utr) THEN
    RAISE EXCEPTION 'UTR reference % has already been used for another booking.', v_clean_utr;
  END IF;

  -- 3. Lock trip row exclusively
  SELECT * INTO v_trip
  FROM public.trips
  WHERE id = p_trip_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  -- Read active merchant VPA from singleton pricing_config
  SELECT merchant_upi_vpa INTO v_active_merchant_vpa
  FROM public.pricing_config
  ORDER BY updated_at DESC
  LIMIT 1;

  v_active_merchant_vpa := COALESCE(v_active_merchant_vpa, 'tripmate@upi');

  -- If trip is already confirmed and has payment
  IF v_trip.status = 'confirmed' THEN
    SELECT id INTO v_payment_id
    FROM public.payments
    WHERE trip_id = p_trip_id AND status = 'succeeded';

    IF v_payment_id IS NOT NULL THEN
      SELECT invoice_number INTO v_invoice_number FROM public.invoices WHERE trip_id = p_trip_id;
      RETURN jsonb_build_object(
        'ok', true,
        'trip_id', v_trip.id,
        'booking_ref', v_trip.booking_ref,
        'invoice_number', v_invoice_number,
        'payment_id', v_payment_id,
        'merchant_vpa', v_active_merchant_vpa,
        'already_processed', true
      );
    END IF;
  END IF;

  -- 4. Record direct UPI payment record with active merchant VPA
  INSERT INTO public.payments (
    trip_id,
    user_id,
    provider,
    provider_reference,
    method,
    amount,
    currency,
    status,
    utr_number,
    payer_vpa,
    merchant_vpa,
    verification_status
  )
  VALUES (
    p_trip_id,
    v_trip.user_id,
    'direct_upi',
    'UTR-' || v_clean_utr,
    'upi',
    v_trip.total_amount,
    'INR',
    'succeeded',
    v_clean_utr,
    p_payer_vpa,
    v_active_merchant_vpa,
    'pending_verification'
  )
  RETURNING id INTO v_payment_id;

  -- 5. Mark trip confirmed immediately (Instant Customer Confirmation)
  UPDATE public.trips
  SET
    status = 'confirmed',
    confirmed_at = COALESCE(confirmed_at, now())
  WHERE id = p_trip_id;

  -- 6. Run finalize_booking for chauffeur assignment, ticket codes, itinerary, invoice
  PERFORM public.finalize_booking(p_trip_id);

  SELECT invoice_number INTO v_invoice_number
  FROM public.invoices
  WHERE trip_id = p_trip_id;

  -- 7. Add specific status history note mentioning UTR and Merchant VPA
  INSERT INTO public.trip_status_history (
    trip_id,
    from_status,
    to_status,
    note,
    changed_by
  )
  VALUES (
    p_trip_id,
    v_trip.status,
    'confirmed',
    'Direct UPI payment submitted (UTR: ' || v_clean_utr || ', Payee: ' || v_active_merchant_vpa || ') - Pending Admin Verification',
    v_trip.user_id
  );

  RETURN jsonb_build_object(
    'ok', true,
    'trip_id', v_trip.id,
    'booking_ref', v_trip.booking_ref,
    'invoice_number', v_invoice_number,
    'payment_id', v_payment_id,
    'utr_number', v_clean_utr,
    'merchant_vpa', v_active_merchant_vpa,
    'verification_status', 'pending_verification'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_direct_upi_payment(uuid, text, text) TO authenticated, service_role;

-- 4. PUBLIC READ POLICY & GRANTS ON public.pricing_config
GRANT SELECT ON public.pricing_config TO anon, authenticated;

DROP POLICY IF EXISTS "pricing_config_select" ON public.pricing_config;
CREATE POLICY "pricing_config_select" ON public.pricing_config
  FOR SELECT TO authenticated, anon
  USING (true);

-- 5. REPLICA IDENTITY FULL & SUPABASE REALTIME PUBLICATION
ALTER TABLE public.pricing_config REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'pricing_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pricing_config;
  END IF;
END $$;
