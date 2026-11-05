import Link from "next/link";
import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import StatusActions from "@/components/admin/electoral-data/status-actions";
import { OptimisticStatusBadge } from "@/components/admin/optimistic-status";

export const instant = false;

const statusStyles: Record<string, string> = {
  published: "bg-green-100 text-green-800",
  draft: "bg-yellow-100 text-yellow-800",
  archived: "bg-gray-100 text-gray-700",
};

export default async function CandidaciesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; election?: string; q?: string }>;
}) {
  await connection();
  await requireElectoralStaff();

  const params = await searchParams;
  const selectedStatus = ["draft", "published", "archived"].includes(params.status ?? "")
    ? params.status!
    : "all";
  const selectedElection = params.election ?? "all";
  const searchTerm = (params.q ?? "").trim().slice(0, 100);

  const supabase = await createClient();

  const [
    { data: elections, error: electionsError },
    { data: candidates, error: candidatesError },
    { data: parties, error: partiesError },
    { data: areas, error: areasError },
  ] = await Promise.all([
    supabase.from("elections").select("id, name").order("election_date", { ascending: false }),
    supabase.from("candidates").select("id, full_name"),
    supabase.from("political_parties").select("id, name, acronym"),
    supabase.from("electoral_areas").select("id, name"),
  ]);

  let query = supabase
    .from("candidacies")
    .select("id, election_id, candidate_id, party_id, electoral_area_id, office_title, ballot_number, manifesto_url, publication_status, created_at")
    .order("created_at", { ascending: false });

  if (selectedStatus !== "all") {
    query = query.eq("publication_status", selectedStatus);
  }

  if (selectedElection !== "all") {
    query = query.eq("election_id", selectedElection);
  }

  if (searchTerm) {
    const safeSearch = searchTerm.replace(/[,%()]/g, " ").trim();
    if (safeSearch) {
      query = query.ilike("office_title", `%${safeSearch}%`);
    }
  }

  const { data: candidacies, error } = await query;
  const lookupError = electionsError || candidatesError || partiesError || areasError;

  const electionMap = new Map((elections ?? []).map((item) => [item.id, item.name]));
  const candidateMap = new Map((candidates ?? []).map((item) => [item.id, item.full_name]));
  const partyMap = new Map(
    (parties ?? []).map((item) => [
      item.id,
      item.acronym ? `${item.name} (${item.acronym})` : item.name,
    ])
  );
  const areaMap = new Map((areas ?? []).map((item) => [item.id, item.name]));

  return (
    <main className="min-h-screen bg-[#f7f8f5] p-5 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="mt-3 text-2xl font-bold text-[#171717]">Candidacies</h1>
            <p className="mt-1 text-sm text-gray-600">
              Connect candidates to elections, political parties, offices and electoral areas.
            </p>
          </div>
          <Link
            href="/admin/electoral-data/candidacies/new"
            className="rounded-lg bg-[#ff6600] px-5 py-3 text-sm font-semibold text-white hover:bg-[#e85d00]"
          >
            Add Candidacy
          </Link>
        </div>

        {(error || lookupError) ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load candidacy records: {(error || lookupError)?.message}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-[#171717]">Candidacy records</h2>
                <form method="get" className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    name="q"
                    type="search"
                    defaultValue={searchTerm}
                    placeholder="Search office title"
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs"
                    aria-label="Search office title"
                  />
                  <select
                    name="election"
                    defaultValue={selectedElection}
                    className="max-w-[230px] rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs"
                    aria-label="Filter by election"
                  >
                    <option value="all">All elections</option>
                    {(elections ?? []).map((election) => (
                      <option key={election.id} value={election.id}>{election.name}</option>
                    ))}
                  </select>
                  <select
                    name="status"
                    defaultValue={selectedStatus}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs"
                    aria-label="Filter by status"
                  >
                    <option value="all">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                  <button type="submit" className="rounded-md bg-[#171717] px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700">
                    Apply
                  </button>
                </form>
              </div>
              <span className="text-sm text-gray-500">{candidacies?.length ?? 0} records</span>
            </div>

            {!candidacies?.length ? (
              <div className="px-5 py-14 text-center">
                <p className="font-medium text-gray-800">No candidacies found.</p>
                <p className="mt-1 text-sm text-gray-500">Add a candidacy or adjust your search and filters.</p>
                <Link href="/admin/electoral-data/candidacies/new" className="mt-5 inline-flex rounded-lg bg-[#ff6600] px-4 py-2.5 text-sm font-semibold text-white">
                  Add the first candidacy
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Candidate</th>
                      <th className="px-5 py-3 font-semibold">Election</th>
                      <th className="px-5 py-3 font-semibold">Office</th>
                      <th className="px-5 py-3 font-semibold">Party</th>
                      <th className="px-5 py-3 font-semibold">Electoral area</th>
                      <th className="px-5 py-3 font-semibold">Ballot no.</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {candidacies.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4 font-semibold text-gray-900">
                          {candidateMap.get(item.candidate_id) ?? "Unknown candidate"}
                        </td>
                        <td className="px-5 py-4 text-gray-600">
                          {electionMap.get(item.election_id) ?? "Unknown election"}
                        </td>
                        <td className="px-5 py-4 text-gray-700">{item.office_title}</td>
                        <td className="px-5 py-4 text-gray-600">
                          {item.party_id ? partyMap.get(item.party_id) ?? "Unknown party" : "Not specified"}
                        </td>
                        <td className="px-5 py-4 text-gray-600">
                          {item.electoral_area_id ? areaMap.get(item.electoral_area_id) ?? "Unknown area" : "Not specified"}
                        </td>
                        <td className="px-5 py-4 text-gray-600">{item.ballot_number || "—"}</td>
                        <td className="px-5 py-4">
                          <OptimisticStatusBadge statusKey={`candidacies:${item.id}`} status={item.publication_status} styles={statusStyles} />
                        </td>
                        <td className="px-5 py-4">
                          <StatusActions table="candidacies" id={item.id} status={item.publication_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
