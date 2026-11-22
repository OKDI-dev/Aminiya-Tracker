import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validatePromiseUpdate } from "@/lib/admin/validators/promise-updates";

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

    const { data: profile } = await supabase
      .from("app_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || !["admin", "electoral_reviewer"].includes(profile.role)) {
      return NextResponse.json(
        { error: "You are not authorised to submit progress updates." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const validation = await validatePromiseUpdate(supabase, body);
    if ("error" in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { data, error } = await supabase
      .from("promise_progress_updates")
      .insert({ ...validation.values, review_status: "pending", created_by: user.id })
      .select("id")
      .single();

    if (error) {
      console.error("Progress update submission error:", error);
      return NextResponse.json(
        { error: "Unable to submit this progress update." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error("Progress update API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
