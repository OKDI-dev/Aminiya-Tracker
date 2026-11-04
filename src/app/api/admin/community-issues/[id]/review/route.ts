import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

const allowedStatuses = [
  "under_review",
  "action_required",
  "resolved",
  "closed",
];

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const staff = await getCurrentProfile();

    if (
      !staff ||
      !["admin", "electoral_reviewer"].includes(staff.profile.role)
    ) {
      return NextResponse.json(
        { error: "You are not authorised to review community issues." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ) {
      return NextResponse.json(
        { error: "Invalid community issue reference." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const status =
      typeof body.status === "string" ? body.status.trim() : "";
    const notes =
      typeof body.notes === "string" ? body.notes.trim() : "";
    const publicSummary =
      typeof body.publicSummary === "string"
        ? body.publicSummary.trim()
        : "";
    const resolutionSummary =
      typeof body.resolutionSummary === "string"
        ? body.resolutionSummary.trim()
        : "";

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid review action." },
        { status: 400 }
      );
    }

    if (notes.length < 5 || notes.length > 5000) {
      return NextResponse.json(
        { error: "Internal review notes must be between 5 and 5000 characters." },
        { status: 400 }
      );
    }

    if (publicSummary.length > 2000 || resolutionSummary.length > 2000) {
      return NextResponse.json(
        { error: "Public summaries cannot exceed 2000 characters." },
        { status: 400 }
      );
    }

    if (status === "resolved" && resolutionSummary.length < 20) {
      return NextResponse.json(
        { error: "A resolution summary of at least 20 characters is required." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
      "review_community_issue",
      {
        p_issue_id: id,
        p_new_status: status,
        p_action_notes: notes,
        p_public_summary: publicSummary || null,
        p_resolution_summary: resolutionSummary || null,
      }
    );

    if (error) {
      console.error("Community issue review failed:", error.message);

      return NextResponse.json(
        { error: error.message || "The review action could not be completed." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error("Community issue review API error:", error);

    return NextResponse.json(
      { error: "Unable to process this review action." },
      { status: 400 }
    );
  }
}
