"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PartyForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
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
      const response = await fetch("/api/admin/parties", {
        method: "POST",
        body: formData,
      });

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
    "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100";

  return (
    <form
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 sm:p-7"
    >
      <div>
        <label htmlFor="name" className="text-sm font-medium text-gray-800">
          Political party name *
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={200}
          className={inputClass}
          placeholder="Enter the party's full registered name"
        />
      </div>

      <div>
        <label htmlFor="acronym" className="text-sm font-medium text-gray-800">
          Acronym
        </label>
        <input
          id="acronym"
          name="acronym"
          maxLength={30}
          className={inputClass}
          placeholder="e.g. Party abbreviation"
        />
      </div>

      <div>
        <label htmlFor="logo" className="text-sm font-medium text-gray-800">
          Party logo
        </label>
        <div className="mt-2 flex flex-col gap-4 rounded-xl border border-dashed border-gray-300 p-4 sm:flex-row sm:items-center">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Party logo preview" className="h-full w-full object-contain p-2" />
            ) : (
              <span className="text-xs text-gray-400">Logo preview</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoChange}
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 file:px-4 file:py-2 file:font-medium file:text-[#e85d00] hover:file:bg-orange-100"
            />
            <p className="mt-2 text-xs text-gray-500">
              JPG, PNG or WebP. Maximum file size: 5 MB.
            </p>
            {fileName && <p className="mt-1 truncate text-xs text-gray-700">{fileName}</p>}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="official_website" className="text-sm font-medium text-gray-800">
          Official website
        </label>
        <input
          id="official_website"
          name="official_website"
          type="url"
          maxLength={2048}
          className={inputClass}
          placeholder="https://..."
        />
      </div>

      <div>
        <label htmlFor="publication_status" className="text-sm font-medium text-gray-800">
          Publication status
        </label>
        <select id="publication_status" name="publication_status" defaultValue="draft" className={inputClass}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Only published party profiles are visible to the public.
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
          disabled={loading}
          className="rounded-lg bg-[#ff6600] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e85d00] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save Political Party"}
        </button>
      </div>
    </form>
  );
}
