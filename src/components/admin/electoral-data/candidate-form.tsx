"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CandidateInitial = {
  id: string;
  full_name: string;
  biography: string | null;
  photo_url: string | null;
  official_profile_url: string | null;
  publication_status: string;
};

export default function CandidateForm({
  initialCandidate,
}: {
  initialCandidate?: CandidateInitial;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(initialCandidate?.photo_url ?? "");
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setPreview("");
      setFileName("");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Choose a JPG, PNG or WebP image.");
      event.target.value = "";
      setPreview("");
      setFileName("");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("The image must not exceed 5 MB.");
      event.target.value = "";
      setPreview("");
      setFileName("");
      return;
    }

    setError("");
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const file = formData.get("photo");
    if (!(file instanceof File) || file.size === 0) {
      formData.delete("photo");
    }

    try {
      const response = await fetch(
        initialCandidate
          ? `/api/admin/candidates/${initialCandidate.id}`
          : "/api/admin/candidates",
        {
          method: initialCandidate ? "PATCH" : "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not save the candidate.");
      }

      router.push("/admin/electoral-data/candidates");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setLoading(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-line bg-paper-raised px-3 py-2.5 text-sm text-ink outline-none focus:border-signal focus:ring-2 focus:ring-signal/20";

  return (
    <form
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      className="space-y-5 rounded-xl border border-line-soft bg-paper-raised p-5 sm:p-7"
    >
      <div>
        <label htmlFor="full_name" className="text-sm font-medium text-ink">
          Full name *
        </label>
        <input
          id="full_name"
          name="full_name"
          required
          maxLength={200}
          className={inputClass}
          placeholder="Enter candidate's full name"
          defaultValue={initialCandidate?.full_name ?? ""}
        />
      </div>

      <div>
        <label htmlFor="photo" className="text-sm font-medium text-ink">
          Candidate photograph
        </label>

        <div className="mt-2 flex flex-col gap-4 rounded-xl border border-dashed border-line p-4 sm:flex-row sm:items-center">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-tint">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Candidate photo preview" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-ink-subtle">Photo preview</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-tint file:px-4 file:py-2 file:font-medium file:text-ink hover:file:bg-signal/15"
            />
            <p className="mt-2 text-xs text-ink-subtle">
              JPG, PNG or WebP. Maximum file size: 5 MB.
            </p>
            {fileName && (
              <p className="mt-1 truncate text-xs text-ink-muted">{fileName}</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="biography" className="text-sm font-medium text-ink">
          Biography
        </label>
        <textarea
          id="biography"
          name="biography"
          rows={6}
          maxLength={10000}
          className={inputClass}
          placeholder="Provide a factual biography, background and relevant public experience."
          defaultValue={initialCandidate?.biography ?? ""}
        />
        <p className="mt-1 text-xs text-ink-subtle">Maximum 10,000 characters.</p>
      </div>

      <div>
        <label htmlFor="official_profile_url" className="text-sm font-medium text-ink">
          Official profile URL
        </label>
        <input
          id="official_profile_url"
          name="official_profile_url"
          type="url"
          maxLength={2048}
          className={inputClass}
          placeholder="https://..."
          defaultValue={initialCandidate?.official_profile_url ?? ""}
        />
      </div>

      <div>
        <label htmlFor="publication_status" className="text-sm font-medium text-ink">
          Publication status
        </label>
        <select
          id="publication_status"
          name="publication_status"
          defaultValue={initialCandidate?.publication_status ?? "draft"}
          className={inputClass}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <p className="mt-1 text-xs text-ink-subtle">
          Only published candidate profiles are visible to the public.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3 border-t border-line-soft pt-5">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink-muted hover:bg-tint"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-signal px-5 py-2.5 text-sm font-semibold text-ink hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Saving..." : initialCandidate ? "Save Changes" : "Save Candidate"}
        </button>
      </div>
    </form>
  );
}
