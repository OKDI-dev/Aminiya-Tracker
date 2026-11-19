import { connection } from "next/server";
import Link from "next/link";
import { requireElectoralStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
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
    <main className="min-h-screen bg-paper">
      <header className="border-b border-line-soft bg-paper-raised">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div>

            <h1 className="text-xl font-bold text-ink">
              Electoral Data Management
            </h1>

            <p className="mt-1 text-sm text-ink-subtle">
              Manage the electoral information used across Aminiya Tracker.
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-tint text-ink">
            <Vote size={23} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8">
        <section>
          <p className="text-sm font-medium text-ink">
            ELECTORAL INFORMATION
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">
            Electoral data overview
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
            Maintain reliable electoral records, connect candidates to
            electoral contests, manage geographical areas and publish
            results supported by verifiable sources.
          </p>
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-ink">
              Database overview
            </h3>
            <span className="text-xs text-ink-subtle">
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
                  className="rounded-xl border border-line-soft bg-paper-raised p-5"
                >
                  <p className="text-sm text-ink-subtle">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-ink">
                    {item.count.toLocaleString("en-NG")}
                  </p>
                  <p className="mt-1 text-xs text-ink-subtle">
                    Total records
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-4 font-semibold text-ink">
            Management sections
          </h3>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => {
              const Icon = section.icon;

              return (
                <Link
                  key={section.href}
                  href={section.href}
                  className="group rounded-xl border border-line-soft bg-paper-raised p-6 transition hover:border-signal hover:shadow-sm"
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-tint text-ink">
                    <Icon size={22} />
                  </div>

                  <h4 className="font-semibold text-ink">
                    {section.title}
                  </h4>

                  <p className="mt-2 min-h-12 text-sm leading-6 text-ink-muted">
                    {section.description}
                  </p>

                  <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-ink">
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

      </div>
    </main>
  );
}
