-- Migration 24: Admin Bank SMS & Gmail Verification Hub
-- Implements self-contained internal Bank SMS and Gmail alert ledger,
-- auto/manual reconciliation with pending bookings, and realtime synchronization.

-- 1. UPDATE public.pricing_config FOR BANK HUB CONTROLS
ALTER TABLE public.pricing_config
  ADD COLUMN IF NOT EXISTS bank_webhook_secret text NOT NULL DEFAULT 'tm_internal_bank_secret_2026',
  ADD COLUMN IF NOT EXISTS bank_auto_confirm boolean NOT NULL DEFAULT true;

-- Update singleton config row
UPDATE public.pricing_config
SET
  bank_webhook_secret = COALESCE(bank_webhook_secret, 'tm_internal_bank_secret_2026'),
  bank_auto_confirm = COALESCE(bank_auto_confirm, true)
WHERE id = 1;

-- 2. ADD checkout_active_at TO public.trips FOR ACTIVE CHECKOUT TRACKING
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS checkout_active_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_trips_checkout_active ON public.trips (checkout_active_at DESC NULLS LAST);

-- 3. CREATE public.bank_messages_inbox TABLE
CREATE TABLE IF NOT EXISTS public.bank_messages_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('sms', 'gmail', 'admin_manual')),
  sender text NOT NULL,
  subject text,
  raw_body text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  utr_number text NOT NULL UNIQUE CHECK (utr_number ~ '^\d{12}$'),
  payer_vpa text,
  extracted_trip_ref text,
  verification_state text NOT NULL DEFAULT 'unmatched' CHECK (verification_state IN ('unmatched', 'ready_to_confirm', 'confirmed', 'rejected')),
  matched_trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  confirmed_by text,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_bank_messages_inbox_utr ON public.bank_messages_inbox (utr_number);
