"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  /** The record's API endpoint, e.g. `/api/admin/parties/<id>`; DELETE is sent to it. */
  endpoint: string;
  /** Where the Edit link goes. Leave out for records edited elsewhere. */
  editHref?: string;
  /** Shown in the confirmation, e.g. the record's name. */
  label: string;
  /** What stops a delete, said before the user commits. */
  blockedBy?: string;
  /** After deleting from the record's own page, go here instead of refreshing it. */
  redirectTo?: string;
};

/** Edit and Delete for any admin record. A refused delete explains why, inline. */
export default function RecordActions({ endpoint, editHref, label, blockedBy, redirectTo }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const warning = blockedBy ? ` ${blockedBy}` : "";
    if (!window.confirm(`Delete "${label}"? This cannot be undone.${warning}`)) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Unable to delete this record.");
      }

      if (redirectTo) router.push(redirectTo);
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
        {editHref ? (
          <Link
            href={editHref}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-tint"
          >
            Edit
          </Link>
        ) : null}
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
