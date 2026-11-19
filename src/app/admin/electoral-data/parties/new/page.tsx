import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import PartyForm from "@/components/admin/electoral-data/party-form";

export const instant = false;

export default async function NewPartyPage() {
  await connection();
  await requireElectoralStaff();

  return (
    <div className="min-h-screen bg-paper p-5 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="mt-3 text-2xl font-bold text-ink">Add Political Party</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Create a party profile. New records are saved as drafts by default.
          </p>
        </div>
        <PartyForm />
      </div>
    </div>
  );
}
