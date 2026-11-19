"use client";

import { useStatusMutation } from "@/components/admin/use-status-mutation";


export default function ResultStatusActions({
  resultId,
  status,
}: {
  resultId: string;
  status: string;
}) {
  const { current, change } = useStatusMutation({
    statusKey: `election_results:${resultId}`,
    status,
    noun: "Result",
    send: (nextStatus) =>
      fetch("/api/admin/election-results/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result_id: resultId, status: nextStatus }),
      }),
  });

  const actions: { label: string; status: string; primary?: boolean }[] =
    current === "draft"
      ? [
          { label: "Verify", status: "verified" },
          { label: "Reject", status: "rejected" },
        ]
      : current === "verified"
        ? [
            { label: "Publish", status: "published", primary: true },
            { label: "Reject", status: "rejected" },
            { label: "Return to draft", status: "draft" },
          ]
        : current === "published"
          ? [{ label: "Unpublish", status: "verified" }]
          : [{ label: "Reopen", status: "draft" }];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.status}
          type="button"
          onClick={() => change(action.status)}
          className={
            action.primary
              ? "rounded-md bg-signal px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-signal-hover"
              : "rounded-md border border-line-soft bg-paper-raised px-2.5 py-1.5 text-xs font-semibold text-ink-muted hover:border-signal hover:text-ink"
          }
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
