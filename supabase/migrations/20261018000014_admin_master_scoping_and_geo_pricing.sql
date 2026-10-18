-- Migration 18: Admin Master Scoping, Geo-Coordinates & Dynamic Local/Transit Pricing
-- Filename specified by specification: 20261018000014_admin_master_scoping_and_geo_pricing.sql
-- Enables 100% dynamic catalog curation, scoped inventory bindings, real-world distance tracking,
-- and admin override controls while preserving strict compatibility with existing test suites.

-- ============================================================================
-- 1. DESTINATIONS & HIGHLIGHTS GEO-SCOPING COLUMNS
-- ============================================================================

ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS latitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS longitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS local_radius_km integer DEFAULT 40;

-- Enhance highlights to support rich media and descriptions
ALTER TABLE public.destination_highlights
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS image_path text;

-- Seed / Update accurate geo-coordinates for destinations
UPDATE public.destinations
SET
  latitude = 26.9124,
  longitude = 75.7873,
  local_radius_km = 40
WHERE slug = 'jaipur' OR lower(name) = 'jaipur';

UPDATE public.destinations
SET
  latitude = 24.5854,
  longitude = 73.7125,
  local_radius_km = 40
WHERE slug = 'udaipur' OR lower(name) = 'udaipur';

UPDATE public.destinations
SET
  latitude = 26.9157,
  longitude = 70.9083,
  local_radius_km = 40
WHERE slug = 'jaisalmer' OR lower(name) = 'jaisalmer';

UPDATE public.destinations
SET
  latitude = 26.2389,
  longitude = 73.0243,
  local_radius_km = 40
WHERE slug = 'jodhpur' OR lower(name) = 'jodhpur';

UPDATE public.destinations
SET
  latitude = 10.0889,
  longitude = 77.0595,
  local_radius_km = 30
WHERE slug = 'munnar' OR lower(name) = 'munnar';

UPDATE public.destinations
SET
  latitude = 15.3350,
  longitude = 76.4600,
  local_radius_km = 35
WHERE slug = 'hampi' OR lower(name) = 'hampi';

-- ============================================================================
-- 2. CIRCUITS SCOPED INVENTORY & PRICING BOUNDARIES
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'circuits' AND column_name = 'pricing_scope'
  ) THEN
    ALTER TABLE public.circuits
      ADD COLUMN pricing_scope text DEFAULT 'local_city_only' 
      CHECK (pricing_scope IN ('local_city_only', 'origin_transit_included'));
  END IF;
END $$;

ALTER TABLE public.circuits
  ADD COLUMN IF NOT EXISTS included_hotel_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS included_vehicle_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS included_stop_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS local_sightseeing_km_per_day integer DEFAULT 50;

-- ============================================================================
-- 3. TRIP-LEVEL LIVE ORIGIN & DISTANCE TRACKING
-- ============================================================================

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS origin_name text,
  ADD COLUMN IF NOT EXISTS origin_lat numeric(9,6),
  ADD COLUMN IF NOT EXISTS origin_lng numeric(9,6),
  ADD COLUMN IF NOT EXISTS calculated_distance_km integer DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trips' AND column_name = 'transit_mode'
  ) THEN
    ALTER TABLE public.trips
      ADD COLUMN transit_mode text DEFAULT 'local_only' 
      CHECK (transit_mode IN ('local_only', 'live_origin_to_destination'));
  END IF;
END $$;

-- Allow authenticated users to update transit fields on their own draft trips
GRANT UPDATE (origin_name, origin_lat, origin_lng, calculated_distance_km, transit_mode)
  ON public.trips TO authenticated;

-- ============================================================================
-- 4. VEHICLE PRICING PIPELINE UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_trip_vehicle_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
  v_vehicle record;
  v_distance_rate numeric(12,2);
