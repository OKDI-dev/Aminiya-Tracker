import type { AdminSupabase, Validation } from "@/lib/admin/api";

const allowedTypes = [
  "presidential",
  "governorship",
  "senate",
  "house_of_representatives",
  "state_assembly",
  "local_government",
  "other",
];

const allowedStatuses = ["draft", "published", "archived"];

/**
 * Input rules for elections, shared by create (POST) and edit (PATCH) so
 * the two can never drift apart.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function validateElection(supabase: AdminSupabase, body: any): Promise<Validation> {

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const electionType = typeof body.election_type === "string" ? body.election_type : "";
  const jurisdiction = typeof body.jurisdiction === "string" ? body.jurisdiction.trim() : "";
  const electionDate = body.election_date || null;
  const sourceUrl = typeof body.official_source_url === "string" && body.official_source_url.trim()
    ? body.official_source_url.trim()
    : null;
  const publicationStatus = typeof body.publication_status === "string"
    ? body.publication_status
    : "draft";

  if (!name || name.length > 200) {
    return { error: "Enter an election name of no more than 200 characters.", status: 400 };
  }

  if (!allowedTypes.includes(electionType)) {
    return { error: "Select a valid election type.", status: 400 };
  }

  if (!jurisdiction || jurisdiction.length > 150) {
    return { error: "Enter a jurisdiction of no more than 150 characters.", status: 400 };
  }

  if (electionDate && (typeof electionDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(electionDate) || Number.isNaN(Date.parse(`${electionDate}T00:00:00Z`)))) {
    return { error: "Enter a valid election date.", status: 400 };
  }

  if (sourceUrl) {
    try {
      const parsedUrl = new URL(sourceUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("Invalid protocol");
    } catch {
      return { error: "Enter a valid HTTP or HTTPS source URL.", status: 400 };
    }
  }

  if (!allowedStatuses.includes(publicationStatus)) {
    return { error: "Select a valid publication status.", status: 400 };
  }

  return {
    values: {
      name,
      election_type: electionType,
      election_date: electionDate,
      jurisdiction,
      official_source_url: sourceUrl,
      publication_status: publicationStatus,
    },
  };
}
