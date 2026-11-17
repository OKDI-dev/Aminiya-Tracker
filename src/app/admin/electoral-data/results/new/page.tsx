import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ElectionResultForm from "@/components/admin/electoral-data/election-result-form";

export const instant = false;

export default async function NewElectionResultPage() {
  await connection();
  await requireElectoralStaff();

  const supabase = await createClient();

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
    <main className="min-h-screen bg-[#f7f8f5] p-5 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="mt-3 text-2xl font-bold text-[#171717]">Add Election Result</h1>
          <p className="mt-1 text-sm text-gray-600">
            Enter the result figures and identify their supporting source.
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load the options required for this form: {error.message}
          </div>
        ) : (
          <ElectionResultForm
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
