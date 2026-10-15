-- Migration 10: Admin Operations RPC Functions (SECURITY DEFINER)
-- Allows authorized TripMate platform operators to query operational snapshots
-- and perform mutations across all bookings, fleet assignments, and corporate approvals.
-- Hardened with database-level JWT & service_role admin verification and search_path pinning.

-- 1. Ensure trips.status check constraint includes 'completed'
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_status_check;
ALTER TABLE public.trips ADD CONSTRAINT trips_status_check CHECK (
  status IN ('draft', 'pending_approval', 'confirmed', 'cancelled', 'completed')
);

-- ============================================================================
-- 0. DATABASE-LEVEL ADMIN VERIFICATION HELPER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin_jwt()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims jsonb;
  v_jwt jsonb;
  v_email text;
BEGIN
  -- 1. Check service_role key claims (SUPABASE_SERVICE_ROLE_KEY)
  BEGIN
    v_claims := coalesce(current_setting('request.jwt.claims', true)::jsonb, '{}'::jsonb);
    IF v_claims ->> 'role' = 'service_role' THEN
      RETURN true;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Fall through to auth.jwt() checks
  END;

  -- 2. Check Supabase Auth JWT claims
  BEGIN
    v_jwt := auth.jwt();
    IF v_jwt IS NOT NULL THEN
      -- Role in app_metadata
      IF (v_jwt -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin') THEN
        RETURN true;
      END IF;

      -- Email domain allowlist (@tripmate.in) or explicit admin email
      v_email := lower(coalesce(v_jwt ->> 'email', ''));
      IF v_email LIKE '%@tripmate.in' OR v_email = 'tripmateoffical007@gmail.com' THEN
        RETURN true;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Context unavailable or malformed
  END;

  RETURN false;
END;
$$;

-- ============================================================================
-- A. OPERATIONAL SNAPSHOT RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_get_operational_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bookings jsonb;
  v_approvals jsonb;
  v_circuits jsonb;
  v_total_revenue numeric := 0;
  v_pending_approvals_count integer := 0;
  v_cancelled_count integer := 0;
BEGIN
  -- Enforce database-level admin authorization
  IF NOT public.is_admin_jwt() THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required' USING ERRCODE = '42501';
  END IF;

  -- 1. Bookings query (trips joined with profiles, destinations, circuits, vehicles, drivers, passengers)
  SELECT coalesce(jsonb_agg(b), '[]'::jsonb) INTO v_bookings
  FROM (
    SELECT
      t.id,
      t.booking_ref,
      t.user_id,
      coalesce(p.full_name, 'Guest Traveler') AS customer_name,
      coalesce(p.email, '') AS customer_email,
      coalesce(p.phone, '') AS customer_phone,
      t.booking_kind AS kind,
      coalesce(d.name, 'Jaipur') AS destination_name,
      c.title AS circuit_name,
      t.start_date::text,
      t.end_date::text,
      coalesce(t.total_days, 1) AS days,
      t.traveler_count,
      coalesce(t.subtotal_amount, 0) AS subtotal_amount,
      coalesce(t.service_fee, 0) AS service_fee,
      coalesce(t.tax_amount, 0) AS tax_amount,
      coalesce(t.discount_amount, 0) AS discount_amount,
      t.coupon_code,
      coalesce(t.total_amount, 0) AS total_amount,
      t.status,
      t.refund_amount,
      comp.name AS company_name,
      tv.driver_id,
      CASE
        WHEN drv.id IS NOT NULL THEN
          jsonb_build_object(
            'id', drv.id,
            'name', drv.full_name,
            'phone', drv.phone,
            'license_plate', coalesce(drv.plate_number, 'DL 1Y AA 4088'),
            'rating', coalesce(drv.rating, 4.8),
            'is_active', drv.is_active
          )
        ELSE NULL
      END AS driver,
      coalesce(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', pax.id,
              'full_name', pax.full_name,
              'phone', coalesce(pax.phone, ''),
              'seat_label', pax.seat_label,
              'id_doc_type', pax.id_doc_type,
              'id_doc_path', pax.id_doc_path,
              'id_doc_status', CASE WHEN pax.id_doc_path IS NOT NULL THEN 'pending' ELSE 'not_provided' END,
              'ticket_revoked', false,
              'ticket_code', pax.ticket_code
            )
          )
          FROM public.trip_passengers pax
          WHERE pax.trip_id = t.id
        ),
        '[]'::jsonb
      ) AS travellers,
      '[]'::jsonb AS notes,
      t.created_at::text
    FROM public.trips t
    LEFT JOIN public.profiles p ON p.id = t.user_id
    LEFT JOIN public.destinations d ON d.id = t.destination_id
    LEFT JOIN public.circuits c ON c.id = t.circuit_id
    LEFT JOIN public.trip_vehicles tv ON tv.trip_id = t.id
    LEFT JOIN public.drivers drv ON drv.id = tv.driver_id
    LEFT JOIN public.commercial_bookings cb ON cb.trip_id = t.id
    LEFT JOIN public.companies comp ON comp.id = cb.company_id
    ORDER BY t.created_at DESC
    LIMIT 200
  ) b;

  -- 2. Commercial Approvals queue query
  SELECT coalesce(jsonb_agg(a), '[]'::jsonb) INTO v_approvals
  FROM (
    SELECT
      cb.id,
      t.id AS trip_id,
      comp.id AS company_id,
      comp.name AS company_name,
      coalesce(comp.gst_number, '07AAAAA0000A1Z5') AS gst_number,
      coalesce(p.full_name, 'Commercial Booker') AS booker_name,
      coalesce(p.email, '') AS booker_email,
      coalesce(d.name, 'Corporate Destination') AS destination_name,
      (coalesce(t.start_date::text, '') || ' to ' || coalesce(t.end_date::text, '')) AS dates,
      t.traveler_count AS passenger_count,
      coalesce(veh.name, 'Volvo 9600 Luxury Coach') AS vehicle_name,
      coalesce(t.total_amount, 0) AS total_amount,
      150000 AS approval_limit,
      CASE
        WHEN cb.approval_status = 'pending' THEN 'pending_approval'
        ELSE cb.approval_status
      END AS status,
      cb.review_note AS note,
      cb.created_at::text AS requested_at
    FROM public.commercial_bookings cb
    JOIN public.trips t ON t.id = cb.trip_id
    LEFT JOIN public.companies comp ON comp.id = cb.company_id
    LEFT JOIN public.profiles p ON p.id = t.user_id
    LEFT JOIN public.destinations d ON d.id = t.destination_id
    LEFT JOIN public.trip_vehicles tv ON tv.trip_id = t.id
    LEFT JOIN public.vehicles veh ON veh.id = tv.vehicle_id
    ORDER BY cb.created_at DESC
    LIMIT 100
  ) a;

  -- 3. Circuits Catalog query
  SELECT coalesce(jsonb_agg(c), '[]'::jsonb) INTO v_circuits
  FROM (
    SELECT
      circ.id,
      circ.destination_id,
      coalesce(d.name, 'Custom') AS destination_name,
      circ.title,
      circ.days,
      circ.nights,
      circ.base_price_per_person,
      coalesce(circ.rating, 4.8) AS rating,
      circ.badge,
      circ.categories,
      coalesce(circ.summary, '') AS summary,
      coalesce(circ.description, '') AS description,
      coalesce(circ.image_path, '/images/placeholder.jpg') AS image_url,
      circ.is_featured,
      circ.is_active,
      true AS allow_car,
      false AS allow_bike,
      true AS vehicle_required,
      '[]'::jsonb AS hotel_ids,
      '[]'::jsonb AS vehicle_ids,
      '[]'::jsonb AS stop_ids
    FROM public.circuits circ
    LEFT JOIN public.destinations d ON d.id = circ.destination_id
    ORDER BY circ.created_at DESC
  ) c;

  -- 4. Aggregates for Dashboard KPIs
  SELECT coalesce(sum(total_amount), 0) INTO v_total_revenue
  FROM public.trips
  WHERE status IN ('confirmed', 'completed');

  SELECT count(*) INTO v_pending_approvals_count
  FROM public.commercial_bookings
  WHERE approval_status = 'pending';

  SELECT count(*) INTO v_cancelled_count
  FROM public.trips
  WHERE status = 'cancelled';

  RETURN jsonb_build_object(
    'bookings', v_bookings,
    'approvals', v_approvals,
    'circuits', v_circuits,
    'metrics', jsonb_build_object(
      'totalRevenue', v_total_revenue,
      'pendingApprovalsCount', v_pending_approvals_count,
      'cancelledBookings', v_cancelled_count
    )
  );
