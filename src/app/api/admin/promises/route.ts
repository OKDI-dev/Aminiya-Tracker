import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const sectors = [
  "education", "healthcare", "agriculture", "infrastructure",
  "employment", "security", "water_sanitation", "electricity",
  "environment", "governance", "youth_development",
  "women_development", "social_protection", "other",
];

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
      return NextResponse.json({ error: "You are not authorised to register promises." }, { status: 403 });
    }

    const body = await request.json();

    const candidacyId = String(body.candidacy_id ?? "").trim();
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const sector = String(body.sector ?? "").trim();
    const sourceUrl = String(body.source_url ?? "").trim() || null;
    const promiseDate = body.promise_date || null;
    const targetDate = body.target_date || null;

    if (!candidacyId || !title || !description || !sector) {
      return NextResponse.json({ error: "Complete all required fields." }, { status: 400 });
    }

    if (title.length < 5 || title.length > 200) {
      return NextResponse.json({ error: "Title must be between 5 and 200 characters." }, { status: 400 });
    }

    if (description.length < 20 || description.length > 10000) {
      return NextResponse.json({ error: "Description must be between 20 and 10,000 characters." }, { status: 400 });
    }

    if (!sectors.includes(sector)) {
      return NextResponse.json({ error: "Select a valid sector." }, { status: 400 });
    }

    if (promiseDate && targetDate && targetDate < promiseDate) {
      return NextResponse.json({ error: "Target date cannot be earlier than the promise date." }, { status: 400 });
    }

    if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) {
      return NextResponse.json({ error: "Enter a valid source URL." }, { status: 400 });
    }

    // Only register promises against a published candidacy.
    const { data: candidacy, error: candidacyError } = await supabase
      .from("candidacies")
      .select("id, publication_status")
      .eq("id", candidacyId)
      .eq("publication_status", "published")
      .single();

    if (candidacyError || !candidacy) {
      return NextResponse.json({ error: "The selected candidacy is unavailable or unpublished." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("political_promises")
      .insert({
        candidacy_id: candidacyId,
        title,
        description,
        sector,
        source_url: sourceUrl,
        promise_date: promiseDate,
        target_date: targetDate,
        progress_status: "not_started",
        publication_status: "draft",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Promise registration error:", error);
      return NextResponse.json({ error: "Unable to register this promise." }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error("Promise API error:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
