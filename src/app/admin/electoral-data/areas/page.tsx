import Link from "next/link";
import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AreasBrowser from "@/components/admin/electoral-data/areas-browser";

export const instant = false;

export default async function ElectoralAreasPage() {
  await connection();
  await requireElectoralStaff();

  const supabase = await createClient();

  const [stateResult, areasResult] = await Promise.all([
    supabase
      .from("electoral_areas")
      .select("id, name, area_type, parent_id, code, publication_status")
      .eq("area_type", "state")
      .eq("name", "Gombe")
      .maybeSingle(),

    supabase
      .from("electoral_areas")
      .select("id, name, area_type, parent_id, code, publication_status")
      .order("name", { ascending: true }),
  ]);

  const error = stateResult.error ?? areasResult.error;

  return (
    <main className="min-h-screen bg-[#f7f8f5] p-5 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <Link
            href="/admin/electoral-data"
            className="text-sm text-gray-500 hover:text-[#ff6600]"
          >
            ← Back
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-[#171717]">
            Electoral Areas
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Browse Gombe State by Local Government Area and ward. Polling-unit
            data will be added when available.
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load electoral areas: {error.message}
          </div>
        ) : !stateResult.data ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            The Gombe State record could not be found or accessed.
          </div>
        ) : (
          <AreasBrowser
            stateId={stateResult.data.id}
            areas={areasResult.data ?? []}
          />
        )}
      </div>
    </main>
  );
}
