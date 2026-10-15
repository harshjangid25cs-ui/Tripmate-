-- Migration 11: Admin Catalog & Trip Control RPC Procedures
-- Enables comprehensive CRUD management across Trips/Circuits, Vehicles, Drivers, Hotels, Stops, and Destinations.
-- Strictly guarded by public.is_admin_jwt(), search_path = public, and revoked from PUBLIC/anon.

-- ============================================================================
-- 1. EXPANDED OPERATIONAL & CATALOG SNAPSHOT RPC
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
  v_destinations jsonb;
  v_vehicles jsonb;
  v_drivers jsonb;
  v_hotels jsonb;
  v_stops jsonb;
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

  -- 4. Destinations Catalog query
  SELECT coalesce(jsonb_agg(dst), '[]'::jsonb) INTO v_destinations
  FROM (
    SELECT
      id,
      slug,
      name,
      coalesce(region, '') AS region,
      coalesce(tagline, '') AS tagline,
      coalesce(description, '') AS description,
      hero_image_path,
      starting_price,
      rating,
      review_count,
      coalesce(recommended_days, '3-4 Days') AS recommended_days,
      coalesce(best_season, 'Oct - Mar') AS best_season,
      badge,
      categories,
      coalesce(origin_label, 'Delhi NCR') AS origin_label,
      drive_hours,
      drive_km,
      is_featured,
      is_bookable,
      is_active
    FROM public.destinations
    ORDER BY created_at DESC
  ) dst;

  -- 5. Vehicles Fleet query
  SELECT coalesce(jsonb_agg(v), '[]'::jsonb) INTO v_vehicles
  FROM (
    SELECT
      id,
      type,
      name,
      coalesce(subtitle, '') AS subtitle,
      coalesce(description, '') AS description,
      coalesce(capacity, 4) AS capacity,
      coalesce(luggage_capacity, 2) AS luggage_capacity,
      features,
      coalesce(fuel_policy, 'Driver Provided · Fuel Included') AS fuel_policy,
      coalesce(driver_type, 'chauffeur') AS driver_type,
      rating,
      badge,
      price AS price_per_day,
      coalesce(image_path, '/images/placeholder.jpg') AS image_url,
      is_active
    FROM public.vehicles
    ORDER BY created_at DESC
  ) v;

  -- 6. Drivers Roster query
  SELECT coalesce(jsonb_agg(drv), '[]'::jsonb) INTO v_drivers
  FROM (
    SELECT
      id,
      full_name AS name,
      phone,
      plate_number AS license_plate,
      coalesce(rating, 4.9) AS rating,
      is_active
    FROM public.drivers
    ORDER BY created_at DESC
  ) drv;

  -- 7. Hotels query
  SELECT coalesce(jsonb_agg(h), '[]'::jsonb) INTO v_hotels
  FROM (
    SELECT
      ht.id,
      ht.destination_id,
      coalesce(d.name, 'Jaipur') AS destination_name,
      ht.name,
      coalesce(ht.rating, 4.8) AS rating,
      coalesce(ht.neighborhood, '') AS neighborhood,
      coalesce(ht.distance_text, '') AS distance_text,
      ht.price_per_night,
      ht.amenities,
      CASE
        WHEN array_length(ht.image_paths, 1) > 0 THEN ht.image_paths[1]
        ELSE '/images/placeholder.jpg'
      END AS image_url,
      ht.badge,
      ht.is_active
    FROM public.hotels ht
    LEFT JOIN public.destinations d ON d.id = ht.destination_id
    ORDER BY ht.created_at DESC
  ) h;

  -- 8. Stops query
  SELECT coalesce(jsonb_agg(s), '[]'::jsonb) INTO v_stops
  FROM (
    SELECT
      st.id,
      coalesce(st.destination_id::text, '') AS destination_id,
      coalesce(d.name, '') AS destination_name,
      st.name,
      st.price,
      st.pricing_unit,
      coalesce(st.distance_text, '') AS distance_text,
      coalesce(st.turnaround_text, '') AS turnaround_text,
      st.amenities,
      st.is_active
    FROM public.stops st
    LEFT JOIN public.destinations d ON d.id = st.destination_id
    ORDER BY st.created_at DESC
  ) s;

  -- 9. Aggregates for Dashboard KPIs
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
    'destinations', v_destinations,
    'vehicles', v_vehicles,
    'drivers', v_drivers,
    'hotels', v_hotels,
    'stops', v_stops,
    'metrics', jsonb_build_object(
      'totalRevenue', v_total_revenue,
      'pendingApprovalsCount', v_pending_approvals_count,
      'cancelledBookings', v_cancelled_count
    )
  );
