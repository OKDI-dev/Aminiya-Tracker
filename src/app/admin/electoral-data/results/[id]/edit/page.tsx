import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ElectionResultForm from "@/components/admin/electoral-data/election-result-form";

export const instant = false;

export default async function EditElectionResultPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  await requireElectoralStaff();

  const { id } = await params;
  const supabase = await createClient();

  const { data: result } = await supabase
    .from("election_results")
    .select("id, election_id, electoral_area_id, candidate_id, party_id, votes_count, registered_voters, accredited_voters, result_type, source_id, publication_status, verification_notes")
    .eq("id", id)
    .maybeSingle();

  if (!result) notFound();

  const [
    { data: elections, error: electionsError },
    { data: candidates, error: candidatesError },
    { data: parties, error: partiesError },
    { data: areas, error: areasError },
    { data: sources, error: sourcesError },
  ] = await Promise.all([
    supabase
      .from("elections")
      .select("id, name, election_date")
      .eq("publication_status", "published")
      .order("election_date", { ascending: false }),
    supabase
      .from("candidates")
      .select("id, full_name")
      .eq("publication_status", "published")
      .order("full_name"),
    supabase
      .from("political_parties")
      .select("id, name, acronym")
      .eq("publication_status", "published")
      .order("name"),
    supabase
      .from("electoral_areas")
      .select("id, name, area_type, parent_id")
      .eq("publication_status", "published")
      .order("name"),
    supabase
      .from("electoral_sources")
      .select("id, title, publisher, verification_status")
      .order("title"),
  ]);

  const error =
    electionsError || candidatesError || partiesError || areasError || sourcesError;

  return (
    <main className="min-h-screen bg-paper p-5 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="mt-3 text-2xl font-bold text-ink">Edit Election Result</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Correct the figures or source for this result. Edits save as draft or verified, so a published result goes offline until it is published again.
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load the options required for this form: {error.message}
          </div>
        ) : (
          <ElectionResultForm
            initialResult={result}
            elections={elections ?? []}
            candidates={candidates ?? []}
            parties={parties ?? []}
            areas={areas ?? []}
            sources={sources ?? []}
          />
        )}
      </div>
    </main>
  );
}
