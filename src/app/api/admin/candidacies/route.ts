import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateCandidacy } from "@/lib/admin/validators/candidacies";

export async function POST(request: Request) {
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
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      !["admin", "electoral_reviewer"].includes(profile.role)
    ) {
      return NextResponse.json(
        { error: "You are not authorised to manage candidacies." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const validation = await validateCandidacy(supabase, body);
    if ("error" in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { data, error } = await supabase
      .from("candidacies")
      .insert({ ...validation.values })
      .select("id, election_id, candidate_id, office_title, publication_status")
      .single();

    if (error) {
      console.error("Candidacy creation failed:", error);

      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This candidate already has a candidacy for this election, office and electoral area." },
          { status: 409 }
        );
      }

      if (error.code === "23503") {
        return NextResponse.json(
          { error: "One of the selected election, candidate, party or electoral area records no longer exists." },
          { status: 400 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ candidacy: data }, { status: 201 });
  } catch (error) {
    console.error("Candidacies API error:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
