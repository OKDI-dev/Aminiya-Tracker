import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      return NextResponse.json({ error: "You are not authorised to review updates." }, { status: 403 });
    }

    const body = await request.json();
    const decision = String(body.decision ?? "");
    const reviewNotes = String(body.review_notes ?? "").trim() || null;

    if (!["approved", "rejected"].includes(decision)) {
      return NextResponse.json({ error: "Invalid review decision." }, { status: 400 });
    }

    if (decision === "rejected" && (!reviewNotes || reviewNotes.length < 5)) {
      return NextResponse.json({ error: "Provide a rejection reason of at least 5 characters." }, { status: 400 });
    }

    if (reviewNotes && reviewNotes.length > 2000) {
      return NextResponse.json({ error: "Review notes cannot exceed 2,000 characters." }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("review_promise_progress_update", {
      p_update_id: id,
      p_decision: decision,
      p_review_notes: reviewNotes,
    });

    if (error) {
      console.error("Progress update review error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Progress update review API error:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
