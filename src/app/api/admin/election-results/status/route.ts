import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const transitions: Record<string, string[]> = {
  draft: ["verified", "rejected"],
  verified: ["published", "rejected", "draft"],
  published: ["verified"],
  rejected: ["draft"],
};

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("app_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile || !["admin", "electoral_reviewer"].includes(profile.role)) {
      return NextResponse.json({ error: "You are not authorised to manage election results." }, { status: 403 });
    }

    const { result_id, status: nextStatus } = await request.json();

    if (!result_id || !["draft", "verified", "published", "rejected"].includes(nextStatus)) {
      return NextResponse.json({ error: "Invalid result ID or status." }, { status: 400 });
    }

    const { data: current, error: currentError } = await supabase
      .from("election_results")
      .select("id, publication_status, source_id")
      .eq("id", result_id)
      .single();

    if (currentError || !current) {
      return NextResponse.json({ error: "Election result not found." }, { status: 404 });
    }

    if (!transitions[current.publication_status]?.includes(nextStatus)) {
      return NextResponse.json(
        { error: `The status cannot be changed from ${current.publication_status} to ${nextStatus}.` },
        { status: 400 }
      );
    }

    if (nextStatus === "verified" || nextStatus === "published") {
      if (!current.source_id) {
        return NextResponse.json({ error: "Attach a source before verifying or publishing this result." }, { status: 400 });
      }

      const { data: source, error: sourceError } = await supabase
        .from("electoral_sources")
        .select("verification_status")
        .eq("id", current.source_id)
        .single();

      if (sourceError || !source || source.verification_status !== "verified") {
        return NextResponse.json({ error: "The supporting electoral source must be verified first." }, { status: 400 });
      }
    }

    const { error: updateError } = await supabase
      .from("election_results")
      .update({ publication_status: nextStatus })
      .eq("id", result_id);

    if (updateError) {
      console.error("Election result status update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, status: nextStatus });
  } catch (error) {
    console.error("Election result status API error:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
