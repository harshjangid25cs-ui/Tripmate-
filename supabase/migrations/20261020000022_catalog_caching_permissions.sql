-- Migration: 20261020000022_catalog_caching_permissions.sql
-- Description: Enable public/anon SELECT on active catalog entities for tagged ISR caching

GRANT SELECT ON public.destinations, public.circuits, public.destination_highlights, public.hotels, public.vehicles, public.stops TO anon, authenticated;

DROP POLICY IF EXISTS "destinations_select" ON public.destinations;
CREATE POLICY "destinations_select" ON public.destinations
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "circuits_select" ON public.circuits;
CREATE POLICY "circuits_select" ON public.circuits
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "destination_highlights_select" ON public.destination_highlights;
CREATE POLICY "destination_highlights_select" ON public.destination_highlights
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "hotels_select" ON public.hotels;
CREATE POLICY "hotels_select" ON public.hotels
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "vehicles_select" ON public.vehicles;
CREATE POLICY "vehicles_select" ON public.vehicles
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "stops_select" ON public.stops;
CREATE POLICY "stops_select" ON public.stops
  FOR SELECT TO anon, authenticated
  USING (is_active = true);
