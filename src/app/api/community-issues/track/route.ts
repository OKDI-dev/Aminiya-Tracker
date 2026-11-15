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

    // Titles match case-insensitively but exactly: escape LIKE wildcards.
    const escapedTitle = searchTerm.replace(/[\\%_]/g, (char: string) => `\\${char}`);

    query = isReferenceCode
      ? query.eq("reference_code", searchTerm.toUpperCase())
      : query.ilike("title", escapedTitle);

    // Fetch up to two rows so a shared title is reported as ambiguous
    // rather than failing like an outage.
    const { data, error } = await query
      .order("submitted_at", { ascending: false })
      .limit(2);

    if (error) {
      console.error("Community issue tracking query failed:", error.message);

      return NextResponse.json(
        { error: "Tracking is temporarily unavailable. Please try again." },
        { status: 503 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          error: isReferenceCode
            ? "No report was found with that reference code. Check it and try again."
            : "No report was found with that title. Try your reference code instead.",
        },
        { status: 404 }
      );
    }

    if (data.length > 1) {
      return NextResponse.json(
        {
          error:
            "More than one report has this title. Please use your reference code instead.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, issue: data[0] });
  } catch (error) {
    console.error("Community issue tracking error:", error);

    return NextResponse.json(
      { error: "Unable to process your tracking request." },
      { status: 400 }
    );
  }
}
