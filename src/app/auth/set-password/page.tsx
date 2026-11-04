"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notify } from "@/components/notifications/notify";

export default function SetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    async function verifyStaffSession() {
      const supabase = createClient();

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace("/admin/login");
        return;
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
        router.replace("/admin/login?error=unauthorized");
        return;
      }

      if (active) {
        setAuthorized(true);
        setChecking(false);
      }
    }

    verifyStaffSession();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 12) {
      notify.error("Password too short", "Use at least 12 characters.");
      return;
    }

    if (password !== confirmPassword) {
      notify.error("Passwords do not match.");
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        notify.error("Password setup failed", error.message);
        return;
      }

      notify.success(
        "Account activated",
        "Your password has been set successfully."
      );

      router.replace("/admin");
      router.refresh();
    } catch {
      notify.error("Unable to set your password. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (checking || !authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8f5] px-4">
        <p className="text-sm text-gray-500">
          {checking ? "Verifying your staff account..." : "Redirecting..."}
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f5] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff6600] text-white">
            <ShieldCheck size={30} />
          </div>

          <h1 className="text-2xl font-bold text-[#171717]">
            Aminiya Tracker
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Staff account activation
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-[#171717]">
            Set your password
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Create a secure password to complete your staff account setup.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="new-password"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                New password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 12 characters"
                  className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-sm text-gray-900 outline-none transition focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Confirm password
              </label>

              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Enter your password again"
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm text-gray-900 outline-none transition focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <p className="text-xs text-gray-500">
              Use at least 12 characters. A unique password is recommended.
            </p>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-[#ff6600] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e85d00] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Setting password..." : "Activate account"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Restricted access. Authorised electoral personnel only.
        </p>
      </div>
    </main>
  );
}
