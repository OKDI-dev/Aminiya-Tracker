CREATE TABLE IF NOT EXISTS public.contact_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  category text NOT NULL
    CHECK (
      category IN (
        'general',
        'feedback',
        'partnership',
        'collaboration',
        'other'
      )
    ),
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewing', 'resolved', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT contact_enquiries_name_length
    CHECK (char_length(name) BETWEEN 2 AND 120),
  CONSTRAINT contact_enquiries_email_length
    CHECK (char_length(email) BETWEEN 5 AND 254),
  CONSTRAINT contact_enquiries_subject_length
    CHECK (char_length(subject) BETWEEN 3 AND 160),
  CONSTRAINT contact_enquiries_message_length
    CHECK (char_length(message) BETWEEN 20 AND 5000)
);

CREATE INDEX IF NOT EXISTS contact_enquiries_status_created_at_idx
  ON public.contact_enquiries (status, created_at DESC);

ALTER TABLE public.contact_enquiries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.contact_enquiries
  FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.contact_enquiries TO service_role;
