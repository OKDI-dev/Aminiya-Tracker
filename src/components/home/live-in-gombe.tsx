"use client";

import { useRef } from "react";
import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { useInView } from "motion/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { LocalizedProgress } from "@/components/i18n/promise-translations";
import { createClient } from "@/lib/supabase/client";
import { usePublicData } from "@/lib/swr";

/**
 * Set NEXT_PUBLIC_DEMO_PROOF=true (e.g. in .env.local) to preview this strip
 * with one sample promise and sample counts while the database has no
 * published records. Real records always win; the sample is labelled and
 * never written anywhere. With the flag off and no records, the strip hides.
 */
const DEMO_PROOF = process.env.NEXT_PUBLIC_DEMO_PROOF === "true";

type Counts = {
  communityIssues: { total: number; resolved: number };
  promises: { total: number };
};

type LatestPromise = {
  id: string;
  title: string;
  progress_status: string;
  candidate: string;
  office: string;
  reviewedUpdates: number;
};

const demo: { counts: Counts; promise: LatestPromise } = {
  counts: { communityIssues: { total: 31, resolved: 5 }, promises: { total: 12 } },
  promise: {
    id: "demo",
    title: "Rehabilitate 40 rural boreholes across Gombe's LGAs (demo)",
    progress_status: "in_progress",
    candidate: "Sample Candidate",
    office: "Governor",
    reviewedUpdates: 2,
  },
};

/** Matches the status chips on the Promise Tracker; the label carries the meaning. */
const statusTone: Record<string, string> = {
  not_started: "bg-tint text-ink-muted",
  in_progress: "bg-amber-50 text-amber-800",
  partially_fulfilled: "bg-amber-50 text-amber-800",
  fulfilled: "bg-green-50 text-green-800",
  stalled: "bg-red-50 text-red-800",
};

async function fetchLatestPromise(): Promise<LatestPromise | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("political_promises")
    .select(
      `id, title, progress_status,
       candidacy:candidacies!inner(office_title, candidate:candidates!inner(full_name)),
       updates:promise_progress_updates(review_status)`
    )
    .eq("publication_status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .abortSignal(AbortSignal.timeout(15_000));

  if (error) throw new Error(error.message);
  const row = data?.[0] as unknown as
    | {
        id: string;
        title: string;
        progress_status: string;
        candidacy: { office_title: string; candidate: { full_name: string } };
        updates: { review_status: string }[] | null;
      }
    | undefined;
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    progress_status: row.progress_status,
    candidate: row.candidacy.candidate.full_name,
    office: row.candidacy.office_title,
    reviewedUpdates: (row.updates ?? []).filter((u) => u.review_status === "approved").length,
  };
}

export default function LiveInGombe() {
  const { t } = useLanguage();
  const ledgerRef = useRef<HTMLDListElement>(null);
  // Counts roll up from zero the first time the ledger is seen.
  const ledgerSeen = useInView(ledgerRef, { once: true, margin: "0px 0px -15% 0px" });
  const { data: counts } = usePublicData<Counts>("/api/public/accountability", undefined, {
    revalidateOnFocus: false,
  });
  const { data: latest } = usePublicData<LatestPromise | null>(
    "public:latest-promise",
    fetchLatestPromise,
    { revalidateOnFocus: false }
  );

  const hasReal = Boolean(latest) || (counts?.promises.total ?? 0) > 0 || (counts?.communityIssues.total ?? 0) > 0;
  const isDemo = !hasReal && DEMO_PROOF;
  if (!hasReal && !isDemo) return null;

  const shownCounts = isDemo ? demo.counts : counts;
  const promise = isDemo ? demo.promise : latest;

  const facts = shownCounts
    ? [
        { value: shownCounts.promises.total, label: t("livePromisesTracked") },
        { value: shownCounts.communityIssues.total, label: t("liveIssuesReported") },
        { value: shownCounts.communityIssues.resolved, label: t("liveIssuesResolved") },
      ]
    : [];

  return (
    <section aria-labelledby="live-heading" className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 sm:pb-24">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="max-w-2xl">
          <h2 id="live-heading" className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t("liveHeading")}
          </h2>
          <p className="mt-3 text-base leading-7 text-ink-muted">{t("liveIntro")}</p>
        </div>
        <Link
          href="/about"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink underline-offset-4 hover:underline"
        >
          {t("liveWhoRuns")}
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>

      {isDemo ? (
        <p className="mt-4 inline-flex rounded-full border border-dashed border-ink-subtle px-3 py-1 text-xs font-semibold text-ink-muted">
          {t("liveDemoNote")}
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 rounded-3xl bg-paper-raised p-6 ring-1 ring-line-soft sm:p-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-12">
        {promise ? (
          <div className="min-w-0">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                statusTone[promise.progress_status] ?? statusTone.not_started
              }`}
            >
              <LocalizedProgress value={promise.progress_status} />
            </span>
            <p className="mt-4 font-heading text-xl leading-snug font-bold text-balance sm:text-2xl">
              {promise.title}
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              {t("livePromiseBy").replace("{name}", promise.candidate).replace("{office}", promise.office)}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className="text-ink-subtle tabular-nums">
                {promise.reviewedUpdates === 1
                  ? t("liveReviewedUpdate")
                  : t("liveReviewedUpdates").replace("{count}", String(promise.reviewedUpdates))}
              </span>
              <Link
                href={isDemo ? "/promise-tracker" : `/promise-tracker/${promise.id}`}
                className="group inline-flex min-h-11 items-center gap-2 font-semibold text-ink"
              >
                <span className="underline-offset-4 group-hover:underline">{t("liveSeeEvidence")}</span>
                <span className="flex size-8 items-center justify-center rounded-full bg-signal text-ink transition-transform duration-200 group-hover:translate-x-0.5">
                  <ArrowRight size={15} aria-hidden="true" />
                </span>
              </Link>
            </div>
          </div>
        ) : null}

        {/* Counts as a plain ledger, not oversized stat tiles. */}
        <dl ref={ledgerRef} className="grid content-start gap-0 border-t border-line-soft lg:border-t-0 lg:border-l lg:pl-12">
          {facts.map((fact) => (
            <div key={fact.label} className="flex items-baseline justify-between gap-4 border-b border-line-soft py-3.5 last:border-b-0">
              <dt className="text-sm text-ink-muted">{fact.label}</dt>
              <dd className="font-heading text-2xl font-extrabold text-ink tabular-nums">
                <NumberFlow value={ledgerSeen ? fact.value : 0} willChange />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
