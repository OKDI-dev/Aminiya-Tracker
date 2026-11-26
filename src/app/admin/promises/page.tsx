import Link from "next/link";
import { promiseSectors, sectorLabel } from "@/lib/promise-sectors";
import {
  FileCheck2,
  Plus,
  Clock3,
  CheckCircle2,
  Archive,
} from "lucide-react";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

const progressLabels: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  partially_fulfilled: "Partially fulfilled",
  fulfilled: "Fulfilled",
  stalled: "Stalled",
};

const progressStyles: Record<string, string> = {
  not_started: "bg-tint text-ink-muted",
  in_progress: "bg-blue-50 text-blue-700",
  partially_fulfilled: "bg-amber-50 text-amber-700",
  fulfilled: "bg-green-50 text-green-700",
  stalled: "bg-red-50 text-red-700",
};

const publicationStyles: Record<string, string> = {
  draft: "bg-tint text-ink-muted",
  published: "bg-green-50 text-green-700",
  archived: "bg-amber-50 text-amber-700",
};

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line-soft bg-paper-raised p-5">
      <div className="mb-3 text-ink">{icon}</div>
      <p className="text-sm text-ink-subtle">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

export default async function PromiseManagementPage() {
  await requireElectoralStaff();

  const supabase = await createClient();

  const [
    promisesResult,
    draftCount,
    publishedCount,
    archivedCount,
    pendingUpdates,
  ] = await Promise.all([
    supabase
      .from("political_promises")
      .select(
        // "*" includes `sectors` once migration 025 is applied.
        "*"
      )
      .order("created_at", { ascending: false })
      .limit(100),

    supabase
      .from("political_promises")
      .select("id", { count: "exact", head: true })
      .eq("publication_status", "draft"),

    supabase
      .from("political_promises")
      .select("id", { count: "exact", head: true })
      .eq("publication_status", "published"),

    supabase
      .from("political_promises")
      .select("id", { count: "exact", head: true })
      .eq("publication_status", "archived"),

    supabase
      .from("promise_progress_updates")
      .select("id", { count: "exact", head: true })
      .eq("review_status", "pending"),
  ]);

  const error =
    promisesResult.error ||
    draftCount.error ||
    publishedCount.error ||
    archivedCount.error ||
    pendingUpdates.error;

  const promises = promisesResult.data ?? [];

  const candidacyIds = [
    ...new Set(promises.map((promise) => promise.candidacy_id)),
  ];

  const { data: candidacies, error: candidacyError } = candidacyIds.length
    ? await supabase
        .from("candidacies")
        .select("id, candidate_id, party_id, election_id, office_title")
        .in("id", candidacyIds)
    : { data: [], error: null };

  const candidateIds = [
    ...new Set((candidacies ?? []).map((item) => item.candidate_id)),
  ];

  const partyIds = [
    ...new Set(
      (candidacies ?? [])
        .map((item) => item.party_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const electionIds = [
    ...new Set((candidacies ?? []).map((item) => item.election_id)),
  ];

  const [candidatesResult, partiesResult, electionsResult] =
    await Promise.all([
      candidateIds.length
        ? supabase
            .from("candidates")
            .select("id, full_name")
            .in("id", candidateIds)
        : Promise.resolve({ data: [], error: null }),

      partyIds.length
        ? supabase
            .from("political_parties")
            .select("id, name, acronym")
            .in("id", partyIds)
        : Promise.resolve({ data: [], error: null }),

      electionIds.length
        ? supabase
            .from("elections")
            .select("id, name, election_date")
            .in("id", electionIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  const relationshipError =
    candidacyError ||
    candidatesResult.error ||
    partiesResult.error ||
    electionsResult.error;

  const candidacyMap = new Map(
    (candidacies ?? []).map((item) => [item.id, item])
  );

  const candidateMap = new Map(
    (candidatesResult.data ?? []).map((item) => [item.id, item])
  );

  const partyMap = new Map(
    (partiesResult.data ?? []).map((item) => [item.id, item])
  );

  const electionMap = new Map(
    (electionsResult.data ?? []).map((item) => [item.id, item])
  );

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-line-soft bg-paper-raised">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <h1 className="text-xl font-bold text-ink">
              Political Promise Tracker
            </h1>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tint text-ink">
            <FileCheck2 size={22} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-ink">
              POLITICAL ACCOUNTABILITY
            </p>
            <h2 className="mt-2 text-2xl font-bold text-ink">
              Promise management
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              Register public commitments, associate them with candidates and
              electoral contests, and monitor evidence-based implementation.
            </p>
          </div>

          <Link
            href="/admin/promises/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-signal px-5 py-3 text-sm font-semibold text-ink transition hover:bg-signal-hover"
          >
            <Plus size={17} />
            Add a promise
          </Link>
        </section>

        {error || relationshipError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Unable to load promise records. Check the database permissions and
            try again.
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="Draft promises"
                value={draftCount.count ?? 0}
                icon={<Clock3 size={21} />}
              />
              <SummaryCard
                label="Published promises"
                value={publishedCount.count ?? 0}
                icon={<CheckCircle2 size={21} />}
              />
              <SummaryCard
                label="Archived promises"
                value={archivedCount.count ?? 0}
                icon={<Archive size={21} />}
              />
              <SummaryCard
                label="Updates awaiting review"
                value={pendingUpdates.count ?? 0}
                icon={<FileCheck2 size={21} />}
              />
            </section>

            <section className="overflow-hidden rounded-xl border border-line-soft bg-paper-raised">
              <div className="flex flex-col gap-2 border-b border-line-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-ink">
                    Registered promises
                  </h3>
                  <p className="text-xs text-ink-subtle">
                    Latest 100 records
                  </p>
                </div>
                <span className="text-sm text-ink-subtle">
                  {promises.length} promises loaded
                </span>
              </div>

              {promises.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <FileCheck2
                    size={36}
                    className="mx-auto text-ink-subtle"
                  />
                  <h4 className="mt-4 font-semibold text-ink">
                    No promises registered yet
                  </h4>
                  <p className="mt-1 text-sm text-ink-subtle">
                    Add a political commitment to begin monitoring its progress.
                  </p>
                  <Link
                    href="/admin/promises/new"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink underline-offset-4 hover:underline"
                  >
                    <Plus size={16} />
                    Register the first promise
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-line-soft">
                  {promises.map((promise) => {
                    const candidacy = candidacyMap.get(promise.candidacy_id);
                    const candidate = candidacy
                      ? candidateMap.get(candidacy.candidate_id)
                      : null;
                    const party = candidacy?.party_id
                      ? partyMap.get(candidacy.party_id)
                      : null;
                    const election = candidacy
                      ? electionMap.get(candidacy.election_id)
                      : null;

                    return (
                      <Link
                        key={promise.id}
                        href={`/admin/promises/${promise.id}`}
                        className="block space-y-3 px-5 py-5 transition hover:bg-tint/40"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <h4 className="max-w-3xl font-semibold text-ink">
                            {promise.title}
                          </h4>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              publicationStyles[promise.publication_status] ??
                              "bg-tint text-ink-muted"
                            }`}
                          >
                            {promise.publication_status.replaceAll("_", " ")}
                          </span>
                        </div>

                        <p className="text-sm text-ink-muted">
                          {candidate?.full_name ?? "Candidate unavailable"}
                          {" · "}
                          {party?.acronym || party?.name || "Independent / party unavailable"}
                          {" · "}
                          {candidacy?.office_title ?? "Office unavailable"}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-subtle">
                          <span>
                            {election?.name ?? "Election unavailable"}
                          </span>
                          <span>·</span>
                          <span>
                            {promiseSectors(promise).map((value) => sectorLabel(value)).join(", ")}
                          </span>
                          <span>·</span>
                          <span
                            className={`rounded-full px-2.5 py-1 font-medium ${
                              progressStyles[promise.progress_status] ??
                              "bg-tint text-ink-muted"
                            }`}
                          >
                            {progressLabels[promise.progress_status] ??
                              promise.progress_status}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

      </div>
    </main>
  );
}
