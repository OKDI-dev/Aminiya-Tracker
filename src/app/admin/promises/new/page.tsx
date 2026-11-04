import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PromiseForm from "@/components/admin/promise-form";

export const instant = false;

export default async function NewPromisePage() {
  await connection();
  await requireElectoralStaff();

  const supabase = await createClient();

  const { data: candidacies, error } = await supabase
    .from("candidacies")
    .select("id, candidate_id, election_id, party_id, office_title")
    .eq("publication_status", "published")
    .order("office_title");

  if (error) {
    throw new Error("Unable to load published candidacies.");
  }

  const candidateIds = [...new Set((candidacies ?? []).map((item) => item.candidate_id))];
  const electionIds = [...new Set((candidacies ?? []).map((item) => item.election_id))];
  const partyIds = [...new Set((candidacies ?? []).map((item) => item.party_id).filter(Boolean))] as string[];

  const [candidateResult, electionResult, partyResult] = await Promise.all([
    candidateIds.length
      ? supabase.from("candidates").select("id, full_name").in("id", candidateIds).eq("publication_status", "published")
      : Promise.resolve({ data: [], error: null }),
    electionIds.length
      ? supabase.from("elections").select("id, name").in("id", electionIds).eq("publication_status", "published")
      : Promise.resolve({ data: [], error: null }),
    partyIds.length
      ? supabase.from("political_parties").select("id, name, acronym").in("id", partyIds).eq("publication_status", "published")
      : Promise.resolve({ data: [], error: null }),
  ]);

  const candidateMap = new Map((candidateResult.data ?? []).map((item) => [item.id, item.full_name]));
  const electionMap = new Map((electionResult.data ?? []).map((item) => [item.id, item.name]));
  const partyMap = new Map((partyResult.data ?? []).map((item) => [
    item.id,
    item.acronym || item.name,
  ]));

  const options = (candidacies ?? [])
    .filter((item) => candidateMap.has(item.candidate_id) && electionMap.has(item.election_id))
    .map((item) => {
      const candidate = candidateMap.get(item.candidate_id);
      const election = electionMap.get(item.election_id);
      const party = item.party_id ? partyMap.get(item.party_id) : null;

      return {
        id: item.id,
        label: `${candidate} — ${item.office_title} — ${election}${party ? ` (${party})` : ""}`,
      };
    });

  return (
    <main className="min-h-screen bg-[#f7f8f5] p-5 sm:p-8">
      <PromiseForm candidacies={options} />
    </main>
  );
}
