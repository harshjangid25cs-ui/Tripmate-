-- Migration 16: Revoke EXECUTE on internal SECURITY DEFINER and Admin RPC functions
-- Addresses SEC-08 per approved permissions matrix.
-- Re-checked in Phase 1.5 against the comprehensive SECURITY DEFINER audit table.

-- ============================================================================
-- 1. Admin Operations: Revoke from PUBLIC, anon, authenticated (service_role only via server actions)
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.admin_assign_driver(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_control_active_trip(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_delete_vehicle(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_catalog_snapshot() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_operational_snapshot() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_approval(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_toggle_circuit_status(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_toggle_coupon_active(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_booking_status(uuid, text, text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_pricing_config(numeric, numeric, text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_circuit(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_coupon(text, text, text, numeric, numeric, numeric, integer, boolean, timestamp with time zone, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_destination(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_driver(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_hotel(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_stop(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_vehicle(jsonb) FROM PUBLIC, anon, authenticated;

-- Ensure service_role has explicit execute rights for all admin server action RPCs
GRANT EXECUTE ON FUNCTION public.admin_assign_driver(uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_control_active_trip(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_vehicle(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_catalog_snapshot() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_operational_snapshot() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_resolve_approval(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_toggle_circuit_status(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_toggle_coupon_active(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_booking_status(uuid, text, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_pricing_config(numeric, numeric, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_circuit(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_coupon(text, text, text, numeric, numeric, numeric, integer, boolean, timestamp with time zone, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_destination(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_driver(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_hotel(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_stop(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_vehicle(jsonb) TO service_role;

-- ============================================================================
-- 2. Internal / Trigger functions: Revoke direct execution from PUBLIC, anon, authenticated
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_trip_total() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_trip_hotel_price() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_trip_stop_price() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_trip_vehicle_price() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_trip_children() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_passenger_doc_path() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_audit_log_modification() FROM PUBLIC, anon, authenticated;

-- Internal booking helpers: revoke from client roles, only callable internally or via service_role
REVOKE EXECUTE ON FUNCTION public.finalize_booking(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.build_itinerary(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_booking(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.build_itinerary(uuid) TO service_role;

-- ============================================================================
-- 3. Authenticated customer functions: Revoke from anon (keep for authenticated & service_role)
-- ============================================================================
-- RLS Helper functions MUST remain executable by 'authenticated' for RLS policy evaluation:
-- - can_view_trip(uuid) -> Used in trips, trip_vehicles, trip_hotels, trip_stops, itinerary_items RLS
-- - can_edit_draft_trip(uuid) -> Used in trip children RLS (trip_vehicles, trip_hotels, etc.)
-- - is_company_member(uuid) -> Used in companies, company_members, commercial_bookings RLS
-- - is_company_admin(uuid) -> Used in review_commercial_booking
-- - shares_company_with(uuid) -> Used in profiles RLS
REVOKE EXECUTE ON FUNCTION public.can_view_trip(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_draft_trip(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_company_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_company_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.shares_company_with(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_valid_bus_seat(text, integer) FROM anon;

-- Customer RPC actions: revoke from anon, accessible to authenticated sessions
REVOKE EXECUTE ON FUNCTION public.customer_apply_coupon(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.demo_pay(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_commercial_booking(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.assign_commercial_passenger(uuid, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.review_commercial_booking(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_booking(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.replace_trip_passengers(uuid, jsonb) FROM anon;

-- ============================================================================
-- 4. Explicitly Retained Public / Permitted Functions
-- ============================================================================
-- A. public.get_ticket(text): Retains EXECUTE for anon + authenticated (QR scan verification without login).
-- B. public.is_admin_jwt(): Retains EXECUTE for anon + authenticated + service_role (used in coupons_read_policy
--    where anonymous visitors evaluate 'is_active = true OR public.is_admin_jwt()'; returns false safely).
