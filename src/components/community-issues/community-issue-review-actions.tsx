"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/components/notifications/notify";
import { useConfirmation } from "@/components/notifications/confirmation-dialog";

type Props = {
  issueId: string;
  status: string;
};

const actions: Record<string, { label: string; next: string }[]> = {
  submitted: [{ label: "Start review", next: "under_review" }],
  under_review: [
    { label: "Request action", next: "action_required" },
    { label: "Mark resolved", next: "resolved" },
    { label: "Close issue", next: "closed" },
  ],
  action_required: [
    { label: "Resume review", next: "under_review" },
    { label: "Mark resolved", next: "resolved" },
    { label: "Close issue", next: "closed" },
  ],
  resolved: [{ label: "Reopen issue", next: "under_review" }],
};

export default function CommunityIssueReviewActions({
  issueId,
  status,
}: Props) {
  const router = useRouter();
  const confirm = useConfirmation();

  const [notes, setNotes] = useState("");
  const [publicSummary, setPublicSummary] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const availableActions = actions[status] ?? [];

  async function submitAction(nextStatus: string) {
    if (notes.trim().length < 5) {
      notify.error(
        "Internal notes required",
        "Please provide at least 5 characters explaining this review action."
      );
      return;
    }

    if (
      nextStatus === "resolved" &&
      resolutionSummary.trim().length < 20
    ) {
      notify.error(
        "Resolution summary required",
        "Please provide a resolution summary of at least 20 characters."
      );
      return;
    }

    const label = nextStatus.replaceAll("_", " ");

    const confirmed = await confirm({
      title: `Change issue status to ${label}?`,
      description:
        "This action and your internal notes will be recorded in the review history.",
      confirmText: "Confirm status change",
      cancelText: "Cancel",
      destructive: nextStatus === "closed",
    });

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/community-issues/${issueId}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: nextStatus,
            notes,
            publicSummary,
            resolutionSummary,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "The action could not be completed.");
      }

      notify.success(
        "Community issue updated",
        `The issue is now ${label}.`
      );

      setNotes("");
      setPublicSummary("");
      setResolutionSummary("");
      router.refresh();
    } catch (error) {
      notify.error(
        "Unable to update issue",
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  if (availableActions.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-[#171717]">Review actions</h3>
        <p className="mt-2 text-sm text-gray-500">
          This issue is closed. No further status changes are available.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 sm:p-7">
      <div>
        <h3 className="font-semibold text-[#171717]">Review actions</h3>
        <p className="mt-1 text-sm text-gray-500">
          Record your assessment and any public-facing update before changing
          the issue status.
        </p>
      </div>

      <div>
        <label htmlFor="community-review-notes" className="mb-2 block text-sm font-medium text-[#171717]">
          Internal review notes <span className="text-red-600">*</span>
        </label>
        <textarea
          id="community-review-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Record findings, checks performed and reasons for this action..."
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
        />
        <p className="mt-1 text-right text-xs text-gray-400">
          {notes.length}/5000
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Internal notes are visible only to authorised staff.
        </p>
      </div>

      <div>
        <label htmlFor="community-public-summary" className="mb-2 block text-sm font-medium text-[#171717]">
          Public update
        </label>
        <textarea
          id="community-public-summary"
          value={publicSummary}
          onChange={(event) => setPublicSummary(event.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Optional neutral update that can be displayed on the public tracking page..."
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
        />
        <p className="mt-1 text-right text-xs text-gray-400">
          {publicSummary.length}/2000
        </p>
      </div>

      {availableActions.some((action) => action.next === "resolved") && (
        <div>
          <label htmlFor="community-resolution-summary" className="mb-2 block text-sm font-medium text-[#171717]">
            Resolution summary <span className="text-red-600">*</span>
          </label>
          <textarea
            id="community-resolution-summary"
            value={resolutionSummary}
            onChange={(event) => setResolutionSummary(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Explain what action was taken and the outcome for the community..."
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
          />
          <p className="mt-1 text-right text-xs text-gray-400">
            {resolutionSummary.length}/2000
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
              action.next === "closed"
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
