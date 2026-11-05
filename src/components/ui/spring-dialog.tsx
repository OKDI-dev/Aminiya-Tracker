"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { springs } from "@/lib/motion";
import { useCloseWatcher } from "@/hooks/use-close-watcher";

type SpringDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  hideTitle?: boolean;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  role?: "dialog" | "alertdialog";
  initialFocus?: React.RefObject<HTMLElement | null>;
  /** Vertical placement; command palettes sit higher than confirmations. */
  placement?: "center" | "top";
};

/**
 * Centered modal that materializes (scale + blur + opacity on a critically
 * damped spring) and leaves along the same path. Springs start from the
 * current presentation value, so reopening mid-close is seamless.
 */
export function SpringDialog({
  open,
  onOpenChange,
  title,
  hideTitle,
  description,
  children,
  className,
  role = "dialog",
  initialFocus,
  placement = "center",
}: SpringDialogProps) {
  useCloseWatcher(open, () => onOpenChange(false));

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal keepMounted>
            <DialogPrimitive.Backdrop
              render={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: springs.exit }}
                  transition={springs.default}
                  className="fixed inset-0 z-[90] bg-[var(--scrim)] backdrop-blur-[2px] data-closed:pointer-events-none"
                />
              }
            />
            <div
              className={cn(
                "pointer-events-none fixed inset-0 z-[91] flex justify-center px-4",
                placement === "top" ? "items-start pt-[12vh]" : "items-center"
              )}
            >
              <DialogPrimitive.Popup
                role={role}
                initialFocus={initialFocus}
                render={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 8, filter: "blur(6px)" }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.97, y: 6, filter: "blur(4px)", transition: springs.exit }}
                    transition={springs.default}
                    className={cn(
                      "pointer-events-auto data-closed:pointer-events-none w-full max-w-md rounded-2xl border border-black/5 bg-white shadow-[0_24px_64px_-16px_rgb(0_0_0/0.3)] outline-none",
                      className
                    )}
                  />
                }
              >
                <div className={cn(hideTitle && "sr-only")}>
                  <DialogPrimitive.Title className="text-lg font-semibold text-[#171717]">
                    {title}
                  </DialogPrimitive.Title>
                  {description ? (
                    <DialogPrimitive.Description className="mt-2 text-sm leading-6 text-[#5f5f5f]">
                      {description}
                    </DialogPrimitive.Description>
                  ) : null}
                </div>
                {children}
              </DialogPrimitive.Popup>
            </div>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
