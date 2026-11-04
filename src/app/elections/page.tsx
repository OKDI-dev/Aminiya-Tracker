import Link from "next/link";
import { connection } from "next/server";
import { CalendarDays, MapPin, Search, Vote } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PublicPageHero from "@/components/public-page-hero";

export const instant = false;

const electionTypeLabels: Record<string, string> = {
  presidential: "Presidential",
  governorship: "Governorship",
  senate: "Senate",
  house_of_representatives: "House of Representatives",
  state_assembly: "State Assembly",
  local_government: "Local Government",
  other: "Other",
};

function formatDate(value: string | null) {
  if (!value) return "Date not announced";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default async function ElectionsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  await connection();

  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const selectedType = params.type ?? "all";

  const supabase = await createClient();

  let electionsQuery = supabase
    .from("elections")
    .select(
      "id, name, election_type, election_date, jurisdiction, official_source_url"
    )
    .eq("publication_status", "published")
    .order("election_date", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true });

  if (selectedType !== "all" && electionTypeLabels[selectedType]) {
    electionsQuery = electionsQuery.eq("election_type", selectedType);
  }

  if (query) {
    const safeQuery = query.replace(/[,%()]/g, " ").trim();
    if (safeQuery) {
      electionsQuery = electionsQuery.or(
        `name.ilike.%${safeQuery}%,jurisdiction.ilike.%${safeQuery}%`
      );
    }
  }

  const { data: elections, error } = await electionsQuery;
  const records = elections ?? [];

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#171717]">
      <PublicPageHero
        eyebrow="Electoral information"
        title={
          <>
            Explore Elections.
            <br />
            <span className="text-[#ff6600]">Stay Informed.</span>
          </>
        }
        description="Find published election records, understand the offices being contested and explore available candidate information and election results."
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/electoral-information"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#b94a00] hover:text-[#e85d00]"
          >
            Explore civic education and electoral information →
          </Link>
        </div>
      </PublicPageHero>

      <div className="mx-auto max-w-7xl space-y-7 px-5 py-10 sm:px-8">
        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Find an election</h2>
            <p className="mt-1 text-sm text-gray-500">
              Search by election name or jurisdiction, or filter by election type.
            </p>
          </div>

          <form action="/elections" method="GET" className="grid gap-3 sm:grid-cols-[1fr_220px_auto]">
            <label className="relative block">
              <span className="sr-only">Search elections</span>
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search election or location"
                className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
              />
            </label>

            <label>
              <span className="sr-only">Election type</span>
              <select
                name="type"
                defaultValue={selectedType}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-[#ff6600]"
              >
                <option value="all">All election types</option>
                {Object.entries(electionTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="rounded-lg bg-[#ff6600] px-5 py-3 text-sm font-semibold text-white hover:bg-[#e85d00]"
            >
              Search
            </button>
          </form>
        </section>

        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Published elections</h2>
              <p className="mt-1 text-sm text-gray-500">
                Election records approved for public viewing.
              </p>
            </div>
            <span className="text-sm text-gray-500">
              {records.length.toLocaleString("en-NG")}{" "}
              {records.length === 1 ? "election" : "elections"}
            </span>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              Election records could not be loaded. Please try again later.
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
              <Vote size={32} className="mx-auto text-gray-400" />
              <h3 className="mt-4 font-semibold">No elections found</h3>
              <p className="mt-2 text-sm text-gray-500">
                There are no published elections matching your search.
              </p>
              {(query || selectedType !== "all") && (
                <Link
                  href="/elections"
                  className="mt-4 inline-flex text-sm font-semibold text-[#b94a00] hover:text-[#e85d00]"
                >
                  Clear filters
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {records.map((election) => (
                <article
                  key={election.id}
                  className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 transition hover:border-[#ffb17d] hover:shadow-sm sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-[#fff0e5] px-3 py-1.5 text-xs font-semibold text-[#b94a00]">
                      {electionTypeLabels[election.election_type] ??
                        election.election_type}
                    </span>
                    <Vote size={21} className="shrink-0 text-[#ff6600]" />
                  </div>

                  <h3 className="mt-4 text-xl font-semibold leading-snug">
                    {election.name}
                  </h3>

                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <p className="flex items-center gap-2">
                      <CalendarDays size={16} className="text-[#ff6600]" />
                      {formatDate(election.election_date)}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin size={16} className="text-[#ff6600]" />
                      {election.jurisdiction}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4">
                    <Link
                      href={`/elections/${election.id}`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[#b94a00] hover:text-[#e85d00]"
                    >
                      View election details →
                    </Link>
                    {election.official_source_url && (
                      <a
                        href={election.official_source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-gray-500 underline underline-offset-4 hover:text-[#b94a00]"
                      >
                        Official source
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
