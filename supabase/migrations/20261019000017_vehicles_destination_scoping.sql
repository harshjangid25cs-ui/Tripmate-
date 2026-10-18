-- Migration: Vehicles destination scoping and catalog syncing
-- Timestamp: 20261019000017
-- Purpose:
--   1. Add destination_id to public.vehicles with foreign key to public.destinations(id).
--   2. Set default destination_id for all existing registered fleet vehicles to Jaipur.
--   3. Update public.admin_upsert_vehicle(p_vehicle jsonb) to accept and persist destination_id.
--   4. Update public.admin_get_operational_snapshot() to project destination_id and destination_name for vehicles.

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS destination_id uuid REFERENCES public.destinations(id) ON DELETE SET NULL;

-- Default all existing vehicles to Jaipur destination ID
UPDATE public.vehicles
SET destination_id = COALESCE(
  (SELECT id FROM public.destinations WHERE slug = 'jaipur' LIMIT 1),
  '11111111-1111-1111-1111-111111111111'::uuid
)
WHERE destination_id IS NULL;

-- Update admin_upsert_vehicle RPC to support destination_id
CREATE OR REPLACE FUNCTION public.admin_upsert_vehicle(p_vehicle jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_type text;
  v_dest_id uuid;
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

  IF (p_vehicle ? 'destination_id') AND (p_vehicle ->> 'destination_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_dest_id := (p_vehicle ->> 'destination_id')::uuid;
  ELSE
    SELECT id INTO v_dest_id FROM public.destinations WHERE slug = 'jaipur' LIMIT 1;
  END IF;

  INSERT INTO public.vehicles (
    id,
    destination_id,
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
    v_dest_id,
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
    destination_id = COALESCE(EXCLUDED.destination_id, vehicles.destination_id),
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

-- Update admin_get_operational_snapshot to include vehicle destination scoping
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

  -- 5. Vehicles Fleet query (with destination_id and destination_name)
  SELECT coalesce(jsonb_agg(v), '[]'::jsonb) INTO v_vehicles
  FROM (
    SELECT
      v.id,
      v.destination_id,
      coalesce(d.name, 'Jaipur') AS destination_name,
      coalesce(d.name, 'Jaipur') AS city,
      v.type,
      v.name,
      coalesce(v.subtitle, '') AS subtitle,
      coalesce(v.description, '') AS description,
      coalesce(v.capacity, 4) AS capacity,
      coalesce(v.luggage_capacity, 2) AS luggage_capacity,
      v.features,
      coalesce(v.fuel_policy, 'Driver Provided · Fuel Included') AS fuel_policy,
      coalesce(v.driver_type, 'chauffeur') AS driver_type,
      v.rating,
      v.badge,
      v.price AS price_per_day,
      coalesce(v.image_path, '/images/placeholder.jpg') AS image_url,
      v.is_active
    FROM public.vehicles v
    LEFT JOIN public.destinations d ON d.id = v.destination_id
    ORDER BY v.created_at DESC
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
