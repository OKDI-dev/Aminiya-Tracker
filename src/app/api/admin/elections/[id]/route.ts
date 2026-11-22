import { NextResponse } from "next/server";
import { apiError, blockIfReferenced, deleteFailed, requireStaffApi } from "@/lib/admin/api";
import { validateElection } from "@/lib/admin/validators/elections";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const auth = await requireStaffApi("manage elections");
    if ("response" in auth) return auth.response;
    const { supabase } = auth;
    const { id } = await params;

    const validation = await validateElection(supabase, await request.json());
    if ("error" in validation) return apiError(validation.error, validation.status);

    const { data, error } = await supabase
      .from("elections")
      .update(validation.values)
      .eq("id", id)
      .select("id, name")
      .maybeSingle();

    if (error) {
      console.error("Election update failed:", error);
      return apiError(error.message, 400);
    }
    if (!data) return apiError("Election not found.", 404);

    return NextResponse.json({ election: data });
  } catch (error) {
    console.error("Election update API error:", error);
    return apiError("An unexpected server error occurred.", 500);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const auth = await requireStaffApi("manage elections");
    if ("response" in auth) return auth.response;
    const { supabase } = auth;
    const { id } = await params;

    const blocked = await blockIfReferenced(supabase, id, "election", [
      { table: "candidacies", column: "election_id", label: "candidacy" },
      { table: "election_results", column: "election_id", label: "election result" },
      { table: "election_incidents", column: "election_id", label: "incident report" },
    ]);
    if (blocked) return blocked;

    const { data, error } = await supabase.from("elections").delete().eq("id", id).select("id");
    if (error) return deleteFailed("election", error);
    if (!data?.length) return apiError("Election not found.", 404);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Election deletion API error:", error);
    return apiError("An unexpected server error occurred.", 500);
  }
}
