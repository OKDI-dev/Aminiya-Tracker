-- Add a language designation to each civic education media item.
-- Existing records default to English.

ALTER TABLE public.civic_education_media
ADD COLUMN IF NOT EXISTS content_language text NOT NULL DEFAULT 'en'
CHECK (content_language IN ('en', 'ha'));

CREATE INDEX IF NOT EXISTS civic_education_media_language_idx
ON public.civic_education_media (content_language, created_at DESC)
WHERE publication_status = 'published';
