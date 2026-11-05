import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AreaForm from "@/components/admin/electoral-data/area-form";

export const instant = false;

export default async function NewElectoralAreaPage() {
  await connection();
  await requireElectoralStaff();

  const supabase = await createClient();

  const { data: areas, error } = await supabase
    .from("electoral_areas")
    .select("id, name, area_type, parent_id, publication_status")
    .order("name", { ascending: true });

  return (
    <main className="min-h-screen bg-[#f7f8f5] p-5 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="mt-3 text-2xl font-bold text-[#171717]">
            Add Electoral Area
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Add a country, state, LGA, ward or polling unit to the electoral geography database.
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load parent areas: {error.message}
          </div>
        ) : (
          <AreaForm areas={areas ?? []} />
        )}
      </div>
    </main>
  );
}
