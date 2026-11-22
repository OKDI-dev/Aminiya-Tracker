import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateElection } from "@/lib/admin/validators/elections";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("app_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile || !["admin", "electoral_reviewer"].includes(profile.role)) {
      return NextResponse.json({ error: "You are not authorised to manage elections." }, { status: 403 });
    }

    const body = await request.json();

    const validation = await validateElection(supabase, body);
    if ("error" in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { data, error } = await supabase
      .from("elections")
      .insert({ ...validation.values })
      .select("id, name")
      .single();

    if (error) {
      console.error("Election creation failed:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ election: data }, { status: 201 });
  } catch (error) {
    console.error("Election API error:", error);
    return NextResponse.json({ error: "An unexpected server error occurred." }, { status: 500 });
  }
}
