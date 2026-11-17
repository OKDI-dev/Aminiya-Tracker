"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type Notice = {
  title: string;
  message: string;
  type: "error" | "success" | "lockout";
};

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!lockoutUntil) return;

    const interval = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((lockoutUntil - Date.now()) / 1000)
      );

      setRemainingSeconds(remaining);

      if (remaining === 0) {
        window.clearInterval(interval);
        setLockoutUntil(null);
        setNotice((current) =>
          current?.type === "lockout"
            ? {
                title: "Lockout ended",
                message: "You can try signing in again now.",
                type: "success",
              }
            : current
        );
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [lockoutUntil]);

  function showError(title: string, message: string) {
    setNotice({ title, message, type: "error" });
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (remainingSeconds > 0 || loading) return;

    setLoading(true);
    setNotice(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = Math.max(
            1,
            Number(response.headers.get("Retry-After")) || 300
          );

          setLockoutUntil(Date.now() + retryAfter * 1000);
          setRemainingSeconds(retryAfter);

          setNotice({
            title: "Login temporarily locked",
            message:
              result.error ||
              "Too many failed sign-in attempts. Please wait before trying again.",
            type: "lockout",
          });
        } else if (response.status === 403) {
          showError("Access denied", result.error);
        } else if (response.status === 401) {
          showError("Sign-in failed", "Invalid email or password.");
        } else {
          showError(
            "Sign-in failed",
            result.error || "Unable to sign in. Please try again."
          );
        }

        return;
      }

      setNotice({
        title: "Welcome back",
        message: "You have signed in successfully.",
        type: "success",
      });

      router.replace("/admin");
      router.refresh();
    } catch {
      showError("Sign-in failed", "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const minutes = Math.floor(remainingSeconds / 60)
    .toString()
    .padStart(2, "0");

  const seconds = (remainingSeconds % 60)
    .toString()
    .padStart(2, "0");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-12">
      {notice && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => {
            if (remainingSeconds === 0) setNotice(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="login-notice-title"
            aria-describedby="login-notice-description"
            className="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                if (remainingSeconds === 0) setNotice(null);
              }}
              disabled={remainingSeconds > 0}
              aria-label="Close notification"
              className="absolute right-3 top-3 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <X size={18} />
            </button>

            <div
              className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
                notice.type === "success"
                  ? "bg-green-100 text-green-600"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {notice.type === "success" ? (
                <CheckCircle2 size={28} />
              ) : (
                <AlertCircle size={28} />
              )}
            </div>

            <h2
              id="login-notice-title"
              className="text-lg font-bold text-gray-900"
            >
              {notice.title}
            </h2>

            <p
              id="login-notice-description"
              className="mt-2 text-sm leading-6 text-gray-600"
            >
              {notice.message}
            </p>

            {notice.type === "lockout" && remainingSeconds > 0 && (
              <div className="mt-5 rounded-xl bg-orange-50 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wider text-orange-700">
                  You can try again in
                </p>

                <p
                  className="mt-2 font-mono text-4xl font-bold tabular-nums tracking-wider text-[#c94f00]"
                  aria-live="off"
                >
                  {minutes}:{seconds}
                </p>

                <p className="mt-2 text-xs text-orange-700">
                  Please wait until the countdown finishes.
                </p>
              </div>
            )}

            {remainingSeconds === 0 && (
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="mt-5 w-full rounded-lg bg-[#c94f00] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#a84300]"
              >
                {notice.type === "success" ? "Continue" : "Okay"}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#c94f00] text-white">
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
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-12 text-sm text-gray-900 outline-none transition focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-200"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || remainingSeconds > 0}
              className="w-full rounded-lg bg-[#c94f00] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#a84300] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Signing in..."
                : remainingSeconds > 0
                  ? `Locked · ${minutes}:${seconds}`
                  : "Sign In"}
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
