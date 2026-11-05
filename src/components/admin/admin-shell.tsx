"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import { LayoutGroup, motion } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/sheet";
import { useCommandMenu, isMacLike } from "@/components/navigation/command-menu";
import { PageTransition } from "@/components/navigation/nav-direction";
import AdminHeader from "@/components/admin/admin-header";
import {
  activeNavHref,
  adminNav,
  breadcrumbsFor,
  parentFor,
  type AdminNavGroup,
} from "@/components/admin/admin-nav";
import logo from "../../../public/aminiya-logo-png.png";

/* ----------------------------------------------------------------------------
   Collapsed state: persisted per viewer, read without a hydration mismatch.
---------------------------------------------------------------------------- */
const COLLAPSE_KEY = "aminiya-admin-sidebar-collapsed";
const collapseListeners = new Set<() => void>();
let memoryCollapsed: boolean | null = null;

function readCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean) {
  try {
    window.localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0");
  } catch {
    // Storage blocked: the toggle still works for this page view.
  }
  memoryCollapsed = value;
  collapseListeners.forEach((listener) => listener());
}

function useSidebarCollapsed() {
  return useSyncExternalStore(
    (listener) => {
      collapseListeners.add(listener);
      return () => collapseListeners.delete(listener);
    },
    () => memoryCollapsed ?? readCollapsed(),
    () => false
  );
}

const noopSubscribe = () => () => {};

/* ----------------------------------------------------------------------------
   Signed-in staff profile (client-side so the shell never blocks the page).
---------------------------------------------------------------------------- */
type StaffProfile = { display_name: string | null; role: string; email: string | null };

async function fetchProfile(): Promise<StaffProfile | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("app_profiles")
    .select("display_name, role")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  return {
    display_name: data?.display_name ?? null,
    role: data?.role ?? "staff",
    email: auth.user.email ?? null,
  };
}

const SIDEBAR_WIDTH = 264;

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // The login screen keeps its simple, focused layout.
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return (
      <>
        <AdminHeader />
        {children}
      </>
    );
  }

  return <AuthenticatedShell pathname={pathname}>{children}</AuthenticatedShell>;
}