END;
$$;

-- Alias helper function
CREATE OR REPLACE FUNCTION public.admin_get_catalog_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.admin_get_operational_snapshot();
END;
$$;

-- ============================================================================
-- 2. CIRCUIT & TRIP MANAGEMENT RPCs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_upsert_circuit(p_circuit jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_dest_id uuid;
  v_days integer;
  v_nights integer;
  v_result jsonb;
BEGIN
  IF NOT public.is_admin_jwt() THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required' USING ERRCODE = '42501';
  END IF;

  v_days := coalesce((p_circuit ->> 'days')::integer, 3);
  v_nights := v_days - 1;
  v_dest_id := (p_circuit ->> 'destination_id')::uuid;

  IF (p_circuit ? 'id') AND (p_circuit ->> 'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_id := (p_circuit ->> 'id')::uuid;
  ELSE
    v_id := gen_random_uuid();
  END IF;

  INSERT INTO public.circuits (
    id,
    destination_id,
    title,
    days,
    nights,
    summary,
    description,
    base_price_per_person,
    rating,
    badge,
    categories,
    is_featured,
    image_path,
    is_active,
    updated_at
  )
  VALUES (
    v_id,
    v_dest_id,
    p_circuit ->> 'title',
    v_days,
    v_nights,
    p_circuit ->> 'summary',
    p_circuit ->> 'description',
    coalesce((p_circuit ->> 'base_price_per_person')::numeric, 5000),
    coalesce((p_circuit ->> 'rating')::numeric, 4.8),
    p_circuit ->> 'badge',
    coalesce(
      ARRAY(SELECT jsonb_array_elements_text(p_circuit -> 'categories')),
      ARRAY['heritage']::text[]
    ),
    coalesce((p_circuit ->> 'is_featured')::boolean, false),
    coalesce(p_circuit ->> 'image_url', p_circuit ->> 'image_path', '/images/placeholder.jpg'),
    coalesce((p_circuit ->> 'is_active')::boolean, true),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    destination_id = EXCLUDED.destination_id,
    title = EXCLUDED.title,
    days = EXCLUDED.days,
    nights = EXCLUDED.nights,
    summary = EXCLUDED.summary,
    description = EXCLUDED.description,
    base_price_per_person = EXCLUDED.base_price_per_person,
    rating = EXCLUDED.rating,
    badge = EXCLUDED.badge,
    categories = EXCLUDED.categories,
    is_featured = EXCLUDED.is_featured,
    image_path = EXCLUDED.image_path,
    is_active = EXCLUDED.is_active,
    updated_at = now()
  RETURNING to_jsonb(circuits.*) INTO v_result;

  RETURN jsonb_build_object('ok', true, 'data', v_result);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_toggle_circuit_status(
  p_circuit_id uuid,
  p_is_active boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_jwt() THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.circuits
  SET is_active = p_is_active, updated_at = now()
  WHERE id = p_circuit_id;

  RETURN jsonb_build_object('ok', true, 'circuit_id', p_circuit_id, 'is_active', p_is_active);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_control_active_trip(
  p_trip_id uuid,
  p_updates jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
  v_vehicle_id uuid;
  v_driver_id uuid;
  v_hotel_id uuid;
BEGIN
  IF NOT public.is_admin_jwt() THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  -- 1. Update basic trip attributes if supplied
  UPDATE public.trips
  SET
    start_date = coalesce((p_updates ->> 'start_date')::date, start_date),
    end_date = coalesce((p_updates ->> 'end_date')::date, end_date),
    status = coalesce(p_updates ->> 'status', status),
    traveler_count = coalesce((p_updates ->> 'traveler_count')::integer, traveler_count),
    total_amount = coalesce((p_updates ->> 'total_amount')::numeric, total_amount),
    updated_at = now()
  WHERE id = p_trip_id;

  -- 2. Vehicle & Driver assignment in trip_vehicles
  IF p_updates ? 'vehicle_id' OR p_updates ? 'driver_id' THEN
    IF p_updates ? 'vehicle_id' AND (p_updates ->> 'vehicle_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_vehicle_id := (p_updates ->> 'vehicle_id')::uuid;
    END IF;
    IF p_updates ? 'driver_id' AND (p_updates ->> 'driver_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_driver_id := (p_updates ->> 'driver_id')::uuid;
    END IF;

    IF EXISTS (SELECT 1 FROM public.trip_vehicles WHERE trip_id = p_trip_id) THEN
      UPDATE public.trip_vehicles
      SET
        vehicle_id = coalesce(v_vehicle_id, vehicle_id),
        driver_id = coalesce(v_driver_id, driver_id)
      WHERE trip_id = p_trip_id;
    ELSIF v_vehicle_id IS NOT NULL THEN
      INSERT INTO public.trip_vehicles (trip_id, vehicle_id, driver_id, days, unit_price, subtotal)
      VALUES (p_trip_id, v_vehicle_id, v_driver_id, coalesce(v_trip.total_days, 1), 0, 0);
    END IF;
  END IF;

  -- 3. Hotel assignment in trip_hotels
  IF p_updates ? 'hotel_id' AND (p_updates ->> 'hotel_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_hotel_id := (p_updates ->> 'hotel_id')::uuid;
    IF EXISTS (SELECT 1 FROM public.trip_hotels WHERE trip_id = p_trip_id) THEN
      UPDATE public.trip_hotels
      SET
        hotel_id = v_hotel_id,
        rooms = coalesce((p_updates ->> 'rooms')::integer, rooms)
      WHERE trip_id = p_trip_id;
    ELSE
      INSERT INTO public.trip_hotels (trip_id, hotel_id, rooms, check_in, check_out, unit_price, subtotal)
      VALUES (
        p_trip_id,
        v_hotel_id,
        coalesce((p_updates ->> 'rooms')::integer, 1),
        coalesce(v_trip.start_date, current_date),
        coalesce(v_trip.end_date, current_date + 3),
        0,
        0
      );
    END IF;
  END IF;

  -- 4. Audit History
  INSERT INTO public.trip_status_history (trip_id, from_status, to_status, note, changed_by)
  VALUES (
    p_trip_id,
    v_trip.status,
    coalesce(p_updates ->> 'status', v_trip.status),
    coalesce(p_updates ->> 'reason', 'Active trip configuration modified by admin'),
    auth.uid()
  );

  RETURN jsonb_build_object('ok', true, 'trip_id', p_trip_id);
END;
$$;

-- ============================================================================
-- 3. VEHICLES & DRIVERS CRUD RPCs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_upsert_vehicle(p_vehicle jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_type text;
  v_result jsonb;
BEGIN
  IF NOT public.is_admin_jwt() THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required' USING ERRCODE = '42501';
  END IF;

  v_type := coalesce(p_vehicle ->> 'type', 'car');
  IF v_type NOT IN ('car', 'bike', 'bus') THEN
    v_type := 'car';
  END IF;

  IF (p_vehicle ? 'id') AND (p_vehicle ->> 'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_id := (p_vehicle ->> 'id')::uuid;
  ELSE
    v_id := gen_random_uuid();
  END IF;

  INSERT INTO public.vehicles (
    id,
    type,
    name,
    subtitle,
    description,
    capacity,
    luggage_capacity,
    features,
    fuel_policy,
    driver_type,
    rating,
    badge,
    price,
    image_path,
    is_active,
    updated_at
  )
  VALUES (
    v_id,
    v_type,
    p_vehicle ->> 'name',
    p_vehicle ->> 'subtitle',
    p_vehicle ->> 'description',
    coalesce((p_vehicle ->> 'capacity')::integer, 4),
    coalesce((p_vehicle ->> 'luggage_capacity')::integer, 2),
    coalesce(
      ARRAY(SELECT jsonb_array_elements_text(p_vehicle -> 'features')),
      ARRAY['Air Conditioning', 'Commercial Permit']::text[]
    ),
    p_vehicle ->> 'fuel_policy',
    CASE
      WHEN p_vehicle ->> 'driver_type' IN ('chauffeur', 'self_drive') THEN p_vehicle ->> 'driver_type'
      ELSE 'chauffeur'
    END,
    coalesce((p_vehicle ->> 'rating')::numeric, 4.8),
    p_vehicle ->> 'badge',
    coalesce((p_vehicle ->> 'price_per_day')::numeric, (p_vehicle ->> 'price')::numeric, 3000),
    coalesce(p_vehicle ->> 'image_url', p_vehicle ->> 'image_path', '/images/placeholder.jpg'),
    coalesce((p_vehicle ->> 'is_active')::boolean, true),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    type = EXCLUDED.type,
    name = EXCLUDED.name,
    subtitle = EXCLUDED.subtitle,
    description = EXCLUDED.description,
    capacity = EXCLUDED.capacity,
    luggage_capacity = EXCLUDED.luggage_capacity,
    features = EXCLUDED.features,
    fuel_policy = EXCLUDED.fuel_policy,
    driver_type = EXCLUDED.driver_type,
    rating = EXCLUDED.rating,
    badge = EXCLUDED.badge,
    price = EXCLUDED.price,
    image_path = EXCLUDED.image_path,
    is_active = EXCLUDED.is_active,
    updated_at = now()
  RETURNING to_jsonb(vehicles.*) INTO v_result;

  RETURN jsonb_build_object('ok', true, 'data', v_result);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_vehicle(p_vehicle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_jwt() THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.vehicles
  SET is_active = false, updated_at = now()
  WHERE id = p_vehicle_id;

  RETURN jsonb_build_object('ok', true, 'vehicle_id', p_vehicle_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_driver(p_driver jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_result jsonb;
BEGIN
  IF NOT public.is_admin_jwt() THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required' USING ERRCODE = '42501';
  END IF;

  IF (p_driver ? 'id') AND (p_driver ->> 'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_id := (p_driver ->> 'id')::uuid;
  ELSE
    v_id := gen_random_uuid();
  END IF;

  INSERT INTO public.drivers (
    id,
    full_name,
    phone,
    plate_number,
    rating,
    is_active
  )
  VALUES (
    v_id,
    coalesce(p_driver ->> 'name', p_driver ->> 'full_name', 'Verified Driver'),
    p_driver ->> 'phone',
    upper(coalesce(p_driver ->> 'license_plate', p_driver ->> 'plate_number', 'DL 1Y AA 4088')),
    coalesce((p_driver ->> 'rating')::numeric, 4.9),
    coalesce((p_driver ->> 'is_active')::boolean, true)
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    plate_number = EXCLUDED.plate_number,
    rating = EXCLUDED.rating,
    is_active = EXCLUDED.is_active
  RETURNING to_jsonb(drivers.*) INTO v_result;

  RETURN jsonb_build_object('ok', true, 'data', v_result);
END;
$$;

-- ============================================================================
-- 4. HOTELS, STOPS & DESTINATIONS CRUD RPCs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_upsert_hotel(p_hotel jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_result jsonb;
  v_img text;
BEGIN
  IF NOT public.is_admin_jwt() THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required' USING ERRCODE = '42501';
  END IF;

  IF (p_hotel ? 'id') AND (p_hotel ->> 'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_id := (p_hotel ->> 'id')::uuid;
  ELSE
    v_id := gen_random_uuid();
  END IF;

  v_img := coalesce(p_hotel ->> 'image_url', '/images/placeholder.jpg');

  INSERT INTO public.hotels (
    id,
    destination_id,
    name,
    description,
    rating,
    neighborhood,
    distance_text,
    badge,
    price_per_night,
    image_paths,
    amenities,
    is_active,
    updated_at
  )
  VALUES (
    v_id,
    (p_hotel ->> 'destination_id')::uuid,
    p_hotel ->> 'name',
    p_hotel ->> 'description',
    coalesce((p_hotel ->> 'rating')::numeric, 4.8),
    p_hotel ->> 'neighborhood',
    p_hotel ->> 'distance_text',
    p_hotel ->> 'badge',
    coalesce((p_hotel ->> 'price_per_night')::numeric, 3500),
    ARRAY[v_img]::text[],
    coalesce(
      ARRAY(SELECT jsonb_array_elements_text(p_hotel -> 'amenities')),
      ARRAY['Free Wi-Fi', 'Swimming Pool']::text[]
    ),
    coalesce((p_hotel ->> 'is_active')::boolean, true),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    destination_id = EXCLUDED.destination_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    rating = EXCLUDED.rating,
    neighborhood = EXCLUDED.neighborhood,
    distance_text = EXCLUDED.distance_text,
    badge = EXCLUDED.badge,
    price_per_night = EXCLUDED.price_per_night,
    image_paths = EXCLUDED.image_paths,
    amenities = EXCLUDED.amenities,
    is_active = EXCLUDED.is_active,
    updated_at = now()
  RETURNING to_jsonb(hotels.*) INTO v_result;

  RETURN jsonb_build_object('ok', true, 'data', v_result);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_stop(p_stop jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_dest_id uuid := NULL;
  v_result jsonb;
BEGIN
  IF NOT public.is_admin_jwt() THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required' USING ERRCODE = '42501';
  END IF;

  IF (p_stop ? 'destination_id') AND (p_stop ->> 'destination_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_dest_id := (p_stop ->> 'destination_id')::uuid;
  END IF;

  IF (p_stop ? 'id') AND (p_stop ->> 'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_id := (p_stop ->> 'id')::uuid;
  ELSE
    v_id := gen_random_uuid();
  END IF;

  INSERT INTO public.stops (
    id,
    destination_id,
    name,
    description,
    price,
    pricing_unit,
    distance_text,
    turnaround_text,
    amenities,
    is_active,
    updated_at
  )
  VALUES (
    v_id,
    v_dest_id,
    p_stop ->> 'name',
    p_stop ->> 'description',
    coalesce((p_stop ->> 'price')::numeric, 500),
    coalesce(p_stop ->> 'pricing_unit', 'per_person'),
    p_stop ->> 'distance_text',
    p_stop ->> 'turnaround_text',
    coalesce(
      ARRAY(SELECT jsonb_array_elements_text(p_stop -> 'amenities')),
      ARRAY['Clean Restrooms', 'Artisan Chai']::text[]
    ),
    coalesce((p_stop ->> 'is_active')::boolean, true),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    destination_id = EXCLUDED.destination_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    pricing_unit = EXCLUDED.pricing_unit,
    distance_text = EXCLUDED.distance_text,
    turnaround_text = EXCLUDED.turnaround_text,
    amenities = EXCLUDED.amenities,
    is_active = EXCLUDED.is_active,
    updated_at = now()
  RETURNING to_jsonb(stops.*) INTO v_result;

  RETURN jsonb_build_object('ok', true, 'data', v_result);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_destination(p_destination jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_result jsonb;
BEGIN
  IF NOT public.is_admin_jwt() THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required' USING ERRCODE = '42501';
  END IF;

  IF (p_destination ? 'id') AND (p_destination ->> 'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_id := (p_destination ->> 'id')::uuid;
  ELSE
    v_id := gen_random_uuid();
  END IF;

  INSERT INTO public.destinations (
    id,
    slug,
    name,
    region,
    tagline,
    description,
    hero_image_path,
    starting_price,
    rating,
    recommended_days,
    best_season,
    badge,
    categories,
    origin_label,
    drive_hours,
    drive_km,
    is_featured,
    is_bookable,
    is_active,
    updated_at
  )
  VALUES (
    v_id,
    p_destination ->> 'slug',
    p_destination ->> 'name',
    p_destination ->> 'region',
    p_destination ->> 'tagline',
    p_destination ->> 'description',
    coalesce(p_destination ->> 'hero_image_path', '/images/placeholder.jpg'),
    coalesce((p_destination ->> 'starting_price')::numeric, 5000),
    coalesce((p_destination ->> 'rating')::numeric, 4.8),
    coalesce(p_destination ->> 'recommended_days', '3-4 Days'),
    coalesce(p_destination ->> 'best_season', 'Oct - Mar'),
    p_destination ->> 'badge',
    coalesce(
      ARRAY(SELECT jsonb_array_elements_text(p_destination -> 'categories')),
      ARRAY['popular']::text[]
    ),
    coalesce(p_destination ->> 'origin_label', 'Delhi NCR'),
    coalesce((p_destination ->> 'drive_hours')::numeric, 5.0),
    coalesce((p_destination ->> 'drive_km')::integer, 280),
    coalesce((p_destination ->> 'is_featured')::boolean, false),
    coalesce((p_destination ->> 'is_bookable')::boolean, true),
    coalesce((p_destination ->> 'is_active')::boolean, true),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    slug = EXCLUDED.slug,
    name = EXCLUDED.name,
    region = EXCLUDED.region,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description,
    hero_image_path = EXCLUDED.hero_image_path,
    starting_price = EXCLUDED.starting_price,
    rating = EXCLUDED.rating,
    recommended_days = EXCLUDED.recommended_days,
    best_season = EXCLUDED.best_season,
    badge = EXCLUDED.badge,
    categories = EXCLUDED.categories,
    origin_label = EXCLUDED.origin_label,
    drive_hours = EXCLUDED.drive_hours,
    drive_km = EXCLUDED.drive_km,
    is_featured = EXCLUDED.is_featured,
    is_bookable = EXCLUDED.is_bookable,
    is_active = EXCLUDED.is_active,
    updated_at = now()
  RETURNING to_jsonb(destinations.*) INTO v_result;

  RETURN jsonb_build_object('ok', true, 'data', v_result);
END;
$$;

-- ============================================================================
-- 5. RPC EXECUTE GRANTS & REVOCATIONS
-- ============================================================================

-- Explicitly revoke execution from PUBLIC and anon
REVOKE ALL ON FUNCTION public.admin_get_catalog_snapshot() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_upsert_circuit(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_toggle_circuit_status(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_control_active_trip(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_upsert_vehicle(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_vehicle(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_upsert_driver(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_upsert_hotel(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_upsert_stop(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_upsert_destination(jsonb) FROM PUBLIC, anon;

-- Grant execution privileges exclusively to authenticated users and service_role
GRANT EXECUTE ON FUNCTION public.admin_get_catalog_snapshot() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_circuit(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_toggle_circuit_status(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_control_active_trip(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_vehicle(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_vehicle(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_driver(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_hotel(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_stop(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_destination(jsonb) TO authenticated, service_role;