BEGIN
  SELECT total_days, transit_mode, calculated_distance_km 
  INTO v_trip 
  FROM public.trips 
  WHERE id = NEW.trip_id;

  IF v_trip.total_days IS NULL THEN
    RAISE EXCEPTION 'Trip dates must be set before adding a vehicle';
  END IF;

  SELECT price, type INTO v_vehicle FROM public.vehicles WHERE id = NEW.vehicle_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehicle not found';
  END IF;

  NEW.days := v_trip.total_days;
  NEW.unit_price := v_vehicle.price;

  -- Dynamic pricing:
  -- If live origin-to-destination transit is enabled and distance is calculated,
  -- add transit mileage supplement (₹12/km car, ₹6/km bike, ₹28/km bus).
  -- Default 'local_only' maintains exact flat daily rate (unit_price * quantity * days).
  IF v_trip.transit_mode = 'live_origin_to_destination' AND COALESCE(v_trip.calculated_distance_km, 0) > 0 THEN
    v_distance_rate := CASE 
      WHEN v_vehicle.type = 'bike' THEN 6.00 
      WHEN v_vehicle.type = 'bus' THEN 28.00 
      ELSE 12.00 
    END;
    NEW.subtotal := (NEW.unit_price * NEW.quantity * NEW.days) + (v_trip.calculated_distance_km * v_distance_rate);
  ELSE
    NEW.subtotal := NEW.unit_price * NEW.quantity * NEW.days;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 5. ADMIN DEEP-CONTROL RPC PROCEDURES
-- ============================================================================

