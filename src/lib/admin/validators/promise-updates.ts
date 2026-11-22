import type { AdminSupabase, Validation } from "@/lib/admin/api";
import { isPublicEvidenceUrl } from "@/lib/public-evidence-url";

const progressStatuses = [
  "not_started",
  "in_progress",
  "partially_fulfilled",
  "fulfilled",
  "stalled",
];

/**
 * Input rules for promise_progress_updates, shared by create (POST) and edit (PATCH) so
 * the two can never drift apart.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function validatePromiseUpdate(supabase: AdminSupabase, body: any): Promise<Validation> {

  const promiseId = String(body.promise_id ?? "").trim();
  const title = String(body.update_title ?? "").trim();
  const description = String(body.update_description ?? "").trim();
  const progressStatus = String(body.progress_status ?? "").trim();
  const evidenceUrl = String(body.evidence_url ?? "").trim() || null;
  const sourceId = String(body.source_id ?? "").trim() || null;
  const updateDate = String(body.update_date ?? "").trim();

  if (!promiseId || !title || !description || !progressStatus || !updateDate) {
    return { error: "Complete all required fields.", status: 400 };
  }

  if (title.length < 5 || title.length > 200) {
    return { error: "Update title must be between 5 and 200 characters.", status: 400 };
  }

  if (description.length < 20 || description.length > 10000) {
    return { error: "Description must be between 20 and 10,000 characters.", status: 400 };
  }

  if (!progressStatuses.includes(progressStatus)) {
    return { error: "Select a valid progress status.", status: 400 };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(updateDate)) {
    return { error: "Enter a valid update date.", status: 400 };
  }

  if (evidenceUrl && !isPublicEvidenceUrl(evidenceUrl)) {
    return { error: "Evidence links must be public HTTPS URLs. Private or temporary signed storage links are not accepted.", status: 400 };
  }

  const { data: promise } = await supabase
    .from("political_promises")
    .select("id")
    .eq("id", promiseId)
    .eq("publication_status", "published")
    .single();

  if (!promise) {
    return { error: "Published promise not found.", status: 404 };
  }

  if (sourceId) {
    const { data: source } = await supabase
      .from("electoral_sources")
      .select("id")
      .eq("id", sourceId)
      .eq("verification_status", "verified")
      .single();

    if (!source) {
      return { error: "The selected source is not verified or does not exist.", status: 400 };
    }
  }

  return {
    values: {
      promise_id: promiseId,
      progress_status: progressStatus,
      update_title: title,
      update_description: description,
      evidence_url: evidenceUrl,
      source_id: sourceId,
      update_date: updateDate,
    },
  };
}
