"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import NumberFlow from "@number-flow/react";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/friendly-db-error";
import { springs } from "@/lib/motion";
import { notify } from "@/components/notifications/notify";
import { useConfirmation } from "@/components/notifications/confirmation-dialog";
import {
  FieldError,
  SubmitButton,
  revealField,
  revealPanel,
} from "@/components/ui/form-feedback";

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

type FieldKey = "title_en" | "title_ha" | "start_date" | "end_date" | "end_time" | "registration_url";

const FIELD_IDS: Record<FieldKey, string> = {
  title_en: "ce-title-en",
  title_ha: "ce-title-ha",
  start_date: "ce-start-date",
  end_date: "ce-end-date",
  end_time: "ce-end-time",
  registration_url: "ce-registration-url",
};

const FIELD_ORDER: FieldKey[] = ["title_en", "title_ha", "start_date", "end_date", "end_time", "registration_url"];

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

const statusOptions: { value: EventStatus; label: string; help: string }[] = [
  { value: "draft", label: "Draft", help: "Only staff can see it. Publish when it's ready." },
  { value: "published", label: "Published", help: "Visible to everyone on the public civic calendar." },
  { value: "cancelled", label: "Cancelled", help: "Hidden from the public calendar. Use when an event is called off." },
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

function byStartDateDesc(a: CivicEvent, b: CivicEvent) {
  return b.start_date.localeCompare(a.start_date);
}

function toForm(event: CivicEvent): EventForm {
  return {
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
  };
}

function toPayload(form: EventForm) {
  return {
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
}

function validate(form: EventForm): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};

  if (!form.title_en.trim()) errors.title_en = "Enter the English title.";
  if (!form.title_ha.trim()) errors.title_ha = "Enter the Hausa title.";
  if (!form.start_date) errors.start_date = "Choose the date the event starts.";

  if (form.start_date && form.end_date && form.end_date < form.start_date) {
    errors.end_date = "The end date can't be before the start date.";
  }

  const sameDay = !form.end_date || form.end_date === form.start_date;
  if (sameDay && form.start_time && form.end_time && form.end_time < form.start_time) {
    errors.end_time = "The end time can't be before the start time.";
  }

  if (form.registration_url.trim()) {
    try {
      const parsed = new URL(form.registration_url.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("protocol");
    } catch {
      errors.registration_url = "Enter a full link starting with https://";
    }
  }

  return errors;
}

/** What a status means for the public, said after every save. */
function announceSaved(event: CivicEvent, verb: "created" | "updated", onPublish: () => void) {
  if (event.status === "published") {
    toast.success(`Event ${verb} and published`, {
      description: "It's now visible on the public civic calendar.",
      action: {
        label: "View",
        onClick: () => window.open("/civic-calendar", "_blank", "noopener"),
      },
    });
  } else if (event.status === "draft") {
    toast.success(verb === "created" ? "Saved as a draft" : "Draft updated", {
      description: "Only staff can see it. It isn't on the public calendar yet.",
      action: { label: "Publish", onClick: onPublish },
    });
  } else {
    toast.success(`Event ${verb} as cancelled`, {
      description: "It's hidden from the public calendar.",
    });
  }
}

function Field({
  label,
  htmlFor,
  error,
  errorId,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  errorId?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-gray-700">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
      {errorId ? <FieldError id={errorId} message={error} /> : null}
    </div>
  );
}

function inputClass(invalid = false) {
  return `w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors ${
    invalid
      ? "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-2 focus:ring-red-100"
      : "border-gray-300 bg-white focus:border-[#c94f00] focus:ring-2 focus:ring-orange-100"
  }`;
}

export default function CivicEventsManager() {
  const supabase = useMemo(() => createClient(), []);
  const confirm = useConfirmation();
  const formRef = useRef<HTMLFormElement>(null);

  const [events, setEvents] = useState<CivicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [initialForm, setInitialForm] = useState<EventForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());

  // Rows deleted optimistically but not yet committed (Undo window).
  const pendingDeletesRef = useRef<Set<string>>(new Set());

  const markPending = useCallback((id: string, pending: boolean) => {
    setPendingIds((current) => {
      const next = new Set(current);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    const { data, error } = await supabase
      .from("civic_events")
      .select("*")
      .order("start_date", { ascending: false });

    if (error) {
      setLoadError(friendlyDbError(error, "We couldn't load the events."));
    } else {
      setEvents(
        ((data ?? []) as CivicEvent[]).filter((event) => !pendingDeletesRef.current.has(event.id))
      );
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void Promise.resolve().then(loadEvents);
  }, [loadEvents]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  function updateField<K extends keyof EventForm>(key: K, value: EventForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (key in fieldErrors) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[key as FieldKey];
        return next;
      });
    }
  }

  function openForm(next: EventForm, id: string | null) {
    setEditingId(id);
    setForm(next);
    setInitialForm(next);
    setFieldErrors({});
    setShowForm(true);
    requestAnimationFrame(() => revealPanel(formRef.current));
  }

  async function requestClose() {
    if (dirty) {
      const discard = await confirm({
        title: "Discard changes?",
        description: "Your changes to this event haven't been saved.",
        confirmText: "Discard",
        cancelText: "Keep editing",
        destructive: true,
      });
      if (!discard) return;
    }
    setShowForm(false);
    setEditingId(null);
  }

  /** One-tap status change, applied before the server answers. */
  async function changeStatus(previous: CivicEvent, status: EventStatus) {
    // Takes the row itself: toast actions call this after `events` has moved on.
    const id = previous.id;
    if (previous.status === status) return;

    setEvents((current) => current.map((event) => (event.id === id ? { ...event, status } : event)));
    markPending(id, true);

    const { error } = await supabase.from("civic_events").update({ status }).eq("id", id);
    markPending(id, false);

    if (error) {
      setEvents((current) => current.map((event) => (event.id === id ? previous : event)));
      notify.error("Couldn't change the status", friendlyDbError(error));
      return;
    }

    if (status === "published") {
      toast.success("Published", {
        description: "It's now visible on the public civic calendar.",
        action: {
          label: "View",
          onClick: () => window.open("/civic-calendar", "_blank", "noopener"),
        },
      });
    } else {
      notify.success("Moved back to draft", "It's no longer on the public calendar.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validate(form);
    setFieldErrors(errors);
    const firstInvalid = FIELD_ORDER.find((key) => errors[key]);
    if (firstInvalid) {
      revealField(FIELD_IDS[firstInvalid]);
      return;
    }

    const payload = toPayload(form);
    const submittedForm = form;
    const wasEditing = editingId;

    if (wasEditing) {
      // Optimistic update: the row changes in place, the form closes.
      const previous = events.find((item) => item.id === wasEditing);
      setEvents((current) =>
        current.map((item) => (item.id === wasEditing ? { ...item, ...payload } : item)).sort(byStartDateDesc)
      );
      markPending(wasEditing, true);
      setShowForm(false);
      setEditingId(null);

      const { data, error } = await supabase
        .from("civic_events")
        .update(payload)
        .eq("id", wasEditing)
        .select()
        .single();
      markPending(wasEditing, false);

      if (error || !data) {
        if (previous) {
          setEvents((current) =>
            current.map((item) => (item.id === wasEditing ? previous : item)).sort(byStartDateDesc)
          );
        }
        notify.error("Changes weren't saved", friendlyDbError(error));
        // Hand the edits back so nothing typed is lost.
        setEditingId(wasEditing);
        setForm(submittedForm);
        setInitialForm(previous ? toForm(previous) : emptyForm);
        setShowForm(true);
        requestAnimationFrame(() => revealPanel(formRef.current));
        return;
      }

      const saved = data as CivicEvent;
      setEvents((current) => current.map((item) => (item.id === saved.id ? saved : item)).sort(byStartDateDesc));
      announceSaved(saved, "updated", () => void changeStatus(saved, "published"));
      return;
    }

    // Optimistic create: a placeholder row appears immediately.
    const tempId = `temp-${Date.now()}`;
    const placeholder: CivicEvent = { id: tempId, ...payload };
    setEvents((current) => [placeholder, ...current].sort(byStartDateDesc));
    markPending(tempId, true);
    setShowForm(false);

    const { data: authData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("civic_events")
      .insert({ ...payload, created_by: authData.user?.id ?? null })
      .select()
      .single();
    markPending(tempId, false);

    if (error || !data) {
      setEvents((current) => current.filter((item) => item.id !== tempId));
      notify.error("The event wasn't created", friendlyDbError(error));
      setEditingId(null);
      setForm(submittedForm);
      setInitialForm(emptyForm);
      setShowForm(true);
      requestAnimationFrame(() => revealPanel(formRef.current));
      return;
    }

    const saved = data as CivicEvent;
    setEvents((current) => current.map((item) => (item.id === tempId ? saved : item)).sort(byStartDateDesc));
    announceSaved(saved, "created", () => void changeStatus(saved, "published"));
  }

  /** Remove now, commit when the Undo toast closes. */
  function deleteEvent(target: CivicEvent) {
    pendingDeletesRef.current.add(target.id);
    setEvents((current) => current.filter((item) => item.id !== target.id));

    const restore = () => {
      pendingDeletesRef.current.delete(target.id);
      setEvents((current) =>
        current.some((item) => item.id === target.id) ? current : [...current, target].sort(byStartDateDesc)
      );
    };

    notify.undoable({
      message: "Event deleted",
      description: target.title_en,
      onUndo: restore,
      onCommit: async () => {
        const { error } = await supabase.from("civic_events").delete().eq("id", target.id);
        if (error) {
          restore();
          notify.error("The event wasn't deleted", friendlyDbError(error));
          return;
        }
        pendingDeletesRef.current.delete(target.id);
      },
    });
  }

  const publishedCount = events.filter((event) => event.status === "published").length;
  const draftCount = events.filter((event) => event.status === "draft").length;
  const submitLabel = editingId
    ? "Save changes"
    : form.status === "published"
      ? "Publish event"
      : form.status === "cancelled"
        ? "Save as cancelled"
        : "Save draft";
  const statusHelp = statusOptions.find((option) => option.value === form.status)?.help;

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#a84300]">
            <CalendarDays size={17} />
            Civic engagement
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">Civic Calendar</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Publish and manage civic activities, community engagements, youth
            programmes, electoral events and other important dates.
          </p>
        </div>

        <motion.button
          type="button"
          onClick={() => openForm(emptyForm, null)}
          whileTap={{ scale: 0.96 }}
          transition={springs.snappy}
          className="inline-flex items-center gap-2 rounded-lg bg-[#c94f00] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#a84300]"
        >
          <Plus size={17} />
          Create event
        </motion.button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total events", value: events.length },
          { label: "Published", value: publishedCount },
          { label: "Drafts", value: draftCount },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-950 tabular-nums">
              {loading ? (
                <span className="inline-block h-7 w-10 animate-pulse rounded-md bg-gray-200 motion-reduce:animate-none" />
              ) : (
                <NumberFlow value={item.value} />
              )}
            </p>
          </div>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {loadError && (
          <motion.div
            key="load-error"
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0, transition: springs.exit }}
            transition={springs.snappy}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{loadError}</span>
              <button
                type="button"
                onClick={() => void loadEvents()}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-red-50"
              >
                <RefreshCw size={13} /> Try again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {showForm && (
          <motion.div
            key="event-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0, transition: springs.exit }}
            transition={springs.default}
            className="overflow-hidden"
          >
            <form
              ref={formRef}
              tabIndex={-1}
              onSubmit={handleSubmit}
              noValidate
              className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 outline-none sm:p-7"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-gray-950">
                  {editingId ? "Edit event" : "Create a civic event"}
                </h2>
                <button
                  type="button"
                  onClick={() => void requestClose()}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                  aria-label="Close event form"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Event title (English) *" htmlFor={FIELD_IDS.title_en} errorId={`${FIELD_IDS.title_en}-error`} error={fieldErrors.title_en}>
                  <input
                    id={FIELD_IDS.title_en}
                    className={inputClass(!!fieldErrors.title_en)}
                    value={form.title_en}
                    onChange={(e) => updateField("title_en", e.target.value)}
                    aria-invalid={!!fieldErrors.title_en || undefined}
                    aria-describedby={`${FIELD_IDS.title_en}-error`}
                    maxLength={200}
                    placeholder="e.g. Community Civic Education Forum"
                  />
                </Field>

                <Field label="Event title (Hausa) *" htmlFor={FIELD_IDS.title_ha} errorId={`${FIELD_IDS.title_ha}-error`} error={fieldErrors.title_ha}>
                  <input
                    id={FIELD_IDS.title_ha}
                    className={inputClass(!!fieldErrors.title_ha)}
                    value={form.title_ha}
                    onChange={(e) => updateField("title_ha", e.target.value)}
                    aria-invalid={!!fieldErrors.title_ha || undefined}
                    aria-describedby={`${FIELD_IDS.title_ha}-error`}
                    maxLength={200}
                    placeholder="Sunan taro da Hausa"
                  />
                </Field>

                <Field label="Description (English)" htmlFor="ce-description-en">
                  <textarea
                    id="ce-description-en"
                    className={inputClass()}
                    rows={4}
                    value={form.description_en}
                    onChange={(e) => updateField("description_en", e.target.value)}
                    placeholder="Describe the event..."
                  />
                </Field>

                <Field label="Description (Hausa)" htmlFor="ce-description-ha">
                  <textarea
                    id="ce-description-ha"
                    className={inputClass()}
                    rows={4}
                    value={form.description_ha}
                    onChange={(e) => updateField("description_ha", e.target.value)}
                    placeholder="Bayyana abin da taron ya ƙunsa..."
                  />
                </Field>

                <Field label="Category *" htmlFor="ce-category">
                  <select
                    id="ce-category"
                    className={inputClass()}
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

                <div className="space-y-2">
                  <span id="ce-status-label" className="block text-sm font-semibold text-gray-700">
                    Who can see it
                  </span>
                  <div
                    role="radiogroup"
                    aria-labelledby="ce-status-label"
                    className="grid grid-cols-3 rounded-lg border border-gray-300 bg-gray-50 p-1"
                  >
                    {statusOptions.map((option) => {
                      const selected = form.status === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => updateField("status", option.value)}
                          className={`relative rounded-md px-2 py-1.5 text-sm font-semibold transition-colors ${
                            selected ? "text-gray-950" : "text-gray-500 hover:text-gray-800"
                          }`}
                        >
                          {selected && (
                            <motion.span
                              layoutId="ce-status-pill"
                              transition={springs.snappy}
                              className="absolute inset-0 rounded-md bg-white shadow-sm ring-1 ring-black/5"
                            />
                          )}
                          <span className="relative">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                      key={form.status}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4, transition: springs.exit }}
                      transition={springs.snappy}
                      className="text-xs text-gray-600"
                    >
                      {statusHelp}
                    </motion.p>
                  </AnimatePresence>
                </div>

                <Field label="Start date *" htmlFor={FIELD_IDS.start_date} errorId={`${FIELD_IDS.start_date}-error`} error={fieldErrors.start_date}>
                  <input
                    id={FIELD_IDS.start_date}
                    type="date"
                    className={inputClass(!!fieldErrors.start_date)}
                    value={form.start_date}
                    onChange={(e) => updateField("start_date", e.target.value)}
                    aria-invalid={!!fieldErrors.start_date || undefined}
                    aria-describedby={`${FIELD_IDS.start_date}-error`}
                  />
                </Field>

                <Field label="End date (optional)" htmlFor={FIELD_IDS.end_date} errorId={`${FIELD_IDS.end_date}-error`} error={fieldErrors.end_date}>
                  <input
                    id={FIELD_IDS.end_date}
                    type="date"
                    className={inputClass(!!fieldErrors.end_date)}
                    value={form.end_date}
                    min={form.start_date || undefined}
                    onChange={(e) => updateField("end_date", e.target.value)}
                    aria-invalid={!!fieldErrors.end_date || undefined}
                    aria-describedby={`${FIELD_IDS.end_date}-error`}
                  />
                </Field>

                <Field label="Start time (optional)" htmlFor="ce-start-time">
                  <input
                    id="ce-start-time"
                    type="time"
                    className={inputClass()}
                    value={form.start_time}
                    onChange={(e) => updateField("start_time", e.target.value)}
                  />
                </Field>

                <Field label="End time (optional)" htmlFor={FIELD_IDS.end_time} errorId={`${FIELD_IDS.end_time}-error`} error={fieldErrors.end_time}>
                  <input
                    id={FIELD_IDS.end_time}
                    type="time"
                    className={inputClass(!!fieldErrors.end_time)}
                    value={form.end_time}
                    onChange={(e) => updateField("end_time", e.target.value)}
                    aria-invalid={!!fieldErrors.end_time || undefined}
                    aria-describedby={`${FIELD_IDS.end_time}-error`}
                  />
                </Field>

                <Field label="Venue (English)" htmlFor="ce-venue-en">
                  <input
                    id="ce-venue-en"
                    className={inputClass()}
                    value={form.venue_en}
                    onChange={(e) => updateField("venue_en", e.target.value)}
                    placeholder="Venue or location"
                  />
                </Field>

                <Field label="Venue (Hausa)" htmlFor="ce-venue-ha">
                  <input
                    id="ce-venue-ha"
                    className={inputClass()}
                    value={form.venue_ha}
                    onChange={(e) => updateField("venue_ha", e.target.value)}
                    placeholder="Wurin taro"
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field
                    label="Registration or information link (optional)"
                    htmlFor={FIELD_IDS.registration_url}
                    errorId={`${FIELD_IDS.registration_url}-error`}
                    error={fieldErrors.registration_url}
                  >
                    <input
                      id={FIELD_IDS.registration_url}
                      type="url"
                      className={inputClass(!!fieldErrors.registration_url)}
                      value={form.registration_url}
                      onChange={(e) => updateField("registration_url", e.target.value)}
                      aria-invalid={!!fieldErrors.registration_url || undefined}
                      aria-describedby={`${FIELD_IDS.registration_url}-error`}
                      placeholder="https://..."
                    />
                  </Field>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-5">
                {/* Saving is optimistic: the form closes and the row shows "Saving…". */}
                <SubmitButton
                  phase="idle"
                  icon={<Check size={17} />}
                  label={submitLabel}
                  pendingLabel="Saving…"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#c94f00] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#a84300] disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => void requestClose()}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

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

        {loading && events.length === 0 ? (
          <div className="divide-y divide-gray-100" aria-busy="true" aria-label="Loading events">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center justify-between gap-4 px-5 py-5">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-20 animate-pulse rounded-full bg-gray-200 motion-reduce:animate-none" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200 motion-reduce:animate-none" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
                </div>
                <div className="h-8 w-28 animate-pulse rounded-lg bg-gray-100 motion-reduce:animate-none" />
              </div>
            ))}
          </div>
        ) : events.length === 0 && !loadError ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springs.default}
            className="px-5 py-14 text-center"
          >
            <CalendarDays className="mx-auto mb-3 text-gray-300" size={34} />
            <p className="font-semibold text-gray-800">No civic events yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Create an event to start building the public calendar.
            </p>
          </motion.div>
        ) : (
          <ul className="divide-y divide-gray-100">
            <AnimatePresence initial={false}>
              {events.map((event) => {
                const pending = pendingIds.has(event.id);
                const isTemp = event.id.startsWith("temp-");

                return (
                  <motion.li
                    key={event.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: pending ? 0.7 : 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0, transition: springs.exit }}
                    transition={springs.default}
                    className="overflow-hidden"
                  >
                    <article className="flex flex-col justify-between gap-4 px-5 py-5 sm:flex-row sm:items-center">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <AnimatePresence mode="popLayout" initial={false}>
                            <motion.span
                              key={event.status}
                              initial={{ opacity: 0, scale: 0.85 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.85, transition: springs.exit }}
                              transition={springs.snappy}
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[event.status]}`}
                            >
                              {event.status}
                            </motion.span>
                          </AnimatePresence>
                          <span className="text-xs text-gray-500">
                            {categories.find((item) => item.value === event.category)?.label ?? "Other"}
                          </span>
                          {pending ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#a84300]">
                              <LoaderCircle size={12} className="animate-spin" aria-hidden="true" />
                              Saving…
                            </span>
                          ) : null}
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

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {event.status !== "cancelled" ? (
                          <motion.button
                            type="button"
                            onClick={() =>
                              void changeStatus(event, event.status === "published" ? "draft" : "published")
                            }
                            disabled={pending || isTemp}
                            whileTap={{ scale: 0.95 }}
                            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                              event.status === "published"
                                ? "border-gray-200 text-gray-700 hover:bg-gray-50"
                                : "border-green-200 text-green-800 hover:bg-green-50"
                            }`}
                          >
                            {event.status === "published" ? <EyeOff size={14} /> : <Eye size={14} />}
                            {event.status === "published" ? "Unpublish" : "Publish"}
                          </motion.button>
                        ) : null}
                        <motion.button
                          type="button"
                          onClick={() => openForm(toForm(event), event.id)}
                          disabled={pending || isTemp}
                          whileTap={{ scale: 0.95 }}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <Pencil size={14} />
                          Edit
                        </motion.button>
                        <motion.button
                          type="button"
                          onClick={() => deleteEvent(event)}
                          disabled={pending || isTemp}
                          whileTap={{ scale: 0.95 }}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                          Delete
                        </motion.button>
                      </div>
                    </article>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </section>
    </div>
  );
}
