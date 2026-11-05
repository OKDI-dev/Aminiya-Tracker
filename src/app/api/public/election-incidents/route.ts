import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const { data, error } = await adminSupabase
      .from("election_incidents")
      .select(`
        id,
        category,
        status,
        incident_time,
        public_summary,
        elections (
          id,
          name,
          publication_status
        ),
        electoral_areas (
          id,
          name,
          area_type,
          publication_status
        )
      `)
      .eq("status", "published")
      .not("public_summary", "is", null)
      .order("incident_time", { ascending: false });

    if (error) {
      console.error("Public election incidents query failed:", error);
      return NextResponse.json(
        { error: "Unable to load election incidents." },
        { status: 500 }
      );
    }

    const incidents = (data ?? [])
      .filter((incident) => {
        const election = Array.isArray(incident.elections)
          ? incident.elections[0]
          : incident.elections;

        const area = Array.isArray(incident.electoral_areas)
          ? incident.electoral_areas[0]
          : incident.electoral_areas;

        return (
          (!election || election.publication_status === "published") &&
          (!area || area.publication_status === "published")
        );
      })
      .map((incident) => {
        const election = Array.isArray(incident.elections)
          ? incident.elections[0]
          : incident.elections;

        const area = Array.isArray(incident.electoral_areas)
          ? incident.electoral_areas[0]
          : incident.electoral_areas;

        return {
          id: incident.id,
          category: incident.category,
          status: incident.status,
          incident_time: incident.incident_time,
          public_summary: incident.public_summary,
          elections: election
            ? { id: election.id, name: election.name }
            : null,
          electoral_areas: area
            ? { id: area.id, name: area.name, area_type: area.area_type }
            : null,
        };
      });

    return NextResponse.json(incidents, {
      headers: {
        "Cache-Control":
          "public, max-age=0, s-maxage=60, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Public election incidents API error:", error);

    return NextResponse.json(
      { error: "Unable to load election incidents." },
      { status: 500 }
    );
  }
}
