import "server-only";

import { isMissingColumnError } from "@/lib/blurhash";

export const SECTORS_MIGRATION_NEEDED =
  "Saving more than one sector or a typed-in sector needs database migration 025_promise_sectors.sql. Apply it in Supabase, or choose one listed sector for now.";

type WriteResult = { error: { code?: string; message?: string } | null };

/**
 * Write a promise with its `sectors` list. On a database that doesn't have
 * the column yet (migration 025 not applied), retry without it when nothing
 * would be lost (one listed sector, kept in `sector`); otherwise report that
 * the migration is needed instead of silently dropping sectors.
 */
export async function writeWithSectors<T extends WriteResult>(
  write: (values: Record<string, unknown>) => PromiseLike<T>,
  values: Record<string, unknown>,
  sectors: string[],
  primary: string
): Promise<T | { migrationNeeded: true }> {
  const result = await write({ ...values, sector: primary, sectors });
  if (!isMissingColumnError(result.error)) return result;

  const lossless = sectors.length === 1 && sectors[0] === primary;
  if (!lossless) return { migrationNeeded: true };
  return write({ ...values, sector: primary });
}
