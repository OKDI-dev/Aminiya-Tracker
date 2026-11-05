import { notFound } from "next/navigation";
import { FileWarning } from "lucide-react";
import { requireElectoralStaff } from "@/lib/auth";
import { adminSupabase } from "@/lib/supabase/admin";
import IncidentReviewActions from "@/components/incident-review-actions";

export const instant = false;

function formatDate(value: string | null) {
  if (!value) return "Not provided";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

const categoryLabels: Record<string, string> = {
  vote_buying: "Vote buying",
  intimidation: "Voter intimidation",
  violence: "Electoral violence",
  ballot_issue: "Ballot-related issue",
  result_dispute: "Result dispute",
  accessibility: "Accessibility",
  logistics: "Electoral logistics",
  misinformation: "Misinformation",
  other: "Other",
};

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireElectoralStaff();

  const { id } = await params;
  const supabase = adminSupabase;

  const { data: incident, error } = await supabase
    .from("election_incidents")
    .select(
      "id, category, description, incident_time, status, public_summary, verification_notes, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Unable to load incident:", error.message);
    throw new Error("Unable to load this incident.");
  }

  if (!incident) notFound();

  const { data: reviews, error: reviewError } = await supabase
    .from("election_incident_reviews")
    .select("id, previous_status, new_status, action_notes, created_by, created_at")
    .eq("incident_id", id)
    .order("created_at", { ascending: false });

  if (reviewError) {
    console.error("Unable to load review history:", reviewError.message);
  }

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

  return (
    <main className="min-h-screen bg-[#f7f8f5]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-4 sm:px-8">
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#ff6600]">
              <FileWarning size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#171717]">
                Incident details
              </h1>
              <p className="text-xs text-gray-500">
                Aminiya Tracker · Review workspace
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-5 py-8 sm:px-8">
        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-[#ff6600]">
              {categoryLabels[incident.category] ?? incident.category}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-700">
              {incident.status.replaceAll("_", " ")}
            </span>
          </div>

          <h2 className="mt-5 text-lg font-semibold text-[#171717]">
            Original report
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
            {incident.description}
          </p>

          <div className="mt-6 grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500">Incident date</p>
              <p className="mt-1 text-sm font-medium text-[#171717]">
                {formatDate(incident.incident_time)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Submitted</p>
              <p className="mt-1 text-sm font-medium text-[#171717]">
                {formatDate(incident.created_at)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Last updated</p>
              <p className="mt-1 text-sm font-medium text-[#171717]">
                {formatDate(incident.updated_at)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Incident reference</p>
              <p className="mt-1 break-all text-sm font-medium text-[#171717]">
                {incident.id}
              </p>
            </div>
          </div>
        </section>

        {incident.verification_notes && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="font-semibold text-[#171717]">
              Internal verification notes
            </h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
              {incident.verification_notes}
            </p>
            <p className="mt-3 text-xs text-amber-800">
              Visible to authorised staff only.
            </p>
          </section>
        )}

        {incident.public_summary && (
          <section className="rounded-xl border border-green-200 bg-green-50 p-5">
            <h3 className="font-semibold text-[#171717]">Public summary</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
              {incident.public_summary}
            </p>
          </section>
        )}

        <IncidentReviewActions
          incidentId={incident.id}
          status={incident.status}
        />

        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-7">
          <h3 className="font-semibold text-[#171717]">Review history</h3>
          <p className="mt-1 text-sm text-gray-500">
            Recorded actions and status changes for this incident.
          </p>

          {(!reviews || reviews.length === 0) ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No review actions have been recorded yet.
            </p>
          ) : (
            <div className="mt-5 space-y-5">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="border-l-2 border-[#ff6600] pl-4"
                >
                  <p className="text-sm font-semibold capitalize text-[#171717]">
                    {review.previous_status.replaceAll("_", " ")}{" "}
                    <span className="text-gray-400">→</span>{" "}
                    {review.new_status.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {reviewerNames.get(review.created_by) ?? "Staff member"} ·{" "}
                    {formatDate(review.created_at)}
                  </p>
                  {review.action_notes && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                      {review.action_notes}
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
