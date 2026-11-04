"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Election = {
  id: string;
  name: string;
  election_type: string;
};

type Area = {
  id: string;
  name: string;
  area_type: string;
  parent_id: string | null;
  publication_status: string;
};

type Option = {
  id: string;
  name: string;
};

type Position = {
  value: string;
  label: string;
  electionTypes: string[];
  areaType: string | null;
};

type Props = {
  elections: Election[];
  candidates: Option[];
  parties: Option[];
  areas: Area[];
};

const positions: Position[] = [
  {
    value: "President",
    label: "President",
    electionTypes: ["presidential"],
    areaType: null,
  },
  {
    value: "Governor",
    label: "Governor",
    electionTypes: ["governorship"],
    areaType: "state",
  },
  {
    value: "Senator",
    label: "Senator",
    electionTypes: ["senate"],
    areaType: "senatorial_district",
  },
  {
    value: "Member, House of Representatives",
    label: "Member, House of Representatives",
    electionTypes: ["house_of_representatives"],
    areaType: "federal_constituency",
  },
  {
    value: "Member, State House of Assembly",
    label: "Member, State House of Assembly",
    electionTypes: ["state_assembly"],
    areaType: "state_constituency",
  },
  {
    value: "Local Government Chairman",
    label: "Local Government Chairman",
    electionTypes: ["local_government"],
    areaType: "lga",
  },
  {
    value: "Councillor",
    label: "Councillor",
    electionTypes: ["local_government"],
    areaType: "ward",
  },
];

