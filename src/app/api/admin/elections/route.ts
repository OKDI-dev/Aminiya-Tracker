import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowedTypes = [
  "presidential",
  "governorship",
  "senate",
  "house_of_representatives",
  "state_assembly",
  "local_government",
  "other",
];

const allowedStatuses = ["draft", "published", "archived"];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("app_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile || !["admin", "electoral_reviewer"].includes(profile.role)) {
      return NextResponse.json({ error: "You are not authorised to manage elections." }, { status: 403 });
    }

    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const electionType = typeof body.election_type === "string" ? body.election_type : "";
    const jurisdiction = typeof body.jurisdiction === "string" ? body.jurisdiction.trim() : "";
    const electionDate = body.election_date || null;
    const sourceUrl = typeof body.official_source_url === "string" && body.official_source_url.trim()
      ? body.official_source_url.trim()
      : null;
    const publicationStatus = typeof body.publication_status === "string"
      ? body.publication_status
      : "draft";

    if (!name || name.length > 200) {
      return NextResponse.json({ error: "Enter an election name of no more than 200 characters." }, { status: 400 });
    }

    if (!allowedTypes.includes(electionType)) {
      return NextResponse.json({ error: "Select a valid election type." }, { status: 400 });
    }

    if (!jurisdiction || jurisdiction.length > 150) {
      return NextResponse.json({ error: "Enter a jurisdiction of no more than 150 characters." }, { status: 400 });
    }

    if (electionDate && (typeof electionDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(electionDate) || Number.isNaN(Date.parse(`${electionDate}T00:00:00Z`)))) {
      return NextResponse.json({ error: "Enter a valid election date." }, { status: 400 });
    }

    if (sourceUrl) {
      try {
        const parsedUrl = new URL(sourceUrl);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("Invalid protocol");
      } catch {
        return NextResponse.json({ error: "Enter a valid HTTP or HTTPS source URL." }, { status: 400 });
      }
    }

    if (!allowedStatuses.includes(publicationStatus)) {
      return NextResponse.json({ error: "Select a valid publication status." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("elections")
      .insert({
        name,
        election_type: electionType,
        election_date: electionDate,
        jurisdiction,
        official_source_url: sourceUrl,
        publication_status: publicationStatus,
      })
      .select("id, name")
      .single();

    if (error) {
      console.error("Election creation failed:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ election: data }, { status: 201 });
  } catch (error) {
    console.error("Election API error:", error);
    return NextResponse.json({ error: "An unexpected server error occurred." }, { status: 500 });
  }
}
