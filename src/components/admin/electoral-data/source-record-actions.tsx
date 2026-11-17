"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { notify } from "@/components/notifications/notify";
import { optimisticStore } from "@/lib/optimistic-store";

/**
 * Delete with Undo instead of a blocking confirmation:
 * the row disappears immediately; the DELETE is only sent once the
 * Undo window closes (or the page is hidden), so Undo is a true no-op.
 */
export default function SourceRecordActions({
  sourceId,
  title,
}: {
  sourceId: string;
  title?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const rowKey = `electoral_sources:${sourceId}`;

  function deleteSource() {
    optimisticStore.hideRow(rowKey);

    notify.undoable({
      message: "Source deleted",
      description: title ? `“${title}” will be removed permanently.` : undefined,
      duration: 7000,
      onUndo: () => optimisticStore.showRow(rowKey),
      onCommit: async () => {
        try {
          const response = await fetch(`/api/admin/electoral-sources/${sourceId}`, {
            method: "DELETE",
            keepalive: true,
          });
          const result = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(result?.error || "Unable to delete source.");
          }

          startTransition(() => router.refresh());
        } catch (error) {
          optimisticStore.showRow(rowKey);
          notify.error(
            "Source not deleted",
            error instanceof Error ? error.message : "An unexpected error occurred."
          );
        }
      },
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/admin/electoral-data/sources/${sourceId}`}
        className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#ff6600] hover:text-[#ff6600]"
      >
        Edit
      </Link>
      <button
        type="button"
        onClick={deleteSource}
        className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  );
}
