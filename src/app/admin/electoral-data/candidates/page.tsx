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

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await connection();
  await requireElectoralStaff();

  const params = await searchParams;
  const selectedStatus = ["draft", "published", "archived"].includes(params.status ?? "")
    ? params.status!
    : "all";

  const supabase = await createClient();

  let candidatesQuery = supabase
    .from("candidates")
    .select("id, full_name, biography, photo_url, official_profile_url, publication_status, created_at")
    .order("created_at", { ascending: false });

  if (selectedStatus !== "all") {
    candidatesQuery = candidatesQuery.eq("publication_status", selectedStatus);
  }

  const { data: candidates, error } = await candidatesQuery;

  return (
    <div className="min-h-screen bg-[#f7f8f5] p-5 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/admin/electoral-data" className="text-sm text-gray-500 hover:text-[#ff6600]">
              ← Back
            </Link>
            <h1 className="mt-3 text-2xl font-bold text-[#171717]">Candidates</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage candidate profiles and their public information.
            </p>
          </div>
          <Link
            href="/admin/electoral-data/candidates/new"
            className="rounded-lg bg-[#ff6600] px-5 py-3 text-sm font-semibold text-white hover:bg-[#e85d00]"
          >
            Add Candidate
          </Link>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load candidates: {error.message}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-[#171717]">Candidate records</h2>
                <form className="mt-2 flex flex-wrap items-center gap-2">
                  <label htmlFor="candidate-status" className="text-xs text-gray-500">Filter by status</label>
                  <select
                    id="candidate-status"
                    name="status"
                    defaultValue={selectedStatus}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs"
                  >
                    <option value="all">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                  <button
                    type="submit"
                    className="rounded-md bg-[#171717] px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
                  >
                    Apply
                  </button>
                </form>
              </div>
              <span className="text-sm text-gray-500">{candidates?.length ?? 0} records</span>
            </div>

            {!candidates?.length ? (
              <div className="px-5 py-14 text-center">
                <p className="font-medium text-gray-800">No candidates have been added yet.</p>
                <p className="mt-1 text-sm text-gray-500">
                  Add a candidate to start building electoral profiles.
                </p>
                <Link
                  href="/admin/electoral-data/candidates/new"
                  className="mt-5 inline-flex rounded-lg bg-[#ff6600] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Add the first candidate
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[940px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Candidate</th>
                      <th className="px-5 py-3 font-semibold">Biography</th>
                      <th className="px-5 py-3 font-semibold">Official profile</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {candidates.map((candidate) => (
                      <tr key={candidate.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {candidate.photo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={candidate.photo_url}
                                alt=""
                                className="h-11 w-11 rounded-full border border-gray-200 object-cover"
                              />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-50 text-sm font-bold text-[#ff6600]">
                                {candidate.full_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="font-semibold text-gray-900">{candidate.full_name}</span>
                          </div>
                        </td>
                        <td className="max-w-sm px-5 py-4 text-gray-600">
                          <p className="line-clamp-2">{candidate.biography || "No biography added"}</p>
                        </td>
                        <td className="px-5 py-4">
                          {candidate.official_profile_url ? (
                            <a
                              href={candidate.official_profile_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#e85d00] hover:underline"
                            >
                              View profile
                            </a>
                          ) : (
                            <span className="text-gray-400">Not provided</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <OptimisticStatusBadge statusKey={`candidates:${candidate.id}`} status={candidate.publication_status} styles={statusStyles} />
                        </td>
                        <td className="px-5 py-4">
                          <StatusActions
                            table="candidates"
                            id={candidate.id}
                            status={candidate.publication_status}
                          />
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
    </div>
  );
}
