import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AreaForm from "@/components/admin/electoral-data/area-form";

export const instant = false;

export default async function EditElectoralAreaPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  await requireElectoralStaff();

  const { id } = await params;
  const supabase = await createClient();

  const { data: area } = await supabase
    .from("electoral_areas")
    .select("id, name, area_type, parent_id, code, publication_status")
    .eq("id", id)
    .maybeSingle();

  if (!area) notFound();

  const { data: areas, error } = await supabase
    .from("electoral_areas")
    .select("id, name, area_type, parent_id, publication_status")
    .order("name", { ascending: true });

  return (
    <main className="min-h-screen bg-paper p-5 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="mt-3 text-2xl font-bold text-ink">
            Edit Electoral Area
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Update this area. Its type can only change while no other areas sit under it.
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load parent areas: {error.message}
          </div>
        ) : (
          <AreaForm areas={areas ?? []} initialArea={area} />
        )}
      </div>
    </main>
  );
}
