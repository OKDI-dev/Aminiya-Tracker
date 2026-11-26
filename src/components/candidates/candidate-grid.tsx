"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { BlurImage } from "@/components/ui/blur-image";
import { useLanguage } from "@/components/language-provider";
import type { DirectoryCandidate } from "@/lib/public-directory";

/** Cards shown per office before "Show more" (three full rows on desktop). */
const PAGE = 9;

/** Ballot order, with the heading each office gets. */
const OFFICES: { office: string; en: string; ha: string; byArea: boolean }[] = [
  { office: "Governor", en: "Governor", ha: "Gwamna", byArea: false },
  { office: "Deputy Governor", en: "Deputy Governor", ha: "Mataimakin Gwamna", byArea: false },
  { office: "Senator", en: "Senators", ha: "Sanatoci", byArea: true },
  { office: "Member, House of Representatives", en: "House of Representatives", ha: "Majalisar Wakilai", byArea: true },
  { office: "Member, State House of Assembly", en: "State House of Assembly", ha: "Majalisar Dokokin Jiha", byArea: true },
];

type Group = { id: string; title: string; candidates: DirectoryCandidate[] };

function groupByOffice(candidates: DirectoryCandidate[], language: "en" | "ha"): Group[] {
  const byOffice = new Map<string, DirectoryCandidate[]>();
  for (const candidate of candidates) {
    const key = candidate.race?.office ?? "";
    byOffice.set(key, [...(byOffice.get(key) ?? []), candidate]);
  }

  const groups: Group[] = [];
  for (const known of OFFICES) {
    const list = byOffice.get(known.office);
    if (!list?.length) continue;
    byOffice.delete(known.office);
    // Constituency races read best grouped by constituency, then by name.
    const sorted = known.byArea
      ? [...list].sort((a, b) => (a.race?.area ?? "").localeCompare(b.race?.area ?? "") || a.full_name.localeCompare(b.full_name))
      : list;
    groups.push({ id: known.office, title: known[language], candidates: sorted });
  }
  for (const [office, list] of [...byOffice.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (!office) continue;
    groups.push({ id: office, title: office, candidates: list });
  }
  const unlisted = byOffice.get("");
  if (unlisted?.length) {
    groups.push({
      id: "unlisted",
      title: language === "ha" ? "Ba a sanya su cikin takara ba tukuna" : "Not yet in a race",
      candidates: unlisted,
    });
  }
  return groups;
}

const anchor = (id: string) => `office-${id.toLowerCase().replace(/[^a-z]+/g, "-")}`;

/**
 * Candidates grouped by office in ballot order (Governor, Deputy Governor,
 * Senators, House of Representatives, State House of Assembly). Cards are
 * all the same size and open the candidate's own page. Search lives in
 * DirectorySearch; give this a new `key` when filters change so paging restarts.
 */
export default function CandidateGrid({ candidates }: { candidates: DirectoryCandidate[] }) {
  const { t, language } = useLanguage();
  const groups = useMemo(() => groupByOffice(candidates, language), [candidates, language]);

  if (candidates.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-paper-raised p-8 text-center text-sm text-ink-muted">
        {t("noCandidateMatches")}
      </p>
    );
  }

  return (
    <div className="space-y-10">
      {groups.length > 1 ? (
        <nav aria-label={language === "ha" ? "Tsallaka zuwa mukami" : "Jump to office"} className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <a
              key={group.id}
              href={`#${anchor(group.id)}`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line-soft bg-paper-raised px-3.5 text-sm font-medium text-ink transition-colors hover:border-ink"
            >
              {group.title}
              <span className="text-ink-subtle tabular-nums">{group.candidates.length}</span>
            </a>
          ))}
        </nav>
      ) : null}

      {groups.map((group) => (
        <OfficeGroup key={group.id} group={group} />
      ))}
    </div>
  );
}

