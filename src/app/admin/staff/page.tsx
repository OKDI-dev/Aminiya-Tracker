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
      <main className="min-h-screen bg-paper p-6">
        <div className="mx-auto max-w-4xl rounded-xl border border-red-200 bg-paper-raised p-6">
          <h1 className="text-xl font-bold text-ink">
            Unable to load staff management
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Check the database permissions and try again.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-line-soft bg-paper-raised">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal text-ink">
              <ShieldCheck size={23} />
            </div>
            <div>
              <h1 className="font-bold text-ink">Aminiya Tracker</h1>
              <p className="text-xs text-ink-subtle">Staff Management</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8">
        <div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-ink">
              ADMINISTRATION
            </p>
            <h2 className="mt-2 text-3xl font-bold text-ink">
              Staff management
            </h2>
            <p className="mt-2 max-w-2xl text-ink-muted">
              View authorised personnel, manage access roles and review the
              history of role changes.
            </p>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-line-soft bg-paper-raised p-5">
            <div className="flex items-center gap-3 text-ink-subtle">
              <Users size={19} />
              <span className="text-sm">Authorised staff</span>
            </div>
            <p className="mt-3 text-3xl font-bold text-ink">
              {profiles.length}
            </p>
          </div>

          <div className="rounded-xl border border-line-soft bg-paper-raised p-5">
            <div className="flex items-center gap-3 text-ink-subtle">
              <History size={19} />
              <span className="text-sm">Recorded role changes</span>
            </div>
            <p className="mt-3 text-3xl font-bold text-ink">
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
