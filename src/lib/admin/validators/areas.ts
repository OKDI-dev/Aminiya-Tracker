import type { AdminSupabase, Validation } from "@/lib/admin/api";

const validTypes = [
  "country",
  "state",
  "lga",
  "ward",
  "polling_unit",
  // Constituencies and districts sit directly under a state.
  "senatorial_district",
  "federal_constituency",
  "state_constituency",
] as const;

type AreaType = (typeof validTypes)[number];

const requiredParent: Record<AreaType, AreaType | null> = {
  country: null,
  state: null,
  lga: "state",
  ward: "lga",
  polling_unit: "ward",
  senatorial_district: "state",
  federal_constituency: "state",
  state_constituency: "state",
};

const validStatuses = ["draft", "published", "archived"] as const;

/**
 * Input rules for electoral_areas, shared by create (POST) and edit (PATCH) so
 * the two can never drift apart.
 */
export async function validateArea(
  supabase: AdminSupabase,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  /** On edit: the area being changed, so it isn't reported as its own duplicate. */
  options: { excludeId?: string } = {}
): Promise<Validation> {
  const name =
    typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";

  const areaType = body.area_type as AreaType;
  const parentId =
    typeof body.parent_id === "string" && body.parent_id.trim()
      ? body.parent_id.trim()
      : null;

  const code =
    typeof body.code === "string" && body.code.trim()
      ? body.code.trim()
      : null;

  const publicationStatus = body.publication_status;

  if (!name || name.length > 200) {
    return { error: "Enter an area name between 1 and 200 characters.", status: 400 };
  }

  if (!validTypes.includes(areaType)) {
    return { error: "Select a valid electoral area type.", status: 400 };
  }

  if (!validStatuses.includes(publicationStatus)) {
    return { error: "Select a valid publication status.", status: 400 };
  }

  if (code && code.length > 100) {
    return { error: "Area code must not exceed 100 characters.", status: 400 };
  }

  const expectedParentType = requiredParent[areaType];

  if (expectedParentType && !parentId) {
    return { error: `${areaType} records require a parent ${expectedParentType}.`, status: 400 };
  }

  if (!expectedParentType && parentId) {
    return { error: `${areaType} records cannot have a parent area.`, status: 400 };
  }

  if (parentId) {
    const { data: parent, error: parentError } = await supabase
      .from("electoral_areas")
      .select("id, area_type, publication_status")
      .eq("id", parentId)
      .maybeSingle();

    if (parentError || !parent) {
      return { error: "The selected parent area could not be found or accessed.", status: 400 };
    }

    if (parent.area_type !== expectedParentType) {
      return { error: `The selected parent must be a ${expectedParentType}.`, status: 400 };
    }

    if (parent.publication_status !== "published") {
      return { error: "The parent area must be published before adding a child area.", status: 400 };
    }
  }

  let duplicateQuery = supabase
    .from("electoral_areas")
    .select("id")
    .eq("area_type", areaType)
    .ilike("name", name);

  duplicateQuery = parentId
    ? duplicateQuery.eq("parent_id", parentId)
    : duplicateQuery.is("parent_id", null);

  if (options.excludeId) duplicateQuery = duplicateQuery.neq("id", options.excludeId);

  const { data: duplicate, error: duplicateError } =
    await duplicateQuery.maybeSingle();

  if (duplicateError) {
    console.error("Electoral area duplicate check failed:", duplicateError);
    return { error: "Could not validate the area name.", status: 400 };
  }

  if (duplicate) {
    return { error: "An area with this name and parent already exists.", status: 409 };
  }

  return {
    values: {
      name,
      area_type: areaType,
      parent_id: parentId,
      code,
      publication_status: publicationStatus,
    },
  };
}
