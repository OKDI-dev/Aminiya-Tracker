import { connection } from "next/server";
import { isPublicEvidenceUrl } from "@/lib/public-evidence-url";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
} from "lucide-react";

export const instant = false;

const progressLabels: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  partially_fulfilled: "Partially fulfilled",
  fulfilled: "Fulfilled",
  stalled: "Stalled",
};

const progressStyles: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-50 text-blue-700",
  partially_fulfilled: "bg-amber-50 text-amber-700",
  fulfilled: "bg-green-50 text-green-700",
  stalled: "bg-red-50 text-red-700",
};

function formatDate(value: string | null) {
  if (!value) return "Not specified";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default async function PromiseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const { id } = await params;
  const supabase = await createClient();

  const { data: promise, error } = await supabase
    .from("political_promises")
    .select(`
      id,
      title,
      description,
      sector,
      source_id,
      source_url,
      promise_date,
      target_date,
      progress_status,
      candidacy:candidacies!inner(
        office_title,
        candidate:candidates!inner(full_name, biography, photo_url),
        party:political_parties(name, acronym, logo_url),
        election:elections!inner(name, election_date, jurisdiction)
      )
    `)
    .eq("id", id)
    .eq("publication_status", "published")
    .single();

  if (error || !promise) notFound();

  const { data: updates } = await supabase
    .from("promise_progress_updates")
    .select(`
      id,
      progress_status,
      update_title,
      update_description,
      evidence_url,
      source_id,
      update_date
    `)
    .eq("promise_id", id)
    .eq("review_status", "approved")
    .order("update_date", { ascending: false });

  const sourceIds = [
    promise.source_id,
    ...(updates ?? []).map((update) => update.source_id),
  ].filter((value): value is string => Boolean(value));

  const { data: sources } = sourceIds.length
    ? await supabase
        .from("electoral_sources")
        .select("id, title, publisher, source_url, publication_date")
        .in("id", sourceIds)
        .eq("verification_status", "verified")
    : { data: [] };

  const sourceMap = new Map(
    (sources ?? []).map((source) => [source.id, source])
  );

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

  const originalSource = promise.source_id
    ? sourceMap.get(promise.source_id)
    : null;

  const approvedUpdates = updates ?? [];

  // RLS ensures this query only returns evidence released for public viewing.
  const updateIds = approvedUpdates.map((update) => update.id);

  const { data: evidenceRecords } = updateIds.length
    ? await supabase
        .from("promise_progress_evidence")
        .select(
          "id, progress_update_id, original_filename, mime_type, file_size, storage_path"
        )
        .in("progress_update_id", updateIds)
        .eq("publicly_visible", true)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Generate short-lived links only for evidence returned by the public RLS query.
  const evidenceWithLinks = await Promise.all(
    (evidenceRecords ?? []).map(async (file) => {
      const { data } = await adminSupabase.storage
        .from("promise-progress-evidence")
        .createSignedUrl(file.storage_path, 300);

      return {
        ...file,
        signedUrl: data?.signedUrl ?? null,
      };
    })
  );

  const evidenceByUpdate = new Map<
    string,
    typeof evidenceWithLinks
  >();

  for (const file of evidenceWithLinks) {
    const existing = evidenceByUpdate.get(file.progress_update_id) ?? [];
    existing.push(file);
    evidenceByUpdate.set(file.progress_update_id, existing);
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5]">


      <div className="mx-auto max-w-5xl space-y-8 px-5 py-10 sm:px-8">
        <Link
          href="/promise-tracker"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#ff6600]"
        >
          <ArrowLeft size={16} />
          Back to all promises
        </Link>

        <section className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold capitalize text-[#ff6600]">
              {promise.sector.replaceAll("_", " ")}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                progressStyles[promise.progress_status] ??
                "bg-gray-100 text-gray-700"
              }`}
            >
              {progressLabels[promise.progress_status] ??
                promise.progress_status}
            </span>
          </div>

          <h1 className="mt-5 text-3xl font-bold text-[#171717] sm:text-4xl">
            {promise.title}
          </h1>

          <p className="mt-5 whitespace-pre-line text-base leading-8 text-gray-600">
            {promise.description}
          </p>

          <div className="mt-8 grid gap-4 border-t border-gray-100 pt-6 sm:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500">Promise date</p>
              <p className="mt-1 font-semibold text-[#171717]">
                {formatDate(promise.promise_date)}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Target date</p>
              <p className="mt-1 font-semibold text-[#171717]">
                {formatDate(promise.target_date)}
              </p>
            </div>
          </div>

          {originalSource?.source_url && (
            <a
              href={originalSource.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#ff6600] hover:underline"
            >
              <FileText size={16} />
              Original promise source
              <ArrowUpRight size={15} />
            </a>
          )}
          {!originalSource && promise.source_url && (
            <a
              href={promise.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#ff6600] hover:underline"
            >
              <FileText size={16} />
              View original promise source
              <ArrowUpRight size={15} />
            </a>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
          <h2 className="text-lg font-bold text-[#171717]">
            Candidate and election
          </h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500">Candidate</p>
              <p className="mt-1 font-semibold text-[#171717]">
                {candidate?.full_name ?? "Not specified"}
              </p>
              {candidate?.biography && (
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {candidate.biography}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs text-gray-500">Political party</p>
              <p className="mt-1 font-semibold text-[#171717]">
                {party?.name ?? "Not specified"}
                {party?.acronym ? ` (${party.acronym})` : ""}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Office</p>
              <p className="mt-1 font-semibold text-[#171717]">
                {candidacy?.office_title ?? "Not specified"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Election</p>
              <p className="mt-1 font-semibold text-[#171717]">
                {election?.name ?? "Not specified"}
              </p>
              {election && (
                <p className="mt-1 text-sm text-gray-500">
                  {election.jurisdiction}
                  {election.election_date
                    ? ` · ${formatDate(election.election_date)}`
                    : ""}
                </p>
              )}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#ff6600]">
              Accountability record
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#171717]">
              Progress history
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Updates below have been reviewed and approved by authorised
              electoral staff.
            </p>
          </div>

          {approvedUpdates.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <Clock3 className="mx-auto text-gray-400" size={30} />
              <h3 className="mt-3 font-semibold text-[#171717]">
                No approved updates yet
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Progress reports will appear here after they have been
                reviewed and approved.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvedUpdates.map((update) => {
                const source = update.source_id
                  ? sourceMap.get(update.source_id)
                  : null;

                return (
                  <article
                    key={update.id}
                    className="rounded-xl border border-gray-200 bg-white p-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-xs text-gray-500">
                        <CalendarDays size={14} />
                        {formatDate(update.update_date)}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          progressStyles[update.progress_status] ??
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {progressLabels[update.progress_status] ??
                          update.progress_status}
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-[#171717]">
                      {update.update_title}
                    </h3>

                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-600">
                      {update.update_description}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-4 border-t border-gray-100 pt-4">
                      {isPublicEvidenceUrl(update.evidence_url) && (
                        <a
                          href={update.evidence_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-[#ff6600] hover:underline"
                        >
                          View supporting evidence
                          <ArrowUpRight size={15} />
                        </a>
                      )}

                      {source?.source_url && (
                        <a
                          href={source.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-[#ff6600] hover:underline"
                        >
                          {source.title}
                          <ArrowUpRight size={15} />
                        </a>
                      )}

                      {(evidenceByUpdate.get(update.id) ?? []).map((file) =>
                        file.signedUrl ? (
                          <a
                            key={file.id}
                            href={file.signedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-[#ff6600] hover:underline"
                          >
                            <FileText size={15} />
                            {file.original_filename}
                            <ArrowUpRight size={14} />
                          </a>
                        ) : null
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <p className="flex items-start gap-2 text-xs leading-5 text-gray-500">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
          The progress status reflects the latest approved update recorded
          by Aminiya Tracker. Publication does not independently establish
          that a commitment has been fulfilled.
        </p>
      </div>
    </main>
  );
}
