import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateArea } from "@/lib/admin/validators/areas";

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

    const validation = await validateArea(supabase, body);
    if ("error" in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { data: area, error: insertError } = await supabase
      .from("electoral_areas")
      .insert({ ...validation.values })
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
