import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import CandidateForm from "@/components/admin/electoral-data/candidate-form";

export const instant = false;

export default async function NewCandidatePage() {
  await connection();
  await requireElectoralStaff();

  return (
    <div className="min-h-screen bg-[#f7f8f5] p-5 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="mt-3 text-2xl font-bold text-[#171717]">Add Candidate</h1>
          <p className="mt-1 text-sm text-gray-600">
            Add a candidate profile. New records are saved as drafts by default.
          </p>
        </div>
        <CandidateForm />
      </div>
    </div>
  );
}
