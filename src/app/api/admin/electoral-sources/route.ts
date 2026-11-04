import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const sourceTypes = [
  "inec",
  "government",
  "observer",
  "media",
  "research",
  "community",
  "other",
];

const verificationStatuses = ["pending", "verified", "rejected"];

export async function POST(request: NextRequest) {
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
      .single();

    if (profileError || !profile || !["admin", "electoral_reviewer"].includes(profile.role)) {
      return NextResponse.json({ error: "You are not authorised to manage electoral sources." }, { status: 403 });
    }

    const body = await request.json();

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const publisher = typeof body.publisher === "string" ? body.publisher.trim() : "";
    const sourceUrl = typeof body.source_url === "string" ? body.source_url.trim() : "";
    const sourceType = body.source_type;
    const publicationDate = body.publication_date || null;
    const notes = typeof body.notes === "string" ? body.notes.trim() : null;
    const verificationStatus = body.verification_status || "pending";

    if (!title || !publisher) {
      return NextResponse.json({ error: "Source title and publisher are required." }, { status: 400 });
    }

    if (title.length > 300 || publisher.length > 200) {
      return NextResponse.json({ error: "Title or publisher is too long." }, { status: 400 });
    }

    if (!sourceTypes.includes(sourceType)) {
      return NextResponse.json({ error: "Invalid source type." }, { status: 400 });
    }

    if (!verificationStatuses.includes(verificationStatus)) {
      return NextResponse.json({ error: "Invalid verification status." }, { status: 400 });
    }

    if (sourceUrl) {
      try {
        const url = new URL(sourceUrl);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      } catch {
        return NextResponse.json({ error: "Enter a valid HTTP or HTTPS source URL." }, { status: 400 });
      }
    }

    if (publicationDate && !/^\d{4}-\d{2}-\d{2}$/.test(publicationDate)) {
      return NextResponse.json({ error: "Publication date must be a valid date." }, { status: 400 });
    }

    if (notes && notes.length > 5000) {
      return NextResponse.json({ error: "Notes cannot exceed 5,000 characters." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("electoral_sources")
      .insert({
        title,
        publisher,
        source_url: sourceUrl || null,
        source_type: sourceType,
        publication_date: publicationDate,
        verification_status: verificationStatus,
        notes,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Electoral source insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch (error) {
    console.error("Electoral source API error:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
