import Link from "next/link";
import { connection } from "next/server";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileSearch,
  FileWarning,
  Flag,
  Plus,
  Target,
  UserRound,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Exact row count with an optional equality filter; null when unavailable (e.g. RLS). */
async function countRows(
  supabase: Supabase,
  table: string,
  filter?: { column: string; value: string }
): Promise<number | null> {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) query = query.eq(filter.column, filter.value);
  const { count, error } = await query;
  return error ? null : count ?? 0;
}

type Segment = { key: string; label: string; value: number | null; color: string };

const issueStatuses: Omit<Segment, "value">[] = [
  { key: "submitted", label: "Submitted", color: "#2563eb" },
  { key: "under_review", label: "Under review", color: "#d97706" },
  { key: "action_required", label: "Action required", color: "#ea580c" },
  { key: "resolved", label: "Resolved", color: "#16a34a" },
  { key: "closed", label: "Closed", color: "#9ca3af" },
];

const incidentStatuses: Omit<Segment, "value">[] = [
  { key: "submitted", label: "Submitted", color: "#2563eb" },
  { key: "under_review", label: "Under review", color: "#d97706" },
  { key: "verified", label: "Verified", color: "#0d9488" },
  { key: "published", label: "Published", color: "#16a34a" },
  { key: "dismissed", label: "Dismissed", color: "#9ca3af" },
];

