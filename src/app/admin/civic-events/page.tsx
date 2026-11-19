import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import CivicEventsManager from "@/components/admin/civic-events-manager";

export const instant = false;

export default async function CivicEventsPage() {
  await connection();
  await requireElectoralStaff();

  return (
    <main className="min-h-screen bg-paper p-5 sm:p-8">
      <CivicEventsManager />
    </main>
  );
}
