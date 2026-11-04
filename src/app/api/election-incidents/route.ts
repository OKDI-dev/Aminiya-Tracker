import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { adminSupabase } from "@/lib/supabase/admin";


const allowedCategories = [
  "vote_buying",
  "intimidation",
  "violence",
  "ballot_issue",
  "result_dispute",
  "accessibility",
  "logistics",
  "misinformation",
  "other",
];

export async function GET() {
  try {
    const [electionsResult, areasResult] = await Promise.all([
      adminSupabase
        .from("elections")
        .select("id, name, election_date")
        .eq("publication_status", "published")
        .order("election_date", { ascending: false }),
      adminSupabase
        .from("electoral_areas")
        .select("id, name, parent_id, area_type")
        .eq("publication_status", "published")
        .in("area_type", ["state", "lga", "ward"])
        .order("name"),
    ]);

    if (electionsResult.error || areasResult.error) {
      console.error(
        "Incident form data error:",
        electionsResult.error?.message,
        areasResult.error?.message
      );

      return NextResponse.json(
        { error: "Unable to load election and location information." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      elections: electionsResult.data ?? [],
      areas: areasResult.data ?? [],
    });
  } catch (error) {
    console.error("Incident form GET error:", error);

    return NextResponse.json(
      { error: "Unable to load the incident form." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Honeypot: silently accept automated submissions.
    if (body.website) {
      return NextResponse.json({ success: true });
    }

    const category =
      typeof body.category === "string" ? body.category.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const incidentTime = body.incident_time || null;
    const electionId =
      typeof body.election_id === "string" ? body.election_id : "";
    const stateId =
      typeof body.state_id === "string" ? body.state_id : "";
    const lgaId =
      typeof body.lga_id === "string" ? body.lga_id : "";
    const wardId =
      typeof body.ward_id === "string" && body.ward_id
        ? body.ward_id
        : null;
    const pollingUnit =
      typeof body.polling_unit === "string"
        ? body.polling_unit.trim()
        : "";

    if (!allowedCategories.includes(category)) {
      return NextResponse.json(
        { error: "Please select a valid incident category." },
        { status: 400 }
      );
    }

    if (description.length < 20 || description.length > 5000) {
      return NextResponse.json(
        { error: "Description must be between 20 and 5,000 characters." },
        { status: 400 }
      );
    }

    if (!electionId || !stateId || !lgaId) {
      return NextResponse.json(
        { error: "Please select an election, state and LGA." },
        { status: 400 }
      );
    }

    if (pollingUnit.length > 150) {
      return NextResponse.json(
        { error: "Polling Unit must not exceed 150 characters." },
        { status: 400 }
      );
    }

    if (
      incidentTime &&
      (typeof incidentTime !== "string" ||
        Number.isNaN(Date.parse(incidentTime)))
    ) {
      return NextResponse.json(
        { error: "Please provide a valid incident date." },
        { status: 400 }
      );
    }

    // Confirm that the election is published.
    const { data: election, error: electionError } = await adminSupabase
      .from("elections")
      .select("id")
      .eq("id", electionId)
      .eq("publication_status", "published")
      .maybeSingle();

    if (electionError || !election) {
      return NextResponse.json(
        { error: "Please select a valid published election." },
        { status: 400 }
      );
    }

    // Confirm that the selected state is published.
    const { data: state, error: stateError } = await adminSupabase
      .from("electoral_areas")
      .select("id, name")
      .eq("id", stateId)
      .eq("area_type", "state")
      .eq("publication_status", "published")
      .is("parent_id", null)
      .maybeSingle();

    if (stateError || !state) {
      return NextResponse.json(
        { error: "Please select a valid published state." },
        { status: 400 }
      );
    }

    // Confirm that the LGA belongs to the selected state.
    const { data: lga, error: lgaError } = await adminSupabase
      .from("electoral_areas")
      .select("id")
      .eq("id", lgaId)
      .eq("parent_id", stateId)
      .eq("area_type", "lga")
      .eq("publication_status", "published")
      .maybeSingle();

    if (lgaError || !lga) {
      return NextResponse.json(
        { error: "Please select a valid LGA for the selected state." },
        { status: 400 }
      );
    }

    // If supplied, confirm that the ward belongs to the selected LGA.
    if (wardId) {
      const { data: ward, error: wardError } = await adminSupabase
        .from("electoral_areas")
        .select("id")
        .eq("id", wardId)
        .eq("parent_id", lgaId)
        .eq("area_type", "ward")
        .eq("publication_status", "published")
        .maybeSingle();

      if (wardError || !ward) {
        return NextResponse.json(
          { error: "Please select a valid ward for the selected LGA." },
          { status: 400 }
        );
      }
    }

    const rateLimitSecret = process.env.INCIDENT_RATE_LIMIT_SECRET;

    if (!rateLimitSecret) {
      console.error("Incident rate-limit secret is missing.");

      return NextResponse.json(
        { error: "Submission service is not configured." },
        { status: 500 }
      );
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp?.trim();

    if (!ipAddress) {
      return NextResponse.json(
        { error: "Unable to verify your connection. Please try again." },
        { status: 503 }
      );
    }

    const keyHash = createHmac("sha256", rateLimitSecret)
      .update(ipAddress)
      .digest("hex");

    const { data: allowed, error: limitError } = await adminSupabase.rpc(
      "consume_incident_submission_limit",
      {
        p_key_hash: keyHash,
        p_limit: 5,
      }
    );

    if (limitError) {
      console.error("Rate-limit check failed:", limitError.message);

      return NextResponse.json(
        { error: "Submission service is temporarily unavailable." },
        { status: 503 }
      );
    }

    if (allowed !== true) {
      return NextResponse.json(
        {
          error:
            "You have reached the submission limit. Please try again in an hour.",
        },
        {
          status: 429,
          headers: { "Retry-After": "3600" },
        }
      );
    }

    const { error: insertError } = await adminSupabase
      .from("election_incidents")
      .insert({
        election_id: electionId,
        electoral_area_id: wardId || lgaId,
        category,
        description,
        incident_time: incidentTime,
        polling_unit: pollingUnit || null,
        status: "submitted",
        reported_by: null,
      });

    if (insertError) {
      console.error("Incident submission failed:", insertError.message);

      return NextResponse.json(
        { error: "Your report could not be submitted. Please try again." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Your incident report has been submitted for review.",
    });
  } catch (error) {
    console.error("Incident API error:", error);

    return NextResponse.json(
      { error: "Invalid submission. Please check your information." },
      { status: 400 }
    );
  }
}