function AuthenticatedShell({ pathname, children }: { pathname: string; children: ReactNode }) {
  const router = useRouter();
  const collapsed = useSidebarCollapsed();
  const mac = useSyncExternalStore(noopSubscribe, isMacLike, () => false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const commandMenu = useCommandMenu();
  const { data: profile } = useSWR("admin:profile", fetchProfile, {
    revalidateOnFocus: false,
  });

  // Spring only in response to the user; the remembered state is applied instantly on load.
  const [userToggled, setUserToggled] = useState(false);
  const toggle = useCallback(() => {
    setUserToggled(true);
    writeCollapsed(!collapsed);
  }, [collapsed]);

  // "[" toggles the sidebar, like most pro tools.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
      if (event.key === "[" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) return;
    router.replace("/admin/login");
    router.refresh();
  }, [router]);

  const isAdmin = profile?.role === "admin";
  const groups = adminNav
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.adminOnly || isAdmin) }))
    .filter((group) => group.items.length > 0);

  const activeHref = activeNavHref(pathname);
  const crumbs = breadcrumbsFor(pathname);
  const parent = parentFor(pathname);
  const name = profile?.display_name || profile?.email || "Staff member";

  return (
    <div className="flex min-h-dvh bg-[#f7f8f5]">
      {/* ------------------------------ Sidebar ------------------------------ */}
      {/*
        Retracts completely (width 0). The inner column keeps a fixed width so
        the content slides out with the edge instead of squashing, and `inert`
        keeps hidden links out of the tab order.
      */}
      <motion.aside
        id="admin-sidebar"
        initial={false}
        animate={{ width: collapsed ? 0 : SIDEBAR_WIDTH }}
        transition={userToggled ? springs.default : { duration: 0 }}
        style={{ viewTransitionName: "admin-sidebar" }}
        inert={collapsed}
        aria-hidden={collapsed}
        className={cn(
          "sticky top-0 z-40 hidden h-dvh shrink-0 overflow-hidden bg-white lg:block",
          !collapsed && "border-r border-black/[0.06]"
        )}
        aria-label="Administration"
      >
        <div className="flex h-full flex-col" style={{ width: SIDEBAR_WIDTH }}>
          <div className="flex h-16 shrink-0 items-center px-4">
            <Link href="/admin" aria-label="Dashboard" className="flex min-w-0 items-center">
              <Image src={logo} alt="Aminiya Tracker" priority placeholder="blur" className="h-auto w-[148px]" />
            </Link>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
            <SidebarNav groups={groups} activeHref={activeHref} layoutId="admin-nav-active" />
          </nav>

          <div className="shrink-0 space-y-1 border-t border-black/[0.06] p-3">
            <Link
              href="/"
              className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm whitespace-nowrap text-[#555] hover:bg-black/[0.04] hover:text-[#171717]"
            >
              <ExternalLink size={18} className="shrink-0" />
              View public site
            </Link>
            <div className="mt-2 flex items-center gap-3 rounded-xl px-2 py-2">
              <Avatar name={name} loading={profile === undefined} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#171717]">
                  {profile !== undefined ? name : <span className="skeleton-shimmer inline-block h-3.5 w-24 rounded" />}
                </p>
                <p className="truncate text-xs capitalize text-[#777]">
                  {profile ? profile.role.replaceAll("_", " ") : " "}
                </p>
              </div>
              <button
                type="button"
                onClick={signOut}
                aria-label="Sign out"
                title="Sign out"
                className="flex size-9 items-center justify-center rounded-lg text-[#777] hover:bg-red-50 hover:text-red-700"
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* ------------------------------ Content ------------------------------ */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          crumbs={crumbs}
          parent={parent}
          mac={mac}
          sidebarOpen={!collapsed}
          onToggleSidebar={toggle}
          onOpenMenu={() => setMobileOpen(true)}
          onSearch={commandMenu.open}
          onSearchIntent={commandMenu.prefetch}
        />

        <div className="min-w-0 flex-1">
          <PageTransition>{children}</PageTransition>
        </div>
      </div>

      {/* --------------------------- Mobile sidebar --------------------------- */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen} title="Administration" description={profile ? `${name} · ${profile.role.replaceAll("_", " ")}` : undefined}>
        <nav className="pb-2" onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setMobileOpen(false);
        }}>
          <SidebarNav groups={groups} activeHref={activeHref} layoutId="admin-nav-active-mobile" large />
          <div className="mt-3 grid gap-2 border-t border-black/10 px-1 pt-3">
            <Link href="/" className="flex min-h-12 items-center gap-3 rounded-2xl px-4 text-[16px] text-[#333] active:bg-black/5">
              <ExternalLink size={18} /> View public site
            </Link>
            <button type="button" onClick={signOut} className="flex min-h-12 items-center gap-3 rounded-2xl px-4 text-left text-[16px] text-red-700 active:bg-red-50">
              <LogOut size={18} /> Sign out
            </button>
          </div>
        </nav>
      </Sheet>
    </div>
  );
}

