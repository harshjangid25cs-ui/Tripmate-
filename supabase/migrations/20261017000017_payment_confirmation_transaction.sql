-- Migration 17: Payment Confirmation Atomic RPC Function
-- Moves executePaymentConfirmation core into ONE atomic Postgres transaction.
-- Enforces row-level locking (SELECT FOR UPDATE), amount verification,
-- idempotency via ON CONFLICT DO NOTHING, sequence-generated invoices,
-- and execution restricted to service_role.

CREATE OR REPLACE FUNCTION public.confirm_payment_and_finalize_trip(
  p_trip_id uuid,
  p_provider text,
  p_provider_reference text,
  p_method text DEFAULT 'card',
  p_amount numeric DEFAULT NULL,
  p_currency text DEFAULT 'INR'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
  v_existing_payment record;
  v_existing_invoice record;
  v_payment_id uuid;
  v_invoice_number text;
  v_paid_amount numeric;
BEGIN
  -- 1. Lock the trip row exclusively to serialize concurrent confirmation requests
  SELECT * INTO v_trip
  FROM public.trips
  WHERE id = p_trip_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  -- 2. Check if payment already exists for this provider reference
  SELECT id, status, amount INTO v_existing_payment
  FROM public.payments
  WHERE provider = p_provider AND provider_reference = p_provider_reference;

  -- Check if invoice already exists
  SELECT id, invoice_number INTO v_existing_invoice
  FROM public.invoices
  WHERE trip_id = p_trip_id;

  -- If trip is confirmed and payment already recorded, return immediately with already_processed = true
  IF v_trip.status = 'confirmed' AND v_existing_payment.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'trip_id', v_trip.id,
      'booking_ref', v_trip.booking_ref,
      'invoice_number', v_existing_invoice.invoice_number,
      'payment_id', v_existing_payment.id,
      'already_processed', true
    );
  END IF;

  -- 3. Verify paid amount equals trip total before confirming
  v_paid_amount := COALESCE(p_amount, v_trip.total_amount);
  IF p_amount IS NOT NULL AND round(p_amount, 2) <> round(v_trip.total_amount, 2) THEN
    RAISE EXCEPTION 'Payment amount mismatch: received %, expected %', p_amount, v_trip.total_amount;
  END IF;

  -- 4. Insert payment record (idempotent ON CONFLICT DO NOTHING)
  INSERT INTO public.payments (
    trip_id,
    user_id,
    provider,
    provider_reference,
    method,
    amount,
    currency,
    status
  )
  VALUES (
    p_trip_id,
    v_trip.user_id,
    p_provider,
    p_provider_reference,
    COALESCE(p_method, 'card'),
    v_paid_amount,
    COALESCE(p_currency, 'INR'),
    'succeeded'
  )
  ON CONFLICT (provider, provider_reference) DO NOTHING
  RETURNING id INTO v_payment_id;

  IF v_payment_id IS NULL THEN
    SELECT id INTO v_payment_id
    FROM public.payments
    WHERE provider = p_provider AND provider_reference = p_provider_reference;
  END IF;

  -- 5. Mark trip confirmed
  UPDATE public.trips
  SET
    status = 'confirmed',
    confirmed_at = COALESCE(confirmed_at, now())
  WHERE id = p_trip_id;

  -- Run finalize_booking for chauffeur assignment, ticket codes, and itinerary
  PERFORM public.finalize_booking(p_trip_id);

  -- 6. Ensure invoice exists with number from DB sequence (never generated in app code)
  SELECT invoice_number INTO v_invoice_number
  FROM public.invoices
  WHERE trip_id = p_trip_id;

  IF v_invoice_number IS NULL THEN
    v_invoice_number := 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('invoice_number_seq')::text, 6, '0');
    INSERT INTO public.invoices (
      trip_id,
      invoice_number,
      subtotal,
      service_fee,
      tax_amount,
      discount_amount,
      total_amount,
      issued_at
    )
    VALUES (
      p_trip_id,
      v_invoice_number,
      v_trip.subtotal_amount,
      v_trip.service_fee,
      v_trip.tax_amount,
      v_trip.discount_amount,
      v_trip.total_amount,
      now()
    )
    ON CONFLICT (trip_id) DO NOTHING;

    -- If another concurrent statement inserted it, fetch the persisted invoice number
    SELECT invoice_number INTO v_invoice_number
    FROM public.invoices
    WHERE trip_id = p_trip_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'trip_id', v_trip.id,
    'booking_ref', v_trip.booking_ref,
    'invoice_number', v_invoice_number,
    'payment_id', v_payment_id,
    'already_processed', false
  );
END;
$$;

-- Restrict execution strictly to service_role client
REVOKE ALL ON FUNCTION public.confirm_payment_and_finalize_trip(uuid, text, text, text, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment_and_finalize_trip(uuid, text, text, text, numeric, text) TO service_role;
