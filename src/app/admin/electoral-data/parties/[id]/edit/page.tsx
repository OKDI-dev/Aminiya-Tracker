import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PartyForm from "@/components/admin/electoral-data/party-form";

export const instant = false;

export default async function EditPartyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  await requireElectoralStaff();

  const { id } = await params;
  const supabase = await createClient();

  const { data: party, error } = await supabase
    .from("political_parties")
    .select("id, name, acronym, logo_url, official_website, publication_status")
    .eq("id", id)
    .single();

  if (error || !party) notFound();

  return (
    <main className="min-h-screen bg-paper p-5 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="mt-3 text-2xl font-bold text-ink">Edit Political Party</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Update this party profile. Its current publication status is retained unless changed.
          </p>
        </div>
        <PartyForm initialParty={party} />
      </div>
    </main>
  );
}
