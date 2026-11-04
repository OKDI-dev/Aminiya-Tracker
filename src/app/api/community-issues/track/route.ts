import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { checkCommunityIssueRateLimit } from "@/lib/community-issue-rate-limit";

export async function POST(request: Request) {
  try {
    const rateLimit = await checkCommunityIssueRateLimit(
      request,
      "tracking",
      30
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.message },
        {
          status: rateLimit.status,
          headers:
            rateLimit.status === 429
              ? { "Retry-After": "3600" }
              : undefined,
        }
      );
    }

    const body = await request.json();

    const searchTerm =
      typeof body.searchTerm === "string"
        ? body.searchTerm.trim()
        : "";

    if (searchTerm.length < 5 || searchTerm.length > 150) {
      return NextResponse.json(
        { error: "Enter a valid reference code or report title." },
        { status: 400 }
      );
    }

    const isReferenceCode = /^AMI-\d{4}-[A-F0-9]{10}$/i.test(searchTerm);

    let query = adminSupabase
      .from("community_issues")
      .select(
        "reference_code, category, title, status, public_summary, resolution_summary, submitted_at, updated_at"
      );

    query = isReferenceCode
      ? query.eq("reference_code", searchTerm.toUpperCase())
      : query.eq("title", searchTerm);

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("Community issue tracking query failed:", error.message);

      return NextResponse.json(
        { error: "Tracking is temporarily unavailable. Please try again." },
        { status: 503 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "No report was found with that reference code and title." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, issue: data });
  } catch (error) {
    console.error("Community issue tracking error:", error);

    return NextResponse.json(
      { error: "Unable to process your tracking request." },
      { status: 400 }
    );
  }
}
