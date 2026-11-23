import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ArrowUpRight, Landmark, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PublicPageHero from "@/components/public-page-hero";
import { BlurImage } from "@/components/ui/blur-image";
import { LocalizedText } from "@/components/i18n/promise-translations";

export const instant = false;

type Related<T> = T | T[] | null;
const one = <T,>(value: Related<T>): T | null => (Array.isArray(value) ? value[0] ?? null : value);

type Race = {
  id: string;
  office_title: string;
  ballot_number: string | null;
  manifesto_url: string | null;
  election: Related<{ id: string; name: string; election_date: string | null; publication_status: string }>;
  party: Related<{ name: string; acronym: string | null; publication_status: string }>;
  area: Related<{ name: string; area_type: string; publication_status: string }>;
};

async function loadCandidate(id: string) {
  const supabase = await createClient();

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id, full_name, biography, photo_url, official_profile_url")
    .eq("id", id)
    .eq("publication_status", "published")
    .maybeSingle();

  if (!candidate) return null;

  const { data: candidacies } = await supabase
    .from("candidacies")
    .select(`
      id, office_title, ballot_number, manifesto_url,
      election:elections(id, name, election_date, publication_status),
      party:political_parties(name, acronym, publication_status),
      area:electoral_areas(name, area_type, publication_status)
    `)
    .eq("candidate_id", id)
    .eq("publication_status", "published");

  // Only races in published elections are public; unpublished party or area
  // details are left out rather than shown.
  const races = ((candidacies ?? []) as unknown as Race[])
    .map((race) => {
      const election = one(race.election);
      const party = one(race.party);
      const area = one(race.area);
      return {
        id: race.id,
        office: race.office_title,
        ballot: race.ballot_number,
        manifesto: race.manifesto_url,
        election: election?.publication_status === "published" ? election : null,
        party: party?.publication_status === "published" ? party : null,
        area: area?.publication_status === "published" ? area : null,
      };
    })
    .filter((race) => race.election);

  return { candidate, races };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const loaded = await loadCandidate(id);
  if (!loaded) return { title: "Candidate" };
  const race = loaded.races[0];
  return {
    title: loaded.candidate.full_name,
    description: race
      ? `${loaded.candidate.full_name}, ${race.party?.acronym ?? race.party?.name ?? "candidate"} for ${race.office}${race.area ? `, ${race.area.name}` : ""}.`
      : `${loaded.candidate.full_name}: candidate profile on Aminiya Tracker.`,
  };
}

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const loaded = await loadCandidate(id);
  if (!loaded) notFound();

  const { candidate, races } = loaded;
  const lead = races[0];
  const summary = lead
    ? [lead.party?.name, lead.office, lead.area?.name].filter(Boolean).join(" · ")
    : null;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <PublicPageHero
        title={candidate.full_name}
        description={
          summary ?? <LocalizedText en="Candidate profile" ha="Bayanin ɗan takara" />
        }
        aside={
          // Same round frame as the cards, larger: the photo never fills the hero edge to edge.
          <span className="relative block size-36 overflow-hidden rounded-full bg-ink-raised ring-4 ring-white/15 sm:size-44">
            {candidate.photo_url ? (
              <BlurImage src={candidate.photo_url} alt={candidate.full_name} fill sizes="176px" className="object-cover object-top" priority />
            ) : (
              <span className="flex size-full items-center justify-center font-heading text-5xl font-bold text-white" aria-hidden="true">
                {candidate.full_name.charAt(0).toUpperCase()}
              </span>
            )}
          </span>
        }
      >
        <Link
          href="/electoral-information#section-candidates"
          className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-on-ink-muted hover:text-white"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <LocalizedText en="All candidates" ha="Dukkan 'yan takara" />
        </Link>
      </PublicPageHero>

      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-labelledby="bio-heading">
          <h2 id="bio-heading" className="font-heading text-2xl font-bold">
            <LocalizedText en="Biography" ha="Tarihin rayuwa" />
          </h2>
          <p className="mt-4 max-w-prose text-base leading-8 whitespace-pre-line text-ink-muted">
            {candidate.biography ? (
              candidate.biography
            ) : (
              <LocalizedText
                en="No biography has been provided yet."
                ha="Ba a samar da tarihin rayuwa ba tukuna."
              />
            )}
          </p>
          {candidate.official_profile_url ? (
            <a
              href={candidate.official_profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink underline-offset-4 hover:underline"
            >
              <LocalizedText en="View official profile" ha="Duba cikakken bayanin hukuma" />
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          ) : null}
        </section>

        <section aria-labelledby="races-heading">
          <h2 id="races-heading" className="font-heading text-2xl font-bold">
            <LocalizedText en="Contesting" ha="Takara" />
          </h2>
          {races.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">
              <LocalizedText
                en="No published candidacy yet."
                ha="Babu takarar da aka wallafa tukuna."
              />
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {races.map((race) => (
                <li key={race.id} className="rounded-2xl border border-line-soft bg-paper-raised p-5">
                  <p className="font-heading text-lg font-bold">{race.office}</p>
                  <div className="mt-2 space-y-1.5 text-sm text-ink-muted">
                    {race.party ? (
                      <p className="flex items-center gap-2">
                        <Landmark size={15} className="shrink-0 text-ink-subtle" aria-hidden="true" />
                        {race.party.name}
                        {race.party.acronym ? ` (${race.party.acronym})` : ""}
                      </p>
                    ) : null}
                    {race.area ? (
                      <p className="flex items-center gap-2">
                        <MapPin size={15} className="shrink-0 text-ink-subtle" aria-hidden="true" />
                        {race.area.name}
                      </p>
                    ) : null}
                  </div>
                  {race.election ? (
                    <Link
                      href={`/elections/${race.election.id}`}
                      className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink underline-offset-4 hover:underline"
                    >
                      {race.election.name}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
