"use client";

import { notify } from "@/components/notifications/notify";
import ElectionIncidents from "@/components/election-incidents";
import CandidateGrid from "@/components/candidates/candidate-grid";
import DirectorySearch, { type DirectoryFilters } from "@/components/candidates/directory-search";
import BrandRings from "@/components/brand-rings";
import ElectionResults from "@/components/election-results";
import CivicEducationMediaLibrary from "@/components/civic-education-media-library";

import { motion } from "motion/react";
import { BlurImage } from "@/components/ui/blur-image";
import { CardGridSkeleton } from "@/components/skeletons";
import { prefersReducedMotion, springs } from "@/lib/motion";
import { usePublicData } from "@/lib/swr";
import {
  DIRECTORY_KEY,
  fetchDirectory,
  type DirectoryCandidate,
  type DirectoryParty,
} from "@/lib/public-directory";
import { useLanguage } from "@/components/language-provider";


import { startTransition, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  FileSearch,
  Info,
  MapPin,
  Search,
  ShieldAlert,
  Users,
  Vote,
  ChartNoAxesCombined,
} from "lucide-react";

type Section =
  | "education"
  | "candidates"
  | "results"
  | "incidents"
  | "insights";

const tabs: { id: Section; labelKey: string }[] = [
  { id: "education", labelKey: "tabCivicEducation" },
  { id: "candidates", labelKey: "tabCandidatesParties" },
  { id: "results", labelKey: "tabElectionResults" },
  { id: "incidents", labelKey: "tabElectionIncidents" },
  { id: "insights", labelKey: "tabElectoralInsights" },
];

const lessons = [
  {
    category: "Voting basics",
    title: "Understanding the voting process",
    description:
      "Learn how to prepare for election day, understand polling procedures and find official information about where and when to vote.",
    icon: Vote,
    reading: "5 min read",
    href: "/electoral-information/voting-process",
    topics: ["Voting", "Polling units", "Election day"],
  },
  {
    category: "Voter rights",
    title: "Know your rights as a voter",
    description:
      "Understand the importance of free participation, secret ballots, equal treatment and access to official electoral information.",
    icon: ShieldAlert,
    reading: "6 min read",
    href: "/electoral-information/voter-rights",
    topics: ["Rights", "Accessibility", "Participation"],
  },
  {
    category: "Civic responsibility",
    title: "Participating beyond election day",
    description:
      "Explore how citizens can raise public concerns, follow government commitments and engage constructively with public institutions.",
    icon: Users,
    reading: "4 min read",
    href: "/electoral-information/civic-responsibility",
    topics: ["Accountability", "Community", "Participation"],
  },
  {
    category: "Electoral information",
    title: "Finding reliable election information",
    description:
      "Learn to check official announcements, identify the source of electoral claims and distinguish confirmed information from allegations.",
    icon: FileSearch,
    reading: "5 min read",
    href: "/electoral-information/reliable-information",
    topics: ["Verification", "Official sources", "Misinformation"],
  },
];

const lessonTranslationKeys = {
  "Voting basics": {
    category: "lessonVotingCategory",
    title: "lessonVotingTitle",
    description: "lessonVotingDescription",
    topics: [
      "lessonTopicVoting",
      "lessonTopicPollingUnits",
      "lessonTopicElectionDay",
    ],
  },
  "Voter rights": {
    category: "lessonVoterRightsCategory",
    title: "lessonVoterRightsTitle",
    description: "lessonVoterRightsDescription",
    topics: [
      "lessonTopicRights",
      "lessonTopicAccessibility",
      "lessonTopicParticipation",
    ],
  },
  "Civic responsibility": {
    category: "lessonCivicCategory",
    title: "lessonCivicTitle",
    description: "lessonCivicDescription",
    topics: [
      "lessonTopicAccountability",
      "lessonTopicCommunity",
      "lessonTopicParticipation",
    ],
  },
  "Electoral information": {
    category: "lessonReliableCategory",
    title: "lessonReliableTitle",
    description: "lessonReliableDescription",
    topics: [
      "lessonTopicVerification",
      "lessonTopicOfficialSources",
      "lessonTopicMisinformation",
    ],
  },
} as const;

