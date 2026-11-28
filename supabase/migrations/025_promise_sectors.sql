-- A promise can cover several sectors, including ones typed in under "Other".
-- `sectors` holds known sector keys plus typed-in sector names as plain text.
-- `sector` stays as the primary sector so existing queries keep working.

ALTER TABLE public.political_promises
  ADD COLUMN IF NOT EXISTS sectors text[] NOT NULL DEFAULT '{}';

-- Carry every existing promise's single sector into the new list.
UPDATE public.political_promises
SET sectors = ARRAY[sector]
WHERE cardinality(sectors) = 0
  AND sector IS NOT NULL
  AND sector <> '';

ALTER TABLE public.political_promises
  DROP CONSTRAINT IF EXISTS political_promises_sectors_size;

ALTER TABLE public.political_promises
  ADD CONSTRAINT political_promises_sectors_size
  CHECK (cardinality(sectors) <= 8);
