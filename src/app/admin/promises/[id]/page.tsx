import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PromiseDetail from "@/components/admin/promise-detail";
import RecordActions from "@/components/admin/electoral-data/record-actions";

export const instant = false;

export default async function PromiseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  await requireElectoralStaff();

  const { id } = await params;
  const supabase = await createClient();

  const { data: record, error } = await supabase
    .from("political_promises")
    .select("id, candidacy_id, title, description, sector, source_url, promise_date, target_date, progress_status, publication_status")
    .eq("id", id)
    .single();

  if (error || !record) notFound();

  const { data: candidacy } = await supabase
    .from("candidacies")
    .select("candidate_id, election_id, party_id, office_title")
    .eq("id", record.candidacy_id)
    .single();

  let candidacyLabel = record.candidacy_id;

  if (candidacy) {
    const [candidateResult, electionResult, partyResult] = await Promise.all([
      supabase.from("candidates").select("full_name").eq("id", candidacy.candidate_id).maybeSingle(),
      supabase.from("elections").select("name").eq("id", candidacy.election_id).maybeSingle(),
      candidacy.party_id
        ? supabase.from("political_parties").select("name, acronym").eq("id", candidacy.party_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const candidateName = candidateResult.data?.full_name ?? "Candidate";
    const electionName = electionResult.data?.name ?? "Election";
    const partyName = partyResult.data?.acronym || partyResult.data?.name;

    candidacyLabel = `${candidateName} — ${candidacy.office_title} — ${electionName}${partyName ? ` (${partyName})` : ""}`;
  }

  return (
    <main className="min-h-screen bg-paper p-5 sm:p-8">
      {/* This page is the promise's edit form; only Delete is added here. */}
      <div className="mx-auto mb-6 flex max-w-4xl justify-end">
        <RecordActions
          endpoint={`/api/admin/promises/${record.id}`}
          label={record.title}
          blockedBy="Promises with progress updates cannot be deleted."
          redirectTo="/admin/promises"
        />
      </div>
      <PromiseDetail record={record} candidacyLabel={candidacyLabel} />
    </main>
  );
}
