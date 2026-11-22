"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PartyInitial = {
  id: string;
  name: string;
  acronym: string | null;
  logo_url: string | null;
  official_website: string | null;
  publication_status: string;
};

export default function PartyForm({
  initialParty,
}: {
  initialParty?: PartyInitial;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(initialParty?.logo_url ?? "");
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setPreview("");
      setFileName("");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG or WebP image.");
      event.target.value = "";
      setPreview("");
      setFileName("");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("The logo must not exceed 5 MB.");
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

    const formData = new FormData(event.currentTarget);
    const logo = formData.get("logo");

    if (!(logo instanceof File) || logo.size === 0) {
      formData.delete("logo");
    }

    try {
      const response = await fetch(
        initialParty
          ? `/api/admin/parties/${initialParty.id}`
          : "/api/admin/parties",
        {
          method: initialParty ? "PATCH" : "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not save the political party.");
      }

      router.push("/admin/electoral-data/parties");
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
        <label htmlFor="name" className="text-sm font-medium text-ink">
          Political party name *
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={200}
          className={inputClass}
          placeholder="Enter the party's full registered name"
          defaultValue={initialParty?.name ?? ""}
        />
      </div>

      <div>
        <label htmlFor="acronym" className="text-sm font-medium text-ink">
          Acronym
        </label>
        <input
          id="acronym"
          name="acronym"
          maxLength={30}
          className={inputClass}
          placeholder="e.g. Party abbreviation"
          defaultValue={initialParty?.acronym ?? ""}
        />
      </div>

      <div>
        <label htmlFor="logo" className="text-sm font-medium text-ink">
          Party logo
        </label>
        <div className="mt-2 flex flex-col gap-4 rounded-xl border border-dashed border-line p-4 sm:flex-row sm:items-center">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-tint">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Party logo preview" className="h-full w-full object-contain p-2" />
            ) : (
              <span className="text-xs text-ink-subtle">Logo preview</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoChange}
              className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-tint file:px-4 file:py-2 file:font-medium file:text-ink hover:file:bg-signal/15"
            />
            <p className="mt-2 text-xs text-ink-subtle">
              JPG, PNG or WebP. Maximum file size: 5 MB.
            </p>
            {fileName && <p className="mt-1 truncate text-xs text-ink-muted">{fileName}</p>}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="official_website" className="text-sm font-medium text-ink">
          Official website
        </label>
        <input
          id="official_website"
          name="official_website"
          type="url"
          maxLength={2048}
          className={inputClass}
          placeholder="https://..."
          defaultValue={initialParty?.official_website ?? ""}
        />
      </div>

      <div>
        <label htmlFor="publication_status" className="text-sm font-medium text-ink">
          Publication status
        </label>
        <select id="publication_status" name="publication_status" defaultValue={initialParty?.publication_status ?? "draft"} className={inputClass}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <p className="mt-1 text-xs text-ink-subtle">
          Only published party profiles are visible to the public.
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
          {loading ? "Saving..." : initialParty ? "Save Changes" : "Save Political Party"}
        </button>
      </div>
    </form>
  );
}
