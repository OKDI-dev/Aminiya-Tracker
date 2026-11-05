import { NextResponse } from "next/server";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PUBLIC_SWR_HEADERS = {
  // Browsers/CDNs serve the cached copy instantly and refresh it in the background.
  "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=600",
};

/** Lightweight index of published records for the ⌘K command menu. */
export async function GET() {
  await connection();

  try {
    const supabase = await createClient();

    const [elections, promises] = await Promise.all([
      supabase
        .from("elections")
        .select("id, name, jurisdiction, election_date")
        .eq("publication_status", "published")
        .order("election_date", { ascending: false, nullsFirst: false })
        .limit(50),
      supabase
        .from("political_promises")
        .select("id, title, sector")
        .eq("publication_status", "published")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (elections.error) throw elections.error;
    if (promises.error) throw promises.error;

    return NextResponse.json(
      { elections: elections.data ?? [], promises: promises.data ?? [] },
      { headers: PUBLIC_SWR_HEADERS }
    );
  } catch (error) {
    console.error("Public search index error:", error);
    return NextResponse.json(
      { error: "Search is unavailable right now." },
      { status: 500 }
    );
  }
}
