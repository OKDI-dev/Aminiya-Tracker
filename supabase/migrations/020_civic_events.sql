CREATE TABLE IF NOT EXISTS public.civic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  title_en text NOT NULL,
  title_ha text NOT NULL,
  description_en text NOT NULL DEFAULT '',
  description_ha text NOT NULL DEFAULT '',

  category text NOT NULL DEFAULT 'other'
    CHECK (category IN (
      'civic_education',
      'electoral',
      'community_engagement',
      'youth',
      'accountability',
      'other'
    )),

  start_date date NOT NULL,
  end_date date,
  start_time time,
  end_time time,

  venue_en text,
  venue_ha text,
  registration_url text,

  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'cancelled')),

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT civic_events_valid_date_range
    CHECK (end_date IS NULL OR end_date >= start_date),

  CONSTRAINT civic_events_valid_time_range
    CHECK (
      end_date IS NOT NULL
      OR end_time IS NULL
      OR start_time IS NULL
      OR end_time >= start_time
    )
);

CREATE INDEX IF NOT EXISTS civic_events_public_calendar_idx
  ON public.civic_events (start_date ASC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS civic_events_status_idx
  ON public.civic_events (status, start_date DESC);

CREATE OR REPLACE FUNCTION public.set_civic_events_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS civic_events_updated_at
  ON public.civic_events;

CREATE TRIGGER civic_events_updated_at
BEFORE UPDATE ON public.civic_events
FOR EACH ROW
EXECUTE FUNCTION public.set_civic_events_updated_at();

ALTER TABLE public.civic_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.civic_events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.civic_events TO authenticated;

DROP POLICY IF EXISTS "Public can view published civic events"
  ON public.civic_events;

CREATE POLICY "Public can view published civic events"
ON public.civic_events
FOR SELECT
TO anon, authenticated
USING (status = 'published');

DROP POLICY IF EXISTS "Electoral staff can manage civic events"
  ON public.civic_events;

CREATE POLICY "Electoral staff can manage civic events"
ON public.civic_events
FOR ALL
TO authenticated
USING (public.is_electoral_admin())
WITH CHECK (public.is_electoral_admin());
