-- Migration 15: Direct UPI QR + UPI Intent + 12-Digit UTR Verification Payment Gateway
-- Implements native 0%-fee Direct UPI merchant settlement with strict UTR uniqueness,
-- admin audit ledger, auto-invoicing, and fraud rejection safeguards.

-- 1. MERCHANT UPI CONFIGURATION IN public.pricing_config
ALTER TABLE public.pricing_config
  ADD COLUMN IF NOT EXISTS merchant_upi_vpa text DEFAULT 'tripmate@upi',
  ADD COLUMN IF NOT EXISTS merchant_payee_name text DEFAULT 'TripMate Travels',
  ADD COLUMN IF NOT EXISTS active_payment_gateway text DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS upi_auto_confirm boolean DEFAULT true;

-- Enforce valid gateway modes
ALTER TABLE public.pricing_config
  DROP CONSTRAINT IF EXISTS pricing_config_gateway_check;

ALTER TABLE public.pricing_config
  ADD CONSTRAINT pricing_config_gateway_check
  CHECK (active_payment_gateway IN ('auto', 'direct_upi_utr', 'razorpay', 'demo'));

-- Initialize default row if not already populated
UPDATE public.pricing_config
SET
  merchant_upi_vpa = COALESCE(merchant_upi_vpa, 'tripmate@upi'),
  merchant_payee_name = COALESCE(merchant_payee_name, 'TripMate Travels'),
  active_payment_gateway = COALESCE(active_payment_gateway, 'auto'),
  upi_auto_confirm = COALESCE(upi_auto_confirm, true)
WHERE id = 1;

-- 2. UTR & VPA TRACKING ON public.payments
-- Allow direct_upi as provider
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_provider_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_provider_check
  CHECK (provider IN ('demo', 'razorpay', 'direct_upi'));

-- Add UTR tracking columns
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS utr_number text,
  ADD COLUMN IF NOT EXISTS payer_vpa text,
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'verified';

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_verification_status_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_verification_status_check
  CHECK (verification_status IN ('pending_verification', 'verified', 'rejected'));

-- Unique partial index: 12-digit UTR number can NEVER be submitted twice across any booking
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_utr_number
  ON public.payments (utr_number)
  WHERE utr_number IS NOT NULL;

-- 3. UPDATE admin_update_pricing_config RPC
CREATE OR REPLACE FUNCTION public.admin_update_pricing_config(
  p_service_fee numeric,
  p_gst_rate numeric,
  p_demo_coupon_code text DEFAULT 'EXPLOREINDIA',
  p_demo_coupon_discount numeric DEFAULT 2000.00,
  p_merchant_upi_vpa text DEFAULT NULL,
  p_merchant_payee_name text DEFAULT NULL,
  p_active_payment_gateway text DEFAULT NULL,
  p_upi_auto_confirm boolean DEFAULT NULL
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
    demo_coupon_discount = COALESCE(p_demo_coupon_discount, demo_coupon_discount),
    merchant_upi_vpa = COALESCE(p_merchant_upi_vpa, merchant_upi_vpa),
    merchant_payee_name = COALESCE(p_merchant_payee_name, merchant_payee_name),
    active_payment_gateway = COALESCE(p_active_payment_gateway, active_payment_gateway),
    upi_auto_confirm = COALESCE(p_upi_auto_confirm, upi_auto_confirm)
  WHERE id = 1
  RETURNING * INTO v_rec;

  RETURN to_jsonb(v_rec);
END;
$$;

-- 4. CUSTOMER ATOMIC SUBMIT DIRECT UPI PAYMENT RPC
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
        'already_processed', true
      );
    END IF;
  END IF;

  -- 4. Record direct UPI payment record
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

  -- 7. Add specific status history note mentioning UTR audit
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
    'Direct UPI payment submitted (UTR: ' || v_clean_utr || ') - Pending Admin Verification',
    v_trip.user_id
  );

  RETURN jsonb_build_object(
    'ok', true,
    'trip_id', v_trip.id,
    'booking_ref', v_trip.booking_ref,
    'invoice_number', v_invoice_number,
    'payment_id', v_payment_id,
    'utr_number', v_clean_utr,
    'verification_status', 'pending_verification'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_direct_upi_payment(uuid, text, text) TO authenticated, service_role;

-- 5. SUPERADMIN UTR VERIFICATION & FRAUD REJECTION RPC
CREATE OR REPLACE FUNCTION public.admin_verify_upi_payment(
  p_payment_id uuid,
  p_status text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment record;
  v_trip record;
BEGIN
  IF NOT public.is_admin_jwt() THEN
    RAISE EXCEPTION 'Access denied: Administrator privileges required';
  END IF;

  IF p_status NOT IN ('verified', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Status must be verified or rejected.';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % not found', p_payment_id;
  END IF;

  -- Update payment verification status
  UPDATE public.payments
  SET
    verification_status = p_status,
    status = CASE WHEN p_status = 'rejected' THEN 'failed' ELSE status END
  WHERE id = p_payment_id;

  -- If rejected, cancel booking and notify customer
  IF p_status = 'rejected' THEN
    UPDATE public.trips
    SET
      status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = 'Payment verification rejected: ' || COALESCE(p_notes, 'Invalid or fake UTR reference')
    WHERE id = v_payment.trip_id
    RETURNING * INTO v_trip;

    INSERT INTO public.trip_status_history (
      trip_id,
      from_status,
      to_status,
      note,
      changed_by
    )
    VALUES (
      v_payment.trip_id,
      'confirmed',
      'cancelled',
      'Superadmin rejected UTR ' || COALESCE(v_payment.utr_number, 'N/A') || ': ' || COALESCE(p_notes, 'Invalid or fake UTR reference'),
      auth.uid()
    );

    INSERT INTO public.notifications (
      profile_id,
      trip_id,
      type,
      message
    )
    VALUES (
      v_payment.user_id,
      v_payment.trip_id,
      'booking_cancelled',
      'Your booking was cancelled: UPI payment verification failed (' || COALESCE(p_notes, 'Invalid UTR reference') || ').'
    );
  ELSE
    INSERT INTO public.trip_status_history (
      trip_id,
      from_status,
      to_status,
      note,
      changed_by
    )
    VALUES (
      v_payment.trip_id,
      'confirmed',
      'confirmed',
      'Superadmin verified UTR ' || COALESCE(v_payment.utr_number, 'N/A') || ' successfully' || COALESCE(' - ' || p_notes, ''),
      auth.uid()
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'payment_id', p_payment_id,
    'verification_status', p_status,
    'trip_id', v_payment.trip_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_verify_upi_payment(uuid, text, text) TO authenticated, service_role;
