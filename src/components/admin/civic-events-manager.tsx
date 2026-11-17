"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarDays,
  Check,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type EventStatus = "draft" | "published" | "cancelled";

type CivicEvent = {
  id: string;
  title_en: string;
  title_ha: string;
  description_en: string;
  description_ha: string;
  category: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue_en: string | null;
  venue_ha: string | null;
  registration_url: string | null;
  status: EventStatus;
};

type EventForm = {
  title_en: string;
  title_ha: string;
  description_en: string;
  description_ha: string;
  category: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  venue_en: string;
  venue_ha: string;
  registration_url: string;
  status: EventStatus;
};

const emptyForm: EventForm = {
  title_en: "",
  title_ha: "",
  description_en: "",
  description_ha: "",
  category: "other",
  start_date: "",
  end_date: "",
  start_time: "",
  end_time: "",
  venue_en: "",
  venue_ha: "",
  registration_url: "",
  status: "draft",
};

const categories = [
  { value: "civic_education", label: "Civic education" },
  { value: "electoral", label: "Electoral" },
  { value: "community_engagement", label: "Community engagement" },
  { value: "youth", label: "Youth" },
  { value: "accountability", label: "Accountability" },
  { value: "other", label: "Other" },
];

const statusStyles: Record<EventStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  published: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

