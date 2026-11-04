"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SourceStatusActions({
  sourceId,
  status,
}: {
  sourceId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const actions =
    status === "pending"
      ? [
          { label: "Verify", status: "verified" },
          { label: "Reject", status: "rejected" },
        ]
      : status === "verified"
        ? [{ label: "Return to pending", status: "pending" }]
        : [{ label: "Reopen", status: "pending" }];

  async function updateStatus(nextStatus: string) {
    setError("");

    if (!window.confirm(`Change this source status to ${nextStatus}?`)) return;

    setLoading(true);

    try {
      const response = await fetch("/api/admin/electoral-sources/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_id: sourceId, status: nextStatus }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to update source status.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

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
