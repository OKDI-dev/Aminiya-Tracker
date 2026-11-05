"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };

function sign(p1: Point, p2: Point, p3: Point) {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

export function pointInTriangle(p: Point, a: Point, b: Point, c: Point) {
  const d1 = sign(p, a, b);
  const d2 = sign(p, b, c);
  const d3 = sign(p, c, a);
  const hasNegative = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPositive = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNegative && hasPositive);
}

function inside(rect: DOMRect, p: Point, pad = 0) {
  return (
    p.x >= rect.left - pad &&
    p.x <= rect.right + pad &&
    p.y >= rect.top - pad &&
    p.y <= rect.bottom + pad
  );
}

type Options = {
  /** Intent delay before the first menu opens from rest (filters drive-by sweeps). */
  openDelay?: number;
  /** Grace period after leaving trigger + panel before closing. */
  closeDelay?: number;
  /** If the pointer rests inside the safe triangle this long, honour what's under it. */
  restDelay?: number;
};

/**
 * Hover menus with an Amazon-style "safe triangle".
 *
 * While a flyout is open, the triangle between the pointer's last position on
 * the active trigger (apex) and the panel's near edge is a protected corridor:
 * moving diagonally through it — across sibling triggers or the gap — neither
 * switches nor closes the menu. Leaving the corridor, or resting in it,
 * resolves to whatever is under the pointer.
 */
export function useSafeTriangleMenu<T extends string>({
  openDelay = 70,
  closeDelay = 200,
  restDelay = 140,
}: Options = {}) {
  const [active, setActive] = useState<T | null>(null);
  const activeRef = useRef<T | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const apexRef = useRef<Point | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  const clear = () => window.clearTimeout(timerRef.current);

  const set = useCallback((id: T | null) => {
    activeRef.current = id;
    setActive(id);
  }, []);

  const schedule = useCallback((delay: number, fn: () => void) => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(fn, delay);
  }, []);

  useEffect(() => {
    if (!active) return;

    function triggerAt(target: EventTarget | null) {
      const element = (target as Element | null)?.closest?.("[data-menu-trigger]");
      return (element?.getAttribute("data-menu-trigger") as T | null) ?? null;
    }

    function onMove(event: PointerEvent) {
      if (event.pointerType === "touch") return;

      const p = { x: event.clientX, y: event.clientY };
      const panel = panelRef.current?.getBoundingClientRect();
      const hovered = triggerAt(event.target);

      if (panel && inside(panel, p, 2)) {
        clear();
        apexRef.current = null;
        return;
      }

      if (hovered && hovered === activeRef.current) {
        clear();
        apexRef.current = p;
        return;
      }

      const apex = apexRef.current;
      const aiming =
        apex &&
        panel &&
        p.y >= apex.y - 2 &&
        pointInTriangle(
          p,
          apex,
          { x: panel.left - 8, y: panel.top },
          { x: panel.right + 8, y: panel.top }
        );

      if (aiming) {
        // Hold the current menu while the user travels toward it; if they
        // stop here, they meant whatever is under the pointer.
        schedule(restDelay, () => {
          set(hovered ?? null);
          apexRef.current = null;
        });
        return;
      }

      if (hovered) {
        clear();
        set(hovered);
        apexRef.current = p;
        return;
      }

      schedule(closeDelay, () => set(null));
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") set(null);
    }

    document.addEventListener("pointermove", onMove);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [active, closeDelay, restDelay, schedule, set]);

  useEffect(() => clear, []);

  const triggerProps = useCallback(
    (id: T) => ({
      "data-menu-trigger": id,
      onPointerEnter: (event: React.PointerEvent) => {
        if (event.pointerType === "touch" || activeRef.current) return;
        apexRef.current = { x: event.clientX, y: event.clientY };
        schedule(openDelay, () => set(id));
      },
      onPointerLeave: () => {
        // Cancel a pending open if the pointer only swept across.
        if (!activeRef.current) clear();
      },
    }),
    [openDelay, schedule, set]
  );

  return {
    active,
    setActive: set,
    panelRef,
    triggerProps,
    close: useCallback(() => set(null), [set]),
  };
}
