import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const transitions: Record<string, string[]> = {
  pending: ["verified", "rejected"],
  verified: ["pending"],
  rejected: ["pending"],
};

export async function PATCH(request: NextRequest) {
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
      .single();

    if (
      profileError ||
      !profile ||
      !["admin", "electoral_reviewer"].includes(profile.role)
    ) {
      return NextResponse.json(
        { error: "You are not authorised to manage electoral sources." },
        { status: 403 }
      );
    }

    const { source_id, status: nextStatus } = await request.json();

    if (
      typeof source_id !== "string" ||
      !["pending", "verified", "rejected"].includes(nextStatus)
    ) {
      return NextResponse.json(
        { error: "Invalid source ID or verification status." },
        { status: 400 }
      );
    }

    const { data: current, error: currentError } = await supabase
      .from("electoral_sources")
      .select("id, verification_status")
      .eq("id", source_id)
      .single();

    if (currentError || !current) {
      return NextResponse.json(
        { error: "Electoral source not found." },
        { status: 404 }
      );
    }

    if (!transitions[current.verification_status]?.includes(nextStatus)) {
      return NextResponse.json(
        {
          error: `Cannot change source status from ${current.verification_status} to ${nextStatus}.`,
        },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("electoral_sources")
      .update({ verification_status: nextStatus })
      .eq("id", source_id);

    if (updateError) {
      console.error("Electoral source status update error:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, status: nextStatus });
  } catch (error) {
    console.error("Electoral source status API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
