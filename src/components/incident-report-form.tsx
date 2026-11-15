"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Clipboard, RotateCcw, Send, ShieldCheck } from "lucide-react";
import { notify } from "@/components/notifications/notify";
import { useLanguage } from "@/components/language-provider";
import { Spinner } from "@/components/ui/spinner";
import {
  FieldError,
  PendingValue,
  SubmitButton,
  SuccessCheck,
  fieldClass,
  revealField,
  revealPanel,
  shake,
  swapTransition,
} from "@/components/ui/form-feedback";
import { springs } from "@/lib/motion";
import type { TranslationKey } from "@/lib/i18n/translations";

const categories: { value: string; key: TranslationKey }[] = [
  { value: "vote_buying", key: "voteBuying" },
  { value: "intimidation", key: "voterIntimidation" },
  { value: "violence", key: "electoralViolence" },
  { value: "ballot_issue", key: "ballotIssues" },
  { value: "result_dispute", key: "resultDisputes" },
  { value: "accessibility", key: "accessibilityBarriers" },
  { value: "logistics", key: "electoralLogistics" },
  { value: "misinformation", key: "electoralMisinformation" },
  { value: "other", key: "otherIncident" },
];

type Election = {
  id: string;
  name: string;
  election_date: string | null;
};

type ElectoralArea = {
  id: string;
  name: string;
  parent_id: string | null;
  area_type: "state" | "lga" | "ward";
};

type Field = "election" | "state" | "lga" | "category" | "description";
const FIELD_ORDER: Field[] = ["election", "state", "lga", "category", "description"];
const FIELD_IDS: Record<Field, string> = {
  election: "ir-election",
  state: "ir-state",
  lga: "ir-lga",
  category: "ir-category",
  description: "ir-description",
};

type Receipt = { phase: "pending" } | { phase: "done"; reference: string };