const sections = {
  candidates: {
    icon: Users,
    title: "Candidate and party directory",
    description:
      "Explore candidate profiles, party affiliations, manifestos and electoral history once records have been sourced and reviewed.",
    note: "Candidate records have not yet been published.",
  },
  results: {
    icon: ChartNoAxesCombined,
    title: "Election results centre",
    description:
      "Explore historical election results by election, state, LGA, ward and polling unit, with clear source attribution and reporting status.",
    note: "No verified election-result dataset has been connected yet.",
  },
  incidents: {
    icon: ShieldAlert,
    title: "Election incident monitoring",
    description:
      "Review reported electoral incidents by location, date, category and verification status. Submitted allegations will not be presented as established facts.",
    note: "No incident records have been published yet.",
  },
  insights: {
    icon: ChartNoAxesCombined,
    title: "Electoral insights and analysis",
    description:
      "Explore election trends, turnout, vote distribution, geographic comparisons and downloadable public-interest research based on traceable data.",
    note: "Charts and analysis will become available when verified datasets are added.",
  },
};


type Candidate = DirectoryCandidate;
type PoliticalParty = DirectoryParty;

export default function ElectoralInformation() {
  const { t } = useLanguage();

const [activeTab, setActiveTab] = useState<Section>("education");

  // Stale-while-revalidate: cached directory renders instantly on return
  // visits while a background request refreshes it.
  const {
    data: directory,
    error: directoryError,
    isFirstLoad: recordsLoading,
    mutate: reloadDirectory,
  } = usePublicData(
    activeTab === "candidates" ? DIRECTORY_KEY : null,
    fetchDirectory
  );
  const candidates: Candidate[] = useMemo(() => directory?.candidates ?? [], [directory]);
  const parties: PoliticalParty[] = useMemo(() => directory?.parties ?? [], [directory]);

  // One search across candidates and parties (see DirectorySearch).
  const [directoryFilters, setDirectoryFilters] = useState<DirectoryFilters>({ query: "", party: "", office: "" });
  const partyLabel = (party: PoliticalParty) => party.acronym || party.name;
  const officeOrder = ["Governor", "Deputy Governor", "Senator", "Member, House of Representatives", "Member, State House of Assembly"];
  const directoryOffices = useMemo(
    () =>
      [...new Set(candidates.map((c) => c.race?.office).filter((o): o is string => Boolean(o)))].sort(
        (a, b) => (officeOrder.indexOf(a) + 1 || 99) - (officeOrder.indexOf(b) + 1 || 99) || a.localeCompare(b)
      ),
    // officeOrder is a fixed list
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [candidates]
  );
  const filteredCandidates = useMemo(() => {
    const term = directoryFilters.query.trim().toLowerCase();
    return candidates.filter((c) => {
      if (directoryFilters.party && c.race?.party !== directoryFilters.party) return false;
      if (directoryFilters.office && c.race?.office !== directoryFilters.office) return false;
      if (!term) return true;
      return [c.full_name, c.race?.party, c.race?.office, c.race?.area]
        .some((value) => value?.toLowerCase().includes(term));
    });
  }, [candidates, directoryFilters]);
  const filteredParties = useMemo(() => {
    const term = directoryFilters.query.trim().toLowerCase();
    return parties.filter((party) => {
      if (directoryFilters.party && partyLabel(party) !== directoryFilters.party) return false;
      // An office filter is about candidates; parties stay listed unless searched.
      if (!term) return true;
      return [party.name, party.acronym].some((value) => value?.toLowerCase().includes(term));
    });
  }, [parties, directoryFilters]);
  const recordsLoadFailed = Boolean(directoryError) && !directory;

  useEffect(() => {
    if (!directoryError) return;
    console.error("Failed to load electoral directory:", directoryError);
    if (!directory) {
      notify.error(
        "Electoral directory unavailable",
        "We couldn't load electoral records. Please try again."
      );
    }
  }, [directoryError, directory]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All topics");

  // Allow navbar and command-menu links to open a specific Electoral Information section.
  useEffect(() => {
    const syncSectionFromHash = () => {
      // "#report-incident" (from the Report menu) opens the incidents section
      // and brings the report form itself into view.
      const reportIncident = window.location.hash === "#report-incident";
      const match = window.location.hash.match(/^#section-(education|candidates|results|incidents|insights)$/);
      if (!match && !reportIncident) return;

      const section = (reportIncident ? "incidents" : match![1]) as Section;
      startTransition(() => {
        setActiveTab(section);
        setSearch("");
        setCategory("All topics");
      });

      if (reportIncident) {
        let tries = 0;
        const reveal = () => {
          const form = document.getElementById("report-incident");
          if (form) {
            form.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
          } else if (tries++ < 20) {
            requestAnimationFrame(reveal);
          }
        };
        requestAnimationFrame(reveal);
      }
    };

    syncSectionFromHash();
    window.addEventListener("hashchange", syncSectionFromHash);
    return () => window.removeEventListener("hashchange", syncSectionFromHash);
  }, []);

  const [expandedLesson] = useState<string | null>(null);

  const localizedLessons = useMemo(
    () =>
      lessons.map((lesson) => {
        const keys =
          lessonTranslationKeys[
            lesson.category as keyof typeof lessonTranslationKeys
          ];

        return {
          ...lesson,
          displayCategory: t(keys.category),
          displayTitle: t(keys.title),
          displayDescription: t(keys.description),
          displayTopics: keys.topics.map((key) => t(key)),
          displayReading: `${lesson.reading.split(" ")[0]} ${t("readingMinutes")}`,
        };
      }),
    [t],
  );

  const filteredLessons = useMemo(() => {
    const query = search.trim().toLowerCase();

    return localizedLessons.filter((lesson) => {
      const matchesCategory =
        category === "All topics" || lesson.category === category;

      const searchableText = [
        lesson.title,
        lesson.description,
        lesson.category,
        ...lesson.topics,
        lesson.displayTitle,
        lesson.displayDescription,
        lesson.displayCategory,
        ...lesson.displayTopics,
      ]
        .join(" ")
        .toLowerCase();

      return matchesCategory && (!query || searchableText.includes(query));
    });
  }, [search, category, localizedLessons]);

  const currentSection =
    activeTab === "education" ? null : sections[activeTab];

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <BrandRings className="top-1/2 left-[92%] hidden sm:block" size={900} />
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-16">

          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <h1 className="font-heading text-[clamp(2rem,6.5vw,3.5rem)] leading-[1.02] font-extrabold tracking-[-0.035em]">
                {t("electoralHeroTitle")}
                <br />
                <span className="text-signal">
                  {t("electoralHeroSubtitle")}
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-on-ink-muted sm:text-lg sm:leading-8">
                {t("electoralHeroDescription")}
              </p>

              <div className="mt-6">
                <Link
                  href="/elections"
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-signal px-6 py-3 text-sm font-bold text-ink transition hover:bg-signal-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {t("exploreElections")}
                  <ArrowRight size={17} />
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-paper-raised/[0.04] p-5 lg:w-64">
              <div className="flex items-center gap-2 text-sm font-semibold text-on-ink-muted">
                <MapPin size={17} className="text-signal" />
                {t("initialFocus")}
              </div>
              <p className="mt-2 text-lg font-semibold">{t("gombeState")}</p>
              <p className="mt-1 text-sm leading-6 text-on-ink-muted">
                {t("expandToStates")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <div
          role="tablist"
          aria-label="Electoral information categories"
          className="flex gap-2 overflow-x-auto border-b border-line-soft pb-3"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls="electoral-tab-panel"
              onClick={() => {
                setActiveTab(tab.id);
                setSearch("");
                setCategory("All topics");
              }}
              className={`relative shrink-0 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "font-semibold text-ink"
                  : "bg-paper-raised text-ink-muted hover:bg-tint hover:text-ink"
              }`}
            >
              {activeTab === tab.id ? (
                <motion.span
                  layoutId="electoral-tab-pill"
                  transition={springs.snappy}
                  className="absolute inset-0 rounded-lg bg-signal"
                />
              ) : null}
              <span className="relative">
                {t(tab.labelKey as Parameters<typeof t>[0])}
              </span>
            </button>
          ))}
        </div>

        <div
          id="electoral-tab-panel"
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          className="pt-8"
        >
          {activeTab === "education" ? (
            <>
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {t("civicEducation")}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-subtle">
                    {t("civicEducationDescription")}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <label className="relative block">
                    <span className="sr-only">{t("searchEducationalGuides")}</span>
                    <Search
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
                    />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={t("searchTopics")}
                      className="min-h-11 w-full rounded-lg border border-line bg-paper-raised py-2 pl-10 pr-4 text-sm outline-none focus:border-signal sm:w-56"
                    />
                  </label>

                  <label className="relative block">
                    <span className="sr-only">{t("filterTopicCategory")}</span>
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      className="min-h-11 w-full appearance-none rounded-lg border border-line bg-paper-raised py-2 pl-3 pr-9 text-sm outline-none focus:border-signal sm:w-52"
                    >
                      <option value="All topics">{t("allTopics")}</option>
                      {localizedLessons.map((lesson) => (
                        <option key={lesson.category} value={lesson.category}>
                          {lesson.displayCategory}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-7 grid gap-5 md:grid-cols-2">
                {filteredLessons.map((lesson) => {
                  const Icon = lesson.icon;
                  const isExpanded = expandedLesson === lesson.title;

                  return (
                    <article
                      key={lesson.href}
                      className="rounded-2xl border border-line-soft bg-paper-raised p-6 transition hover:border-signal/50 sm:p-7"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-tint text-ink">
                          <Icon size={24} />
                        </div>
                        <span className="rounded-full bg-tint px-3 py-1.5 text-xs text-ink-muted">
                          {lesson.displayCategory}
                        </span>
                      </div>

                      <h3 className="mt-5 text-xl font-semibold">
                        {lesson.displayTitle}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-ink-muted">
                        {lesson.displayDescription}
                      </p>

                      {isExpanded && (
                        <div className="mt-5 rounded-xl bg-paper p-4">
                          <h4 className="font-semibold">{t("keyTopics")}</h4>
                          <ul className="mt-3 space-y-2">
                            {lesson.displayTopics.map((topic) => (
                              <li
                                key={topic}
                                className="flex items-center gap-2 text-sm text-ink-muted"
                              >
                                <CheckCircle2
                                  size={16}
                                  className="shrink-0 text-ink"
                                />
                                {topic}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-4 text-xs leading-5 text-ink-subtle">
                            {t("introductoryTopicSummary")}
                          </p>
                        </div>
                      )}

                      <div className="mt-6 flex items-center justify-between gap-3 border-t border-line-soft pt-4">
                        <span className="flex items-center gap-2 text-xs text-ink-subtle">
                          <CalendarDays size={15} />
                          {lesson.displayReading}
                        </span>
                        {lesson.href ? (
                          <Link
                            href={lesson.href}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-ink underline-offset-4 hover:underline"
                          >
                            {t("exploreTopic")}
                            <ArrowRight size={16} />
                          </Link>
                        ) : (
                          <span className="text-xs text-ink-subtle">
                            {t("comingSoon")}
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              {filteredLessons.length === 0 && (
                <div className="mt-8 rounded-2xl border border-dashed border-line bg-paper-raised px-6 py-12 text-center">
                  <Search size={28} className="mx-auto text-ink-subtle" />
                  <h3 className="mt-4 font-semibold">{t("noTopicsFound")}</h3>
                  <p className="mt-2 text-sm text-ink-subtle">
                    {t("tryAnotherSearch")}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setCategory("All topics");
                    }}
                    className="mt-4 text-sm font-semibold text-ink"
                  >
                    {t("clearFilters")}
                  </button>
                </div>
              )}

              <CivicEducationMediaLibrary />

              <div className="mt-8 flex items-start gap-3 rounded-xl border border-[#f0d9c8] bg-[#fffaf6] p-4 sm:p-5">
                <Info
                  size={20}
                  className="mt-0.5 shrink-0 text-ink"
                />
                <div>
                  <h3 className="font-semibold">{t("useReliableInformation")}</h3>
                  <p className="mt-1 text-sm leading-6 text-ink-muted">
                    {t("electoralRulesNotice")}
                  </p>
                  <a
                    href="https://www.inecnigeria.org/"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-ink"
                  >
                    {t("visitInecWebsite")}
                    <ArrowRight size={15} />
                  </a>
                </div>
              </div>
            </>
          )
: activeTab === "candidates" ? (
  <div className="space-y-10">
    {recordsLoading ? (
      <CardGridSkeleton media count={6} label="Loading electoral records…" />
    ) : recordsLoadFailed ? (
      <div className="rounded-2xl border border-line-soft bg-paper-raised p-6 text-center">
        <p className="font-medium text-ink-muted">
          Electoral records are temporarily unavailable.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => void reloadDirectory()}
            className="rounded-lg bg-signal px-5 py-2 text-sm font-semibold text-ink hover:bg-signal-hover"
          >
            {t("tryAgain")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("education")}
            className="rounded-lg border border-line-soft px-5 py-2 text-sm font-semibold text-ink-muted hover:bg-tint"
          >
            Return to Civic Education
          </button>
        </div>
      </div>
    ) : (
      <>
        {candidates.length > 0 || parties.length > 0 ? (
          <DirectorySearch
            filters={directoryFilters}
            onChange={setDirectoryFilters}
            parties={parties.map(partyLabel).sort((a, b) => a.localeCompare(b))}
            offices={directoryOffices}
            candidateCount={filteredCandidates.length}
            partyCount={filteredParties.length}
          />
        ) : null}

        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-ink">
                {t("candidates")}
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                {t("candidateProfilesDescription")}
              </p>
            </div>
            <span className="rounded-full bg-tint px-4 py-2 text-sm font-semibold text-ink">
              {filteredCandidates.length} {t("candidateCount")}
            </span>
          </div>

          {candidates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-paper-raised p-8 text-center">
              <h3 className="font-semibold text-ink">
                {t("noPublishedCandidates")}
              </h3>
              <p className="mt-2 text-sm text-ink-subtle">
                {t("candidateProfilesPending")}
              </p>
            </div>
          ) : (
            <CandidateGrid
              key={`${directoryFilters.query}|${directoryFilters.party}|${directoryFilters.office}`}
              candidates={filteredCandidates}
            />
          )}
        </section>

        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-ink">
                {t("politicalParties")}
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                {t("politicalPartiesDescription")}
              </p>
            </div>
            <span className="rounded-full bg-tint px-4 py-2 text-sm font-semibold text-ink">
              {filteredParties.length} {t("partyCount")}
            </span>
          </div>

          {parties.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-paper-raised p-8 text-center">
              <h3 className="font-semibold text-ink">
                {t("noPublishedParties")}
              </h3>
              <p className="mt-2 text-sm text-ink-subtle">
                {t("partyProfilesPending")}
              </p>
            </div>
          ) : (
            filteredParties.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line bg-paper-raised p-8 text-center text-sm text-ink-muted">
                {t("noPartyMatches")}
              </p>
            ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredParties.map((party) => (
                <article
                  key={party.id}
                  className="rounded-2xl border border-line-soft bg-paper-raised p-5 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    {party.logo_url ? (
                      <BlurImage
                        src={party.logo_url}
                        blurhash={party.logo_blurhash}
                        alt={`${party.name} logo`}
                        width={64}
                        height={64}
                        wrapperClassName="size-16 shrink-0 rounded-xl border border-line-soft"
                        className="h-16 w-16 object-contain"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-tint text-xl font-bold text-ink">
                        {(party.acronym || party.name).slice(0, 3).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-ink">
                        {party.name}
                      </h3>
                      {party.acronym && (
                        <p className="mt-1 text-sm text-ink-subtle">
                          {party.acronym}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold">
                    {party.official_website && (
                      <a
                        href={party.official_website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ink hover:underline"
                      >
                        {t("officialWebsite")} →
                      </a>
                    )}
                    {party.manifesto_url && (
                      <a
                        href={party.manifesto_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ink hover:underline"
                      >
                        {t("viewManifesto")} →
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
            )
          )}
        </section>
      </>
    )}
  </div>
) : activeTab === "results" ? (
  <ElectionResults />
) : activeTab === "incidents" ? (
  <ElectionIncidents />
) : currentSection ? (
            <div className="rounded-2xl border border-line-soft bg-paper-raised p-6 sm:p-10">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-tint text-ink">
                <currentSection.icon size={28} />
              </div>

              <h2 className="mt-6 text-2xl font-semibold sm:text-3xl">
                {activeTab === "insights" ? t("sectionInsightsTitle") : currentSection.title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-muted sm:text-base">
                {activeTab === "insights" ? t("sectionInsightsDescription") : currentSection.description}
              </p>

              <div className="mt-7 flex items-start gap-3 rounded-xl border border-line-soft bg-paper p-5">
                <Info
                  size={20}
                  className="mt-0.5 shrink-0 text-ink-subtle"
                />
                <div>
                  <p className="font-semibold">{activeTab === "insights" ? t("sectionInsightsNote") : currentSection.note}</p>
                  <p className="mt-2 text-sm leading-6 text-ink-subtle">
                    {activeTab === "insights" ? t("sectionDataNotice") : "This section will display records only after the corresponding data source and review process are established. No election results, candidate records or incident reports are being presented as real data here."}
                  </p>
                </div>
              </div>

              {activeTab === "insights" && (
                <div className="mt-6 rounded-xl bg-paper p-5">
                  <h3 className="font-semibold">{t("plannedAnalysis")}</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-muted">
                    <li>• {t("voteDistribution")}</li>
                    <li>• {t("resultsCoverage")}</li>
                    <li>• {t("sourceLinkedReports")}</li>
                  </ul>
                </div>
              )}

              <div className="mt-7">
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-ink underline-offset-4 hover:underline"
                >
                  {t("verificationApproach")}
                  <ArrowRight size={17} />
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="border-t border-line-soft bg-paper-raised">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">{t("continueParticipating")}</h2>
            <p className="mt-1 text-sm text-ink-subtle">
              {t("continueParticipatingDescription")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/community-issues"
              className="rounded-lg border border-line px-4 py-3 text-sm font-semibold hover:border-signal"
            >
              {t("communityIssues")}
            </Link>
            <Link
              href="/promise-tracker"
              className="rounded-lg bg-signal px-4 py-3 text-sm font-semibold text-ink hover:bg-signal-hover"
            >
              {t("promiseTracker")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
