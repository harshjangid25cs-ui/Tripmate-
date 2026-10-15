-- Migration: 20261015000009_atomic_passengers_rpc.sql
-- Description: Atomic PostgreSQL RPC to replace passenger roster in a single transaction (SECURITY INVOKER).

CREATE OR REPLACE FUNCTION public.replace_trip_passengers(
  p_trip_id uuid,
  p_passengers jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- 1. Enforce draft trip edit permissions
  IF NOT public.can_edit_draft_trip(p_trip_id) THEN
    RAISE EXCEPTION 'Not authorized to edit passengers for trip %', p_trip_id;
  END IF;

  -- 2. Delete existing passengers for this trip
  DELETE FROM public.trip_passengers WHERE trip_id = p_trip_id;

  -- 3. Insert new passenger rows from jsonb payload if non-empty
  IF p_passengers IS NOT NULL AND jsonb_array_length(p_passengers) > 0 THEN
    INSERT INTO public.trip_passengers (
      trip_id,
      is_lead,
      full_name,
      phone,
      designation,
      employee_ref,
      id_doc_type,
      id_doc_path,
      seat_label,
      ticket_code
    )
    SELECT
      p_trip_id,
      COALESCE(r.is_lead, false),
      r.full_name,
      r.phone,
      r.designation,
      r.employee_ref,
      r.id_doc_type,
      r.id_doc_path,
      r.seat_label,
      r.ticket_code
    FROM jsonb_to_recordset(p_passengers) AS r(
      is_lead boolean,
      full_name text,
      phone text,
      designation text,
      employee_ref text,
      id_doc_type text,
      id_doc_path text,
      seat_label text,
      ticket_code text
    );
  END IF;
END;
$$;

-- Permissions
REVOKE ALL ON FUNCTION public.replace_trip_passengers(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_trip_passengers(uuid, jsonb) TO authenticated;
