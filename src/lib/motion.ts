import type { Transition } from "motion/react";

/**
 * Spring presets expressed in Apple's two designer-facing parameters
 * (damping ratio + response). Motion's `bounce` ≈ 1 − dampingRatio and
 * `visualDuration` ≈ response, so these map closely to UIKit's values.
 */
export const springs = {
  /** Default UI motion: critically damped, no overshoot. */
  default: { type: "spring", bounce: 0, visualDuration: 0.35 },
  /** Small, quick UI (pills, highlights, toggles). */
  snappy: { type: "spring", bounce: 0, visualDuration: 0.22 },
  /** Drawer / sheet (damping 0.8, response 0.3) — only after a momentum gesture. */
  sheet: { type: "spring", bounce: 0.2, visualDuration: 0.3 },
  /** Sheet without prior momentum (programmatic open/close). */
  sheetCalm: { type: "spring", bounce: 0, visualDuration: 0.38 },
  /** Move / reposition (damping 1.0, response 0.4). */
  move: { type: "spring", bounce: 0, visualDuration: 0.4 },
  /**
   * Exits: leave quickly so the departing layer never competes with (or
   * blocks) what's underneath. A spring's long sub-pixel tail would keep the
   * scrim mounted; a short ease-in finishes cleanly. Re-entry mid-exit still
   * animates from the current value.
   */
  exit: { type: "tween", duration: 0.16, ease: [0.4, 0, 1, 1] },
} satisfies Record<string, Transition>;

/**
 * Apple's momentum projection (Designing Fluid Interfaces, WWDC18).
 * Returns how far a release with `velocity` (px/s) would travel under
 * scroll-like exponential deceleration.
 */
export function project(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Progressive resistance past a boundary instead of a hard stop. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (
    (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot))
  );
}

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
