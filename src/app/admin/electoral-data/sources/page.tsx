import Link from "next/link";
import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SourceStatusActions from "@/components/admin/electoral-data/source-status-actions";
import SourceRecordActions from "@/components/admin/electoral-data/source-record-actions";
import { OptimisticRow, OptimisticStatusBadge } from "@/components/admin/optimistic-status";

export const instant = false;

const sourceTypes = [
  "inec",
  "government",
  "observer",
  "media",
  "research",
  "community",
  "other",
];

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  verified: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default async function ElectoralSourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; search?: string }>;
}) {
  await connection();
  await requireElectoralStaff();

  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("electoral_sources")
    .select(
      "id, title, publisher, source_url, source_type, publication_date, verification_status, notes, created_at"
    )
    .order("created_at", { ascending: false });

  if (params.status && ["pending", "verified", "rejected"].includes(params.status)) {
    query = query.eq("verification_status", params.status);
  }

  if (params.type && sourceTypes.includes(params.type)) {
    query = query.eq("source_type", params.type);
  }

  if (params.search?.trim()) {
    const term = params.search.trim().replace(/[,%()]/g, "");
    if (term) {
      query = query.or(`title.ilike.%${term}%,publisher.ilike.%${term}%`);
    }
  }

  const { data: sources, error } = await query;

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800";

  return (
    <main className="min-h-screen bg-[#f7f8f5] p-5 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <Link
            href="/admin/electoral-data"
            className="text-sm text-gray-500 transition hover:text-[#ff6600]"
          >
            ← Back
          </Link>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#171717]">
                Electoral Sources
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Register and verify sources used to support electoral information and results.
              </p>
            </div>

            <Link
              href="/admin/electoral-data/sources/new"
              className="rounded-lg bg-[#ff6600] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e85d00]"
            >
              Add source
            </Link>
          </div>
        </div>

        <form className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-4">
          <input
            name="search"
            defaultValue={params.search ?? ""}
            placeholder="Search title or publisher"
            className={inputClass}
          />

          <select name="type" defaultValue={params.type ?? ""} className={inputClass}>
            <option value="">All source types</option>
            {sourceTypes.map((type) => (
              <option key={type} value={type}>
                {type.toUpperCase()}
              </option>
            ))}
          </select>

          <select name="status" defaultValue={params.status ?? ""} className={inputClass}>
            <option value="">All verification statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>

          <button className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Apply filters
          </button>
        </form>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-4 text-sm text-gray-600">
            {sources?.length ?? 0} source record{sources?.length === 1 ? "" : "s"}
          </div>

          {error ? (
            <div className="p-5 text-sm text-red-700">
              Could not load electoral sources: {error.message}
            </div>
          ) : !sources?.length ? (
            <div className="p-10 text-center">
              <h2 className="font-semibold text-[#171717]">No sources found</h2>
              <p className="mt-2 text-sm text-gray-500">
                Register an official document, government publication, observer report or other source.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Source</th>
                    <th className="px-5 py-3">Publisher</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Publication date</th>
                    <th className="px-5 py-3">Verification</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sources.map((source) => (
                    <OptimisticRow key={source.id} rowKey={`electoral_sources:${source.id}`} className="align-top">
                      <td className="max-w-sm px-5 py-4">
                        <p className="font-semibold text-gray-900">{source.title}</p>
                        {source.source_url && (
                          <a
                            href={source.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block break-all text-xs text-[#ff6600] hover:underline"
                          >
                            Open source
                          </a>
                        )}
                        {source.notes && (
                          <p className="mt-2 line-clamp-2 text-xs text-gray-500">
                            {source.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">{source.publisher}</td>
                      <td className="px-5 py-4 uppercase">{source.source_type}</td>
                      <td className="px-5 py-4">
                        {source.publication_date
                          ? new Date(`${source.publication_date}T00:00:00`).toLocaleDateString("en-NG")
                          : "Not specified"}
                      </td>
                      <td className="px-5 py-4">
                        <OptimisticStatusBadge statusKey={`electoral_sources:${source.id}`} status={source.verification_status} styles={statusStyles} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-3">
                          <SourceStatusActions
                            sourceId={source.id}
                            status={source.verification_status}
                          />
                          <SourceRecordActions sourceId={source.id} title={source.title} />
                        </div>
                      </td>
                    </OptimisticRow>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
