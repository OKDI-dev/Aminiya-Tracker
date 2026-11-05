import Link from "next/link";
import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ResultStatusActions from "@/components/admin/electoral-data/result-status-actions";
import { OptimisticStatusBadge } from "@/components/admin/optimistic-status";

export const instant = false;

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  verified: "bg-blue-100 text-blue-800",
  published: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default async function ElectionResultsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    election?: string;
    type?: string;
  }>;
}) {
  await connection();
  await requireElectoralStaff();

  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("election_results")
    .select(`
      id,
      election_id,
      electoral_area_id,
      candidate_id,
      party_id,
      votes_count,
      registered_voters,
      accredited_voters,
      result_type,
      source_id,
      publication_status,
      verification_notes,
      created_at,
      elections (name),
      electoral_areas (name),
      candidates (full_name),
      political_parties (name, acronym),
      electoral_sources (title, verification_status)
    `)
    .order("created_at", { ascending: false });

  if (params.status && ["draft", "verified", "published", "rejected"].includes(params.status)) {
    query = query.eq("publication_status", params.status);
  }

  if (params.election) {
    query = query.eq("election_id", params.election);
  }

  if (params.type && ["provisional", "official"].includes(params.type)) {
    query = query.eq("result_type", params.type);
  }

  const [
    { data: results, error },
    { data: elections },
  ] = await Promise.all([
    query,
    supabase.from("elections").select("id, name").order("election_date", { ascending: false }),
  ]);

  if (error) {
    return (
      <main className="min-h-screen bg-[#f7f8f5] p-5 sm:p-8">
        <div className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Could not load election results: {error.message}
        </div>
      </main>
    );
  }

  const records = results ?? [];

  function label(value: unknown, key: string, fallback: string) {
    if (value && typeof value === "object" && key in value) {
      const result = (value as Record<string, unknown>)[key];
      if (typeof result === "string" && result.trim()) return result;
    }
    return fallback;
  }

  const inputClass =
    "rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800";

  return (
    <main className="min-h-screen bg-[#f7f8f5] p-5 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <Link
            href="/admin/electoral-data"
            className="text-sm text-gray-500 hover:text-[#ff6600]"
          >
            ← Back
          </Link>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#171717]">Election Results</h1>
              <p className="mt-1 text-sm text-gray-600">
                Enter, review and publish election result records.
              </p>
            </div>

            <Link
              href="/admin/electoral-data/results/new"
              className="rounded-lg bg-[#ff6600] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e85d00]"
            >
              Add result
            </Link>
          </div>
        </div>

        <form className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-4">
          <select name="status" defaultValue={params.status ?? ""} className={inputClass}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="verified">Verified</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
          </select>

          <select name="election" defaultValue={params.election ?? ""} className={inputClass}>
            <option value="">All elections</option>
            {(elections ?? []).map((election) => (
              <option key={election.id} value={election.id}>{election.name}</option>
            ))}
          </select>

          <select name="type" defaultValue={params.type ?? ""} className={inputClass}>
            <option value="">All result types</option>
            <option value="provisional">Provisional</option>
            <option value="official">Official</option>
          </select>

          <button className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Apply filters
          </button>
        </form>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-4">
            <p className="text-sm text-gray-600">
              {records.length} result record{records.length === 1 ? "" : "s"}
            </p>
          </div>

          {records.length === 0 ? (
            <div className="p-10 text-center">
              <h2 className="font-semibold text-[#171717]">No results found</h2>
              <p className="mt-2 text-sm text-gray-500">
                Add an election result to begin building the results database.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Election / Area</th>
                    <th className="px-5 py-3">Candidate / Party</th>
                    <th className="px-5 py-3">Votes</th>
                    <th className="px-5 py-3">Classification</th>
                    <th className="px-5 py-3">Source</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((result) => {
                    const candidate = label(result.candidates, "full_name", "");
                    const party = label(result.political_parties, "name", "");
                    const source = label(result.electoral_sources, "title", "Not specified");

                    return (
                      <tr key={result.id} className="align-top">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-[#171717]">
                            {label(result.elections, "name", "Election")}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {label(result.electoral_areas, "name", "Electoral area")}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-800">
                            {candidate || "Candidate not specified"}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {party || "Party not specified"}
                          </p>
                        </td>
                        <td className="px-5 py-4 font-semibold tabular-nums">
                          {Number(result.votes_count).toLocaleString("en-NG")}
                        </td>
                        <td className="px-5 py-4 capitalize">{result.result_type}</td>
                        <td className="px-5 py-4">
                          <p>{source}</p>
                          {result.electoral_sources && (
                            <p className="mt-1 text-xs text-gray-500">
                              Source: {label(result.electoral_sources, "verification_status", "unknown")}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <OptimisticStatusBadge statusKey={`election_results:${result.id}`} status={result.publication_status} styles={statusStyles} />
                        </td>
                        <td className="px-5 py-4">
                          <ResultStatusActions
                            resultId={result.id}
                            status={result.publication_status}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