function formatDate(value: string) {
  if (!value) return "Date not set";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

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

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100";

export default function CivicEventsManager() {
  const supabase = useMemo(() => createClient(), []);

  const [events, setEvents] = useState<CivicEvent[]>([]);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("civic_events")
      .select("*")
      .order("start_date", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setEvents([]);
    } else {
      setEvents((data ?? []) as CivicEvent[]);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void Promise.resolve().then(loadEvents);
  }, [loadEvents]);

  function updateField<K extends keyof EventForm>(key: K, value: EventForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startNewEvent() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setNotice("");
    setShowForm(true);
  }

  function startEditing(event: CivicEvent) {
    setEditingId(event.id);
    setForm({
      title_en: event.title_en,
      title_ha: event.title_ha,
      description_en: event.description_en ?? "",
      description_ha: event.description_ha ?? "",
      category: event.category,
      start_date: event.start_date,
      end_date: event.end_date ?? "",
      start_time: event.start_time?.slice(0, 5) ?? "",
      end_time: event.end_time?.slice(0, 5) ?? "",
      venue_en: event.venue_en ?? "",
      venue_ha: event.venue_ha ?? "",
      registration_url: event.registration_url ?? "",
      status: event.status,
    });
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

    if (!form.title_en.trim() || !form.title_ha.trim() || !form.start_date) {
      setError("Please provide both event titles and a start date.");
      setSaving(false);
      return;
    }

    if (form.end_date && form.end_date < form.start_date) {
      setError("The end date cannot be earlier than the start date.");
      setSaving(false);
      return;
    }

    if (form.registration_url.trim()) {
      try {
        const parsedUrl = new URL(form.registration_url.trim());
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        setError("Please enter a valid registration URL starting with https:// or http://.");
        setSaving(false);
        return;
      }
    }

    const payload = {
      title_en: form.title_en.trim(),
      title_ha: form.title_ha.trim(),
      description_en: form.description_en.trim(),
      description_ha: form.description_ha.trim(),
      category: form.category,
      start_date: form.start_date,
      end_date: form.end_date || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      venue_en: form.venue_en.trim() || null,
      venue_ha: form.venue_ha.trim() || null,
      registration_url: form.registration_url.trim() || null,
      status: form.status,
    };

    let result;

    if (editingId) {
      result = await supabase
        .from("civic_events")
        .update(payload)
        .eq("id", editingId);
    } else {
      const { data: authData } = await supabase.auth.getUser();

      result = await supabase.from("civic_events").insert({
        ...payload,
        created_by: authData.user?.id ?? null,
      });
    }

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setNotice(editingId ? "Event updated successfully." : "Event created successfully.");
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    await loadEvents();
    setSaving(false);
  }

  async function deleteEvent(id: string) {
    if (!window.confirm("Permanently delete this event? This action cannot be undone.")) {
      return;
    }

    setDeletingId(id);
    setError("");
    setNotice("");

    const { error: deleteError } = await supabase
      .from("civic_events")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setNotice("Event deleted.");
      setEvents((current) => current.filter((item) => item.id !== id));
    }

    setDeletingId(null);
  }

  const publishedCount = events.filter((event) => event.status === "published").length;
  const draftCount = events.filter((event) => event.status === "draft").length;

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#ff6600]">
            <CalendarDays size={17} />
            Civic engagement
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
            Civic Calendar
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Publish and manage civic activities, community engagements, youth
            programmes, electoral events and other important dates.
          </p>
        </div>

        <button
          type="button"
          onClick={startNewEvent}
          className="inline-flex items-center gap-2 rounded-lg bg-[#ff6600] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e65c00]"
        >
          <Plus size={17} />
          Create event
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total events", value: events.length },
          { label: "Published", value: publishedCount },
          { label: "Drafts", value: draftCount },
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
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 sm:p-7"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-950">
              {editingId ? "Edit event" : "Create a civic event"}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              aria-label="Close event form"
            >
              <X size={19} />
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Event title (English) *">
              <input
                className={inputClass}
                value={form.title_en}
                onChange={(e) => updateField("title_en", e.target.value)}
                required
                maxLength={200}
                placeholder="e.g. Community Civic Education Forum"
              />
            </Field>

            <Field label="Event title (Hausa) *">
              <input
                className={inputClass}
                value={form.title_ha}
                onChange={(e) => updateField("title_ha", e.target.value)}
                required
                maxLength={200}
                placeholder="Sunan taro da Hausa"
              />
            </Field>

            <Field label="Description (English)">
              <textarea
                className={inputClass}
                rows={4}
                value={form.description_en}
                onChange={(e) => updateField("description_en", e.target.value)}
                placeholder="Describe the event..."
              />
            </Field>

            <Field label="Description (Hausa)">
              <textarea
                className={inputClass}
                rows={4}
                value={form.description_ha}
                onChange={(e) => updateField("description_ha", e.target.value)}
                placeholder="Bayyana abin da taron ya ƙunsa..."
              />
            </Field>

            <Field label="Category *">
              <select
                className={inputClass}
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Publication status">
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => updateField("status", e.target.value as EventStatus)}
              >
                <option value="draft">Draft — not public</option>
                <option value="published">Published — visible publicly</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>

            <Field label="Start date *">
              <input
                type="date"
                className={inputClass}
                value={form.start_date}
                onChange={(e) => updateField("start_date", e.target.value)}
                required
              />
            </Field>

            <Field label="End date (optional)">
              <input
                type="date"
                className={inputClass}
                value={form.end_date}
                min={form.start_date || undefined}
                onChange={(e) => updateField("end_date", e.target.value)}
              />
            </Field>

            <Field label="Start time (optional)">
              <input
                type="time"
                className={inputClass}
                value={form.start_time}
                onChange={(e) => updateField("start_time", e.target.value)}
              />
            </Field>

            <Field label="End time (optional)">
              <input
                type="time"
                className={inputClass}
                value={form.end_time}
                onChange={(e) => updateField("end_time", e.target.value)}
              />
            </Field>

            <Field label="Venue (English)">
              <input
                className={inputClass}
                value={form.venue_en}
                onChange={(e) => updateField("venue_en", e.target.value)}
                placeholder="Venue or location"
              />
            </Field>

            <Field label="Venue (Hausa)">
              <input
                className={inputClass}
                value={form.venue_ha}
                onChange={(e) => updateField("venue_ha", e.target.value)}
                placeholder="Wurin taro"
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Registration or information link (optional)">
                <input
                  type="url"
                  className={inputClass}
                  value={form.registration_url}
                  onChange={(e) => updateField("registration_url", e.target.value)}
                  placeholder="https://..."
                />
              </Field>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-5">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#ff6600] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e65c00] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={17} />}
              {saving ? "Saving..." : editingId ? "Save changes" : "Create event"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </form>
      )}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-gray-950">All civic events</h2>
            <p className="mt-1 text-xs text-gray-500">
              Drafts and cancelled events are only visible to authorized staff.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadEvents()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-14 text-sm text-gray-500">
            <LoaderCircle size={18} className="animate-spin" />
            Loading events...
          </div>
        ) : events.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <CalendarDays className="mx-auto mb-3 text-gray-300" size={34} />
            <p className="font-semibold text-gray-800">No civic events yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Create an event to start building the public calendar.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {events.map((event) => (
              <article
                key={event.id}
                className="flex flex-col justify-between gap-4 px-5 py-5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[event.status]}`}>
                      {event.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {categories.find((item) => item.value === event.category)?.label ?? "Other"}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-950">{event.title_en}</h3>
                  <p className="mt-0.5 text-sm text-gray-500">{event.title_ha}</p>
                  <p className="mt-2 text-xs text-gray-500">
                    {formatDate(event.start_date)}
                    {event.end_date && event.end_date !== event.start_date
                      ? ` – ${formatDate(event.end_date)}`
                      : ""}
                    {event.start_time ? ` · ${event.start_time.slice(0, 5)}` : ""}
                    {event.venue_en ? ` · ${event.venue_en}` : ""}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEditing(event)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteEvent(event.id)}
                    disabled={deletingId === event.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === event.id ? (
                      <LoaderCircle size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
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
