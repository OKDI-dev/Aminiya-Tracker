import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import CandidacyForm from "@/components/admin/electoral-data/candidacy-form";

export const instant = false;

export default async function EditCandidacyPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  await requireElectoralStaff();

  const { id } = await params;
  const supabase = await createClient();

  const { data: candidacy } = await supabase
    .from("candidacies")
    .select("id, election_id, candidate_id, party_id, electoral_area_id, office_title, ballot_number, manifesto_url, publication_status")
    .eq("id", id)
    .maybeSingle();

  if (!candidacy) notFound();

  const [
    { data: elections, error: electionsError },
    { data: candidates, error: candidatesError },
    { data: parties, error: partiesError },
    { data: areas, error: areasError },
  ] = await Promise.all([
    supabase.from("elections").select("id, name, election_type").order("election_date", { ascending: false }),
    supabase.from("candidates").select("id, full_name").order("full_name"),
    supabase.from("political_parties").select("id, name").order("name"),
    supabase.from("electoral_areas").select("id, name, area_type, parent_id, publication_status").order("name"),
  ]);

  const error = electionsError || candidatesError || partiesError || areasError;

  return (
    <main className="min-h-screen bg-paper p-5 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="mt-3 text-2xl font-bold text-ink">Edit Candidacy</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Update the election, office, area or party for this candidacy. Its publication status stays as it is unless you change it.
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load the options required for this form: {error.message}
          </div>
        ) : (
          <CandidacyForm
            initialCandidacy={candidacy}
            elections={(elections ?? []).map((item) => ({ id: item.id, name: item.name, election_type: item.election_type }))}
            candidates={(candidates ?? []).map((item) => ({ id: item.id, name: item.full_name }))}
            parties={(parties ?? []).map((item) => ({ id: item.id, name: item.name }))}
            areas={(areas ?? []).map((item) => ({ id: item.id, name: item.name, area_type: item.area_type, parent_id: item.parent_id, publication_status: item.publication_status }))}
          />
        )}
      </div>
    </main>
  );
}
