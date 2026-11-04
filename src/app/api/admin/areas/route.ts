import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const validTypes = [
  "country",
  "state",
  "lga",
  "ward",
  "polling_unit",
] as const;

type AreaType = (typeof validTypes)[number];

const requiredParent: Record<AreaType, AreaType | null> = {
  country: null,
  state: null,
  lga: "state",
  ward: "lga",
  polling_unit: "ward",
};

const validStatuses = ["draft", "published", "archived"] as const;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("app_profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      !["admin", "electoral_reviewer"].includes(profile.role)
    ) {
      return NextResponse.json(
        { error: "You are not authorised to manage electoral areas." },
        { status: 403 }
      );
    }

    const body = await request.json();

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
      return NextResponse.json(
        { error: "Enter an area name between 1 and 200 characters." },
        { status: 400 }
      );
    }

    if (!validTypes.includes(areaType)) {
      return NextResponse.json(
        { error: "Select a valid electoral area type." },
        { status: 400 }
      );
    }

    if (!validStatuses.includes(publicationStatus)) {
      return NextResponse.json(
        { error: "Select a valid publication status." },
        { status: 400 }
      );
    }

    if (code && code.length > 100) {
      return NextResponse.json(
        { error: "Area code must not exceed 100 characters." },
        { status: 400 }
      );
    }

    const expectedParentType = requiredParent[areaType];

    if (expectedParentType && !parentId) {
      return NextResponse.json(
        { error: `${areaType} records require a parent ${expectedParentType}.` },
        { status: 400 }
      );
    }

    if (!expectedParentType && parentId) {
      return NextResponse.json(
        { error: `${areaType} records cannot have a parent area.` },
        { status: 400 }
      );
    }

    if (parentId) {
      const { data: parent, error: parentError } = await supabase
        .from("electoral_areas")
        .select("id, area_type, publication_status")
        .eq("id", parentId)
        .maybeSingle();

      if (parentError || !parent) {
        return NextResponse.json(
          { error: "The selected parent area could not be found or accessed." },
          { status: 400 }
        );
      }

      if (parent.area_type !== expectedParentType) {
        return NextResponse.json(
          { error: `The selected parent must be a ${expectedParentType}.` },
          { status: 400 }
        );
      }

      if (parent.publication_status !== "published") {
        return NextResponse.json(
          { error: "The parent area must be published before adding a child area." },
          { status: 400 }
        );
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

    const { data: duplicate, error: duplicateError } =
      await duplicateQuery.maybeSingle();

    if (duplicateError) {
      console.error("Electoral area duplicate check failed:", duplicateError);
      return NextResponse.json(
        { error: "Could not validate the area name." },
        { status: 400 }
      );
    }

    if (duplicate) {
      return NextResponse.json(
        { error: "An area with this name and parent already exists." },
        { status: 409 }
      );
    }

    const { data: area, error: insertError } = await supabase
      .from("electoral_areas")
      .insert({
        name,
        area_type: areaType,
        parent_id: parentId,
        code,
        publication_status: publicationStatus,
      })
      .select("id, name, area_type, parent_id, code, publication_status")
      .single();

    if (insertError) {
      console.error("Electoral area insert failed:", insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, area }, { status: 201 });
  } catch (error) {
    console.error("Electoral area API error:", error);

    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
