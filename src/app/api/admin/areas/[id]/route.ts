import { NextResponse } from "next/server";
import { apiError, blockIfReferenced, deleteFailed, requireStaffApi } from "@/lib/admin/api";
import { validateArea } from "@/lib/admin/validators/areas";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const auth = await requireStaffApi("manage electoral areas");
    if ("response" in auth) return auth.response;
    const { supabase } = auth;
    const { id } = await params;
    const body = await request.json();

    const { data: existing, error: existingError } = await supabase
      .from("electoral_areas")
      .select("id, area_type")
      .eq("id", id)
      .maybeSingle();
    if (existingError) return apiError("Could not load this electoral area.", 500);
    if (!existing) return apiError("Electoral area not found.", 404);

    if (body.parent_id === id) return apiError("An area cannot be its own parent.", 400);

    // Children were filed under this area's current type; changing it would
    // leave them under the wrong kind of parent.
    if (body.area_type !== existing.area_type) {
      const { count, error } = await supabase
        .from("electoral_areas")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", id);
      if (error) return apiError("Could not check this area's child areas.", 500);
      if ((count ?? 0) > 0) {
        return apiError(
          `This area has ${count} child area${count === 1 ? "" : "s"}, so its type can't change. Move or delete them first.`,
          409
        );
      }
    }

    const validation = await validateArea(supabase, body, { excludeId: id });
    if ("error" in validation) return apiError(validation.error, validation.status);

    const { data, error } = await supabase
      .from("electoral_areas")
      .update(validation.values)
      .eq("id", id)
      .select("id, name, area_type, parent_id, code, publication_status")
      .maybeSingle();

    if (error) {
      console.error("Electoral area update failed:", error);
      return apiError(error.message, 400);
    }
    if (!data) return apiError("Electoral area not found.", 404);

    return NextResponse.json({ area: data });
  } catch (error) {
    console.error("Electoral area update API error:", error);
    return apiError("An unexpected server error occurred.", 500);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const auth = await requireStaffApi("manage electoral areas");
    if ("response" in auth) return auth.response;
    const { supabase } = auth;
    const { id } = await params;

    const blocked = await blockIfReferenced(supabase, id, "area", [
      { table: "electoral_areas", column: "parent_id", label: "child area" },
      { table: "candidacies", column: "electoral_area_id", label: "candidacy" },
      { table: "election_results", column: "electoral_area_id", label: "election result" },
      { table: "election_incidents", column: "electoral_area_id", label: "incident report" },
    ]);
    if (blocked) return blocked;

    const { data, error } = await supabase.from("electoral_areas").delete().eq("id", id).select("id");
    if (error) return deleteFailed("area", error);
    if (!data?.length) return apiError("Electoral area not found.", 404);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Electoral area deletion API error:", error);
    return apiError("An unexpected server error occurred.", 500);
  }
}
