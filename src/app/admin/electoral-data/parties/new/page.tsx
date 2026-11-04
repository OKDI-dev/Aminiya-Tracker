import Link from "next/link";
import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import PartyForm from "@/components/admin/electoral-data/party-form";

export const instant = false;

export default async function NewPartyPage() {
  await connection();
  await requireElectoralStaff();

  return (
    <div className="min-h-screen bg-[#f7f8f5] p-5 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link href="/admin/electoral-data/parties" className="text-sm text-gray-500 hover:text-[#ff6600]">
            ← Back
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-[#171717]">Add Political Party</h1>
          <p className="mt-1 text-sm text-gray-600">
            Create a party profile. New records are saved as drafts by default.
          </p>
        </div>
        <PartyForm />
      </div>
    </div>
  );
}
