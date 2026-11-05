"use client";

import { useCallback, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/components/notifications/notify";
import { optimisticStore, useOptimisticStatus } from "@/lib/optimistic-store";

type Options = {
  /** Unique key shared with the row's OptimisticStatusBadge. */
  statusKey: string;
  /** Current status from the server. */
  status: string;
  /** Sends the change; must resolve to the fetch Response. */
  send: (nextStatus: string) => Promise<Response>;
  /** Human label for toasts, e.g. "Election". */
  noun?: string;
};

function pastTense(status: string) {
  const map: Record<string, string> = {
    published: "Published",
    draft: "Moved to draft",
    archived: "Archived",
    verified: "Verified",
    rejected: "Rejected",
    pending: "Returned to pending",
  };
  return map[status] ?? `Set to ${status.replaceAll("_", " ")}`;
}

/**
 * Optimistic, undoable status changes for server-rendered admin rows.
 * The UI updates on press; the server round-trip and refresh happen in the
 * background, and failures roll back with an error toast.
 */
export function useStatusMutation({ statusKey, status, send, noun = "Record" }: Options) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const current = useOptimisticStatus(statusKey, status);

  // Once refreshed server data matches the optimistic value, drop the override.
  useEffect(() => {
    if (current === status) optimisticStore.clearStatus(statusKey);
  }, [current, status, statusKey]);

  /** Optimistically apply, persist, refresh; roll back on failure. */
  const commit = useCallback(
    async (nextStatus: string, previous: string) => {
      optimisticStore.setStatus(statusKey, nextStatus);

      try {
        const response = await send(nextStatus);
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result?.error || "The change could not be saved.");
        }

        startTransition(() => router.refresh());
        return true;
      } catch (error) {
        optimisticStore.setStatus(statusKey, previous);
        notify.error(
          "Change not saved",
          error instanceof Error ? error.message : "A network error occurred."
        );
        startTransition(() => router.refresh());
        return false;
      }
    },
    [router, send, statusKey]
  );

  const change = useCallback(
    async (nextStatus: string) => {
      const previous = current;
      const saved = await commit(nextStatus, previous);

      if (saved) {
        notify.undoable({
          message: `${noun} ${pastTense(nextStatus).toLowerCase()}`,
          onUndo: () => {
            void commit(previous, nextStatus);
          },
        });
      }
    },
    [commit, current, noun]
  );

  return { current, change, isRefreshing };
}