export default function CandidacyForm({
  elections,
  candidates,
  parties,
  areas,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [electionId, setElectionId] = useState("");
  const [position, setPosition] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [selectedLgaId, setSelectedLgaId] = useState("");
  const [otherPosition, setOtherPosition] = useState("");

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100";

  const selectedElection = elections.find(
    (item) => item.id === electionId
  );

  const availablePositions = positions.filter(
    (item) =>
      !selectedElection ||
      item.electionTypes.includes(selectedElection.election_type)
  );

  const selectedPosition = positions.find(
    (item) => item.value === position
  );

  const publishedAreas = areas.filter(
    (item) => item.publication_status === "published"
  );

  const gombeState = publishedAreas.find(
    (item) =>
      item.area_type === "state" &&
      item.name.toLowerCase() === "gombe"
  );

  const availableAreas = useMemo(() => {
    if (!selectedPosition?.areaType) return [];

    if (selectedPosition.areaType === "state") {
      return gombeState ? [gombeState] : [];
    }

    if (selectedPosition.areaType === "ward") {
      return publishedAreas.filter(
        (item) =>
          item.area_type === "ward" &&
          item.parent_id === selectedLgaId
      );
    }

    return publishedAreas.filter(
      (item) =>
        item.area_type === selectedPosition.areaType &&
        item.parent_id === gombeState?.id
    );
  }, [
    selectedPosition,
    publishedAreas,
    gombeState,
    selectedLgaId,
  ]);

  const effectiveAreaId =
    position === "President"
      ? ""
      : selectedPosition?.areaType === "state"
        ? gombeState?.id ?? ""
        : selectedAreaId;

  const lgas = publishedAreas.filter(
    (item) =>
      item.area_type === "lga" &&
      item.parent_id === gombeState?.id
  );

  function handleElectionChange(value: string) {
    setElectionId(value);
    setPosition("");
    setSelectedAreaId("");
    setSelectedLgaId("");
    setError("");
  }

  function handlePositionChange(value: string) {
    setPosition(value);
    setSelectedAreaId("");
    setSelectedLgaId("");
    setOtherPosition("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);

    const officeTitle =
      position === "Other"
        ? otherPosition.trim()
        : position;

    if (!officeTitle) {
      setError("Select or enter an office or position.");
      setLoading(false);
      return;
    }

    if (selectedPosition?.areaType && !effectiveAreaId) {
      setError("Select the required electoral area.");
      setLoading(false);
      return;
    }

    if (position === "Councillor" && !selectedLgaId) {
      setError("Select the Local Government Area first.");
      setLoading(false);
      return;
    }

    const payload = {
      election_id: electionId,
      candidate_id: String(formData.get("candidate_id") ?? ""),
      party_id: String(formData.get("party_id") ?? "") || null,
      electoral_area_id: effectiveAreaId || null,
      office_title: officeTitle,
      ballot_number: String(formData.get("ballot_number") ?? "").trim() || null,
      manifesto_url: String(formData.get("manifesto_url") ?? "").trim() || null,
      publication_status: String(formData.get("publication_status") ?? "draft"),
    };

    try {
      const response = await fetch("/api/admin/candidacies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not save the candidacy.");
      }

      router.push("/admin/electoral-data/candidacies");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred."
      );
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 sm:p-7"
    >
      <div>
        <label htmlFor="election_id" className="text-sm font-medium text-gray-800">
          Election *
        </label>
        <select
          id="election_id"
          name="election_id"
          required
          value={electionId}
          onChange={(event) => handleElectionChange(event.target.value)}
          className={inputClass}
        >
          <option value="">Select an election</option>
          {elections.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        {!elections.length && (
          <p className="mt-1 text-xs text-red-600">
            Add an election before creating a candidacy.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="candidate_id" className="text-sm font-medium text-gray-800">
          Candidate *
        </label>
        <select
          id="candidate_id"
          name="candidate_id"
          required
          defaultValue=""
          className={inputClass}
        >
          <option value="">Select a candidate</option>
          {candidates.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="office_title" className="text-sm font-medium text-gray-800">
          Office or position contested *
        </label>
        <select
          id="office_title"
          name="office_title"
          required
          value={position}
          onChange={(event) => handlePositionChange(event.target.value)}
          disabled={!electionId}
          className={inputClass}
        >
          <option value="">
            {electionId ? "Select a position" : "Select an election first"}
          </option>
          {availablePositions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
          <option value="Other">Other</option>
        </select>
        {position === "Other" && (
          <input
            value={otherPosition}
            onChange={(event) => setOtherPosition(event.target.value)}
            maxLength={200}
            required
            className={inputClass}
            placeholder="Enter the position"
          />
        )}
      </div>

      {selectedPosition?.areaType === "state" && (
        <div>
          <label className="text-sm font-medium text-gray-800">
            Election area
          </label>
          <input
            readOnly
            value={gombeState?.name ?? "Gombe State record unavailable"}
            className={`${inputClass} bg-gray-50`}
          />
          <p className="mt-1 text-xs text-gray-500">
            The governorship contest covers the entire state.
          </p>
        </div>
      )}

      {selectedPosition?.areaType === "senatorial_district" && (
        <div>
          <label htmlFor="electoral_area_id" className="text-sm font-medium text-gray-800">
            Senatorial district *
          </label>
          <select
            id="electoral_area_id"
            value={selectedAreaId}
            onChange={(event) => setSelectedAreaId(event.target.value)}
            required
            className={inputClass}
          >
            <option value="">Select a senatorial district</option>
            {availableAreas.map((area) => (
              <option key={area.id} value={area.id}>{area.name}</option>
            ))}
          </select>
          {!availableAreas.length && (
            <p className="mt-1 text-xs text-amber-700">
              No published senatorial districts are available.
            </p>
          )}
        </div>
      )}

      {selectedPosition?.areaType === "federal_constituency" && (
        <div>
          <label htmlFor="electoral_area_id" className="text-sm font-medium text-gray-800">
            Federal constituency *
          </label>
          <select
            id="electoral_area_id"
            value={selectedAreaId}
            onChange={(event) => setSelectedAreaId(event.target.value)}
            required
            className={inputClass}
          >
            <option value="">Select a federal constituency</option>
            {availableAreas.map((area) => (
              <option key={area.id} value={area.id}>{area.name}</option>
            ))}
          </select>
          {!availableAreas.length && (
            <p className="mt-1 text-xs text-amber-700">
              No published federal constituencies are available.
            </p>
          )}
        </div>
      )}

      {selectedPosition?.areaType === "state_constituency" && (
        <div>
          <label htmlFor="electoral_area_id" className="text-sm font-medium text-gray-800">
            State constituency *
          </label>
          <select
            id="electoral_area_id"
            value={selectedAreaId}
            onChange={(event) => setSelectedAreaId(event.target.value)}
            required
            className={inputClass}
          >
            <option value="">Select a state constituency</option>
            {availableAreas.map((area) => (
              <option key={area.id} value={area.id}>{area.name}</option>
            ))}
          </select>
          {!availableAreas.length && (
            <p className="mt-1 text-xs text-amber-700">
              State constituency records have not yet been added and published.
            </p>
          )}
        </div>
      )}

      {selectedPosition?.areaType === "lga" && (
        <div>
          <label htmlFor="electoral_area_id" className="text-sm font-medium text-gray-800">
            Local Government Area *
          </label>
          <select
            id="electoral_area_id"
            value={selectedAreaId}
            onChange={(event) => setSelectedAreaId(event.target.value)}
            required
            className={inputClass}
          >
            <option value="">Select an LGA</option>
            {availableAreas.map((area) => (
              <option key={area.id} value={area.id}>{area.name}</option>
            ))}
          </select>
        </div>
      )}

      {selectedPosition?.areaType === "ward" && (
        <div className="space-y-4">
          <div>
            <label htmlFor="lga_id" className="text-sm font-medium text-gray-800">
              Local Government Area *
            </label>
            <select
              id="lga_id"
              value={selectedLgaId}
              onChange={(event) => {
                setSelectedLgaId(event.target.value);
                setSelectedAreaId("");
              }}
              required
              className={inputClass}
            >
              <option value="">Select an LGA</option>
              {lgas.map((area) => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="electoral_area_id" className="text-sm font-medium text-gray-800">
              Ward *
            </label>
            <select
              id="electoral_area_id"
              value={selectedAreaId}
              onChange={(event) => setSelectedAreaId(event.target.value)}
              required
              disabled={!selectedLgaId}
              className={inputClass}
            >
              <option value="">Select a ward</option>
              {availableAreas.map((area) => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {position === "President" && (
        <p className="rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
          Presidential candidacies are national contests and do not require a
          state or constituency selection.
        </p>
      )}

      <input type="hidden" name="electoral_area_id" value={effectiveAreaId} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="party_id" className="text-sm font-medium text-gray-800">
            Political party
          </label>
          <select id="party_id" name="party_id" defaultValue="" className={inputClass}>
            <option value="">Not specified / Independent</option>
            {parties.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ballot_number" className="text-sm font-medium text-gray-800">
            Ballot number
          </label>
          <input
            id="ballot_number"
            name="ballot_number"
            maxLength={50}
            className={inputClass}
            placeholder="Optional"
          />
        </div>
      </div>

      <div>
        <label htmlFor="publication_status" className="text-sm font-medium text-gray-800">
          Publication status
        </label>
        <select
          id="publication_status"
          name="publication_status"
          defaultValue="draft"
          className={inputClass}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div>
        <label htmlFor="manifesto_url" className="text-sm font-medium text-gray-800">
          Candidacy manifesto URL
        </label>
        <input
          id="manifesto_url"
          name="manifesto_url"
          type="url"
          maxLength={2048}
          className={inputClass}
          placeholder="https://..."
        />
        <p className="mt-1 text-xs text-gray-500">
          Optional link to the candidate&apos;s manifesto for this election.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !elections.length || !candidates.length}
          className="rounded-lg bg-[#ff6600] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e85d00] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save Candidacy"}
        </button>
      </div>
    </form>
  );
}
