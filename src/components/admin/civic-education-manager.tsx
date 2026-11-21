"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BookOpen,
  Check,
  ExternalLink,
  FileImage,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type MediaType = "video" | "infographic";
type SourceType = "upload" | "youtube";
type MediaStatus = "draft" | "published" | "archived";
type ContentLanguage = "en" | "ha";

type CivicMedia = {
  id: string;
  title_en: string;
  title_ha: string;
  description_en: string;
  description_ha: string;
  content_language: ContentLanguage;
  media_type: MediaType;
  category: string;
  source_type: SourceType;
  media_url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  file_size: number | null;
  publication_status: MediaStatus;
  created_at: string;
};

type MediaForm = {
  title_en: string;
  title_ha: string;
  description_en: string;
  description_ha: string;
  content_language: ContentLanguage;
  media_type: MediaType;
  category: string;
  source_type: SourceType;
  youtube_url: string;
  publication_status: MediaStatus;
};

const BUCKET = "civic-education-media";
const IMAGE_LIMIT = 10 * 1024 * 1024;
const VIDEO_LIMIT = 100 * 1024 * 1024;

const categories = [
  { value: "voting_basics", label: "Voting basics" },
  { value: "voter_rights", label: "Voter rights" },
  { value: "electoral_process", label: "Electoral process" },
  { value: "civic_responsibility", label: "Civic responsibility" },
  { value: "accountability", label: "Accountability" },
  { value: "reliable_information", label: "Reliable information" },
  { value: "other", label: "Other" },
];

const emptyForm: MediaForm = {
  title_en: "",
  title_ha: "",
  description_en: "",
  description_ha: "",
  content_language: "en",
  media_type: "video",
  category: "other",
  source_type: "upload",
  youtube_url: "",
  publication_status: "draft",
};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100";

