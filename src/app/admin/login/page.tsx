"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { SubmitButton, shake, type ButtonPhase } from "@/components/ui/form-feedback";
import { springs } from "@/lib/motion";

const LOCKOUT_STORAGE_KEY = "aminiya:admin-login-locked-until";

type LoginError = { title: string; message: string };

function readStoredLockout(): number | null {
  try {
    const stored = Number(window.sessionStorage.getItem(LOCKOUT_STORAGE_KEY));
    return Number.isFinite(stored) && stored > Date.now() ? stored : null;
  } catch {
    return null;
  }
}

function storeLockout(until: number | null) {
  try {
    if (until) window.sessionStorage.setItem(LOCKOUT_STORAGE_KEY, String(until));
    else window.sessionStorage.removeItem(LOCKOUT_STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode); the server still enforces the lock.
  }
}

export default function AdminLoginPage() {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState<ButtonPhase>("idle");
  const [error, setError] = useState<LoginError | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Restore a lock that started before a reload (client-only storage).
  useEffect(() => {
    const stored = readStoredLockout();
    if (!stored) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLockoutUntil(stored);
    setRemainingSeconds(Math.ceil((stored - Date.now()) / 1000));
  }, []);

  useEffect(() => {
    if (!lockoutUntil) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setRemainingSeconds(remaining);

      if (remaining === 0) {
        window.clearInterval(interval);
        setLockoutUntil(null);
        storeLockout(null);
        setAttemptsRemaining(null);
        setError(null);
        emailRef.current?.focus();
      }
    };

    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [lockoutUntil]);

  const locked = remainingSeconds > 0;
  const busy = phase !== "idle";

  function fail(next: LoginError) {
    setError(next);
    shake(cardRef.current);
  }

  function startLockout(seconds: number) {
    const until = Date.now() + seconds * 1000;
    setLockoutUntil(until);
    setRemainingSeconds(seconds);
    storeLockout(until);
    setError(null);
    setAttemptsRemaining(null);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked || busy) return;

    setPhase("pending");
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        attemptsRemaining?: number;
        retryAfter?: number;
      };

      if (!response.ok) {
        setPhase("idle");

        if (response.status === 429) {
          const retryAfter = Math.max(
            1,
            Number(result.retryAfter) || Number(response.headers.get("Retry-After")) || 300
          );
          startLockout(retryAfter);
          shake(cardRef.current);
        } else if (response.status === 401) {
          setAttemptsRemaining(
            typeof result.attemptsRemaining === "number" ? result.attemptsRemaining : null
          );
          fail({ title: "Incorrect email or password", message: "Check both and try again." });
          setPassword("");
          passwordRef.current?.focus();
        } else if (response.status === 403) {
          fail({
            title: "This account isn't staff",
            message:
              result.error ||
              "Your account does not have permission to access the staff dashboard.",
          });
        } else {
          fail({
            title: "Couldn't sign in",
            message: result.error || "Unable to sign in. Please try again.",
          });
        }
        return;
      }

      setAttemptsRemaining(null);
      storeLockout(null);
      setPhase("success");
      router.replace("/admin");
      router.refresh();
    } catch {
      setPhase("idle");
      fail({
        title: "No connection",
        message: "We couldn't reach the server. Check your connection and try again.",
      });
    }
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const showAttemptsWarning =
    !locked && attemptsRemaining !== null && attemptsRemaining <= 3;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-12">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springs.default}
          className="mb-8 text-center"
        >
          <motion.div
            initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ ...springs.sheet, delay: 0.05 }}
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#c94f00] text-white shadow-lg shadow-orange-900/20"
          >
            <ShieldCheck size={30} />
          </motion.div>

          <h1 className="text-2xl font-bold text-[#171717]">Aminiya Tracker</h1>
          <p className="mt-2 text-sm text-gray-600">Electoral Administration Portal</p>
        </motion.div>

        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springs.default, delay: 0.06 }}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[#171717]">Staff Sign In</h2>
            <p className="mt-1 text-sm text-gray-500">
              Sign in with your authorised staff account.
            </p>
          </div>

          {/* Result of the last attempt, shown where the user is looking. */}
          <div aria-live="polite">
            <AnimatePresence initial={false} mode="popLayout">
              {locked ? (
                <motion.div
                  key="locked"
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0, transition: springs.exit }}
                  transition={springs.default}
                  className="overflow-hidden"
                >
                  <div className="mb-5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-4">
                    <div className="flex items-start gap-3">
                      <Timer size={20} className="mt-0.5 shrink-0 text-[#a84300]" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#7a3100]">
                          Sign-in is locked for a few minutes
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#8a3a00]">
                          Too many failed attempts from this connection. You can try again in:
                        </p>
                      </div>
                    </div>
                    <p
                      className="mt-3 text-center font-mono text-4xl font-bold tabular-nums text-[#a84300]"
                      aria-label={`${minutes} minutes ${seconds} seconds`}
                    >
                      <NumberFlowGroup>
                        <NumberFlow value={minutes} format={{ minimumIntegerDigits: 2 }} trend={-1} />
                        <span aria-hidden="true">:</span>
                        <NumberFlow
                          value={seconds}
                          format={{ minimumIntegerDigits: 2 }}
                          trend={-1}
                          digits={{ 1: { max: 5 } }}
                        />
                      </NumberFlowGroup>
                    </p>
                  </div>
                </motion.div>
              ) : error ? (
                <motion.div
                  key={`error-${error.title}`}
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0, transition: springs.exit }}
                  transition={springs.snappy}
                  className="overflow-hidden"
                >
                  <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-red-800">{error.title}</p>
                      <p className="mt-0.5 text-xs leading-5 text-red-700">{error.message}</p>
                      {showAttemptsWarning ? (
                        <p className="mt-1.5 text-xs font-semibold text-red-800">
                          {attemptsRemaining === 1
                            ? "1 attempt left before sign-in locks for 5 minutes."
                            : `${attemptsRemaining} attempts left before sign-in locks for 5 minutes.`}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <form onSubmit={handleLogin}>
            <fieldset disabled={locked || busy} className="space-y-5 disabled:opacity-70">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
                    aria-hidden="true"
                  />
                  <input
                    ref={emailRef}
                    id="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="staff@example.com"
                    className="w-full rounded-lg border border-gray-300 py-3 pr-3 pl-10 text-sm text-gray-900 outline-none transition focus:border-[#c94f00] focus:ring-2 focus:ring-orange-100 disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
                    aria-hidden="true"
                  />
                  <input
                    ref={passwordRef}
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Enter your password"
                    aria-invalid={error?.title === "Incorrect email or password" || undefined}
                    className="w-full rounded-lg border border-gray-300 py-3 pr-12 pl-10 text-sm text-gray-900 outline-none transition focus:border-[#c94f00] focus:ring-2 focus:ring-orange-100 disabled:bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-gray-400 transition hover:text-gray-700 focus:ring-2 focus:ring-orange-200 focus:outline-none"
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={showPassword ? "hide" : "show"}
                        initial={{ opacity: 0, rotate: -45, scale: 0.6 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 45, scale: 0.6, transition: springs.exit }}
                        transition={springs.snappy}
                        className="block"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </motion.span>
                    </AnimatePresence>
                  </button>
                </div>
              </div>

              <SubmitButton
                phase={phase}
                disabled={locked}
                label={locked ? "Locked" : "Sign in"}
                pendingLabel="Signing in…"
                successLabel="Signed in"
                className="inline-flex w-full items-center justify-center rounded-lg bg-[#c94f00] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#a84300] disabled:cursor-not-allowed disabled:opacity-60 data-[phase=success]:bg-green-700 data-[phase=success]:opacity-100"
              />
            </fieldset>
          </form>
        </motion.div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Restricted access. Authorised electoral personnel only.
        </p>
      </div>
    </main>
  );
}
