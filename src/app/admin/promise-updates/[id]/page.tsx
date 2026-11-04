import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import PromiseUpdateReview from "@/components/admin/promise-update-review";

export const instant = false;

const BUCKET = "promise-progress-evidence";

export default async function PromiseUpdateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  await requireElectoralStaff();

  const { id } = await params;
  const supabase = await createClient();

  const { data: update, error } = await supabase
    .from("promise_progress_updates")
    .select("id, promise_id, update_title, update_description, progress_status, update_date, evidence_url, source_id, review_status")
    .eq("id", id)
    .single();

  if (error || !update) notFound();

  const [promiseResult, sourceResult, evidenceResult] = await Promise.all([
    supabase
      .from("political_promises")
      .select("id, title")
      .eq("id", update.promise_id)
      .maybeSingle(),

    update.source_id
      ? supabase
          .from("electoral_sources")
          .select("id, title")
          .eq("id", update.source_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),

    adminSupabase
      .from("promise_progress_evidence")
      .select("id, original_filename, mime_type, file_size, storage_path, publicly_visible, published_at, created_at")
      .eq("progress_update_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (evidenceResult.error) {
    console.error("Could not load promise evidence:", evidenceResult.error);
  }

  const evidence = await Promise.all(
    (evidenceResult.data || []).map(async (item) => {
      const { data: signed } = await adminSupabase.storage
        .from(BUCKET)
        .createSignedUrl(item.storage_path, 300);

      return {
        id: item.id,
        originalFilename: item.original_filename,
        mimeType: item.mime_type,
        fileSize: Number(item.file_size),
        publiclyVisible: item.publicly_visible,
        publishedAt: item.published_at,
        createdAt: item.created_at,
        signedUrl: signed?.signedUrl ?? null,
      };
    })
  );

  return (
    <main className="min-h-screen bg-[#f7f8f5] p-5 sm:p-8">
      <PromiseUpdateReview
        updateId={update.id}
        promiseTitle={promiseResult.data?.title ?? "Political promise"}
        updateTitle={update.update_title}
        updateDescription={update.update_description}
        progressStatus={update.progress_status}
        updateDate={update.update_date}
        evidenceUrl={update.evidence_url}
        sourceTitle={sourceResult.data?.title ?? null}
        reviewStatus={update.review_status}
        evidence={evidence}
      />
    </main>
  );
}
