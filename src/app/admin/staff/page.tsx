import { ShieldCheck, Users, History } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import StaffManagement from "@/components/admin/staff-management";
import LogoutButton from "@/components/admin-logout";

export const instant = false;

export default async function StaffPage() {
  const { user } = await requireAdmin();
  const supabase = await createClient();

  const { data: staff, error: staffError } = await supabase
    .from("app_profiles")
    .select("user_id, display_name, role, created_at")
    .in("role", ["admin", "electoral_reviewer"])
    .order("created_at", { ascending: true });

  const { data: history, error: historyError } = await supabase
    .from("app_profile_role_changes")
    .select("id, target_user_id, changed_by, previous_role, new_role, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (staffError || historyError) {
    console.error("Staff management query failed:", staffError, historyError);
  }

  const profiles = staff ?? [];
  const changes = history ?? [];

  if (staffError || historyError) {
    return (
      <main className="min-h-screen bg-[#f7f8f5] p-6">
        <div className="mx-auto max-w-4xl rounded-xl border border-red-200 bg-white p-6">
          <h1 className="text-xl font-bold text-[#171717]">
            Unable to load staff management
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Check the database permissions and try again.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff6600] text-white">
              <ShieldCheck size={23} />
            </div>
            <div>
              <h1 className="font-bold text-[#171717]">Aminiya Tracker</h1>
              <p className="text-xs text-gray-500">Staff Management</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8">
        <div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-[#ff6600]">
              ADMINISTRATION
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#171717]">
              Staff management
            </h2>
            <p className="mt-2 max-w-2xl text-gray-600">
              View authorised personnel, manage access roles and review the
              history of role changes.
            </p>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3 text-gray-500">
              <Users size={19} />
              <span className="text-sm">Authorised staff</span>
            </div>
            <p className="mt-3 text-3xl font-bold text-[#171717]">
              {profiles.length}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3 text-gray-500">
              <History size={19} />
              <span className="text-sm">Recorded role changes</span>
            </div>
            <p className="mt-3 text-3xl font-bold text-[#171717]">
              {changes.length}
            </p>
          </div>
        </section>

        <StaffManagement
          staff={profiles}
          history={changes}
          currentUserId={user.id}
        />
      </div>
    </main>
  );
}
