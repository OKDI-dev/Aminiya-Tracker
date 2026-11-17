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
import { incidentStatusKey } from "@/lib/review-status-keys";

type Props = {
  incidentId: string;
  status: string;
};

const actions: Record<string, { label: string; pending: string; next: string }[]> = {
  submitted: [{ label: "Start review", pending: "Starting…", next: "under_review" }],
  under_review: [
    { label: "Verify incident", pending: "Verifying…", next: "verified" },
    { label: "Dismiss incident", pending: "Dismissing…", next: "dismissed" },
  ],
  verified: [{ label: "Publish incident", pending: "Publishing…", next: "published" }],
};

const NOTES_REQUIRED_FOR = ["verified", "dismissed"];

export default function IncidentReviewActions({ incidentId, status }: Props) {
  const confirm = useConfirmation();
  const { run, settling } = useOptimisticReview(incidentStatusKey(incidentId), status);

  const [notes, setNotes] = useState("");
  const [publicSummary, setPublicSummary] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [notesError, setNotesError] = useState("");
  const [summaryError, setSummaryError] = useState("");

  const availableActions = actions[status] ?? [];

  async function submitAction(nextStatus: string) {
    const notesInvalid =
      NOTES_REQUIRED_FOR.includes(nextStatus) && notes.trim().length < 5;
    const summaryInvalid =
      nextStatus === "published" && publicSummary.trim().length < 20;

    setNotesError(
      notesInvalid ? "Write at least 5 characters explaining this decision." : ""
    );
    setSummaryError(
      summaryInvalid ? "Publishing needs a public summary of at least 20 characters." : ""
    );

    if (notesInvalid) return revealField("review-notes");
    if (summaryInvalid) return revealField("public-summary");

    const nextLabel = nextStatus.replaceAll("_", " ");
    const verb =
      nextStatus === "dismissed"
        ? "Dismiss"
        : nextStatus === "published"
          ? "Publish"
          : nextStatus === "verified"
            ? "Verify"
            : "Start";

    const confirmed = await confirm({
      title: `${verb} incident review?`,
      description: `Are you sure you want to change this incident's status to "${nextLabel}"? This action will be recorded in the review history.`,
      confirmText:
        nextStatus === "dismissed"
          ? "Dismiss incident"
          : nextStatus === "published"
            ? "Publish incident"
            : "Continue",
      cancelText: "Cancel",
      destructive: nextStatus === "dismissed",
    });

    if (!confirmed) return;

    setPendingAction(nextStatus);

    const result = await run(nextStatus, () =>
      fetch(`/api/admin/election-incidents/${incidentId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, notes, publicSummary }),
      })
    );

    setPendingAction(null);

    if (result.ok) {
      notify.success("Incident status updated", `The incident is now ${nextLabel}.`);
      setNotes("");
      setPublicSummary("");
    } else {
      notify.error("Unable to update incident", result.message);
    }
  }

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

  const needsNotes = availableActions.some((action) =>
    ["under_review", ...NOTES_REQUIRED_FOR].includes(action.next)
  );
  const notesRequired = availableActions.some((action) =>
    NOTES_REQUIRED_FOR.includes(action.next)
  );
  const needsSummary = availableActions.some((action) => action.next === "published");
  const busy = pendingAction !== null || settling;

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
          <label htmlFor="review-notes" className="mb-2 block text-sm font-medium text-[#171717]">
            Internal review notes{" "}
            {notesRequired ? (
              <span className="text-red-600">*</span>
            ) : (
              <span className="font-normal text-gray-500">(optional)</span>
            )}
          </label>
          <textarea
            id="review-notes"
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              if (notesError && event.target.value.trim().length >= 5) setNotesError("");
            }}
            rows={4}
            maxLength={5000}
            aria-invalid={Boolean(notesError) || undefined}
            aria-describedby="review-notes-error"
            placeholder="Document your findings, evidence checked, and reasons for the decision..."
            className={fieldClass(Boolean(notesError))}
          />
          <div className="flex items-start justify-between gap-3">
            <FieldError id="review-notes-error" message={notesError} />
            <p className="ml-auto mt-1 shrink-0 text-xs text-gray-400">{notes.length}/5000</p>
          </div>
          {notesRequired && (
            <p className="mt-1 text-xs text-gray-500">Required to verify or dismiss.</p>
          )}
        </div>
      )}

      {needsSummary && (
        <div>
          <label htmlFor="public-summary" className="mb-2 block text-sm font-medium text-[#171717]">
            Public summary <span className="text-red-600">*</span>
          </label>
          <textarea
            id="public-summary"
            value={publicSummary}
            onChange={(event) => {
              setPublicSummary(event.target.value);
              if (summaryError && event.target.value.trim().length >= 20) setSummaryError("");
            }}
            rows={4}
            maxLength={2000}
            aria-invalid={Boolean(summaryError) || undefined}
            aria-describedby="public-summary-error"
            placeholder="Write a factual, neutral summary suitable for public display..."
            className={fieldClass(Boolean(summaryError))}
          />
          <div className="flex items-start justify-between gap-3">
            <FieldError id="public-summary-error" message={summaryError} />
            <p className="ml-auto mt-1 shrink-0 text-xs text-gray-400">
              {publicSummary.length}/2000
            </p>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Only this summary—not the original report or internal notes—will
            be displayed publicly.
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
                  action.next === "dismissed"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#c94f00] hover:bg-[#a84300]"
                }`}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
