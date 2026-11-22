"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  BookOpen,
  ChevronDown,
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
import ReportMenu, { reportDestinations } from "@/components/report-menu";

type MenuId = "electoral" | "community";

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
  const [expandedSections, setExpandedSections] = useState<Set<MenuId>>(new Set());
  const reduceMotion = useReducedMotion();
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
        { title: t("tabCivicEducation"), description: t("navVotingProcessDesc"), href: "/electoral-information#section-education", icon: BookOpen },
        { title: t("tabCandidatesParties"), description: t("navElectionsDesc"), href: "/electoral-information#section-candidates", icon: Users },
        { title: t("tabElectionResults"), description: t("navElectionsDesc"), href: "/electoral-information#section-results", icon: Vote },
        { title: t("tabElectionIncidents"), description: t("navReliableInformationDesc"), href: "/electoral-information#section-incidents", icon: ShieldAlert },
        { title: t("tabElectoralInsights"), description: t("navElectionsDesc"), href: "/electoral-information#section-insights", icon: Target },
      ],
    },
    community: {
      label: t("communityIssues"),
      href: "/community-issues",
      items: [
        { title: t("reportIssue"), description: t("navReportIssueDesc"), href: "/community-issues", icon: MessageSquareText },
        { title: t("navTrackReport"), description: t("navTrackReportDesc"), href: "/community-issues#track", icon: Search },
      ],
    },
  };

  const topLinks: { key: "home" | MenuId | "promiseTracker" | "accountability" | "about"; href: string; label: string }[] = [
    { key: "home", href: "/", label: t("home") },
    { key: "electoral", href: menus.electoral.href, label: menus.electoral.label },
    { key: "community", href: menus.community.href, label: menus.community.label },
    { key: "promiseTracker", href: "/promise-tracker", label: t("promiseTracker") },
    { key: "accountability", href: "/accountability", label: t("accountability") },
    { key: "about", href: "/about", label: t("about") },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const activeTop =
    topLinks.find((link) => link.key !== "home" && isActive(link.href)) ??
    (pathname === "/" ? topLinks[0] : undefined);

  const activeMenu = activeMenuId ? menus[activeMenuId] : null;

  /** Open the sheet with the section holding the current page already expanded. */
  function openMobileMenu() {
    const current = (Object.keys(menus) as MenuId[]).filter(
      (id) =>
        isActive(menus[id].href) ||
        menus[id].items.some((item) => isActive(item.href.split("#")[0]))
    );
    setExpandedSections(new Set(current));
    setMobileOpen(true);
  }

  function toggleSection(id: MenuId) {
    setExpandedSections((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <header
      style={{ viewTransitionName: "site-header" }}
      data-scrolled={scrolled}
      className="material-chrome scroll-edge sticky top-0 z-50"
    >
      <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-8 xl:px-6">
        <Link href="/" aria-label="Aminiya Tracker home" className="shrink-0" data-nav="lateral">
          <Image
            src="/aminiya-logo-png.png"
            alt="Aminiya Tracker"
            width={565}
            height={189}
            priority
            className="h-auto w-[124px] min-[400px]:w-[140px] sm:w-[170px] xl:w-[150px] 2xl:w-[165px]"
          />
        </Link>

        <nav
          ref={navRef}
          aria-label={t("mainNavigation")}
          className="relative hidden items-center gap-0.5 xl:flex"
        >
          <LayoutGroup id="desktop-nav">
            {topLinks.map((link) => {
              const hasMenu = link.key === "electoral" || link.key === "community";
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
                    className={`relative rounded-full px-3 py-2 text-sm whitespace-nowrap transition-colors xl:px-2.5 ${
                      activeTop?.href === link.href
                        ? "font-semibold text-ink"
                        : "text-ink-muted hover:text-ink"
                    } ${hasMenu ? "pr-1.5 xl:pr-1.5" : ""}`}
                  >
                    {activeTop?.href === link.href ? (
                      <motion.span
                        layoutId="nav-active-pill"
                        transition={springs.snappy}
                        className="absolute inset-0 -z-10 rounded-full bg-tint"
                      />
                    ) : null}
                    {link.label}
                  </Link>
                  {hasMenu ? (
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={flyoutId}
                      aria-label={t("navShowPages").replace("{label}", link.label)}
                      onClick={() => setActiveMenu(expanded ? null : menuId)}
                      className="flex size-7 items-center justify-center rounded-full text-ink-subtle hover:bg-ink/5 hover:text-ink"
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
                className="material-thick absolute top-[calc(100%+12px)] left-0 w-[420px] overflow-hidden rounded-2xl border border-ink/5 p-2 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.3)]"
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
                            className="group flex gap-3 rounded-xl p-3 hover:bg-ink/[0.04] focus-visible:bg-ink/[0.04]"
                          >
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tint text-ink">
                              <Icon size={18} />
                            </span>
                            <span className="min-w-0">
                              <span className="flex items-center gap-1 text-sm font-semibold text-ink">
                                {item.title}
                                <ArrowUpRight size={14} className="opacity-0 transition-opacity group-hover:opacity-60" />
                              </span>
                              <span className="mt-0.5 block text-[13px] leading-5 text-ink-muted">
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

        <div className="flex shrink-0 items-center gap-2 sm:gap-3 xl:gap-2 2xl:gap-3">
          <button
            type="button"
            onClick={commandMenu.open}
            onPointerEnter={commandMenu.prefetch}
            onFocus={commandMenu.prefetch}
            aria-label={t("navSearch")}
            aria-keyshortcuts={mac ? "Meta+K" : "Control+K"}
            className="flex h-10 items-center gap-2 rounded-full border border-ink/10 bg-paper-raised/60 px-3 text-sm text-ink-muted hover:border-ink/20 hover:text-ink sm:pr-2"
          >
            <Search size={16} />
            <kbd className="hidden rounded-md border border-ink/10 bg-ink/[0.03] px-1.5 py-0.5 font-sans text-[11px] whitespace-nowrap text-ink-subtle lg:inline xl:hidden">
              {mac ? "⌘K" : "Ctrl K"}
            </kbd>
          </button>

          {/* Always in the header: Hausa readers shouldn't have to find it in a menu. */}
          <div>
            <LanguageSwitch id="header" language={language} setLanguage={setLanguage} label={t("language")} />
          </div>

          <ReportMenu variant="header" />

          <button
            type="button"
            onClick={openMobileMenu}
            aria-label={t("openNavigation")}
            aria-expanded={mobileOpen}
            className="flex size-10 items-center justify-center rounded-full border border-ink/10 bg-paper-raised/60 xl:hidden"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      <Sheet
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        title="Aminiya Tracker"
        footer={
          <div className="flex flex-col gap-2">
            {/* In the sheet both report types are one tap away instead of behind a menu. */}
            <p className="px-1 pt-1 text-xs font-semibold text-ink-muted">{t("reportIssue")}</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: reportDestinations.community, icon: MessageSquareText, label: t("reportMenuCommunityTitle") },
                { href: reportDestinations.incident, icon: ShieldAlert, label: t("reportMenuIncidentTitle") },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-ink px-3 text-center text-[15px] leading-tight font-semibold text-white active:bg-ink-raised"
                >
                  <item.icon size={17} className="shrink-0 text-signal" aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        }
      >
        <nav aria-label={t("mobileNavigation")} className="flex flex-col gap-1 pb-1">
          {topLinks.map((link) => {
            // Same sections and sub-links as the desktop flyouts, collapsed
            // behind a chevron so the whole menu fits without scrolling.
            const hasMenu = link.key === "electoral" || link.key === "community";
            const menuId = link.key as MenuId;
            const sub = hasMenu ? menus[menuId].items : [];
            const expanded = hasMenu && expandedSections.has(menuId);
            const panelId = `mobile-section-${link.key}`;
            const current = activeTop?.href === link.href;

            return (
              <div key={link.href}>
                <div className="flex items-center gap-1">
                  <Link
                    href={link.href}
                    data-nav="lateral"
                    onClick={() => setMobileOpen(false)}
                    aria-current={current ? "page" : undefined}
                    className={`flex min-h-12 flex-1 items-center rounded-2xl px-4 text-[17px] ${
                      current ? "bg-tint font-semibold text-ink" : "text-ink-muted active:bg-ink/5"
                    }`}
                  >
                    {link.label}
                  </Link>
                  {hasMenu ? (
                    <button
                      type="button"
                      onClick={() => toggleSection(menuId)}
                      aria-expanded={expanded}
                      aria-controls={expanded ? panelId : undefined}
                      aria-label={t("navShowPages").replace("{label}", link.label)}
                      className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted active:bg-ink/5"
                    >
                      <motion.span
                        animate={{ rotate: expanded ? 180 : 0 }}
                        transition={springs.snappy}
                        className="flex"
                      >
                        <ChevronDown size={18} />
                      </motion.span>
                    </button>
                  ) : null}
                </div>

                <AnimatePresence initial={false}>
                  {expanded ? (
                    <motion.div
                      key="panel"
                      id={panelId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{
                        height: 0,
                        opacity: 0,
                        transition: reduceMotion ? { duration: 0.15 } : springs.exit,
                      }}
                      transition={reduceMotion ? { duration: 0.15 } : springs.default}
                      className="overflow-hidden"
                    >
                      <div className="ml-4 flex flex-col border-l border-ink/10 pt-0.5 pb-1 pl-2">
                        {sub.map((item) => {
                          const itemCurrent =
                            !item.href.includes("#") && pathname === item.href;
                          return (
                            <Link
                              key={item.href + item.title}
                              href={item.href}
                              onClick={() => setMobileOpen(false)}
                              aria-current={itemCurrent ? "page" : undefined}
                              className={`flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-[15px] active:bg-ink/5 ${
                                itemCurrent ? "font-semibold text-ink" : "text-ink-muted"
                              }`}
                            >
                              <item.icon size={16} className="text-ink" />
                              {item.title}
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
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
        className="relative flex items-center rounded-full border border-ink/10 bg-paper-raised/60 p-0.5"
      >
        {(["en", "ha"] as const).map((code) => {
          const selected = language === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLanguage(code)}
              aria-pressed={selected}
              className={`relative flex h-10 min-w-10 items-center justify-center rounded-full px-2.5 text-xs font-semibold tracking-wide sm:h-9 sm:px-3 ${
                selected ? "text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              {selected ? (
                <motion.span
                  layoutId="lang-pill"
                  transition={springs.snappy}
                  className="absolute inset-0 rounded-full bg-ink"
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
