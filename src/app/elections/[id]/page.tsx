import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  MapPin,
  Users,
  Vote,
  ChartNoAxesCombined,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PublicPageHero from "@/components/public-page-hero";
import { BlurImage } from "@/components/ui/blur-image";

export const instant = false;

type RelatedRecord = Record<string, unknown> | null;

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function textValue(record: RelatedRecord, field: string, fallback = "") {
  const value = record?.[field];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function formatDate(value: string | null) {
  if (!value) return "Date not announced";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("en-NG");
}

const electionTypeLabels: Record<string, string> = {
  presidential: "Presidential",
  governorship: "Governorship",
  senate: "Senate",
  house_of_representatives: "House of Representatives",
  state_assembly: "State Assembly",
  local_government: "Local Government",
  other: "Other",
};

export default async function ElectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const { id } = await params;
  const supabase = await createClient();

  const { data: election, error: electionError } = await supabase
    .from("elections")
    .select(
      "id, name, election_type, election_date, jurisdiction, official_source_url"
    )
    .eq("id", id)
    .eq("publication_status", "published")
    .maybeSingle();

  if (electionError || !election) notFound();

  const [candidaciesResult, resultsResult] = await Promise.all([
    supabase
      .from("candidacies")
      .select(`
        id,
        office_title,
        ballot_number,
        manifesto_url,
        candidate:candidates!inner(*),
        party:political_parties(
          id,
          name,
          acronym,
          logo_url,
          official_website,
          publication_status
        ),
        electoral_area:electoral_areas(
          id,
          name,
          area_type,
          publication_status
        )
      `)
      .eq("election_id", id)
      .eq("publication_status", "published")
      .eq("candidate.publication_status", "published")
      .order("office_title"),

    supabase
      .from("election_results")
      .select(`
        id,
        votes_count,
        registered_voters,
        accredited_voters,
        result_type,
        verification_notes,
        electoral_area:electoral_areas(name, area_type, publication_status),
        candidate:candidates(full_name, publication_status),
        party:political_parties(name, acronym, publication_status),
        electoral_source:electoral_sources(title, publisher, source_url, verification_status)
      `)
      .eq("election_id", id)
      .eq("publication_status", "published")
      .order("votes_count", { ascending: false }),
  ]);

  const candidacies = candidaciesResult.data ?? [];
  const results = resultsResult.data ?? [];

  const visibleCandidacies = candidacies.filter((item) => {
    const candidate = one(item.candidate);
    const party = one(item.party);
    const area = one(item.electoral_area);

    return (
      textValue(candidate, "publication_status") === "published" &&
      (!party || textValue(party, "publication_status") === "published") &&
      (!area || textValue(area, "publication_status") === "published")
    );
  });

  const visibleResults = results.filter((item) => {
    const candidate = one(item.candidate);
    const party = one(item.party);
    const area = one(item.electoral_area);
    const source = one(item.electoral_source);

    return (
      (!candidate ||
        textValue(candidate, "publication_status") === "published") &&
      (!party || textValue(party, "publication_status") === "published") &&
      (!area || textValue(area, "publication_status") === "published") &&
      (!source || textValue(source, "verification_status") === "verified")
    );
  });

  const uniqueAreas = new Map<string, string>();
  visibleCandidacies.forEach((item) => {
    const area = one(item.electoral_area);
    if (area && typeof area.id === "string" && typeof area.name === "string") {
      uniqueAreas.set(area.id, area.name);
    }
  });

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#171717]">
      <PublicPageHero
        eyebrow="Election profile"
        title={
          <>
            {election.name}
          </>
        }
        description={
          <>
            Explore the published information available for this election,
            including candidates, political parties and reported results.
          </>
        }
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/elections"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#b94a00] hover:text-[#e85d00]"
          >
            <ArrowLeft size={16} />
            All elections
          </Link>
          {election.official_source_url && (
            <a
              href={election.official_source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#b94a00]"
            >
              Official election source
              <ExternalLink size={15} />
            </a>
          )}
        </div>
      </PublicPageHero>

      <div className="mx-auto max-w-7xl space-y-10 px-5 py-10 sm:px-8">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <Vote size={22} className="text-[#ff6600]" />
            <p className="mt-4 text-sm text-gray-500">Election type</p>
            <p className="mt-1 font-semibold">
              {electionTypeLabels[election.election_type] ??
                election.election_type}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <CalendarDays size={22} className="text-[#ff6600]" />
            <p className="mt-4 text-sm text-gray-500">Election date</p>
            <p className="mt-1 font-semibold">
              {formatDate(election.election_date)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <MapPin size={22} className="text-[#ff6600]" />
            <p className="mt-4 text-sm text-gray-500">Jurisdiction</p>
            <p className="mt-1 font-semibold">{election.jurisdiction}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <Users size={22} className="text-[#ff6600]" />
            <p className="mt-4 text-sm text-gray-500">Published candidacies</p>
            <p className="mt-1 text-2xl font-bold">
              {visibleCandidacies.length.toLocaleString("en-NG")}
            </p>
          </div>
        </section>

        <section>
          <div className="mb-5">
            <h2 className="text-2xl font-bold">Candidates and parties</h2>
            <p className="mt-1 text-sm text-gray-500">
              Published candidacies associated with this election.
            </p>
          </div>

          {candidaciesResult.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              Candidate information could not be loaded.
            </div>
          ) : visibleCandidacies.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <Users size={28} className="mx-auto text-gray-400" />
              <h3 className="mt-3 font-semibold">No published candidacies yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Candidate and party information will appear here when approved
                records are available.
              </p>
              <Link
                href="/electoral-information"
                className="mt-4 inline-flex text-sm font-semibold text-[#b94a00] hover:text-[#e85d00]"
              >
                Visit the electoral information centre →
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {visibleCandidacies.map((item) => {
                const candidate = one(item.candidate);
                const party = one(item.party);
                const area = one(item.electoral_area);

                return (
                  <article
                    key={item.id}
                    className="rounded-xl border border-gray-200 bg-white p-5"
                  >
                    <div className="flex items-start gap-4">
                      {textValue(candidate, "photo_url") ? (
                        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-[#f1f1f1]">
                          <BlurImage
                            src={textValue(candidate, "photo_url")}
                            blurhash={textValue(candidate, "photo_blurhash") || null}
                            alt=""
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-[#fff0e5] text-[#b94a00]">
                          <Users size={25} />
                        </div>
                      )}

                      <div className="min-w-0">
                        <h3 className="font-semibold">
                          {textValue(candidate, "full_name", "Candidate")}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
                          {textValue(item, "office_title", "Office not specified")}
                        </p>
                        <p className="mt-1 text-sm font-medium text-[#b94a00]">
                          {textValue(party, "acronym") ||
                            textValue(party, "name", "Independent / party not listed")}
                        </p>
                      </div>
                    </div>

                    {area && (
                      <p className="mt-4 text-sm text-gray-500">
                        Electoral area: {textValue(area, "name")}
                      </p>
                    )}

                    {textValue(candidate, "biography") && (
                      <p className="mt-3 line-clamp-4 text-sm leading-6 text-gray-600">
                        {textValue(candidate, "biography")}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-4 border-t border-gray-100 pt-4">
                      {textValue(candidate, "official_profile_url") && (
                        <a
                          href={textValue(candidate, "official_profile_url")}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-[#b94a00] hover:text-[#e85d00]"
                        >
                          Candidate profile ↗
                        </a>
                      )}
                      {textValue(party, "official_website") && (
                        <a
                          href={textValue(party, "official_website")}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-gray-600 hover:text-[#b94a00]"
                        >
                          Party website ↗
                        </a>
                      )}
                      {textValue(item, "manifesto_url") && (
                        <a
                          href={textValue(item, "manifesto_url")}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-gray-600 hover:text-[#b94a00]"
                        >
                          Candidacy manifesto ↗
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="mb-5">
            <h2 className="text-2xl font-bold">Electoral areas</h2>
            <p className="mt-1 text-sm text-gray-500">
              Areas associated with the published candidacies in this election.
            </p>
          </div>

          {uniqueAreas.size === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
              No electoral areas have been associated with published candidacies yet.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Array.from(uniqueAreas.values()).map((area) => (
                <span
                  key={area}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700"
                >
                  {area}
                </span>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-5 flex items-center gap-3">
            <ChartNoAxesCombined size={23} className="text-[#ff6600]" />
            <div>
              <h2 className="text-2xl font-bold">Published election results</h2>
              <p className="mt-1 text-sm text-gray-500">
                Results displayed here have been approved for public viewing.
              </p>
            </div>
          </div>

          {resultsResult.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              Election results could not be loaded.
            </div>
          ) : visibleResults.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <ChartNoAxesCombined size={28} className="mx-auto text-gray-400" />
              <h3 className="mt-3 font-semibold">No published results yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Results will appear here when verified records are published.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Candidate / Party</th>
                      <th className="px-5 py-3 font-semibold">Electoral area</th>
                      <th className="px-5 py-3 font-semibold">Votes</th>
                      <th className="px-5 py-3 font-semibold">Result status</th>
                      <th className="px-5 py-3 font-semibold">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visibleResults.map((result) => {
                      const candidate = one(result.candidate);
                      const party = one(result.party);
                      const area = one(result.electoral_area);
                      const source = one(result.electoral_source);

                      return (
                        <tr key={result.id}>
                          <td className="px-5 py-4">
                            <p className="font-medium">
                              {textValue(candidate, "full_name") ||
                                textValue(party, "name", "Candidate / party not listed")}
                            </p>
                            {textValue(party, "acronym") && (
                              <p className="mt-1 text-xs text-gray-500">
                                {textValue(party, "acronym")}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-4 text-gray-600">
                            {textValue(area, "name", "Not specified")}
                          </td>
                          <td className="px-5 py-4 font-semibold tabular-nums">
                            {formatNumber(result.votes_count)}
                          </td>
                          <td className="px-5 py-4">
                            <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                              {result.result_type === "official"
                                ? "Official"
                                : "Provisional"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {textValue(source, "source_url") ? (
                              <a
                                href={textValue(source, "source_url")}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#b94a00] hover:underline"
                              >
                                {textValue(source, "title", "View source")} ↗
                              </a>
                            ) : (
                              <span className="text-gray-400">Not listed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs leading-5 text-gray-500">
            Published results are shown with their recorded classification.
            Provisional results should not be interpreted as final official results.
          </p>
        </section>
      </div>
    </main>
  );
}
