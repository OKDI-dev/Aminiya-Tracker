import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import CivicEducationManager from "@/components/admin/civic-education-manager";

export const instant = false;

export default async function CivicEducationPage() {
  await connection();
  await requireElectoralStaff();

  return (
    <main className="min-h-screen bg-paper p-5 sm:p-8">
      <CivicEducationManager />
    </main>
  );
}
