import { NextResponse } from "next/server";
import { apiError, blockIfReferenced, deleteFailed, requireStaffApi } from "@/lib/admin/api";
import { validateCandidacy } from "@/lib/admin/validators/candidacies";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const auth = await requireStaffApi("manage candidacies");
    if ("response" in auth) return auth.response;
    const { supabase } = auth;
    const { id } = await params;

    const validation = await validateCandidacy(supabase, await request.json());
    if ("error" in validation) return apiError(validation.error, validation.status);

    const { data, error } = await supabase
      .from("candidacies")
      .update(validation.values)
      .eq("id", id)
      .select("id, office_title, publication_status")
      .maybeSingle();

    if (error) {
      console.error("Candidacy update failed:", error);
      return apiError(
        error.code === "23505"
          ? "This candidate already has a candidacy in the selected election."
          : error.message,
        error.code === "23505" ? 409 : 400
      );
    }
    if (!data) return apiError("Candidacy not found.", 404);

    return NextResponse.json({ candidacy: data });
  } catch (error) {
    console.error("Candidacy update API error:", error);
    return apiError("An unexpected server error occurred.", 500);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const auth = await requireStaffApi("manage candidacies");
    if ("response" in auth) return auth.response;
    const { supabase } = auth;
    const { id } = await params;

    const blocked = await blockIfReferenced(supabase, id, "candidacy", [
      { table: "political_promises", column: "candidacy_id", label: "tracked promise" },
    ]);
    if (blocked) return blocked;

    const { data, error } = await supabase.from("candidacies").delete().eq("id", id).select("id");
    if (error) return deleteFailed("candidacy", error);
    if (!data?.length) return apiError("Candidacy not found.", 404);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Candidacy deletion API error:", error);
    return apiError("An unexpected server error occurred.", 500);
  }
}