const statusStyles: Record<MediaStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  published: "bg-green-100 text-green-800",
  archived: "bg-amber-100 text-amber-800",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function getYouTubeId(value: string): string | null {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const parts = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(parts[0] ?? "")) {
        return parts[1] ?? null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function CivicEducationManager() {
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<CivicMedia[]>([]);
  const [form, setForm] = useState<MediaForm>(emptyForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingItem, setEditingItem] = useState<CivicMedia | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("civic_education_media")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setItems([]);
    } else {
      setItems((data ?? []) as CivicMedia[]);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadItems();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadItems]);

  function updateField<K extends keyof MediaForm>(key: K, value: MediaForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setSelectedFile(null);
    setEditingItem(null);
    setShowForm(false);
  }

  function startNew() {
    setForm(emptyForm);
    setSelectedFile(null);
    setEditingItem(null);
    setError("");
    setNotice("");
    setShowForm(true);
  }

  function startEditing(item: CivicMedia) {
    setEditingItem(item);
    setForm({
      title_en: item.title_en,
      title_ha: item.title_ha,
      description_en: item.description_en ?? "",
      description_ha: item.description_ha ?? "",
      content_language: item.content_language ?? "en",
      media_type: item.media_type,
      category: item.category,
      source_type: item.source_type,
      youtube_url: item.source_type === "youtube" ? item.media_url ?? "" : "",
      publication_status: item.publication_status,
    });
    setSelectedFile(null);
    setError("");
    setNotice("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    if (!form.title_en.trim() || !form.title_ha.trim()) {
      setError("Please provide titles in both English and Hausa.");
      setSaving(false);
      return;
    }

    const canKeepExistingUpload = Boolean(
      editingItem &&
      editingItem.source_type === "upload" &&
      editingItem.media_type === form.media_type &&
      editingItem.storage_path
    );

    if (form.source_type === "youtube") {
      if (form.media_type !== "video" || !getYouTubeId(form.youtube_url)) {
        setError("Enter a valid YouTube video URL.");
        setSaving(false);
        return;
      }
    } else {
      if (!selectedFile && !canKeepExistingUpload) {
        setError("Please select a media file to upload.");
        setSaving(false);
        return;
      }

      if (selectedFile) {
        const allowedImages = ["image/jpeg", "image/png", "image/webp"];
        const allowedVideos = ["video/mp4", "video/webm", "video/quicktime"];
        const allowed = form.media_type === "infographic" ? allowedImages : allowedVideos;
        const limit = form.media_type === "infographic" ? IMAGE_LIMIT : VIDEO_LIMIT;

        if (!allowed.includes(selectedFile.type)) {
          setError(
            form.media_type === "infographic"
              ? "Use a JPG, PNG or WebP image."
              : "Use an MP4, WebM or MOV video."
          );
          setSaving(false);
          return;
        }

        if (selectedFile.size > limit) {
          setError(
            form.media_type === "infographic"
              ? "The infographic must be 10 MB or smaller."
              : "The video must be 100 MB or smaller."
          );
          setSaving(false);
          return;
        }
      }
    }

    let uploadedPath: string | null = null;
    let mediaUrl: string | null = null;
    let storagePath: string | null = null;
    let mimeType: string | null = null;
    let fileSize: number | null = null;

    if (form.source_type === "youtube") {
      mediaUrl = form.youtube_url.trim();
    } else if (selectedFile) {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        setError("Your session could not be verified. Please sign in again.");
        setSaving(false);
        return;
      }

      const extension = selectedFile.name.split(".").pop()?.toLowerCase() || "bin";
      uploadedPath = `${authData.user.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(uploadedPath, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        });

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`);
        setSaving(false);
        return;
      }

      const { data: publicData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(uploadedPath);

      mediaUrl = publicData.publicUrl;
      storagePath = uploadedPath;
      mimeType = selectedFile.type;
      fileSize = selectedFile.size;
    } else if (canKeepExistingUpload && editingItem) {
      mediaUrl = editingItem.media_url;
      storagePath = editingItem.storage_path;
      mimeType = editingItem.mime_type;
      fileSize = editingItem.file_size;
    }

    const payload = {
      title_en: form.title_en.trim(),
      title_ha: form.title_ha.trim(),
      description_en: form.description_en.trim(),
      description_ha: form.description_ha.trim(),
      content_language: form.content_language,
      media_type: form.media_type,
      category: form.category,
      source_type: form.source_type,
      media_url: mediaUrl,
      storage_path: storagePath,
      mime_type: mimeType,
      file_size: fileSize,
      publication_status: form.publication_status,
    };

    let saveError: { message: string } | null = null;

    if (editingItem) {
      const { error: updateError } = await supabase
        .from("civic_education_media")
        .update(payload)
        .eq("id", editingItem.id);
      saveError = updateError;
    } else {
      const { data: authData } = await supabase.auth.getUser();
      const { error: insertError } = await supabase
        .from("civic_education_media")
        .insert({
          ...payload,
          created_by: authData.user?.id ?? null,
        });
      saveError = insertError;
    }

    if (saveError) {
      if (uploadedPath) {
        await supabase.storage.from(BUCKET).remove([uploadedPath]);
      }
      setError(`Could not save media record: ${saveError.message}`);
      setSaving(false);
      return;
    }

    if (
      editingItem?.storage_path &&
      editingItem.storage_path !== storagePath
    ) {
      await supabase.storage.from(BUCKET).remove([editingItem.storage_path]);
    }

    setNotice(editingItem ? "Media item updated successfully." : "Media item added successfully.");
    resetForm();
    await loadItems();
    setSaving(false);
  }

  async function deleteItem(item: CivicMedia) {
    if (!window.confirm("Permanently delete this media item? This cannot be undone.")) {
      return;
    }

    setDeletingId(item.id);
    setError("");
    setNotice("");

    const { error: deleteError } = await supabase
      .from("civic_education_media")
      .delete()
      .eq("id", item.id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      if (item.storage_path) {
        const { error: storageError } = await supabase.storage
          .from(BUCKET)
          .remove([item.storage_path]);

        if (storageError) {
          setNotice(`Media record deleted, but its stored file could not be removed: ${storageError.message}`);
        } else {
          setNotice("Media item deleted.");
        }
      } else {
        setNotice("Media item deleted.");
      }

      setItems((current) => current.filter((entry) => entry.id !== item.id));
    }

    setDeletingId(null);
  }

  const publishedCount = items.filter((item) => item.publication_status === "published").length;
  const draftCount = items.filter((item) => item.publication_status === "draft").length;
  const videoCount = items.filter((item) => item.media_type === "video").length;
  const infographicCount = items.filter((item) => item.media_type === "infographic").length;

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#ff6600]">
            <BookOpen size={17} />
            Civic engagement
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
            Civic Education Media
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Upload and publish bilingual civic education videos and infographics for the public platform.
          </p>
        </div>

        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-2 rounded-lg bg-[#ff6600] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e65c00]"
        >
          <Plus size={17} />
          Add media
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total media", value: items.length },
          { label: "Published", value: publishedCount },
          { label: "Videos", value: videoCount },
          { label: "Infographics", value: infographicCount },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-950">{item.value}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {notice}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-950">
              {editingItem ? "Edit media" : "Add civic education media"}
            </h2>
            <button type="button" onClick={resetForm} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Close form">
              <X size={19} />
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Content language *">
              <select
                className={inputClass}
                value={form.content_language}
                onChange={(e) => updateField("content_language", e.target.value as ContentLanguage)}
                required
              >
                <option value="en">English</option>
                <option value="ha">Hausa</option>
              </select>
            </Field>
            <Field label="Title (English) *">
              <input className={inputClass} value={form.title_en} onChange={(e) => updateField("title_en", e.target.value)} maxLength={200} required />
            </Field>
            <Field label="Title (Hausa) *">
              <input className={inputClass} value={form.title_ha} onChange={(e) => updateField("title_ha", e.target.value)} maxLength={200} required />
            </Field>
            <Field label="Description (English)">
              <textarea className={inputClass} rows={4} value={form.description_en} onChange={(e) => updateField("description_en", e.target.value)} />
            </Field>
            <Field label="Description (Hausa)">
              <textarea className={inputClass} rows={4} value={form.description_ha} onChange={(e) => updateField("description_ha", e.target.value)} />
            </Field>
            <Field label="Media type">
              <select
                className={inputClass}
                value={form.media_type}
                onChange={(e) => {
                  const nextType = e.target.value as MediaType;
                  setForm((current) => ({
                    ...current,
                    media_type: nextType,
                    source_type: nextType === "infographic" ? "upload" : current.source_type,
                  }));
                  setSelectedFile(null);
                }}
              >
                <option value="video">Video</option>
                <option value="infographic">Infographic</option>
              </select>
            </Field>
            <Field label="Category">
              <select className={inputClass} value={form.category} onChange={(e) => updateField("category", e.target.value)}>
                {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
              </select>
            </Field>
            {form.media_type === "video" && (
              <Field label="Video source">
                <select
                  className={inputClass}
                  value={form.source_type}
                  onChange={(e) => {
                    updateField("source_type", e.target.value as SourceType);
                    setSelectedFile(null);
                  }}
                >
                  <option value="upload">Upload video file</option>
                  <option value="youtube">YouTube link</option>
                </select>
              </Field>
            )}
            {form.source_type === "youtube" && form.media_type === "video" ? (
              <Field label="YouTube video URL *">
                <input className={inputClass} type="url" value={form.youtube_url} onChange={(e) => updateField("youtube_url", e.target.value)} placeholder="https://www.youtube.com/watch?v=..." required />
              </Field>
            ) : (
              <Field label={form.media_type === "video" ? "Video file" : "Infographic image"}>
                <input
                  className={inputClass}
                  type="file"
                  accept={form.media_type === "video" ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp"}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  required={!editingItem || editingItem.source_type !== "upload" || editingItem.media_type !== form.media_type}
                />
                <span className="block text-xs text-gray-500">
                  {form.media_type === "video" ? "MP4, WebM or MOV. Maximum 100 MB." : "JPG, PNG or WebP. Maximum 10 MB."}
                  {editingItem?.storage_path && !selectedFile ? " Leave empty to keep the current file." : ""}
                </span>
                {selectedFile && <span className="block text-xs font-medium text-gray-700">{selectedFile.name} · {formatSize(selectedFile.size)}</span>}
              </Field>
            )}
            <Field label="Publication status">
              <select className={inputClass} value={form.publication_status} onChange={(e) => updateField("publication_status", e.target.value as MediaStatus)}>
                <option value="draft">Draft — not public</option>
                <option value="published">Published — visible publicly</option>
                <option value="archived">Archived — not public</option>
              </select>
            </Field>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-5">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#ff6600] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e65c00] disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={17} />}
              {saving ? "Saving..." : editingItem ? "Save changes" : "Add media"}
            </button>
            <button type="button" onClick={resetForm} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-gray-950">All civic education media</h2>
            <p className="mt-1 text-xs text-gray-500">
              {draftCount} draft item{draftCount === 1 ? "" : "s"} · Staff can view all publication statuses.
            </p>
          </div>
          <button type="button" onClick={() => void loadItems()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-14 text-sm text-gray-500">
            <LoaderCircle size={18} className="animate-spin" /> Loading media...
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <FileImage className="mx-auto mb-3 text-gray-300" size={34} />
            <p className="font-semibold text-gray-800">No media added yet</p>
            <p className="mt-1 text-sm text-gray-500">Upload a video or infographic to begin.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <article key={item.id} className="flex flex-col justify-between gap-4 px-5 py-5 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#e85d00]">
                    {item.media_type === "video" ? <Video size={21} /> : <FileImage size={21} />}
                  </div>
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[item.publication_status]}`}>
                        {item.publication_status}
                      </span>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {item.content_language === "ha" ? "Hausa" : "English"}
                      </span>
                      <span className="text-xs text-gray-500">{item.media_type} · {categories.find((entry) => entry.value === item.category)?.label ?? "Other"}</span>
                      {item.file_size && <span className="text-xs text-gray-400">{formatSize(item.file_size)}</span>}
                    </div>
                    <h3 className="truncate font-semibold text-gray-950">{item.title_en}</h3>
                    <p className="mt-0.5 truncate text-sm text-gray-500">{item.title_ha}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {item.source_type === "youtube" ? "YouTube video" : "Uploaded file"} · {new Date(item.created_at).toLocaleDateString("en-NG")}
                    </p>
                    {item.media_url && (
                      <a href={item.media_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#d95300] hover:underline">
                        Open media <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={() => startEditing(item)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                    <Pencil size={14} /> Edit
                  </button>
                  <button type="button" onClick={() => void deleteItem(item)} disabled={deletingId === item.id} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                    {deletingId === item.id ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
