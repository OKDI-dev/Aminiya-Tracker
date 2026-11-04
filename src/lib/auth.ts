import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type StaffRole = "admin" | "electoral_reviewer";

export async function getCurrentProfile() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("app_profiles")
    .select("user_id, display_name, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return null;
  }

  return { user, profile };
}

export async function requireElectoralStaff() {
  const result = await getCurrentProfile();

  if (!result) {
    redirect("/admin/login");
  }

  const allowedRoles: StaffRole[] = ["admin", "electoral_reviewer"];

  if (!allowedRoles.includes(result.profile.role as StaffRole)) {
    redirect("/admin/login?error=unauthorized");
  }

  return result;
}

export async function requireAdmin() {
  const result = await getCurrentProfile();

  if (!result) {
    redirect("/admin/login");
  }

  if (result.profile.role !== "admin") {
    redirect("/admin/login?error=unauthorized");
  }

  return result;
}
