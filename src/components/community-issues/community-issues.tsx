"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  Clipboard,
  FileText,
  MapPin,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { usePublicData } from "@/lib/swr";
import { useLanguage } from "@/components/language-provider";
import { notify } from "@/components/notifications/notify";
import { Spinner } from "@/components/ui/spinner";
import {
  FieldError,
  PendingValue,
  ProgressBar,
  SubmitButton,
  SuccessCheck,
  fieldClass,
  revealField,
  revealPanel,
  shake,
  swapTransition,
} from "@/components/ui/form-feedback";
import { springs } from "@/lib/motion";
import { postFormWithProgress } from "@/lib/upload";
import type { TranslationKey } from "@/lib/i18n/translations";

const STATE_NAME = "Gombe";
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const REFERENCE_PATTERN = /^AMI-\d{4}-[A-F0-9]{10}$/i;

const categories: { value: string; key: TranslationKey }[] = [
  { value: "education", key: "categoryEducation" },
  { value: "healthcare", key: "categoryHealthcare" },
  { value: "water_sanitation", key: "categoryWaterSanitation" },
  { value: "roads_transport", key: "categoryRoadsTransport" },
  { value: "electricity", key: "categoryElectricity" },
  { value: "security", key: "categorySecurity" },
  { value: "environment", key: "categoryEnvironment" },
  { value: "public_services", key: "categoryPublicServices" },
  { value: "youth_development", key: "categoryYouthDevelopment" },
  { value: "other", key: "categoryOther" },
];

/** The path a report normally takes; "closed" sits outside it. */
const STEPS = ["submitted", "under_review", "action_required", "resolved"] as const;

const statusMeta: Record<
  string,
  { label: TranslationKey; help: TranslationKey; tone: string }
> = {
  submitted: { label: "statusSubmitted", help: "statusSubmittedHelp", tone: "bg-gray-100 text-gray-700" },
  under_review: { label: "statusUnderReview", help: "statusUnderReviewHelp", tone: "bg-blue-100 text-blue-800" },
  action_required: { label: "statusActionRequired", help: "statusActionRequiredHelp", tone: "bg-orange-100 text-orange-800" },
  resolved: { label: "statusResolved", help: "statusResolvedHelp", tone: "bg-green-100 text-green-800" },
  closed: { label: "statusClosed", help: "statusClosedHelp", tone: "bg-gray-200 text-gray-700" },
};

type ElectoralArea = {
  id: string;
  name: string;
  parent_id: string | null;
  area_type: "state" | "lga" | "ward";
};

type TrackedIssue = {
  reference_code: string;
  category: string;
  title: string;
  status: string;
  public_summary: string | null;
  resolution_summary: string | null;
  submitted_at: string;
  updated_at: string;
};

type Field = "category" | "title" | "lga" | "description";
const FIELD_ORDER: Field[] = ["category", "title", "lga", "description"];
const FIELD_IDS: Record<Field, string> = {
  category: "ci-category",
  title: "ci-title",
  lga: "ci-lga",
  description: "ci-description",
};

type Evidence = { id: number; file: File };

type Receipt =
  | { phase: "pending" }
  | { phase: "done"; referenceCode: string; trackingToken: string };

