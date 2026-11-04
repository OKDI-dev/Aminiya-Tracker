"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import StatusActions from "@/components/admin/electoral-data/status-actions";

type Status = "draft" | "published" | "archived";

type Area = {
  id: string;
  name: string;
  area_type: string;
  parent_id: string | null;
  code: string | null;
  publication_status: Status;
};

type Props = {
  areas: Area[];
  stateId: string;
};

const statusStyles: Record<Status, string> = {
  published: "bg-green-100 text-green-800",
  draft: "bg-yellow-100 text-yellow-800",
  archived: "bg-gray-100 text-gray-700",
};

export default function AreasBrowser({ areas, stateId }: Props) {
  const [selectedLga, setSelectedLga] = useState<string | null>(null);
  const [selectedWard, setSelectedWard] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const areaMap = useMemo(
    () => new Map(areas.map((area) => [area.id, area])),
    [areas]
  );

  const lgas = areas.filter(
    (area) => area.area_type === "lga" && area.parent_id === stateId
  );

  const wards = areas.filter(
    (area) => area.area_type === "ward" && area.parent_id === selectedLga
  );

  const selectedLgaRecord = selectedLga ? areaMap.get(selectedLga) : null;
  const selectedWardRecord = selectedWard ? areaMap.get(selectedWard) : null;

  const currentAreas = selectedWard
    ? []
    : selectedLga
      ? wards
      : lgas;

  const filteredAreas = currentAreas.filter((area) => {
    const matchesStatus =
      statusFilter === "all" || area.publication_status === statusFilter;
    const matchesSearch = area.name.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  function openLga(id: string) {
    setSelectedLga(id);
    setSelectedWard(null);
    setSearch("");
    setStatusFilter("all");
  }

  function openWard(id: string) {
    setSelectedWard(id);
  }

  function goToLgas() {
    setSelectedLga(null);
    setSelectedWard(null);
    setSearch("");
    setStatusFilter("all");
  }

  function goToWards() {
    setSelectedWard(null);
    setSearch("");
    setStatusFilter("all");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          <button onClick={goToLgas} className={!selectedLga ? "font-semibold text-[#ff6600]" : "hover:text-[#ff6600]"}>
            Gombe State LGAs
          </button>
          {selectedLgaRecord && (
            <>
              <span className="mx-2">/</span>
              <button onClick={goToWards} className={!selectedWard ? "font-semibold text-[#ff6600]" : "hover:text-[#ff6600]"}>
                {selectedLgaRecord.name} wards
              </button>
            </>
          )}
          {selectedWardRecord && (
            <>
              <span className="mx-2">/</span>
              <span className="font-semibold text-[#ff6600]">{selectedWardRecord.name}</span>
            </>
          )}
        </div>

        <Link
          href="/admin/electoral-data/areas/new"
          className="rounded-lg bg-[#ff6600] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e85d00]"
        >
          Add Electoral Area
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        {selectedWardRecord ? (
          <div className="py-10 text-center">
            <p className="text-lg font-semibold text-gray-900">
              {selectedWardRecord.name}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Polling-unit data is not yet available for this ward.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Polling units can be added when verified data becomes available.
            </p>
            <Link
              href="/admin/electoral-data/areas/new"
              className="mt-5 inline-flex rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-[#ff6600] hover:text-[#e85d00]"
            >
              Add Electoral Area
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-[#171717]">
                  {selectedLgaRecord ? `${selectedLgaRecord.name} wards` : "Local Government Areas"}
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  {selectedLgaRecord
                    ? "Select a ward to view its polling-unit data status."
                    : "Select an LGA to explore its wards."}
                </p>
              </div>
              <span className="text-sm text-gray-500">
                {filteredAreas.length} records
              </span>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name"
                className="rounded-md border border-gray-200 px-3 py-2 text-sm"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {!filteredAreas.length ? (
              <p className="py-10 text-center text-sm text-gray-500">
                No matching electoral areas found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Explore</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAreas.map((area) => (
                      <tr key={area.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 font-medium text-gray-900">{area.name}</td>
                        <td className="px-4 py-4 text-gray-600">{area.code || "—"}</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[area.publication_status]}`}>
                            {area.publication_status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => selectedLga ? openWard(area.id) : openLga(area.id)}
                            className="text-sm font-medium text-[#e85d00] hover:underline"
                          >
                            {selectedLga ? "View ward" : "View wards"} →
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <StatusActions
                            table="electoral_areas"
                            id={area.id}
                            status={area.publication_status}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
