import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowedStatuses = ["draft", "verified"] as const;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("app_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile || !["admin", "electoral_reviewer"].includes(profile.role)) {
      return NextResponse.json({ error: "You are not authorised to manage election results." }, { status: 403 });
    }

    const body = await request.json();

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
      return NextResponse.json({ error: "Election and electoral area are required." }, { status: 400 });
    }

    if (!candidate_id && !party_id) {
      return NextResponse.json({ error: "Select a candidate, a party, or both." }, { status: 400 });
    }

    if (!Number.isSafeInteger(votes_count) || votes_count < 0) {
      return NextResponse.json({ error: "Votes must be a non-negative whole number." }, { status: 400 });
    }

    for (const [field, value] of [
      ["Registered voters", registered_voters],
      ["Accredited voters", accredited_voters],
    ] as const) {
      if (value !== null && value !== undefined && (!Number.isSafeInteger(value) || value < 0)) {
        return NextResponse.json({ error: `${field} must be a non-negative whole number.` }, { status: 400 });
      }
    }

    if (
      registered_voters !== null &&
      registered_voters !== undefined &&
      accredited_voters !== null &&
      accredited_voters !== undefined &&
      accredited_voters > registered_voters
    ) {
      return NextResponse.json({ error: "Accredited voters cannot exceed registered voters." }, { status: 400 });
    }

    if (!["provisional", "official"].includes(result_type)) {
      return NextResponse.json({ error: "Invalid result classification." }, { status: 400 });
    }

    if (!allowedStatuses.includes(publication_status)) {
      return NextResponse.json({ error: "New results can only be saved as draft or verified." }, { status: 400 });
    }

    if (publication_status === "verified" && !source_id) {
      return NextResponse.json({ error: "A source is required before verification." }, { status: 400 });
    }

    if (source_id) {
      const { data: source, error: sourceError } = await supabase
        .from("electoral_sources")
        .select("id, verification_status")
        .eq("id", source_id)
        .single();

      if (sourceError || !source) {
        return NextResponse.json({ error: "The selected electoral source could not be found." }, { status: 400 });
      }

      if (publication_status === "verified" && source.verification_status !== "verified") {
        return NextResponse.json({ error: "The selected source must itself be verified first." }, { status: 400 });
      }
    }

    const { data: election, error: electionError } = await supabase
      .from("elections")
      .select("id")
      .eq("id", election_id)
      .eq("publication_status", "published")
      .maybeSingle();

    if (electionError || !election) {
      return NextResponse.json({ error: "Select a published election." }, { status: 400 });
    }

    const { data: area, error: areaError } = await supabase
      .from("electoral_areas")
      .select("id")
      .eq("id", electoral_area_id)
      .eq("publication_status", "published")
      .maybeSingle();

    if (areaError || !area) {
      return NextResponse.json({ error: "Select a published electoral area." }, { status: 400 });
    }

    if (candidate_id) {
      const { data: candidate, error: candidateError } = await supabase
        .from("candidates")
        .select("id")
        .eq("id", candidate_id)
        .eq("publication_status", "published")
        .maybeSingle();

      if (candidateError || !candidate) {
        return NextResponse.json({ error: "Select a published candidate." }, { status: 400 });
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
        return NextResponse.json({ error: "Select a published political party." }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from("election_results")
      .insert({
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
      })
      .select("id")
      .single();

    if (error) {
      console.error("Election result insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch (error) {
    console.error("Election result API error:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
