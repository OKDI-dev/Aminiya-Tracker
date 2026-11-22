import { NextResponse } from "next/server";
import { apiError, deleteFailed, requireStaffApi } from "@/lib/admin/api";
import { validateElectionResult } from "@/lib/admin/validators/election-results";

type Context = { params: Promise<{ id: string }> };

/**
 * Edits use the same rules as new results: they save as draft or verified.
 * A published result that is edited therefore goes offline until it is
 * published again, so changed figures are never public without review.
 */
export async function PATCH(request: Request, { params }: Context) {
  try {
    const auth = await requireStaffApi("manage election results");
    if ("response" in auth) return auth.response;
    const { supabase } = auth;
    const { id } = await params;

    const validation = await validateElectionResult(supabase, await request.json());
    if ("error" in validation) return apiError(validation.error, validation.status);

    const { data, error } = await supabase
      .from("election_results")
      .update(validation.values)
      .eq("id", id)
      .select("id, publication_status")
      .maybeSingle();

    if (error) {
      console.error("Election result update failed:", error);
      return apiError(error.message, 400);
    }
    if (!data) return apiError("Election result not found.", 404);

    return NextResponse.json({ result: data });
  } catch (error) {
    console.error("Election result update API error:", error);
    return apiError("An unexpected server error occurred.", 500);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const auth = await requireStaffApi("manage election results");
    if ("response" in auth) return auth.response;
    const { supabase } = auth;
    const { id } = await params;

    const { data, error } = await supabase.from("election_results").delete().eq("id", id).select("id");
    if (error) return deleteFailed("election result", error);
    if (!data?.length) return apiError("Election result not found.", 404);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Election result deletion API error:", error);
    return apiError("An unexpected server error occurred.", 500);
  }
}
