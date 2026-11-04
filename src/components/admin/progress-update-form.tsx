"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Send, Upload, X, FileText } from "lucide-react";

type PromiseOption = {
  id: string;
  title: string;
};

type SourceOption = {
  id: string;
  title: string;
};

const statuses = [
  ["not_started", "Not started"],
  ["in_progress", "In progress"],
  ["partially_fulfilled", "Partially fulfilled"],
  ["fulfilled", "Fulfilled"],
  ["stalled", "Stalled"],
];

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export default function ProgressUpdateForm({
  promises,
  sources,
  selectedPromiseId = "",
}: {
  promises: PromiseOption[];
  sources: SourceOption[];
  selectedPromiseId?: string;
}) {
  const router = useRouter();

  const [form, setForm] = useState({
    promise_id: selectedPromiseId,
    update_title: "",
    update_description: "",
    progress_status: "in_progress",
    evidence_url: "",
    source_id: "",
    update_date: new Date().toISOString().slice(0, 10),
  });

  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [createdUpdateId, setCreatedUpdateId] = useState("");

  function update(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleFileSelection(selected: FileList | null) {
    if (!selected) return;

    const incoming = Array.from(selected);

    if (incoming.length > MAX_FILES) {
      setError("Select no more than 5 evidence files.");
      return;
    }

    for (const file of incoming) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`${file.name}: only JPEG, PNG, WebP and PDF files are accepted.`);
        return;
      }

      if (file.size < 1 || file.size > MAX_FILE_SIZE) {
        setError(`${file.name}: each file must be between 1 byte and 10 MB.`);
        return;
      }
    }

    setError("");
    setFiles(incoming);
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  async function uploadEvidence(updateId: string) {
    if (files.length === 0) {
      router.push("/admin/promise-updates");
      router.refresh();
      return;
    }

    const uploadData = new FormData();
    uploadData.append("update_id", updateId);

    files.forEach((file) => {
      uploadData.append("files", file);
    });

    const uploadResponse = await fetch(
      "/api/admin/promise-updates/evidence",
      {
        method: "POST",
        body: uploadData,
      }
    );

    const uploadResult = await uploadResponse.json();

    if (!uploadResponse.ok) {
      throw new Error(
        uploadResult.error || "The progress update was created, but evidence upload failed. Please retry."
      );
    }

    router.push("/admin/promise-updates");
    router.refresh();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      // If the update already exists, retry only the evidence upload.
      if (createdUpdateId) {
        await uploadEvidence(createdUpdateId);
        return;
      }

      const response = await fetch("/api/admin/promise-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to submit progress update.");
        return;
      }

      const updateId = result.update?.id || result.id;

      if (!updateId) {
        setError("The update was created, but the server did not return its ID. Please contact an administrator before retrying.");
        return;
      }

      setCreatedUpdateId(updateId);

      if (files.length > 0) {
        await uploadEvidence(updateId);
      } else {
        router.push("/admin/promise-updates");
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "A network error occurred. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-[#ff6600] focus:ring-1 focus:ring-[#ff6600]";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/promise-updates"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#ff6600]"
      >
        <ArrowLeft size={16} /> Back
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-[#171717]">
          Submit progress update
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Record evidence of progress or challenges relating to a published political promise.
          The update will require review before it changes the public tracker.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
          {createdUpdateId && (
            <p className="mt-2 font-medium">
              Your progress update has already been created and remains pending.
              You can retry the evidence upload below.
            </p>
          )}
        </div>
      )}

      {promises.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          No published promises are available. Publish a promise first.
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 sm:p-7"
        >
          <div>
            <label htmlFor="promise_id" className="text-sm font-medium text-gray-800">
              Political promise *
            </label>
            <select
              id="promise_id"
              required
              disabled={!!createdUpdateId || saving}
              value={form.promise_id}
              onChange={(e) => update("promise_id", e.target.value)}
              className={fieldClass}
            >
              <option value="">Select a promise</option>
              {promises.map((promise) => (
                <option key={promise.id} value={promise.id}>
                  {promise.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="update_title" className="text-sm font-medium text-gray-800">
              Update title *
            </label>
            <input
              id="update_title"
              required
              minLength={5}
              maxLength={200}
              disabled={!!createdUpdateId || saving}
              value={form.update_title}
              onChange={(e) => update("update_title", e.target.value)}
              placeholder="e.g. Construction commenced at the project site"
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="update_description" className="text-sm font-medium text-gray-800">
              Evidence and progress description *
            </label>
            <textarea
              id="update_description"
              required
              minLength={20}
              maxLength={10000}
              rows={7}
              disabled={!!createdUpdateId || saving}
              value={form.update_description}
              onChange={(e) => update("update_description", e.target.value)}
              placeholder="Describe what happened, when it happened, where it happened and what evidence supports this update."
              className={fieldClass}
            />
            <p className="mt-1 text-xs text-gray-500">
              {form.update_description.length}/10,000 characters
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="progress_status" className="text-sm font-medium text-gray-800">
                Reported progress status *
              </label>
              <select
                id="progress_status"
                required
                disabled={!!createdUpdateId || saving}
                value={form.progress_status}
                onChange={(e) => update("progress_status", e.target.value)}
                className={fieldClass}
              >
                {statuses.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="update_date" className="text-sm font-medium text-gray-800">
                Date of update *
              </label>
              <input
                id="update_date"
                type="date"
                required
                disabled={!!createdUpdateId || saving}
                value={form.update_date}
                onChange={(e) => update("update_date", e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="evidence_url" className="text-sm font-medium text-gray-800">
              Public evidence URL
            </label>
            <input
              id="evidence_url"
              type="url"
              disabled={!!createdUpdateId || saving}
              value={form.evidence_url}
              onChange={(e) => update("evidence_url", e.target.value)}
              placeholder="https://..."
              className={fieldClass}
            />
            <p className="mt-2 text-xs leading-5 text-gray-500">
              Enter a publicly accessible HTTPS link, such as a published
              report, news article or official project page. Do not enter
              private storage links, signed download links or confidential
              documents.
            </p>
          </div>

          <div>
            <label htmlFor="source_id" className="text-sm font-medium text-gray-800">
              Verified electoral source (optional)
            </label>
            <select
              id="source_id"
              disabled={!!createdUpdateId || saving}
              value={form.source_id}
              onChange={(e) => update("source_id", e.target.value)}
              className={fieldClass}
            >
              <option value="">No linked source</option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 p-4">
            <div>
              <label
                htmlFor="evidence_files"
                className="flex items-center gap-2 text-sm font-semibold text-gray-800"
              >
                <Upload size={17} className="text-[#ff6600]" />
                Attach evidence files (optional)
              </label>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Up to 5 files per progress update. JPEG, PNG, WebP or PDF.
                Maximum 10 MB per file. Files remain private unless separately
                approved for public release.
              </p>
            </div>

            <input
              id="evidence_files"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              disabled={saving}
              onChange={(e) => handleFileSelection(e.target.files)}
              className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 file:px-4 file:py-2 file:font-medium file:text-[#e85d00] hover:file:bg-orange-100 disabled:opacity-60"
            />

            {files.length > 0 && (
              <ul className="space-y-2">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText size={16} className="shrink-0 text-gray-500" />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-gray-800">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => removeFile(index)}
                      aria-label={`Remove ${file.name}`}
                      className="rounded p-1 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {createdUpdateId && (
              <p className="text-xs font-medium text-orange-700">
                Progress update created. You are now completing its evidence upload.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-orange-100 bg-orange-50 p-4 text-sm text-gray-700">
            This submission will remain pending until an electoral reviewer approves or rejects it.
          </div>

          <div className="flex justify-end border-t border-gray-100 pt-5">
            <button
              type="submit"
              disabled={saving || (!!createdUpdateId && files.length === 0)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff6600] px-5 py-3 text-sm font-semibold text-white hover:bg-[#e85d00] disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : createdUpdateId ? (
                <Upload size={16} />
              ) : (
                <Send size={16} />
              )}
              {saving
                ? createdUpdateId
                  ? "Uploading evidence..."
                  : "Submitting..."
                : createdUpdateId
                  ? "Retry evidence upload"
                  : "Submit for review"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
