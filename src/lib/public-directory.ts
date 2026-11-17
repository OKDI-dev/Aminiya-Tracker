import { supabase } from "@/lib/supabase";
import { isMissingColumnError } from "@/lib/blurhash";

export type DirectoryCandidate = {
  id: string;
  full_name: string;
  biography: string | null;
  photo_url: string | null;
  photo_blurhash?: string | null;
  official_profile_url: string | null;
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

const CANDIDATE_COLUMNS = "id, full_name, biography, photo_url, official_profile_url";
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

  return {
    candidates: (candidates.data ?? []) as unknown as DirectoryCandidate[],
    parties: (parties.data ?? []) as unknown as DirectoryParty[],
  };
}

export const DIRECTORY_KEY = "public:directory";
