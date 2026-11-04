"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-800 outline-none focus:border-[#ff6600]";

type Source = {
  id: string;
  title: string;
  publisher: string;
  source_url: string | null;
  source_type: string;
  publication_date: string | null;
  notes: string | null;
  verification_status: string;
};

export default function ElectoralSourceForm({
  source,
}: {
  source?: Source;
}) {
  const router = useRouter();
  const editing = Boolean(source);

  const [title, setTitle] = useState(source?.title ?? "");
  const [publisher, setPublisher] = useState(source?.publisher ?? "");
  const [sourceUrl, setSourceUrl] = useState(source?.source_url ?? "");
  const [sourceType, setSourceType] = useState(source?.source_type ?? "inec");
  const [publicationDate, setPublicationDate] = useState(
    source?.publication_date ?? ""
  );
  const [notes, setNotes] = useState(source?.notes ?? "");
  const [verificationStatus] = useState(source?.verification_status ?? "pending");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const response = await fetch(
        editing
          ? `/api/admin/electoral-sources/${source!.id}`
          : "/api/admin/electoral-sources",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            publisher: publisher.trim(),
            source_url: sourceUrl.trim() || null,
            source_type: sourceType,
            publication_date: publicationDate || null,
            notes: notes.trim() || null,
            ...(editing ? {} : { verification_status: verificationStatus }),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to save source.");
      }

      router.push("/admin/electoral-data/sources");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 sm:p-7"
    >
      <label className="block text-sm font-medium text-gray-800">
        Source title *
        <input
          required
          maxLength={300}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={inputClass}
          placeholder="e.g. Gombe State Governorship Election Results"
        />
      </label>

      <label className="block text-sm font-medium text-gray-800">
        Publisher / issuing organisation *
        <input
          required
          maxLength={200}
          value={publisher}
          onChange={(event) => setPublisher(event.target.value)}
          className={inputClass}
          placeholder="e.g. Independent National Electoral Commission"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-800">
          Source type *
          <select
            required
            value={sourceType}
            onChange={(event) => setSourceType(event.target.value)}
            className={inputClass}
          >
            <option value="inec">INEC</option>
            <option value="government">Government</option>
            <option value="observer">Election observer</option>
            <option value="media">Media</option>
            <option value="research">Research</option>
            <option value="community">Community</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="block text-sm font-medium text-gray-800">
          Publication date
          <input
            type="date"
            value={publicationDate}
            onChange={(event) => setPublicationDate(event.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-gray-800">
        Source URL
        <input
          type="url"
          maxLength={2000}
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
          className={inputClass}
          placeholder="https://..."
        />
      </label>

      {!editing && (
        <label className="block text-sm font-medium text-gray-800">
          Initial verification status
          <select
            value={verificationStatus}
            disabled
            className={inputClass}
          >
            <option value="pending">Pending review</option>
          </select>
          <span className="mt-1 block text-xs text-gray-500">
            New sources enter the pending review process.
          </span>
        </label>
      )}

      {editing && (
        <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          Current verification status:{" "}
          <strong className="capitalize">{verificationStatus}</strong>.
          Use the verification controls on the sources list to change it.
        </div>
      )}

      <label className="block text-sm font-medium text-gray-800">
        Notes
        <textarea
          rows={4}
          maxLength={5000}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className={inputClass}
          placeholder="Describe the document, its origin, relevance or verification observations."
        />
      </label>

      <p className="rounded-lg bg-orange-50 p-3 text-xs leading-5 text-orange-900">
        Only mark a source as verified after checking that it is authentic,
        attributable to the stated publisher and relevant to the information it supports.
      </p>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#ff6600] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e85d00] disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : editing
              ? "Save changes"
              : "Register source"}
        </button>
      </div>
    </form>
  );
}