function SidebarNav({
  groups,
  activeHref,
  layoutId,
  large,
}: {
  groups: AdminNavGroup[];
  activeHref: string | null;
  layoutId: string;
  large?: boolean;
}) {
  return (
    <LayoutGroup id={layoutId}>
      {groups.map((group, index) => (
        <div key={group.label} className={cn(index > 0 && "mt-4")}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-[0.08em] text-[#9a9a9a] uppercase">
            {group.label}
          </p>
          <ul className="grid gap-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = item.href === activeHref;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    data-nav="lateral"
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-3 rounded-xl px-3 whitespace-nowrap transition-colors",
                      large ? "min-h-12 text-[16px]" : "min-h-10 text-sm",
                      active ? "font-semibold text-[#c24e00]" : "text-[#444] hover:bg-black/[0.04] hover:text-[#171717]"
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId={layoutId}
                        transition={springs.snappy}
                        className="absolute inset-0 rounded-xl bg-[#fff0e5]"
                      />
                    ) : null}
                    <Icon size={large ? 19 : 18} className="relative shrink-0" />
                    <span className="relative truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </LayoutGroup>
  );
}

function Avatar({ name, loading }: { name: string; loading: boolean }) {
  const initials = name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
        loading ? "skeleton-shimmer" : "bg-[#171717] text-white"
      )}
    >
      {loading ? null : initials || "A"}
    </span>
  );
}

/**
 * The one place Back lives in the admin: top-left of every page, always
 * pointing one level up the hierarchy, with breadcrumbs beside it.
 */
function TopBar({
  crumbs,
  parent,
  mac,
  sidebarOpen,
  onToggleSidebar,
  onOpenMenu,
  onSearch,
  onSearchIntent,
}: {
  crumbs: { label: string; href: string }[];
  parent: { label: string; href: string } | null;
  mac: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenMenu: () => void;
  onSearch: () => void;
  onSearchIntent: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      style={{ viewTransitionName: "admin-topbar" }}
      data-scrolled={scrolled}
      className="material-chrome scroll-edge sticky top-0 z-30 flex h-16 items-center gap-2 px-3 sm:px-6"
    >
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open administration menu"
        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/60 lg:hidden"
      >
        <Menu size={19} />
      </button>

      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        aria-expanded={sidebarOpen}
        aria-controls="admin-sidebar"
        aria-keyshortcuts="["
        title={`${sidebarOpen ? "Hide" : "Show"} sidebar ( [ )`}
        className="hidden size-10 shrink-0 items-center justify-center rounded-full text-[#555] hover:bg-black/[0.05] hover:text-[#171717] lg:flex"
      >
        {sidebarOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
      </button>

      {parent ? (
        <Link
          href={parent.href}
          data-nav="back"
          className="flex h-10 shrink-0 items-center gap-1 rounded-full border border-black/10 bg-white/70 pr-3.5 pl-2 text-sm font-medium text-[#333] hover:border-black/20 hover:text-[#171717]"
        >
          <ChevronLeft size={18} />
          <span className="max-w-[9rem] truncate">Back</span>
          <span className="sr-only"> to {parent.label}</span>
        </Link>
      ) : null}

      <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 items-center sm:flex">
        <ol className="flex min-w-0 items-center gap-1 text-sm">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
            return (
              <li key={crumb.href} className="flex min-w-0 items-center gap-1">
                {index > 0 ? <ChevronRight size={14} className="shrink-0 text-[#bbb]" aria-hidden="true" /> : null}
                {last ? (
                  <span aria-current="page" className="truncate font-semibold text-[#171717]">
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} data-nav="back" className="truncate text-[#777] hover:text-[#171717]">
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="ml-auto flex items-center gap-2 sm:ml-0">
        <button
          type="button"
          onClick={onSearch}
          onPointerEnter={onSearchIntent}
          aria-label="Search admin pages"
          aria-keyshortcuts={mac ? "Meta+K" : "Control+K"}
          className="flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white/60 px-3 text-sm text-[#666] hover:border-black/20 hover:text-[#171717]"
        >
          <Search size={16} />
          <span className="hidden md:inline">Jump to…</span>
          <kbd className="hidden rounded-md border border-black/10 bg-black/[0.03] px-1.5 py-0.5 font-sans text-[11px] whitespace-nowrap text-[#777] md:inline">
            {mac ? "⌘K" : "Ctrl K"}
          </kbd>
        </button>
      </div>
    </header>
  );
}
