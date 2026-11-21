"use client";

import { useState, type FormEvent } from "react";
import { useLanguage } from "@/components/language-provider";

type ContactCategory =
  | "general"
  | "feedback"
  | "partnership"
  | "collaboration"
  | "other";

export default function ContactForm() {
  const { t } = useLanguage();
  const [category, setCategory] = useState<ContactCategory>("general");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [reference, setReference] = useState("");
  const [hasError, setHasError] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setHasError(false);
    setIsSubmitted(false);
    setReference("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      category,
      subject: String(formData.get("subject") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      website: String(formData.get("website") || ""),
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setHasError(true);
        return;
      }

      setIsSubmitted(true);
      setReference(typeof result.reference === "string" ? result.reference : "");
      form.reset();
      setCategory("general");
    } catch {
      setHasError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldClass =
    "mt-2 w-full rounded-xl border border-line-soft bg-paper px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-subtle focus:border-signal focus:ring-2 focus:ring-signal/15";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-ink">
          {t("contactName")}
          <input
            className={fieldClass}
            type="text"
            name="name"
            placeholder={t("contactNamePlaceholder")}
            autoComplete="name"
            minLength={2}
            maxLength={120}
            required
          />
        </label>

        <label className="block text-sm font-medium text-ink">
          {t("contactEmail")}
          <input
            className={fieldClass}
            type="email"
            name="email"
            placeholder={t("contactEmailPlaceholder")}
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-ink">
        {t("contactCategory")}
        <select
          className={fieldClass}
          value={category}
          onChange={(event) => setCategory(event.target.value as ContactCategory)}
          required
        >
          <option value="general">{t("contactGeneral")}</option>
          <option value="feedback">{t("contactFeedback")}</option>
          <option value="partnership">{t("contactPartnership")}</option>
          <option value="collaboration">{t("contactCollaboration")}</option>
          <option value="other">{t("contactOther")}</option>
        </select>
      </label>

      <label className="block text-sm font-medium text-ink">
        {t("contactSubject")}
        <input
          className={fieldClass}
          type="text"
          name="subject"
          placeholder={t("contactSubjectPlaceholder")}
          minLength={3}
          maxLength={160}
          required
        />
      </label>

      <label className="block text-sm font-medium text-ink">
        {t("contactMessage")}
        <textarea
          className={`${fieldClass} min-h-36 resize-y`}
          name="message"
          placeholder={t("contactMessagePlaceholder")}
          minLength={20}
          maxLength={5000}
          rows={6}
          required
        />
      </label>

      <div
        className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>

      {isSubmitted && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          <p>{t("contactSuccess")}</p>
          {reference && (
            <p className="mt-1 break-all font-medium">
              {t("contactReference")}: {reference}
            </p>
          )}
        </div>
      )}

      {hasError && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {t("contactError")}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-signal px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t("contactSubmitting") : t("contactSubmit")}
      </button>
    </form>
  );
}
