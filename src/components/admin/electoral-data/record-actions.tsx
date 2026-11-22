"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  kind: "candidate" | "party";
  id: string;
  editHref: string;
  label: string;
};

export default function RecordActions({ kind, id, editHref, label }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!window.confirm(
      `Delete "${label}"? This action cannot be undone. Records linked to candidacies or election results cannot be deleted.`
    )) return;

    setLoading(true);
    setError("");

    try {
      const endpoint = kind === "candidate" ? "candidates" : "parties";
      const response = await fetch(`/api/admin/${endpoint}/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to delete this record.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={editHref}
          className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-tint"
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {loading ? "Deleting..." : "Delete"}
        </button>
      </div>
      {error && (
        <p role="alert" className="max-w-xs text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
