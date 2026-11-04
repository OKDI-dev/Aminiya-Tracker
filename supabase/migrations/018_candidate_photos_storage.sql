INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'candidate-photos',
  'candidate-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Electoral staff upload candidate photos" ON storage.objects;
CREATE POLICY "Electoral staff upload candidate photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'candidate-photos'
  AND is_electoral_admin()
);

DROP POLICY IF EXISTS "Electoral staff update candidate photos" ON storage.objects;
CREATE POLICY "Electoral staff update candidate photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'candidate-photos'
  AND is_electoral_admin()
)
WITH CHECK (
  bucket_id = 'candidate-photos'
  AND is_electoral_admin()
);

DROP POLICY IF EXISTS "Electoral staff delete candidate photos" ON storage.objects;
CREATE POLICY "Electoral staff delete candidate photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'candidate-photos'
  AND is_electoral_admin()
);
