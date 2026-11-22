import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ProgressUpdateForm from "@/components/admin/progress-update-form";

export const instant = false;

export default async function EditProgressUpdatePage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  await requireElectoralStaff();

  const { id } = await params;
  const supabase = await createClient();

  const { data: update } = await supabase
    .from("promise_progress_updates")
    .select("id, promise_id, update_title, update_description, progress_status, evidence_url, source_id, update_date")
    .eq("id", id)
    .maybeSingle();

  if (!update) notFound();

  const [promiseResult, sourceResult] = await Promise.all([
    // The update stays on its promise, so only that promise is offered.
    supabase.from("political_promises").select("id, title").eq("id", update.promise_id),
    supabase.from("electoral_sources").select("id, title").eq("verification_status", "verified").order("title"),
  ]);

  if (promiseResult.error || sourceResult.error) {
    throw new Error("Unable to load promise update form data.");
  }

  return (
    <main className="min-h-screen bg-paper p-5 sm:p-8">
      <ProgressUpdateForm
        promises={promiseResult.data ?? []}
        sources={sourceResult.data ?? []}
        initialUpdate={update}
      />
    </main>
  );
}
