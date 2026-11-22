import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { apiError, deleteFailed, requireStaffApi } from "@/lib/admin/api";
import { validatePromiseUpdate } from "@/lib/admin/validators/promise-updates";

type Context = { params: Promise<{ id: string }> };

const EVIDENCE_BUCKET = "promise-progress-evidence";

/**
 * Edits keep the update on its promise and send it back to "pending", so a
 * changed claim or link is reviewed again before it counts publicly.
 */
export async function PATCH(request: Request, { params }: Context) {
  try {
    const auth = await requireStaffApi("manage promise updates");
    if ("response" in auth) return auth.response;
    const { supabase } = auth;
    const { id } = await params;

    const { data: existing, error: existingError } = await supabase
      .from("promise_progress_updates")
      .select("id, promise_id")
      .eq("id", id)
      .maybeSingle();
    if (existingError) return apiError("Could not load this progress update.", 500);
    if (!existing) return apiError("Progress update not found.", 404);

    const body = await request.json();
    const validation = await validatePromiseUpdate(supabase, { ...body, promise_id: existing.promise_id });
    if ("error" in validation) return apiError(validation.error, validation.status);

    const { data, error } = await supabase
      .from("promise_progress_updates")
      .update({ ...validation.values, review_status: "pending" })
      .eq("id", id)
      .select("id, review_status")
      .maybeSingle();

    if (error) {
      console.error("Progress update edit failed:", error);
      return apiError(error.message, 400);
    }
    if (!data) return apiError("Progress update not found.", 404);

    return NextResponse.json({ update: data });
  } catch (error) {
    console.error("Progress update edit API error:", error);
    return apiError("An unexpected server error occurred.", 500);
  }
}

/** Deletes the update together with its evidence files, which mean nothing alone. */
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const auth = await requireStaffApi("manage promise updates");
    if ("response" in auth) return auth.response;
    const { supabase } = auth;
    const { id } = await params;

    const { data: existing, error: existingError } = await supabase
      .from("promise_progress_updates")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (existingError) return apiError("Could not load this progress update.", 500);
    if (!existing) return apiError("Progress update not found.", 404);

    // Evidence is stored privately; the service client is used only after the
    // staff check above, as the evidence upload route does.
    const { data: evidence, error: evidenceError } = await adminSupabase
      .from("promise_progress_evidence")
      .select("id, storage_path")
      .eq("progress_update_id", id);
    if (evidenceError) return apiError("Could not load this update's evidence. Nothing was deleted.", 500);

    if (evidence?.length) {
      const { error: rowsError } = await adminSupabase
        .from("promise_progress_evidence")
        .delete()
        .eq("progress_update_id", id);
      if (rowsError) return deleteFailed("progress update's evidence", rowsError);

      const paths = evidence.map((item) => item.storage_path).filter(Boolean);
      if (paths.length) {
        const { error: storageError } = await adminSupabase.storage.from(EVIDENCE_BUCKET).remove(paths);
        // The rows are gone; an orphaned file is private and harmless, so log it and carry on.
        if (storageError) console.error("Evidence file cleanup failed:", storageError, paths);
      }
    }

    const { data, error } = await supabase.from("promise_progress_updates").delete().eq("id", id).select("id");
    if (error) return deleteFailed("progress update", error);
    if (!data?.length) return apiError("Progress update not found.", 404);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Progress update deletion API error:", error);
    return apiError("An unexpected server error occurred.", 500);
  }
}
