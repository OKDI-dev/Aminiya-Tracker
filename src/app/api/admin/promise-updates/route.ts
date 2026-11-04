import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPublicEvidenceUrl } from "@/lib/public-evidence-url";

const progressStatuses = [
  "not_started",
  "in_progress",
  "partially_fulfilled",
  "fulfilled",
  "stalled",
];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("app_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || !["admin", "electoral_reviewer"].includes(profile.role)) {
      return NextResponse.json(
        { error: "You are not authorised to submit progress updates." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const promiseId = String(body.promise_id ?? "").trim();
    const title = String(body.update_title ?? "").trim();
    const description = String(body.update_description ?? "").trim();
    const progressStatus = String(body.progress_status ?? "").trim();
    const evidenceUrl = String(body.evidence_url ?? "").trim() || null;
    const sourceId = String(body.source_id ?? "").trim() || null;
    const updateDate = String(body.update_date ?? "").trim();

    if (!promiseId || !title || !description || !progressStatus || !updateDate) {
      return NextResponse.json(
        { error: "Complete all required fields." },
        { status: 400 }
      );
    }

    if (title.length < 5 || title.length > 200) {
      return NextResponse.json(
        { error: "Update title must be between 5 and 200 characters." },
        { status: 400 }
      );
    }

    if (description.length < 20 || description.length > 10000) {
      return NextResponse.json(
        { error: "Description must be between 20 and 10,000 characters." },
        { status: 400 }
      );
    }

    if (!progressStatuses.includes(progressStatus)) {
      return NextResponse.json(
        { error: "Select a valid progress status." },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(updateDate)) {
      return NextResponse.json(
        { error: "Enter a valid update date." },
        { status: 400 }
      );
    }

    if (evidenceUrl && !isPublicEvidenceUrl(evidenceUrl)) {
      return NextResponse.json(
        {
          error:
            "Evidence links must be public HTTPS URLs. Private or temporary signed storage links are not accepted.",
        },
        { status: 400 }
      );
    }

    const { data: promise } = await supabase
      .from("political_promises")
      .select("id")
      .eq("id", promiseId)
      .eq("publication_status", "published")
      .single();

    if (!promise) {
      return NextResponse.json(
        { error: "Published promise not found." },
        { status: 404 }
      );
    }

    if (sourceId) {
      const { data: source } = await supabase
        .from("electoral_sources")
        .select("id")
        .eq("id", sourceId)
        .eq("verification_status", "verified")
        .single();

      if (!source) {
        return NextResponse.json(
          { error: "The selected source is not verified or does not exist." },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from("promise_progress_updates")
      .insert({
        promise_id: promiseId,
        progress_status: progressStatus,
        update_title: title,
        update_description: description,
        evidence_url: evidenceUrl,
        source_id: sourceId,
        update_date: updateDate,
        review_status: "pending",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Progress update submission error:", error);
      return NextResponse.json(
        { error: "Unable to submit this progress update." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error("Progress update API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
