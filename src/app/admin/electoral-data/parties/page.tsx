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
  archived: "bg-tint text-ink-muted",
};

export default async function PartiesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await connection();
  await requireElectoralStaff();

  const params = await searchParams;
  const selectedStatus = ["draft", "published", "archived"].includes(params.status ?? "")
    ? params.status!
    : "all";
  const searchTerm = (params.q ?? "").trim().slice(0, 100);

  const supabase = await createClient();

  let partiesQuery = supabase
    .from("political_parties")
    .select("id, name, acronym, logo_url, official_website, publication_status, created_at")
    .order("name", { ascending: true });

  if (selectedStatus !== "all") {
    partiesQuery = partiesQuery.eq("publication_status", selectedStatus);
  }

  if (searchTerm) {
    const safeSearch = searchTerm.replace(/[,%()]/g, " ").trim();
    if (safeSearch) {
      partiesQuery = partiesQuery.or(
        `name.ilike.%${safeSearch}%,acronym.ilike.%${safeSearch}%`
      );
    }
  }

  const { data: parties, error } = await partiesQuery;

  return (
    <main className="min-h-screen bg-paper p-5 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="mt-3 text-2xl font-bold text-ink">Political Parties</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Manage party profiles, logos, official websites and manifestos.
            </p>
          </div>
          <Link
            href="/admin/electoral-data/parties/new"
            className="rounded-lg bg-signal px-5 py-3 text-sm font-semibold text-ink hover:bg-signal-hover"
          >
            Add Political Party
          </Link>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load political parties: {error.message}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line-soft bg-paper-raised">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line-soft px-5 py-4">
              <div>
                <h2 className="font-semibold text-ink">Party records</h2>
                <form method="get" className="mt-3 flex flex-wrap items-center gap-2">
                  <label htmlFor="party-search" className="sr-only">Search parties</label>
                  <input
                    id="party-search"
                    name="q"
                    type="search"
                    defaultValue={searchTerm}
                    placeholder="Search name or acronym"
                    className="rounded-md border border-line-soft px-3 py-1.5 text-xs"
                  />
                  <label htmlFor="party-status" className="sr-only">Filter by status</label>
                  <select
                    id="party-status"
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
              <span className="text-sm text-ink-subtle">{parties?.length ?? 0} records</span>
            </div>

            {!parties?.length ? (
              <div className="px-5 py-14 text-center">
                <p className="font-medium text-ink">No political parties found.</p>
                <p className="mt-1 text-sm text-ink-subtle">
                  Add a party or adjust your search and filters.
                </p>
                <Link
                  href="/admin/electoral-data/parties/new"
                  className="mt-5 inline-flex rounded-lg bg-signal px-4 py-2.5 text-sm font-semibold text-ink"
                >
                  Add the first party
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-tint text-xs uppercase tracking-wide text-ink-subtle">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Party</th>
                      <th className="px-5 py-3 font-semibold">Official website</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {parties.map((party) => (
                      <tr key={party.id} className="hover:bg-tint">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {party.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={party.logo_url}
                                alt={`${party.name} logo`}
                                className="h-11 w-11 rounded-lg border border-line-soft bg-paper-raised object-contain p-1"
                              />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-tint text-sm font-bold text-ink">
                                {(party.acronym || party.name).slice(0, 3).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-ink">{party.name}</p>
                              <p className="text-xs text-ink-subtle">{party.acronym || "No acronym"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {party.official_website ? (
                            <a href={party.official_website} target="_blank" rel="noreferrer" className="text-ink hover:underline">
                              Visit website
                            </a>
                          ) : <span className="text-ink-subtle">Not provided</span>}
                        </td>
                        <td className="px-5 py-4">
                          <OptimisticStatusBadge statusKey={`political_parties:${party.id}`} status={party.publication_status} styles={statusStyles} />
                        </td>
                        <td className="px-5 py-4">
                          <StatusActions
                            table="political_parties"
                            id={party.id}
                            status={party.publication_status}
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
    </main>
  );
}
