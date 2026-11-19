"use client";

import IncidentReportForm from "@/components/incident-report-form";
import { notify } from "@/components/notifications/notify";
import { useEffect, useMemo, useState } from "react";
import { usePublicData } from "@/lib/swr";
import { ListSkeleton } from "@/components/skeletons";
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
      return "bg-tint text-ink-muted";
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

  const {
    data,
    error: loadError,
    isFirstLoad: loading,
    isRevalidating,
    mutate,
  } = usePublicData<Incident[]>("/api/public/election-incidents");
  const incidents = useMemo(() => data ?? [], [data]);
  const loadFailed = Boolean(loadError) && !data;
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const loadIncidents = () => void mutate();

  useEffect(() => {
    if (!loadError) return;
    console.error("Failed to load election incidents:", loadError);
    if (!data) {
      notify.error(t("publishedIncidentsUnavailable"), t("pleaseTryAgain"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadError]);
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
      <div className="rounded-2xl border border-signal/20 bg-tint p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-paper-raised p-3 text-ink">
            <ShieldAlert size={24} />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-ink">
              {t("incidentMonitorTitle")}
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink-muted">
              {t("incidentMonitorDescription")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-ink">
            {t("publishedIncidents")}
          </h3>
          <p className="text-sm text-ink-subtle">
            {filteredIncidents.length === 1
              ? t("incidentFound")
              : t("incidentsFound").replace("{count}", String(filteredIncidents.length))}
          </p>
        </div>

        <button
          type="button"
          onClick={loadIncidents}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-line-soft px-4 py-2 text-sm font-medium text-ink-muted hover:bg-tint disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading || isRevalidating ? "animate-spin" : ""} />
          {t("refresh")}
        </button>
      </div>

      <div className="grid gap-3 rounded-xl border border-line-soft bg-paper-raised p-4 md:grid-cols-3">
        <div className="relative md:col-span-1">
          <Filter
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchIncidents")}
            className="w-full rounded-lg border border-line-soft py-2.5 pl-9 pr-3 text-sm outline-none focus:border-signal"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="rounded-lg border border-line-soft px-3 py-2.5 text-sm outline-none focus:border-signal"
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
          className="rounded-lg border border-line-soft px-3 py-2.5 text-sm outline-none focus:border-signal"
        >
          <option value="all">{t("allPublishedStatuses")}</option>
          <option value="published">{t("published")}</option>
        </select>
      </div>

      {loading ? (
        <ListSkeleton rows={3} label={t("loadingIncidents")} />
      ) : loadFailed ? (
        <div className="rounded-xl border border-line-soft bg-paper-raised px-5 py-10 text-center">
          <ShieldAlert className="mx-auto mb-3 text-ink-subtle" size={30} />
          <h3 className="font-semibold text-ink">
            {t("publishedIncidentsUnavailable")}
          </h3>
          <p className="mt-1 text-sm text-ink-subtle">
            {t("pleaseTryAgain")}
          </p>
          <button
            type="button"
            onClick={loadIncidents}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-signal px-5 py-2.5 text-sm font-semibold text-ink hover:bg-signal-hover"
          >
            <RefreshCw size={15} />
            {t("tryAgain")}
          </button>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-5 py-12 text-center">
          <ShieldAlert className="mx-auto mb-3 text-ink-subtle" size={30} />
          <h3 className="font-semibold text-ink">
            {t("noPublishedIncidents")}
          </h3>
          <p className="mt-1 text-sm text-ink-subtle">
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
                className="rounded-xl border border-line-soft bg-paper-raised p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-tint px-3 py-1 text-xs font-semibold capitalize text-ink">
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

                <p className="mt-4 text-sm leading-6 text-ink-muted">
                  {incident.public_summary ||
                    t("incidentNoSummary")}
                </p>

                <div className="mt-4 grid gap-2 border-t border-line-soft pt-4 text-xs text-ink-subtle sm:grid-cols-3">
                  <p>
                    <span className="font-medium text-ink-muted">{t("election")}:</span>{" "}
                    {election}
                  </p>
                  <p>
                    <span className="font-medium text-ink-muted">
                      {t("electoralArea")}:
                    </span>{" "}
                    {area}
                  </p>
                  <p>
                    <span className="font-medium text-ink-muted">{t("incidentDate")}</span>{" "}
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
