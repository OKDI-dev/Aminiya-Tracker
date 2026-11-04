"use client";

import { useEffect, useMemo, useState } from "react";
import { Send, ShieldCheck } from "lucide-react";
import { notify } from "@/components/notifications/notify";
import { useLanguage } from "@/components/language-provider";

const categories = [
  { value: "vote_buying", label: "Vote buying" },
  { value: "intimidation", label: "Voter intimidation" },
  { value: "violence", label: "Electoral violence" },
  { value: "ballot_issue", label: "Ballot-related issues" },
  { value: "result_dispute", label: "Election result disputes" },
  { value: "accessibility", label: "Accessibility barriers" },
  { value: "logistics", label: "Electoral logistics" },
  { value: "misinformation", label: "Electoral misinformation" },
  { value: "other", label: "Other incident" },
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

export default function IncidentReportForm() {
  const { t } = useLanguage();

  const categoryLabels: Record<string, string> = {
    vote_buying: t("voteBuying"),
    intimidation: t("voterIntimidation"),
    violence: t("electoralViolence"),
    ballot_issue: t("ballotIssues"),
    result_dispute: t("resultDisputes"),
    accessibility: t("accessibilityBarriers"),
    logistics: t("electoralLogistics"),
    misinformation: t("electoralMisinformation"),
    other: t("otherIncident"),
  };

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
  const [optionsError, setOptionsError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      try {
        const response = await fetch("/api/election-incidents", {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Unable to load form options.");
        }

        if (!active) return;

        const loadedElections: Election[] = result.elections ?? [];
        const loadedAreas: ElectoralArea[] = result.areas ?? [];

        setElections(loadedElections);
        setAreas(loadedAreas);

        const gombe = loadedAreas.find(
          (area) => area.area_type === "state" && area.name.toLowerCase() === "gombe"
        );

        if (gombe) setStateId(gombe.id);

        if (loadedElections.length === 1) {
          setElectionId(loadedElections[0].id);
        }
      } catch (error) {
        if (active) {
          setOptionsError(
            error instanceof Error
              ? error.message
              : "Unable to load election and location options."
          );
        }
      } finally {
        if (active) setLoadingOptions(false);
      }
    }

    loadOptions();

    return () => {
      active = false;
    };
  }, []);

  const states = useMemo(
    () => areas.filter((area) => area.area_type === "state"),
    [areas]
  );

  const lgas = useMemo(
    () =>
      areas.filter(
        (area) => area.area_type === "lga" && area.parent_id === stateId
      ),
    [areas, stateId]
  );

  const wards = useMemo(
    () =>
      areas.filter(
        (area) => area.area_type === "ward" && area.parent_id === lgaId
      ),
    [areas, lgaId]
  );

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !category ||
      !electionId ||
      !stateId ||
      !lgaId ||
      description.trim().length < 20
    ) {
      notify.error(
        t("incompleteReport"),
        t("incompleteReportDescription")
      );
      return;
    }

    setLoading(true);

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
          incident_time: incidentTime
            ? new Date(incidentTime).toISOString()
            : null,
          website,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to submit your report.");
      }

      notify.success(
        t("reportSubmitted"),
        result.message || t("reportReceived")
      );

      setCategory("");
      setDescription("");
      setIncidentTime("");
      setPollingUnit("");
      setLgaId("");
      setWardId("");
      setWebsite("");
    } catch (error) {
      notify.error(
        t("reportSubmissionFailed"),
        error instanceof Error
          ? error.message
          : t("somethingWentWrong")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-[#171717]">
          {t("reportIncidentTitle")}
        </h3>
        <p className="mt-1 text-sm leading-6 text-gray-500">
          {t("reportIncidentDescription")}
        </p>
      </div>

      <form onSubmit={submitReport} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {t("requiredElection")}
          </label>
          <select
            required
            value={electionId}
            onChange={(event) => setElectionId(event.target.value)}
            disabled={loadingOptions || elections.length === 0}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#ff6600] disabled:bg-gray-100"
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
          {!loadingOptions && elections.length === 0 && (
            <p className="mt-1 text-xs text-amber-700">
              {t("noAvailableElections")}
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {t("requiredState")}
          </label>
          <select
            required
            value={stateId}
            onChange={(event) => {
              setStateId(event.target.value);
              setLgaId("");
              setWardId("");
            }}
            disabled={loadingOptions}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#ff6600] disabled:bg-gray-100"
          >
            <option value="">{t("selectState")}</option>
            {states.map((state) => (
              <option key={state.id} value={state.id}>
                {state.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {t("requiredLga")}
          </label>
          <select
            required
            value={lgaId}
            onChange={(event) => {
              setLgaId(event.target.value);
              setWardId("");
            }}
            disabled={!stateId || loadingOptions}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#ff6600] disabled:bg-gray-100"
          >
            <option value="">{t("selectLga")}</option>
            {lgas.map((lga) => (
              <option key={lga.id} value={lga.id}>
                {lga.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {t("wardRegistrationArea")}
          </label>
          <select
            value={wardId}
            onChange={(event) => setWardId(event.target.value)}
            disabled={!lgaId || loadingOptions}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#ff6600] disabled:bg-gray-100"
          >
            <option value="">{t("selectWardOptional")}</option>
            {wards.map((ward) => (
              <option key={ward.id} value={ward.id}>
                {ward.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            {t("inecAreaNote")}
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {t("pollingUnitNameCode")}
          </label>
          <input
            type="text"
            maxLength={150}
            value={pollingUnit}
            onChange={(event) => setPollingUnit(event.target.value)}
            placeholder={t("pollingUnitPlaceholder")}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#ff6600]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {t("requiredIncidentCategory")}
          </label>
          <select
            required
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#ff6600]"
          >
            <option value="">{t("selectCategory")}</option>
            {categories.map((item) => (
              <option key={item.value} value={item.value}>
                {categoryLabels[item.value] ?? item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {t("whenDidItHappen")}
          </label>
          <input
            type="datetime-local"
            value={incidentTime}
            onChange={(event) => setIncidentTime(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#ff6600]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {t("describeIncident")}
          </label>
          <textarea
            required
            minLength={20}
            maxLength={5000}
            rows={6}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("incidentDescriptionPlaceholder")}
            className="w-full resize-y rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#ff6600]"
          />
          <p className="mt-1 text-right text-xs text-gray-400">
            {t("characters").replace("{count}", String(description.length))}
          </p>
        </div>

        {/* Honeypot field for basic bot detection */}
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

        {optionsError && (
          <p role="alert" className="text-sm text-red-600">
            {optionsError}
          </p>
        )}

        <div className="flex items-start gap-2 text-xs leading-5 text-gray-500">
          <ShieldCheck size={17} className="mt-0.5 shrink-0" />
          <p>
            {t("privacyWarning")}
          </p>
        </div>

        <button
          type="submit"
          disabled={
            loading ||
            loadingOptions ||
            !!optionsError ||
            elections.length === 0 ||
            states.length === 0
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#ff6600] px-5 py-3 font-medium text-white transition hover:bg-[#e85d00] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <Send size={16} />
          {loading ? t("submitting") : t("submitIncidentReport")}
        </button>
      </form>
    </section>
  );
}
