DROP POLICY IF EXISTS "Public can submit election incidents"
ON public.election_incidents;

CREATE POLICY "Public can submit election incidents"
ON public.election_incidents
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'submitted'
  AND reported_by IS NULL
  AND source_id IS NULL
  AND verification_notes IS NULL
  AND public_summary IS NULL
  AND category IN (
    'vote_buying',
    'voter_intimidation',
    'violence',
    'ballot_snatching',
    'electoral_malpractice',
    'disinformation',
    'other'
  )
  AND char_length(trim(description)) BETWEEN 20 AND 5000
);
