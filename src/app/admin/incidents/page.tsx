import { connection } from "next/server";
import Link from "next/link";
import {
  ArrowLeft,
  FileWarning,
  Clock3,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { requireElectoralStaff } from "@/lib/auth";
import { adminSupabase } from "@/lib/supabase/admin";

export const instant = false;

const statusStyles: Record<string, string> = {
  submitted: "bg-blue-50 text-blue-700",
  under_review: "bg-amber-50 text-amber-700",
  verified: "bg-green-50 text-green-700",
  dismissed: "bg-red-50 text-red-700",
  published: "bg-purple-50 text-purple-700",
};

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

function formatDate(value: string | null) {
  if (!value) return "Not provided";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export default async function IncidentQueuePage() {
  await connection();
  await requireElectoralStaff();

  const supabase = adminSupabase;

  const [incidentResult, submittedResult, reviewResult, verifiedResult] =
    await Promise.all([
      supabase
        .from("election_incidents")
        .select(
          "id, category, description, incident_time, status, created_at"
        )
        .in("status", ["submitted", "under_review", "verified"])
        .order("created_at", { ascending: false })
        .limit(100),

      supabase
        .from("election_incidents")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted"),

      supabase
        .from("election_incidents")
        .select("id", { count: "exact", head: true })
        .eq("status", "under_review"),

      supabase
        .from("election_incidents")
        .select("id", { count: "exact", head: true })
        .eq("status", "verified"),
    ]);

  const error =
    incidentResult.error ||
    submittedResult.error ||
    reviewResult.error ||
    verifiedResult.error;

  const incidents = incidentResult.data ?? [];

  return (
    <main className="min-h-screen bg-[#f7f8f5]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <Link
              href="/admin"
              className="mb-2 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#ff6600]"
            >
              <ArrowLeft size={16} />
              Back
            </Link>

            <h1 className="text-xl font-bold text-[#171717]">
              Election Incident Review
            </h1>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#ff6600]">
            <FileWarning size={22} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8">
        <section>
          <p className="text-sm font-medium text-[#ff6600]">
            INCIDENT MANAGEMENT
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#171717]">
            Review queue
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Review submitted election incident reports and monitor their
            verification progress.
          </p>
        </section>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Unable to load incident reports. Please refresh the page or check
            your database permissions.
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              <SummaryCard
                label="Submitted"
                value={submittedResult.count ?? 0}
                icon={<Clock3 size={20} />}
                color="text-blue-700"
              />
              <SummaryCard
                label="Under review"
                value={reviewResult.count ?? 0}
                icon={<FileWarning size={20} />}
                color="text-amber-700"
              />
              <SummaryCard
                label="Verified"
                value={verifiedResult.count ?? 0}
                icon={<ShieldCheck size={20} />}
                color="text-green-700"
              />
            </section>

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-[#171717]">
                    Recent incidents
                  </h3>
                  <p className="text-xs text-gray-500">
                    Showing up to 100 active reports
                  </p>
                </div>
                <span className="text-sm text-gray-500">
                  {incidents.length} reports loaded
                </span>
              </div>

              {incidents.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <CheckCircle2
                    size={34}
                    className="mx-auto text-green-600"
                  />
                  <h4 className="mt-4 font-semibold text-[#171717]">
                    No active reports
                  </h4>
                  <p className="mt-1 text-sm text-gray-500">
                    There are currently no incidents awaiting review.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {incidents.map((incident) => (
                    <Link
                      key={incident.id}
                      href={`/admin/incidents/${incident.id}`}
                      className="block space-y-3 px-5 py-5 transition hover:bg-orange-50/40"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-[#171717]">
                          {categoryLabels[incident.category] ??
                            incident.category}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                            statusStyles[incident.status] ??
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {statusLabel(incident.status)}
                        </span>
                      </div>

                      <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                        {incident.description}
                      </p>

                      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
                        <span>
                          Incident: {formatDate(incident.incident_time)}
                        </span>
                        <span>
                          Submitted: {formatDate(incident.created_at)}
                        </span>
                      </div>

                      <p className="break-all text-xs text-gray-400">
                        Reference: {incident.id}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#ff6600] hover:text-[#e85d00]"
        >
          <ArrowLeft size={16} />
          Back
        </Link>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className={`mb-3 ${color}`}>{icon}</div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#171717]">{value}</p>
    </div>
  );
}
