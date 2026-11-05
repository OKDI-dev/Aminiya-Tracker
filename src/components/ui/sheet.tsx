"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
  type AnimationPlaybackControls,
} from "motion/react";
import { cn } from "@/lib/utils";
import { project, rubberband, springs } from "@/lib/motion";
import { useCloseWatcher } from "@/hooks/use-close-watcher";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  /** Visually hide the title (it stays available to assistive tech). */
  hideTitle?: boolean;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Element focused when the sheet opens. */
  initialFocus?: React.RefObject<HTMLElement | null>;
};

const DRAG_THRESHOLD = 8; // px of hysteresis before a drag commits
const DISMISS_FRACTION = 0.45; // of sheet height, measured at the *projected* resting point
const INTERACTIVE = "input, textarea, select, [contenteditable='true'], [data-sheet-no-drag]";

/**
 * Bottom sheet with Apple-style fluid dismissal:
 * - tracks the finger 1:1 (respecting the grab offset), with rubber-banding upward
 * - can be grabbed mid-animation; motion always continues from the on-screen value
 * - on release, projects momentum to decide dismiss vs. return, and hands the
 *   finger's velocity to the spring so there is no seam between drag and animation
 * - dismisses on Esc, scrim tap and the Android back gesture (CloseWatcher)
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  hideTitle,
  description,
  children,
  className,
  initialFocus,
}: SheetProps) {
  useCloseWatcher(open, () => onOpenChange(false));

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal keepMounted>
            <SheetSurface
              onDismiss={() => onOpenChange(false)}
              title={title}
              hideTitle={hideTitle}
              description={description}
              className={className}
              initialFocus={initialFocus}
            >
              {children}
            </SheetSurface>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

function SheetSurface({
  onDismiss,
  title,
  hideTitle,
  description,
  children,
  className,
  initialFocus,
}: {
  onDismiss: () => void;
  title: React.ReactNode;
  hideTitle?: boolean;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  initialFocus?: React.RefObject<HTMLElement | null>;
}) {
  const popupRef = React.useRef<HTMLDivElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const heightRef = React.useRef(600);
  const animationRef = React.useRef<AnimationPlaybackControls | null>(null);

  // Start off-screen; the mount effect springs it into place.
  const y = useMotionValue(
    typeof window === "undefined" ? 1000 : window.innerHeight
  );
  const scrimOpacity = useTransform(y, (value) => {
    const progress = 1 - Math.min(Math.max(value / heightRef.current, 0), 1);
    return progress;
  });

  const gesture = React.useRef<{
    pointerId: number;
    startPointerY: number;
    startPointerX: number;
    startY: number;
    dragging: boolean;
  } | null>(null);

  const runSpring = React.useCallback(
    (target: number, velocity = 0, withMomentum = false) => {
      animationRef.current?.stop();
      animationRef.current = animate(y, target, {
        ...(withMomentum ? springs.sheet : springs.sheetCalm),
        velocity,
      });
      return animationRef.current;
    },
    [y]
  );

  React.useLayoutEffect(() => {
    heightRef.current = popupRef.current?.offsetHeight ?? heightRef.current;
    runSpring(0);
    return () => animationRef.current?.stop();
  }, [runSpring]);

  // When the body has nothing to scroll, let touch drags anywhere move the sheet.
  React.useEffect(() => {
    const scroller = scrollRef.current;
    const popup = popupRef.current;
    if (!scroller || !popup) return;

    const sync = () => {
      heightRef.current = popup.offsetHeight;
      scroller.style.touchAction =
        scroller.scrollHeight > scroller.clientHeight + 1 ? "pan-y" : "none";
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(scroller);
    observer.observe(popup);
    return () => observer.disconnect();
  }, []);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return;

    // Interruptible: catch the sheet mid-flight from its *current* position.
    animationRef.current?.stop();

    gesture.current = {
      pointerId: event.pointerId,
      startPointerY: event.clientY,
      startPointerX: event.clientX,
      startY: y.get(),
      dragging: false,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = gesture.current;
    if (!state || state.pointerId !== event.pointerId) return;

    const dy = event.clientY - state.startPointerY;
    const dx = event.clientX - state.startPointerX;

    if (!state.dragging) {
      if (Math.abs(dy) < DRAG_THRESHOLD || Math.abs(dy) < Math.abs(dx)) return;

      // Let inner content scroll first; only take over at the scroll edge.
      const scroller = scrollRef.current;
      const insideScroller = scroller?.contains(event.target as Node);
      if (insideScroller && scroller && (dy < 0 || scroller.scrollTop > 0)) {
        gesture.current = null;
        return;
      }

      state.dragging = true;
      // Re-anchor so the sheet doesn't jump by the threshold distance.
      state.startPointerY = event.clientY;
      state.startY = y.get();
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    const raw = state.startY + (event.clientY - state.startPointerY);
    y.set(raw < 0 ? rubberband(raw, heightRef.current) : raw);
  }

  function onPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    const state = gesture.current;
    gesture.current = null;
    if (!state || state.pointerId !== event.pointerId) return;

    if (!state.dragging) {
      // A tap that interrupted an in-flight animation: settle it.
      if (y.get() !== 0) runSpring(0);
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const velocity = y.getVelocity();
    const current = y.get();
    const projected = current + project(velocity);
    const height = heightRef.current;

    if (projected > height * DISMISS_FRACTION) {
      // Fly out along the same path it came in, carrying the finger's speed.
      const flight = runSpring(height + 24, velocity, true);
      void flight.finished.then(() => {
        // Only dismiss if this flight wasn't interrupted by a new grab.
        if (animationRef.current === flight && !gesture.current && y.get() >= height) {
          onDismiss();
        }
      });
    } else {
      runSpring(0, velocity, Math.abs(velocity) > 300);
    }
  }

  // Swallow the click that ends a drag so links/buttons don't fire.
  function onClickCapture(event: React.MouseEvent) {
    if (Math.abs(y.get()) > 2) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  return (
    <>
      <DialogPrimitive.Backdrop
        render={
          <motion.div
            style={{ opacity: scrimOpacity }}
            className="fixed inset-0 z-[90] bg-[var(--scrim)] data-closed:pointer-events-none"
          />
        }
      />
      <DialogPrimitive.Popup
        ref={popupRef}
        initialFocus={initialFocus}
        render={
          <motion.div
            style={{ y }}
            // Resolved at exit time (not render) so it uses the measured height.
            variants={{
              out: () => ({
                y: heightRef.current + 24,
                // Same downward path it entered on; ease-in so it finishes cleanly.
                transition: { type: "tween", duration: 0.26, ease: [0.32, 0, 0.67, 0] },
              }),
            }}
            exit="out"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onClickCapture={onClickCapture}
            className={cn(
              "material-thick data-closed:pointer-events-none fixed inset-x-0 bottom-0 z-[91] mx-auto flex max-h-[88dvh] w-full max-w-xl touch-pan-x flex-col rounded-t-[1.75rem] border border-b-0 border-white/60 shadow-[0_-12px_48px_-12px_rgb(0_0_0/0.25)] outline-none select-none",
              className
            )}
          />
        }
      >
        <div className="flex shrink-0 cursor-grab justify-center pt-2.5 pb-1 active:cursor-grabbing" aria-hidden="true">
          <span className="h-1.5 w-10 rounded-full bg-black/15" />
        </div>

        <div className={cn("shrink-0 px-5 pt-1 pb-3", hideTitle && "sr-only")}>
          <DialogPrimitive.Title className="text-lg font-semibold text-[#171717]">
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-1 text-sm text-[#666]">
              {description}
            </DialogPrimitive.Description>
          ) : null}
        </div>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))] select-text"
        >
          {children}
        </div>
      </DialogPrimitive.Popup>
    </>
  );
}
