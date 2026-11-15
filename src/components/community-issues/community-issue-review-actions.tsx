"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { notify } from "@/components/notifications/notify";
import { useConfirmation } from "@/components/notifications/confirmation-dialog";
import { useOptimisticReview } from "@/components/admin/use-optimistic-review";
import {
  FieldError,
  SubmitButton,
  fieldClass,
  revealField,
} from "@/components/ui/form-feedback";
import { springs } from "@/lib/motion";
import { communityIssueStatusKey } from "@/lib/review-status-keys";

type Props = {
  issueId: string;
  status: string;
};

const actions: Record<string, { label: string; pending: string; next: string }[]> = {
  submitted: [{ label: "Start review", pending: "Starting…", next: "under_review" }],
  under_review: [
    { label: "Request action", pending: "Requesting…", next: "action_required" },
    { label: "Mark resolved", pending: "Resolving…", next: "resolved" },
    { label: "Close issue", pending: "Closing…", next: "closed" },
  ],
  action_required: [
    { label: "Resume review", pending: "Resuming…", next: "under_review" },
    { label: "Mark resolved", pending: "Resolving…", next: "resolved" },
    { label: "Close issue", pending: "Closing…", next: "closed" },
  ],
  resolved: [{ label: "Reopen issue", pending: "Reopening…", next: "under_review" }],
};

export default function CommunityIssueReviewActions({ issueId, status }: Props) {
  const confirm = useConfirmation();
  const { run, settling } = useOptimisticReview(communityIssueStatusKey(issueId), status);

  const [notes, setNotes] = useState("");
  const [publicSummary, setPublicSummary] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [notesError, setNotesError] = useState("");
  const [resolutionError, setResolutionError] = useState("");

  const availableActions = actions[status] ?? [];
  const canResolve = availableActions.some((action) => action.next === "resolved");

  async function submitAction(nextStatus: string) {
    const notesInvalid = notes.trim().length < 5;
    const resolutionInvalid =
      nextStatus === "resolved" && resolutionSummary.trim().length < 20;

    setNotesError(
      notesInvalid ? "Write at least 5 characters explaining this action." : ""
    );
    setResolutionError(
      resolutionInvalid
        ? "Marking resolved needs a resolution summary of at least 20 characters."
        : ""
    );

    if (notesInvalid) return revealField("community-review-notes");
    if (resolutionInvalid) return revealField("community-resolution-summary");

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

    setPendingAction(nextStatus);

    const result = await run(nextStatus, () =>
      fetch(`/api/admin/community-issues/${issueId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          notes,
          publicSummary,
          resolutionSummary,
        }),
      })
    );

    setPendingAction(null);

    if (result.ok) {
      notify.success("Community issue updated", `The issue is now ${label}.`);
      setNotes("");
      setPublicSummary("");
      setResolutionSummary("");
    } else {
      notify.error("Unable to update issue", result.message);
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

  const busy = pendingAction !== null || settling;

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
          onChange={(event) => {
            setNotes(event.target.value);
            if (notesError && event.target.value.trim().length >= 5) setNotesError("");
          }}
          rows={4}
          maxLength={5000}
          aria-invalid={Boolean(notesError) || undefined}
          aria-describedby="community-review-notes-hint community-review-notes-error"
          placeholder="Record findings, checks performed and reasons for this action..."
          className={fieldClass(Boolean(notesError))}
        />
        <div className="flex items-start justify-between gap-3">
          <FieldError id="community-review-notes-error" message={notesError} />
          <p className="ml-auto mt-1 shrink-0 text-xs text-gray-400">{notes.length}/5000</p>
        </div>
        <p id="community-review-notes-hint" className="mt-1 text-xs text-gray-500">
          Required for every status change. Visible only to authorised staff.
        </p>
      </div>

      <div>
        <label htmlFor="community-public-summary" className="mb-2 block text-sm font-medium text-[#171717]">
          Public update <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <textarea
          id="community-public-summary"
          value={publicSummary}
          onChange={(event) => setPublicSummary(event.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Neutral update shown to the reporter when they track this issue..."
          className={fieldClass(false)}
        />
        <p className="mt-1 text-right text-xs text-gray-400">{publicSummary.length}/2000</p>
      </div>

      {canResolve && (
        <div>
          <label htmlFor="community-resolution-summary" className="mb-2 block text-sm font-medium text-[#171717]">
            Resolution summary
          </label>
          <textarea
            id="community-resolution-summary"
            value={resolutionSummary}
            onChange={(event) => {
              setResolutionSummary(event.target.value);
              if (resolutionError && event.target.value.trim().length >= 20) setResolutionError("");
            }}
            rows={3}
            maxLength={2000}
            aria-invalid={Boolean(resolutionError) || undefined}
            aria-describedby="community-resolution-hint community-resolution-summary-error"
            placeholder="Explain what action was taken and the outcome for the community..."
            className={fieldClass(Boolean(resolutionError))}
          />
          <div className="flex items-start justify-between gap-3">
            <FieldError id="community-resolution-summary-error" message={resolutionError} />
            <p className="ml-auto mt-1 shrink-0 text-xs text-gray-400">
              {resolutionSummary.length}/2000
            </p>
          </div>
          <p id="community-resolution-hint" className="mt-1 text-xs text-gray-500">
            Required only for <strong>Mark resolved</strong>.
          </p>
        </div>
      )}

      <motion.div layout transition={springs.move} className="flex flex-wrap gap-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {availableActions.map((action) => (
            <motion.div
              key={`${status}:${action.next}`}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: springs.exit }}
              transition={springs.snappy}
            >
              <SubmitButton
                type="button"
                phase={pendingAction === action.next ? "pending" : "idle"}
                label={action.label}
                pendingLabel={action.pending}
                disabled={busy}
                onClick={() => submitAction(action.next)}
                className={`inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:not-data-[phase=pending]:opacity-50 ${
                  action.next === "closed"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#ff6600] hover:bg-[#e85d00]"
                }`}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
