"use client";

import { Search, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export type DirectoryFilters = { query: string; party: string; office: string };

/**
 * One search for the whole Candidates & Parties tab, like the admin lists:
 * free text plus party and office filters. Results update as you type.
 */
export default function DirectorySearch({
  filters,
  onChange,
  parties,
  offices,
  candidateCount,
  partyCount,
}: {
  filters: DirectoryFilters;
  onChange: (next: DirectoryFilters) => void;
  parties: string[];
  offices: string[];
  candidateCount: number;
  partyCount: number;
}) {
  const { t } = useLanguage();
  const active = Boolean(filters.query || filters.party || filters.office);
  const selectClass =
    "min-h-11 w-full rounded-xl border border-line bg-paper-raised px-3 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-signal/25 sm:w-auto";

  return (
    <div className="rounded-2xl border border-line-soft bg-paper-raised p-4 sm:p-5" role="search">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <label className="flex-1">
          <span className="text-sm font-semibold text-ink">{t("searchDirectory")}</span>
          <span className="relative mt-1.5 block">
            <Search size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
            <input
              type="search"
              value={filters.query}
              onChange={(event) => onChange({ ...filters, query: event.target.value })}
              placeholder={t("searchDirectoryHint")}
              className="min-h-11 w-full rounded-xl border border-line bg-paper py-2.5 pr-3 pl-10 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-ink focus:ring-2 focus:ring-signal/25"
            />
          </span>
        </label>

        <div className="grid grid-cols-2 gap-3 sm:flex">
          <label>
            <span className="text-sm font-semibold text-ink">{t("filterParty")}</span>
            <select
              value={filters.party}
              onChange={(event) => onChange({ ...filters, party: event.target.value })}
              className={`mt-1.5 ${selectClass}`}
            >
              <option value="">{t("allParties")}</option>
              {parties.map((party) => (
                <option key={party} value={party}>{party}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-semibold text-ink">{t("filterOffice")}</span>
            <select
              value={filters.office}
              onChange={(event) => onChange({ ...filters, office: event.target.value })}
              className={`mt-1.5 ${selectClass}`}
            >
              <option value="">{t("allOffices")}</option>
              {offices.map((office) => (
                <option key={office} value={office}>{office}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-sm" aria-live="polite">
        <span className="text-ink-muted tabular-nums">
          {t("directoryMatches")
            .replace("{candidates}", String(candidateCount))
            .replace("{parties}", String(partyCount))}
        </span>
        {active ? (
          <button
            type="button"
            onClick={() => onChange({ query: "", party: "", office: "" })}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 font-semibold text-ink hover:bg-tint"
          >
            <X size={15} aria-hidden="true" />
            {t("clearSearch")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
