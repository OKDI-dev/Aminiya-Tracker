"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { BlurImage } from "@/components/ui/blur-image";
import { useLanguage } from "@/components/language-provider";
import type { DirectoryCandidate } from "@/lib/public-directory";

const PAGE = 24;

/**
 * Candidate cards that are all the same size: the name keeps two lines, the
 * biography three, and the whole card opens the candidate's own page for
 * the rest. Photos sit in a fixed round frame instead of filling the card.
 */
/** Search lives in DirectorySearch; give this a new `key` when filters change so paging restarts. */
export default function CandidateGrid({ candidates }: { candidates: DirectoryCandidate[] }) {
  const { t } = useLanguage();
  const [shown, setShown] = useState(PAGE);
  const matches = candidates;
  const visible = matches.slice(0, shown);

  return (
    <div className="space-y-5">

      {matches.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-paper-raised p-8 text-center text-sm text-ink-muted">
          {t("noCandidateMatches")}
        </p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((candidate) => (
            // min-w-0: let truncated lines shrink with the column instead of widening the card.
            <li key={candidate.id} className="min-w-0">
              <CandidateCard candidate={candidate} readMore={t("readMoreAbout")} noBiography={t("noBiography")} />
            </li>
          ))}
        </ul>
      )}

      {matches.length > shown ? (
        <div className="flex flex-col items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => setShown((count) => count + PAGE)}
            className="min-h-11 rounded-xl border border-line bg-paper-raised px-5 text-sm font-semibold text-ink transition-colors hover:border-ink"
          >
            {t("showMoreCandidates")}
          </button>
          <p className="text-xs text-ink-subtle tabular-nums">
            {t("candidatesShown").replace("{shown}", String(visible.length)).replace("{total}", String(matches.length))}
          </p>
        </div>
      ) : null}
    </div>
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
