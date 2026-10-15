-- supabase/tests/02_m1_items_16_18.sql
-- Validation of Milestone M1 items 16, 17, and 18

DO $$
DECLARE
  v_user_a uuid := 'aaaaaaaa-1111-1111-1111-111111111111';
  v_cancelled_id uuid;
  v_inserted_id uuid;
  v_inserted_title text;
  v_rows_affected integer;
  v_policy record;
  v_func record;
  v_anon_allowed text[] := ARRAY[]::text[];
BEGIN
  RAISE NOTICE '=== TESTING BUILD_PLAN M1 ITEMS 16, 17 & 18 ===';

  -- Ensure user A profile exists
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (v_user_a, 'Arjun Kapoor', 'arjun.kapoor@tripmate.io')
  ON CONFLICT (id) DO NOTHING;

  -- --------------------------------------------------------------------------
  -- ITEM 16: Service-role creates trip owned by user A with status 'cancelled'
  -- and NO payments or invoices. As user A, try UPDATE & DELETE; assert 0 rows
  -- affected and row still exists.
  -- --------------------------------------------------------------------------
  RAISE NOTICE '--- Testing Item 16: Non-draft UPDATE and DELETE restrictions (status=cancelled, no payments/invoices) ---';

  INSERT INTO public.trips (user_id, booking_kind, group_type, title, status)
  VALUES (v_user_a, 'normal', 'solo', 'Cancelled Trip No Payments', 'cancelled')
  RETURNING id INTO v_cancelled_id;

  RAISE NOTICE 'Service-role created cancelled trip fixture: %', v_cancelled_id;

  -- Switch session to authenticated role as user A
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a::text, 'role', 'authenticated')::text, true);

  -- 16.1: As user A, try UPDATE -> must affect 0 rows
  UPDATE public.trips SET title = 'Hacked Cancelled Title' WHERE id = v_cancelled_id;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  ASSERT v_rows_affected = 0, format('FAIL: Owner was able to UPDATE cancelled trip! rows=%s', v_rows_affected);
  RAISE NOTICE '  -> Passed: UPDATE on cancelled trip affected 0 rows.';

  -- 16.2: As user A, try DELETE -> must affect 0 rows
  DELETE FROM public.trips WHERE id = v_cancelled_id;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  ASSERT v_rows_affected = 0, format('FAIL: Owner was able to DELETE cancelled trip! rows=%s', v_rows_affected);
  RAISE NOTICE '  -> Passed: DELETE on cancelled trip affected 0 rows.';

  -- Reset to postgres/service-role to verify row still exists and inspect policies
  PERFORM set_config('role', 'postgres', true);

  ASSERT EXISTS (SELECT 1 FROM public.trips WHERE id = v_cancelled_id), 'FAIL: Cancelled trip was deleted!';
  RAISE NOTICE '  -> Passed: Cancelled trip row still exists.';

  -- Print pg_policies for trips
  RAISE NOTICE '--- Printing pg_policies for trips table ---';
  FOR v_policy IN
    SELECT policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename = 'trips'
    ORDER BY policyname
  LOOP
    RAISE NOTICE 'Policy: %, cmd: %, qual: %, with_check: %',
      v_policy.policyname, v_policy.cmd, v_policy.qual, v_policy.with_check;
  END LOOP;

  -- --------------------------------------------------------------------------
  -- ITEM 17: Ordinary authenticated user can INSERT draft trip and read back
  -- in the same statement (INSERT ... RETURNING)
  -- --------------------------------------------------------------------------
  RAISE NOTICE '--- Testing Item 17: INSERT ... RETURNING for authenticated user ---';

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a::text, 'role', 'authenticated')::text, true);

  INSERT INTO public.trips (user_id, booking_kind, group_type, title, status)
  VALUES (v_user_a, 'normal', 'solo', 'Returning Test Draft', 'draft')
  RETURNING id, title INTO v_inserted_id, v_inserted_title;

  ASSERT v_inserted_id IS NOT NULL, 'FAIL: v_inserted_id was null from INSERT ... RETURNING';
  ASSERT v_inserted_title = 'Returning Test Draft', format('FAIL: unexpected title %s', v_inserted_title);
  RAISE NOTICE '  -> Passed: INSERT ... RETURNING succeeded: id=%, title=%', v_inserted_id, v_inserted_title;

  -- Clean up draft
  DELETE FROM public.trips WHERE id = v_inserted_id;

  -- Reset to postgres
  PERFORM set_config('role', 'postgres', true);
  DELETE FROM public.trips WHERE id = v_cancelled_id;

  -- --------------------------------------------------------------------------
  -- ITEM 18: For the anon role, has_function_privilege returns true ONLY for
  -- get_ticket among public functions
  -- --------------------------------------------------------------------------
  RAISE NOTICE '--- Testing Item 18: Anon function privileges on public functions ---';

  FOR v_func IN
    SELECT p.proname, p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
    ORDER BY p.proname
  LOOP
    IF has_function_privilege('anon', v_func.oid, 'EXECUTE') THEN
      v_anon_allowed := array_append(v_anon_allowed, v_func.proname::text);
      RAISE NOTICE '  -> Anon HAS EXECUTE on public function: %', v_func.proname;
    END IF;
  END LOOP;

  RAISE NOTICE 'Public functions executable by anon: %', v_anon_allowed;
  ASSERT v_anon_allowed = ARRAY['get_ticket']::text[],
    format('FAIL: Expected anon to have execute ONLY on get_ticket, but got: %s', v_anon_allowed);
  RAISE NOTICE '  -> Passed: has_function_privilege returns true ONLY for get_ticket among public functions.';

  RAISE NOTICE '=== ALL M1 ITEMS 16, 17 & 18 TESTS PASSED SUCCESSFULLY! ===';
END $$;
