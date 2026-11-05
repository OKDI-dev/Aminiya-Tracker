"use client";

import { useLanguage } from "@/components/language-provider";

import { notify } from "@/components/notifications/notify";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { usePublicData } from "@/lib/swr";
import { ListSkeleton } from "@/components/skeletons";
import { Filter, RefreshCw } from "lucide-react";

type RelatedRecord = Record<string, unknown> | null;

type ElectionResult = {
  id: string;
  election_id: string;
  electoral_area_id: string;
  candidate_id: string | null;
  party_id: string | null;
  votes_count: number;
  registered_voters: number | null;
  accredited_voters: number | null;
  result_type: "provisional" | "official";
  source_id: string | null;
  publication_status: string;
  verification_notes: string | null;
  created_at: string;
  elections: RelatedRecord;
  electoral_areas: RelatedRecord;
  candidates: RelatedRecord;
  political_parties: RelatedRecord;
  electoral_sources: RelatedRecord;
};

function getRecordLabel(
  record: RelatedRecord,
  fields: string[],
  fallback: string
): string {
  if (!record) return fallback;

  for (const field of fields) {
    const value = record[field];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return fallback;
}

function formatVotes(value: number | null | undefined, language: "en" | "ha"): string {
  return new Intl.NumberFormat(language === "ha" ? "ha-NG" : "en-NG").format(Number(value ?? 0));
}

async function fetchPublishedResults(): Promise<ElectionResult[]> {
  const { data, error } = await supabase
    .from("election_results")
    .select(`
      *,
      elections (*),
      electoral_areas (*),
      candidates (*),
      political_parties (*),
      electoral_sources (*)
    `)
    .eq("publication_status", "published")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ElectionResult[];
}

export default function ElectionResults() {
  const { t, language } = useLanguage();
  const {
    data,
    error: loadError,
    isFirstLoad: loading,
    mutate,
  } = usePublicData<ElectionResult[]>("public:election-results", fetchPublishedResults);
  const results = useMemo(() => data ?? [], [data]);
  const loadFailed = Boolean(loadError) && !data;

  const [electionFilter, setElectionFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const loadResults = () => void mutate();

  useEffect(() => {
    if (!loadError) return;
    console.error("Election results loading error:", loadError);
    if (!data) {
      notify.error(t("electionResultsUnavailableTitle"), t("retryElectionResults"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadError]);
  const elections = useMemo(() => {
    const values = new Map<string, string>();

    results.forEach((result) => {
      values.set(
        result.election_id,
        getRecordLabel(result.elections, ["name", "title", "election_name"], t("election"))
      );
    });

    return Array.from(values, ([id, name]) => ({ id, name }));
  }, [results]);

  const areas = useMemo(() => {
    const values = new Map<string, string>();

    results.forEach((result) => {
      values.set(
        result.electoral_area_id,
        getRecordLabel(
          result.electoral_areas,
          ["name", "area_name", "ward_name", "lga_name"],
          t("electoralArea")
        )
      );
    });

    return Array.from(values, ([id, name]) => ({ id, name }));
  }, [results]);

  const filteredResults = useMemo(() => {
    return results.filter((result) => {
      const matchesElection =
        electionFilter === "all" || result.election_id === electionFilter;

      const matchesArea =
        areaFilter === "all" || result.electoral_area_id === areaFilter;

      const matchesType =
        typeFilter === "all" || result.result_type === typeFilter;

      return matchesElection && matchesArea && matchesType;
    });
  }, [results, electionFilter, areaFilter, typeFilter]);

  function resetFilters() {
    setElectionFilter("all");
    setAreaFilter("all");
    setTypeFilter("all");
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#ff6600]">
            {t("resultsEyebrow")}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-[#171717]">
            {t("resultsTitle")}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t("resultsDescription")}
          </p>
        </div>

        <button
          type="button"
          onClick={loadResults}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          {t("refresh")}
        </button>
      </div>

      {!loading && !loadFailed && results.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={18} className="text-[#ff6600]" />
            <h3 className="font-semibold text-[#171717]">{t("filterResults")}</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-2 text-sm font-medium text-gray-700">
              {t("election")}
              <select
                value={electionFilter}
                onChange={(event) => setElectionFilter(event.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm"
              >
                <option value="all">{t("allElections")}</option>
                {elections.map((election) => (
                  <option key={election.id} value={election.id}>
                    {election.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-gray-700">
              {t("electoralArea")}
              <select
                value={areaFilter}
                onChange={(event) => setAreaFilter(event.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm"
              >
                <option value="all">{t("allElectoralAreas")}</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-gray-700">
              {t("resultClassification")}
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm"
              >
                <option value="all">{t("allResultTypes")}</option>
                <option value="official">{t("officialResults")}</option>
                <option value="provisional">{t("provisionalResults")}</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              {t("showingRecords").replace("{shown}", String(filteredResults.length)).replace("{total}", String(results.length))}
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm font-semibold text-[#ff6600] hover:underline"
            >
              {t("clearFilters")}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <ListSkeleton rows={3} label={t("loadingElectionResults")} />
      ) : loadFailed ? (

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-700">
            {t("electionResultsUnavailable")}
          </p>
          <button
            type="button"
            onClick={loadResults}
            className="mt-3 text-sm font-semibold text-[#ff6600]"
          >
            {t("tryAgain")}
          </button>
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <h3 className="font-semibold text-[#171717]">{t("noPublishedResults")}</h3>
          <p className="mt-2 text-sm text-gray-500">
            {t("resultsWillAppear")}
          </p>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <h3 className="font-semibold text-[#171717]">{t("noMatchingResults")}</h3>
          <p className="mt-2 text-sm text-gray-500">
            {t("changeFilters")}
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 text-sm font-semibold text-[#ff6600]"
          >
            {t("clearFilters")}
          </button>
        </div>
      ) : (
        <div className="grid gap-5">
          {filteredResults.map((result) => {
            const electionName = getRecordLabel(
              result.elections,
              ["name", "title", "election_name"],
              "Election"
            );

            const areaName = getRecordLabel(
              result.electoral_areas,
              ["name", "area_name", "ward_name", "lga_name"],
              t("electoralArea")
            );

            const candidateName = getRecordLabel(
              result.candidates,
              ["full_name", "name"],
              t("candidateNotSpecified")
            );

            const partyName = getRecordLabel(
              result.political_parties,
              ["name", "acronym"],
              t("partyNotSpecified")
            );

            const sourceName = getRecordLabel(
              result.electoral_sources,
              ["name", "title", "source_name"],
              t("sourceNotSpecified")
            );

            const turnout =
              result.registered_voters !== null &&
              result.registered_voters > 0 &&
              result.accredited_voters !== null
                ? (
                    (result.accredited_voters / result.registered_voters) *
                    100
                  ).toFixed(1)
                : null;

            return (
              <article
                key={result.id}
                className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {electionName}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      result.result_type === "official"
                        ? "bg-green-100 text-green-800"
                        : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    {result.result_type === "official"
                      ? t("officialResult")
                      : t("provisionalResult")}
                  </span>
                </div>

                <div className="mt-5">
                  <h3 className="text-xl font-bold text-[#171717]">
                    {candidateName}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">{partyName}</p>
                  <p className="mt-1 text-sm text-gray-500">{areaName}</p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-[#f7f8f5] p-4">
                    <p className="text-xs text-gray-500">{t("votesReceived")}</p>
                    <p className="mt-1 text-xl font-bold text-[#171717]">
                      {formatVotes(result.votes_count, language)}
                    </p>
                  </div>

                  <div className="rounded-lg bg-[#f7f8f5] p-4">
                    <p className="text-xs text-gray-500">{t("registeredVoters")}</p>
                    <p className="mt-1 text-xl font-bold text-[#171717]">
                      {result.registered_voters !== null
                        ? formatVotes(result.registered_voters, language)
                        : "—"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-[#f7f8f5] p-4">
                    <p className="text-xs text-gray-500">{t("accreditedVoters")}</p>
                    <p className="mt-1 text-xl font-bold text-[#171717]">
                      {result.accredited_voters !== null
                        ? formatVotes(result.accredited_voters, language)
                        : "—"}
                    </p>
                  </div>
                </div>

                {turnout !== null && (
                  <p className="mt-4 text-sm text-gray-600">
                    {t("voterTurnout")}{" "}
                    <strong className="text-[#171717]">{turnout}%</strong>
                  </p>
                )}

                <div className="mt-5 border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t("dataSource")}
                  </p>
                  <p className="mt-1 text-sm text-[#171717]">{sourceName}</p>

                  {result.verification_notes && (
                    <p className="mt-3 text-sm leading-6 text-gray-600">
                      {result.verification_notes}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
