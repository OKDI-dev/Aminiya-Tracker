import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: "Invalid evidence ID." }, { status: 400 });
    }

    const body = await request.json();

    if (typeof body.publicly_visible !== "boolean") {
      return NextResponse.json(
        { error: "publicly_visible must be true or false." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("app_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || !["admin", "electoral_reviewer"].includes(profile.role)) {
      return NextResponse.json({ error: "Electoral staff access required." }, { status: 403 });
    }

    const { data, error } = await supabase.rpc(
      "set_promise_evidence_publication",
      {
        p_evidence_id: id,
        p_publicly_visible: body.publicly_visible,
      }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Evidence publication error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
