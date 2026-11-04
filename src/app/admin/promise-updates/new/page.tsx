import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ProgressUpdateForm from "@/components/admin/progress-update-form";

export const instant = false;

export default async function NewProgressUpdatePage() {
  await connection();
  await requireElectoralStaff();

  const supabase = await createClient();

  const [promiseResult, sourceResult] = await Promise.all([
    supabase
      .from("political_promises")
      .select("id, title")
      .eq("publication_status", "published")
      .order("title"),
    supabase
      .from("electoral_sources")
      .select("id, title")
      .eq("verification_status", "verified")
      .order("title"),
  ]);

  if (promiseResult.error || sourceResult.error) {
    throw new Error("Unable to load promise update form data.");
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] p-5 sm:p-8">
      <ProgressUpdateForm
        promises={promiseResult.data ?? []}
        sources={sourceResult.data ?? []}
      />
    </main>
  );
}
