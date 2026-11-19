import Link from "next/link";
import {
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
  action_required: "bg-tint text-ink",
  resolved: "bg-green-50 text-green-700",
  closed: "bg-tint text-ink-muted",
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
    <div className="rounded-xl border border-line-soft bg-paper-raised p-5">
      <div className={`mb-3 ${color}`}>{icon}</div>
      <p className="text-sm text-ink-subtle">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
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
    <main className="min-h-screen bg-paper">
      <header className="border-b border-line-soft bg-paper-raised">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <h1 className="text-xl font-bold text-ink">
              Community Issues
            </h1>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tint text-ink">
            <ClipboardList size={22} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8">
        <section>
          <p className="text-sm font-medium text-ink">
            COMMUNITY ISSUE MANAGEMENT
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">
            Review queue
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
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
              <SummaryCard label="Action required" value={countResults[2].count ?? 0} icon={<AlertCircle size={20} />} color="text-ink" />
              <SummaryCard label="Resolved" value={countResults[3].count ?? 0} icon={<CheckCircle2 size={20} />} color="text-green-700" />
              <SummaryCard label="Closed" value={countResults[4].count ?? 0} icon={<CheckCircle2 size={20} />} color="text-ink-muted" />
            </section>

            <section className="overflow-hidden rounded-xl border border-line-soft bg-paper-raised">
              <div className="flex flex-col gap-2 border-b border-line-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-ink">
                    Community submissions
                  </h3>
                  <p className="text-xs text-ink-subtle">
                    Showing the latest 100 reports
                  </p>
                </div>
                <span className="text-sm text-ink-subtle">
                  {issues.length} reports loaded
                </span>
              </div>

              {issues.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <CheckCircle2 size={34} className="mx-auto text-green-600" />
                  <h4 className="mt-4 font-semibold text-ink">
                    No community submissions
                  </h4>
                  <p className="mt-1 text-sm text-ink-subtle">
                    New community reports will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-line-soft">
                  {issues.map((issue) => (
                    <Link
                      key={issue.id}
                      href={`/admin/community-issues/${issue.id}`}
                      className="block space-y-3 px-5 py-5 transition hover:bg-tint/40"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-ink">
                          {issue.title}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[issue.status] ?? "bg-tint text-ink-muted"}`}>
                          {issue.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="text-sm text-ink-muted">
                        {categories[issue.category] ?? issue.category} · {issue.lga}, {issue.state}
                      </p>
                      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-subtle">
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

      </div>
    </main>
  );
}
