-- Migration 27: Preserve Real Transaction Timestamp on Bank Message Ingestion
-- Allows webhooks to specify p_received_at so bank_messages_inbox and payments
-- strictly preserve the real transaction timestamp.

DROP FUNCTION IF EXISTS public.ingest_bank_payment_message(text, text, text, text, numeric, text, text, text);

CREATE OR REPLACE FUNCTION public.ingest_bank_payment_message(
  p_channel text,
  p_sender text,
  p_subject text,
  p_raw_body text,
  p_amount numeric,
  p_utr_number text,
  p_payer_vpa text DEFAULT NULL,
  p_extracted_trip_ref text DEFAULT NULL,
  p_received_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_utr text;
  v_inbox_id uuid;
  v_existing_inbox public.bank_messages_inbox%ROWTYPE;
  v_matched_trip public.trips%ROWTYPE;
  v_auto_confirm boolean;
  v_verification_state text;
  v_payment_id uuid;
  v_invoice_number text;
  v_transaction_timestamp timestamptz;
BEGIN
  v_clean_utr := trim(p_utr_number);
  IF v_clean_utr !~ '^\d{12}$' THEN
    RAISE EXCEPTION 'Invalid UTR format. UTR must be exactly 12 numeric digits (e.g. 429183746512).';
  END IF;

  v_transaction_timestamp := COALESCE(p_received_at, now());

  -- 1. Check if already ingested in bank_messages_inbox (idempotent replay guard)
  SELECT * INTO v_existing_inbox
  FROM public.bank_messages_inbox
  WHERE utr_number = v_clean_utr;

  IF FOUND THEN
    -- If duplicate UTR is received with explicit timestamp, ensure created_at reflects it
    IF p_received_at IS NOT NULL THEN
      UPDATE public.bank_messages_inbox
      SET created_at = p_received_at
      WHERE id = v_existing_inbox.id;

      UPDATE public.payments
      SET created_at = p_received_at
      WHERE utr_number = v_clean_utr;
    END IF;

    RETURN jsonb_build_object(
      'ok', true,
      'inbox_id', v_existing_inbox.id,
      'utr_number', v_clean_utr,
      'already_processed', true,
      'verification_state', v_existing_inbox.verification_state,
      'matched_trip_id', v_existing_inbox.matched_trip_id
    );
  END IF;

  -- 2. Read auto_confirm preference from pricing_config
  SELECT COALESCE(bank_auto_confirm, true) INTO v_auto_confirm
  FROM public.pricing_config
  WHERE id = 1;

  IF v_auto_confirm IS NULL THEN
    v_auto_confirm := true;
  END IF;

  -- 3. Search for matching trip
  -- Priority 1: Match on extracted booking_ref (e.g., TM-XXXXXX)
  IF p_extracted_trip_ref IS NOT NULL AND p_extracted_trip_ref <> '' THEN
    SELECT * INTO v_matched_trip
    FROM public.trips
    WHERE booking_ref = trim(p_extracted_trip_ref)
      AND status IN ('draft', 'pending_payment', 'confirmed')
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- Priority 2: Match on customer who entered this exact UTR on checkout
  IF v_matched_trip.id IS NULL THEN
    SELECT t.* INTO v_matched_trip
    FROM public.trips t
    JOIN public.payments p ON p.trip_id = t.id
    WHERE p.utr_number = v_clean_utr
    ORDER BY t.created_at DESC
    LIMIT 1;
  END IF;

  -- Priority 3: Match on active checkout trip with matching total_amount
  IF v_matched_trip.id IS NULL THEN
    SELECT * INTO v_matched_trip
    FROM public.trips
    WHERE status IN ('draft', 'pending_payment')
      AND round(total_amount, 2) = round(p_amount, 2)
    ORDER BY
      checkout_active_at DESC NULLS LAST,
      updated_at DESC
    LIMIT 1;
  END IF;

  -- 4. Determine verification state
  IF v_matched_trip.id IS NOT NULL THEN
    IF v_auto_confirm THEN
      v_verification_state := 'confirmed';
    ELSE
      v_verification_state := 'ready_to_confirm';
    END IF;
  ELSE
    v_verification_state := 'unmatched';
  END IF;

  -- 5. Insert bank message record into inbox
  INSERT INTO public.bank_messages_inbox (
    channel,
    sender,
    subject,
    raw_body,
    amount,
    utr_number,
    payer_vpa,
    extracted_trip_ref,
    verification_state,
    matched_trip_id,
    confirmed_by,
    confirmed_at,
    created_at
  )
  VALUES (
    p_channel,
    p_sender,
    p_subject,
    p_raw_body,
    p_amount,
    v_clean_utr,
    p_payer_vpa,
    p_extracted_trip_ref,
    v_verification_state,
    v_matched_trip.id,
    CASE WHEN v_verification_state = 'confirmed' THEN 'auto_engine' ELSE NULL END,
    CASE WHEN v_verification_state = 'confirmed' THEN v_transaction_timestamp ELSE NULL END,
    v_transaction_timestamp
  )
  RETURNING id INTO v_inbox_id;

  -- 6. If auto-confirm is enabled and trip is matched, execute atomic booking confirmation
  IF v_verification_state = 'confirmed' AND v_matched_trip.id IS NOT NULL THEN
    -- Lock trip row exclusively
    PERFORM 1 FROM public.trips WHERE id = v_matched_trip.id FOR UPDATE;

    -- Upsert payment
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
      verification_status,
      created_at
    )
    VALUES (
      v_matched_trip.id,
      v_matched_trip.user_id,
      'direct_upi',
      'UTR-' || v_clean_utr,
      'upi',
      p_amount,
      'INR',
      'succeeded',
      v_clean_utr,
      p_payer_vpa,
      'verified',
      v_transaction_timestamp
    )
    ON CONFLICT (utr_number) DO UPDATE
      SET
        status = 'succeeded',
        verification_status = 'verified',
        trip_id = v_matched_trip.id,
        amount = p_amount,
        created_at = v_transaction_timestamp,
        updated_at = now()
    RETURNING id INTO v_payment_id;

    -- Mark trip confirmed
    UPDATE public.trips
    SET
      status = 'confirmed',
      confirmed_at = COALESCE(confirmed_at, v_transaction_timestamp)
    WHERE id = v_matched_trip.id;

    -- Finalize booking (generates itinerary, chauffeur, voucher codes, invoice)
    PERFORM public.finalize_booking(v_matched_trip.id);

    SELECT invoice_number INTO v_invoice_number
    FROM public.invoices
    WHERE trip_id = v_matched_trip.id;

    -- Log status history note
    INSERT INTO public.trip_status_history (
      trip_id,
      from_status,
      to_status,
      note,
      changed_by,
      created_at
    )
    VALUES (
      v_matched_trip.id,
      v_matched_trip.status,
      'confirmed',
      'Bank ' || upper(p_channel) || ' payment auto-verified (UTR: ' || v_clean_utr || ', Amount: INR ' || p_amount || ')',
      v_matched_trip.user_id,
      v_transaction_timestamp
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'inbox_id', v_inbox_id,
    'utr_number', v_clean_utr,
    'amount', p_amount,
    'verification_state', v_verification_state,
    'matched_trip_id', v_matched_trip.id,
    'booking_ref', v_matched_trip.booking_ref,
    'invoice_number', v_invoice_number,
    'auto_confirmed', (v_verification_state = 'confirmed')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ingest_bank_payment_message(text, text, text, text, numeric, text, text, text, timestamptz) TO authenticated, service_role, anon;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_bank_messages_inbox_created ON public.bank_messages_inbox (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_created_at_desc ON public.payments (created_at DESC);
