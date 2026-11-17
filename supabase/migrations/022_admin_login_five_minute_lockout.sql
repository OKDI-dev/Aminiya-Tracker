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
           <= now() - interval '5 minutes'
      THEN 1
      ELSE admin_login_rate_limits.attempts + 1
    END,
    window_started_at = CASE
      WHEN admin_login_rate_limits.window_started_at
           <= now() - interval '5 minutes'
      THEN now()
      ELSE admin_login_rate_limits.window_started_at
    END
  RETURNING attempts INTO current_attempts;

  DELETE FROM public.admin_login_rate_limits
  WHERE window_started_at < now() - interval '1 day'
    AND key_hash <> p_key_hash;

  RETURN current_attempts <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_admin_login_limit(text, integer)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consume_admin_login_limit(text, integer)
TO service_role;
