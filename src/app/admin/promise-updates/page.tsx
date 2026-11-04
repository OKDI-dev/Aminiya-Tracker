import Link from "next/link";
import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Plus, Clock3, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

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
    <main className="min-h-screen bg-[#f7f8f5] p-5 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-7">
        <Link
          href="/admin/promises"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-[#ff6600]"
        >
          <ArrowLeft size={17} />
          Back
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500">Political Promise Tracker</p>
            <h1 className="mt-1 text-2xl font-bold text-[#171717]">Progress update review</h1>
            <p className="mt-2 text-sm text-gray-600">
              Review evidence submitted against published political promises.
            </p>
          </div>

          <Link
            href="/admin/promise-updates/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff6600] px-4 py-3 text-sm font-semibold text-white hover:bg-[#e85d00]"
          >
            <Plus size={17} /> Submit update
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Pending review" count={pending.length} icon={<Clock3 size={19} />} />
          <SummaryCard label="Approved" count={approved.length} icon={<CheckCircle2 size={19} />} />
          <SummaryCard label="Rejected" count={rejected.length} icon={<XCircle size={19} />} />
        </div>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900">All progress updates</h2>
          </div>

          {(updates ?? []).length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">No progress updates have been submitted.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {(updates ?? []).map((item) => (
                <Link
                  key={item.id}
                  href={`/admin/promise-updates/${item.id}`}
                  className="block p-5 transition hover:bg-gray-50"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{item.update_title}</p>
                      <p className="mt-1 text-sm text-gray-600">
                        {promiseMap.get(item.promise_id) ?? "Political promise"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
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
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5">
      <div className="rounded-lg bg-orange-50 p-3 text-[#ff6600]">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{count}</p>
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
    <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
