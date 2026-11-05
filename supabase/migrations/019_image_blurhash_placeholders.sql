-- Blurhash placeholders for candidate photos and party logos.
-- Computed server-side at upload time (see src/lib/server/blurhash.ts) and
-- rendered as instant blurred previews while the full image loads.

alter table public.candidates
  add column if not exists photo_blurhash text
    check (photo_blurhash is null or char_length(photo_blurhash) between 6 and 100);

alter table public.political_parties
  add column if not exists logo_blurhash text
    check (logo_blurhash is null or char_length(logo_blurhash) between 6 and 100);

comment on column public.candidates.photo_blurhash is
  'Blurhash of photo_url, used as a loading placeholder.';
comment on column public.political_parties.logo_blurhash is
  'Blurhash of logo_url, used as a loading placeholder.';
