import { connection } from "next/server";
import Link from "next/link";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  Vote,
  Users,
  Flag,
  MapPinned,
  Link2,
  ChartNoAxesCombined,
  BookOpenCheck,
  ArrowRight,
} from "lucide-react";

export const instant = false;

const sections = [
  {
    title: "Elections",
    description: "Create and manage electoral contests, dates, jurisdictions and publication status.",
    href: "/admin/electoral-data/elections",
    icon: Vote,
  },
  {
    title: "Candidates",
    description: "Register candidates and manage their biographies, photographs and official profiles.",
    href: "/admin/electoral-data/candidates",
    icon: Users,
  },
  {
    title: "Political Parties",
    description: "Manage political party profiles, acronyms, logos and official links.",
    href: "/admin/electoral-data/parties",
    icon: Flag,
  },
  {
    title: "Electoral Areas",
    description: "Manage states, LGAs, wards and polling units within the electoral area hierarchy.",
    href: "/admin/electoral-data/areas",
    icon: MapPinned,
  },
  {
    title: "Candidacies",
    description: "Associate candidates with elections, political parties, offices and electoral areas.",
    href: "/admin/electoral-data/candidacies",
    icon: Link2,
  },
  {
    title: "Election Results",
    description: "Enter and manage provisional and official results, voter statistics and publication status.",
    href: "/admin/electoral-data/results",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Electoral Sources",
    description: "Register information sources and manage their verification status.",
    href: "/admin/electoral-data/sources",
    icon: BookOpenCheck,
  },
];

const tables = [
  { table: "elections", label: "Elections" },
  { table: "candidates", label: "Candidates" },
  { table: "political_parties", label: "Political parties" },
  { table: "electoral_areas", label: "Electoral areas" },
  { table: "candidacies", label: "Candidacies" },
  { table: "election_results", label: "Election results" },
  { table: "electoral_sources", label: "Electoral sources" },
] as const;

export default async function ElectoralDataDashboard() {
  await connection();
  await requireElectoralStaff();

  const supabase = await createClient();

  const countResults = await Promise.all(
    tables.map(({ table }) =>
      supabase
        .from(table)
        .select("id", { count: "exact", head: true })
    )
  );

  const countError = countResults.some((result) => result.error);

  const counts = tables.map((item, index) => ({
    ...item,
    count: countResults[index].count ?? 0,
  }));

  return (
    <main className="min-h-screen bg-[#f7f8f5]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <Link
              href="/admin"
              className="mb-2 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-[#ff6600]"
            >
              <ArrowLeft size={16} />
              Back
            </Link>

            <h1 className="text-xl font-bold text-[#171717]">
              Electoral Data Management
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage the electoral information used across Aminiya Tracker.
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#ff6600]">
            <Vote size={23} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8">
        <section>
          <p className="text-sm font-medium text-[#ff6600]">
            ELECTORAL INFORMATION
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#171717]">
            Electoral data overview
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Maintain reliable electoral records, connect candidates to
            electoral contests, manage geographical areas and publish
            results supported by verifiable sources.
          </p>
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-[#171717]">
              Database overview
            </h3>
            <span className="text-xs text-gray-500">
              Total records by category
            </span>
          </div>

          {countError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              Some record counts could not be loaded. Check the database
              permissions and try again.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {counts.map((item) => (
                <div
                  key={item.table}
                  className="rounded-xl border border-gray-200 bg-white p-5"
                >
                  <p className="text-sm text-gray-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-[#171717]">
                    {item.count.toLocaleString("en-NG")}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Total records
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-4 font-semibold text-[#171717]">
            Management sections
          </h3>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => {
              const Icon = section.icon;

              return (
                <Link
                  key={section.href}
                  href={section.href}
                  className="group rounded-xl border border-gray-200 bg-white p-6 transition hover:border-[#ff6600] hover:shadow-sm"
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-orange-50 text-[#ff6600]">
                    <Icon size={22} />
                  </div>

                  <h4 className="font-semibold text-[#171717]">
                    {section.title}
                  </h4>

                  <p className="mt-2 min-h-12 text-sm leading-6 text-gray-600">
                    {section.description}
                  </p>

                  <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#ff6600]">
                    Manage records
                    <ArrowRight
                      size={16}
                      className="transition group-hover:translate-x-1"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#ff6600] transition hover:text-[#e85d00]"
        >
          <ArrowLeft size={16} />
          Back
        </Link>
      </div>
    </main>
  );
}
