"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notify } from "@/components/notifications/notify";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const supabase = createClient();

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError || !data.user) {
        notify.error("Sign-in failed", "Invalid email or password.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("app_profiles")
        .select("user_id, display_name, role")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (
        profileError ||
        !profile ||
        !["admin", "electoral_reviewer"].includes(profile.role)
      ) {
        await supabase.auth.signOut();
        notify.error(
          "Access denied",
          "Your account does not have permission to access the staff dashboard."
        );
        return;
      }

      notify.success("Welcome back", "You have signed in successfully.");
      router.replace("/admin");
      router.refresh();
    } catch {
      notify.error("Sign-in failed", "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff6600] text-white">
            <ShieldCheck size={30} />
          </div>

          <h1 className="text-2xl font-bold text-[#171717]">
            Aminiya Tracker
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Electoral Administration Portal
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[#171717]">
              Staff Sign In
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Sign in with your authorised staff account.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Email address
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="staff@example.com"
                  className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-sm text-gray-900 outline-none transition focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-sm text-gray-900 outline-none transition focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#ff6600] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e85d00] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
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
