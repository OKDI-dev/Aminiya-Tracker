"use client";

import IncidentReportForm from "@/components/incident-report-form";
import { notify } from "@/components/notifications/notify";
import { useEffect, useMemo, useState } from "react";
import { Filter, RefreshCw, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

type RelatedRecord = {
  id?: string;
  name?: string;
  title?: string;
  area_type?: string;
};

type Incident = {
  id: string;
  category: string;
  status: string;
  incident_time: string | null;
  public_summary: string | null;
  elections: RelatedRecord | null;
  electoral_areas: RelatedRecord | null;
};

function relatedLabel(
  record: RelatedRecord | null,
  alternatives: (keyof RelatedRecord)[],
  notSpecified: string
) {
  if (!record) return notSpecified;

  for (const key of alternatives) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }

  return notSpecified;
}

function statusStyle(status: string) {
  switch (status) {
    case "verified":
      return "bg-green-100 text-green-800";
    case "published":
      return "bg-blue-100 text-blue-800";
    case "under_review":
      return "bg-amber-100 text-amber-800";
    case "dismissed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function readableStatus(status: string, labels: Record<string, string>) {
  return labels[status] ?? status.replaceAll("_", " ");
}

export default function ElectionIncidents() {
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

  const statusLabels: Record<string, string> = {
    published: t("published"),
    verified: t("verified"),
    under_review: t("underReview"),
    dismissed: t("dismissed"),
  };

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  async function loadIncidents() {
    setLoading(true);
    setLoadFailed(false);

    try {
      const response = await fetch("/api/public/election-incidents", {
        cache: "no-store",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error || `Request failed with status ${response.status}`
        );
      }

      const data = await response.json();
      setIncidents((data ?? []) as Incident[]);
    } catch (error) {
      console.error("Failed to load election incidents:", error);
      setLoadFailed(true);
      notify.error(
        t("publishedIncidentsUnavailable"),
        t("pleaseTryAgain")
      );
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadIncidents());
  }, []);

  const categories = useMemo(
    () => [...new Set(incidents.map((item) => item.category))].sort(),
    [incidents]
  );

  const filteredIncidents = useMemo(() => {
    const term = search.trim().toLowerCase();

    return incidents.filter((incident) => {
      const election = relatedLabel(incident.elections, ["name", "title"], t("incidentNotSpecified"));
      const area = relatedLabel(
        incident.electoral_areas,
        ["name", "area_type"],
        t("incidentNotSpecified")
      );
      const summary = incident.public_summary ?? "";

      const matchesCategory =
        categoryFilter === "all" || incident.category === categoryFilter;

      const matchesStatus =
        statusFilter === "all" || incident.status === statusFilter;

      const matchesSearch =
        !term ||
        summary.toLowerCase().includes(term) ||
        incident.category.toLowerCase().includes(term) ||
        election.toLowerCase().includes(term) ||
        area.toLowerCase().includes(term);

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [incidents, categoryFilter, statusFilter, search, t]);

  return (
    <section className="space-y-6">
      <IncidentReportForm />
      <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white p-3 text-[#ff6600]">
            <ShieldAlert size={24} />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[#171717]">
              {t("incidentMonitorTitle")}
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              {t("incidentMonitorDescription")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-[#171717]">
            {t("publishedIncidents")}
          </h3>
          <p className="text-sm text-gray-500">
            {filteredIncidents.length === 1
              ? t("incidentFound")
              : t("incidentsFound").replace("{count}", String(filteredIncidents.length))}
          </p>
        </div>

        <button
          type="button"
          onClick={loadIncidents}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          {t("refresh")}
        </button>
      </div>

      <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-3">
        <div className="relative md:col-span-1">
          <Filter
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchIncidents")}
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#ff6600]"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#ff6600]"
        >
          <option value="all">{t("allIncidentCategories")}</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {categoryLabels[category] ?? category.replaceAll("_", " ")}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#ff6600]"
        >
          <option value="all">{t("allPublishedStatuses")}</option>
          <option value="published">{t("published")}</option>
        </select>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-500">
          {t("loadingIncidents")}
        </div>
      ) : loadFailed ? (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-10 text-center">
          <ShieldAlert className="mx-auto mb-3 text-gray-400" size={30} />
          <h3 className="font-semibold text-gray-800">
            {t("publishedIncidentsUnavailable")}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {t("pleaseTryAgain")}
          </p>
          <button
            type="button"
            onClick={loadIncidents}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#ff6600] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e85d00]"
          >
            <RefreshCw size={15} />
            {t("tryAgain")}
          </button>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 px-5 py-12 text-center">
          <ShieldAlert className="mx-auto mb-3 text-gray-400" size={30} />
          <h3 className="font-semibold text-gray-800">
            {t("noPublishedIncidents")}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {t("incidentsWillAppear")}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredIncidents.map((incident) => {
            const election = relatedLabel(
              incident.elections,
              ["name", "title"],
              t("incidentNotSpecified")
            );
            const area = relatedLabel(
              incident.electoral_areas,
              ["name", "area_type"],
              t("incidentNotSpecified")
            );

            return (
              <article
                key={incident.id}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold capitalize text-[#e85d00]">
                    {categoryLabels[incident.category] ?? incident.category.replaceAll("_", " ")}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyle(
                      incident.status
                    )}`}
                  >
                    {readableStatus(incident.status, statusLabels)}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-gray-700">
                  {incident.public_summary ||
                    t("incidentNoSummary")}
                </p>

                <div className="mt-4 grid gap-2 border-t border-gray-100 pt-4 text-xs text-gray-500 sm:grid-cols-3">
                  <p>
                    <span className="font-medium text-gray-700">{t("election")}:</span>{" "}
                    {election}
                  </p>
                  <p>
                    <span className="font-medium text-gray-700">
                      {t("electoralArea")}:
                    </span>{" "}
                    {area}
                  </p>
                  <p>
                    <span className="font-medium text-gray-700">{t("incidentDate")}</span>{" "}
                    {incident.incident_time
                      ? new Date(incident.incident_time).toLocaleString()
                      : t("incidentNotSpecified")}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
