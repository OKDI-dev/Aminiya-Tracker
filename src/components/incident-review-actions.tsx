"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/components/notifications/notify";
import { useConfirmation } from "@/components/notifications/confirmation-dialog";

type Props = {
  incidentId: string;
  status: string;
};

export default function IncidentReviewActions({
  incidentId,
  status,
}: Props) {
  const router = useRouter();
  const confirm = useConfirmation();

  const [notes, setNotes] = useState("");
  const [publicSummary, setPublicSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const actions: Record<string, { label: string; next: string }[]> = {
    submitted: [{ label: "Start review", next: "under_review" }],
    under_review: [
      { label: "Verify incident", next: "verified" },
      { label: "Dismiss incident", next: "dismissed" },
    ],
    verified: [{ label: "Publish incident", next: "published" }],
  };

  async function submitAction(nextStatus: string) {
    if (
      ["verified", "dismissed"].includes(nextStatus) &&
      notes.trim().length < 5
    ) {
      notify.error(
        "Review notes required",
        "Please provide review notes of at least 5 characters."
      );
      return;
    }

    if (nextStatus === "published" && publicSummary.trim().length < 20) {
      notify.error(
        "Public summary required",
        "Please provide a public summary of at least 20 characters."
      );
      return;
    }

    const nextLabel = nextStatus.replaceAll("_", " ");

    const confirmed = await confirm({
      title: `${nextStatus === "dismissed" ? "Dismiss" : nextStatus === "published" ? "Publish" : nextStatus === "verified" ? "Verify" : "Start"} incident review?`,
      description: `Are you sure you want to change this incident's status to "${nextLabel}"? This action will be recorded in the review history.`,
      confirmText: nextStatus === "dismissed" ? "Dismiss incident" : nextStatus === "published" ? "Publish incident" : "Continue",
      cancelText: "Cancel",
      destructive: nextStatus === "dismissed",
    });

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/election-incidents/${incidentId}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: nextStatus,
            notes,
            publicSummary,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "The action could not be completed.");
      }

      notify.success(
        "Incident status updated",
        `The incident is now ${nextLabel}.`
      );

      setNotes("");
      setPublicSummary("");
      router.refresh();
    } catch (err) {
      notify.error(
        "Unable to update incident",
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  const availableActions = actions[status] ?? [];

  if (availableActions.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-[#171717]">Review actions</h3>
        <p className="mt-2 text-sm text-gray-500">
          This incident has reached its current final status. No further
          review action is available.
        </p>
      </section>
    );
  }

  const needsNotes = ["under_review", "verified", "dismissed"].some(
    (next) => availableActions.some((action) => action.next === next)
  );

  const needsSummary = availableActions.some(
    (action) => action.next === "published"
  );

  return (
    <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 sm:p-7">
      <div>
        <h3 className="font-semibold text-[#171717]">Review actions</h3>
        <p className="mt-1 text-sm text-gray-500">
          Record your assessment before changing the incident status.
        </p>
      </div>

      {needsNotes && (
        <div>
          <label
            htmlFor="review-notes"
            className="mb-2 block text-sm font-medium text-[#171717]"
          >
            Internal review notes
          </label>
          <textarea
            id="review-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            maxLength={5000}
            placeholder="Document your findings, evidence checked, and reasons for the decision..."
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
          />
          <p className="mt-1 text-right text-xs text-gray-400">
            {notes.length}/5000
          </p>
        </div>
      )}

      {needsSummary && (
        <div>
          <label
            htmlFor="public-summary"
            className="mb-2 block text-sm font-medium text-[#171717]"
          >
            Public summary
          </label>
          <textarea
            id="public-summary"
            value={publicSummary}
            onChange={(event) => setPublicSummary(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Write a factual, neutral summary suitable for public display..."
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
          />
          <p className="mt-1 text-right text-xs text-gray-400">
            {publicSummary.length}/2000
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Only this summary—not the original report or internal notes—will
            be displayed publicly.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {availableActions.map((action) => (
          <button
            key={action.next}
            type="button"
            disabled={loading}
            onClick={() => submitAction(action.next)}
            className={`rounded-lg px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
              action.next === "dismissed"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#ff6600] hover:bg-[#e85d00]"
            }`}
          >
            {loading ? "Processing..." : action.label}
          </button>
        ))}
      </div>
    </section>
  );
}
