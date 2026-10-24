-- Migration 25: Fix Bank Inbox Upsert, Re-Trigger Bump to Top & Live Refresh
-- Ensures re-testing bank/Gmail alerts updates created_at to now() so transactions
-- immediately jump to Row #1 in Admin Bank Hub, while re-evaluating trip matching
-- and relaxing the UTR check constraint to prevent DB errors.

-- 1. Relax UTR constraint to allow flexible reference numbers
ALTER TABLE public.bank_messages_inbox
  DROP CONSTRAINT IF EXISTS bank_messages_inbox_utr_number_check;

ALTER TABLE public.bank_messages_inbox
  ADD CONSTRAINT bank_messages_inbox_utr_number_check
  CHECK (length(trim(utr_number)) >= 6);

-- 2. Drop legacy function overloads if any
DROP FUNCTION IF EXISTS public.ingest_bank_payment_message(text, text, text, text, numeric, text, text, text);
DROP FUNCTION IF EXISTS public.ingest_bank_payment_message(text, text, text, text, numeric, text, text, text, timestamptz);

-- 3. Upgrade ingest_bank_payment_message to bump re-tested transactions to top
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
  IF length(v_clean_utr) < 6 THEN
    RAISE EXCEPTION 'Invalid UTR format. UTR must contain at least 6 characters.';
  END IF;

  v_transaction_timestamp := COALESCE(p_received_at, now());

  -- Read auto_confirm preference from pricing_config
  SELECT COALESCE(bank_auto_confirm, true) INTO v_auto_confirm
  FROM public.pricing_config
  WHERE id = 1;

  IF v_auto_confirm IS NULL THEN
    v_auto_confirm := true;
  END IF;

  -- 1. Check if already ingested in bank_messages_inbox (Re-trigger / Replay guard)
  SELECT * INTO v_existing_inbox
  FROM public.bank_messages_inbox
  WHERE utr_number = v_clean_utr;

  IF FOUND THEN
    -- Update existing inbox row with fresh now() timestamp so it bumps to Row #1 (Top of Box)
    UPDATE public.bank_messages_inbox
    SET
      created_at = now(),
      raw_body = p_raw_body,
      sender = p_sender,
      subject = COALESCE(p_subject, subject),
      amount = p_amount,
      payer_vpa = COALESCE(p_payer_vpa, payer_vpa),
      extracted_trip_ref = COALESCE(p_extracted_trip_ref, extracted_trip_ref)
    WHERE id = v_existing_inbox.id;

    -- Also update payment timestamp if payment exists
    UPDATE public.payments
    SET
      created_at = now(),
      updated_at = now()
    WHERE utr_number = v_clean_utr;

    -- If already confirmed, preserve confirmed state
    IF v_existing_inbox.verification_state = 'confirmed' THEN
      IF v_existing_inbox.matched_trip_id IS NOT NULL THEN
        SELECT invoice_number INTO v_invoice_number
        FROM public.invoices
        WHERE trip_id = v_existing_inbox.matched_trip_id;
      END IF;

      RETURN jsonb_build_object(
        'ok', true,
        'inbox_id', v_existing_inbox.id,
        'utr_number', v_clean_utr,
        'amount', p_amount,
        're_triggered', true,
        'verification_state', 'confirmed',
        'matched_trip_id', v_existing_inbox.matched_trip_id,
        'invoice_number', v_invoice_number,
        'auto_confirmed', true
      );
    END IF;

    -- If not confirmed, re-evaluate trip matching (in case booking was created since last test)
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

    IF v_matched_trip.id IS NOT NULL THEN
      IF v_auto_confirm THEN
        v_verification_state := 'confirmed';
      ELSE
        v_verification_state := 'ready_to_confirm';
      END IF;
    ELSE
      v_verification_state := 'unmatched';
    END IF;

    -- Update inbox record with new matching state
    UPDATE public.bank_messages_inbox
    SET
      verification_state = v_verification_state,
      matched_trip_id = v_matched_trip.id,
      confirmed_by = CASE WHEN v_verification_state = 'confirmed' THEN 'auto_engine' ELSE v_existing_inbox.confirmed_by END,
      confirmed_at = CASE WHEN v_verification_state = 'confirmed' THEN now() ELSE v_existing_inbox.confirmed_at END
    WHERE id = v_existing_inbox.id;

    -- If auto-confirm is enabled and trip is matched, confirm trip
    IF v_verification_state = 'confirmed' AND v_matched_trip.id IS NOT NULL THEN
      PERFORM 1 FROM public.trips WHERE id = v_matched_trip.id FOR UPDATE;

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
        now()
      )
      ON CONFLICT (utr_number) DO UPDATE
        SET
          status = 'succeeded',
          verification_status = 'verified',
          trip_id = v_matched_trip.id,
          amount = p_amount,
          created_at = now(),
          updated_at = now()
      RETURNING id INTO v_payment_id;

      UPDATE public.trips
      SET
        status = 'confirmed',
        confirmed_at = COALESCE(confirmed_at, now())
      WHERE id = v_matched_trip.id;

      PERFORM public.finalize_booking(v_matched_trip.id);

      SELECT invoice_number INTO v_invoice_number
      FROM public.invoices
      WHERE trip_id = v_matched_trip.id;

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
        now()
      );
    END IF;

    RETURN jsonb_build_object(
      'ok', true,
      'inbox_id', v_existing_inbox.id,
      'utr_number', v_clean_utr,
      'amount', p_amount,
      're_triggered', true,
      'verification_state', v_verification_state,
      'matched_trip_id', v_matched_trip.id,
      'booking_ref', v_matched_trip.booking_ref,
      'invoice_number', v_invoice_number,
      'auto_confirmed', (v_verification_state = 'confirmed')
    );
  END IF;

  -- 2. Fresh Ingestion: Search for matching trip
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

  -- 3. Determine verification state
  IF v_matched_trip.id IS NOT NULL THEN
    IF v_auto_confirm THEN
      v_verification_state := 'confirmed';
    ELSE
      v_verification_state := 'ready_to_confirm';
    END IF;
  ELSE
    v_verification_state := 'unmatched';
  END IF;

  -- 4. Insert bank message record into inbox
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

  -- 5. If auto-confirm is enabled and trip is matched, execute atomic booking confirmation
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
