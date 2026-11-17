"use client";

import { useCallback, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { optimisticStore, useOptimisticStatus } from "@/lib/optimistic-store";

/**
 * Optimistic review transitions for the admin detail pages.
 *
 * Review actions are recorded in an audit history, so unlike table status
 * toggles they keep their confirmation step and offer no Undo. Once
 * confirmed, though, the page's OptimisticStatusBadge flips immediately;
 * the request and refresh run behind it and a failure rolls the badge back.
 */
export function useOptimisticReview(statusKey: string, serverStatus: string) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const current = useOptimisticStatus(statusKey, serverStatus);

  // Once refreshed server data matches the optimistic value, drop the override.
  useEffect(() => {
    if (current === serverStatus) optimisticStore.clearStatus(statusKey);
  }, [current, serverStatus, statusKey]);

  const run = useCallback(
    async (
      nextStatus: string,
      send: () => Promise<Response>
    ): Promise<{ ok: true } | { ok: false; message: string }> => {
      optimisticStore.setStatus(statusKey, nextStatus);

      try {
        const response = await send();
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result?.error || "The action could not be completed.");
        }

        startTransition(() => router.refresh());
        return { ok: true };
      } catch (error) {
        optimisticStore.clearStatus(statusKey);
        return {
          ok: false,
          message: error instanceof Error ? error.message : "A network error occurred.",
        };
      }
    },
    [router, statusKey]
  );

  /** True from the press until the refreshed server status has landed. */
  const settling = isRefreshing || current !== serverStatus;

  return { current, run, settling };
}
