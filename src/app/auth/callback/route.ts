import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");

  const supabase = await createClient();

  let error = null;

  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  } else if (tokenHash) {
    const result = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "invite",
    });
    error = result.error;
  } else {
    error = new Error("Invitation verification details are missing.");
  }

  if (error) {
    console.error("Invitation callback failed:", error.message);
    return NextResponse.redirect(
      new URL("/admin/login?error=invalid_invitation", request.url)
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/admin/login?error=invalid_invitation", request.url)
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
    await supabase.auth.signOut();

    return NextResponse.redirect(
      new URL("/admin/login?error=unauthorized", request.url)
    );
  }

  return NextResponse.redirect(
    new URL("/auth/set-password", request.url)
  );
}
