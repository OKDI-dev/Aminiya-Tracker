import Link from "next/link";
import {
  ArrowLeft,
  ClipboardList,
  Clock3,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

const statusStyles: Record<string, string> = {
  submitted: "bg-blue-50 text-blue-700",
  under_review: "bg-amber-50 text-amber-700",
  action_required: "bg-orange-50 text-orange-700",
  resolved: "bg-green-50 text-green-700",
  closed: "bg-gray-100 text-gray-700",
};

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

export default async function CommunityIssueQueuePage() {
  await requireElectoralStaff();
  const supabase = await createClient();

  const statuses = [
    "submitted",
    "under_review",
    "action_required",
    "resolved",
    "closed",
  ];

  const [issuesResult, ...countResults] = await Promise.all([
    supabase
      .from("community_issues")
      .select("id, reference_code, category, title, state, lga, status, submitted_at")
      .order("submitted_at", { ascending: false })
      .limit(100),
    ...statuses.map((status) =>
      supabase
        .from("community_issues")
        .select("id", { count: "exact", head: true })
        .eq("status", status)
    ),
  ]);

  const error =
    issuesResult.error || countResults.find((result) => result.error)?.error;

  const issues = issuesResult.data ?? [];

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
              Community Issues
            </h1>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#ff6600]">
            <ClipboardList size={22} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8">
        <section>
          <p className="text-sm font-medium text-[#ff6600]">
            COMMUNITY ISSUE MANAGEMENT
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#171717]">
            Review queue
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Review concerns raised by communities, record actions and publish
            factual progress updates.
          </p>
        </section>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Unable to load community issues. Check your database permissions
            and try again.
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <SummaryCard label="Submitted" value={countResults[0].count ?? 0} icon={<Clock3 size={20} />} color="text-blue-700" />
              <SummaryCard label="Under review" value={countResults[1].count ?? 0} icon={<ClipboardList size={20} />} color="text-amber-700" />
              <SummaryCard label="Action required" value={countResults[2].count ?? 0} icon={<AlertCircle size={20} />} color="text-orange-700" />
              <SummaryCard label="Resolved" value={countResults[3].count ?? 0} icon={<CheckCircle2 size={20} />} color="text-green-700" />
              <SummaryCard label="Closed" value={countResults[4].count ?? 0} icon={<CheckCircle2 size={20} />} color="text-gray-600" />
            </section>

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-[#171717]">
                    Community submissions
                  </h3>
                  <p className="text-xs text-gray-500">
                    Showing the latest 100 reports
                  </p>
                </div>
                <span className="text-sm text-gray-500">
                  {issues.length} reports loaded
                </span>
              </div>

              {issues.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <CheckCircle2 size={34} className="mx-auto text-green-600" />
                  <h4 className="mt-4 font-semibold text-[#171717]">
                    No community submissions
                  </h4>
                  <p className="mt-1 text-sm text-gray-500">
                    New community reports will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {issues.map((issue) => (
                    <Link
                      key={issue.id}
                      href={`/admin/community-issues/${issue.id}`}
                      className="block space-y-3 px-5 py-5 transition hover:bg-orange-50/40"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-[#171717]">
                          {issue.title}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[issue.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {issue.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {categories[issue.category] ?? issue.category} · {issue.lga}, {issue.state}
                      </p>
                      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
                        <span>Reference: {issue.reference_code}</span>
                        <span>Submitted: {formatDate(issue.submitted_at)}</span>
                      </div>
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
