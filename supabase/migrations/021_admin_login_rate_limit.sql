CREATE TABLE IF NOT EXISTS public.admin_login_rate_limits (
  key_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0
);

ALTER TABLE public.admin_login_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_login_rate_limits
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_admin_login_limit(
  p_key_hash text,
  p_limit integer DEFAULT 5
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_attempts integer;
BEGIN
  IF p_key_hash IS NULL OR length(p_key_hash) <> 64
     OR p_limit IS NULL OR p_limit < 1 THEN
    RAISE EXCEPTION 'Invalid rate-limit arguments';
  END IF;

  INSERT INTO public.admin_login_rate_limits (
    key_hash,
    window_started_at,
    attempts
  )
  VALUES (p_key_hash, now(), 1)
  ON CONFLICT (key_hash)
  DO UPDATE SET
    attempts = CASE
      WHEN admin_login_rate_limits.window_started_at
           <= now() - interval '15 minutes'
      THEN 1
      ELSE admin_login_rate_limits.attempts + 1
    END,
    window_started_at = CASE
      WHEN admin_login_rate_limits.window_started_at
           <= now() - interval '15 minutes'
      THEN now()
      ELSE admin_login_rate_limits.window_started_at
    END
  RETURNING attempts INTO current_attempts;

  -- Remove expired entries so the table does not grow indefinitely.
  DELETE FROM public.admin_login_rate_limits
  WHERE window_started_at < now() - interval '1 day'
    AND key_hash <> p_key_hash;

  RETURN current_attempts <= p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_admin_login_limit(
  p_key_hash text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  DELETE FROM public.admin_login_rate_limits
  WHERE key_hash = p_key_hash;
$$;

REVOKE ALL ON FUNCTION public.consume_admin_login_limit(text, integer)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.clear_admin_login_limit(text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consume_admin_login_limit(text, integer)
TO service_role;

GRANT EXECUTE ON FUNCTION public.clear_admin_login_limit(text)
TO service_role;
