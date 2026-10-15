-- Migration 7: Row Level Security policies, column-level grants, and execution grants
-- Source of truth: DATABASE.md §5 and §6

-- ============================================================================
-- 1. ENABLE RLS ON EVERY TABLE
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destination_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circuits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. RLS POLICIES
-- ============================================================================

-- profiles
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.shares_company_with(id));

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- companies, company_members, policies
CREATE POLICY "companies_select" ON public.companies
  FOR SELECT TO authenticated
  USING (public.is_company_member(id));

CREATE POLICY "company_members_select" ON public.company_members
  FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "policies_select" ON public.policies
  FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

-- catalog tables (destinations, hotels, vehicles, stops, circuits)
CREATE POLICY "destinations_select" ON public.destinations
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "hotels_select" ON public.hotels
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "vehicles_select" ON public.vehicles
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "stops_select" ON public.stops
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "circuits_select" ON public.circuits
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "destination_highlights_select" ON public.destination_highlights
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "pricing_config_select" ON public.pricing_config
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "drivers_select" ON public.drivers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_vehicles tv
      WHERE tv.driver_id = drivers.id AND public.can_view_trip(tv.trip_id)
    )
  );

-- trips
CREATE POLICY "trips_select" ON public.trips
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_view_trip(id));

CREATE POLICY "trips_insert" ON public.trips
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'draft');

CREATE POLICY "trips_update" ON public.trips
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'draft')
  WITH CHECK (status = 'draft');

CREATE POLICY "trips_delete" ON public.trips
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status = 'draft');

-- child tables: trip_hotels, trip_vehicles, trip_stops, trip_passengers
CREATE POLICY "trip_hotels_select" ON public.trip_hotels
  FOR SELECT TO authenticated
  USING (public.can_view_trip(trip_id));

CREATE POLICY "trip_hotels_insert" ON public.trip_hotels
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_draft_trip(trip_id));

CREATE POLICY "trip_hotels_update" ON public.trip_hotels
  FOR UPDATE TO authenticated
  USING (public.can_edit_draft_trip(trip_id))
  WITH CHECK (public.can_edit_draft_trip(trip_id));

CREATE POLICY "trip_hotels_delete" ON public.trip_hotels
  FOR DELETE TO authenticated
  USING (public.can_edit_draft_trip(trip_id));

CREATE POLICY "trip_vehicles_select" ON public.trip_vehicles
  FOR SELECT TO authenticated
  USING (public.can_view_trip(trip_id));

CREATE POLICY "trip_vehicles_insert" ON public.trip_vehicles
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_draft_trip(trip_id));

CREATE POLICY "trip_vehicles_update" ON public.trip_vehicles
  FOR UPDATE TO authenticated
  USING (public.can_edit_draft_trip(trip_id))
  WITH CHECK (public.can_edit_draft_trip(trip_id));

CREATE POLICY "trip_vehicles_delete" ON public.trip_vehicles
  FOR DELETE TO authenticated
  USING (public.can_edit_draft_trip(trip_id));

CREATE POLICY "trip_stops_select" ON public.trip_stops
  FOR SELECT TO authenticated
  USING (public.can_view_trip(trip_id));

CREATE POLICY "trip_stops_insert" ON public.trip_stops
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_draft_trip(trip_id));

CREATE POLICY "trip_stops_update" ON public.trip_stops
  FOR UPDATE TO authenticated
  USING (public.can_edit_draft_trip(trip_id))
  WITH CHECK (public.can_edit_draft_trip(trip_id));

CREATE POLICY "trip_stops_delete" ON public.trip_stops
  FOR DELETE TO authenticated
  USING (public.can_edit_draft_trip(trip_id));

CREATE POLICY "trip_passengers_select" ON public.trip_passengers
  FOR SELECT TO authenticated
  USING (public.can_view_trip(trip_id));

CREATE POLICY "trip_passengers_insert" ON public.trip_passengers
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_draft_trip(trip_id));

CREATE POLICY "trip_passengers_update" ON public.trip_passengers
  FOR UPDATE TO authenticated
  USING (public.can_edit_draft_trip(trip_id))
  WITH CHECK (public.can_edit_draft_trip(trip_id));

CREATE POLICY "trip_passengers_delete" ON public.trip_passengers
  FOR DELETE TO authenticated
  USING (public.can_edit_draft_trip(trip_id));

-- commercial_bookings
CREATE POLICY "commercial_bookings_select" ON public.commercial_bookings
  FOR SELECT TO authenticated
  USING (public.can_view_trip(trip_id));

CREATE POLICY "commercial_bookings_insert" ON public.commercial_bookings
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_draft_trip(trip_id) AND public.is_company_member(company_id));

