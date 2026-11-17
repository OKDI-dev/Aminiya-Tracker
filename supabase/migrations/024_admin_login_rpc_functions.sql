-- The staff login route calls check_admin_login_limit and
-- record_admin_login_failure, which no earlier migration created.
-- Lockout rule: 5 failed attempts within 5 minutes lock that key for a full
-- 5 minutes from the moment of the lock.

ALTER TABLE public.admin_login_rate_limits
  ADD COLUMN IF NOT EXISTS locked_until timestamptz;

-- Return types differ from any hand-made versions, so replace them cleanly.
DROP FUNCTION IF EXISTS public.check_admin_login_limit(text);
DROP FUNCTION IF EXISTS public.record_admin_login_failure(text, integer);

-- Seconds until this key may try again; 0 means it is not locked.
CREATE FUNCTION public.check_admin_login_limit(
  p_key_hash text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  remaining integer;
BEGIN
  IF p_key_hash IS NULL OR length(p_key_hash) <> 64 THEN
    RAISE EXCEPTION 'Invalid rate-limit arguments';
  END IF;

  SELECT ceil(extract(epoch FROM (locked_until - now())))::integer
  INTO remaining
  FROM public.admin_login_rate_limits
  WHERE key_hash = p_key_hash
    AND locked_until > now();

  RETURN GREATEST(COALESCE(remaining, 0), 0);
END;
$$;

-- Records one failed attempt and returns the attempt count in the current
-- window. Reaching p_limit starts a 5-minute lock.
CREATE FUNCTION public.record_admin_login_failure(
  p_key_hash text,
  p_limit integer DEFAULT 5
)
RETURNS integer
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
    attempts,
    locked_until
  )
  VALUES (p_key_hash, now(), 1, NULL)
  ON CONFLICT (key_hash)
  DO UPDATE SET
    attempts = CASE
      WHEN admin_login_rate_limits.window_started_at <= now() - interval '5 minutes'
        OR admin_login_rate_limits.locked_until <= now()
      THEN 1
      ELSE admin_login_rate_limits.attempts + 1
    END,
    window_started_at = CASE
      WHEN admin_login_rate_limits.window_started_at <= now() - interval '5 minutes'
        OR admin_login_rate_limits.locked_until <= now()
      THEN now()
      ELSE admin_login_rate_limits.window_started_at
    END,
    locked_until = CASE
      WHEN admin_login_rate_limits.locked_until <= now()
      THEN NULL
      ELSE admin_login_rate_limits.locked_until
    END
  RETURNING attempts INTO current_attempts;

  IF current_attempts >= p_limit THEN
    UPDATE public.admin_login_rate_limits
    SET locked_until = now() + interval '5 minutes'
    WHERE key_hash = p_key_hash;
  END IF;

  -- Keep the table small.
  DELETE FROM public.admin_login_rate_limits
  WHERE window_started_at < now() - interval '1 day'
    AND (locked_until IS NULL OR locked_until < now())
    AND key_hash <> p_key_hash;

  RETURN current_attempts;
END;
$$;

REVOKE ALL ON FUNCTION public.check_admin_login_limit(text)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.record_admin_login_failure(text, integer)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.check_admin_login_limit(text)
TO service_role;

GRANT EXECUTE ON FUNCTION public.record_admin_login_failure(text, integer)
TO service_role;
