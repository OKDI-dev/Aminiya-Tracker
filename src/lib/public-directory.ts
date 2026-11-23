import { supabase } from "@/lib/supabase";
import { isMissingColumnError } from "@/lib/blurhash";

/** The contest a candidate is listed for, shown on their card. */
export type CandidateRace = {
  office: string;
  party: string | null;
  area: string | null;
};

export type DirectoryCandidate = {
  id: string;
  full_name: string;
  biography: string | null;
  photo_url: string | null;
  photo_blurhash?: string | null;
  official_profile_url: string | null;
  race?: CandidateRace | null;
};

type CandidacyRow = {
  office_title: string;
  publication_status: string;
  party: { acronym: string | null; name: string; publication_status: string } | null;
  area: { name: string; publication_status: string } | null;
  election: { publication_status: string } | null;
};

export type DirectoryParty = {
  id: string;
  name: string;
  acronym: string | null;
  logo_url: string | null;
  logo_blurhash?: string | null;
  official_website: string | null;
  manifesto_url: string | null;
};

export type Directory = {
  candidates: DirectoryCandidate[];
  parties: DirectoryParty[];
};

// Each candidate's candidacies come along so a card can say what they're running for.
const CANDIDATE_COLUMNS =
  "id, full_name, biography, photo_url, official_profile_url, " +
  "candidacies(office_title, publication_status, party:political_parties(acronym, name, publication_status), area:electoral_areas(name, publication_status), election:elections(publication_status))";
const PARTY_COLUMNS = "id, name, acronym, logo_url, official_website, manifesto_url";

async function query(withBlurhash: boolean) {
  return Promise.all([
    supabase
      .from("candidates")
      .select(withBlurhash ? `${CANDIDATE_COLUMNS}, photo_blurhash` : CANDIDATE_COLUMNS)
      .eq("publication_status", "published")
      .order("full_name"),
    supabase
      .from("political_parties")
      .select(withBlurhash ? `${PARTY_COLUMNS}, logo_blurhash` : PARTY_COLUMNS)
      .eq("publication_status", "published")
      .order("name"),
  ]);
}

/** Published candidates + parties, with blurhash placeholders when available. */
export async function fetchDirectory(): Promise<Directory> {
  let [candidates, parties] = await query(true);

  if (isMissingColumnError(candidates.error) || isMissingColumnError(parties.error)) {
    [candidates, parties] = await query(false);
  }

  if (candidates.error) throw candidates.error;
  if (parties.error) throw parties.error;

  const rows = (candidates.data ?? []) as unknown as (DirectoryCandidate & { candidacies?: CandidacyRow[] })[];

  return {
    candidates: rows.map(({ candidacies, ...candidate }) => {
      // Only a published candidacy in a published election counts publicly.
      const listed = (candidacies ?? []).find(
        (item) => item.publication_status === "published" && item.election?.publication_status === "published"
      );
      return {
        ...candidate,
        race: listed
          ? {
              office: listed.office_title,
              party:
                listed.party?.publication_status === "published"
                  ? listed.party.acronym || listed.party.name
                  : null,
              area: listed.area?.publication_status === "published" ? listed.area.name : null,
            }
          : null,
      };
    }),
    parties: (parties.data ?? []) as unknown as DirectoryParty[],
  };
}

export const DIRECTORY_KEY = "public:directory";
