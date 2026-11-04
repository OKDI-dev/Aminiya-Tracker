"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResultStatusActions({
  resultId,
  status,
}: {
  resultId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus(nextStatus: string) {
    setError("");

    const confirmation = window.confirm(
      `Are you sure you want to change this result status to ${nextStatus}?`
    );

    if (!confirmation) return;

    setLoading(true);

    try {
      const response = await fetch("/api/admin/election-results/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result_id: resultId, status: nextStatus }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to update result status.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  const actions: { label: string; status: string }[] =
    status === "draft"
      ? [
          { label: "Verify", status: "verified" },
          { label: "Reject", status: "rejected" },
        ]
      : status === "verified"
        ? [
            { label: "Publish", status: "published" },
            { label: "Reject", status: "rejected" },
            { label: "Return to draft", status: "draft" },
          ]
        : status === "published"
          ? [{ label: "Unpublish", status: "verified" }]
          : [{ label: "Reopen", status: "draft" }];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.status}
            type="button"
            disabled={loading}
            onClick={() => updateStatus(action.status)}
            className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#ff6600] hover:text-[#ff6600] disabled:opacity-50"
          >
            {loading ? "Saving..." : action.label}
          </button>
        ))}
      </div>
      {error && <p className="max-w-52 text-xs text-red-600">{error}</p>}
    </div>
  );
}
