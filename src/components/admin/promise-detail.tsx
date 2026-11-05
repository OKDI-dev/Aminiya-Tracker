"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";

type PromiseRecord = {
  id: string;
  title: string;
  description: string;
  sector: string;
  source_url: string | null;
  promise_date: string | null;
  target_date: string | null;
  progress_status: string;
  publication_status: string;
};

const sectors = [
  ["education", "Education"],
  ["healthcare", "Healthcare"],
  ["agriculture", "Agriculture"],
  ["infrastructure", "Infrastructure"],
  ["employment", "Employment"],
  ["security", "Security"],
  ["water_sanitation", "Water and sanitation"],
  ["electricity", "Electricity"],
  ["environment", "Environment"],
  ["governance", "Governance"],
  ["youth_development", "Youth development"],
  ["women_development", "Women development"],
  ["social_protection", "Social protection"],
  ["other", "Other"],
];

const statuses = [
  ["draft", "Draft"],
  ["published", "Published"],
  ["archived", "Archived"],
];

export default function PromiseDetail({
  record,
  candidacyLabel,
}: {
  record: PromiseRecord;
  candidacyLabel: string;
}) {
  const router = useRouter();

  const [form, setForm] = useState({
    title: record.title,
    description: record.description,
    sector: record.sector,
    source_url: record.source_url ?? "",
    promise_date: record.promise_date ?? "",
    target_date: record.target_date ?? "",
    publication_status: record.publication_status,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function update(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/promises/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to update promise.");
        return;
      }

      setSuccess("Promise updated successfully.");
      router.refresh();
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-[#ff6600] focus:ring-1 focus:ring-[#ff6600]";

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      <div>
        <p className="text-sm text-gray-500">{candidacyLabel}</p>
        <h1 className="mt-1 text-2xl font-bold text-[#171717]">Manage political promise</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
            Progress: {record.progress_status.replaceAll("_", " ")}
          </span>
          <span className="rounded-full bg-orange-50 px-3 py-1 text-orange-700">
            Publication: {record.publication_status}
          </span>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 sm:p-7">
        <div>
          <label htmlFor="title" className="text-sm font-medium text-gray-800">Promise title</label>
          <input
            id="title"
            required
            minLength={5}
            maxLength={200}
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="description" className="text-sm font-medium text-gray-800">Description</label>
          <textarea
            id="description"
            required
            minLength={20}
            maxLength={10000}
            rows={7}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="sector" className="text-sm font-medium text-gray-800">Sector</label>
          <select
            id="sector"
            required
            value={form.sector}
            onChange={(e) => update("sector", e.target.value)}
            className={fieldClass}
          >
            {sectors.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="promise_date" className="text-sm font-medium text-gray-800">Promise date</label>
            <input
              id="promise_date"
              type="date"
              value={form.promise_date}
              onChange={(e) => update("promise_date", e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="target_date" className="text-sm font-medium text-gray-800">Target date</label>
            <input
              id="target_date"
              type="date"
              min={form.promise_date || undefined}
              value={form.target_date}
              onChange={(e) => update("target_date", e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="source_url" className="text-sm font-medium text-gray-800">Source URL</label>
          <input
            id="source_url"
            type="url"
            value={form.source_url}
            onChange={(e) => update("source_url", e.target.value)}
            placeholder="https://..."
            className={fieldClass}
          />
        </div>

        <div className="rounded-lg border border-orange-100 bg-orange-50/60 p-4">
          <label htmlFor="publication_status" className="text-sm font-semibold text-gray-800">
            Publication status
          </label>
          <select
            id="publication_status"
            value={form.publication_status}
            onChange={(e) => update("publication_status", e.target.value)}
            className={fieldClass}
          >
            {statuses.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-gray-600">
            Published promises become visible on the public tracker, provided their associated candidacy, candidate and election are also published.
          </p>
        </div>

        <div className="flex justify-end border-t border-gray-100 pt-5">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff6600] px-5 py-3 text-sm font-semibold text-white hover:bg-[#e85d00] disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
