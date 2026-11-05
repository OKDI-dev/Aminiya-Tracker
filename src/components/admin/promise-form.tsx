"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Save } from "lucide-react";

type CandidacyOption = {
  id: string;
  label: string;
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

export default function PromiseForm({
  candidacies,
}: {
  candidacies: CandidacyOption[];
}) {
  const router = useRouter();

  const [form, setForm] = useState({
    candidacy_id: "",
    title: "",
    description: "",
    sector: "",
    source_url: "",
    promise_date: "",
    target_date: "",
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const response = await fetch("/api/admin/promises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to register promise.");
        return;
      }

      router.push(`/admin/promises/${result.id}`);
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
        <h1 className="text-2xl font-bold text-[#171717]">Register a political promise</h1>
        <p className="mt-2 text-sm text-gray-600">
          Record a verifiable commitment made by a candidate. New records are saved as drafts.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {candidacies.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="font-medium text-gray-900">No published candidacies available.</p>
          <p className="mt-2 text-sm text-gray-600">
            Publish an election, candidate and candidacy before registering promises.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 sm:p-7">
          <div>
            <label htmlFor="candidacy_id" className="text-sm font-medium text-gray-800">
              Candidate and election <span className="text-red-600">*</span>
            </label>
            <select
              id="candidacy_id"
              required
              value={form.candidacy_id}
              onChange={(e) => update("candidacy_id", e.target.value)}
              className={fieldClass}
            >
              <option value="">Select a candidacy</option>
              {candidacies.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="title" className="text-sm font-medium text-gray-800">
              Promise title <span className="text-red-600">*</span>
            </label>
            <input
              id="title"
              required
              minLength={5}
              maxLength={200}
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Improve access to primary healthcare"
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="description" className="text-sm font-medium text-gray-800">
              Promise description <span className="text-red-600">*</span>
            </label>
            <textarea
              id="description"
              required
              minLength={20}
              maxLength={10000}
              rows={6}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Describe the commitment and include enough context to make it understandable and verifiable."
              className={fieldClass}
            />
            <p className="mt-1 text-xs text-gray-500">{form.description.length}/10,000 characters</p>
          </div>

          <div>
            <label htmlFor="sector" className="text-sm font-medium text-gray-800">
              Sector <span className="text-red-600">*</span>
            </label>
            <select
              id="sector"
              required
              value={form.sector}
              onChange={(e) => update("sector", e.target.value)}
              className={fieldClass}
            >
              <option value="">Select a sector</option>
              {sectors.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="promise_date" className="text-sm font-medium text-gray-800">
                Date promise was made
              </label>
              <input
                id="promise_date"
                type="date"
                value={form.promise_date}
                onChange={(e) => update("promise_date", e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="target_date" className="text-sm font-medium text-gray-800">
                Target completion date
              </label>
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
            <label htmlFor="source_url" className="text-sm font-medium text-gray-800">
              Source URL
            </label>
            <input
              id="source_url"
              type="url"
              value={form.source_url}
              onChange={(e) => update("source_url", e.target.value)}
              placeholder="https://..."
              className={fieldClass}
            />
            <p className="mt-1 text-xs text-gray-500">
              Link to a manifesto, speech, interview, publication or other supporting source.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
            <Link
              href="/admin/promises"
              className="rounded-lg border border-gray-300 px-5 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff6600] px-5 py-3 text-sm font-semibold text-white hover:bg-[#e85d00] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Saving..." : "Save as draft"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
