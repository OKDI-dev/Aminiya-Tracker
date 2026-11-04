"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, UserCog, History, Loader2, Users, Mail, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notify } from "@/components/notifications/notify";

type StaffProfile = {
  user_id: string;
  display_name: string | null;
  role: string;
  created_at: string;
};

type RoleChange = {
  id: string;
  target_user_id: string;
  changed_by: string;
  previous_role: string;
  new_role: string;
  reason: string;
  created_at: string;
};

type Props = {
  staff: StaffProfile[];
  history: RoleChange[];
  currentUserId: string;
};

const roleOptions = [
  { value: "admin", label: "Administrator" },
  { value: "electoral_reviewer", label: "Electoral Reviewer" },
  { value: "viewer", label: "Viewer" },
];

function formatRole(role: string) {
  return role.replaceAll("_", " ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function StaffManagement({
  staff,
  history,
  currentUserId,
}: Props) {
  const router = useRouter();

  const [targetUserId, setTargetUserId] = useState("");
  const [newRole, setNewRole] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("electoral_reviewer");
  const [inviting, setInviting] = useState(false);


  async function handleInviteStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!inviteName.trim() || !inviteEmail.trim() || !inviteRole) {
      notify.error("Complete all invitation fields.");
      return;
    }

    setInviting(true);

    try {
      const response = await fetch("/api/admin/staff/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: inviteName.trim(),
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        notify.error("Invitation failed", result.error || "Unable to send invitation.");
        return;
      }

      notify.success(result.message || "Staff invitation sent successfully.");
      setInviteName("");
      setInviteEmail("");
      setInviteRole("electoral_reviewer");
      router.refresh();
    } catch {
      notify.error("An unexpected error occurred while sending the invitation.");
    } finally {
      setInviting(false);
    }
  }

  const selectedStaff = staff.find(
    (person) => person.user_id === targetUserId
  );

  async function handleRoleChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!targetUserId || !newRole || !reason.trim()) {
      notify.error("Complete all fields before continuing.");
      return;
    }

    if (targetUserId === currentUserId) {
      notify.error("You cannot change your own role from this page.");
      return;
    }

    if (reason.trim().length < 5) {
      notify.error("Please provide a reason of at least 5 characters.");
      return;
    }

    if (reason.trim().length > 500) {
      notify.error("The reason cannot exceed 500 characters.");
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.rpc("manage_app_profile_role", {
        p_user_id: targetUserId,
        p_new_role: newRole,
        p_reason: reason.trim(),
      });

      if (error) {
        notify.error("Role change failed", error.message);
        return;
      }

      notify.success("Staff role updated successfully.");

      setTargetUserId("");
      setNewRole("");
      setReason("");

      router.refresh();
    } catch {
      notify.error("An unexpected error occurred while updating the role.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Mail size={20} className="text-[#ff6600]" />
          <h3 className="font-semibold text-[#171717]">Invite new staff</h3>
        </div>

        <p className="mt-2 text-sm text-gray-500">
          Invite an authorised team member by email and assign their platform role.
          They will receive an email to access their account.
        </p>

        <form onSubmit={handleInviteStaff} className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="invite-name" className="mb-2 block text-sm font-medium text-gray-700">
              Full name
            </label>
            <input
              id="invite-name"
              type="text"
              value={inviteName}
              onChange={(event) => setInviteName(event.target.value)}
              minLength={2}
              maxLength={80}
              required
              placeholder="Enter staff member's name"
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div>
            <label htmlFor="invite-email" className="mb-2 block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              maxLength={254}
              required
              placeholder="name@example.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div>
            <label htmlFor="invite-role" className="mb-2 block text-sm font-medium text-gray-700">
              Assign role
            </label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
            >
              <option value="electoral_reviewer">Electoral Reviewer</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={inviting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#ff6600] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e85d00] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {inviting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Sending invitation...
                </>
              ) : (
                <>
                  <Send size={17} />
                  Send invitation
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Users size={19} className="text-[#ff6600]" />
            <h3 className="font-semibold text-[#171717]">
              Authorised personnel
            </h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Administrators and electoral reviewers with platform access.
          </p>
        </div>

        {staff.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">
            No authorised staff profiles were found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Staff member</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Account created</th>
                  <th className="px-5 py-3 font-semibold">User ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staff.map((person) => (
                  <tr key={person.user_id}>
                    <td className="px-5 py-4 font-medium text-[#171717]">
                      {person.display_name || "Unnamed staff member"}
                      {person.user_id === currentUserId && (
                        <span className="ml-2 text-xs text-gray-400">
                          (You)
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium capitalize text-[#e85d00]">
                        {formatRole(person.role)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {formatDate(person.created_at)}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-500">
                      {person.user_id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <UserCog size={20} className="text-[#ff6600]" />
          <h3 className="font-semibold text-[#171717]">
            Change staff role
          </h3>
        </div>

        <p className="mt-2 text-sm text-gray-500">
          Role changes are restricted to administrators and are recorded in
          the audit history.
        </p>

        <form onSubmit={handleRoleChange} className="mt-6 max-w-2xl space-y-5">
          <div>
            <label
              htmlFor="staff-member"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Select staff member
            </label>
            <select
              id="staff-member"
              value={targetUserId}
              onChange={(event) => {
                setTargetUserId(event.target.value);
                setNewRole("");
              }}
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
            >
              <option value="">Choose a staff member</option>
              {staff
                .filter((person) => person.user_id !== currentUserId)
                .map((person) => (
                  <option key={person.user_id} value={person.user_id}>
                    {person.display_name || person.user_id} —{" "}
                    {formatRole(person.role)}
                  </option>
                ))}
            </select>
          </div>

          {selectedStaff && (
            <div>
              <label
                htmlFor="new-role"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                New role
              </label>
              <select
                id="new-role"
                value={newRole}
                onChange={(event) => setNewRole(event.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
              >
                <option value="">Select a new role</option>
                {roleOptions
                  .filter((role) => role.value !== selectedStaff.role)
                  .map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="change-reason"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Reason for change
            </label>
            <textarea
              id="change-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
              minLength={5}
              maxLength={500}
              rows={3}
              placeholder="Explain why this role change is necessary..."
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
            />
            <p className="mt-1 text-xs text-gray-400">
              5–500 characters. This reason will be saved in the audit history.
            </p>
          </div>

          {selectedStaff && newRole && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-gray-700">
              You are changing{" "}
              <strong>
                {selectedStaff.display_name || "this staff member"}
              </strong>{" "}
              from <strong>{formatRole(selectedStaff.role)}</strong> to{" "}
              <strong>{formatRole(newRole)}</strong>.
              <p className="mt-2 text-xs text-gray-600">
                The database will reject this change if it would remove the
                last administrator.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !selectedStaff || !newRole || !reason.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff6600] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e85d00] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Updating role...
              </>
            ) : (
              <>
                <Shield size={17} />
                Update staff role
              </>
            )}
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <History size={19} className="text-[#ff6600]" />
            <h3 className="font-semibold text-[#171717]">
              Role-change history
            </h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            The latest 50 recorded staff role changes.
          </p>
        </div>

        {history.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">
            No role changes have been recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {history.map((item) => {
              const target = staff.find(
                (person) => person.user_id === item.target_user_id
              );
              const actor = staff.find(
                (person) => person.user_id === item.changed_by
              );

              return (
                <div key={item.id} className="space-y-2 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#171717]">
                      {target?.display_name || item.target_user_id}
                    </p>
                    <span className="text-xs text-gray-500">
                      {formatDate(item.created_at)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600">
                    <span className="capitalize">
                      {formatRole(item.previous_role)}
                    </span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className="font-semibold capitalize text-[#e85d00]">
                      {formatRole(item.new_role)}
                    </span>
                  </p>

                  <p className="text-sm text-gray-600">{item.reason}</p>

                  <p className="text-xs text-gray-400">
                    Changed by: {actor?.display_name || item.changed_by}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
