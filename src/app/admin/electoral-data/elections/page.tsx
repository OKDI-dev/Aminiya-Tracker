import Link from "next/link";
import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import StatusActions from "@/components/admin/electoral-data/status-actions";
import { OptimisticStatusBadge } from "@/components/admin/optimistic-status";
import RecordActions from "@/components/admin/electoral-data/record-actions";

export const instant = false;

const statusStyles: Record<string, string> = {
  published: "bg-green-100 text-green-800",
  draft: "bg-yellow-100 text-yellow-800",
  archived: "bg-tint text-ink-muted",
};

const electionTypeLabels: Record<string, string> = {
  presidential: "Presidential",
  governorship: "Governorship",
  senate: "Senate",
  house_of_representatives: "House of Representatives",
  state_assembly: "State Assembly",
  local_government: "Local Government",
  other: "Other",
};

export default async function ElectionsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await connection();
  await requireElectoralStaff();

  const params = await searchParams;
  const selectedStatus = ["draft", "published", "archived"].includes(params.status ?? "")
    ? params.status!
    : "all";

  const supabase = await createClient();
  let electionsQuery = supabase
    .from("elections")
    .select("id, name, election_type, election_date, jurisdiction, publication_status, official_source_url, created_at")
    .order("election_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (selectedStatus !== "all") {
    electionsQuery = electionsQuery.eq("publication_status", selectedStatus);
  }

  const { data: elections, error } = await electionsQuery;

  return (
    <div className="min-h-screen bg-paper p-5 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="mt-3 text-2xl font-bold text-ink">Elections</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Create and manage elections recorded on Aminiya Tracker.
            </p>
          </div>
          <Link
            href="/admin/electoral-data/elections/new"
            className="rounded-lg bg-signal px-5 py-3 text-sm font-semibold text-ink hover:bg-signal-hover"
          >
            Add Election
          </Link>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load elections: {error.message}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line-soft bg-paper-raised">
            <div className="flex items-center justify-between border-b border-line-soft px-5 py-4">
              <div>
                <h2 className="font-semibold text-ink">Election records</h2>
                <form className="mt-2 flex flex-wrap items-center gap-2">
                  <label htmlFor="election-status" className="text-xs text-ink-subtle">Filter by status</label>
                  <select
                    id="election-status"
                    name="status"
                    defaultValue={selectedStatus}
                    className="rounded-md border border-line-soft bg-paper-raised px-2 py-1.5 text-xs"
                  >
                    <option value="all">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                  <button
                    type="submit"
                    className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink-raised"
                  >
                    Apply
                  </button>
                </form>
              </div>
              <span className="text-sm text-ink-subtle">{elections?.length ?? 0} records</span>
            </div>

            {!elections?.length ? (
              <div className="px-5 py-14 text-center">
                <p className="font-medium text-ink">No elections have been added yet.</p>
                <p className="mt-1 text-sm text-ink-subtle">Create an election to start building its electoral records.</p>
                <Link
                  href="/admin/electoral-data/elections/new"
                  className="mt-5 inline-flex rounded-lg bg-signal px-4 py-2.5 text-sm font-semibold text-ink"
                >
                  Add the first election
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[940px] text-left text-sm">
                  <thead className="bg-tint text-xs uppercase tracking-wide text-ink-subtle">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Election</th>
                      <th className="px-5 py-3 font-semibold">Type</th>
                      <th className="px-5 py-3 font-semibold">Date</th>
                      <th className="px-5 py-3 font-semibold">Jurisdiction</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {elections.map((election) => (
                      <tr key={election.id} className="hover:bg-tint">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-ink">{election.name}</p>
                          {election.official_source_url && (
                            <a
                              href={election.official_source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-block text-xs text-ink hover:underline"
                            >
                              Official source
                            </a>
                          )}
                        </td>
                        <td className="px-5 py-4 text-ink-muted">
                          {electionTypeLabels[election.election_type] ?? election.election_type}
                        </td>
                        <td className="px-5 py-4 text-ink-muted">
                          {election.election_date
                            ? new Date(`${election.election_date}T00:00:00`).toLocaleDateString("en-GB")
                            : "Not set"}
                        </td>
                        <td className="px-5 py-4 text-ink-muted">{election.jurisdiction}</td>
                        <td className="px-5 py-4">
                          <OptimisticStatusBadge statusKey={`elections:${election.id}`} status={election.publication_status} styles={statusStyles} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col items-start gap-3">
                            <StatusActions
                              table="elections"
                              id={election.id}
                              status={election.publication_status}
                            />
                            <RecordActions
                              endpoint={`/api/admin/elections/${election.id}`}
                              editHref={`/admin/electoral-data/elections/${election.id}/edit`}
                              label={election.name}
                              blockedBy="Elections with candidacies, results or incident reports cannot be deleted."
                            />
                          </div>
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
