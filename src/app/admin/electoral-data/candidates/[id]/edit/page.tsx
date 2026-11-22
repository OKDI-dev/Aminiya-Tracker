import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import CandidateForm from "@/components/admin/electoral-data/candidate-form";

export const instant = false;

export default async function EditCandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  await requireElectoralStaff();

  const { id } = await params;
  const supabase = await createClient();

  const { data: candidate, error } = await supabase
    .from("candidates")
    .select("id, full_name, biography, photo_url, official_profile_url, publication_status")
    .eq("id", id)
    .single();

  if (error || !candidate) notFound();

  return (
    <main className="min-h-screen bg-paper p-5 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="mt-3 text-2xl font-bold text-ink">Edit Candidate</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Update this candidate profile. Its current publication status is retained unless changed.
          </p>
        </div>
        <CandidateForm initialCandidate={candidate} />
      </div>
    </main>
  );
}
