import Link from "next/link";
import {
  ArrowLeft,
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
  not_started: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-50 text-blue-700",
  partially_fulfilled: "bg-amber-50 text-amber-700",
  fulfilled: "bg-green-50 text-green-700",
  stalled: "bg-red-50 text-red-700",
};

const publicationStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  published: "bg-green-50 text-green-700",
  archived: "bg-amber-50 text-amber-700",
};

const sectorLabels: Record<string, string> = {
  education: "Education",
  healthcare: "Healthcare",
  agriculture: "Agriculture",
  infrastructure: "Infrastructure",
  employment: "Employment",
  security: "Security",
  water_sanitation: "Water and sanitation",
  electricity: "Electricity",
  environment: "Environment",
  governance: "Governance",
  youth_development: "Youth development",
  women_development: "Women development",
  social_protection: "Social protection",
  other: "Other",
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
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 text-[#ff6600]">{icon}</div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#171717]">{value}</p>
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
        "id, candidacy_id, title, sector, progress_status, publication_status, promise_date, created_at"
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
    <main className="min-h-screen bg-[#f7f8f5]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <Link
              href="/admin"
              className="mb-2 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#ff6600]"
            >
              <ArrowLeft size={16} />
              Back
            </Link>
            <h1 className="text-xl font-bold text-[#171717]">
              Political Promise Tracker
            </h1>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#ff6600]">
            <FileCheck2 size={22} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#ff6600]">
              POLITICAL ACCOUNTABILITY
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#171717]">
              Promise management
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Register public commitments, associate them with candidates and
              electoral contests, and monitor evidence-based implementation.
            </p>
          </div>

          <Link
            href="/admin/promises/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff6600] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e85d00]"
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

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-[#171717]">
                    Registered promises
                  </h3>
                  <p className="text-xs text-gray-500">
                    Latest 100 records
                  </p>
                </div>
                <span className="text-sm text-gray-500">
                  {promises.length} promises loaded
                </span>
              </div>

              {promises.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <FileCheck2
                    size={36}
                    className="mx-auto text-gray-400"
                  />
                  <h4 className="mt-4 font-semibold text-[#171717]">
                    No promises registered yet
                  </h4>
                  <p className="mt-1 text-sm text-gray-500">
                    Add a political commitment to begin monitoring its progress.
                  </p>
                  <Link
                    href="/admin/promises/new"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#ff6600] hover:text-[#e85d00]"
                  >
                    <Plus size={16} />
                    Register the first promise
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
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
                        className="block space-y-3 px-5 py-5 transition hover:bg-orange-50/40"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <h4 className="max-w-3xl font-semibold text-[#171717]">
                            {promise.title}
                          </h4>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              publicationStyles[promise.publication_status] ??
                              "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {promise.publication_status.replaceAll("_", " ")}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600">
                          {candidate?.full_name ?? "Candidate unavailable"}
                          {" · "}
                          {party?.acronym || party?.name || "Independent / party unavailable"}
                          {" · "}
                          {candidacy?.office_title ?? "Office unavailable"}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span>
                            {election?.name ?? "Election unavailable"}
                          </span>
                          <span>·</span>
                          <span>
                            {sectorLabels[promise.sector] ?? promise.sector}
                          </span>
                          <span>·</span>
                          <span
                            className={`rounded-full px-2.5 py-1 font-medium ${
                              progressStyles[promise.progress_status] ??
                              "bg-gray-100 text-gray-700"
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

        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#ff6600] hover:text-[#e85d00]"
        >
          <ArrowLeft size={16} />
          Back
        </Link>
      </div>
    </main>
  );
}
