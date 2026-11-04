import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const tableStatuses = {
  elections: ["draft", "published", "archived"],
  candidates: ["draft", "published", "archived"],
  political_parties: ["draft", "published", "archived"],
  electoral_areas: ["draft", "published", "archived"],
  candidacies: ["draft", "published", "archived"],
} as const;

type ManagedTable = keyof typeof tableStatuses;
type PublicationStatus = "draft" | "published" | "archived";

const allowedTransitions: Record<PublicationStatus, PublicationStatus[]> = {
  draft: ["published"],
  published: ["draft", "archived"],
  archived: ["draft"],
};

export async function PATCH(request: Request) {
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
        { error: "You are not authorised to manage electoral records." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const table = body.table as ManagedTable;
    const id = typeof body.id === "string" ? body.id : "";
    const nextStatus = body.status as PublicationStatus;

    if (!(table in tableStatuses)) {
      return NextResponse.json(
        { error: "Invalid electoral data type." },
        { status: 400 }
      );
    }

    if (!id || id.length > 100) {
      return NextResponse.json(
        { error: "A valid record ID is required." },
        { status: 400 }
      );
    }

    if (
      !tableStatuses[table].includes(
        nextStatus as (typeof tableStatuses)[typeof table][number]
      )
    ) {
      return NextResponse.json(
        { error: "Invalid publication status." },
        { status: 400 }
      );
    }

    const { data: existing, error: lookupError } = await supabase
      .from(table)
      .select("id, publication_status")
      .eq("id", id)
      .maybeSingle();

    if (lookupError) {
      console.error("Status lookup failed:", lookupError);
      return NextResponse.json(
        { error: lookupError.message },
        { status: 400 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: "Record not found or access denied." },
        { status: 404 }
      );
    }

    const currentStatus = existing.publication_status as PublicationStatus;

    if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
      return NextResponse.json(
        {
          error: `The status cannot be changed from ${currentStatus} to ${nextStatus}.`,
        },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from(table)
      .update({ publication_status: nextStatus })
      .eq("id", id);

    if (updateError) {
      console.error("Status update failed:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      status: nextStatus,
    });
  } catch (error) {
    console.error("Electoral status API error:", error);

    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