export default function IncidentReportForm() {
  const { t } = useLanguage();

  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [incidentTime, setIncidentTime] = useState("");
  const [website, setWebsite] = useState("");
  const [pollingUnit, setPollingUnit] = useState("");

  const [elections, setElections] = useState<Election[]>([]);
  const [areas, setAreas] = useState<ElectoralArea[]>([]);
  const [electionId, setElectionId] = useState("");
  const [stateId, setStateId] = useState("");
  const [lgaId, setLgaId] = useState("");
  const [wardId, setWardId] = useState("");

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsFailed, setOptionsFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [copied, setCopied] = useState(false);
  const focusOnMount = useRef<"receipt" | "error" | null>(null);

  const [showAllErrors, setShowAllErrors] = useState(false);
  const [touched, setTouched] = useState<Set<Field>>(new Set());

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      try {
        const response = await fetch("/api/election-incidents", {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok) throw new Error(result.error);
        if (!active) return;

        const loadedElections: Election[] = result.elections ?? [];
        const loadedAreas: ElectoralArea[] = result.areas ?? [];

        setElections(loadedElections);
        setAreas(loadedAreas);

        const gombe = loadedAreas.find(
          (area) => area.area_type === "state" && area.name.toLowerCase() === "gombe"
        );

        if (gombe) setStateId(gombe.id);
        if (loadedElections.length === 1) setElectionId(loadedElections[0].id);
      } catch (error) {
        console.error("Incident form options:", error);
        if (active) setOptionsFailed(true);
      } finally {
        if (active) setLoadingOptions(false);
      }
    }

    loadOptions();

    return () => {
      active = false;
    };
  }, []);

  const states = useMemo(() => areas.filter((area) => area.area_type === "state"), [areas]);
  const lgas = useMemo(
    () => areas.filter((area) => area.area_type === "lga" && area.parent_id === stateId),
    [areas, stateId]
  );
  const wards = useMemo(
    () => areas.filter((area) => area.area_type === "ward" && area.parent_id === lgaId),
    [areas, lgaId]
  );

  const errors = useMemo(() => {
    const result: Partial<Record<Field, string>> = {};
    if (!electionId) result.election = t("errElection");
    if (!stateId) result.state = t("errState");
    if (!lgaId) result.lga = t("errIncidentLga");
    if (!category) result.category = t("errIncidentCategory");
    if (description.trim().length < 20) {
      result.description = t("errDescription").replace(
        "{count}",
        String(description.trim().length)
      );
    }
    return result;
  }, [electionId, stateId, lgaId, category, description, t]);

  const visibleError = (field: Field) =>
    showAllErrors || touched.has(field) ? errors[field] : undefined;

  const touch = (field: Field) =>
    setTouched((current) => (current.has(field) ? current : new Set(current).add(field)));

  const a11y = (field: Field) => {
    const invalid = Boolean(visibleError(field));
    return {
      id: FIELD_IDS[field],
      "aria-invalid": invalid || undefined,
      "aria-describedby": invalid ? `${FIELD_IDS[field]}-error` : undefined,
    };
  };

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const firstInvalid = FIELD_ORDER.find((field) => errors[field]);
    if (firstInvalid) {
      setShowAllErrors(true);
      revealField(FIELD_IDS[firstInvalid]);
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    // Optimistic: answer the press immediately with a receipt.
    focusOnMount.current = "receipt";
    setReceipt({ phase: "pending" });

    try {
      const response = await fetch("/api/election-incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          election_id: electionId,
          state_id: stateId,
          lga_id: lgaId,
          ward_id: wardId || null,
          polling_unit: pollingUnit.trim(),
          category,
          description: description.trim(),
          incident_time: incidentTime ? new Date(incidentTime).toISOString() : null,
          website,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || t("somethingWentWrong"));
      }

      setReceipt({ phase: "done", reference: result.reference ?? "" });

      setCategory("");
      setDescription("");
      setIncidentTime("");
      setPollingUnit("");
      setLgaId("");
      setWardId("");
      setWebsite("");
      setShowAllErrors(false);
      setTouched(new Set());
    } catch (error) {
      // Roll back: the form returns with everything the user entered.
      const message = error instanceof Error ? error.message : t("somethingWentWrong");
      focusOnMount.current = "error";
      setReceipt(null);
      setSubmitError(message);
      notify.error(t("reportSubmissionFailed"), message);
    } finally {
      setSubmitting(false);
    }
  }

  async function copyReference(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      notify.error(t("copyFailed"), t("copyManually"));
    }
  }

  return (
    <section className="scroll-mt-28 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-[#171717]">{t("reportIncidentTitle")}</h3>
        <p className="mt-1 text-sm leading-6 text-gray-500">{t("reportIncidentDescription")}</p>
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
              receipt.phase === "done" ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"
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
              {receipt.phase === "done" ? t("reportSubmitted") : t("sendingReport")}
            </div>

            <p
              className={`mt-2 text-sm leading-6 ${
                receipt.phase === "done" ? "text-green-800" : "text-gray-600"
              }`}
            >
              {receipt.phase === "done" ? t("incidentReceiptHelp") : t("generatingReference")}
            </p>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                {t("incidentReferenceLabel")}
              </p>
              <div className="mt-1 flex min-h-[3.25rem] items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white p-3">
                {receipt.phase === "done" && receipt.reference ? (
                  <>
                    <motion.code
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={springs.default}
                      className="break-all text-sm font-bold text-gray-900"
                    >
                      {receipt.reference}
                    </motion.code>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      transition={springs.snappy}
                      onClick={() => copyReference(receipt.reference)}
                      className="shrink-0 rounded-md p-2 text-gray-600 hover:bg-gray-100"
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
                  <PendingValue className="h-5 w-64 max-w-full" />
                )}
              </div>
            </div>

            {receipt.phase === "done" && (
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springs.default, delay: 0.1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setReceipt(null)}
                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <RotateCcw size={16} />
                {t("reportAnotherIncident")}
              </motion.button>
            )}
          </motion.div>
        ) : (
          <motion.form
            key="form"
            {...swapTransition}
            onSubmit={submitReport}
            noValidate
            className="space-y-4"
          >
            <div>
              <label htmlFor={FIELD_IDS.election} className="mb-2 block text-sm font-medium text-gray-700">
                {t("requiredElection")}
              </label>
              <select
                {...a11y("election")}
                required
                value={electionId}
                onChange={(event) => {
                  setElectionId(event.target.value);
                  touch("election");
                }}
                disabled={loadingOptions || elections.length === 0}
                className={fieldClass(Boolean(visibleError("election")))}
              >
                <option value="">
                  {loadingOptions ? t("loadingElections") : t("selectElection")}
                </option>
                {elections.map((election) => (
                  <option key={election.id} value={election.id}>
                    {election.name}
                    {election.election_date
                      ? ` (${new Date(election.election_date).getFullYear()})`
                      : ""}
                  </option>
                ))}
              </select>
              {!loadingOptions && !optionsFailed && elections.length === 0 && (
                <p className="mt-1 text-xs text-amber-700">{t("noAvailableElections")}</p>
              )}
              <FieldError id={`${FIELD_IDS.election}-error`} message={visibleError("election")} />
            </div>

            <div>
              <label htmlFor={FIELD_IDS.state} className="mb-2 block text-sm font-medium text-gray-700">
                {t("requiredState")}
              </label>
              <select
                {...a11y("state")}
                required
                value={stateId}
                onChange={(event) => {
                  setStateId(event.target.value);
                  setLgaId("");
                  setWardId("");
                  touch("state");
                }}
                disabled={loadingOptions}
                className={fieldClass(Boolean(visibleError("state")))}
              >
                <option value="">{t("selectState")}</option>
                {states.map((state) => (
                  <option key={state.id} value={state.id}>
                    {state.name}
                  </option>
                ))}
              </select>
              <FieldError id={`${FIELD_IDS.state}-error`} message={visibleError("state")} />
            </div>

            <div>
              <label htmlFor={FIELD_IDS.lga} className="mb-2 block text-sm font-medium text-gray-700">
                {t("requiredLga")}
              </label>
              <select
                {...a11y("lga")}
                required
                value={lgaId}
                onChange={(event) => {
                  setLgaId(event.target.value);
                  setWardId("");
                  touch("lga");
                }}
                disabled={!stateId || loadingOptions}
                className={fieldClass(Boolean(visibleError("lga")))}
              >
                <option value="">{t("selectLga")}</option>
                {lgas.map((lga) => (
                  <option key={lga.id} value={lga.id}>
                    {lga.name}
                  </option>
                ))}
              </select>
              <FieldError id={`${FIELD_IDS.lga}-error`} message={visibleError("lga")} />
            </div>

            <div>
              <label htmlFor="ir-ward" className="mb-2 block text-sm font-medium text-gray-700">
                {t("wardRegistrationArea")}
              </label>
              <select
                id="ir-ward"
                value={wardId}
                onChange={(event) => setWardId(event.target.value)}
                disabled={!lgaId || loadingOptions}
                className={fieldClass(false)}
              >
                <option value="">
                  {lgaId && wards.length === 0 ? t("noWardsAvailable") : t("selectWardOptional")}
                </option>
                {wards.map((ward) => (
                  <option key={ward.id} value={ward.id}>
                    {ward.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">{t("inecAreaNote")}</p>
            </div>

            <div>
              <label htmlFor="ir-polling-unit" className="mb-2 block text-sm font-medium text-gray-700">
                {t("pollingUnitNameCode")}
              </label>
              <input
                id="ir-polling-unit"
                type="text"
                maxLength={150}
                value={pollingUnit}
                onChange={(event) => setPollingUnit(event.target.value)}
                placeholder={t("pollingUnitPlaceholder")}
                className={fieldClass(false)}
              />
            </div>

            <div>
              <label htmlFor={FIELD_IDS.category} className="mb-2 block text-sm font-medium text-gray-700">
                {t("requiredIncidentCategory")}
              </label>
              <select
                {...a11y("category")}
                required
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  touch("category");
                }}
                className={fieldClass(Boolean(visibleError("category")))}
              >
                <option value="">{t("selectCategory")}</option>
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {t(item.key)}
                  </option>
                ))}
              </select>
              <FieldError id={`${FIELD_IDS.category}-error`} message={visibleError("category")} />
            </div>

            <div>
              <label htmlFor="ir-time" className="mb-2 block text-sm font-medium text-gray-700">
                {t("whenDidItHappen")}
              </label>
              <input
                id="ir-time"
                type="datetime-local"
                value={incidentTime}
                onChange={(event) => setIncidentTime(event.target.value)}
                className={fieldClass(false)}
              />
            </div>

            <div>
              <label htmlFor={FIELD_IDS.description} className="mb-2 block text-sm font-medium text-gray-700">
                {t("describeIncident")}
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
                placeholder={t("incidentDescriptionPlaceholder")}
                className={fieldClass(Boolean(visibleError("description")), "resize-y")}
              />
              <div className="flex items-start justify-between gap-3">
                <FieldError id={`${FIELD_IDS.description}-error`} message={visibleError("description")} />
                <p className="ml-auto mt-1 shrink-0 text-xs text-gray-400">
                  {t("characters").replace("{count}", String(description.length))}
                </p>
              </div>
            </div>

            {/* Honeypot field for basic bot detection */}
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

            {optionsFailed && (
              <p role="alert" className="text-sm text-red-600">
                {t("formOptionsLoadFailed")}
              </p>
            )}

            <div className="flex items-start gap-2 text-xs leading-5 text-gray-500">
              <ShieldCheck size={17} className="mt-0.5 shrink-0" />
              <p>{t("privacyWarning")}</p>
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
              label={t("submitIncidentReport")}
              pendingLabel={t("submitting")}
              disabled={
                loadingOptions || optionsFailed || elections.length === 0 || states.length === 0
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#ff6600] px-5 py-3 font-medium text-white transition-colors hover:bg-[#e85d00] disabled:cursor-not-allowed disabled:not-data-[phase=pending]:opacity-60 sm:w-auto"
            />
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  );
}
