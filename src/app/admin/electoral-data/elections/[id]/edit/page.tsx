import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ElectionForm from "@/components/admin/electoral-data/election-form";

export const instant = false;

export default async function EditElectionPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  await requireElectoralStaff();

  const { id } = await params;
  const supabase = await createClient();
  const { data: election, error } = await supabase
    .from("elections")
    .select("id, name, election_type, election_date, jurisdiction, official_source_url, publication_status")
    .eq("id", id)
    .single();

  if (error || !election) notFound();

  return (
    <div className="min-h-screen bg-paper p-5 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="mt-3 text-2xl font-bold text-ink">Edit Election</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Update this election. Its publication status stays as it is unless you change it.
          </p>
        </div>
        <ElectionForm initialElection={election} />
      </div>
    </div>
  );
}
