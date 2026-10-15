-- supabase/tests/02_m1_items_16_17.sql
-- Validation of BUILD_PLAN.md Milestone M1 items 16 and 17

DO $$
DECLARE
  v_user_test uuid := '00000000-0000-0000-0000-0000000000aa';
  v_draft_id uuid;
  v_confirmed_id uuid;
  v_cancelled_id uuid;
  v_pending_id uuid;
  v_inserted_id uuid;
  v_inserted_title text;
  v_rows_affected integer;
BEGIN
  RAISE NOTICE '=== TESTING BUILD_PLAN M1 ITEMS 16 & 17 ===';

  -- Ensure test profile exists
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (v_user_test, 'Test Owner', 'owner@tripmate.demo')
  ON CONFLICT (id) DO NOTHING;

  -- Setup fixtures as superuser/postgres: trips in draft, confirmed, cancelled, pending_approval
  INSERT INTO public.trips (user_id, booking_kind, group_type, title, status)
  VALUES (v_user_test, 'normal', 'solo', 'Owner Draft Trip', 'draft')
  RETURNING id INTO v_draft_id;

  INSERT INTO public.trips (user_id, booking_kind, group_type, title, status)
  VALUES (v_user_test, 'normal', 'solo', 'Owner Confirmed Trip', 'confirmed')
  RETURNING id INTO v_confirmed_id;

  INSERT INTO public.trips (user_id, booking_kind, group_type, title, status)
  VALUES (v_user_test, 'normal', 'solo', 'Owner Cancelled Trip', 'cancelled')
  RETURNING id INTO v_cancelled_id;

  INSERT INTO public.trips (user_id, booking_kind, group_type, title, status)
  VALUES (v_user_test, 'normal', 'solo', 'Owner Pending Trip', 'pending_approval')
  RETURNING id INTO v_pending_id;

  RAISE NOTICE 'Fixtures created: draft=%, confirmed=%, cancelled=%, pending=%',
    v_draft_id, v_confirmed_id, v_cancelled_id, v_pending_id;

  -- --------------------------------------------------------------------------
  -- Switch session to authenticated role for v_user_test to test RLS policies
  -- --------------------------------------------------------------------------
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', v_user_test::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_test::text, 'role', 'authenticated')::text, true);

  -- --------------------------------------------------------------------------
  -- ITEM 16: An owner cannot UPDATE or DELETE a trip whose status is not 'draft'
  -- --------------------------------------------------------------------------
  RAISE NOTICE '--- Testing Item 16: Non-draft UPDATE and DELETE restrictions ---';

  -- 16.1: UPDATE on confirmed trip must affect 0 rows
  UPDATE public.trips SET title = 'Hacked Confirmed Title' WHERE id = v_confirmed_id;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  ASSERT v_rows_affected = 0, format('FAIL: Owner was able to UPDATE confirmed trip! rows=%s', v_rows_affected);
  RAISE NOTICE '  -> Passed: UPDATE on confirmed trip affected 0 rows.';

  -- 16.2: DELETE on confirmed trip must affect 0 rows
  DELETE FROM public.trips WHERE id = v_confirmed_id;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  ASSERT v_rows_affected = 0, format('FAIL: Owner was able to DELETE confirmed trip! rows=%s', v_rows_affected);
  RAISE NOTICE '  -> Passed: DELETE on confirmed trip affected 0 rows.';

  -- 16.3: UPDATE on cancelled trip must affect 0 rows
  UPDATE public.trips SET title = 'Hacked Cancelled Title' WHERE id = v_cancelled_id;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  ASSERT v_rows_affected = 0, format('FAIL: Owner was able to UPDATE cancelled trip! rows=%s', v_rows_affected);
  RAISE NOTICE '  -> Passed: UPDATE on cancelled trip affected 0 rows.';

  -- 16.4: DELETE on cancelled trip must affect 0 rows
  DELETE FROM public.trips WHERE id = v_cancelled_id;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  ASSERT v_rows_affected = 0, format('FAIL: Owner was able to DELETE cancelled trip! rows=%s', v_rows_affected);
  RAISE NOTICE '  -> Passed: DELETE on cancelled trip affected 0 rows.';

  -- 16.5: UPDATE on pending_approval trip must affect 0 rows
  UPDATE public.trips SET title = 'Hacked Pending Title' WHERE id = v_pending_id;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  ASSERT v_rows_affected = 0, format('FAIL: Owner was able to UPDATE pending_approval trip! rows=%s', v_rows_affected);
  RAISE NOTICE '  -> Passed: UPDATE on pending_approval trip affected 0 rows.';

  -- 16.6: DELETE on pending_approval trip must affect 0 rows
  DELETE FROM public.trips WHERE id = v_pending_id;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  ASSERT v_rows_affected = 0, format('FAIL: Owner was able to DELETE pending_approval trip! rows=%s', v_rows_affected);
  RAISE NOTICE '  -> Passed: DELETE on pending_approval trip affected 0 rows.';

  -- 16.7: UPDATE on draft trip MUST succeed
  UPDATE public.trips SET title = 'Legit Updated Draft Title' WHERE id = v_draft_id;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  ASSERT v_rows_affected = 1, format('FAIL: Owner could not UPDATE draft trip! rows=%s', v_rows_affected);
  RAISE NOTICE '  -> Passed: UPDATE on draft trip affected 1 row.';

  -- 16.8: DELETE on draft trip MUST succeed
  DELETE FROM public.trips WHERE id = v_draft_id;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  ASSERT v_rows_affected = 1, format('FAIL: Owner could not DELETE draft trip! rows=%s', v_rows_affected);
  RAISE NOTICE '  -> Passed: DELETE on draft trip affected 1 row.';

  -- --------------------------------------------------------------------------
  -- ITEM 17: An ordinary authenticated user can INSERT a draft trip and read it back
  -- in the same statement (INSERT … RETURNING)
  -- --------------------------------------------------------------------------
  RAISE NOTICE '--- Testing Item 17: INSERT ... RETURNING for authenticated user ---';

  INSERT INTO public.trips (
    user_id,
    booking_kind,
    group_type,
    title,
    status
  ) VALUES (
    v_user_test,
    'normal',
    'solo',
    'Returning Test Draft',
    'draft'
  ) RETURNING id, title INTO v_inserted_id, v_inserted_title;

  ASSERT v_inserted_id IS NOT NULL, 'FAIL: v_inserted_id was null from INSERT ... RETURNING';
  ASSERT v_inserted_title = 'Returning Test Draft', format('FAIL: unexpected title %s', v_inserted_title);
  RAISE NOTICE '  -> Passed: INSERT ... RETURNING succeeded: id=%, title=%', v_inserted_id, v_inserted_title;

  -- Cleanup
  DELETE FROM public.trips WHERE id = v_inserted_id;

  -- Reset role to postgres/default
  PERFORM set_config('role', 'postgres', true);
  DELETE FROM public.trips WHERE id IN (v_confirmed_id, v_cancelled_id, v_pending_id);

  RAISE NOTICE '=== ALL M1 ITEMS 16 & 17 TESTS PASSED SUCCESSFULLY! ===';
END $$;
