import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const sectors = [
  "education", "healthcare", "agriculture", "infrastructure",
  "employment", "security", "water_sanitation", "electricity",
  "environment", "governance", "youth_development",
  "women_development", "social_protection", "other",
];

const publicationStatuses = ["draft", "published", "archived"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("app_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || !["admin", "electoral_reviewer"].includes(profile.role)) {
      return NextResponse.json({ error: "You are not authorised to update promises." }, { status: 403 });
    }

    const body = await request.json();

    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const sector = String(body.sector ?? "").trim();
    const sourceUrl = String(body.source_url ?? "").trim() || null;
    const promiseDate = body.promise_date || null;
    const targetDate = body.target_date || null;
    const publicationStatus = String(body.publication_status ?? "");

    if (
      title.length < 5 || title.length > 200 ||
      description.length < 20 || description.length > 10000 ||
      !sectors.includes(sector) ||
      !publicationStatuses.includes(publicationStatus)
    ) {
      return NextResponse.json({ error: "Please check the submitted fields." }, { status: 400 });
    }

    if (promiseDate && targetDate && targetDate < promiseDate) {
      return NextResponse.json({ error: "Target date cannot be earlier than the promise date." }, { status: 400 });
    }

    if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) {
      return NextResponse.json({ error: "Enter a valid source URL." }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabase
      .from("political_promises")
      .select("id, candidacy_id")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json({ error: "Promise not found." }, { status: 404 });
    }

    if (publicationStatus === "published") {
      const { data: candidacy } = await supabase
        .from("candidacies")
        .select("id, candidate_id, election_id")
        .eq("id", existing.candidacy_id)
        .eq("publication_status", "published")
        .single();

      if (!candidacy) {
        return NextResponse.json({ error: "The associated candidacy must be published first." }, { status: 400 });
      }

      const [candidateResult, electionResult] = await Promise.all([
        supabase.from("candidates").select("id").eq("id", candidacy.candidate_id).eq("publication_status", "published").single(),
        supabase.from("elections").select("id").eq("id", candidacy.election_id).eq("publication_status", "published").single(),
      ]);

      if (!candidateResult.data || !electionResult.data) {
        return NextResponse.json({ error: "The associated candidate and election must also be published." }, { status: 400 });
      }
    }

    const { error } = await supabase
      .from("political_promises")
      .update({
        title,
        description,
        sector,
        source_url: sourceUrl,
        promise_date: promiseDate,
        target_date: targetDate,
        publication_status: publicationStatus,
      })
      .eq("id", id);

    if (error) {
      console.error("Promise update error:", error);
      return NextResponse.json({ error: "Unable to update this promise." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Promise update API error:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
