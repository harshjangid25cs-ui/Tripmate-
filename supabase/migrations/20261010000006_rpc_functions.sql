-- Migration 6: Helper functions, internal business logic, and callable RPC functions
-- Source of truth: DATABASE.md §5 and §6

-- ============================================================================
-- A. HELPER FUNCTIONS (STABLE SECURITY DEFINER)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_company_member(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = p_company_id AND profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = p_company_id AND profile_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.shares_company_with(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members cm1
    JOIN public.company_members cm2 ON cm1.company_id = cm2.company_id
    WHERE cm1.profile_id = auth.uid() AND cm2.profile_id = p_profile_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_trip(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips WHERE id = p_trip_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.trips t
    JOIN public.commercial_bookings cb ON cb.trip_id = t.id
    WHERE t.id = p_trip_id AND public.is_company_member(cb.company_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_draft_trip(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips
    WHERE id = p_trip_id AND user_id = auth.uid() AND status = 'draft'
  );
$$;

-- Helper to validate seat labels for bus capacity
CREATE OR REPLACE FUNCTION public.is_valid_bus_seat(p_seat_label text, p_capacity integer)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_row integer;
  v_col char;
  v_seat_index integer;
BEGIN
  IF p_seat_label !~ '^[1-9][0-9]*[A-D]$' THEN
    RETURN false;
  END IF;
  v_row := substring(p_seat_label from '^([0-9]+)')::integer;
  v_col := substring(p_seat_label from '([A-D])$');
  
  -- 4 seats per row: A=1, B=2, C=3, D=4
  v_seat_index := (v_row - 1) * 4 + (ascii(v_col) - ascii('A') + 1);
  RETURN v_seat_index <= p_capacity;
END;
$$;

-- ============================================================================
-- B. INTERNAL FUNCTIONS (build_itinerary, finalize_booking)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.build_itinerary(p_trip_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
  v_hotel record;
  v_vehicle record;
  v_stop record;
  v_highlight record;
  v_order integer := 0;
  v_day integer;
BEGIN
  SELECT id, start_date, end_date, total_days, destination_id
  INTO v_trip
  FROM public.trips
  WHERE id = p_trip_id;

  DELETE FROM public.itinerary_items WHERE trip_id = p_trip_id;

  -- 1. Day 1 Vehicle Pickup & Hotel Check-in
  SELECT id INTO v_vehicle FROM public.trip_vehicles WHERE trip_id = p_trip_id LIMIT 1;
  IF FOUND THEN
    v_order := v_order + 1;
    INSERT INTO public.itinerary_items (trip_id, day_number, sort_order, item_type, title, description, start_time, trip_vehicle_id)
    VALUES (p_trip_id, 1, v_order, 'vehicle', 'Private Chauffeur Pickup', 'Doorstep pickup in sanitized private transport', '07:30:00', v_vehicle.id);
  END IF;

  SELECT id INTO v_hotel FROM public.trip_hotels WHERE trip_id = p_trip_id LIMIT 1;
  IF FOUND THEN
    v_order := v_order + 1;
    INSERT INTO public.itinerary_items (trip_id, day_number, sort_order, item_type, title, description, start_time, trip_hotel_id)
    VALUES (p_trip_id, 1, v_order, 'hotel', 'Hotel Check-in & Welcome', 'Check-in to your boutique stay', '14:00:00', v_hotel.id);
  END IF;

  -- 2. Rest stops on their respective day_number
  FOR v_stop IN
    SELECT ts.id, ts.day_number, s.name, s.turnaround_text
    FROM public.trip_stops ts
    JOIN public.stops s ON s.id = ts.stop_id
    WHERE ts.trip_id = p_trip_id
    ORDER BY ts.day_number, ts.sort_order
  LOOP
    v_order := v_order + 1;
    INSERT INTO public.itinerary_items (trip_id, day_number, sort_order, item_type, title, description, trip_stop_id)
    VALUES (p_trip_id, v_stop.day_number, v_order, 'stop', v_stop.name, COALESCE(v_stop.turnaround_text, 'Mid-journey rest stop'), v_stop.id);
  END LOOP;

  -- 3. Destination highlights as activities distributed across days
  IF v_trip.destination_id IS NOT NULL AND v_trip.total_days > 0 THEN
    FOR v_highlight IN
      SELECT id, title, duration_text, (row_number() OVER (ORDER BY sort_order, id) - 1) as idx
      FROM public.destination_highlights
      WHERE destination_id = v_trip.destination_id
      ORDER BY sort_order, id
    LOOP
      v_day := (v_highlight.idx % v_trip.total_days) + 1;
      v_order := v_order + 1;
      INSERT INTO public.itinerary_items (trip_id, day_number, sort_order, item_type, title, description, highlight_id)
      VALUES (p_trip_id, v_day, v_order, 'activity', v_highlight.title, v_highlight.duration_text, v_highlight.id);
    END LOOP;
  END IF;

  -- 4. Last day Hotel Check-out & Return
  IF v_trip.total_days > 0 THEN
    v_order := v_order + 1;
    INSERT INTO public.itinerary_items (trip_id, day_number, sort_order, item_type, title, description, start_time)
    VALUES (p_trip_id, v_trip.total_days, v_order, 'note', 'Hotel Check-out & Return Journey', 'Check-out from hotel and return drive', '11:00:00');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_booking(p_trip_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
  v_driver_id uuid;
  v_inv_num text;
  v_passenger record;
BEGIN
  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  -- 1. Confirm trip status
  UPDATE public.trips
  SET status = 'confirmed', confirmed_at = now()
  WHERE id = p_trip_id;

  -- 2. Assign driver if chauffeured vehicle
  IF EXISTS (
    SELECT 1 FROM public.trip_vehicles tv
    JOIN public.vehicles v ON v.id = tv.vehicle_id
    WHERE tv.trip_id = p_trip_id AND v.driver_type = 'chauffeur'
  ) THEN
    SELECT id INTO v_driver_id
    FROM public.drivers
    WHERE is_active = true
    ORDER BY trips_count ASC, id ASC
    LIMIT 1;

    IF v_driver_id IS NOT NULL THEN
      UPDATE public.trip_vehicles SET driver_id = v_driver_id WHERE trip_id = p_trip_id;
      UPDATE public.drivers SET trips_count = trips_count + 1 WHERE id = v_driver_id;
    END IF;
  END IF;

  -- 3. Generate 12-char ticket codes for passengers without one
  FOR v_passenger IN SELECT id FROM public.trip_passengers WHERE trip_id = p_trip_id AND ticket_code IS NULL LOOP
    UPDATE public.trip_passengers
    SET ticket_code = 'TKT-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12))
    WHERE id = v_passenger.id;
  END LOOP;

  -- 4. Create invoice
  v_inv_num := 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('invoice_number_seq')::text, 6, '0');
  INSERT INTO public.invoices (
    trip_id, invoice_number, subtotal, service_fee, tax_amount, discount_amount, total_amount, issued_at
  )
  VALUES (
    p_trip_id, v_inv_num, v_trip.subtotal_amount, v_trip.service_fee, v_trip.tax_amount, v_trip.discount_amount, v_trip.total_amount, now()
  )
  ON CONFLICT (trip_id) DO NOTHING;

  -- 5. Build itinerary for normal trips
  IF v_trip.booking_kind = 'normal' THEN
    PERFORM public.build_itinerary(p_trip_id);
  END IF;

  -- 6. Status history
  INSERT INTO public.trip_status_history (trip_id, from_status, to_status, note, changed_by)
  VALUES (p_trip_id, v_trip.status, 'confirmed', 'Booking confirmed and finalized', auth.uid());

  -- 7. Notifications
  INSERT INTO public.notifications (profile_id, trip_id, type, message)
  VALUES (v_trip.user_id, p_trip_id, 'booking_confirmed', 'Your booking ' || v_trip.booking_ref || ' is confirmed!');

  IF v_trip.booking_kind = 'normal' THEN
    INSERT INTO public.notifications (profile_id, trip_id, type, message)
    VALUES (v_trip.user_id, p_trip_id, 'payment_succeeded', 'Payment of ₹' || v_trip.total_amount::text || ' succeeded for booking ' || v_trip.booking_ref);
  END IF;
END;
$$;

-- ============================================================================
-- C. CALLABLE RPC FUNCTIONS
-- ============================================================================

-- 1. demo_pay
CREATE OR REPLACE FUNCTION public.demo_pay(
  p_trip_id uuid,
  p_method text,
  p_simulate text DEFAULT 'success'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
  v_lead record;
  v_pax_count integer;
  v_ref text;
BEGIN
  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  IF v_trip.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to pay for this trip';
  END IF;

  IF v_trip.booking_kind <> 'normal' THEN
    RAISE EXCEPTION 'demo_pay is only for normal bookings';
  END IF;

  IF v_trip.status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft trips can be paid';
  END IF;

  IF v_trip.start_date IS NULL OR v_trip.end_date IS NULL THEN
    RAISE EXCEPTION 'Trip dates must be selected before payment';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.trip_hotels WHERE trip_id = p_trip_id) THEN
    RAISE EXCEPTION 'A hotel must be selected before payment';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.trip_vehicles WHERE trip_id = p_trip_id) THEN
    RAISE EXCEPTION 'A vehicle must be selected before payment';
  END IF;

  IF p_method NOT IN ('upi', 'card', 'netbanking', 'emi') THEN
    RAISE EXCEPTION 'Invalid payment method: %', p_method;
  END IF;

  -- Validate passengers
  SELECT count(*) INTO v_pax_count FROM public.trip_passengers WHERE trip_id = p_trip_id;
  IF v_pax_count <> v_trip.traveler_count THEN
    RAISE EXCEPTION 'Passenger count mismatch: % registered vs % expected', v_pax_count, v_trip.traveler_count;
  END IF;

  SELECT * INTO v_lead FROM public.trip_passengers WHERE trip_id = p_trip_id AND is_lead = true LIMIT 1;
  IF NOT FOUND OR v_lead.full_name = '' OR v_lead.phone IS NULL OR v_lead.phone = '' THEN
    RAISE EXCEPTION 'Lead traveller must have a full name and phone number';
  END IF;

  -- Simulated failure path
  IF p_simulate = 'failure' THEN
    v_ref := 'DEMO-' || upper(substr(md5(random()::text), 1, 10));
    INSERT INTO public.payments (trip_id, user_id, provider, method, amount, currency, status, provider_reference)
    VALUES (p_trip_id, auth.uid(), 'demo', p_method, v_trip.total_amount, 'INR', 'failed', v_ref);

    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'Simulated demo payment failure'
    );
  END IF;

  -- Simulated success path
  v_ref := 'DEMO-' || upper(substr(md5(random()::text), 1, 10));
  INSERT INTO public.payments (trip_id, user_id, provider, method, amount, currency, status, provider_reference)
  VALUES (p_trip_id, auth.uid(), 'demo', p_method, v_trip.total_amount, 'INR', 'succeeded', v_ref);

  PERFORM public.finalize_booking(p_trip_id);

  RETURN jsonb_build_object(
    'ok', true,
    'trip_id', p_trip_id,
    'booking_ref', v_trip.booking_ref
  );
END;
$$;

-- 2. submit_commercial_booking
CREATE OR REPLACE FUNCTION public.submit_commercial_booking(p_trip_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
  v_comm record;
  v_bus record;
  v_pax_count integer;
  v_policy record;
  v_pax record;
BEGIN
  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  IF v_trip.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to submit this commercial booking';
  END IF;

  IF v_trip.booking_kind <> 'commercial' THEN
    RAISE EXCEPTION 'Only commercial bookings can be submitted via submit_commercial_booking';
  END IF;

  IF v_trip.status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft trips can be submitted';
  END IF;

  SELECT * INTO v_comm FROM public.commercial_bookings WHERE trip_id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commercial booking details missing';
  END IF;

  IF NOT public.is_company_member(v_comm.company_id) THEN
    RAISE EXCEPTION 'Caller is not a member of the booking company';
  END IF;

  IF v_trip.start_date IS NULL OR v_trip.end_date IS NULL OR v_trip.from_location IS NULL OR v_trip.to_location IS NULL THEN
    RAISE EXCEPTION 'Trip start_date, end_date, from_location and to_location are required';
  END IF;

  -- Vehicle check: exactly one bus with quantity 1
  SELECT tv.*, v.capacity INTO v_bus
  FROM public.trip_vehicles tv
  JOIN public.vehicles v ON v.id = tv.vehicle_id
  WHERE tv.trip_id = p_trip_id AND v.type = 'bus';

  IF NOT FOUND OR v_bus.quantity <> 1 THEN
    RAISE EXCEPTION 'Commercial booking requires exactly one bus vehicle with quantity 1';
  END IF;

  -- Passenger check: 1 <= count <= traveler_count
  SELECT count(*) INTO v_pax_count FROM public.trip_passengers WHERE trip_id = p_trip_id;
  IF v_pax_count < 1 OR v_pax_count > v_trip.traveler_count THEN
    RAISE EXCEPTION 'Passenger count must be between 1 and traveler_count (%)', v_trip.traveler_count;
  END IF;

  -- Every passenger must have a valid seat label within bus capacity
  FOR v_pax IN SELECT * FROM public.trip_passengers WHERE trip_id = p_trip_id LOOP
    IF v_pax.seat_label IS NULL OR NOT public.is_valid_bus_seat(v_pax.seat_label, v_bus.capacity) THEN
      RAISE EXCEPTION 'Passenger % has invalid seat % for bus capacity %', v_pax.full_name, v_pax.seat_label, v_bus.capacity;
    END IF;
  END LOOP;

  -- Check approval policy
  SELECT * INTO v_policy
  FROM public.policies
  WHERE company_id = v_comm.company_id AND type = 'approval'
  ORDER BY limit_value ASC NULLS LAST
  LIMIT 1;

  IF FOUND AND v_policy.limit_value IS NOT NULL AND v_trip.total_amount > v_policy.limit_value THEN
    -- Requires approval
    UPDATE public.commercial_bookings
    SET policy_id = v_policy.id, approval_status = 'pending'
    WHERE trip_id = p_trip_id;

    UPDATE public.trips
    SET status = 'pending_approval'
    WHERE id = p_trip_id;

    INSERT INTO public.trip_status_history (trip_id, from_status, to_status, note, changed_by)
    VALUES (p_trip_id, 'draft', 'pending_approval', 'Submitted for corporate approval', auth.uid());

    -- Notify company admins
    INSERT INTO public.notifications (profile_id, trip_id, type, message)
    SELECT cm.profile_id, p_trip_id, 'approval_required', 'Trip ' || v_trip.booking_ref || ' (₹' || v_trip.total_amount || ') requires your review.'
    FROM public.company_members cm
    WHERE cm.company_id = v_comm.company_id AND cm.role = 'admin';

    RETURN jsonb_build_object(
      'ok', true,
      'trip_id', p_trip_id,
      'status', 'pending_approval'
    );
  ELSE
    -- No approval needed: goes straight to confirmed
    UPDATE public.commercial_bookings
    SET approval_status = 'not_required'
    WHERE trip_id = p_trip_id;

    PERFORM public.finalize_booking(p_trip_id);

    RETURN jsonb_build_object(
      'ok', true,
      'trip_id', p_trip_id,
      'status', 'confirmed',
      'booking_ref', v_trip.booking_ref
    );
  END IF;
END;
$$;

-- 3. assign_commercial_passenger
CREATE OR REPLACE FUNCTION public.assign_commercial_passenger(
  p_trip_id uuid,
  p_full_name text,
  p_phone text,
  p_seat_label text,
  p_designation text DEFAULT NULL,
  p_employee_ref text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
  v_comm record;
  v_bus record;
  v_pax_count integer;
  v_ticket_code text := NULL;
  v_new_id uuid;
BEGIN
  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  IF v_trip.booking_kind <> 'commercial' THEN
    RAISE EXCEPTION 'assign_commercial_passenger is for commercial trips only';
  END IF;

  IF v_trip.status NOT IN ('pending_approval', 'confirmed') THEN
    RAISE EXCEPTION 'Passengers can only be assigned to pending_approval or confirmed commercial trips';
  END IF;

  SELECT * INTO v_comm FROM public.commercial_bookings WHERE trip_id = p_trip_id;
  IF NOT public.is_company_member(v_comm.company_id) THEN
    RAISE EXCEPTION 'Caller is not a member of the company';
  END IF;

  SELECT count(*) INTO v_pax_count FROM public.trip_passengers WHERE trip_id = p_trip_id;
  IF v_pax_count >= v_trip.traveler_count THEN
    RAISE EXCEPTION 'Trip passenger capacity reached (% of %)', v_pax_count, v_trip.traveler_count;
  END IF;

  -- Validate bus capacity and seat
  SELECT v.capacity INTO v_bus
  FROM public.trip_vehicles tv
  JOIN public.vehicles v ON v.id = tv.vehicle_id
  WHERE tv.trip_id = p_trip_id AND v.type = 'bus';

  IF NOT public.is_valid_bus_seat(p_seat_label, v_bus.capacity) THEN
    RAISE EXCEPTION 'Seat % is invalid for bus capacity %', p_seat_label, v_bus.capacity;
  END IF;

  IF EXISTS (SELECT 1 FROM public.trip_passengers WHERE trip_id = p_trip_id AND seat_label = p_seat_label) THEN
    RAISE EXCEPTION 'Seat % is already assigned', p_seat_label;
  END IF;

  IF v_trip.status = 'confirmed' THEN
    v_ticket_code := 'TKT-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12));
  END IF;

  INSERT INTO public.trip_passengers (
    trip_id, full_name, phone, designation, employee_ref, seat_label, ticket_code
  )
  VALUES (
    p_trip_id, p_full_name, p_phone, p_designation, p_employee_ref, p_seat_label, v_ticket_code
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_new_id,
    'seat_label', p_seat_label,
    'ticket_code', v_ticket_code
  );
END;
$$;

-- 4. review_commercial_booking
CREATE OR REPLACE FUNCTION public.review_commercial_booking(
  p_trip_id uuid,
  p_decision text,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
  v_comm record;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Decision must be approved or rejected';
  END IF;

  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  SELECT * INTO v_comm FROM public.commercial_bookings WHERE trip_id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commercial booking not found';
  END IF;

  IF NOT public.is_company_admin(v_comm.company_id) THEN
    RAISE EXCEPTION 'Caller is not an admin of company %', v_comm.company_id;
  END IF;

  IF v_comm.approval_status <> 'pending' OR v_trip.status <> 'pending_approval' THEN
    RAISE EXCEPTION 'Trip is not pending approval';
  END IF;

  IF p_decision = 'approved' THEN
    UPDATE public.commercial_bookings
    SET
      approval_status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = p_note
    WHERE trip_id = p_trip_id;

    PERFORM public.finalize_booking(p_trip_id);

    INSERT INTO public.notifications (profile_id, trip_id, type, message)
    VALUES (v_trip.user_id, p_trip_id, 'approval_decision', 'Your commercial booking ' || v_trip.booking_ref || ' was approved!');

    RETURN jsonb_build_object('ok', true, 'status', 'confirmed');
  ELSE
    -- Rejected
    UPDATE public.commercial_bookings
    SET
      approval_status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = p_note
    WHERE trip_id = p_trip_id;

    UPDATE public.trips
    SET status = 'cancelled', cancelled_at = now(), cancellation_reason = COALESCE(p_note, 'Commercial approval rejected')
    WHERE id = p_trip_id;

    INSERT INTO public.trip_status_history (trip_id, from_status, to_status, note, changed_by)
    VALUES (p_trip_id, 'pending_approval', 'cancelled', 'Rejected by company admin', auth.uid());

    INSERT INTO public.notifications (profile_id, trip_id, type, message)
    VALUES (v_trip.user_id, p_trip_id, 'approval_decision', 'Your commercial booking ' || v_trip.booking_ref || ' was rejected by company admin.');

    RETURN jsonb_build_object('ok', true, 'status', 'cancelled');
  END IF;
END;
$$;

-- 5. cancel_booking
CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_trip_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
  v_comm record;
  v_departure_ts timestamptz;
  v_refund numeric(12,2) := 0;
  v_can_cancel boolean := false;
BEGIN
  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  IF v_trip.status NOT IN ('confirmed', 'pending_approval') THEN
    RAISE EXCEPTION 'Only confirmed or pending_approval trips can be cancelled';
  END IF;

  IF v_trip.start_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Past trips cannot be cancelled';
  END IF;

  -- Check caller authorization
  IF v_trip.user_id = auth.uid() THEN
    v_can_cancel := true;
  ELSIF v_trip.booking_kind = 'commercial' THEN
    SELECT * INTO v_comm FROM public.commercial_bookings WHERE trip_id = p_trip_id;
    IF FOUND AND public.is_company_admin(v_comm.company_id) THEN
      v_can_cancel := true;
    END IF;
  END IF;

  IF NOT v_can_cancel THEN
    RAISE EXCEPTION 'Not authorized to cancel this booking';
  END IF;

  -- 48-Hour Refund Rule
  -- If departure is >= 48 hours away: 100% refund. Inside 48 hours: 0% refund.
  v_departure_ts := ((v_trip.start_date::text || ' 00:00:00')::timestamp) AT TIME ZONE 'Asia/Kolkata';
  IF (v_departure_ts - now()) >= interval '48 hours' THEN
    v_refund := v_trip.total_amount;
  ELSE
    v_refund := 0;
  END IF;

  UPDATE public.trips
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = p_reason,
    refund_amount = v_refund
  WHERE id = p_trip_id;

  -- For normal trips with refund, record refunded payment entry
  IF v_trip.booking_kind = 'normal' AND v_refund > 0 THEN
    INSERT INTO public.payments (trip_id, user_id, provider, amount, currency, status, provider_reference)
    VALUES (p_trip_id, v_trip.user_id, 'demo', v_refund, 'INR', 'refunded', 'REFUND-' || upper(substr(md5(random()::text), 1, 8)));
  END IF;

  INSERT INTO public.trip_status_history (trip_id, from_status, to_status, note, changed_by)
  VALUES (p_trip_id, v_trip.status, 'cancelled', p_reason, auth.uid());

  INSERT INTO public.notifications (profile_id, trip_id, type, message)
  VALUES (v_trip.user_id, p_trip_id, 'booking_cancelled', 'Your booking ' || v_trip.booking_ref || ' has been cancelled. Refund: ₹' || v_refund::text);

  RETURN jsonb_build_object(
    'ok', true,
    'refund_amount', v_refund
  );
END;
$$;

-- 6. get_ticket (Public RPC: anon + authenticated)
CREATE OR REPLACE FUNCTION public.get_ticket(p_ticket_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
BEGIN
  SELECT
    p.full_name AS passenger_name,
    p.seat_label,
    p.designation,
    t.booking_ref,
    t.from_location,
    t.to_location,
    t.start_date,
    t.end_date,
    cb.booking_time,
    v.name AS vehicle_name,
    c.name AS company_name,
    p.ticket_code
  INTO v_row
  FROM public.trip_passengers p
  JOIN public.trips t ON t.id = p.trip_id
  LEFT JOIN public.commercial_bookings cb ON cb.trip_id = t.id
  LEFT JOIN public.companies c ON c.id = cb.company_id
  LEFT JOIN public.trip_vehicles tv ON tv.trip_id = t.id
  LEFT JOIN public.vehicles v ON v.id = tv.vehicle_id
  WHERE p.ticket_code = p_ticket_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket % not found', p_ticket_code;
  END IF;

  RETURN jsonb_build_object(
    'passenger_name', v_row.passenger_name,
    'seat_label', v_row.seat_label,
    'designation', v_row.designation,
    'booking_ref', v_row.booking_ref,
    'from_location', v_row.from_location,
    'to_location', v_row.to_location,
    'start_date', v_row.start_date,
    'end_date', v_row.end_date,
    'booking_time', v_row.booking_time,
    'vehicle_name', v_row.vehicle_name,
    'company_name', v_row.company_name,
    'ticket_code', v_row.ticket_code
  );
END;
$$;

