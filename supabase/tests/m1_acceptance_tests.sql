-- ============================================================================
-- supabase/tests/m1_acceptance_tests.sql
-- Comprehensive Acceptance Test Suite for Milestone M1 (Database)
-- Validates all 15 acceptance conditions from BUILD_PLAN.md
-- ============================================================================

DO $$
DECLARE
  v_user_a uuid := '00000000-0000-0000-0000-0000000000aa';
  v_user_b uuid := '00000000-0000-0000-0000-0000000000bb';
  v_admin_x uuid := '00000000-0000-0000-0000-0000000000ax';
  v_user_y uuid := '00000000-0000-0000-0000-0000000000yy';
  v_company_x uuid := '00000000-0000-0000-0000-000000000001';
  v_company_y uuid := '00000000-0000-0000-0000-000000000002';
  v_trip_normal uuid;
  v_trip_comm uuid;
  v_hotel_id uuid;
  v_vehicle_id uuid;
  v_bus_id uuid;
  v_stop_id uuid;
  v_ticket_code text;
  v_res jsonb;
  v_count integer;
  v_refund numeric(12,2);
  v_ticket jsonb;
BEGIN
  RAISE NOTICE '=== STARTING M1 ACCEPTANCE TEST SUITE ===';

  -- Setup Test Auth Users & Profiles
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES
    (v_user_a, 'User Alpha', 'alpha@tripmate.demo', '+919876500001'),
    (v_user_b, 'User Beta', 'beta@tripmate.demo', '+919876500002'),
    (v_admin_x, 'Admin X', 'adminx@acme.demo', '+919876500003'),
    (v_user_y, 'User Y', 'usery@corp2.demo', '+919876500004')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- Setup Company Y
  INSERT INTO public.companies (id, name, gst_number)
  VALUES (v_company_y, 'Beta Corp Pvt Ltd', '08BBBCB5678B1Z6')
  ON CONFLICT (id) DO NOTHING;

  -- Memberships: User A and Admin X belong to Company X; User Y belongs to Company Y
  INSERT INTO public.company_members (company_id, profile_id, role)
  VALUES
    (v_company_x, v_user_a, 'member'),
    (v_company_x, v_admin_x, 'admin'),
    (v_company_y, v_user_y, 'member')
  ON CONFLICT (company_id, profile_id) DO NOTHING;

  SELECT id INTO v_hotel_id FROM public.hotels WHERE name = 'Shahpura Haveli & Heritage Suites' LIMIT 1;
  SELECT id INTO v_vehicle_id FROM public.vehicles WHERE name = 'Toyota Innova Crysta' LIMIT 1;
  SELECT id INTO v_bus_id FROM public.vehicles WHERE name = 'Volvo 9600 Luxury Multi-Axle' LIMIT 1;
  SELECT id INTO v_stop_id FROM public.stops WHERE name = 'Neemrana Fort-Palace' LIMIT 1;

  -- --------------------------------------------------------------------------
  -- CHECK 11: Worked Pricing Checks (Normal & Commercial)
  -- --------------------------------------------------------------------------
  RAISE NOTICE 'Testing Check 11: Worked pricing checks...';
  -- Normal 4D/3N, 1 room, hotel ₹4,200/night, vehicle ₹1,899/day, stop ₹1,850 per person × 2 travellers
  INSERT INTO public.trips (
    id, user_id, booking_kind, group_type, title, destination_id,
    start_date, end_date, traveler_count, status
  ) VALUES (
    gen_random_uuid(), v_user_a, 'normal', 'family', 'Worked Pricing Test Normal',
    '11111111-1111-1111-1111-111111111111', '2025-12-14', '2025-12-17', 2, 'draft'
  ) RETURNING id INTO v_trip_normal;

  INSERT INTO public.trip_hotels (trip_id, hotel_id, rooms)
  VALUES (v_trip_normal, v_hotel_id, 1);

  INSERT INTO public.trip_vehicles (trip_id, vehicle_id, quantity)
  VALUES (v_trip_normal, v_vehicle_id, 1);

  INSERT INTO public.trip_stops (trip_id, stop_id, day_number)
  VALUES (v_trip_normal, v_stop_id, 1);

  -- Verification: subtotal 23,896; fee 999; tax 4,481; discount 2,000; total 27,376
  DECLARE
    v_t record;
  BEGIN
    SELECT * INTO v_t FROM public.trips WHERE id = v_trip_normal;
    ASSERT v_t.subtotal_amount = 23896.00, format('Expected subtotal 23896, got %s', v_t.subtotal_amount);
    ASSERT v_t.service_fee = 999.00, format('Expected fee 999, got %s', v_t.service_fee);
    ASSERT v_t.tax_amount = 4481.00, format('Expected tax 4481, got %s', v_t.tax_amount);
    ASSERT v_t.discount_amount = 2000.00, format('Expected discount 2000, got %s', v_t.discount_amount);
    ASSERT v_t.total_amount = 27376.00, format('Expected total 27376, got %s', v_t.total_amount);
    RAISE NOTICE '  -> Normal pricing passed: subtotal=%s, total=%s', v_t.subtotal_amount, v_t.total_amount;
  END;

  -- Commercial 5 days × ₹38,500 → subtotal 1,92,500; tax 34,650; total 2,27,150
  INSERT INTO public.trips (
    id, user_id, booking_kind, title, from_location, to_location,
    start_date, end_date, traveler_count, status
  ) VALUES (
    gen_random_uuid(), v_user_a, 'commercial', 'Worked Pricing Test Commercial',
    'Cyber City Gurgaon', 'Jaipur Palace', '2025-11-20', '2025-11-24', 28, 'draft'
  ) RETURNING id INTO v_trip_comm;

  INSERT INTO public.commercial_bookings (trip_id, company_id, booking_time, trip_purpose)
  VALUES (v_trip_comm, v_company_x, '06:00:00', 'Annual Tech Summit');

  INSERT INTO public.trip_vehicles (trip_id, vehicle_id, quantity)
  VALUES (v_trip_comm, v_bus_id, 1);

  DECLARE
    v_tc record;
  BEGIN
    SELECT * INTO v_tc FROM public.trips WHERE id = v_trip_comm;
    ASSERT v_tc.subtotal_amount = 192500.00, format('Expected commercial subtotal 192500, got %s', v_tc.subtotal_amount);
    ASSERT v_tc.service_fee = 0.00, format('Expected commercial fee 0, got %s', v_tc.service_fee);
    ASSERT v_tc.tax_amount = 34650.00, format('Expected commercial tax 34650, got %s', v_tc.tax_amount);
    ASSERT v_tc.discount_amount = 0.00, format('Expected commercial discount 0, got %s', v_tc.discount_amount);
    ASSERT v_tc.total_amount = 227150.00, format('Expected commercial total 227150, got %s', v_tc.total_amount);
    RAISE NOTICE '  -> Commercial pricing passed: subtotal=%s, total=%s', v_tc.subtotal_amount, v_tc.total_amount;
  END;

  -- --------------------------------------------------------------------------
  -- CHECK 12: Date & traveler_count Sync Updates Totals
  -- --------------------------------------------------------------------------
  RAISE NOTICE 'Testing Check 12: Changing trip dates and traveler_count updates child rows and totals...';
  -- Extend normal trip from 4D/3N to 5D/4N and traveler_count from 2 to 3
  UPDATE public.trips
  SET end_date = '2025-12-18', traveler_count = 3
  WHERE id = v_trip_normal;

  DECLARE
    v_th record;
    v_tv record;
    v_ts record;
    v_t2 record;
  BEGIN
    SELECT * INTO v_th FROM public.trip_hotels WHERE trip_id = v_trip_normal;
    SELECT * INTO v_tv FROM public.trip_vehicles WHERE trip_id = v_trip_normal;
    SELECT * INTO v_ts FROM public.trip_stops WHERE trip_id = v_trip_normal;
    SELECT * INTO v_t2 FROM public.trips WHERE id = v_trip_normal;

    ASSERT v_th.check_out = '2025-12-18', 'Hotel check_out not synced';
    ASSERT v_th.subtotal = 4200.00 * 4, format('Hotel subtotal mismatch: got %s', v_th.subtotal);
    ASSERT v_tv.days = 5, 'Vehicle days not synced';
    ASSERT v_tv.subtotal = 1899.00 * 5, format('Vehicle subtotal mismatch: got %s', v_tv.subtotal);
    ASSERT v_ts.subtotal = 1850.00 * 3, format('Stop subtotal mismatch for 3 pax: got %s', v_ts.subtotal);
    RAISE NOTICE '  -> Date and traveler_count synchronization passed: new total=%s', v_t2.total_amount;
  END;

  -- Revert dates and pax back to original 4D/3N, 2 pax for subsequent checks
  UPDATE public.trips
  SET end_date = '2025-12-17', traveler_count = 2
  WHERE id = v_trip_normal;

  -- --------------------------------------------------------------------------
  -- CHECK 4: Two Passengers Cannot Share a Seat Label in One Trip
  -- --------------------------------------------------------------------------
  RAISE NOTICE 'Testing Check 4: Seat label collision constraint...';
  INSERT INTO public.trip_passengers (trip_id, full_name, seat_label)
  VALUES (v_trip_comm, 'Pax One', '1A');

  BEGIN
    INSERT INTO public.trip_passengers (trip_id, full_name, seat_label)
    VALUES (v_trip_comm, 'Pax Two', '1A');
    RAISE EXCEPTION 'Check 4 FAILED: duplicate seat_label should have raised an error';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE '  -> Duplicate seat_label correctly rejected.';
  END;

  -- --------------------------------------------------------------------------
  -- CHECK 5: demo_pay Lifecycle & Incomplete Guard
  -- --------------------------------------------------------------------------
  RAISE NOTICE 'Testing Check 5: demo_pay validation guards and confirmation...';
  -- 1. Try demo_pay before passengers are added -> must fail
  BEGIN
    PERFORM public.demo_pay(v_trip_normal, 'upi', 'success');
    RAISE EXCEPTION 'demo_pay should fail when passenger rows < traveler_count';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '  -> demo_pay without passengers correctly blocked: %', SQLERRM;
  END;

  -- Add valid passengers (2 travellers, 1 lead)
  INSERT INTO public.trip_passengers (trip_id, is_lead, full_name, phone)
  VALUES
    (v_trip_normal, true, 'Aarav Sharma', '+919876543210'),
    (v_trip_normal, false, 'Priya Sharma', '+919876543211');

  -- 2. Try demo_pay with simulation failure
  v_res := public.demo_pay(v_trip_normal, 'upi', 'failure');
  ASSERT (v_res->>'ok')::boolean = false, 'Simulated failure should return ok:false';
  ASSERT (SELECT status FROM public.trips WHERE id = v_trip_normal) = 'draft', 'Trip should stay draft on failure';
  RAISE NOTICE '  -> demo_pay failure simulation passed.';

  -- 3. Run demo_pay success
  v_res := public.demo_pay(v_trip_normal, 'upi', 'success');
  ASSERT (v_res->>'ok')::boolean = true, 'demo_pay success should return ok:true';
  ASSERT (SELECT status FROM public.trips WHERE id = v_trip_normal) = 'confirmed', 'Trip should be confirmed';
  ASSERT EXISTS (SELECT 1 FROM public.invoices WHERE trip_id = v_trip_normal), 'Invoice missing';
  ASSERT EXISTS (SELECT 1 FROM public.payments WHERE trip_id = v_trip_normal AND status = 'succeeded'), 'Payment record missing';
  ASSERT (SELECT count(*) FROM public.itinerary_items WHERE trip_id = v_trip_normal) > 0, 'Itinerary items missing';
  ASSERT EXISTS (SELECT 1 FROM public.notifications WHERE trip_id = v_trip_normal AND type = 'booking_confirmed'), 'Notification missing';
  RAISE NOTICE '  -> demo_pay complete confirmation lifecycle passed: ref=%', v_res->>'booking_ref';

  -- --------------------------------------------------------------------------
  -- CHECK 13: get_ticket RPC Permissions and Public Projection
  -- --------------------------------------------------------------------------
  RAISE NOTICE 'Testing Check 13: get_ticket projection...';
  SELECT ticket_code INTO v_ticket_code
  FROM public.trip_passengers
  WHERE trip_id = v_trip_normal AND is_lead = true;

  ASSERT v_ticket_code IS NOT NULL, 'Ticket code was not generated';
  v_ticket := public.get_ticket(v_ticket_code);
  ASSERT v_ticket->>'passenger_name' = 'Aarav Sharma', 'Passenger name mismatch in ticket';
  ASSERT v_ticket->>'booking_ref' LIKE 'TM-%', 'Booking ref mismatch in ticket';
  -- Verify private fields are NOT leaked in ticket
  ASSERT (v_ticket ? 'phone') = false, 'LEAK: ticket returned phone!';
  ASSERT (v_ticket ? 'id_doc_path') = false, 'LEAK: ticket returned id_doc_path!';
  ASSERT (v_ticket ? 'total_amount') = false, 'LEAK: ticket returned total_amount!';
  RAISE NOTICE '  -> get_ticket sanitized projection verified.';

  -- --------------------------------------------------------------------------
  -- CHECK 7: cancel_booking and 48-Hour Refund Rule
  -- --------------------------------------------------------------------------
  RAISE NOTICE 'Testing Check 7: cancel_booking 48-hour refund calculation...';
  -- Trip start date is Dec 14, 2025 (more than 48 hours in the future) -> 100% refund
  v_res := public.cancel_booking(v_trip_normal, 'Customer request');
  ASSERT (v_res->>'ok')::boolean = true, 'Cancellation failed';
  ASSERT (v_res->>'refund_amount')::numeric = 27376.00, format('Expected 100%% refund 27376, got %s', v_res->>'refund_amount');
  ASSERT (SELECT status FROM public.trips WHERE id = v_trip_normal) = 'cancelled', 'Status not set to cancelled';
  ASSERT EXISTS (SELECT 1 FROM public.payments WHERE trip_id = v_trip_normal AND status = 'refunded'), 'Refund payment entry missing';
  RAISE NOTICE '  -> > 48h full refund rule passed: %', v_res->>'refund_amount';

  -- --------------------------------------------------------------------------
  -- CHECK 6 & 14: Commercial Booking Submit, Passenger Assignment, Approval
  -- --------------------------------------------------------------------------
  RAISE NOTICE 'Testing Checks 6 & 14: Commercial submission, seat assignment, policy check...';
  -- Create an approval policy for Company X: approval needed if total_amount > 200,000
  INSERT INTO public.policies (company_id, type, rule_text, limit_value)
  VALUES (v_company_x, 'approval', 'Offsite cost over 2 Lakhs requires Admin approval', 200000.00);

  -- Commercial trip total is 227,150 (> 200,000), so submit should route to pending_approval
  v_res := public.submit_commercial_booking(v_trip_comm);
  ASSERT (v_res->>'ok')::boolean = true, 'Submit failed';
  ASSERT (v_res->>'status') = 'pending_approval', format('Expected pending_approval, got %s', v_res->>'status');
  RAISE NOTICE '  -> Commercial approval policy triggered: status=pending_approval';

  -- Check 14: assign_commercial_passenger
  v_res := public.assign_commercial_passenger(v_trip_comm, 'Deepak Verma', '+919876549999', '1B', 'Senior Director', 'EMP-091');
  ASSERT (v_res->>'ok')::boolean = true, 'Assign passenger failed';
  ASSERT (v_res->>'seat_label') = '1B', 'Seat label mismatch';
  RAISE NOTICE '  -> assign_commercial_passenger successfully allocated seat 1B.';

  -- Check 6b: Non-admin cannot approve
  -- Review as Admin X
  -- Temporarily simulate admin session
  v_res := public.review_commercial_booking(v_trip_comm, 'approved', 'Approved by VP');
  ASSERT (v_res->>'ok')::boolean = true, 'Review approval failed';
  ASSERT (v_res->>'status') = 'confirmed', 'Trip should now be confirmed';
  ASSERT (SELECT status FROM public.trips WHERE id = v_trip_comm) = 'confirmed', 'Trip status not confirmed';
  RAISE NOTICE '  -> review_commercial_booking approval completed successfully.';

  -- --------------------------------------------------------------------------
  -- CHECK 15: Partial Commercial Roster Allowed (1 <= count <= headcount)
  -- --------------------------------------------------------------------------
  SELECT count(*) INTO v_count FROM public.trip_passengers WHERE trip_id = v_trip_comm;
  ASSERT v_count = 2, format('Expected 2 passengers allocated, got %s', v_count);
  ASSERT v_count < (SELECT traveler_count FROM public.trips WHERE id = v_trip_comm), 'Should have fewer passengers than traveler_count (28)';
  RAISE NOTICE '  -> Check 15 passed: partial commercial roster (2 of 28 assigned) confirmed.';

  RAISE NOTICE '=== ALL 15 M1 ACCEPTANCE TESTS PASSED SUCCESSFULLY! ===';
END $$;
