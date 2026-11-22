import type { AdminSupabase, Validation } from "@/lib/admin/api";

const allowedStatuses = ["draft", "verified"] as const;

/**
 * Input rules for election_results, shared by create (POST) and edit (PATCH) so
 * the two can never drift apart.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function validateElectionResult(supabase: AdminSupabase, body: any): Promise<Validation> {

  const {
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
  } = body;

  if (!election_id || !electoral_area_id) {
    return { error: "Election and electoral area are required.", status: 400 };
  }

  if (!candidate_id && !party_id) {
    return { error: "Select a candidate, a party, or both.", status: 400 };
  }

  if (!Number.isSafeInteger(votes_count) || votes_count < 0) {
    return { error: "Votes must be a non-negative whole number.", status: 400 };
  }

  for (const [field, value] of [
    ["Registered voters", registered_voters],
    ["Accredited voters", accredited_voters],
  ] as const) {
    if (value !== null && value !== undefined && (!Number.isSafeInteger(value) || value < 0)) {
      return { error: `${field} must be a non-negative whole number.`, status: 400 };
    }
  }

  if (
    registered_voters !== null &&
    registered_voters !== undefined &&
    accredited_voters !== null &&
    accredited_voters !== undefined &&
    accredited_voters > registered_voters
  ) {
    return { error: "Accredited voters cannot exceed registered voters.", status: 400 };
  }

  if (!["provisional", "official"].includes(result_type)) {
    return { error: "Invalid result classification.", status: 400 };
  }

  if (!allowedStatuses.includes(publication_status)) {
    return { error: "New results can only be saved as draft or verified.", status: 400 };
  }

  if (publication_status === "verified" && !source_id) {
    return { error: "A source is required before verification.", status: 400 };
  }

  if (source_id) {
    const { data: source, error: sourceError } = await supabase
      .from("electoral_sources")
      .select("id, verification_status")
      .eq("id", source_id)
      .single();

    if (sourceError || !source) {
      return { error: "The selected electoral source could not be found.", status: 400 };
    }

    if (publication_status === "verified" && source.verification_status !== "verified") {
      return { error: "The selected source must itself be verified first.", status: 400 };
    }
  }

  const { data: election, error: electionError } = await supabase
    .from("elections")
    .select("id")
    .eq("id", election_id)
    .eq("publication_status", "published")
    .maybeSingle();

  if (electionError || !election) {
    return { error: "Select a published election.", status: 400 };
  }

  const { data: area, error: areaError } = await supabase
    .from("electoral_areas")
    .select("id")
    .eq("id", electoral_area_id)
    .eq("publication_status", "published")
    .maybeSingle();

  if (areaError || !area) {
    return { error: "Select a published electoral area.", status: 400 };
  }

  if (candidate_id) {
    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("id")
      .eq("id", candidate_id)
      .eq("publication_status", "published")
      .maybeSingle();

    if (candidateError || !candidate) {
      return { error: "Select a published candidate.", status: 400 };
    }
  }

  if (party_id) {
    const { data: party, error: partyError } = await supabase
      .from("political_parties")
      .select("id")
      .eq("id", party_id)
      .eq("publication_status", "published")
      .maybeSingle();

    if (partyError || !party) {
      return { error: "Select a published political party.", status: 400 };
    }
  }

  return {
    values: {
      election_id,
      electoral_area_id,
      candidate_id: candidate_id || null,
      party_id: party_id || null,
      votes_count,
      registered_voters: registered_voters ?? null,
      accredited_voters: accredited_voters ?? null,
      result_type,
      source_id: source_id || null,
      publication_status,
      verification_notes: verification_notes?.trim() || null,
    },
  };
}