const sum = (...values: (number | null)[]) =>
  values.reduce<number>((total, value) => total + (value ?? 0), 0);

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default async function AdminDashboard() {
  await connection();
  const { profile } = await requireElectoralStaff();
  const supabase = await createClient();

  const [
    issueCounts,
    incidentCounts,
    pendingUpdates,
    draftPromises,
    publishedPromises,
    draftResults,
    verifiedResults,
    pendingSources,
    publishedElections,
    publishedCandidates,
    publishedParties,
    recentIssues,
    recentIncidents,
  ] = await Promise.all([
    Promise.all(issueStatuses.map((s) => countRows(supabase, "community_issues", { column: "status", value: s.key }))),
    Promise.all(incidentStatuses.map((s) => countRows(supabase, "election_incidents", { column: "status", value: s.key }))),
    countRows(supabase, "promise_progress_updates", { column: "review_status", value: "pending" }),
    countRows(supabase, "political_promises", { column: "publication_status", value: "draft" }),
    countRows(supabase, "political_promises", { column: "publication_status", value: "published" }),
    countRows(supabase, "election_results", { column: "publication_status", value: "draft" }),
    countRows(supabase, "election_results", { column: "publication_status", value: "verified" }),
    countRows(supabase, "electoral_sources", { column: "verification_status", value: "pending" }),
    countRows(supabase, "elections", { column: "publication_status", value: "published" }),
    countRows(supabase, "candidates", { column: "publication_status", value: "published" }),
    countRows(supabase, "political_parties", { column: "publication_status", value: "published" }),
    supabase
      .from("community_issues")
      .select("id, reference_code, title, status, submitted_at")
      .order("submitted_at", { ascending: false })
      .limit(5),
    supabase
      .from("election_incidents")
      .select("id, category, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const issues: Segment[] = issueStatuses.map((s, i) => ({ ...s, value: issueCounts[i] }));
  const incidents: Segment[] = incidentStatuses.map((s, i) => ({ ...s, value: incidentCounts[i] }));
  const [issuesSubmitted, issuesInReview, issuesActionRequired] = issueCounts;
  const [incidentsSubmitted, incidentsInReview] = incidentCounts;

  const queue: { label: string; detail: string; count: number | null; href: string; icon: LucideIcon; urgent?: boolean }[] = [
    { label: "New community issues", detail: "Submitted and not yet picked up", count: issuesSubmitted, href: "/admin/community-issues", icon: ClipboardList, urgent: true },
    { label: "Issues needing action", detail: "Marked “action required”", count: issuesActionRequired, href: "/admin/community-issues", icon: AlertCircle, urgent: true },
    { label: "Election incidents to review", detail: "Submitted or under review", count: sum(incidentsSubmitted, incidentsInReview), href: "/admin/incidents", icon: FileWarning, urgent: true },
    { label: "Promise updates to review", detail: "Evidence awaiting a decision", count: pendingUpdates, href: "/admin/promise-updates", icon: ClipboardCheck },
    { label: "Results to verify", detail: "Draft results not yet verified", count: draftResults, href: "/admin/electoral-data/results", icon: Vote },
    { label: "Verified results to publish", detail: "Ready for public release", count: verifiedResults, href: "/admin/electoral-data/results", icon: CheckCircle2 },
    { label: "Sources to verify", detail: "Pending source checks", count: pendingSources, href: "/admin/electoral-data/sources", icon: FileSearch },
    { label: "Draft promises", detail: "Not yet published", count: draftPromises, href: "/admin/promises", icon: Target },
  ];

  const awaiting = sum(...queue.map((item) => item.count));
  const openIssues = sum(issuesSubmitted, issuesInReview, issuesActionRequired);
  const liveRecords = sum(publishedElections, publishedCandidates, publishedParties, publishedPromises);
  const displayName = profile.display_name || "Staff member";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-8">
      <section>
        <p className="text-sm font-semibold tracking-[0.12em] text-[#e85d00] uppercase">Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#171717] sm:text-4xl">
          {greeting}, {displayName}
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-[#666]">
          {awaiting > 0
            ? `${awaiting.toLocaleString("en-NG")} item${awaiting === 1 ? "" : "s"} across the platform need a decision.`
            : "Everything is reviewed. Nothing is waiting on you right now."}
        </p>
      </section>

      {/* Hero numbers */}
      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Awaiting review" value={awaiting} icon={Clock3} tone="accent" hint="Across all review queues" />
        <StatTile label="Open community issues" value={openIssues} icon={ClipboardList} hint="Submitted, in review or action required" />
        <StatTile label="Incidents in review" value={sum(incidentsSubmitted, incidentsInReview)} icon={FileWarning} hint="Submitted or under review" />
        <StatTile label="Live public records" value={liveRecords} icon={CheckCircle2} hint="Published elections, candidates, parties and promises" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        {/* Work queue */}
        <section className="rounded-2xl border border-black/[0.06] bg-white">
          <header className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-[#171717]">Work queue</h2>
              <p className="text-sm text-[#777]">Everything waiting for staff, most urgent first.</p>
            </div>
          </header>
          <ul className="divide-y divide-black/[0.05]">
            {queue.map((item) => {
              const Icon = item.icon;
              const empty = !item.count;
              return (
                <li key={item.label}>
                  <Link href={item.href} className="group flex items-center gap-4 px-5 py-3.5 hover:bg-black/[0.02]">
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${empty ? "bg-[#f3f3f3] text-[#999]" : item.urgent ? "bg-[#fff0e5] text-[#e85d00]" : "bg-[#eef4ff] text-[#2563eb]"}`}>
                      <Icon size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-semibold ${empty ? "text-[#888]" : "text-[#171717]"}`}>{item.label}</span>
                      <span className="block truncate text-[13px] text-[#888]">{item.detail}</span>
                    </span>
                    <span className={`min-w-10 rounded-full px-2.5 py-1 text-center text-sm font-semibold tabular-nums ${empty ? "text-[#aaa]" : "bg-[#171717] text-white"}`}>
                      {item.count === null ? "—" : item.count.toLocaleString("en-NG")}
                    </span>
                    <ArrowRight size={16} className="shrink-0 text-[#bbb] transition-transform group-hover:translate-x-0.5 group-hover:text-[#171717]" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="space-y-6">
          <Breakdown title="Community issues by status" href="/admin/community-issues" segments={issues} />
          <Breakdown title="Election incidents by status" href="/admin/incidents" segments={incidents} />
        </div>
      </div>

      {/* Content overview */}
      <section aria-label="Published content" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Published elections" value={publishedElections} href="/admin/electoral-data/elections" icon={Vote} />
        <MiniStat label="Published candidates" value={publishedCandidates} href="/admin/electoral-data/candidates" icon={UserRound} />
        <MiniStat label="Published parties" value={publishedParties} href="/admin/electoral-data/parties" icon={Flag} />
        <MiniStat label="Published promises" value={publishedPromises} href="/admin/promises" icon={Target} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentList
          title="Latest community issues"
          href="/admin/community-issues"
          empty="No community issues have been submitted yet."
          rows={(recentIssues.data ?? []).map((issue) => ({
            id: issue.id,
            href: `/admin/community-issues/${issue.id}`,
            primary: issue.title,
            secondary: `${issue.reference_code} · ${formatDate(issue.submitted_at)}`,
            status: issue.status,
          }))}
        />
        <RecentList
          title="Latest election incidents"
          href="/admin/incidents"
          empty="No election incidents have been reported yet."
          rows={(recentIncidents.data ?? []).map((incident) => ({
            id: incident.id,
            href: `/admin/incidents/${incident.id}`,
            primary: incident.category.replaceAll("_", " "),
            secondary: formatDate(incident.created_at),
            status: incident.status,
          }))}
        />
      </div>

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-[#171717]">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Add election", href: "/admin/electoral-data/elections/new" },
            { label: "Add candidate", href: "/admin/electoral-data/candidates/new" },
            { label: "Add party", href: "/admin/electoral-data/parties/new" },
            { label: "Record result", href: "/admin/electoral-data/results/new" },
            { label: "Add source", href: "/admin/electoral-data/sources/new" },
            { label: "Add promise", href: "/admin/promises/new" },
            { label: "Add promise update", href: "/admin/promise-updates/new" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[#333] hover:border-[#ff6600] hover:text-[#c24e00]"
            >
              <Plus size={15} /> {action.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  hint,
  tone,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  hint: string;
  tone?: "accent";
}) {
  return (
    <div className={`rounded-2xl border p-5 ${tone === "accent" ? "border-[#ffd2b3] bg-[#fff6ef]" : "border-black/[0.06] bg-white"}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#555]">{label}</p>
        <Icon size={18} className={tone === "accent" ? "text-[#e85d00]" : "text-[#999]"} aria-hidden="true" />
      </div>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-[#171717] tabular-nums">
        {value.toLocaleString("en-NG")}
      </p>
      <p className="mt-1 text-[13px] text-[#888]">{hint}</p>
    </div>
  );
}

function MiniStat({ label, value, href, icon: Icon }: { label: string; value: number | null; href: string; icon: LucideIcon }) {
  return (
    <Link href={href} className="group flex items-center gap-4 rounded-2xl border border-black/[0.06] bg-white p-4 hover:border-black/15">
      <span className="flex size-10 items-center justify-center rounded-xl bg-[#f4f4f4] text-[#555]">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-2xl font-semibold text-[#171717] tabular-nums">{value === null ? "—" : value.toLocaleString("en-NG")}</span>
        <span className="block truncate text-[13px] text-[#777]">{label}</span>
      </span>
      <ArrowRight size={16} className="text-[#bbb] transition-transform group-hover:translate-x-0.5 group-hover:text-[#171717]" />
    </Link>
  );
}

/**
 * Part-to-whole status bar. Thin segments with 2px surface gaps and rounded
 * ends; identity never relies on colour alone (legend carries label, count
 * and share; each segment has a title tooltip).
 */
function Breakdown({ title, href, segments }: { title: string; href: string; segments: Segment[] }) {
  const total = sum(...segments.map((segment) => segment.value));
  const unavailable = segments.every((segment) => segment.value === null);

  return (
    <section className="rounded-2xl border border-black/[0.06] bg-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-[#171717]">{title}</h2>
        <Link href={href} className="shrink-0 text-sm font-medium text-[#c24e00] hover:text-[#e85d00]">
          View all
        </Link>
      </div>
      <p className="mt-0.5 text-[13px] text-[#888]">
        {unavailable ? "Counts unavailable" : `${total.toLocaleString("en-NG")} total`}
      </p>

      <div className="mt-4 flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-[#f1f1f1]" aria-hidden="true">
        {total > 0
          ? segments
              .filter((segment) => (segment.value ?? 0) > 0)
              .map((segment) => (
                <span
                  key={segment.key}
                  title={`${segment.label}: ${segment.value}`}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{ width: `${((segment.value ?? 0) / total) * 100}%`, backgroundColor: segment.color, minWidth: 4 }}
                />
              ))
          : null}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2 text-[13px]">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-[#555]">{segment.label}</span>
            <span className="font-semibold text-[#171717] tabular-nums">
              {segment.value === null ? "—" : segment.value.toLocaleString("en-NG")}
            </span>
            {total > 0 && segment.value !== null ? (
              <span className="w-9 text-right text-[#999] tabular-nums">{Math.round((segment.value / total) * 100)}%</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

const statusChip: Record<string, string> = {
  submitted: "bg-blue-50 text-blue-700",
  under_review: "bg-amber-50 text-amber-700",
  action_required: "bg-orange-50 text-orange-700",
  resolved: "bg-green-50 text-green-700",
  verified: "bg-teal-50 text-teal-700",
  published: "bg-green-50 text-green-700",
  closed: "bg-gray-100 text-gray-600",
  dismissed: "bg-gray-100 text-gray-600",
};

function RecentList({
  title,
  href,
  empty,
  rows,
}: {
  title: string;
  href: string;
  empty: string;
  rows: { id: string; href: string; primary: string; secondary: string; status: string }[];
}) {
  return (
    <section className="rounded-2xl border border-black/[0.06] bg-white">
      <header className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
        <h2 className="text-base font-semibold text-[#171717]">{title}</h2>
        <Link href={href} className="text-sm font-medium text-[#c24e00] hover:text-[#e85d00]">
          View all
        </Link>
      </header>
      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-[#888]">{empty}</p>
      ) : (
        <ul className="divide-y divide-black/[0.05]">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={row.href} className="flex items-center gap-3 px-5 py-3 hover:bg-black/[0.02]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[#171717] capitalize">{row.primary}</span>
                  <span className="block truncate text-[13px] text-[#888]">{row.secondary}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusChip[row.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {row.status.replaceAll("_", " ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
