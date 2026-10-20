-- Migration 19: Allow hotels.destination_id to be NULL for floating / unassigned hotels
-- and update admin_upsert_hotel to handle unlinking safely

ALTER TABLE public.hotels ALTER COLUMN destination_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.admin_upsert_hotel(p_hotel jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_dest_id uuid := NULL;
  v_result jsonb;
  v_img text;
BEGIN
  IF NOT public.is_admin_jwt() THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required' USING ERRCODE = '42501';
  END IF;

  IF (p_hotel ? 'destination_id') AND (p_hotel ->> 'destination_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_dest_id := (p_hotel ->> 'destination_id')::uuid;
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
    v_dest_id,
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
$function$;
