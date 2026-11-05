"use client";

import { useStatusMutation } from "@/components/admin/use-status-mutation";

type Status = "draft" | "published" | "archived";
type Table = "elections" | "candidates" | "political_parties" | "electoral_areas" | "candidacies";

type Props = {
  table: Table;
  id: string;
  status: Status;
};

const nouns: Record<Table, string> = {
  elections: "Election",
  candidates: "Candidate",
  political_parties: "Party",
  electoral_areas: "Area",
  candidacies: "Candidacy",
};


export default function StatusActions({ table, id, status }: Props) {
  const { current, change } = useStatusMutation({
    statusKey: `${table}:${id}`,
    status,
    noun: nouns[table],
    send: (nextStatus) =>
      fetch("/api/admin/electoral-data/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, id, status: nextStatus }),
      }),
  });

  const buttonClass =
    "rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:border-[#ff6600] hover:text-[#e85d00]";

  return (
    <div className="flex min-w-[150px] flex-wrap gap-2">
      {current === "draft" && (
        <button
          type="button"
          onClick={() => change("published")}
          className="rounded-md bg-[#ff6600] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#e85d00]"
        >
          Publish
        </button>
      )}

      {current === "published" && (
        <>
          <button type="button" onClick={() => change("draft")} className={buttonClass}>
            Return to Draft
          </button>
          <button type="button" onClick={() => change("archived")} className={buttonClass}>
            Archive
          </button>
        </>
      )}

      {current === "archived" && (
        <button type="button" onClick={() => change("draft")} className={buttonClass}>
          Restore to Draft
        </button>
      )}
    </div>
  );
}