CREATE POLICY "commercial_bookings_update" ON public.commercial_bookings
  FOR UPDATE TO authenticated
  USING (public.can_edit_draft_trip(trip_id))
  WITH CHECK (public.can_edit_draft_trip(trip_id));

-- read-only trip auxiliaries
CREATE POLICY "itinerary_items_select" ON public.itinerary_items
  FOR SELECT TO authenticated
  USING (public.can_view_trip(trip_id));

CREATE POLICY "invoices_select" ON public.invoices
  FOR SELECT TO authenticated
  USING (public.can_view_trip(trip_id));

CREATE POLICY "trip_status_history_select" ON public.trip_status_history
  FOR SELECT TO authenticated
  USING (public.can_view_trip(trip_id));

-- payments
CREATE POLICY "payments_select" ON public.payments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- notifications
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- saved_items
CREATE POLICY "saved_items_select" ON public.saved_items
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "saved_items_insert" ON public.saved_items
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "saved_items_delete" ON public.saved_items
  FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

-- feedback
CREATE POLICY "feedback_select" ON public.feedback
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "feedback_insert" ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE id = feedback.trip_id AND user_id = auth.uid() AND status = 'confirmed' AND end_date <= CURRENT_DATE
    )
  );

-- ============================================================================
-- 3. COLUMN-LEVEL GRANTS
-- ============================================================================

-- Baseline grants on tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Revoke default broad write grants
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Grant specific writes per DATABASE.md §5
GRANT INSERT (booking_kind, group_type, title, destination_id, circuit_id, from_location, to_location, start_date, end_date, traveler_count)
  ON public.trips TO authenticated;
GRANT UPDATE (group_type, title, destination_id, circuit_id, from_location, to_location, start_date, end_date, traveler_count)
  ON public.trips TO authenticated;
GRANT DELETE ON public.trips TO authenticated;

GRANT INSERT (trip_id, hotel_id, rooms), UPDATE (trip_id, hotel_id, rooms), DELETE
  ON public.trip_hotels TO authenticated;

GRANT INSERT (trip_id, vehicle_id, quantity), UPDATE (trip_id, vehicle_id, quantity), DELETE
  ON public.trip_vehicles TO authenticated;

GRANT INSERT (trip_id, stop_id, day_number, sort_order), UPDATE (trip_id, stop_id, day_number, sort_order), DELETE
  ON public.trip_stops TO authenticated;

GRANT INSERT (trip_id, is_lead, full_name, phone, designation, employee_ref, id_doc_type, id_doc_path, seat_label),
      UPDATE (trip_id, is_lead, full_name, phone, designation, employee_ref, id_doc_type, id_doc_path, seat_label),
      DELETE
  ON public.trip_passengers TO authenticated;

GRANT INSERT (trip_id, company_id, booking_time, trip_purpose)
  ON public.commercial_bookings TO authenticated;
GRANT UPDATE (booking_time, trip_purpose)
  ON public.commercial_bookings TO authenticated;

GRANT UPDATE (full_name, phone, avatar_url)
  ON public.profiles TO authenticated;

GRANT UPDATE (is_read)
  ON public.notifications TO authenticated;

GRANT INSERT (profile_id, item_type, item_id), DELETE
  ON public.saved_items TO authenticated;

GRANT INSERT (trip_id, profile_id, star_rating, nps_score, comment)
  ON public.feedback TO authenticated;

-- Sequence usage
GRANT USAGE ON SEQUENCE booking_ref_seq TO authenticated;
GRANT USAGE ON SEQUENCE invoice_number_seq TO authenticated;

-- ============================================================================
-- 4. RPC EXECUTE GRANTS
-- ============================================================================

-- Revoke all function privileges from PUBLIC for every function in public
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_trip_hotel_price() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_trip_vehicle_price() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_trip_stop_price() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalc_trip_total() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_trip_children() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_passenger_doc_path() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_company_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_company_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.shares_company_with(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_trip(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_edit_draft_trip(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_valid_bus_seat(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.build_itinerary(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_booking(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.demo_pay(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_commercial_booking(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_commercial_passenger(uuid, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_commercial_booking(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_booking(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_ticket(text) FROM PUBLIC;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Helper functions (§5 helpers)
GRANT EXECUTE ON FUNCTION public.is_company_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_company_with(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_trip(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_draft_trip(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_bus_seat(text, integer) TO authenticated;

-- Client-callable RPCs (Functions 1–5 in DATABASE.md §6)
GRANT EXECUTE ON FUNCTION public.demo_pay(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_commercial_booking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_commercial_passenger(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_commercial_booking(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid, text) TO authenticated;

-- Function 6: Public ticket lookup (anon and authenticated)
GRANT EXECUTE ON FUNCTION public.get_ticket(text) TO anon, authenticated;
