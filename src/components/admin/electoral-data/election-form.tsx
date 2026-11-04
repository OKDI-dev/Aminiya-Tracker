"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const electionTypes = [
  ["presidential", "Presidential"],
  ["governorship", "Governorship"],
  ["senate", "Senate"],
  ["house_of_representatives", "House of Representatives"],
  ["state_assembly", "State Assembly"],
  ["local_government", "Local Government"],
  ["other", "Other"],
];

export default function ElectionForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      election_type: String(formData.get("election_type") ?? ""),
      election_date: String(formData.get("election_date") ?? "") || null,
      jurisdiction: String(formData.get("jurisdiction") ?? "").trim(),
      official_source_url: String(formData.get("official_source_url") ?? "").trim() || null,
      publication_status: String(formData.get("publication_status") ?? "draft"),
    };

    try {
      const response = await fetch("/api/admin/elections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not save the election.");
      }

      router.push("/admin/electoral-data/elections");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setLoading(false);
    }
  }

  const inputClass = "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 sm:p-7">
      <div>
        <label htmlFor="name" className="text-sm font-medium text-gray-800">Election name *</label>
        <input id="name" name="name" required maxLength={200} className={inputClass} placeholder="e.g. 2027 Gombe State Governorship Election" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="election_type" className="text-sm font-medium text-gray-800">Election type *</label>
          <select id="election_type" name="election_type" required className={inputClass} defaultValue="">
            <option value="" disabled>Select election type</option>
            {electionTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="election_date" className="text-sm font-medium text-gray-800">Election date</label>
          <input id="election_date" name="election_date" type="date" className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="jurisdiction" className="text-sm font-medium text-gray-800">Jurisdiction *</label>
        <input id="jurisdiction" name="jurisdiction" required maxLength={150} defaultValue="Nigeria" className={inputClass} placeholder="e.g. Gombe State, Nigeria" />
        <p className="mt-1 text-xs text-gray-500">Specify the geographic area covered by this election.</p>
      </div>

      <div>
        <label htmlFor="official_source_url" className="text-sm font-medium text-gray-800">Official source URL</label>
        <input id="official_source_url" name="official_source_url" type="url" maxLength={2048} className={inputClass} placeholder="https://..." />
      </div>

      <div>
        <label htmlFor="publication_status" className="text-sm font-medium text-gray-800">Publication status</label>
        <select id="publication_status" name="publication_status" defaultValue="draft" className={inputClass}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">Only published elections are visible to the public.</p>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
        <button type="button" onClick={() => router.back()} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="rounded-lg bg-[#ff6600] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e85d00] disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? "Saving..." : "Save Election"}
        </button>
      </div>
    </form>
  );
}
