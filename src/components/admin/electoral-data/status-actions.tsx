"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Status = "draft" | "published" | "archived";
type Table = "elections" | "candidates" | "political_parties" | "electoral_areas" | "candidacies";

type Props = {
  table: Table;
  id: string;
  status: Status;
};

export default function StatusActions({ table, id, status }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  async function changeStatus(nextStatus: Status) {
    if (
      nextStatus === "archived" &&
      !window.confirm(
        "Are you sure you want to archive this record? It will no longer appear in public listings."
      )
    ) {
      return;
    }

    setMessage("");

    try {
      const response = await fetch("/api/admin/electoral-data/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table,
          id,
          status: nextStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Could not update the record.");
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setMessage("A network error occurred. Please try again.");
    }
  }

  const buttonClass =
    "rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:border-[#ff6600] hover:text-[#e85d00] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex min-w-[150px] flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "draft" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => changeStatus("published")}
            className="rounded-md bg-[#ff6600] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#e85d00] disabled:opacity-50"
          >
            Publish
          </button>
        )}

        {status === "published" && (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => changeStatus("draft")}
              className={buttonClass}
            >
              Return to Draft
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => changeStatus("archived")}
              className={buttonClass}
            >
              Archive
            </button>
          </>
        )}

        {status === "archived" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => changeStatus("draft")}
            className={buttonClass}
          >
            Restore to Draft
          </button>
        )}

        {isPending && (
          <span className="text-xs text-gray-500">Refreshing…</span>
        )}
      </div>

      {message && (
        <p role="alert" className="max-w-[220px] text-xs text-red-600">
          {message}
        </p>
      )}
    </div>
  );
}
