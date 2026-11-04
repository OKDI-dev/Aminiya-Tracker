import { connection } from "next/server";
import Link from "next/link";
import { requireElectoralStaff } from "@/lib/auth";
import LogoutButton from "@/components/admin-logout";
export const instant = false;

import {
  FileWarning,
  ClipboardList,
  FileCheck2,
  ClipboardCheck,
  Users,
  BarChart3,
  ArrowRight,
} from "lucide-react";

export default async function AdminDashboard() {
  await connection();
  const { profile } = await requireElectoralStaff();

  const displayName = profile.display_name || "Staff Member";

  const cards = [
    {
      title: "Election Incidents",
      description: "Review, verify and manage submitted election incident reports.",
      href: "/admin/incidents",
      icon: FileWarning,
      status: "Review workflow",
    },
    {
      title: "Community Issues",
      description: "Review community concerns, manage responses and publish progress updates.",
      href: "/admin/community-issues",
      icon: ClipboardList,
      status: "Community review",
    },
    {
      title: "Political Promise Tracker",
      description: "Register political commitments, monitor implementation and verify progress.",
      href: "/admin/promises",
      icon: FileCheck2,
      status: "Political accountability",
    },
    {
      title: "Promise Progress Reviews",
      description: "Review submitted evidence, approve progress updates and verify political commitments.",
      href: "/admin/promise-updates",
      icon: ClipboardCheck,
      status: "Evidence verification",
    },
    {
      title: "Electoral Data",
      description: "Manage electoral information, candidates, parties and results.",
      href: "/admin/electoral-data",
      icon: BarChart3,
      status: "Management",
    },
    {
      title: "Staff Accounts",
      description: "Manage authorised personnel and their access permissions.",
      href: "/admin/staff",
      icon: Users,
      status: "Administration",
      adminOnly: true,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f8f5]">
      <div className="mx-auto max-w-7xl space-y-8 px-5 py-10 sm:px-8">
        <div className="flex justify-end">
          <LogoutButton />
        </div>

        <section>
          <p className="text-sm font-medium text-[#ff6600]">
            ADMINISTRATION
          </p>
          <h2 className="mt-2 text-3xl font-bold text-[#171717]">
            Welcome, {displayName}
          </h2>
          <p className="mt-2 text-gray-600">
            Manage electoral information, community reports and platform
            operations from one place.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Your access level</p>
            <p className="mt-2 text-xl font-semibold capitalize text-[#171717]">
              {profile.role.replaceAll("_", " ")}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Platform</p>
            <p className="mt-2 text-xl font-semibold text-[#171717]">
              Aminiya Tracker
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Access status</p>
            <p className="mt-2 text-xl font-semibold text-green-700">
              Authorised
            </p>
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-lg font-semibold text-[#171717]">
            Management
          </h3>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {cards
              .filter((card) => !card.adminOnly || profile.role === "admin")
              .map((card) => {
                const Icon = card.icon;

                return (
                  <Link
                    key={card.title}
                    href={card.href}
                    className="group rounded-xl border border-gray-200 bg-white p-6 transition hover:border-[#ff6600] hover:shadow-sm"
                  >
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-orange-50 text-[#ff6600]">
                      <Icon size={23} />
                    </div>

                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                      {card.status}
                    </p>

                    <h4 className="text-lg font-semibold text-[#171717]">
                      {card.title}
                    </h4>

                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      {card.description}
                    </p>

                    <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#ff6600]">
                      Open section
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
