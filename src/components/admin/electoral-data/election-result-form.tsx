"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Candidate = { id: string; full_name: string };
type Party = { id: string; name: string; acronym: string | null };
type Area = {
  id: string;
  name: string;
  area_type: string;
  parent_id: string | null;
};
type Source = {
  id: string;
  title: string;
  publisher: string;
  verification_status: string;
};
type Election = { id: string; name: string; election_date: string | null };

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-800 outline-none focus:border-[#ff6600]";

export default function ElectionResultForm({
  elections,
  candidates,
  parties,
  areas,
  sources,
}: {
  elections: Election[];
  candidates: Candidate[];
  parties: Party[];
  areas: Area[];
  sources: Source[];
}) {
  const router = useRouter();
  const [electionId, setElectionId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [partyId, setPartyId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [resultType, setResultType] = useState<"provisional" | "official">("provisional");
  const [publicationStatus, setPublicationStatus] = useState("draft");
  const [votes, setVotes] = useState("");
  const [registered, setRegistered] = useState("");
  const [accredited, setAccredited] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedArea = areas.find((area) => area.id === areaId);

  const availableAreas = useMemo(() => {
    return areas.filter((area) => {
      if (area.area_type === "country") return true;
      return true;
    });
  }, [areas]);

  const accreditedExceedsRegistered =
    registered !== "" &&
    accredited !== "" &&
    Number(accredited) > Number(registered);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!electionId || !areaId) {
      setError("Select an election and electoral area.");
      return;
    }

    if (!candidateId && !partyId) {
      setError("Select at least a candidate or a political party.");
      return;
    }

    if (votes === "" || !Number.isSafeInteger(Number(votes)) || Number(votes) < 0) {
      setError("Enter a valid non-negative whole number for votes.");
      return;
    }

    if (registered !== "" && (!Number.isSafeInteger(Number(registered)) || Number(registered) < 0)) {
      setError("Registered voters must be a non-negative whole number.");
      return;
    }

    if (accredited !== "" && (!Number.isSafeInteger(Number(accredited)) || Number(accredited) < 0)) {
      setError("Accredited voters must be a non-negative whole number.");
      return;
    }

    if (accreditedExceedsRegistered) {
      setError("Accredited voters cannot exceed registered voters.");
      return;
    }

    if (publicationStatus !== "draft" && !sourceId) {
      setError("Attach a source before submitting a result for verification or publication.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/election-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          election_id: electionId,
          electoral_area_id: areaId,
          candidate_id: candidateId || null,
          party_id: partyId || null,
          votes_count: Number(votes),
          registered_voters: registered === "" ? null : Number(registered),
          accredited_voters: accredited === "" ? null : Number(accredited),
          result_type: resultType,
          source_id: sourceId || null,
          publication_status: publicationStatus,
          verification_notes: notes.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to save this result.");
      }

      router.push("/admin/electoral-data/results");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 sm:p-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-gray-800">
          Election *
          <select
            required
            value={electionId}
            onChange={(event) => setElectionId(event.target.value)}
            className={inputClass}
          >
            <option value="">Select election</option>
            {elections.map((election) => (
              <option key={election.id} value={election.id}>
                {election.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-gray-800">
          Electoral area *
          <select
            required
            value={areaId}
            onChange={(event) => setAreaId(event.target.value)}
            className={inputClass}
          >
            <option value="">Select electoral area</option>
            {availableAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name} ({area.area_type.replaceAll("_", " ")})
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedArea && (
        <p className="text-xs text-gray-500">
          Selected area: {selectedArea.name} · {selectedArea.area_type.replaceAll("_", " ")}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-gray-800">
          Candidate
          <select
            value={candidateId}
            onChange={(event) => setCandidateId(event.target.value)}
            className={inputClass}
          >
            <option value="">No candidate selected</option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.full_name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-gray-800">
          Political party
          <select
            value={partyId}
            onChange={(event) => setPartyId(event.target.value)}
            className={inputClass}
          >
            <option value="">No party selected</option>
            {parties.map((party) => (
              <option key={party.id} value={party.id}>
                {party.name}{party.acronym ? ` (${party.acronym})` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-xs text-gray-500">
        Select a candidate, a party, or both. At least one is required.
      </p>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="text-sm font-medium text-gray-800">
          Votes received *
          <input
            required
            type="number"
            min="0"
            step="1"
            value={votes}
            onChange={(event) => setVotes(event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="text-sm font-medium text-gray-800">
          Registered voters
          <input
            type="number"
            min="0"
            step="1"
            value={registered}
            onChange={(event) => setRegistered(event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="text-sm font-medium text-gray-800">
          Accredited voters
          <input
            type="number"
            min="0"
            step="1"
            value={accredited}
            onChange={(event) => setAccredited(event.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-gray-800">
          Result classification *
          <select
            value={resultType}
            onChange={(event) => setResultType(event.target.value as "provisional" | "official")}
            className={inputClass}
          >
            <option value="provisional">Provisional</option>
            <option value="official">Official</option>
          </select>
        </label>

        <label className="text-sm font-medium text-gray-800">
          Initial status *
          <select
            value={publicationStatus}
            onChange={(event) => setPublicationStatus(event.target.value)}
            className={inputClass}
          >
            <option value="draft">Draft</option>
            <option value="verified">Verified</option>
          </select>
        </label>
      </div>

      <label className="block text-sm font-medium text-gray-800">
        Supporting electoral source
        <select
          value={sourceId}
          onChange={(event) => setSourceId(event.target.value)}
          className={inputClass}
        >
          <option value="">No source selected</option>
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.title} — {source.publisher} ({source.verification_status})
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-gray-800">
        Verification notes
        <textarea
          rows={4}
          maxLength={5000}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className={inputClass}
          placeholder="Record the source details, verification observations or relevant context."
        />
      </label>

      {publicationStatus !== "draft" && (
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
          A source is required when creating a result directly in verified status.
          You can save it as a draft and verify it later.
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || accreditedExceedsRegistered}
          className="rounded-lg bg-[#ff6600] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e85d00] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save result"}
        </button>
      </div>
    </form>
  );
}
