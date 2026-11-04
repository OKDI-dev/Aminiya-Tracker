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

async function authorisedClient() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase,
      response: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error } = await supabase
    .from("app_profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (
    error ||
    !profile ||
    !["admin", "electoral_reviewer"].includes(profile.role)
  ) {
    return {
      supabase,
      response: NextResponse.json(
        { error: "You are not authorised to manage electoral sources." },
        { status: 403 }
      ),
    };
  }

  return { supabase, response: null };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, response } = await authorisedClient();
    if (response) return response;

    const { id } = await params;
    const body = await request.json();

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const publisher =
      typeof body.publisher === "string" ? body.publisher.trim() : "";
    const sourceUrl =
      typeof body.source_url === "string" ? body.source_url.trim() : "";
    const sourceType = body.source_type;
    const publicationDate = body.publication_date || null;
    const notes = typeof body.notes === "string" ? body.notes.trim() : null;

    if (!title || !publisher) {
      return NextResponse.json(
        { error: "Source title and publisher are required." },
        { status: 400 }
      );
    }

    if (title.length > 300 || publisher.length > 200) {
      return NextResponse.json(
        { error: "Title or publisher is too long." },
        { status: 400 }
      );
    }

    if (!sourceTypes.includes(sourceType)) {
      return NextResponse.json(
        { error: "Invalid source type." },
        { status: 400 }
      );
    }

    if (sourceUrl) {
      try {
        const url = new URL(sourceUrl);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      } catch {
        return NextResponse.json(
          { error: "Enter a valid HTTP or HTTPS source URL." },
          { status: 400 }
        );
      }
    }

    if (
      publicationDate &&
      (typeof publicationDate !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(publicationDate) ||
        Number.isNaN(Date.parse(`${publicationDate}T00:00:00Z`)))
    ) {
      return NextResponse.json(
        { error: "Publication date must be a valid date." },
        { status: 400 }
      );
    }

    if (notes && notes.length > 5000) {
      return NextResponse.json(
        { error: "Notes cannot exceed 5,000 characters." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("electoral_sources")
      .update({
        title,
        publisher,
        source_url: sourceUrl || null,
        source_type: sourceType,
        publication_date: publicationDate,
        notes,
      })
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Electoral source update error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Electoral source not found or inaccessible." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error("Electoral source update API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, response } = await authorisedClient();
    if (response) return response;

    const { id } = await params;

    const { data: source, error: sourceError } = await supabase
      .from("electoral_sources")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (sourceError) {
      return NextResponse.json(
        { error: sourceError.message },
        { status: 400 }
      );
    }

    if (!source) {
      return NextResponse.json(
        { error: "Electoral source not found." },
        { status: 404 }
      );
    }

    const { count, error: referenceError } = await supabase
      .from("election_results")
      .select("id", { count: "exact", head: true })
      .eq("source_id", id);

    if (referenceError) {
      console.error("Source reference check error:", referenceError);
      return NextResponse.json(
        { error: "Could not check whether this source is in use." },
        { status: 400 }
      );
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `This source is linked to ${count} election result record(s). It cannot be deleted.`,
        },
        { status: 409 }
      );
    }

    const { error: deleteError } = await supabase
      .from("electoral_sources")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Electoral source deletion error:", deleteError);
      return NextResponse.json(
        { error: "The source could not be deleted. It may be referenced by another record." },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Electoral source deletion API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
