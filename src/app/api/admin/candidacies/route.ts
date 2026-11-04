import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowedStatuses = ["draft", "published", "archived"];

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: Request) {
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
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      !["admin", "electoral_reviewer"].includes(profile.role)
    ) {
      return NextResponse.json(
        { error: "You are not authorised to manage candidacies." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const electionId = typeof body.election_id === "string" ? body.election_id : "";
    const candidateId = typeof body.candidate_id === "string" ? body.candidate_id : "";
    const partyId = typeof body.party_id === "string" && body.party_id ? body.party_id : null;
    const areaId = typeof body.electoral_area_id === "string" && body.electoral_area_id
      ? body.electoral_area_id
      : null;
    const officeTitle = typeof body.office_title === "string" ? body.office_title.trim() : "";
    const ballotNumber = typeof body.ballot_number === "string" ? body.ballot_number.trim() || null : null;
    const manifestoUrl = typeof body.manifesto_url === "string" ? body.manifesto_url.trim() || null : null;
    const publicationStatus = typeof body.publication_status === "string"
      ? body.publication_status
      : "draft";

    if (!isUuid(electionId) || !isUuid(candidateId)) {
      return NextResponse.json(
        { error: "Select a valid election and candidate." },
        { status: 400 }
      );
    }

    if (partyId && !isUuid(partyId)) {
      return NextResponse.json({ error: "Select a valid political party." }, { status: 400 });
    }

    if (areaId && !isUuid(areaId)) {
      return NextResponse.json({ error: "Select a valid electoral area." }, { status: 400 });
    }

    if (!officeTitle || officeTitle.length > 200) {
      return NextResponse.json(
        { error: "Enter an office title of no more than 200 characters." },
        { status: 400 }
      );
    }

    if (ballotNumber && ballotNumber.length > 50) {
      return NextResponse.json({ error: "Ballot number must not exceed 50 characters." }, { status: 400 });
    }

    if (
      manifestoUrl &&
      (manifestoUrl.length > 2048 || !isValidHttpUrl(manifestoUrl))
    ) {
      return NextResponse.json(
        { error: "Enter a valid HTTP or HTTPS manifesto URL." },
        { status: 400 }
      );
    }

    if (!allowedStatuses.includes(publicationStatus)) {
      return NextResponse.json({ error: "Select a valid publication status." }, { status: 400 });
    }

    // Validate that the selected position matches the election type
    // and that the electoral area belongs to the expected Gombe hierarchy.
    const positionRules: Record<string, { electionTypes: string[]; areaType: string | null }> = {
      "President": { electionTypes: ["presidential"], areaType: null },
      "Governor": { electionTypes: ["governorship"], areaType: "state" },
      "Senator": { electionTypes: ["senate"], areaType: "senatorial_district" },
      "Member, House of Representatives": {
        electionTypes: ["house_of_representatives"],
        areaType: "federal_constituency",
      },
      "Member, State House of Assembly": {
        electionTypes: ["state_assembly"],
        areaType: "state_constituency",
      },
      "Local Government Chairman": {
        electionTypes: ["local_government"],
        areaType: "lga",
      },
      "Councillor": {
        electionTypes: ["local_government"],
        areaType: "ward",
      },
    };

    const rule = positionRules[officeTitle];

    if (rule) {
      const { data: election, error: electionLookupError } = await supabase
        .from("elections")
        .select("id, election_type")
        .eq("id", electionId)
        .maybeSingle();

      if (electionLookupError || !election) {
        return NextResponse.json(
          { error: "The selected election could not be verified." },
          { status: 400 }
        );
      }

      if (!rule.electionTypes.includes(election.election_type)) {
        return NextResponse.json(
          { error: "This position does not match the selected election type." },
          { status: 400 }
        );
      }

      if (rule.areaType === null) {
        if (areaId) {
          return NextResponse.json(
            { error: "A presidential candidacy must not be assigned to a local electoral area." },
            { status: 400 }
          );
        }
      } else {
        if (!areaId) {
          return NextResponse.json(
            { error: "Select the required electoral area for this position." },
            { status: 400 }
          );
        }

        const { data: area, error: areaLookupError } = await supabase
          .from("electoral_areas")
          .select("id, name, area_type, parent_id")
          .eq("id", areaId)
          .eq("publication_status", "published")
          .maybeSingle();

        if (areaLookupError || !area || area.area_type !== rule.areaType) {
          return NextResponse.json(
            { error: "The selected electoral area is not valid for this position." },
            { status: 400 }
          );
        }

        const { data: state } = await supabase
          .from("electoral_areas")
          .select("id")
          .eq("area_type", "state")
          .ilike("name", "Gombe")
          .maybeSingle();

        if (!state) {
          return NextResponse.json(
            { error: "The Gombe State electoral area could not be verified." },
            { status: 400 }
          );
        }

        if (rule.areaType === "state" && area.id !== state.id) {
          return NextResponse.json(
            { error: "The governorship candidacy must be assigned to Gombe State." },
            { status: 400 }
          );
        }

        if (["senatorial_district", "federal_constituency", "state_constituency", "lga"].includes(rule.areaType)) {
          if (area.parent_id !== state.id) {
            return NextResponse.json(
              { error: "The selected area does not belong directly to Gombe State." },
              { status: 400 }
            );
          }
        }

        if (rule.areaType === "ward") {
          const { data: lga } = await supabase
            .from("electoral_areas")
            .select("id, parent_id")
            .eq("id", area.parent_id)
            .eq("area_type", "lga")
            .maybeSingle();

          if (!lga || lga.parent_id !== state.id) {
            return NextResponse.json(
              { error: "The selected ward does not belong to a Gombe State LGA." },
              { status: 400 }
            );
          }
        }
      }
    }

    const { data, error } = await supabase
      .from("candidacies")
      .insert({
        election_id: electionId,
        candidate_id: candidateId,
        party_id: partyId,
        electoral_area_id: areaId,
        office_title: officeTitle,
        ballot_number: ballotNumber,
        manifesto_url: manifestoUrl,
        publication_status: publicationStatus,
      })
      .select("id, election_id, candidate_id, office_title, publication_status")
      .single();

    if (error) {
      console.error("Candidacy creation failed:", error);

      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This candidate already has a candidacy for this election, office and electoral area." },
          { status: 409 }
        );
      }

      if (error.code === "23503") {
        return NextResponse.json(
          { error: "One of the selected election, candidate, party or electoral area records no longer exists." },
          { status: 400 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ candidacy: data }, { status: 201 });
  } catch (error) {
    console.error("Candidacies API error:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