CREATE INDEX IF NOT EXISTS idx_bank_messages_inbox_matched_trip ON public.bank_messages_inbox (matched_trip_id);
CREATE INDEX IF NOT EXISTS idx_bank_messages_inbox_created ON public.bank_messages_inbox (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bank_messages_inbox_state ON public.bank_messages_inbox (verification_state);

-- 4. ROW LEVEL SECURITY (RLS) FOR BANK MESSAGES INBOX
ALTER TABLE public.bank_messages_inbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bank_messages_inbox_admin_all ON public.bank_messages_inbox;
CREATE POLICY bank_messages_inbox_admin_all ON public.bank_messages_inbox
  FOR ALL
  TO authenticated
  USING (public.is_admin_jwt())
  WITH CHECK (public.is_admin_jwt());

DROP POLICY IF EXISTS bank_messages_inbox_service_role ON public.bank_messages_inbox;
CREATE POLICY bank_messages_inbox_service_role ON public.bank_messages_inbox
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_messages_inbox TO authenticated, service_role;

-- 5. SUPABASE REALTIME REPLICATION FOR LIVE INBOX FEED
ALTER TABLE public.bank_messages_inbox REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_messages_inbox;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- 6. ATOMIC INGEST BANK PAYMENT MESSAGE RPC
CREATE OR REPLACE FUNCTION public.ingest_bank_payment_message(
  p_channel text,
  p_sender text,
  p_subject text,
  p_raw_body text,
  p_amount numeric,
  p_utr_number text,
  p_payer_vpa text DEFAULT NULL,
  p_extracted_trip_ref text DEFAULT NULL
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
BEGIN
  v_clean_utr := trim(p_utr_number);
  IF v_clean_utr !~ '^\d{12}$' THEN
    RAISE EXCEPTION 'Invalid UTR format. UTR must be exactly 12 numeric digits (e.g. 429183746512).';
  END IF;

  -- 1. Check if already ingested in bank_messages_inbox (idempotent replay guard)
  SELECT * INTO v_existing_inbox
  FROM public.bank_messages_inbox
  WHERE utr_number = v_clean_utr;

  IF FOUND THEN
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
    confirmed_at
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
    CASE WHEN v_verification_state = 'confirmed' THEN now() ELSE NULL END
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
      verification_status
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
      'verified'
    )
    ON CONFLICT (utr_number) DO UPDATE
      SET
        status = 'succeeded',
        verification_status = 'verified',
        trip_id = v_matched_trip.id,
        amount = p_amount
    RETURNING id INTO v_payment_id;

    -- Mark trip confirmed
    UPDATE public.trips
    SET
      status = 'confirmed',
      confirmed_at = COALESCE(confirmed_at, now())
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
      changed_by
    )
    VALUES (
      v_matched_trip.id,
      v_matched_trip.status,
      'confirmed',
      'Bank ' || upper(p_channel) || ' payment auto-verified (UTR: ' || v_clean_utr || ', Amount: INR ' || p_amount || ')',
      v_matched_trip.user_id
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

GRANT EXECUTE ON FUNCTION public.ingest_bank_payment_message(text, text, text, text, numeric, text, text, text) TO authenticated, service_role, anon;

-- 7. ATOMIC ADMIN CONFIRM BANK INBOX PAYMENT RPC
CREATE OR REPLACE FUNCTION public.admin_confirm_bank_inbox_payment(
  p_inbox_id uuid,
  p_trip_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inbox record;
  v_trip record;
  v_payment_id uuid;
  v_invoice_number text;
  v_admin_email text;
BEGIN
  IF NOT public.is_admin_jwt() THEN
    RAISE EXCEPTION 'Access denied: Administrator privileges required';
  END IF;

  -- 1. Lock and load bank inbox record
  SELECT * INTO v_inbox
  FROM public.bank_messages_inbox
  WHERE id = p_inbox_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank inbox message % not found', p_inbox_id;
  END IF;

  IF v_inbox.verification_state = 'confirmed' THEN
    SELECT invoice_number INTO v_invoice_number
    FROM public.invoices
    WHERE trip_id = v_inbox.matched_trip_id;

    RETURN jsonb_build_object(
      'ok', true,
      'already_confirmed', true,
      'inbox_id', p_inbox_id,
      'trip_id', v_inbox.matched_trip_id,
      'invoice_number', v_invoice_number
    );
  END IF;

  -- 2. Lock and load target trip
  SELECT * INTO v_trip
  FROM public.trips
  WHERE id = p_trip_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  v_admin_email := coalesce(auth.jwt() ->> 'email', 'admin@tripmate.in');

  -- 3. Upsert payment record as verified
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
    v_trip.id,
    v_trip.user_id,
    'direct_upi',
    'UTR-' || v_inbox.utr_number,
    'upi',
    v_inbox.amount,
    'INR',
    'succeeded',
    v_inbox.utr_number,
    v_inbox.payer_vpa,
    'verified'
  )
  ON CONFLICT (utr_number) DO UPDATE
    SET
      status = 'succeeded',
      verification_status = 'verified',
      trip_id = v_trip.id,
      amount = v_inbox.amount
  RETURNING id INTO v_payment_id;

  -- 4. Mark trip confirmed
  UPDATE public.trips
  SET
    status = 'confirmed',
    confirmed_at = COALESCE(confirmed_at, now())
  WHERE id = v_trip.id;

  -- 5. Finalize booking (chauffeur, tickets, invoice)
  PERFORM public.finalize_booking(v_trip.id);

  SELECT invoice_number INTO v_invoice_number
  FROM public.invoices
  WHERE trip_id = v_trip.id;

  -- 6. Log status history
  INSERT INTO public.trip_status_history (
    trip_id,
    from_status,
    to_status,
    note,
    changed_by
  )
  VALUES (
    v_trip.id,
    v_trip.status,
    'confirmed',
    'Admin ' || v_admin_email || ' manually confirmed payment from Bank Hub (UTR: ' || v_inbox.utr_number || ', Amount: INR ' || v_inbox.amount || ')',
    auth.uid()
  );

  -- 7. Update bank inbox record to confirmed
  UPDATE public.bank_messages_inbox
  SET
    verification_state = 'confirmed',
    matched_trip_id = v_trip.id,
    confirmed_by = v_admin_email,
    confirmed_at = now()
  WHERE id = p_inbox_id;

  RETURN jsonb_build_object(
    'ok', true,
    'inbox_id', p_inbox_id,
    'trip_id', v_trip.id,
    'booking_ref', v_trip.booking_ref,
    'invoice_number', v_invoice_number,
    'utr_number', v_inbox.utr_number,
    'amount', v_inbox.amount,
    'confirmed_by', v_admin_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_confirm_bank_inbox_payment(uuid, uuid) TO authenticated, service_role;
