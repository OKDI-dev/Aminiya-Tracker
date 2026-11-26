import { connection } from "next/server";
import Link from "next/link";
import { promiseSectors } from "@/lib/promise-sectors";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Target,
} from "lucide-react";
import PublicPageHero from "@/components/public-page-hero";
import {
  LocalizedProgress,
  LocalizedSector,
  LocalizedText,
} from "@/components/i18n/promise-translations";

export const instant = false;

const progressStyles: Record<string, string> = {
  not_started: "bg-tint text-ink-muted",
  in_progress: "bg-blue-50 text-blue-700",
  partially_fulfilled: "bg-amber-50 text-amber-700",
  fulfilled: "bg-green-50 text-green-700",
  stalled: "bg-red-50 text-red-700",
};

export default async function PromiseTrackerPage() {
  await connection();

  const supabase = await createClient();

  const { data: promises, error } = await supabase
    .from("political_promises")
    .select(`
      *,
      id,
      title,
      description,
      sector,
      promise_date,
      target_date,
      progress_status,
      candidacy:candidacies!inner(
        office_title,
        candidate:candidates!inner(full_name),
        party:political_parties(name, acronym),
        election:elections!inner(name, election_date, jurisdiction)
      ),
      updates:promise_progress_updates(
        id,
        progress_status,
        update_title,
        update_description,
        evidence_url,
        update_date,
        review_status
      )
    `)
    .eq("publication_status", "published")
    .order("created_at", { ascending: false });

  const records = promises ?? [];

  const total = records.length;
  const fulfilled = records.filter(
    (item) => item.progress_status === "fulfilled"
  ).length;
  const inProgress = records.filter((item) =>
    ["in_progress", "partially_fulfilled"].includes(item.progress_status)
  ).length;

  return (
    <main className="min-h-screen bg-paper">
      <PublicPageHero
        title={
          <>
            <LocalizedText
              en="Track Political Promises."
              ha="Bibiyi Alƙawuran Siyasa."
            />
            <br />
            <span className="text-signal">
              <LocalizedText
                en="Follow Public Progress."
                ha="Kasance da Sanin Ci Gaban Aiki."
              />
            </span>
          </>
        }
        description={
          <LocalizedText
            en="Explore published political commitments and follow verified progress updates. Aminiya Tracker helps citizens compare what political candidates promise with what is reported to have been delivered."
            ha="Bincika alƙawuran siyasa da aka wallafa, sannan ka bibiyi sahihan bayanan ci gabansu. Aminiya Tracker na taimaka wa 'yan ƙasa su kwatanta alƙawuran 'yan takara da ayyukan da aka bayar da rahoton an aiwatar."
          />
        }
      />

      <div className="mx-auto max-w-7xl space-y-10 px-5 py-10 sm:px-8">
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-line-soft bg-paper-raised p-5">
            <Target className="text-signal" size={23} />
            <p className="mt-4 text-sm text-ink-subtle">
              <LocalizedText en="Published promises" ha="Alƙawuran da aka wallafa" />
            </p>
            <p className="mt-1 text-3xl font-bold text-ink">{total}</p>
          </div>

          <div className="rounded-xl border border-line-soft bg-paper-raised p-5">
            <Clock3 className="text-blue-600" size={23} />
            <p className="mt-4 text-sm text-ink-subtle">
              <LocalizedText
                en="In progress or partially fulfilled"
                ha="Ana kan aiki ko an cika wani ɓangare"
              />
            </p>
            <p className="mt-1 text-3xl font-bold text-ink">
              {inProgress}
            </p>
          </div>

          <div className="rounded-xl border border-line-soft bg-paper-raised p-5">
            <CheckCircle2 className="text-green-600" size={23} />
            <p className="mt-4 text-sm text-ink-subtle">
              <LocalizedText en="Marked as fulfilled" ha="An nuna cewa an cika" />
            </p>
            <p className="mt-1 text-3xl font-bold text-ink">
              {fulfilled}
            </p>
          </div>
        </section>

        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-ink">
              <LocalizedText
                en="Published political promises"
                ha="Alƙawuran siyasa da aka wallafa"
              />
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              <LocalizedText
                en="Only promises approved for public viewing are displayed."
                ha="Alƙawuran da aka amince a nuna wa jama'a ne kawai ake nunawa."
              />
            </p>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              <LocalizedText
                en="We could not load the promise records. Please try again later."
                ha="An kasa ɗauko bayanan alƙawura. Da fatan za a sake gwadawa daga baya."
              />
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-xl border border-line-soft bg-paper-raised p-10 text-center">
              <Target className="mx-auto text-ink-subtle" size={32} />
              <h3 className="mt-4 font-semibold text-ink">
                <LocalizedText
                  en="No published promises yet"
                  ha="Babu alƙawuran da aka wallafa tukuna"
                />
              </h3>
              <p className="mt-2 text-sm text-ink-subtle">
                <LocalizedText
                  en="Published political commitments will appear here when they become available."
                  ha="Alƙawuran siyasa za su bayyana a nan idan an wallafa su."
                />
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {records.map((promise) => {
                const candidacy = Array.isArray(promise.candidacy)
                  ? promise.candidacy[0]
                  : promise.candidacy;
                const candidate = Array.isArray(candidacy?.candidate)
                  ? candidacy.candidate[0]
                  : candidacy?.candidate;
                const party = Array.isArray(candidacy?.party)
                  ? candidacy.party[0]
                  : candidacy?.party;

                const approvedUpdates = ((promise.updates ?? []) as { review_status: string }[]).filter(
                  (update) => update.review_status === "approved"
                ).length;
                const sectors = promiseSectors(promise);

                // A short card: what, who, where it stands. The full promise,
                // dates, election and progress history are one click away.
                return (
                  <Link
                    key={promise.id}
                    href={`/promise-tracker/${promise.id}`}
                    className="group flex h-full flex-col rounded-2xl border border-line-soft bg-paper-raised p-5 transition-[border-color,box-shadow] duration-300 hover:border-line hover:shadow-[0_20px_40px_-24px_rgb(20_33_61/0.4)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          progressStyles[promise.progress_status] ?? "bg-tint text-ink-muted"
                        }`}
                      >
                        <LocalizedProgress value={promise.progress_status} />
                      </span>
                      {sectors.slice(0, 2).map((value) => (
                        <span key={value} className="rounded-full bg-tint px-3 py-1 text-xs font-medium text-ink">
                          <LocalizedSector value={value} />
                        </span>
                      ))}
                      {sectors.length > 2 ? (
                        <span className="text-xs font-medium text-ink-subtle">+{sectors.length - 2}</span>
                      ) : null}
                    </div>

                    <h3 className="mt-4 line-clamp-2 font-heading text-lg leading-snug font-bold text-ink">
                      {promise.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-muted">
                      {promise.description}
                    </p>

                    <p className="mt-4 truncate text-sm text-ink-muted">
                      <span className="font-semibold text-ink">
                        {candidate?.full_name ?? (
                          <LocalizedText en="Candidate not specified" ha="Ba a bayyana ɗan takara ba" />
                        )}
                      </span>
                      {party ? ` · ${party.acronym ?? party.name}` : ""}
                      {candidacy?.office_title ? ` · ${candidacy.office_title}` : ""}
                    </p>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line-soft pt-4 text-sm">
                      <span className="text-ink-subtle tabular-nums">
                        {approvedUpdates}{" "}
                        <LocalizedText
                          en={approvedUpdates === 1 ? "approved update" : "approved updates"}
                          ha="sabuntawar da aka amince da ita"
                        />
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                        <span className="underline-offset-4 group-hover:underline">
                          <LocalizedText en="View full promise" ha="Duba cikakken alƙawari" />
                        </span>
                        <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <p className="flex items-center gap-2 text-xs leading-5 text-ink-subtle">
          <CalendarDays size={15} />
          <LocalizedText
            en="Progress information reflects updates reviewed and approved by authorised Aminiya Tracker electoral staff."
            ha="Bayanan ci gaba suna nuna rahotannin da ma'aikatan Aminiya Tracker masu kula da zaɓe suka tantance kuma suka amince da su."
          />
        </p>
      </div>
    </main>
  );
}
