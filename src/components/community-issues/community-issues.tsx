"use client";

import { useEffect, useMemo, useState } from "react";
import { usePublicData } from "@/lib/swr";
import { useLanguage } from "@/components/language-provider";
import {
  CheckCircle2,
  Clipboard,
  FileText,
  MapPin,
  Search,
  Send,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { notify } from "@/components/notifications/notify";

const categories = [
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

type ElectoralArea = {
  id: string;
  name: string;
  parent_id: string | null;
  area_type: "state" | "lga" | "ward";
};

const statusTranslationKeys: Record<string, string> = {
  submitted: "statusSubmitted",
  under_review: "statusUnderReview",
  action_required: "statusActionRequired",
  resolved: "statusResolved",
  closed: "statusClosed",
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

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function CommunityIssues() {
  const { t, language } = useLanguage();
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [state, setState] = useState("Gombe");
  const [lga, setLga] = useState("");
  const [ward, setWard] = useState("");
  const [selectedLgaId, setSelectedLgaId] = useState("");

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
          area.name.trim().toLowerCase() === "gombe"
      )?.id ?? "",
    [areas]
  );

  const lgas: ElectoralArea[] = areas.filter(
    (area) => area.area_type === "lga" && area.parent_id === gombeStateId
  );

  const wards: ElectoralArea[] = areas.filter(
    (area) => area.area_type === "ward" && area.parent_id === selectedLgaId
  );

  useEffect(() => {
    if (!locationError || locationData) return;
    console.error("Community issue locations:", locationError);
    notify.error(
      "Location loading failed",
      "Please refresh the page and try again."
    );
  }, [locationError, locationData]);
  const [community, setCommunity] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<File[]>([]);
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const [evidenceUploaded, setEvidenceUploaded] = useState(0);
  const [submissionResult, setSubmissionResult] = useState<{
    referenceCode: string;
    trackingToken: string;
    title: string;
  } | null>(null);

  const [trackingIdentifier, setTrackingIdentifier] = useState("");
  const [tracking, setTracking] = useState(false);
  const [trackedIssue, setTrackedIssue] = useState<TrackedIssue | null>(null);

  async function uploadEvidence(
    reference: string,
    token: string,
    files: File[]
  ) {
    if (!files.length) return;

    setEvidenceUploading(true);

    try {
      const formData = new FormData();
      formData.append("referenceCode", reference);
      formData.append("trackingToken", token);
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/community-issues/evidence", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t("evidenceUploadFailed"));
      }

      setEvidenceUploaded((current) => current + (result.uploaded ?? files.length));
      setSelectedEvidence([]);
      notify.success(
        t("evidenceUploaded"),
        t("evidenceAttached").replace("{count}", String(result.uploaded ?? files.length))
      );
    } catch (error) {
      notify.error(
        t("evidenceUploadFailed"),
        error instanceof Error ? error.message : t("pleaseTryAgain")
      );
    } finally {
      setEvidenceUploading(false);
    }
  }

  async function submitIssue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!category || title.trim().length < 5 ||
        description.trim().length < 20 || lga.trim().length < 2) {
      notify.error(
        t("incompleteCommunityReport"),
        t("completeRequiredFields")
      );
      return;
    }

    setSubmitting(true);
    setSubmissionResult(null);

    try {
      const response = await fetch("/api/community-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          title: title.trim(),
          description: description.trim(),
          state: state.trim(),
          lga: lga.trim(),
          ward: ward.trim(),
          community: community.trim(),
          location_description: locationDescription.trim(),
          website,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t("unableToSubmitIssue"));
      }

      setSubmissionResult({
        referenceCode: result.referenceCode,
        trackingToken: result.trackingToken,
        title,
      });

      if (selectedEvidence.length > 0) {
        await uploadEvidence(
          result.referenceCode,
          result.trackingToken,
          selectedEvidence
        );
      }

      setCategory("");
      setTitle("");
      setDescription("");
      setLga("");
      setWard("");
      setSelectedLgaId("");
      setCommunity("");
      setLocationDescription("");
      setWebsite("");

      notify.success(
        t("communityIssueSubmitted"),
        t("keepTrackingDetailsSafe")
      );
    } catch (error) {
      notify.error(
        t("submissionFailed"),
        error instanceof Error ? error.message : t("pleaseTryAgain")
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function trackIssue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTracking(true);
    setTrackedIssue(null);

    try {
      const response = await fetch("/api/community-issues/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchTerm: trackingIdentifier.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t("unableToFindReport"));
      }

      setTrackedIssue(result.issue);
    } catch (error) {
      notify.error(
        t("trackingFailed"),
        error instanceof Error ? error.message : t("pleaseTryAgain")
      );
    } finally {
      setTracking(false);
    }
  }

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      notify.success(t("copied"), t("valueCopied"));
    } catch {
      notify.error(t("copyFailed"), t("copyManually"));
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7">
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

        {submissionResult && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5">
            <div className="flex items-center gap-2 font-semibold text-green-800">
              <CheckCircle2 size={20} />
              {t("submissionConfirmationTitle")}
            </div>
            <p className="mt-2 text-sm leading-6 text-green-800">
              {t("saveTrackingDetails")}
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-green-800">
                  {t("referenceCodeLabel")}
                </label>
                <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-white p-3">
                  <code className="break-all text-sm font-bold text-gray-900">
                    {submissionResult.referenceCode}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyValue(submissionResult.referenceCode)}
                    className="shrink-0 rounded-md p-2 text-gray-600 hover:bg-gray-100"
                    aria-label={t("copyReferenceCode")}
                  >
                    <Clipboard size={17} />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-green-800">
                  {t("privateTrackingTokenLabel")}
                </label>
                <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-white p-3">
                  <code className="break-all text-xs text-gray-900">
                    {submissionResult.trackingToken}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyValue(submissionResult.trackingToken)}
                    className="shrink-0 rounded-md p-2 text-gray-600 hover:bg-gray-100"
                    aria-label={t("copyTrackingToken")}
                  >
                    <Clipboard size={17} />
                  </button>
                </div>
              </div>
            </div>

            {selectedEvidence.length > 0 && (
              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  {t("evidenceNeedsUpload").replace("{count}", String(selectedEvidence.length))}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    uploadEvidence(
                      submissionResult.referenceCode,
                      submissionResult.trackingToken,
                      selectedEvidence
                    )
                  }
                  disabled={evidenceUploading}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#ff6600] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e85d00] disabled:opacity-60"
                >
                  <Upload size={16} />
                  {evidenceUploading ? t("uploading") : t("retryEvidenceUpload")}
                </button>
              </div>
            )}

            {evidenceUploaded > 0 && (
              <p className="mt-3 text-sm font-medium text-green-800">
                {t("evidenceUploadedSuccessfully").replace("{count}", String(evidenceUploaded))}
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                setTrackingIdentifier(submissionResult.referenceCode);
                setSubmissionResult(null);
              }}
              className="mt-4 text-sm font-semibold text-green-800 underline"
            >
              {t("useDetailsToTrack")}
            </button>
          </div>
        )}

        <form onSubmit={submitIssue} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t("issueCategoryLabel")} *
              </label>
              <select
                required
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-[#ff6600]"
              >
                <option value="" disabled>
                  {language === "ha" ? "Zaɓi nau'in matsala" : "Select Category"}
                </option>
                {categories.map((item) => {
                  const fallbackLabels: Record<string, { en: string; ha: string }> = {
                    education: { en: "Education", ha: "Ilimi" },
                    healthcare: { en: "Healthcare", ha: "Lafiya" },
                    water_sanitation: {
                      en: "Water and Sanitation",
                      ha: "Ruwa da tsaftar muhalli",
                    },
                    roads_transport: {
                      en: "Roads and Transport",
                      ha: "Hanyoyi da sufuri",
                    },
                    electricity: { en: "Electricity", ha: "Wutar lantarki" },
                    security: { en: "Security", ha: "Tsaro" },
                    environment: { en: "Environment", ha: "Muhalli" },
                    public_services: {
                      en: "Public Services",
                      ha: "Ayyukan gwamnati",
                    },
                    youth_development: {
                      en: "Youth Development",
                      ha: "Ci gaban matasa",
                    },
                    other: { en: "Other", ha: "Sauran" },
                  };

                  const translated = t(item.key as Parameters<typeof t>[0]);
                  const fallback = fallbackLabels[item.value];
                  const label =
                    typeof translated === "string" &&
                    translated.trim().length > 0 &&
                    translated !== item.key
                      ? translated
                      : fallback
                        ? fallback[language]
                        : item.value;

                  return (
                    <option key={item.value} value={item.value}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {language === "ha" ? "Ƙaramar Hukuma (LGA)" : "Local Government Area (LGA)"}
              </label>
              <select
                required
                value={selectedLgaId}
                onChange={(event) => {
                  const selected = lgas.find(
                    (area) => area.id === event.target.value
                  );

                  setSelectedLgaId(event.target.value);
                  setLga(selected?.name ?? "");
                  setWard("");
                }}
                disabled={loadingLocations || lgas.length === 0}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-[#ff6600] disabled:bg-gray-100"
              >
                <option value="" disabled>
                  {language === "ha" ? "Zaɓi ƙaramar hukuma" : "Select LGA"}
                </option>
                {lgas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t("wardLabel")}
              </label>
              <select
                value={ward}
                onChange={(event) => setWard(event.target.value)}
                disabled={!selectedLgaId || loadingLocations}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-[#ff6600] disabled:bg-gray-100"
              >
                <option value="">
                  {!selectedLgaId
                    ? t("wardPlaceholder")
                    : wards.length
                      ? t("wardPlaceholder")
                      : "No wards available"}
                </option>
                {wards.map((area) => (
                  <option key={area.id} value={area.name}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t("communityLabel")}
              </label>
              <input
                maxLength={150}
                value={community}
                onChange={(event) => setCommunity(event.target.value)}
                placeholder={t("communityPlaceholder")}
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#ff6600]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t("additionalLocationLabel")}
              </label>
              <input
                maxLength={300}
                value={locationDescription}
                onChange={(event) =>
                  setLocationDescription(event.target.value)
                }
                placeholder={t("locationPlaceholder")}
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#ff6600]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t("describeIssueLabel")} *
              </label>
              <textarea
                required
                minLength={20}
                maxLength={5000}
                rows={6}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t("communityDescriptionPlaceholder")}
                className="w-full resize-y rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#ff6600]"
              />
              <p className="mt-1 text-right text-xs text-gray-400">
                {t("charactersCount").replace("{count}", String(description.length))}
              </p>
            </div>
          </div>

          <div className="sm:col-span-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Supporting evidence (optional)
            </label>
            <p className="mb-3 text-xs leading-5 text-gray-500">
              {t("evidenceInstructions")}
            </p>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              disabled={submitting || evidenceUploading}
              onChange={(event) => {
                const incoming = Array.from(event.target.files ?? []);
                event.target.value = "";

                const allowedTypes = [
                  "image/jpeg",
                  "image/png",
                  "image/webp",
                  "application/pdf",
                ];
                const valid = incoming.filter((file) => {
                  if (!allowedTypes.includes(file.type)) {
                    notify.error(t("unsupportedFile"), t("fileNotAccepted").replace("{name}", file.name));
                    return false;
                  }
                  if (file.size > 10 * 1024 * 1024) {
                    notify.error(t("fileTooLarge"), t("fileExceedsLimit").replace("{name}", file.name));
                    return false;
                  }
                  return true;
                });

                setSelectedEvidence((current) => {
                  const remaining = 5 - current.length;
                  if (valid.length > remaining) {
                    notify.error(t("fileLimitReached"), t("maximumFiveFiles"));
                  }
                  return [...current, ...valid.slice(0, remaining)];
                });
              }}
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:font-semibold file:text-orange-800 hover:file:bg-orange-200"
            />

            {selectedEvidence.length > 0 && (
              <ul className="mt-3 space-y-2">
                {selectedEvidence.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${index}`}
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
                      disabled={submitting || evidenceUploading}
                      onClick={() =>
                        setSelectedEvidence((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                      className="shrink-0 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-red-600"
                      aria-label={t("removeEvidenceLabel").replace("{name}", file.name)}
                    >
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div
            aria-hidden="true"
            className="absolute -left-[10000px] h-px w-px overflow-hidden"
          >
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
            <p>
              {t("privacyReviewNotice")}
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#ff6600] px-5 py-3 font-semibold text-white transition hover:bg-[#e85d00] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <Send size={16} />
            {submitting ? t("submitting") : t("submitCommunityIssue")}
          </button>
        </form>
      </section>

      <section id="track" className="scroll-mt-28 rounded-2xl border border-gray-200 bg-white p-5 sm:p-7">
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

        <form onSubmit={trackIssue} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {t("referenceOrTitleLabel")}
            </label>
            <input
              required
              value={trackingIdentifier}
              onChange={(event) => setTrackingIdentifier(event.target.value)}
              placeholder={t("trackingPlaceholder")}
              maxLength={150}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#ff6600]"
            />
          </div>

          <button
            type="submit"
            disabled={tracking}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#171717] px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            <Search size={16} />
            {tracking ? t("checking") : t("trackReport")}
          </button>
        </form>

        {trackedIssue && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-semibold text-gray-800">
                {trackedIssue.reference_code}
              </span>
              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold capitalize text-orange-800">
                {statusTranslationKeys[trackedIssue.status] ? t(statusTranslationKeys[trackedIssue.status] as Parameters<typeof t>[0]) : trackedIssue.status}
              </span>
            </div>

            <h3 className="mt-4 font-semibold text-gray-900">
              {trackedIssue.title}
            </h3>
            <p className="mt-1 text-sm capitalize text-gray-500">
              {t((categories.find((item) => item.value === trackedIssue.category)?.key ?? "categoryOther") as Parameters<typeof t>[0])}
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
              <p>{t("submittedDate")} {new Date(trackedIssue.submitted_at).toLocaleString(language === "ha" ? "ha-NG" : "en-NG", { dateStyle: "medium", timeStyle: "short" })}</p>
              <p>{t("lastUpdated")} {new Date(trackedIssue.updated_at).toLocaleString(language === "ha" ? "ha-NG" : "en-NG", { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
          </div>
        )}
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50 p-4">
        <MapPin size={19} className="mt-0.5 shrink-0 text-[#ff6600]" />
        <p className="text-sm leading-6 text-gray-700">
          {t("communityAccountabilityNotice")}
        </p>
      </div>
    </div>
  );
}
