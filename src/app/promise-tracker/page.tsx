import { connection } from "next/server";
import { isPublicEvidenceUrl } from "@/lib/public-evidence-url";
import Link from "next/link";
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
  LocalizedDate,
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
            <div className="grid gap-5 lg:grid-cols-2">
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

                const election = Array.isArray(candidacy?.election)
                  ? candidacy.election[0]
                  : candidacy?.election;

                const updates = (promise.updates ?? [])
                  .filter((update) => update.review_status === "approved")
                  .sort(
                    (a, b) =>
                      new Date(b.update_date).getTime() -
                      new Date(a.update_date).getTime()
                  );

                return (
                  <article
                    key={promise.id}
                    className="rounded-xl border border-line-soft bg-paper-raised p-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="rounded-full bg-tint px-3 py-1 text-xs font-semibold capitalize text-ink">
                        <LocalizedSector value={promise.sector} />
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          progressStyles[promise.progress_status] ??
                          "bg-tint text-ink-muted"
                        }`}
                      >
                        <LocalizedProgress value={promise.progress_status} />
                      </span>
                    </div>

                    <h3 className="mt-5 text-xl font-bold text-ink">
                      {promise.title}
                    </h3>

                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink-muted">
                      {promise.description}
                    </p>

                    <div className="mt-5 space-y-2 border-t border-line-soft pt-4 text-sm">
                      <p className="font-semibold text-ink">
                        {candidate?.full_name ?? (
                          <LocalizedText
                            en="Candidate not specified"
                            ha="Ba a bayyana ɗan takara ba"
                          />
                        )}
                      </p>
                      <p className="text-ink-muted">
                        {candidacy?.office_title ?? (
                          <LocalizedText
                            en="Office not specified"
                            ha="Ba a bayyana muƙami ba"
                          />
                        )}
                      </p>
                      {party && (
                        <p className="text-ink-subtle">
                          {party.name}
                          {party.acronym ? ` (${party.acronym})` : ""}
                        </p>
                      )}
                      {election && (
                        <p className="text-ink-subtle">
                          {election.name} · {election.jurisdiction}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg bg-tint p-4 text-xs">
                      <div>
                        <p className="text-ink-subtle">
                          <LocalizedText en="Promise date" ha="Ranar alƙawari" />
                        </p>
                        <p className="mt-1 font-semibold text-ink">
                          <LocalizedDate value={promise.promise_date} />
                        </p>
                      </div>
                      <div>
                        <p className="text-ink-subtle">
                          <LocalizedText en="Target date" ha="Ranar cimma buri" />
                        </p>
                        <p className="mt-1 font-semibold text-ink">
                          <LocalizedDate value={promise.target_date} />
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-line-soft pt-4">
                      <Link
                        href={`/promise-tracker/${promise.id}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:underline"
                      >
                        <LocalizedText
                          en="View full promise and progress history"
                          ha="Duba cikakken alƙawari da tarihin ci gaba"
                        />
                        <ArrowRight size={16} />
                      </Link>
                    </div>

                    <div className="mt-5 border-t border-line-soft pt-4">
                      <h4 className="font-semibold text-ink">
                        <LocalizedText
                          en="Approved progress updates"
                          ha="Sabbin bayanan ci gaba da aka amince da su"
                        />{" "}
                        ({updates.length})
                      </h4>

                      {updates.length === 0 ? (
                        <p className="mt-2 text-sm text-ink-subtle">
                          <LocalizedText
                            en="No approved progress updates have been published."
                            ha="Ba a wallafa wani sabon bayanin ci gaba da aka amince da shi ba."
                          />
                        </p>
                      ) : (
                        <div className="mt-3 space-y-4">
                          {updates.slice(0, 3).map((update) => (
                            <div
                              key={update.id}
                              className="border-l-2 border-signal pl-4"
                            >
                              <p className="text-xs text-ink-subtle">
                                <LocalizedDate value={update.update_date} />
                              </p>
                              <p className="mt-1 text-sm font-semibold text-ink">
                                {update.update_title}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-ink-muted">
                                {update.update_description}
                              </p>
                              {isPublicEvidenceUrl(update.evidence_url) && (
                                <a
                                  href={update.evidence_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-ink hover:underline"
                                >
                                  <LocalizedText
                                    en="View evidence"
                                    ha="Duba hujja"
                                  />{" "}
                                  <ArrowRight size={14} />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
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
