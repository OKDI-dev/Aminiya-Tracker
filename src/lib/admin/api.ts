import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type AdminSupabase = Awaited<ReturnType<typeof createClient>>;

/** What a shared validator returns: clean values to save, or the error to show. */
export type Validation =
  | { values: Record<string, unknown> }
  | { error: string; status: number };

const STAFF_ROLES = ["admin", "electoral_reviewer"];

/**
 * Signed-in electoral staff only. Returns the request's Supabase client (so
 * row-level security still applies) or the 401/403 response to send.
 */
export async function requireStaffApi(action: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  const { data: profile, error } = await supabase
    .from("app_profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (error || !profile || !STAFF_ROLES.includes(profile.role)) {
    return {
      response: NextResponse.json({ error: `You are not authorised to ${action}.` }, { status: 403 }),
    };
  }

  return { supabase, user };
}

export function apiError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export type Reference = { table: string; column: string; label: string };

/**
 * Counts the records that point at `id`, so a delete can be refused with a
 * clear reason instead of a foreign-key error (or a silent cascade).
 * Returns the 409 response to send, a 500 when a count fails, or null when
 * nothing depends on the record.
 */
export async function blockIfReferenced(
  supabase: AdminSupabase,
  id: string,
  noun: string,
  references: Reference[]
) {
  const results = await Promise.all(
    references.map((ref) =>
      supabase.from(ref.table).select("id", { count: "exact", head: true }).eq(ref.column, id)
    )
  );

  if (results.some((result) => result.error)) {
    console.error(`${noun} reference check failed:`, results.map((r) => r.error).filter(Boolean));
    return apiError(
      `Could not check whether this ${noun} is linked to other records. Nothing was deleted.`,
      500
    );
  }

  const linked = references
    .map((ref, index) => ({ label: ref.label, count: results[index].count ?? 0 }))
    .filter((item) => item.count > 0)
    .map((item) => `${item.count} ${item.label}${item.count === 1 ? "" : "s"}`);

  if (linked.length) {
    return apiError(
      `This ${noun} is linked to ${linked.join(", ")}. Remove or reassign those first, then delete it.`,
      409
    );
  }

  return null;
}

/** Map a delete failure to a message staff can act on. */
export function deleteFailed(noun: string, error: { code?: string; message?: string }) {
  console.error(`${noun} deletion failed:`, error);
  return apiError(
    error.code === "23503"
      ? `This ${noun} is still referenced by another record and cannot be deleted.`
      : `The ${noun} could not be deleted.`,
    409
  );
}