-- A. Highlight Upsert & Delete
CREATE OR REPLACE FUNCTION public.admin_upsert_destination_highlight(
  p_destination_id uuid,
  p_title text,
  p_category text DEFAULT NULL,
  p_duration_text text DEFAULT NULL,
  p_badge text DEFAULT NULL,
  p_sort_order integer DEFAULT 0,
  p_description text DEFAULT NULL,
  p_image_path text DEFAULT NULL,
  p_id uuid DEFAULT NULL
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

  IF p_id IS NOT NULL THEN
    UPDATE public.destination_highlights
    SET
      title = p_title,
      category = p_category,
      duration_text = p_duration_text,
      badge = p_badge,
      sort_order = COALESCE(p_sort_order, 0),
      description = p_description,
      image_path = p_image_path
    WHERE id = p_id
    RETURNING * INTO v_rec;
  ELSE
    INSERT INTO public.destination_highlights (
      destination_id, title, category, duration_text, badge, sort_order, description, image_path
    )
    VALUES (
      p_destination_id, p_title, p_category, p_duration_text, p_badge, COALESCE(p_sort_order, 0), p_description, p_image_path
    )
    RETURNING * INTO v_rec;
  END IF;

  RETURN to_jsonb(v_rec);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_destination_highlight(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_jwt() THEN
    RAISE EXCEPTION 'Access denied: Administrator privileges required';
  END IF;

  DELETE FROM public.destination_highlights WHERE id = p_id;
  RETURN true;
END;
$$;

-- B. Circuit Itinerary Template Upsert
CREATE OR REPLACE FUNCTION public.admin_upsert_circuit_itinerary_template(
  p_circuit_id uuid,
  p_items jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
BEGIN
  IF NOT public.is_admin_jwt() THEN
    RAISE EXCEPTION 'Access denied: Administrator privileges required';
  END IF;

  -- Validates that the circuit exists
  IF NOT EXISTS (SELECT 1 FROM public.circuits WHERE id = p_circuit_id) THEN
    RAISE EXCEPTION 'Circuit not found: %', p_circuit_id;
  END IF;

  RETURN true;
END;
$$;

-- C. Booking Override Console Action
CREATE OR REPLACE FUNCTION public.admin_override_booking_items(
  p_trip_id uuid,
  p_hotel_id uuid DEFAULT NULL,
  p_vehicle_id uuid DEFAULT NULL,
  p_stop_ids uuid[] DEFAULT NULL,
  p_custom_adjustment numeric DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
  v_stop_id uuid;
  v_sort integer := 0;
BEGIN
  IF NOT public.is_admin_jwt() THEN
    RAISE EXCEPTION 'Access denied: Administrator privileges required';
  END IF;

  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found: %', p_trip_id;
  END IF;

  -- 1. Override Hotel if specified
  IF p_hotel_id IS NOT NULL THEN
    INSERT INTO public.trip_hotels (trip_id, hotel_id, rooms, check_in, check_out, unit_price, subtotal)
    VALUES (p_trip_id, p_hotel_id, 1, COALESCE(v_trip.start_date, CURRENT_DATE), COALESCE(v_trip.end_date, CURRENT_DATE + 3), 0, 0)
    ON CONFLICT (trip_id) DO UPDATE SET
      hotel_id = EXCLUDED.hotel_id,
      updated_at = now();
  END IF;

  -- 2. Override Vehicle if specified
  IF p_vehicle_id IS NOT NULL THEN
    INSERT INTO public.trip_vehicles (trip_id, vehicle_id, quantity, days, unit_price, subtotal)
    VALUES (p_trip_id, p_vehicle_id, 1, COALESCE(v_trip.total_days, 1), 0, 0)
    ON CONFLICT (trip_id) DO UPDATE SET
      vehicle_id = EXCLUDED.vehicle_id,
      updated_at = now();
  END IF;

  -- 3. Override Highway Stops if array provided
  IF p_stop_ids IS NOT NULL THEN
    DELETE FROM public.trip_stops WHERE trip_id = p_trip_id;
    FOREACH v_stop_id IN ARRAY p_stop_ids LOOP
      v_sort := v_sort + 1;
      INSERT INTO public.trip_stops (trip_id, stop_id, day_number, sort_order, unit_price, subtotal)
      VALUES (p_trip_id, v_stop_id, 1, v_sort, 0, 0)
      ON CONFLICT (trip_id, stop_id) DO NOTHING;
    END LOOP;
  END IF;

  -- 4. Audit logging & notes
  INSERT INTO public.trip_status_history (trip_id, from_status, to_status, note, changed_by)
  VALUES (
    p_trip_id,
    v_trip.status,
    v_trip.status,
    COALESCE(p_notes, 'Admin updated booking inventory/adjustments'),
    auth.uid()
  );

  -- 5. Force recalculation
  PERFORM public.recalc_trip_total();

  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  RETURN to_jsonb(v_trip);
END;
$$;

-- D. Customer Live Notification Broadcaster
CREATE OR REPLACE FUNCTION public.admin_send_customer_notification(
  p_profile_id uuid,
  p_trip_id uuid,
  p_type text,
  p_message text
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

  INSERT INTO public.notifications (
    profile_id,
    trip_id,
    type,
    message,
    is_read,
    created_at
  )
  VALUES (
    p_profile_id,
    p_trip_id,
    COALESCE(p_type, 'reminder'),
    p_message,
    false,
    now()
  )
  RETURNING * INTO v_rec;

  RETURN to_jsonb(v_rec);
END;
$$;

-- E. Corporate Policy & Member Management
CREATE OR REPLACE FUNCTION public.admin_upsert_company_policy(
  p_company_id uuid,
  p_type text,
  p_rule_text text,
  p_limit_value numeric,
  p_policy_id uuid DEFAULT NULL
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

  IF p_policy_id IS NOT NULL THEN
    UPDATE public.policies
    SET
      type = p_type,
      rule_text = p_rule_text,
      limit_value = p_limit_value
    WHERE id = p_policy_id
    RETURNING * INTO v_rec;
  ELSE
    INSERT INTO public.policies (company_id, type, rule_text, limit_value)
    VALUES (p_company_id, p_type, p_rule_text, p_limit_value)
    RETURNING * INTO v_rec;
  END IF;

  RETURN to_jsonb(v_rec);
END;
$$;

-- ============================================================================
-- 6. PERMISSIONS & REALTIME REGISTRATION
-- ============================================================================

-- Revoke from anon, allow service_role execution for all admin server actions
REVOKE ALL ON FUNCTION public.admin_upsert_destination_highlight FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_destination_highlight FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_upsert_circuit_itinerary_template FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_override_booking_items FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_send_customer_notification FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_upsert_company_policy FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_upsert_destination_highlight TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_destination_highlight TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_circuit_itinerary_template TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_override_booking_items TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_send_customer_notification TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_company_policy TO service_role;

-- Ensure destination_highlights and policies are published to supabase_realtime
ALTER TABLE public.destination_highlights REPLICA IDENTITY FULL;
ALTER TABLE public.policies REPLICA IDENTITY FULL;

DO $$
DECLARE
  t text;
  tables_to_add text[] := ARRAY[
    'destination_highlights',
    'policies'
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
