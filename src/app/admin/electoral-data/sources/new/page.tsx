import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import ElectoralSourceForm from "@/components/admin/electoral-data/electoral-source-form";

export const instant = false;

export default async function NewElectoralSourcePage() {
  await connection();
  await requireElectoralStaff();

  return (
    <main className="min-h-screen bg-[#f7f8f5] p-5 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="mt-3 text-2xl font-bold text-[#171717]">
            Register Electoral Source
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Add the details of a document, publication or other information source.
          </p>
        </div>

        <ElectoralSourceForm />
      </div>
    </main>
  );
}
