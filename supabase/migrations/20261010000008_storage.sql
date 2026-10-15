-- Migration 8: Storage buckets and access policies
-- Source of truth: DATABASE.md §7

-- 1. Create buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('catalog-images', 'catalog-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('id-documents', 'id-documents', false, 5242880, ARRAY['image/jpeg', 'image/png', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Policies for catalog-images (public read, no client writes)
DROP POLICY IF EXISTS "catalog_images_public_read" ON storage.objects;
CREATE POLICY "catalog_images_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'catalog-images');

-- 3. Storage Policies for id-documents (strictly private to authenticated user)
DROP POLICY IF EXISTS "id_documents_user_select" ON storage.objects;
CREATE POLICY "id_documents_user_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'id-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "id_documents_user_insert" ON storage.objects;
CREATE POLICY "id_documents_user_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'id-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "id_documents_user_delete" ON storage.objects;
CREATE POLICY "id_documents_user_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'id-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
