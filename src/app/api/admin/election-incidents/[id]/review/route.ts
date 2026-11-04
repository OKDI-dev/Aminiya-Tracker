import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

const transitions = [
  "under_review",
  "verified",
  "dismissed",
  "published",
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
        { error: "You are not authorised to review incidents." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id
      )
    ) {
      return NextResponse.json(
        { error: "Invalid incident reference." },
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

    if (!transitions.includes(status)) {
      return NextResponse.json(
        { error: "Invalid review action." },
        { status: 400 }
      );
    }

    if (notes.length > 5000 || publicSummary.length > 2000) {
      return NextResponse.json(
        { error: "Review notes or public summary are too long." },
        { status: 400 }
      );
    }

    if (
      ["verified", "dismissed"].includes(status) &&
      notes.length < 5
    ) {
      return NextResponse.json(
        { error: "Please provide review notes of at least 5 characters." },
        { status: 400 }
      );
    }

    if (status === "published" && publicSummary.length < 20) {
      return NextResponse.json(
        { error: "The public summary must be at least 20 characters." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
      "review_election_incident",
      {
        p_incident_id: id,
        p_new_status: status,
        p_notes: notes || null,
        p_public_summary: publicSummary || null,
      }
    );

    if (error) {
      console.error("Incident review failed:", error.message);

      return NextResponse.json(
        { error: error.message || "The review action could not be completed." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error("Incident review API error:", error);

    return NextResponse.json(
      { error: "Unable to process this review action." },
      { status: 400 }
    );
  }
}