END;
$$;

-- ============================================================================
-- B. ADMIN MUTATIONS
-- ============================================================================

-- 1. admin_update_booking_status
CREATE OR REPLACE FUNCTION public.admin_update_booking_status(
  p_trip_id uuid,
  p_status text,
  p_reason text DEFAULT NULL,
  p_refund_amount numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
  v_from_status text;
  v_refund numeric(12,2) := 0;
BEGIN
  -- Enforce database-level admin authorization
  IF NOT public.is_admin_jwt() THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('draft', 'pending_approval', 'confirmed', 'cancelled', 'completed') THEN
    RAISE EXCEPTION 'Invalid trip status: %', p_status;
  END IF;

  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  v_from_status := v_trip.status;

  IF p_status = 'cancelled' THEN
    IF p_refund_amount IS NOT NULL AND p_refund_amount >= 0 THEN
      v_refund := p_refund_amount;
    ELSE
      -- 48-Hour Refund Rule default
      IF v_trip.start_date IS NOT NULL AND (v_trip.start_date::timestamp - now()) >= interval '48 hours' THEN
        v_refund := v_trip.total_amount;
      ELSE
        v_refund := 0;
      END IF;
    END IF;

    UPDATE public.trips
    SET
      status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = COALESCE(p_reason, 'Cancelled by operator'),
      refund_amount = v_refund,
      updated_at = now()
    WHERE id = p_trip_id;

    UPDATE public.commercial_bookings
    SET
      approval_status = 'rejected',
      review_note = p_reason,
      reviewed_at = now(),
      updated_at = now()
    WHERE trip_id = p_trip_id;

    IF v_refund > 0 THEN
      INSERT INTO public.payments (
        trip_id, user_id, provider, method, amount, status, provider_reference
      )
      VALUES (
        p_trip_id, v_trip.user_id, 'demo', 'upi', v_refund, 'refunded', 'CN-REF-' || lpad(floor(random() * 1000000)::text, 6, '0')
      );
    END IF;

    INSERT INTO public.notifications (profile_id, trip_id, type, message)
    VALUES (
      v_trip.user_id,
      p_trip_id,
      'booking_cancelled',
      'Your booking ' || v_trip.booking_ref || ' was cancelled by operations. Reason: ' || COALESCE(p_reason, 'Operator action') || '. Refund: INR ' || v_refund::text
    );

  ELSIF p_status = 'confirmed' THEN
    UPDATE public.trips
    SET
      status = 'confirmed',
      confirmed_at = COALESCE(confirmed_at, now()),
      updated_at = now()
    WHERE id = p_trip_id;

    UPDATE public.commercial_bookings
    SET
      approval_status = 'approved',
      reviewed_at = now(),
      updated_at = now()
    WHERE trip_id = p_trip_id;

    UPDATE public.trip_passengers
    SET ticket_code = 'TKT-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12))
    WHERE trip_id = p_trip_id AND ticket_code IS NULL;

    INSERT INTO public.notifications (profile_id, trip_id, type, message)
    VALUES (
      v_trip.user_id,
      p_trip_id,
      'booking_confirmed',
      'Your booking ' || v_trip.booking_ref || ' has been confirmed by operations!'
    );

  ELSE
    UPDATE public.trips
    SET
      status = p_status,
      updated_at = now()
    WHERE id = p_trip_id;
  END IF;

  INSERT INTO public.trip_status_history (trip_id, from_status, to_status, note, changed_by)
  VALUES (p_trip_id, v_from_status, p_status, p_reason, auth.uid());

  RETURN jsonb_build_object(
    'ok', true,
    'trip_id', p_trip_id,
    'status', p_status,
    'refund_amount', v_refund
  );
END;
$$;

-- 2. admin_assign_driver
CREATE OR REPLACE FUNCTION public.admin_assign_driver(
  p_trip_id uuid,
  p_driver_id uuid,
  p_vehicle_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
  v_driver record;
  v_vehicle_id uuid := p_vehicle_id;
BEGIN
  -- Enforce database-level admin authorization
  IF NOT public.is_admin_jwt() THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  SELECT * INTO v_driver FROM public.drivers WHERE id = p_driver_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Driver % not found', p_driver_id;
  END IF;

  IF EXISTS (SELECT 1 FROM public.trip_vehicles WHERE trip_id = p_trip_id) THEN
    UPDATE public.trip_vehicles
    SET
      driver_id = p_driver_id,
      vehicle_id = COALESCE(v_vehicle_id, vehicle_id)
    WHERE trip_id = p_trip_id;
  ELSE
    IF v_vehicle_id IS NULL THEN
      SELECT id INTO v_vehicle_id FROM public.vehicles WHERE is_active = true LIMIT 1;
    END IF;
    IF v_vehicle_id IS NOT NULL THEN
      INSERT INTO public.trip_vehicles (trip_id, vehicle_id, driver_id, days, unit_price, subtotal)
      VALUES (p_trip_id, v_vehicle_id, p_driver_id, COALESCE(v_trip.total_days, 1), 0, 0);
    END IF;
  END IF;

  INSERT INTO public.trip_status_history (trip_id, from_status, to_status, note, changed_by)
  VALUES (
    p_trip_id,
    v_trip.status,
    v_trip.status,
    'Assigned driver ' || v_driver.full_name || ' (' || v_driver.phone || ')',
    auth.uid()
  );

  INSERT INTO public.notifications (profile_id, trip_id, type, message)
  VALUES (
    v_trip.user_id,
    p_trip_id,
    'reminder',
    'Driver ' || v_driver.full_name || ' (' || v_driver.phone || ') has been assigned to your trip ' || v_trip.booking_ref
  );

  RETURN jsonb_build_object(
    'ok', true,
    'trip_id', p_trip_id,
    'driver_id', p_driver_id,
    'driver_name', v_driver.full_name
  );
END;
$$;

-- 3. admin_resolve_approval
CREATE OR REPLACE FUNCTION public.admin_resolve_approval(
  p_trip_id uuid,
  p_decision text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
  v_new_status text;
BEGIN
  -- Enforce database-level admin authorization
  IF NOT public.is_admin_jwt() THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required' USING ERRCODE = '42501';
  END IF;

  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Decision must be approved or rejected';
  END IF;

  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  IF p_decision = 'approved' THEN
    v_new_status := 'confirmed';
    UPDATE public.commercial_bookings
    SET
      approval_status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = p_notes,
      updated_at = now()
    WHERE trip_id = p_trip_id;

    UPDATE public.trips
    SET
      status = 'confirmed',
      confirmed_at = COALESCE(confirmed_at, now()),
      updated_at = now()
    WHERE id = p_trip_id;

    UPDATE public.trip_passengers
    SET ticket_code = 'TKT-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12))
    WHERE trip_id = p_trip_id AND ticket_code IS NULL;

    INSERT INTO public.notifications (profile_id, trip_id, type, message)
    VALUES (
      v_trip.user_id,
      p_trip_id,
      'approval_decision',
      'Your corporate booking ' || v_trip.booking_ref || ' was approved by operations!'
    );
  ELSE
    v_new_status := 'cancelled';
    UPDATE public.commercial_bookings
    SET
      approval_status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = p_notes,
      updated_at = now()
    WHERE trip_id = p_trip_id;

    UPDATE public.trips
    SET
      status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = COALESCE(p_notes, 'Corporate booking rejected by operations'),
      updated_at = now()
    WHERE id = p_trip_id;

    INSERT INTO public.notifications (profile_id, trip_id, type, message)
    VALUES (
      v_trip.user_id,
      p_trip_id,
      'approval_decision',
      'Your corporate booking ' || v_trip.booking_ref || ' was rejected by operations: ' || COALESCE(p_notes, 'Policy threshold')
    );
  END IF;

  INSERT INTO public.trip_status_history (trip_id, from_status, to_status, note, changed_by)
  VALUES (
    p_trip_id,
    v_trip.status,
    v_new_status,
    'Commercial approval ' || p_decision || ': ' || COALESCE(p_notes, ''),
    auth.uid()
  );

  RETURN jsonb_build_object(
    'ok', true,
    'trip_id', p_trip_id,
    'status', v_new_status,
    'decision', p_decision
  );
END;
$$;

-- ============================================================================
-- C. RPC EXECUTE GRANTS & REVOCATIONS
-- ============================================================================

-- Explicitly revoke execution on all admin RPC functions from PUBLIC and anon
REVOKE ALL ON FUNCTION public.is_admin_jwt() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_operational_snapshot() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_booking_status(uuid, text, text, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_assign_driver(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_resolve_approval(uuid, text, text) FROM PUBLIC, anon;

-- Grant execution privileges exclusively to authenticated users and service_role
GRANT EXECUTE ON FUNCTION public.is_admin_jwt() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_operational_snapshot() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_booking_status(uuid, text, text, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_assign_driver(uuid, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_resolve_approval(uuid, text, text) TO authenticated, service_role;
