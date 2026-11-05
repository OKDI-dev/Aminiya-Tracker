"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  ArrowUpRight,
  ChevronDown,
  ClipboardList,
  FileSearch,
  Gavel,
  Menu,
  MessageSquareText,
  Search,
  ShieldAlert,
  Target,
  Users,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useCommandMenu, isMacLike } from "@/components/navigation/command-menu";
import { Sheet } from "@/components/ui/sheet";
import { springs } from "@/lib/motion";
import { useSafeTriangleMenu } from "@/hooks/use-safe-triangle-menu";
import logo from "../../public/aminiya-logo.jpg";

type MenuId = "electoral" | "community" | "promises";

const noopSubscribe = () => () => {};

type SubItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

function useScrolled(threshold = 4) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [threshold]);
  return scrolled;
}

export default function PublicHeader() {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  const commandMenu = useCommandMenu();
  const scrolled = useScrolled();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mac = useSyncExternalStore(noopSubscribe, isMacLike, () => false);
  const flyoutId = useId();
  const navRef = useRef<HTMLElement>(null);
  const triggerRefs = useRef<Partial<Record<MenuId, HTMLElement | null>>>({});
  const {
    active: activeMenuId,
    setActive: setActiveMenu,
    panelRef,
    triggerProps,
    close: closeMenu,
  } = useSafeTriangleMenu<MenuId>();
  const [panelX, setPanelX] = useState(0);

  // Anchor the flyout under its trigger (clamped inside the nav).
  useEffect(() => {
    if (!activeMenuId) return;
    const trigger = triggerRefs.current[activeMenuId];
    const nav = navRef.current;
    if (!trigger || !nav) return;
    const navRect = nav.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const panelWidth = 420;
    const maxX = Math.max(0, navRect.width - panelWidth);
    setPanelX(Math.min(Math.max(triggerRect.left - navRect.left - 16, 0), maxX));
  }, [activeMenuId]);

  const menus: Record<MenuId, { label: string; href: string; items: SubItem[] }> = {
    electoral: {
      label: t("electoralInformation"),
      href: "/electoral-information",
      items: [
        { title: "Elections", description: "Upcoming and past elections, candidates and results.", href: "/elections", icon: Vote },
        { title: "Voting process", description: "What happens before, on and after election day.", href: "/electoral-information/voting-process", icon: ClipboardList },
        { title: "Voter rights", description: "Know what you're entitled to at the polling unit.", href: "/electoral-information/voter-rights", icon: Gavel },
        { title: "Civic responsibility", description: "How to take part constructively in your community.", href: "/electoral-information/civic-responsibility", icon: Users },
        { title: "Reliable information", description: "Spot misinformation and verify what you read.", href: "/electoral-information/reliable-information", icon: FileSearch },
      ],
    },
    community: {
      label: t("communityIssues"),
      href: "/community-issues",
      items: [
        { title: t("reportIssue"), description: "Tell us about a problem affecting your community.", href: "/community-issues", icon: MessageSquareText },
        { title: "Track a report", description: "Follow the status of an issue with your reference code.", href: "/community-issues#track", icon: Search },
      ],
    },
    promises: {
      label: t("promiseTracker"),
      href: "/promise-tracker",
      items: [
        { title: "All promises", description: "Published commitments and verified progress.", href: "/promise-tracker", icon: Target },
        { title: t("accountability"), description: "Platform-wide statistics on delivery and evidence.", href: "/accountability", icon: ShieldAlert },
      ],
    },
  };

  const topLinks: { key: "home" | MenuId | "accountability" | "about"; href: string; label: string }[] = [
    { key: "home", href: "/", label: t("home") },
    { key: "electoral", href: menus.electoral.href, label: menus.electoral.label },
    { key: "community", href: menus.community.href, label: menus.community.label },
    { key: "promises", href: menus.promises.href, label: menus.promises.label },
    { key: "accountability", href: "/accountability", label: t("accountability") },
    { key: "about", href: "/about", label: t("about") },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const activeTop =
    topLinks.find((link) => link.key !== "home" && isActive(link.href)) ??
    (pathname === "/" ? topLinks[0] : undefined);

  const activeMenu = activeMenuId ? menus[activeMenuId] : null;

  return (
    <header
      style={{ viewTransitionName: "site-header" }}
      data-scrolled={scrolled}
      className="material-chrome scroll-edge sticky top-0 z-50"
    >
      <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" aria-label="Aminiya Tracker home" className="shrink-0" data-nav="lateral">
          <Image
            src={logo}
            alt="Aminiya Tracker"
            priority
            placeholder="blur"
            className="h-auto w-[150px] mix-blend-multiply sm:w-[170px]"
          />
        </Link>

        <nav
          ref={navRef}
          aria-label={t("mainNavigation")}
          className="relative hidden items-center gap-0.5 xl:flex"
        >
          <LayoutGroup id="desktop-nav">
            {topLinks.map((link) => {
              const hasMenu = link.key === "electoral" || link.key === "community" || link.key === "promises";
              const menuId = link.key as MenuId;
              const expanded = hasMenu && activeMenuId === menuId;

              return (
                <div
                  key={link.href}
                  ref={(element) => {
                    if (hasMenu) triggerRefs.current[menuId] = element;
                  }}
                  className="relative flex items-center"
                  {...(hasMenu ? triggerProps(menuId) : {})}
                >
                  <Link
                    href={link.href}
                    data-nav="lateral"
                    onClick={closeMenu}
                    aria-current={activeTop?.href === link.href ? "page" : undefined}
                    className={`relative rounded-full px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                      activeTop?.href === link.href
                        ? "font-semibold text-[#d95300]"
                        : "text-[#3d3d3d] hover:text-[#171717]"
                    } ${hasMenu ? "pr-1.5" : ""}`}
                  >
                    {activeTop?.href === link.href ? (
                      <motion.span
                        layoutId="nav-active-pill"
                        transition={springs.snappy}
                        className="absolute inset-0 -z-10 rounded-full bg-[#fff0e5]"
                      />
                    ) : null}
                    {link.label}
                  </Link>
                  {hasMenu ? (
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={flyoutId}
                      aria-label={`Show ${link.label} pages`}
                      onClick={() => setActiveMenu(expanded ? null : menuId)}
                      className="flex size-7 items-center justify-center rounded-full text-[#777] hover:bg-black/5 hover:text-[#171717]"
                    >
                      <motion.span
                        animate={{ rotate: expanded ? 180 : 0 }}
                        transition={springs.snappy}
                        className="flex"
                      >
                        <ChevronDown size={15} />
                      </motion.span>
                    </button>
                  ) : null}
                </div>
              );
            })}
          </LayoutGroup>

          <AnimatePresence>
            {activeMenu ? (
              <motion.div
                ref={panelRef}
                id={flyoutId}
                key="flyout"
                initial={{ opacity: 0, y: -6, scale: 0.98, x: panelX, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, x: panelX, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -4, scale: 0.98, filter: "blur(4px)", transition: springs.exit }}
                transition={springs.default}
                style={{ transformOrigin: "top left" }}
                className="material-thick absolute top-[calc(100%+12px)] left-0 w-[420px] overflow-hidden rounded-2xl border border-black/5 p-2 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.3)]"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.ul
                    key={activeMenuId}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={springs.snappy}
                    className="grid gap-0.5"
                  >
                    {activeMenu.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.href + item.title}>
                          <Link
                            href={item.href}
                            onClick={closeMenu}
                            className="group flex gap-3 rounded-xl p-3 hover:bg-black/[0.04] focus-visible:bg-black/[0.04]"
                          >
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#fff0e5] text-[#e85d00]">
                              <Icon size={18} />
                            </span>
                            <span className="min-w-0">
                              <span className="flex items-center gap-1 text-sm font-semibold text-[#171717]">
                                {item.title}
                                <ArrowUpRight size={14} className="opacity-0 transition-opacity group-hover:opacity-60" />
                              </span>
                              <span className="mt-0.5 block text-[13px] leading-5 text-[#666]">
                                {item.description}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </motion.ul>
                </AnimatePresence>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={commandMenu.open}
            onPointerEnter={commandMenu.prefetch}
            onFocus={commandMenu.prefetch}
            aria-label="Search"
            aria-keyshortcuts={mac ? "Meta+K" : "Control+K"}
            className="flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white/60 px-3 text-sm text-[#666] hover:border-black/20 hover:text-[#171717] sm:pr-2"
          >
            <Search size={16} />
            <span className="hidden 2xl:inline">Search</span>
            <kbd className="hidden rounded-md border border-black/10 bg-black/[0.03] px-1.5 py-0.5 font-sans text-[11px] whitespace-nowrap text-[#777] lg:inline">
              {mac ? "⌘K" : "Ctrl K"}
            </kbd>
          </button>

          <div className="hidden sm:block">
            <LanguageSwitch id="header" language={language} setLanguage={setLanguage} label={t("language")} />
          </div>

          <Link
            href="/community-issues"
            className="hidden rounded-full bg-[#ff6600] px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-white hover:bg-[#e85d00] sm:inline-flex"
          >
            {t("reportIssue")}
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label={t("openNavigation")}
            aria-expanded={mobileOpen}
            className="flex size-10 items-center justify-center rounded-full border border-black/10 bg-white/60 xl:hidden"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      <Sheet
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        title="Aminiya Tracker"
        description={t("mobileNavigation")}
      >
        <nav aria-label={t("mobileNavigation")} className="flex flex-col gap-1 pb-2">
          {topLinks.map((link) => {
            const sub = link.key === "electoral" || link.key === "community" || link.key === "promises"
              ? menus[link.key as MenuId].items.filter(
                  // Skip the section itself and anything already listed at top level.
                  (item) => !topLinks.some((top) => top.href === item.href)
                )
              : [];
            const current = activeTop?.href === link.href;

            return (
              <div key={link.href}>
                <Link
                  href={link.href}
                  data-nav="lateral"
                  onClick={() => setMobileOpen(false)}
                  aria-current={current ? "page" : undefined}
                  className={`flex min-h-12 items-center rounded-2xl px-4 text-[17px] ${
                    current ? "bg-[#fff0e5] font-semibold text-[#c24e00]" : "text-[#222] active:bg-black/5"
                  }`}
                >
                  {link.label}
                </Link>
                {sub.length ? (
                  <div className="ml-4 flex flex-col border-l border-black/10 pl-2">
                    {sub.map((item) => (
                      <Link
                        key={item.href + item.title}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-[15px] text-[#555] active:bg-black/5"
                      >
                        <item.icon size={16} className="text-[#e85d00]" />
                        {item.title}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}

          <div className="mt-3 flex items-center justify-between rounded-2xl bg-black/[0.03] px-4 py-3">
            <span className="text-sm text-[#666]">{t("language")}</span>
            <LanguageSwitch id="sheet" language={language} setLanguage={setLanguage} label={t("language")} />
          </div>

          <Link
            href="/community-issues"
            onClick={() => setMobileOpen(false)}
            className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#ff6600] text-[16px] font-semibold text-white"
          >
            {t("reportIssue")}
          </Link>
        </nav>
      </Sheet>
    </header>
  );
}

function LanguageSwitch({
  id,
  language,
  setLanguage,
  label,
}: {
  id: string;
  language: "en" | "ha";
  setLanguage: (language: "en" | "ha") => void;
  label: string;
}) {
  return (
    <LayoutGroup id={`lang-${id}`}>
      <div
        role="group"
        aria-label={label}
        className="relative flex items-center gap-0.5 rounded-full border border-black/10 bg-white/60 p-1"
      >
        {(["en", "ha"] as const).map((code) => {
          const selected = language === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLanguage(code)}
              aria-pressed={selected}
              className={`relative rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide ${
                selected ? "text-white" : "text-[#555] hover:text-[#171717]"
              }`}
            >
              {selected ? (
                <motion.span
                  layoutId="lang-pill"
                  transition={springs.snappy}
                  className="absolute inset-0 rounded-full bg-[#ff6600]"
                />
              ) : null}
              <span className="relative">{code.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
