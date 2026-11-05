import {
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  FileSearch,
  FileWarning,
  Flag,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Target,
  UserRound,
  Users,
  Vote,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

/** Single source of truth for the sidebar, mobile sheet, breadcrumbs and back button. */
export const adminNav: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Review",
    items: [
      { label: "Community issues", href: "/admin/community-issues", icon: ClipboardList },
      { label: "Election incidents", href: "/admin/incidents", icon: FileWarning },
      { label: "Promise updates", href: "/admin/promise-updates", icon: ClipboardCheck },
    ],
  },
  {
    label: "Accountability",
    items: [{ label: "Promises", href: "/admin/promises", icon: Target }],
  },
  {
    label: "Electoral data",
    items: [
      { label: "Data overview", href: "/admin/electoral-data", icon: BarChart3 },
      { label: "Elections", href: "/admin/electoral-data/elections", icon: Vote },
      { label: "Candidates", href: "/admin/electoral-data/candidates", icon: UserRound },
      { label: "Parties", href: "/admin/electoral-data/parties", icon: Flag },
      { label: "Candidacies", href: "/admin/electoral-data/candidacies", icon: ListChecks },
      { label: "Electoral areas", href: "/admin/electoral-data/areas", icon: MapPin },
      { label: "Results", href: "/admin/electoral-data/results", icon: BarChart3 },
      { label: "Sources", href: "/admin/electoral-data/sources", icon: FileSearch },
    ],
  },
  {
    label: "Administration",
    items: [{ label: "Staff", href: "/admin/staff", icon: Users, adminOnly: true }],
  },
];

const allItems = adminNav.flatMap((group) => group.items);

const segmentLabels: Record<string, string> = {
  admin: "Dashboard",
  "community-issues": "Community issues",
  incidents: "Election incidents",
  "promise-updates": "Promise updates",
  promises: "Promises",
  "electoral-data": "Electoral data",
  elections: "Elections",
  candidates: "Candidates",
  parties: "Parties",
  candidacies: "Candidacies",
  areas: "Electoral areas",
  results: "Results",
  sources: "Sources",
  staff: "Staff",
  new: "New",
};

function labelForSegment(segment: string) {
  return segmentLabels[segment] ?? "Details";
}

/** The nav item that owns this path (longest matching prefix). */
export function activeNavHref(pathname: string) {
  let best: string | null = null;
  for (const item of allItems) {
    const matches =
      pathname === item.href ||
      (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
    if (matches && (!best || item.href.length > best.length)) best = item.href;
  }
  return best;
}

export type Crumb = { label: string; href: string };

export function breadcrumbsFor(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment, index) => ({
    label: labelForSegment(segment),
    href: `/${segments.slice(0, index + 1).join("/")}`,
  }));
}

/** Where "Back" goes: one level up the hierarchy (null on the dashboard). */
export function parentFor(pathname: string): Crumb | null {
  const crumbs = breadcrumbsFor(pathname);
  if (crumbs.length < 2) return null;
  return crumbs[crumbs.length - 2];
}
