-- Civic Education videos and infographics.

CREATE TABLE IF NOT EXISTS public.civic_education_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  title_en text NOT NULL,
  title_ha text NOT NULL,
  description_en text NOT NULL DEFAULT '',
  description_ha text NOT NULL DEFAULT '',

  media_type text NOT NULL
    CHECK (media_type IN ('video', 'infographic')),

  category text NOT NULL DEFAULT 'other'
    CHECK (category IN (
      'voting_basics',
      'voter_rights',
      'electoral_process',
      'civic_responsibility',
      'accountability',
      'reliable_information',
      'other'
    )),

  source_type text NOT NULL
    CHECK (source_type IN ('upload', 'youtube')),
  media_url text,
  storage_path text,
  mime_type text,
  file_size bigint,

  publication_status text NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft', 'published', 'archived')),

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT civic_education_media_source_check CHECK (
    (source_type = 'upload' AND storage_path IS NOT NULL AND media_url IS NULL)
    OR
    (source_type = 'youtube' AND media_url IS NOT NULL AND storage_path IS NULL)
  ),
  CONSTRAINT civic_education_media_file_size_check CHECK (
    file_size IS NULL OR file_size > 0
  ),
  CONSTRAINT civic_education_media_youtube_type_check CHECK (
    source_type <> 'youtube' OR media_type = 'video'
  )
);

CREATE INDEX IF NOT EXISTS civic_education_media_public_idx
  ON public.civic_education_media (category, created_at DESC)
  WHERE publication_status = 'published';

CREATE INDEX IF NOT EXISTS civic_education_media_status_idx
  ON public.civic_education_media (publication_status, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_civic_education_media_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS civic_education_media_updated_at
  ON public.civic_education_media;

CREATE TRIGGER civic_education_media_updated_at
BEFORE UPDATE ON public.civic_education_media
FOR EACH ROW
EXECUTE FUNCTION public.set_civic_education_media_updated_at();

ALTER TABLE public.civic_education_media ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.civic_education_media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.civic_education_media TO authenticated;

DROP POLICY IF EXISTS "Public can view published civic education media"
  ON public.civic_education_media;

CREATE POLICY "Public can view published civic education media"
ON public.civic_education_media
FOR SELECT
TO anon, authenticated
USING (publication_status = 'published');

DROP POLICY IF EXISTS "Electoral staff can manage civic education media"
  ON public.civic_education_media;

CREATE POLICY "Electoral staff can manage civic education media"
ON public.civic_education_media
FOR ALL
TO authenticated
USING (public.is_electoral_admin())
WITH CHECK (public.is_electoral_admin());

-- Public bucket: published media can be served through public URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'civic-education-media',
  'civic-education-media',
  true,
  104857600,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Electoral staff upload civic education media"
  ON storage.objects;

CREATE POLICY "Electoral staff upload civic education media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'civic-education-media'
  AND public.is_electoral_admin()
);

DROP POLICY IF EXISTS "Electoral staff update civic education media"
  ON storage.objects;

CREATE POLICY "Electoral staff update civic education media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'civic-education-media'
  AND public.is_electoral_admin()
)
WITH CHECK (
  bucket_id = 'civic-education-media'
  AND public.is_electoral_admin()
);

DROP POLICY IF EXISTS "Electoral staff delete civic education media"
  ON storage.objects;

CREATE POLICY "Electoral staff delete civic education media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'civic-education-media'
  AND public.is_electoral_admin()
);
