-- Add an optional name for community issue reporters.
ALTER TABLE public.community_issues
ADD COLUMN reporter_name text;

ALTER TABLE public.community_issues
ADD CONSTRAINT community_issues_reporter_name_length_check
CHECK (reporter_name IS NULL OR char_length(reporter_name) <= 100);
