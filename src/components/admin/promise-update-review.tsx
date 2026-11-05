"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  XCircle,
  FileText,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";

type EvidenceFile = {
  id: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  publiclyVisible: boolean;
  publishedAt: string | null;
  createdAt: string;
  signedUrl: string | null;
};

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PromiseUpdateReview({
  updateId,
  promiseTitle,
  updateTitle,
  updateDescription,
  progressStatus,
  updateDate,
  evidenceUrl,
  sourceTitle,
  reviewStatus,
  evidence,
}: {
  updateId: string;
  promiseTitle: string;
  updateTitle: string;
  updateDescription: string;
  progressStatus: string;
  updateDate: string;
  evidenceUrl: string | null;
  sourceTitle: string | null;
  reviewStatus: string;
  evidence: EvidenceFile[];
}) {
  const router = useRouter();

  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [publicationError, setPublicationError] = useState("");
  const [updatingEvidenceId, setUpdatingEvidenceId] = useState("");

  const isPending = reviewStatus === "pending";

  async function review(decision: "approved" | "rejected") {
    setError("");

    if (decision === "rejected" && notes.trim().length < 5) {
      setError("Please provide a rejection reason of at least 5 characters.");
      return;
    }

    if (
      !window.confirm(
        decision === "approved"
          ? "Approve this update? This will change the promise's official progress status."
          : "Reject this progress update?"
      )
    ) return;

    setSaving(true);

    try {
      const response = await fetch(`/api/admin/promise-updates/${updateId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          review_notes: notes.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to review this update.");
        return;
      }

      router.push("/admin/promise-updates");
      router.refresh();
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function changePublication(item: EvidenceFile) {
    const nextValue = !item.publiclyVisible;

    setPublicationError("");

    const confirmed = window.confirm(
      nextValue
        ? `Release "${item.originalFilename}" for public viewing?`
        : `Revoke public access to "${item.originalFilename}"?`
    );

    if (!confirmed) return;

    setUpdatingEvidenceId(item.id);

    try {
      const response = await fetch(
        `/api/admin/promise-updates/evidence/${item.id}/publication`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicly_visible: nextValue }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setPublicationError(result.error || "Unable to update evidence publication.");
        return;
      }

      router.refresh();
    } catch {
      setPublicationError("A network error occurred. Please try again.");
    } finally {
      setUpdatingEvidenceId("");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      <div>
        <p className="text-sm text-gray-500">Political promise</p>
        <h1 className="mt-1 text-2xl font-bold text-[#171717]">{promiseTitle}</h1>
        <span className="mt-3 inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-700">
          {reviewStatus.replaceAll("_", " ")}
        </span>
      </div>

      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 sm:p-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Progress update
          </p>
          <h2 className="mt-2 text-xl font-semibold text-gray-900">{updateTitle}</h2>
        </div>

        <div className="grid gap-4 border-y border-gray-100 py-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-gray-500">Reported progress status</p>
            <p className="mt-1 font-medium capitalize text-gray-900">
              {progressStatus.replaceAll("_", " ")}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Date of update</p>
            <p className="mt-1 font-medium text-gray-900">{updateDate}</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            Description and evidence
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-700">
            {updateDescription}
          </p>
        </div>

        {evidenceUrl && (
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-semibold text-gray-500">
              Supporting evidence URL
            </p>
            <a
              href={evidenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block break-all text-sm text-[#e85d00] underline"
            >
              {evidenceUrl}
            </a>
          </div>
        )}

        {sourceTitle && (
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Linked verified source</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{sourceTitle}</p>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 sm:p-7">
        <div>
          <h2 className="font-semibold text-gray-900">Uploaded evidence files</h2>
          <p className="mt-1 text-sm text-gray-500">
            Files are private by default. Public release is a separate decision
            from approving the progress update.
          </p>
        </div>

        {evidence.length === 0 ? (
          <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
            No file attachments have been uploaded for this update.
          </p>
        ) : (
          <div className="space-y-3">
            {evidence.map((item) => (
              <div
                key={item.id}
                className="space-y-3 rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-start gap-3">
                  <FileText className="mt-1 shrink-0 text-[#e85d00]" size={20} />
                  <div className="min-w-0 flex-1">
                    <p className="break-all text-sm font-semibold text-gray-900">
                      {item.originalFilename}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {item.mimeType} · {formatSize(item.fileSize)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Uploaded {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      item.publiclyVisible
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {item.publiclyVisible ? "Public" : "Private"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {item.signedUrl ? (
                    <a
                      href={item.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#e85d00] hover:underline"
                    >
                      <ExternalLink size={15} />
                      Preview / download
                    </a>
                  ) : (
                    <span className="text-xs text-red-600">
                      Temporary download link unavailable. Refresh the page.
                    </span>
                  )}

                  {item.publiclyVisible && item.publishedAt && (
                    <span className="text-xs text-gray-500">
                      Released {new Date(item.publishedAt).toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    disabled={!!updatingEvidenceId}
                    onClick={() => changePublication(item)}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${
                      item.publiclyVisible
                        ? "border border-red-200 text-red-700 hover:bg-red-50"
                        : "bg-[#ff6600] text-white hover:bg-[#e85d00]"
                    }`}
                  >
                    {updatingEvidenceId === item.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : item.publiclyVisible ? (
                      <EyeOff size={15} />
                    ) : (
                      <Eye size={15} />
                    )}
                    {item.publiclyVisible
                      ? "Revoke public access"
                      : "Release publicly"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {publicationError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {publicationError}
          </div>
        )}
      </section>

      {isPending && (
        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 sm:p-7">
          <div>
            <h2 className="font-semibold text-gray-900">Reviewer assessment</h2>
            <p className="mt-1 text-sm text-gray-500">
              Record your assessment. A reason is required when rejecting an update.
            </p>
          </div>

          <div>
            <label htmlFor="review_notes" className="text-sm font-medium text-gray-800">
              Review notes
            </label>
            <textarea
              id="review_notes"
              rows={4}
              maxLength={2000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Explain your decision or identify any evidence gaps..."
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#ff6600] focus:ring-1 focus:ring-[#ff6600]"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => review("rejected")}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <XCircle size={16} />
              )}
              Reject update
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => review("approved")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff6600] px-5 py-3 text-sm font-semibold text-white hover:bg-[#e85d00] disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Approve update
            </button>
          </div>
        </section>
      )}

      {!isPending && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
          This progress update has already been reviewed. You can still manage
          the public visibility of its evidence files above.
        </div>
      )}
    </div>
  );
}
