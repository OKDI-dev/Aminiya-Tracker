import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ElectoralSourceForm from "@/components/admin/electoral-data/electoral-source-form";

export const instant = false;

export default async function EditElectoralSourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  await requireElectoralStaff();

  const { id } = await params;
  const supabase = await createClient();

  const { data: source, error } = await supabase
    .from("electoral_sources")
    .select("id, title, publisher, source_url, source_type, publication_date, notes, verification_status")
    .eq("id", id)
    .single();

  if (error || !source) notFound();

  return (
    <main className="min-h-screen bg-[#f7f8f5] p-5 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="mt-3 text-2xl font-bold text-[#171717]">
            Edit Electoral Source
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Update source details. Verification status is managed separately.
          </p>
        </div>

        <ElectoralSourceForm source={source} />
      </div>
    </main>
  );
}
