import Link from "next/link";
import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Plus, Clock3, CheckCircle2, XCircle } from "lucide-react";

export const instant = false;

export default async function PromiseUpdateQueuePage() {
  await connection();
  await requireElectoralStaff();

  const supabase = await createClient();

  const { data: updates, error } = await supabase
    .from("promise_progress_updates")
    .select("id, promise_id, update_title, progress_status, update_date, review_status, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error("Unable to load promise progress updates.");

  const promiseIds = [...new Set((updates ?? []).map((item) => item.promise_id))];

  const { data: promises } = promiseIds.length
    ? await supabase
        .from("political_promises")
        .select("id, title")
        .in("id", promiseIds)
    : { data: [] };

  const promiseMap = new Map((promises ?? []).map((item) => [item.id, item.title]));

  const pending = (updates ?? []).filter((item) => item.review_status === "pending");
  const approved = (updates ?? []).filter((item) => item.review_status === "approved");
  const rejected = (updates ?? []).filter((item) => item.review_status === "rejected");

  return (
    <main className="min-h-screen bg-paper p-5 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-7">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-ink-subtle">Political Promise Tracker</p>
            <h1 className="mt-1 text-2xl font-bold text-ink">Progress update review</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Review evidence submitted against published political promises.
            </p>
          </div>

          <Link
            href="/admin/promise-updates/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-signal px-4 py-3 text-sm font-semibold text-ink hover:bg-signal-hover"
          >
            <Plus size={17} /> Submit update
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Pending review" count={pending.length} icon={<Clock3 size={19} />} />
          <SummaryCard label="Approved" count={approved.length} icon={<CheckCircle2 size={19} />} />
          <SummaryCard label="Rejected" count={rejected.length} icon={<XCircle size={19} />} />
        </div>

        <section className="overflow-hidden rounded-xl border border-line-soft bg-paper-raised">
          <div className="border-b border-line-soft p-5">
            <h2 className="font-semibold text-ink">All progress updates</h2>
          </div>

          {(updates ?? []).length === 0 ? (
            <p className="p-8 text-center text-sm text-ink-subtle">No progress updates have been submitted.</p>
          ) : (
            <div className="divide-y divide-line-soft">
              {(updates ?? []).map((item) => (
                <Link
                  key={item.id}
                  href={`/admin/promise-updates/${item.id}`}
                  className="block p-5 transition hover:bg-tint"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{item.update_title}</p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {promiseMap.get(item.promise_id) ?? "Political promise"}
                      </p>
                      <p className="mt-1 text-xs text-ink-subtle">
                        Update date: {item.update_date} · Progress: {item.progress_status.replaceAll("_", " ")}
                      </p>
                    </div>
                    <StatusLabel status={item.review_status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  count,
  icon,
}: {
  label: string;
  count: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-line-soft bg-paper-raised p-5">
      <div className="rounded-lg bg-tint p-3 text-ink">{icon}</div>
      <div>
        <p className="text-sm text-ink-subtle">{label}</p>
        <p className="text-2xl font-bold text-ink">{count}</p>
      </div>
    </div>
  );
}

function StatusLabel({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-800",
    approved: "bg-green-50 text-green-800",
    rejected: "bg-red-50 text-red-800",
  };

  return (
    <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${styles[status] ?? "bg-tint text-ink-muted"}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
