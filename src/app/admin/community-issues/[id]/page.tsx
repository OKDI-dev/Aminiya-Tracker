import { notFound } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import CommunityIssueReviewActions from "@/components/community-issues/community-issue-review-actions";
import { OptimisticStatusBadge } from "@/components/admin/optimistic-status";
import {
  communityIssueStatusKey,
  communityIssueStatusStyles,
} from "@/lib/review-status-keys";

export const instant = false;

const categories: Record<string, string> = {
  education: "Education",
  healthcare: "Healthcare",
  water_sanitation: "Water and sanitation",
  roads_transport: "Roads and transport",
  electricity: "Electricity",
  security: "Security",
  environment: "Environment",
  public_services: "Public services",
  youth_development: "Youth development",
  other: "Other",
};

function formatDate(value: string | null) {
  if (!value) return "Not provided";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function CommunityIssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireElectoralStaff();

  const { id } = await params;
  const supabase = await createClient();

  const { data: issue, error } = await supabase
    .from("community_issues")
    .select(
      "id, reference_code, category, title, description, state, lga, ward, community, location_description, status, public_summary, resolution_summary, submitted_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Unable to load community issue:", error.message);
    throw new Error("Unable to load this community issue.");
  }

  if (!issue) notFound();

  // The reporter's name is staff-only. Read it with the service client (staff
  // access was checked above) so it doesn't depend on column grants for
  // migration 023's new column.
  const { data: reporter, error: reporterError } = await adminSupabase
    .from("community_issues")
    .select("reporter_name")
    .eq("id", id)
    .maybeSingle();

  if (reporterError) {
    console.error("Unable to load reporter name:", reporterError.message);
  }

  const reporterName =
    typeof reporter?.reporter_name === "string" && reporter.reporter_name.trim()
      ? reporter.reporter_name.trim()
      : null;

  const { data: reviews, error: reviewError } = await supabase
    .from("community_issue_reviews")
    .select("id, previous_status, new_status, action_notes, public_summary, created_by, created_at")
    .eq("issue_id", id)
    .order("created_at", { ascending: false });

  if (reviewError) {
    console.error("Unable to load community issue history:", reviewError.message);
  }

  // Evidence is private. Only authorised electoral staff reach this point.
  const { data: evidenceRows, error: evidenceError } = await adminSupabase
    .from("community_issue_evidence")
    .select("id, original_filename, mime_type, file_size, uploaded_at, storage_path")
    .eq("issue_id", id)
    .order("uploaded_at", { ascending: false });

  if (evidenceError) {
    console.error("Unable to load community issue evidence:", evidenceError.message);
  }

  const evidence = await Promise.all(
    (evidenceRows ?? []).map(async (item) => {
      const { data, error: signedUrlError } = await adminSupabase.storage
        .from("community-issue-evidence")
        .createSignedUrl(item.storage_path, 120);

      if (signedUrlError) {
        console.error("Unable to create evidence download link:", signedUrlError.message);
      }

      return {
        ...item,
        signedUrl: data?.signedUrl ?? null,
      };
    })
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const reviewerIds = [
    ...new Set((reviews ?? []).map((review) => review.created_by)),
  ];

  const { data: profiles } = reviewerIds.length
    ? await supabase
        .from("app_profiles")
        .select("user_id, display_name")
        .in("user_id", reviewerIds)
    : { data: [] };

  const reviewerNames = new Map(
    (profiles ?? []).map((profile) => [
      profile.user_id,
      profile.display_name || "Staff member",
    ])
  );

  const location = [
    issue.community,
    issue.ward,
    issue.lga,
    issue.state,
  ].filter(Boolean).join(", ");

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-line-soft bg-paper-raised">
        <div className="mx-auto max-w-5xl px-5 py-4 sm:px-8">

          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tint text-ink">
              <ClipboardList size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-ink">
                Community issue details
              </h1>
              <p className="text-xs text-ink-subtle">
                Aminiya Tracker · Review workspace
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-5 py-8 sm:px-8">
        <section className="rounded-xl border border-line-soft bg-paper-raised p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-ink">
              {categories[issue.category] ?? issue.category}
            </span>
            <OptimisticStatusBadge
              statusKey={communityIssueStatusKey(issue.id)}
              status={issue.status}
              styles={communityIssueStatusStyles}
            />
          </div>

          <h2 className="mt-5 text-xl font-bold text-ink">
            {issue.title}
          </h2>

          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-ink-muted">
            {issue.description}
          </p>

          <div className="mt-6 grid gap-4 border-t border-line-soft pt-5 sm:grid-cols-2">
            <div>
              <p className="text-xs text-ink-subtle">Reference</p>
              <p className="mt-1 break-all text-sm font-medium text-ink">
                {issue.reference_code}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-subtle">Submitted</p>
              <p className="mt-1 text-sm font-medium text-ink">
                {formatDate(issue.submitted_at)}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-subtle">Community / location</p>
              <p className="mt-1 text-sm font-medium text-ink">
                {location || "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-subtle">Reported by (staff only)</p>
              <p className="mt-1 text-sm font-medium text-ink">
                {reporterError ? (
                  <span className="text-red-600">Couldn&apos;t load</span>
                ) : reporterName ? (
                  reporterName
                ) : (
                  <span className="text-ink-subtle">Anonymous</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-subtle">Last updated</p>
              <p className="mt-1 text-sm font-medium text-ink">
                {formatDate(issue.updated_at)}
              </p>
            </div>
            {issue.location_description && (
              <div className="sm:col-span-2">
                <p className="text-xs text-ink-subtle">Additional location details</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
                  {issue.location_description}
                </p>
              </div>
            )}
          </div>
        </section>

        {issue.public_summary && (
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <h3 className="font-semibold text-ink">Current public update</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-muted">
              {issue.public_summary}
            </p>
          </section>
        )}

        {issue.resolution_summary && (
          <section className="rounded-xl border border-green-200 bg-green-50 p-5">
            <h3 className="font-semibold text-ink">Resolution summary</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-muted">
              {issue.resolution_summary}
            </p>
          </section>
        )}

        <CommunityIssueReviewActions
          issueId={issue.id}
          status={issue.status}
        />

        <section className="rounded-xl border border-line-soft bg-paper-raised p-5 sm:p-7">
          <h3 className="font-semibold text-ink">Supporting evidence</h3>
          <p className="mt-1 text-sm text-ink-subtle">
            Private files submitted with this community issue. Download links
            expire after two minutes.
          </p>

          {evidenceError ? (
            <p className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              Evidence files could not be loaded. Please refresh the page and try again.
            </p>
          ) : evidence.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-subtle">
              No supporting evidence has been uploaded for this issue.
            </p>
          ) : (
            <ul className="mt-5 divide-y divide-line-soft">
              {evidence.map((file) => (
                <li
                  key={file.id}
                  className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-lg bg-tint p-2 text-ink">
                      <ClipboardList size={19} />
                    </div>
                    <div className="min-w-0">
                      <p className="break-all text-sm font-medium text-ink">
                        {file.original_filename}
                      </p>
                      <p className="mt-1 text-xs text-ink-subtle">
                        {file.mime_type} · {formatFileSize(file.file_size)} ·{" "}
                        {formatDate(file.uploaded_at)}
                      </p>
                    </div>
                  </div>

                  {file.signedUrl ? (
                    <a
                      href={file.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-line-soft px-4 py-2 text-sm font-semibold text-ink hover:border-signal hover:text-ink"
                    >
                      Download file
                    </a>
                  ) : (
                    <span className="text-xs text-red-600">
                      Download link unavailable
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-line-soft bg-paper-raised p-5 sm:p-7">
          <h3 className="font-semibold text-ink">Review history</h3>
          <p className="mt-1 text-sm text-ink-subtle">
            Recorded status changes and staff actions for this issue.
          </p>

          {!reviews || reviews.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-subtle">
              No review actions have been recorded yet.
            </p>
          ) : (
            <div className="mt-5 space-y-5">
              {reviews.map((review) => (
                <div key={review.id} className="border-l-2 border-signal pl-4">
                  <p className="text-sm font-semibold capitalize text-ink">
                    {review.previous_status?.replaceAll("_", " ") ?? "Initial"}{" "}
                    <span className="text-ink-subtle">→</span>{" "}
                    {review.new_status.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-xs text-ink-subtle">
                    {reviewerNames.get(review.created_by) ?? "Staff member"} ·{" "}
                    {formatDate(review.created_at)}
                  </p>
                  {review.action_notes && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-muted">
                      {review.action_notes}
                    </p>
                  )}
                  {review.public_summary && (
                    <p className="mt-2 rounded-lg bg-blue-50 p-3 text-sm leading-6 text-ink-muted">
                      Public update: {review.public_summary}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
