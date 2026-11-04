"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Area = {
  id: string;
  name: string;
  area_type: string;
  parent_id: string | null;
  publication_status: string;
};

type Props = {
  areas: Area[];
};

const areaTypes = [
  { value: "country", label: "Country" },
  { value: "state", label: "State" },
  { value: "lga", label: "Local Government Area" },
  { value: "ward", label: "Ward" },
  { value: "polling_unit", label: "Polling Unit" },
];

const parentTypes: Record<string, string | null> = {
  country: null,
  state: null,
  lga: "state",
  ward: "lga",
  polling_unit: "ward",
};

export default function AreaForm({ areas }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [areaType, setAreaType] = useState("state");
  const [parentId, setParentId] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("draft");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requiredParentType = parentTypes[areaType];

  const parentOptions = useMemo(
    () =>
      requiredParentType
        ? areas
            .filter(
              (area) =>
                area.area_type === requiredParentType &&
                area.publication_status === "published"
            )
            .sort((a, b) => a.name.localeCompare(b.name))
        : [],
    [areas, requiredParentType]
  );

  function handleTypeChange(value: string) {
    setAreaType(value);
    setParentId("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          area_type: areaType,
          parent_id: parentId || null,
          code,
          publication_status: status,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not save the electoral area.");
      }

      router.push("/admin/electoral-data/areas");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
      setLoading(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 sm:p-7">
      <div>
        <label htmlFor="name" className="text-sm font-medium text-gray-800">
          Area name *
        </label>
        <input
          id="name"
          required
          maxLength={200}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
          placeholder="Enter the official area name"
        />
      </div>

      <div>
        <label htmlFor="area_type" className="text-sm font-medium text-gray-800">
          Area type *
        </label>
        <select
          id="area_type"
          value={areaType}
          onChange={(event) => handleTypeChange(event.target.value)}
          className={inputClass}
        >
          {areaTypes.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      {requiredParentType ? (
        <div>
          <label htmlFor="parent_id" className="text-sm font-medium text-gray-800">
            Parent area *
          </label>
          <select
            id="parent_id"
            required
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
            className={inputClass}
          >
            <option value="">Select parent area</option>
            {parentOptions.map((area) => (
              <option key={area.id} value={area.id}>{area.name}</option>
            ))}
          </select>
          {!parentOptions.length && (
            <p className="mt-1 text-xs text-amber-700">
              No published {requiredParentType} records are available. Add and publish the parent area first.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg bg-orange-50 p-3 text-sm text-gray-700">
          {areaType === "state"
            ? "States are stored without a parent to preserve compatibility with the existing incident-reporting system."
            : "Country records are stored without a parent."}
        </div>
      )}

      <div>
        <label htmlFor="code" className="text-sm font-medium text-gray-800">
          Area code
        </label>
        <input
          id="code"
          maxLength={100}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className={inputClass}
          placeholder="Optional official area code"
        />
      </div>

      <div>
        <label htmlFor="publication_status" className="text-sm font-medium text-gray-800">
          Publication status
        </label>
        <select
          id="publication_status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className={inputClass}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Only published areas are available in public electoral features.
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
          disabled={loading || (!!requiredParentType && !parentOptions.length)}
          className="rounded-lg bg-[#ff6600] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e85d00] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save Electoral Area"}
        </button>
      </div>
    </form>
  );
}
