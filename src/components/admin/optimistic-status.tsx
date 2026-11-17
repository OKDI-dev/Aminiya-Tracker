"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { springs } from "@/lib/motion";
import { useOptimisticStatus, useRowHidden } from "@/lib/optimistic-store";

const defaultStyles: Record<string, string> = {
  published: "bg-green-100 text-green-800",
  verified: "bg-blue-100 text-blue-800",
  draft: "bg-yellow-100 text-yellow-800",
  pending: "bg-yellow-100 text-yellow-800",
  archived: "bg-gray-100 text-gray-700",
  rejected: "bg-red-100 text-red-700",
};

/**
 * Status pill that reflects optimistic changes made by the row's actions.
 * The label cross-fades on a spring so rapid toggles (and Undo) stay smooth.
 */
export function OptimisticStatusBadge({
  statusKey,
  status,
  styles,
}: {
  statusKey: string;
  status: string;
  styles?: Record<string, string>;
}) {
  const current = useOptimisticStatus(statusKey, status);
  const pending = current !== status;
  const palette = { ...defaultStyles, ...styles };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors duration-200 ${
        palette[current] ?? "bg-gray-100 text-gray-700"
      }`}
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={current}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={springs.snappy}
        >
          {current.replaceAll("_", " ")}
        </motion.span>
      </AnimatePresence>
      {pending ? (
        <span className="size-1.5 animate-pulse rounded-full bg-current opacity-60" aria-hidden="true" />
      ) : null}
    </span>
  );
}

/** Table row that disappears optimistically (e.g. during an undoable delete). */
export function OptimisticRow({
  rowKey,
  className,
  children,
}: {
  rowKey: string;
  className?: string;
  children: ReactNode;
}) {
  const hidden = useRowHidden(rowKey);
  if (hidden) return null;
  return <tr className={className}>{children}</tr>;
}