function OfficeGroup({ group }: { group: Group }) {
  const { t } = useLanguage();
  const [shown, setShown] = useState(PAGE);
  const visible = group.candidates.slice(0, shown);

  return (
    <section id={anchor(group.id)} aria-labelledby={`${anchor(group.id)}-title`} className="scroll-mt-28 space-y-4">
      <h3 id={`${anchor(group.id)}-title`} className="flex items-baseline gap-2 font-heading text-xl font-bold text-ink">
        {group.title}
        <span className="text-sm font-medium text-ink-subtle tabular-nums">{group.candidates.length}</span>
      </h3>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((candidate) => (
          // min-w-0: let truncated lines shrink with the column instead of widening the card.
          <li key={candidate.id} className="min-w-0">
            <CandidateCard candidate={candidate} readMore={t("readMoreAbout")} noBiography={t("noBiography")} />
          </li>
        ))}
      </ul>

      {group.candidates.length > shown ? (
        <div className="flex flex-col items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setShown((count) => count + PAGE * 2)}
            className="min-h-11 rounded-xl border border-line bg-paper-raised px-5 text-sm font-semibold text-ink transition-colors hover:border-ink"
          >
            {t("showMoreCandidates")}
          </button>
          <p className="text-xs text-ink-subtle tabular-nums">
            {t("candidatesShown").replace("{shown}", String(visible.length)).replace("{total}", String(group.candidates.length))}
          </p>
        </div>
      ) : null}
    </section>
  );
}

function CandidateCard({
  candidate,
  readMore,
  noBiography,
}: {
  candidate: DirectoryCandidate;
  readMore: string;
  noBiography: string;
}) {
  const race = candidate.race;
  const raceLine = race ? [race.party, race.office].filter(Boolean).join(" · ") : "";

  return (
    <Link
      href={`/candidates/${candidate.id}`}
      className="group flex h-full flex-col rounded-2xl border border-line-soft bg-paper-raised p-5 shadow-[0_1px_2px_rgb(20_33_61/0.04)] transition-[border-color,box-shadow] duration-300 hover:border-line hover:shadow-[0_20px_40px_-24px_rgb(20_33_61/0.4)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
    >
      <div className="flex items-center gap-4">
        {/* Fixed frame with room around it: the photo never touches the card edges. */}
        <span className="relative size-20 shrink-0 overflow-hidden rounded-full bg-tint ring-4 ring-paper shadow-[0_6px_16px_-8px_rgb(20_33_61/0.45)]">
          {candidate.photo_url ? (
            <BlurImage
              src={candidate.photo_url}
              blurhash={candidate.photo_blurhash}
              alt=""
              fill
              sizes="80px"
              className="object-cover object-top"
            />
          ) : (
            <span className="flex size-full items-center justify-center font-heading text-2xl font-bold text-ink" aria-hidden="true">
              {candidate.full_name.charAt(0).toUpperCase()}
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          {/* Fixed line counts keep every card the same height. */}
          <span className="block min-h-5 truncate text-xs font-semibold text-ink-subtle">{raceLine}</span>
          <span className="mt-1 line-clamp-2 block min-h-[3.25rem] font-heading text-lg leading-[1.625rem] font-bold text-ink">
            {candidate.full_name}
          </span>
          <span className="block min-h-5 truncate text-sm text-ink-muted">{race?.area ?? ""}</span>
        </span>
      </div>

      <p className="mt-4 line-clamp-3 h-[4.5rem] text-sm leading-6 text-ink-muted">
        {candidate.biography || noBiography}
      </p>

      <span className="mt-4 flex items-center justify-between border-t border-line-soft pt-4 text-sm font-semibold text-ink">
        <span className="underline-offset-4 group-hover:underline">{readMore}</span>
        <span className="flex size-8 items-center justify-center rounded-full bg-tint text-ink transition-[background-color,translate] duration-300 group-hover:translate-x-0.5 group-hover:bg-signal">
          <ArrowRight size={15} aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}
