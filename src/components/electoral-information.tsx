"use client";

import { notify } from "@/components/notifications/notify";
import ElectionIncidents from "@/components/election-incidents";
import ElectionResults from "@/components/election-results";

import Image from "next/image";

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/language-provider";


import { useMemo, useState, useEffect } from "react";
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


type Candidate = {
  id: string;
  full_name: string;
  biography: string | null;
  photo_url: string | null;
  official_profile_url: string | null;
};

type PoliticalParty = {
  id: string;
  name: string;
  acronym: string | null;
  logo_url: string | null;
  official_website: string | null;
  manifesto_url: string | null;
};

export default function ElectoralInformation() {
  const { t } = useLanguage();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [parties, setParties] = useState<PoliticalParty[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsLoadFailed, setRecordsLoadFailed] = useState(false);
const [activeTab, setActiveTab] = useState<Section>("education");
useEffect(() => {
    if (activeTab !== "candidates") return;

    let cancelled = false;

    async function loadRecords() {
      setRecordsLoading(true);
      setRecordsLoadFailed(false);

      try {
        const [candidateResult, partyResult] = await Promise.all([
          supabase
            .from("candidates")
            .select(
              "id, full_name, biography, photo_url, official_profile_url"
            )
            .eq("publication_status", "published")
            .order("full_name"),

          supabase
            .from("political_parties")
            .select(
              "id, name, acronym, logo_url, official_website, manifesto_url"
            )
            .eq("publication_status", "published")
            .order("name"),
        ]);

        if (candidateResult.error) throw candidateResult.error;
        if (partyResult.error) throw partyResult.error;

        if (!cancelled) {
          setCandidates(candidateResult.data ?? []);
          setParties(partyResult.data ?? []);
        }
      } catch (error) {
        console.error("Failed to load electoral directory:", error);

        if (!cancelled) {
          setRecordsLoadFailed(true);
          notify.error(
            "Electoral directory unavailable",
            "We couldn't load electoral records. Please try again."
          );
        }
      } finally {
        if (!cancelled) setRecordsLoading(false);
      }
    }

    void loadRecords();

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All topics");
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
    <main className="min-h-screen bg-[#f7f7f7] text-[#171717]">
      <section className="border-b border-[#e8e8e8] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">

          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
               <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                {t("electoralHeroTitle")}
                <br />
                <span className="text-[#ff6600]">
                  {t("electoralHeroSubtitle")}
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-[#666] sm:text-lg sm:leading-8">
                {t("electoralHeroDescription")}
              </p>

              <div className="mt-6">
                <Link
                  href="/elections"
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#ff6600] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e85d00]"
                >
                  {t("exploreElections")}
                  <ArrowRight size={17} />
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-4 lg:w-64">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MapPin size={17} className="text-[#e85d00]" />
                {t("initialFocus")}
              </div>
              <p className="mt-2 text-lg font-semibold">{t("gombeState")}</p>
              <p className="mt-1 text-sm leading-6 text-[#777]">
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
          className="flex gap-2 overflow-x-auto border-b border-[#e3e3e3] pb-3"
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
              className={`shrink-0 rounded-lg px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-[#ff6600] text-white"
                  : "bg-white text-[#555] hover:bg-[#fff0e5] hover:text-[#b94a00]"
              }`}
            >
              {t(tab.labelKey as Parameters<typeof t>[0])}
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
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#777]">
                    {t("civicEducationDescription")}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <label className="relative block">
                    <span className="sr-only">{t("searchEducationalGuides")}</span>
                    <Search
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]"
                    />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={t("searchTopics")}
                      className="min-h-11 w-full rounded-lg border border-[#ddd] bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-[#ff6600] sm:w-56"
                    />
                  </label>

                  <label className="relative block">
                    <span className="sr-only">{t("filterTopicCategory")}</span>
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      className="min-h-11 w-full appearance-none rounded-lg border border-[#ddd] bg-white py-2 pl-3 pr-9 text-sm outline-none focus:border-[#ff6600] sm:w-52"
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
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#888]"
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
                      className="rounded-2xl border border-[#e7e7e7] bg-white p-6 transition hover:border-[#ffbd91] sm:p-7"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-[#fff0e5] text-[#e85d00]">
                          <Icon size={24} />
                        </div>
                        <span className="rounded-full bg-[#f4f4f4] px-3 py-1.5 text-xs text-[#666]">
                          {lesson.displayCategory}
                        </span>
                      </div>

                      <h3 className="mt-5 text-xl font-semibold">
                        {lesson.displayTitle}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-[#666]">
                        {lesson.displayDescription}
                      </p>

                      {isExpanded && (
                        <div className="mt-5 rounded-xl bg-[#faf9f7] p-4">
                          <h4 className="font-semibold">{t("keyTopics")}</h4>
                          <ul className="mt-3 space-y-2">
                            {lesson.displayTopics.map((topic) => (
                              <li
                                key={topic}
                                className="flex items-center gap-2 text-sm text-[#555]"
                              >
                                <CheckCircle2
                                  size={16}
                                  className="shrink-0 text-[#e85d00]"
                                />
                                {topic}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-4 text-xs leading-5 text-[#777]">
                            {t("introductoryTopicSummary")}
                          </p>
                        </div>
                      )}

                      <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#eee] pt-4">
                        <span className="flex items-center gap-2 text-xs text-[#777]">
                          <CalendarDays size={15} />
                          {lesson.displayReading}
                        </span>
                        {lesson.href ? (
                          <Link
                            href={lesson.href}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-[#d95300] hover:text-[#a84000]"
                          >
                            {t("exploreTopic")}
                            <ArrowRight size={16} />
                          </Link>
                        ) : (
                          <span className="text-xs text-[#999]">
                            {t("comingSoon")}
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              {filteredLessons.length === 0 && (
                <div className="mt-8 rounded-2xl border border-dashed border-[#ddd] bg-white px-6 py-12 text-center">
                  <Search size={28} className="mx-auto text-[#999]" />
                  <h3 className="mt-4 font-semibold">{t("noTopicsFound")}</h3>
                  <p className="mt-2 text-sm text-[#777]">
                    {t("tryAnotherSearch")}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setCategory("All topics");
                    }}
                    className="mt-4 text-sm font-semibold text-[#d95300]"
                  >
                    {t("clearFilters")}
                  </button>
                </div>
              )}

              <div className="mt-8 flex items-start gap-3 rounded-xl border border-[#f0d9c8] bg-[#fffaf6] p-4 sm:p-5">
                <Info
                  size={20}
                  className="mt-0.5 shrink-0 text-[#d95300]"
                />
                <div>
                  <h3 className="font-semibold">{t("useReliableInformation")}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#666]">
                    {t("electoralRulesNotice")}
                  </p>
                  <a
                    href="https://www.inecnigeria.org/"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#d95300]"
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
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#ff6600]" />
        <p className="mt-4 text-sm text-gray-500">
          Loading electoral records...
        </p>
      </div>
    ) : recordsLoadFailed ? (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
        <p className="font-medium text-gray-700">
          Electoral records are temporarily unavailable.
        </p>
        <button
          type="button"
          onClick={() => setActiveTab("education")}
          className="mt-4 rounded-lg bg-[#ff6600] px-5 py-2 text-sm font-semibold text-white hover:bg-[#e85d00]"
        >
          Return to Civic Education
        </button>
      </div>
    ) : (
      <>
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-[#ff6600]">
                {t("electoralDirectory")}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-[#171717]">
                {t("candidates")}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {t("candidateProfilesDescription")}
              </p>
            </div>
            <span className="rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-[#ff6600]">
              {candidates.length} {t("candidateCount")}
            </span>
          </div>

          {candidates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <h3 className="font-semibold text-gray-800">
                {t("noPublishedCandidates")}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {t("candidateProfilesPending")}
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {candidates.map((candidate) => (
                <article
                  key={candidate.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                >
                  <div className="relative flex h-44 items-center justify-center bg-gray-100">
                    {candidate.photo_url ? (
                      <Image
                        src={candidate.photo_url}
                        alt={candidate.full_name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-3xl font-bold text-[#ff6600]">
                        {candidate.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 p-5">
                    <h3 className="text-lg font-bold text-[#171717]">
                      {candidate.full_name}
                    </h3>
                    <p className="text-sm leading-6 text-gray-600">
                      {candidate.biography || t("noBiography")}
                    </p>
                    {candidate.official_profile_url && (
                      <a
                        href={candidate.official_profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex text-sm font-semibold text-[#ff6600] hover:underline"
                      >
                        {t("viewOfficialProfile")} →
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-[#ff6600]">
                {t("politicalOrganisations")}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-[#171717]">
                {t("politicalParties")}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {t("politicalPartiesDescription")}
              </p>
            </div>
            <span className="rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-[#ff6600]">
              {parties.length} {t("partyCount")}
            </span>
          </div>

          {parties.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <h3 className="font-semibold text-gray-800">
                {t("noPublishedParties")}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {t("partyProfilesPending")}
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {parties.map((party) => (
                <article
                  key={party.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    {party.logo_url ? (
                      <Image
                        src={party.logo_url}
                        alt={`${party.name} logo`}
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-xl border border-gray-100 object-contain"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-orange-50 text-xl font-bold text-[#ff6600]">
                        {(party.acronym || party.name).slice(0, 3).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-[#171717]">
                        {party.name}
                      </h3>
                      {party.acronym && (
                        <p className="mt-1 text-sm text-gray-500">
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
                        className="text-[#ff6600] hover:underline"
                      >
                        {t("officialWebsite")} →
                      </a>
                    )}
                    {party.manifesto_url && (
                      <a
                        href={party.manifesto_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#ff6600] hover:underline"
                      >
                        {t("viewManifesto")} →
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
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
            <div className="rounded-2xl border border-[#e7e7e7] bg-white p-6 sm:p-10">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-[#fff0e5] text-[#e85d00]">
                <currentSection.icon size={28} />
              </div>

              <h2 className="mt-6 text-2xl font-semibold sm:text-3xl">
                {activeTab === "insights" ? t("sectionInsightsTitle") : currentSection.title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#666] sm:text-base">
                {activeTab === "insights" ? t("sectionInsightsDescription") : currentSection.description}
              </p>

              <div className="mt-7 flex items-start gap-3 rounded-xl border border-[#e7e7e7] bg-[#fafafa] p-5">
                <Info
                  size={20}
                  className="mt-0.5 shrink-0 text-[#808080]"
                />
                <div>
                  <p className="font-semibold">{activeTab === "insights" ? t("sectionInsightsNote") : currentSection.note}</p>
                  <p className="mt-2 text-sm leading-6 text-[#777]">
                    {activeTab === "insights" ? t("sectionDataNotice") : "This section will display records only after the corresponding data source and review process are established. No election results, candidate records or incident reports are being presented as real data here."}
                  </p>
                </div>
              </div>

              {activeTab === "insights" && (
                <div className="mt-6 rounded-xl bg-[#faf9f7] p-5">
                  <h3 className="font-semibold">{t("plannedAnalysis")}</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-[#666]">
                    <li>• {t("voteDistribution")}</li>
                    <li>• {t("resultsCoverage")}</li>
                    <li>• {t("sourceLinkedReports")}</li>
                  </ul>
                </div>
              )}

              <div className="mt-7">
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#d95300] hover:text-[#a84000]"
                >
                  {t("verificationApproach")}
                  <ArrowRight size={17} />
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="border-t border-[#e7e7e7] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">{t("continueParticipating")}</h2>
            <p className="mt-1 text-sm text-[#777]">
              {t("continueParticipatingDescription")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/community-issues"
              className="rounded-lg border border-[#ddd] px-4 py-3 text-sm font-semibold hover:border-[#ff6600]"
            >
              {t("communityIssues")}
            </Link>
            <Link
              href="/promise-tracker"
              className="rounded-lg bg-[#ff6600] px-4 py-3 text-sm font-semibold text-white hover:bg-[#e85d00]"
            >
              {t("promiseTracker")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
