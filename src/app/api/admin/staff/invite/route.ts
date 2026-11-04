import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { adminSupabase } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const current = await getCurrentProfile();

    if (!current || current.profile.role !== "admin") {
      return NextResponse.json(
        { error: "Only administrators can invite staff." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const displayName =
      typeof body.displayName === "string" ? body.displayName.trim() : "";

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    const role = body.role;

    if (displayName.length < 2 || displayName.length > 80) {
      return NextResponse.json(
        { error: "Name must be between 2 and 80 characters." },
        { status: 400 }
      );
    }

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (!["admin", "electoral_reviewer"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid staff role." },
        { status: 400 }
      );
    }

    const redirectTo = new URL("/auth/callback", request.url).toString();

    const { data, error } =
      await adminSupabase.auth.admin.inviteUserByEmail(email, {
        data: { display_name: displayName },
        redirectTo,
      });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || "Unable to create invitation." },
        { status: 400 }
      );
    }

    const invitedUser = data.user;

    const { error: profileError } = await adminSupabase
      .from("app_profiles")
      .insert({
        user_id: invitedUser.id,
        display_name: displayName,
        role,
      });

    if (profileError) {
      await adminSupabase.auth.admin.deleteUser(invitedUser.id);

      return NextResponse.json(
        { error: "Invitation profile could not be created. The invitation was rolled back." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}.`,
    });
  } catch (error) {
    console.error("Staff invitation error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while inviting staff." },
      { status: 500 }
    );
  }
}