export default function CommunityIssues() {
  const { t, language } = useLanguage();
  const locale = language === "ha" ? "ha-NG" : "en-NG";

  // ── Form fields ────────────────────────────────────────────────
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lga, setLga] = useState("");
  const [ward, setWard] = useState("");
  const [selectedLgaId, setSelectedLgaId] = useState("");
  const [community, setCommunity] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [website, setWebsite] = useState("");

  // ── Validation: inline, live once the user has tried or left a field ──
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [touched, setTouched] = useState<Set<Field>>(new Set());

  const errors = useMemo(() => {
    const result: Partial<Record<Field, string>> = {};
    if (!category) result.category = t("errIssueCategory");
    if (title.trim().length < 5) result.title = t("errIssueTitle");
    if (lga.trim().length < 2) result.lga = t("errIssueLga");
    if (description.trim().length < 20) {
      result.description = t("errDescription").replace(
        "{count}",
        String(description.trim().length)
      );
    }
    return result;
  }, [category, title, lga, description, t]);

  const visibleError = (field: Field) =>
    showAllErrors || touched.has(field) ? errors[field] : undefined;

  const touch = (field: Field) =>
    setTouched((current) =>
      current.has(field) ? current : new Set(current).add(field)
    );

  /** ARIA wiring for a validated control. */
  const a11y = (field: Field) => {
    const invalid = Boolean(visibleError(field));
    return {
      id: FIELD_IDS[field],
      "aria-invalid": invalid || undefined,
      "aria-describedby": invalid ? `${FIELD_IDS[field]}-error` : undefined,
    };
  };

  // ── Locations ──────────────────────────────────────────────────
  // Locations rarely change: serve the cached list instantly, refresh in background.
  const {
    data: locationData,
    error: locationError,
    isFirstLoad: loadingLocations,
  } = usePublicData<{ areas: ElectoralArea[] }>("/api/community-issues");
  const areas = useMemo<ElectoralArea[]>(
    () => (Array.isArray(locationData?.areas) ? locationData.areas : []),
    [locationData]
  );
  const gombeStateId = useMemo(
    () =>
      areas.find(
        (area) =>
          area.area_type === "state" &&
          area.name.trim().toLowerCase() === STATE_NAME.toLowerCase()
      )?.id ?? "",
    [areas]
  );
  const lgas = areas.filter(
    (area) => area.area_type === "lga" && area.parent_id === gombeStateId
  );
  const wards = areas.filter(
    (area) => area.area_type === "ward" && area.parent_id === selectedLgaId
  );

  useEffect(() => {
    if (!locationError || locationData) return;
    console.error("Community issue locations:", locationError);
    notify.error(t("locationLoadFailed"), t("refreshAndRetry"));
  }, [locationError, locationData, t]);

  // ── Submission (optimistic receipt) ────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const focusOnMount = useRef<"receipt" | "error" | null>(null);

  // ── Evidence ───────────────────────────────────────────────────
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const nextEvidenceId = useRef(0);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [evidenceUploaded, setEvidenceUploaded] = useState(0);

  // ── Copy feedback ──────────────────────────────────────────────
  const [copied, setCopied] = useState(false);

  // ── Tracking ───────────────────────────────────────────────────
  const [trackingIdentifier, setTrackingIdentifier] = useState("");
  const [tracking, setTracking] = useState(false);
  const [trackError, setTrackError] = useState("");
  const [trackedIssue, setTrackedIssue] = useState<TrackedIssue | null>(null);
  const trackSectionRef = useRef<HTMLElement>(null);

  function addFiles(incoming: File[]) {
    const valid = incoming.filter((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        notify.error(t("unsupportedFile"), t("fileNotAccepted").replace("{name}", file.name));
        return false;
      }
      if (file.size > MAX_FILE_BYTES) {
        notify.error(t("fileTooLarge"), t("fileExceedsLimit").replace("{name}", file.name));
        return false;
      }
      return true;
    });

    setEvidence((current) => {
      const remaining = MAX_FILES - current.length;
      if (valid.length > remaining) {
        notify.error(t("fileLimitReached"), t("maximumFiveFiles"));
      }
      return [
        ...current,
        ...valid.slice(0, Math.max(0, remaining)).map((file) => ({
          id: nextEvidenceId.current++,
          file,
        })),
      ];
    });
  }

  async function uploadEvidence(reference: string, token: string, files: Evidence[]) {
    if (!files.length) return;

    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("referenceCode", reference);
      formData.append("trackingToken", token);
      files.forEach(({ file }) => formData.append("files", file));

      const { ok, data } = await postFormWithProgress<{ uploaded?: number; error?: string }>(
        "/api/community-issues/evidence",
        formData,
        setUploadProgress
      );

      if (!ok) throw new Error(data.error || t("evidenceUploadFailed"));

      const count = data.uploaded ?? files.length;
      setUploadProgress(1);
      setEvidenceUploaded((current) => current + count);
      setEvidence([]);
    } catch (error) {
      notify.error(
        t("evidenceUploadFailed"),
        error instanceof Error ? error.message : t("pleaseTryAgain")
      );
    } finally {
      setUploadProgress(null);
    }
  }

  function resetForm() {
    setCategory("");
    setTitle("");
    setDescription("");
    setLga("");
    setWard("");
    setSelectedLgaId("");
    setCommunity("");
    setLocationDescription("");
    setReporterName("");
    setWebsite("");
    setShowAllErrors(false);
    setTouched(new Set());
  }

  async function submitIssue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const firstInvalid = FIELD_ORDER.find((field) => errors[field]);
    if (firstInvalid) {
      setShowAllErrors(true);
      revealField(FIELD_IDS[firstInvalid]);
      return;
    }

    const files = evidence;
    setSubmitting(true);
    setSubmitError("");
    setEvidenceUploaded(0);
    // Optimistic: the receipt replaces the form the moment the user presses
    // submit, and fills in the reference code when the server answers.
    focusOnMount.current = "receipt";
    setReceipt({ phase: "pending" });

    try {
      const response = await fetch("/api/community-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          title: title.trim(),
          description: description.trim(),
          state: STATE_NAME,
          lga: lga.trim(),
          ward: ward.trim(),
          community: community.trim(),
          location_description: locationDescription.trim(),
          reporter_name: reporterName.trim() || null,
          website,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || t("unableToSubmitIssue"));
      }

      setReceipt({
        phase: "done",
        referenceCode: result.referenceCode,
        trackingToken: result.trackingToken,
      });
      resetForm();

      await uploadEvidence(result.referenceCode, result.trackingToken, files);
    } catch (error) {
      // Roll back: the form returns with everything the user typed.
      const message = error instanceof Error ? error.message : t("pleaseTryAgain");
      focusOnMount.current = "error";
      setReceipt(null);
      setSubmitError(message);
      notify.error(t("submissionFailed"), message);
    } finally {
      setSubmitting(false);
    }
  }

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      notify.error(t("copyFailed"), t("copyManually"));
    }
  }

  async function runTracking(term: string) {
    const searchTerm = term.trim();

    if (searchTerm.length < 5) {
      setTrackError(t("errTrackingTerm"));
      shake(document.getElementById("ci-track"));
      return;
    }

    setTracking(true);
    setTrackError("");
    setTrackedIssue(null);

    try {
      const response = await fetch("/api/community-issues/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchTerm }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || t("unableToFindReport"));
      }

      setTrackedIssue(result.issue);
    } catch (error) {
      setTrackError(error instanceof Error ? error.message : t("pleaseTryAgain"));
      shake(document.getElementById("ci-track"));
    } finally {
      setTracking(false);
    }
  }

  function trackReference(referenceCode: string) {
    setTrackingIdentifier(referenceCode);
    revealPanel(trackSectionRef.current);
    void runTracking(referenceCode);
  }

  const currentStatus = trackedIssue ? statusMeta[trackedIssue.status] : undefined;
  const stepIndex = trackedIssue
    ? STEPS.indexOf(trackedIssue.status as (typeof STEPS)[number])
    : -1;

  return (
    <div className="space-y-8">
      <section className="scroll-mt-28 rounded-2xl border border-gray-200 bg-white p-5 sm:p-7">
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-xl bg-orange-50 p-3 text-[#ff6600]">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#171717]">
              {t("communityFormTitle")}
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              {t("communityFormDescription")}
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {receipt ? (
            <motion.div
              key="receipt"
              {...swapTransition}
              ref={(element) => {
                if (element && focusOnMount.current === "receipt") {
                  focusOnMount.current = null;
                  revealPanel(element);
                }
              }}
              tabIndex={-1}
              aria-live="polite"
              className={`scroll-mt-28 rounded-xl border p-5 outline-none transition-colors duration-300 ${
                receipt.phase === "done"
                  ? "border-green-200 bg-green-50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div
                className={`flex items-center gap-2 font-semibold ${
                  receipt.phase === "done" ? "text-green-800" : "text-gray-800"
                }`}
              >
                {receipt.phase === "done" ? (
                  <SuccessCheck className="size-6" />
                ) : (
                  <Spinner className="size-5" aria-hidden="true" />
                )}
                {receipt.phase === "done"
                  ? t("submissionConfirmationTitle")
                  : t("sendingReport")}
              </div>

              <p
                className={`mt-2 text-sm leading-6 ${
                  receipt.phase === "done" ? "text-green-800" : "text-gray-600"
                }`}
              >
                {receipt.phase === "done"
                  ? t("saveTrackingDetails")
                  : t("generatingReference")}
              </p>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  {t("referenceCodeLabel")}
                </p>
                <div className="mt-1 flex min-h-[3.25rem] items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white p-3">
                  {receipt.phase === "done" ? (
                    <>
                      <motion.code
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={springs.default}
                        className="break-all text-base font-bold tracking-wide text-gray-900"
                      >
                        {receipt.referenceCode}
                      </motion.code>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        transition={springs.snappy}
                        onClick={() => copyValue(receipt.referenceCode)}
                        className="relative shrink-0 rounded-md p-2 text-gray-600 hover:bg-gray-100"
                        aria-label={copied ? t("copied") : t("copyReferenceCode")}
                      >
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span
                            key={copied ? "copied" : "copy"}
                            className="block"
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.6, transition: springs.exit }}
                            transition={springs.snappy}
                          >
                            {copied ? (
                              <Check size={17} className="text-green-700" />
                            ) : (
                              <Clipboard size={17} />
                            )}
                          </motion.span>
                        </AnimatePresence>
                      </motion.button>
                    </>
                  ) : (
                    <PendingValue className="h-5 w-52" />
                  )}
                </div>
              </div>

              {/* Evidence upload: progress, success, or retry */}
              <AnimatePresence initial={false}>
                {uploadProgress !== null && (
                  <motion.div
                    key="uploading"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0, transition: springs.exit }}
                    transition={springs.default}
                    className="overflow-hidden"
                  >
                    <div className="mt-5 space-y-2">
                      <p className="text-sm font-medium text-gray-700">
                        {t("evidenceUploadProgress").replace(
                          "{percent}",
                          String(Math.round(uploadProgress * 100))
                        )}
                      </p>
                      <ProgressBar value={uploadProgress} label={t("uploading")} />
                    </div>
                  </motion.div>
                )}

                {receipt.phase === "done" &&
                  uploadProgress === null &&
                  evidence.length > 0 && (
                    <motion.div
                      key="retry"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, transition: springs.exit }}
                      transition={springs.default}
                      className="overflow-hidden"
                    >
                      <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-semibold text-amber-900">
                          {t("evidenceNeedsUpload").replace("{count}", String(evidence.length))}
                        </p>
                        <SubmitButton
                          type="button"
                          phase="idle"
                          icon={<Upload size={16} />}
                          label={t("retryEvidenceUpload")}
                          pendingLabel={t("uploading")}
                          onClick={() =>
                            uploadEvidence(receipt.referenceCode, receipt.trackingToken, evidence)
                          }
                          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#c94f00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a84300]"
                        />
                      </div>
                    </motion.div>
                  )}

                {evidenceUploaded > 0 && uploadProgress === null && (
                  <motion.p
                    key="uploaded"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: springs.exit }}
                    transition={springs.default}
                    className="mt-4 flex items-center gap-2 text-sm font-medium text-green-800"
                  >
                    <Check size={16} />
                    {t("evidenceUploadedSuccessfully").replace("{count}", String(evidenceUploaded))}
                  </motion.p>
                )}
              </AnimatePresence>

              {receipt.phase === "done" && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springs.default, delay: 0.1 }}
                  className="mt-5 flex flex-wrap gap-3"
                >
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    transition={springs.snappy}
                    onClick={() => trackReference(receipt.referenceCode)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#171717] px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
                  >
                    <Search size={16} />
                    {t("trackThisReport")}
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    transition={springs.snappy}
                    disabled={uploadProgress !== null}
                    onClick={() => {
                      setReceipt(null);
                      setEvidence([]);
                      setEvidenceUploaded(0);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <RotateCcw size={16} />
                    {t("submitAnotherIssue")}
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.form
              key="form"
              {...swapTransition}
              onSubmit={submitIssue}
              noValidate
              className="space-y-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor={FIELD_IDS.category} className="mb-2 block text-sm font-medium text-gray-700">
                    {t("issueCategoryLabel")} *
                  </label>
                  <select
                    {...a11y("category")}
                    required
                    value={category}
                    onChange={(event) => {
                      setCategory(event.target.value);
                      touch("category");
                    }}
                    className={fieldClass(Boolean(visibleError("category")), "text-gray-900")}
                  >
                    <option value="" disabled>
                      {t("selectIssueCategory")}
                    </option>
                    {categories.map((item) => (
                      <option key={item.value} value={item.value}>
                        {t(item.key)}
                      </option>
                    ))}
                  </select>
                  <FieldError id={`${FIELD_IDS.category}-error`} message={visibleError("category")} />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor={FIELD_IDS.title} className="mb-2 block text-sm font-medium text-gray-700">
                    {t("issueTitleLabel")} *
                  </label>
                  <input
                    {...a11y("title")}
                    required
                    minLength={5}
                    maxLength={150}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    onBlur={() => title && touch("title")}
                    placeholder={t("issueTitlePlaceholder")}
                    className={fieldClass(Boolean(visibleError("title")))}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <FieldError id={`${FIELD_IDS.title}-error`} message={visibleError("title")} />
                    <p className="ml-auto mt-1 shrink-0 text-xs text-gray-400">
                      {title.length}/150
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor={FIELD_IDS.lga} className="mb-2 block text-sm font-medium text-gray-700">
                    {t("requiredLga")}
                  </label>
                  <select
                    {...a11y("lga")}
                    required
                    value={selectedLgaId}
                    onChange={(event) => {
                      const selected = lgas.find((area) => area.id === event.target.value);
                      setSelectedLgaId(event.target.value);
                      setLga(selected?.name ?? "");
                      setWard("");
                      touch("lga");
                    }}
                    disabled={loadingLocations || lgas.length === 0}
                    className={fieldClass(Boolean(visibleError("lga")), "text-gray-900")}
                  >
                    <option value="" disabled>
                      {loadingLocations ? t("checking") : t("selectLgaPlaceholder")}
                    </option>
                    {lgas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                  <FieldError id={`${FIELD_IDS.lga}-error`} message={visibleError("lga")} />
                </div>

                <div>
                  <label htmlFor="ci-ward" className="mb-2 block text-sm font-medium text-gray-700">
                    {t("wardLabel")}
                  </label>
                  <select
                    id="ci-ward"
                    value={ward}
                    onChange={(event) => setWard(event.target.value)}
                    disabled={!selectedLgaId || loadingLocations}
                    className={fieldClass(false, "text-gray-900")}
                  >
                    <option value="">
                      {selectedLgaId && wards.length === 0
                        ? t("noWardsAvailable")
                        : t("wardPlaceholder")}
                    </option>
                    {wards.map((area) => (
                      <option key={area.id} value={area.name}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="ci-community" className="mb-2 block text-sm font-medium text-gray-700">
                    {t("communityLabel")}
                  </label>
                  <input
                    id="ci-community"
                    maxLength={150}
                    value={community}
                    onChange={(event) => setCommunity(event.target.value)}
                    placeholder={t("communityPlaceholder")}
                    className={fieldClass(false)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="ci-location" className="mb-2 block text-sm font-medium text-gray-700">
                    {t("additionalLocationLabel")}
                  </label>
                  <input
                    id="ci-location"
                    maxLength={300}
                    value={locationDescription}
                    onChange={(event) => setLocationDescription(event.target.value)}
                    placeholder={t("locationPlaceholder")}
                    className={fieldClass(false)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="ci-reporter-name" className="mb-2 block text-sm font-medium text-gray-700">
                    {t("reporterNameLabel")}
                  </label>
                  <input
                    id="ci-reporter-name"
                    type="text"
                    maxLength={100}
                    autoComplete="name"
                    value={reporterName}
                    onChange={(event) => setReporterName(event.target.value)}
                    placeholder={t("reporterNamePlaceholder")}
                    className={fieldClass(false)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor={FIELD_IDS.description} className="mb-2 block text-sm font-medium text-gray-700">
                    {t("describeIssueLabel")} *
                  </label>
                  <textarea
                    {...a11y("description")}
                    required
                    minLength={20}
                    maxLength={5000}
                    rows={6}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    onBlur={() => description && touch("description")}
                    placeholder={t("communityDescriptionPlaceholder")}
                    className={fieldClass(Boolean(visibleError("description")), "resize-y")}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <FieldError
                      id={`${FIELD_IDS.description}-error`}
                      message={visibleError("description")}
                    />
                    <p className="ml-auto mt-1 shrink-0 text-xs text-gray-400">
                      {t("charactersCount").replace("{count}", String(description.length))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
                <label htmlFor="ci-evidence" className="mb-2 block text-sm font-medium text-gray-700">
                  {t("supportingEvidenceOptional")}
                </label>
                <p className="mb-3 text-xs leading-5 text-gray-500">
                  {t("evidenceInstructions")}
                </p>
                <input
                  id="ci-evidence"
                  type="file"
                  multiple
                  accept={ALLOWED_TYPES.join(",")}
                  disabled={submitting || evidence.length >= MAX_FILES}
                  onChange={(event) => {
                    const incoming = Array.from(event.target.files ?? []);
                    event.target.value = "";
                    addFiles(incoming);
                  }}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:font-semibold file:text-orange-800 hover:file:bg-orange-200 disabled:opacity-60"
                />

                <motion.ul layout className="mt-3 space-y-2">
                  <AnimatePresence initial={false}>
                    {evidence.map(({ id, file }) => (
                      <motion.li
                        key={id}
                        layout
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, transition: springs.exit }}
                        transition={springs.move}
                        className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate text-gray-700">
                          {file.name}
                          <span className="ml-2 text-xs text-gray-400">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </span>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() =>
                            setEvidence((current) => current.filter((item) => item.id !== id))
                          }
                          className="shrink-0 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-red-600"
                          aria-label={t("removeEvidenceLabel").replace("{name}", file.name)}
                        >
                          <X size={16} />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </motion.ul>
              </div>

              <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
                <label>
                  Website
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                  />
                </label>
              </div>

              <div className="flex items-start gap-2 text-xs leading-5 text-gray-500">
                <ShieldCheck size={17} className="mt-0.5 shrink-0" />
                <p>{t("privacyReviewNotice")}</p>
              </div>

              {submitError && (
                <motion.p
                  ref={(element) => {
                    if (element && focusOnMount.current === "error") {
                      focusOnMount.current = null;
                      element.scrollIntoView({ block: "center" });
                      shake(element);
                    }
                  }}
                  role="alert"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={springs.default}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {submitError}
                </motion.p>
              )}

              <SubmitButton
                phase={submitting ? "pending" : "idle"}
                icon={<Send size={16} />}
                label={t("submitCommunityIssue")}
                pendingLabel={t("submitting")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#c94f00] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#a84300] disabled:cursor-not-allowed disabled:not-data-[phase=pending]:opacity-60 sm:w-auto"
              />
            </motion.form>
          )}
        </AnimatePresence>
      </section>

      <section
        id="track"
        ref={trackSectionRef}
        tabIndex={-1}
        className="scroll-mt-28 rounded-2xl border border-gray-200 bg-white p-5 outline-none sm:p-7"
      >
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-xl bg-orange-50 p-3 text-[#ff6600]">
            <Search size={23} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#171717]">
              {t("trackReportTitle")}
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              {t("trackReportDescription")}
            </p>
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void runTracking(trackingIdentifier);
          }}
          noValidate
          className="space-y-4"
        >
          <div>
            <label htmlFor="ci-track" className="mb-2 block text-sm font-medium text-gray-700">
              {t("referenceOrTitleLabel")}
            </label>
            <input
              id="ci-track"
              required
              value={trackingIdentifier}
              onChange={(event) => {
                setTrackingIdentifier(event.target.value);
                if (trackError) setTrackError("");
              }}
              placeholder={t("trackingPlaceholder")}
              maxLength={150}
              aria-invalid={Boolean(trackError) || undefined}
              aria-describedby={trackError ? "ci-track-error" : "ci-track-hint"}
              className={fieldClass(Boolean(trackError))}
            />
            {!trackError && REFERENCE_PATTERN.test(trackingIdentifier.trim()) && (
              <p id="ci-track-hint" className="mt-1.5 flex items-center gap-1 text-xs text-green-700">
                <Check size={13} /> {t("referenceCodeLabel")}
              </p>
            )}
            <div aria-live="polite">
              <FieldError id="ci-track-error" message={trackError} />
            </div>
          </div>

          <SubmitButton
            phase={tracking ? "pending" : "idle"}
            icon={<Search size={16} />}
            label={t("trackReport")}
            pendingLabel={t("checking")}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#171717] px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:not-data-[phase=pending]:opacity-60"
          />
        </form>

        <AnimatePresence mode="wait" initial={false}>
          {tracking ? (
            <motion.div
              key="tracking"
              {...swapTransition}
              aria-hidden="true"
              className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5"
            >
              <div className="flex justify-between">
                <PendingValue className="h-4 w-36" />
                <PendingValue className="h-5 w-24 rounded-full" />
              </div>
              <PendingValue className="h-1.5 w-full rounded-full" />
              <PendingValue className="h-5 w-2/3" />
              <PendingValue className="h-4 w-1/3" />
            </motion.div>
          ) : trackedIssue && currentStatus ? (
            <motion.div
              key={trackedIssue.reference_code}
              {...swapTransition}
              aria-live="polite"
              className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-semibold text-gray-800">
                  {trackedIssue.reference_code}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${currentStatus.tone}`}>
                  {t(currentStatus.label)}
                </span>
              </div>

              {/* Where the report is in the process */}
              <div className="mt-4" aria-label={t("reportProgress")}>
                <ol className="grid grid-cols-4 gap-1.5">
                  {STEPS.map((step, index) => {
                    const reached = stepIndex >= index;
                    return (
                      <li key={step} className="space-y-1.5">
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                          <motion.div
                            className={`h-full origin-left rounded-full ${
                              trackedIssue.status === "closed" ? "bg-gray-400" : "bg-[#c94f00]"
                            }`}
                            initial={{ scaleX: 0 }}
                            animate={{
                              scaleX: reached || trackedIssue.status === "closed" ? 1 : 0,
                            }}
                            transition={{ ...springs.default, delay: 0.08 * index }}
                          />
                        </div>
                        <p
                          className={`text-[11px] leading-4 ${
                            index === stepIndex ? "font-semibold text-gray-900" : "text-gray-500"
                          }`}
                          aria-current={index === stepIndex ? "step" : undefined}
                        >
                          {t(statusMeta[step].label)}
                        </p>
                      </li>
                    );
                  })}
                </ol>
                <p className="mt-3 text-sm leading-6 text-gray-700">{t(currentStatus.help)}</p>
              </div>

              <h3 className="mt-4 font-semibold text-gray-900">{trackedIssue.title}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {t(
                  categories.find((item) => item.value === trackedIssue.category)?.key ??
                    "categoryOther"
                )}
              </p>

              {trackedIssue.public_summary && (
                <div className="mt-4 rounded-lg bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t("reviewUpdateLabel")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-700">
                    {trackedIssue.public_summary}
                  </p>
                </div>
              )}

              {trackedIssue.resolution_summary && (
                <div className="mt-3 rounded-lg bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t("resolutionUpdateLabel")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-700">
                    {trackedIssue.resolution_summary}
                  </p>
                </div>
              )}

              <div className="mt-4 grid gap-2 border-t border-gray-200 pt-4 text-xs text-gray-500 sm:grid-cols-2">
                <p>
                  {t("submittedDate")}{" "}
                  {new Date(trackedIssue.submitted_at).toLocaleString(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                <p>
                  {t("lastUpdated")}{" "}
                  {new Date(trackedIssue.updated_at).toLocaleString(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50 p-4">
        <MapPin size={19} className="mt-0.5 shrink-0 text-[#ff6600]" />
        <p className="text-sm leading-6 text-gray-700">{t("communityAccountabilityNotice")}</p>
      </div>
    </div>
  );
}
