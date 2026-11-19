"use client";

import type { ReactNode } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  type HTMLMotionProps,
} from "motion/react";
import { Check } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { prefersReducedMotion, springs } from "@/lib/motion";

/**
 * Feedback primitives for forms, built on Motion springs (critically damped,
 * see lib/motion) and the shadcn Spinner. They close the gulf of evaluation:
 * every press, error and result has a visible, immediate answer.
 */

/** Border/background classes for an input in its normal or invalid state. */
export function fieldClass(invalid: boolean, extra = "") {
  return `w-full rounded-lg border px-3 py-3 text-sm outline-none transition-colors duration-150 disabled:bg-tint ${
    invalid
      ? "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-2 focus:ring-red-100"
      : "border-line bg-paper-raised focus:border-signal focus:ring-2 focus:ring-signal/20"
  } ${extra}`;
}

/** Inline error that grows open under its field instead of a toast. */
export function FieldError({ id, message }: { id: string; message?: string | null }) {
  return (
    <AnimatePresence initial={false}>
      {message ? (
        <motion.p
          key="error"
          id={id}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0, transition: springs.exit }}
          transition={springs.snappy}
          className="overflow-hidden text-xs font-medium text-red-600"
        >
          <span className="block pt-1.5">{message}</span>
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

/** A short horizontal "no" shake — the physical cue for a rejected input. */
export function shake(element: Element | null) {
  if (!element || prefersReducedMotion()) return;
  animate(
    element,
    { x: [0, -7, 6, -4, 2, 0] },
    { duration: 0.38, ease: "easeOut" }
  );
}

/** Bring an invalid field into view, focus it, and shake it. */
export function revealField(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  element.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "center",
  });
  (element as HTMLElement).focus({ preventScroll: true });
  shake(element);
}

/** Scroll a freshly shown panel into view and move focus to it. */
export function revealPanel(element: HTMLElement | null) {
  if (!element) return;
  element.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
  element.focus({ preventScroll: true });
}

export type ButtonPhase = "idle" | "pending" | "success";

type SubmitButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  phase: ButtonPhase;
  icon?: ReactNode;
  label: ReactNode;
  pendingLabel: ReactNode;
  successLabel?: ReactNode;
};

/**
 * A button whose label morphs between idle → pending → success in place, so
 * the result of the press is shown exactly where the user is looking. It
 * responds on press (scale), not just on release.
 */
export function SubmitButton({
  phase,
  icon,
  label,
  pendingLabel,
  successLabel,
  disabled,
  className,
  type = "submit",
  ...rest
}: SubmitButtonProps) {
  const busy = phase !== "idle";

  return (
    <motion.button
      type={type}
      disabled={disabled || busy}
      aria-busy={phase === "pending"}
      data-phase={phase}
      whileTap={disabled || busy ? undefined : { scale: 0.97 }}
      transition={springs.snappy}
      className={className}
      {...rest}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={phase}
          className="inline-flex items-center justify-center gap-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, transition: springs.exit }}
          transition={springs.snappy}
        >
          {phase === "pending" ? (
            <>
              <Spinner aria-hidden="true" />
              {pendingLabel}
            </>
          ) : phase === "success" ? (
            <>
              <Check size={16} aria-hidden="true" />
              {successLabel ?? label}
            </>
          ) : (
            <>
              {icon}
              {label}
            </>
          )}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

/** A check mark that draws itself in — completion feedback. */
export function SuccessCheck({ className = "size-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ ...springs.default, visualDuration: 0.5 }}
      />
      <motion.path
        d="m8 12.5 2.5 2.5L16 9.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ ...springs.default, delay: 0.25 }}
      />
    </svg>
  );
}

/** Determinate progress bar driven by a 0–1 fraction. */
export function ProgressBar({ value, label }: { value: number; label: string }) {
  const clamped = Math.min(1, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      className="h-1.5 w-full overflow-hidden rounded-full bg-signal/15"
    >
      <motion.div
        className="h-full origin-left rounded-full bg-signal"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: clamped }}
        transition={springs.default}
      />
    </div>
  );
}

/** Shimmering placeholder for a value the server hasn't returned yet. */
export function PendingValue({ className = "h-5 w-48" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-pulse rounded-md bg-line-soft motion-reduce:animate-none ${className}`}
    />
  );
}

/** Swap between two views (e.g. form ↔ receipt) along the same vertical path. */
export const swapTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: springs.default },
  exit: { opacity: 0, y: -8, transition: springs.exit },
};
