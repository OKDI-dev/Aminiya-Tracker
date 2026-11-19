"use client";

import { useStatusMutation } from "@/components/admin/use-status-mutation";


export default function SourceStatusActions({
  sourceId,
  status,
}: {
  sourceId: string;
  status: string;
}) {
  const { current, change } = useStatusMutation({
    statusKey: `electoral_sources:${sourceId}`,
    status,
    noun: "Source",
    send: (nextStatus) =>
      fetch("/api/admin/electoral-sources/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_id: sourceId, status: nextStatus }),
      }),
  });

  const actions =
    current === "pending"
      ? [
          { label: "Verify", status: "verified" },
          { label: "Reject", status: "rejected" },
        ]
      : current === "verified"
        ? [{ label: "Return to pending", status: "pending" }]
        : [{ label: "Reopen", status: "pending" }];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.status}
          type="button"
          onClick={() => change(action.status)}
          className="rounded-md border border-line-soft bg-paper-raised px-2.5 py-1.5 text-xs font-semibold text-ink-muted hover:border-signal hover:text-ink"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
