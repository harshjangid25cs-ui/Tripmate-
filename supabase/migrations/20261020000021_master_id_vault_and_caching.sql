-- Migration: 20261020000021_master_id_vault_and_caching.sql
-- Description: Master ID Vault, Reusable Companions, Storage Permissions, and replace_trip_passengers RPC upgrade

-- ============================================================================
-- 1. Reusable KYC & Companion Columns on public.profiles
-- ============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS saved_id_type text,
  ADD COLUMN IF NOT EXISTS saved_id_storage_path text,
  ADD COLUMN IF NOT EXISTS saved_id_file_size_bytes integer,
  ADD COLUMN IF NOT EXISTS saved_id_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS saved_id_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS saved_companions jsonb DEFAULT '[]'::jsonb;

-- Add check constraint for saved_id_type if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_saved_id_type_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_saved_id_type_check
      CHECK (saved_id_type IS NULL OR saved_id_type IN ('aadhaar', 'passport', 'driving_license', 'driving_licence', 'voter_id'));
  END IF;
END $$;

-- ============================================================================
-- 2. Metadata Columns on public.trip_passengers
-- ============================================================================
ALTER TABLE public.trip_passengers
  ADD COLUMN IF NOT EXISTS id_file_size_bytes integer,
  ADD COLUMN IF NOT EXISTS is_reused_from_profile boolean DEFAULT false;

-- ============================================================================
-- 3. Storage Bucket Configuration (WebP Support)
-- ============================================================================
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
WHERE id = 'id-documents';

-- ============================================================================
-- 4. Storage RLS Policies for id-documents
-- Authenticated users can read/reuse their own uploaded files under their uid folder
-- Superadmins (public.is_admin_jwt()) can view all id-documents for KYC review
-- ============================================================================
DROP POLICY IF EXISTS "id_documents_user_select" ON storage.objects;
CREATE POLICY "id_documents_user_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'id-documents' AND
    (
      (storage.foldername(name))[1] = auth.uid()::text
      OR
      public.is_admin_jwt()
    )
  );

DROP POLICY IF EXISTS "id_documents_user_insert" ON storage.objects;
CREATE POLICY "id_documents_user_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'id-documents' AND
    (
      (storage.foldername(name))[1] = auth.uid()::text
      OR
      public.is_admin_jwt()
    )
  );

DROP POLICY IF EXISTS "id_documents_user_update" ON storage.objects;
CREATE POLICY "id_documents_user_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'id-documents' AND
    (
      (storage.foldername(name))[1] = auth.uid()::text
      OR
      public.is_admin_jwt()
    )
  )
  WITH CHECK (
    bucket_id = 'id-documents' AND
    (
      (storage.foldername(name))[1] = auth.uid()::text
      OR
      public.is_admin_jwt()
    )
  );

DROP POLICY IF EXISTS "id_documents_user_delete" ON storage.objects;
CREATE POLICY "id_documents_user_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'id-documents' AND
    (
      (storage.foldername(name))[1] = auth.uid()::text
      OR
      public.is_admin_jwt()
    )
  );

-- ============================================================================
-- 5. Update replace_trip_passengers RPC with ID file metadata & reuse flags
-- ============================================================================
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
      ticket_code,
      id_file_size_bytes,
      is_reused_from_profile
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
      r.ticket_code,
      r.id_file_size_bytes,
      COALESCE(r.is_reused_from_profile, false)
    FROM jsonb_to_recordset(p_passengers) AS r(
      is_lead boolean,
      full_name text,
      phone text,
      designation text,
      employee_ref text,
      id_doc_type text,
      id_doc_path text,
      seat_label text,
      ticket_code text,
      id_file_size_bytes integer,
      is_reused_from_profile boolean
    );
  END IF;
END;
$$;

-- ============================================================================
-- 6. Public Catalog Caching Schema: Allow anon + authenticated SELECT on active catalog
-- ============================================================================
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

